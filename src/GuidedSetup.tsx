import {useState} from 'react';
import type {EquipmentItem,MaintenanceItem} from './types';
import {MAINTENANCE_PRESETS,isPresetInstalled} from './maintenance-presets';

const suggested=['HVAC system','Kitchen refrigerator','Garage refrigerator','Water heater','Dishwasher','Clothes dryer','Garage door','Home theater projector','Holiday projector'];
export function GuidedSetup({equipment,maintenance,onInstall,onClose}:{equipment:EquipmentItem[];maintenance:MaintenanceItem[];onInstall:(equipmentNames:string[],presetKeys:string[])=>void;onClose:()=>void}){
 const [equipmentNames,setEquipmentNames]=useState<string[]>([]);
 const [presetKeys,setPresetKeys]=useState<string[]>([]);
 const existing=new Set(equipment.map(e=>e.name.trim().toLocaleLowerCase('en-US')));
 const uniqueNames=suggested.filter(s=>!existing.has(s.toLocaleLowerCase('en-US')));
 const presets=MAINTENANCE_PRESETS.filter(p=>p.defaultSelected&&!isPresetInstalled(p,maintenance));
 const toggle=(arr:string[],key:string,setter:(v:string[])=>void)=>setter(arr.includes(key)?arr.filter(k=>k!==key):[...arr,key]);
 return <section className="panel guided-setup" aria-label="Guided household setup">
  <div className="parts-heading"><div><h2>Set up your home</h2><p>Select what you actually own or want to track. Nothing is installed until you confirm.</p></div><button className="small-btn" onClick={onClose}>Close ✕</button></div>
  <div className="setup-columns">
   <div><h3>1. Equipment to remember</h3><p className="subtle">Blank details you can fill in later: manufacturer, model, labels, warranty, manuals.</p>
    {uniqueNames.length?uniqueNames.map(s=><label className="setup-choice" key={s}><input type="checkbox" checked={equipmentNames.includes(s)} onChange={()=>toggle(equipmentNames,s,setEquipmentNames)}/><span>{s}</span></label>):<p className="subtle">All suggested equipment is already listed.</p>}
   </div>
   <div><h3>2. Maintenance you want to track</h3><p className="subtle">Preset frequencies are editable; no service dates or past completions are invented.</p>
    {presets.length?presets.map(p=><label className="setup-choice" key={p.key}><input type="checkbox" checked={presetKeys.includes(p.key)} onChange={()=>toggle(presetKeys,p.key,setPresetKeys)}/><span>{p.title}<small>Every {p.months} month{p.months===1?'':'s'}</small></span></label>):<p className="subtle">The standard reminders are already added. Seasonal suggestions remain in Maintenance.</p>}
   </div>
  </div>
  <div className="setup-footer"><span>{equipmentNames.length} equipment + {presetKeys.length} routine(s) selected</span><button className="button primary" disabled={!equipmentNames.length&&!presetKeys.length} onClick={()=>onInstall(equipmentNames,presetKeys)}>Add selected to my home</button></div>
 </section>;
}
