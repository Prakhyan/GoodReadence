// Prefer reviewed edition artwork. Give the remaining title covers individual palettes and bindings.
const fs=require('fs'),crypto=require('crypto'),assert=require('assert/strict');
const dir='research/covers-5000',books=JSON.parse(fs.readFileSync('public-books/catalog.json'));
const historic=JSON.parse(fs.readFileSync(dir+'/source-cover-review.json')),editions=JSON.parse(fs.readFileSync(dir+'/cover-review.json'));
const evidence=fs.existsSync('docs/cover-rights-review.json')?JSON.parse(fs.readFileSync('docs/cover-rights-review.json')).records:[];let originals=evidence.filter(r=>r.sourceArchive).length,editionArt=evidence.filter(r=>!r.sourceArchive).length,designed=0,home=fs.readFileSync('index.html','utf8');
for(const row of [...evidence])if(row.sourceArchive&&historic[row.id]?.status!=='accepted'){
 const b=books.find(b=>b.id===row.id),old=b.cover;b.cover='public-books/covers/pg-'+b.id+'.svg';assert(fs.existsSync(b.cover));b.coverDesignVersion='individual-binding-2';b.coverCredit='Original title-cover design by Casid Studio for GoodReadence. Historical edition artwork is used where its rights can be verified.';delete b.coverSource;delete b.coverLicense;b.coverSha256=crypto.createHash('sha256').update(fs.readFileSync(b.cover)).digest('hex');home=home.replaceAll(old,b.cover);evidence.splice(evidence.indexOf(row),1);originals--;assert.equal(old,'public-books/covers/pg-'+b.id+'-edition.jpg');fs.unlinkSync(old);
}
for(const b of books){
 const prior=evidence.find(r=>r.id===b.id),source=historic[b.id]?.status==='accepted'?historic[b.id]:editions[b.id]?.status==='accepted'?editions[b.id]:null;
 if(!b.cover.endsWith('.svg')&&!(source?.sourceArchive&&prior&&!prior.sourceArchive))continue;
 if(source){
  assert(source.artists.length&&source.artists.every(a=>a.death>0&&a.death<=1905));
  const bytes=fs.readFileSync(source.file);assert(bytes[0]===255&&bytes[1]===216&&bytes.length>3000);
  const old=b.cover;b.cover='public-books/covers/pg-'+b.id+'-edition.jpg';fs.copyFileSync(source.file,b.cover);home=home.replaceAll(old,b.cover);
  b.coverCredit=source.credit;b.coverSource=source.source;delete b.coverDesignVersion;
  if(source.license)b.coverLicense=source.license;else delete b.coverLicense;
  if(prior){evidence.splice(evidence.indexOf(prior),1);if(prior.sourceArchive)originals--;else editionArt--}
  if(source.sourceArchive)originals++;else editionArt++;
  evidence.push({...source,file:b.cover,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),method:source.sourceArchive?'Historical source-edition cover':'Standard Ebooks edition artwork'});
 }else{
  if(b.coverDesignVersion==='individual-binding-2')continue;
  let svg=fs.readFileSync(b.cover,'utf8');const hash=crypto.createHash('sha256').update(b.id+':'+b.title).digest();
  const hue=hash[0]*360/256,sat=20+hash[1]%25,light=17+hash[2]%17;
  const bg=`hsl(${hue.toFixed(0)} ${sat}% ${light}%)`,foil=`hsl(${((hue+35)%360).toFixed(0)} 36% 77%)`;
  const old=svg.match(/<rect width="600" height="900" rx="7" fill="(#[0-9a-f]+)"/i)?.[1];assert(old,'Known cover template required');svg=svg.replaceAll(old,bg);
  // Six bindings, with title-specific geometry; motifs remain quiet beneath the typography.
  const k=hash[3]%6,x=72+hash[4]%80,y=440+hash[5]%100;
  const shapes=[`<path d="M0 0H600V170L0 265Z"/><path d="M0 735L600 650V900H0Z"/>`,
   `<path d="M0 0H100V900H0Z"/><path d="M500 0H600V900H500Z"/>`,
   `<circle cx="${x}" cy="${y}" r="290"/><circle cx="560" cy="40" r="200"/>`,
   `<path d="M0 0H600V175Q300 300 0 175Z"/><path d="M0 900H600V760Q300 640 0 760Z"/>`,
   `<path d="M0 0H600V130H0ZM0 790H600V900H0Z"/>`,
   `<path d="M0 0H${x}L600 810V900H${600-x}L0 90Z"/>`][k];
  const decor=`<g fill="${foil}" opacity=".10">${shapes}</g><g fill="none" stroke="${foil}" opacity=".3"><path d="M58 152H542M58 789H542" stroke-width="${1+hash[6]%3}"/></g>`;
  svg=svg.replace(/(<g text-anchor="middle" fill=")[^"]+/, '$1#f7edda');
  svg=svg.replace('<g text-anchor="middle"',decor+'<g text-anchor="middle"');
  svg=svg.replace(/stroke="#[a-f0-9]{6}"/gi,`stroke="${foil}"`).replace(/<g color="#[a-f0-9]{6}"/i,`<g color="${foil}"`);
  assert(!/<script|<foreignObject|<image|\bon\w+\s*=|href\s*=/i.test(svg));
  fs.writeFileSync(b.cover,svg);b.coverDesignVersion='individual-binding-2';b.coverCredit='Original title-cover design by Casid Studio for GoodReadence. Historical edition artwork is used where its rights can be verified.';
  delete b.coverSource;delete b.coverLicense;designed++;
 }
 b.coverSha256=crypto.createHash('sha256').update(fs.readFileSync(b.cover)).digest('hex');
}
for(const row of evidence)row.sha256=crypto.createHash('sha256').update(fs.readFileSync(row.file)).digest('hex');
fs.writeFileSync('public-books/catalog.json',JSON.stringify(books,null,2)+'\n');
fs.writeFileSync('index.html',home);
fs.writeFileSync('docs/cover-rights-review.json',JSON.stringify({checked:'2026-11-28',markets:['India','US','UK','EU'],policy:'Matched works only. Historical source covers require an explicit US public-domain edition, named long-expired illustrators and a source-declared cover. Possible new transcriber-created covers are held. Standard Ebooks edition artwork requires CC0 production credits and an identified artist deceased by 1905. Other books retain original title-cover designs; no modern publisher covers are presumed free.',originals,editionArt,designed:books.filter(b=>b.cover.endsWith('.svg')).length,records:evidence},null,2)+'\n');
console.log({historicalCovers:originals,editionArt,individualTitleCovers:designed});
