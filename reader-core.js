
const $=s=>document.querySelector(s),book=$('#book'),stage=$('#stage'),Ls=$('#L'),Rs=$('#R'),sh=$('#sh'),sl=$('#sl'),lab=$('#pl');
const N=26,PAPER=['#f3e8d0','#faf7ef','#ffffff','#e6cc9e','#d4c8b2','#d9e5cc'],TONES=['Warm paper','Soft white','Original','Sepia','Night','Forest'];
// Keep four page canvases at most and cap their total pixel memory by device class.
const lowMemory=(navigator.deviceMemory||4)<=4,BUD=lowMemory?10e6:24e6,MAX_PAGE_PIXELS=lowMemory?4e6:10e6,MAX_CACHE_PAGES=4;
let pdf,n=0,s=0,zoom=1,single,ratio=.72,baseW=300,W=300,H=400,tone=0,ver=0,tk=0;
let busy=false,anim=false,q=Promise.resolve(),strips=[],shades=[];
let bookSession=0,openRequest=0;
function releasePdf(doc){if(doc)(doc.loadingTask||doc).destroy().catch(console.error)}
function resetReader(){
  window.pendingTurn=0;
  window.readerReset?.();
  bookSession++;ver++;tk++;busy=false;anim=false;cache.clear();LK.clear();
  sh.hidden=true;sh.textContent='';book.classList.remove('turn');
  Ls.querySelector('.sd').style.opacity=Rs.querySelector('.sd').style.opacity=0;
  if(io)io.disconnect();vis.clear();releasePdf(pdf);pdf=null;
}
function storageError(error){console.error(error);toast('Changes could not be saved. Device storage may be full or unavailable.')}
const cache=new Map(),dpr=Math.min(Math.max(devicePixelRatio||1,lowMemory?1.5:2),lowMemory?2:2.5);


const maxs=()=>single?n-1:Math.floor(n/2);
const slots=k=>single?[-1,k]:[2*k-1,2*k];
const wpx=()=>Math.min(6000,Math.round(W*dpr),Math.floor(Math.sqrt(MAX_PAGE_PIXELS*ratio)));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function say(t){$('#msg').textContent=t;lab.textContent=t;if(!pdf)$('#empty').hidden=false}

async function openPdf(file,b){
  if(!file)return;
  if(!window.pdfjsLib){say('The PDF engine didn’t load. Keep the vendor folder beside this HTML file and reload.');return}
  if(!pdf&&ses)sesEnd();
  if(pdf){sesEnd();save();if(bk)putB(bk)}
  resetReader();const session=bookSession;
  say('Opening…');let doc;
  try{
    doc=await pdfjsLib.getDocument({isEvalSupported:false,data:new Uint8Array(await file.arrayBuffer())}).promise;
    if(session!==bookSession){releasePdf(doc);return}
    const v=(await doc.getPage(1)).getViewport({scale:1});
    if(session!==bookSession){releasePdf(doc);return}
    pdf=doc;n=doc.numPages;ratio=v.width/v.height;zoom=1;s=0;single=undefined;cache.clear();
    key='fb:'+(b?b.id:(doc.fingerprints?.[0]||file.name+file.size));
    let sv=b?.annotations||{};if(!b?.annotations)try{sv=JSON.parse(localStorage.getItem(key)||'{}')}catch(e){}
    pp=Math.max(0,Math.min((b?b.last:sv.p)|0,n-1));bm=sv.bm||[];hl=sv.hl||{};ix={n:0,t:[],run:0};did++;bk=b||null;$('#ch').hidden=false;chip();tabTo('');toc();
    $('#empty').hidden=true;book.hidden=false;sl.max=n;sl.disabled=false;document.body.classList.remove('lib');autoSes();
    fit();
  }catch(e){releasePdf(doc);if(session===bookSession)say('That file couldn’t be opened. Choose a valid, unlocked PDF.')}
}

/* Page rendering: small LRU cache, one render at a time, paused while a page is turning */
function get(p,w,ok){
  if(!pdf||p<0||p>=n)return Promise.resolve(null);
  const v=ver,doc=pdf,key=[v,p,w,tone,single].join('|');
  let e=cache.get(key);
  if(e){cache.delete(key);cache.set(key,e);return e.pr}
  e={px:0};cache.set(key,e);
  e.pr=q=q.then(async()=>{
    while(anim)await sleep(60);
    if(v!==ver||doc!==pdf||(ok&&!ok())){cache.delete(key);return null}
    const pg=await doc.getPage(p+1),vp=pg.getViewport({scale:w/pg.getViewport({scale:1}).width});
    const c=document.createElement('canvas');c.width=Math.round(vp.width);c.height=Math.round(vp.height);
    const x=c.getContext('2d');
    await pg.render({canvasContext:x,viewport:vp,background:'#ffffff'}).promise;
    if(v!==ver||doc!==pdf){cache.delete(key);return null}
    if(tone===4){if(window.applyImageSafeNight)await window.applyImageSafeNight(pg,c,vp);else{x.globalCompositeOperation='difference';x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height)}}
    if(tone!==4){x.globalCompositeOperation='multiply';x.fillStyle=PAPER[tone];x.fillRect(0,0,c.width,c.height)}
    if(!single){
      const r=p%2===0,g=x.createLinearGradient(r?0:c.width,0,r?c.width*.1:c.width*.9,0);
      g.addColorStop(0,'rgb(205,195,180)');g.addColorStop(1,'rgb(255,255,255)');
      x.globalCompositeOperation='multiply';x.fillStyle=g;x.fillRect(0,0,c.width,c.height);x.globalCompositeOperation='source-over';
    }
    pg.cleanup();e.px=c.width*c.height;trim();
    return c;
  }).catch(()=>{cache.delete(key);return null});
  return e.pr;
}
function trim(){
  let t=0;for(const e of cache.values())t+=e.px;
  for(const [k,e] of cache){if(t<=BUD&&cache.size<=MAX_CACHE_PAGES)break;t-=e.px;cache.delete(k)}
}
function preload(){
  const w=wpx(),[l,r]=slots(s);
  (single?[s+1,s+2,s+3]:[r+1,r+2]).forEach(p=>get(p,w));
}

/* Layout */
function fit(){
  const room=getComputedStyle(stage),vw=stage.clientWidth-parseFloat(room.paddingLeft)-parseFloat(room.paddingRight)-12,vh=stage.clientHeight-parseFloat(room.paddingTop)-parseFloat(room.paddingBottom)-12,sg=(window.readerView==='single'||window.readerView==='scroll')?true:window.readerView==='spread'?false:vw<vh*ratio*1.6;
  if(sg!==single){
    if(single===undefined){single=sg;s=Math.min(single?pp:Math.ceil(pp/2),maxs())}
    else{const p=single?s:Math.min(2*s,n-1);single=sg;s=single?p:Math.ceil(p/2)}
  }
  baseW=Math.min(single?vw:vw/2,vh*ratio);
  if(single&&matchMedia('(max-width:600px)').matches)baseW=vw;
  layout();
}
function layout(){
  W=baseW*zoom;H=W/ratio;
  book.classList.toggle('one',single);
  book.style.cssText=`--w:${W}px;--h:${H}px;--paper:${bgp()}`;
  stage.style.touchAction=window.freehandActive?'none':window.readerView==='scroll'?'pan-x pan-y':zoom>1?'pan-x pan-y':'none';
  $('#zl').textContent=Math.round(zoom*100)+'%';
  ver++;cache.clear();show();
}
function shift(k,instant){
  const sx=zoom===1&&!single?(k===0?-W/2:(n%2===0&&k===maxs()?W/2:0)):0;
  if(instant)book.classList.add('nt');
  book.style.transform=sx?`translateX(${sx}px)`:'';
  if(instant)requestAnimationFrame(()=>requestAnimationFrame(()=>book.classList.remove('nt')));
}
const LK=new Map();
function linksOf(p){const k=did+'|'+p;if(!LK.has(k))LK.set(k,pdf.getPage(p+1).then(async pg=>{const vp=pg.getViewport({scale:1}),an=await pg.getAnnotations({intent:'display'});return an.filter(a=>a.subtype==='Link'&&a.rect).map(a=>{const [x1,y1,x2,y2]=vp.convertToViewportRectangle(a.rect),u=/^(https?:|mailto:|tel:)/i.test(a.url||'')?a.url:null;return u||a.dest?{x:Math.min(x1,x2)/vp.width,y:Math.min(y1,y2)/vp.height,w:Math.abs(x2-x1)/vp.width,h:Math.abs(y2-y1)/vp.height,u,d:a.dest}:null}).filter(Boolean)}).catch(()=>[]));return LK.get(k)}
async function jump(doc,de){try{if(typeof de==='string')de=await doc.getDestination(de);if(!de)return;go(typeof de[0]==='number'?de[0]:await doc.getPageIndex(de[0]))}catch(e){}}
function lnk(slot,p){
  const l=slot.querySelector('.ln'),doc=pdf;l.textContent='';
  if(!doc||p==null||p<0||p>=n)return;
  linksOf(p).then(a=>{if(slot.p!==p||doc!==pdf)return;l.textContent='';a.forEach(k=>{
    const e=document.createElement('a');e.style.cssText=`left:${k.x*100}%;top:${k.y*100}%;width:${k.w*100}%;height:${k.h*100}%`;
    if(k.u){e.href=k.u;e.target='_blank';e.rel='noopener noreferrer';e.title=k.u}else e.href='#';
    e.onclick=ev=>{ev.stopPropagation();if(dr){ev.preventDefault();return}if(!k.u){ev.preventDefault();jump(doc,k.d)}};
    l.append(e)})});
}
function fill(slot,c,p){if(c!==undefined){slot.p=p;marks(slot,p);lnk(slot,p)}
  if(c===undefined)return;
  slot.querySelector('canvas')?.remove();
  if(c)slot.prepend(c);
}
async function show(){
  window.stopReadingVoice?.();
  if(window.readerView==='scroll'&&pdf){++tk;window.renderContinuous?.();return}
  const t=++tk,w=wpx(),[l,r]=slots(s);
  const [cl,cr]=await Promise.all([get(l,w),get(r,w)]);
  if(t!==tk||busy)return;
  fill(Ls,l<0||l>=n?null:cl||undefined,l);fill(Rs,r>=n?null:cr||undefined,r);
  shift(s,true);window.decorateBook?.();ui();if(resizePending){resizePending=false;fit()}else preload();
}
function ui(){
  window.updateReaderExtras?.();window.decorateBook?.();
  const [l,r]=slots(s);
  lab.textContent=(single?[s+1]:[l>=0&&l<n?l+1:0,r<n?r+1:0].filter(Boolean)).join('–')+' / '+n;
  sl.value=single?s+1:Math.min(r+1,n);
  $('#pv').disabled=s<=0;$('#nx').disabled=s>=maxs();
  $('#zo').disabled=zoom<=1;$('#zi').disabled=zoom>=4;
  $('#bm').disabled=false;$('#bm').setAttribute('aria-pressed',String(bm.includes(cp())));$('#bm').innerHTML=`<svg viewBox="0 0 24 24" fill="${bm.includes(cp())?'currentColor':'none'}" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4Z"/></svg>`;save();
}

