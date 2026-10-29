import {dayDiff,dueMaintenance} from './logic.mjs';

/** Small, deliberately opinionated home dashboard. No invented dates or task creation. */
export function todayOverview(projects,maintenance,asOf){
 const active=projects.filter(p=>p.status!=='Completed'&&p.status!=='On Hold');
 const due=maintenance.map(m=>({item:m,status:dueMaintenance(m,asOf)}))
   .filter(x=>x.status.due||x.status.soon)
   .sort((a,b)=>(a.status.due===b.status.due?0:a.status.due?-1:1)||(a.status.dueDate||'9999').localeCompare(b.status.dueDate||'9999'))
   .slice(0,6);
 const nextSteps=active.flatMap(p=>p.tasks.filter(t=>!t.done).map(t=>({project:p,task:t})))
   .filter(x=>x.task.dueDate&&dayDiff(x.task.dueDate,asOf)!==null&&dayDiff(x.task.dueDate,asOf)<=7)
   .sort((a,b)=>a.task.dueDate.localeCompare(b.task.dueDate)).slice(0,6);
 const quickWins=active.filter(p=>p.status!=='Waiting'&&p.estimatedHours>0&&p.estimatedHours<=2
   &&p.blockedBy.every(id=>!projects.some(o=>o.id===id&&o.status!=='Completed')))
   .slice(0,4);
 const upcomingProjects=active.filter(p=>p.targetDate&&dayDiff(p.targetDate,asOf)!==null&&dayDiff(p.targetDate,asOf)<=7)
   .sort((a,b)=>a.targetDate.localeCompare(b.targetDate)).slice(0,5);
 return {due,nextSteps,quickWins,upcomingProjects};
}
function validDate(date){
 return typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date+'T12:00:00Z'))&&new Date(Date.parse(date+'T12:00:00Z')).toISOString().slice(0,10)===date;
}
function oneDayAfter(date){return new Date(Date.parse(date+'T12:00:00Z')+86400000).toISOString().slice(0,10);}
function icsEscape(value){return String(value||'').replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');}
function icsLine(line){
 // Fold text without breaking UTF-8 characters; prefer short lines for broad calendar support.
 let out='',part='',length=0;
 for(const ch of line){
  const bytes=new TextEncoder().encode(ch).length;
  if(length+bytes>73){out+=part+'\r\n ';part='';length=1;}
  part+=ch;length+=bytes;
 }
 return out+part;
}
function icsDate(date){return date.replace(/-/g,'');}
function stableId(raw){return String(raw||'unknown').replace(/[^A-Za-z0-9_-]/g,'-').slice(0,90);}

/** Export current due dates only. After service completion, re-export to update calendar. */
export function calendarIcs(items,asOf){
 const entries=items.flatMap(m=>{
  const due=dueMaintenance(m,asOf).dueDate;
  return validDate(due)?[{id:m.id,title:m.title,date:due}]:[];
 }).sort((a,b)=>a.date.localeCompare(b.date));
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Home Project Planner//Maintenance Calendar//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Home maintenance'];
 for(const entry of entries){
  lines.push('BEGIN:VEVENT','UID:'+stableId(entry.id)+'-'+icsDate(entry.date)+'@home-project-planner.local',
   'DTSTAMP:'+icsDate(asOf)+'T120000Z',
   'DTSTART;VALUE=DATE:'+icsDate(entry.date),
   'DTEND;VALUE=DATE:'+icsDate(oneDayAfter(entry.date)),
   'SUMMARY:'+icsEscape(entry.title||'Home maintenance'),
   'DESCRIPTION:'+icsEscape('Maintenance due date exported from Home Project Planner. Update your calendar when the service is completed.'),
   'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:Home maintenance due','TRIGGER:-P1D','END:VALARM','END:VEVENT');
 }
 lines.push('END:VCALENDAR');
 return {count:entries.length,text:lines.map(icsLine).join('\r\n')+'\r\n'};
}
