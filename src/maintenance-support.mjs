import { dueMaintenance } from './logic.mjs';
/** v1 snapshots did not include parts; preserve all existing data and service dates. */
export function upgradeSnapshot(snapshot) {
  if(!snapshot||typeof snapshot!=='object'||snapshot.version!==1||!Array.isArray(snapshot.maintenance))return snapshot;
  return {...snapshot,version:2,maintenance:snapshot.maintenance.map(item=>({
    ...item,modelNumber:typeof item.modelNumber==='string'?item.modelNumber:'',
    supplies:Array.isArray(item.supplies)?item.supplies:[]
  }))};
}
export function quantityToBuy(part) {return Math.max(0,(Number(part.quantity)||0)-(Number(part.onHand)||0));}
export function shoppingRows(items,asOf,all=false) {
  return items.flatMap(item=>{
    const due=dueMaintenance(item,asOf);
    if(!all&&!due.due&&!due.soon)return [];
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
