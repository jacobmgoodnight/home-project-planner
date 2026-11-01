import {useEffect,useState} from 'react';
import type {Database} from './types';
import {today} from './types';
import {reminderItems,weeklyHomeSummary,weeklySummaryText} from './home-engagement.mjs';
import {isNativeIOS,requestNativeReminderPermission,syncNativeReminders,clearNativeReminders} from './native-reminders';
export function HomeReminders({data}:{data:Database}){
 const [enabled,setEnabled]=useState(()=>{try{return localStorage.getItem('hpp-notifications')==='yes';}catch{return false;}});
 const [status,setStatus]=useState('');
 const [weekly,setWeekly]=useState(false);
 const summary=weeklyHomeSummary(data,today()),alerts=reminderItems(data,today());
 const count=alerts.maintenance.length+alerts.warranties.length;
 const noticeKey='hpp-reminder-shown-'+today();
 useEffect(()=>{
  if(!isNativeIOS||!enabled)return;
  let active=true;
  void syncNativeReminders(data).then(n=>{if(active)setStatus('iPhone: '+n+' scheduled local reminder'+(n===1?'':'s')+'.');})
   .catch(e=>{if(active)setStatus('iPhone scheduling failed: '+String(e instanceof Error?e.message:e));});
  return ()=>{active=false;};
 },[data,enabled]);
 async function showNotice(){
  if(isNativeIOS){
   try{const n=await syncNativeReminders(data);setStatus(n+' iPhone reminder'+(n===1?'':'s')+' scheduled.');}
   catch(e){setStatus('Could not schedule iPhone reminders: '+String(e instanceof Error?e.message:e));}
   return;
  }
  if(!('Notification'in window)){setStatus('Notifications are not available in this browser. Use calendar export instead.');return;}
  if(Notification.permission!=='granted'){setStatus('Enable notifications first.');return;}
  if(!count){setStatus('Nothing is due in the next 7 days.');return;}
  const title='Home Project Planner: '+count+' upcoming reminder'+(count===1?'':'s');
  const body=[...alerts.maintenance.slice(0,2).map(x=>x.title),...alerts.warranties.slice(0,1).map(e=>e.name+' warranty')].join(' · ');
  try{
   if('serviceWorker'in navigator){const registration=await navigator.serviceWorker.ready;await registration.showNotification(title,{body,tag:'hpp-home-reminders'});}
   else new Notification(title,{body,tag:'hpp-home-reminders'});
   try{localStorage.setItem(noticeKey,'yes');}catch{}
   setStatus('Reminder shown. This app does not send push alerts while closed.');
  }catch{setStatus('This device could not display a notification. Calendar export remains available.');}
 }
 useEffect(()=>{
  if(isNativeIOS||!enabled||!count||!('Notification' in window)||Notification.permission!=='granted'||document.visibilityState!=='visible')return;
  try{if(localStorage.getItem(noticeKey)==='yes')return;}catch{}
  void showNotice();
 },[enabled,count,noticeKey]);
 async function enable(){
  if(isNativeIOS){
   try{
    const granted=await requestNativeReminderPermission();
    if(!granted){setStatus('iOS notification permission was not granted.');return;}
    try{localStorage.setItem('hpp-notifications','yes');}catch{}
    setEnabled(true);
    setStatus('iPhone reminders enabled. Scheduled alerts can arrive while the app is closed.');
   }catch(e){setStatus('Could not enable iPhone reminders: '+String(e instanceof Error?e.message:e));}
   return;
  }
  if(!('Notification'in window)){setStatus('This browser does not support notifications.');return;}
  const permission=await Notification.requestPermission();
  const yes=permission==='granted';setEnabled(yes);
  try{localStorage.setItem('hpp-notifications',yes?'yes':'no');}catch{}
  setStatus(yes?'Enabled for this device. Due reminders will appear at most once per day when you open the app.':'Permission was not granted.');
 }
 async function disable(){
  if(isNativeIOS){
   try{await clearNativeReminders();}
   catch(e){setStatus('Could not cancel iPhone reminders: '+String(e instanceof Error?e.message:e));return;}
  }
  setEnabled(false);
  try{localStorage.setItem('hpp-notifications','no');}catch{}
  setStatus(isNativeIOS?'Scheduled iPhone reminders cancelled.':'Reminders disabled for this browser.');
 }
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
   {enabled?<><button className="small-btn" onClick={showNotice}>{isNativeIOS?'Refresh scheduled reminders':'Check reminders'}</button><button className="small-btn" onClick={disable}>Turn off</button></>:<button className="small-btn" onClick={enable}>Enable device notifications</button>}
  </div>
  <p className="subtle">{isNativeIOS?
  'iPhone: Up to 48 locally scheduled alerts within the next 90 days, at 9 AM local time. Reopen after editing or completing maintenance to refresh reminders. Undated tasks are not scheduled.':
  'Web: Reminders appear only when you open the app. Browser alerts do not fire with the app closed; use calendar export for unattended alerts.'}</p>
  {weekly&&<div className="weekly-recap"><div className="weekly-numbers"><span><strong>{summary.service.length}</strong> maintenance services</span><span><strong>{summary.completedProjectCount}</strong> completed projects</span><span><strong>{summary.due.length}</strong> due next week</span></div>
   <textarea readOnly rows={Math.min(15,8+summary.due.length)} aria-label="Weekly recap text" value={weeklySummaryText(summary)}/>
   <div className="action-line"><button className="button secondary" onClick={copy}>Copy recap</button><button className="button secondary" onClick={share}>Share recap</button></div>
  </div>}
  {status&&<p className="subtle" role="status">{status}</p>}
 </section>;
}
