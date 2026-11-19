(() => {
  const release='2026-11-19-page-turn-cover-1.6.0';
  function markUpdatesSeen(){try{const seen=new Set(JSON.parse(localStorage.getItem('gr:readReleases')||'[]'));seen.add(release);localStorage.setItem('gr:readReleases',JSON.stringify([...seen].slice(-30)))}catch(_){}document.querySelectorAll('.release-dot').forEach(dot=>dot.hidden=true)}
  function paintUpdates(){if(location.pathname.endsWith('/updates.html'))markUpdatesSeen();for(const link of document.querySelectorAll('a[href="updates.html"]')){link.classList.add('release-link');let dot=link.querySelector('.release-dot');if(!dot){dot=document.createElement('span');dot.className='release-dot';dot.setAttribute('aria-label','New updates');link.append(dot)}try{dot.hidden=JSON.parse(localStorage.getItem('gr:readReleases')||'[]').includes(release)||localStorage.getItem('gr:releaseSeen')===release}catch(_){}link.addEventListener('click',markUpdatesSeen)}}
  paintUpdates();addEventListener('pageshow',paintUpdates);addEventListener('storage',paintUpdates);
  if(!document.querySelector('#book'))return;
  $('#mute').closest('.row').hidden=false;$('#pageVolume').closest('.row').hidden=false;
  window.recordReadingTime=(start,end)=>{let cursor=start;while(cursor<end){const date=new Date(cursor),next=new Date(cursor);next.setHours(24,0,0,0);const until=Math.min(end,next.getTime()),key=date.toLocaleDateString('sv');S.days[key]=S.days[key]||{m:0,p:0};S.days[key].m+=(until-cursor)/1000;cursor=until}};
  const originalEpub=showEpub;showEpub=function(entry,publication){sesEnd();bk=entry;autoSes();const result=originalEpub(entry,publication);const audio=$('#epAudio').onclick;$('#epAudio').onclick=()=>{audio();for(const label of $('#epPanel').querySelectorAll('label'))if(/^Page.turn/.test(label.textContent))label.hidden=false};return result};$('#epReader').addEventListener('close',()=>{sesEnd();if(bk)putB(bk);bk=null});
  if(location.hash==='#about'){const intro=$('#intro');intro.hidden=false;requestAnimationFrame(()=>$('#about').scrollIntoView())}
  const toolbar=$('#readerTools');toolbar.setAttribute('aria-label','Reading tools');
  // Keep the brush palette beside the page instead of burying it in the toolbar.
  const palette=$('#inkControls');stage.append(palette);
  const desks=[['walnut','Walnut'],['oak','Natural oak'],['linen','Linen'],['slate','Slate'],['marble','Marble'],['leather','Leather'],['midnight','Midnight']];
  for(const [value,label]of desks)$('#readingDesk').add(new Option(label,value));
  const previousDecorate=window.decorateBook;
  window.decorateBook=()=>{previousDecorate?.();if(!pdf)return;const page=Math.max(0,Math.min(n-1,single?s:2*s)),progress=n>1?page/(n-1):1;book.style.setProperty('--left-stack',Math.round(progress*12)+'px');book.style.setProperty('--right-stack',Math.round((1-progress)*12)+'px');book.dataset.finished=String(page>=n-1)};
  const update=window.updateReaderExtras;let lastSpokenPage='';
  window.updateReaderExtras=()=>{update?.();const id=pdf?did+':'+sl.value:'';if(id!==lastSpokenPage){window.stopReadingVoice?.();lastSpokenPage=id}};
  const originalScroll=window.scrollReaderTo;window.scrollReaderTo=p=>{window.stopReadingVoice?.();originalScroll?.(p)};
  // Update detection also catches native scrolling and reflow-reader chapter changes.
  let lastPosition='';setInterval(()=>{const position=pdf?did+':'+sl.value:$('#epReader')?.open?'ep:'+$('#epChapter').value:'';if(position!==lastPosition){window.stopReadingVoice?.();lastPosition=position}},200);
  const stats=document.createElement('section');stats.id='advancedStats';
  stats.innerHTML=`<div class="stats-heading"><div><h3>Your reading rhythm</h3><p id="dailyReadingTotal"></p></div></div><div class="stats-options"><label>Period <select id="statsPeriod"><option value="7">7 days</option><option value="30">30 days</option></select></label><label>Chart <select id="statsChart"><option value="bar">Bars</option><option value="line">Line</option><option value="area">Area</option></select></label></div><div class="stats-metrics"><article><strong id="statsTotal"></strong><span>Total minutes</span></article><article><strong id="statsAverage"></strong><span>Daily average · minutes</span></article><article><strong id="statsBest"></strong><span>Best day · minutes</span></article></div><svg id="readingChart" viewBox="0 0 600 260" role="img"></svg><p class="chart-note" id="statsSummary"></p><details id="statsData"><summary>Daily breakdown</summary><table><caption class="visually-hidden">Reading time and pages by day</caption><thead><tr><th scope="col">Date</th><th scope="col">Minutes</th><th scope="col">Pages</th></tr></thead><tbody></tbody></table></details>`;
  $('#t-ss').append(stats);
  const goal=document.createElement('input');goal.id='dailyGoalInput';goal.type='number';goal.min=1;goal.max=500;goal.setAttribute('aria-label','Daily goal');$('#gv').replaceWith(goal);goal.onchange=()=>{S.goal.v=Math.max(1,Math.min(500,Math.round(+goal.value||1)));sv();ssTab()};
  const statsTab=ssTab;ssTab=function(){if(sec!=='ss')return;const label=document.createElement('b');label.id='gv';goal.replaceWith(label);statsTab();label.replaceWith(goal);goal.value=S.goal.v;drawChart()};
  function drawChart(){
    const days=+$('#statsPeriod').value,values=[],labels=[],dates=[],pages=[];
    for(let i=days-1;i>=0;i--){
      const date=new Date();date.setDate(date.getDate()-i);const key=date.toLocaleDateString('sv');
      const active=i===0&&ses?.run?Math.max(0,(Date.now()-Math.max(ses.t0,new Date().setHours(0,0,0,0)))/1000):0;
      values.push(Math.max(0,((S.days[key]?.m||0)+active)/60));pages.push(S.days[key]?.p||0);
      labels.push(date.toLocaleDateString(undefined,days===7?{weekday:'short'}:{month:'short',day:'numeric'}));dates.push(date.toLocaleDateString(undefined,{month:'short',day:'numeric'}));
    }
    const total=values.reduce((a,b)=>a+b,0),best=Math.max(...values),activeDays=values.filter(v=>v>0).length;
    const number=v=>v<10?v.toFixed(1):Math.round(v).toLocaleString();
    $('#dailyReadingTotal').textContent='Today · '+number(values.at(-1))+' minutes';
    $('#statsTotal').textContent=number(total);$('#statsAverage').textContent=number(total/days);$('#statsBest').textContent=number(best);
    $('#statsSummary').textContent=activeDays+' active '+(activeDays===1?'day':'days')+' in the last '+days+' days · Active reading only. Includes your current session.';
    const maximum=Math.max(20,Math.ceil(best/5)*5),step=Math.max(5,Math.ceil(maximum/6/5)*5),ceiling=Math.ceil(maximum/step)*step;
    const left=56,right=580,bottom=212,x=i=>left+(i+.5)*(right-left)/days,y=v=>bottom-v/ceiling*180;
    let svg='<text x="8" y="17" opacity=".6">min</text>';
    for(let v=0;v<=ceiling;v+=step)svg+=`<line x1="${left}" y1="${y(v)}" x2="${right}" y2="${y(v)}" stroke="currentColor" opacity=".1"/><text x="45" y="${y(v)+4}" text-anchor="end" opacity=".65">${v}</text>`;
    const stride=days===7?1:6;labels.forEach((label,i)=>{if(i%stride===0||i===days-1)svg+=`<text x="${x(i)}" y="240" text-anchor="middle" opacity=".7">${label}</text>`});
    if(S.goal.t==='m'&&S.goal.v<=ceiling)svg+=`<line x1="${left}" x2="${right}" y1="${y(S.goal.v)}" y2="${y(S.goal.v)}" stroke="#b2834c" stroke-dasharray="5 5"/><text x="${right}" y="${y(S.goal.v)-6}" text-anchor="end" fill="#b2834c">Daily goal</text>`;
    const type=$('#statsChart').value,colour='#9772bd';
    if(type==='bar'){const width=Math.min(36,(right-left)/days*.62);values.forEach((v,i)=>svg+=`<rect x="${x(i)-width/2}" y="${y(v)}" width="${width}" height="${bottom-y(v)}" rx="${Math.min(5,width/3)}" fill="${colour}" opacity="${i===days-1?1:.7}"><title>${dates[i]}: ${v.toFixed(1)} minutes, ${pages[i]} pages</title></rect>`)}
    else{const points=values.map((v,i)=>`${x(i)},${y(v)}`).join(' ');if(type==='area')svg+=`<polygon points="${x(0)},${bottom} ${points} ${x(days-1)},${bottom}" fill="${colour}" opacity=".16"/>`;svg+=`<polyline points="${points}" fill="none" stroke="${colour}" stroke-width="3" stroke-linejoin="round"/>`;values.forEach((v,i)=>svg+=`<circle cx="${x(i)}" cy="${y(v)}" r="${days===7?4:2.5}" fill="${colour}"><title>${dates[i]}: ${v.toFixed(1)} minutes, ${pages[i]} pages</title></circle>`)}
    $('#readingChart').innerHTML=svg;$('#readingChart').setAttribute('aria-label',days+' days of reading time in minutes. Total '+total.toFixed(1)+', average '+(total/days).toFixed(1)+'. Daily details in the table below.');
    const body=$('#statsData tbody');body.replaceChildren();for(let i=days-1;i>=0;i--){const row=body.insertRow();for(const value of [dates[i],values[i].toFixed(1),String(pages[i])])row.insertCell().textContent=value}
  }
  $('#statsChart').onchange=$('#statsPeriod').onchange=drawChart;setInterval(()=>{if(sec==='ss'&&!$('#pp').hidden)drawChart()},15000);
})();