/* The turning sheet: N strips hinged in a chain so the paper bends as it travels */
function buildSheet(front,back){
  const leaf=document.createElement('div');leaf.className='leaf';
  for(const source of [front,back]){
    const face=document.createElement('div');leaf.append(face);
    if(!source)continue;
    const canvas=document.createElement('canvas');canvas.width=(lowMemory||matchMedia('(pointer:coarse)').matches)?Math.min(source.width,Math.round(W*1.25)):source.width;canvas.height=Math.round(canvas.width*source.height/source.width);
    canvas.getContext('2d').drawImage(source,0,0,canvas.width,canvas.height);face.append(canvas);
  }
  sh.replaceChildren(leaf);
}
function pose(progress){
  sh.firstChild.style.transform='rotateY('+(-180*progress)+'deg)';
  sh.firstChild.style.setProperty('--shade',.18*Math.sin(Math.PI*progress));
}
function turnDuration(){return matchMedia('(prefers-reduced-motion: reduce)').matches?1:Math.min(PT[pt].d,(lowMemory||matchMedia('(pointer:coarse)').matches)?420:700)}
function run(d){
  return new Promise(res=>{
    const t0=performance.now(),D=turnDuration(),session=bookSession;
    anim=true;pose(d>0?0:1);sh.hidden=false;snd(null,D);
    const f=now=>{
      if(session!==bookSession){res();return}
      const u=Math.min(1,(now-t0)/D),e=u<.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2;
      pose(d>0?e:1-e);
      if(u<1)requestAnimationFrame(f);else{anim=false;res()}
    };
    requestAnimationFrame(f);
  });
}
async function turn(d){
  window.stopReadingVoice?.();
  if(window.readerView==='scroll'){window.scrollReaderTo?.((+sl.value-1)+d);return}
  const s2=s+d;
  if(!pdf)return;
  if(busy){window.pendingTurn=Math.max(-2,Math.min(2,(window.pendingTurn||0)+d));return}
  if(s2<0||s2>maxs()){window.pendingTurn=0;return}
  busy=true;const session=bookSession;
  const [l0,r0]=slots(s),[l1,r1]=slots(s2),k=d>0?s:s2,F=single?k:2*k,B=single?-1:F+1,w=wpx();
  const mid=d>0?[l0,r1]:[l1,r0];
  const [cF,cB,mL,mR,fL,fR]=await Promise.all([F,B,mid[0],mid[1],l1,r1].map(p=>get(p,w)));
  if(session!==bookSession)return;
  if(!cF||(!single&&B<n&&!cB)||(l1>=0&&l1<n&&!fL)||(r1<n&&!fR)){busy=false;fit();toast('Page could not be turned. Try again.');return}
  buildSheet(cF,cB);
  fill(Ls,mL,mid[0]);fill(Rs,mR,mid[1]);
  book.style.setProperty('--turn-duration',turnDuration()+'ms');book.classList.add('turn');shift(s2);
  await run(d);
  if(session!==bookSession)return;
  fill(Ls,l1<0?null:fL,l1);fill(Rs,r1>=n?null:fR,r1);book.classList.remove('turn');
  sh.hidden=true;sh.textContent='';
  Ls.querySelector('.sd').style.opacity=Rs.querySelector('.sd').style.opacity=0;
  s=s2;busy=false;if(d>0)addPages(single?1:2);ui();if(resizePending){resizePending=false;fit()}else preload();if(window.pendingTurn){const direction=Math.sign(window.pendingTurn);window.pendingTurn-=direction;requestAnimationFrame(()=>turn(direction))}
}

