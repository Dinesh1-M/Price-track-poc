 'use strict';
const fs=require('node:fs');const path=require('node:path');const initSqlJs=require('sql.js');
const {initialData,loadStore}=require('./store');
async function openStore(options={}){
 if(options.provider==='json')return loadStore(options.legacyPath);
 if(options.provider && options.provider!=='sqlite')throw new Error('Unsupported DB_PROVIDER. SQL Server requires its verified production adapter.');
 const SQL=await initSqlJs();const filePath=path.resolve(options.path||'./data/price-track.sqlite');fs.mkdirSync(path.dirname(filePath),{recursive:true});
 const db=new SQL.Database(fs.existsSync(filePath)?fs.readFileSync(filePath):undefined);db.run('PRAGMA foreign_keys=ON');db.run(fs.readFileSync(path.join(__dirname,'../db/migrations/sqlite/001_core.sql'),'utf8'));
 const rows=db.exec('SELECT revision,payload FROM application_state WHERE id=1');
 const legacy=path.resolve(options.legacyPath||'./data/store.json');
 const store={provider:'sqlite',db,filePath,revision:rows.length?rows[0].values[0][0]:0,data:rows.length?JSON.parse(rows[0].values[0][1]):fs.existsSync(legacy)?JSON.parse(fs.readFileSync(legacy,'utf8')):initialData()};
 store.persist=()=>{
  db.run('BEGIN IMMEDIATE');try{
   const current=db.exec('SELECT revision FROM application_state WHERE id=1');if(current.length&&current[0].values[0][0]!==store.revision)throw new Error('Store revision conflict');
   for(const c of store.data.cases){db.run('INSERT INTO pricing_cases(id,opportunity_id,account,payload) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET opportunity_id=excluded.opportunity_id,account=excluded.account,payload=excluded.payload',[c.id,c.opportunityId,c.account,JSON.stringify(c)]);
    for(const v of c.versions){const snapshot=JSON.stringify({lines:v.snapshot,calculation:v.calculation,terms:v.pricingTerms,rules:v.ruleSnapshot});db.run('INSERT INTO pricing_versions(id,case_id,number,snapshot,payload) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET snapshot=excluded.snapshot,payload=excluded.payload',[v.id,c.id,v.number,snapshot,JSON.stringify(v)]);}
    for(const h of c.handoffs)db.run('INSERT INTO integration_messages(id,idempotency_key,payload) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload',[h.id,h.idempotencyKey,JSON.stringify(h)]);
   }
   for(const event of store.data.audit){const existing=db.exec('SELECT payload FROM audit_events WHERE id=?',[event.id]);if(existing.length&&existing[0].values[0][0]!==JSON.stringify(event))throw new Error('Audit event is immutable');db.run('INSERT OR IGNORE INTO audit_events(id,payload) VALUES(?,?)',[event.id,JSON.stringify(event)]);}
   const next=store.revision+1;db.run('INSERT INTO application_state(id,revision,payload) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,payload=excluded.payload',[next,JSON.stringify(store.data)]);db.run('COMMIT');
   const temp=filePath+'.tmp';fs.writeFileSync(temp,db.export());fs.renameSync(temp,filePath);store.revision=next;
  }catch(error){try{db.run('ROLLBACK');}catch{}throw error;}
 };store.close=()=>db.close();if(!rows.length)store.persist();return store;
}
module.exports={openStore};
