// Assemble and validate an expansion before changing the website's catalogue.
const fs=require('fs'),path=require('path'),{fingerprint,check}=require('./catalogue-approval.cjs'),{identify,keys,referenceKeys,partialTitle}=require('./catalogue-work-identity.cjs');
const publishLimit=Number(process.env.CATALOGUE_PUBLISH_LIMIT)||Infinity;
const reviewDate=process.env.CATALOGUE_REVIEW_DATE||new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Kolkata'}).format(new Date());
const folder='research/expansion-50000',baseline=JSON.parse(fs.readFileSync(folder+'/baseline.json')),rows=fs.readFileSync(folder+'/accepted.ndjson','utf8').trim().split('\n').filter(Boolean).map(JSON.parse),enrichment=fs.existsSync(folder+'/enrichment.json')?JSON.parse(fs.readFileSync(folder+'/enrichment.json')):{};
const currentAudit=JSON.parse(fs.readFileSync('docs/catalogue-edition-audit.json')),proofs=new Map(currentAudit.records.map(p=>[p.id,p])),authors=JSON.parse(fs.readFileSync('public-books/authors.json')),rdf=new Map();
const published=new Map(JSON.parse(fs.readFileSync('public-books/catalog.json')).map(b=>[b.id,b]));
const designs=fs.existsSync(folder+'/covers/original-cover-designs.json')?JSON.parse(fs.readFileSync(folder+'/covers/original-cover-designs.json')):{};
for(const parent of fs.readdirSync('research').filter(f=>f.startsWith('expansion-'))){const dir=path.join('research',parent,'rdf');if(fs.existsSync(dir))for(const name of fs.readdirSync(dir))if(/^\d+\.rdf$/.test(name))rdf.set(name,path.join(dir,name))}
// Reuse identities recorded by the completed source review; resolve legacy gaps only.
const identity=b=>structuredClone(b.workIdentity||proofs.get(b.id)?.workIdentity||identify(b,rdf.has(b.id+'.rdf')?fs.readFileSync(rdf.get(b.id+'.rdf'),'utf8'):'')),seen=new Map(),references=new Map(),texts=new Map(),books=[],records=[],held=[];
function addReference(work,url){if(/^https:\/\/openlibrary.org\/works\/OL\d+W$/.test(url||''))work.references.push(url.replace('https://','').toLowerCase());work.references=[...new Set(work.references)]}
for(const b of baseline){
 const proof=proofs.get(b.id);if(proof?.editionFingerprint!==fingerprint(b))throw Error('Original edition changed after review: '+b.id);
 const work=identity(b);addReference(work,b.rating?.url);for(const key of keys(work)){if(seen.has(key)&&seen.get(key)!==b.id)throw Error('Baseline needs duplicate review: '+b.id+' / '+seen.get(key));seen.set(key,b.id)}
 for(const key of referenceKeys(work))if(!references.has(key))references.set(key,b.id);books.push(b);records.push({...proof,workIdentity:work});texts.set(proof.sourceTextSha256,b.id);
}
for(const row of rows){
 if(books.length-baseline.length>=publishLimit)break;
 const b=structuredClone(row.book),proof=structuredClone(row.proof),extra=enrichment[b.id]||{};
 if(proof.editionFingerprint!==fingerprint(b))throw Error('Staged edition changed after review: '+b.id);
 const reject=reason=>held.push({id:b.id,title:b.title,reason});
 if(partialTitle(b.title)){reject('Separate partial volume or adapted edition');continue}
 const work=identity(b);for(const ref of extra.workReferences||[])addReference(work,ref);addReference(work,extra.rating?.url);
 const duplicate=keys(work).map(key=>seen.get(key)).find(id=>id!==undefined);if(duplicate!==undefined){reject('Alternate title or edition of existing work '+duplicate);continue}
 const sharedReference=referenceKeys(work).map(key=>references.get(key)).find(id=>id!==undefined);if(sharedReference!==undefined){reject('Shared work reference requires separate identity review: '+sharedReference);continue}
 if(texts.has(proof.sourceTextSha256)){reject('Duplicate complete source text '+texts.get(proof.sourceTextSha256));continue}
 b.workIdentity=work;b.authorInfo=extra.authorInfo||b.authorInfo;if(extra.ratingChecked)b.rating=extra.rating;
 const previous=published.get(b.id);if(previous){if(previous.title!==b.title||previous.delivery.url!==b.delivery.url)throw Error('Published source identity changed: '+b.id);if(previous.seoSlug)b.seoSlug=previous.seoSlug}
 else b.rightsReview.checked=reviewDate;
 b.slug='pg-'+b.id;b.cover='public-books/covers/pg-'+b.id+'.svg';b.coverCredit='Original display-cover design by Casid Studio for GoodReadence. The original source edition and its credits are retained.';b.colour='#533a54';
 if(designs[b.id]){b.cover=designs[b.id].file;b.coverSha256=designs[b.id].sha256}
 proof.workIdentity=work;proof.editionFingerprint=fingerprint(b);books.push(b);records.push(proof);authors[b.id]=b.authorInfo;for(const key of keys(work))seen.set(key,b.id);for(const key of referenceKeys(work))references.set(key,b.id);texts.set(proof.sourceTextSha256,b.id);
}
const sources=Object.fromEntries(books.map(b=>[b.id,{url:b.delivery.url,format:b.delivery.format}])),report={...currentAudit,checked:reviewDate,total:records.length,accepted:records.length,held:0,policy:'Published editions only: historical reviews retained; additions have explicit source permissions, dated creative contributors, complete reading-order and asset checks, glyph checks and duplicate-work screening. Source bytes were reviewed temporarily and are not deployed. Screening is not universal legal certification.',records};
check(books,{report,sources});
const staged=folder+'/release';fs.mkdirSync(staged,{recursive:true});
for(const[name,value]of Object.entries({'catalog.json':books,'authors.json':authors,'audit.json':report,'sources.json':sources,'held.json':held}))fs.writeFileSync(staged+'/'+name,JSON.stringify(value,null,2)+'\n');
const newBooks=books.filter(b=>!baseline.some(old=>old.id===b.id)),coverFolder=folder+'/covers';fs.mkdirSync(coverFolder,{recursive:true});fs.writeFileSync(coverFolder+'/baseline.json',JSON.stringify(newBooks));fs.writeFileSync(coverFolder+'/cover-audit.json',JSON.stringify(newBooks.map(b=>({id:b.id,auto:!published.has(b.id)||!b.coverSha256||!fs.existsSync(b.cover)}))));fs.writeFileSync(coverFolder+'/cover-review.json','{}');
const summary={baseline:baseline.length,sourceReviews:rows.length,readyNew:newBooks.length,total:books.length,heldAfterDuplicateAndVolumeReview:held.length,potentialCandidatePool:JSON.parse(fs.readFileSync(folder+'/inventory.json')).potentialCandidates};fs.writeFileSync(folder+'/release-summary.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
if(process.argv.includes('--apply')){
 for(const b of newBooks)if(!b.coverSha256||!fs.existsSync(b.cover))throw Error('Finish the original display cover before publication: '+b.id);
 const backups=folder+'/pre-publication';fs.mkdirSync(backups,{recursive:true});
 for(const[from,to]of [['catalog.json','public-books/catalog.json'],['authors.json','public-books/authors.json'],['audit.json','docs/catalogue-edition-audit.json'],['sources.json','book-sources.json']]){const backup=backups+'/'+path.basename(to);if(!fs.existsSync(backup))fs.copyFileSync(to,backup);fs.copyFileSync(staged+'/'+from,to)}
 require('./seal-catalogue-audit.cjs');console.log('Applied reviewed metadata only; source books remain remote.');
}
