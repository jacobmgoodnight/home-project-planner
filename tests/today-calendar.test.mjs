import test from 'node:test';import assert from 'node:assert/strict';
import {todayOverview,calendarIcs} from '../src/today-calendar.mjs';
const project=(o={})=>({id:'p',name:'Repair',status:'Active',estimatedHours:1,blockedBy:[],targetDate:'',tasks:[],...o});
const item=(o={})=>({id:'m',title:'HVAC filter',asset:'HVAC',intervalMonths:1,intervalDays:0,intervalHours:0,currentHours:null,firstDueDate:'2026-11-02',entries:[],...o});
test('Today returns due maintenance, due tasks, and unblocked small work',()=>{
 const res=todayOverview([project({tasks:[{id:'t',title:'Buy filter',done:false,dueDate:'2026-10-30'}]})],[item()],'2026-10-29');
 assert.equal(res.due.length,1);assert.equal(res.nextSteps.length,1);assert.equal(res.quickWins.length,1);
});
test('no invented calendar records for unscheduled maintenance',()=>{
 const result=calendarIcs([item({firstDueDate:''})],'2026-10-29');assert.equal(result.count,0);
});
test('ICS is a valid all-day calendar record with 1-day display reminder and escaped names',()=>{
 const result=calendarIcs([item({title:'Clean HVAC, filters; check',firstDueDate:'2026-11-02'})],'2026-10-29');
 assert.equal(result.count,1);assert.match(result.text,/BEGIN:VCALENDAR\r\n/);
 assert.match(result.text,/DTSTART;VALUE=DATE:20261102/);assert.match(result.text,/DTEND;VALUE=DATE:20261103/);
 assert.match(result.text,/TRIGGER:-P1D/);assert.match(result.text,/Clean HVAC\\, filters\\; check/);
});
