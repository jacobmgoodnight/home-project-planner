import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import type { Attachment, Database, DecisionOption, Expense, FutureCost, MaintenanceItem, Material, Project, Quote, ServiceEntry } from './types';
import { CATEGORIES, STATUSES, emptyDatabase, newEquipment, newMaintenance, newProject, today, uid } from './types';
import { money, fromDollars, dollars, clamp, projectCost, decisionCost, sortProjects, priority, dueMaintenance, dayDiff } from './logic.mjs';
import { attachmentFromFile, downloadBackup, load, save, validateBackup } from './storage';
import { demoData } from './demo';
import { MAINTENANCE_PRESETS,createFromPreset,isPresetInstalled } from './maintenance-presets';
import { MaintenancePartsEditor,MaintenanceShoppingPanel } from './MaintenanceParts';
import { EquipmentInventory } from './EquipmentInventory';
import { MaintenanceCompletion } from './MaintenanceCompletion';
import { MaintenanceAgenda } from './MaintenanceAgenda';
import { MaintenanceHistory } from './MaintenanceHistory';
import { TodayDashboard } from './TodayDashboard';
import { HomeReminders } from './HomeReminders';
import { HouseholdSync } from './HouseholdSync';
import { pauseSyncForLocalReplace } from './cloud-client';
import { createSaveQueue } from './save-queue.mjs';
import { isUnderBudgetRemaining,wouldCreateDependencyCycle } from './project-filters.mjs';
import type { SaveQueue } from './save-queue.mjs';
import { GuidedSetup } from './GuidedSetup';
import { QuickCapture } from './QuickCapture';
import type { QuickCaptureRequest } from './QuickCapture';
import { HomeReference } from './HomeReference';
import { HomeSearch } from './HomeSearch';
import type { SearchResult } from './home-search.mjs';
import { BackupTransfer } from './BackupTransfer';
import { mergeNewRecords } from './safe-transfer.mjs';
import type { CompletionDetails } from './maintenance-enhancements.mjs';
import { completeService } from './maintenance-enhancements.mjs';
import type { EquipmentItem } from './types';
import { stockAfterRestock } from './maintenance-support.mjs';

