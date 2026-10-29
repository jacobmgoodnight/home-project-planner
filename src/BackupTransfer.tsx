import {useState} from 'react';
import type {ChangeEvent} from 'react';
import type {Database} from './types';
import {readBackup,downloadBackup} from './storage';
import {previewMerge} from './safe-transfer.mjs';
import {validateBackup} from './storage';

const format=(timestamp:number)=>timestamp?new Date(timestamp).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric'}):'Not recorded on this device';

export function BackupTransfer({data,lastEdit,lastExport,onPrepared,onReplace,onMerge}:{data:Database;lastEdit:number;lastExport:number;onPrepared:()=>void;onReplace:(next:Database)=>void;onMerge:(next:Database)=>void}) {
 const [incoming,setIncoming]=useState<Database|null>(null),[fileName,setFileName]=useState('');
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const [shareBusy,setShareBusy]=useState(false);
 const changedSince=lastEdit>lastExport;
 const hasContent=data.projects.length+data.maintenance.length+data.equipment.length>0;
 const preview=incoming?previewMerge(data,incoming):null;
 const snapshot=()=>new File([JSON.stringify(data,null,2)],'home-project-planner-'+new Date().toISOString().slice(0,10)+'.json',{type:'application/json'});
 function download(){
  try{downloadBackup(data);onPrepared();setNotice('Backup download prepared. Verify it was saved in Files or Downloads.');}
  catch(e){setError(e instanceof Error?e.message:'Backup download failed.');}
 }
 async function share(){
  setShareBusy(true);setNotice('');setError('');
  try{
   const file=snapshot();
   if(!navigator.canShare?.({files:[file]})||!navigator.share) {download();return;}
   await navigator.share({files:[file],title:'Home Project Planner backup',text:'Private project and equipment backup. Keep this file secure.'});
   onPrepared();setNotice('Share sheet completed. Confirm the file was saved or received on your other device.');
  }catch(e){if(e instanceof Error&&e.name!=='AbortError')setError('Could not share backup. Use Download backup instead.');}
  finally{setShareBusy(false);}
 }
 async function selectFile(e:ChangeEvent<HTMLInputElement>){
  const file=e.target.files?.[0];e.target.value='';if(!file)return;
  setError('');setNotice('');setIncoming(null);
  try{const parsed=await readBackup(file);if(!validateBackup(parsed))throw new Error('Invalid backup.');setIncoming(parsed);setFileName(file.name);}
  catch(e){setError(e instanceof Error?e.message:'Unable to read backup.');}
 }
 function replace(){
  if(!incoming)return;
  if(!window.confirm('Replace ALL data on this device with '+fileName+'? This deletes any local-only changes. Export this device first.'))return;
  onReplace(incoming);setIncoming(null);setFileName('');setNotice('Backup restored. Changes will be saved on this device.');
 }
 function merge(){
  if(!incoming||!preview||preview.addCount===0)return;
  const message='Import '+preview.addCount+' new record(s) from '+fileName+'? Existing records remain unchanged.'+
   (preview.conflictCount?'\n'+preview.conflictCount+' matching ID(s) differ; those remain local and will NOT be synchronized.':'');
  if(!window.confirm(message))return;
  onMerge(incoming);setIncoming(null);setFileName('');setNotice('New records merged. Existing IDs were preserved. Export a new backup before moving to another device.');
 }
 return <section className="panel backup-transfer">
  <div className="parts-heading"><div><h2>Backup & device transfer</h2><p>Save a private copy or manually move it between devices. Automatic household sync is separately available below.</p></div></div>
  <div className="backup-state">
   <span><strong>{hasContent?(changedSince?'Backup recommended':lastExport?'Export prepared':'No backup recorded'):'Workspace empty'}</strong><small>{changedSince?'This device has changes newer than its last export.':'A backup remains important if you clear browser data or change devices.'}</small></span>
   <span><small>Last export prepared</small><strong>{format(lastExport)}</strong></span>
  </div>
  <div className="transfer-columns">
   <div className="transfer-step"><span className="transfer-number">1</span><h3>Save or send a backup</h3><p>Choose Download to save locally, or Share on iPhone to send it to Files, AirDrop, or another destination.</p>
    <div className="action-line"><button className="button primary" onClick={download}>Download backup</button><button className="button secondary" disabled={shareBusy} onClick={share}>{shareBusy?'Sharing…':'Share / send to phone'}</button></div>
    <small>Includes equipment labels, receipts, projects, and service history. The JSON file contains private data—do not commit it to a public GitHub repository.</small>
   </div>
   <div className="transfer-step"><span className="transfer-number">2</span><h3>Receive on another device</h3><p>Open the same planner URL on the other phone or computer and select the file you transferred.</p>
    <label className="button secondary file-label">Choose received backup<input type="file" accept=".json,application/json" onChange={selectFile}/></label>
    <small>Preview differences before importing. Manual file transfer works without cloud sign-in and does not change your cloud household by itself.</small>
   </div>
  </div>
  {incoming&&preview&&<div className="transfer-preview"><h3>Review import: {fileName}</h3>
   <p>Incoming: {incoming.projects.length} projects, {incoming.maintenance.length} maintenance tasks, {incoming.equipment.length} equipment items.</p>
   <div className="transfer-metrics"><span><strong>{preview.addCount}</strong> new records</span><span><strong>{preview.conflictCount}</strong> differing shared records</span></div>
   {preview.conflictCount>0&&<p className="transfer-warning">Merge skips differing records with the same ID. To fully replace this device with the source device's updates, first back up this device, then choose Replace.</p>}
   <div className="action-line"><button className="button primary" disabled={preview.addCount===0} onClick={merge}>Merge only new records</button><button className="button danger-outline" onClick={replace}>Replace all local data</button><button className="button secondary" onClick={()=>setIncoming(null)}>Cancel</button></div>
  </div>}
  {error&&<p className="alert error" role="alert">{error}</p>}
  {notice&&<p className="maintenance-notice" role="status">{notice}</p>}
  <details className="sync-details"><summary>Manual transfer versus household sync</summary><p>Manual JSON backups are private exports you explicitly download, share, import or merge. The optional household sync section below uses an authenticated Supabase household and checks for changes while the app is open. Signing in does not automatically upload records. When two devices change independently, sync pauses and asks you to review the conflicting copies.</p></details>
 </section>;
}
