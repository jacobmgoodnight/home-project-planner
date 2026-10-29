import test from 'node:test';
import assert from 'node:assert/strict';
import { projectCost, monthlyPayment, decisionCost, priority, sortProjects, dueMaintenance, fromDollars, dayDiff } from '../src/logic.mjs';
const base={id:'a',status:'Active',blockedBy:[],budgetCents:50000,expenses:[],materials:[],futureCosts:[],laborEstimateCents:0,contingencyPercent:10,estimatedHours:2,urgency:2,financialImpact:2,importance:2,targetDate:'',override:'auto',name:'A'};
test('currency cents round exactly',()=>{assert.equal(fromDollars('1.23'),123);assert.equal(fromDollars(0.1+0.2),30);assert.equal(fromDollars(-100),0);});
test('future committed/materials separated from actual, no quote double count',()=>{
  const p={...base,expenses:[{amountCents:1200}],materials:[{purchased:false,quantity:3,unitCents:1101},{purchased:true,quantity:2,unitCents:1000}],futureCosts:[{amountCents:4000,committed:true},{amountCents:2000,committed:false}],laborEstimateCents:10000,quotes:[{amountCents:999999}]};
  const c=projectCost(p);assert.equal(c.spentCents,1200);assert.equal(c.materialsCents,3303);assert.equal(c.committedCents,4000);assert.equal(c.estimatedCents,15303);assert.equal(c.contingencyCents,1930);assert.equal(c.forecastCents,22433);assert.equal(c.budgetRemainingCents,48800);assert.equal(c.forecastHeadroomCents,27567);
});
test('0% APR fixed principal amortization',()=>{assert.equal(monthlyPayment(400000,0,10),40000);assert.equal(decisionCost({cashTodayCents:50000,financedCents:400000,aprPercent:0,months:10,financeFeesCents:1000,futureCostsCents:3000}).totalCents,454000);});
test('9% APR 12-month $4000 loan',()=>{const m=monthlyPayment(400000,9,12);assert.equal(m,34981);const d=decisionCost({cashTodayCents:0,financedCents:400000,aprPercent:9,months:12,financeFeesCents:0,futureCostsCents:0});assert.equal(d.totalCents,419772);assert.equal(d.interestCents,19772);});
test('overdue project priority and dependency uplift are disclosed',()=>{
 const p={...base,targetDate:'2026-10-10'};const dependent={...base,id:'b',blockedBy:['a']};const v=priority(p,[p,dependent],'2026-10-29');assert.ok(v.reasons.find(x=>x.includes('overdue')));assert.ok(v.reasons.find(x=>x.includes('Unblocks 1')));
});
test('manual do first/ do later sort overrides automatic',()=>{const items=[{...base,id:'a',override:'later',urgency:4},{...base,id:'b',override:'first',urgency:0},{...base,id:'c',override:'auto',urgency:4}];assert.deepEqual(sortProjects(items,'2026-10-29').map(x=>x.id),['b','c','a']);});
test('date boundaries not subject to local timezone',()=>{assert.equal(dayDiff('2026-10-30','2026-10-29'),1);assert.equal(dayDiff('2026-10-28','2026-10-29'),-1);});
test('service intervals and hours are alternatives; history latest date',()=>{
 const entry={date:'2026-10-01',hours:100,costCents:2000};const m={intervalDays:30,intervalHours:100,currentHours:205,entries:[entry]};let r=dueMaintenance(m,'2026-10-29');assert.equal(r.due,true);assert.equal(r.dueDate,'2026-10-31');assert.equal(r.dueHours,200);
 r=dueMaintenance({...m,currentHours:110},'2026-10-29');assert.equal(r.soon,true);
});
test('missing financing term does not make borrowed principal disappear',()=>{
 const d=decisionCost({cashTodayCents:0,financedCents:400000,aprPercent:12,months:0,financeFeesCents:0,futureCostsCents:0});
 assert.equal(d.totalCents,400000);
});
test('blank service dates cannot break scheduled maintenance',()=>{
 const m={intervalDays:90,intervalHours:0,currentHours:null,entries:[{date:'',hours:null}]};
 const due=dueMaintenance(m,'2026-10-29');assert.equal(due.dueDate,'');assert.equal(due.due,false);
});

test('calendar months clamp to February and leap years',async()=>{
 const {addCalendarMonths}=await import('../src/logic.mjs');
 assert.equal(addCalendarMonths('2027-01-31',1),'2027-02-28');
 assert.equal(addCalendarMonths('2028-01-31',1),'2028-02-29');
 assert.equal(addCalendarMonths('2026-10-29',4),'2027-02-28');
});
test('monthly and four-month maintenance use real calendar months',()=>{
 const m={intervalMonths:1,intervalDays:0,intervalHours:0,currentHours:null,entries:[{date:'2026-10-15',hours:null}],firstDueDate:''};
 assert.equal(dueMaintenance(m,'2026-10-29').dueDate,'2026-11-15');
 assert.equal(dueMaintenance({...m,intervalMonths:4},'2026-10-29').dueDate,'2027-02-15');
});
test('an added preset has no invented maintenance date',()=>{
 const m={intervalMonths:4,intervalDays:0,intervalHours:0,currentHours:null,entries:[],firstDueDate:''};
 const d=dueMaintenance(m,'2026-10-29');assert.equal(d.dueDate,'');assert.equal(d.due,false);assert.equal(d.soon,false);
});
test('first due date does not fabricate completed service history',()=>{
 const m={intervalMonths:4,intervalDays:0,intervalHours:0,currentHours:null,entries:[],firstDueDate:'2026-11-02'};
 assert.equal(dueMaintenance(m,'2026-10-29').dueDate,'2026-11-02');
 assert.equal(dueMaintenance({...m,entries:[{date:'2026-10-10',hours:null}]},'2026-10-29').dueDate,'2027-02-10');
});