/* Extras: highlights, bookmarks, drawer, search, contents, thumbnails, sound, preferences */
const MC=['#ffe066','#9be37a','#7fd4ff','#ff9ec7'],BR=[0,.2,.4,.6],dw=$('#dr'),bar=$('#bar');
const THEMES=[{n:'Ivory',t:1,bg:'#ece6dc',bar:'#fbf8f2',fg:'#2b2722',ink:'#2b2722',sf:'#2b27220d',bd:'#2b272224',ac:'#8a5a2e'},{n:'Midnight',t:4,bg:'#12151f',bar:'#1a1f2e',fg:'#ece6da',ink:'#ece6da',sf:'#ffffff10',bd:'#ffffff24',ac:'#d4b27a'},{n:'Light',t:2,bg:'#eceef1',bar:'#ffffff',fg:'#1c1c1e',ink:'#1c1c1e',sf:'#0000000a',bd:'#00000022',ac:'#2563eb'},{n:'Warm',t:0,bg:'#e4dccd',bar:'#fbf8f1',fg:'#3a2f1e',ink:'#3a2f1e',sf:'#0000000a',bd:'#00000022',ac:'#9a5b13'}];
const PT=[{n:'Soft paper',l:.7,d:1000},{n:'Hardcover',l:.12,d:1300},{n:'Quick flip',l:.45,d:620},{n:'Fluttering',l:1.4,d:900}];
const SN=[{n:'Soft paper',t:'bandpass',f:[2600,4200],q:.6,g:.9,ev:20,cg:.5,tf:140,tg:.12},{n:'Crisp page',t:'highpass',f:[2200,3800],q:.7,g:.8,ev:45,cg:.9,tf:200,tg:.07},{n:'Hardcover',t:'lowpass',f:[900,1800],q:.6,g:1.1,ev:12,cg:.4,tf:90,tg:.5},{n:'Parchment',t:'bandpass',f:[1500,2600],q:.8,g:.9,ev:70,cg:.8,tf:160,tg:.1},{n:'No sound'},{n:'Thin paperback',t:'highpass',f:[1450,3100],q:.65,g:.42,ev:35,cg:.32,tf:110,tg:.045},{n:'Linen paper',t:'bandpass',f:[920,2450],q:.72,g:.55,ev:26,cg:.27,tf:95,tg:.06},{n:'Newsprint',t:'highpass',f:[900,2900],q:.55,g:.68,ev:52,cg:.5,tf:85,tg:.04},{n:'Glossy magazine',t:'bandpass',f:[1800,5200],q:1.2,g:.52,ev:11,cg:.34,tf:190,tg:.08}];
let pageVolume=.5;
let th=0,pt=0,am=0,av=.5,tm,lib=[],bk=null,did=0,pp=0,sn=0,tu=0,br=0,mk=0,mkc=0,er=0,hist=[],bm=[],hl={},key='',ix={n:0,t:[],run:0},lastTap=0,qt,mr,AC,nb,io,pj=0;
try{const P=JSON.parse(localStorage.getItem('fb:pf')||'{}');pageVolume=P.pageVolume??.5;th=(P.th|0)%THEMES.length;pt=(P.pt|0)%PT.length;av=P.av==null?.5:+P.av;sn=P.sn==null?(P.mute?4:0):(P.sn|0)%SN.length;tu=P.tu|0;br=P.br|0;am=Math.max(0,Math.min(14,P.am|0))}catch(e){}
theme();$('#mute').textContent=SN[sn].n;$('#dim').style.opacity=BR[br];tuck(tu);
const cp=()=>{const [l,r]=slots(s);return single?s:(r<n?r:l)};
const bgp=()=>tone===4?'#0b0b0b':PAPER[tone];
function save(){savePreferences();if(pdf){track();saveAnnotations()}}
function savePreferences(){try{localStorage.setItem('fb:pf',JSON.stringify({th,sn,br,pt,av,tu,pageVolume,am}))}catch(e){storageError(e)}}
function saveAnnotations(){const annotation={p:cp(),bm,hl};if(bk){bk.annotations=annotation;putB(bk)}else try{if(key)localStorage.setItem(key,JSON.stringify(annotation))}catch(e){storageError(e)}}
function item(t,p,d=0){const b=document.createElement('button');b.className='i';b.textContent=t;b.style.paddingLeft=8+d*14+'px';if(p!=null)b.onclick=()=>go(p);return b}
function go(p){window.stopReadingVoice?.();if(busy)return;if(window.readerView==='scroll'){window.scrollReaderTo?.(p);tabTo('');return}s=Math.min(single?p:Math.ceil(p/2),maxs());show();tabTo('');dw.classList.remove('on')}
function marks(slot,p){const h=slot.querySelector('.hl');h.textContent='';(hl[p]||[]).forEach(([x,y,w,v,c])=>{const e=document.createElement('i');e.style.cssText=`left:${x*100}%;top:${y*100}%;width:${w*100}%;height:${v*100}%;background:${c}`;h.append(e)})}
let sec='';
function tabTo(t){
  const pp=$('#pp'),pc=$('#pc'),o=pc.firstElementChild;
  if(o){o.hidden=true;$('#pn').append(o)}
  sec=t||'';
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('a',b.dataset.t===sec));
  if(!sec){pp.hidden=true;return}
  const c=$('#t-'+sec);c.hidden=false;pc.append(c);pc.scrollTop=0;
  $('#ptt').textContent=({toc:'Index',sea:'Search',pg:'Pages',mk:'Marks',ss:'Stats',st:'Settings'})[sec];
  pp.hidden=false;
  if(sec==='sea')index();if(sec==='pg'&&pdf)thumbs();if(sec==='mk')lists();if(sec==='ss')ssTab();
}
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>tabTo(b.dataset.t));
$('#pp').onclick=e=>{if(e.target.id==='pp')tabTo('')};$('#px').onclick=()=>tabTo('');
$('#sp').onclick=e=>{if(e.target.id==='sp')e.target.hidden=true};$('#sx').onclick=()=>$('#sp').hidden=true;
$('#mn').onclick=()=>dw.classList.toggle('on');
async function toc(){
  const box=$('#t-toc'),doc=pdf;box.textContent='';
  const o=await doc.getOutline().catch(()=>null);
  if(doc!==pdf)return;
  if(!o||!o.length){box.textContent='This PDF has no contents list. Try Search or Pages.';return}
  const walk=(a,d)=>a.forEach(it=>{if(box.children.length>2500)return;const b=item(it.title||'Untitled',null,d);b.onclick=async()=>{try{let de=it.dest;if(typeof de==='string')de=await doc.getDestination(de);if(de)go(await doc.getPageIndex(de[0]))}catch(e){}};box.append(b);if(it.items)walk(it.items,d+1)});
  walk(o,0);
}
async function index(){
  if(ix.run||ix.n>=n||!pdf)return;
  const doc=pdf,me=ix;me.run=1;
  while(me.n<n&&doc===pdf){
    while(anim||busy)await sleep(120);
    try{const pg=await doc.getPage(me.n+1),t=await pg.getTextContent();me.t[me.n]=t.items.map(i=>i.str).join(' ').replace(/ +/g,' ');pg.cleanup()}catch(e){}
    me.n++;
    if(me.n%10===0)await sleep(12);
    if(me.n%40===0||me.n===n)find();
  }
  me.run=0;
}
function find(){
  const v=$('#q').value.trim().toLowerCase(),box=$('#rs');box.textContent='';
  $('#st').textContent=ix.n<n?`Indexing ${ix.n} of ${n} pages…`:(ix.t.some(Boolean)?'':'No searchable text in this PDF.');
  if(v.length<2)return;
  let c=0;
  for(let p=0;p<ix.n&&c<150;p++){const t=ix.t[p],i=t?t.toLowerCase().indexOf(v):-1;if(i>=0){c++;box.append(item((p+1)+' · …'+t.slice(Math.max(0,i-30),i+v.length+40)+'…',p))}}
  if(!c)box.textContent='No matches'+(ix.n<n?' yet':'')+'.';
}
$('#q').oninput=()=>{clearTimeout(qt);qt=setTimeout(()=>{index();find()},220)};
const vis=new Set();
function thumbs(){
  const box=$('#t-pg');if(box.dataset.d===''+did)return;
  box.dataset.d=did;if(io)io.disconnect();vis.clear();box.style.setProperty('--r',ratio);
  box.innerHTML=Array.from({length:n},(_,i)=>`<div class='th' data-p='${i}'><b>${i+1}</b></div>`).join('');
  io=io||new IntersectionObserver(es=>es.forEach(en=>{
    const el=en.target;
    if(en.isIntersecting){vis.add(el);get(+el.dataset.p,Math.round(88*dpr),()=>vis.has(el)).then(c=>{if(c&&vis.has(el)&&!el.querySelector('canvas'))el.prepend(c)})}
    else{vis.delete(el);const c=el.querySelector('canvas');if(c)c.remove()}
  }),{root:$('#pc')});
  box.querySelectorAll('.th').forEach(e=>io.observe(e));
  box.onclick=e=>{const t=e.target.closest('.th');if(t)go(+t.dataset.p)};
}
function lists(){
  const b=$('#t-mk');b.textContent='';
  [...bm].sort((a,c)=>a-c).forEach(p=>b.append(item('★ Bookmark · page '+(p+1),p)));
  Object.keys(hl).filter(p=>hl[p].length).map(Number).sort((a,c)=>a-c).forEach(p=>b.append(item('🖍 Highlights · page '+(p+1),p)));
  if(!b.children.length)b.textContent='Bookmarks and highlights will appear here.';
}
$('#bm').onclick=()=>{const p=cp();bm=bm.includes(p)?bm.filter(x=>x!==p):[...bm,p];ui();lists()};
$('#mk').onclick=()=>{mk^=1;if(mk)er=0;paintMk();paintEr()};
const mp=$('#mp');
MC.forEach((c,i)=>{const b=document.createElement('button');b.style.background=c;b.setAttribute('aria-label','Colour '+(i+1));b.onclick=()=>{mkc=i;paintMk()};mp.append(b)});
const dn=document.createElement('button');dn.textContent='Done';dn.className='dn';dn.onclick=()=>{mk=0;paintMk()};mp.append(dn);
function paintMk(){const b=$('#mk');b.style.background=mk?MC[mkc]:'';b.style.color=mk?'#222':'';mp.hidden=!mk;[...mp.children].forEach((x,i)=>x.classList.toggle('on',i===mkc));document.body.classList.toggle('mk',!!(mk||er))}
$('#pageVolume').value=pageVolume;$('#pageVolume').oninput=e=>{pageVolume=+e.target.value;savePreferences()};$('#pageVolume').onchange=()=>snd();
$('#mute').onclick=e=>{sn=(sn+1)%SN.length;e.target.textContent=SN[sn].n;snd();savePreferences()};
$('#br').onclick=()=>{br=(br+1)%BR.length;$('#dim').style.opacity=BR[br];brl();savePreferences()};
const fsb=$('#fs');if(!document.fullscreenEnabled)fsb.hidden=true;
$('#quickMarks').onclick=()=>tabTo('mk');
fsb.onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();
function tuck(v){tu=v?1:0;bar.classList.toggle('tuck',!!tu);const handle=$('#bh');handle.classList.toggle('o',!tu);handle.setAttribute('aria-expanded',String(!tu));handle.setAttribute('aria-label',tu?'Show reading tools':'Hide reading tools');setTimeout(()=>{if(pdf&&!busy)fit()},60);savePreferences()}
$('#bh').onclick=()=>tuck(!tu);
document.addEventListener('fullscreenchange',()=>{tuck(!!document.fullscreenElement);setTimeout(()=>{if(pdf&&!busy)fit()},250)});
function snd(k,ms){

  const c=SN[k==null?sn:k];if(!c||!c.t||pageVolume===0)return;
  try{
    const a=AC=AC||new AudioContext();if(a.state==='suspended')a.resume();
    const D=(ms||PT[pt].d)/1e3*(.86+.23*Math.random()),r=a.sampleRate,L=Math.ceil(r*(D+.12)),b=a.createBuffer(1,L,r),d=b.getChannelData(0);let l=0,ck=0;
    for(let i=0;i<L;i++){
      const u=Math.min(1,i/r/D),sp=i/r>=D?0:(u<.5?4*u*u:4*(1-u)*(1-u));
      l=l*.4+(Math.random()*2-1)*.6;
      if(Math.random()<c.ev*sp/r)ck=1;ck*=.99;
      d[i]=l*sp*.55+(Math.random()*2-1)*ck*c.cg*.5*(sp>0?1:0);
    }
    const o=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain(),t=a.currentTime;
    o.buffer=b;f.type=c.t;f.Q.value=c.q;f.frequency.setValueAtTime(c.f[0],t);f.frequency.linearRampToValueAtTime(c.f[1],t+D/2);f.frequency.linearRampToValueAtTime(c.f[0],t+D);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(c.g*pageVolume,t+.025);g.gain.setValueAtTime(c.g*pageVolume,t+D*.8);g.gain.linearRampToValueAtTime(0,t+D);o.connect(f);f.connect(g);g.connect(a.destination);o.start(t);
  }catch(e){}
}
addEventListener('pointerdown',()=>{try{AC=AC||new AudioContext();if(AC.state==='suspended')AC.resume()}catch(e){}},{once:true});
function zoomAt(z,fx,fy){setZoom(z);stage.scrollLeft=fx*book.offsetWidth-stage.clientWidth/2;stage.scrollTop=fy*book.offsetHeight-stage.clientHeight/2}
const ptr=new Map();let pd=0,pz=1,pr=1;
stage.addEventListener('pointerdown',e=>{
  if(window.readerView==='scroll')return;
  ptr.set(e.pointerId,e);if(ptr.size===1)pj=0;
  if(ptr.size===2){const [a,b]=[...ptr.values()];pd=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);pz=zoom;pr=1;pj=1;dr=1}
});
stage.addEventListener('pointermove',e=>{
  if(!ptr.has(e.pointerId))return;ptr.set(e.pointerId,e);
  if(ptr.size===2&&pd){const [a,b]=[...ptr.values()];pr=Math.max(1/pz,Math.min(4/pz,Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)/pd));book.style.scale=pr}
});
const pe=e=>{ptr.delete(e.pointerId);if(pd&&ptr.size<2){const z=pz*pr;pd=0;book.style.scale='';setZoom(Math.round(z*4)/4)}};
stage.addEventListener('pointerup',pe);stage.addEventListener('pointercancel',pe);
const rc=e=>[Math.min(e.clientX,mr.x),Math.min(e.clientY,mr.y),Math.abs(e.clientX-mr.x),Math.abs(e.clientY-mr.y)];
book.addEventListener('pointerdown',e=>{
  const pg=(mk||er)&&e.target.closest('.pg');if(!pg||pg.p==null)return;
  mr={pg,x:e.clientX,y:e.clientY,el:document.createElement('i')};
  mr.el.style.cssText=er?'position:absolute;box-sizing:border-box;border:2px dashed #e33;background:#fff6;mix-blend-mode:normal':`position:absolute;background:${MC[mkc]}`;pg.querySelector('.hl').append(mr.el);
});
addEventListener('pointermove',e=>{
  if(!mr)return;const r=mr.pg.getBoundingClientRect(),[x,y,w,h]=rc(e);
  Object.assign(mr.el.style,{left:x-r.left+'px',top:y-r.top+'px',width:w+'px',height:h+'px'});
});
addEventListener('pointerup',e=>{
  if(!mr)return;const m=mr,[x,y,w,h]=rc(e),r=m.pg.getBoundingClientRect(),p=m.pg.p;mr=null;
  if(er&&(w>=6||h>=6)){const K=[(x-r.left)/r.width,(y-r.top)/r.height,w/r.width,h/r.height];hl[p]=(hl[p]||[]).flatMap(a=>cut(a,K))}
  else if(er){const u=(e.clientX-r.left)/r.width,v=(e.clientY-r.top)/r.height;hl[p]=(hl[p]||[]).filter(([a,b,c,d])=>!(u>=a&&u<=a+c&&v>=b&&v<=b+d))}
  else if(w>=6||h>=6)(hl[p]=hl[p]||[]).push([(x-r.left)/r.width,(y-r.top)/r.height,w/r.width,h/r.height,MC[mkc]]);
  marks(m.pg,p);save();lists();
});

