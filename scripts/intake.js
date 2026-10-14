'use strict';
const fs=require('node:fs'),path=require('node:path');
if(process.loadEnvFile&&fs.existsSync(path.resolve('.env')))process.loadEnvFile(path.resolve('.env'));
const readXlsx=require('read-excel-file/node');
async function main(){
 const args=process.argv.slice(2),value=flag=>{const i=args.indexOf(flag);return i<0?undefined:args[i+1];};
 if(args.includes('--help')){console.log('npm run intake -- --opportunity-id <Salesforce ID> --request-id <unique ID>\nOr: npm run intake -- --file <Pricing Intake.xlsx> [--request-id <ID>]\nWorksheet columns: Request ID, Opportunity ID, Request Pricing (Yes).');return;}
 let rows=[];if(args.includes('--sync')){if(!value('--event-id')||!value('--opportunity-id'))throw Error('Supply --event-id and --opportunity-id for lifecycle synchronization.');rows=[{eventId:value('--event-id'),opportunityId:value('--opportunity-id')}];}else if(value('--file')){const sheets=await readXlsx(value('--file')),sheet=sheets.find(s=>s.sheet==='Pricing Intake')||sheets[0];if(!sheet?.data.length)throw Error('Intake worksheet is empty.');const headers=sheet.data[0].map(x=>String(x||'').trim().toLowerCase()),at=name=>headers.indexOf(name);for(const h of ['request id','opportunity id','request pricing'])if(at(h)<0)throw Error('Missing worksheet column: '+h);rows=sheet.data.slice(1).filter(r=>String(r[at('request pricing')]).trim().toLowerCase()==='yes').map(r=>({requestId:String(r[at('request id')]||''),opportunityId:String(r[at('opportunity id')]||'')}));if(value('--request-id'))rows=rows.filter(r=>r.requestId===value('--request-id'));}
 else rows=[{requestId:value('--request-id'),opportunityId:value('--opportunity-id')}];
 if(!rows.length)throw Error('No approved Request Pricing=Yes rows matched.');
 const token=process.env.INTAKE_TOKEN||fs.readFileSync(path.resolve(process.env.LOCAL_ACCESS_DIR||'./data/local-access','intake-token.txt'),'utf8').trim();
 const base=process.env.PRICE_TRACK_URL||'http://127.0.0.1:3000';if(!/^https?:\/\//.test(base))throw Error('Invalid PRICE_TRACK_URL.');
 let failed=false;for(const row of rows){const response=await fetch(base+'/api/v1/integrations/salesforce/'+(args.includes('--sync')?'events':'pricing-requests'),{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(row),signal:AbortSignal.timeout(30000)});const result=await response.json();if(!response.ok){failed=true;console.error((row.requestId||row.eventId)+': '+(result.error?.message||'Request failed'));}else console.log((row.requestId||row.eventId)+' -> '+result.caseId+(result.duplicate?' (existing case)':' (created)'));}if(failed)process.exitCode=1;
}
main().catch(error=>{console.error(error.code==='ENOENT'?'Start Price Track once to provision local access files, then retry.':error.message);process.exitCode=1;});
