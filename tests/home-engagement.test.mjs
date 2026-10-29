import test from 'node:test';import assert from 'node:assert/strict';
import {weeklyHomeSummary,weeklySummaryText,reminderItems} from '../src/home-engagement.mjs';
const db={projects:[{id:'p',status:'Completed',updatedAt:'2026-10-27T12:00:00Z',expenses:[{title:'Repair',date:'2026-10-27',amountCents:4300}]}],maintenance:[{id:'m',title:'Air filter',entries:[{date:'2026-10-26',costCents:1200}],intervalMonths:1,intervalDays:0,intervalHours:0,currentHours:null,firstDueDate:'2026-10-31'}],equipment:[{warrantyUntil:'2026-11-01'}]};
test('weekly summary counts actual dated logs and keeps totals separate',()=>{
 const s=weeklyHomeSummary(db,'2026-10-29');assert.equal(s.service.length,1);assert.equal(s.expenses.length,1);
 assert.equal(s.totalProject,4300);assert.equal(s.totalService,1200);assert.equal(s.due.length,1);
 assert.match(weeklySummaryText(s),/may overlap/);
});
test('only genuine scheduled items trigger reminders',()=>{
 const s=reminderItems(db,'2026-10-29');assert.equal(s.maintenance.length,1);assert.equal(s.warranties.length,1);
 const empty={...db,maintenance:[{...db.maintenance[0],firstDueDate:'',entries:[]}]};
 assert.equal(reminderItems(empty,'2026-10-29').maintenance.length,0);
});