function cut(a,[ex,ey,ew,eh]){
  const [x,y,w,h,c]=a,x2=x+w,y2=y+h,ex2=ex+ew,ey2=ey+eh;
  if(ex>=x2||ex2<=x||ey>=y2||ey2<=y)return [a];
  const o=[],t=Math.max(y,ey),b=Math.min(y2,ey2);
  if(ey>y)o.push([x,y,w,ey-y,c]);
  if(ey2<y2)o.push([x,ey2,w,y2-ey2,c]);
  if(ex>x)o.push([x,t,ex-x,b-t,c]);
  if(ex2<x2)o.push([ex2,t,x2-ex2,b-t,c]);
  return o;
}
function paintEr(){const b=$('#er');b.style.background=er?'var(--ac)':'';b.style.color=er?'var(--bar)':'';document.body.classList.toggle('mk',!!(mk||er))}
$('#er').onclick=()=>{er^=1;if(er)mk=0;paintMk();paintEr()};

$('#dx').onclick=$('#sc').onclick=()=>dw.classList.remove('on');
function brl(){$('#br').textContent='☀ '+Math.round(100-BR[br]*100)+'%'}brl();

const AMBIENCE_TRACKS=[{"label":"Rain","id":554271,"creator":"eitabyte","source":"https://freesound.org/people/eitabyte/sounds/554271/","title":"rain-car-chuva-carro-eitabyte.wav","sourceDuration":1202.35,"rating":4.8,"ratings":5,"license":"https://creativecommons.org/licenses/by/4.0/","file":"ambience/rain-clean.mp3","note":"Soft rain falling on a car roof. No added insect or ambience layers.","duration":720.012,"durationInstalled":720.012,"bytes":17246060,"bitrate":191610,"sha256":"a384913e55e881d0d995f0dc5a6c3d258f13c19d7f1d8f701b004947c8ba5aca"},{"label":"Thunderstorm","id":417616,"creator":"esh9419","source":"https://freesound.org/people/esh9419/sounds/417616/","title":"Gentle Rain Mix (2018)","duration":720,"rating":null,"ratings":null,"license":"https://creativecommons.org/publicdomain/zero/1.0/","file":"ambience/storm-fresh-v3.mp3","note":"Fresh, steady gentle rain with scattered distant thunder and occasional stronger rumbles.","bytes":11521087,"durationInstalled":720,"bitrate":128000,"sha256":"a0e80bfbb5e644c8cc4135e6a7ba8d9969041a0182f04037436c706512b01307","sourceDuration":720,"changes":"New CC0 source, including the creator’s Rainstorm V2 and CC0 Rain heavy 1 (rural) by jmbphilmes. Encoded at 128 kbps with a short fade-in and peak limiting; no additional ambience layers."},{"label":"Fireplace","id":873471,"creator":"Hear_it_use_it","source":"https://freesound.org/people/Hear_it_use_it/sounds/873471/","title":"1 Hour of Relaxing fireplace with Crackling Sounds","duration":710.7,"rating":4.8,"ratings":9,"license":"https://creativecommons.org/licenses/by/4.0/","file":"ambience/fireplace.mp3","note":"Real fireplace crackling.","bytes":18500358,"durationInstalled":710.7,"bitrate":208237,"sha256":"c0cb8ca6542b45ec10e1e33dd6324d59c31b20453327c56a63c592fe5865b391","sourceDuration":3600.18},{"label":"Ocean","id":688082,"creator":"klankbeeld","source":"https://freesound.org/people/klankbeeld/sounds/688082/","title":"waves seadike NL 3.46pm 230519_0608","duration":720.012,"rating":4.5,"ratings":4,"license":"https://creativecommons.org/licenses/by/4.0/","file":"ambience/ocean.mp3","note":"Waves at a sea dike.","bytes":16400108,"durationInstalled":720.012,"bitrate":182210,"sha256":"07f4bef0cab231300bdd34de829b81187a14c5208e4c029d523d8df5482ea42b","sourceDuration":6783.67},{"label":"Beach","id":688082,"creator":"klankbeeld","source":"https://freesound.org/people/klankbeeld/sounds/688082/","title":"waves seadike NL 3.46pm 230519_0608","duration":650,"rating":4.5,"ratings":4,"license":"https://creativecommons.org/licenses/by/4.0/","file":"ambience/beach-waves-v2.mp3","note":"Rolling shoreline waves, gently filtered for a quiet evening feel. Same field recording as Ocean, using a later excerpt.","bytes":10400957,"durationInstalled":650,"bitrate":128000,"sha256":"9b826049fb354600909dc4fd1d02e1f13a056e5c82e44888925930631f0b9505","sourceDuration":6783.67,"changes":"Excerpt begins 90 seconds into the source; gentle high and low frequency filtering. Not claimed to have been recorded at dawn or dusk."},{"label":"Forest","id":464376,"creator":"eneahead","source":"https://freesound.org/people/eneahead/sounds/464376/","title":"Sterlings 40min AM3_ref.aif","duration":720.026,"rating":4.9,"ratings":11,"license":"http://creativecommons.org/publicdomain/zero/1.0/","file":"ambience/forest.mp3","note":"Birds in trees; natural outdoor air may be audible.","bytes":16214036,"durationInstalled":720.026,"bitrate":180139,"sha256":"ad68f5bed10218b75a7c73f03d88ff5d254c0692c035a838cc237720bfe37943","sourceDuration":2404.32},{"label":"Night","id":388401,"creator":"SoundPacks","source":"https://freesound.org/people/SoundPacks/sounds/388401/","title":"Crickets in the Woods at Night 001","duration":670.596,"rating":4.7,"ratings":3,"license":"http://creativecommons.org/licenses/by/3.0/","file":"ambience/night.mp3","note":"Crickets in woods at night.","bytes":15581180,"durationInstalled":670.596,"bitrate":185868,"sha256":"0ac05e40cf68f4de0d9d8e50f8d695109568b3d6ade7562163c9f06e194680a6","sourceDuration":670.683},{"label":"Stream","id":514683,"creator":"s-light","source":"https://freesound.org/people/s-light/sounds/514683/","title":"morning stream 1 - close mono","duration":720.012,"rating":4.7,"ratings":40,"license":"http://creativecommons.org/publicdomain/zero/1.0/","file":"ambience/stream.mp3","note":"Close stream recording; occasional birds.","bytes":16039148,"durationInstalled":720.012,"bitrate":178200,"sha256":"87e5e64e0614c8383f05b28f98abb2c4eb467350b6d56baf2cee5d40b6b77556","sourceDuration":2707.76},{"label":"Wind · airplane cabin","id":457065,"creator":"keng-wai-chane-chick-te","source":"https://freesound.org/people/keng-wai-chane-chick-te/sounds/457065/","title":"AIRPLANE_JET_FLYING.wav","duration":693.684,"rating":4.8,"ratings":6,"license":"http://creativecommons.org/publicdomain/zero/1.0/","file":"ambience/wind-cabin.mp3","note":"Air France cabin recording; passengers may be audible.","bytes":16031372,"durationInstalled":693.684,"bitrate":184874,"sha256":"773aa1f0f015cb963f4f2fdbb0522e713b8459dd88aa2c44179bd1c040747ec6","sourceDuration":693.76},{"label":"Café","id":172968,"creator":"AshFox","source":"https://freesound.org/people/AshFox/sounds/172968/","title":"Cafe Brazil Walla","duration":720.012,"rating":4.8,"ratings":11,"license":"http://creativecommons.org/licenses/by/3.0/","file":"ambience/cafe.mp3","note":"Real café chatter and crockery.","bytes":16232540,"durationInstalled":720.012,"bitrate":180349,"sha256":"a7f04bce070ddf7002d712a2fa855f806a2bfc97410f70c3a677da415fcca282","sourceDuration":960.295},{"label":"Train · Indian compartment","id":576489,"creator":"TRP","source":"https://freesound.org/people/TRP/sounds/576489/","title":"India, train ride, from Howrah station, voices, clacks, horns, announcements, 10.mp3","duration":720,"rating":null,"ratings":null,"license":"https://creativecommons.org/publicdomain/zero/1.0/","file":"ambience/train-india-v2.mp3","note":"Inside an Indian train: rhythmic rail clatter, carriage rumble and occasional voices or horns.","bytes":11521087,"durationInstalled":720,"bitrate":128000,"sourceDuration":1038.48,"sha256":"fd8ebb17c9f6463056f4644e4d69d96f2f01445f0e375d90449212541543ad7d","changes":"Twelve-minute excerpt starting five minutes into the journey; departure removed, gentle frequency filtering. Original passengers and horns remain."},{"label":"Calm piano","id":null,"creator":"Kevin MacLeod","source":"https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1200099","title":"Peace of Mind","duration":720,"rating":null,"ratings":null,"license":"https://creativecommons.org/licenses/by/4.0/","file":"ambience/piano-peace-v2.mp3","note":"Peace of Mind by Kevin MacLeod: a slow piano and ambient accompaniment.","bytes":11521518,"durationInstalled":720,"bitrate":128000,"sha256":"910cf40c4fd4f712c6adc6e274fe6830499a4ce204d5907855cdec0707f070b8","sourceDuration":2158,"changes":"Opening twelve-minute excerpt, brief fade-in, encoded at 128 kbps stereo."},{"label":"Brown noise","id":171552,"creator":"georgedyer","source":"https://freesound.org/people/georgedyer/sounds/171552/","title":"01 Brown Noise.mp3","duration":720.026,"rating":4.5,"ratings":109,"license":"http://creativecommons.org/publicdomain/zero/1.0/","file":"ambience/brown-noise.mp3","note":"A long pre-recorded brown-noise track.","bytes":16301021,"durationInstalled":720.026,"bitrate":181105,"sha256":"7c0bb199aa62b0bdb36711d64f1cbb6efaa1d74cf0337a06303f3903fb79cf81","sourceDuration":3600.05},{"label":"Rain by the sea","id":209319,"creator":"jm","source":"https://freesound.org/people/jm/sounds/209319/","title":"Rain and Thunder and Water Cozumel 2008.06.25","duration":720.026,"rating":4.5,"ratings":4,"license":"http://creativecommons.org/publicdomain/zero/1.0/","file":"ambience/rain-by-sea.mp3","note":"Rain over Caribbean water with distant thunder, recorded from Cozumel.","durationInstalled":720.026,"bitrate":183163,"bytes":16486266,"sha256":"3d34ad26c51cbb9110477e83092afc7e28d5dd9b577555e1b7e88ef737d02fcd","sourceDuration":1283.05}];
const AMB=['Off',...AMBIENCE_TRACKS.map(t=>t.label)];
let S={},ses=null,bt;
try{S=JSON.parse(localStorage.getItem('cc:s'))||{}}catch(e){}
S.days=S.days||{};S.ses=S.ses||[];S.goal=S.goal||{t:'p',v:20};if(S.cur&&S.cur.s>=30)S.ses.push(S.cur);delete S.cur;
const day=()=>new Date().toLocaleDateString('sv'),Dy=()=>S.days[day()]=S.days[day()]||{m:0,p:0};
const sv=()=>{try{localStorage.setItem('cc:s',JSON.stringify(S))}catch(e){}};
const fmt=x=>{x=Math.floor(x);return Math.floor(x/60)+':'+String(x%60).padStart(2,'0')};
const ago=t=>{const m=Math.round((Date.now()-t)/6e4);return m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' h ago':Math.round(m/1440)+' d ago'};
function toast(t){const e=$('#ts');e.textContent=t;e.hidden=false;clearTimeout(e.t);e.t=setTimeout(()=>e.hidden=true,2600)}
function theme(){const T=THEMES[th],r=document.documentElement.style,B=T.b||{bg:T.bar,ink:T.ink,sf:T.sf,bd:T.bd,ac:T.ac};tone=T.t;['bg','bar','fg','ink','sf','bd','ac'].forEach(k=>r.setProperty('--'+k,T[k]));[bar,$('#bh')].forEach(e=>e.style.cssText='--bb:'+B.bg+';--ink:'+B.ink+';--sf:'+B.sf+';--bd:'+B.bd+';--ac:'+B.ac);$('#tn').textContent=T.n}

