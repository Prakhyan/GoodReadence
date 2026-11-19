const fs=require('node:fs');
const books=JSON.parse(fs.readFileSync('public-books/catalog.json'));
const authors=JSON.parse(fs.readFileSync('public-books/authors.json'));
const norm=s=>s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g,'').replace(/^the/,'');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function json(url){const r=await fetch(url,{signal:AbortSignal.timeout(12000),headers:{'User-Agent':'GoodReadence/1.1 (goodreadence@proton.me)'}});if(!r.ok)throw Error(r.status);return r.json()}
(async()=>{
const names=[...new Set(books.slice(100).filter(b=>!books.slice(0,100).some(x=>x.author===b.author)).map(b=>b.author))];
fs.mkdirSync('research/expansion-300/authors',{recursive:true});
let next=0;await Promise.all(Array.from({length:3},async()=>{while(next<names.length){const name=names[next++];try{const d=await json('https://en.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(name.replaceAll(' ','_')));if(d.type==='disambiguation'||!d.extract||d.extract.length<100)continue;fs.writeFileSync('research/expansion-300/authors/'+name.replace(/[^a-z0-9]/gi,'_')+'.json',JSON.stringify(d));for(const b of books.filter(b=>b.author===name)){const a=authors[b.id];a.bio=d.extract;a.source=d.content_urls.desktop.page;a.biographyCredit='Biography: Wikipedia contributors, CC BY-SA 4.0; reproduced from the linked article.'}console.log('Author profile',name)}catch{}await wait(500)}}));
for(let i=100;i<books.length;i+=10){const file=`research/expansion-300/ratings-${i}.json`;try{let d;if(fs.existsSync(file))d=JSON.parse(fs.readFileSync(file));else{const q=books.slice(i,i+10).map(b=>'title:"'+b.title.replace(/"/g,'')+'"').join(' OR ');d=await json('https://openlibrary.org/search.json?'+new URLSearchParams({q,fields:'key,title,author_name,ratings_average,ratings_count',limit:'100'}));fs.writeFileSync(file,JSON.stringify(d))}for(const b of books.slice(i,i+10)){const surname=norm(b.author.split(' ').at(-1));const matches=d.docs.filter(x=>norm(x.title)===norm(b.title)&&x.author_name?.some(a=>norm(a).includes(surname))&&x.ratings_count>0&&x.ratings_average>=0&&x.ratings_average<=5).sort((a,b)=>b.ratings_count-a.ratings_count);if(matches.length){const x=matches[0];b.rating={average:x.ratings_average,count:x.ratings_count,url:'https://openlibrary.org'+x.key,checked:new Date().toISOString().slice(0,10),sourceTitle:x.title,sourceAuthors:x.author_name}}}console.log('Ratings batch',i)}catch(e){console.log('No verified ratings batch',i,e.message)}await wait(1000)}
for(const b of books)b.authorInfo=authors[b.id];
fs.writeFileSync('public-books/catalog.json',JSON.stringify(books,null,2)+'\n');fs.writeFileSync('public-books/authors.json',JSON.stringify(authors,null,2)+'\n');fs.writeFileSync('library-data.json',JSON.stringify(books));
})();
