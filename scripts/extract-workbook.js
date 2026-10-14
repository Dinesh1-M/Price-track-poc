'use strict';
const fs=require('node:fs'),path=require('node:path'),{extract}=require('../src/workbook-source');
const root=path.resolve(__dirname,'..'),manifest=extract(path.join(root,'data/Margin Calculator_new 1.xlsx')),dir=path.join(root,'docs/finance');
fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'WORKBOOK_FORMULA_MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
const quote=s=>'"'+String(s??'').replace(/"/g,'""')+'"';fs.writeFileSync(path.join(dir,'WORKBOOK_ALL_FORMULAS.csv'),'sheet,cell,expression,status,source_hash\n'+manifest.formulas.map(f=>[f.sheet,f.cell,f.expression,f.status,manifest.sha256].map(quote).join(',')).join('\n')+'\n');
console.log(manifest.formulaCount+' source formulas extracted; shared formulas expanded. Source workbook unchanged.');
