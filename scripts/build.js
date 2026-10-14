'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
for(const dir of ['src','public','scripts'])for(const name of fs.readdirSync(path.join(root,dir)).filter(n=>n.endsWith('.js'))){const result=spawnSync(process.execPath,['--check',path.join(root,dir,name)],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);}
const output=path.join(root,'dist');const dataDir=path.join(output,'data');if(fs.existsSync(dataDir)&&fs.readdirSync(dataDir).some(n=>!['Salesforce sythetic data.xlsx','Margin Calculator_new 1.xlsx'].includes(n)))throw Error('dist/data contains runtime data. Preserve it and choose a fresh build output before packaging.');fs.mkdirSync(output,{recursive:true});
for(const name of ['src','public','db','scripts','docs','package.json','package-lock.json','README.md','.env.example'])fs.cpSync(path.join(root,name),path.join(output,name),{recursive:true});
fs.mkdirSync(path.join(output,'data'),{recursive:true});
const references=['Salesforce sythetic data.xlsx','Margin Calculator_new 1.xlsx'];
for(const name of references)fs.copyFileSync(path.join(root,'data',name),path.join(output,'data',name));
const manifest={builtAt:new Date().toISOString(),node:process.version,mode:'LOCAL_SYNTHETIC',productionApproved:false,references:references.map(name=>({file:'data/'+name,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'data',name))).digest('hex')}))};
fs.writeFileSync(path.join(output,'BUILD_MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Local application artifact built in dist, including the two source workbooks. User databases and generated credentials are excluded. Production approval gates remain open.');
