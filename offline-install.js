/* Install where the browser supports it; prepare complete local audio without blocking reading. */
(()=>{
  let promptEvent,plan,appReady=false,running=false,paused=false,controller,pauseForImport=false,holdUntil=0,installedHere=false,problem='';
  let saved=0,savedBytes=0,received=0,currentLabel='',lastPaint=0;
  const standalone=()=>installedHere||matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  try{paused=localStorage.getItem('gr:offlinePaused')==='1'}catch{}
  addEventListener('beforeinstallprompt',event=>{event.preventDefault();promptEvent=event});
  function init(){
    const card=document.createElement('aside');card.className='offline-card';card.setAttribute('aria-label','Install and offline reading');card.innerHTML='<div><strong>Your reading room, anywhere.</strong><p data-offline-status role="status" aria-live="polite">Preparing the reader for offline use…</p></div><div class="offline-actions"><button type="button" data-install>Install app</button><button type="button" data-save-all>Save all sounds</button><button type="button" data-offline-open>Offline settings</button></div>';
    (document.querySelector('.library-frame')||document.querySelector('.info-footer')||document.querySelector('main')||document.body).append(card);
    const old=document.querySelector('#installApp');if(old)old.remove();
    const enter=document.querySelector('#enterLibrary');if(enter){const link=document.createElement('button');link.className='pwa-quiet';link.dataset.install='';link.textContent='Install your reading room';enter.after(link);enter.addEventListener('click',()=>setTimeout(maybeStart,600))}
    const modal=document.createElement('dialog');modal.className='offline-dialog';modal.id='offlineDialog';modal.setAttribute('aria-labelledby','offlineTitle');modal.innerHTML='<button class="offline-close" aria-label="Close offline settings">×</button><p class="offline-eyebrow">Take your reading along</p><h2 id="offlineTitle">Your offline reading room.</h2><p id="installHelp"></p><div class="offline-readiness"><strong data-offline-status role="status" aria-live="polite">Preparing…</strong><progress id="offlineProgress" max="100" value="0" aria-label="Offline audio preparation"></progress><p id="offlineDetail"></p></div><p>Saved books, notes and progress stay on this device. The reader, About, Help, Updates and Contact pages are available offline. All ambience is included once preparation finishes. Connect to add new public-library books or use online lookup and external links.</p><div class="offline-actions"><button data-install>Install app</button><button id="offlineSave">Save for offline</button></div>';document.body.append(modal);modal.querySelector('.offline-close').onclick=()=>modal.close();document.querySelectorAll('[data-offline-open]').forEach(button=>button.onclick=()=>modal.showModal());
    document.querySelectorAll('[data-install]').forEach(button=>button.onclick=install);const settings=document.querySelector('#t-st .settings-footer');if(settings){const button=document.createElement('button');button.className='btn';button.textContent='Offline & app';button.onclick=()=>modal.showModal();settings.prepend(button)}
    const saveAction=()=>{paused=!paused&&running;if(!running)paused=false;try{localStorage.setItem('gr:offlinePaused',paused?'1':'0')}catch{}if(paused)controller?.abort();else{navigator.storage?.persist?.().catch(()=>{});start(true)}paint()};document.querySelector('#offlineSave').onclick=saveAction;document.querySelectorAll('[data-save-all]').forEach(button=>button.onclick=saveAction);
    installHelp();paint();
    if(!('serviceWorker'in navigator)||!window.caches){document.querySelectorAll('[data-offline-status]').forEach(el=>el.textContent='Offline saving is unavailable in this browser.');return}
    setTimeout(()=>{if(!appReady){problem='Offline setup is still in progress. Keep this page open online while the reader finishes preparing.';paint()}},25000);
    navigator.serviceWorker.register('/audio-cache.js').catch(()=>{problem='Offline setup could not finish. Reconnect and reopen this page to retry.';paint()});
    navigator.serviceWorker.ready.then(async()=>{appReady=true;problem='';try{const r=await fetch('/offline-assets.json');if(!r.ok)throw Error('Could not prepare offline files.');plan=await r.json();await countSaved();paint();maybeStart()}catch{problem='Reconnect and reopen this page to finish offline preparation.';paint()}});
    addEventListener('online',()=>{countSaved().then(()=>{paint();maybeStart()})});addEventListener('offline',()=>{controller?.abort();paint()});
    addEventListener('gr:import-start',()=>{pauseForImport=true;controller?.abort();paint()});addEventListener('gr:import-end',()=>{pauseForImport=false;maybeStart()});
    document.querySelector('#am')?.addEventListener('change',()=>{holdUntil=Date.now()+4000;controller?.abort()});
    addEventListener('appinstalled',()=>{installedHere=true;promptEvent=null;installHelp();navigator.storage?.persist?.().catch(()=>{});maybeStart()});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){countSaved().then(paint);maybeStart()}});
    window.GROffline={open:()=>modal.showModal(),prepare:()=>start(true),pause:()=>{paused=true;controller?.abort();paint()},status:()=>({appReady,running,paused,saved,total:plan?.files.length||0,received})};
  }
  function installHelp(){
    const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1),mac=/Mac/.test(navigator.platform);
    document.querySelector('#installHelp').textContent=standalone()?'GoodReadence is installed. Your saved books are ready here.':ios?'On iPhone or iPad: open GoodReadence in Safari, tap Share, then Add to Home Screen. Enable Open as Web App when shown, then tap Add. Open the Home Screen app before adding your books. If you already added books in Safari, use Backup & transfer to move them.':mac?'Use your browser’s Install app option. In Safari, choose File → Add to Dock. Chrome and Edge show an install option in the address bar or browser menu.':'Use Install app when offered by Chrome or Edge, or open your browser menu and choose Install app / Add to Home screen. Other browsers can still use the saved reading room offline.';
    document.querySelectorAll('[data-install]').forEach(button=>button.hidden=standalone());
  }
  async function install(){
    navigator.storage?.persist?.().catch(()=>{});
    if(promptEvent){const event=promptEvent;promptEvent=null;try{await event.prompt();const result=await event.userChoice;if(result.outcome==='accepted'){installedHere=true;installHelp();maybeStart()}}catch{} }
    else{installHelp();document.querySelector('#offlineDialog').showModal()}
  }
  function engaged(){return standalone()}
  function maybeStart(){if(engaged()&&!paused&&!navigator.connection?.saveData)start(false)}
  async function cached(cache,file){const response=await cache.match(file.url);if(!response)return false;const hash=response.headers.get('x-goodreadence-sha256'),bytes=Number(response.headers.get('content-length'));return(hash?hash===file.sha256:bytes===file.bytes)}
  async function countSaved(){if(!plan||!window.caches)return;try{const cache=await caches.open(plan.audioCache);saved=0;savedBytes=0;for(const file of plan.files)if(await cached(cache,file)){saved++;savedBytes+=file.bytes}}catch{}}
  function paint(){
    const complete=appReady&&plan&&saved===plan.files.length;
    let text=!appReady?(problem||'Preparing the reader for offline use…'):problem?'Offline audio needs attention · open Offline settings':complete?'Ready offline · all '+saved+' sounds saved':!navigator.onLine?'Reader ready offline · reconnect to finish saving sounds':paused?'Offline audio paused · '+saved+' of '+(plan?.files.length||16)+' sounds saved':pauseForImport||window.GRImport?.busy?'Reader ready · audio preparation waits while your book is added':running?'Preparing offline audio · '+saved+' of '+plan.files.length+' sounds saved':'Reader ready offline · prepare all ambience';
    document.querySelectorAll('[data-offline-status]').forEach(el=>{if(el.textContent!==text)el.textContent=text});
    const detail=document.querySelector('#offlineDetail'),progress=document.querySelector('#offlineProgress'),button=document.querySelector('#offlineSave');if(!detail)return;
    detail.textContent=plan?(complete?'All sounds are saved. You can start any ambience without a connection.':problem?problem:currentLabel&&running?'Saving '+currentLabel+'…':'One-time audio download: about '+Math.round(plan.totalBytes/1048576)+' MB. Completed sounds are kept if you pause or leave.'):problem;
    progress.value=plan?Math.min(100,(savedBytes+received)/plan.totalBytes*100):0;button.disabled=!appReady||!plan||complete||!navigator.onLine;document.querySelectorAll('[data-save-all]').forEach(el=>{el.hidden=!!complete;el.disabled=!appReady||!plan||!navigator.onLine;el.textContent=running&&!paused?'Pause audio saving':paused?'Resume audio saving':plan?'Save all sounds · '+Math.round(plan.totalBytes/1048576)+' MB':'Save all sounds'});button.textContent=complete?'Ready offline':running&&!paused?'Pause saving':paused?'Resume saving':'Save all ambience';
  }
  async function start(force){
    if(running||!appReady||!plan||!navigator.onLine||paused||(!force&&navigator.connection?.saveData))return;
    const run=async lock=>{if(lock===null){await countSaved();paint();return}running=true;problem='';paint();try{
      const cache=await caches.open(plan.audioCache);
      for(let index=0;index<plan.files.length;index++){const file=plan.files[index];
        if(paused||!navigator.onLine)break;if(await cached(cache,file))continue;
        while(!paused&&navigator.onLine&&(pauseForImport||window.GRImport?.busy||Date.now()<holdUntil))await new Promise(resolve=>setTimeout(resolve,500));
        if(paused||!navigator.onLine)break;controller=new AbortController();received=0;currentLabel=file.label;paint();
        try{const response=await fetch(file.url,{signal:controller.signal,cache:'no-store',headers:{'X-GoodReadence-Offline':'1'}});if(!response.ok||!response.body)throw Error('Download unavailable');let bytes=0;const reader=response.body.getReader(),body=new ReadableStream({async pull(stream){try{const {done,value}=await reader.read();if(done){if(bytes!==file.bytes)throw Error('Incomplete audio download');stream.close();return}bytes+=value.byteLength;received=bytes;if(performance.now()-lastPaint>250){lastPaint=performance.now();paint()}stream.enqueue(value)}catch(error){stream.error(error)}},cancel:reason=>reader.cancel(reason)}),headers=new Headers(response.headers);headers.set('Content-Length',String(file.bytes));headers.set('X-GoodReadence-Sha256',file.sha256);await cache.put(file.url,new Response(body,{headers}));
        }catch(error){received=0;if(controller.signal.aborted&&!paused&&navigator.onLine){while(!paused&&navigator.onLine&&(pauseForImport||window.GRImport?.busy||Date.now()<holdUntil))await new Promise(resolve=>setTimeout(resolve,500));index--;continue}if(!controller.signal.aborted&&error.name!=='AbortError'){problem=error.name==='QuotaExceededError'?'Not enough space for every sound. Your books and completed sounds are kept. Free some space, then resume.':'Some sounds could not be saved. Reconnect and choose Save all ambience to retry.'}break}
        received=0;await countSaved();paint();await new Promise(resolve=>setTimeout(resolve,60));
      }
    }catch(error){problem=error.name==='QuotaExceededError'?'There is not enough device space for every sound. Your saved books are kept.':'This browser could not save offline audio. Allow site storage and try again.'}finally{running=false;controller=null;received=0;await countSaved();paint()}};
    if(navigator.locks)await navigator.locks.request('goodreadence-offline-audio',{ifAvailable:true},run);else await run(true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
