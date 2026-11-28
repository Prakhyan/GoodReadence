/* Opt-in protection reminders and explicitly requested, word-only online lookup. */
(()=>{
  'use strict';
  const coverColours=[['plum','Plum','#5d4366'],['midnight','Midnight','#27242d'],['navy','Navy','#2c3c59'],['ocean','Ocean','#397079'],['forest','Forest','#39594b'],['olive','Olive','#73714c'],['burgundy','Burgundy','#783f50'],['terracotta','Terracotta','#a9634b'],['sand','Sand','#b9a181'],['ivory','Ivory','#ded6c5']];
  const coverRow=document.createElement('div');coverRow.className='row';coverRow.innerHTML='<label for="bookCoverColour">Book cover</label><span class="cover-choice"><i id="coverColourPreview" aria-hidden="true"></i><select id="bookCoverColour" aria-label="Book cover colour"></select></span>';
  document.querySelector('#tn').closest('.row').after(coverRow);
  const coverSelect=document.querySelector('#bookCoverColour');for(const[id,label]of coverColours)coverSelect.add(new Option(label,id));coverSelect.add(new Option('No book cover','none'));
  function applyCover(value){const colour=coverColours.find(c=>c[0]===value),choice=colour?colour[0]:value==='none'?'none':'plum',hex=colour?.[2]||coverColours[0][2],shade=factor=>'#'+hex.slice(1).match(/../g).map(part=>Math.round(parseInt(part,16)*factor).toString(16).padStart(2,'0')).join('');document.documentElement.dataset.bookCover=choice;document.documentElement.style.setProperty('--cover-colour',hex);document.documentElement.style.setProperty('--cover-shadow',shade(.68));document.documentElement.style.setProperty('--cover-border',shade(.55));coverSelect.value=choice}
  try{applyCover(localStorage.getItem('gr:bookCover')||'midnight')}catch{applyCover('midnight')}
  coverSelect.onchange=()=>{applyCover(coverSelect.value);try{localStorage.setItem('gr:bookCover',coverSelect.value)}catch{}};
  addEventListener('storage',event=>{if(event.key==='gr:bookCover')applyCover(event.newValue)});
  for(const side of ['left','right']){const cover=document.createElement('div');cover.className='hardcover hardcover-'+side;cover.setAttribute('aria-hidden','true');book.prepend(cover)}
  for(const name of ['book-ground-shadow','book-spine']){const layer=document.createElement('div');layer.className=name;layer.setAttribute('aria-hidden','true');book.prepend(layer)}
  const decorate=window.decorateBook;window.decorateBook=()=>{
    decorate?.();if(!pdf)return;const page=Math.max(0,Math.min(n-1,cp())),depth=Math.min(matchMedia('(max-width:700px)').matches?7:12,3+Math.log10(Math.max(2,n))*3),progress=n>1?page/(n-1):1;
    book.style.setProperty('--left-stack',(progress*depth).toFixed(2)+'px');
    book.style.setProperty('--right-stack',((1-progress)*depth).toFixed(2)+'px');
    book.style.setProperty('--cover-depth',Math.max(progress*depth,(1-progress)*depth).toFixed(2)+'px');
    book.dataset.atStart=String(page===0);book.dataset.finished=String(page===n-1);
  };
  // Book brightness is a rendering control, not a change to the device's display setting.
  const oldBrightness=document.querySelector('#br'),brightnessRow=oldBrightness.closest('.row');brightnessRow.firstElementChild.textContent='Book brightness';
  const brightnessControl=document.createElement('span');brightnessControl.className='brightness-control';brightnessControl.innerHTML='<button id="brightnessDown" aria-label="Decrease book brightness">−</button><output id="br" aria-live="polite">100%</output><button id="brightnessUp" aria-label="Increase book brightness">+</button>';oldBrightness.replaceWith(brightnessControl);
  let brightness=100;try{brightness=Number(localStorage.getItem('gr:brightness'))||Math.round(100-BR[br]*100)}catch{}
  window.applyBookBrightness=()=>{brightness=Math.max(30,Math.min(160,Math.round(brightness/10)*10));stage.style.setProperty('--book-brightness',brightness+'%');document.querySelector('#dim').style.opacity=0;document.querySelector('#br').textContent=brightness+'%';document.querySelector('#brightnessDown').disabled=brightness<=30;document.querySelector('#brightnessUp').disabled=brightness>=160};
  const setBrightness=value=>{brightness=value;applyBookBrightness();try{localStorage.setItem('gr:brightness',String(brightness))}catch{}dbx('f','readwrite',store=>store.put(brightness,'gr:brightness')).catch(()=>{})};
  document.querySelector('#brightnessDown').onclick=()=>setBrightness(brightness-10);document.querySelector('#brightnessUp').onclick=()=>setBrightness(brightness+10);applyBookBrightness();dbx('f','readonly',store=>store.get('gr:brightness')).then(value=>{if(value!=null){brightness=value;applyBookBrightness()}}).catch(()=>{});

  const week=7*86400000,read=(key,fallback=null)=>{try{return localStorage.getItem(key)||fallback}catch{return fallback}},write=(key,value)=>{try{localStorage.setItem(key,String(value))}catch{}};
  const options=document.createElement('div');options.className='backup-reminder-options';options.innerHTML='<label><input type="checkbox" id="backupReminders"> Remind me weekly to back up my library</label><p class="portable-note" id="backupReminderInfo">A gentle reminder inside the app. Nothing runs or uploads in the background.</p>';
  document.querySelector('[data-portable-panel=backup]').append(options);
  const banner=document.createElement('aside');banner.className='backup-reminder';banner.hidden=true;banner.setAttribute('aria-label','Library backup reminder');banner.innerHTML='<p><strong>Backup reminder</strong><br>It’s time for a fresh backup of your books and notes.</p><button id="reminderBackup">Back up now</button><button id="reminderLater">In a week</button>';
  document.querySelector('.portable-tools').before(banner);
  function reminder(){const enabled=read('gr:backupReminders')==='on',due=Number(read('gr:backupReminderDue',0));document.querySelector('#backupReminders').checked=enabled;banner.hidden=!enabled||Date.now()<due||!lib.length;}
  document.querySelector('#backupReminders').onchange=e=>{write('gr:backupReminders',e.target.checked?'on':'off');if(e.target.checked)write('gr:backupReminderDue',Date.now()+week);reminder()};
  document.querySelector('#reminderBackup').onclick=()=>GRPortability.open('backup');
  document.querySelector('#reminderLater').onclick=()=>{write('gr:backupReminderDue',Date.now()+week);reminder()};
  addEventListener('gr:backup-complete',()=>{write('gr:backupReminderDue',Date.now()+week);reminder()});
  addEventListener('gr:changed',reminder);addEventListener('pageshow',reminder);addEventListener('storage',reminder);document.addEventListener('visibilitychange',()=>{if(!document.hidden)reminder()});setInterval(reminder,3600000);reminder();

  const dialog=document.createElement('dialog');dialog.id='lookupDialog';dialog.className='gr-dialog';dialog.setAttribute('aria-labelledby','lookupTitle');
  dialog.innerHTML='<button class="close-dialog" aria-label="Close lookup">×</button><h2 id="lookupTitle">Dictionary & Wikipedia</h2><p class="quiet">Online lookup sends only your chosen word or phrase to the provider you select. Your book stays on this device.</p><label for="lookupTerm">Word or phrase</label><input id="lookupTerm" type="search" maxlength="80" autocomplete="off"><div class="lookup-providers"><button class="gr-button" id="lookupDictionary">English dictionary</button><button class="gr-button" id="lookupWikipedia">Wikipedia</button></div><p id="lookupStatus" role="status"></p><section id="lookupResults" hidden></section>';
  document.body.append(dialog);let controller=null,chosen='';const cache=new Map();
  dialog.querySelector('.close-dialog').onclick=()=>dialog.close();dialog.addEventListener('close',()=>controller?.abort());
  const validTerm=value=>String(value||'').replace(/\s+/g,' ').trim().slice(0,80);
  function open(term=''){chip.hidden=true;document.querySelector('#lookupTerm').value=validTerm(term);document.querySelector('#lookupResults').hidden=true;document.querySelector('#lookupStatus').textContent='';if(!dialog.open)dialog.showModal();document.querySelector('#lookupTerm').focus()}
  const button=document.createElement('button');button.id='lookupButton';button.textContent='Look up';button.onclick=()=>open(getSelection()?.toString());document.querySelector('#readerTools').append(button);
  const epButton=document.createElement('button');epButton.id='epLookup';epButton.textContent='Look up';epButton.onclick=()=>open(chosen||getSelection()?.toString());document.querySelector('#epHighlight').after(epButton);
  const chip=document.createElement('button');chip.id='lookupSelection';chip.hidden=true;chip.setAttribute('aria-label','Look up selected word');document.querySelector('#epReader').append(chip);chip.onpointerdown=e=>e.preventDefault();chip.onclick=()=>open(chosen);
  document.addEventListener('selectionchange',()=>{const selection=getSelection();if(!document.querySelector('#epReader').open||!selection?.rangeCount||selection.isCollapsed||!document.querySelector('#epText').contains(selection.anchorNode)){chip.hidden=true;return}const text=validTerm(selection.toString());if(!text||text.length>60){chip.hidden=true;return}chosen=text;const rect=selection.getRangeAt(0).getBoundingClientRect();chip.textContent='Look up “'+text+'”';chip.hidden=false;chip.style.left=Math.max(12,Math.min(innerWidth-chip.offsetWidth-12,rect.left))+'px';chip.style.top=Math.max(12,Math.min(innerHeight-55,rect.bottom+8))+'px'});
  async function json(url,signal){const response=await fetch(url,{credentials:'omit',referrerPolicy:'no-referrer',signal});if(!response.ok)throw Error(response.status===404?'No definition found. Try Wikipedia or another word.':'This source is unavailable right now. Try again later.');const reader=response.body.getReader(),chunks=[];let size=0;try{while(true){const{done,value}=await reader.read();if(done)break;size+=value.length;if(size>512000){await reader.cancel();throw Error('The lookup response is too large.')}chunks.push(value)}}finally{reader.releaseLock()}return JSON.parse(await new Blob(chunks).text())}
  async function lookup(provider){
    const term=validTerm(document.querySelector('#lookupTerm').value),status=document.querySelector('#lookupStatus'),result=document.querySelector('#lookupResults');if(!term){status.textContent='Enter a word first.';return}
    if(!navigator.onLine){result.hidden=true;status.textContent='You’re offline. Connect to search definitions or Wikipedia. Your saved book is still available.';return}
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
  for(const id of ['lookupDictionary','lookupWikipedia']){document.querySelector('#'+id).dataset.online='true';document.querySelector('#'+id).title='Requires an internet connection; sends only the chosen word or phrase.'}
  document.querySelector('#lookupDictionary').onclick=()=>lookup('dictionary');document.querySelector('#lookupWikipedia').onclick=()=>lookup('wikipedia');document.querySelector('#lookupTerm').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();lookup('dictionary')}};
})();