type Page = 'overview'|'projects'|'maintenance'|'data';
type Filter = 'all'|'quick'|'cheap'|'overdue'|'waiting'|'month';
type EditorTab = 'plan'|'tasks'|'budget'|'materials'|'decisions'|'files';
const ICONS: Record<string,string> = {Home:'⌂',Vehicles:'🚙','Holiday Displays':'✦',Electronics:'◈',Family:'♡',Repairs:'🔧',Maintenance:'☷',Other:'◻'};
const NAV:[Page,string,string][] = [['overview','Today','▦'],['projects','Projects','▤'],['maintenance','Maintenance','◷'],['data','Backup & data','⇅']];
const SIMPLE_DATE=/^\d{4}-\d{2}-\d{2}$/;
function shortDate(iso:string){return SIMPLE_DATE.test(iso)?new Date(iso+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'Not set';}
function safeLink(url:string){return /^https?:\/\//i.test(url)?url:undefined;}
function dollarChange(v:string){return fromDollars(v);}
function num(v:string){return Math.max(0,Number(v)||0);}
function TextField({label,children,tip}:{label:string;children:ReactNode;tip?:string}){
  return <label className="field"><span>{label}</span>{children}{tip&&<small>{tip}</small>}</label>;
}
function CurrencyInput({value,onChange,ariaLabel}:{value:number;onChange:(value:number)=>void;ariaLabel?:string}){
  const [focused,setFocused]=useState(false);
  const [draft,setDraft]=useState('');
  return <div className="money-input"><span>$</span><input aria-label={ariaLabel} type="number" min="0" step="0.01" value={focused?draft:dollars(value)}
    onFocus={e=>{setFocused(true);setDraft(e.target.value);e.target.select();}}
    onChange={e=>{setDraft(e.target.value);onChange(dollarChange(e.target.value));}}
    onBlur={()=>setFocused(false)}/></div>;
}
function Select({value,onChange,options}:{value:string;onChange:(value:string)=>void;options:readonly string[]}){
  return <select value={value} onChange={e=>onChange(e.target.value)}>{options.map(x=><option key={x} value={x}>{x}</option>)}</select>;
}
function SmallBtn({onClick,children,danger=false}:{onClick:()=>void;children:ReactNode;danger?:boolean}){return <button className={`small-btn ${danger?'danger-text':''}`} type="button" onClick={onClick}>{children}</button>;}
function Stat({label,value,sub}:{label:string;value:string;sub?:string}){return <div className="stat"><span>{label}</span><strong>{value}</strong>{sub&&<small>{sub}</small>}</div>;}
function Chip({children,tone='neutral'}:{children:ReactNode;tone?:string}){return <span className={`chip ${tone}`}>{children}</span>;}

export default function App(){
  const [db,setDb]=useState<Database|null>(null);
  const [fatal,setFatal]=useState('');
  const [saveError,setSaveError]=useState('');
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(false);
  const [page,setPage]=useState<Page>(()=>new URLSearchParams(location.search).has('equipment')?'maintenance':'overview');
  const [equipmentDeepLink]=useState(()=>new URLSearchParams(location.search).get('equipment')||'');
  const [selected,setSelected]=useState<string|null>(null);
  const [filter,setFilter]=useState<Filter>('all');
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState('All');
  const [editorTab,setEditorTab]=useState<EditorTab>('plan');
  const [flash,setFlash]=useState('');
  const [showQuick,setShowQuick]=useState(false);
  const [showSearch,setShowSearch]=useState(false);
  const [showSetup,setShowSetup]=useState(false);
  const [maintenanceFocus,setMaintenanceFocus]=useState('');
  const [lastEdit,setLastEdit]=useState(()=>{try{return Number(localStorage.getItem('hpp-last-edit')||0);}catch{return 0;}});
  const [lastExport,setLastExport]=useState(()=>{try{return Number(localStorage.getItem('hpp-last-export')||0);}catch{return 0;}});
  function noteExport(){const timestamp=Date.now();setLastExport(timestamp);try{localStorage.setItem('hpp-last-export',String(timestamp));}catch{/* browser storage may be restricted */}}
  const ready=useRef(false);
  const mounted=useRef(true);
  const queue=useRef<SaveQueue<Database>|null>(null);
  if(!queue.current)queue.current=createSaveQueue<Database>(save,event=>{
    if(!mounted.current)return;
    setSaving(event.state==='saving');
    setSaved(event.state==='saved');
    setSaveError(event.state==='error'?
      'Local save failed: '+event.error+'. Your latest edits may not survive a reload. Export a backup and retry saving.':'');
  });
  useEffect(()=>{mounted.current=true;load().then(value=>{
    if(value&&!validateBackup(value))throw new Error('Stored data has an unsupported or damaged format. No changes were made.');
    if(mounted.current){ready.current=true;setDb(value||emptyDatabase());}
  }).catch(e=>setFatal(String(e.message||e)));return ()=>{mounted.current=false;};},[]);
  useEffect(()=>{
    if(!ready.current||!db)return;
    // Writes are serialized; only the last committed revision may display "Saved".
    void queue.current?.enqueue(db).catch(()=>{});
  },[db]);
  useEffect(()=>{
    const warn=(event:BeforeUnloadEvent)=>{
      if(queue.current?.needsUnloadWarning()){
        event.preventDefault();
        event.returnValue='';
      }
    };
    window.addEventListener('beforeunload',warn);
    return()=>window.removeEventListener('beforeunload',warn);
  },[]);
  const patch=(fn:(current:Database)=>Database)=>{
    const timestamp=Date.now();setLastEdit(timestamp);
    try{localStorage.setItem('hpp-last-edit',String(timestamp));}catch{/* IndexedDB remains authoritative */}
    setDb(prev=>prev?fn(prev):prev);
  };
  const patchProject=(id:string, fn:(p:Project)=>Project)=>patch(d=>({...d,projects:d.projects.map(p=>p.id===id?{...fn(p),updatedAt:new Date().toISOString()}:p)}));
  const active=db?.projects.filter(p=>p.status!=='Completed')||[];
  const sorted=useMemo(()=>db?sortProjects(db.projects,today()):[],[db]);
  const actionable=sorted.filter(p=>['Active','Planned'].includes(p.status)&&p.blockedBy.every(id=>!db?.projects.some(x=>x.id===id&&x.status!=='Completed')));
  const project=db?.projects.find(p=>p.id===selected)||null;
  const month=today().slice(0,7);
  const monthPlan=active.flatMap(p=>p.futureCosts).filter(x=>x.dueDate.startsWith(month)).reduce((s,x)=>s+x.amountCents,0)||0;
  const spent=active.reduce((s,p)=>s+projectCost(p).spentCents,0);
  const forecast=active.reduce((s,p)=>s+projectCost(p).forecastCents,0);
  const waiting=active.filter(p=>p.status==='Waiting').length;
  const overdue=active.filter(p=>p.targetDate&&(dayDiff(p.targetDate,today())??0)<0).length;
  const serviceDue=db?.maintenance.filter(x=>dueMaintenance(x,today()).due||dueMaintenance(x,today()).soon).length||0;
  const shown=sorted.filter(p=>{
    if(category!=='All'&&p.category!==category)return false;
    if(query.trim()&&!`${p.name} ${p.nextAction} ${p.description}`.toLowerCase().includes(query.toLowerCase().trim()))return false;
    if(filter==='quick')return p.status!=='Completed'&&p.estimatedHours>0&&p.estimatedHours<=2;
    if(filter==='cheap')return isUnderBudgetRemaining(p);
    if(filter==='overdue')return p.status!=='Completed'&&!!p.targetDate&&(dayDiff(p.targetDate,today())??0)<0;
    if(filter==='waiting')return p.status==='Waiting';
    if(filter==='month')return p.futureCosts.some(x=>x.dueDate.startsWith(month));
    return true;
  });
  function navigate(next:Page){setSelected(null);setMaintenanceFocus('');setPage(next);window.scrollTo(0,0);}
  function goMaintenance(id:string){navigate('maintenance');setMaintenanceFocus(id);}
  function openSearchResult(result:SearchResult){
    setShowSearch(false);
    if(result.kind==='project')edit(result.id);
    else goMaintenance(result.kind==='equipment'?'equipment:'+result.id:result.id);
  }
  function quickCreate(req:QuickCaptureRequest){
    setShowQuick(false);
    if(req.kind==='project'){
      const p=newProject();p.name=req.title.slice(0,120);p.targetDate=req.dueDate;
      patch(d=>({...d,projects:[p,...d.projects]}));edit(p.id);return;
    }
    if(req.kind==='maintenance'){
      const m=newMaintenance();m.title=req.title;m.firstDueDate=req.dueDate;
      patch(d=>({...d,maintenance:[m,...d.maintenance]}));goMaintenance(m.id);return;
    }
    if(req.projectId&&db?.projects.some(p=>p.id===req.projectId)){
      patchProject(req.projectId,p=>({...p,tasks:[...p.tasks,{id:uid(),title:req.title,done:false,phase:'',dueDate:req.dueDate}]}));
      statusNotice('New step saved in the selected project.');
      navigate('overview');
    }
  }
  function installGuided(names:string[],keys:string[]){
    patch(d=>{
      const existing=new Set(d.equipment.map(e=>e.name.trim().toLocaleLowerCase('en-US')));
      const equipmentAdded=names.filter(n=>!existing.has(n.trim().toLocaleLowerCase('en-US'))).map(name=>({...newEquipment(),name}));
      const maintenanceAdded=MAINTENANCE_PRESETS.filter(p=>keys.includes(p.key)&&!isPresetInstalled(p,d.maintenance)).map(createFromPreset);
      return {...d,equipment:[...d.equipment,...equipmentAdded],maintenance:[...d.maintenance,...maintenanceAdded]};
    });
    setShowSetup(false);statusNotice('Selected equipment and maintenance routines added. Set real first due dates in Maintenance.');
  }
  function edit(id:string){setSelected(id);setEditorTab('plan');setPage('projects');window.scrollTo(0,0);}
  function create(){const p=newProject();p.name='Untitled project';patch(d=>({...d,projects:[p,...d.projects]}));edit(p.id);}
  function deleteProject(p:Project){if(window.confirm(`Delete “${p.name}” and all its tasks, expenses and attachments? This cannot be undone without a backup.`)){
    patch(d=>({...d,projects:d.projects.filter(x=>x.id!==p.id).map(x=>({...x,blockedBy:x.blockedBy.filter(id=>id!==p.id)})),maintenance:d.maintenance.map(m=>m.projectId===p.id?{...m,projectId:''}:m)}));setSelected(null);
  }}
  function statusNotice(message:string){setFlash(message);window.scrollTo({top:0,behavior:'smooth'});}
  function replaceBackup(value:Database){
    pauseSyncForLocalReplace();
    patch(()=>value);setSelected(null);navigate('overview');
    statusNotice('Backup restored. Existing data on this device was replaced after your confirmation.');
  }
  function mergeBackup(value:Database){
    patch(previous=>mergeNewRecords(previous,value).result);setSelected(null);
    statusNotice('Only new records were merged; existing IDs and edits were preserved.');
  }
  if(fatal)return <main className="startup"><h1>Local storage could not be opened</h1><p>{fatal}</p><p>The app will not overwrite your existing data. Check private browsing or browser storage settings, then reload.</p><button onClick={()=>location.reload()}>Try again</button></main>;
  if(!db)return <main className="startup"><h1>Home Project Planner</h1><p>Opening your local projects…</p></main>;
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">⌂</span><div><strong>Home Project</strong><span>PLANNER</span></div></div>
      <nav aria-label="Main navigation">{NAV.map(([id,label,icon])=><button key={id} onClick={()=>navigate(id)} className={page===id?'selected':''}><span aria-hidden="true">{icon}</span>{label}</button>)}</nav>
      <div className="side-note"><span className="status-dot"/> Offline-first workspace<small>Optional private household sync</small></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="top-left"><span className="top-kicker">PERSONAL WORKSPACE</span><span className="top-title">{page==='overview'?'Today':page==='projects'?'Projects':page==='maintenance'?'Maintenance':'Backup & data'}</span></div><div className="top-actions"><span className="save-indicator">{saveError?'⚠ Save error':saving?'Saving…':saved?'✓ Saved locally':'Preparing save…'}</span><button className="button secondary top-search-btn" onClick={()=>setShowSearch(true)}>⌕ Search</button><button className="button primary" onClick={()=>setShowQuick(true)}>+ Quick add</button></div></header>
      <main className="content">
        {db.demo&&<div className="demo-banner"><strong>Sample workspace</strong> — These are fictional projects and amounts. Start fresh under Backup & data before entering personal information. <button onClick={()=>navigate('data')}>Manage sample data</button></div>}
        {saveError&&<div role="alert" className="alert error">{saveError} <button onClick={()=>downloadBackup(db)}>Export backup</button> <button onClick={()=>{void queue.current?.enqueue(db).catch(()=>{});}}>Retry save</button></div>}
        {flash&&<div role="status" className="alert">{flash}<button onClick={()=>setFlash('')}>Dismiss</button></div>}
        {selected&&project?<ProjectEditor key={project.id} project={project} allProjects={db.projects} tab={editorTab} setTab={setEditorTab} patch={fn=>patchProject(project.id,fn)} back={()=>setSelected(null)} remove={()=>deleteProject(project)} alert={statusNotice}/>:
        page==='overview'?<>
          {showSetup&&<GuidedSetup equipment={db.equipment} maintenance={db.maintenance} onInstall={installGuided} onClose={()=>setShowSetup(false)}/>}
          <TodayDashboard projects={db.projects} maintenance={db.maintenance} onQuickAdd={()=>setShowQuick(true)} onSetup={()=>setShowSetup(true)} onOpenProject={edit} onOpenMaintenance={goMaintenance} onStepDone={(projectId,taskId)=>patchProject(projectId,p=>({...p,tasks:p.tasks.map(t=>t.id===taskId?{...t,done:true}:t)}))}/>
          <HomeReminders data={db}/>
          <details className="overview-more"><summary>Show all projects, estimates & financial overview</summary>
          <div className="stat-grid"><Stat label="Open projects" value={String(active.length)} sub={`${waiting} waiting on something`}/><Stat label="Spent on open projects" value={money(spent)} sub="Actual recorded purchases"/><Stat label="Current total forecast" value={money(forecast)} sub="Spent + remaining + contingency"/><Stat label="Dated plans this month" value={money(monthPlan)} sub="Excludes undated materials"/></div>
          <div className="section-heading"><div><h2>What should I work on?</h2><p>Actionable, unblocked projects ranked by a visible score or your override.</p></div><SmallBtn onClick={()=>navigate('projects')}>View all projects →</SmallBtn></div>
          {actionable.length?<div className="project-grid">{actionable.slice(0,4).map(p=><ProjectCard key={p.id} p={p} projects={db.projects} open={()=>edit(p.id)}/>)}</div>:<EmptyState title="Your projects start here" body="Add your first project, or load optional fictional examples in Backup & data." action="Create a project" onClick={create}/>}
          <div className="section-heading"><div><h2>Quick decisions</h2><p>Choose a constraint; see the projects that fit.</p></div></div>
          <div className="quick-grid">{([['quick','Finish in 2 hours','⌁',`${active.filter(p=>p.estimatedHours>0&&p.estimatedHours<=2).length} projects`],['cheap','Remaining under $100','$',`${active.filter(p=>isUnderBudgetRemaining(p)).length} projects`],['overdue','Overdue','!',`${overdue} projects`],['waiting','Waiting on others','◷',`${waiting} projects`],['month','Spending this month','▧',money(monthPlan)],['all','All projects','▤',`${db.projects.length} total`]] as [Filter,string,string,string][]).map(([key,name,icon,note])=><button className="quick-card" key={key} onClick={()=>{setFilter(key);navigate('projects');}}><span className="quick-icon">{icon}</span><strong>{name}</strong><small>{note}</small><span className="quick-arrow">↗</span></button>)}</div>
          {(db.maintenance.length>0||db.equipment.length>0)&&((!lastExport&&db.projects.length+db.maintenance.length+db.equipment.length>=3)||(lastEdit>lastExport&&Date.now()-lastExport>7*86400000))&&<div className="backup-nudge"><strong>Keep your home records safe</strong><span>{!lastExport?'No backup prepared on this device yet.':'Changes have been made since your last export.'}</span><button className="small-btn" onClick={()=>navigate('data')}>Backup / transfer →</button></div>}
          {serviceDue>0&&<div className="maintenance-callout"><span>◷</span><div><strong>{serviceDue} maintenance item(s) due or approaching</strong><p>Review planned servicing and warranties.</p></div><button className="button secondary" onClick={()=>navigate('maintenance')}>Review</button></div>}
                  </details>
        </>:page==='projects'?<>
          <div className="page-heading"><div><h1>All projects</h1><p>Simple plans, sensible spending, clear next actions.</p></div><button className="button primary" onClick={create}>+ Add project</button></div>
          <div className="toolbar"><input type="search" placeholder="Search projects or next actions…" aria-label="Search projects" value={query} onChange={e=>setQuery(e.target.value)}/><Select value={category} onChange={setCategory} options={['All',...CATEGORIES]}/></div>
          <div className="filter-chips" aria-label="Project filters">{([['all','All'],['quick','≤ 2 hours'],['cheap','Under $100'],['overdue','Overdue'],['waiting','Waiting'],['month','This month']] as [Filter,string][]).map(([key,title])=><button key={key} onClick={()=>setFilter(key)} className={filter===key?'active':''}>{title}</button>)}</div>
          <p className="results-note">{shown.length} project{shown.length===1?'':'s'} · Completed items are included in All · Under $100 uses known remaining estimates; projects without estimates are excluded</p>
          {shown.length?<div className="project-grid">{shown.map(p=><ProjectCard key={p.id} p={p} projects={db.projects} open={()=>edit(p.id)}/>)}</div>:<EmptyState title="No matching projects" body="Try a different filter or add a new project." action="Add project" onClick={create}/>}
        </>:page==='maintenance'?<MaintenanceView key={maintenanceFocus||equipmentDeepLink||'main'} equipmentDeepLink={equipmentDeepLink} focusId={maintenanceFocus} onOpenProject={edit} items={db.maintenance} projects={db.projects} equipment={db.equipment} change={fn=>patch(d=>({...d,maintenance:fn(d.maintenance)}))} changeEquipment={fn=>patch(d=>({...d,equipment:fn(d.equipment)}))} unlinkEquipment={id=>patch(d=>({...d,maintenance:d.maintenance.map(m=>m.equipmentId===id?{...m,equipmentId:''}:m)}))} />:
          <div className="data-page"><div className="page-heading"><div><h1>Keep your plans safe.</h1><p>Your data starts in this browser, on this device. Optional household sync is available below.</p></div><a className="small-btn" href="#household-sync">Household sync ↓</a></div>
            <BackupTransfer data={db} lastEdit={lastEdit} lastExport={lastExport} onPrepared={noteExport} onReplace={replaceBackup} onMerge={mergeBackup}/>
            <section className="panel"><h2>Workspace controls</h2><p>Need an example before starting? Load fictional projects and comparisons. This replaces the current workspace.</p><div className="action-line"><button className="button secondary" onClick={()=>{if(window.confirm('Replace all current data with fictional demo projects? Export first. This pauses household cloud sync so the demo will NOT replace shared data.')){pauseSyncForLocalReplace();patch(()=>demoData());setSelected(null);statusNotice('Fictional demo workspace loaded.');}}}>Load demo workspace</button><button className="button danger" onClick={()=>{if(window.confirm('Permanently clear this device’s local projects, maintenance and equipment? Export a backup first. This pauses cloud sync; shared household data will NOT be deleted.')){pauseSyncForLocalReplace();patch(()=>emptyDatabase());setSelected(null);statusNotice('Local workspace cleared.');}}}>Clear all data</button></div></section>
            <section className="panel"><h2>How your data works</h2><ul className="help-list"><li>Stored in this browser’s IndexedDB database; GitHub Pages does not receive your records.</li><li>Browsers and devices store separate local copies unless you sign into the same household and explicitly enable automatic sync.</li><li>Clearing browser data can erase local records. Export backups regularly. Loading demo data, restoring a backup or clearing this device intentionally pauses automatic sync.</li><li>Photos and PDFs are embedded in the JSON backup. Large attachments make backups larger.</li><li>Exports are created on-device. With household sync enabled, selected household records are sent privately to Supabase. No bank access or purchase automation.</li></ul></section>
          </div>}
        {/* Remain mounted across all pages so automatic synchronization can run while the app is open. */}
        <div hidden={page!=='data'} id="household-sync">
          <HouseholdSync data={db} onReplace={value=>{
            if(validateBackup(value))patch(()=>value);
            else statusNotice('Cloud copy failed validation; local data was not changed.');
          }}/>
        </div>
      </main>
    </div>
    {showQuick&&<QuickCapture projects={db.projects} onCreate={quickCreate} onClose={()=>setShowQuick(false)}/>}
    {showSearch&&<HomeSearch data={db} onOpen={openSearchResult} onClose={()=>setShowSearch(false)}/>}
    <nav className="mobile-nav" aria-label="Mobile navigation">{NAV.map(([id,label,icon])=><button key={id} onClick={()=>navigate(id)} className={page===id?'selected':''}><span>{icon}</span><small>{label==='Backup & data'?'Backup':label}</small></button>)}</nav>
  </div>;
}

function ProjectCard({p,projects,open}:{p:Project;projects:Project[];open:()=>void}){
  const score=priority(p,projects,today()), costs=projectCost(p), todo=p.tasks.filter(t=>!t.done).length;
  return <button onClick={open} className="project-card"><div className="card-top"><div className="category-icon">{ICONS[p.category]}</div><Chip tone={p.status==='Active'?'green':p.status==='Waiting'?'amber':p.status==='Completed'?'muted':'neutral'}>{p.status}</Chip></div>
    <strong className="project-name">{p.name}</strong><span className="category-name">{p.category}</span>
    <p className="next-action"><span>Next action</span>{p.nextAction||'Set the next action →'}</p>
    <div className="project-metrics"><span><b>{money(costs.spentCents)}</b> spent</span><span><b>{money(p.budgetCents)}</b> budget</span><span><b>{p.estimatedHours||'—'}h</b> estimate</span></div>
    <div className="card-bottom"><span className="priority-bubble">{p.override==='first'?'↑ Do first':p.override==='later'?'↓ Do later':`${score.score} pts priority`}</span><span>{todo} open step{todo===1?'':'s'} <span aria-hidden>→</span></span></div>
  </button>;
}
function EmptyState({title,body,action,onClick}:{title:string;body:string;action:string;onClick:()=>void}){
  return <div className="empty"><div className="empty-icon">⌂</div><h3>{title}</h3><p>{body}</p><button className="button primary" onClick={onClick}>{action}</button></div>;
}

type EntryField<T>={key:keyof T;label:string;kind?:'money'|'number'|'date'|'checkbox'|'url'|'text';wide?:boolean};
function EntryRows<T extends {id:string}>({items,fields,onChange,onAdd,onRemove,empty,addLabel}:{items:T[];fields:EntryField<T>[];onChange:(items:T[])=>void;onAdd?:(item:T)=>void;onRemove?:(id:string)=>void;empty:()=>T;addLabel:string}){
  function update(id:string,key:keyof T,value:unknown){onChange(items.map(x=>x.id===id?{...x,[key]:value}:x));}
  return <div className="entry-list">{items.length===0&&<p className="subtle">Nothing added yet.</p>}
    {items.map((item,index)=><div key={item.id} className="entry-row"><div className="entry-index">{index+1}</div><div className="entry-fields">{fields.map(f=><label key={String(f.key)} className={`field ${f.wide?'wide':''} ${f.kind==='checkbox'?'check-field':''}`}><span>{f.label}</span>{f.kind==='checkbox'?<input type="checkbox" checked={Boolean(item[f.key])} onChange={e=>update(item.id,f.key,e.target.checked)}/>:f.kind==='money'?<CurrencyInput value={Number(item[f.key])} onChange={v=>update(item.id,f.key,v)}/>:<input type={f.kind==='number'?'number':f.kind==='date'?'date':f.kind==='url'?'url':'text'} min={f.kind==='number'?'0':undefined} step={f.kind==='number'?'any':undefined} value={String(item[f.key]??'')} onChange={e=>update(item.id,f.key,f.kind==='number'?num(e.target.value):e.target.value)} />}</label>)}</div><button className="icon-delete" aria-label={`Remove item ${index+1}`} title="Remove row" onClick={()=>onRemove?onRemove(item.id):onChange(items.filter(x=>x.id!==item.id))}>×</button></div>)}
    <button className="add-row" onClick={()=>{const item=empty();onAdd?onAdd(item):onChange([...items,item]);}}>+ {addLabel}</button>
  </div>;
}

function ProjectEditor({project:p,allProjects,tab,setTab,patch,back,remove,alert}:{project:Project;allProjects:Project[];tab:EditorTab;setTab:(v:EditorTab)=>void;patch:(fn:(p:Project)=>Project)=>void;back:()=>void;remove:()=>void;alert:(s:string)=>void}){
  const cost=projectCost(p), score=priority(p,allProjects,today());
  const blockedNames=p.blockedBy.map(id=>allProjects.find(x=>x.id===id)?.name).filter(Boolean);
  const set=<K extends keyof Project>(key:K,value:Project[K])=>patch(x=>({...x,[key]:value}));
  const tabs:[EditorTab,string][]=[['plan','Plan'],['tasks','Steps'],['budget','Budget'],['materials','Materials'],['decisions','Compare'],['files','Files']];
  async function attach(e:ChangeEvent<HTMLInputElement>){const files=e.target.files;if(!files)return;
    try {for(const file of Array.from(files)){const data=await attachmentFromFile(file);const item:Attachment={id:uid(),name:file.name,mime:data.mime,dataUrl:data.dataUrl,date:today()};patch(x=>({...x,attachments:[...x.attachments,item]}));}}
    catch(err){alert(err instanceof Error?err.message:String(err));}e.target.value='';}
  return <div className="editor">
    <button className="back-link" onClick={back}>← Back to projects</button>
    <div className="editor-header"><div><div className="tagline">{p.category} <span>·</span> Last updated {shortDate(p.updatedAt.slice(0,10))}</div><h1>{p.name||'Untitled project'}</h1><div className="header-tags"><Chip tone={p.status==='Active'?'green':p.status==='Waiting'?'amber':'neutral'}>{p.status}</Chip><Chip>{p.override==='auto'?`Priority ${score.score}`:p.override==='first'?'Manual: Do first':'Manual: Do later'}</Chip>{blockedNames.length>0&&<Chip tone="amber">Blocked by {blockedNames.join(', ')}</Chip>}</div></div><button className="button danger-outline" onClick={remove}>Delete project</button></div>
    <div className="editor-tabs" role="tablist" aria-label="Project sections">{tabs.map(([id,label])=><button role="tab" aria-selected={tab===id} className={tab===id?'active':''} key={id} onClick={()=>setTab(id)}>{label}</button>)}</div>
    {tab==='plan'&&<div className="two-column"><section className="panel"><div className="panel-heading"><h2>Project details</h2><p>Capture the essentials, not paperwork.</p></div><div className="form-grid">
      <TextField label="Project name"><input value={p.name} onChange={e=>set('name',e.target.value)} maxLength={120}/></TextField>
      <TextField label="Category"><Select value={p.category} onChange={v=>set('category',v as Project['category'])} options={CATEGORIES}/></TextField>
      <TextField label="Status"><Select value={p.status} onChange={v=>set('status',v as Project['status'])} options={STATUSES}/></TextField>
      <TextField label="Target date"><input type="date" value={p.targetDate} onChange={e=>set('targetDate',e.target.value)}/></TextField>
      <TextField label="Estimated time (hours)"><input type="number" min="0" step="0.5" value={p.estimatedHours} onChange={e=>set('estimatedHours',num(e.target.value))}/></TextField>
      <TextField label="Ranking preference"><Select value={p.override} onChange={v=>set('override',v as Project['override'])} options={['auto','first','later']}/></TextField>
      <TextField label="Next action"><input placeholder="What is the very next thing to do?" value={p.nextAction} onChange={e=>set('nextAction',e.target.value)}/></TextField>
      <TextField label="Description / notes"><textarea rows={4} value={p.description} placeholder="Scope, decisions, links, constraints…" onChange={e=>set('description',e.target.value)}/></TextField>
    </div></section><div className="stack"><section className="panel"><div className="panel-heading"><h2>Priority, explained</h2><p>Factors from 0 (low) to 4 (high), with no AI guesswork.</p></div>
      {([['urgency','Safety / urgency'],['financialImpact','Financial impact'],['importance','Personal importance']] as [keyof Pick<Project,'urgency'|'financialImpact'|'importance'>,string][]).map(([key,label])=><label className="range-field" key={key}><div><span>{label}</span><strong>{p[key]}/4</strong></div><input type="range" min="0" max="4" value={p[key]} onChange={e=>set(key,num(e.target.value))}/></label>)}
      <div className="score-line"><strong>{score.score}</strong><span>automatic points</span></div><div className="reason-list">{score.reasons.map((r,i)=><span key={i}>{r}</span>)}</div><p className="hint">Manual “Do first” and “Do later” override ranking groups, not the calculation. Completed projects remain visible but not in the work-next suggestions.</p></section>
      <section className="panel"><h2>Dependencies</h2><p className="subtle">Mark projects that need finishing before this one.</p><div className="dependency-list">{allProjects.filter(x=>x.id!==p.id&&x.status!=='Completed').map(other=>{
 const cyclical=!p.blockedBy.includes(other.id)&&wouldCreateDependencyCycle(allProjects,p.id,other.id);
 return <label key={other.id} title={cyclical?'Would create a circular dependency':''}>
 <input type="checkbox" disabled={cyclical} checked={p.blockedBy.includes(other.id)}
 onChange={e=>set('blockedBy',e.target.checked?[...p.blockedBy,other.id]:p.blockedBy.filter(x=>x!==other.id))}/>
 <span>{other.name}{cyclical?' · Cannot link (circular)':''}</span></label>;
})}{allProjects.length<=1&&<p className="subtle">Other projects will appear here.</p>}</div></section></div></div>}
    {tab==='tasks'&&<section className="panel"><div className="panel-heading"><h2>Steps and checklists</h2><p>Optional phases keep the work organized. Mark steps done as you finish.</p></div><div className="task-summary">{p.tasks.filter(t=>t.done).length}/{p.tasks.length} completed <div className="progress"><span style={{width:`${p.tasks.length?100*p.tasks.filter(x=>x.done).length/p.tasks.length:0}%`}}/></div></div>
      <div className="task-list">{p.tasks.map(t=><div key={t.id} className="task-item"><input type="checkbox" aria-label={`Complete ${t.title}`} checked={t.done} onChange={e=>set('tasks',p.tasks.map(x=>x.id===t.id?{...x,done:e.target.checked}:x))}/><input className={t.done?'done':''} aria-label="Step name" value={t.title} onChange={e=>set('tasks',p.tasks.map(x=>x.id===t.id?{...x,title:e.target.value}:x))} placeholder="What needs doing?"/><input aria-label="Phase" placeholder="Phase (optional)" value={t.phase} onChange={e=>set('tasks',p.tasks.map(x=>x.id===t.id?{...x,phase:e.target.value}:x))}/><input aria-label="Step due date" type="date" value={t.dueDate} onChange={e=>set('tasks',p.tasks.map(x=>x.id===t.id?{...x,dueDate:e.target.value}:x))}/><button aria-label="Delete step" className="icon-delete" onClick={()=>set('tasks',p.tasks.filter(x=>x.id!==t.id))}>×</button></div>)}</div>
      <button className="add-row" onClick={()=>set('tasks',[...p.tasks,{id:uid(),title:'',done:false,phase:'',dueDate:''}])}>+ Add a step</button><div className="next-action-panel"><strong>Next action — shown on your dashboard</strong><input value={p.nextAction} placeholder="e.g. Call for a second quote" onChange={e=>set('nextAction',e.target.value)}/></div>
    </section>}
    {tab==='budget'&&<div className="stack"><div className="budget-grid"><Stat label="Actually spent" value={money(cost.spentCents)}/><Stat label="Committed, not paid" value={money(cost.committedCents)}/><Stat label="Future estimates" value={money(cost.estimatedCents)}/><Stat label="Total forecast" value={money(cost.forecastCents)} sub={`Including ${money(cost.contingencyCents)} contingency`}/></div>
      <section className="panel"><div className="panel-heading"><h2>Budget & forecast</h2><p>Quotes are comparisons, not automatic expenses. Purchases count once as actual expenses.</p></div><div className="form-grid thirds"><TextField label="Budget"><CurrencyInput value={p.budgetCents} onChange={v=>set('budgetCents',v)}/></TextField><TextField label="Unpaid labor estimate"><CurrencyInput value={p.laborEstimateCents} onChange={v=>set('laborEstimateCents',v)}/></TextField><TextField label="Contingency %"><input type="number" min="0" max="100" value={p.contingencyPercent} onChange={e=>set('contingencyPercent',clamp(Number(e.target.value),0,100))}/></TextField></div>
      <div className="budget-breakdown">{[['Budget',p.budgetCents],['Actual spent',cost.spentCents],['Future committed',cost.committedCents],['Future estimates',cost.estimatedCents],['Contingency',cost.contingencyCents],['Forecast',cost.forecastCents],['Headroom vs budget',cost.forecastHeadroomCents]].map(([label,value])=><div key={String(label)} className={label==='Forecast'?'strong':''}><span>{label}</span><b className={Number(value)<0?'negative':''}>{money(Number(value))}</b></div>)}</div>
      <p className="hint">Forecast = spent + commitments + unpurchased materials + labor estimate + planned future expenses + contingency on unpaid costs. Estimates, quotes, and material purchase flags are never treated as cash spent.</p></section>
      <section className="panel"><h2>Actual purchases & payments</h2><p className="subtle">Record each payment once, including purchased materials. Nothing here is imported from banking.</p><EntryRows<Expense> items={p.expenses} onChange={v=>set('expenses',v)} addLabel="Record expense" empty={()=>({id:uid(),title:'',amountCents:0,date:today(),notes:''})} fields={[{key:'title',label:'What was paid for?',wide:true},{key:'amountCents',label:'Amount',kind:'money'},{key:'date',label:'Date',kind:'date'},{key:'notes',label:'Notes',wide:true}]}/></section>
      <section className="panel"><h2>Future expenses & commitments</h2><p className="subtle">Enter each cost here only if it is not already counted in materials or labor. Mark committed when you have agreed to pay but have not paid yet. Add a date for monthly planning.</p><EntryRows<FutureCost> items={p.futureCosts} onChange={v=>set('futureCosts',v)} addLabel="Add future cost" empty={()=>({id:uid(),title:'',amountCents:0,committed:false,dueDate:''})} fields={[{key:'title',label:'Description',wide:true},{key:'amountCents',label:'Estimated amount',kind:'money'},{key:'committed',label:'Committed',kind:'checkbox'},{key:'dueDate',label:'Expected date',kind:'date'}]}/></section>
    </div>}
    {tab==='materials'&&<section className="panel"><h2>Shopping & materials</h2><p className="subtle">Set your own prices and preferred store. Mark as purchased to remove it from the unpaid estimate; record the actual transaction in Budget → Actual purchases.</p><div className="materials-summary"><span><b>{p.materials.filter(x=>x.purchased).length}/{p.materials.length}</b> bought</span><span><b>{money(cost.materialsCents)}</b> still estimated</span></div>
      <EntryRows<Material> items={p.materials} onChange={v=>set('materials',v)} addLabel="Add material" empty={()=>({id:uid(),title:'',quantity:1,unitCents:0,store:'',url:'',purchased:false,notes:''})} fields={[{key:'title',label:'Material / item',wide:true},{key:'quantity',label:'Quantity',kind:'number'},{key:'unitCents',label:'Unit price',kind:'money'},{key:'store',label:'Preferred store'},{key:'purchased',label:'Purchased',kind:'checkbox'},{key:'url',label:'Product URL',kind:'url',wide:true},{key:'notes',label:'Notes',wide:true}]}/>
      {p.materials.some(m=>m.purchased)&&<p className="hint">Purchased items are excluded from remaining materials. Ensure their actual cost has been entered under Budget; checking Purchased does not record a payment.</p>}
      <div className="product-links">{p.materials.filter(x=>safeLink(x.url)).map(x=><a key={x.id} target="_blank" rel="noopener noreferrer" href={safeLink(x.url)}>{x.title||'Product'} ↗</a>)}</div>
    </section>}
    {tab==='decisions'&&<div className="stack"><section className="panel"><h2>Compare written quotes</h2><p className="subtle">Quotes are reference options only and never add to your budget totals until you enter a payment or planned expense.</p><EntryRows<Quote> items={p.quotes} onChange={v=>set('quotes',v)} addLabel="Add quote" empty={()=>({id:uid(),vendor:'',description:'',amountCents:0,received:today(),url:'',notes:''})} fields={[{key:'vendor',label:'Vendor'},{key:'description',label:'Scope',wide:true},{key:'amountCents',label:'Quoted amount',kind:'money'},{key:'received',label:'Received',kind:'date'},{key:'url',label:'Quote URL',kind:'url',wide:true},{key:'notes',label:'Assumptions / exclusions',wide:true}]}/>
        {p.quotes.filter(x=>safeLink(x.url)).map(x=><a className="external-link" target="_blank" rel="noopener noreferrer" key={x.id} href={safeLink(x.url)}>{x.vendor||'Quote'} link ↗</a>)}
      </section><section className="panel"><div className="panel-heading"><h2>Repair vs. replace calculator</h2><p>Use any named options: repair, postpone, second opinion, replace or finance. Every amount is entered by you.</p></div><div className="calc-disclosure"><strong>How the calculator works</strong><p>Total = cash today + upfront finance fees + estimated later costs + all loan payments. A financed principal is not also counted as cash today. Fixed APR is divided by 12; payments are amortized over the entered months. Calculations round monthly payment to cents; actual lenders may adjust the final payment. Taxes, insurance, maintenance, resale value, timing, uncertainty and safety consequences are excluded unless included in your manual costs.</p></div>
        {p.options.length>0&&<div className="decision-results">{p.options.map(x=>{const value=decisionCost(x);return <div className="decision-result" key={x.id}><span>{x.label||'Untitled scenario'}</span><strong>{money(value.totalCents)}</strong><small>{x.financedCents>0&&x.months===0?'Loan months needed; interest not estimated':x.financedCents>0?`${money(value.paymentCents)}/mo × ${x.months} · ${money(value.interestCents)} interest`:'No financing entered'}</small></div>})}</div>}
        <EntryRows<DecisionOption> items={p.options} onChange={v=>set('options',v)} addLabel="Add comparison option" empty={()=>({id:uid(),label:'',cashTodayCents:0,financedCents:0,aprPercent:0,months:0,financeFeesCents:0,futureCostsCents:0,notes:''})} fields={[{key:'label',label:'Option name',wide:true},{key:'cashTodayCents',label:'Cash paid today',kind:'money'},{key:'financedCents',label:'Loan principal',kind:'money'},{key:'aprPercent',label:'APR %',kind:'number'},{key:'months',label:'Loan months',kind:'number'},{key:'financeFeesCents',label:'Upfront financing fees',kind:'money'},{key:'futureCostsCents',label:'Other future costs',kind:'money'},{key:'notes',label:'Assumptions / safety questions',wide:true}]}/>
        <p className="hint">A lower calculated total does not establish that an option is safe, appropriate, or financially optimal. Ask a qualified mechanic or contractor about whether postponement is safe. For financing, confirm the actual lender’s APR, fees, and schedule.</p>
      </section></div>}
    {tab==='files'&&<section className="panel"><h2>Photos, receipts & documents</h2><p className="subtle">Photos are resized to fit local storage. PDF files are limited to 2 MB; JPG, PNG and WebP are supported. Files stay on this device and are included in exported JSON backups.</p><label className="button secondary file-label">+ Attach files<input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*" onChange={attach}/></label>
      <div className="attachment-grid">{p.attachments.map(a=><div className="attachment" key={a.id}>{a.mime.startsWith('image/')?<img src={a.dataUrl} alt={a.name}/>:<div className="pdf-icon">PDF</div>}<strong title={a.name}>{a.name}</strong><small>{shortDate(a.date)}</small><div><a download={a.name} href={a.dataUrl}>Save copy</a><SmallBtn danger onClick={()=>set('attachments',p.attachments.filter(x=>x.id!==a.id))}>Remove</SmallBtn></div></div>)}</div>
      {!p.attachments.length&&<p className="subtle">No attachments yet. Add a photo, receipt, quote PDF, or equipment label.</p>}</section>}
  </div>;
}

function MaintenanceView({items,projects,equipment,focusId,equipmentDeepLink,onOpenProject,change,changeEquipment,unlinkEquipment}:{items:MaintenanceItem[];projects:Project[];equipment:EquipmentItem[];focusId:string;equipmentDeepLink:string;onOpenProject:(id:string)=>void;change:(fn:(items:MaintenanceItem[])=>MaintenanceItem[])=>void;changeEquipment:(fn:(items:EquipmentItem[])=>EquipmentItem[])=>void;unlinkEquipment:(id:string)=>void}){
 const [selected,setSelected]=useState<string|null>(focusId.startsWith('equipment:')?null:focusId||null);
 const [showPresets,setShowPresets]=useState(false);
 const [section,setSection]=useState<'upcoming'|'tasks'|'history'|'reference'>('upcoming');
 const [presetMode,setPresetMode]=useState<'home'|'seasonal'>('home');
 const [completing,setCompleting]=useState<string|null>(null);
 const [showEquipment,setShowEquipment]=useState(Boolean(equipmentDeepLink||focusId.startsWith('equipment:')));
 const [equipmentFocus,setEquipmentFocus]=useState(focusId.startsWith('equipment:')?focusId.slice('equipment:'.length):equipmentDeepLink);
 const [picks,setPicks]=useState<string[]>(()=>MAINTENANCE_PRESETS.filter(p=>p.defaultSelected).map(p=>p.key));
 const [notice,setNotice]=useState('');
 const item=items.find(m=>m.id===selected);
 function patch(id:string,fn:(m:MaintenanceItem)=>MaintenanceItem){change(rows=>rows.map(x=>x.id===id?fn(x):x));}
 function add(){const m=newMaintenance();m.title='New maintenance item';change(rows=>[m,...rows]);setSelected(m.id);}
 function recordRestock(id:string,partId:string,requested:number){
  const found=items.find(m=>m.id===id)?.supplies.find(p=>p.id===partId);
  if(!found||requested<1||!Number.isSafeInteger(requested))return;
  if(!window.confirm('Record '+requested+' additional '+(found.name||'part')+' as on hand? This does not record a payment.'))return;
  try {
    patch(id,m=>({...m,supplies:m.supplies.map(p=>p.id===partId?{...p,onHand:stockAfterRestock(p.onHand,requested)}:p)}));
    setNotice('Inventory updated. Add any actual spending separately in a project.');
  }catch(e){setNotice(e instanceof Error?e.message:'Could not update stock.');}
 }
 function markDone(id:string){setNotice('');setCompleting(id);}
 function finishCompletion(details:CompletionDetails){
  const id=completing;
  if(!id)return;
  change(rows=>rows.map(m=>m.id===id?completeService(m,details):m));
  setCompleting(null);setNotice('Completed service saved. The next due date has been recalculated from the logged date.');
 }
 function openPresets(mode:'home'|'seasonal'){
  setSection('tasks');setPresetMode(mode);setShowPresets(true);
  setPicks(mode==='home'?MAINTENANCE_PRESETS.filter(p=>p.defaultSelected).map(p=>p.key):[]);
 }
 const available=MAINTENANCE_PRESETS.filter(p=>!isPresetInstalled(p,items));
 const visibleGroups=presetMode==='seasonal'?['Spring','Summer','Fall','Winter']:['Everyday home','Home equipment & outdoors','Only if installed'];
 const count=picks.filter(k=>available.some(p=>p.key===k&&visibleGroups.includes(p.group))).length;
 function installPresets(){const newItems=available.filter(p=>picks.includes(p.key)&&visibleGroups.includes(p.group)).map(createFromPreset);if(!newItems.length)return;change(rows=>[...rows,...newItems]);setShowPresets(false);setPicks([]);setNotice(`Added ${newItems.length} suggested routines. Set a first due date or log the real last service for each.`);}
 function info(m:MaintenanceItem){const d=dueMaintenance(m,today());return d.due?{label:'Due',tone:'red'}:d.soon?{label:'Soon',tone:'amber'}:!d.dueDate&&d.dueHours===null?{label:'Set first date',tone:'neutral'}:{label:'Scheduled',tone:'green'};}
 function rank(m:MaintenanceItem){const v=info(m).label;return v==='Due'?0:v==='Soon'?1:v==='Set first date'?2:3;}
 const sorted=[...items].sort((a,b)=>rank(a)-rank(b)||(dueMaintenance(a,today()).dueDate||'9999').localeCompare(dueMaintenance(b,today()).dueDate||'9999')||a.title.localeCompare(b.title));
 if(showEquipment)return <EquipmentInventory key={equipmentFocus||'all'} items={equipment} maintenance={items} change={changeEquipment} unlink={unlinkEquipment} initialSelected={equipmentFocus||undefined} onBack={()=>{setShowEquipment(false);setEquipmentFocus('');}}/>;
 if(completing){const selectedItem=items.find(m=>m.id===completing);
  if(selectedItem)return <MaintenanceCompletion key={completing} item={selectedItem} onSave={finishCompletion} onCancel={()=>setCompleting(null)}/>;
 }
 if(item){const due=dueMaintenance(item,today()),state=info(item);return <div>
  <button className="back-link" onClick={()=>{setSelected(null);setNotice('');}}>← All maintenance</button>
  <div className="page-heading"><div><h1>{item.title}</h1><p>Track real maintenance, without invented due dates.</p></div><div className="action-line"><button className="button primary" onClick={()=>markDone(item.id)}>✓ Done today</button><button className="button danger-outline" onClick={()=>{if(confirm(`Delete “${item.title}” and its maintenance history?`)){change(rows=>rows.filter(x=>x.id!==item.id));setSelected(null);}}}>Delete</button></div></div>
  {notice&&<div role="status" className="maintenance-notice">{notice} <button onClick={()=>setNotice('')}>Dismiss</button></div>}
  <div className="two-column"><section className="panel"><h2>Maintenance schedule</h2><div className="form-grid">
  <TextField label="Item / service"><input value={item.title} onChange={e=>patch(item.id,x=>({...x,title:e.target.value}))}/></TextField>
  <TextField label="Equipment / area"><input value={item.asset} onChange={e=>patch(item.id,x=>({...x,asset:e.target.value}))}/></TextField>
  <TextField label="Standalone model number (optional)"><input value={item.modelNumber||""} placeholder="Model number from appliance label" onChange={e=>patch(item.id,x=>({...x,modelNumber:e.target.value}))}/></TextField>
  <TextField label="Category"><Select value={item.category} onChange={v=>patch(item.id,x=>({...x,category:v as MaintenanceItem['category']}))} options={CATEGORIES}/></TextField>
  <TextField label="Linked equipment (optional)"><select value={item.equipmentId||''} onChange={e=>patch(item.id,x=>({...x,equipmentId:e.target.value}))}><option value="">No linked equipment</option>{equipment.map(e=><option key={e.id} value={e.id}>{e.name||'Unnamed equipment'}{e.model?' · '+e.model:''}</option>)}</select></TextField>
  {item.equipmentId&&<div className="equipment-context"><button className="small-btn" onClick={()=>{setEquipmentFocus(item.equipmentId);setShowEquipment(true);}}>View equipment & label photos →</button></div>}
  <TextField label="Linked project (optional)"><select value={item.projectId} onChange={e=>patch(item.id,x=>({...x,projectId:e.target.value}))}><option value="">None</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></TextField>
  <TextField label="Repeat every N calendar months" tip="1 = monthly · 4 = every four months · 12 = annually"><input type="number" min="0" max="120" value={item.intervalMonths??0} onChange={e=>patch(item.id,x=>({...x,intervalMonths:Math.min(120,num(e.target.value)),intervalDays:num(e.target.value)>0?0:x.intervalDays}))}/></TextField>
  <TextField label="Or repeat every N days"><input type="number" min="0" value={item.intervalDays} onChange={e=>patch(item.id,x=>({...x,intervalDays:num(e.target.value),intervalMonths:num(e.target.value)>0?0:x.intervalMonths}))}/></TextField>
  <TextField label="First due date" tip="Set an upcoming date without marking a service completed."><input type="date" value={item.firstDueDate??''} onChange={e=>patch(item.id,x=>({...x,firstDueDate:e.target.value}))}/></TextField>
  <TextField label="Or every N hours / miles"><input type="number" min="0" value={item.intervalHours} onChange={e=>patch(item.id,x=>({...x,intervalHours:num(e.target.value)}))}/></TextField>
  <TextField label="Current usage (hours or miles)"><input type="number" min="0" value={item.currentHours??''} placeholder="Optional" onChange={e=>patch(item.id,x=>({...x,currentHours:e.target.value===''?null:num(e.target.value)}))}/></TextField>
  <TextField label="Warranty expires"><input type="date" value={item.warrantyUntil} onChange={e=>patch(item.id,x=>({...x,warrantyUntil:e.target.value}))}/></TextField>
  <TextField label="Instructions / notes"><textarea value={item.notes} rows={5} onChange={e=>patch(item.id,x=>({...x,notes:e.target.value}))}/></TextField>
  </div></section><div className="stack">
  <section className="panel"><h2>Next service</h2><div className="due-block"><Chip tone={state.tone}>{state.label}</Chip><h3>{due.dueDate?shortDate(due.dueDate):'No date scheduled yet'}</h3><p>{due.dueHours===null?'No usage interval':'Due at usage: '+due.dueHours}</p><p className="subtle">Enter the first due date or log the real last service date below. Following a completed service, recurrence counts from that completion date.</p></div></section>
  <MaintenancePartsEditor key={item.id} item={item} change={parts=>patch(item.id,x=>({...x,supplies:parts}))} restock={(partId,count)=>recordRestock(item.id,partId,count)}/>
  <section className="panel"><h2>Service history</h2><p className="subtle">Use “Done today” above for guided logging with a receipt and optional part deductions. Manual entries stay available for older service records.</p><EntryRows<ServiceEntry> items={item.entries} onChange={rows=>patch(item.id,x=>({...x,entries:rows}))} addLabel="Log completed service" empty={()=>({id:uid(),date:today(),hours:item.currentHours,costCents:0,notes:''})} fields={[{key:'date',label:'Service date',kind:'date'},{key:'hours',label:'Usage at service',kind:'number'},{key:'costCents',label:'Paid',kind:'money'},{key:'notes',label:'Work done',wide:true}]}/>
  {item.entries.some(e=>e.receipt||(e.usedSupplies?.length??0)>0)&&<div className="service-extra-history"><h3>Recorded receipts & supplies</h3>{item.entries.filter(e=>e.receipt||(e.usedSupplies?.length??0)>0).map(e=><div className="service-extra-row" key={e.id}><strong>{e.date}</strong><span>{e.usedSupplies?.map(u=>(item.supplies.find(p=>p.id===u.partId)?.name||'Previously saved part')+' × '+u.quantity).join(', ')||'No parts specified'}{e.stockDeducted?' · stock adjusted':''}</span>{e.receipt&&<a download={e.receipt.name} href={e.receipt.dataUrl}>Receipt: {e.receipt.name} ↧</a>}</div>)}</div>}
  </section>
  </div></div></div>;}
 return <div>
  <div className="page-heading"><div><h1>Stay ahead of maintenance.</h1><p>Track household routines locally, with optional household synchronization.</p></div><div className="action-line"><button className="button secondary" onClick={()=>{setEquipmentFocus('');setShowEquipment(true);}}>▣ Equipment ({equipment.length})</button><button className="button secondary" onClick={()=>showPresets&&presetMode==='home'&&section==='tasks'?setShowPresets(false):openPresets('home')}>{showPresets&&presetMode==='home'?'Close suggestions':'+ Household checklist'}</button><button className="button primary" onClick={add}>+ Custom task</button></div></div>
  {notice&&<div className="maintenance-notice" role="status">{notice} <button onClick={()=>setNotice('')}>Dismiss</button></div>}
  <div className="maintenance-summary"><span><strong>{items.filter(m=>dueMaintenance(m,today()).due).length}</strong> due now</span><span><strong>{items.filter(m=>dueMaintenance(m,today()).soon).length}</strong> coming up</span><span><strong>{items.filter(m=>{const d=dueMaintenance(m,today());return !d.dueDate&&d.dueHours===null;}).length}</strong> need first date</span></div>

  <div className="maintenance-sections" role="group" aria-label="Maintenance views">
   <button className={section==='upcoming'?'active':''} onClick={()=>setSection('upcoming')}>Upcoming & supplies</button>
   <button className={section==='tasks'?'active':''} onClick={()=>setSection('tasks')}>All routines ({items.length})</button>
   <button className={section==='history'?'active':''} onClick={()=>setSection('history')}>History & spending</button>
   <button className={section==='reference'?'active':''} onClick={()=>setSection('reference')}>Home reference</button>
  </div>
  {section==='upcoming'&&<>  <MaintenanceAgenda items={items} open={id=>{setNotice('');setSelected(id);}} complete={markDone} openSeasonal={()=>openPresets('seasonal')}/>
  <MaintenanceShoppingPanel items={items} restock={recordRestock} open={id=>{setNotice("");setSelected(id);}}/>
</>}
  {section==='tasks'&&<>  {showPresets&&<section className="panel maintenance-templates"><h2>{presetMode==='seasonal'?'Choose seasonal home routines':'Choose household routines'}</h2><p className="subtle">All frequencies can be edited. Adding does not imply equipment ownership, completed work, or a due date. Existing records won't be replaced. For seasonal tasks, set your preferred first due date in the appropriate season.</p>
   {visibleGroups.map(group=><div className="preset-group" key={group}><h3>{group}</h3><div className="preset-list">{MAINTENANCE_PRESETS.filter(p=>p.group===group).map(p=>{const installed=isPresetInstalled(p,items);return <label key={p.key} className={`preset-row ${installed?'already-added':''}`}><input type="checkbox" disabled={installed} checked={installed||picks.includes(p.key)} onChange={e=>setPicks(old=>e.target.checked?[...old,p.key]:old.filter(k=>k!==p.key))}/><span><strong>{p.title}</strong><small>{p.asset} · {p.months===1?'Monthly':`Every ${p.months} months`}{installed?' · Already added':''}</small></span></label>})}</div></div>)}
   <div className="preset-actions"><button className="button primary" disabled={count===0} onClick={installPresets}>Add {count} selected item{count===1?'':'s'}</button><span>Only selected tasks are stored, and no prior service is assumed.</span></div>
  </section>}
  {sorted.length?<div className="maintenance-list">{sorted.map(m=>{const d=dueMaintenance(m,today()),st=info(m);return <div key={m.id} className="maintenance-row"><button className="maintenance-card" onClick={()=>{setNotice('');setSelected(m.id);}}><span className="category-icon">{ICONS[m.category]}</span><span className="maintenance-title"><strong>{m.title}</strong><small>{m.asset||m.category} · {(m.intervalMonths??0)>0?`Every ${m.intervalMonths} mo`:m.intervalDays>0?`Every ${m.intervalDays} days`:'Usage/custom'}</small></span><span className="maintenance-when">{d.dueDate?shortDate(d.dueDate):'Set first date'}<Chip tone={st.tone}>{st.label}</Chip></span><span>→</span></button><button className="maintenance-complete" onClick={()=>markDone(m.id)}>✓ Done today</button></div>})}</div>:<EmptyState title="Start your home checklist" body="Choose suggested routines, then enter real due dates or service history. No sample maintenance is automatically imported." action="Choose household checklist" onClick={()=>openPresets('home')}/>}
  {!showPresets&&available.length>0&&items.length>0&&<button className="add-more-maintenance" onClick={()=>openPresets('home')}>+ Add more suggested routines</button>}
</>}
  {section==='history'&&<MaintenanceHistory items={items} equipment={equipment} openTask={id=>{setNotice('');setSelected(id);}}/>}
  {section==='reference'&&<HomeReference equipment={equipment} maintenance={items} projects={projects} openEquipment={id=>{setEquipmentFocus(id);setShowEquipment(true);}} openMaintenance={id=>{setSelected(id);}} openProject={onOpenProject}/>}

 </div>;
}
