// Temporary, bounded source research. Complete EPUBs never enter the publication.
const fs=require('fs');
const dir='research/covers-5000',books=JSON.parse(fs.readFileSync('public-books/catalog.json'));
const targets=books.filter(b=>b.cover.endsWith('.svg')&&b.rightsReview?.listedContributors?.some(c=>c.role==='ill')&&b.rightsReview.listedContributors.every(c=>c.death>0&&c.death<=1900));
fs.mkdirSync(dir+'/historical-covers',{recursive:true});fs.writeFileSync(dir+'/source-targets.json',JSON.stringify(targets));let next=0;const result={};
async function get(url,file,max){if(fs.existsSync(file))return fs.readFileSync(file);const u=new URL(url);if(u.origin!=='https://gutenberg.pglaf.org')throw Error('Unexpected asset origin');const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(25000),headers:{'User-Agent':'GoodReadence cover review (goodreadence@proton.me)'}});if(!r.ok){await r.body?.cancel();throw Error('HTTP '+r.status)}const parts=[];let size=0;for await(const p of r.body){size+=p.length;if(size>max)throw Error('Oversize source asset');parts.push(p)}const data=Buffer.concat(parts);fs.writeFileSync(file,data);return data}
(async()=>{await Promise.all(Array.from({length:3},async()=>{while(next<targets.length){const b=targets[next++],base='https://gutenberg.pglaf.org/cache/epub/'+b.id+'/',prefix=dir+'/historical-covers/'+b.id;try{
 const html=(await get(base+'pg'+b.id+'-images.html',prefix+'.html',8*1024*1024)).toString();
 const plain=html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');if(/cover.{0,160}(?:created|produced|designed|transcriber)|(?:transcriber|created|produced|designed).{0,160}cover/i.test(plain))throw Error('Possible newly created cover requires separate artwork permission');
 const links=[...html.matchAll(/<link\b[^>]*>/gi)].map(m=>m[0]).filter(t=>/\brel=["'][^"']*cover|\btype=["']image\/x-cover["']/i.test(t));
 if(links.length!==1)throw Error('No unambiguous source-declared cover');const href=links[0].match(/\bhref=["']([^"']+)["']/i)?.[1];if(!href||!/cover|cvr/i.test(href)||/generated|pgepub/i.test(href))throw Error('No historical source-cover path');
 const image=new URL(href.replaceAll('&amp;','&'),base);if(!image.href.startsWith(base))throw Error('Unexpected source-cover location');await get(image.href,prefix+'.source',10*1024*1024);
 result[b.id]={id:b.id,status:'ready',sourceHtml:base+'pg'+b.id+'-images.html',sourceImage:image.href,file:prefix+'.source'};console.log('Source cover ready',b.id);
 }catch(e){result[b.id]={id:b.id,status:'held',reason:e.message};console.log('Source cover held',b.id,e.message)}fs.writeFileSync(dir+'/historical-downloads.json',JSON.stringify(result,null,2))}}));console.log('Cover-only research complete',targets.length)})().catch(e=>{console.error(e);process.exitCode=1});
