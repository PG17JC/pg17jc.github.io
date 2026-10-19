// Guarda la app para que abra sin internet (compatible con Cloudflare Pages y GitHub Pages).
// Las páginas se piden primero a internet (4 s) para ver actualizaciones; si falla, se usa la copia guardada.
const V='caja-v13',SHELL=['./','index.html','pedido.html','manifest.webmanifest','icon.svg'];
const CDN=['https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js','https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'];
// Cloudflare redirige /index.html -> / y /pedido.html -> /pedido; una respuesta "redirigida" no se puede entregar a una navegación.
const clean=async r=>{if(!r.redirected)return r;const b=await r.blob();return new Response(b,{status:r.status,statusText:r.statusText,headers:r.headers})};
self.addEventListener('install',e=>{e.waitUntil((async()=>{
  const c=await caches.open(V);
  await Promise.all(SHELL.map(async u=>{const r=await fetch(new Request(u,{cache:'reload'}));if(!r.ok)throw new Error(u+' '+r.status);await c.put(u,await clean(r))}));
  await Promise.all(CDN.map(u=>fetch(u,{mode:'no-cors'}).then(r=>c.put(u,r)).catch(()=>{})));
  await self.skipWaiting();
})())});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||!(u.origin===location.origin||u.hostname==='cdnjs.cloudflare.com'))return;
  const page=u.origin===location.origin&&(e.request.mode==='navigate'||/\.html?$/.test(u.pathname)||u.pathname.endsWith('/'));
  if(page){
    e.respondWith(caches.open(V).then(async c=>{
      const net=fetch(u.href,{cache:'no-cache'}).then(async r=>{if(r&&r.ok){const k=await clean(r);c.put(e.request,k.clone());return k}return r});
      try{return await Promise.race([net,new Promise((_,no)=>setTimeout(no,4000))])}
      catch(x){
        const hit=await c.match(e.request,{ignoreSearch:true})
          ||(/pedido/.test(u.pathname)?await c.match('pedido.html'):(await c.match('./')||await c.match('index.html')));
        return hit||new Response('Sin conexión',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});
      }
    }));
    return;
  }
  e.respondWith(caches.open(V).then(async c=>{
    const hit=await c.match(e.request,{ignoreSearch:true});
    const net=fetch(e.request).then(r=>{if(r&&(r.ok||r.type==='opaque'))c.put(e.request,r.clone());return r}).catch(()=>hit);
    return hit||net;
  }));
});
