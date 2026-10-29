import test from 'node:test';
import assert from 'node:assert/strict';
import {snapshotDifferences} from '../src/sync-diff.mjs';
import {isUnderBudgetRemaining,wouldCreateDependencyCycle} from '../src/project-filters.mjs';
const base=(id,other={})=>({id,status:'Active',blockedBy:[],expenses:[],materials:[],futureCosts:[],laborEstimateCents:0,contingencyPercent:0,budgetCents:0,...other});
test('cloud conflicts report distinct local/remote and changed records but never merge automatically',()=>{
 const ours={projects:[{id:'a',name:'Local edit'},{id:'b',name:'Only here'}],maintenance:[],equipment:[]};
 const cloud={projects:[{id:'a',name:'Remote edit'},{id:'c',name:'Cloud only'}],maintenance:[],equipment:[]};
 const result=snapshotDifferences(ours,cloud);
 assert.equal(result.total,3);assert.deepEqual(result.groups[0].changed[0].fields,['name']);
 assert.equal(result.groups[0].onlyLocal[0].id,'b');
 assert.equal(result.groups[0].onlyCloud[0].id,'c');
 assert.equal(ours.projects[0].name,'Local edit');
});
test('Under $100 is based on remaining estimated cost, not whether budget exists',()=>{
 assert.equal(isUnderBudgetRemaining(base('a',{materials:[{purchased:false,quantity:1,unitCents:8000}]})),true);
 assert.equal(isUnderBudgetRemaining(base('b',{materials:[{purchased:false,quantity:1,unitCents:12000}]})),false);
 assert.equal(isUnderBudgetRemaining(base('c')),false,'unknown is not assumed free');
});
test('dependencies cannot create indirect or direct loops',()=>{
 const projects=[base('a',{blockedBy:['b']}),base('b',{blockedBy:['c']}),base('c')];
 assert.equal(wouldCreateDependencyCycle(projects,'c','a'),true);
 assert.equal(wouldCreateDependencyCycle(projects,'a','c'),false);
 assert.equal(wouldCreateDependencyCycle(projects,'a','a'),true);
});
