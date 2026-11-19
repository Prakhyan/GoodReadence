// Render the original vector branding into the PNG expected by sharing services.
const fs=require('node:fs'),{pathToFileURL}=require('node:url'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||(process.platform==='win32'?'msedge':undefined)});try{const page=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});await page.goto(pathToFileURL(path.resolve('assets/social-preview.svg')).href);await page.screenshot({path:'assets/social-preview.png'});console.log('Rendered 1200×630 sharing image')}finally{await browser.close()}})().catch(error=>{console.error(error);process.exitCode=1});
