import {useState} from 'react';
import type {EquipmentItem,MaintenanceItem,Project} from './types';
import {referenceRows,searchReferences} from './reference-library.mjs';

const types=['All','Label photo','Manual / document','Warranty','Replacement part','Service receipt','Project document'];
export function HomeReference({equipment,maintenance,projects,openEquipment,openMaintenance,openProject}:{equipment:EquipmentItem[];maintenance:MaintenanceItem[];projects:Project[];openEquipment:(id:string)=>void;openMaintenance:(id:string)=>void;openProject:(id:string)=>void}){
 const [query,setQuery]=useState(''),[type,setType]=useState('All');
 const rows=referenceRows(equipment,maintenance,projects),shown=searchReferences(rows,query,type);
 return <div className="reference-book">
  <div className="page-heading"><div><h1>Home reference book</h1><p>Find model labels, manuals, warranties, receipts, and replacement parts in one place.</p></div></div>
  <div className="toolbar"><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search appliance, part number, receipt…" aria-label="Search home reference"/><select value={type} onChange={e=>setType(e.target.value)} aria-label="Reference type">{types.map(t=><option key={t}>{t}</option>)}</select></div>
  <p className="results-note">{shown.length} reference{shown.length===1?'':'s'} · Stored on this device · Nothing uploaded to GitHub</p>
  {shown.length?<div className="reference-grid">{shown.map(r=>{
   const [,ownerId]=r.id.split(':');
   return <div className="reference-tile panel" key={r.id}>
     {r.file?.mime.startsWith('image/')&&<img src={r.file.dataUrl} alt={r.title} loading="lazy"/>}
     <span className="reference-type">{r.type}</span><strong>{r.title}</strong><small>{r.owner}</small>
     <div className="reference-actions">
       {r.file&&<a className="small-btn" href={r.file.dataUrl} download={r.file.name}>Save file ↧</a>}
       {r.url&&/^https?:\/\//i.test(r.url)&&<a className="small-btn" href={r.url} rel="noopener noreferrer" target="_blank">Product page ↗</a>}
       {r.id.startsWith('equipment-')||r.type==='Warranty'?<button className="small-btn" onClick={()=>openEquipment(ownerId)}>Equipment →</button>
        :r.id.startsWith('project-file:')?<button className="small-btn" onClick={()=>openProject(ownerId)}>Project →</button>
        :<button className="small-btn" onClick={()=>openMaintenance(ownerId)}>Maintenance →</button>}
     </div>
   </div>;
  })}</div>:<section className="panel"><h2>{rows.length?'No matching references':'Your reference book starts with equipment'}</h2><p>Open Equipment to save a label photo or manual. Receipts and replacement parts appear automatically when you record them in Maintenance.</p><button className="button secondary" onClick={()=>openEquipment('')}>Open Equipment</button></section>}
 </div>;
}
