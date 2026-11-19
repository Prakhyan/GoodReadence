/* Portable, versioned archives. No application server receives these files. */
(()=>{
  'use strict';
  const MAX=1024*1024*1024, FILE_MAX=300*1024*1024, META_MAX=32*1024*1024;
  const encoder=new TextEncoder(), decoder=new TextDecoder();
  const prefKey=k=>k==='cc:s'||/^(fb:|gr:)/.test(k)&&!/^gr:(sync|oauth)/.test(k);
  const safeName=s=>String(s||'book').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,100);
  const uuid=()=>crypto.randomUUID();
  function device(){try{let id=localStorage.getItem('gr:sync-device');if(!id){id=uuid();localStorage.setItem('gr:sync-device',id)}return id}catch{return uuid()}}
  const deviceId=device();
  function touchBook(book){book.grModifiedAt=Date.now();book.grClock={...(book.grClock||{}),[deviceId]:(book.grClock?.[deviceId]||0)+1};return book}
  function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open('casid',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('b'))r.result.createObjectStore('b',{keyPath:'id'});if(!r.result.objectStoreNames.contains('f'))r.result.createObjectStore('f')};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Close other GoodReadence tabs and try again.'))})}
  async function readDB(){const db=await openDB();try{return await new Promise((resolve,reject)=>{const t=db.transaction(['b','f']);const b=t.objectStore('b').getAll(),f=t.objectStore('f').getAll(),k=t.objectStore('f').getAllKeys();t.oncomplete=()=>resolve({books:b.result,records:f.result.map((value,i)=>({key:k.result[i],value}))});t.onabort=t.onerror=()=>reject(t.error)})}finally{db.close()}}
  async function capture(ids=null,settings=true){
    if(window.GRPortable.beforeCapture)await window.GRPortable.beforeCapture();
    const data=await readDB(),selected=ids?new Set(ids):null;
    data.books=data.books.filter(b=>!selected||selected.has(b.id));
    data.records=data.records.filter(r=>!selected||selected.has(r.key)||settings&&r.key==='gr:brush');
    for(const b of data.books)if(!data.records.some(r=>r.key===b.id&&r.value instanceof Blob&&r.value.size>0))throw Error('The file for “'+b.name+'” is missing. Add it again before making a full backup.');
    data.records=data.records.filter(r=>data.books.some(b=>b.id===r.key)||r.key==='gr:brush');
    data.settings={};if(settings)for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(prefKey(key))data.settings[key]=localStorage.getItem(key)}
    return {...data,kind:'goodreadence-backup',schema:1,createdAt:new Date().toISOString(),deviceId};
  }
  async function digest(blob){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(v=>v.toString(16).padStart(2,'0')).join('')}
  async function archive(data,onProgress=()=>{},writable=null){
    const parts=[],manifest={kind:data.kind,schema:1,createdAt:data.createdAt,deviceId:data.deviceId,books:data.books,settings:data.settings,records:[]};
    let size=0;
    for(let i=0;i<data.records.length;i++){const {key,value}=data.records[i];if(value instanceof Blob){if(value.size>FILE_MAX)throw Error('One book exceeds the 300 MB backup limit.');size+=value.size;if(size>MAX)throw Error('This backup exceeds 1 GB. Export selected books in smaller groups.');manifest.records.push({key,path:'files/'+i+'.bin',size:value.size,type:value.type,name:value.name||'',lastModified:value.lastModified||0,sha256:await digest(value)});}else manifest.records.push({key,value})}
    for(const r of manifest.records){const book=manifest.books.find(b=>b.id===r.key);if(book&&r.sha256)book.grFileHash=r.sha256}
    const metadata=encoder.encode(JSON.stringify(manifest));if(metadata.length>META_MAX)throw Error('The backup has too much annotation data. Export selected books in smaller groups.');
    let chain=Promise.resolve(),failure;
    const zip=new fflate.Zip((error,chunk)=>{if(error){failure=error;return}if(writable)chain=chain.then(()=>writable.write(chunk)).catch(e=>{failure=e});else parts.push(chunk)});
    const meta=new fflate.ZipPassThrough('goodreadence.json');zip.add(meta);meta.push(metadata,true);
    for(let i=0;i<data.records.length;i++){const r=manifest.records[i],value=data.records[i].value;if(!r.path)continue;const file=new fflate.ZipDeflate(r.path,{level:0});zip.add(file);const reader=value.stream().getReader();while(true){const {done,value:chunk}=await reader.read();if(done)break;file.push(chunk);await chain;if(failure)throw failure}file.push(new Uint8Array(),true);onProgress('Packing '+(i+1)+' of '+data.records.length+' saved items…')}
    zip.end();await chain;if(failure)throw failure;
    if(writable){await writable.close();return null}return new Blob(parts,{type:'application/zip'});
  }
  function plain(value,depth=0){if(depth>40)throw Error('Backup data is nested too deeply.');if(value===null||typeof value==='boolean'||typeof value==='string')return;if(typeof value==='number'&&Number.isFinite(value))return;if(Array.isArray(value)){for(const v of value)plain(v,depth+1);return}if(typeof value!=='object')throw Error('Invalid backup data.');for(const [key,v]of Object.entries(value)){if(['__proto__','constructor','prototype'].includes(key))throw Error('Unsafe backup property.');plain(v,depth+1)}}
  function readingData(b){
    const page=p=>Number.isInteger(+p)&&+p>=0&&+p<b.n,colour=c=>typeof c==='string'&&(/^[#][a-f0-9]{3,8}$/i.test(c)||/^[a-z]{1,24}$/i.test(c)||/^(rgba?|hsla?)\([\d\s.,%+\/-]+\)$/i.test(c));
    function pages(value,check){if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid page annotations.');for(const[p,v]of Object.entries(value))if(!page(p)||!check(v))throw Error('Invalid annotation on page '+p)}
    if(b.name.length>4000||b.n>1000000||b.format&&!['pdf','epub','office'].includes(b.format))throw Error('Unsupported book record.');
    if(b.last!==undefined&&!page(b.last))throw Error('Invalid reading position.');
    if(b.notes)pages(b.notes,v=>typeof v==='string'&&v.length<=1000000);
    if(b.annotations){if(typeof b.annotations!=='object'||Array.isArray(b.annotations))throw Error('Invalid highlights.');if(b.annotations.bm&&(!Array.isArray(b.annotations.bm)||b.annotations.bm.some(p=>!page(p))))throw Error('Invalid bookmarks.');if(b.annotations.hl)pages(b.annotations.hl,v=>Array.isArray(v)&&v.every(r=>Array.isArray(r)&&r.length===5&&r.slice(0,4).every(n=>typeof n==='number'&&n>=0&&n<=1.001)&&colour(r[4])))}
    if(b.ink)pages(b.ink,v=>Array.isArray(v)&&v.every(s=>s&&colour(s.colour)&&typeof s.width==='number'&&s.width>0&&s.width<=5&&Array.isArray(s.points)&&s.points.length<=100000&&s.points.every(p=>Array.isArray(p)&&p.length===2&&p.every(n=>typeof n==='number'&&n>=0&&n<=1.001))));
    if(b.marks&&(!Array.isArray(b.marks)||b.marks.some(m=>!m||!page(m.chapter)||typeof m.label!=='string')))throw Error('Invalid EPUB reading marks.');
    if((b.format==='epub'||b.format==='office')&&b.type){const t=b.type;for(const [key,min,max]of [['lineHeight',1,3.5],['margin',0,20],['measure',35,100]])if(t[key]!==undefined&&(typeof t[key]!=='number'||!Number.isFinite(t[key])||t[key]<min||t[key]>max))throw Error('Invalid typography preference.');if(typeof t!=='object'||Array.isArray(t)||t.size!==undefined&&(typeof t.size!=='number'||t.size<8||t.size>100)||t.font!==undefined&&(typeof t.font!=='string'||!/^[\w\s,'"-]{1,100}$/.test(t.font))||t.ink!==undefined&&!colour(t.ink)||t.paper!==undefined&&!colour(t.paper))throw Error('Invalid reading style.')}
  }
  function validate(m){plain(m);if(m.kind!=='goodreadence-backup'||m.schema!==1||!Array.isArray(m.books)||!Array.isArray(m.records)||m.books.length>10000||m.records.length>12000)throw Error('This is not a supported GoodReadence backup.');const ids=new Set();for(const b of m.books){if(!b||typeof b.id!=='string'||b.id.length>1000||typeof b.name!=='string'||!Number.isInteger(b.n)||b.n<1||ids.has(b.id))throw Error('Invalid or duplicate book record.');ids.add(b.id);if(b.cover&&!/^data:image\/(png|jpeg|jpg|webp);base64,[a-zA-Z0-9+/=\s]+$/.test(b.cover))throw Error('Unsupported book cover in backup.');if(b.grClock&&Object.values(b.grClock).some(v=>!Number.isSafeInteger(v)||v<0))throw Error('Invalid book revision.')}
    const keys=new Set(),paths=new Set();for(const r of m.records){if((typeof r.key!=='string'&&typeof r.key!=='number')||keys.has(r.key))throw Error('Duplicate or invalid saved-data key.');keys.add(r.key);if(r.path){if(!/^files\/\d+\.bin$/.test(r.path)||paths.has(r.path)||!Number.isSafeInteger(r.size)||r.size<1||r.size>FILE_MAX||!/^[a-f0-9]{64}$/.test(r.sha256))throw Error('Invalid book file record.');paths.add(r.path)}else if(r.key!=='gr:brush')throw Error('Unsupported saved-data record.')}
    for(const b of m.books){readingData(b);if(!m.records.some(r=>r.key===b.id&&r.path))throw Error('A book is missing its file.')}
    if(m.records.some(r=>r.path&&!ids.has(r.key)))throw Error('An archive file has no matching book.');
    if(!m.settings||typeof m.settings!=='object'||Array.isArray(m.settings))throw Error('Invalid settings.');for(const [k,v]of Object.entries(m.settings))if(!prefKey(k)||typeof v!=='string'||v.length>5*1024*1024||/[<>]/.test(v))throw Error('Invalid backup setting.');return m;
  }
  async function decodeArchive(blob,onProgress=()=>{}){
    if(blob.size>MAX+META_MAX+4*1024*1024)throw Error('Backups larger than 1 GB cannot be restored in this browser.');
    // Read the central directory rather than scanning payloads for ZIP signatures:
    // an EPUB is itself a ZIP and legitimately contains those signatures.
    const tailStart=Math.max(0,blob.size-65557),tail=new Uint8Array(await blob.slice(tailStart).arrayBuffer()),view=new DataView(tail.buffer);let end=-1;
    for(let i=tail.length-22;i>=0;i--)if(view.getUint32(i,true)===0x06054b50&&i+22+view.getUint16(i+20,true)===tail.length){end=i;break}
    if(end<0||view.getUint16(end+4,true)||view.getUint16(end+6,true))throw Error('Incomplete or unsupported ZIP backup.');
    const count=view.getUint16(end+10,true),directorySize=view.getUint32(end+12,true),directoryStart=view.getUint32(end+16,true);
    if(!count||count>12001||count!==view.getUint16(end+8,true)||directorySize>2*1024*1024||directoryStart+directorySize!==tailStart+end)throw Error('Invalid backup directory.');
    const directory=new Uint8Array(await blob.slice(directoryStart,directoryStart+directorySize).arrayBuffer()),dv=new DataView(directory.buffer),descriptors=[],names=new Set();let offset=0,total=0;
    for(let i=0;i<count;i++){
      if(offset+46>directory.length||dv.getUint32(offset,true)!==0x02014b50)throw Error('Invalid ZIP directory entry.');
      const flags=dv.getUint16(offset+8,true),method=dv.getUint16(offset+10,true),crc=dv.getUint32(offset+16,true),compressed=dv.getUint32(offset+20,true),size=dv.getUint32(offset+24,true),nameLength=dv.getUint16(offset+28,true),extra=dv.getUint16(offset+30,true),comment=dv.getUint16(offset+32,true),start=dv.getUint32(offset+42,true);
      if(nameLength>60||offset+46+nameLength+extra+comment>directory.length||flags&1||![0,8].includes(method)||dv.getUint16(offset+34,true))throw Error('Encrypted or unsupported ZIP entry.');
      const name=decoder.decode(directory.subarray(offset+46,offset+46+nameLength));if(names.has(name)||!(/^(goodreadence\.json|files\/\d+\.bin)$/.test(name)))throw Error('Unexpected or duplicate archive entry.');names.add(name);total+=size;
      if(size>(name==='goodreadence.json'?META_MAX:FILE_MAX)||total>MAX+META_MAX||compressed>blob.size||start+30>=directoryStart)throw Error('Archive is too large or damaged.');
      descriptors.push({name,flags,method,crc,compressed,size,start});offset+=46+nameLength+extra+comment;
    }
    if(offset!==directory.length||!names.has('goodreadence.json'))throw Error('Incomplete backup directory.');
    const table=new Uint32Array(256);for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;table[i]=c>>>0}
    const entries=new Map(),ranges=[];
    for(const entry of descriptors){
      const local=new Uint8Array(await blob.slice(entry.start,entry.start+30).arrayBuffer()),lv=new DataView(local.buffer);if(local.length!==30||lv.getUint32(0,true)!==0x04034b50||lv.getUint16(8,true)!==entry.method||lv.getUint16(6,true)!==entry.flags)throw Error('Damaged ZIP header.');
      const nl=lv.getUint16(26,true),extra=lv.getUint16(28,true);if(nl>60||extra>4096)throw Error('Invalid ZIP header.');const name=decoder.decode(await blob.slice(entry.start+30,entry.start+30+nl).arrayBuffer());if(name!==entry.name)throw Error('ZIP file names do not match.');
      const start=entry.start+30+nl+extra,finish=start+entry.compressed;if(finish>directoryStart||ranges.some(([a,b])=>entry.start<b&&finish>a))throw Error('Overlapping or incomplete ZIP entry.');ranges.push([entry.start,finish]);
      let size=0,crc=0xffffffff;const parts=[];function output(chunk){size+=chunk.length;if(size>entry.size)throw Error('Archive expands beyond its declared size.');for(let i=0;i<chunk.length;i++)crc=(crc>>>8)^table[(crc^chunk[i])&255];parts.push(chunk)}
      const inflate=entry.method===8?new fflate.Inflate(output):null,reader=blob.slice(start,finish).stream().getReader();
      try{while(true){const {done,value}=await reader.read();if(done)break;for(let i=0;i<value.length;i+=16384){const chunk=value.subarray(i,i+16384);inflate?inflate.push(chunk):output(chunk)}}if(inflate)inflate.push(new Uint8Array(),true)}finally{reader.releaseLock()}
      if(size!==entry.size||((crc^0xffffffff)>>>0)!==entry.crc)throw Error('A backup entry is damaged.');entries.set(entry.name,new Blob(parts));
    }
    const metadata=entries.get('goodreadence.json');const manifest=validate(JSON.parse(await metadata.text()));
    const records=[];for(const r of manifest.records){if(r.path){const file=entries.get(r.path);if(!file||file.size!==r.size||await digest(file)!==r.sha256)throw Error('A book file is incomplete or damaged.');records.push({key:r.key,sha256:r.sha256,value:new File([file],r.name||'book.pdf',{type:r.type||'application/octet-stream',lastModified:r.lastModified||0})});const book=manifest.books.find(b=>b.id===r.key);if(book)book.grFileHash=r.sha256}else records.push({key:r.key,value:r.value});onProgress('Checked '+records.length+' of '+manifest.records.length+' saved items…')}
    if(entries.size!==manifest.records.filter(r=>r.path).length+1)throw Error('The archive contains unlisted files.');return {...manifest,records};
  }
  const content=b=>JSON.stringify(Object.fromEntries(Object.entries(b).filter(([k])=>!['grClock','grFileHash','grModifiedAt','ts','lastReadAt'].includes(k))));
  function branchContent(b){const copy={...b,id:b.grConflictOf||b.id,name:b.grOriginalName||b.name};delete copy.grConflictOf;delete copy.grOriginalName;return content(copy)}
  function maxClock(a={},b={}){return Object.fromEntries([...new Set([...Object.keys(a),...Object.keys(b)])].map(k=>[k,Math.max(a[k]||0,b[k]||0)]))}
  function compareClock(a,b){let greater=false,less=false;for(const k of new Set([...Object.keys(a||{}),...Object.keys(b||{})])){if((a?.[k]||0)>(b?.[k]||0))greater=true;if((a?.[k]||0)<(b?.[k]||0))less=true}return greater&&!less?1:less&&!greater?-1:greater&&less?null:0}
  function merge(local,incoming,mode='keep-both'){
    const books=new Map(local.books.map(b=>[b.id,b])),records=new Map(local.records.map(r=>[r.key,r.value]));let added=0,conflicts=0;
    for(const source of incoming.books){let b=structuredClone(source),id=b.id,existing=books.get(id);const file=incoming.records.find(r=>r.key===id)?.value;if(!(file instanceof Blob))throw Error('Missing book file.');
      if(mode==='cloud'){const twin=[...books.values()].find(x=>x.id!==id&&(x.grConflictOf||x.id)===(b.grConflictOf||id)&&branchContent(x)===branchContent(b)&&(!x.grFileHash||x.grFileHash===b.grFileHash));if(twin){twin.grClock=maxClock(twin.grClock,b.grClock);continue}}
      if(existing&&(content(existing)!==content(b)||existing.grFileHash&&b.grFileHash&&existing.grFileHash!==b.grFileHash)){
        if(mode==='cloud'){const relation=compareClock(b.grClock,existing.grClock);if(relation===-1)continue;if(relation===1){/* Incoming edits include the local revision. */}else{const signature=JSON.stringify(source.grClock||{})+'|'+branchContent(source);let hash=2166136261;for(const c of signature)hash=Math.imul(hash^c.charCodeAt(0),16777619);id=id+'|conflict:'+((hash>>>0).toString(16));if(books.has(id))continue;b.grConflictOf=source.grConflictOf||source.id;b.grOriginalName=source.grOriginalName||source.name;b.id=id;b.name=b.grOriginalName+' (other device)';conflicts++}}
        else if(mode==='keep-both'){id=id+'|restored:'+uuid();b.id=id;b.name+=' (restored copy)';conflicts++}
      }
      if(existing&&id===existing.id){b.grClock=maxClock(existing.grClock,b.grClock);b.ts=Math.max(existing.ts||0,b.ts||0);b.lastReadAt=Math.max(existing.lastReadAt||0,b.lastReadAt||0)}
      if(mode!=='cloud')touchBook(b);
      if(!books.has(id))added++;books.set(id,b);records.set(id,file);
    }
    for(const r of incoming.records)if(r.key==='gr:brush')records.set(r.key,r.value);
    return {books:[...books.values()],records:[...records].map(([key,value])=>({key,value})),added,conflicts};
  }
  async function apply(data,{mode='keep-both',settings=true}={}){
    if(mode!=='cloud')await window.GRPortable.beforeRestore?.();
    const local=await readDB(),baseline=new Map(local.books.map(b=>[b.id,JSON.stringify(b)]));for(const b of data.books){const r=data.records.find(r=>r.key===b.id);if(r?.value instanceof Blob)b.grFileHash=r.sha256||await digest(r.value);const existing=local.books.find(x=>x.id===b.id),file=local.records.find(x=>x.key===b.id)?.value;if(existing&&file instanceof Blob)existing.grFileHash=await digest(file)}
    const merged=merge(local,{...data,records:settings?data.records:data.records.filter(r=>r.key!=='gr:brush')},mode),estimate=await navigator.storage?.estimate?.();
    await window.GRPortable.prepareRestore?.(merged,mode);
    const incomingBytes=data.records.reduce((n,r)=>n+(r.value instanceof Blob?r.value.size:0),0);
    if(estimate?.quota&&estimate.quota-estimate.usage<incomingBytes)throw Error('Not enough free browser storage to safely restore this backup.');
    const previous={};if(settings)try{for(const [k,v]of Object.entries(data.settings||{})){previous[k]=localStorage.getItem(k);localStorage.setItem(k,v)}}catch(e){for(const[k,v]of Object.entries(previous)){try{v===null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch{}}throw Error('Settings could not be restored. No books were changed.')}
    const db=await openDB();try{await new Promise((resolve,reject)=>{const t=db.transaction(['b','f'],'readwrite');t.oncomplete=resolve;t.onabort=t.onerror=()=>reject(t.error);try{for(const b of merged.books)if(JSON.stringify(local.books.find(x=>x.id===b.id))!==JSON.stringify(b)){const check=t.objectStore('b').get(b.id);check.onsuccess=()=>{try{if(JSON.stringify(check.result)!==baseline.get(b.id))throw Error('The library changed in another tab. Close that tab and try again.');t.objectStore('b').put(b)}catch(e){t.abort();reject(e)}}}for(const r of merged.records)if(local.records.find(x=>x.key===r.key)?.value!==r.value)t.objectStore('f').put(r.value,r.key)}catch(e){t.abort();reject(e)}})}catch(e){for(const[k,v]of Object.entries(previous)){try{v===null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch{}}throw Error('Restore failed. Your existing library is unchanged. '+(e?.message||''))}finally{db.close()}
    await window.GRPortable.afterRestore?.();return merged;
  }
  function download(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=String(name).replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,180);a.hidden=true;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
  async function annotations(book,format='md'){
    const md=format==='md',lines=[(md?'# ':'')+book.name,'','Exported from GoodReadence · '+new Date().toLocaleDateString(),''];
    const title=s=>lines.push((md?'## ':'')+s,'');let count=0;
    for(const [p,text]of Object.entries(book.notes||{}).sort((a,b)=>+a[0]-+b[0])){title('Page '+(+p+1)+' — margin note');lines.push(String(text),'');count++}
    const annotation=book.annotations||{};if(annotation.bm?.length){title('Bookmarks');for(const p of annotation.bm)lines.push('- Page '+(+p+1));lines.push('')}
    let doc;
    try{for(const [p,rectangles]of Object.entries(annotation.hl||{})){if(!rectangles?.length)continue;title('Page '+(+p+1)+' — highlights');
        let quoted=[];try{if(!doc){const r=(await readDB()).records.find(r=>r.key===book.id);if(r?.value instanceof Blob)doc=await pdfjsLib.getDocument({isEvalSupported:false,data:new Uint8Array(await r.value.arrayBuffer())}).promise}
          if(doc){const page=await doc.getPage(+p+1),viewport=page.getViewport({scale:1}),text=await page.getTextContent();for(const rect of rectangles){const[x,y,w,h]=rect;const items=text.items.filter(item=>{const t=pdfjsLib.Util.transform(viewport.transform,item.transform),cx=(t[4]+item.width/2)/viewport.width,cy=(t[5]-Math.max(item.height,8)/2)/viewport.height;return cx>=x&&cx<=x+w&&cy>=y&&cy<=y+h});const quote=items.map(i=>i.str+(i.hasEOL?'\n':' ')).join('').trim();quoted.push(quote||'Visual highlight: x '+Math.round(x*100)+'%, y '+Math.round(y*100)+'%, width '+Math.round(w*100)+'%, height '+Math.round(h*100)+'%. No selectable text was found in this area.')}}
        }catch{quoted=['Text could not be extracted. The visual highlights remain in your backup.']}
        for(const text of quoted.length?quoted:['Visual highlights saved on this page.'])lines.push(md?'> '+text.replace(/\n/g,'\n> '):text,'');count+=rectangles.length;
      }}finally{if(doc)await (doc.loadingTask||doc).destroy()}
    for(const mark of book.marks||[]){title('Chapter '+((mark.chapter||0)+1)+' — '+(mark.i===undefined?'bookmark':'highlight'));lines.push(String(mark.label||''),'');count++}
    for(const [p,strokes]of Object.entries(book.ink||{})){if(strokes?.length){title('Page '+(+p+1)+' — freehand marks');lines.push(strokes.length+' drawing stroke(s). Drawings are visual marks, so their shapes are retained in the full backup rather than converted into words.','');count+=strokes.length}}
    if(!count)lines.push('No saved notes or highlights for this book.','');return lines.join('\n');
  }
  window.GRPortable={deviceId,touchBook,readDB,capture,archive,decodeArchive,validate,merge,apply,digest,download,annotations,safeName,compareClock,bookSignature:content};
})();


