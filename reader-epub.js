/* Read the EPUB package and spine locally. Only text enters the reader DOM. */
async function readArchive(file) {
  const MAX_FILE=100*1024*1024,MAX_ENTRIES=5000,MAX_XML=8*1024*1024,MAX_TOTAL_XML=32*1024*1024;
  if(file.size>MAX_FILE)throw Error('This document is larger than the 100 MB import limit.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if(bytes.length<22)throw Error('Invalid EPUB archive.');
  const view = new DataView(bytes.buffer), decoder = new TextDecoder();
  const word = offset => {if(offset<0||offset+2>bytes.length)throw Error('Invalid EPUB archive.');return view.getUint16(offset,true)};
  const integer = offset => {if(offset<0||offset+4>bytes.length)throw Error('Invalid EPUB archive.');return view.getUint32(offset,true)};
  let end = bytes.length - 22;
  while(end >= Math.max(0,bytes.length-65557) && integer(end)!==0x06054b50) end--;
  if(end<0 || integer(end)!==0x06054b50) throw Error('Invalid EPUB archive.');
  const count=word(end+10),directorySize=integer(end+12),directoryStart=integer(end+16);
  if(word(end+4)!==0||word(end+6)!==0||word(end+8)!==count||count===0xffff||directorySize===0xffffffff||directoryStart===0xffffffff||count>MAX_ENTRIES||directoryStart+directorySize>end)throw Error('Unsupported or invalid EPUB directory.');
  const entries = new Map();
  let cursor = directoryStart;
  for(let i=0;i<count;i++){
    if(cursor+46>directoryStart+directorySize||integer(cursor)!==0x02014b50) throw Error('Invalid EPUB directory.');
    const nameLength=word(cursor+28),extraLength=word(cursor+30),commentLength=word(cursor+32),next=cursor+46+nameLength+extraLength+commentLength;
    if(next>directoryStart+directorySize)throw Error('Invalid EPUB directory.');
    const name=decoder.decode(bytes.subarray(cursor+46,cursor+46+nameLength));if(!name||name.length>1000||name.includes('\\')||name.startsWith('/')||name.split('/').includes('..')||entries.has(name))throw Error('Invalid or duplicate document entry.');entries.set(name,cursor);
    cursor=next;
  }
  if(cursor!==directoryStart+directorySize)throw Error('Invalid EPUB directory.');
  let totalXmlBytes=0;
  async function inflate(data,expected){
    const reader=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader(),chunks=[];let size=0;
    try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_XML||size>expected){await reader.cancel();throw Error('EPUB text entry exceeds the safe size limit.')}chunks.push(value)}}finally{reader.releaseLock()}
    if(size!==expected)throw Error('Invalid EPUB text entry.');
    const joined=new Uint8Array(size);let offset=0;for(const chunk of chunks){joined.set(chunk,offset);offset+=chunk.byteLength}
    return joined;
  }
  async function xml(path){
    const entry=entries.get(path);
    if(entry===undefined) throw Error('Missing EPUB content.');
    const method=word(entry+10),compressed=integer(entry+20),uncompressed=integer(entry+24),header=integer(entry+42);
    if(uncompressed>MAX_XML||totalXmlBytes+uncompressed>MAX_TOTAL_XML)throw Error('EPUB text exceeds the safe size limit.');
    if(header+30>bytes.length||integer(header)!==0x04034b50)throw Error('Invalid EPUB text entry.');
    const start=header+30+word(header+26)+word(header+28),finish=start+compressed;
    if(start>bytes.length||finish>bytes.length)throw Error('Invalid EPUB text entry.');
    const data=bytes.subarray(start,finish);
    if(word(entry+8)&1 || ![0,8].includes(method)) throw Error('Unsupported or encrypted EPUB.');
    if(method===0&&compressed!==uncompressed)throw Error('Invalid EPUB text entry.');
    totalXmlBytes+=uncompressed;
    const decoded=method===0?data:await inflate(data,uncompressed);
    const content=decoder.decode(decoded).replace(/<!DOCTYPE[^>]*>/gi,'');if(/<!ENTITY|<!DOCTYPE/i.test(content))throw Error('Document entity declarations are unsupported.');
    const doc=new DOMParser().parseFromString(content,'application/xml');
    if(doc.querySelector('parsererror')) throw Error('Unreadable EPUB chapter.');
    return doc;
  }
  return {xml,entries};
}
async function readEpub(file){
  const {xml}=await readArchive(file);
  const container=await xml('META-INF/container.xml');
  const path=container.querySelector('rootfile').getAttribute('full-path'), pkg=await xml(path);
  const items=new Map([...pkg.querySelectorAll('manifest > item')].map(el=>[el.id,el.getAttribute('href')]));
  const chapters=[];
  for(const ref of pkg.querySelectorAll('spine > itemref')){
    const href=items.get(ref.getAttribute('idref'));
    if(!href) continue;
    const url=new URL(href,new URL(path,'file:///'));
    if(url.protocol!=='file:'||url.search)throw Error('Invalid EPUB chapter path.');
    const doc=await xml(decodeURIComponent(url.pathname.slice(1)));
    doc.querySelectorAll('script,style,nav,iframe,object,embed,form,link,meta').forEach(el=>el.remove());
    const body=doc.querySelector('body');
    if(!body) continue;
    const paragraphs=[];let text='';
    const flush=()=>{const line=text.trim();if(line)paragraphs.push(line);text=''};
    function collect(node){
      if(node.nodeType===3){text+=node.nodeValue;return}
      if(node.nodeType!==1)return;
      const block=/^(p|h[1-6]|li|div|section|blockquote|pre|br|tr)$/i.test(node.localName);
      if(block)flush();
      for(const child of node.childNodes)collect(child);
      if(block)flush();
    }
    collect(body);flush();
    if(paragraphs.length) chapters.push({title:body.querySelector('h1,h2,h3')?.textContent.trim()||doc.querySelector('title')?.textContent.trim()||'Chapter '+(chapters.length+1),paragraphs});
  }
  if(!chapters.length) throw Error('This EPUB has no readable text chapters.');
  return {title:pkg.getElementsByTagNameNS('*','title')[0]?.textContent||file.name,chapters};
}
function showEpub(entry,publication){
  const dialog=$('#epReader'),article=$('#epText'),scroll=$('#epScroll'),panel=$('#epPanel'),select=$('#epChapter');
  const dark=document.documentElement.dataset.appearance==='dark',marks=entry.marks||=[];const style=entry.type||={size:21,font:'Georgia',ink:dark?'#eee7db':'#28251f',paper:dark?'#24211f':'#f5f0e5'};
  let saveTimer;document.querySelector('#epReadingViewLabel')?.remove();const viewLabel=document.createElement('label');viewLabel.id='epReadingViewLabel';viewLabel.append('View ');const viewSelect=document.createElement('select');viewSelect.id='epReadingView';viewSelect.setAttribute('aria-label','EPUB reading view');for(const [value,label]of [['dual','Dual'],['single','Single'],['scroll','Scroll']])viewSelect.add(new Option(label,value));viewSelect.value=style.view||'dual';viewLabel.append(viewSelect);select.after(viewLabel);
  let chapter=Math.min(entry.last||0,publication.chapters.length-1),selection=null;
  const saveEntry=()=>{if(entry.demo)return;entry.ts=Date.now();putB(entry)};
  const paintNav=()=>{$('#epPrev').disabled=chapter===0&&scroll.scrollLeft<2;$('#epNext').disabled=chapter===publication.chapters.length-1&&(viewSelect.value==='scroll'||scroll.scrollLeft+scroll.clientWidth>=article.scrollWidth-3)};
  const stride=()=>scroll.clientWidth+(parseFloat(getComputedStyle(article).columnGap)||0);
  function padSpread(){article.querySelector('.ep-end-page')?.remove();if(viewSelect.value!=='dual'||innerWidth<=700)return;const gap=parseFloat(getComputedStyle(article).columnGap)||48,w=(article.clientWidth-gap)/2,count=Math.round((article.scrollWidth+gap)/(w+gap));if(count>2&&count%2){const spacer=document.createElement('span');spacer.className='ep-end-page';spacer.setAttribute('aria-hidden','true');spacer.style.cssText='position:absolute;top:0;left:'+((count+1)*(w+gap)-gap-1)+'px;width:1px;height:1px';article.append(spacer)}}
  const styleText=()=>{const paged=viewSelect.value!=='scroll',columns=viewSelect.value==='dual'&&innerWidth>700?2:1,page=Math.round(scroll.scrollLeft/Math.max(1,stride()));dialog.dataset.epView=viewSelect.value;scroll.classList.toggle('ep-paged',paged);article.style.fontFamily=style.font;article.style.fontSize=style.size+'px';article.style.lineHeight=String(style.lineHeight||1.8);article.style.maxWidth=paged?'none':(style.measure||64)+'ch';article.style.setProperty('--ep-columns',columns);scroll.style.setProperty('--ep-margin',(style.margin??6)+'vw');scroll.style.fontFamily=style.font;scroll.style.fontSize=style.size+'px';scroll.style.width=paged?'calc(100% - '+((style.margin??6)*2)+'vw)':'100%';scroll.style.maxWidth=paged?((style.measure||64)*columns+4)+'ch':'none';scroll.style.marginInline='auto';scroll.style.color=style.ink;scroll.style.backgroundColor=style.paper;requestAnimationFrame(()=>{padSpread();scroll.scrollLeft=page*stride();paintNav()})};
  viewSelect.onchange=()=>{style.view=viewSelect.value;entry.epOffset=0;scroll.scrollLeft=0;styleText();saveEntry()};
  function render(position=0){
    selection=null;select.value=chapter;article.replaceChildren();
    publication.chapters[chapter].paragraphs.forEach((line,i)=>{
      const p=document.createElement('p');p.dataset.index=i;
      let offset=0;
      for(const mark of marks.filter(m=>m.chapter===chapter&&m.i===i&&m.end>m.start).sort((a,b)=>a.start-b.start)){
        const start=Math.max(mark.start,offset);if(mark.end<=start)continue;
        p.append(line.slice(offset,start));const colored=document.createElement('mark');colored.textContent=line.slice(start,mark.end);p.append(colored);offset=mark.end;
      }
      p.append(line.slice(offset));article.append(p);
    });
    scroll.scrollTop=position;requestAnimationFrame(()=>{padSpread();scroll.scrollLeft=entry.epOffset||0;paintNav()});
  }
  function jump(index,position=0){window.stopReadingVoice?.();chapter=Math.max(0,Math.min(publication.chapters.length-1,index));entry.last=chapter;entry.scroll=position;entry.epOffset=0;panel.hidden=true;render(position);saveEntry()}
  select.replaceChildren(...publication.chapters.map((c,i)=>new Option(c.title,i)));select.onchange=()=>jump(+select.value);
  function step(direction){window.stopReadingVoice?.();if(viewSelect.value!=='scroll'&&(direction>0?scroll.scrollLeft+scroll.clientWidth<article.scrollWidth-3:scroll.scrollLeft>2)){snd();scroll.scrollLeft=Math.max(0,scroll.scrollLeft+direction*stride());entry.epOffset=scroll.scrollLeft;saveEntry();paintNav()}else if(direction>0?chapter<publication.chapters.length-1:chapter>0){snd();jump(chapter+direction)}}
  $('#epPrev').onclick=()=>step(-1);$('#epNext').onclick=()=>step(1);
  function showPanel(){panel.hidden=false;panel.replaceChildren()}
  $('#epType').onclick=()=>{
    showPanel();
    const typeControls=document.createElement('div');typeControls.className='ep-type-controls';panel.append(typeControls);
    for(const [label,key,options] of [['Font','font',['Georgia','Palatino Linotype','Times New Roman','Arial','Verdana']],['Size','size',[16,18,21,24,28,32,38]],['Line spacing','lineHeight',[1.4,1.6,1.8,2,2.2]],['Side margins','margin',[3,6,10,14]],['Line width','measure',[45,55,64,75,85]]]){
      const wrapper=document.createElement('label'),control=document.createElement('select');wrapper.append(label+' ',control);typeControls.append(wrapper);
      options.forEach(v=>control.add(new Option(key==='margin'?v+'%':key==='measure'?v+' characters':v,v)));control.value=style[key]??({lineHeight:1.8,margin:6,measure:64}[key]);control.onchange=()=>{style[key]=key==='font'?control.value:Number(control.value);styleText();saveEntry()};
    }
    for(const [label,key] of [['Text','ink'],['Paper','paper']]){
      const wrapper=document.createElement('label'),input=document.createElement('input');input.type='color';input.value=style[key];wrapper.append(label+' ',input);panel.append(wrapper);
      input.oninput=()=>{style[key]=input.value;styleText()};input.onchange=saveEntry;
    }
  };
  $('#epAudio').onclick=()=>{showPanel();const label=document.createElement('label'),volume=$('#pageVolume').cloneNode();volume.removeAttribute('id');volume.style.accentColor='#8764a6';volume.value=pageVolume;volume.oninput=()=>{pageVolume=+volume.value;$('#pageVolume').value=pageVolume;savePreferences()};volume.onchange=()=>snd();label.append('Page-turn volume ',volume);panel.append(label);for(const [label,names,current,choose] of [['Page turn',SN.map(item=>item.n),sn,i=>{sn=i;snd();savePreferences()}],['Ambience',AMB,am,i=>{am=i;$('#am').value=i;amb()}]]){
    const wrapper=document.createElement('label'),control=document.createElement('select');if(label==='Ambience')control.id='epAmbienceControl';wrapper.append(label+' ',control);panel.append(wrapper);names.forEach((name,i)=>control.add(new Option(name,i)));control.value=current;control.onchange=()=>choose(+control.value);
  }
    const ambienceVolume=document.createElement('label'),slider=document.createElement('input');slider.type='range';slider.min=0;slider.max=1;slider.step=.05;slider.value=av;slider.oninput=()=>{av=+slider.value;$('#av').value=av;ambientVolume();savePreferences()};ambienceVolume.append('Ambience volume ',slider);panel.append(ambienceVolume);
    const status=document.createElement('p');status.dataset.ambStatus='';status.setAttribute('role','status');status.textContent=ambMessage;panel.append(status);
    const credits=document.createElement('a');credits.href='ambience/CREDITS.html';credits.target='_blank';credits.rel='noopener';credits.textContent='Sound sources & credits';panel.append(credits);window.GREpubSoundState?.();
  };
  function selected(){
    const sel=getSelection();if(!sel.rangeCount||sel.isCollapsed)return;
    const range=sel.getRangeAt(0),pieces=[];
    for(const p of article.children){
      if(!range.intersectsNode(p))continue;
      const offset=(node,index)=>{const prefix=document.createRange();prefix.selectNodeContents(p);prefix.setEnd(node,index);return prefix.toString().length};
      const start=p.contains(range.startContainer)?offset(range.startContainer,range.startOffset):0;
      const end=p.contains(range.endContainer)?offset(range.endContainer,range.endOffset):p.textContent.length;
      if(end>start)pieces.push({chapter,i:+p.dataset.index,start,end,label:p.textContent.slice(start,end)});
    }
    if(pieces.length)selection=pieces;
  }
  document.addEventListener('selectionchange',selected);
  $('#epHighlight').onclick=()=>{if(!selection){showPanel();panel.textContent='Select a passage first.';return}marks.push(...selection);render(scroll.scrollTop);saveEntry()};
  $('#epBookmark').onclick=()=>{marks.push({chapter,position:scroll.scrollTop,label:publication.chapters[chapter].title});saveEntry();$('#epMarks').click()};
  $('#epMarks').onclick=()=>{showPanel();if(!marks.length)panel.textContent='Your bookmarks and highlighted passages will appear here.';
    for(const m of marks){const button=document.createElement('button');button.textContent=(m.i===undefined?'Bookmark':'Highlight')+' · '+(m.chapter+1)+' · '+m.label;button.onclick=()=>{jump(m.chapter,m.position||0);if(m.i!==undefined)article.children[m.i]?.scrollIntoView({block:'center'})};panel.append(button)}
  };
  $('#epFull').hidden=!document.fullscreenEnabled;$('#epFull').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();
  $('#epHome').onclick=()=>dialog.close();dialog.onclose=()=>{document.removeEventListener('selectionchange',selected);saveEntry();resetAmbience();shelf()};
  scroll.onscroll=()=>{if(dialog.open){entry.scroll=scroll.scrollTop;entry.epOffset=scroll.scrollLeft;paintNav();clearTimeout(saveTimer);saveTimer=setTimeout(saveEntry,700)}};
  window.addEventListener('pagehide',saveEntry);dialog.addEventListener('close',()=>window.removeEventListener('pagehide',saveEntry),{once:true});
  dialog.addEventListener('close',()=>{clearTimeout(saveTimer);window.stopReadingVoice?.()},{once:true});panel.hidden=true;dialog.showModal();styleText();render(entry.scroll||0);
}
window.GREpubSoundState=()=>{const control=document.querySelector('#epAmbienceControl');if(!control)return;for(const option of control.options)option.disabled=+option.value>0&&!navigator.onLine&&!window.GROffline?.soundSaved(AMBIENCE_TRACKS[+option.value-1]?.file);if(!navigator.onLine&&+control.value>0&&control.selectedOptions[0].disabled)control.value='0';const status=control.closest('#epPanel').querySelector('[data-amb-status]');if(!navigator.onLine&&status)status.textContent='You’re offline. Only downloaded sounds are available. Open Settings online to download a sound.'};
