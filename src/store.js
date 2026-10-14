'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {defaults}=require('./lifecycle');

const today = new Date().toISOString().slice(0,10);
const uid = (prefix) => `${prefix}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
function initialData() {
  const rates = [
    { id:'RATE-001', scope:'Client', account:'Northstar Retail', bu:'R&M', workType:'T&M', role:'Data Engineer', grade:'G3', location:'India', currency:'USD', amount:42, startDate:'2026-01-01', endDate:'2027-12-31', status:'Approved', proposedBy:'system', approvedBy:'finance.demo' },
    { id:'RATE-002', scope:'Standard', account:'', bu:'TMT1', workType:'FTE', role:'Software Engineer', grade:'G2', location:'India', currency:'USD', amount:35, startDate:'2026-01-01', endDate:'2027-12-31', status:'Approved', proposedBy:'system', approvedBy:'finance.demo' },
    { id:'RATE-003', scope:'Standard', account:'', bu:'TMT1', workType:'Program', role:'Solution Architect', grade:'G5', location:'United States', currency:'USD', amount:125, startDate:'2026-01-01', endDate:'2027-12-31', status:'Approved', proposedBy:'system', approvedBy:'finance.demo' },
    { id:'RATE-004', scope:'Standard', account:'', bu:'CPG', workType:'Product', role:'Product Analyst', grade:'G3', location:'India', currency:'USD', amount:38, startDate:'2026-01-01', endDate:'2027-12-31', status:'Approved', proposedBy:'system', approvedBy:'finance.demo' },
    { id:'RATE-005', scope:'Client', account:'Northstar Retail', bu:'R&M', workType:'FTE', role:'Software Engineer', grade:'G2', location:'India', currency:'USD', amount:31, startDate:'2025-01-01', endDate:'2026-01-31', status:'Expired', proposedBy:'system', approvedBy:'finance.demo' }
  ];
  const users = [
    { id:'u-admin', name:'Demo Administrator', role:'Admin', account:'', bu:'', costVisible:true, buWideAccess:true },
    { id:'u-cp', name:'Demo Client Partner', role:'Client Partner', account:'Northstar Retail', bu:'R&M', costVisible:false },
    { id:'u-cp-sf', name:'Demo Client Partner (Excel Sample)', role:'Client Partner', account:'ABC', bu:'R&M', costVisible:false },
    { id:'u-fin', name:'Demo Finance Reviewer', role:'Finance', account:'', bu:'', costVisible:true },
    { id:'u-bu', name:'Demo BU Head', role:'BU Head', account:'', bu:'R&M', costVisible:false, buWideAccess:false },
    { id:'u-spoc', name:'Demo BU SPOC', role:'BU SPOC', account:'', bu:'R&M', costVisible:true },
    { id:'u-cfo', name:'Demo CFO', role:'CFO', account:'', bu:'', costVisible:true },
    { id:'u-evp', name:'Demo EVP Finance', role:'EVP Finance', account:'', bu:'', costVisible:true }
  ];
  const lines1 = [
    { id:'L-1001', bu:'R&M', workType:'T&M', role:'Data Engineer', grade:'G3', location:'India', classification:'Offshore', hoursPerPeriod:160, utilizationPct:80, startDate:'2026-11-01', endDate:'2027-04-30', periods:6, costPerHour:18, currency:'USD', account:'Northstar Retail' },
    { id:'L-1002', bu:'R&M', workType:'FTE', role:'Software Engineer', grade:'G2', location:'India', classification:'Offshore', hoursPerPeriod:160, utilizationPct:100, startDate:'2026-11-01', endDate:'2027-04-30', periods:6, costPerHour:16, currency:'USD', account:'Northstar Retail' }
  ];
  const lines2 = [
    { id:'L-2001', bu:'TMT1', workType:'Program', role:'Solution Architect', grade:'G5', location:'United States', classification:'Onshore', hoursPerPeriod:120, utilizationPct:70, startDate:'2026-11-01', endDate:'2027-01-31', periods:3, costPerHour:70, currency:'USD', account:'BluePeak Systems' },
    { id:'L-2002', bu:'TMT1', workType:'FTE', role:'Cloud Engineer', grade:'G3', location:'India', classification:'Offshore', hoursPerPeriod:160, utilizationPct:100, startDate:'2026-11-01', endDate:'2027-04-30', periods:6, costPerHour:20, currency:'USD', account:'BluePeak Systems' }
  ];
  const cases = [
    { id:'PT-1001', opportunityId:'SF-OPP-1001', opportunityName:'Northstar Retail Data Modernization', account:'Northstar Retail', bu:'R&M', status:'In Progress', lifecycle:'Open', owner:'Demo Client Partner', assignedUsers:['u-admin','u-cp','u-fin','u-spoc'], financeVisible:true, costVisible:false, budget:220000, targetMarginPct:40, currency:'USD', workTypes:['T&M','FTE'], lines:lines1, revision:1, draftSavedAt:new Date().toISOString(), versions:[], comments:[{id:'C-1',author:'Demo Client Partner',text:'Initial estimate loaded from the synthetic opportunity.',createdAt:new Date().toISOString()}], exceptions:[], handoffs:[], audit:[] },
    { id:'PT-1002', opportunityId:'SF-OPP-1002', opportunityName:'BluePeak Platform Delivery', account:'BluePeak Systems', bu:'TMT1', status:'Awaiting Approval', lifecycle:'Open', owner:'Demo BU SPOC', assignedUsers:['u-admin','u-spoc','u-fin','u-bu'], financeVisible:true, costVisible:true, budget:150000, targetMarginPct:40, currency:'USD', workTypes:['Program','FTE'], lines:lines2, revision:3, draftSavedAt:new Date().toISOString(), versions:[{ id:'VER-2001', number:1, status:'Rejected', submittedAt:new Date(Date.now()-86400000*3).toISOString(), submittedBy:'Demo BU SPOC', snapshot:JSON.parse(JSON.stringify(lines2)), calculation:null, approvals:[{step:1,role:'BU Head',status:'Approved',actor:'Demo BU Head',at:new Date(Date.now()-86400000*3).toISOString()},{step:2,role:'Finance',status:'Rejected',actor:'Demo Finance Reviewer',reason:'Rework on cost assumptions',at:new Date(Date.now()-86400000*3).toISOString()}], rejectionReason:'Rework on cost assumptions' }, { id:'VER-2002', number:2, status:'Pending Approval', submittedAt:new Date().toISOString(), submittedBy:'Demo BU SPOC', snapshot:JSON.parse(JSON.stringify(lines2)), calculation:{totalRevenue:115000,totalCost:59000,contributionMarginPct:48.7}, approvals:[{step:1,role:'BU Head',status:'Pending',actorId:null,actor:null},{step:2,role:'Finance',status:'Pending',actorId:null,actor:null}], comments:'Synthetic resubmission after rework' }], comments:[], exceptions:[], handoffs:[], audit:[] }
  ];
  cases.forEach(defaults);
  rates.push(demoRate());
  const data={ users, rates, cases, rateProposals:[{id:'RP-001',account:'BluePeak Systems',bu:'TMT1',workType:'FTE',role:'Cloud Engineer',grade:'G3',location:'India',currency:'USD',amount:39,startDate:'2026-11-01',endDate:'2027-12-31',status:'Pending Finance Approval',proposedBy:'u-spoc',createdAt:new Date().toISOString()}], audit:[], notifications:[], pendingDecisions:pendingDecisions(), integrationEvents:[], config:{demoMode:true,fallbackAllowed:true,targetMarginPct:40,formulaApproved:false,fxRate:1,fxCurrency:'USD',slaHours:24,retryLimit:3} };require('./policy').migrate(data);return data;
}
function pendingDecisions() {
 const items = [
 ['Project Track API, authentication, handoff trigger and acknowledgement','Project Track / Architecture'],['Framework and deployment environment','Architecture / Platform'],['SQL Server schema ownership and migration strategy','Data Platform'],['Finance-approved CM formula, eligible cost, rounding and target-gap formula','Finance'],['Approval thresholds and configuration publishing authority','Finance Leadership'],['CFO vs EVP Finance authority and special-exception definition','Finance Leadership'],['Authoritative rate source and fallback policy','Finance'],['HR/MNH cost source and cost model','HR / Finance'],['Identity and BU/account/project/SPOC mappings','Identity / Operations'],['BU Head visibility scope','Business / Security'],['Resource quantity, billing period, currency and utilization rules','Finance / Delivery'],['Salesforce field mapping and reapproval triggers','Salesforce / Sales'],['FX source and update frequency','Finance'],['Famstack/SOW utilization interface','Delivery Operations'],['Retention and deletion policy','Security / Legal'],['Project Track handoff trigger: approved/agreed vs Closed Won','Project Track / Sales']
 ];
 return items.map((x,i)=>({id:`DEC-${String(i+1).padStart(2,'0')}`,priority:i<12?'P1':'P2',decision:x[0],owner:x[1],status:'Pending',decisionValue:'',date:'',impact:'Must be confirmed before production use.'}));
}
function demoRate(){return {id:'RATE-DEMO-RM',scope:'Client',account:'Northstar Retail',bu:'R&M',workType:'FTE',role:'Software Engineer',grade:'G2',location:'India',currency:'USD',amount:35,startDate:'2026-01-01',endDate:'2027-12-31',status:'Approved',proposedBy:'sample-provider',approvedBy:'finance.demo'};}
function loadStore(filePath) {
 const resolved = path.resolve(filePath || './data/store.json');
 fs.mkdirSync(path.dirname(resolved), {recursive:true});
 if (!fs.existsSync(resolved)) fs.writeFileSync(resolved, JSON.stringify(initialData(), null, 2));
 const store={filePath:resolved,data:JSON.parse(fs.readFileSync(resolved,'utf8'))};
 const before=JSON.stringify(store.data);store.data.cases.forEach(defaults);
 if(!store.data.rates.some(r=>r.id==='RATE-DEMO-RM'))store.data.rates.push(demoRate());
 if(before!==JSON.stringify(store.data))saveStore(store);
 return store;
}
function saveStore(store) { if(store.persist)return store.persist(); fs.mkdirSync(path.dirname(store.filePath),{recursive:true}); fs.writeFileSync(store.filePath,JSON.stringify(store.data,null,2)); }
function newId(prefix) { return uid(prefix); }
module.exports = { loadStore, saveStore, initialData, newId, pendingDecisions };
