// Build once at publication time: readers download PDFs without client conversion or RAM cost.
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
try{const page=await browser.newPage();await page.route(/^https?:/,route=>route.abort());
const books=JSON.parse(fs.readFileSync('public-books/catalog.json','utf8'));
for(const b of books){if(process.env.LIBRARY_INCREMENTAL&&b.file.endsWith('.pdf')&&fs.existsSync(b.file))continue;await page.goto(pathToFileURL(path.resolve('research/library-print',b.slug+'.html')).href);await page.evaluate(()=>document.fonts.ready);
await page.pdf({path:b.file,preferCSSPageSize:true,printBackground:true,displayHeaderFooter:true,headerTemplate:'<span></span>',footerTemplate:'<div style="width:100%;text-align:center;font-size:8px;color:#666"><span class="pageNumber"></span></div>',timeout:120000});
console.log('Complete PDF:',b.slug);}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
