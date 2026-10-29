/** Consolidates existing local files and part links without copying attachments. */
export function referenceRows(equipment,maintenance,projects){
 const rows=[];
 for(const asset of equipment){
  const title=asset.name||asset.model||'Equipment';
  for(const photo of asset.photos||[])rows.push({id:'equipment-photo:'+asset.id+':'+photo.id,type:'Label photo',title:photo.name,owner:title,search:[title,asset.model,asset.serial,asset.manufacturer,asset.location,photo.name].join(' '),file:photo});
  for(const doc of asset.documents||[])rows.push({id:'equipment-doc:'+asset.id+':'+doc.id,type:'Manual / document',title:doc.name,owner:title,search:[title,asset.model,asset.serial,doc.name].join(' '),file:doc});
  if(asset.warrantyUntil)rows.push({id:'warranty:'+asset.id,type:'Warranty',title:asset.warrantyUntil,owner:title,search:[title,asset.model,'warranty',asset.warrantyUntil].join(' '),equipmentId:asset.id});
 }
 for(const m of maintenance){
  for(const p of m.supplies||[])if(p.name||p.partNumber||p.url)rows.push({id:'part:'+m.id+':'+p.id,type:'Replacement part',title:p.name||p.partNumber||'Part',owner:m.title,search:[m.title,m.asset,p.name,p.size,p.partNumber,p.store].join(' '),url:p.url||undefined});
  for(const e of m.entries)if(e.receipt)rows.push({id:'receipt:'+m.id+':'+e.id,type:'Service receipt',title:e.receipt.name,owner:m.title,search:[m.title,e.date,e.notes,e.receipt.name].join(' '),file:e.receipt});
 }
 for(const p of projects)for(const att of p.attachments)rows.push({id:'project-file:'+p.id+':'+att.id,type:'Project document',title:att.name,owner:p.name,search:[p.name,p.description,att.name].join(' '),file:att});
 return rows;
}
export function searchReferences(rows,query,category='All'){
 const terms=String(query||'').toLocaleLowerCase('en-US').trim().split(/\s+/).filter(Boolean);
 return rows.filter(r=>(category==='All'||r.type===category)&&terms.every(t=>r.search.toLocaleLowerCase('en-US').includes(t)))
  .sort((a,b)=>a.owner.localeCompare(b.owner)||a.title.localeCompare(b.title));
}
