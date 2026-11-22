// One transparent vector master supplies the website, browser, iOS and Android icons.
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const master=fs.readFileSync('brand-mark.svg','utf8');fs.writeFileSync('favicon.svg',master);
 const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||(process.platform==='win32'?'msedge':undefined)});
 try{const page=await browser.newPage({deviceScaleFactor:1});
  for(const [file,size,maskable]of [['icon-192.png',192,false],['icon-512.png',512,false],['apple-touch-icon.png',180,false],['icon-maskable-512.png',512,true]]){
   const svg=(maskable||file==='apple-touch-icon.png')?master.replace('viewBox="150 125 365 370"','viewBox="105 80 455 460"').replace('<defs>','<rect x="105" y="80" width="455" height="460" fill="#f7f5f2"/><defs>'):master;
   await page.setViewportSize({width:size,height:size});await page.setContent('<style>html,body{margin:0;width:100%;height:100%;background:transparent}svg{display:block;width:100%;height:100%}</style>'+svg);await page.screenshot({path:file,omitBackground:true});console.log('Rendered',file,size+'×'+size);
  }
  // Embed the exact master, so the social image cannot drift into a second logo.
  const mark=master.replace(/<!--[\s\S]*?-->/g,'').replace('<svg ','<svg x="0" y="0" width="65" height="65" ');
  const social=fs.readFileSync('assets/social-preview.svg','utf8').replace(/(<g transform="translate\(66 63\)">)[\s\S]*?(<text x="83")/,'$1'+mark+'$2');fs.writeFileSync('assets/social-preview.svg',social);
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
