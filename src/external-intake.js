'use strict';
const crypto=require('node:crypto');
const enterprise=require('./enterprise-data');
function receive(body,data,items){
 const requestId=String(body.requestId||'').trim(),opportunityId=String(body.opportunityId||'').trim();
 const bad=(status,message)=>({status,error:message});
 if(!/^[A-Za-z0-9._:-]{3,120}$/.test(requestId)||!opportunityId)return bad(400,'Supply a unique Request ID (3–120 letters/digits/._:-) and an Opportunity ID.');
 const replay=data.intakeRequests.find(r=>r.requestId===requestId);
 if(replay){if(replay.opportunityId!==opportunityId)return bad(409,'Request ID was already used for a different opportunity.');return {status:200,duplicate:true,case:data.cases.find(c=>c.id===replay.caseId)};}
 const source=items.find(x=>x.opportunityId===opportunityId);if(!source)return bad(422,'Opportunity ID is absent, duplicated or invalid in the Salesforce synthetic workbook.');
 if(!source.owner)return bad(422,'The Salesforce opportunity has no owner.');
 const existing=data.cases.find(c=>c.opportunityId===opportunityId);
 if(existing){data.intakeRequests.push({requestId,opportunityId,caseId:existing.id,receivedAt:new Date().toISOString()});return {status:200,duplicate:true,case:existing};}
 if(['Closed Won','Closed Lost'].includes(source.stage))return bad(409,'The source opportunity is already closed. A new request must reference an open opportunity.');
 const type={'New Business':'Net new','Existing Business':'Existing new','Renewal':'Renewal'}[source.type];if(!type)return bad(422,'Unsupported Salesforce Type; no path is guessed.');
 const now=new Date().toISOString(),id='PT-'+crypto.randomUUID().slice(0,8).toUpperCase();
 const c={id,opportunityId:source.opportunityId,opportunityName:source.opportunityName,account:source.account,bu:require('./bu-routing').resolve(source,data),buRoutingInitialized:true,colaPolicyInitialized:true,status:'New',lifecycle:'Open',stage:'Proposal',sourceStage:source.stage,opportunityType:type,currency:source.currency||'',budget:source.amount,targetMarginPct:data.config.workbookReference?.targetMarginPct??50,benchPct:data.config.workbookReference?.benchPct??5,pricingVertical:source.vertical,capability:source.capability,region:'',deliveryModel:'',scope:'',startDate:source.projectStartDate,contractEndDate:source.projectEndDate,durationMonths:source.durationMonths,discountPct:0,colaPct:type==='Renewal'?(data.config.colaPolicy?.pct??5):0,closeDate:source.closeDate,vertical:source.vertical,subVertical:source.subVertical,actualUtilizationPct:null,utilizationEvidence:'',priorScope:'',extraResourceNotes:'',financeVisible:true,costVisible:false,owner:'Not assigned',assignedUsers:[],revision:1,draftSavedAt:now,lines:[],versions:[],comments:[],exceptions:[],handoffs:[],audit:[],calculations:[],negotiations:[],workflowHistory:[{from:'External opportunity',to:'Proposal',actor:'External synthetic Salesforce adapter',at:now,reason:'Pricing requested outside Price Track; source sales stage is preserved separately.'}],sourceOpportunity:{...source,sourceFile:'Salesforce sythetic data.xlsx'},opportunitySnapshot:{...source,receivedAt:now,source:'Synthetic Salesforce workbook'},requestedBy:source.owner,requestedById:data.users.find(u=>u.source==='Salesforce workbook'&&u.name===source.owner)?.id,pricingRuleSet:'WORKBOOK',resourceValidations:[],workTypes:[],workbookHash:data.config.workbookReference?.sha256};
 enterprise.routeCase(c,data);
 const missing=[];if(!c.techCoeUserIds.length)missing.push('No Tech COE mapping for source capability. Configure the mapping in Administration.');if(!c.startDate||!c.contractEndDate)missing.push('Project dates are missing from source data.');if(!c.currency)missing.push('Currency is missing from source data.');
 if(type==='Renewal')missing.push('Provide prior agreement/SOW and renewal comparison evidence.');
 for(const reason of missing)c.exceptions.push({id:'EX-'+crypto.randomUUID().slice(0,8),type:type==='Renewal'&&reason.includes('prior agreement')?'Renewal evidence':'Intake validation',reason,owner:'u-admin',severity:'High',blocking:true,status:'Open',createdAt:now,history:[]});
 data.cases.unshift(c);data.intakeRequests.push({requestId,opportunityId,caseId:id,receivedAt:now});data.integrationEvents.unshift({id:requestId,event:'RequestPricing',source:'External synthetic Salesforce adapter',caseId:id,opportunityId,receivedAt:now});return {status:201,duplicate:false,case:c};
}
module.exports={receive};
