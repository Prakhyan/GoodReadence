const fs=require('fs'),crypto=require('crypto'),assert=require('assert/strict');
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
function fingerprint(b){const d=b.delivery;return crypto.createHash('sha256').update(JSON.stringify(canonical({id:b.id,title:b.title,author:b.author,source:b.source,sourceSha256:b.sourceSha256,sourceSections:b.sourceSections,contributors:b.contributors,rightsReview:b.rightsReview,workIdentity:b.workIdentity,delivery:{provider:d.provider,format:d.format,url:d.url,identifier:d.identifier,reviewedNames:d.reviewedNames,rightsReview:d.rightsReview}}))).digest('hex')}
function check(books,evidence={}){
 const report=evidence.report||JSON.parse(fs.readFileSync('catalogue-approval.json')),records=new Map(report.records.map(r=>[r.id,r])),allowed=evidence.sources||JSON.parse(fs.readFileSync('book-sources.json')),ids=new Set(books.map(b=>String(b.id))),works=new Map(),urls=new Map(),textHashes=new Map();
 const {identify,keys}=require('./catalogue-work-identity.cjs');
 assert.equal(new Set(books.map(b=>b.id)).size,books.length,'Duplicate catalogue ID');
 assert(Object.keys(allowed).every(id=>ids.has(id)),'Unreviewed download source');
 for(const b of books){
  assert(Number.isSafeInteger(b.id)&&b.id>0,'Invalid stable book ID');
  assert(b.cover.startsWith('public-books/')&&!b.cover.includes('..')&&!b.cover.includes('\\'),'Cover must remain in managed public assets');
  assert.equal(allowed[b.id]?.url,b.delivery.url,'Download source changed outside its review');assert.equal(allowed[b.id]?.format,b.delivery.format,'Download format changed outside its review');
  assert(!urls.has(b.delivery.url),'Duplicate source download URL');urls.set(b.delivery.url,b.id);
  const proof=records.get(b.id);assert(proof?.accepted,'Edition requires a permission/completeness review: '+b.id);
  assert.equal(proof.editionFingerprint,fingerprint(b),'Edition changed after its review: '+b.id);assert(proof.spineSections>0&&proof.words>=100&&proof.sourceSha256,'Incomplete source proof: '+b.id);
  if(proof.sourceTextSha256){assert(!textHashes.has(proof.sourceTextSha256),'Duplicate complete source text');textHashes.set(proof.sourceTextSha256,b.id)}
  for(const key of keys(proof.workIdentity||b.workIdentity||identify(b))){assert(!works.has(key)||works.get(key)===b.id,'Duplicate underlying work: '+b.id+' / '+works.get(key));works.set(key,b.id)}
 }
 return report;
}
module.exports={fingerprint,check};
