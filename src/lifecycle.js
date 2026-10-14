'use strict';
const {calculatePricing, round2} = require('./domain');
const STAGES=['Suspect','Recognition of Need','Evaluation of Options','Resolution of Concerns','Proposal','Negotiation','Approval','Contract & Launch','Closed Won'];
const CURRENCIES=['USD','INR','GBP','EUR'];
const DETAILS=['opportunityId','opportunityName','account','bu','owner','opportunityType','region','capability','deliveryModel','scope','startDate','contractEndDate','durationMonths','currency','budget','targetMarginPct','discountPct','colaPct','priorScope','extraResourceNotes'];
const NUMBERS=['durationMonths','budget','targetMarginPct','discountPct','colaPct'];
function validDate(value){return typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value;}
function validateDetails(b){
 for(const k of ['opportunityId','opportunityName','account','bu','owner','opportunityType','region','capability','deliveryModel','scope'])if(typeof b[k]!=='string'||!b[k].trim())return `${k} is required.`;
 if(!CURRENCIES.includes(b.currency))return 'Choose USD, INR, GBP or EUR.';
 if(!validDate(b.startDate)||!validDate(b.contractEndDate)||b.contractEndDate<b.startDate)return 'Supply valid contract dates with end on or after start.';
 for(const k of NUMBERS)if(!Number.isFinite(Number(b[k]))||Number(b[k])<0)return `${k} must be a finite, non-negative number.`;
 if(!Number.isInteger(Number(b.durationMonths))||Number(b.durationMonths)<1)return 'Duration must be a positive whole number of months.';
 if(Number(b.discountPct)>=100||Number(b.targetMarginPct)>=100||Number(b.colaPct)>100)return 'Discount and target margin must be below 100%; COLA must be at most 100%.';
 return null;
}
function detailValues(b){return Object.fromEntries(DETAILS.filter(k=>b[k]!==undefined).map(k=>[k,NUMBERS.includes(k)?Number(b[k]):String(b[k]).trim()]));}
function defaults(c){
 const first=c.lines[0];
 for(const [k,v] of Object.entries({stage:c.lifecycle==='Closed Won'?'Closed Won':c.status==='Awaiting Approval'?'Approval':'Proposal',opportunityType:'New business',region:first?.location||'India',capability:first?.role||'Data engineering',deliveryModel:first?.classification||'Offshore',scope:'Editable sample delivery scope',startDate:first?.startDate||'2026-11-01',contractEndDate:first?.endDate||'2027-04-30',durationMonths:first?.periods||6,discountPct:0,colaPct:0,priorScope:'',extraResourceNotes:'',negotiations:[],calculations:[],workflowHistory:[],stageChangedAt:c.draftSavedAt}))if(c[k]===undefined)c[k]=v;
 c.lines.forEach(l=>{if(l.quantity===undefined)l.quantity=1;if(l.availability===undefined)l.availability='Available - sample data';});
}
function calculate(c,rates,config){return calculatePricing(c.lines,rates,{targetMarginPct:c.targetMarginPct,currency:c.currency,fallbackAllowed:config.fallbackAllowed,discountPct:c.discountPct,colaPct:c.opportunityType==='Renewal'?c.colaPct:0,offeredPrice:c.offeredPrice});}
function move(c,stage,user,reason){const from=c.stage;c.stage=stage;c.stageChangedAt=new Date().toISOString();c.workflowHistory.push({from,to:stage,actor:user.name,at:c.stageChangedAt,reason});}
function accepted(c){return c.versions.find(v=>v.id===c.agreedVersionId);}
function offerSummary(c){const v=accepted(c);return v?{versionId:v.id,number:v.number,price:v.calculation.totalRevenue,currency:v.calculation.currency,approvalOutcome:v.status}:null;}
function validateNegotiation(b,c){
 if(!validDate(b.discussionDate))return 'A valid discussion date is required.';
 for(const k of ['requestedPrice','offeredPrice'])if(!Number.isFinite(Number(b[k]))||Number(b[k])<=0)return `${k} must be positive.`;
 for(const k of ['notes','outcome','nextAction'])if(typeof b[k]!=='string'||!b[k].trim())return `${k} is required.`;
 if(b.versionId&&!c.versions.some(v=>v.id===b.versionId))return 'Choose a version from this case.';
 return null;
}
function offeredCalculation(calc,price){const revenue=round2(Number(price));return {...calc,totalRevenue:revenue,discountPct:calc.baseRevenue>0?round2((1-revenue/calc.baseRevenue)*100):0,discountAmount:round2(calc.baseRevenue-revenue),contributionMarginPct:revenue>0?round2((revenue-calc.totalCost)/revenue*100):null,pricingGap:round2(calc.targetRevenue-revenue)};}
module.exports={STAGES,CURRENCIES,validDate,validateDetails,detailValues,defaults,calculate,move,accepted,offerSummary,validateNegotiation,offeredCalculation};
