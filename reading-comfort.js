/* Opt-in protection reminders and explicitly requested, word-only online lookup. */
(()=>{
  'use strict';
  for(const side of ['left','right']){const cover=document.createElement('div');cover.className='hardcover hardcover-'+side;cover.setAttribute('aria-hidden','true');book.prepend(cover)}
  const decorate=window.decorateBook;window.decorateBook=()=>{
    decorate?.();if(!pdf)return;const page=Math.max(0,Math.min(n-1,cp())),depth=Math.min(8,2+Math.log10(Math.max(2,n))*2),progress=n>1?page/(n-1):1;
    book.style.setProperty('--left-stack',(progress*depth).toFixed(2)+'px');
    book.style.setProperty('--right-stack',((1-progress)*depth).toFixed(2)+'px');
    book.dataset.atStart=String(page===0);book.dataset.finished=String(page===n-1);
  };
  const week=7*86400000,read=(key,fallback=null)=>{try{return localStorage.getItem(key)||fallback}catch{return fallback}},write=(key,value)=>{try{localStorage.setItem(key,String(value))}catch{}};
  const options=document.createElement('div');options.className='backup-reminder-options';options.innerHTML='<label><input type="checkbox" id="backupReminders"> Remind me weekly to back up my library</label><p class="portable-note" id="backupReminderInfo">A gentle reminder inside the app. Nothing runs or uploads in the background.</p>';
  document.querySelector('[data-portable-panel=backup]').append(options);
  const banner=document.createElement('aside');banner.className='backup-reminder';banner.hidden=true;banner.setAttribute('aria-label','Library backup reminder');banner.innerHTML='<p><strong>Keep your reading safe.</strong><br>It’s time for a fresh backup of your books and notes.</p><button id="reminderBackup">Back up now</button><button id="reminderLater">In a week</button>';
  document.querySelector('.portable-tools').before(banner);
  function reminder(){const enabled=read('gr:backupReminders')==='on',due=Number(read('gr:backupReminderDue',0));document.querySelector('#backupReminders').checked=enabled;banner.hidden=!enabled||Date.now()<due||!lib.length;}
  document.querySelector('#backupReminders').onchange=e=>{write('gr:backupReminders',e.target.checked?'on':'off');if(e.target.checked)write('gr:backupReminderDue',Date.now()+week);reminder()};
  document.querySelector('#reminderBackup').onclick=()=>GRPortability.open('backup');
  document.querySelector('#reminderLater').onclick=()=>{write('gr:backupReminderDue',Date.now()+week);reminder()};
  addEventListener('gr:backup-complete',()=>{write('gr:backupReminderDue',Date.now()+week);reminder()});
  addEventListener('gr:changed',reminder);addEventListener('pageshow',reminder);addEventListener('storage',reminder);document.addEventListener('visibilitychange',()=>{if(!document.hidden)reminder()});setInterval(reminder,3600000);reminder();

  const dialog=document.createElement('dialog');dialog.id='lookupDialog';dialog.className='gr-dialog';dialog.setAttribute('aria-labelledby','lookupTitle');
  dialog.innerHTML='<button class="close-dialog" aria-label="Close lookup">×</button><h2 id="lookupTitle">A word worth knowing</h2><p class="quiet">Online lookup sends only your chosen word or phrase to the provider you select. Your book stays on this device.</p><label for="lookupTerm">Word or phrase</label><input id="lookupTerm" type="search" maxlength="80" autocomplete="off"><div class="lookup-providers"><button class="gr-button" id="lookupDictionary">English dictionary</button><button class="gr-button" id="lookupWikipedia">Wikipedia</button></div><p id="lookupStatus" role="status">Choose a source to look up this word.</p><section id="lookupResults" hidden></section>';
  document.body.append(dialog);let controller=null,chosen='';const cache=new Map();
  dialog.querySelector('.close-dialog').onclick=()=>dialog.close();dialog.addEventListener('close',()=>controller?.abort());
  const validTerm=value=>String(value||'').replace(/\s+/g,' ').trim().slice(0,80);
  function open(term=''){chip.hidden=true;document.querySelector('#lookupTerm').value=validTerm(term);document.querySelector('#lookupResults').hidden=true;document.querySelector('#lookupStatus').textContent='Choose a source to look up this word.';if(!dialog.open)dialog.showModal();document.querySelector('#lookupTerm').focus()}
  const button=document.createElement('button');button.id='lookupButton';button.textContent='Look up';button.onclick=()=>open(getSelection()?.toString());document.querySelector('#readerTools').append(button);
  const epButton=document.createElement('button');epButton.id='epLookup';epButton.textContent='Look up';epButton.onclick=()=>open(chosen||getSelection()?.toString());document.querySelector('#epHighlight').after(epButton);
  const chip=document.createElement('button');chip.id='lookupSelection';chip.hidden=true;chip.setAttribute('aria-label','Look up selected word');document.querySelector('#epReader').append(chip);chip.onpointerdown=e=>e.preventDefault();chip.onclick=()=>open(chosen);
  document.addEventListener('selectionchange',()=>{const selection=getSelection();if(!document.querySelector('#epReader').open||!selection?.rangeCount||selection.isCollapsed||!document.querySelector('#epText').contains(selection.anchorNode)){chip.hidden=true;return}const text=validTerm(selection.toString());if(!text||text.length>60){chip.hidden=true;return}chosen=text;const rect=selection.getRangeAt(0).getBoundingClientRect();chip.textContent='Look up “'+text+'”';chip.hidden=false;chip.style.left=Math.max(12,Math.min(innerWidth-chip.offsetWidth-12,rect.left))+'px';chip.style.top=Math.max(12,Math.min(innerHeight-55,rect.bottom+8))+'px'});
  async function json(url,signal){const response=await fetch(url,{credentials:'omit',referrerPolicy:'no-referrer',signal});if(!response.ok)throw Error(response.status===404?'No definition found. Try Wikipedia or another word.':'This source is unavailable right now. Try again later.');const reader=response.body.getReader(),chunks=[];let size=0;try{while(true){const{done,value}=await reader.read();if(done)break;size+=value.length;if(size>512000){await reader.cancel();throw Error('The lookup response is too large.')}chunks.push(value)}}finally{reader.releaseLock()}return JSON.parse(await new Blob(chunks).text())}
  async function lookup(provider){
    const term=validTerm(document.querySelector('#lookupTerm').value),status=document.querySelector('#lookupStatus'),result=document.querySelector('#lookupResults');if(!term){status.textContent='Enter a word first.';return}
    if(!navigator.onLine){status.textContent='Lookup needs an internet connection. Your saved book remains available offline.';return}
    controller?.abort();const request=controller=new AbortController(),timer=setTimeout(()=>request.abort(),12000);result.hidden=true;status.textContent='Looking up “'+term+'”…';
    try{const key=provider+':'+term.toLowerCase();let data=cache.get(key);if(!data){
      if(provider==='dictionary')data=await json('https://api.dictionaryapi.dev/api/v2/entries/en/'+encodeURIComponent(term),request.signal);
      else{const params=new URLSearchParams({action:'query',format:'json',origin:'*',generator:'search',gsrsearch:term,gsrnamespace:'0',gsrlimit:'1',prop:'extracts',exintro:'1',explaintext:'1',exsentences:'4'});data=await json('https://en.wikipedia.org/w/api.php?'+params,request.signal)}
      if(cache.size>=40)cache.delete(cache.keys().next().value);cache.set(key,data)
    }if(request!==controller)return;result.replaceChildren();const heading=document.createElement('h3');heading.textContent=term;result.append(heading);
      if(provider==='dictionary'){const list=document.createElement('ol');for(const meaning of (Array.isArray(data)?data:[]).slice(0,2).flatMap(d=>d.meanings||[]).slice(0,4)){for(const definition of (meaning.definitions||[]).slice(0,2)){const item=document.createElement('li');item.textContent=(meaning.partOfSpeech?meaning.partOfSpeech+' · ':'')+String(definition.definition||'').slice(0,1400);list.append(item)}}if(!list.children.length)throw Error('No definition found. Try another word.');result.append(list);const credit=document.createElement('a');credit.href='https://dictionaryapi.dev/';credit.textContent='Source: Free Dictionary API';credit.target='_blank';credit.rel='noopener noreferrer';result.append(credit)}
      else{const page=Object.values(data.query?.pages||{})[0];if(!page?.extract||!Number.isSafeInteger(page.pageid)||page.pageid<1)throw Error('No Wikipedia article found. Try a more specific phrase.');heading.textContent=String(page.title||term);const text=document.createElement('p');text.textContent=String(page.extract).slice(0,4000);const link=document.createElement('a');link.href='https://en.wikipedia.org/?curid='+page.pageid;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Read on Wikipedia · CC BY-SA';result.append(text,link)}
      result.hidden=false;status.textContent='';
    }catch(error){if(request===controller)status.textContent=error.name==='AbortError'?'Lookup was cancelled or timed out. Try again.':error.message}finally{clearTimeout(timer)}
  }
  document.querySelector('#lookupDictionary').onclick=()=>lookup('dictionary');document.querySelector('#lookupWikipedia').onclick=()=>lookup('wikipedia');document.querySelector('#lookupTerm').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();lookup('dictionary')}};
})();
