'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const auth=require('./auth');
const DEFAULT_COES=[
 {id:'bi',capability:'BI COE',name:'Tilak Mukherjee',aliases:['Data_Engg_and_BI','BI','Business Intelligence','UI/UX Design & Visualization']},
 {id:'appdev',capability:'AppDev',name:'Udayanath',aliases:['Application Development','AppDev']},
 {id:'ai',capability:'AI',name:'Soviek Saurav',aliases:['Artificial Intelligence','Data_Science','AI']},
 {id:'databricks',capability:'Databricks',name:'Amit Yadav',aliases:['Databricks']},
 {id:'data-engineering',capability:'Data Engineering',name:'Vikas Yadav',aliases:['Data_Engg_and_BI','Data Engineering']}
];
const idFor=(prefix,name)=>prefix+crypto.createHash('sha256').update(auth.key(name)).digest('hex').slice(0,16);
function sync(data,items){
 require('./renewal-policy').defaults(data);require('./bu-routing').initialize(data);
 const owners=[...new Set(items.map(x=>x.owner).filter(Boolean))];
 for(const name of owners){const owned=items.filter(x=>auth.key(x.owner)===auth.key(name)),id=idFor('sf-owner-',name);let user=data.users.find(u=>u.id===id);if(!user){user={id,name,loginId:name,role:'Client Partner',enabled:true,costVisible:false,source:'Salesforce workbook'};data.users.push(user);}user.accounts=[...new Set(owned.map(x=>x.account))];user.opportunityIds=owned.map(x=>x.opportunityId);user.account=user.accounts.length===1?user.accounts[0]:'';}
 data.config.techCoeMappings=data.config.techCoeMappings||DEFAULT_COES.map(x=>({...x,userId:idFor('coe-',x.name)}));
 for(const c of DEFAULT_COES){const id=idFor('coe-',c.name);if(!data.users.some(u=>u.id===id))data.users.push({id,name:c.name,loginId:c.name,role:'BU SPOC',techCoe:c.capability,enabled:true,costVisible:true,account:'',bu:''});}
 const labels={'u-admin':'Administrator','u-sales':'Pricing Operations','u-fin':'Finance Reviewer','u-bu':'BU Head','u-cfo':'CFO','u-evp':'Ankur Maheshwari'};
 for(const u of data.users){if(labels[u.id]){if(u.id==='u-evp'&&u.loginId&&u.loginId!==labels[u.id]){delete u.passwordHash;u.authVersion=(u.authVersion||1)+1;}u.name=labels[u.id];u.loginId=u.id==='u-evp'?labels[u.id]:(u.loginId||labels[u.id]);u.enabled=u.enabled!==false;}if(['u-cp','u-cp-sf','u-spoc','u-bu'].includes(u.id))u.enabled=false;}
 for(const u of data.users.filter(u=>u.source==='Salesforce workbook'&&!owners.some(n=>auth.key(n)===auth.key(u.loginId)))){u.enabled=false;u.accounts=[];u.opportunityIds=[];}
 for(const c of data.cases){
  const source=items.find(x=>x.opportunityId===c.opportunityId);if(!source){c.archivedLegacy=true;continue;}c.archivedLegacy=false;
  if(c.pricingRuleSet!=='WORKBOOK'&&!['Closed Won','Cancelled'].includes(c.status)){
   c.migrationHistory=c.migrationHistory||[];c.migrationHistory.push({from:'Legacy demo calculation',at:new Date().toISOString(),previousSource:structuredClone(c.sourceOpportunity||null),previousRevision:c.revision});
   Object.assign(c,{pricingRuleSet:'WORKBOOK',sourceOpportunity:{...source},sourceStage:source.stage,closeDate:source.closeDate,vertical:source.vertical,subVertical:source.subVertical,account:source.account,opportunityName:source.opportunityName,currency:source.currency,budget:source.amount,capability:source.capability,bu:require('./bu-routing').resolve(source,data),buRoutingInitialized:true,pricingVertical:source.vertical,startDate:source.projectStartDate,contractEndDate:source.projectEndDate,durationMonths:source.durationMonths,opportunityType:({'New Business':'Net new','Existing Business':'Existing new','Renewal':'Renewal'}[source.type]||source.type),benchPct:data.config.workbookReference?.benchPct??5,workbookHash:data.config.workbookReference?.sha256});
   c.revision++;delete c.resourceValidation;c.resourceValidations=[];
   c.exceptions.push({id:'EX-MIGRATION-'+c.id,type:'Workbook migration',reason:'Review migrated draft against workbook role/experience and source fields before submitting. Historical versions retain their previous calculation rules.',owner:'u-admin',severity:'High',blocking:true,status:'Open',createdAt:new Date().toISOString(),history:[]});
  }
  if(!c.buRoutingInitialized&&c.pricingRuleSet==='WORKBOOK'){c.bu=require('./bu-routing').resolve(source,data);c.buRoutingInitialized=true;c.revision++;delete c.resourceValidation;c.resourceValidations=[];}
  if(c.opportunityType==='Renewal'&&!c.colaPolicyInitialized&&!['Closed Won','Cancelled'].includes(c.status)){c.colaPct=data.config.colaPolicy.pct;c.colaPolicyInitialized=true;c.revision++;delete c.resourceValidation;c.resourceValidations=[];}
  if(c.sourceOpportunity?.owner){if(source.account!==c.account||source.owner!==c.sourceOpportunity.owner)c.ownershipHold=true;if(c.workbookHash&&c.workbookHash!==data.config.workbookReference?.sha256&&!['Closed Won','Cancelled'].includes(c.status)){c.revision++;delete c.resourceValidation;c.resourceValidations=[];}c.workbookHash=data.config.workbookReference?.sha256;routeCase(c,data);}
 }
 data.integrationEvents=data.integrationEvents||[];data.intakeRequests=data.intakeRequests||[];
}
function routeCase(c,data){c.buHeadUserId=require('./bu-routing').head(c,data)?.id||null;const tokens=String(c.capability||'').split(';').map(auth.key);const matches=data.config.techCoeMappings.filter(m=>(m.aliases||[]).some(a=>tokens.includes(auth.key(a))));c.techCoeUserIds=[...new Set(matches.map(m=>m.userId))];const ids=data.users.filter(u=>u.enabled!==false&&(['Admin','Sales/Pricing Analyst','Finance'].includes(u.role)||u.id===require('./bu-routing').head(c,data)?.id||c.techCoeUserIds.includes(u.id))).map(u=>u.id);c.assignedUsers=ids;c.owner=data.users.find(u=>u.role==='Sales/Pricing Analyst'&&u.enabled!==false)?.name||'Not assigned';}
function provision(data,directory){
 const credentials=[];for(const u of data.users.filter(u=>u.enabled!==false&&u.loginId&&!u.passwordHash)){const password=crypto.randomBytes(15).toString('base64url');u.passwordHash=auth.hashPassword(password);u.authVersion=1;credentials.push([u.loginId,password,u.role]);}
 fs.mkdirSync(directory,{recursive:true});const csv=path.join(directory,'LOCAL_LOGIN_CREDENTIALS.csv');
 const quote=s=>'"'+String(s).replace(/"/g,'""')+'"';
 if(credentials.length)fs.appendFileSync(csv,(fs.existsSync(csv)?'':'Login ID,Temporary password,Role\n')+credentials.map(row=>row.map(quote).join(',')).join('\n')+'\n',{mode:0o600});
 if(!data.integrationTokenHash){const token=crypto.randomBytes(32).toString('base64url');data.integrationTokenHash=auth.tokenHash(token);fs.writeFileSync(path.join(directory,'intake-token.txt'),token+'\n',{mode:0o600});}
 return {credentialsFile:csv};
}
module.exports={sync,provision,routeCase,DEFAULT_COES};
