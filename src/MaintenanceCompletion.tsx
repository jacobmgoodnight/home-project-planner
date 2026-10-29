import {useState} from 'react';
import type {ChangeEvent} from 'react';
import type {Attachment,MaintenanceItem,UsedSupply} from './types';
import {today,uid} from './types';
import {dueMaintenance,fromDollars,money} from './logic.mjs';
import {attachmentFromFile} from './storage';
import {completeService} from './maintenance-enhancements.mjs';
import type {CompletionDetails} from './maintenance-enhancements.mjs';

function formatDate(value:string) {
 if(!value)return 'No date scheduled';
 return new Date(value+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
}

export function MaintenanceCompletion({item,onSave,onCancel}:{item:MaintenanceItem;onSave:(details:CompletionDetails)=>void;onCancel:()=>void}) {
 const [date,setDate]=useState(today());
 const [notes,setNotes]=useState('');
 const [cost,setCost]=useState('');
 const [usage,setUsage]=useState(item.currentHours===null?'':String(item.currentHours));
 const [used,setUsed]=useState<UsedSupply[]>([]);
 const [deduct,setDeduct]=useState(false);
 const [receipt,setReceipt]=useState<Attachment|undefined>();
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const pieces=item.supplies||[];
 const usable=pieces.filter(p=>used.some(row=>row.partId===p.id));
 const costCents=fromDollars(cost);
 const hours=usage.trim()===''?null:Number(usage);
 const details:CompletionDetails={id:uid(),date,asOf:today(),hours,costCents,notes,usedSupplies:used,deductStock:deduct,receipt};
 let preview:MaintenanceItem|null=null;
 let validation='';
 try{
   if(cost.trim()!==''&&(!Number.isFinite(Number(cost))||Number(cost)<0))throw new Error('Enter a valid nonnegative paid amount.');
   if(usage.trim()!==''&&(!Number.isFinite(Number(usage))||Number(usage)<0))throw new Error('Enter a valid nonnegative usage value.');
   preview=completeService(item,details);
 }catch(e){validation=e instanceof Error?e.message:'Please check service details.';}
 const next=preview?dueMaintenance(preview,date):null;
 function setPart(partId:string,checked:boolean,defaultQty:number) {
  setUsed(rows=>checked?[...rows.filter(r=>r.partId!==partId),{partId,quantity:defaultQty}]:rows.filter(r=>r.partId!==partId));
 }
 async function fileChanged(event:ChangeEvent<HTMLInputElement>) {
  const file=event.target.files?.[0];event.target.value='';
  if(!file)return;
  setBusy(true);setError('');
  try {
   const converted=await attachmentFromFile(file);
   setReceipt({id:uid(),name:file.name,mime:converted.mime,dataUrl:converted.dataUrl,date:today()});
  }catch(e){setError(e instanceof Error?e.message:'Unable to attach receipt.');}
  finally{setBusy(false);}
 }
 function save() {
  if(!preview||validation){setError(validation||'Review the details before saving.');return;}
  const stockText=deduct?'\nSelected parts will be deducted from on-hand inventory.':'\nInventory quantities will remain unchanged.';
  if(!window.confirm('Record this completed service on '+formatDate(date)+'?'+stockText+'\nActual payment recorded in maintenance history: '+money(costCents)+'. This is NOT added to project spending.'))return;
  onSave(details);
 }
 return <div className="completion-page">
  <button className="back-link" onClick={onCancel}>← Back to maintenance</button>
  <div className="page-heading"><div><h1>Complete maintenance</h1><p>{item.title} · Record what actually happened.</p></div></div>
  <div className="two-column"><section className="panel">
   <h2>1. Service details</h2>
   <div className="form-grid">
    <label className="field"><span>Service date</span><input type="date" value={date} max={today()} onChange={e=>setDate(e.target.value)}/></label>
    <label className="field"><span>Actual cost paid ($)</span><input type="number" min="0" step="0.01" placeholder="0.00 if none" value={cost} onChange={e=>setCost(e.target.value)}/></label>
    <label className="field"><span>Usage at service (hours / miles, optional)</span><input type="number" min="0" placeholder="Optional" value={usage} onChange={e=>setUsage(e.target.value)}/></label>
    <label className="field"><span>What was done?</span><textarea rows={3} placeholder="Quick details, observations, or contractor notes" value={notes} onChange={e=>setNotes(e.target.value)}/></label>
   </div>
   <div className="receipt-upload"><strong>Receipt or service photo (optional)</strong><p className="subtle">A compressed photo or small PDF stays on this device and in JSON backups.</p>
    <div className="action-line">
    <label className="button secondary file-label">{busy?'Reading…':'📷 Take receipt photo'}<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={busy} onChange={fileChanged}/></label>
    <label className="button secondary file-label">{receipt?'Replace file':'Choose receipt / PDF'}<input type="file" accept=".pdf,image/jpeg,image/png,image/webp" disabled={busy} onChange={fileChanged}/></label>
    </div>
    {receipt&&<div className="receipt-line"><span>{receipt.name}</span><button className="small-btn" onClick={()=>setReceipt(undefined)}>Remove</button></div>}
   </div>
  </section><div className="stack">
   <section className="panel"><h2>2. Supplies used (optional)</h2><p className="subtle">Select only parts actually used. A completion does not change inventory unless you explicitly opt in.</p>
    {pieces.length?pieces.map(p=>{
      const selection=used.find(r=>r.partId===p.id);
      return <div className="used-part-row" key={p.id}>
       <label><input type="checkbox" checked={!!selection} onChange={e=>setPart(p.id,e.target.checked,Math.max(1,Math.floor(p.quantity)||1))}/><span>{p.name||'Unnamed part'}<small>On hand: {p.onHand}{p.partNumber?' · '+p.partNumber:''}</small></span></label>
       {selection&&<input aria-label={'Used quantity for '+(p.name||'part')} type="number" min="1" max="9999" step="1" value={selection.quantity} onChange={e=>setUsed(rows=>rows.map(r=>r.partId===p.id?{...r,quantity:Math.min(9999,Math.max(1,Math.floor(Number(e.target.value)||1)))}:r))}/>}
      </div>;
    }):<p className="subtle">No saved replacement parts. You can still log the service.</p>}
    <label className="deduct-option"><input type="checkbox" checked={deduct} disabled={!used.length} onChange={e=>setDeduct(e.target.checked)}/><span>Also deduct these supplies from on-hand inventory</span></label>
    {deduct&&usable.length>0&&<p className="subtle">Stock adjustment: {usable.map(p=>(p.name||'Part')+' '+p.onHand+' → '+(p.onHand-(used.find(u=>u.partId===p.id)?.quantity||0))).join('; ')}</p>}
   </section>
   <section className="panel"><h2>3. Review & save</h2>
    <p><strong>Paid:</strong> {money(costCents)}</p><p><strong>Logged on:</strong> {formatDate(date)}</p>
    <p><strong>Next scheduled date:</strong> {next?.dueDate?formatDate(next.dueDate):'Not scheduled'}</p>
    <p className="subtle">Cost stays in maintenance history; project spending remains unchanged. No purchase is made.</p>
    {(error||validation)&&<p className="service-error" role="alert">{error||validation}</p>}
    <div className="action-line"><button className="button primary" disabled={busy||!!validation} onClick={save}>✓ Save completed service</button><button className="button secondary" onClick={onCancel}>Cancel</button></div>
   </section>
  </div></div>
 </div>;
}
