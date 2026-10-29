import {dayDiff} from './logic.mjs';

const norm=value=>String(value||'').toLocaleLowerCase('en-US').trim();
export function findEquipment(equipment,maintenance,query){
 const terms=norm(query).split(/\s+/).filter(Boolean);
 if(!terms.length)return [...equipment].sort((a,b)=>a.name.localeCompare(b.name));
 return equipment.filter(asset=>{
  const related=maintenance.filter(m=>m.equipmentId===asset.id);
  const body=[asset.name,asset.location,asset.manufacturer,asset.model,asset.serial,asset.notes,
   ...related.flatMap(m=>[m.title,m.asset,m.modelNumber,m.notes,...(m.supplies||[]).flatMap(p=>[p.name,p.partNumber,p.size,p.store])])].join(' ').toLocaleLowerCase('en-US');
  return terms.every(t=>body.includes(t));
 }).sort((a,b)=>a.name.localeCompare(b.name));
}
const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(Date.parse(v+'T12:00:00Z')).toISOString().slice(0,10)===v;
export function expiringWarranties(equipment,asOf,horizonDays=90){
 return equipment.filter(x=>validDate(x.warrantyUntil)).map(item=>({
  item,daysRemaining:dayDiff(item.warrantyUntil,asOf)
 })).filter(x=>x.daysRemaining!==null&&x.daysRemaining<=horizonDays)
 .sort((a,b)=>a.daysRemaining-b.daysRemaining||a.item.name.localeCompare(b.item.name));
}
export function maintenanceYearSummary(maintenance,equipment,year){
 const selected=maintenance.flatMap(item=>item.entries.filter(e=>validDate(e.date)&&e.date.slice(0,4)===String(year))
  .map(entry=>({item,entry,equipment:equipment.find(a=>a.id===item.equipmentId)||null})));
 selected.sort((a,b)=>b.entry.date.localeCompare(a.entry.date)||a.item.title.localeCompare(b.item.title));
 const sum=arr=>arr.reduce((s,x)=>s+x.entry.costCents,0);
 const byMonth=Array.from({length:12},(_,i)=>{
  const month=String(i+1).padStart(2,'0'),entries=selected.filter(x=>x.entry.date.slice(5,7)===month);
  return {month,amountCents:sum(entries),count:entries.length};
 });
 const totals=new Map();
 for(const x of selected){
  const key=x.equipment?.id||'none:'+x.item.id;
  const prev=totals.get(key)||{key,label:x.equipment?.name||x.item.title,amountCents:0,count:0};
  prev.amountCents+=x.entry.costCents;prev.count++;totals.set(key,prev);
 }
 return {year:String(year),count:selected.length,totalCents:sum(selected),rows:selected,
  byMonth,byAsset:[...totals.values()].sort((a,b)=>b.amountCents-a.amountCents||a.label.localeCompare(b.label))};
}
