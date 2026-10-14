'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {once}=require('node:events');

test('Excel opportunity intake and sequential approval notifications stay scoped to source and recipient',async()=>{
 const folder=fs.mkdtempSync(path.join(__dirname,'.opportunity-notifications-'));
 process.env.DATA_FILE=path.join(folder,'store.json');
 process.env.PORT='0';
 process.env.NODE_ENV='test';process.env.AUTH_TEST_FIXTURES='true';const {server,ready}=require('../src/server');
 await ready;
 try{
  if(!server.listening)await once(server,'listening');
  const base='http://127.0.0.1:'+server.address().port;
  async function call(route,body,user='u-admin',method='POST',expected=200){
   const response=await fetch(base+'/api/v1'+route,{method,headers:{'Content-Type':'application/json','X-Demo-User':user},body:method==='GET'?undefined:JSON.stringify(body||{})});
   const result=await response.json();
   assert.equal(response.status,expected,JSON.stringify(result));
   return result;
  }

  const source=await call('/salesforce/opportunities',null,'u-cp-sf','GET');
  assert.equal(source.available,true);
  assert.equal(source.sourceFile,'Salesforce sythetic data.xlsx');
  assert.equal(source.rowCount,1057);
  assert.equal(source.usableCount,1057);
  assert.ok(source.items.length>0);
  assert.ok(source.items.every(item=>item.account==='ABC'));
  assert.ok(source.items[0].sourceOpportunityId);
  assert.equal(source.items[0].sourceOpportunityId,source.items[0].opportunityId);
  const filtered=await call('/salesforce/opportunities?search='+encodeURIComponent(source.items[0].sourceOpportunityId)+'&stage='+encodeURIComponent(source.items[0].stage),null,'u-cp-sf','GET');
  assert.ok(filtered.items.length>0);
  assert.ok(filtered.items.every(item=>item.sourceOpportunityId===source.items[0].sourceOpportunityId&&item.stage===source.items[0].stage));
  assert.equal((await call('/salesforce/opportunities',null,'u-cp','GET')).items.length,0,'Northstar access does not expose other workbook accounts');
  await call('/salesforce/opportunities',null,'u-fin','GET',403);

  const selected=source.items[0];
  const request={
   sourceOpportunityId:selected.sourceOpportunityId,
   opportunityId:selected.opportunityId,
   opportunityName:selected.opportunityName,
   account:selected.account,
   bu:'R&M',
   owner:'Demo Client Partner (Excel Sample)',
   opportunityType:'New business',
   region:'India',
   capability:selected.capability||'Consulting',
   deliveryModel:'Offshore',
   scope:'POC scope entered by the Client Partner',
   startDate:selected.projectStartDate||'2026-11-01',
   contractEndDate:selected.projectEndDate||'2027-04-30',
   durationMonths:selected.durationMonths||6,
   currency:selected.currency||'USD',
   budget:selected.amount??100000,
   targetMarginPct:40,
   discountPct:0,
   colaPct:0,
   workTypes:['T&M']
  };
  const created=await call('/salesforce/pricing-requests',request,'u-cp-sf','POST',201);
  assert.equal(created.case.opportunityId,selected.sourceOpportunityId);
  assert.equal(created.case.sourceOpportunity.id,selected.sourceOpportunityId);
  assert.equal(created.case.sourceOpportunity.proposalNumber,selected.proposalNumber);
  assert.equal(created.case.sourceOpportunity.stage,selected.stage);
  const duplicate=await call('/salesforce/pricing-requests',request,'u-cp-sf');
  assert.equal(duplicate.duplicate,true);
  assert.equal(duplicate.case.id,created.case.id);
  await call('/salesforce/pricing-requests',{...request,account:'XYZ'},'u-cp-sf','POST',400);
  await call('/salesforce/pricing-requests',{...request,sourceOpportunityId:'not-in-workbook'},'u-cp-sf','POST',400);

  const caseId='PT-1001';
  const pricingCase=(await call('/cases/'+caseId,null,'u-sales','GET')).case;
  await call('/cases/'+caseId+'/resource-validation',{revision:pricingCase.revision,reason:'BU SPOC validated the saved resources'},'u-spoc');
  await call('/cases/'+caseId+'/versions',{comment:'Submit without a saved calculation',revision:pricingCase.revision},'u-sales','POST',409);
  assert.equal((await call('/notifications',null,'u-bu','GET')).items.length,0,'failed submission creates no notification');
  await call('/cases/'+caseId+'/calculations',{},'u-sales');
  const version=(await call('/cases/'+caseId+'/versions',{comment:'Submit for sequential approval',revision:pricingCase.revision},'u-sales')).version;
  const buInbox=await call('/notifications',null,'u-bu','GET');
  const buNotice=buInbox.items.find(item=>item.versionId===version.id);
  assert.ok(buNotice);
  assert.equal(buNotice.approvalTaskId,version.id+':1');
  assert.equal(buNotice.caseId,caseId);
  assert.match(buNotice.title,/V1/);
  assert.equal((await call('/notifications',null,'u-fin','GET')).items.some(item=>item.versionId===version.id),false,'Finance is not notified before the BU Head decision');
  assert.equal((await call('/notifications',null,'u-bu','GET')).items.filter(item=>item.key===buNotice.key).length,1,'refresh does not duplicate notifications');
  await call('/notifications/'+buNotice.id+'/read',{},'u-fin','POST',404);
  const marked=await call('/notifications/'+buNotice.id+'/read',{},'u-bu');
  assert.ok(marked.notification.readAt);
  assert.equal((await call('/notifications',null,'u-bu','GET')).unreadCount,0);

  await call('/versions/'+version.id+'/approval-tasks/1/approve',{reason:'BU Head review completed'},'u-bu');
  const financeInbox=await call('/notifications',null,'u-fin','GET');
  const financeNotice=financeInbox.items.find(item=>item.versionId===version.id);
  assert.ok(financeNotice);
  assert.equal(financeNotice.approvalTaskId,version.id+':2');
  await call('/versions/'+version.id+'/approval-tasks/2/approve',{reason:'Finance review completed'},'u-fin');
  const requesterInbox=await call('/notifications',null,'u-cp','GET');
  const approvedNotice=requesterInbox.items.find(item=>item.versionId===version.id&&item.sourceEvent==='VERSION_APPROVED');
  assert.ok(approvedNotice);
  assert.equal(approvedNotice.route,'versions');
  assert.equal(approvedNotice.caseReference,caseId);
  await call('/notifications/'+approvedNotice.id+'/read',{},'u-cp-sf','POST',404);
  await call('/notifications/read-all',{},'u-cp');
  assert.equal((await call('/notifications',null,'u-cp','GET')).unreadCount,0);

  await call('/versions/VER-2002/approval-tasks/1/approve',{reason:'BU Head review completed'},'u-bu');
  const readyFinance=await call('/notifications',null,'u-fin','GET');
  assert.ok(readyFinance.items.some(item=>item.versionId==='VER-2002'&&item.sourceEvent==='APPROVAL_READY'));
  await call('/versions/VER-2002/approval-tasks/2/reject',{reason:'Revisit the resource cost basis'},'u-fin');
  const requesterNotices=await call('/notifications',null,'u-spoc','GET');
  const rejectedNotice=requesterNotices.items.find(item=>item.versionId==='VER-2002'&&item.sourceEvent==='VERSION_REJECT');
  assert.ok(rejectedNotice);
  assert.match(rejectedNotice.message,/Revisit the resource cost basis/);
  assert.equal(rejectedNotice.caseId,'PT-1002');
 }finally{
  await new Promise(resolve=>server.close(resolve));
  fs.rmSync(folder,{recursive:true,force:true});
 }
});
