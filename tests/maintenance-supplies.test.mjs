import test from 'node:test';
import assert from 'node:assert/strict';
import {upgradeSnapshot,quantityToBuy,shoppingRows,shoppingSummary,shoppingListText} from '../src/maintenance-support.mjs';
const part=(o={})=>({id:'p',name:'Air filter',partNumber:'ABC123',size:'16x25x1',quantity:2,onHand:1,unitCents:1250,store:'Fictional test store',url:'https://example.com/part',notes:'',...o});
const item=(o={})=>({id:'m',title:'HVAC filter',intervalMonths:1,intervalDays:0,intervalHours:0,currentHours:null,firstDueDate:'2026-10-25',entries:[],supplies:[part()],...o});
test('v1 migration retains history and projects',()=>{const prev={version:1,demo:false,projects:[{id:'one'}],maintenance:[{id:'m',entries:[{date:'2026-01-01',costCents:900}]}]};const next=upgradeSnapshot(prev);assert.equal(next.version,3);assert.deepEqual(next.maintenance[0].supplies,[]);assert.equal(next.maintenance[0].modelNumber,'');assert.deepEqual(next.maintenance[0].entries,prev.maintenance[0].entries);assert.deepEqual(next.projects,prev.projects);assert.deepEqual(next.equipment,[]);assert.equal(next.maintenance[0].equipmentId,'');assert.equal(upgradeSnapshot(next),next);});
test('only due shortages by default',()=>{const rows=shoppingRows([item(),item({id:'future',firstDueDate:'2027-01-01'}),item({id:'stock',supplies:[part({onHand:4})]})],'2026-10-29');assert.equal(rows.length,1);assert.equal(rows[0].quantity,1);assert.equal(rows[0].estimatedCents,1250);assert.equal(shoppingRows([item({firstDueDate:'2027-01-01'})],'2026-10-29',true).length,1);});
test('unknown prices remain unknown',()=>{const rows=shoppingRows([item({supplies:[part({unitCents:0,onHand:0}),part({id:'next',quantity:1,onHand:0,unitCents:300})]})],'2026-10-29');assert.deepEqual(shoppingSummary(rows),{knownCents:300,unknownPrices:1,partCount:2});assert.match(shoppingListText(rows),/16x25x1/);});
test('stock is never automatically consumed',()=>{const p=part({onHand:3,quantity:1});assert.equal(quantityToBuy(p),0);assert.equal(p.onHand,3);});

test('v2 migration retains parts and stock quantities',()=>{
 const original={version:2,demo:false,projects:[],maintenance:[item({supplies:[part({onHand:6})]})]};
 const result=upgradeSnapshot(original);assert.equal(result.version,3);assert.equal(result.maintenance[0].supplies[0].onHand,6);assert.deepEqual(result.equipment,[]);
});
test('restock validates quantities and only changes on-hand count',async()=>{
 const {stockAfterRestock}=await import('../src/maintenance-support.mjs');
 assert.equal(stockAfterRestock(2,3),5);assert.throws(()=>stockAfterRestock(0,0));assert.throws(()=>stockAfterRestock(9999,1));assert.throws(()=>stockAfterRestock(1,1.5));
});
