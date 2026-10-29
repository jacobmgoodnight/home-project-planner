import { dueMaintenance } from './logic.mjs';
/** v1 snapshots did not include parts; preserve all existing data and service dates. */
export function upgradeSnapshot(snapshot) {
  if(!snapshot||typeof snapshot!=='object')return snapshot;
  let updated=snapshot;
  if(updated.version===1&&Array.isArray(updated.maintenance)){
    updated={...updated,version:2,maintenance:updated.maintenance.map(item=>({
      ...item,modelNumber:typeof item.modelNumber==='string'?item.modelNumber:'',
      supplies:Array.isArray(item.supplies)?item.supplies:[]
    }))};
  }
  if(updated.version===2&&Array.isArray(updated.maintenance)){
    return {...updated,version:3,equipment:[],maintenance:updated.maintenance.map(item=>({...item,equipmentId:''}))};
  }
  return updated;
}
export function quantityToBuy(part) {return Math.max(0,Math.max(Number(part.quantity)||0,Number(part.minOnHand)||0)-(Number(part.onHand)||0));}
export function shoppingRows(items,asOf,all=false) {
  return items.flatMap(item=>{
    const due=dueMaintenance(item,asOf);
    if(!all&&!due.due&&!due.soon&&!(item.supplies||[]).some(part=>Number.isInteger(part.minOnHand)&&part.minOnHand>0&&part.onHand<part.minOnHand))return [];
    return (item.supplies||[]).filter(part=>quantityToBuy(part)>0).map(part=>({
      maintenanceId:item.id,maintenanceTitle:item.title,dueDate:due.dueDate,
      part,quantity:quantityToBuy(part),estimatedCents:part.unitCents>0?Math.round(quantityToBuy(part)*part.unitCents):null
    }));
  }).sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999')||a.maintenanceTitle.localeCompare(b.maintenanceTitle));
}
export function shoppingSummary(rows) {
  return {knownCents:rows.reduce((sum,row)=>sum+(row.estimatedCents??0),0),
    unknownPrices:rows.filter(row=>row.estimatedCents===null).length,partCount:rows.length};
}
export function shoppingListText(rows) {
  if(!rows.length)return 'No maintenance replacement parts to buy.';
  return rows.map(row=>{
    const p=row.part;
    const details=[p.size&&'Size: '+p.size,p.partNumber&&'Part: '+p.partNumber,
      p.store&&'Store: '+p.store,p.url&&'Link: '+p.url].filter(Boolean);
    return row.quantity+' × '+(p.name||'Unspecified part')+' ('+row.maintenanceTitle+')'+(details.length?'\n  '+details.join(' | '):'');
  }).join('\n');
}

/** Restocking is inventory-only: never record spending or consume stock on service completion. */
export function stockAfterRestock(onHand,added) {
  if(!Number.isSafeInteger(onHand)||onHand<0||!Number.isSafeInteger(added)||added<=0||onHand+added>9999) {
    throw new Error('Restock must be a whole number between 1 and available storage capacity.');
  }
  return onHand+added;
}
