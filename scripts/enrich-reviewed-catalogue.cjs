// Optional attributed biographies and real community ratings; no invented scores.
const fs=require('fs'),path=require('path');const folder='research/expansion-50000';
const rows=fs.readFileSync(folder+'/accepted.ndjson','utf8').trim().split('\n').filter(Boolean).map(JSON.parse),books=rows.map(r=>r.book),out=fs.existsSync(folder+'/enrichment.json')?JSON.parse(fs.readFileSync(folder+'/enrichment.json')):{};
const pause=ms=>new Promise(r=>setTimeout(r,ms)),existing=JSON.parse(fs.readFileSync('public-books/catalog.json')),authors=JSON.parse(fs.readFileSync('public-books/authors.json'));
const norm=s=>String(s||'').normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'').split(/[\s,]+/).sort().join('').replace(/[^a-z0-9]/g,'');
const profiles=new Map(existing.map(b=>[norm(b.author),authors[b.id]||b.authorInfo])),byAuthor=new Map();for(const b of [...existing,...books]){const key=norm(b.author);if(!byAuthor.has(key))byAuthor.set(key,[]);byAuthor.get(key).push(b.title)}
const save=()=>fs.writeFileSync(folder+'/enrichment.json',JSON.stringify(out));
async function json(url){const r=await fetch(url,{headers:{'User-Agent':'GoodReadence catalogue review (goodreadence@proton.me)'},signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Metadata provider '+r.status);return r.json()}
(async()=>{
 const unique=[...new Map(books.map(b=>[norm(b.author),b])).values()];let i=0;
 for(const b of unique){
  const key=norm(b.author),ids=books.filter(x=>norm(x.author)===key),cached=ids.find(x=>out[x.id]?.authorInfo)?.id;let profile=profiles.get(key)||out[cached]?.authorInfo;
  if(!profile){profile={...b.authorInfo};const wiki=profile.source;if(wiki?.startsWith('https://en.wikipedia.org/wiki/'))try{
    const title=decodeURIComponent(new URL(wiki).pathname.slice(6)),file=folder+'/biography-'+b.id+'.json',data=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):await json('https://en.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(title));
    fs.writeFileSync(file,JSON.stringify(data));const death=b.rightsReview.listedContributors[0].death;
    if(data.type==='disambiguation'||!data.extract||death>0&&!data.extract.includes(String(death)))throw Error('No exact, dated author profile');
    const text=data.extract.slice(0,2200);profile={...profile,bio:text.slice(0,text.lastIndexOf('.')+1)||text,source:data.content_urls.desktop.page,biographyCredit:'Biography adapted from Wikipedia contributors; attribution and share-alike terms apply.'};
   }catch(e){profile={...profile}}finally{await pause(650)}}
  profile={...profile,works:[...new Set(byAuthor.get(key))].slice(0,6)};for(const book of ids)out[book.id]={...(out[book.id]||{}),authorInfo:profile};if(++i%25===0){save();console.log('Author profiles checked',i,'/',unique.length)}
 }
 save();
 for(let start=0;start<books.length;start+=25){
  const batch=books.slice(start,start+25).filter(b=>!out[b.id]?.ratingChecked);if(!batch.length)continue;
  const query='id_project_gutenberg:('+batch.map(b=>b.id).join(' OR ')+')',url='https://openlibrary.org/search.json?'+new URLSearchParams({q:query,fields:'key,title,author_name,ratings_average,ratings_count,id_project_gutenberg',limit:'100'}),file=folder+'/ratings-'+batch.map(b=>b.id).join('-')+'.json';
  try{const data=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):await json(url);fs.writeFileSync(file,JSON.stringify(data));
   for(const b of batch){const matches=(data.docs||[]).filter(d=>d.id_project_gutenberg?.includes(String(b.id))),rated=matches.filter(d=>d.ratings_count>0&&Number.isFinite(d.ratings_average)&&d.ratings_average>=0&&d.ratings_average<=5&&/^\/works\/OL\d+W$/.test(d.key)).sort((a,b)=>b.ratings_count-a.ratings_count),match=rated[0];out[b.id]={...(out[b.id]||{}),ratingChecked:true,rating:match?{average:match.ratings_average,count:match.ratings_count,url:'https://openlibrary.org'+match.key,source:'Open Library',checked:'2026-11-26',sourceTitle:match.title,sourceAuthors:match.author_name,sourceIdentity:{type:'Project Gutenberg ID',value:b.id}}:null,workReferences:matches.map(d=>'https://openlibrary.org'+d.key).filter(u=>/^https:\/\/openlibrary.org\/works\/OL\d+W$/.test(u))};}
  }catch(e){console.log('Ratings unavailable for batch',start,e.message)}save();console.log('Ratings checked',Math.min(start+25,books.length),'/',books.length);await pause(1100);
 }
 save();console.log('Metadata enrichment ready for',books.length,'reviewed source editions.');
})().catch(e=>{console.error(e);process.exitCode=1});
