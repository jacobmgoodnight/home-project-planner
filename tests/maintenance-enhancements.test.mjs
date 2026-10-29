import test from 'node:test';
import assert from 'node:assert/strict';
import {completeService,maintenanceAgenda,lowStockRows} from '../src/maintenance-enhancements.mjs';
const part=(over={})=>({id:'p1',name:'Filter',quantity:1,onHand:3,minOnHand:2,unitCents:1250,...over});
const maintenance=(over={})=>({id:'m1',title:'Change filter',intervalMonths:1,intervalDays:0,intervalHours:0,currentHours:null,firstDueDate:'2026-10-29',entries:[],supplies:[part()],...over});
const details=(over={})=>({id:'log1',date:'2026-10-29',asOf:'2026-10-29',hours:null,costCents:0,notes:'Completed',usedSupplies:[{partId:'p1',quantity:1}],deductStock:false,...over});
test('completion logs used parts but never changes stock unless confirmed',()=>{
 const old=maintenance();
 const result=completeService(old,details());
 assert.equal(result.entries.length,1);assert.deepEqual(result.entries[0].usedSupplies,[{partId:'p1',quantity:1}]);
 assert.equal(result.supplies[0].onHand,3);assert.equal(old.entries.length,0);
});
test('confirmed deductions reduce inventory and preserve explicit paid cost',()=>{
 const result=completeService(maintenance(),details({deductStock:true,costCents:1925,receipt:{id:'r',name:'receipt.jpg',mime:'image/jpeg',dataUrl:'data:image/jpeg;base64,aGVsbG8=',date:'2026-10-29'}}));
 assert.equal(result.supplies[0].onHand,2);assert.equal(result.entries[0].costCents,1925);
 assert.equal(result.entries[0].receipt.name,'receipt.jpg');
});
test('completion refuses unowned part, overdraw, or future date',()=>{
 assert.throws(()=>completeService(maintenance(),details({usedSupplies:[{partId:'bad',quantity:1}]})));
 assert.throws(()=>completeService(maintenance(),details({deductStock:true,usedSupplies:[{partId:'p1',quantity:4}]})));
 assert.throws(()=>completeService(maintenance(),details({date:'2026-11-01'})));
});
test('agenda uses real due dates and includes overdue but excludes far future',()=>{
 const items=[maintenance(),maintenance({id:'later',title:'Later',firstDueDate:'2027-03-01'}),maintenance({id:'undated',firstDueDate:''}),maintenance({id:'soon',firstDueDate:'2026-11-15'})];
 const a=maintenanceAgenda(items,'2026-10-29',30);
 assert.equal(a.overdue.length,1);assert.equal(a.upcoming.length,1);assert.equal(a.unscheduled.length,1);
 assert.equal(maintenanceAgenda(items,'2026-10-29',60).upcoming.length,1);
});
test('low stock only warns for explicitly configured reorder threshold',()=>{
 const rows=lowStockRows([maintenance({supplies:[part({onHand:1}),part({id:'p2',minOnHand:undefined,onHand:0})]})]);
 assert.equal(rows.length,1);assert.equal(rows[0].shortfall,1);
});

test('usage-due warning is shown even when date is beyond the agenda horizon',()=>{
 const item=maintenance({intervalMonths:12,firstDueDate:'2027-04-01',intervalHours:500,currentHours:1500,entries:[{id:'prev',date:'2026-09-01',hours:1000,costCents:0,notes:''}]});
 const a=maintenanceAgenda([item],'2026-10-29',30);
 assert.equal(a.usageDue.length,1);
});
