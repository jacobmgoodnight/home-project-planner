import { dueMaintenance,dayDiff } from './logic.mjs';

/** Service dates, costs and stock movements are explicit. This function is pure. */
export function completeService(item, details) {
 const {date,hours,costCents,notes,usedSupplies=[],deductStock=false,receipt,id,asOf}=details;
 const validDate = typeof date==='string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date+'T12:00:00Z')) && new Date(Date.parse(date+'T12:00:00Z')).toISOString().slice(0,10)===date;
 if(!validDate||dayDiff(date,asOf)>0)throw new Error('Choose a valid service date that is not in the future.');
 if(typeof id!=='string'||!id.trim())throw new Error('A service ID is required.');
 if(!Number.isSafeInteger(costCents)||costCents<0)throw new Error('Enter a valid nonnegative service cost.');
 if(hours!==null&&(!Number.isFinite(hours)||hours<0))throw new Error('Usage must be a positive number or empty.');
 if(typeof notes!=='string')throw new Error('Service notes are invalid.');
 if(!Array.isArray(usedSupplies)||usedSupplies.length>500)throw new Error('Too many part selections.');
 const byId=new Map((item.supplies||[]).map(s=>[s.id,s]));
 const seen=new Set();
 for(const used of usedSupplies){
   if(!used||!byId.has(used.partId)||seen.has(used.partId)||!Number.isSafeInteger(used.quantity)||used.quantity<1||used.quantity>9999)throw new Error('Invalid replacement-part selection.');
   seen.add(used.partId);
   if(deductStock&&byId.get(used.partId).onHand<used.quantity)throw new Error('Not enough on-hand stock for the selected parts. Change the quantity or leave stock deduction off.');
 }
 const entry={id,date,hours,costCents,notes:notes.trim(),usedSupplies:usedSupplies.map(x=>({partId:x.partId,quantity:x.quantity})),stockDeducted:!!deductStock};
 if(receipt)entry.receipt=receipt;
 const supplies=(item.supplies||[]).map(part=>{
   const used=usedSupplies.find(x=>x.partId===part.id);
   return used&&deductStock?{...part,onHand:part.onHand-used.quantity}:part;
 });
 return {...item,currentHours:hours??item.currentHours,supplies,entries:[...item.entries,entry]};
}

/** Month horizon and overdue work without fabricating unscheduled dates. */
export function maintenanceAgenda(items,asOf,horizon=30) {
 const dateRows=[], usageDue=[], unscheduled=[];
 for(const item of items){
  const d=dueMaintenance(item,asOf);
  if(d.dueDate) {
    const distance=dayDiff(d.dueDate,asOf);
    if(distance<=horizon)dateRows.push({item,dueDate:d.dueDate,daysUntil:distance});
  } else if(d.dueHours!==null&&d.hourRemaining!==null&&d.hourRemaining<=10)usageDue.push({item,dueHours:d.dueHours,remaining:d.hourRemaining});
  else unscheduled.push(item);
 }
 dateRows.sort((a,b)=>a.daysUntil-b.daysUntil||a.item.title.localeCompare(b.item.title));
 usageDue.sort((a,b)=>a.remaining-b.remaining);
 return {overdue:dateRows.filter(x=>x.daysUntil<=0),upcoming:dateRows.filter(x=>x.daysUntil>0),usageDue,unscheduled};
}

/** Low-stock thresholds only exist when a user explicitly sets one. */
export function lowStockRows(items) {
 return items.flatMap(item=>(item.supplies||[])
   .filter(part=>Number.isInteger(part.minOnHand)&&part.minOnHand>0&&part.onHand<part.minOnHand)
   .map(part=>({maintenanceId:item.id,maintenanceTitle:item.title,part,shortfall:part.minOnHand-part.onHand})));
}
