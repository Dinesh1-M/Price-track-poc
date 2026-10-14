'use strict';
const crypto=require('node:crypto');
const auth=require('./auth'),enterprise=require('./enterprise-data'),intake=require('./external-intake'),sourceData=require('./salesforce-opportunities'),L=require('./lifecycle');
const {validateClosedWon}=require('./domain');
module.exports=async function enterpriseApi(req,res,url,user,store,deps){
 const {send,fail,readBody,audit,save,accessDir,queueHandoff}=deps,p=url.pathname,method=req.method;
 if(p==='/api/v1/auth/login'&&method==='POST'){
  const outcome=auth.login(req,res,store.data,await readBody(req));if(outcome.status)fail(res,outcome.status,'LOGIN_FAILED',outcome.message);else{audit(outcome.user,'LOGIN','User',outcome.user.id);save();send(res,200,{user:auth.publicUser(outcome.user)});}return true;
 }
 if(p==='/api/v1/auth/logout'&&method==='POST'){auth.logout(req,res);send(res,200,{ok:true});return true;}
 if(p==='/api/v1/auth/session'&&method==='GET'){if(user)send(res,200,{user:auth.publicUser(user)});else fail(res,401,'LOGIN_REQUIRED','Sign in to Price Track.');return true;}
 if(p==='/api/v1/auth/password'&&method==='POST'){
  if(!user){fail(res,401,'LOGIN_REQUIRED','Sign in first.');return true;}
  const b=await readBody(req);if(!auth.verifyPassword(b.currentPassword||'',user.passwordHash)||typeof b.newPassword!=='string'||b.newPassword.length<12||b.newPassword.length>256){fail(res,400,'INVALID_PASSWORD','Verify your current password and supply a new password of 12–256 characters.');return true;}
  user.passwordHash=auth.hashPassword(b.newPassword);user.authVersion=(user.authVersion||1)+1;auth.issue(res,user);audit(user,'PASSWORD_CHANGED','User',user.id);save();send(res,200,{ok:true});return true;
 }
 if(p.startsWith('/api/v1/integrations/salesforce/')&&method==='POST'){
  if(!auth.externalAuthorized(req,store.data)){fail(res,401,'INVALID_INTEGRATION_TOKEN','Valid external integration token required.');return true;}
  const b=await readBody(req),dataset=await sourceData.readWorkbook();if(!dataset.available){fail(res,503,'SOURCE_UNAVAILABLE','Salesforce synthetic workbook unavailable.');return true;}
  if(p.endsWith('/pricing-requests')){
   enterprise.sync(store.data,dataset.items);const outcome=intake.receive(b,store.data,dataset.items);
   if(outcome.error){fail(res,outcome.status,'INTAKE_REJECTED',outcome.error);return true;}
   enterprise.provision(store.data,accessDir);audit({id:'external-salesforce',name:'External Salesforce adapter'},outcome.duplicate?'INTAKE_REPLAYED':'EXTERNAL_PRICING_REQUEST','PricingCase',outcome.case.id,{requestId:b.requestId,opportunityId:b.opportunityId});save();send(res,outcome.status,{caseId:outcome.case.id,opportunityId:outcome.case.opportunityId,duplicate:outcome.duplicate});return true;
  }
  if(p.endsWith('/events')){
   if(!/^[A-Za-z0-9._:-]{3,120}$/.test(String(b.eventId||''))){fail(res,400,'EVENT_ID_REQUIRED','Supply a unique event ID.');return true;}
   const replay=store.data.integrationEvents.find(e=>e.id===b.eventId);if(replay){if(replay.opportunityId!==b.opportunityId)fail(res,409,'EVENT_CONFLICT','Event ID belongs to another opportunity.');else send(res,200,{duplicate:true,caseId:replay.caseId});return true;}
   const source=dataset.items.find(x=>x.opportunityId===b.opportunityId),c=store.data.cases.find(x=>x.opportunityId===b.opportunityId);if(!source||!c){fail(res,404,'NOT_FOUND','Source opportunity or pricing case not found.');return true;}
   if(source.account!==c.account||source.owner!==c.sourceOpportunity?.owner){fail(res,409,'SOURCE_OWNERSHIP_CHANGED','Account/owner changed. Reconcile access before applying this event.');return true;}
   const changed=['currency','amount','type','projectStartDate','projectEndDate','capability','vertical'].filter(k=>source[k]!==c.sourceOpportunity[k]);
   if(changed.length){fail(res,409,'SOURCE_TERMS_CHANGED','Source commercial terms changed: '+changed.join(', ')+'. Reconciliation and reapproval required.');return true;}
   if(source.stage==='Closed Won'){
    if(c.status==='Closed Won'){send(res,200,{duplicate:true,caseId:c.id});return true;}
    const check=validateClosedWon(c,c.agreedVersionId);if(!check.ok){fail(res,422,'CLOSED_WON_BLOCKED',check.reason);return true;}
    c.closedWonVersionId=c.agreedVersionId;c.finalOffer=L.offerSummary(c);c.closedWonAt=new Date().toISOString();c.lifecycle='Closed Won';c.status='Closed Won';L.move(c,'Closed Won',{name:'External Salesforce adapter'},'Source Closed Won event '+b.eventId);if(!c.reconciliationRequired)queueHandoff(c,L.accepted(c));
   }else if(source.stage==='Closed Lost'){
    if(c.status==='Closed Won'){fail(res,409,'RECONCILIATION_REQUIRED','Closed Won history requires controlled reopening.');return true;}
    c.status='Cancelled';c.lifecycle='Lost';c.cancelReason='Salesforce source Closed Lost';for(const v of c.versions.filter(v=>v.status==='Pending Approval')){v.status='Superseded';for(const t of v.approvals.filter(t=>t.status==='Pending'))t.status='Cancelled';}
   }else if(['Closed Won','Cancelled'].includes(c.status)){fail(res,409,'CASE_LOCKED','Use an audited administrator reopening.');return true;}
   c.sourceOpportunity=source;c.sourceStage=source.stage;store.data.integrationEvents.unshift({id:b.eventId,event:'OpportunityReconciled',opportunityId:b.opportunityId,caseId:c.id,receivedAt:new Date().toISOString(),sourceStage:source.stage});audit({id:'external-salesforce',name:'External Salesforce adapter'},'SALESFORCE_EVENT_RECEIVED','PricingCase',c.id,{eventId:b.eventId,stage:source.stage});save();send(res,200,{caseId:c.id,status:c.status});return true;
  }
 }
 if(p==='/api/v1/finance/cola-policy'&&method==='PATCH'){
  if(!user||!['Finance','EVP Finance'].includes(user.role)){fail(res,user?403:401,'FINANCE_REQUIRED','Finance access required.');return true;}
  const b=await readBody(req),policy=require('./renewal-policy').defaults(store.data);
  if(b.revision!==policy.revision){fail(res,409,'STALE_POLICY','Refresh the COLA policy before editing.');return true;}
  if(typeof b.reason!=='string'||!b.reason.trim()||typeof b.pct!=='number'||!Number.isFinite(b.pct)||b.pct<0||b.pct>=100){fail(res,400,'INVALID_COLA','Supply a reason and COLA from 0 to below 100%.');return true;}
  if(b.approve===true&&user.role!=='EVP Finance'){fail(res,403,'EVP_REQUIRED','EVP Finance must complete annual approval.');return true;}
  store.data.colaPolicyHistory=store.data.colaPolicyHistory||[];store.data.colaPolicyHistory.push(structuredClone(policy));
  const changed=policy.pct!==b.pct;policy.pct=b.pct;policy.revision++;policy.updatedBy=user.name;policy.updatedAt=new Date().toISOString();policy.reason=b.reason.trim();
  if(changed){policy.lastReviewedYear=null;policy.approvedBy=null;policy.approvedAt=null;}
  if(b.approve===true){policy.lastReviewedYear=Number(require('./renewal-policy').localDay().slice(0,4));policy.approvedBy=user.name;policy.approvedAt=new Date().toISOString();}
  if(changed)for(const c of store.data.cases.filter(c=>c.opportunityType==='Renewal'&&c.pricingRuleSet==='WORKBOOK'&&!['Closed Won','Cancelled'].includes(c.status))){c.colaPct=policy.pct;c.revision++;c.draftSavedAt=new Date().toISOString();delete c.resourceValidation;c.resourceValidations=[];delete c.offeredPrice;audit(user,'RENEWAL_COLA_UPDATED','PricingCase',c.id,{revision:c.revision,colaPct:c.colaPct,policyRevision:policy.revision});}
  const source=await sourceData.readWorkbook();require('./renewal-policy').sweep(store.data,source.items);audit(user,b.approve?'COLA_ANNUAL_REVIEW_APPROVED':'COLA_POLICY_UPDATED','Configuration',policy.id,{policy:structuredClone(policy)});save();send(res,200,{policy});return true;
 }
 if(!p.startsWith('/api/v1/admin/'))return false;
 if(!user||user.role!=='Admin'){fail(res,user?403:401,'ADMIN_REQUIRED','Administrator access required.');return true;}
 if(/^\/api\/v1\/admin\/cases\/[^/]+\/reconcile-source$/.test(p)&&method==='POST'){
  const c=store.data.cases.find(c=>c.id===p.split('/')[5]),b=await readBody(req);if(!c){fail(res,404,'NOT_FOUND','Case not found.');return true;}
  if(!b.reason?.trim()||['Closed Won','Cancelled'].includes(c.status)){fail(res,409,'RECONCILIATION_BLOCKED','Record a reason and reopen locked cases before reconciling source fields.');return true;}
  const source=await sourceData.findOpportunity(c.opportunityId);if(!source){fail(res,422,'SOURCE_MISSING','Source opportunity missing or duplicated.');return true;}
  const type={'New Business':'Net new','Existing Business':'Existing new','Renewal':'Renewal'}[source.type];if(!type){fail(res,422,'SOURCE_TYPE_UNKNOWN','Unsupported source sales type.');return true;}
  c.sourceHistory=c.sourceHistory||[];c.sourceHistory.push({snapshot:structuredClone(c.sourceOpportunity),actor:user.name,at:new Date().toISOString(),reason:b.reason.trim()});
  Object.assign(c,{account:source.account,opportunityName:source.opportunityName,opportunityType:type,sourceStage:source.stage,closeDate:source.closeDate,vertical:source.vertical,subVertical:source.subVertical,currency:source.currency,budget:source.amount,bu:require('./bu-routing').resolve(source,store.data),capability:source.capability,startDate:source.projectStartDate,contractEndDate:source.projectEndDate,durationMonths:source.durationMonths,pricingVertical:source.vertical,sourceOpportunity:{...source},ownershipHold:false});
  for(const line of c.lines){line.account=c.account;line.bu=c.bu;line.currency=c.currency;}
  enterprise.sync(store.data,(await sourceData.readWorkbook()).items);enterprise.provision(store.data,accessDir);enterprise.routeCase(c,store.data);c.revision++;delete c.resourceValidation;c.resourceValidations=[];
  audit(user,'SOURCE_RECONCILED','PricingCase',c.id,{revision:c.revision,reason:b.reason.trim(),owner:source.owner,account:source.account});save();send(res,200,{caseId:c.id,revision:c.revision});return true;
 }
 if(p==='/api/v1/admin/bu-heads'&&method==='PUT'){
  const b=await readBody(req),expected=store.data.config.buHeads.map(m=>m.bu);
  if(!Array.isArray(b.mappings)||b.mappings.length!==expected.length||new Set(b.mappings.map(m=>m.bu)).size!==expected.length||!b.mappings.every(m=>expected.includes(m.bu)&&(m.userId===null||store.data.users.some(u=>u.id===m.userId&&u.enabled!==false&&u.role==='BU Head')))){fail(res,400,'INVALID_BU_HEADS','Provide each configured BU once with an active BU Head or null.');return true;}
  store.data.config.buHeads=b.mappings.map(m=>({bu:m.bu,userId:m.userId}));store.data.config.routingRevision=(store.data.config.routingRevision||0)+1;
  for(const c of store.data.cases.filter(c=>c.pricingRuleSet==='WORKBOOK'&&!['Closed Won','Cancelled'].includes(c.status))){const before=c.buHeadUserId;enterprise.routeCase(c,store.data);if(before!==c.buHeadUserId){c.revision++;delete c.resourceValidation;c.resourceValidations=[];}}
  audit(user,'BU_HEADS_UPDATED','Configuration','bu-heads',{mappings:store.data.config.buHeads});save();send(res,200,{mappings:store.data.config.buHeads});return true;
 }
 if(p==='/api/v1/admin/users'&&method==='GET'){send(res,200,{items:store.data.users.map(auth.publicUser)});return true;}
 if(p.startsWith('/api/v1/admin/users/')&&method==='PATCH'){
  const target=store.data.users.find(u=>u.id===p.split('/')[5]),b=await readBody(req);if(!target){fail(res,404,'NOT_FOUND','User not found.');return true;}
  if(target.id===user.id&&(b.enabled===false||b.role&&b.role!=='Admin')){fail(res,409,'ADMIN_REQUIRED','Ask another administrator to change your administrative access.');return true;}
  const roles=['Admin','Client Partner','Sales/Pricing Analyst','BU SPOC','BU Head','Finance','CFO','EVP Finance'];if(b.role&&!roles.includes(b.role)){fail(res,400,'INVALID_ROLE','Unknown role.');return true;}
  if(target.source==='Salesforce workbook'&&b.role&&b.role!=='Client Partner'){fail(res,400,'SOURCE_ROLE_LOCKED','Source owners remain Client Partners; assign internal roles to staff accounts.');return true;}
  for(const k of ['role','enabled','costVisible','commercialAccess'])if(b[k]!==undefined){if(k!=='role'&&typeof b[k]!=='boolean'){fail(res,400,'INVALID_USER','Permission values must be boolean.');return true;}target[k]=b[k];}
  target.authVersion=(target.authVersion||1)+1;audit(user,'USER_ACCESS_UPDATED','User',target.id,{role:target.role,enabled:target.enabled,costVisible:target.costVisible});save();send(res,200,{user:auth.publicUser(target)});return true;
 }
 if(p==='/api/v1/admin/tech-coe-mappings'&&method==='PUT'){
  const b=await readBody(req);if(!Array.isArray(b.mappings)||!b.mappings.length||b.mappings.length>100||!b.mappings.every(m=>typeof m.capability==='string'&&Array.isArray(m.aliases)&&m.aliases.length&&m.aliases.every(a=>typeof a==='string'&&a.trim())&&store.data.users.some(u=>u.id===m.userId&&u.role==='BU SPOC'&&u.enabled!==false))){fail(res,400,'INVALID_MAPPING','Each mapping needs a capability, aliases and an active Tech COE user.');return true;}
  store.data.config.techCoeMappings=b.mappings.map(m=>({id:String(m.id||crypto.randomUUID()),capability:m.capability.trim(),aliases:m.aliases.map(a=>a.trim()),userId:m.userId}));store.data.config.routingRevision=(store.data.config.routingRevision||0)+1;
  for(const c of store.data.cases.filter(c=>c.pricingRuleSet==='WORKBOOK'&&!['Closed Won','Cancelled'].includes(c.status))){const prior=JSON.stringify(c.techCoeUserIds);enterprise.routeCase(c,store.data);if(prior!==JSON.stringify(c.techCoeUserIds)){c.revision++;delete c.resourceValidation;c.resourceValidations=[];audit(user,'CASE_ROUTING_UPDATED','PricingCase',c.id,{revision:c.revision,techCoeUserIds:c.techCoeUserIds});}if(c.techCoeUserIds.length)for(const e of c.exceptions.filter(e=>e.status==='Open'&&e.reason.startsWith('No Tech COE mapping'))){e.status='Resolved';e.resolvedAt=new Date().toISOString();e.resolutionNotes='Resolved through routing configuration.';}}
  audit(user,'TECH_COE_MAPPING_UPDATED','Configuration','tech-coe-mappings',{revision:store.data.config.routingRevision});save();send(res,200,{mappings:store.data.config.techCoeMappings});return true;
 }
 fail(res,404,'NOT_FOUND','Administration route not found.');return true;
};
