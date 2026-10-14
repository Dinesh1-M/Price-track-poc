'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
if(process.loadEnvFile&&fs.existsSync(path.resolve('.env')))process.loadEnvFile(path.resolve('.env'));
const { loadStore, saveStore, newId } = require('./store');
const { calculatePricing, canAccessCase, canSeeCost, validateClosedWon, PENDING_RULE_NOTICE } = require('./domain');

const L=require('./lifecycle');
const pocApi=require('./poc-api');
const policy=require('./policy');
const opportunityData=require('./salesforce-opportunities');
const auth=require('./auth'),enterprise=require('./enterprise-data'),workbook=require('./workbook-pricing'),enterpriseApi=require('./enterprise-api');
const renewalPolicy=require('./renewal-policy');
const fixtureAuth=process.env.NODE_ENV==='test'&&process.env.AUTH_TEST_FIXTURES==='true';
const ACCESS_DIR=path.resolve(process.env.LOCAL_ACCESS_DIR||'./data/local-access');
function safeConfig(){const copy=structuredClone(store.data.config);delete copy.workbookReference;return copy;}
if(process.env.NODE_ENV==='production')throw new Error('Production startup disabled: enterprise authentication and financial verification are not configured.');
const PORT = Number(process.env.PORT || 3000);
let store;
const {openStore}=require('./sqlite-store');
const PUBLIC = path.resolve(__dirname, '../public');
const MIME = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};

function audit(actor, action, entityType, entityId, details={}) {
 const event={id:newId('AUD'),actor:actor?.name || 'System',actorId:actor?.id || 'system',action,entityType,entityId,details,createdAt:new Date().toISOString()};
 store.data.audit.unshift(event);
 const c=store.data.cases.find(x=>x.id===entityId || x.id===details.caseId); if(c) c.audit.unshift(event);
 return event;
}
function send(res,status,body,headers={}) { res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}); res.end(JSON.stringify(body)); }
function fail(res,status,code,message,details) { send(res,status,{error:{code,message,details,correlationId:crypto.randomUUID()}}); }
function readBody(req) { return new Promise((resolve,reject)=>{let raw='';req.on('data',chunk=>{raw+=chunk;if(raw.length>1_000_000){reject(new Error('Payload too large'));req.destroy();}});req.on('end',()=>{if(!raw)return resolve({});try{resolve(JSON.parse(raw));}catch{reject(new Error('Invalid JSON body'));}});req.on('error',reject);}); }
function getUser(req,url) { if(fixtureAuth){const id=url.searchParams.get('user')||req.headers['x-demo-user'];return store.data.users.find(u=>u.id===id);}return auth.sessionUser(req,store.data); }
function redactFinancial(value){
 if(!value||typeof value!=='object')return;
 if(Array.isArray(value)){value.forEach(redactFinancial);return;}
 for(const key of ['totalCost','cost','costPerHour','productUnitCost','benchCost','preColaCost','colaCost','targetRevenue','onshoreCost','offshoreCost','onshoreCtc','offshoreCtc'])delete value[key];
 if(value.ruleReference)delete value.ruleReference.rates;
 if(value.workbook)delete value.workbook.rates;
 Object.values(value).forEach(redactFinancial);
}
function safeCalculation(calc,user,c) { const copy=JSON.parse(JSON.stringify(calc)); if(!canSeeCost(user,c)){redactFinancial(copy);copy.totalCost=undefined;delete copy.targetRevenue;copy.lineResults=copy.lineResults.map(l=>{delete l.cost;delete l.costPerHour;return l;});} return copy; }
function safeHandoff(h,user,c){const copy=structuredClone(h);if(!canSeeCost(user,c)){redactFinancial(copy);if(copy.payload)delete copy.payload.commercialSnapshot;}return copy;}
function safeCase(c,user) {
 const copy=structuredClone(c);
 if(!canSeeCost(user,c)){
  redactFinancial(copy);
  delete copy.costHistory;
  copy.lines.forEach(l=>delete l.costPerHour);
  copy.versions.forEach(v=>{v.snapshot?.forEach(l=>delete l.costPerHour);if(v.calculation){delete v.calculation.totalCost;delete v.calculation.lineResults;delete v.calculation.targetRevenue;}});
  copy.handoffs?.forEach(h=>{if(h.payload)delete h.payload.commercialSnapshot;if(h.payload?.commercialLines)h.payload.commercialLines.forEach(l=>delete l.costPerHour);});
  copy.audit=[];
  copy.calculations?.forEach(r=>{r.calculation=safeCalculation(r.calculation,user,c);});
 }
 if(user.role==='Client Partner'){copy.audit=[];copy.exceptions=[];copy.comments=[];copy.negotiations=[];copy.lines.forEach(l=>{delete l.availability;});delete copy.opportunitySnapshot;}
 return copy;
}
function allowedCase(res,user,c) { if(!user){fail(res,401,'UNAUTHENTICATED','Select a demo identity or configure approved authentication.');return false;} if(!canAccessCase(user,c)){fail(res,404,'NOT_FOUND','Case not found or access denied.');return false;}return true; }
function resolveCase(id) { return store.data.cases.find(c=>c.id===id); }
function addException(c, type, reason, owner='u-admin', severity='Medium', blocking=true) { const e={id:newId('EX'),type,reason,owner,severity,blocking,status:'Open',relatedEntity:c.id,createdAt:new Date().toISOString(),resolvedAt:null,resolutionNotes:'',history:[]};c.exceptions.unshift(e);audit({id:owner,name:store.data.users.find(u=>u.id===owner)?.name||'System'},'EXCEPTION_CREATED','Exception',e.id,{caseId:c.id,type,reason});return e; }
function requireRole(res,user,roles) { if(!user){fail(res,401,'UNAUTHENTICATED','No identity selected.');return false;} if(!roles.includes(user.role)){fail(res,403,'FORBIDDEN','Your role cannot perform this action.');return false;}return true; }
function notify({userId,c,v,task,event,title,message,route='approvals',reason=''}) {
 store.data.notifications=store.data.notifications||[];
 const recipient=store.data.users.find(u=>u.id===userId);
 if(!recipient||!canAccessCase(recipient,c))return;
 const taskId=task?String(task.step):'outcome';
 const key=`${event}:${v.id}:${taskId}:${userId}`;
 if(store.data.notifications.some(n=>n.key===key))return;
 const detail=reason&&canSeeCost(recipient,c)?` Comment: ${reason}`:'';
 store.data.notifications.unshift({
  id:newId('NOT'),key,userId,recipientRole:recipient.role,type:'approval',title,
  message:message+detail,caseId:c.id,caseReference:c.id,versionId:v.id,
  versionNumber:v.number,approvalTaskId:task?`${v.id}:${task.step}`:null,
  route,sourceEvent:event,createdAt:new Date().toISOString(),readAt:null,status:'Unread'
 });
}
function readyApproval(v) {
 return v.approvals.find(task=>task.status==='Pending'&&!v.approvals.some(previous=>previous.step<task.step&&previous.status!=='Approved'));
}
function outcomeRecipients(c,v) {
 const ownerIds=store.data.users.filter(u=>u.name===c.owner).map(u=>u.id);
 return [...new Set([c.requestedById,v.submittedById,...ownerIds].filter(Boolean))];
}
async function renewalRefresh(){if(fixtureAuth)return [];const source=await opportunityData.readWorkbook();if(!source.available)throw Error('Salesforce workbook unavailable for renewal review.');renewalPolicy.sweep(store.data,source.items);return source.items;}
function renewalRows(user,items){return items.filter(s=>s.type==='Renewal'&&(user.role==='Admin'||user.role==='Client Partner'&&String(user.loginId).trim().toLowerCase()===String(s.owner).trim().toLowerCase()||user.role!=='Client Partner'&&store.data.cases.some(c=>c.opportunityId===s.opportunityId&&canAccessCase(user,c)))).map(s=>renewalPolicy.summary(s,store.data.cases.find(c=>c.opportunityId===s.opportunityId&&canAccessCase(user,c)),store.data.config.colaPolicy)).sort((a,b)=>(a.closeDate||'9999').localeCompare(b.closeDate||'9999'));}
function remind(){
 for(const c of store.data.cases)for(const v of c.versions.filter(x=>x.status==='Pending Approval')){
  const task=readyApproval(v);
  if(task&&task.dueAt&&task.dueAt<new Date().toISOString())for(const userId of task.assignedUserIds||[]){
   notify({userId,c,v,task,event:'APPROVAL_OVERDUE',title:'Approval overdue',message:`${c.opportunityName} - V${v.number} is awaiting your ${task.role} review.`,route:'approvals'});
  }
 }
}
function calculate(c) { return c.pricingRuleSet==='WORKBOOK'?workbook.calculateWorkbook(c,store.data.config.workbookReference,store.data.config):L.calculate(c,store.data.rates,store.data.config); }
function queueHandoff(c,v){
 const key=c.id+':'+v.id+':ClosedWon:v1';let h=c.handoffs.find(h=>h.idempotencyKey===key);if(h)return h;
 h={id:newId('HO'),caseId:c.id,versionId:v.id,eventType:'ClosedWon',idempotencyKey:key,correlationId:crypto.randomUUID(),status:'Pending',attempts:0,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),events:[],payload:{schemaVersion:'1.0',eventType:'ClosedWon',opportunityId:c.opportunityId,caseId:c.id,versionId:v.id,account:c.account,currency:c.currency,commercialLines:structuredClone(v.snapshot),commercialSnapshot:structuredClone(v.calculation),startDate:c.startDate,contractEndDate:c.contractEndDate,ruleReferences:structuredClone(v.ruleSnapshot)}};
 c.handoffs.push(h);audit({id:'system',name:'System'},'HANDOFF_QUEUED','PricingCase',c.id,{handoffId:h.id});return h;
}
function mockHandoff(c, version, mode='success', attempt=1) {
 const idempotencyKey=`${c.id}:${version.id}:ClosedWon:v1`;
 const existing=c.handoffs.find(h=>h.idempotencyKey===idempotencyKey);
 if(existing && existing.status==='Accepted') return existing;
 const h=existing || {id:newId('HO'),caseId:c.id,versionId:version.id,idempotencyKey,correlationId:crypto.randomUUID(),status:'Pending',attempts:0,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),events:[],payload:{schemaVersion:'1.0',opportunityId:c.opportunityId,caseId:c.id,versionId:version.id,account:c.account,currency:c.currency,workTypes:c.workTypes,commercialSnapshot:version.calculation,eventType:'ClosedWon',commercialLines:version.snapshot,currency:c.currency,startDate:c.startDate,contractEndDate:c.contractEndDate,ruleReferences:version.ruleSnapshot,source:'Price Track POC'}};
 h.attempts++;h.updatedAt=new Date().toISOString();
 if(mode==='reject'){h.status='Rejected';h.lastResponse={code:'VALIDATION_REJECTED',message:'Mock receiver rejected payload: simulated validation failure.'};}
 else if(mode==='timeout' && h.attempts < store.data.config.retryLimit){h.status='Retry Scheduled';h.lastResponse={code:'TIMEOUT',message:'Simulated transient timeout.'};h.nextRetryAt=new Date(Date.now()+Math.pow(2,h.attempts)*1000).toISOString();}
 else if(mode==='timeout'){h.status='Failed';h.lastResponse={code:'RETRY_EXHAUSTED',message:'Retry limit reached after simulated timeouts.'};addException(c,'Project Track handoff failure',h.lastResponse.message,'u-admin','High',false);}
 else {h.status='Accepted';h.lastResponse={code:'ACCEPTED',message:'Mock Project Track receiver accepted the payload.',receiverId:`PT-DEMO-${h.id}`};h.acceptedAt=new Date().toISOString();}
 h.events.push({attempt:h.attempts,status:h.status,at:h.updatedAt,response:h.lastResponse});
 if(!existing)c.handoffs.unshift(h);audit({id:'system',name:'System'},'PROJECT_TRACK_HANDOFF_'+h.status.toUpperCase().replaceAll(' ','_'),'Handoff',h.id,{caseId:c.id,versionId:version.id,correlationId:h.correlationId});
 return h;
}

