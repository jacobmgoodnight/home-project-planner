import {useState} from 'react';
import type {Database} from './types';
import {today} from './types';
import {reminderItems,weeklyHomeSummary,weeklySummaryText} from './home-engagement.mjs';
export function HomeReminders({data}:{data:Database}){
 const [enabled,setEnabled]=useState(()=>{try{return localStorage.getItem('hpp-notifications')==='yes';}catch{return false;}});
 const [status,setStatus]=useState('');
 const [weekly,setWeekly]=useState(false);
 const summary=weeklyHomeSummary(data,today()),alerts=reminderItems(data,today());
 const count=alerts.maintenance.length+alerts.warranties.length;
 async function showNotice(){
  if(!('Notification'in window)){setStatus('Notifications are not available in this browser. Use calendar export instead.');return;}
  if(Notification.permission!=='granted'){setStatus('Enable notifications first.');return;}
  if(!count){setStatus('Nothing is due in the next 7 days.');return;}
  const title='Home Project Planner: '+count+' upcoming reminder'+(count===1?'':'s');
  const body=[...alerts.maintenance.slice(0,2).map(x=>x.title),...alerts.warranties.slice(0,1).map(e=>e.name+' warranty')].join(' · ');
  try{
   if('serviceWorker'in navigator){const registration=await navigator.serviceWorker.ready;await registration.showNotification(title,{body,tag:'hpp-home-reminders'});}
   else new Notification(title,{body,tag:'hpp-home-reminders'});
   setStatus('Reminder shown. Notifications run when you open the app, not when it is closed.');
  }catch{setStatus('This device could not display a notification. Calendar export remains available.');}
 }
 async function enable(){
  if(!('Notification'in window)){setStatus('This browser does not support notifications.');return;}
  const permission=await Notification.requestPermission();
  const yes=permission==='granted';setEnabled(yes);
  try{localStorage.setItem('hpp-notifications',yes?'yes':'no');}catch{}
  setStatus(yes?'Enabled for this device. Use Check reminders to show a notification.':'Permission was not granted.');
 }
 function disable(){setEnabled(false);try{localStorage.setItem('hpp-notifications','no');}catch{}setStatus('Reminders disabled for this browser.');}
 async function copy(){
  try{await navigator.clipboard.writeText(weeklySummaryText(summary));setStatus('Weekly summary copied.');}
  catch{setStatus('Clipboard unavailable; you can select the summary text below.');}
 }
 async function share(){
  const text=weeklySummaryText(summary);
  try{if(navigator.share)await navigator.share({title:'Home project weekly summary',text});else await copy();}
  catch(e){if(!(e instanceof Error&&e.name==='AbortError'))setStatus('Sharing unavailable; try Copy.');}
 }
 return <section className="panel home-reminders">
  <div className="parts-heading"><div><h2>Reminders & weekly recap</h2><p>Keep alerts useful without running a background service.</p></div><button className="small-btn" onClick={()=>setWeekly(v=>!v)}>{weekly?'Hide recap':'Weekly recap'}</button></div>
  <div className="engagement-actions"><span><strong>{count}</strong> maintenance / warranty items due within 7 days</span>
   {enabled?<><button className="small-btn" onClick={showNotice}>Check reminders</button><button className="small-btn" onClick={disable}>Turn off</button></>:<button className="small-btn" onClick={enable}>Enable device notifications</button>}
  </div>
  <p className="subtle">Device notifications require your permission and work only while you use the app. For unattended reminders, import your maintenance calendar.</p>
  {weekly&&<div className="weekly-recap"><div className="weekly-numbers"><span><strong>{summary.service.length}</strong> maintenance services</span><span><strong>{summary.completedProjectCount}</strong> completed projects</span><span><strong>{summary.due.length}</strong> due next week</span></div>
   <textarea readOnly rows={Math.min(15,8+summary.due.length)} aria-label="Weekly recap text" value={weeklySummaryText(summary)}/>
   <div className="action-line"><button className="button secondary" onClick={copy}>Copy recap</button><button className="button secondary" onClick={share}>Share recap</button></div>
  </div>}
  {status&&<p className="subtle" role="status">{status}</p>}
 </section>;
}
