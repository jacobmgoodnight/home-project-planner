import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createSaveQueue} from '../src/save-queue.mjs';

test('queued rapid saves commit in order and only the newest completion reports saved',async()=>{
 let release;
 const statuses=[],writes=[];
 const q=createSaveQueue(async v=>{writes.push(v);if(v===1)await new Promise(r=>{release=r;});},s=>statuses.push(s.state));
 const first=q.enqueue(1),second=q.enqueue(2);
 assert.equal(q.getStatus().state,'saving');
 assert.equal(q.needsUnloadWarning(),true);
 await new Promise(r=>setImmediate(r));
 release();await Promise.all([first,second]);
 assert.deepEqual(writes,[1,2]);
 assert.equal(q.getStatus().state,'saved');assert.equal(q.needsUnloadWarning(),false);
 assert.equal(statuses.filter(x=>x==='saved').length,1);
});
test('persist failure leaves unsaved warning; retry clears it',async()=>{
 let broken=true;
 const q=createSaveQueue(async()=>{if(broken)throw new Error('Quota exceeded');});
 await assert.rejects(q.enqueue({a:1}),/Quota exceeded/);
 assert.equal(q.getStatus().state,'error');assert.equal(q.needsUnloadWarning(),true);
 broken=false;await q.enqueue({a:1});
 assert.equal(q.getStatus().state,'saved');assert.equal(q.needsUnloadWarning(),false);
});
test('old failure cannot erase state of a newer successful edit',async()=>{
 let rejectFirst;
 const q=createSaveQueue(v=>v===1?new Promise((_,rej)=>{rejectFirst=rej;}):Promise.resolve());
 const first=q.enqueue(1);const second=q.enqueue(2);
 await new Promise(r=>setImmediate(r));rejectFirst(new Error('first edit failed'));
 await assert.rejects(first);await second;
 assert.equal(q.getStatus().state,'saved');
 assert.equal(q.getStatus().committed,2);
});
test('service worker only deletes its own app caches and ignores unrelated apps',async()=>{
 const handlers={},deleted=[],matched=[],names=['github-other-v2','holiday-display-blueprint-7','home-project-planner-v9','hpp-home-project-planner-v10','hpp-home-project-planner-v11'];
 const cache={match:async()=>null,put:async()=>{},add:async()=>{}};
 const context={self:{registration:{scope:'https://example.org/home-project-planner/'},location:{origin:'https://example.org'},addEventListener:(name,handler)=>{handlers[name]=handler;},clients:{claim:async()=>{}},skipWaiting:async()=>{}},
 caches:{keys:async()=>names,delete:async key=>{deleted.push(key);return true;},open:async()=>cache},
 URL,Response,fetch:async()=>new Response('ok')};
 vm.runInNewContext(readFileSync(new URL('../public/sw.js',import.meta.url),'utf8'),context);
 let activation;handlers.activate({waitUntil:p=>{activation=p;}});await activation;
 assert.deepEqual(deleted.sort(),['home-project-planner-v9','hpp-home-project-planner-v10']);
 let respond=false;
 handlers.fetch({request:{method:'GET',mode:'navigate',url:'https://example.org/another-app/'},respondWith:()=>{respond=true;}});
 assert.equal(respond,false,'foreign app navigations must pass through untouched');
 handlers.fetch({request:{method:'GET',mode:'cors',url:'https://example.org/home-project-planner/private-data'},respondWith:()=>{respond=true;}});
 assert.equal(respond,false,'non-static application data should not be intercepted');
});
