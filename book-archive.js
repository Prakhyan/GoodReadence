/* Parse an inert EPUB package. Document markup is never inserted into the app. */
(() => {
  'use strict';
  const LIMIT=64*1024*1024,ENTRY=12*1024*1024;
  async function read(bytes,book,{signal,progress}){
    const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),decoder=new TextDecoder(),entries=new Map();
    const u16=p=>{if(p<0||p+2>bytes.length)throw Error('Invalid EPUB directory.');return view.getUint16(p,true)},u32=p=>{if(p<0||p+4>bytes.length)throw Error('Invalid EPUB directory.');return view.getUint32(p,true)};
    let end=bytes.length-22;while(end>=Math.max(0,bytes.length-65557)&&u32(end)!==0x06054b50)end--;
    if(end<0||u32(end)!==0x06054b50||u16(end+4)||u16(end+6))throw Error('The source did not return a complete EPUB.');
    const count=u16(end+10),size=u32(end+12),start=u32(end+16);
    if(count!==u16(end+8)||!count||count>5000||start+size>end)throw Error('Unsupported EPUB directory.');
    let cursor=start,total=0;
    for(let i=0;i<count;i++){
      if(u32(cursor)!==0x02014b50)throw Error('Invalid EPUB entry.');
      const name=decoder.decode(bytes.subarray(cursor+46,cursor+46+u16(cursor+28))),length=u32(cursor+24),next=cursor+46+u16(cursor+28)+u16(cursor+30)+u16(cursor+32);
      if(next>start+size||!name||name.startsWith('/')||name.includes('\\')||name.split('/').includes('..')||entries.has(name)||length>ENTRY)throw Error('This EPUB exceeds safe conversion limits.');
      total+=length;if(total>LIMIT)throw Error('This EPUB is too large to prepare safely on this device.');
      entries.set(name,{header:u32(cursor+42),compressed:u32(cursor+20),length,method:u16(cursor+10),flags:u16(cursor+8),crc:u32(cursor+16)});cursor=next;
    }
    if(cursor!==start+size)throw Error('Incomplete EPUB directory.');
    const table=Uint32Array.from({length:256},(_,n)=>{let c=n;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0});
    const crc=data=>{let c=0xffffffff;for(const byte of data)c=table[(c^byte)&255]^(c>>>8);return(c^0xffffffff)>>>0};
    async function extract(name){
      signal.throwIfAborted();const e=entries.get(name);if(!e)throw Error('The source is missing part of the book.');
      if(e.flags&1||![0,8].includes(e.method)||u32(e.header)!==0x04034b50)throw Error('Unsupported or encrypted EPUB content.');
      const begin=e.header+30+u16(e.header+26)+u16(e.header+28),finish=begin+e.compressed;
      if(finish>start||begin>finish)throw Error('Invalid EPUB content.');
      let data=bytes.subarray(begin,finish);
      if(e.method===8){const stream=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')),reader=stream.getReader(),parts=[];let length=0;try{for(;;){signal.throwIfAborted();const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>e.length||length>ENTRY)throw Error('The EPUB contains an oversized section.');parts.push(value)}data=new Uint8Array(length);let at=0;for(const part of parts){data.set(part,at);at+=part.length}}finally{await reader.cancel().catch(()=>{});reader.releaseLock()}}
      if(data.length!==e.length||crc(data)!==e.crc)throw Error('The source download was damaged. Please try again.');return data.slice();
    }
    async function xml(name){let text=decoder.decode(await extract(name));text=text.replace(/<!DOCTYPE[^>]*>/gi,'');if(/<!ENTITY|<!DOCTYPE/i.test(text))throw Error('Unsupported EPUB entity declarations.');const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.querySelector('parsererror'))throw Error('The source has an unreadable chapter.');return doc}
    const resolve=(href,base)=>{const url=new URL(href,'https://book.invalid/'+base);if(url.origin!=='https://book.invalid'||url.search)throw Error('External EPUB content is not supported.');return decodeURIComponent(url.pathname.slice(1))};
    const container=await xml('META-INF/container.xml'),packagePath=container.querySelector('rootfile')?.getAttribute('full-path');if(!packagePath)throw Error('The EPUB has no reading package.');
    const pkg=await xml(packagePath),identifiers=[...pkg.getElementsByTagNameNS('*','identifier')].map(el=>el.textContent.trim());
    const expected=book.delivery.identifier;
    const identityOK=book.delivery.provider==='Project Gutenberg'?identifiers.some(id=>new RegExp('(?:^|[/:])'+book.id+'/?$').test(id)):identifiers.includes(expected);
    if(!identityOK)throw Error('The source returned a different edition. Please try again later.');
    const normalizeName=name=>name.normalize('NFC').toLowerCase().replace(/\s+/g,' ').trim();
    const reviewed=new Set((book.delivery.reviewedNames||[]).map(normalizeName));
    const names=[...pkg.getElementsByTagNameNS('*','creator'),...pkg.getElementsByTagNameNS('*','contributor')].map(el=>normalizeName(el.textContent));
    if(reviewed.size&&names.some(name=>!reviewed.has(name)))throw Error('The source edition has changed and needs a new review. Please choose another book for now.');
    const manifest=new Map([...pkg.querySelectorAll('manifest > item')].map(el=>[el.id,{path:resolve(el.getAttribute('href'),packagePath),type:el.getAttribute('media-type')}]));
    const refs=[...pkg.querySelectorAll('spine > itemref')];if(!refs.length)throw Error('The EPUB has no reading order.');
    const sections=[],images=[],seenImages=new Set();let characters=0;
    for(let i=0;i<refs.length;i++){
      signal.throwIfAborted();const item=manifest.get(refs[i].getAttribute('idref'));if(!item)throw Error('The source is missing a chapter.');
      const doc=await xml(item.path);doc.querySelectorAll('script,style,iframe,object,embed,form,link,meta').forEach(el=>el.remove());
      const body=doc.querySelector('body');if(!body)throw Error('The source has an empty reading section.');
      const blocks=[];let text='',kind='p';
      const flush=()=>{const clean=text.replace(/[\t\r ]+/g,' ').replace(/ *\n */g,'\n').trim();if(clean){characters+=clean.length;if(characters>16*1024*1024)throw Error('This book is too large to convert on this device.');blocks.push({text:clean,kind})}text=''};
      function collect(node){
        if(node.nodeType===3){text+=kind==='pre'?node.nodeValue:node.nodeValue.replace(/\s+/g,' ');return}if(node.nodeType!==1)return;
        const tag=node.localName.toLowerCase();
        if(tag==='br'){text+='\n';return}
        if(tag==='img'||tag==='image'){flush();const src=node.getAttribute('src')||node.getAttribute('href')||node.getAttributeNS('http://www.w3.org/1999/xlink','href');if(src)blocks.push({image:resolve(src,item.path),alt:node.getAttribute('alt')||''});return}
        if(tag==='svg'&&!node.querySelector('image')&&node.querySelector('path,polygon,rect,circle'))throw Error('This edition contains a vector illustration that cannot yet be converted. Use its original edition instead.');
        const block=/^(p|h[1-6]|li|div|section|blockquote|pre|tr|figure|figcaption|nav|dt|dd)$/.test(tag),previous=kind;
        if(block){flush();kind=/^h[1-6]$/.test(tag)?'heading':tag==='pre'?'pre':'p'}
        for(const child of node.childNodes)collect(child);
        if(block){flush();kind=previous}else if(tag==='td'||tag==='th')text+=' · ';
      }
      collect(body);flush();
      for(const block of blocks.filter(b=>b.image)){if(seenImages.has(block.image))continue;seenImages.add(block.image);const sourceItem=[...manifest.values()].find(m=>m.path===block.image);if(!sourceItem||!/^image\//.test(sourceItem.type))throw Error('The source has an unsupported illustration.');images.push({path:block.image,type:sourceItem.type,bytes:await extract(block.image)})}
      sections.push({title:body.querySelector('h1,h2,h3')?.textContent.trim().slice(0,180)||doc.querySelector('title')?.textContent.trim().slice(0,180)||'Section '+(i+1),blocks});
      progress('Checking complete book · '+(i+1)+' of '+refs.length+' sections',40+5*(i+1)/refs.length);await new Promise(r=>setTimeout(r,0));
    }
    if(!characters)throw Error('The EPUB has no readable text.');
    if(book.delivery.provider==='Project Gutenberg'&&!sections.some(section=>section.blocks.some(block=>/PROJECT GUTENBERG/i.test(block.text||''))))throw Error('The source licence is missing. Please use its original edition.');
    return {sections,images,characters};
  }
  window.GRBookArchive={read};
})();