/* Local library (IndexedDB): books, covers, progress */
const idb=new Promise((ok,no)=>{try{const r=indexedDB.open('casid',1);r.onupgradeneeded=()=>{r.result.createObjectStore('b',{keyPath:'id'});r.result.createObjectStore('f')};r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)}catch(e){no(e)}});
idb.catch(()=>{});
const dbx=(s,m,f)=>idb.then(d=>new Promise((ok,no)=>{const t=d.transaction(s,m),q=f(t.objectStore(s));t.oncomplete=()=>ok(q&&q.result);t.onabort=t.onerror=()=>no(t.error)}));
const writeBook=b=>{window.GRPortable?.touchBook(b);return dbx('b','readwrite',s=>s.put(b)).then(result=>{window.dispatchEvent(new Event('gr:changed'));return result})};
const putB=b=>writeBook(b).catch(storageError);
async function storeBook(file,b){
  window.GRPortable?.touchBook(b);
  const db=await idb;
  return new Promise((resolve,reject)=>{
    const transaction=db.transaction(['b','f'],'readwrite');
    transaction.objectStore('b').put(b);transaction.objectStore('f').put(file,b.id);
    transaction.oncomplete=resolve;transaction.onabort=transaction.onerror=()=>reject(transaction.error);
  });
}
async function loadLib(){try{lib=await dbx('b','readonly',s=>s.getAll())}catch(e){lib=[]}shelf();renderStats($('#stats'))}
async function chapters(doc){
  try{const o=await doc.getOutline(),r=[];if(!o)return[];
    for(const it of o.slice(0,200)){let d=it.dest;if(typeof d==='string')d=await doc.getDestination(d);if(d)r.push(await doc.getPageIndex(d[0]))}
    return [...new Set(r)].sort((a,b)=>a-b)}catch(e){return[]}
}
async function addBooks(files){
  files=files.filter(f=>f);if(!files.length)return;
  if(window.prepareImports&&!window.skipPrep){files=await window.prepareImports(files);if(!files.length)return}
  if(!window.pdfjsLib){say('The PDF engine didn’t load. Keep the vendor folder beside this HTML file and reload.');return}
  try{await idb}catch(e){if(/\.epub$/i.test(files[0].name)){toast('Device storage is unavailable.');return}openPdf(files[0]);return}
  let last;
  for(const file of files){
    const id=file.name+'|'+file.size+'|'+file.lastModified;
    last=lib.find(b=>b.id===id);if(last)continue;
    say('Adding “'+file.name+'”…');
    let doc;try{
      if(/\.(epub|docx|pptx)$/i.test(file.name)){const epub=/\.epub$/i.test(file.name)?await readEpub(file):await window.readOffice(file);const b={id,name:epub.title,format:/\.epub$/i.test(file.name)?'epub':'office',n:epub.chapters.length,last:0,ts:Date.now()};b.cover=cover(b,0).toDataURL();await storeBook(file,b);lib.push(b);last=b;continue}
      doc=await pdfjsLib.getDocument({isEvalSupported:false,data:new Uint8Array(await file.arrayBuffer())}).promise;const pg=await doc.getPage(1),v0=pg.getViewport({scale:1}),vp=pg.getViewport({scale:240/v0.width}),c=document.createElement('canvas');
      c.width=vp.width;c.height=vp.height;
      await pg.render({canvasContext:c.getContext('2d'),viewport:vp,background:'#ffffff'}).promise;
      const b={id,name:file.name.replace(/\.pdf$/i,''),n:doc.numPages,cover:c.toDataURL('image/jpeg',.8),last:0,max:0,fin:0,chs:await chapters(doc),ts:Date.now()};
      await storeBook(file,b);lib.push(b);last=b;
    }catch(e){console.error(e);toast('Couldn’t add this book. Check the PDF and available device storage.')}finally{releasePdf(doc)}
  }
  shelf();
  if(files.length===1&&last)openBook(last);else say('Your books are stored on this device. Cloud sync and transfers are optional.');
}
async function openBook(b){
  const request=++openRequest;
  say('Opening…');
  const f=await dbx('f','readonly',s=>s.get(b.id)).catch(()=>null);
  if(request!==openRequest)return;
  if(!f){say('That book’s file is missing. Add it again.');return}
  b.lastReadAt=Date.now();await putB(b);
  if(b.format==='epub'||b.format==='office'){try{const epub=b.format==='office'?await window.readOffice(f):await readEpub(f);if(request===openRequest){if(pdf)home();showEpub(b,epub)}}catch(error){toast(error.message)}return}
  openPdf(f,b);
}
function wrapText(x,t,cx,y,w,lh){let l='';t.split(' ').forEach(wd=>{const m=l?l+' '+wd:wd;if(x.measureText(m).width>w&&l){x.fillText(l,cx,y);y+=lh;l=wd}else l=m});x.fillText(l,cx,y)}
const CS=[['Midnight','#1d2740','#0b1020','#e4cf9e',0],['Ivory','#f5efe3','#e6dcc8','#2c2824',2],['Burgundy','#6a1f31','#2c0b15','#e9cfa0',0],['Emerald','#0f4a3a','#06201a','#e9e1c9',1],['Charcoal','#34353a','#141517','#d79a6a',3],['Teal','#1d5560','#0b2830','#e7efe9',2],['Plum','#4d2a55','#1f0f26','#f0c9d6',1],['Sand','#d9c3a0','#b89a6e','#35281a',3]];
function cover(b,k){
  const [,c1,c2,ik,ly]=CS[k],c=document.createElement('canvas');c.width=240;c.height=340;
  const x=c.getContext('2d'),g=x.createLinearGradient(0,0,240,340);g.addColorStop(0,c1);g.addColorStop(1,c2);x.fillStyle=g;x.fillRect(0,0,240,340);
  x.strokeStyle=ik;x.fillStyle=ik;x.lineWidth=2;x.textAlign='center';
  if(ly===0)x.strokeRect(14,14,212,312);
  if(ly===1){x.fillRect(28,96,184,2);x.fillRect(28,242,184,2)}
  if(ly===2){x.lineWidth=1;x.strokeRect(10,10,220,320);x.strokeRect(17,17,206,306)}
  if(ly===3)x.fillRect(22,48,3,244);
  x.font='bold 22px Arial,Helvetica,sans-serif';wrapText(x,b.name.toUpperCase().slice(0,70),120,126,176,28);
  x.font='13px "Bodoni Moda",Georgia,serif';x.fillText('GOODREADENCE',120,306);
  return c;
}
async function origCover(b){
  const f=await dbx('f','readonly',s=>s.get(b.id)),doc=await pdfjsLib.getDocument({isEvalSupported:false,data:new Uint8Array(await f.arrayBuffer())}).promise;
  try{const pg=await doc.getPage(1),v0=pg.getViewport({scale:1}),vp=pg.getViewport({scale:240/v0.width}),c=document.createElement('canvas');
  c.width=vp.width;c.height=vp.height;
  await pg.render({canvasContext:c.getContext('2d'),viewport:vp,background:'#ffffff'}).promise;
  return c;
  }finally{releasePdf(doc)}
}
function styles(b){
  const sp=$('#sp'),g=$('#sg');g.textContent='';sp.hidden=false;
  const tile=(label,src,fn,ph)=>{const t=document.createElement('button');t.className='ct';let im;if(src){im=new Image();im.src=src}else{im=document.createElement('i');im.textContent=ph||''}t.append(im,label);t.onclick=fn;g.append(t);return im};
  const set=c=>{b.cover=c.toDataURL('image/jpeg',.9);putB(b);shelf();sp.hidden=true};
  if(b.format!=='epub'&&b.format!=='office'){const o=tile('Original',null,async()=>{try{set(await origCover(b))}catch(e){toast('Couldn’t read the original cover')}},'…');
  origCover(b).then(c=>{const im=new Image();im.src=c.toDataURL('image/jpeg',.7);o.replaceWith(im)}).catch(()=>{});}
  tile('Upload image',null,()=>{sp.hidden=true;upload(b)},'+');
  CS.forEach((d,k)=>tile(d[0],cover(b,k).toDataURL('image/jpeg',.7),()=>set(cover(b,k))));
}
function upload(b){
  const i=document.createElement('input');i.type='file';i.accept='image/*';
  i.onchange=()=>{const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{
    const c=document.createElement('canvas');c.width=240;c.height=340;const x=c.getContext('2d'),k=Math.max(240/im.width,340/im.height);
    x.drawImage(im,(240-im.width*k)/2,(340-im.height*k)/2,im.width*k,im.height*k);
    b.cover=c.toDataURL('image/jpeg',.85);putB(b);shelf()};im.src=r.result};r.readAsDataURL(i.files[0])};
  i.click();
}
async function rmBook(b){
  clearTimeout(bt);
  try{
    const db=await idb;
    await new Promise((resolve,reject)=>{
      const transaction=db.transaction(['b','f'],'readwrite');
      transaction.objectStore('b').delete(b.id);transaction.objectStore('f').delete(b.id);
      transaction.oncomplete=resolve;transaction.onabort=transaction.onerror=()=>reject(transaction.error);
    });
    try{localStorage.removeItem('fb:'+b.id)}catch(e){storageError(e)}
    lib=lib.filter(x=>x.id!==b.id);shelf();renderStats($('#stats'));toast('Removed from library');return true;
  }catch(e){storageError(e);return false}
}
function askRm(b,inBook){
  $('#cq').textContent='Remove “'+b.name+'” from your library? Its saved file, bookmarks and highlights will be deleted from this device.';
  const m=$('#cf');m.hidden=false;$('#cn').focus();
  $('#cn').onclick=()=>m.hidden=true;
  $('#cy').onclick=async()=>{const button=$('#cy');button.disabled=true;if(inBook)home();const removed=await rmBook(b);button.disabled=false;if(removed)m.hidden=true};
}
$('#cf').onclick=e=>{if(e.target.id==='cf')e.target.hidden=true};
$('#rb').onclick=()=>{if(!bk){toast('Open a book from the library first');return}askRm(bk,1)};
function shelf(){
  const shelfElement=$('#shelf');
  shelfElement.replaceChildren();
  const recent=[...lib].sort((first,second)=>second.ts-first.ts);
  const readOrder=recent.filter(book=>book.lastReadAt).sort((a,b)=>b.lastReadAt-a.lastReadAt);
  const featured=readOrder[0]||recent.find(book=>!book.fin)||recent[0];
  const previous=readOrder.find(book=>book.id!==featured?.id)||recent.filter(book=>book.id!==featured?.id&&((book.last||0)>0||(book.max||0)>0)).sort((a,b)=>b.ts-a.ts)[0];
  const previousImage=$('#previousCover');previousImage.hidden=!previous;
  if(previous){previousImage.src=previous.cover;previousImage.alt='Previously read: '+previous.name}else{previousImage.removeAttribute('src');previousImage.alt=''}
  $('#collection').hidden=!featured;
  $('#featureCover').hidden=!featured;
  $('#featureTitle').textContent=featured?featured.name:'A place to read.';
  $('#featureLabel').textContent=featured?'Continue reading':'Your reading room';
  $('#featureInfo').textContent=featured?readingPosition(featured):'Bring your PDFs and EPUBs. Read offline, and pick up where you left off.';
  $('#featureAction').textContent=featured?'Open book →':'Add your first book';
  $('#brandHome').onclick=()=>{const intro=$('#intro');intro.hidden=false;intro.scrollTop=0;try{localStorage.removeItem('gr:introSeen')}catch(e){}};
$('#brandHome').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('#brandHome').click()}};
$('#featureAction').onclick=()=>featured?openBook(featured):$('#f').click();
  if(!featured)return;
  $('#featureCover').src=featured.cover;
  $('#bookCount').textContent=lib.length;
  const query=$('#shelfQuery').value.trim().toLocaleLowerCase();
  const matches=recent.filter(book=>book.name.toLocaleLowerCase().includes(query));
  if($('#shelfOrder').value==='title')matches.sort((a,b)=>a.name.localeCompare(b.name));
  if(!matches.length){shelfElement.textContent='No books match your search.';return}
  for(const entry of matches){
    const card=document.createElement('article');
    card.className='shelf-card';card.dataset.bookId=entry.id;
    card.innerHTML='<button class="book-link"><img alt=""><strong></strong><small></small></button><details><summary aria-label="Book options">•••</summary><div><button>Change cover</button><button>Cover styles</button><button>Remove book</button></div></details>';
    card.querySelector('img').src=entry.cover;
    card.querySelector('strong').textContent=entry.name;
    card.querySelector('small').textContent=readingPosition(entry);
    card.querySelector('.book-link').onclick=()=>openBook(entry);
    const actions=[()=>upload(entry),()=>styles(entry),()=>askRm(entry,false)];
    card.querySelectorAll('details button').forEach((button,index)=>button.onclick=()=>{card.querySelector('details').open=false;actions[index]()});
    shelfElement.append(card);
  }
}
function readingPosition(entry){
  return entry.fin?'Finished':(entry.format==='epub'||entry.format==='office'?'Chapter ':'Page ')+((entry.last||0)+1)+' of '+entry.n;
}
$('#importBook').onclick=()=>$('#f').click();
$('#enterLibrary').onclick=()=>{const intro=$('#intro');intro.classList.add('leaving');setTimeout(()=>{intro.hidden=true;intro.classList.remove('leaving')},520);try{localStorage.setItem('gr:introSeen','1')}catch(e){}};
try{if(localStorage.getItem('gr:introSeen')==='1')$('#intro').hidden=true}catch(e){}
$('#featureAction').onclick=()=>$('#f').click();
$('#shelfQuery').oninput=shelf;
$('#shelfOrder').onchange=shelf;
function home(){
  openRequest++;sesEnd();if(pdf)save();clearTimeout(bt);if(bk)putB(bk);
  resetReader();bk=null;n=0;book.hidden=true;$('#ch').hidden=true;sl.disabled=true;
  ['pv','nx','zo','zi','bm'].forEach(i=>$('#'+i).disabled=true);
  tabTo('');dw.classList.remove('on');document.body.classList.add('lib');$('#empty').hidden=false;
  say('Your books are stored on this device. Cloud sync and transfers are optional.');renderStats($('#stats'));shelf();
}
function track(){
  if(!bk||!pdf)return;
  const [l,r]=slots(s),top=single?s:Math.min(Math.max(l,r),n-1);
  bk.last=cp();bk.max=Math.max(bk.max||0,top);bk.ts=Date.now();
  if(top>=n-1&&!bk.fin){bk.fin=1;toast('Book completed ✦')}
  const currentBook=bk;clearTimeout(bt);bt=setTimeout(()=>putB(currentBook),700);
}

