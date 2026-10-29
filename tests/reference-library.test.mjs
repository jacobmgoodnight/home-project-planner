import test from 'node:test';import assert from 'node:assert/strict';
import {referenceRows,searchReferences} from '../src/reference-library.mjs';
test('reference includes equipment labels, manuals, warranties, parts and receipts',()=>{
 const file={id:'f',name:'label.jpg',mime:'image/jpeg',dataUrl:'data:image/jpeg;base64,AA',date:'2026-10-29'};
 const eq=[{id:'e',name:'GE fridge',model:'M123',serial:'S44',manufacturer:'GE',location:'Kitchen',warrantyUntil:'2027-10-29',photos:[file],documents:[{...file,id:'d',name:'manual.pdf'}]}];
 const maint=[{id:'m',title:'Water filter',asset:'Kitchen',supplies:[{id:'p',name:'Cartridge',partNumber:'X-12',url:'https://example.com'}],entries:[{id:'t',date:'2026-10-20',notes:'Changed',receipt:{...file,id:'r',name:'receipt.jpg'}}]}];
 const r=referenceRows(eq,maint,[]);assert.equal(r.length,5);
 assert.equal(searchReferences(r,'X-12').length,1);assert.equal(searchReferences(r,'GE fridge','Warranty').length,1);
});
