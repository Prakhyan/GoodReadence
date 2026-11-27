// Conservative alternate-title checks, using the source's own author/work references.
const normalize=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const authorKey=s=>String(s||'').split(/[\s,]+/).map(normalize).filter(Boolean).sort().join('');
function titleKey(title){return normalize(String(title).split(/[:;\r\n]/)[0].replace(/\([^)]*\)|\[[^\]]*\]/g,'').replace(/^(the|an|a)\s+/i,'').replace(/^(tragedy|comedy|history|personal history|life and adventures|adventures)\s+of\s+/i,''))}
function identify(book,rdf=''){
 const creator=/<dcterms:creator\b[^>]*>([\s\S]*?)<\/dcterms:creator>/.exec(rdf)?.[1]||'',authorAgent=/agents\/(\d+)/.exec(creator)?.[1];
 const references=[...rdf.matchAll(/Wikipedia page about this book:\s*(https?:\/\/[^<\s]+)/g)].map(m=>{try{const u=new URL(m[1].replaceAll('&amp;','&'));if(!/^(?:[a-z]+\.)?wikipedia\.org$/.test(u.hostname)||!u.pathname.startsWith('/wiki/'))return null;const name=decodeURIComponent(u.pathname.slice(6));if(authorKey(name.replaceAll('_',' '))===authorKey(book.author))return null;return u.hostname.toLowerCase()+'/wiki/'+name.toLowerCase()}catch{return null}}).filter(Boolean);
 return{language:book.language||'en',authorAgent:authorAgent||null,author:authorKey(book.author),title:titleKey(book.title),references:[...new Set(references)]};
}
// A Wikipedia article can discuss an earlier novella and its expanded novel.
// Keep those references for review, rather than treating every shared article
// as proof that two already-reviewed books are identical.
function keys(identity){const prefix=identity.language+':';return[prefix+'title:'+identity.author+':'+identity.title,...(identity.authorAgent?[prefix+'agent:'+identity.authorAgent+':'+identity.title]:[])]}
function referenceKeys(identity){return identity.references.map(r=>identity.language+':reference:'+r)}
const partialTitle=title=>/\bv\.\s*(?:\d+|[ivxlcdm]+)\b|\bvol(?:ume)?s?\.?\s*(?:\d+|[ivxlcdm]+)\b|\b(?:part|book)\s+(?:the\s+)?(?:[ivxlcdm\d]+|first|second|third|fourth|one|two|three)\b|\b(?:abridged|retold|epitome|selections)\b|^letters to his son,?\s+\d{4}\b/i.test(title);
module.exports={identify,keys,referenceKeys,titleKey,partialTitle};
