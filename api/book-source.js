// Approved, user-requested downloads only. No URL parameter, disk writes or PDF generation.
const sources=require('../book-sources.json');
const {Readable,Transform}=require('node:stream');
const {pipeline}=require('node:stream/promises');
const MAX=32*1024*1024;
module.exports=async function bookSource(req,res){
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  const url=new URL(req.url,'https://goodreadence.vercel.app');
  if(req.method!=='GET'){res.setHeader('Allow','GET');res.writeHead(405).end();return}
  if(req.headers['sec-fetch-site']==='cross-site'){res.writeHead(403).end();return}
  const id=url.searchParams.get('id'),source=/^\d+$/.test(id||'')&&sources[id];
  if(!source||[...url.searchParams.keys()].some(key=>key!=='id')){res.writeHead(404).end('Book not found.');return}
  const target=new URL(source.url);
  if(target.protocol!=='https:'||!['gutenberg.pglaf.org','standardebooks.org'].includes(target.hostname)){res.writeHead(502).end();return}
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),90000);
  const close=()=>{if(!res.writableEnded)controller.abort()};res.on('close',close);
  try{
    const upstream=await fetch(target,{signal:controller.signal,redirect:'error',headers:{'User-Agent':'GoodReadence/1.13 (single reader-initiated book download; https://goodreadence.vercel.app/contact)'}});
    if(!upstream.ok||!upstream.body||Number(upstream.headers.get('content-length'))>MAX){res.writeHead(502).end('The source is temporarily unavailable. Please try again later.');return}
    res.setHeader('Content-Type',source.format==='pdf'?'application/pdf':source.format==='txt'?'text/plain; charset=utf-8':'application/epub+zip');
    res.setHeader('Content-Disposition','attachment; filename="book-'+id+'.'+source.format+'"');
    const length=Number(upstream.headers.get('content-length'));if(length>0)res.setHeader('X-Book-Bytes',String(length));
    let received=0;const limit=new Transform({transform(chunk,encoding,done){received+=chunk.length;done(received>MAX?Error('Source exceeds download limit.'):null,chunk)}});
    await pipeline(Readable.fromWeb(upstream.body),limit,res);
  }catch(error){if(!res.headersSent)res.writeHead(error.name==='AbortError'?504:502).end('The source could not be reached. Please try again.');else res.destroy()}
  finally{clearTimeout(timer);res.off('close',close);controller.abort()}
};
