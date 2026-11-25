// Keep the reviewed source catalogue and local research editions; publish metadata and covers only.
const fs=require('fs');
const books=JSON.parse(fs.readFileSync('public-books/catalog.json'));
const sources={};
for(const b of books){
  const previous=b.delivery;
  b.delivery=previous||{provider:'Project Gutenberg',format:'epub',url:b.mirror,identifier:'https://www.gutenberg.org/ebooks/'+b.id,sourcePage:b.source};
  // Future metadata-only entries do not require any local book payload.
  if(!b.delivery.downloadBytes&&b.sourceFile&&fs.existsSync(b.sourceFile))b.delivery.downloadBytes=fs.statSync(b.sourceFile).size;
  sources[b.id]={url:b.delivery.url,format:b.delivery.format};
}
fs.writeFileSync('public-books/catalog.json',JSON.stringify(books,null,2)+'\n');
fs.writeFileSync('book-sources.json',JSON.stringify(sources,null,2)+'\n');
console.log('Configured',books.length,'approved on-demand sources.');
