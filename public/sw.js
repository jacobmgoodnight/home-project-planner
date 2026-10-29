// This PWA shares jacobmgoodnight.github.io with other apps. Do not touch their caches.
const OWN_PREFIX = 'hpp-home-project-planner-';
const CACHE = OWN_PREFIX + 'v11';
const LEGACY_OWNED = new Set(Array.from({length:10},(_,i)=>'home-project-planner-v'+(i+1)));
const SCOPE = new URL(self.registration.scope);
const scoped = requestUrl => {
  const u = new URL(requestUrl);
  return u.origin===SCOPE.origin && u.pathname.startsWith(SCOPE.pathname);
};
const appUrl = path => new URL(path,self.registration.scope).toString();
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    const shell=appUrl('./');
    const response=await fetch(shell,{cache:'reload'});
    if(!response.ok)throw new Error('Home Project Planner app shell unavailable');
    const html=await response.text();
    await cache.put(shell,new Response(html,{headers:{'Content-Type':'text/html'}}));
    const refs=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]);
    const assets=[appUrl('./manifest.webmanifest'),appUrl('./icon-192.png'),appUrl('./icon-512.png')];
    for(const ref of refs){const target=new URL(ref,shell);if(scoped(target.toString()))assets.push(target.toString());}
    await Promise.allSettled([...new Set(assets)].map(asset=>cache.add(asset)));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(names.filter(name=>
      name!==CACHE&&(name.startsWith(OWN_PREFIX)||LEGACY_OWNED.has(name))
    ).map(name=>caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||!scoped(request.url))return;
  const path=new URL(request.url).pathname;
  // Never intercept another app, external API, or arbitrary same-origin data.
  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      try{
        const response=await fetch(request);
        if(response.ok)await cache.put(request,response.clone());
        return response;
      }catch{
        return await cache.match(request)||await cache.match(appUrl('./'))||Response.error();
      }
    })());
    return;
  }
  const staticAsset=path.startsWith(SCOPE.pathname+'assets/')
    ||path===SCOPE.pathname+'manifest.webmanifest'
    ||/^icon-(?:192|512)\.png$/.test(path.slice(SCOPE.pathname.length));
  if(!staticAsset)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const cached=await cache.match(request);
    if(cached)return cached;
    const response=await fetch(request);
    if(response.ok)await cache.put(request,response.clone());
    return response;
  })());
});
