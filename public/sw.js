const CACHE = 'home-project-planner-v8';
const url = path => new URL(path, self.registration.scope).toString();
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Service workers first install AFTER the app's initial asset requests. Discover
    // the built Vite script/styles from index.html so the first install is truly offline-ready.
    const response = await fetch(url('./'), {cache:'reload'});
    if (!response.ok) throw new Error('App shell unavailable');
    const html = await response.text();
    await cache.put(url('./'), new Response(html,{headers:{'Content-Type':'text/html'}}));
    const paths = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]);
    const assets = [url('./manifest.webmanifest'),url('./icon-192.png'),url('./icon-512.png')];
    for (const path of paths) {
      const resolved = new URL(path, url('./'));
      if(resolved.origin===self.location.origin && resolved.pathname.startsWith(new URL(self.registration.scope).pathname)) assets.push(resolved.toString());
    }
    await Promise.allSettled([...new Set(assets)].map(path=>cache.add(path)));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys => Promise.all(keys.filter(key => key!==CACHE).map(key=>caches.delete(key))))]));
});
self.addEventListener('fetch', event => {
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin) return;
  if(event.request.mode==='navigate') {
    event.respondWith(fetch(event.request).then(response => {if(response.ok){const clone=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,clone));}return response;}).catch(()=>caches.match(event.request).then(r=>r||caches.match(url('./')))));
  } else {
    event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}return response;})));
  }
});
