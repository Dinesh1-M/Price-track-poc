'use strict';
const L=require('./lifecycle');
const {validateClosedWon}=require('./domain');
module.exports=async function pocApi(req,res,url,user,c,deps){
 const {send,fail,readBody,requireRole,audit,save,safeCase,calculate,newId,config,notify,readyApproval}=deps;
 const parts=url.pathname.split('/').filter(Boolean), action=parts[4], method=req.method;
 const handled=['details','negotiations','calculations','versions','workflow'].includes(action);
 if(!handled)return false;
 if(method==='GET'&&action==='versions'&&!parts[5]){send(res,200,{items:safeCase(c,user).versions});return true;}
 if(method==='GET'&&action!=='negotiations'&&action!=='calculations')return false;
 if(!['GET','POST','PATCH'].includes(method))return false;
 if(method!=='GET'&&!requireRole(res,user,['Admin','Sales/Pricing Analyst','BU SPOC','BU Head']))return true;
 if(method!=='GET'&&['Closed Won','Cancelled'].includes(c.status)){fail(res,409,'CASE_LOCKED','Closed Won/cancelled cases retain read-only history.');return true;}
 const error=(status,message)=>{fail(res,status,'WORKFLOW_VALIDATION',message);return true;};
 const result=body=>{save();send(res,200,body);return true;};
 if(action==='details'&&method==='PATCH'){
  const b=await readBody(req);if(Number(b.revision)!==c.revision)return error(409,'Case changed; refresh before editing.');
  if(c.pricingRuleSet==='WORKBOOK'){
   const allowed=['region','deliveryModel','scope','targetMarginPct','discountPct','colaPct','benchPct','pricingVertical','priorScope','extraResourceNotes','actualUtilizationPct','utilizationEvidence','bu'];
   const sourceFields=['opportunityId','opportunityName','account','opportunityType','capability','currency','budget','startDate','contractEndDate','durationMonths','owner','closeDate','vertical','subVertical'];
   if(sourceFields.some(k=>b[k]!==undefined&&String(b[k])!==String(c[k])))return error(400,'Source opportunity fields are read-only. Update Salesforce data through the external adapter.');
   if(b.bu!==undefined&&!require('./bu-routing').choices(c.sourceOpportunity?.vertical,config).includes(b.bu))return error(400,'Choose a child BU for this source vertical.');
   if(b.colaPct!==undefined&&Number(b.colaPct)!==Number(c.colaPct))return error(403,'Finance maintains COLA centrally; use the Finance COLA policy.');
   if(b.actualUtilizationPct!==undefined&&b.actualUtilizationPct!==''&&(!Number.isFinite(Number(b.actualUtilizationPct))||Number(b.actualUtilizationPct)<0||Number(b.actualUtilizationPct)>100))return error(400,'Actual utilization must be between 0 and 100%.');
   for(const k of ['targetMarginPct','discountPct','colaPct'])if(b[k]!==undefined&&(!Number.isFinite(Number(b[k]))||Number(b[k])<0||Number(b[k])>=100))return error(400,'Invalid '+k);
   if(b.benchPct!==undefined&&(!Number.isFinite(Number(b.benchPct))||Number(b.benchPct)<5||Number(b.benchPct)>10))return error(400,'Bench loading must be 5–10%.');
   if(b.pricingVertical!==undefined&&!config.workbookReference.verticals.some(v=>v.name===b.pricingVertical))return error(400,'Choose an exact workbook pricing vertical.');
   for(const k of allowed)if(b[k]!==undefined)c[k]=['targetMarginPct','discountPct','colaPct','benchPct','actualUtilizationPct'].includes(k)?(b[k]===''?null:Number(b[k])):String(b[k]).trim();
   if(b.bu!==undefined){c.buRoutingInitialized=true;for(const line of c.lines)line.bu=c.bu;require('./enterprise-data').routeCase(c,{config,users:deps.users});}
   delete c.offeredPrice;c.revision++;c.draftSavedAt=new Date().toISOString();delete c.resourceValidation;
   audit(user,'CASE_PRICING_INPUTS_UPDATED','PricingCase',c.id,{revision:c.revision});return result({case:safeCase(c,user)});
  }
  const candidate={...c,...L.detailValues(b)};const message=L.validateDetails(candidate);if(message)return error(400,message);
  if(user.role==='Client Partner'&&candidate.account!==user.account)return error(403,'Client partners can only supply data for their assigned account.');
  if(deps.cases.some(x=>x.id!==c.id&&x.opportunityId===candidate.opportunityId))return error(409,'Opportunity reference is already used.');
  Object.assign(c,L.detailValues(b));c.lines.forEach(l=>l.account=c.account);delete c.offeredPrice;c.revision++;c.draftSavedAt=new Date().toISOString();
  audit(user,'CASE_DETAILS_UPDATED','PricingCase',c.id,{revision:c.revision});return result({case:safeCase(c,user)});
 }
 if(action==='calculations'){
  if(method==='GET'){send(res,200,{items:safeCase(c,user).calculations});return true;}
  const calculation=calculate(c);if(calculation.exceptions.length)return error(422,calculation.exceptions.map(e=>e.reason).join('; '));
  const record={id:newId('CALC'),revision:c.revision,createdAt:new Date().toISOString(),createdBy:user.name,calculation:structuredClone(calculation)};
  c.calculations.push(record);audit(user,'CALCULATION_SAVED','PricingCase',c.id,{calculationId:record.id,revision:c.revision});return result({calculationId:record.id,case:safeCase(c,user)});
 }
 if(action==='negotiations'){
  if(method==='GET'){send(res,200,{items:c.negotiations});return true;}
  const b=await readBody(req),message=L.validateNegotiation(b,c);if(message)return error(400,message);
  if(!['Proposal','Negotiation','Approval'].includes(c.stage))return error(409,'Advance the case to Proposal before negotiation.');
  const calc=calculate(c);if(calc.exceptions.length)return error(422,'Supply valid resource/rate data before recording a priced discussion.');
  const offer=L.offeredCalculation(calc,b.offeredPrice);
  const negotiation={id:newId('NEG'),discussionDate:b.discussionDate,requestedPrice:Number(b.requestedPrice),offeredPrice:Number(b.offeredPrice),notes:b.notes.trim(),outcome:b.outcome.trim(),nextAction:b.nextAction.trim(),versionId:b.versionId||null,discountPct:offer.discountPct,contributionMarginPct:offer.contributionMarginPct,currency:c.currency,createdBy:user.name,createdAt:new Date().toISOString()};
  c.negotiations.push(negotiation);c.offeredPrice=negotiation.offeredPrice;c.revision++;c.status='Negotiation';L.move(c,'Negotiation',user,'Pricing discussion recorded');
  audit(user,'NEGOTIATION_RECORDED','PricingCase',c.id,{negotiationId:negotiation.id,versionId:negotiation.versionId});return result({negotiation,case:safeCase(c,user)});
 }
 if(action==='versions'&&method==='POST'&&!parts[5]){
  const policy=require('./policy');
  if(!['Proposal','Negotiation','Approval'].includes(c.stage))return error(409,'Complete discovery stages through Proposal before creating a pricing version.');
  const b=await readBody(req),calc=calculate(c);
  if(Number(b.revision)!==c.revision)return error(409,'Submission revision is stale. Refresh and review the current draft.');
  if(!config.demoMode)return error(422,'Production submission blocked until workbook parity and Finance sign-off are verified.');
  
  const outstanding=c.versions.filter(v=>v.status==='Pending Approval');if(outstanding.length&&config.pendingVersionPolicy!=='supersede')return error(409,'Pending-version policy blocks submission. Resolve the current version or explicitly configure demo supersession.');
  if(calc.exceptions.length)return error(422,calc.exceptions.map(e=>e.reason).join('; '));
  if(c.exceptions.some(e=>e.status==='Open'&&e.blocking))return error(422,'Resolve blocking case exceptions before submitting.');
  if(c.pricingRuleSet==='WORKBOOK'&&!require('./bu-routing').head(c,{config,users:deps.users}))return error(422,'Select the child BU and assign its active BU Head before submitting.');
  if(c.pricingRuleSet==='WORKBOOK'&&c.opportunityType==='Renewal'&&!c.priorScope?.trim())return error(422,'Record prior agreement/SOW evidence for the renewal.');
  if(c.pricingRuleSet==='WORKBOOK'&&!c.scope?.trim())return error(422,'Record the delivery scope before submitting.');
  if(!b.comment?.trim())return error(400,'Version reason/notes are required.');
  const saved=c.calculations.findLast(x=>x.revision===c.revision&&JSON.stringify(x.calculation)===JSON.stringify(calc));
  if(!saved)return error(409,'Save Calculation for the current inputs before creating a version.');
  if((config.requireResourceValidation||c.pricingRuleSet==='WORKBOOK')&&c.resourceValidation?.revision!==c.revision){
   const validatedRevision=c.resourceValidation?.revision;
   return error(422,validatedRevision===undefined
    ? `BU SPOC has not validated resources for current revision ${c.revision}.`
    : `BU SPOC resource validation is for revision ${validatedRevision}, but the draft is now revision ${c.revision}. Validate resources again before submission.`);
  }
  if(c.versions.some(v=>v.revision===c.revision&&v.calculationId===saved.id&&!['Rejected','Returned','Superseded'].includes(v.status)))return error(409,'This calculation has already been submitted. Revise the draft before resubmitting.');
  let approvals;try{approvals=policy.route(c,calc,{users:deps.users,config});}catch(e){return error(422,e.message);}
  if(approvals.some(a=>!a.assignedUserIds.length))return error(422,'Approval route has a missing assigned approver.');
  const v={id:newId('VER'),number:Math.max(0,...c.versions.map(v=>v.number))+1,status:'Pending Approval',submittedAt:new Date().toISOString(),submittedBy:user.name,submittedById:user.id,createdAt:new Date().toISOString(),createdBy:user.name,revision:c.revision,snapshot:structuredClone(c.lines),calculation:structuredClone(calc),calculationId:saved.id,negotiationId:c.negotiations.at(-1)?.id||null,pricingTerms:{discountPct:c.discountPct,colaPct:c.colaPct,offeredPrice:c.offeredPrice,targetMarginPct:c.targetMarginPct,benchPct:c.benchPct,pricingVertical:c.pricingVertical,actualUtilizationPct:c.actualUtilizationPct,utilizationEvidence:c.utilizationEvidence},sourceOpportunity:structuredClone(c.sourceOpportunity||null),ruleSnapshot:{formulaApproved:config.formulaApproved,targetMarginPct:c.targetMarginPct,fxRate:config.fxRate,workbook:structuredClone(calc.ruleReference||null),approvalPolicy:structuredClone(config.approvalPolicy),routingRevision:config.routingRevision||0},approvals,comments:b.comment.trim()};
  for(const old of outstanding){old.status='Superseded';for(const a of old.approvals)if(a.status==='Pending')a.status='Cancelled';audit(user,'VERSION_SUPERSEDED','PricingVersion',old.id,{caseId:c.id,replacement:v.id,policy:config.pendingVersionPolicy});}
  c.versions.unshift(v);c.status='Awaiting Approval';L.move(c,'Approval',user,'Submitted V'+v.number);audit(user,'PRICING_VERSION_CREATED','PricingVersion',v.id,{caseId:c.id,number:v.number,calculationId:saved.id});
  const first=readyApproval(v);
  if(first)for(const userId of first.assignedUserIds)notify({userId,c,v,task:first,event:'VERSION_SUBMITTED',title:`Approval required: ${c.opportunityName} - V${v.number}`,message:`V${v.number} is awaiting your ${first.role} review.`,route:'approvals'});
  return result({version:safeCase(c,user).versions.find(x=>x.id===v.id)});
 }
 if(action==='versions'&&method==='POST'&&parts[6]==='submit')return error(409,'Legacy draft version retained as history. Submit the current working draft to create a new formal version.');
 if(action==='workflow'&&method==='POST'){
  const b=await readBody(req);if(!b.reason?.trim())return error(400,'Workflow reason/evidence is required.');
  const next=L.STAGES[L.STAGES.indexOf(c.stage)+1];if(b.stage!==next)return error(409,'Complete stages in order. Next stage: '+(next||'none'));
  if(b.stage==='Approval')return error(409,'Submit the selected pricing version from Negotiations & Pricing Versions.');
  if(b.stage==='Contract & Launch'){
   const v=L.accepted(c);if(!v||v.status!=='Agreed'||v.revision!==c.revision||!v.approvals.every(a=>a.status==='Approved'))return error(422,'Agree the current, fully approved version before contract/launch.');
   c.contractEvidence=b.reason.trim();
  }
  if(b.stage==='Closed Won'){
   if(c.pricingRuleSet==='WORKBOOK')return error(403,'Closed Won originates from the external Salesforce event adapter. Update the source workbook stage, then send an external lifecycle event.');
   const check=validateClosedWon(c,c.agreedVersionId);if(!check.ok)return error(422,check.reason);
   c.closedWonVersionId=c.agreedVersionId;c.finalOffer=L.offerSummary(c);c.closedWonAt=new Date().toISOString();c.lifecycle='Closed Won';
  }
  L.move(c,b.stage,user,b.reason.trim());c.status=b.stage==='Closed Won'?'Closed Won':b.stage==='Contract & Launch'?'Contract & Launch':c.status;
  if(b.stage==='Closed Won'){c.salesforceEvents=c.salesforceEvents||[];c.salesforceEvents.push({id:newId('SF-EVT'),event:'ClosedWon',source:'Mock Salesforce lifecycle',actor:user.name,at:new Date().toISOString(),versionId:c.agreedVersionId,evidence:b.reason.trim()});if(!c.reconciliationRequired)deps.queueHandoff(c,L.accepted(c));}
  audit(user,'WORKFLOW_STAGE_CHANGED','PricingCase',c.id,{stage:c.stage,reason:b.reason,finalOffer:c.finalOffer});return result({case:safeCase(c,user)});
 }
 return false;
};
