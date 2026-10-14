 'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const {openStore}=require('../src/sqlite-store');
test('SQLite imports without modifying JSON, persists on reopen, and enforces unique/immutable data',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'price-sqlite-'));const legacy=path.join(dir,'old.json'),file=path.join(dir,'db.sqlite');const data=require('../src/store').initialData();fs.writeFileSync(legacy,JSON.stringify(data));const original=fs.readFileSync(legacy,'utf8');
 let s;try{s=await openStore({path:file,legacyPath:legacy});s.data.cases[0].scope='Persisted SQLite scope';s.persist();assert.equal(fs.readFileSync(legacy,'utf8'),original);s.close();s=await openStore({path:file,legacyPath:legacy});assert.equal(s.data.cases[0].scope,'Persisted SQLite scope');assert.throws(()=>s.db.run('INSERT INTO pricing_cases(id,opportunity_id,account,payload) VALUES(?,?,?,?)',['DUP',s.data.cases[0].opportunityId,'x','{}']),/UNIQUE/);assert.throws(()=>s.db.run("UPDATE pricing_versions SET snapshot='changed' WHERE id='VER-2002'"),/immutable/);assert.equal(s.db.exec('SELECT version FROM schema_migrations')[0].values[0][0],1);}
 finally{s?.close();fs.rmSync(dir,{recursive:true,force:true});}
});
test('SQLite persists recipient-scoped notification and read state without a schema change',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'price-notifications-'));const file=path.join(dir,'db.sqlite');let s;
 try{
  s=await openStore({path:file,legacyPath:path.join(dir,'absent.json')});
  s.data.notifications.push({id:'NOT-1',key:'VERSION_SUBMITTED:VER-1:1:u-bu',userId:'u-bu',recipientRole:'BU Head',caseId:'PT-1001',versionId:'VER-1',approvalTaskId:'VER-1:1',createdAt:'2026-10-13T00:00:00.000Z',readAt:null,status:'Unread'});
  s.persist();s.close();s=await openStore({path:file,legacyPath:path.join(dir,'absent.json')});
  assert.equal(s.data.notifications[0].userId,'u-bu');assert.equal(s.data.notifications[0].readAt,null);
  s.data.notifications[0].readAt='2026-10-13T01:00:00.000Z';s.data.notifications[0].status='Read';s.persist();s.close();s=await openStore({path:file,legacyPath:path.join(dir,'absent.json')});
  assert.equal(s.data.notifications[0].readAt,'2026-10-13T01:00:00.000Z');assert.equal(s.data.notifications[0].status,'Read');
  assert.equal(s.db.exec('SELECT version FROM schema_migrations')[0].values[0][0],1);
 }finally{s?.close();fs.rmSync(dir,{recursive:true,force:true});}
});
