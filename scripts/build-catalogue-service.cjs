// Separate compact search cards from per-book biographies, delivery and rights data.
const fs=require('fs'),path=require('path'),{clean,createCatalogue}=require('../server/catalogue.cjs');
module.exports=function buildCatalogue(data){
  const version=JSON.parse(fs.readFileSync('release.json')).version;
  const excerpt=text=>{text=String(text||'');return text.length>220?text.slice(0,216).replace(/\s+\S*$/,'')+'…':text};
  const languages=new Intl.DisplayNames(['en'],{type:'language'});
  const items=data.map(b=>({id:b.id,title:b.title,author:b.author,genre:b.genre,language:b.language||'en',languageLabel:languages.of(b.language||'en'),description:excerpt(b.description),cover:b.cover,coverSha256:b.coverSha256,pagePath:b.pagePath,rating:b.rating?{average:b.rating.average,count:b.rating.count,source:b.rating.source}:null,search:clean(b.title+' '+b.author+' '+b.genre+' '+languages.of(b.language||'en'))}));
  const index={version,genres:[...new Set(data.map(b=>b.genre))].sort(),items};
  fs.writeFileSync('catalogue-index.json',JSON.stringify(index));
  const folder=path.resolve('catalogue/books');fs.mkdirSync(folder,{recursive:true});
  const keep=new Set(data.map(b=>b.id+'.json'));for(const file of fs.readdirSync(folder))if(/^\d+\.json$/.test(file)&&!keep.has(file))fs.unlinkSync(path.join(folder,file));
  for(const b of data)fs.writeFileSync(path.join(folder,b.id+'.json'),JSON.stringify(b));
  return createCatalogue(index)(new URLSearchParams());
};
