import {useState} from 'react';
import type {EquipmentItem,MaintenanceItem} from './types';
import {MAINTENANCE_PRESETS,isPresetInstalled} from './maintenance-presets';

export type SetupRoutine={key:string;firstDueDate:string;intervalMonths:number;equipmentName:string;partNumber:string;partSize:string};
type Config={firstDueDate:string;intervalMonths:string;equipmentName:string;partNumber:string;partSize:string};
const suggested=['HVAC system','Kitchen refrigerator','Garage refrigerator','Water heater','Dishwasher','Clothes dryer','Garage door','Home theater projector','Holiday projector'];
export function GuidedSetup({equipment,maintenance,onInstall,onClose}:{equipment:EquipmentItem[];maintenance:MaintenanceItem[];onInstall:(equipmentNames:string[],routines:SetupRoutine[])=>void;onClose:()=>void}){
 const [equipmentNames,setEquipmentNames]=useState<string[]>([]);
 const [presetKeys,setPresetKeys]=useState<string[]>([]);
 const [details,setDetails]=useState<Record<string,Partial<Config>>>({});
 const existing=new Set(equipment.map(e=>e.name.trim().toLocaleLowerCase('en-US')));
 const uniqueNames=suggested.filter(s=>!existing.has(s.toLocaleLowerCase('en-US')));
 const presets=MAINTENANCE_PRESETS.filter(p=>p.defaultSelected&&!isPresetInstalled(p,maintenance));
 const toggle=(arr:string[],key:string,setter:(v:string[])=>void)=>setter(arr.includes(key)?arr.filter(k=>k!==key):[...arr,key]);
 const equipmentOptions=[...new Set([...equipment.map(e=>e.name).filter(Boolean),...equipmentNames])];
 const update=(key:string,field:keyof Config,value:string)=>setDetails(old=>({...old,[key]:{...old[key],[field]:value}}));
 const submit=()=>{
   const routines=presets.filter(p=>presetKeys.includes(p.key)).map(p=>{
    const item=details[p.key]||{};
    const months=Number(item.intervalMonths||p.months);
    return {key:p.key,firstDueDate:item.firstDueDate||'',intervalMonths:Number.isSafeInteger(months)&&months>=1&&months<=120?months:p.months,equipmentName:item.equipmentName||'',partNumber:(item.partNumber||'').trim(),partSize:(item.partSize||'').trim()};
   });
   onInstall(equipmentNames,routines);
 };
 return <section className="panel guided-setup" aria-label="Guided household setup">
  <div className="parts-heading"><div><h2>Set up your home</h2><p>Select only equipment and maintenance routines you actually want to track. Scheduling details are optional.</p></div><button className="small-btn" onClick={onClose}>Close ✕</button></div>
  <div className="setup-columns">
   <div><h3>1. Equipment to remember</h3><p className="subtle">Save blank equipment records; add the actual model, photos and warranty afterward.</p>
    {uniqueNames.length?uniqueNames.map(s=><label className="setup-choice" key={s}><input type="checkbox" checked={equipmentNames.includes(s)} onChange={()=>toggle(equipmentNames,s,setEquipmentNames)}/><span>{s}</span></label>):<p className="subtle">All suggested equipment is already listed.</p>}
   </div>
   <div><h3>2. Maintenance you want to track</h3><p className="subtle">Only selected routines are added. No assumed service history or due dates.</p>
    {presets.length?presets.map(p=><div key={p.key} className="setup-routine">
      <label className="setup-choice"><input type="checkbox" checked={presetKeys.includes(p.key)} onChange={()=>toggle(presetKeys,p.key,setPresetKeys)}/><span>{p.title}<small>Suggested every {p.months} month{p.months===1?'':'s'}; editable</small></span></label>
      {presetKeys.includes(p.key)&&<details className="setup-routine-options"><summary>Optional date, equipment & part</summary>
       <label className="field"><span>First due date</span><input type="date" value={details[p.key]?.firstDueDate||''} onChange={e=>update(p.key,'firstDueDate',e.target.value)}/></label>
       <label className="field"><span>Repeat every (months)</span><input type="number" min="1" max="120" value={details[p.key]?.intervalMonths||String(p.months)} onChange={e=>update(p.key,'intervalMonths',e.target.value)}/></label>
       <label className="field"><span>Link actual equipment (optional)</span><select value={details[p.key]?.equipmentName||''} onChange={e=>update(p.key,'equipmentName',e.target.value)}><option value="">Not linked</option>{equipmentOptions.map(name=><option key={name} value={name}>{name}</option>)}</select></label>
       <label className="field"><span>Replacement part number, if applicable</span><input value={details[p.key]?.partNumber||''} placeholder="From your actual equipment label" onChange={e=>update(p.key,'partNumber',e.target.value)}/></label>
       <label className="field"><span>Filter / part size, if applicable</span><input value={details[p.key]?.partSize||''} placeholder="e.g. 16 × 25 × 1" onChange={e=>update(p.key,'partSize',e.target.value)}/></label>
      </details>}
     </div>):<p className="subtle">The standard routines are already installed. Seasonal suggestions remain under Maintenance.</p>}
   </div>
  </div>
  <div className="setup-footer"><span>{equipmentNames.length} equipment + {presetKeys.length} routine(s) selected</span><button className="button primary" disabled={!equipmentNames.length&&!presetKeys.length} onClick={submit}>Add selected to my home</button></div>
 </section>;
}
