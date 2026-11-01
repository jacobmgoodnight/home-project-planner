import test from 'node:test';
import assert from 'node:assert/strict';
import {planLocalNotifications,HPP_NOTIFICATION_START,HPP_NOTIFICATION_LIMIT} from '../src/native-reminder-plan.mjs';
const now=new Date(2026,10,1,8);
const db=()=>({demo:false,maintenance:[],equipment:[]});
const routine=(id,firstDueDate)=>({id,title:'Air filter',firstDueDate,entries:[],intervalDays:0,intervalMonths:1,intervalHours:0,currentHours:null});
test('uses saved maintenance dates at local 9 AM and skips undated items',()=>{
 const data=db();data.maintenance.push(routine('a','2026-11-15'),routine('b',''));
 const n=planLocalNotifications(data,now);
 assert.equal(n.length,1);
 assert.equal(n[0].at.getDate(),15);
 assert.equal(n[0].at.getHours(),9);
 assert.equal(n[0].id,HPP_NOTIFICATION_START);
});
test('overdue maintenance schedules tomorrow; completion changes the due date',()=>{
 const data=db();data.maintenance.push(routine('a','2026-10-01'));
 assert.equal(planLocalNotifications(data,now)[0].at.getDate(),2);
 data.maintenance[0].entries.push({date:'2026-10-20'});
 assert.equal(planLocalNotifications(data,now)[0].at.getDate(),20);
});
test('warranties warn seven days early; expired warranties do not schedule',()=>{
 const data=db();data.equipment.push({id:'e1',name:'Projector',warrantyUntil:'2026-11-20'},
  {id:'e2',name:'Old',warrantyUntil:'2026-10-31'});
 const result=planLocalNotifications(data,now);
 assert.equal(result.length,1);assert.equal(result[0].at.getDate(),13);
 assert.match(result[0].body,/2026-11-20/);
});
test('invalid, far future, and demo data cannot create notifications',()=>{
 const data=db();data.maintenance.push(routine('a','2026-13-31'),routine('b','2027-12-01'));
 assert.deepEqual(planLocalNotifications(data,now),[]);
 data.demo=true;data.maintenance.push(routine('c','2026-11-05'));
 assert.deepEqual(planLocalNotifications(data,now),[]);
});
test('respects pending notification limit and deterministic IDs',()=>{
 const data=db();for(let i=0;i<100;i++)data.maintenance.push(routine('r'+i,'2026-11-10'));
 const list=planLocalNotifications(data,now);
 assert.equal(list.length,HPP_NOTIFICATION_LIMIT);
 assert.equal(new Set(list.map(n=>n.id)).size,HPP_NOTIFICATION_LIMIT);
 assert.ok(list.every(n=>n.at>now));
 assert.deepEqual(list.map(n=>n.key),planLocalNotifications(data,now).map(n=>n.key));
});
