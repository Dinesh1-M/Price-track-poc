'use strict';
const crypto=require('node:crypto');
const sessions=new Map(),attempts=new Map();
const key=s=>String(s||'').trim().toLowerCase();
function hashPassword(password){const salt=crypto.randomBytes(16).toString('hex');return salt+':'+crypto.scryptSync(password,salt,64).toString('hex');}
function verifyPassword(password,encoded){try{const [salt,hash]=encoded.split(':');const actual=crypto.scryptSync(String(password),salt,64),expected=Buffer.from(hash,'hex');return expected.length===actual.length&&crypto.timingSafeEqual(actual,expected);}catch{return false;}}
function publicUser(u){return u&&Object.fromEntries(['id','name','loginId','role','account','accounts','opportunityIds','bu','costVisible','commercialAccess','approvalOverride','buWideAccess','enabled','techCoe','authVersion'].filter(k=>u[k]!==undefined).map(k=>[k,u[k]]));}
function tokenHash(s){return crypto.createHash('sha256').update(String(s)).digest('hex');}
function cookie(req){return (req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('pt_session='))?.slice(11);}
function sessionUser(req,data){const token=cookie(req);if(!token)return null;const id=tokenHash(token),session=sessions.get(id);if(!session)return null;const user=data.users.find(u=>u.id===session.userId);if(session.expires<Date.now()||!user||user.enabled===false||user.authVersion!==session.version){sessions.delete(id);return null;}return user;}
function issue(res,user){const token=crypto.randomBytes(32).toString('base64url');sessions.set(tokenHash(token),{userId:user.id,version:user.authVersion,expires:Date.now()+8*3600000});res.setHeader('Set-Cookie',`pt_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800`);}
function logout(req,res){const token=cookie(req);if(token)sessions.delete(tokenHash(token));res.setHeader('Set-Cookie','pt_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');}
function login(req,res,data,body){
 const username=key(body.username),bucket=(req.socket.remoteAddress||'local')+':'+username;
 const state=attempts.get(bucket);if(state&&state.until<Date.now())attempts.delete(bucket);
 if(attempts.get(bucket)?.count>=8)return {status:429,message:'Too many login attempts. Try again in ten minutes.'};
 if(typeof body.password!=='string'||body.password.length>256||username.length>160)return {status:400,message:'Supply a valid login ID and password.'};
 const user=data.users.find(u=>u.enabled!==false&&key(u.loginId)===username);
 // Always do password work even for an unknown account.
 const valid=verifyPassword(body.password,user?.passwordHash||'00000000000000000000000000000000:'+ '0'.repeat(128));
 if(!user||!valid){const previous=attempts.get(bucket);attempts.set(bucket,{count:(previous?.count||0)+1,until:previous?.until||Date.now()+600000});return {status:401,message:'Login ID or password is incorrect.'};}
 attempts.delete(bucket);logout(req,res);issue(res,user);return {user};
}
function externalAuthorized(req,data){const raw=req.headers.authorization||'';return raw.startsWith('Bearer ')&&data.integrationTokenHash&&tokenHash(raw.slice(7))===data.integrationTokenHash;}
module.exports={key,hashPassword,verifyPassword,publicUser,sessionUser,issue,logout,login,tokenHash,externalAuthorized};
