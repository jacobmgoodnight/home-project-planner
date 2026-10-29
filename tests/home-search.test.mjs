import test from 'node:test';
import assert from 'node:assert/strict';
import {searchHome} from '../src/home-search.mjs';
const db={projects:[{id:'p1',name:'Fix garage door',category:'Repairs',nextAction:'Order hinge',description:'',tasks:[],attachments:[]}],maintenance:[{id:'m1',title:'Replace fridge water filter',asset:'Kitchen',modelNumber:'',notes:'',supplies:[{name:'Cartridge',size:'',partNumber:'XW-12',store:'Home Depot'}],entries:[]}],equipment:[{id:'e1',name:'Projector',manufacturer:'Epson',model:'EX3210',serial:'ABCD',notes:'',location:'Office',photos:[],documents:[{name:'manual.pdf'}]}]};
test('home-wide search matches projects, linked part SKUs, serials and document names',()=>{
 assert.deepEqual(searchHome(db,'hinge').map(r=>r.id),['p1']);
 assert.deepEqual(searchHome(db,'xw-12').map(r=>r.id),['m1']);
 assert.deepEqual(searchHome(db,'epson ex3210').map(r=>r.id),['e1']);
 assert.deepEqual(searchHome(db,'manual.pdf').map(r=>r.id),['e1']);
 assert.equal(searchHome(db,'').length,0);
});
