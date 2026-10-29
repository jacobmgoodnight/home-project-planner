import {useState} from 'react';
import type {Project} from './types';
import {today} from './types';

export type QuickCaptureRequest={kind:'project'|'step'|'maintenance';title:string;dueDate:string;projectId?:string};
export function QuickCapture({projects,onCreate,onClose}:{projects:Project[];onCreate:(req:QuickCaptureRequest)=>void;onClose:()=>void}){
 const [kind,setKind]=useState<QuickCaptureRequest['kind']>(projects.some(p=>p.status!=='Completed')?'step':'project');
 const [title,setTitle]=useState('');
 const [date,setDate]=useState('');
 const [projectId,setProjectId]=useState(projects.find(p=>p.status!=='Completed')?.id||'');
 const valid=title.trim().length>0&&title.length<=180&&(kind!=='step'||!!projectId);
 return <div className="quick-overlay" onClick={onClose}>
  <div role="dialog" aria-modal="true" aria-label="Quick add" className="quick-dialog panel" onClick={e=>e.stopPropagation()}>
   <div className="parts-heading"><div><h2>Quick add</h2><p>Capture it in a few seconds. Add the details later.</p></div><button className="small-btn" onClick={onClose} aria-label="Close quick add">✕</button></div>
   <div className="quick-kind">
    <button className={kind==='step'?'active':''} onClick={()=>setKind('step')}>Project step</button>
    <button className={kind==='maintenance'?'active':''} onClick={()=>setKind('maintenance')}>Maintenance</button>
    <button className={kind==='project'?'active':''} onClick={()=>setKind('project')}>New project</button>
   </div>
   <form onSubmit={e=>{e.preventDefault();if(valid)onCreate({kind,title:title.trim(),dueDate:date,projectId:kind==='step'?projectId:undefined});}}>
    <label className="field"><span>{kind==='step'?'What needs doing?':kind==='maintenance'?'Maintenance task':'Project name'}</span><input autoFocus maxLength={180} value={title} placeholder={kind==='step'?'e.g. Order replacement filter':kind==='maintenance'?'e.g. Change fridge water filter':'e.g. Fix drainage'} onChange={e=>setTitle(e.target.value)}/></label>
    {kind==='step'&&<label className="field"><span>Project</span><select value={projectId} onChange={e=>setProjectId(e.target.value)}><option value="">Select a project</option>{projects.filter(p=>p.status!=='Completed').map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
    <label className="field"><span>{kind==='maintenance'?'First due date (optional)':'Target date (optional)'}</span><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
    <p className="subtle">{kind==='maintenance'?'No recurrence is assumed. Set monthly/yearly scheduling afterward.':kind==='step'?'This adds an unchecked step to the selected project.':'This creates a planned project you can prioritize later.'}</p>
    <div className="action-line"><button type="submit" disabled={!valid} className="button primary">Add now</button><button type="button" className="button secondary" onClick={onClose}>Cancel</button></div>
    <small className="subtle">All changes stay on this device · {today()}</small>
   </form>
  </div>
 </div>;
}
