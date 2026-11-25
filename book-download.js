/* Fetch only the chosen source; convert in a worker; commit a complete PDF atomically. */
(() => {
  'use strict';
  const MAX=32*1024*1024;
  async function sourceBytes(book,{signal,progress}){
    signal=AbortSignal.any([signal,AbortSignal.timeout(90000)]);const delivery=book.delivery;if(!delivery)throw Error('Reload the catalogue to get this book’s download details.');
    const url=delivery.direct?delivery.url:'/api/book-source?id='+encodeURIComponent(book.id);
    const response=await fetch(url,{signal,credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});
    if(!response.ok)throw Error(response.status===429?'The source is busy. Please try again shortly.':'The book’s source is temporarily unavailable. Please try again later.');
    const total=Number(response.headers.get('X-Book-Bytes')||response.headers.get('Content-Length')||delivery.downloadBytes),reader=response.body?.getReader();let bytes;
    if(reader){const chunks=[];let length=0;try{for(;;){signal.throwIfAborted();const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>MAX)throw Error('This source is too large to prepare safely on this device.');chunks.push(value);progress('Downloading from '+delivery.provider+'…'+(total?' '+Math.min(99,Math.round(length/total*100))+'%':''),total?Math.min(40,length/total*40):15)}bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}}finally{await reader.cancel().catch(()=>{});reader.releaseLock()}}
    else bytes=new Uint8Array(await response.arrayBuffer());
    if(!bytes.length||bytes.length>MAX)throw Error('The source download was incomplete. Please try again.');
    signal.throwIfAborted();return bytes;
  }
  async function prepare(book,{signal,progress}){
    const bytes=await sourceBytes(book,{signal,progress}),sourceHash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
    if(book.delivery.sha256&&book.delivery.sha256!==sourceHash)throw Error('The source edition changed and needs a new review. Please choose another book for now.');
    if(book.delivery.format!=='epub'&&!book.delivery.sha256)throw Error('This source edition needs to be verified before it can be added.');
    let publication;
    if(book.delivery.format==='epub')publication=await window.GRBookArchive.read(bytes,book,{signal,progress});
    else if(book.delivery.format==='txt'){const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);if(!text.trim()||/^\s*</.test(text))throw Error('The source did not return a readable text edition.');publication={sections:[{title:book.title,blocks:text.split(/\n\s*\n/).map(text=>({text,kind:'p'}))}],images:[]}}
    else if(book.delivery.format!=='pdf')throw Error('This source format is not supported.');
    signal.throwIfAborted();progress('Preparing your PDF on this device…',45);
    return new Promise((resolve,reject)=>{
      const worker=new Worker('/book-pdf-worker.js');
      const cleanup=()=>{signal.removeEventListener('abort',abort);worker.terminate()};
      const abort=()=>{cleanup();reject(new DOMException('Adding cancelled.','AbortError'))};
      signal.addEventListener('abort',abort,{once:true});if(signal.aborted){abort();return}
      worker.onmessage=e=>{const message=e.data;if(message.error){cleanup();reject(Error(message.error))}else if(message.progress)progress(message.progress,message.percent);else if(message.pdf){cleanup();resolve({file:new File([message.pdf],book.title.replace(/[\\/:*?"<>|]/g,' ').slice(0,160)+'.pdf',{type:'application/pdf',lastModified:0}),pages:message.pages,sourceHash,sections:publication?.sections.length||0})}};
      worker.onerror=()=>{cleanup();reject(Error('This device could not finish preparing the book. Close other apps and try again.'))};
      worker.postMessage({book:{title:book.title,author:book.author,source:book.delivery.sourcePage||book.source,provider:book.delivery.provider,format:book.delivery.format},publication,bytes:publication?undefined:bytes},publication?[]:[bytes.buffer]);
    });
  }
  window.GRBookDownload={prepare};
})();
