'use strict';
const fs=require('node:fs'),path=require('node:path'),source=require('../src/salesforce-opportunities'),{create}=require('../src/xlsx-template'),readXlsx=require('read-excel-file/node'),{reminderDate}=require('../src/renewal-policy');
if(process.loadEnvFile&&fs.existsSync(path.resolve('.env')))process.loadEnvFile(path.resolve('.env'));
async function main(){
 const args=process.argv.slice(2),file=path.resolve(args.find(x=>!x.startsWith('--'))||'./data/Pricing Intake.xlsx'),dataset=await source.readWorkbook();
 if(!dataset.available)throw Error('Source workbook unavailable.');
 const existing=[];
 if(fs.existsSync(file)){
  if(!args.includes('--refresh'))throw Error('Template already exists. Use --refresh to update source references while preserving requests and creating a backup.');
  const sheets=await readXlsx(file),rows=(sheets.find(s=>s.sheet==='Pricing Intake')||sheets[0]).data,headers=rows[0].map(x=>String(x||'').trim().toLowerCase());
  for(const h of ['request id','opportunity id','request pricing'])if(!headers.includes(h))throw Error('Existing intake is missing '+h+'; cannot safely refresh.');
  for(const row of rows.slice(1)){const id=String(row[headers.indexOf('opportunity id')]||'').trim();if(id)existing.push({id,request:String(row[headers.indexOf('request id')]||''),flag:String(row[headers.indexOf('request pricing')]||'No')});}
 }
 const headers=['Request ID','Opportunity ID','Request Pricing',...dataset.columns.map(c=>c.name+' (reference)'),'Overall budget (reference)','Budget currency (reference)','Renewal review due (Close Date minus 3 months)','BU selection (reference)','Actual utilization source (reference)','Cost COLA policy (reference)'];
 const rowFor=(item,request)=>[request?.request||'INTAKE-'+item.opportunityId,item.opportunityId,request?.flag||'No',...dataset.columns.map(c=>item.sourceFields[c.key]??''),item.amount??'',item.currency,item.type==='Renewal'?reminderDate(item.closeDate):'','RCM: R&M or CPG; TMT: Tech 1 or Tech 2. Select child BU in Price Track.','Not supplied by Salesforce; enter actuals and evidence in renewal inputs','Finance managed; initial overall cost increase 5%; confirm current policy in Price Track'];
 const byId=new Map(dataset.items.map(x=>[x.opportunityId,x])),rows=[headers];
 for(const request of existing){const item=byId.get(request.id)||{opportunityId:request.id,sourceFields:{}};rows.push(rowFor(item,request));}
 const used=new Set(existing.map(x=>x.id));for(const item of dataset.items)if(!used.has(item.opportunityId))rows.push(rowFor(item));
 fs.mkdirSync(path.dirname(file),{recursive:true});const temporary=file+'.refresh-'+process.pid+'.xlsx';
 try{create(temporary,rows);if(fs.existsSync(file)){const backup=file+'.before-refresh-'+Date.now()+'.xlsx';fs.copyFileSync(file,backup,fs.constants.COPYFILE_EXCL);console.log('Preserved previous intake: '+backup);}fs.copyFileSync(temporary,file);}finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
 console.log('Created '+file+' with '+dataset.columns.length+' Salesforce columns and '+(rows.length-1)+' opportunities. Existing request IDs and Yes/No selections preserved. Only Request ID, Opportunity ID and Request Pricing are submitted; all references are re-read from Salesforce by the server.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