async function api(req,res,url) {
 const method=req.method, p=url.pathname, user=getUser(req,url);
 if(!fixtureAuth&&method!=='GET'&&req.headers.origin&&req.headers.origin!=='http://'+req.headers.host)return fail(res,403,'ORIGIN_REJECTED','Request origin does not match this application.');
 if(await enterpriseApi(req,res,url,user,store,{send,fail,readBody,audit,save:()=>saveStore(store),accessDir:ACCESS_DIR,queueHandoff}))return;
 if(p!=='/api/v1/health'&&!user)return fail(res,401,'UNAUTHENTICATED','Sign in to Price Track.');
 if(!fixtureAuth&&p==='/api/v1/salesforce/pricing-requests')return fail(res,403,'EXTERNAL_TRIGGER_REQUIRED','Use the external intake adapter.');
 if(!fixtureAuth&&p.startsWith('/api/v1/notifications')){await renewalRefresh();saveStore(store);}
 const notificationWrite=method==='POST'&&(/^\/api\/v1\/notifications\/[^/]+\/read$/.test(p)||p==='/api/v1/notifications/read-all');
 if(user?.role==='Client Partner'&&method!=='GET'&&p!=='/api/v1/salesforce/pricing-requests'&&!notificationWrite)return fail(res,403,'CP_READ_ONLY','Client Partner has read-only Price Track access. Request pricing through the mock Salesforce intake.');
 if(user?.role==='Client Partner'&&method==='GET'&&['/api/v1/audit','/api/v1/config','/api/v1/pending-decisions','/api/v1/rates'].includes(p))return fail(res,403,'FORBIDDEN','Internal governance is restricted.');
 if(method==='GET' && p==='/api/v1/health') return send(res,200,{status:'ok',service:'Price Track POC',mode:'DEMO',timestamp:new Date().toISOString()});
 if(method==='GET'&&p==='/api/v1/salesforce/opportunities'){
  if(!requireRole(res,user,['Client Partner','Admin']))return;
  try{
   const dataset=await opportunityData.listOpportunities({account:fixtureAuth&&user.role==='Client Partner'?user.account:undefined,owner:!fixtureAuth&&user.role==='Client Partner'?user.loginId:undefined,search:url.searchParams.get('search')||'',stage:url.searchParams.get('stage')||''});
   return send(res,200,{...dataset,sourceType:'local Excel workbook; no live Salesforce connection'});
  }catch(error){return fail(res,503,'OPPORTUNITY_DATA_UNAVAILABLE',error.message);}
 }
 if(method==='GET'&&p==='/api/v1/notifications'){
  const items=store.data.notifications.filter(n=>!n.revoked&&n.userId===user.id&&(!n.caseId||canAccessCase(user,resolveCase(n.caseId)))).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,100);
  return send(res,200,{items,unreadCount:items.filter(n=>!n.readAt).length});
 }
 if(method==='POST'&&p==='/api/v1/notifications/read-all'){
  const now=new Date().toISOString();
  for(const notification of store.data.notifications)if(notification.userId===user.id&&!notification.readAt&&(!notification.caseId||canAccessCase(user,resolveCase(notification.caseId)))){notification.readAt=now;notification.status='Read';}
  saveStore(store);return send(res,200,{unreadCount:0});
 }
 if(method==='POST'&&p.startsWith('/api/v1/notifications/')&&p.endsWith('/read')){
  const id=p.split('/')[4],notification=store.data.notifications.find(n=>!n.revoked&&n.id===id&&n.userId===user.id);
  if(!notification||notification.caseId&&!canAccessCase(user,resolveCase(notification.caseId)))return fail(res,404,'NOT_FOUND','Notification not found or access denied.');
  if(!notification.readAt){notification.readAt=new Date().toISOString();notification.status='Read';saveStore(store);}
  return send(res,200,{notification});
 }
 if(method==='GET' && p==='/api/v1/bootstrap') {
   const renewalSource=await renewalRefresh();remind();saveStore(store);
   const cases=store.data.cases.filter(c=>canAccessCase(user,c)).map(c=>safeCase(c,user));
   const openExceptions=cases.flatMap(c=>c.exceptions).filter(e=>e.status==='Open');
   const tasks=[];for(const c of cases) for(const v of c.versions) for(const a of (v.status==='Pending Approval'?v.approvals||[]:[])) if(a.status==='Pending' && policy.canApprove(user,c,a,store.data)) tasks.push({caseId:c.id,versionId:v.id,...a});
   const notifications=store.data.notifications.filter(n=>n.userId===user.id&&(!n.caseId||canAccessCase(user,resolveCase(n.caseId)))).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,100);
   return send(res,200,{user:auth.publicUser(user),renewals:renewalRows(user,renewalSource),colaPolicy:store.data.config.colaPolicy,workbookCatalog:user.role==='Client Partner'?null:{id:store.data.config.workbookReference?.id,sha256:store.data.config.workbookReference?.sha256,hours:store.data.config.workbookReference?.hours,verticals:store.data.config.workbookReference?.verticals.map(v=>v.name),rates:store.data.config.workbookReference?.rates.map(r=>({key:r.key,role:r.role,experience:r.experience,category:r.category,...(user.costVisible!==false&&(user.costVisible===true||['Finance','CFO','EVP Finance','BU SPOC'].includes(user.role))?{onshoreCost:r.onshoreCost,offshoreCost:r.offshoreCost}:{})}))},users:user.role==='Client Partner'?[]:store.data.users.filter(u=>user.role==='Admin'||u.enabled!==false).map(auth.publicUser),cases,calculations:Object.fromEntries(store.data.cases.filter(c=>canAccessCase(user,c)).map(c=>[c.id,safeCalculation(calculate(c),user,c)])),rates:user.role==='Client Partner'?[]:store.data.rates.filter(r=>!r.account||cases.some(c=>c.account===r.account)),rateProposals:user.role==='Client Partner'?[]:store.data.rateProposals.filter(r=>cases.some(c=>c.account===r.account||c.bu===r.bu)),pendingDecisions:user.role==='Client Partner'?[]:store.data.pendingDecisions,config:user.role==='Client Partner'?{demoMode:true,formulaApproved:false}:safeConfig(),exceptions:openExceptions,audit:user.role==='Admin'?store.data.audit.slice(0,100):[],notifications,unreadNotificationCount:notifications.filter(n=>!n.readAt).length,integrationEvents:user.role==='Admin'?store.data.integrationEvents.slice(0,100):[],tasks,ruleNotice:PENDING_RULE_NOTICE});
 }
 if(method==='GET' && p==='/api/v1/users'){if(!requireRole(res,user,['Admin']))return;return send(res,200,{items:store.data.users.map(auth.publicUser)});}
 if(method==='GET' && p==='/api/v1/cases') return send(res,200,{items:store.data.cases.filter(c=>canAccessCase(user,c)).map(c=>safeCase(c,user))});
 if(method==='POST'&&p==='/api/v1/pricing-requests')return fail(res,403,'EXTERNAL_TRIGGER_REQUIRED','Pricing cases must originate from the external Salesforce opportunity trigger. Manual Price Track case creation is disabled.');
 if(method==='POST' && ['/api/v1/pricing-requests','/api/v1/salesforce/pricing-requests'].includes(p)) {
   const b=await readBody(req);if(!requireRole(res,user,p==='/api/v1/salesforce/pricing-requests'?['Client Partner','Admin','Sales/Pricing Analyst']:['Admin','Sales/Pricing Analyst','BU SPOC','BU Head']))return;
   let sourceOpportunity=null;
   if(b.sourceOpportunityId){
    if(p!=='/api/v1/salesforce/pricing-requests')return fail(res,400,'VALIDATION_ERROR','Excel opportunity intake must use the Salesforce pricing-request route.');
    const dataset=await opportunityData.readWorkbook();
    if(!dataset.available)return fail(res,503,'OPPORTUNITY_DATA_UNAVAILABLE','The supplied Salesforce opportunity workbook is not available.');
    sourceOpportunity=dataset.items.find(item=>item.sourceOpportunityId===String(b.sourceOpportunityId))||null;
    if(!sourceOpportunity)return fail(res,400,'INVALID_OPPORTUNITY_REFERENCE','The selected Opportunity ID is missing, duplicated, or no longer present in the supplied workbook.');
    if(b.opportunityId!==sourceOpportunity.opportunityId)return fail(res,400,'INVALID_OPPORTUNITY_REFERENCE','Opportunity ID must match the selected workbook row.');
    if(b.account&&b.account.toLowerCase()!==sourceOpportunity.account.toLowerCase())return fail(res,400,'ACCOUNT_MISMATCH','Customer must match the selected workbook opportunity.');
    if(user.role==='Client Partner'&&sourceOpportunity.account.toLowerCase()!==String(user.account).toLowerCase())return fail(res,403,'FORBIDDEN','The selected opportunity is outside your assigned customer.');
    b.opportunityId=sourceOpportunity.opportunityId;b.account=sourceOpportunity.account;
    b.opportunityName=b.opportunityName||sourceOpportunity.opportunityName;
    b.sourceOpportunity={...sourceOpportunity};
   }
   b.owner=user.role==='Client Partner'?(store.data.users.find(u=>u.role==='Sales/Pricing Analyst'&&u.account===b.account)?.name||'Not assigned'):(b.owner||user.name);b.discountPct=b.discountPct??0;b.colaPct=b.colaPct??0;b.targetMarginPct=b.targetMarginPct??store.data.config.targetMarginPct;
   const detailError=L.validateDetails(b);if(detailError)return fail(res,400,'VALIDATION_ERROR',detailError);
   if(user.role==='Client Partner'&&b.account.toLowerCase()!==String(user.account).toLowerCase())return fail(res,403,'FORBIDDEN','Use your assigned account.');
   if(!b.opportunityId || !b.opportunityName || !b.account)return fail(res,400,'VALIDATION_ERROR','opportunityId, opportunityName and account are required.');
   let c=store.data.cases.find(x=>x.opportunityId===b.opportunityId);
   if(c){if(!allowedCase(res,user,c))return;audit(user,'DUPLICATE_PRICING_REQUEST','PricingCase',c.id,{opportunityId:b.opportunityId});const locked=['Closed Won','Cancelled'].includes(c.status);const message=locked?`Opportunity reference already belongs to ${c.id}, which is ${c.status} and read-only. Use a new opportunity reference for a separate pricing request or ask an Administrator to reopen this case.`:`Existing case ${c.id} returned; duplicate request prevented.`;return send(res,200,{case:safeCase(c,user),duplicate:true,message});}
   c={id:newId('PT'),opportunityId:b.opportunityId,opportunityName:b.opportunityName,account:b.account,bu:b.bu||'TMT1',status:'New',lifecycle:'Open',owner:user.name,requestedById:user.id,requestedBy:user.name,assignedUsers:[user.id,'u-admin',...store.data.users.filter(u=>u.role==='Finance'||u.role==='Sales/Pricing Analyst'&&u.account===b.account).map(u=>u.id)],financeVisible:true,costVisible:false,budget:Number(b.budget||0),targetMarginPct:Number(store.data.config.targetMarginPct),currency:b.currency||'USD',workTypes:b.workTypes||['T&M'],lines:[],revision:1,draftSavedAt:new Date().toISOString(),versions:[],comments:[],exceptions:[],handoffs:[],audit:[],sourceOpportunity:sourceOpportunity?{id:sourceOpportunity.sourceOpportunityId,proposalNumber:sourceOpportunity.proposalNumber,stage:sourceOpportunity.stage,sourceFile:'Salesforce sythetic data.xlsx'}:undefined,opportunitySnapshot:{...b,receivedAt:new Date().toISOString(),source:sourceOpportunity?'Supplied Salesforce Excel dataset (local)':p==='/api/v1/salesforce/pricing-requests'?'Mock Salesforce Request Pricing':'Manual sample provider'}};
   Object.assign(c,L.detailValues(b));c.assignedUsers=[...new Set([...c.assignedUsers,...store.data.users.filter(u=>['BU Head','BU SPOC'].includes(u.role)&&u.bu===c.bu).map(u=>u.id)])];L.defaults(c);c.stage='Suspect';c.stageChangedAt=new Date().toISOString();store.data.cases.unshift(c);for(const role of ['Sales/Pricing Analyst','BU SPOC'])if(!store.data.users.some(u=>u.role===role&&c.assignedUsers.includes(u.id)))addException(c,'Missing assignment','No assigned '+role+' for this case.','u-admin','High',true);audit(user,'PRICING_CASE_CREATED','PricingCase',c.id,{opportunityId:c.opportunityId,source:'Manual sample provider'});saveStore(store);return send(res,201,{case:safeCase(c,user),duplicate:false});
 }
 if(p.startsWith('/api/v1/cases/')) {
  const parts=p.split('/').filter(Boolean), id=parts[3], c=resolveCase(id);
  if(!c)return fail(res,404,'NOT_FOUND','Case not found or access denied.'); if(!allowedCase(res,user,c))return;
  if(method!=='GET'&&['Closed Won','Cancelled'].includes(c.status)&&parts[4]!=='reopen')return fail(res,409,'CASE_LOCKED','This case retains read-only history.');
  if(!fixtureAuth&&c.pricingRuleSet==='WORKBOOK'&&parts[4]==='salesforce-lifecycle')return fail(res,403,'EXTERNAL_EVENT_REQUIRED','Sales lifecycle changes originate from the external Salesforce event adapter.');
  if(await pocApi(req,res,url,user,c,{send,fail,readBody,requireRole,audit,save:()=>saveStore(store),safeCase,calculate,newId,queueHandoff,config:store.data.config,rates:store.data.rates,cases:store.data.cases,users:store.data.users,notify,readyApproval}))return;
  if(method==='GET' && parts.length===4)return send(res,200,{case:safeCase(c,user),calculation:safeCalculation(calculate(c),user,c)});
  if(method==='GET' && parts[4]==='draft')return send(res,200,{revision:c.revision,lines:safeCase(c,user).lines,savedAt:c.draftSavedAt,calculation:safeCalculation(calculate(c),user,c)});
  if(method==='PUT' && parts[4]==='draft' && parts[5]==='sections' && parts[6]){
    if(!['Admin','Sales/Pricing Analyst','BU SPOC','BU Head'].includes(user.role))return fail(res,403,'FORBIDDEN','Role cannot edit pricing drafts.');
    const b=await readBody(req);if(Number(b.revision)!==Number(c.revision))return fail(res,409,'REVISION_CONFLICT','Draft has changed since it was loaded.',{expected:c.revision,received:b.revision,currentLines:safeCase(c,user).lines});
    const previous=JSON.stringify(c.lines);
    const previousLines=structuredClone(c.lines);
    if(parts[6]==='resource-estimates') { if(!Array.isArray(b.lines)||b.lines.length>500||b.lines.some(l=>!l||typeof l!=='object'||Array.isArray(l)))return fail(res,400,'VALIDATION_ERROR','Supply at most 500 resource objects.');const lineIds=b.lines.map(l=>l.id).filter(Boolean);if(new Set(lineIds).size!==lineIds.length)return fail(res,400,'VALIDATION_ERROR','Resource IDs must be unique.');c.lines=b.lines.map((l,i)=>{const old=c.lines.find(x=>x.id===l.id);const merged={...(old||{}),...l,id:l.id||newId('L'),account:c.account};merged.bu=c.bu;if(!canSeeCost(user,c))merged.costPerHour=old?.costPerHour;if(c.pricingRuleSet==='WORKBOOK'){delete merged.costPerHour;merged.currency=c.currency;const allowed=['id','account','bu','workType','role','grade','location','classification','quantity','availability','currency','hoursPerPeriod','utilizationPct','periods','startDate','endDate','workbookRateKey','productUnitCost','productQuantity','productRevenue'];for(const k of Object.keys(merged))if(!allowed.includes(k))delete merged[k];if(!canSeeCost(user,c))merged.productUnitCost=old?.productUnitCost;}return merged;});c.workTypes=[...new Set(c.lines.map(l=>l.workType).filter(Boolean))]; }
    if(parts[6]!=='resource-estimates')return fail(res,400,'VALIDATION_ERROR','Use the validated case-details form.');
    if(previous!==JSON.stringify(c.lines)){c.revision++;c.costHistory=c.costHistory||[];for(const line of c.lines){const old=previousLines.find(l=>l.id===line.id);if(old?.costPerHour!==line.costPerHour)c.costHistory.unshift({lineId:line.id,role:line.role,grade:line.grade,currency:line.currency,previousCost:old?.costPerHour??null,costPerHour:line.costPerHour,actor:user.name,at:new Date().toISOString(),revision:c.revision});}}c.draftSavedAt=new Date().toISOString();c.status=c.status==='New'?'In Progress':c.status;audit(user,'DRAFT_SECTION_SAVED','PricingCase',c.id,{section:parts[6],revision:c.revision});saveStore(store);return send(res,200,{revision:c.revision,savedAt:c.draftSavedAt,calculation:safeCalculation(calculate(c),user,c)});
  }
  if(method==='POST'&&parts[4]==='resource-validation'){
   if(!requireRole(res,user,['BU SPOC','Admin']))return;const b=await readBody(req);if(Number(b.revision)!==c.revision)return fail(res,409,'REVISION_CONFLICT','Resource validation revision is stale.');if(!b.reason?.trim())return fail(res,400,'REASON_REQUIRED','Resource validation notes required.');
   if(c.pricingRuleSet==='WORKBOOK'){
    if(!c.techCoeUserIds?.includes(user.id))return fail(res,403,'TECH_COE_REQUIRED','Only the assigned named Tech COE can validate these estimates.');
    if(calculate(c).exceptions.length)return fail(res,422,'RESOURCE_INPUTS_REQUIRED','Resolve workbook/resource validation errors before validation.');
    c.resourceValidations=(c.resourceValidations||[]).filter(v=>v.userId!==user.id);
    c.resourceValidations.push({userId:user.id,revision:c.revision,actor:user.name,at:new Date().toISOString(),reason:b.reason});
    if(c.techCoeUserIds.every(id=>c.resourceValidations.some(v=>v.userId===id&&v.revision===c.revision)))c.resourceValidation={revision:c.revision,actor:'All assigned Tech COEs',at:new Date().toISOString(),reason:b.reason};else delete c.resourceValidation;
   }else c.resourceValidation={revision:c.revision,actor:user.name,at:new Date().toISOString(),reason:b.reason};
   audit(user,'RESOURCES_VALIDATED','PricingCase',c.id,{revision:c.revision,reason:b.reason});saveStore(store);return send(res,200,{case:safeCase(c,user)});
  }
  if(method==='POST' && parts[4]==='calculate')return send(res,200,{calculation:safeCalculation(calculate(c),user,c)});
  if(method==='POST' && parts[4]==='validate-submission') {
    const calc=calculate(c),config=store.data.config,blockers=calc.exceptions.map(e=>e.reason);if(c.exceptions.some(e=>e.status==='Open'&&e.blocking))blockers.push('Resolve case exceptions before submitting.');if(c.pricingRuleSet==='WORKBOOK'&&!c.scope?.trim())blockers.push('Record delivery scope before submitting.');if(c.pricingRuleSet==='WORKBOOK'&&c.opportunityType==='Renewal'&&!c.priorScope?.trim())blockers.push('Record prior agreement/SOW evidence.');
    if(!config.demoMode)blockers.push('Demo submission is unavailable because demo mode is disabled.');
    if(!['Proposal','Negotiation','Approval'].includes(c.stage))blockers.push('Complete discovery stages through Proposal before submitting.');
    if(config.pendingVersionPolicy!=='supersede'&&c.versions.some(v=>v.status==='Pending Approval'))blockers.push('Resolve the pending pricing version before submitting another version.');
    const saved=c.calculations.findLast(x=>x.revision===c.revision&&JSON.stringify(x.calculation)===JSON.stringify(calc));
    if(!saved)blockers.push('Save Calculation for the current inputs before submitting.');
    if((config.requireResourceValidation||c.pricingRuleSet==='WORKBOOK')&&c.resourceValidation?.revision!==c.revision)blockers.push(c.resourceValidation?.revision===undefined?'BU SPOC has not validated resources for the current revision.':`BU SPOC validation is for revision ${c.resourceValidation.revision}; validate revision ${c.revision} before submitting.`);
    if(saved&&c.versions.some(v=>v.revision===c.revision&&v.calculationId===saved.id&&!['Rejected','Returned','Superseded'].includes(v.status)))blockers.push('This calculation has already been submitted. Revise the draft before resubmitting.');
    try{if(require('./policy').route(c,calc,store.data).some(a=>!a.assignedUserIds.length))blockers.push('Approval route has a missing assigned approver.');}catch(error){blockers.push(error.message);}
    const productionBlockers=['Production submission is disabled until workbook parity and Finance sign-off are verified.'];
    if(!config.formulaApproved)productionBlockers.push('Finance rule approval is pending.');
    if(config.demoMode)productionBlockers.push('Demo mode is enabled; production submissions are unavailable.');
    const demoSubmissionAllowed=Boolean(config.demoMode)&&blockers.length===0;
    return send(res,200,{valid:demoSubmissionAllowed,demoSubmissionAllowed,blockers,warnings:calc.warnings,productionReady:false,productionBlockers});
  }
  if(method==='POST' && parts[4]==='comments'){const b=await readBody(req);if(!b.text?.trim())return fail(res,400,'VALIDATION_ERROR','Comment text is required.');const comment={id:newId('C'),author:user.name,text:b.text.trim(),createdAt:new Date().toISOString()};c.comments.unshift(comment);audit(user,'COMMENT_ADDED','PricingCase',c.id,{commentId:comment.id});saveStore(store);return send(res,201,{comment});}
  if(method==='POST' && parts[4]==='cancel'){if(!requireRole(res,user,['Admin','Sales/Pricing Analyst']))return;const b=await readBody(req);if(!b.reason?.trim())return fail(res,400,'REASON_REQUIRED','Cancellation reason is required.');c.status='Cancelled';c.lifecycle='Cancelled';c.cancelReason=b.reason;for(const v of c.versions)if(v.status==='Pending Approval')v.status='Cancelled';audit(user,'CASE_CANCELLED','PricingCase',c.id,{reason:b.reason});saveStore(store);return send(res,200,{case:safeCase(c,user)});}
  if(method==='POST' && parts[4]==='reopen'){if(!requireRole(res,user,['Admin']))return;const b=await readBody(req);if(!b.reason?.trim())return fail(res,400,'REASON_REQUIRED','Reopen reason is required.');if(!['Cancelled','Closed Won'].includes(c.status))return fail(res,409,'INVALID_STATE','Only cancelled or Closed Won cases can be reopened.');c.reopenHistory=c.reopenHistory||[];c.reopenHistory.push({actor:user.name,reason:b.reason,at:new Date().toISOString(),previousStatus:c.status,closedWonVersionId:c.closedWonVersionId,finalOffer:structuredClone(c.finalOffer||null),handoffs:c.handoffs.map(h=>({id:h.id,status:h.status}))});c.reconciliationRequired=c.handoffs.some(h=>h.status==='Accepted');c.status='Reopened';c.lifecycle='Open';c.revision++;delete c.agreedVersionId;delete c.closedWonVersionId;delete c.finalOffer;L.move(c,'Negotiation',user,b.reason);audit(user,'CASE_REOPENED','PricingCase',c.id,{reason:b.reason});saveStore(store);return send(res,200,{case:safeCase(c,user)});}
  if(method==='POST' && parts[4]==='salesforce-lifecycle'){if(!requireRole(res,user,['Admin']))return;const b=await readBody(req);c.lifecycle=b.lifecycle||c.lifecycle;c.salesforceEvents=c.salesforceEvents||[];c.salesforceEvents.unshift({id:newId('SF-EVT'),lifecycle:c.lifecycle,receivedAt:new Date().toISOString(),payload:b});if(c.lifecycle==='Closed Won'){const result=validateClosedWon(c,b.versionId);if(!result.ok){c.lifecycle='Open';addException(c,'Salesforce lifecycle conflict',result.reason,'u-admin','High',true);saveStore(store);return fail(res,422,'CLOSED_WON_VERSION_INVALID',result.reason);}c.closedWonVersionId=b.versionId;c.status='Closed Won';c.finalOffer=L.offerSummary(c);L.move(c,'Closed Won',user,'Legacy lifecycle update after validated contract/launch');}if(c.lifecycle==='Lost'||c.lifecycle==='Cancelled'){c.status='Cancelled';c.cancelReason=b.reason||'Salesforce opportunity cancelled/lost';}audit(user,'SALESFORCE_LIFECYCLE_RECEIVED','PricingCase',c.id,{lifecycle:c.lifecycle});saveStore(store);return send(res,200,{case:safeCase(c,user)});}
  if(method==='POST' && parts[4]==='mark-agreed'){if(!requireRole(res,user,['Admin','Sales/Pricing Analyst','BU SPOC']))return;const b=await readBody(req);const v=c.versions.find(x=>x.id===b.versionId);if(!v)return fail(res,404,'VERSION_NOT_FOUND','Version not found.');if(v.status!=='Approved')return fail(res,409,'VERSION_NOT_APPROVED','Only approved versions can be marked agreed.');if(!b.evidence?.trim())return fail(res,400,'EVIDENCE_REQUIRED','Agreement evidence is required.');if(v.revision!==c.revision)return fail(res,409,'STALE_VERSION','Approve a version of the current draft first.');v.status='Agreed';c.agreedVersionId=v.id;c.status='Agreed';v.agreedAt=new Date().toISOString();v.agreedBy=user.name;v.agreementEvidence=b.evidence.trim();audit(user,'VERSION_MARKED_AGREED','PricingVersion',v.id,{caseId:c.id});saveStore(store);return send(res,200,{version:safeCase(c,user).versions.find(x=>x.id===v.id)});}
  if(method==='POST' && parts[4]==='restore-to-draft'){if(!requireRole(res,user,['Admin','Sales/Pricing Analyst','BU SPOC','BU Head']))return;const b=await readBody(req);const v=c.versions.find(x=>x.id===b.versionId);if(!v)return fail(res,404,'VERSION_NOT_FOUND','Version not found.');c.lines=JSON.parse(JSON.stringify(v.snapshot));Object.assign(c,v.pricingTerms||{discountPct:0,colaPct:0});if(c.pricingRuleSet==='WORKBOOK'&&c.opportunityType==='Renewal')c.colaPct=store.data.config.colaPolicy.pct;if(v.pricingTerms?.offeredPrice===undefined)delete c.offeredPrice;c.revision++;c.draftSavedAt=new Date().toISOString();c.status='In Progress';L.move(c,'Negotiation',user,'Restored V'+v.number+' for rework');audit(user,'VERSION_RESTORED_AS_DRAFT','PricingVersion',v.id,{caseId:c.id,approvalNotRestored:true,reason:b.reason||''});saveStore(store);return send(res,200,{case:safeCase(c,user),revision:c.revision});}
  if(method==='GET' && parts[4]==='versions' && parts[5]==='compare'){const left=url.searchParams.get('left'),right=url.searchParams.get('right');const a=c.versions.find(v=>v.id===left),b=c.versions.find(v=>v.id===right);if(!a||!b)return fail(res,404,'VERSION_NOT_FOUND','Both versions must exist.');return send(res,200,{left:safeCase(c,user).versions.find(v=>v.id===a.id),right:safeCase(c,user).versions.find(v=>v.id===b.id)});}
 }
 if(p.startsWith('/api/v1/versions/') && method==='POST'){
   const parts=p.split('/').filter(Boolean), versionId=parts[3], action=parts[6], taskId=parts[5];const found=store.data.cases.map(c=>({c,v:c.versions.find(v=>v.id===versionId)})).find(x=>x.v&&canAccessCase(user,x.c));if(!found)return fail(res,404,'NOT_FOUND','Version not found or access denied.');const {c,v}=found;if(!allowedCase(res,user,c))return;if(['Closed Won','Cancelled'].includes(c.status))return fail(res,409,'CASE_LOCKED','Case history is read-only.');
   if(action==='approve'||action==='reject'||action==='send-back'){
     const b=await readBody(req);
     if(action!=='approve'&&!b.reason?.trim())return fail(res,400,'REASON_REQUIRED','Rejection reason is required.');
     if(v.status!=='Pending Approval')return fail(res,409,'INVALID_STATE','Version is not awaiting approval.');
     const task=v.approvals.find(a=>String(a.step)===String(taskId)||a.role===taskId);
     if(!task)return fail(res,404,'TASK_NOT_FOUND','Approval task not found.');
     if(task.status!=='Pending')return fail(res,409,'TASK_ALREADY_DECIDED','Approval task is no longer pending.');
     if(v.submittedById===user.id&&(!fixtureAuth||user.role!=='Admin'))return fail(res,403,'SELF_APPROVAL_BLOCKED','Submitter cannot approve their own pricing version.');
     if(!policy.canApprove(user,c,task,store.data))return fail(res,403,'APPROVAL_ROLE_MISMATCH','Only the assigned approval role can act on this task.');
     if(v.approvals.some(a=>a.step<task.step&&a.status!=='Approved'))return fail(res,409,'SEQUENTIAL_APPROVAL_REQUIRED','Previous approval steps must be approved first.');
     task.status=action==='approve'?'Approved':action==='send-back'?'Returned':'Rejected';
     task.actor=user.name;task.actorId=user.id;task.at=new Date().toISOString();task.reason=b.reason||'';
     audit(user,`VERSION_${action.toUpperCase()}_STEP_${task.step}`,'PricingVersion',v.id,{caseId:c.id,taskRole:task.role,reason:task.reason});
     if(action!=='approve'){
      v.status=action==='send-back'?'Returned':'Rejected';v.rejectionReason=b.reason;c.status='In Progress';L.move(c,'Negotiation',user,b.reason);
      const outcome=action==='send-back'?'returned for changes':'rejected';
      for(const userId of outcomeRecipients(c,v))notify({userId,c,v,event:`VERSION_${action.toUpperCase()}`,title:`V${v.number} ${outcome}: ${c.opportunityName}`,message:`V${v.number} was ${outcome}.`,route:'versions',reason:task.reason});
     }else if(v.approvals.every(a=>a.status==='Approved')){
      v.status='Approved';v.approvedAt=new Date().toISOString();c.status='Negotiation';
      for(const userId of outcomeRecipients(c,v))notify({userId,c,v,event:'VERSION_APPROVED',title:`V${v.number} approved: ${c.opportunityName}`,message:`V${v.number} has completed internal approval.`,route:'versions'});
     }else{
      const next=readyApproval(v);
      if(next)for(const userId of next.assignedUserIds)notify({userId,c,v,task:next,event:'APPROVAL_READY',title:`Approval required: ${c.opportunityName} - V${v.number}`,message:`V${v.number} is awaiting your ${next.role} review.`,route:'approvals'});
     }
     saveStore(store);return send(res,200,{version:safeCase(c,user).versions.find(x=>x.id===v.id),case:safeCase(c,user)});
   }
 }
 if(method==='GET' && p==='/api/v1/rates')return send(res,200,{items:store.data.rates.filter(r=>!r.account||store.data.cases.some(c=>canAccessCase(user,c)&&c.account===r.account))});
 if(method==='POST' && p==='/api/v1/rates/proposals'){if(!requireRole(res,user,['Admin','BU SPOC','Finance']))return;const b=await readBody(req);for(const f of ['bu','workType','role','grade','location','currency','amount','startDate'])if(b[f]===undefined||b[f]==='')return fail(res,400,'VALIDATION_ERROR',`Missing ${f}`);if(!Number.isFinite(Number(b.amount))||Number(b.amount)<=0||!L.CURRENCIES.includes(b.currency)||!L.validDate(b.startDate)||(b.endDate&&(!L.validDate(b.endDate)||b.endDate<b.startDate)))return fail(res,400,'VALIDATION_ERROR','Supply a positive rate, supported currency and valid effective dates.');
 if(b.supersedesId&&!store.data.rates.some(r=>r.id===b.supersedesId&&r.status==='Approved'))return fail(res,400,'VALIDATION_ERROR','Replacement must reference an approved rate.');
 const proposal={...b,id:newId('RP'),amount:Number(b.amount),status:'Pending Finance Approval',proposedBy:user.id,createdAt:new Date().toISOString()};store.data.rateProposals.unshift(proposal);audit(user,'RATE_PROPOSED','RateProposal',proposal.id,{role:proposal.role,amount:proposal.amount});saveStore(store);return send(res,201,{proposal});}
 if(p.startsWith('/api/v1/rates/') && p.endsWith('/approve') && method==='POST'){if(!requireRole(res,user,['Finance','Admin']))return;const id=p.split('/')[4],proposal=store.data.rateProposals.find(r=>r.id===id);if(!proposal)return fail(res,404,'PROPOSAL_NOT_FOUND','Rate proposal not found.');if(proposal.proposedBy===user.id)return fail(res,403,'SELF_APPROVAL_BLOCKED','A proposer cannot approve their own rate.');if(proposal.status!=='Pending Finance Approval')return fail(res,409,'INVALID_STATE','Proposal is not awaiting approval.');const b=await readBody(req);if(proposal.supersedesId){const old=store.data.rates.find(r=>r.id===proposal.supersedesId);if(!old||old.status!=='Approved')return fail(res,409,'STALE_RATE','This rate has already been replaced. Propose against the current rate.');old.status='Superseded';old.supersededAt=new Date().toISOString();old.supersededBy=proposal.id;}proposal.status='Approved';proposal.approvedBy=user.id;proposal.approvedAt=new Date().toISOString();proposal.approvalNote=b.note||'';const rate={...proposal,id:newId('RATE'),scope:proposal.account?'Client':'Standard',status:'Approved',approvedBy:user.id};store.data.rates.unshift(rate);audit(user,'RATE_APPROVED','RateRecord',rate.id,{proposalId:proposal.id});saveStore(store);return send(res,200,{proposal,rate});}
 if(method==='GET' && p==='/api/v1/exceptions')return send(res,200,{items:store.data.cases.filter(c=>canAccessCase(user,c)).flatMap(c=>c.exceptions.map(e=>({...e,caseName:c.opportunityName,caseId:c.id})))});
 if(p.startsWith('/api/v1/exceptions/') && method==='POST'){const parts=p.split('/').filter(Boolean),eId=parts[3],action=parts[4],c=store.data.cases.find(x=>x.exceptions.some(e=>e.id===eId));if(!c)return fail(res,404,'EXCEPTION_NOT_FOUND','Exception not found.');if(!allowedCase(res,user,c))return;const e=c.exceptions.find(x=>x.id===eId);if(action==='assign'){if(!requireRole(res,user,['Admin']))return;const b=await readBody(req);if(!store.data.users.some(u=>u.id===b.owner))return fail(res,400,'INVALID_OWNER','Owner not found.');e.owner=b.owner;e.history.push({action:'assigned',actor:user.name,at:new Date().toISOString()});audit(user,'EXCEPTION_ASSIGNED','Exception',e.id,{caseId:c.id,owner:e.owner});}else if(action==='resolve'){if(!requireRole(res,user,['Admin','Finance','BU SPOC','CFO']))return;const b=await readBody(req);if(!b.notes?.trim())return fail(res,400,'RESOLUTION_REQUIRED','Resolution notes are required.');e.status='Resolved';e.resolvedAt=new Date().toISOString();e.resolutionNotes=b.notes;e.history.push({action:'resolved',actor:user.name,at:e.resolvedAt,notes:b.notes});audit(user,'EXCEPTION_RESOLVED','Exception',e.id,{caseId:c.id});}else return fail(res,404,'NOT_FOUND','Action not found.');saveStore(store);return send(res,200,{exception:e});}
 if(method==='GET' && p==='/api/v1/audit'&&!requireRole(res,user,['Admin','Finance','CFO','EVP Finance']))return;
 if(method==='GET' && p==='/api/v1/audit')return send(res,200,{items:store.data.audit.filter(e=>user.role==='Admin'||store.data.cases.some(c=>canAccessCase(user,c)&&(e.entityId===c.id||e.details.caseId===c.id))).slice(0,500)});
 if(method==='GET' && p==='/api/v1/pending-decisions')return send(res,200,{items:store.data.pendingDecisions,config:safeConfig()});
 if(method==='PATCH' && p.startsWith('/api/v1/pending-decisions/')){if(!requireRole(res,user,['Admin','Finance','CFO','EVP Finance']))return;const id=p.split('/')[4],d=store.data.pendingDecisions.find(x=>x.id===id);if(!d)return fail(res,404,'DECISION_NOT_FOUND','Decision not found.');const b=await readBody(req);if(b.status && !['Pending','Decided','Deferred'].includes(b.status))return fail(res,400,'VALIDATION_ERROR','Invalid decision status.');Object.assign(d,{status:b.status||d.status,decisionValue:b.decisionValue??d.decisionValue,owner:b.owner??d.owner,date:b.date??(b.status==='Decided'?new Date().toISOString().slice(0,10):d.date),impact:b.impact??d.impact});audit(user,'PENDING_DECISION_UPDATED','ConfigurationDecision',d.id,{status:d.status});saveStore(store);return send(res,200,{decision:d});}
 if(method==='PATCH' && p==='/api/v1/config'){if(!requireRole(res,user,['Admin','Finance','CFO','EVP Finance']))return;const b=await readBody(req);if(b.approvalPolicy!==undefined){const issue=policy.validate(b.approvalPolicy,store.data.users);if(issue)return fail(res,400,'INVALID_POLICY',issue);}if(b.requireResourceValidation!==undefined){if(user.role!=='Admin'||typeof b.requireResourceValidation!=='boolean')return fail(res,403,'FORBIDDEN','Administrator configures the resource-validation gate.');store.data.config.requireResourceValidation=b.requireResourceValidation;}if(b.pendingVersionPolicy!==undefined){if(user.role!=='Admin'||!['block','supersede'].includes(b.pendingVersionPolicy))return fail(res,400,'VALIDATION_ERROR','Pending-version policy must be block or demo supersede, set by Administrator.');store.data.config.pendingVersionPolicy=b.pendingVersionPolicy;}if(b.approvalPolicy!==undefined){if(user.role!=='Admin'||!Array.isArray(b.approvalPolicy.steps)||!b.approvalPolicy.steps.length||!b.approvalPolicy.steps.every(role=>store.data.users.some(u=>u.role===role)))return fail(res,400,'VALIDATION_ERROR','Approval policy requires known roles and administrative authority.');store.data.config.approvalPolicy={...b.approvalPolicy,label:'DEMO / UNAPPROVED'};}for(const key of ['targetMarginPct','fxRate','slaHours','retryLimit'])if(b[key]!==undefined&&(!Number.isFinite(Number(b[key]))||Number(b[key])<0||(key==='targetMarginPct'&&Number(b[key])>=100)))return fail(res,400,'VALIDATION_ERROR','Invalid numeric policy value: '+key);for(const key of ['fallbackAllowed','targetMarginPct','fxRate','slaHours','retryLimit'])if(b[key]!==undefined)store.data.config[key]=b[key];if(b.formulaApproved!==undefined&&['CFO','EVP Finance','Admin'].includes(user.role))store.data.config.formulaApproved=Boolean(b.formulaApproved);audit(user,'CONFIG_UPDATED','Configuration','pricing-config',b);saveStore(store);return send(res,200,{config:safeConfig()});}
 if(method==='GET' && p==='/api/v1/integrations/project-track/handoffs')return send(res,200,{items:store.data.cases.filter(c=>canAccessCase(user,c)).flatMap(c=>c.handoffs.map(h=>({...safeHandoff(h,user,c),caseName:c.opportunityName})))});
 if(method==='POST' && p==='/api/v1/integrations/project-track/handoffs'){if(!requireRole(res,user,['Admin','Sales/Pricing Analyst','BU SPOC']))return;const b=await readBody(req);if(b.eventType&&b.eventType!=='ClosedWon')return fail(res,409,'AMENDMENTS_DISABLED','Post-Closed-Won amendments are disabled pending business sign-off.');const c=resolveCase(b.caseId);if(!c)return fail(res,404,'CASE_NOT_FOUND','Case not found.');if(!allowedCase(res,user,c))return;if(!b.versionId)return fail(res,400,'VERSION_REQUIRED','versionId is required.');const v=c.versions.find(x=>x.id===b.versionId);if(!v)return fail(res,404,'VERSION_NOT_FOUND','Version not found.');if(c.status!=='Closed Won'||c.closedWonVersionId!==v.id||c.agreedVersionId!==v.id||v.status!=='Agreed')return fail(res,409,'VERSION_NOT_ELIGIBLE','Handoff requires the final approved and agreed Closed Won version.');if(c.reconciliationRequired)return fail(res,409,'RECONCILIATION_REQUIRED','Accepted downstream data must be reconciled before a replacement handoff.');const previous=c.handoffs.find(h=>h.versionId===v.id);if(!fixtureAuth&&previous?.status!=='Accepted'&&previous&&(previous.attempts>=store.data.config.retryLimit||previous.status==='Retry Scheduled'&&Date.parse(previous.nextRetryAt)>Date.now()))return fail(res,409,'RETRY_HELD','Retry limit reached or scheduled backoff is still active.');const mode=['success','reject','timeout'].includes(b.simulation)?b.simulation:'success';const h=mockHandoff(c,v,mode);saveStore(store);return send(res,200,{handoff:safeHandoff(h,user,c),mock:true});}
 if(method==='POST' && p.startsWith('/api/v1/integrations/project-track/handoffs/') && p.endsWith('/retry')){if(!requireRole(res,user,['Admin']))return;const id=p.split('/')[6],found=store.data.cases.map(c=>({c,h:c.handoffs.find(h=>h.id===id)})).find(x=>x.h);if(!found)return fail(res,404,'HANDOFF_NOT_FOUND','Handoff not found.');if(found.c.status!=='Closed Won'||found.c.reconciliationRequired)return fail(res,409,'RECONCILIATION_REQUIRED','Retry is held until Closed Won and reconciliation requirements are satisfied.');if(!fixtureAuth&&found.h.status!=='Accepted'&&(found.h.attempts>=store.data.config.retryLimit||found.h.status==='Retry Scheduled'&&Date.parse(found.h.nextRetryAt)>Date.now()))return fail(res,409,'RETRY_HELD','Retry limit reached or scheduled backoff is still active.');const v=found.c.versions.find(x=>x.id===found.h.versionId);const b=await readBody(req);const h=mockHandoff(found.c,v,b.simulation||'success');saveStore(store);return send(res,200,{handoff:safeHandoff(h,user,found.c),mock:true});}
 if(method==='GET'&&p.startsWith('/api/v1/integrations/project-track/handoffs/')){const id=p.split('/')[6];const found=store.data.cases.map(c=>({c,h:c.handoffs.find(h=>h.id===id)})).find(x=>x.h&&canAccessCase(user,x.c));if(!found)return fail(res,404,'NOT_FOUND','Handoff not found.');const h=structuredClone(found.h);if(!canSeeCost(user,found.c)){redactFinancial(h);delete h.payload.commercialSnapshot;h.payload.commercialLines?.forEach(l=>delete l.costPerHour);}return send(res,200,{handoff:h});}
 if(method==='POST'&&p==='/api/v1/integrations/project-track/acknowledgements'){if(!requireRole(res,user,['Admin']))return;const b=await readBody(req);const found=store.data.cases.map(c=>({c,h:c.handoffs.find(h=>h.id===b.handoffId)})).find(x=>x.h);if(!found)return fail(res,404,'NOT_FOUND','Handoff not found.');if(found.c.reconciliationRequired||found.c.status!=='Closed Won')return fail(res,409,'RECONCILIATION_REQUIRED','Handoff acknowledgement is held.');if(b.correlationId!==found.h.correlationId||!['Accepted','Rejected'].includes(b.status))return fail(res,400,'INVALID_ACK','Matching correlation ID and Accepted/Rejected status required.');if(found.h.status==='Accepted'){if(b.status!=='Accepted')return fail(res,409,'ALREADY_ACCEPTED','Accepted acknowledgement cannot be reversed.');return send(res,200,{duplicate:true,handoff:safeHandoff(found.h,user,found.c)});}found.h.status=b.status;found.h.updatedAt=new Date().toISOString();found.h.events.push({type:'Acknowledgement',status:b.status,at:found.h.updatedAt});audit(user,'HANDOFF_ACKNOWLEDGED','PricingCase',found.c.id,{handoffId:found.h.id,status:b.status});saveStore(store);return send(res,200,{handoff:safeHandoff(found.h,user,found.c),mock:true});}
 if(method==='POST' && p==='/api/v1/salesforce/simulate'){if(!requireRole(res,user,['Admin']))return;const b=await readBody(req);const c=resolveCase(b.caseId);if(!c)return fail(res,404,'CASE_NOT_FOUND','Case not found.');if(c.pricingRuleSet==='WORKBOOK')return fail(res,403,'EXTERNAL_EVENT_REQUIRED','Source-linked cases use external Salesforce events.');if(['Closed Won','Cancelled'].includes(c.status))return fail(res,409,'CASE_LOCKED','Case history is read-only.');if(b.lifecycle==='Closed Won')return fail(res,422,'WORKFLOW_REQUIRED','Use the validated workflow action to reach Closed Won.');c.salesforceEvents=c.salesforceEvents||[];c.salesforceEvents.unshift({id:newId('SF-EVT'),event:b.event||'OpportunityUpdated',payload:b,receivedAt:new Date().toISOString()});if(b.event==='OpportunityLost'||b.event==='OpportunityCancelled'){c.status='Cancelled';c.lifecycle=b.event==='OpportunityLost'?'Lost':'Cancelled';c.cancelReason=b.reason||'Simulated Salesforce lifecycle event';}else c.lifecycle=b.lifecycle||c.lifecycle;audit(user,'SALESFORCE_EVENT_SIMULATED','PricingCase',c.id,{event:b.event||'OpportunityUpdated'});saveStore(store);return send(res,200,{case:safeCase(c,user),adapter:'MOCK'});}
 return fail(res,404,'ROUTE_NOT_FOUND',`No route for ${method} ${p}`);
}

