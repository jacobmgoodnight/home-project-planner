const label=(entry,section)=>String(entry?.name||entry?.title||entry?.model||section+' item').slice(0,100);
const fields=(a,b)=>[...new Set([...Object.keys(a||{}),...Object.keys(b||{})])].filter(k=>JSON.stringify(a?.[k])!==JSON.stringify(b?.[k]));
/** Structured differences only. Never auto-merge diverged records or expose contents. */
export function snapshotDifferences(local,cloud){
 const sections=['projects','maintenance','equipment'];
 const groups=sections.map(section=>{
  const ours=new Map((local[section]||[]).map(x=>[x.id,x]));
  const theirs=new Map((cloud[section]||[]).map(x=>[x.id,x]));
  const onlyLocal=[...ours.values()].filter(x=>!theirs.has(x.id)).map(x=>({id:x.id,label:label(x,section)}));
  const onlyCloud=[...theirs.values()].filter(x=>!ours.has(x.id)).map(x=>({id:x.id,label:label(x,section)}));
  const changed=[...ours.values()].filter(x=>theirs.has(x.id)&&JSON.stringify(x)!==JSON.stringify(theirs.get(x.id)))
   .map(x=>({id:x.id,label:label(x,section),fields:fields(x,theirs.get(x.id))}));
  return {section,onlyLocal,onlyCloud,changed};
 });
 return {groups,hasDifferences:groups.some(g=>g.onlyLocal.length||g.onlyCloud.length||g.changed.length),
  total:groups.reduce((s,g)=>s+g.onlyLocal.length+g.onlyCloud.length+g.changed.length,0)};
}
