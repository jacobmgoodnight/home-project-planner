import type {MaintenanceItem,Project} from './types';
import {today} from './types';
import {todayOverview} from './today-calendar.mjs';
import {dayDiff,dueMaintenance} from './logic.mjs';

export function TodayDashboard({projects,maintenance,onQuickAdd,onSetup,onOpenProject,onOpenMaintenance,onStepDone}:{
 projects:Project[];maintenance:MaintenanceItem[];onQuickAdd:()=>void;onSetup:()=>void;
 onOpenProject:(id:string)=>void;onOpenMaintenance:(id:string)=>void;onStepDone:(projectId:string,taskId:string)=>void;
}){
 const current=today(),dashboard=todayOverview(projects,maintenance,current);
 const hasWork=projects.length>0||maintenance.length>0;
 const unscheduled=maintenance.filter(item=>!dueMaintenance(item,current).dueDate&&item.intervalHours<=0).slice(0,8);
 const shortages=maintenance.flatMap(item=>item.supplies.filter(part=>{
  const required=Math.max(part.quantity||0,part.minOnHand||0);
  return required>0&&part.onHand<required;
 }).map(part=>({item,part,need:Math.max(0,Math.max(part.quantity||0,part.minOnHand||0)-part.onHand)}))).slice(0,8);
 return <div className="today-page">
  <div className="today-heading"><div><span className="eyebrow">YOUR HOME AT A GLANCE</span><h1>Today at home</h1><p>What needs attention, what is coming up, and what can be finished quickly.</p></div><div className="action-line"><button className="button primary" onClick={onQuickAdd}>+ Quick add</button><button className="button secondary" onClick={onSetup}>Guided setup</button></div></div>
  {!hasWork&&<section className="panel today-start"><h2>Get the basics in place</h2><p>Select your main equipment and recurring household maintenance tasks. Nothing is added or scheduled without your choice.</p><button className="button primary" onClick={onSetup}>Set up my home →</button></section>}
  <div className="today-stats"><span><strong>{dashboard.due.filter(x=>x.status.due).length}</strong> due now</span><span><strong>{dashboard.nextSteps.length}</strong> steps due this week</span><span><strong>{dashboard.quickWins.length}</strong> small projects</span></div>
  <div className="today-grid">
   <section className="panel today-panel"><h2>Maintenance to address</h2><p className="subtle">Due or approaching, based on the dates you saved.</p>
    {dashboard.due.length?<div className="today-lines">{dashboard.due.slice(0,6).map(({item,status})=><button key={item.id} onClick={()=>onOpenMaintenance(item.id)}>
      <strong>{item.title}</strong><small>{status.due?'Due now or overdue':'Due soon'}{status.dueDate?' · '+status.dueDate:''}</small><span>Open →</span>
    </button>)}</div>:<p className="subtle">Nothing scheduled is due within 30 days. Tasks without due dates are not marked overdue.</p>}
   </section>
   <section className="panel today-panel"><h2>Next project steps</h2><p className="subtle">Unfinished steps due within the next 7 days, including overdue ones.</p>
    {dashboard.nextSteps.length?<div className="today-lines">{dashboard.nextSteps.slice(0,6).map(({project,task})=><div className="today-step" key={project.id+task.id}><label><input type="checkbox" checked={false} onChange={()=>onStepDone(project.id,task.id)}/><span><strong>{task.title}</strong><small>{project.name} · {task.dueDate}{(dayDiff(task.dueDate,current)??0)<0?' · overdue':''}</small></span></label><button className="small-btn" onClick={()=>onOpenProject(project.id)}>Open →</button></div>)}</div>:<p className="subtle">No upcoming dated steps. Use Quick add to capture the next thing you want to do.</p>}
   </section>
   <section className="panel today-panel"><h2>Quick wins</h2><p className="subtle">Short, unblocked projects with estimated effort of 2 hours or less.</p>
    {dashboard.quickWins.length?<div className="today-lines">{dashboard.quickWins.slice(0,4).map(p=><button key={p.id} onClick={()=>onOpenProject(p.id)}><strong>{p.name}</strong><small>{p.estimatedHours} hour{p.estimatedHours===1?'':'s'} estimated</small><span>Open →</span></button>)}</div>:<p className="subtle">No small projects identified yet. Set estimated hours in a project to see quick wins here.</p>}
   </section>
  </div>
  {(unscheduled.length>0||shortages.length>0)&&<details className="today-more">
    <summary>Setup needed & supplies to buy ({unscheduled.length+shortages.length})</summary>
    <div>{unscheduled.map(item=><button key={'u'+item.id} onClick={()=>onOpenMaintenance(item.id)}>Set first due date · {item.title} →</button>)}
    {shortages.map(({item,part,need})=><button key={'s'+item.id+part.id} onClick={()=>onOpenMaintenance(item.id)}>Order {need} × {part.name||part.partNumber||'replacement part'} · {item.title} →</button>)}</div>
   </details>}
  {!!dashboard.upcomingProjects.length&&<details className="today-more"><summary>{dashboard.upcomingProjects.length} project deadlines in the next week</summary><div>{dashboard.upcomingProjects.slice(0,5).map(p=><button key={p.id} onClick={()=>onOpenProject(p.id)}>{p.name} · {p.targetDate} →</button>)}</div></details>}
 </div>;
}
