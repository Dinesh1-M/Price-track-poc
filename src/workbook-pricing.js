'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const readXlsx=require('read-excel-file/node');
// Rational arithmetic keeps decimal inputs exact until the response boundary.
class Decimal{
 constructor(n,d=1n){n=BigInt(n);d=BigInt(d);if(!d)throw Error('Division by zero');if(d<0){n=-n;d=-d;}let a=n<0?-n:n,b=d;while(b){const r=a%b;a=b;b=r;}this.n=n/(a||1n);this.d=d/(a||1n);}
 static of(x){const match=String(x).match(/^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i);if(!match)throw Error('Invalid decimal');const fraction=match[3]||'',power=fraction.length-Number(match[4]||0),n=BigInt((match[1]||'')+match[2]+fraction);return power>=0?new Decimal(n,10n**BigInt(power)):new Decimal(n*10n**BigInt(-power));}
 add(x){x=x instanceof Decimal?x:Decimal.of(x);return new Decimal(this.n*x.d+x.n*this.d,this.d*x.d);}
 sub(x){x=x instanceof Decimal?x:Decimal.of(x);return new Decimal(this.n*x.d-x.n*this.d,this.d*x.d);}
 mul(x){x=x instanceof Decimal?x:Decimal.of(x);return new Decimal(this.n*x.n,this.d*x.d);}
 div(x){x=x instanceof Decimal?x:Decimal.of(x);return new Decimal(this.n*x.d,this.d*x.n);}
 number(){return Number(this.n)/Number(this.d);}
}
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
const sum=xs=>xs.reduce((s,x)=>s.add(x),Decimal.of(0));
async function loadReference(file=path.resolve(process.env.MARGIN_WORKBOOK_PATH||path.join(__dirname,'../data/Margin Calculator_new 1.xlsx'))){
 const bytes=fs.readFileSync(file),sheets=await readXlsx(file),sheet=name=>sheets.find(s=>s.sheet===name)?.data;
 const master=sheet('Master File - Rate Card'),summary=sheet('Margin_Summary'),on=sheet('Revenue & Cost_Onshore'),off=sheet('Revenue & Cost_Offshore '),vertical=sheet('Vertical-Based GM Calculation');
 if(!master||!summary||!on||!off||!vertical)throw Error('Required Margin Calculator worksheets are missing.');
 const rates=master.slice(3).map((r,i)=>({id:'WB-RATE-'+(i+4),row:i+4,category:r[0],key:r[1],role:r[2],experience:r[3],onshoreCost:r[6],offshoreCost:r[10],onshoreCtc:r[5],offshoreCtc:r[9]})).filter(r=>typeof r.key==='string'&&r.key.trim());
 return {id:'MARGIN-WORKBOOK-1',sha256:crypto.createHash('sha256').update(bytes).digest('hex'),simulatedTargets:[summary[17][4]*100,summary[18][4]*100],governance:sheet('Governance').slice(5,9).map(r=>({revenueBand:r[1],gmCondition:r[2],authority:r[3]})),file:path.basename(file),status:'IMPLEMENTED_UNVERIFIED',rates,verticals:vertical.slice(1).filter(r=>r[0]).map(r=>({name:r[0],totalRatio:r[12],offshoreRatio:r[13],onshoreRatio:r[14]})),hours:{Onshore:on[3][14],Offshore:off[3][14]},benchPct:summary[7][7]*100,targetMarginPct:on[4][4]*100,fxReference:master[0][1],sourceNote:'Workbook rates use cached formula outputs. No fresh Excel recalculation or Finance sign-off.'};
}
function calculateWorkbook(c,reference,config={}){
 const exceptions=[],add=(id,reason)=>exceptions.push({id:'EX-'+id,lineId:id,severity:'High',blocking:true,reason});
 const target=Number(c.targetMarginPct),bench=Number(c.benchPct??reference.benchPct),vertical=reference.verticals.find(v=>v.name===(c.pricingVertical||c.sourceOpportunity?.vertical));
 if(!Number.isFinite(target)||target<0||target>=100)add('TARGET','Target CM must be at least zero and below 100%.');
 if(!Number.isFinite(bench)||bench<5||bench>10)add('BENCH','Workbook bench loading must be between 5% and 10%.');
 if(c.currency!=='USD')add('FX','Workbook pricing is in USD. An approved FX policy is required for other currencies.');
 if(!vertical||!Number.isFinite(vertical.totalRatio))add('VERTICAL','Select an exact workbook pricing vertical; no implicit HLS conversion is configured.');
 const cola=Number(c.opportunityType==='Renewal'?(config.colaPolicy?.pct??c.colaPct??5):(c.colaPct??0));
 if(!Number.isFinite(cola)||cola<0||cola>=100||c.opportunityType!=='Renewal'&&cola!==0)add('COLA','Cost COLA must be 0 to below 100% and applies only to renewals.');
 if(!c.lines.length)add('EMPTY','Add at least one resource or product line.');
 const lineResults=c.lines.map(line=>{
  const errors=[],invalid=msg=>errors.push(msg),quantity=Number(line.quantity),months=Number(line.periods),util=Number(line.utilizationPct),hours=Number(line.hoursPerPeriod),classification=line.classification;
  let cost=null,revenue=null,rate=null,record=null,formulaRefs=[];
  if(line.workType==='Product'){
   const unit=Number(line.productUnitCost),units=Number(line.productQuantity??line.quantity),sell=Number(line.productRevenue);
   if(line.productUnitCost===undefined||line.productUnitCost===null||line.productUnitCost===''||!Number.isFinite(unit)||unit<0||!Number.isFinite(units)||units<=0||line.productRevenue===undefined||!Number.isFinite(sell)||sell<0)invalid('Product requires unit cost, positive units and explicit product revenue; workbook IP pricing is an input.');
   else {cost=Decimal.of(unit).mul(units);revenue=Decimal.of(sell);}
   formulaRefs=['IP_Product Cost!G5:G13','IP_Product Cost!G15:G17'];
  }else{
   if(!['T&M','FTE','Program'].includes(line.workType))invalid('Unsupported work type.');
   for(const [label,value] of [['resource count',quantity],['months',months],['hours per month',hours]])if(!Number.isFinite(value)||value<=0)invalid(`Supply positive ${label}.`);
   if(!Number.isInteger(quantity))invalid('Resource count must be a whole number.');
   if(line.utilizationPct===undefined||line.utilizationPct===null||line.utilizationPct===''||!Number.isFinite(util)||util<0||util>100)invalid('Billability must be between 0 and 100%.');
   if(!['Onshore','Offshore'].includes(classification))invalid('Choose Onshore or Offshore.');
   if(!line.role||!line.grade||!line.location||!line.bu)invalid('Role, experience, location and BU are required.');
   const matches=reference.rates.filter(r=>line.workbookRateKey?r.key===line.workbookRateKey:r.role===line.role&&r.experience===line.grade);
   if(matches.length!==1)invalid(matches.length?'Conflicting workbook role/experience rows.':'Choose a role/experience from the workbook rate card.');
   else {record=matches[0];if(record.role!==line.role||record.experience!==line.grade)invalid('Role and experience must match the selected workbook rate key.');}
   if(line.currency!=='USD')invalid('Resource currency must be USD for this workbook rule set.');
   const sheet=classification==='Onshore'?'Revenue & Cost_Onshore':'Revenue & Cost_Offshore ';
   formulaRefs=[`${sheet}!I9`,`${sheet}!K9`,`${sheet}!L9`,`${sheet}!M9`];
   const unit=record?.[classification==='Onshore'?'onshoreCost':'offshoreCost'];
   if(record&&(!Number.isFinite(unit)||unit<=0))invalid('Workbook cost is missing or invalid; zero lookup fallbacks are blocked.');
   if(!errors.length&&target>=0&&target<100){cost=Decimal.of(quantity).mul(months).mul(hours).mul(util).div(100).mul(unit);revenue=cost.div(Decimal.of(1).sub(Decimal.of(target).div(100)));rate=Decimal.of(unit).div(Decimal.of(1).sub(Decimal.of(target).div(100))).number();}
  }
  if(!validDate(line.startDate)||!validDate(line.endDate)||line.endDate<line.startDate)invalid('Supply valid ordered resource dates.');
  if(errors.length)add(line.id,errors.join('; '));
  const result={...line,costPerHour:record?.[classification==='Onshore'?'onshoreCost':'offshoreCost']??null,costSource:record?`${reference.file} / Master File - Rate Card!${classification==='Onshore'?'G':'K'}${record.row}`:'Product unit-cost input',rateId:record?.id||null,rateSource:'Workbook target-CM cost gross-up',rateResolution:errors.length?'Missing':'Resolved',resolvedRate:rate,revenue:revenue?.number()??null,cost:cost?.number()??null,totalHours:Number.isFinite(quantity*months*hours)?quantity*months*hours:null,utilizedHours:Number.isFinite(quantity*months*hours*util)?quantity*months*hours*util/100:null,billingBasis:line.workType==='Product'?'Workbook IP/product cost and revenue inputs':'Workbook people × months × hours × billability',formulaStatus:reference.status,formulaRefs,sourceHash:reference.sha256,errors};
  Object.defineProperty(result,'_cost',{value:cost});Object.defineProperty(result,'_revenue',{value:revenue});return result;
 });
 const complete=lineResults.every(l=>l._cost&&l._revenue),rawCost=complete?sum(lineResults.map(l=>l._cost)):null,base=complete?sum(lineResults.map(l=>l._revenue)):null;
 const employeeCost=complete?sum(lineResults.filter(l=>l.workType!=='Product').map(l=>l._cost)):null;
 const benchCost=employeeCost&&Number.isFinite(bench)?employeeCost.mul(bench).div(100):null,preColaCost=rawCost&&benchCost?rawCost.add(benchCost):null;
 const colaCost=preColaCost&&Number.isFinite(cola)&&cola>=0&&cola<100?preColaCost.mul(cola).div(100):null,totalCost=preColaCost&&colaCost?preColaCost.add(colaCost):null;
 const discount=Number(c.discountPct||0);if(!Number.isFinite(discount)||discount<0||discount>=100)add('DISCOUNT','Discount must be at least zero and below 100%.');
 if(c.offeredPrice!==undefined&&(!Number.isFinite(Number(c.offeredPrice))||Number(c.offeredPrice)<=0))add('OFFER','Negotiated offer must be positive.');
 const totalRevenue=base&&Number.isFinite(discount)&&discount>=0&&discount<100?(c.offeredPrice!==undefined&&Number(c.offeredPrice)>0?Decimal.of(c.offeredPrice):base.mul(Decimal.of(1).sub(Decimal.of(discount).div(100)))):null;
 const margin=totalCost&&totalRevenue&&totalRevenue.number()>0?totalRevenue.sub(totalCost).div(totalRevenue).mul(100):null;
 if(totalRevenue&&totalRevenue.number()<=0)add('REVENUE','Zero-revenue Excel display fallback cannot be submitted.');
 const targetRevenue=totalCost&&target>=0&&target<100?totalCost.div(Decimal.of(1).sub(Decimal.of(target).div(100))):null;
 const breakdown=group=>{const lines=lineResults.filter(group),valid=lines.every(l=>l._cost&&l._revenue);if(!valid)return {cost:null,revenue:null,contributionMarginPct:null};const cost=sum(lines.map(l=>l._cost)),revenue=sum(lines.map(l=>l._revenue));return {cost:cost.number(),revenue:revenue.number(),contributionMarginPct:revenue.number()>0?revenue.sub(cost).div(revenue).mul(100).number():null};};
 const streamTotals={Onshore:breakdown(l=>l.workType!=='Product'&&l.classification==='Onshore'),Offshore:breakdown(l=>l.workType!=='Product'&&l.classification==='Offshore'),Product:breakdown(l=>l.workType==='Product')};
 const workTypeTotals=Object.fromEntries(['T&M','FTE','Program','Product'].map(type=>[type,breakdown(l=>l.workType===type)]));
 return {streamTotals,workTypeTotals,simulations:reference.simulatedTargets.map(pct=>({targetMarginPct:pct,revenue:totalCost&&pct>=0&&pct<100?totalCost.div(Decimal.of(1).sub(Decimal.of(pct).div(100))).number():null,projectedGMPct:null,gmStatus:'Source simulation GM references empty rows 15–21; Finance review required.'})),lineResults,currency:c.currency,totalCost:totalCost?.number()??null,totalRevenue:totalRevenue?.number()??null,contributionMarginPct:margin?.number()??null,projectedGMPct:margin&&vertical?margin.mul(vertical.totalRatio).number():null,benchCost:benchCost?.number()??null,benchPct:bench,targetMarginPct:target,targetRevenue:targetRevenue?.number()??null,pricingGap:targetRevenue&&totalRevenue?targetRevenue.sub(totalRevenue).number():null,preColaCost:preColaCost?.number()??null,colaCost:colaCost?.number()??null,preColaRevenue:base?.number()??null,baseRevenue:base?.number()??null,colaPct:cola,discountPct:base?.number()>0&&totalRevenue?Decimal.of(1).sub(totalRevenue.div(base)).mul(100).number():discount,discountAmount:base&&totalRevenue?base.sub(totalRevenue).number():null,exceptions,warnings:[reference.sourceNote,...(c.opportunityType==='Renewal'?['COLA is a user-requested cost adjustment outside the workbook. Annual EVP Finance review: '+(config.colaPolicy?.lastReviewedYear||'pending')+'.']:[]),'Program uses workbook resource effort; milestones are not a separate approved workbook model.','Discount/negotiated offer is an explicit commercial input applied to workbook base revenue.'],ruleReference:{id:reference.id,sha256:reference.sha256,status:reference.status,colaPolicy:c.opportunityType==='Renewal'?{...structuredClone(config.colaPolicy||{id:'RENEWAL-COST-COLA',pct:cola,source:'User instruction'}),appliedPct:cola,formula:'Total cost = workbook cost including bench * (1 + COLA / 100); selling price unchanged'}:null,pricingVertical:vertical?.name||null,formulaRefs:['Margin_Summary!C8','Margin_Summary!C10','Margin_Summary!D10','Margin_Summary!E10','Margin_Summary!F10'],rates:lineResults.map(l=>({id:l.rateId,costPerHour:l.costPerHour,source:l.costSource}))}};
}
module.exports={Decimal,loadReference,calculateWorkbook};
