import {useState} from 'react';
import type {MaintenanceItem} from './types';
import {today} from './types';
import {maintenanceAgenda,lowStockRows} from './maintenance-enhancements.mjs';
import {CalendarExport} from './CalendarExport';

function pretty(date:string) {return new Date(date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});}
function seasonNow() {
 const month=new Date().getMonth()+1;
 return month>=3&&month<=5?'Spring':month>=6&&month<=8?'Summer':month>=9&&month<=11?'Fall':'Winter';
}
export function MaintenanceAgenda({items,open,complete,openSeasonal}:{items:MaintenanceItem[];open:(id:string)=>void;complete:(id:string)=>void;openSeasonal:()=>void}) {
 const [horizon,setHorizon]=useState<30|60>(30);
 const agenda=maintenanceAgenda(items,today(),horizon);
 const low=lowStockRows(items);
 const season=seasonNow();
 const seasonKeys=['Spring','Summer','Fall','Winter'];
 const currentSeason=items.filter(item=>item.templateKey?.startsWith(season.toLowerCase()+'-')||(season==='Fall'&&item.templateKey==='freeze'));
 const scheduledCount=agenda.overdue.length+agenda.upcoming.length;
 const renderRow=(item:MaintenanceItem,label:string)=><div className="agenda-row" key={item.id}>
    <button className="agenda-open" onClick={()=>open(item.id)}><strong>{item.title}</strong><small>{label}</small></button>
    <button className="small-btn" onClick={()=>complete(item.id)}>Complete →</button>
   </div>;
 return <div className="agenda-panels">
  <section className="panel agenda-panel">
   <div className="parts-heading"><div><h2>Upcoming maintenance</h2><p>A practical view of real due dates, with no guessed schedule.</p></div>
    <div className="agenda-switch"><button className={horizon===30?'active':''} onClick={()=>setHorizon(30)}>30 days</button><button className={horizon===60?'active':''} onClick={()=>setHorizon(60)}>60 days</button></div>
   </div>
   <details className="calendar-settings"><summary>Calendar reminders</summary><CalendarExport items={items}/></details>
   <div className="agenda-stats"><span><strong>{agenda.overdue.length}</strong> due / overdue</span><span><strong>{agenda.upcoming.length}</strong> next {horizon} days</span><span><strong>{agenda.unscheduled.length}</strong> unscheduled</span></div>
   {agenda.overdue.length>0&&<div className="agenda-section"><h3>Due now / overdue</h3>{agenda.overdue.map(row=>renderRow(row.item,pretty(row.dueDate)+(row.daysUntil<0?' · '+Math.abs(row.daysUntil)+' days overdue':' · due today')))}</div>}
   {agenda.upcoming.length>0&&<div className="agenda-section"><h3>Coming up</h3>{agenda.upcoming.map(row=>renderRow(row.item,pretty(row.dueDate)+' · in '+row.daysUntil+' days'))}</div>}
   {agenda.usageDue.length>0&&<div className="agenda-section"><h3>By usage</h3>{agenda.usageDue.map(row=>renderRow(row.item,row.remaining<=0?'Usage due: '+row.dueHours:'Due at '+row.dueHours+' hours / miles'))}</div>}
   {!scheduledCount&&!agenda.usageDue.length&&<p className="subtle">Nothing with a real date is due in the next {horizon} days. Set a first due date in an existing task to begin tracking it.</p>}
   {agenda.unscheduled.length>0&&<details className="agenda-unscheduled"><summary>{agenda.unscheduled.length} unscheduled or not due by usage · Set a date</summary><div>{agenda.unscheduled.map(item=><button className="agenda-setup" key={item.id} onClick={()=>open(item.id)}>{item.title} →</button>)}</div></details>}
  </section>
  <section className="panel stock-panel"><div className="parts-heading"><div><h2>Low-stock reminders</h2><p>Only part types with a threshold you set are monitored.</p></div><strong className="stock-number">{low.length}</strong></div>
   {low.length?<div className="stock-alerts">{low.map(row=><button className="stock-alert" key={row.maintenanceId+'-'+row.part.id} onClick={()=>open(row.maintenanceId)}>
      <strong>{row.part.name||'Unnamed part'}</strong><small>{row.maintenanceTitle} · {row.part.onHand} on hand / minimum {row.part.minOnHand} · need {row.shortfall}</small><span>Update stock →</span>
   </button>)}</div>:<p className="subtle">No low-stock alerts. Set a minimum stock level on your HVAC, refrigerator or other replacement filters to monitor them.</p>}
  </section>
  <section className="panel seasonal-panel"><div className="parts-heading"><div><h2>Seasonal home readiness</h2><p>Spring, summer, fall and winter routines — separate from holiday-display wiring or decorating.</p></div><button className="button secondary" onClick={openSeasonal}>+ Seasonal checklist</button></div>
   <p><strong>{season} planning:</strong> {currentSeason.length?currentSeason.length+' routine(s) added. Schedule each first due date to activate reminders.':'No seasonal routines added yet. Choose only those that apply to your home.'}</p>
   <div className="season-pills">{seasonKeys.map(s=><span key={s} className={s===season?'current':''}>{s}</span>)}</div>
  </section>
 </div>;
}
