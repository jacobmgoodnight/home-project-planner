import {dayDiff,dueMaintenance} from './logic.mjs';
function valid(date){return typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)}
export function weeklyHomeSummary(db,asOf){
 const start=new Date(Date.parse(asOf+'T12:00:00Z')-6*86400000).toISOString().slice(0,10);
 const end=new Date(Date.parse(asOf+'T12:00:00Z')+7*86400000).toISOString().slice(0,10);
 const service=db.maintenance.flatMap(m=>m.entries.filter(e=>valid(e.date)&&e.date>=start&&e.date<=asOf).map(e=>({title:m.title,date:e.date,costCents:e.costCents})));
 const expenses=db.projects.flatMap(p=>p.expenses.filter(e=>valid(e.date)&&e.date>=start&&e.date<=asOf).map(e=>({title:e.title,project:p.name,date:e.date,costCents:e.amountCents})));
 const due=db.maintenance.map(m=>({title:m.title,id:m.id,due:dueMaintenance(m,asOf)}))
   .filter(x=>x.due.dueDate&&x.due.dueDate<=end).sort((a,b)=>a.due.dueDate.localeCompare(b.due.dueDate));
 const totalService=service.reduce((s,e)=>s+e.costCents,0),totalProject=expenses.reduce((s,e)=>s+e.costCents,0);
 const completedProjectCount=db.projects.filter(p=>p.status==='Completed'&&p.updatedAt.slice(0,10)>=start&&p.updatedAt.slice(0,10)<=asOf).length;
 return {start,end,asOf,service,expenses,due,totalService,totalProject,completedProjectCount};
}
export function reminderItems(db,asOf,horizon=7){
 const maintenance=db.maintenance.map(m=>({id:m.id,title:m.title,due:dueMaintenance(m,asOf)}))
  .filter(x=>x.due.dueDate&&dayDiff(x.due.dueDate,asOf)<=horizon);
 const warranties=db.equipment.filter(e=>e.warrantyUntil&&dayDiff(e.warrantyUntil,asOf)!==null&&dayDiff(e.warrantyUntil,asOf)>=0&&dayDiff(e.warrantyUntil,asOf)<=horizon);
 return {maintenance,warranties};
}
export function weeklySummaryText(summary){
 const money=cents=>'$'+(cents/100).toFixed(2);
 return ['Home Project Planner — weekly summary ('+summary.start+' to '+summary.asOf+')',
  'Maintenance completed: '+summary.service.length+' ('+money(summary.totalService)+' recorded)',
  'Project purchases: '+summary.expenses.length+' ('+money(summary.totalProject)+' recorded)',
  'Projects marked completed: '+summary.completedProjectCount,
  'Due or overdue maintenance through '+summary.end+': '+summary.due.length,
  ...summary.due.slice(0,10).map(x=>'• '+x.title+' — '+x.due.dueDate),
  'Note: project and maintenance costs may overlap; do not add totals together.'].join('\n');
}
