import { useState } from 'react';
import type { MaintenanceItem,MaintenanceSupply } from './types';
import { uid } from './types';
import { money,fromDollars } from './logic.mjs';
import { shoppingRows,shoppingSummary,shoppingListText,quantityToBuy } from './maintenance-support.mjs';

const textFields=[['name','Part / item name','e.g. Air filter'],['size','Size / dimensions','e.g. 16 × 25 × 1'],['partNumber','Part number / SKU','From the package'],['store','Preferred store','e.g. Home Depot'],['notes','Fit / compatibility notes','Manufacturer guidance']] as const;
function Price({cents,change}:{cents:number;change:(cents:number)=>void}) {
 const [focus,setFocus]=useState(false),[draft,setDraft]=useState('');
 return <input aria-label="Estimated unit price in dollars" type="number" min="0" step="0.01" placeholder="Price not set" value={focus?draft:cents>0?(cents/100).toFixed(2):''} onFocus={e=>{setFocus(true);setDraft(e.target.value);}} onChange={e=>{setDraft(e.target.value);change(fromDollars(e.target.value));}} onBlur={()=>setFocus(false)}/>;
}
function ProductUrl({value,change}:{value:string;change:(v:string)=>void}) {
 const [draft,setDraft]=useState(value),[error,setError]=useState('');
 function commit(){const v=draft.trim();if(v&&!/^https?:\/\/[^\s]+$/i.test(v)){setError('Enter a complete http(s) product URL.');return;}setError('');change(v);}
 return <><input aria-label="Product link" type="url" inputMode="url" placeholder="https://..." value={draft} onChange={e=>{setDraft(e.target.value);setError('');}} onBlur={commit}/>{error&&<small role="alert" className="part-error">{error}</small>}</>;
}
export function MaintenancePartsEditor({item,change,restock}:{item:MaintenanceItem;change:(parts:MaintenanceSupply[])=>void;restock:(partId:string,count:number)=>void}) {
 const parts=item.supplies||[];
 const update=(id:string,fields:Partial<MaintenanceSupply>)=>change(parts.map(p=>p.id===id?{...p,...fields}:p));
 const add=()=>{const name=item.templateKey==='hvac-filter'?'HVAC air filter':item.templateKey==='fridge-water'?'Refrigerator water filter':item.title.toLowerCase().includes('filter')?'Replacement filter':'';
  change([...parts,{id:uid(),name,size:'',partNumber:'',store:'',url:'',notes:'',quantity:1,onHand:0,unitCents:0}]);};
 return <section className="panel maintenance-parts">
  <div className="parts-heading"><div><h2>Replacement parts & supplies</h2><p>Save exact sizes, part numbers and shopping links. No prices or models are guessed.</p></div><button className="button secondary" onClick={add}>+ Add part</button></div>
  {!parts.length&&<p className="parts-empty">No parts saved yet. Add a filter or cartridge so you know what to buy next time.</p>}
  {parts.map(p=><div className="part-editor" key={p.id}>
   <div className="part-editor-top"><strong>{p.name||'New part'}</strong><button className="small-btn danger-text" onClick={()=>{if(window.confirm('Remove this saved part?'))change(parts.filter(x=>x.id!==p.id));}}>Remove</button></div>
   <div className="part-fields">
    {textFields.map(([key,label,placeholder])=><label className={'field'+(key==='notes'?' part-wide':'')} key={key}><span>{label}</span><input placeholder={placeholder} value={p[key]} onChange={e=>update(p.id,{[key]:e.target.value})}/></label>)}
    <label className="field"><span>Quantity per service</span><input type="number" min="1" max="9999" step="1" value={p.quantity} onChange={e=>update(p.id,{quantity:Math.min(9999,Math.max(1,Math.floor(Number(e.target.value)||1)))})}/></label>
    <label className="field"><span>Already on hand</span><input type="number" min="0" max="9999" step="1" value={p.onHand} onChange={e=>update(p.id,{onHand:Math.min(9999,Math.max(0,Math.floor(Number(e.target.value)||0)))})}/></label>
    <label className="field"><span>Estimated unit price ($)</span><Price cents={p.unitCents} change={v=>update(p.id,{unitCents:v})}/></label>
    <label className="field"><span>Preferred product link</span><ProductUrl value={p.url} change={v=>update(p.id,{url:v})}/></label>
   </div>
   <div className="part-footer"><span>{quantityToBuy(p)>0?'Need '+quantityToBuy(p)+' to restock':'Enough on hand for next service'}</span>{quantityToBuy(p)>0&&<button className="small-btn" type="button" onClick={()=>restock(p.id,quantityToBuy(p))}>Record restock +{quantityToBuy(p)}</button>}<span>{p.unitCents>0?'Estimated cost to buy: '+money(Math.round(quantityToBuy(p)*p.unitCents)):'Price not set'}</span>{/^https?:\/\//i.test(p.url)&&<a href={p.url} target="_blank" rel="noopener noreferrer">Product ↗</a>}</div>
  </div>)}
  <p className="subtle part-footnote">Update on-hand stock manually after replacing parts. This is a shopping estimate, not an expense or a purchase.</p>
 </section>;
}
export function MaintenanceShoppingPanel({items,open,restock}:{items:MaintenanceItem[];open:(id:string)=>void;restock:(id:string,partId:string,count:number)=>void}) {
 const [all,setAll]=useState(false),[notice,setNotice]=useState('');
 const d=new Date(),date=[String(d.getFullYear()),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
 const rows=shoppingRows(items,date,all),summary=shoppingSummary(rows);
 const missing=items.filter(m=>/filter|cartridge/i.test(m.title)&&(m.supplies||[]).length===0);
 async function copy(){try{if(!navigator.clipboard?.writeText)throw new Error('No clipboard');await navigator.clipboard.writeText(shoppingListText(rows));setNotice('Shopping list copied.');}catch{setNotice('Clipboard unavailable. You can review each item below.');}}
 return <section className="panel shopping-panel">
  <div className="parts-heading"><div><h2>Replacement parts to buy</h2><p>Stock shortfalls for scheduled maintenance, not automatic orders.</p></div><label className="shopping-toggle"><input type="checkbox" checked={all} onChange={e=>setAll(e.target.checked)}/> Include later / unscheduled</label></div>
  <div className="shopping-stats"><span><strong>{summary.partCount}</strong> part types needed</span><span><strong>{money(summary.knownCents)}</strong> known estimate{summary.unknownPrices>0?' + '+summary.unknownPrices+' price(s) unknown':''}</span></div>
  {rows.length?<><div className="shopping-rows">{rows.map(r=><div className="shopping-row" key={r.maintenanceId+'-'+r.part.id}>
    <div><strong>{r.quantity} × {r.part.name||'Part name needed'}</strong><small>{r.maintenanceTitle} · {[r.part.size,r.part.partNumber].filter(Boolean).join(' · ')||'Save size / part number'}</small><small>{r.part.store||'Store not set'}</small></div>
    <div className="shopping-row-actions"><span>{r.estimatedCents===null?'Price unknown':money(r.estimatedCents)}</span>{/^https?:\/\//i.test(r.part.url)&&<a href={r.part.url} target="_blank" rel="noopener noreferrer">Shop ↗</a>}<button className="small-btn" onClick={()=>restock(r.maintenanceId,r.part.id,r.quantity)}>Record restock +{r.quantity}</button><button className="small-btn" onClick={()=>open(r.maintenanceId)}>Edit details</button></div>
  </div>)}</div><button className="button secondary" onClick={copy}>Copy shopping list</button></>:<p className="subtle">No parts to buy in this view. Add part details under a maintenance task or include later tasks.</p>}
  {!!missing.length&&<div className="parts-setup"><strong>{missing.length} filter task(s) need exact part details</strong><p>No dimensions, part numbers, or product links have been assumed.</p><button className="small-btn" onClick={()=>open(missing[0].id)}>Add part details →</button></div>}
  {notice&&<p className="maintenance-notice" role="status">{notice}</p>}
  <p className="subtle part-footnote">A $0 known estimate excludes parts with no entered price. Shopping totals never change the project budget.</p>
 </section>;
}