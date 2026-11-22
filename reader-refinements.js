(() => {
  // No network fingerprints: one stable release ID, acknowledged on the click itself.
  if(!document.querySelector('#book'))return;
  const footer=document.createElement('footer');footer.className='landing-footer';
  const privacy=$('#intro .intro-note'),credit=[...document.querySelectorAll('.intro-content>p')].find(p=>p.textContent.includes('©'));
  if(privacy)footer.append(privacy);if(credit)footer.append(credit);$('#intro').append(footer);
  const flakes=document.createElement('div');flakes.className='frost-sprinkles';flakes.setAttribute('aria-hidden','true');
  const points=[[7,8],[25,3],[46,6],[69,3],[91,9],[94,25],[91,43],[95,64],[91,85],[78,94],[58,96],[37,93],[17,95],[5,82],[3,61],[5,38],[8,23],[84,72],[75,13],[24,83],[92,94],[49,87]];
  points.forEach(([x,y],i)=>{const flake=document.createElement('span');flake.textContent=i%3===0?'✧':'·';flake.style.cssText='left:'+x+'%;top:'+y+'%;--delay:-'+i*.67+'s;--duration:'+(5+i%5)+'s';flakes.append(flake)});$('#intro .intro-art').append(flakes);
  const publicButton=document.createElement('a');publicButton.href='library.html';publicButton.id='publicLibrary';publicButton.className='secondary';publicButton.textContent='Public library';$('#importBook').before(publicButton);document.querySelector('.library-actions').append($('#importBook'),$('#prepOpen'),publicButton);

  const deskChange=$('#readingDesk').onchange;let previousPaper=null;
  $('#readingDesk').onchange=()=>{deskChange();if($('#readingDesk').value==='midnight'){if(th!==1)previousPaper=th;th=1;theme();savePreferences();if(pdf)fit()}else if(previousPaper!==null){th=previousPaper;previousPaper=null;theme();savePreferences();if(pdf)fit()}};
  dbx('f','readonly',store=>store.get('gr:room')).then(room=>{if(room?.desk==='midnight'){th=1;theme();savePreferences();if(pdf)fit()}}).catch(()=>{});
  let flameId=0;
  fire=count=>{const id='ember-'+(++flameId),height=Math.min(48,25+Math.log2(count+1)*4);return `<span class="streak-flame ${count?'lit':'cold'}" style="height:${height}px" role="img" aria-label="${count} day streak"><svg viewBox="0 0 48 64" aria-hidden="true"><defs><radialGradient id="${id}"><stop stop-color="#fff9d6"/><stop offset=".35" stop-color="#ffcf58"/><stop offset=".72" stop-color="#ee7a20"/><stop offset="1" stop-color="#a82c13"/></radialGradient></defs><path class="flame-outer" d="M25 2C29 17 9 22 12 36 8 32 8 27 9 24-5 44 7 61 24 62 44 61 51 43 39 27 40 38 34 39 34 32 34 21 24 18 25 2Z" fill="url(#${id})"/><path class="flame-tongue" d="M15 56C2 46 18 26 16 15c12 15 9 23 8 40Z" fill="#ff9c2f"/><circle class="flame-spark" cx="17" cy="18" r="1.2" fill="#ffce6d"/><circle class="flame-spark" cx="32" cy="12" r="1" fill="#ffd978"/><path class="flame-core" d="M25 28C27 39 17 43 19 50 14 47 14 44 15 41 7 56 19 61 25 59 37 55 33 43 30 41 31 49 25 45 25 28Z" fill="#fff1aa" opacity=".85"/></svg></span>`};
})();
