// Guarda la app para que abra sin internet. Las páginas (.html) se piden SIEMPRE primero a internet
// (con 4 s de espera) para que las actualizaciones aparezcan al recargar; si no hay internet, usa la copia guardada.
const V='caja-v12',SHELL=['./','index.html','manifest.webmanifest','icon.svg','pedido.html'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||!(u.origin===location.origin||u.hostname==='cdnjs.cloudflare.com'))return;
  const page=u.origin===location.origin&&(e.request.mode==='navigate'||/\.html?$/.test(u.pathname)||u.pathname.endsWith('/'));
  if(page){
    e.respondWith(caches.open(V).then(async c=>{
      const net=fetch(u.href,{cache:'no-cache'}).then(r=>{if(r&&r.ok)c.put(e.request,r.clone());return r});
      try{return await Promise.race([net,new Promise((_,no)=>setTimeout(no,4000))])}
      catch(x){const hit=await c.match(e.request,{ignoreSearch:true});return hit||net}
    }));
    return;
  }
  e.respondWith(caches.open(V).then(async c=>{
    const hit=await c.match(e.request,{ignoreSearch:true});
    const net=fetch(e.request).then(r=>{if(r&&(r.ok||r.type==='opaque'))c.put(e.request,r.clone());return r}).catch(()=>hit);
    return hit||net;
  }));
});
