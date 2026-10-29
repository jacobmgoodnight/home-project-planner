import { useState } from 'react';
import type { ChangeEvent } from 'react';
import type { Attachment,EquipmentItem,MaintenanceItem } from './types';
import { newEquipment,uid,today } from './types';
import { attachmentFromFile } from './storage';
import { findEquipment,expiringWarranties } from './home-insights.mjs';

interface Props {
 items:EquipmentItem[];
 maintenance:MaintenanceItem[];
 change:(fn:(current:EquipmentItem[])=>EquipmentItem[])=>void;
 unlink:(id:string)=>void;
 onBack:()=>void;
 initialSelected?:string;
}
const fields=[
 ['name','Equipment name','e.g. Kitchen refrigerator'],
 ['location','Location','e.g. Kitchen'],
 ['manufacturer','Manufacturer','e.g. GE'],
 ['model','Model number','Copy from equipment label'],
 ['serial','Serial number','Copy from equipment label'],
] as const;

export function EquipmentInventory({items,maintenance,change,unlink,onBack,initialSelected}:Props) {
 const [selected,setSelected]=useState<string|null>(initialSelected||null);
 const [notice,setNotice]=useState('');
 const [uploading,setUploading]=useState(false);
 const [docsUploading,setDocsUploading]=useState(false);
 const [qrOpen,setQrOpen]=useState(false);
 const [query,setQuery]=useState('');
 const [filter,setFilter]=useState<'all'|'warranty'>('all');
 const item=items.find(i=>i.id===selected);
 const warranties=expiringWarranties(items,today(),90);
 const warningIds=new Set(warranties.map(w=>w.item.id));
 const shown=findEquipment(items,maintenance,query).filter(e=>filter==='all'||warningIds.has(e.id));
 const patch=(id:string,update:Partial<EquipmentItem>)=>change(rows=>rows.map(r=>r.id===id?{...r,...update}:r));
 function add(){const equipment={...newEquipment(),name:'New equipment'};change(rows=>[...rows,equipment]);setSelected(equipment.id);}
 function remove(){if(!item)return;const count=maintenance.filter(m=>m.equipmentId===item.id).length;
  if(!window.confirm('Delete '+item.name+' and its label photos? '+(count?'This will unlink '+count+' maintenance task(s), but keep their history.':'')+' Export a backup first if needed.'))return;
  unlink(item.id);change(rows=>rows.filter(r=>r.id!==item.id));setSelected(null);
 }
 async function photosChanged(e:ChangeEvent<HTMLInputElement>) {
  if(!item)return;
  const files=Array.from(e.target.files||[]);
  e.target.value='';
  if(!files.length)return;
  if(files.length+item.photos.length>5){setNotice('Up to 5 label photos per equipment item.');return;}
  setUploading(true);setNotice('');
  try {
   const result:Attachment[]=[];
   for(const file of files){
    if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Use JPG, PNG or WebP label photos.');
    const img=await attachmentFromFile(file);
    result.push({id:uid(),name:file.name,mime:img.mime,dataUrl:img.dataUrl,date:today()});
   }
   change(rows=>rows.map(r=>r.id===item.id?{...r,photos:[...r.photos,...result]}:r));
   setNotice('Label photo saved locally and included in JSON backups.');
  }catch(err){setNotice(err instanceof Error?err.message:'Could not add photo.');}
  finally{setUploading(false);}
 }
 async function documentsChanged(e:ChangeEvent<HTMLInputElement>){
  if(!item)return;
  const selection=Array.from(e.target.files||[]);e.target.value='';
  if(!selection.length)return;
  if((item.documents||[]).length+selection.length>12){setNotice('Keep up to 12 manuals or warranty documents per equipment item.');return;}
  setDocsUploading(true);setNotice('');
  try{
   const converted:Attachment[]=[];
   for(const file of selection){
    const result=await attachmentFromFile(file);
    converted.push({id:uid(),name:file.name,mime:result.mime,dataUrl:result.dataUrl,date:today()});
   }
   change(rows=>rows.map(r=>r.id===item.id?{...r,documents:[...(r.documents||[]),...converted]}:r));
   setNotice('Manual or document saved in this browser and included in backups.');
  }catch(err){setNotice(err instanceof Error?err.message:'Could not save document.');}
  finally{setDocsUploading(false);}
 }
 if(item){
  const related=maintenance.filter(m=>m.equipmentId===item.id);
  return <div className="equipment-page">
   <button className="back-link" onClick={()=>setSelected(null)}>← All equipment</button>
   <div className="page-heading"><div><h1>{item.name||'Equipment details'}</h1><p>Keep appliance labels and warranty details together.</p></div><div className="action-line"><button className="button danger-outline" onClick={remove}>Delete equipment</button></div></div>
   {notice&&<p role="status" className="maintenance-notice">{notice}</p>}
   <div className="two-column"><section className="panel"><h2>Equipment details</h2><div className="form-grid">
    {fields.map(([key,label,hint])=><label className="field" key={key}><span>{label}</span><input placeholder={hint} value={item[key]} onChange={e=>patch(item.id,{[key]:e.target.value})}/></label>)}
    <label className="field"><span>Purchase date (optional)</span><input type="date" value={item.purchasedOn} onChange={e=>patch(item.id,{purchasedOn:e.target.value})}/></label>
    <label className="field"><span>Warranty until (optional)</span><input type="date" value={item.warrantyUntil} onChange={e=>patch(item.id,{warrantyUntil:e.target.value})}/></label>
    <label className="field"><span>Notes</span><textarea rows={4} value={item.notes} onChange={e=>patch(item.id,{notes:e.target.value})}/></label>
   </div></section><div className="stack">
    <section className="panel"><h2>Label photos</h2><p className="subtle">Photograph the model/serial label once, then read it when ordering parts. Stored only in this browser.</p>
     <label className="button secondary file-label"> {uploading?'Saving photos…':'+ Add label photo'} <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={uploading||item.photos.length>=5} onChange={photosChanged}/></label>
     <div className="equipment-photos">{item.photos.map(photo=><div className="equipment-photo" key={photo.id}><a href={photo.dataUrl} download={photo.name} aria-label={'Save '+photo.name}><img src={photo.dataUrl} alt={'Equipment label: '+photo.name}/></a><div><small>{photo.name}</small><button type="button" className="small-btn" onClick={()=>{if(window.confirm('Remove this photo?'))patch(item.id,{photos:item.photos.filter(p=>p.id!==photo.id)});}}>Remove</button></div></div>)}</div>
     {!item.photos.length&&<p className="subtle">No label photos yet. Use your phone camera or photo library.</p>}
    </section>
    <section className="panel"><h2>Manuals & warranty files</h2><p className="subtle">Save a PDF or photo of a manual or warranty document. Everything stays on this device.</p>
     <label className="button secondary file-label">{docsUploading?'Reading…':'+ Add manual / document'}<input type="file" multiple disabled={docsUploading||(item.documents||[]).length>=12} accept=".pdf,image/jpeg,image/png,image/webp" onChange={documentsChanged}/></label>
     {(item.documents||[]).map(doc=><div className="equipment-doc-row" key={doc.id}><a href={doc.dataUrl} download={doc.name}>{doc.name} ↧</a><button className="small-btn" onClick={()=>patch(item.id,{documents:(item.documents||[]).filter(d=>d.id!==doc.id)})}>Remove</button></div>)}
     {!(item.documents||[]).length&&<p className="subtle">No manuals or warranty files saved yet.</p>}
    </section>
    <section className="panel equipment-qr"><h2>QR equipment label</h2><p className="subtle">Scan this label to open the same equipment record. The receiving device must already have this home’s data (through cloud sync or a backup).</p>
     {!qrOpen?<button className="button secondary" onClick={()=>setQrOpen(true)}>Create printable QR label</button>:
      <div id="equipment-qr-print"><strong>{item.name||'Equipment'}</strong><small>{[item.manufacturer,item.model].filter(Boolean).join(' · ')}</small>
       <img alt="QR code linking to this equipment record" loading="lazy" referrerPolicy="no-referrer" src={'https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data='+encodeURIComponent(location.origin+location.pathname+'?equipment='+encodeURIComponent(item.id))}/>
       <div className="action-line"><button className="button secondary" onClick={()=>window.print()}>Print label</button><button className="small-btn" onClick={()=>setQrOpen(false)}>Hide</button></div>
       <p className="subtle">QR generation uses goQR’s external image service. Only this app’s address and an opaque equipment ID are sent—never serial numbers, photos or your notes.</p>
      </div>}
    </section>
    <section className="panel"><h2>Linked maintenance</h2><p className="subtle">{related.length?related.map(m=>m.title).join(' · '):'Open a maintenance task and choose this equipment to link it.'}</p></section>
   </div></div>
  </div>;
 }
 return <div className="equipment-page">
  <button className="back-link" onClick={onBack}>← Maintenance</button>
  <div className="page-heading"><div><h1>Equipment at home</h1><p>One quick reference for models, serial labels, locations and warranties.</p></div><button className="button primary" onClick={add}>+ Add equipment</button></div>
  {initialSelected&&!items.some(e=>e.id===initialSelected)&&<div className="maintenance-notice">This QR label links to an equipment record that isn't stored on this device. Sign into the same shared household or import a backup, then rescan.</div>}
  <p className="subtle">Nothing has been assumed about your appliances. Search by model, serial, location or linked part number.</p>
  <div className="equipment-search"><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search equipment, model, serial, part SKU…" aria-label="Search equipment and linked replacement parts"/><div className="filter-chips"><button className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>All ({items.length})</button><button className={filter==='warranty'?'active':''} onClick={()=>setFilter('warranty')}>Warranty alerts ({warranties.length})</button></div></div>
  {warranties.length>0&&<section className="panel warranty-alert-panel"><h2>Warranty alerts</h2><p className="subtle">Expired or expiring within 90 days, based on your saved dates.</p><div className="warranty-alert-list">{warranties.map(w=><button key={w.item.id} onClick={()=>setSelected(w.item.id)}><strong>{w.item.name||'Equipment'}</strong><span>{w.daysRemaining<0?'Expired '+Math.abs(w.daysRemaining)+' days ago':w.daysRemaining===0?'Expires today':'Expires in '+w.daysRemaining+' days'} · {w.item.warrantyUntil}</span></button>)}</div></section>}
  {shown.length?<div className="equipment-grid">{shown.map(e=><button key={e.id} className="panel equipment-tile" onClick={()=>{setNotice('');setSelected(e.id);}}>
    <span className="equipment-symbol">▣</span><strong>{e.name||'Unnamed equipment'}</strong><small>{[e.manufacturer,e.model].filter(Boolean).join(' · ')||'Model not recorded'}</small><small>{e.location||'Location not recorded'} · {e.photos.length} label photo(s)</small>
    <span className="equipment-open">{warningIds.has(e.id)?'⚠ Warranty attention · ':''}Details →</span>
  </button>)}</div>:items.length?<section className="panel"><h2>No matches found</h2><p>Try another model number, part SKU or location.</p><button className="button secondary" onClick={()=>{setQuery('');setFilter('all');}}>Show all equipment</button></section>:<section className="panel"><h2>Start with one appliance</h2><p>Try the refrigerator, HVAC system, or theater projector. Enter your actual model and photograph its label.</p><button className="button primary" onClick={add}>Add your first equipment item</button></section>}
 </div>;
}
