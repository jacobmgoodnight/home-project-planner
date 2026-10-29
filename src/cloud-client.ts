import type {Database} from './types';

export type HomeLink={household_id:string;role:'owner'|'member';name?:string};
export type CloudSnapshot={household_id:string;revision:number;document:Database|null;updated_at:string};
type Session={access_token:string;refresh_token:string;expires_at:number;user:{id:string;email?:string}};
type CloudSettings={url:string;key:string};

const CONF='hpp-supabase-config', SESSION='hpp-supabase-session';
function read<T>(key:string):T|null{try{return JSON.parse(localStorage.getItem(key)||'null') as T;}catch{return null;}}
function write(key:string,value:unknown){localStorage.setItem(key,JSON.stringify(value));}
export function cloudSettings():CloudSettings|null{
 const s=read<CloudSettings>(CONF);
 if(!s||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(s.url)||!s.key.startsWith('sb_publishable_'))return null;
 return s;
}
export function configureCloud(url:string,key:string){
 const normalized=url.trim().replace(/\/+$/,'');
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(normalized))throw new Error('Enter a valid HTTPS Supabase project URL.');
 if(!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key.trim()))throw new Error('Use the publishable key, never a secret or service-role key.');
 write(CONF,{url:normalized,key:key.trim()});
 localStorage.removeItem(SESSION);
}
export function forgetCloud(){localStorage.removeItem(CONF);localStorage.removeItem(SESSION);localStorage.removeItem('hpp-cloud-bound-home');}
export function bindLocalHome(homeId:string){
 const user=getCloudSession()?.user.id,cfg=cloudSettings();
 if(!user||!cfg)throw new Error('Sign in before connecting a household.');
 write('hpp-cloud-bound-home',{homeId,user,project:cfg.url});
}
export function localBoundToHome(homeId:string){
 const existing=read<{homeId:string;user:string;project:string}>('hpp-cloud-bound-home');
 const user=getCloudSession()?.user.id,cfg=cloudSettings();
 return !!existing&&!!user&&!!cfg&&existing.homeId===homeId&&existing.user===user&&existing.project===cfg.url;
}

export function getCloudSession(){return read<Session>(SESSION);}
async function api(path:string,options:{method?:string;body?:unknown;secure?:boolean}={}){
 const cfg=cloudSettings();if(!cfg)throw new Error('Cloud backend has not been configured.');
 let token='';
 if(options.secure){const s=await getSession();if(!s)throw new Error('Sign in to continue.');token=s.access_token;}
 const res=await fetch(cfg.url+path,{method:options.method||'GET',headers:{
 'apikey':cfg.key,'Content-Type':'application/json',...(token?{'Authorization':'Bearer '+token}:{})
 },body:options.body===undefined?undefined:JSON.stringify(options.body)});
 const content=await res.text();
 let parsed:unknown=null;try{parsed=content?JSON.parse(content):null;}catch{parsed=content;}
 if(!res.ok){const e=parsed as {message?:string;msg?:string;error_description?:string}|null;
  throw new Error(e?.message||e?.error_description||e?.msg||('Cloud request failed ('+res.status+').'));}
 return parsed;
}
function toSession(data:unknown){
 const result=data as {access_token?:string;refresh_token?:string;expires_in?:number;user?:{id:string;email?:string}};
 if(!result.access_token||!result.refresh_token||!result.user?.id)throw new Error('Sign-in confirmation may be required. Check your email.');
 const s:Session={access_token:result.access_token,refresh_token:result.refresh_token,
  expires_at:Date.now()+((result.expires_in||3600)-60)*1000,user:result.user};
 write(SESSION,s);return s;
}
export async function signUpCloud(email:string,password:string){
 await api('/auth/v1/signup',{method:'POST',body:{email,password,options:{email_redirect_to:location.origin+location.pathname}}});
}
export async function signInCloud(email:string,password:string){
 const data=await api('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});
 return toSession(data);
}
export async function getSession():Promise<Session|null>{
 const s=getCloudSession();if(!s)return null;
 if(Date.now()<s.expires_at)return s;
 try {
  const data=await api('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:s.refresh_token}});
  return toSession(data);
 }catch{localStorage.removeItem(SESSION);return null;}
}
export async function signOutCloud(){
 try{await api('/auth/v1/logout',{method:'POST',secure:true});}catch{}
 localStorage.removeItem(SESSION);
}
export async function listHomes():Promise<HomeLink[]>{
 const s=await getSession();if(!s)return [];
 const rows=await api('/rest/v1/hpp_members?select=household_id,role&user_id=eq.'+encodeURIComponent(s.user.id),{secure:true}) as HomeLink[];
 const names=await api('/rest/v1/hpp_households?select=id,name',{secure:true}) as {id:string;name:string}[];
 return rows.map(r=>({...r,name:names.find(n=>n.id===r.household_id)?.name||'My home'}));
}
export type MemberInfo={member_user_id:string;member_email:string;member_role:'owner'|'member'};
export async function listMembers(homeId:string){
 return await api('/rest/v1/rpc/hpp_list_members',{method:'POST',secure:true,body:{p_household:homeId}}) as MemberInfo[];
}
export async function removeMember(homeId:string,userId:string){
 await api('/rest/v1/rpc/hpp_remove_member',{method:'POST',secure:true,body:{p_household:homeId,p_user:userId}});
}
export async function createHome(name:string){return await api('/rest/v1/rpc/hpp_create_household',{method:'POST',secure:true,body:{p_name:name}}) as string;}
function hashBytes(bytes:ArrayBuffer){return Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,'0')).join('');}
export async function hashInvite(code:string){return hashBytes(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code.trim())));}
export async function createInvite(homeId:string){
 const b=new Uint8Array(24);crypto.getRandomValues(b);
 const code=Array.from(b).map(n=>n.toString(16).padStart(2,'0')).join('');
 await api('/rest/v1/rpc/hpp_make_invite',{method:'POST',secure:true,body:{p_household:homeId,p_hash:await hashInvite(code)}});
 return code;
}
export async function joinHome(code:string){
 if(!/^[a-f0-9]{48}$/i.test(code.trim()))throw new Error('Paste the complete household invite code.');
 return await api('/rest/v1/rpc/hpp_join_household',{method:'POST',secure:true,body:{p_hash:await hashInvite(code)}}) as string;
}
export async function fetchSnapshot(homeId:string){
 const rows=await api('/rest/v1/hpp_snapshots?select=household_id,revision,document,updated_at&household_id=eq.'+encodeURIComponent(homeId),{secure:true}) as CloudSnapshot[];
 if(rows.length!==1)throw new Error('The household is unavailable or access was denied.');
 return rows[0];
}
export async function uploadSnapshot(homeId:string,revision:number,document:Database){
 const result=await api('/rest/v1/rpc/hpp_cas_snapshot',{method:'POST',secure:true,body:{p_household:homeId,p_revision:revision,p_document:document}});
 if(!Number.isSafeInteger(result))throw new Error('Cloud version changed; refresh and resolve the conflict before uploading.');
 return result as number;
}
export async function snapshotHash(document:Database){
 return hashBytes(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(document))));
}
type SyncAnchor={revision:number;hash:string};
export function readAnchor(homeId:string):SyncAnchor|null {return read<SyncAnchor>('hpp-cloud-anchor-'+homeId);}
export function setAnchor(homeId:string,revision:number,hash:string){write('hpp-cloud-anchor-'+homeId,{revision,hash});}
