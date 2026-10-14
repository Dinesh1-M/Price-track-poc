'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {loadReference,calculateWorkbook,Decimal}=require('../src/workbook-pricing'),{extract,translate}=require('../src/workbook-source');
test('workbook calculation matches the supplied cached onshore/offshore, bench, CM and normalized GM sample',async()=>{
 const reference=await loadReference(),rate=reference.rates.find(r=>r.key==='Data Engineer / Data Modeler 1 | 2-3 Years');
 const line=(classification,utilizationPct)=>({id:classification,workType:'T&M',workbookRateKey:rate.key,role:rate.role,grade:rate.experience,bu:'RCM',location:'Sample location',classification,quantity:1,periods:1,hoursPerPeriod:160,utilizationPct,startDate:'2026-11-01',endDate:'2026-11-30',currency:'USD',costPerHour:999999});
 const c={currency:'USD',targetMarginPct:50,pricingVertical:'RCM',lines:[line('Onshore',50),line('Offshore',100)]},out=calculateWorkbook(c,reference),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} differs from ${b}`);
 assert.deepEqual(out.exceptions,[]);near(out.lineResults[0].cost,3386.875);near(out.lineResults[1].cost,1164.8745519713261);near(out.totalCost,4779.337029569893);near(out.totalRevenue,9103.499103942653);near(out.contributionMarginPct,47.5);near(out.projectedGMPct,37.247226624405705);near(out.simulations[0].revenue,9558.674059139787);assert.equal(out.simulations[0].projectedGMPct,null);
 assert.equal(out.ruleReference.sha256,reference.sha256);assert.notEqual(out.lineResults[0].costPerHour,999999,'manual costs cannot override source costs');
 c.pricingVertical='RAI';near(calculateWorkbook(c,reference).projectedGMPct,38,'normalized column M must be used');
 c.lines[0].workbookRateKey='Missing';assert.ok(calculateWorkbook(c,reference).exceptions.some(e=>e.reason.includes('Choose a role')));
});
test('decimal arithmetic and formula extraction preserve original shared formula semantics',()=>{
 assert.equal(Decimal.of('0.1').add('0.2').number(),0.3);
 assert.equal(translate('F4/(12*160)+$B$1+SUM(A1:A3)+IF(A4="A1",1,0)','G4','G5'),'F5/(12*160)+$B$1+SUM(A2:A4)+IF(A5="A1",1,0)');
 const manifest=extract(path.resolve(__dirname,'../data/Margin Calculator_new 1.xlsx'));
 assert.equal(manifest.formulaCount,1781);assert.ok(manifest.sheets.some(s=>s.name==='Revenue & Cost_Offshore '));assert.equal(manifest.formulas.find(f=>f.sheet==='Margin_Summary'&&f.cell==='C8').expression,'$H$8*(C6+C7)');assert.ok(manifest.formulas.every(f=>f.expression));
 const registered=require('../docs/finance/WORKBOOK_FORMULA_MANIFEST.json');assert.equal(manifest.sha256,registered.sha256,'Source workbook changed; review formula registry before release.');
});
test('workbook invalid financial inputs block and product cost follows explicit workbook inputs',async()=>{
 const reference=await loadReference(),c={currency:'USD',targetMarginPct:50,pricingVertical:'RCM',lines:[{id:'IP',workType:'Product',productUnitCost:12.5,productQuantity:4,productRevenue:100,startDate:'2026-11-01',endDate:'2026-11-30'}]};
 const out=calculateWorkbook(c,reference);assert.equal(out.totalCost,50);assert.equal(out.totalRevenue,100);assert.equal(out.contributionMarginPct,50);assert.deepEqual(out.exceptions,[]);
 c.currency='INR';c.colaPct=5;c.pricingVertical='HLS';const errors=calculateWorkbook(c,reference).exceptions.map(e=>e.lineId);for(const key of ['FX','COLA','VERTICAL'])assert.ok(errors.includes(key));
});
