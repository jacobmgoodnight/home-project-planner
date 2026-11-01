import {Capacitor} from '@capacitor/core';
import {LocalNotifications} from '@capacitor/local-notifications';
import type {Database} from './types';
import {HPP_NOTIFICATION_START,HPP_NOTIFICATION_END,planLocalNotifications} from './native-reminder-plan.mjs';
export const isNativeIOS=Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='ios';
export async function requestNativeReminderPermission():Promise<boolean>{
 if(!isNativeIOS)return false;
 const p=await LocalNotifications.checkPermissions();
 if(p.display==='granted')return true;
 return (await LocalNotifications.requestPermissions()).display==='granted';
}
let queue:Promise<number>=Promise.resolve(0);
function serial(work:()=>Promise<number>){
 const next=queue.catch(()=>0).then(work);
 queue=next;
 return next;
}
async function cancelOwned(){
 const existing=(await LocalNotifications.getPending()).notifications
  .filter(n=>n.id>=HPP_NOTIFICATION_START&&n.id<HPP_NOTIFICATION_END).map(n=>({id:n.id}));
 if(existing.length)await LocalNotifications.cancel({notifications:existing});
}
export function clearNativeReminders():Promise<number>{
 if(!isNativeIOS)return Promise.resolve(0);
 return serial(async()=>{await cancelOwned();return 0;});
}
export function syncNativeReminders(db:Database):Promise<number>{
 if(!isNativeIOS)return Promise.resolve(0);
 return serial(async()=>{
  if((await LocalNotifications.checkPermissions()).display!=='granted')throw new Error('Enable reminders in iOS Settings.');
  const plan=planLocalNotifications(db);
  await cancelOwned();
  if(plan.length)await LocalNotifications.schedule({notifications:plan.map(n=>({
   id:n.id,title:n.title,body:n.body,schedule:{at:n.at},extra:{hpp:true,key:n.key},
  }))});
  return plan.length;
 });
}
