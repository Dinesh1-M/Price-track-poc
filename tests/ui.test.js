'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {initialData}=require('../src/store');
const {calculatePricing}=require('../src/domain');
const publicDir=path.join(__dirname,'../public');
function ui(role='Admin'){
 const elements=new Map();
 const element=selector=>{if(!elements.has(selector))elements.set(selector,{value:selector==='#identity'?'u-admin':'',listeners:{},addEventListener(type,handler){this.listeners[type]=handler;},classList:{toggle(){},add(){},remove(){}},showModal(){this.open=true;},close(){this.open=false;},textContent:'',innerHTML:''});return elements.get(selector);};
 const document={querySelector:element,querySelectorAll:()=>[],addEventListener(){}};
 const context=vm.createContext({document,window:{scrollTo(){}},Intl,Date,console,setTimeout,clearTimeout,structuredClone});
 const source=fs.readFileSync(path.join(publicDir,'app.js'),'utf8').split('(async()=>{const users=')[0];
 vm.runInContext(fs.readFileSync(path.join(publicDir,'product.js'),'utf8'),context);
 vm.runInContext(source,context);
 const data=initialData();data.user=data.users.find(u=>u.role===role);data.tasks=[];data.ruleNotice='Demo rules';data.calculations=Object.fromEntries(data.cases.map(c=>[c.id,calculatePricing(c.lines,data.rates,{targetMarginPct:c.targetMarginPct,fallbackAllowed:true})]));
 if(role==='Client Partner')for(const c of data.cases){c.lines.forEach(l=>delete l.costPerHour);delete data.calculations[c.id].totalCost;data.calculations[c.id].lineResults.forEach(l=>{delete l.cost;delete l.costPerHour;});}
 context.fixture=data;vm.runInContext('state.data=fixture;state.selectedCase=fixture.cases[0].id;',context);
 return {run:code=>vm.runInContext(code,context),elements,data,context};
}
test('navigation hides resource editing and retains the pricing calculator for all roles',()=>{
 const html=fs.readFileSync(path.join(publicDir,'index.html'),'utf8');
 const nav=html.split('<nav id="nav">')[1].split('</nav>')[0];
 const pages=[...nav.matchAll(/data-page="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(pages,['dashboard','cases','renewals','versions','calculator','approvals','workflow','administration','notifications']);
 assert.doesNotMatch(nav,/data-page="workspace"/);
 assert.match(nav,/data-page="calculator"/);
 assert.doesNotMatch(nav,/<span/);
 assert.match(nav,/data-page="calculator"[^>]*>Pricing Calculator<\/button>/);
 assert.doesNotMatch(nav,/Rate management|Rate Cards/);
 assert.match(html,/id="salesforce-opportunities-entry"/);
 assert.match(html,/<button class="btn secondary" id="salesforce-opportunities-entry"[^>]*>Salesforce Opportunities<\/button>/);
});
test('signed-in identity shows the user role rather than the Tech COE capability',()=>{
 const u=ui('BU SPOC');u.data.user.techCoe='BI COE';u.run('setIdentity()');
 assert.equal(u.elements.get('#signed-in-role').textContent,'BU SPOC');
});
test('opening an accessible pricing case routes to the calculator and leaves source details below it',async()=>{
 const u=ui();const expected=u.data.calculations[u.data.cases[0].id];
 assert.equal(u.run('calculateFor(currentCase())'),expected);
 await u.run(`act('open-case',{dataset:{id:'${u.data.cases[0].id}'}})`);
 assert.equal(u.run('state.page'),'calculator');
 let html=u.elements.get('#content').innerHTML;
 assert.match(html,/calculator-panel/);
 assert.match(html,/workspace-layout standalone/);
 assert.match(html,/resource-panel/);
 assert.match(html,/data-action="add-line"/);
 assert.match(html,/Saved pricing KPIs/);
 assert.match(html,/Validation & rate resolution/);
 assert.match(html,/Case comments/);
 assert.match(html,/Next actions/);
 assert.match(html,/data-action="recalculate"/);
 assert.match(html,/Salesforce source details/);
 assert.doesNotMatch(html,/Read-only opportunity snapshot|read-only snapshot/);
 assert.doesNotMatch(html,/Salesforce source details ·|Salesforce source details.*read-only snapshot/);
 assert.doesNotMatch(html,/Edit pricing inputs|Edit case \/ pricing/);
 assert.ok(html.indexOf('Next actions')<html.indexOf('salesforce-source-details'));
 assert.equal((html.match(/Salesforce source details/g)||[]).length,1);
 await u.run('setPage("workspace")');
 assert.equal(u.run('state.page'),'calculator');
 html=u.elements.get('#content').innerHTML;
 assert.match(html,/Salesforce source details/);
});
test('restricted roles have no cost editors or total-cost values in either calculator',()=>{
 const u=ui('Client Partner');
 const html=u.run('workspacePage(true)');
 assert.doesNotMatch(html,/data-key="costPerHour"/);
 assert.match(html,/Restricted/);
});
test('pricing calculator info button explains calculations clearly and retains all calculator controls',async()=>{
 const u=ui(),html=u.run('workspacePage(true)');
 assert.match(html,/aria-label="Explain the working calculation"/);
 assert.match(html,/Working calculation/);
 assert.match(html,/data-action="recalculate"/);
 await u.run(`productAction('working-calculation-info',{})`);
 assert.equal(u.elements.get('#modal').open,true);
 assert.match(u.elements.get('#modal-title').textContent,/How the working calculation works/);
 const guide=u.elements.get('#modal-body').innerHTML;
 assert.match(guide,/Scheduled hours/);
 assert.match(guide,/Contribution margin/);
 assert.match(guide,/<ol>/);
 assert.match(guide,/Calculate Price/);
 assert.match(guide,/not Finance-approved/);
 assert.doesNotMatch(guide,/\$[0-9]/);
 const clientPartner=ui('Client Partner');
 assert.match(clientPartner.run('workspacePage(true)'),/aria-label="Explain the working calculation"/);
 await clientPartner.run(`productAction('working-calculation-info',{})`);
 assert.match(clientPartner.elements.get('#modal-body').innerHTML,/Scheduled hours/);
 u.run(`currentCase().pricingRuleSet='WORKBOOK'`);
 await u.run(`productAction('working-calculation-info',{})`);
 assert.match(u.elements.get('#modal-body').innerHTML,/Bench loading/);
 assert.match(u.elements.get('#modal-body').innerHTML,/Renewal COLA/);
});
test('workbook calculator keeps formula explanation in the guide instead of the crowded calculation panel',async()=>{
 const u=ui();u.run(`currentCase().pricingRuleSet='WORKBOOK'`);
 const html=u.run('workspacePage(true)');
 assert.match(html,/calculator-panel/);
 assert.match(html,/workspace-layout standalone/);
 assert.match(html,/resource-panel/);
 assert.match(html,/data-action="add-line"/);
 assert.match(html,/Submission checks/);
 assert.match(html,/Salesforce source details/);
 assert.doesNotMatch(html,/Workbook calculation/);
 assert.doesNotMatch(html,/formula-summary/);
 await u.run(`productAction('working-calculation-info',{})`);
 assert.match(u.elements.get('#modal-body').innerHTML,/Delivery cost/);
 assert.match(u.elements.get('#modal-body').innerHTML,/Bench loading/);
});
test('dashboard and approval summary cards have no question-mark icons and clearer descriptions',()=>{
 const u=ui('Sales/Pricing Analyst'),dashboard=u.run('dashboard()'),approvals=u.run('approvalsPage()');
 assert.doesNotMatch(dashboard,/exception-icon|kpi-icon/);
 assert.match(dashboard,/Cases waiting for reviewer action/);
 assert.match(dashboard,/Live connection and authentication are not configured yet/);
 assert.doesNotMatch(approvals,/kpi-icon/);
 assert.match(approvals,/Permissions for this role/);
 assert.match(approvals,/immutable pricing version/);
});
test('approval current-role tile uses a compact label and responsive styling',()=>{
 const u=ui('Sales/Pricing Analyst'),html=u.run('approvalsPage()');
 assert.match(html,/class="kpi-grid approval-kpis"/);
 assert.match(html,/Current role/);
 assert.match(fs.readFileSync(path.join(publicDir,'product.css'),'utf8'),/\.approval-kpis \.kpi:last-child \.kpi-value\{font-size:clamp/);
});
test('all nine pages render and legacy support links resolve to visible pages',()=>{
 const u=ui();for(const page of ['dashboard','cases','renewals','workspace','versions','calculator','approvals','workflow','administration']){u.run('setPage('+JSON.stringify(page)+')');assert.ok(u.elements.get('#content').innerHTML.length>0);}
 for(const [old,next] of [['rates','administration'],['audit','administration'],['governance','administration'],['exceptions','workflow'],['integrations','workflow'],['workspace','calculator']]){u.run('setPage('+JSON.stringify(old)+')');assert.equal(u.run('state.page'),next);}
 assert.match(u.run('administrationPage()'),/data-action="new-rate"/);
 assert.match(u.run('workflowPage()'),/data-action="create-handoff"/);
});
test('empty accessible cases render without errors',()=>{
 const u=ui();u.run('state.data.cases=[];state.selectedCase=null;');
 for(const name of ['workspacePage','renewalsPage','versionsPage','workflowPage','approvalsPage'])assert.ok(u.run(name+'()').length>0);
 const spoc=ui('BU SPOC');spoc.run('state.data.cases=[];state.selectedCase=null;');
 assert.match(spoc.run('casesPage()'),/No pricing cases are assigned to this Tech COE yet/);
 assert.match(spoc.run('casesPage()'),/external Salesforce pricing request is received/);
});
test('version records and approval relationships remain intact while rendering notes',()=>{
 const u=ui();const original=JSON.stringify(u.data.cases[1].versions);
 const html=u.run('versionsPage()');assert.match(html,/Rework on cost assumptions/);assert.match(html,/VER-2002/);assert.match(html,/Demo Finance Reviewer/);
 assert.equal(JSON.stringify(u.data.cases[1].versions),original);
});

test('editable sample forms, pricing formulas, negotiation and closing actions are exposed',()=>{
 const u=ui();
 assert.match(u.run('caseForm(currentCase())'),/name="scope"/);assert.match(u.run('caseForm(currentCase())'),/name="colaPct"/);
 assert.match(u.run('workspacePage()'),/Scheduled hours = resource count/);assert.match(u.run('workspacePage()'),/data-key="quantity"/);
 assert.match(u.run('workspacePage()'),/data-action="save-calculation"/);assert.match(u.run('workspacePage()'),/data-action="create-version"/);
 assert.doesNotMatch(u.run('workspacePage()'),/Create Pricing Version & Submit/);
 assert.match(u.run('versionsPage()'),/data-action="new-negotiation"/);assert.match(u.run('workflowPage()'),/Contract &amp; Launch/);
 u.run('currentCase().status="Closed Won";currentCase().stage="Closed Won";currentCase().finalOffer={number:3,price:46000,currency:"USD",approvalOutcome:"Agreed"};');
 assert.match(u.run('workflowPage()'),/final V3/);assert.match(u.run('caseRows([currentCase()])'),/Final V3/);assert.match(u.run('dashboard()'),/Closed Won/);
});

test('finance queue explains prior approval and only exposes assigned ready actions',()=>{const u=ui('Finance');const html=u.run('approvalsPage()');assert.match(html,/Waiting for BU Head approval/);assert.doesNotMatch(html,/data-action="approve"/);u.data.cases[1].versions[1].approvals[0].status='Approved';assert.match(u.run('approvalsPage()'),/data-action="approve"/);});
test('saved cost changes appear in pricing history for cost-visible identities',()=>{const u=ui('BU SPOC');u.data.cases[0].costHistory=[{role:'Data Engineer',grade:'G3',currency:'USD',previousCost:20,costPerHour:25,actor:'Demo BU SPOC',at:new Date().toISOString(),revision:4}];assert.match(u.run('versionsPage()'),/Resource cost change history/);assert.match(u.run('versionsPage()'),/Demo BU SPOC/);assert.match(u.run('costHistory(currentCase())'),/25/);});

test('Finance approval appears on its version timeline row even with a newer draft',()=>{
 const u=ui('Finance');const c=u.data.cases[0];c.versions=[{id:'APPROVED-V1',number:1,status:'Approved',approvals:[{step:2,role:'Finance',status:'Approved',actor:'Demo Finance Reviewer',at:'2026-10-13T03:24:12.234Z',reason:'Finance approval recorded'}]},{id:'DRAFT-V2',number:2,status:'Draft',approvals:[]}];
 const html=u.run('versionsPage()');assert.doesNotMatch(html,/Version approval history/);assert.match(html,/<th>Approval decisions<\/th>/);
 const rows=html.split(/(?=<tr data-version-id=)/);
 const row=rows.find(r=>r.includes('APPROVED-V1'));assert.match(row,/version-approvals/);assert.match(row,/Finance approval recorded/);assert.match(row,/Demo Finance Reviewer/);assert.match(row,/Approved/);assert.match(row,/Oct 13/);
 const draftRow=rows.find(r=>r.includes('DRAFT-V2'));assert.match(draftRow,/Not submitted for approval/);assert.doesNotMatch(draftRow,/Finance approval recorded/);

});

test('Client Partner new-case form supplies and locks the assigned customer',()=>{const u=ui('Client Partner');const html=u.run('caseForm()');assert.match(html,/Your assigned customer is Northstar Retail/);assert.match(html,/<input[^>]*name="account"[^>]*value="Northstar Retail"[^>]*readonly/);assert.match(html,/name="bu"[^>]*value="R&amp;M"/);});

test('opportunity intake renders source fields, filters, and clear empty states',async()=>{
 const u=ui('Client Partner');
 u.run(`state.opportunities={available:true,sourceFile:'Salesforce sythetic data.xlsx',worksheet:'Sheet1',visibleCount:1,warnings:[],items:[{sourceOpportunityId:'006ABC',proposalNumber:'P-1',account:'ABC',opportunityName:'ABC Demo',stage:'Qualification',amount:50000,currency:'USD',owner:'Source Owner',fiscalPeriod:'Q1-2027',capability:'Consulting',type:'New Business'}]};`);
 const html=u.run('opportunitiesPage()');
 assert.match(html,/006ABC/);assert.match(html,/ABC Demo/);assert.match(html,/Source Owner/);assert.match(html,/aria-label="Search opportunities"/);assert.match(html,/data-action="view-opportunity"/);assert.match(html,/No case yet/);assert.doesNotMatch(html,/Awaiting external trigger/);
 await u.run(`act('view-opportunity',{dataset:{id:'006ABC'}})`);
 const details=u.run('opportunitiesPage()');
 assert.match(details,/Read-only source opportunity details/);assert.match(details,/No pricing request has reached Price Track/);assert.match(details,/external Pricing Intake workflow/);
 assert.equal(u.run('state.selectedOpportunityId'),'006ABC');
 await u.run(`act('close-opportunity-details',{dataset:{}})`);
 assert.equal(u.run('state.selectedOpportunityId'),null);
 const form=u.run(`caseForm({opportunityId:'006ABC',opportunityName:'ABC Demo',account:'ABC',opportunityType:'DAA',capability:'Consulting',currency:'USD',budget:50000})`);
 assert.match(form,/name="opportunityId"[^>]*value="006ABC"/);assert.match(form,/name="opportunityName"[^>]*value="ABC Demo"/);assert.match(form,/DAA .*Salesforce source/);
 u.run(`state.opportunities={available:true,items:[]};`);
 u.data.user.account='Northstar Retail';
 assert.match(u.run('opportunitiesPage()'),/No opportunities are assigned to/);
 assert.doesNotMatch(u.run('opportunitiesPage()'),/Demo identity selector/);
 u.run(`state.opportunities={available:false,items:[]};`);
 assert.match(u.run('opportunitiesPage()'),/workbook is unavailable/);
});

test('notifications render event metadata and open the exact case version',async()=>{
 const u=ui();u.data.notifications=[{id:'NOT-1',title:'Approval required: Opportunity — V1',message:'V1 is awaiting BU Head review.',caseId:'PT-1001',caseReference:'PT-1001',versionId:'VER-1001',versionNumber:1,approvalTaskId:'VER-1001:1',type:'approval',sourceEvent:'VERSION_SUBMITTED',createdAt:'2026-10-13T03:24:12.234Z',readAt:null}];
 const html=u.run('notificationsPage()');
 assert.match(html,/VER-1001:1/);assert.match(html,/VERSION_SUBMITTED/);assert.match(html,/data-action="read-notification"/);assert.match(html,/data-action="read-all-notifications"/);
 u.context.fetch=async url=>({ok:true,json:async()=>url.includes('/notifications/')?{notification:{caseId:'PT-1001',versionId:'VER-1001',route:'approvals'}}:u.data});
 await u.run(`act('open-notification',{dataset:{id:'NOT-1'}})`);
 assert.equal(u.run('state.selectedCase'),'PT-1001');assert.equal(u.run('state.selectedVersionId'),'VER-1001');assert.equal(u.run('state.page'),'approvals');
});

test('sign-out clears account data and an expired session returns to login',async()=>{
 const u=ui();u.run('state.opportunities={available:true,items:[{account:"XYZ"}]};');
 u.context.fetch=async()=>({ok:true,json:async()=>({ok:true})});await u.elements.get('#logout').listeners.click();
 assert.equal(u.run('state.data'),null);assert.equal(u.run('state.opportunities'),null);assert.equal(u.elements.get('.app-shell').hidden,true);
 u.context.fetch=async()=>({ok:false,status:401,json:async()=>({error:{message:'Sign in'}})});
 await assert.rejects(u.run("api('/api/v1/bootstrap')"));assert.equal(u.elements.get('#login-screen').hidden,false);
});
test('API identity is carried by the session cookie rather than query parameters or role headers',async()=>{
 const u=ui();let observed;u.context.fetch=async(url,options)=>{observed={url,options};return{ok:true,json:async()=>({items:[]})};};
 await u.run("api('/api/v1/cases')");assert.equal(observed.url,'/api/v1/cases');assert.equal(observed.options.credentials,'same-origin');assert.equal(observed.options.headers['X-Demo-User'],undefined);
});
test('opportunity refresh failure clears old rows and renders the error',async()=>{
 const u=ui();u.run('state.opportunities={available:true,items:[{account:"XYZ"}]};');
 u.context.fetch=async()=>({ok:false,status:403,json:async()=>({error:{message:'Source temporarily unavailable'}})});
 await assert.rejects(u.run('loadOpportunities()'));assert.equal(u.run('state.opportunities'),null);
 assert.match(u.run('opportunitiesPage()'),/Unable to load opportunities: Source temporarily unavailable/);
});
test('an in-flight opportunity response is discarded after sign-out',async()=>{
 const u=ui();let finish;u.context.fetch=()=>new Promise(resolve=>finish=resolve);
 const pending=u.run('loadOpportunities()');u.run('showLogin()');
 finish({ok:true,json:async()=>({available:true,items:[{account:'XYZ'}]})});await pending;assert.equal(u.run('state.opportunities'),null);
});
test('submission validation tolerates an older response without production blocker details',async()=>{
 const u=ui();u.context.fetch=async()=>({ok:true,json:async()=>({valid:true,blockers:[]})});
 const result=await u.run("api('/api/v1/cases/PT-1001/validate-submission',{method:'POST',body:{}})");
 assert.equal(result.demoSubmissionAllowed,true);
 assert.deepEqual(Array.from(result.productionBlockers),[]);
});

test('resource autosave updates revision without creating versions or erasing newer edits',async()=>{
 const u=ui('BU SPOC');const c=u.data.cases[0],count=c.versions.length;let finish;u.context.fetch=()=>new Promise(resolve=>finish=resolve);
 u.run('state.autosave=true;state.dirty=true;state.editGeneration=1;');const pending=u.run('autosaveDraft()');
 u.run('state.editGeneration=2;state.autosave=false;currentCase().lines[0].hoursPerPeriod=222;');
 finish({ok:true,json:async()=>({revision:c.revision+1,savedAt:new Date().toISOString(),calculation:u.data.calculations[c.id]})});await pending;
 assert.equal(u.run('state.dirty'),true);assert.equal(u.run('currentCase().lines[0].hoursPerPeriod'),222);assert.equal(c.versions.length,count);assert.equal(u.run('state.saveInFlight'),null);
});
