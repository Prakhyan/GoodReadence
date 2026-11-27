const assert=require('node:assert/strict'),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'});try{
for(const viewport of [{width:390,height:844},{width:1440,height:900}]){
 const context=await browser.newContext({viewport,serviceWorkers:'block'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(()=>{window.__installed=false;window.__offset=0;const now=Date.now;Date.now=()=>now()+window.__offset;Object.defineProperty(navigator,'getInstalledRelatedApps',{value:async()=>window.__installed?[{platform:'webapp',id:location.origin+'/',url:location.origin+'/manifest.webmanifest'}]:[{platform:'webapp',url:'https://another-app.example/manifest.webmanifest'}]})});
 for(const route of ['/','/index.html?library=1']){
  await page.goto((process.env.GR_BASE_URL||'http://127.0.0.1:8805')+route);await page.locator('#siteMenuButton').click();
  assert(await page.locator('#siteMenu [data-install]').isVisible());await page.locator('#siteMenu [data-install]').click();
  assert(await page.locator('#offlineDialog').isVisible());assert(await page.locator('.app-install-choice [data-install]').isVisible());assert.match(await page.locator('#installHelp').innerText(),/Brave/);assert.match(await page.locator('#installHelp').innerText(),/Android/);
  await page.locator('.app-install-choice [data-install]').click();assert(await page.locator('#installHelp').isVisible());
  assert(await page.locator('#offlineDialog').evaluate(e=>e.scrollWidth<=e.clientWidth));await page.locator('.offline-close').click();
 }
 await page.evaluate(()=>{const e=new Event('beforeinstallprompt',{cancelable:true});e.prompt=async()=>{throw Error('Unavailable')};dispatchEvent(e)});
 await page.locator('#siteMenuButton').click();await page.locator('#siteMenu [data-install]').click();assert(await page.locator('#installHelp').isVisible());await page.locator('.offline-close').click();
 await page.evaluate(()=>{const e=new Event('beforeinstallprompt',{cancelable:true});e.prompt=async()=>window.__prompted=true;e.userChoice=Promise.resolve({outcome:'accepted'});dispatchEvent(e)});
 await page.locator('#siteMenuButton').click();await page.locator('#siteMenu [data-install]').click();await page.waitForFunction(()=>window.__prompted&&document.querySelector('#siteMenu [data-install]').hidden);
 await page.evaluate(()=>{dispatchEvent(new Event('appinstalled'));window.__offset=11000;dispatchEvent(new Event('focus'))});await page.waitForFunction(()=>!document.querySelector('#siteMenu [data-install]').hidden);
 await page.evaluate(()=>{window.__installed=true;dispatchEvent(new Event('focus'))});await page.waitForFunction(()=>document.querySelector('#siteMenu [data-install]').hidden);assert.deepEqual(errors,[]);await context.close();
}
 const ios=await browser.newContext({viewport:{width:390,height:844},userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',serviceWorkers:'block'}),p=await ios.newPage();await p.goto((process.env.GR_BASE_URL||'http://127.0.0.1:8805')+'/');await p.locator('#siteMenuButton').click();await p.locator('#siteMenu [data-install]').click();assert.match(await p.locator('#installHelp').innerText(),/Safari.*Share.*Add to Home Screen/);await ios.close();
 const offline=await browser.newContext({viewport:{width:390,height:844}}),o=await offline.newPage();await o.goto((process.env.GR_BASE_URL||'http://127.0.0.1:8805')+'/index.html?library=1');await o.waitForFunction(()=>window.GROffline?.status().appReady&&!!navigator.serviceWorker.controller,null,{timeout:120000});await offline.setOffline(true);await o.reload();await o.locator('#siteMenuButton').click();await o.locator('#siteMenu [data-install]').click();assert(await o.locator('#installHelp').isVisible());assert.match(await o.locator('#installHelp').innerText(),/Brave/);await offline.close();
 console.log('PASS desktop/phone menu and settings installation, Brave/Android/iOS instructions, native prompt acceptance/failure, installed/uninstalled detection and offline settings reopening; no overflow or browser errors.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
