/* Read the EPUB package and spine locally. Only text enters the reader DOM. */
async function readEpub(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer), decoder = new TextDecoder();
  const word = offset => view.getUint16(offset,true);
  const integer = offset => view.getUint32(offset,true);
  let end = bytes.length - 22;
  while(end >= Math.max(0,bytes.length-65557) && integer(end)!==0x06054b50) end--;
  if(end<0 || integer(end)!==0x06054b50) throw Error('Invalid EPUB archive.');
  const entries = new Map();
  let cursor = integer(end+16);
  for(let i=0;i<word(end+10);i++){
    if(integer(cursor)!==0x02014b50) throw Error('Invalid EPUB directory.');
    const length=word(cursor+28);
    entries.set(decoder.decode(bytes.subarray(cursor+46,cursor+46+length)),cursor);
    cursor+=46+length+word(cursor+30)+word(cursor+32);
  }
  async function xml(path){
    const entry=entries.get(path);
    if(entry===undefined) throw Error('Missing EPUB content.');
    const header=integer(entry+42), start=header+30+word(header+26)+word(header+28);
    const data=bytes.subarray(start,start+integer(entry+20));
    const method=word(entry+10);
    if(word(entry+8)&1 || ![0,8].includes(method)) throw Error('Unsupported or encrypted EPUB.');
    const content=method===0?decoder.decode(data):await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
    const doc=new DOMParser().parseFromString(content,'application/xml');
    if(doc.querySelector('parsererror')) throw Error('Unreadable EPUB chapter.');
    return doc;
  }
  const container=await xml('META-INF/container.xml');
  const path=container.querySelector('rootfile').getAttribute('full-path'), pkg=await xml(path);
  const items=new Map([...pkg.querySelectorAll('manifest > item')].map(el=>[el.id,el.getAttribute('href')]));
  const chapters=[];
  for(const ref of pkg.querySelectorAll('spine > itemref')){
    const href=items.get(ref.getAttribute('idref'));
    if(!href) continue;
    const url=new URL(href,new URL(path,'file:///'));
    const doc=await xml(decodeURIComponent(url.pathname.slice(1)));
    doc.querySelectorAll('script,style,nav').forEach(el=>el.remove());
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
  const marks=entry.marks||=[];const style=entry.type||={size:21,font:'Georgia',ink:'#292622',paper:'#faf7f0'};
  let chapter=Math.min(entry.last||0,publication.chapters.length-1),selection=null;
  const saveEntry=()=>{entry.ts=Date.now();putB(entry)};
  const styleText=()=>{article.style.fontFamily=style.font;article.style.fontSize=style.size+'px';scroll.style.color=style.ink;scroll.style.background=style.paper};
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
    scroll.scrollTop=position;$('#epPrev').disabled=chapter===0;$('#epNext').disabled=chapter===publication.chapters.length-1;
  }
  function jump(index,position=0){chapter=index;entry.last=index;entry.scroll=position;panel.hidden=true;render(position);saveEntry()}
  select.replaceChildren(...publication.chapters.map((c,i)=>new Option(c.title,i)));select.onchange=()=>jump(+select.value);
  $('#epPrev').onclick=()=>{snd();jump(chapter-1)};$('#epNext').onclick=()=>{snd();jump(chapter+1)};
  function showPanel(){panel.hidden=false;panel.replaceChildren()}
  $('#epType').onclick=()=>{
    showPanel();
    for(const [label,key,options] of [['Font','font',['Georgia','Arial','Verdana','Times New Roman']],['Size','size',[16,18,21,24,28,32,38]]]){
      const wrapper=document.createElement('label'),control=document.createElement('select');wrapper.append(label+' ',control);panel.append(wrapper);
      options.forEach(v=>control.add(new Option(v,v)));control.value=style[key];control.onchange=()=>{style[key]=control.value;styleText();saveEntry()};
    }
    for(const [label,key] of [['Text','ink'],['Paper','paper']]){
      const wrapper=document.createElement('label'),input=document.createElement('input');input.type='color';input.value=style[key];wrapper.append(label+' ',input);panel.append(wrapper);
      input.oninput=()=>{style[key]=input.value;styleText()};input.onchange=saveEntry;
    }
  };
  $('#epAudio').onclick=()=>{showPanel();const label=document.createElement('label'),volume=$('#pageVolume').cloneNode();volume.removeAttribute('id');volume.value=pageVolume;volume.oninput=()=>{pageVolume=+volume.value;$('#pageVolume').value=pageVolume;savePreferences()};volume.onchange=()=>snd();label.append('Page-turn volume ',volume);panel.append(label);for(const [label,names,current,choose] of [['Page turn',SN.map(item=>item.n),sn,i=>{sn=i;snd();savePreferences()}],['Ambience',AMB,am,i=>{am=i;$('#am').value=i;amb()}]]){
    const wrapper=document.createElement('label'),control=document.createElement('select');wrapper.append(label+' ',control);panel.append(wrapper);names.forEach((name,i)=>control.add(new Option(name,i)));control.value=current;control.onchange=()=>choose(+control.value);
  }};
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
  $('#epHome').onclick=()=>dialog.close();dialog.onclose=()=>{document.removeEventListener('selectionchange',selected);saveEntry();stopAmb();shelf()};
  scroll.onscroll=()=>{if(dialog.open){entry.scroll=scroll.scrollTop}};
  window.addEventListener('pagehide',saveEntry);dialog.addEventListener('close',()=>window.removeEventListener('pagehide',saveEntry),{once:true});
  panel.hidden=true;dialog.showModal();styleText();render(entry.scroll||0);
}