let requestQueue=Promise.resolve();
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','same-origin');
 const url=new URL(req.url,'http://localhost');
 if(url.pathname.startsWith('/api/')){await new Promise(resolve=>{requestQueue=requestQueue.then(async()=>{const before=structuredClone(store.data);try{await api(req,res,url);if(res.statusCode>=400)store.data=before;}catch(err){store.data=before;console.error(err.message);if(!res.headersSent)fail(res,err.message==='Invalid JSON body'?400:500,err.message==='Invalid JSON body'?'INVALID_JSON':'INTERNAL_ERROR',err.message==='Invalid JSON body'?'Supply valid JSON.':'Unexpected server error.');}finally{resolve();}});});return;}
 let target=path.resolve(PUBLIC,'.'+decodeURIComponent(url.pathname));if(!target.startsWith(PUBLIC))target=path.join(PUBLIC,'index.html');if(url.pathname==='/'||!path.extname(target))target=path.join(PUBLIC,'index.html');fs.readFile(target,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':MIME[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(data);});
});
const ready=openStore({provider:process.env.DB_PROVIDER||(process.env.DATA_FILE?'json':'sqlite'),path:process.env.SQLITE_PATH,legacyPath:process.env.DATA_FILE}).then(async s=>{store=s;store.data.notifications=store.data.notifications||[];store.data.cases.forEach(L.defaults);require('./policy').migrate(store.data);if(!fixtureAuth){const source=await opportunityData.readWorkbook();if(!source.available)throw Error('Salesforce workbook missing.');store.data.config.workbookReference=await workbook.loadReference();enterprise.sync(store.data,source.items);enterprise.provision(store.data,ACCESS_DIR);await renewalRefresh();}saveStore(store);return new Promise(resolve=>server.listen(PORT,'127.0.0.1',()=>{console.log('Price Track POC on http://localhost:'+server.address().port+' ('+(store.provider||'json')+', mock adapters)');resolve();}));});
ready.catch(error=>{console.error('Startup failed:',error.message);process.exitCode=1;});

const renewalTimer=setInterval(()=>{requestQueue=requestQueue.then(async()=>{if(store&&!fixtureAuth){await renewalRefresh();saveStore(store);}}).catch(error=>console.error('Renewal reminder refresh failed:',error.message));},60000);renewalTimer.unref();server.once('close',()=>clearInterval(renewalTimer));
module.exports={server,ready};
