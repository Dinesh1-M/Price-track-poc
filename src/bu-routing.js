'use strict';
const crypto=require('node:crypto');
const HEADS=[['R&M','namratta pandya'],['CPG','Ashish gupta'],['Tech 1','Anil damodaran'],['Tech 2','kiran nandavarappu'],['MMM','mallesh reddy'],['HLS-A',null],['HLS-CI',null],['RAI',null]];
function initialize(data){
 if(!data.config.buHeads)data.config.buHeads=HEADS.map(([bu,name])=>({bu,userId:name?'bu-head-'+crypto.createHash('sha256').update(bu).digest('hex').slice(0,12):null}));
 for(const [bu,name] of HEADS){if(!name)continue;const mapping=data.config.buHeads.find(m=>m.bu===bu);if(mapping?.userId&&!data.users.some(u=>u.id===mapping.userId))data.users.push({id:mapping.userId,name,loginId:name,role:'BU Head',bu,enabled:true,costVisible:false});}
 data.config.buGroups=data.config.buGroups||{RCM:['R&M','CPG'],TMT:['Tech 1','Tech 2']};
 data.config.sourceBuMappings=data.config.sourceBuMappings||[];
}
function resolve(source,data){const mapping=(data.config.sourceBuMappings||[]).find(m=>m.vertical===source.vertical&&(!m.subVertical||m.subVertical===source.subVertical));if(mapping)return mapping.bu;return data.config.buHeads.some(m=>m.bu.toLowerCase()===String(source.subVertical).toLowerCase())?data.config.buHeads.find(m=>m.bu.toLowerCase()===String(source.subVertical).toLowerCase()).bu:data.config.buHeads.find(m=>m.bu.toLowerCase()===String(source.vertical).toLowerCase())?.bu||'';}
function choices(vertical,config){return config.buGroups?.[vertical]||config.buHeads.map(m=>m.bu);}
function head(c,data){const id=data.config.buHeads?.find(m=>m.bu===c.bu)?.userId;return data.users.find(u=>u.id===id&&u.role==='BU Head'&&u.enabled!==false);}
module.exports={HEADS,initialize,resolve,head,choices};
