 'use strict';
 function assignedUserIds(c,role,users){
  return users.filter(u=>u.enabled!==false&&u.role===role&&(role!=='BU Head'||c.pricingRuleSet!=='WORKBOOK'||u.id===c.buHeadUserId)&&(c.assignedUsers.includes(u.id)||['CFO','EVP Finance'].includes(role))).map(u=>u.id);
 }
 function migrate(data){
  if(!data.users.some(u=>u.id==='u-sales'))data.users.push({id:'u-sales',name:'Demo Pricing Analyst',role:'Sales/Pricing Analyst',account:'Northstar Retail',bu:'R&M',costVisible:false});
  if(!data.users.some(u=>u.id==='u-cp-sf'))data.users.push({id:'u-cp-sf',name:'Demo Client Partner (Excel Sample)',role:'Client Partner',account:'ABC',bu:'R&M',costVisible:false});
  for(const u of data.users)if(u.id==='u-admin'){if(u.commercialAccess===undefined)u.commercialAccess=true;if(u.approvalOverride===undefined)u.approvalOverride=true;}
  for(const c of data.cases){
   c.assignedUsers=c.assignedUsers||[];
   for(const u of data.users)if((u.role==='BU Head'&&u.bu===c.bu)||(u.role==='Sales/Pricing Analyst'&&u.account===c.account))if(!c.assignedUsers.includes(u.id))c.assignedUsers.push(u.id);
   for(const v of c.versions||[])for(const task of v.approvals||[])if(!Array.isArray(task.assignedUserIds))task.assignedUserIds=assignedUserIds(c,task.role,data.users);
  }
 data.config.pendingVersionPolicy=data.config.pendingVersionPolicy||'block';
 data.config.approvalPolicy=data.config.approvalPolicy||{id:'DEMO-SEQUENTIAL-1',label:'DEMO / UNAPPROVED',effectiveFrom:'2026-01-01',steps:['BU Head','Finance']};
 data.delegations=data.delegations||[];if(data.config.requireResourceValidation===undefined)data.config.requireResourceValidation=true;
}
function canWrite(user){return ['Sales/Pricing Analyst','BU SPOC','BU Head'].includes(user?.role)||user?.role==='Admin'&&user.commercialAccess===true;}
function canApprove(user,c,task,data){
 if(user.enabled===false)return false;
 if(c.pricingRuleSet==='WORKBOOK'&&task.role==='BU Head')return user.role==='BU Head'&&(task.assignedUserIds||[]).includes(user.id);
 if(user.role==='Admin')return user.approvalOverride===true;
 if(user.role===task.role)return !task.assignedUserIds||task.assignedUserIds.includes(user.id);
 return data.delegations.some(d=>d.delegateId===user.id&&d.caseId===c.id&&d.role===task.role&&d.startDate<=new Date().toISOString()&&d.endDate>new Date().toISOString());
}
function route(c,calculation,data){
 const policy=data.config.approvalPolicy;
 if(!policy||policy.effectiveFrom>new Date().toISOString().slice(0,10)||!Array.isArray(policy.steps)||!policy.steps.length)throw new Error('No effective approval policy');
 const prior=c.versions.filter(v=>['Approved','Agreed'].includes(v.status)).sort((a,b)=>b.number-a.number)[0];
 const metrics={cm:calculation.contributionMarginPct,cmDeterioration:prior?.calculation?.contributionMarginPct!=null?prior.calculation.contributionMarginPct-calculation.contributionMarginPct:0,dealValue:calculation.totalRevenue,discount:calculation.discountPct,bu:c.bu,workTypes:c.workTypes,exceptionTypes:c.exceptions.filter(e=>e.status==='Open').map(e=>e.type)};
 const roles=[...policy.steps];for(const rule of policy.rules||[]){const match=(!rule.bu||rule.bu===metrics.bu)&&(!rule.workType||metrics.workTypes.includes(rule.workType))&&(!rule.exceptionType||metrics.exceptionTypes.includes(rule.exceptionType))&&(rule.minDealValue==null||metrics.dealValue>=rule.minDealValue)&&(rule.maxCM==null||metrics.cm<=rule.maxCM)&&(rule.minDiscount==null||metrics.discount>=rule.minDiscount)&&(rule.minCMDeterioration==null||metrics.cmDeterioration>=rule.minCMDeterioration);if(match)for(const role of rule.roles||[])if(!roles.includes(role))roles.push(role);}
 return roles.map((role,i)=>({step:i+1,role,status:'Pending',assignedUserIds:assignedUserIds(c,role,data.users),dueAt:new Date(Date.now()+Number(data.config.slaHours)*3600000).toISOString()}));
}
function validate(p,users){
 const roles=users.filter(u=>u.enabled!==false&&!['Admin','Client Partner','Sales/Pricing Analyst','BU SPOC'].includes(u.role)).map(u=>u.role);
 if(!p||!Array.isArray(p.steps)||!p.steps.length||p.steps.length>10||new Set(p.steps).size!==p.steps.length||!p.steps.every(r=>roles.includes(r)))return 'Choose distinct active internal approval roles.';
 if(typeof p.effectiveFrom!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(p.effectiveFrom)||!Number.isFinite(Date.parse(p.effectiveFrom)))return 'Supply a valid effective-from date.';
 if(p.rules!==undefined&&(!Array.isArray(p.rules)||p.rules.length>100))return 'Supply at most 100 routing rules.';
 for(const r of p.rules||[]){if(!r||!Array.isArray(r.roles)||!r.roles.length||!r.roles.every(x=>roles.includes(x)))return 'Routing rules need known approval roles.';for(const k of ['minDealValue','maxCM','minDiscount','minCMDeterioration'])if(r[k]!==undefined&&(!Number.isFinite(r[k])||r[k]<0||k!=='minDealValue'&&r[k]>100))return 'Invalid threshold: '+k;}
 return null;
}
module.exports={migrate,canWrite,canApprove,route,validate};
