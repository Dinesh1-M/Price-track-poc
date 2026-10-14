'use strict';
const fs=require('node:fs'),zlib=require('node:zlib'),crypto=require('node:crypto');
function unzip(bytes){
 let end=bytes.length-22;while(end>=Math.max(0,bytes.length-65557)&&bytes.readUInt32LE(end)!==0x06054b50)end--;if(end<0)throw Error('Invalid XLSX ZIP directory.');
 let offset=bytes.readUInt32LE(end+16);const count=bytes.readUInt16LE(end+10),files=new Map();
 for(let i=0;i<count;i++){if(bytes.readUInt32LE(offset)!==0x02014b50)throw Error('Invalid XLSX ZIP entry.');const method=bytes.readUInt16LE(offset+10),length=bytes.readUInt32LE(offset+20),nameLength=bytes.readUInt16LE(offset+28),extra=bytes.readUInt16LE(offset+30),comment=bytes.readUInt16LE(offset+32),local=bytes.readUInt32LE(offset+42),name=bytes.subarray(offset+46,offset+46+nameLength).toString('utf8'),start=local+30+bytes.readUInt16LE(local+26)+bytes.readUInt16LE(local+28);if(length>20000000)throw Error('Workbook ZIP entry too large.');const raw=bytes.subarray(start,start+length);if(method===0||method===8)files.set(name,method===8?zlib.inflateRawSync(raw,{maxOutputLength:20000000}).toString('utf8'):raw.toString('utf8'));offset+=46+nameLength+extra+comment;}
 return files;
}
const decode=s=>String(s||'').replace(/&(?:amp|lt|gt|quot|apos);/g,x=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"}[x]));
const attr=(xml,name)=>decode(xml.match(new RegExp('(?:^|\\s)'+name+'="([^"]*)"'))?.[1]);
const col=s=>[...s].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0);
function letters(n){let out='';while(n>0){n--;out=String.fromCharCode(n%26+65)+out;n=Math.floor(n/26);}return out;}
function translate(formula,from,to){const a=from.match(/^([A-Z]+)(\d+)$/),b=to.match(/^([A-Z]+)(\d+)$/),dx=col(b[1])-col(a[1]),dy=Number(b[2])-Number(a[2]);return formula.split(/("(?:[^"]|"")*")/).map((part,i)=>i%2?part:part.replace(/(?<![A-Za-z0-9_])(\$?)([A-Z]{1,3})(\$?)([1-9]\d*)(?![A-Za-z0-9_])/g,(all,ca,c,ra,r)=>{const nc=ca?col(c):col(c)+dx,nr=ra?Number(r):Number(r)+dy;return nc<1||nr<1?'#REF!':ca+letters(nc)+ra+nr;})).join('');}
function extract(file){
 const bytes=fs.readFileSync(file),files=unzip(bytes),book=files.get('xl/workbook.xml'),relations=files.get('xl/_rels/workbook.xml.rels');const formulas=[],sheets=[];
 for(const match of book.matchAll(/<sheet\b([^>]*)\/?\s*>/g)){
  const name=attr(match[1],'name'),id=attr(match[1],'r:id');let target='';for(const r of relations.matchAll(/<Relationship\b([^>]*)\/?\s*>/g))if(attr(r[1],'Id')===id)target=attr(r[1],'Target');const entry=target.startsWith('/')?target.slice(1):'xl/'+target;const xml=files.get(entry);if(!xml)throw Error('Missing source sheet '+name);const shared=new Map(),pending=[];
  for(const c of xml.replace(/<c\b[^>]*\/>/g,'').matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)){const cell=attr(c[1],'r'),f=c[2].match(/<f\b([^>]*?)(?:\/>|>([\s\S]*?)<\/f>)/);if(!f)continue;const expression=decode(f[2]),sharedId=attr(f[1],'si'),record={sheet:name,cell,rawExpression:expression,expression,sharedId:sharedId||null,status:'EXTRACTED_SOURCE_UNVALIDATED'};if(attr(f[1],'t')==='shared'){if(expression)shared.set(sharedId,{cell,expression});else pending.push(record);}formulas.push(record);}
  for(const f of pending){const parent=shared.get(f.sharedId);f.expression=parent?translate(parent.expression,parent.cell,f.cell):'';if(!parent)f.status='UNRESOLVED_SHARED_FORMULA';}
  sheets.push({name,formulaCount:formulas.filter(f=>f.sheet===name).length});
 }
 return {sha256:crypto.createHash('sha256').update(bytes).digest('hex'),status:'EXTRACTED_SOURCE_UNVALIDATED',sheets,formulaCount:formulas.length,formulas};
}
module.exports={extract,translate};