/* Stats, sessions, goals */
function streak(){
  const D=k=>Math.round(new Date(k+'T00:00:00')/864e5),ok=a=>a&&(a.m>30||a.p>0),ks=Object.keys(S.days).filter(k=>ok(S.days[k])).sort().reverse();
  let prev=D(day()),c=0;
  for(const k of ks){const d=D(k);if(prev-d>1)break;c++;prev=d}
  return c;
}
const FT=[[0,'saturate(.5) brightness(1.2)'],[7,'none'],[14,'hue-rotate(30deg) saturate(1.3)'],[30,'hue-rotate(100deg) saturate(1.3)'],[90,'hue-rotate(185deg) saturate(1.4)'],[180,'hue-rotate(235deg) saturate(1.4)'],[270,'hue-rotate(290deg) saturate(1.5)']];
function fire(c){
  if(c>=365){const k=Math.floor((c-365)/182);return "<i class='fr rb' style='--g:"+Math.min(16,6+2*k)+"px;animation-delay:-"+k*.9+"s'>🔥</i>"}
  let f=FT[0][1];FT.forEach(([m,v])=>{if(c>=m)f=v});
  return "<i class='fr' style='filter:"+f+"'>🔥</i>";
}
function renderStats(el){
  const t=S.ses.length?Math.round(S.ses.reduce((a,x)=>a+x.s,0)/S.ses.length/60):0,
  fin=lib.filter(b=>b.fin).length,
  ch=lib.reduce((a,b)=>a+(b.chs||[]).filter((p,i)=>((b.chs[i+1]??b.n)-1)<=(b.max||0)).length,0),
  g=S.goal,d0=Dy(),cur=g.t==='p'?d0.p:Math.floor((d0.m+(ses&&ses.run?(Date.now()-ses.t0)/1e3:0))/60),pc=Math.min(100,Math.round(cur/g.v*100));
  el.innerHTML="<div class='cd'><b>"+fire(streak())+streak()+"</b><span>day streak</span></div><div class='cd'><b>"+fin+"</b><span>books completed</span></div><div class='cd'><b>"+ch+"</b><span>chapters completed</span></div><div class='cd'><b>"+t+"</b><span>min per session</span></div><div class='gl'>Today: "+cur+" / "+g.v+(g.t==='p'?' pages':' minutes')+"<i><u style='width:"+pc+"%'></u></i></div>";
}
function addPages(k){const d=Dy(),b=d.p;d.p+=k;if(bk)bk.readPages=(bk.readPages||0)+k;sv();if(S.goal.t==='p'&&b<S.goal.v&&d.p>=S.goal.v)toast('Daily goal reached ✦')}
const secs=()=>ses?ses.acc+(ses.run?(Date.now()-ses.t0)/1e3:0):0;
function chip(){$('#ch').textContent=ses&&ses.run?'⏸ '+fmt(secs()):ses?'▶ '+fmt(secs())+' · paused':'▶ Start session'}
function ssTab(){if(sec!=='ss')return;renderStats($('#ssx'));$('#gt').textContent=S.goal.t==='p'?'Pages':'Minutes';$('#gv').textContent=S.goal.v;$('#sb').textContent=ses&&ses.run?'Pause':'Start'}
function sesToggle(){
  if(!ses)ses={acc:0,run:0,t0:0};
  if(ses.run){const e=(Date.now()-ses.t0)/1e3;ses.acc+=e;ses.run=0;if(window.recordReadingTime)window.recordReadingTime(ses.t0,Date.now());else Dy().m+=e;if(bk)bk.readSeconds=(bk.readSeconds||0)+e;sv()}else{ses.t0=Date.now();ses.run=1}
  chip();ssTab();
}
function autoSes(){sesEnd();if(!document.hidden)sesToggle()}
function sesEnd(){delete S.cur;
  if(ses&&ses.run)sesToggle();
  if(ses&&ses.acc>=30){S.ses.push({d:day(),s:Math.round(ses.acc)});if(S.ses.length>300)S.ses.shift();sv()}
  ses=null;chip();ssTab();
}
setInterval(()=>{if(ses&&ses.run)chip()},1000);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){if(ses&&ses.run)sesToggle();if(ses&&ses.acc>=30){S.cur={d:day(),s:Math.round(ses.acc)};sv()}}
  else if((pdf||$('#epReader')?.open)&&ses&&!ses.run&&!ses.man)sesToggle();
});
addEventListener('pagehide',()=>{if(ses&&ses.run)sesToggle();if(pdf){save();clearTimeout(bt);if(bk)putB(bk)}});
$('#gt').onclick=()=>{S.goal.t=S.goal.t==='p'?'m':'p';S.goal.v=S.goal.t==='p'?20:30;sv();ssTab()};
$('#gm').onclick=()=>{S.goal.v=Math.max(1,S.goal.v-1);sv();ssTab()};
$('#gp').onclick=()=>{S.goal.v=Math.min(500,S.goal.v+1);sv();ssTab()};
$('#sb').onclick=$('#ch').onclick=()=>{sesToggle();if(ses)ses.man=!ses.run};$('#se').onclick=sesEnd;$('#hm').onclick=home;

