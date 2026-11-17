/* Cache selected recordings on disk while their first playback streams. */
const AUDIO_CACHE='goodreadence-audio-v2';
const APP_CACHE='goodreadence-app-v7';
const SHELL=['/index.html','/premium.css','/premium-upgrade.css','/reader-refinements.css','/reader-refinements.js','/library.html','/library.css','/library.js','/premium-upgrade.js','/release.json','/textures/walnut.jpg','/textures/oak.jpg','/reader-addons.js','/brand-mark.svg','/appearance.js','/site.css','/freehand.js','/favicon.svg','/manifest.webmanifest','/icon-192.png','/icon-512.png','/vendor/pdf-lib.min.js','/about.html','/faq.html','/contact.html','/updates.html','/ambience/CREDITS.html'];
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(APP_CACHE);await cache.addAll(SHELL);await self.skipWaiting()})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith('goodreadence-app-')&&name!==APP_CACHE)await caches.delete(name);await self.clients.claim()})()));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(url.pathname.startsWith('/public-books/'))return; // Manual downloads never enter the app cache or HTML fallback.
  if(url.origin===self.location.origin&&event.request.method==='GET'&&(SHELL.includes(url.pathname)||event.request.mode==='navigate')){
    event.respondWith((async()=>{const cache=await caches.open(APP_CACHE);try{const response=await fetch(event.request);if(response.ok)event.waitUntil(cache.put(event.request,response.clone()).catch(()=>{}));return response}catch(error){const cached=await cache.match(event.request)||await cache.match('/index.html');if(cached)return cached;throw error}})());return;
  }
  if(url.origin!==self.location.origin||!url.pathname.startsWith('/ambience/')||!url.pathname.endsWith('.mp3'))return;
  event.respondWith((async()=>{
    const cache=await caches.open(AUDIO_CACHE),key=new Request(url.href),cached=await cache.match(key);
    if(cached){
      const range=event.request.headers.get('range');
      if(!range)return cached;
      const bytes=await cached.arrayBuffer(),match=/^bytes=(\d*)-(\d*)$/.exec(range);
      if(!match)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${bytes.byteLength}`}});
      const start=match[1]?Number(match[1]):Math.max(0,bytes.byteLength-Number(match[2]));
      const end=match[1]&&match[2]?Math.min(Number(match[2]),bytes.byteLength-1):bytes.byteLength-1;
      if(start>end||start>=bytes.byteLength)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${bytes.byteLength}`}});
      return new Response(bytes.slice(start,end+1),{status:206,headers:{'Content-Type':'audio/mpeg','Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${bytes.byteLength}`,'Content-Length':String(end-start+1)}});
    }
    const response=await fetch(key);
    if(response.ok)event.waitUntil(cache.put(key,response.clone()).catch(()=>{}));
    return response;
  })());
});
