/* Arrange existing controls without replacing their saved-data behavior. */
(()=>{
  'use strict';
  const toolbarHandle=document.querySelector('#bh');let handleTimer;
  document.addEventListener('pointerdown',event=>{
    if(!pdf||event.target.closest('#book,.scroll-page,#epReader,dialog'))return;
    clearTimeout(handleTimer);toolbarHandle.classList.add('revealed');
    handleTimer=setTimeout(()=>toolbarHandle.classList.remove('revealed'),4000);
  },{passive:true});
  const svg=paths=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  const icons={pen:svg('<path d="m15 4 5 5M4 20l4-1 12-12a2 2 0 0 0-4-4L4 15Z"/>'),note:svg('<path d="M14 3H5v18h14V8Zm0 0v5h5M8 12h8M8 16h5"/>'),voice:svg('<path d="m11 5-6 4H2v6h3l6 4ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>'),marks:svg('<path d="M6 3h12v18l-6-4-6 4ZM9 7h6M9 10h6"/>'),backup:svg('<path d="M5 8v12h14V8M3 4h18v4H3Zm6 8h6m-3 0v5"/>')};
  const header=document.querySelector('.landing-header');header.append(document.querySelector('#appearanceToggle'));
  const footer=document.querySelector('.landing-footer'),version=document.createElement('p');version.className='app-version';version.innerHTML='GoodReadence <span data-app-version>1.8.0</span>';footer.append(version);
  const tools=document.querySelector('.portable-tools');document.querySelector('.library-frame').append(tools);document.querySelector('#libraryTools').insertAdjacentHTML('afterbegin',icons.backup);
  const setting=document.querySelector('#t-st>button.btn');const settingFooter=document.createElement('div');settingFooter.className='settings-footer';settingFooter.append(setting);setting.insertAdjacentHTML('afterbegin',icons.backup);document.querySelector('#t-st').append(settingFooter);
  document.querySelector('#quickMarks').innerHTML=icons.marks;
  document.querySelector('#readerNote').innerHTML=icons.note+'<span>Notes</span>';
  document.querySelector('#readerSpeak').innerHTML=icons.voice+'<span>Listen</span>';
  const group=document.createElement('div');group.id='annotationGroup';
  group.innerHTML=`<button class="annotation-toggle" id="annotationToggle" aria-expanded="false" aria-controls="annotationPanel">${icons.pen}<span>Mark up</span></button><section id="annotationPanel" aria-label="Highlight and draw" hidden><div class="annotation-heading"><strong>Highlight &amp; draw</strong><button id="annotationClose" aria-label="Close marking tools">Done</button></div><div class="annotation-modes" role="group" aria-label="Marking tool"></div></section>`;
  document.querySelector('#readerNote').before(group);
  const panel=group.querySelector('#annotationPanel'),toggle=group.querySelector('#annotationToggle'),modes=panel.querySelector('.annotation-modes');
  const box=document.querySelector('#mk'),draw=document.querySelector('#freehandButton'),eraser=document.querySelector('#er');
  box.insertAdjacentHTML('beforeend','<span>Box</span>');draw.innerHTML=icons.pen+'<span>Draw</span>';eraser.insertAdjacentHTML('beforeend','<span>Erase box</span>');
  modes.append(box,draw,eraser);panel.append(document.querySelector('#mp'),document.querySelector('#inkControls'));
  document.querySelector('#inkErase').textContent='Erase ink';
  const close=()=>{panel.hidden=true;toggle.setAttribute('aria-expanded','false');if(window.freehandActive)draw.click();if(mk)box.click();if(er)eraser.click()};
  toggle.onclick=()=>{if(!panel.hidden){close();return}panel.hidden=false;toggle.setAttribute('aria-expanded','true')};
  document.querySelector('#annotationClose').onclick=close;
  document.querySelector('#inkDone').addEventListener('click',close);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){close();toggle.focus()}});
  document.addEventListener('pointerdown',e=>{if(!panel.hidden&&!group.contains(e.target)&&!document.querySelector('#stage').contains(e.target))close()});
  const reset=window.readerReset;window.readerReset=()=>{close();reset?.()};
})();