/* Page-turn style and locally stored ambience recordings */
$('#pt').textContent=PT[pt].n;$('#av').value=av;
$('#pt').onclick=()=>{pt=(pt+1)%PT.length;$('#pt').textContent=PT[pt].n;savePreferences()};
// One local recording at a time. No synthetic beds or mixed ambience sources.

let ambSession=null,ambSerial=0,ambMessage='Choose a recording. Each plays for over ten minutes before repeating.';
function ambNotice(message){
  ambMessage=message;document.querySelectorAll('[data-amb-status]').forEach(el=>el.textContent=message);
}
function stopAmb(){
  ++ambSerial;const s=ambSession;ambSession=null;
  if(s){s.dead=true;clearInterval(s.timer);s.players.forEach(p=>{p.onloadedmetadata=p.ontimeupdate=p.onerror=p.onwaiting=p.onplaying=null;p.pause();p.removeAttribute('src');p.load()})}
  ambNotice('Ambience off.');
}
function ambientVolume(){
  const s=ambSession;if(!s)return;
  s.players.forEach((p,i)=>p.volume=Math.max(0,Math.min(1,av*(s.mix[i]||0))));
}
function amb(){
  stopAmb();if(!am)return;
  const track=AMBIENCE_TRACKS[am-1];if(!track)return;
  const serial=ambSerial,s=ambSession={players:[],active:0,mix:[1,0],fade:null,starting:false,dead:false};
  const alive=()=>ambSession===s&&!s.dead&&ambSerial===serial;
  const fail=message=>{if(!alive())return;stopAmb();am=0;$('#am').value=0;ambNotice(message)};
  const playing=()=>{if(alive())ambNotice(track.label+' · '+track.note)};
  ambNotice('Loading '+track.label+'…');
  s.players=[new Audio(track.file),new Audio(track.file)];
  s.players.forEach((p,i)=>{
    p.preload=i?'none':'auto';p.loop=true; // Native looping remains a fallback if the browser suspends UI timers.
    p.volume=i?0:av;
    p.onloadedmetadata=()=>{if(alive()&&(!Number.isFinite(p.duration)||p.duration<600))fail('This recording is incomplete. Keep the ambience folder beside this page and reopen it.')};
    p.onerror=()=>fail('Could not load '+track.label+'. Keep the ambience folder beside this page, then select the sound again.');
    p.onwaiting=()=>{if(alive()&&i===s.active)ambNotice('Loading more of '+track.label+'…')};
    p.onplaying=playing;
    p.ontimeupdate=()=>{if(alive()&&i===s.active)update()};
  });
  function update(){
    if(!alive())return;
    const p=s.players[s.active];
    if(s.fade){
      const f=s.fade,u=Math.min(1,(performance.now()-f.start)/f.ms);
      s.mix[f.from]=1-u;s.mix[f.to]=u;ambientVolume();
      if(u===1){s.active=f.to;s.fade=null;s.players[f.from].pause();s.players[f.from].currentTime=0;playing()}
    }else if(!s.starting&&!p.paused&&p.currentTime>600&&Number.isFinite(p.duration)&&p.duration-p.currentTime<=4&&p.duration-p.currentTime>0){
      const from=s.active,to=1-from,next=s.players[to];
      s.starting=true;next.currentTime=0;next.volume=0;
      next.play().then(()=>{
        if(!alive()){next.pause();return}
        // Only the end and start of this SAME recording overlap, after at least ten minutes.
        s.fade={from,to,start:performance.now(),ms:Math.max(250,Math.min(4000,(p.duration-p.currentTime)*1000))};s.starting=false;
      }).catch(()=>{if(alive()){s.starting=false;next.pause()}});
    }
  }
  s.timer=setInterval(update,100);
  s.players[0].play().then(()=>{if(alive())playing();else s.players[0].pause()}).catch(()=>fail('Playback could not start. Select a sound to try again.'));
}
addEventListener('pagehide',stopAmb);
$('#am').innerHTML=AMB.map((n,i)=>"<option value='"+i+"'>"+n+"</option>").join('');
$('#am').value=am;$('#am').onchange=()=>{am=+$('#am').value;amb();savePreferences()};
$('#av').oninput=()=>{av=+$('#av').value;ambientVolume();savePreferences()};
chip();loadLib();

