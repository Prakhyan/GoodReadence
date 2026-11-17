/* Cache selected recordings on disk while their first playback streams. */
const AUDIO_CACHE='goodreadence-audio-v2';
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
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
