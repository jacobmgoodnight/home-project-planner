import type {MaintenanceItem} from './types';
import {today} from './types';
import {calendarIcs} from './today-calendar.mjs';

export function CalendarExport({items}:{items:MaintenanceItem[]}){
 const data=calendarIcs(items,today());
 function download(){
  if(!data.count)return;
  const blob=new Blob([data.text],{type:'text/calendar;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='home-maintenance-dates.ics';document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
 }
 return <div className="calendar-export"><button className="button secondary" onClick={download} disabled={!data.count}>⇩ Calendar (.ics)</button>
  <small>{data.count?data.count+' dated tasks · reminder 1 day before':'Set a due date to enable calendar export'}</small>
  <p className="subtle">Import into Apple, Google, or Outlook Calendar. One event per currently scheduled task; re-export after completing maintenance to update dates. Imported events are not automatically removed.</p>
 </div>;
}
