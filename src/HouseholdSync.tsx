import {useCallback,useEffect,useRef,useState} from 'react';
import type {Database} from './types';
import {validateBackup} from './storage';
import {cloudSettings,configureCloud,forgetCloud,getCloudSession,getSession,signInCloud,signUpCloud,signOutCloud,
 listHomes,createHome,createInvite,joinHome,listMembers,removeMember,fetchSnapshot,uploadSnapshot,snapshotHash,readAnchor,setAnchor,bindLocalHome,localBoundToHome} from './cloud-client';
import type {HomeLink,CloudSnapshot,MemberInfo} from './cloud-client';

export function HouseholdSync({data,onReplace}:{data:Database;onReplace:(snapshot:Database)=>void}){
 const [configured,setConfigured]=useState(!!cloudSettings());
 const [url,setUrl]=useState(''),[key,setKey]=useState('');
 const [email,setEmail]=useState(''),[password,setPassword]=useState('');
 const [user,setUser]=useState(getCloudSession()?.user.email||'');
 const [homes,setHomes]=useState<HomeLink[]>([]);
 const [members,setMembers]=useState<MemberInfo[]>([]);
 const [home,setHome]=useState(()=>{try{return localStorage.getItem('hpp-selected-home')||'';}catch{return '';}});
 const [houseName,setHouseName]=useState('Our home'),[invite,setInvite]=useState(''),[inviteCode,setInviteCode]=useState('');
 const [status,setStatus]=useState(''),[busy,setBusy]=useState(false),[conflict,setConflict]=useState(false);
 const [snapshot,setSnapshot]=useState<CloudSnapshot|null>(null);
 const [lastSynced,setLastSynced]=useState('');
 const [enabled,setEnabled]=useState(()=>{try{return localStorage.getItem('hpp-auto-sync')==='yes';}catch{return false;}});
 const stateRef=useRef(data);stateRef.current=data;
 const working=useRef(false);
 const ready=!!configured&&!!user&&!!home;
 const refreshHomes=useCallback(async()=>{
  const s=await getSession();if(!s){setUser('');setHomes([]);return;}
  setUser(s.user.email||s.user.id);const rows=await listHomes();setHomes(rows);
  if(rows.length&&(!home||!rows.some(h=>h.household_id===home))){setHome(rows[0].household_id);localStorage.setItem('hpp-selected-home',rows[0].household_id);}
 },[home]);
 useEffect(()=>{if(configured)void refreshHomes().catch(e=>setStatus(e instanceof Error?e.message:'Cannot connect to cloud.'));},[configured,refreshHomes]);
 const refresh=useCallback(async()=>{
  if(!ready)return;
  const remote=await fetchSnapshot(home);setSnapshot(remote);
  return remote;
 },[home,ready]);
 const synchronize=useCallback(async(isAutomatic=false)=>{
  if(!ready||working.current||!navigator.onLine)return;
  working.current=true;if(!isAutomatic)setBusy(true);
  try{
   if(!localBoundToHome(home)){setStatus('This device has not been linked to this household. Review and import the shared copy, or explicitly initialize a new household.');return;}
   const remote=await fetchSnapshot(home),local=stateRef.current,anchor=readAnchor(home);
   setSnapshot(remote);setConflict(false);
   const localHash=await snapshotHash(local);
   if(!anchor){
    if(!isAutomatic)setStatus(remote.document?'Cloud contains a home already. Choose Review cloud and restore or export this device first.':'New household is empty. Choose Upload this device to initialize it.');
    return;
   }
   if(remote.revision===anchor.revision&&localHash===anchor.hash){setLastSynced(new Date().toLocaleString());if(!isAutomatic)setStatus('Everything is up to date.');return;}
   if(remote.revision===anchor.revision&&localHash!==anchor.hash){
    const version=await uploadSnapshot(home,remote.revision,local);
    setAnchor(home,version,localHash);setLastSynced(new Date().toLocaleString());
    if(!isAutomatic)setStatus('Changes uploaded securely.');return;
   }
   if(remote.revision>anchor.revision&&localHash===anchor.hash){
    if(!remote.document||!validateBackup(remote.document))throw new Error('Cloud data failed validation. Your local records are unchanged.');
    onReplace(remote.document);bindLocalHome(home);setAnchor(home,remote.revision,await snapshotHash(remote.document));
    setLastSynced(new Date().toLocaleString());if(!isAutomatic)setStatus('Cloud changes downloaded.');return;
   }
   setConflict(true);setStatus('Both this device and the cloud have changed. Nothing was overwritten. Export a backup and review the versions below.');
  }catch(e){setStatus(e instanceof Error?e.message:'Sync could not complete. Local data is untouched.');}
  finally{working.current=false;if(!isAutomatic)setBusy(false);}
 },[home,ready,onReplace]);
 useEffect(()=>{
  if(!enabled||!ready)return;
  const check=()=>{if(document.visibilityState==='visible'&&navigator.onLine)void synchronize(true);};
  const interval=window.setInterval(check,60000);
  window.addEventListener('online',check);document.addEventListener('visibilitychange',check);
  check();
  return()=>{window.clearInterval(interval);window.removeEventListener('online',check);document.removeEventListener('visibilitychange',check);};
 },[enabled,ready,synchronize]);
 async function run(fn:()=>Promise<unknown>){setBusy(true);setStatus('');try{await fn();}catch(e){setStatus(e instanceof Error?e.message:'Cloud action failed.');}finally{setBusy(false);}}
 function configure(){
  try{configureCloud(url,key);setConfigured(true);setStatus('Backend configured on this browser. Sign in to enable sharing.');}
  catch(e){setStatus(e instanceof Error?e.message:'Invalid cloud settings.');}
 }
 async function signin(){await run(async()=>{
  await signInCloud(email.trim(),password);setPassword('');await refreshHomes();setStatus('Signed in. Select your household.');
 });}
 async function signup(){await run(async()=>{await signUpCloud(email.trim(),password);setStatus('Account created. Check your email if confirmation is required, then sign in.');});}
 async function create(){await run(async()=>{
  const id=await createHome(houseName);await refreshHomes();setHome(id);localStorage.setItem('hpp-selected-home',id);
  setStatus('Household created. Review and upload your local data to begin syncing.');
 });}
 async function join(){await run(async()=>{
  const id=await joinHome(inviteCode.trim());await refreshHomes();setHome(id);localStorage.setItem('hpp-selected-home',id);setInviteCode('');
  setStatus('Joined the household. Review its data before enabling synchronization.');
 });}
 async function generateInvite(){await run(async()=>{
  const code=await createInvite(home);setInvite(code);setStatus('One-use invite generated, valid for 7 days. Share the code privately.');
 });}
 async function loadMembers(){await run(async()=>{setMembers(await listMembers(home));});}
 async function revokeMember(member:MemberInfo){
  if(!window.confirm('Remove '+member.member_email+' from this household? This prevents future cloud access but cannot erase records already copied to their device.'))return;
  await run(async()=>{await removeMember(home,member.member_user_id);setMembers(await listMembers(home));setStatus('Member access revoked for future cloud requests.');});
 }
 async function initializeUpload(){await run(async()=>{
  if(!home)return;
  const remote=await refresh();if(!remote||remote.document!==null){setStatus('Cloud already contains records. Review the cloud copy first.');return;}
  if(!window.confirm('Upload this device as the household starting copy? Only household members will have access. Export a local backup first.'))return;
  const local=stateRef.current,hash=await snapshotHash(local),revision=await uploadSnapshot(home,remote.revision,local);
  bindLocalHome(home);setAnchor(home,revision,hash);setStatus('Cloud initialized. Enable automatic sync to use it on both devices.');
 });}
 async function useCloud(){await run(async()=>{
  const remote=await refresh();if(!remote?.document||!validateBackup(remote.document)){setStatus('No valid cloud copy is available.');return;}
  if(!window.confirm('Replace all local data on this device with this household cloud copy? Export a backup first.'))return;
  onReplace(remote.document);setAnchor(home,remote.revision,await snapshotHash(remote.document));
  setConflict(false);setStatus('Cloud copy restored; ready to sync.');
 });}
 async function overrideCloud(){await run(async()=>{
  const remote=await refresh();if(!remote)return;
  if(!window.confirm('REPLACE the shared household cloud copy with THIS device’s data? Other members may lose newer edits. Export cloud and local backups first.'))return;
  const local=stateRef.current,hash=await snapshotHash(local);
  const revision=await uploadSnapshot(home,remote.revision,local);
  bindLocalHome(home);setAnchor(home,revision,hash);setConflict(false);setStatus('Shared cloud updated to this device’s copy.');
 });}
 function toggle(){
  const next=!enabled;
  if(next&&!localBoundToHome(home)){setStatus('Connect this device to the household first, using Review cloud and Choose cloud copy.');return;}
  setEnabled(next);localStorage.setItem('hpp-auto-sync',next?'yes':'no');
  setStatus(next?'Auto-sync enabled for this browser while the app is open or reconnects.':'Auto-sync paused; local records are still saved.');
 }
 return <section className="panel household-sync">
  <div className="parts-heading"><div><h2>Optional household sync</h2><p>One private shared household across computer and phone, with offline editing and conflict checks.</p></div>
   <span className="sync-health">{ready?(enabled?'Auto-sync on':'Connected · manual sync'):'Not connected'}</span></div>
  {!configured?<div className="cloud-config"><p>A dedicated Supabase project is required. Existing local projects stay untouched until you connect it. Never paste a secret/service-role key.</p>
   <details><summary>Configure dedicated Supabase backend</summary>
    <label className="field"><span>Project URL</span><input placeholder="https://project-ref.supabase.co" value={url} onChange={e=>setUrl(e.target.value)}/></label>
    <label className="field"><span>Publishable key (sb_publishable_…)</span><input value={key} onChange={e=>setKey(e.target.value)} placeholder="sb_publishable_…" autoComplete="off"/></label>
    <button className="button secondary" onClick={configure}>Save cloud connection</button>
    <p className="subtle">The Home Project Planner SQL schema and row-level security rules must already be installed in this dedicated project.</p>
   </details></div>:
   !user?<div className="cloud-auth"><p>Use the same account on your computer and phone. Email confirmation may be required; existing browser data remains private and offline.</p>
    <div className="form-grid"><label className="field"><span>Email</span><input type="email" value={email} autoComplete="username" onChange={e=>setEmail(e.target.value)}/></label>
    <label className="field"><span>Password</span><input type="password" value={password} autoComplete="current-password" onChange={e=>setPassword(e.target.value)}/></label></div>
    <div className="action-line"><button className="button primary" disabled={busy||!email||!password} onClick={signin}>Sign in</button><button className="button secondary" disabled={busy||!email||password.length<10} onClick={signup}>Create account</button><button className="small-btn" onClick={()=>{forgetCloud();setConfigured(false);}}>Change backend</button></div>
   </div>:
   <div className="cloud-auth">
    <p className="subtle">Signed in: {user} <button className="small-btn" onClick={()=>void run(async()=>{await signOutCloud();setUser('');setHomes([]);setEnabled(false);localStorage.setItem('hpp-auto-sync','no');})}>Sign out</button></p>
    {homes.length?<><label className="field"><span>Household</span><select value={home} onChange={e=>{setEnabled(false);localStorage.setItem('hpp-auto-sync','no');setHome(e.target.value);localStorage.setItem('hpp-selected-home',e.target.value);setStatus('Household changed. Automatic sync is paused; review this household before enabling it.');setSnapshot(null);}}>{homes.map(h=><option key={h.household_id} value={h.household_id}>{h.name} ({h.role})</option>)}</select></label>
     <div className="action-line"><button className="button primary" disabled={busy} onClick={()=>void synchronize(false)}>Sync now</button><button className="button secondary" disabled={busy||!ready} onClick={toggle}>{enabled?'Pause automatic sync':'Enable automatic sync'}</button><button className="small-btn" disabled={busy} onClick={()=>void run(async()=>{await refresh();setStatus('Cloud version inspected.');})}>Review cloud</button></div>
     {lastSynced&&<p className="subtle">Last successful sync: {lastSynced}</p>}
     {snapshot&&<div className="cloud-review"><p>Cloud revision {snapshot.revision} · {snapshot.document?'Contains saved home data':'Empty household'} · updated {new Date(snapshot.updated_at).toLocaleString()}</p>
       <div className="action-line">{!snapshot.document&&<button className="button secondary" disabled={busy} onClick={initializeUpload}>Upload this device as starting copy</button>}
       {!!snapshot.document&&<button className="button secondary" disabled={busy} onClick={useCloud}>Use cloud copy on this device</button>}
       {!!snapshot.document&&<button className="button danger-outline" disabled={busy} onClick={overrideCloud}>Replace shared cloud with this device</button>}</div>
       {conflict&&<p className="transfer-warning">Conflict detected. Automatic synchronization is paused for this version until you choose which copy to keep. Export a backup before resolving.</p>}
     </div>}
     <details className="cloud-sharing"><summary>Household sharing and invitations</summary>
       {homes.find(h=>h.household_id===home)?.role==='owner'&&<><p className="subtle">Share one-use invite codes privately with other adults. They must create an account before joining.</p><button className="button secondary" disabled={busy} onClick={generateInvite}>Generate 7-day invite code</button>{invite&&<div className="cloud-invite"><code>{invite}</code><button className="small-btn" onClick={()=>void navigator.clipboard.writeText(invite).then(()=>setStatus('Invite code copied.'))}>Copy code</button></div>}
      <div className="cloud-members"><button className="small-btn" disabled={busy} onClick={loadMembers}>View household members</button>{members.map(m=><div key={m.member_user_id}><span>{m.member_email} ({m.member_role})</span>{m.member_role!=='owner'&&<button className="small-btn danger-text" disabled={busy} onClick={()=>revokeMember(m)}>Remove access</button>}</div>)}</div></>}
       <p className="subtle">Already have a code from another household owner?</p><input aria-label="Invite code" placeholder="Paste 48-character invitation code" value={inviteCode} onChange={e=>setInviteCode(e.target.value)}/><button className="button secondary" disabled={busy||!inviteCode.trim()} onClick={join}>Join with code</button>
     </details>
    </>:<div className="cloud-first"><h3>Start a private household</h3><input aria-label="Household name" value={houseName} onChange={e=>setHouseName(e.target.value)} maxLength={100}/><button className="button primary" disabled={busy||!houseName.trim()} onClick={create}>Create household</button>
      <h3>Or join an existing home</h3><input aria-label="Invitation code" placeholder="Private invitation code" value={inviteCode} onChange={e=>setInviteCode(e.target.value)}/><button className="button secondary" disabled={busy||!inviteCode} onClick={join}>Join household</button>
     </div>}
   </div>}
  {status&&<p role="status" className="maintenance-notice">{status}</p>}
  <p className="subtle cloud-footnote">Local-first: offline changes remain on this device. Auto-sync checks only while the app is open or reconnects. Cloud sync never silently overwrites conflicting edits; backups and manual transfer remain available below.</p>
 </section>;
}
