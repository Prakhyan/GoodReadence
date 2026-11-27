// Public catalogue queries run here, never in the reader's browser.
const SIZE=12;
const clean=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/dostoevsky/g,'dostoyevsky').replace(/[^a-z0-9]+/g,' ').trim();
function createCatalogue(data){
  const entries=data.items,genres=data.genres;
  return function query(params){
    const text=String(params.get('q')||'').slice(0,160),words=clean(text).split(' ').filter(Boolean),genre=String(params.get('genre')||'').slice(0,80),seed=String(params.get('shuffle')||'').slice(0,40);
    let matches=entries.filter(b=>(!genre||b.genre===genre)&&words.every(w=>b.search.includes(w)));
    if(seed&&!words.length&&!genre){let state=2166136261;for(const char of seed)state=Math.imul(state^char.charCodeAt(0),16777619);matches=matches.slice();for(let i=matches.length-1;i>0;i--){state^=state<<13;state^=state>>>17;state^=state<<5;const j=(state>>>0)%(i+1);[matches[i],matches[j]]=[matches[j],matches[i]]}}
    const pages=Math.max(1,Math.ceil(matches.length/SIZE));let page=Math.min(pages,Math.max(1,Math.floor(Number(params.get('page')))||1));
    const requested=Number(params.get('book'));if(requested&&!text&&!genre){const position=matches.findIndex(b=>b.id===requested);if(position>=0)page=Math.floor(position/SIZE)+1}
    return {version:data.version,items:matches.slice((page-1)*SIZE,page*SIZE).map(({search,...b})=>b),total:matches.length,catalogueTotal:entries.length,page,pages,genres,query:text,genre};
  };
}
module.exports={SIZE,clean,createCatalogue};
