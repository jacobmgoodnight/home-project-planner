/** Fast local text index, no network requests or external search service. */
export function searchHome(database,query){
 const terms=String(query||'').toLocaleLowerCase('en-US').trim().split(/\s+/).filter(Boolean);
 if(!terms.length)return [];
 const items=[];
 const match=(kind,id,title,subtitle,fields)=>{
  const text=fields.filter(Boolean).join(' ').toLocaleLowerCase('en-US');
  if(terms.every(t=>text.includes(t)))items.push({kind,id,title:title||'Unnamed',subtitle});
 };
 for(const p of database.projects){
  match('project',p.id,p.name,p.nextAction||'Project',[p.name,p.category,p.description,p.nextAction,
   ...p.tasks.map(t=>t.title),...p.attachments.map(a=>a.name)]);
 }
 for(const m of database.maintenance){
  match('maintenance',m.id,m.title,m.asset||'Maintenance',[m.title,m.asset,m.modelNumber,m.notes,
   ...m.supplies.flatMap(p=>[p.name,p.size,p.partNumber,p.store]),
   ...m.entries.flatMap(e=>[e.notes,e.receipt?.name])]);
 }
 for(const e of database.equipment){
  match('equipment',e.id,e.name,e.model||e.location||'Equipment',
   [e.name,e.location,e.manufacturer,e.model,e.serial,e.notes,...e.photos.map(a=>a.name),
    ...(e.documents||[]).map(d=>d.name)]);
 }
 const order={project:0,maintenance:1,equipment:2};
 return items.sort((a,b)=>order[a.kind]-order[b.kind]||a.title.localeCompare(b.title)).slice(0,100);
}
