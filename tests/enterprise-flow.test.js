'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
test('existing source-linked drafts migrate without rewriting submitted version history',()=>{
 const data=require('../src/store').initialData(),c=data.cases[0];c.opportunityId='MIGRATION-SOURCE';c.versions=[{id:'HISTORICAL',number:1,status:'Approved',snapshot:structuredClone(c.lines),calculation:{totalRevenue:100}}];data.cases=[c];data.config.workbookReference={sha256:'current-source',benchPct:5};const previous=JSON.stringify(c.versions),revision=c.revision;
 require('../src/enterprise-data').sync(data,[{opportunityId:'MIGRATION-SOURCE',owner:'Source Owner',account:'ABC',opportunityName:'Existing source case',type:'New Business',stage:'Suspects',currency:'USD',amount:100,capability:'Data_Engg_and_BI',vertical:'RCM',projectStartDate:'2026-11-01',projectEndDate:'2026-11-30',durationMonths:1}]);
 assert.equal(c.pricingRuleSet,'WORKBOOK');assert.equal(c.revision,revision+1);assert.equal(JSON.stringify(c.versions),previous);assert.equal(c.sourceOpportunity.owner,'Source Owner');assert.ok(c.exceptions.some(e=>e.type==='Workbook migration'&&e.blocking));assert.equal(c.techCoeUserIds.length,2);
});
test('session login, external intake, owner isolation, all three paths, named COE validation and immutable approvals',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'price-enterprise-'));
 process.env.NODE_ENV='test';process.env.AUTH_TEST_FIXTURES='false';process.env.PORT='0';process.env.DB_PROVIDER='sqlite';process.env.SQLITE_PATH=path.join(dir,'app.sqlite');process.env.DATA_FILE=path.join(dir,'absent.json');process.env.LOCAL_ACCESS_DIR=path.join(dir,'access');
 const sourceData=require('../src/salesforce-opportunities'),dataset=await sourceData.readWorkbook(),{server,ready}=require('../src/server');await ready;
 try{
  const base='http://127.0.0.1:'+server.address().port+'/api/v1',creds=fs.readFileSync(path.join(dir,'access/LOCAL_LOGIN_CREDENTIALS.csv'),'utf8').trim().split(/\r?\n/).slice(1).map(r=>r.slice(1,-1).split('","')),password=name=>creds.find(r=>r[0]===name)?.[1],token=fs.readFileSync(path.join(dir,'access/intake-token.txt'),'utf8').trim();
  const sessions=new Map();
  async function call(route,body,who,method=body===undefined?'GET':'POST',status=200,headers={}){const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(sessions.has(who)?{Cookie:sessions.get(who)}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});const out=await response.json();assert.equal(response.status,status,JSON.stringify(out));return out;}
  async function login(name){const response=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:name,password:password(name)})});assert.equal(response.status,200,await response.clone().text());sessions.set(name,response.headers.get('set-cookie').split(';')[0]);return (await response.json()).user;}
  await call('/bootstrap',undefined,undefined,'GET',401,{'X-Demo-User':'u-admin'});
  await call('/users',undefined,undefined,'GET',401);
  await call('/integrations/salesforce/pricing-requests',{requestId:'UNAUTHORIZED',opportunityId:dataset.items[0].opportunityId},undefined,'POST',401);
  await call('/auth/login',{username:'Administrator',password:'incorrect'},undefined,'POST',401);
  await login('Administrator');await login('Pricing Operations');await login('namratta pandya');await login('Anil damodaran');await login('mallesh reddy');await login('Ankur Maheshwari');await login('Finance Reviewer');
  const admin=await call('/bootstrap',undefined,'Administrator');assert.ok(!JSON.stringify(admin).includes('passwordHash'));assert.ok(!JSON.stringify(admin).includes('integrationTokenHash'));assert.equal(admin.cases.length,0,'legacy unrelated samples are archived');
  assert.equal(admin.config.buHeads.length,8);assert.equal(admin.colaPolicy.pct,5);
  await call('/finance/cola-policy',{revision:admin.colaPolicy.revision,pct:5,reason:'Annual 2026 review',approve:true},'Ankur Maheshwari','PATCH');
  assert.equal(admin.config.techCoeMappings.length,5);assert.ok(admin.users.some(u=>u.name==='Tilak Mukherjee'));
  for(const type of ['New Business','Existing Business','Renewal']){
   const selected=dataset.items.find(x=>x.type===type&&!x.stage.startsWith('Closed')&&x.currency==='USD'&&x.capability==='Data_Engg_and_BI'&&['RCM','TMT','Others'].includes(x.vertical)&&x.projectStartDate&&x.projectEndDate);assert.ok(selected,'Actual source fixture for '+type);
   const bu=selected.vertical==='RCM'?'R&M':selected.vertical==='TMT'?'Tech 1':'MMM',head=bu==='R&M'?'namratta pandya':bu==='Tech 1'?'Anil damodaran':'mallesh reddy';
   const requestId='TEST-'+type.replaceAll(' ','-'),external={'Authorization':'Bearer '+token};
   if(type==='New Business'){
    const file=path.join(dir,'Pricing Intake.xlsx');require('../src/xlsx-template').create(file,[['Request ID','Opportunity ID','Request Pricing'],[requestId,selected.opportunityId,'Yes']]);
    const child=require('node:child_process').spawn(process.execPath,[path.resolve(__dirname,'../scripts/intake.js'),'--file',file],{env:{...process.env,PRICE_TRACK_URL:base.replace('/api/v1','')},windowsHide:true});let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);const [code]=await require('node:events').once(child,'exit');assert.equal(code,0,output);assert.ok(output.includes(requestId+' -> PT-'));
   }
   const received=await call('/integrations/salesforce/pricing-requests',{requestId,opportunityId:selected.opportunityId,account:'Spoofed'},undefined,'POST',type==='New Business'?200:201,external),id=received.caseId;
   assert.equal((await call('/integrations/salesforce/pricing-requests',{requestId,opportunityId:selected.opportunityId},undefined,'POST',200,external)).caseId,id);
   await call('/integrations/salesforce/pricing-requests',{requestId,opportunityId:'OTHER'},undefined,'POST',409,external);
   await login(selected.owner);const visible=await call('/salesforce/opportunities',undefined,selected.owner);assert.ok(visible.items.length);assert.ok(visible.items.every(x=>x.owner===selected.owner));
   const other=dataset.items.find(x=>x.owner!==selected.owner&&x.account===selected.account).owner;await login(other);await call('/cases/'+id,undefined,other,'GET',404);
   const cp=await call('/cases/'+id,undefined,selected.owner);assert.equal(cp.case.account,selected.account);assert.ok(!JSON.stringify(cp).includes('costPerHour'));
   await call('/cases/'+id+'/details',{revision:1,scope:'forbidden'},selected.owner,'PATCH',403);
   await call('/salesforce/pricing-requests',{},selected.owner,'POST',403);
   await call('/pricing-requests',{},'Pricing Operations','POST',403);
   let c=(await call('/cases/'+id,undefined,'Pricing Operations')).case;
   assert.deepEqual(c.techCoeUserIds.map(uid=>admin.users.find(u=>u.id===uid).name).sort(),['Tilak Mukherjee','Vikas Yadav']);
   await call('/cases/'+id+'/details',{revision:c.revision,scope:'Validated delivery scope',bu,priorScope:type==='Renewal'?'Prior SOW-TEST':'',pricingVertical:selected.vertical},'Pricing Operations','PATCH');
   c=(await call('/cases/'+id,undefined,'Pricing Operations')).case;const rate=admin.workbookCatalog.rates.find(r=>r.key==='Data Engineer / Data Modeler 1 | 2-3 Years');
   const line={id:'RESOURCE-1',workType:'T&M',workbookRateKey:rate.key,role:rate.role,grade:rate.experience,classification:'Offshore',location:'India',quantity:1,periods:1,hoursPerPeriod:160,utilizationPct:100,startDate:c.startDate,endDate:c.contractEndDate,currency:'USD',costPerHour:0};
   await call('/cases/'+id+'/draft/sections/resource-estimates',{revision:c.revision,lines:[line]},'Pricing Operations','PUT');
   c=(await call('/cases/'+id,undefined,'Pricing Operations')).case;
   if(type==='Renewal')for(const e of c.exceptions.filter(e=>e.status==='Open'))await call('/exceptions/'+e.id+'/resolve',{notes:'Reviewed prior SOW and staffing comparison.'},'Administrator');
   await call('/cases/'+id+'/calculations',{},'Pricing Operations');
   await call('/cases/'+id+'/versions',{revision:c.revision,comment:'Not validated yet'},'Pricing Operations','POST',422);
   await call('/cases/'+id+'/resource-validation',{revision:c.revision,reason:'Administrator bypass attempt'},'Administrator','POST',403);
   for(const name of ['Tilak Mukherjee','Vikas Yadav']){await login(name);await call('/cases/'+id+'/resource-validation',{revision:c.revision,reason:'Reviewed source-backed resource assumptions'},name);}
   const first=(await call('/cases/'+id+'/versions',{revision:c.revision,comment:'Initial '+type+' pricing'},'Pricing Operations')).version;assert.ok(first.ruleSnapshot.workbook.sha256);assert.equal(first.snapshot.length,1);
   await call('/versions/'+first.id+'/approval-tasks/2/approve',{},'Finance Reviewer','POST',409);
   await call('/cases/'+id+'/versions',{revision:c.revision,comment:'Duplicate pending submission'},'Pricing Operations','POST',409);
   let final=first;
   if(type==='Existing Business'){
    await call('/cases/'+id+'/draft/sections/resource-estimates',{revision:c.revision,lines:[{...line,quantity:2}]},'Pricing Operations','PUT');
    const versionBefore=(await call('/cases/'+id,undefined,'Pricing Operations')).case.versions[0];assert.equal(versionBefore.snapshot[0].quantity,1);
   }
   await call('/versions/'+first.id+'/approval-tasks/1/approve',{},head);
   if(type==='New Business')await call('/versions/'+first.id+'/approval-tasks/2/reject',{reason:'Revise commercial notes and resubmit'},'Finance Reviewer');else await call('/versions/'+first.id+'/approval-tasks/2/approve',{},'Finance Reviewer');
   if(type!=='Renewal'){
    c=(await call('/cases/'+id,undefined,'Pricing Operations')).case;
    if(type==='Existing Business')await call('/cases/'+id+'/mark-agreed',{versionId:first.id,evidence:'Stale version attempt'},'Pricing Operations','POST',409);
    await call('/cases/'+id+'/calculations',{},'Pricing Operations');
    for(const name of ['Tilak Mukherjee','Vikas Yadav'])await call('/cases/'+id+'/resource-validation',{revision:c.revision,reason:'Validated revised draft'},name);
    final=(await call('/cases/'+id+'/versions',{revision:c.revision,comment:'Revised '+type+' pricing'},'Pricing Operations')).version;
    assert.equal(final.number,2);await call('/versions/'+final.id+'/approval-tasks/1/approve',{},head);await call('/versions/'+final.id+'/approval-tasks/2/approve',{},'Finance Reviewer');
   }
   await call('/cases/'+id+'/mark-agreed',{versionId:final.id,evidence:'Client agreed this exact immutable version'},'Pricing Operations');
   await call('/cases/'+id+'/workflow',{stage:'Contract & Launch',reason:'Contract signed and launch evidence recorded'},'Pricing Operations');
   await call('/cases/'+id+'/workflow',{stage:'Closed Won',reason:'Internal closure attempt'},'Pricing Operations','POST',403);
   selected.stage='Closed Won';const eventId='EVENT-'+requestId;
   const closed=await call('/integrations/salesforce/events',{eventId,opportunityId:selected.opportunityId},undefined,'POST',200,external);assert.equal(closed.status,'Closed Won');
   assert.equal((await call('/integrations/salesforce/events',{eventId,opportunityId:selected.opportunityId},undefined,'POST',200,external)).duplicate,true);
   c=(await call('/cases/'+id,undefined,'Administrator')).case;assert.equal(c.handoffs.length,1);assert.equal(c.handoffs[0].status,'Pending');
   await call('/integrations/project-track/handoffs',{caseId:id,versionId:final.id,simulation:'success'},'Administrator');
   c=(await call('/cases/'+id,undefined,'Administrator')).case;assert.equal(c.handoffs[0].status,'Accepted');
   const scoped=await call('/bootstrap',undefined,selected.owner);assert.ok(!JSON.stringify(scoped).includes('costPerHour'));assert.ok(!JSON.stringify(scoped).includes('productUnitCost'));assert.ok(!JSON.stringify(scoped).includes('passwordHash'));
  }
  const existingCases=(await call('/bootstrap',undefined,'Administrator')).cases;
  const fresh=dataset.items.find(x=>x.type==='Renewal'&&!x.stage.startsWith('Closed')&&x.currency==='USD'&&!existingCases.some(c=>c.opportunityId===x.opportunityId));
  const made=await call('/integrations/salesforce/pricing-requests',{requestId:'COLA-REVISION-CHECK',opportunityId:fresh.opportunityId},undefined,'POST',201,{Authorization:'Bearer '+token});
  const before=(await call('/cases/'+made.caseId,undefined,'Administrator')).case,policyBefore=(await call('/bootstrap',undefined,'Administrator')).colaPolicy;
  await call('/finance/cola-policy',{revision:policyBefore.revision,pct:6,reason:'Unauthorized attempt'},'Pricing Operations','PATCH',403);
  await call('/finance/cola-policy',{revision:policyBefore.revision,pct:6,reason:'Finance annual adjustment',approve:true},'Finance Reviewer','PATCH',403);
  await call('/finance/cola-policy',{revision:policyBefore.revision,pct:6,reason:'Finance annual adjustment'},'Finance Reviewer','PATCH');
  const after=(await call('/cases/'+made.caseId,undefined,'Administrator')).case;assert.equal(after.colaPct,6);assert.equal(after.revision,before.revision+1);assert.deepEqual(after.resourceValidations,[]);
  const closedAfter=(await call('/bootstrap',undefined,'Administrator')).cases.filter(c=>c.status==='Closed Won');
  assert.equal(JSON.stringify(closedAfter.map(c=>c.versions)),JSON.stringify(existingCases.filter(c=>c.status==='Closed Won').map(c=>c.versions)),'Finance changes must not rewrite historical versions');
  const current=(await call('/bootstrap',undefined,'Ankur Maheshwari')).colaPolicy;assert.equal(current.lastReviewedYear,null);
  const reviewed=await call('/finance/cola-policy',{revision:current.revision,pct:6,reason:'EVP annual sign-off',approve:true},'Ankur Maheshwari','PATCH');assert.equal(reviewed.policy.approvedBy,'Ankur Maheshwari');
  const owner=dataset.items[0].owner;await login(owner);const ownerUser=(await call('/auth/session',undefined,owner)).user;await call('/admin/users/'+ownerUser.id,{enabled:false},'Administrator','PATCH');await call('/bootstrap',undefined,owner,'GET',401);await call('/admin/users/'+ownerUser.id,{enabled:true},'Administrator','PATCH');
  await call('/auth/logout',{},'Administrator');await call('/bootstrap',undefined,'Administrator','GET',401);
 }finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});}
});