/* Controls */
function setZoom(v){
  if(!pdf)return;
  v=Math.round(Math.max(1,Math.min(4,v))*100)/100;if(v===zoom)return;
  const fx=(stage.scrollLeft+stage.clientWidth/2)/stage.scrollWidth,fy=(stage.scrollTop+stage.clientHeight/2)/stage.scrollHeight;
  zoom=v;layout();
  stage.scrollLeft=fx*stage.scrollWidth-stage.clientWidth/2;
  stage.scrollTop=fy*stage.scrollHeight-stage.clientHeight/2;
}
$('#f').onchange=e=>{addBooks([...e.target.files]);e.target.value=''};
$('#pv').onclick=()=>turn(-1);
$('#nx').onclick=()=>turn(1);
$('#zi').onclick=()=>setZoom(zoom+.01);
$('#zo').onclick=()=>setZoom(zoom-.01);
$('#tn').onclick=()=>{th=(th+1)%THEMES.length;theme();if(pdf){ver++;layout()}savePreferences()};
sl.oninput=()=>{lab.textContent=sl.value+' / '+n};
sl.onchange=()=>{
  if(busy)return ui();
  const v=+sl.value-1;
  s=Math.min(single?v:Math.ceil(v/2),maxs());show();
};
let dr=0,x0,y0,sx0,sy0;
stage.addEventListener('pointerdown',e=>{dr=0;x0=e.clientX;y0=e.clientY;sx0=stage.scrollLeft;sy0=stage.scrollTop});
stage.addEventListener('pointermove',e=>{
  if(!e.buttons)return;
  if(Math.hypot(e.clientX-x0,e.clientY-y0)>8)dr=1;
  if(e.pointerType==='mouse'&&zoom>1&&!mk&&!er){stage.scrollLeft=sx0-(e.clientX-x0);stage.scrollTop=sy0-(e.clientY-y0)}
});
stage.addEventListener('pointerup',e=>{
  const dx=e.clientX-x0,dy=e.clientY-y0;
  if(window.readerView!=='scroll'&&!pj&&e.pointerType==='touch'&&zoom===1&&Math.abs(dx)>50&&Math.abs(dx)>2*Math.abs(dy)&&!mk&&!er){dr=2;turn(dx<0?1:-1)}
});
book.addEventListener('click',e=>{
  if(dr)return;
  const r=book.getBoundingClientRect(),x=(e.clientX-r.left)/r.width;
  if(mk||er)return;
  if(x>.4&&x<.6){const t=Date.now();if(t-lastTap<350)zoomAt(zoom>1?1:2.5,x,(e.clientY-r.top)/r.height);lastTap=t;return}
  turn(x<.5?-1:1);
});
stage.addEventListener('wheel',e=>{if(e.ctrlKey&&pdf){e.preventDefault();setZoom(zoom*(e.deltaY<0?1.12:.89))}},{passive:false});
addEventListener('keydown',e=>{
  if(document.querySelector('#epReader[open]'))return;
  if(e.key==='Escape'){if(sec)tabTo('');else dw.classList.remove('on');$('#cf').hidden=true;$('#sp').hidden=true}
  if(sec||dw.classList.contains('on')||e.target.closest('input,select,textarea,dialog'))return;
  if(e.key==='ArrowRight'||e.key==='PageDown')turn(1);
  else if(e.key==='ArrowLeft'||e.key==='PageUp')turn(-1);
  else if(e.key==='+'||e.key==='=')setZoom(zoom+.01);
  else if(e.key==='-')setZoom(zoom-.01);
});
addEventListener('dragover',e=>e.preventDefault());
addEventListener('drop',e=>{e.preventDefault();addBooks([...e.dataTransfer.files])});
let resizePending=false,rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(pdf){if(busy)resizePending=true;else fit()}},150)});
