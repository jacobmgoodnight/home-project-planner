/** Merge only new IDs; existing IDs never get overwritten silently. */
export function previewMerge(local,incoming) {
 if(!local||!incoming||local.version!==3||incoming.version!==3)throw new Error('Use a valid version 3 Home Project Planner snapshot.');
 const sections=['projects','maintenance','equipment'];
 const additions={},conflicts={},unchanged={};
 for(const key of sections) {
  const localById=new Map(local[key].map(x=>[x.id,x]));
  additions[key]=[];conflicts[key]=[];unchanged[key]=[];
  for(const item of incoming[key]){
   const current=localById.get(item.id);
   if(!current)additions[key].push(item);
   else if(JSON.stringify(current)===JSON.stringify(item))unchanged[key].push(item.id);
   else conflicts[key].push(item.id);
  }
 }
 const addCount=sections.reduce((n,k)=>n+additions[k].length,0);
 const conflictCount=sections.reduce((n,k)=>n+conflicts[k].length,0);
 return {additions,conflicts,unchanged,addCount,conflictCount};
}
export function mergeNewRecords(local,incoming){
 const preview=previewMerge(local,incoming);
 // Same stable IDs for all records. Linked projects and equipment are imported together.
 const result={...local,...Object.fromEntries(['projects','maintenance','equipment'].map(k=>[k,[...local[k],...preview.additions[k]]]))};
 return {result,preview};
}
