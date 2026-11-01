import {dueMaintenance} from './logic.mjs';

export const HPP_NOTIFICATION_START=7000000;
export const HPP_NOTIFICATION_LIMIT=48;
export const HPP_NOTIFICATION_END=HPP_NOTIFICATION_START+HPP_NOTIFICATION_LIMIT;
function key(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
function date(s,h=9){
 const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||'');
 if(!m)return null;
 const d=new Date(+m[1],+m[2]-1,+m[3],h,0,0,0);
 return key(d)===s?d:null;
}
function shift(s,n){const d=date(s,12);if(!d)return '';d.setDate(d.getDate()+n);return key(d);}
export function planLocalNotifications(db,now=new Date()){
 if(db.demo)return [];
 const today=key(now),tomorrow=shift(today,1),limit=shift(today,90),items=[];
 for(const m of db.maintenance){
  const due=dueMaintenance(m,today).dueDate;
  if(!due||!date(due)||due>limit)continue;
  const at=date(due<=today?tomorrow:due);
  if(at&&at>now)items.push({key:'maintenance:'+m.id,at,title:'Home maintenance due',body:(m.title||'Maintenance task').slice(0,120)});
 }
 for(const e of db.equipment){
  const expiry=e.warrantyUntil;
  if(!date(expiry)||expiry<today)continue;
  const notice=shift(expiry,-7);
  if(notice>limit)continue;
  const at=date(notice<=today?tomorrow:notice);
  if(at&&at>now)items.push({key:'warranty:'+e.id,at,title:'Warranty expiring',body:(e.name||'Equipment').slice(0,100)+' · expires '+expiry});
 }
 items.sort((a,b)=>a.at-b.at||a.key.localeCompare(b.key));
 return items.slice(0,HPP_NOTIFICATION_LIMIT).map((item,i)=>({...item,id:HPP_NOTIFICATION_START+i}));
}
