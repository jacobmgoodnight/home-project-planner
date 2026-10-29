import test from 'node:test';import assert from 'node:assert/strict';
import {findEquipment,expiringWarranties,maintenanceYearSummary} from '../src/home-insights.mjs';
import {previewMerge,mergeNewRecords} from '../src/safe-transfer.mjs';
const equipment=[{id:'eq1',name:'Kitchen fridge',model:'ABC-200',serial:'S42',manufacturer:'GE',location:'Kitchen',notes:'',warrantyUntil:'2026-11-20'},
 {id:'eq2',name:'Projector',model:'EX3210',manufacturer:'Epson',serial:'S89',location:'Garage',notes:'',warrantyUntil:''}];
const maintenance=[{id:'m1',equipmentId:'eq1',title:'Water cartridge',modelNumber:'',asset:'',notes:'',supplies:[{name:'GE water cartridge',partNumber:'XW-12',size:'',store:''}],entries:[{id:'e1',date:'2026-10-15',costCents:2500,notes:'Changed',hours:null},{id:'e2',date:'2025-09-01',costCents:3000,notes:'Changed',hours:null}]},
{id:'m2',equipmentId:'eq2',title:'Clean vents',modelNumber:'',asset:'',notes:'',supplies:[],entries:[{id:'e3',date:'2026-02-01',costCents:0,notes:'Clean',hours:null}]}];
test('equipment search covers manufacturer, model, serial, location and linked part numbers',()=>{
 assert.deepEqual(findEquipment(equipment,maintenance,'XW-12').map(x=>x.id),['eq1']);
 assert.deepEqual(findEquipment(equipment,maintenance,'epson garage').map(x=>x.id),['eq2']);
 assert.deepEqual(findEquipment(equipment,maintenance,'s42').map(x=>x.id),['eq1']);
});
test('warranty alerts show expired and next 90d, not unknown',()=>{
 assert.deepEqual(expiringWarranties(equipment,'2026-10-29').map(x=>x.daysRemaining),[22]);
 assert.equal(expiringWarranties(equipment,'2026-12-01')[0].daysRemaining,-11);
});
test('maintenance annual totals exclude other years and preserve $0 service',()=>{
 const r=maintenanceYearSummary(maintenance,equipment,2026);
 assert.equal(r.count,2);assert.equal(r.totalCents,2500);assert.equal(r.byMonth[9].amountCents,2500);assert.equal(r.byMonth[1].count,1);
 assert.equal(r.byAsset[0].label,'Kitchen fridge');
});
const db=(p=[],m=[],e=[])=>({version:3,demo:false,projects:p,maintenance:m,equipment:e});
test('merge adds missing IDs, never overwrites conflict',()=>{
 const first=db([{id:'p1',name:'Home'}],[{id:'m1',title:'Old'}],[{id:'eq1',name:'Fridge'}]);
 const second=db([{id:'p1',name:'Changed elsewhere'},{id:'p2',name:'New'}],[{id:'m1',title:'Old'},{id:'m2',title:'Other'}],[{id:'eq1',name:'Fridge'}]);
 const preview=previewMerge(first,second);assert.equal(preview.addCount,2);assert.equal(preview.conflictCount,1);
 const merged=mergeNewRecords(first,second).result;assert.equal(merged.projects[0].name,'Home');assert.equal(merged.projects.length,2);
 assert.equal(merged.maintenance.length,2);assert.equal(merged.equipment.length,1);assert.deepEqual(first,db([{id:'p1',name:'Home'}],[{id:'m1',title:'Old'}],[{id:'eq1',name:'Fridge'}]));
});
test('repeat imports are idempotent for identical new records',()=>{
 const first=db([],[],[]),incoming=db([{id:'p',name:'A'}],[],[]);
 const merged=mergeNewRecords(first,incoming).result;
 assert.equal(previewMerge(merged,incoming).addCount,0);assert.equal(previewMerge(merged,incoming).conflictCount,0);
});
