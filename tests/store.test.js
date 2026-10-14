'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const {initialData}=require('../src/store');
test('seed data is synthetic and contains core demo entities',()=>{const d=initialData();assert.ok(d.users.some(u=>u.role==='Finance'));assert.ok(d.cases.length>=2);assert.ok(d.rates.length>=3);assert.ok(d.pendingDecisions.length>=10);assert.ok(d.cases.some(c=>c.versions.some(v=>v.status==='Rejected')));assert.ok(d.cases.some(c=>c.versions.some(v=>v.status==='Pending Approval')));});
test('configuration explicitly labels finance formula as unapproved',()=>{assert.equal(initialData().config.formulaApproved,false);assert.equal(initialData().config.demoMode,true);});
