const fs=require('fs'),assert=require('assert/strict'),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.GR_BASE_URL||'http://127.0.0.1:8805';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const fixture=JSON.parse(fs.readFileSync('public-books/catalog.json')).find(b=>b.id===1342),body=fs.readFileSync(fixture.file),results=[];
  for(const mobile of [false,true]){
   const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1465,height:661},isMobile:mobile,hasTouch:mobile,serviceWorkers:'block'}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));await page.route('**/animation-fixture.pdf',r=>r.fulfill({contentType:'application/pdf',body}));
   await page.goto(base+'/index.html?library=1');await page.evaluate(async()=>openPdf(await(await fetch('/animation-fixture.pdf')).blob()));
   await page.waitForFunction(()=>pdf&&document.querySelector('#R canvas')&&!busy);await page.evaluate(()=>go(14));await page.waitForFunction(()=>Ls.p===13&&Rs.p===14);await page.evaluate(async()=>await q);
   // A same-size observer callback must retain rendered pages and paper geometry.
   assert(await page.evaluate(()=>{fit();const version=ver,keys=[...cache.keys()].join(),depth=book.style.getPropertyValue('--cover-depth');fit();return ver===version&&keys===[...cache.keys()].join()&&depth===book.style.getPropertyValue('--cover-depth')}));
   for(const appearance of ['light','dark'])for(const readingTheme of [0,1,2]){
    const controls=await page.evaluate(({appearance,readingTheme})=>{GRAppearance.set(appearance);th=readingTheme;theme();return [...document.querySelectorAll('#readingView,#readingDesk')].map(el=>({background:getComputedStyle(el).backgroundColor,colour:getComputedStyle(el).color,label:getComputedStyle(el.parentElement).color,option:getComputedStyle(el.options[0]).color}))},{appearance,readingTheme});
    assert(controls.every(c=>c.background==='rgba(0, 0, 0, 0)'&&c.colour===c.label&&c.option===c.colour));
   }
   await page.evaluate(()=>{th=0;theme();GRAppearance.set('light');fit()});await page.waitForFunction(()=>Ls.p===13&&Rs.p===14);await page.evaluate(async()=>await q);
   // Exercise every curl pose. The cast shadow never resizes or blurs and the
   // paper stacks stay fixed; only transform and opacity change during a turn.
   await page.evaluate(async()=>{const [,r]=slots(s);buildSheet(await get(r,wpx()),await get(r+1,wpx()));sh.hidden=false;book.classList.add('turn');book.offsetWidth});
   const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');const metrics=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
   const before=await metrics(),poses=await page.evaluate(()=>{const samples=[];for(let i=0;i<=24;i++){pose(i/24);const css=getComputedStyle(turnShadow);samples.push({width:css.width,filter:css.filter,depth:book.style.getPropertyValue('--cover-depth'),opacity:+css.opacity,transform:css.transform});turnShadow.getBoundingClientRect()}return samples}),after=await metrics();
   assert.equal(new Set(poses.map(p=>p.width)).size,1);assert.equal(new Set(poses.map(p=>p.depth)).size,1);assert(poses.every(p=>p.filter==='none'));assert.equal(poses[0].opacity,0);assert.equal(poses.at(-1).opacity,0);assert(new Set(poses.map(p=>p.transform)).size>20);assert(after.LayoutCount-before.LayoutCount<=1,'Curl frames must not resize the page or shadow');
   await page.evaluate(()=>pose(.35));await page.screenshot({path:'research/turn-fix/'+(mobile?'phone':'desktop')+'-curl.png'});
   await page.evaluate(async()=>{sh.hidden=true;sh.replaceChildren();turnShadow.remove();turnShadow=null;strips=[];book.classList.remove('turn');await show();await q;const original=pose;window.frameSamples=[];pose=function(p){frameSamples.push(performance.now());return original(p)}});
   const turns=await page.evaluate(async()=>{const start=s,reports=[];for(const d of [1,1,-1,-1]){frameSamples=[];await turn(d);reports.push({frames:frameSamples.length,gaps:frameSamples.slice(1).map((t,i)=>t-frameSamples[i])});await q;}return{start,end:s,reports,shadow:!!document.querySelector('.turn-cast-shadow'),sheet:sh.children.length,cache:cache.size}});
   assert.equal(turns.start,turns.end);assert(!turns.shadow&&turns.sheet===0);assert(turns.cache<=4);
   const gaps=turns.reports.flatMap(r=>r.gaps).sort((a,b)=>a-b);assert(gaps.at(-1)<200,'No first-turn sound startup stall');results.push({mobile,frames:turns.reports.map(r=>r.frames),p95FrameMs:gaps[Math.floor(gaps.length*.95)],maxFrameGapMs:gaps.at(-1),curlLayouts:after.LayoutCount-before.LayoutCount});
   await page.locator('#nx').click();await page.waitForFunction(()=>turnAudio&&!turnAudio.paused&&turnAudio.duration>.3);assert(await page.evaluate(()=>turnSounds.size<=12));await page.waitForFunction(()=>!busy);await page.evaluate(async()=>await q);
   // Fast repeat taps drain their queue and leave the same stable book base.
   await page.evaluate(()=>{turn(1);turn(1);turn(1)});await page.waitForFunction(()=>!busy&&!pendingTurn&&sh.hidden,null,{timeout:15000});assert.equal(await page.locator('.turn-cast-shadow').count(),0);
   await page.locator('#readingView').selectOption('single');await page.waitForFunction(()=>single&&document.querySelector('#R canvas'));await page.evaluate(async()=>{await q;await turn(1)});assert.equal(await page.locator('.turn-cast-shadow').count(),0);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);await context.close();
  }
  fs.writeFileSync('research/turn-fix/results.json',JSON.stringify(results,null,2));console.log('PASS desktop/phone curl poses without per-frame layout or blur; no trailing shadows; forward/back/rapid/single turns; unchanged-layout cache retention; four-page limit; consistent toolbar controls in both appearances; native paper audio without a cold-start stall.');console.log(JSON.stringify(results));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
