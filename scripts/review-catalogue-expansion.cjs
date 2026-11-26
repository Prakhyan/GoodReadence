// Review complete remote editions in resumable batches, without publishing book files.
const fs=require('fs'),path=require('path'),cp=require('child_process'),readline=require('readline');
const {download,pause}=require('./library-tools.cjs'),{fingerprint}=require('./catalogue-approval.cjs'),{identify,keys,partialTitle}=require('./catalogue-work-identity.cjs');
const downloadSource=require('./download-reviewed-source.cjs');
const folder='research/expansion-50000',target=Number(process.env.CATALOGUE_REVIEW_TARGET)||1000;
const stopFile=folder+'/stop-after-current-editions';
if(process.argv.includes('--stop')){fs.writeFileSync(stopFile,'Finish current editions and retain the review checkpoint.\n');process.exit(0)}
if(fs.existsSync(stopFile))fs.unlinkSync(stopFile);
const candidates=JSON.parse(fs.readFileSync(folder+'/candidates.json')),baseline=JSON.parse(fs.readFileSync(folder+'/baseline.json'));
fs.mkdirSync(folder+'/rdf',{recursive:true});fs.mkdirSync(folder+'/temporary-sources',{recursive:true});
const readLines=file=>fs.existsSync(file)?fs.readFileSync(file,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
let accepted=readLines(folder+'/accepted.ndjson');const held=readLines(folder+'/held.ndjson');let done;
const norm=s=>String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const workKey=b=>norm(b.title.split(/[:;\n]/)[0].replace(/^(the|an|a)\s+/i,''))+':'+b.author.toLowerCase().split(/[\s,]+/).filter(Boolean).sort().map(norm).join('');
const workKeys=new Set();
const proof=JSON.parse(fs.readFileSync('docs/catalogue-edition-audit.json')),textHashes=new Set([...proof.records,...accepted.map(r=>r.proof)].map(r=>r.sourceTextSha256));
const cached=new Map();for(const parent of fs.readdirSync('research').filter(f=>f.startsWith('expansion-'))){const dir=path.join('research',parent,'rdf');if(fs.existsSync(dir))for(const name of fs.readdirSync(dir))if(/^\d+\.rdf$/.test(name))cached.set(name,path.join(dir,name))}
const rdfOf=b=>{const file=cached.get(b.id+'.rdf');return file?fs.readFileSync(file,'utf8'):''};
for(const b of baseline)for(const key of keys(identify(b,rdfOf(b))))workKeys.add(key);
accepted=accepted.filter(row=>{
 if(row.proof.editionFingerprint!==fingerprint(row.book))throw Error('Staged source evidence changed: '+row.book.id);
 const identity=identify(row.book,rdfOf(row.book));
 if(partialTitle(row.book.title)||keys(identity).some(key=>workKeys.has(key))){const entry={id:row.book.id,title:row.book.title,reason:'Duplicate underlying work or alternate source title'};held.push(entry);fs.appendFileSync(folder+'/held.ndjson',JSON.stringify(entry)+'\n');return false}
 row.book.workIdentity=identity;row.proof.editionFingerprint=fingerprint(row.book);for(const key of keys(identity))workKeys.add(key);return true;
});
fs.writeFileSync(folder+'/accepted.ndjson',accepted.map(r=>JSON.stringify(r)+'\n').join(''));
done=new Set([...baseline,...accepted.map(r=>r.book),...held].map(b=>b.id));
let next=0,reviewed=held.length+accepted.length,stopping=false;
function worker(){
 const proc=cp.spawn(process.env.PYTHON||'python',['scripts/review-catalogue-edition.py'],{windowsHide:true,env:{...process.env,PYTHONPATH:'research/tools',PYTHONIOENCODING:'utf-8'}}),waiting=[];
 readline.createInterface({input:proc.stdout}).on('line',line=>{const request=waiting.shift();try{request?.resolve(JSON.parse(line))}catch(e){request?.reject(e)}});
 proc.stderr.on('data',b=>process.stderr.write(b));proc.on('exit',code=>{for(const r of waiting.splice(0))r.reject(Error('Reviewer exited: '+code))});
 return{query:data=>new Promise((resolve,reject)=>{waiting.push({resolve,reject});proc.stdin.write(JSON.stringify(data)+'\n')}),close:()=>proc.stdin.end()};
}
function checkpoint(){fs.writeFileSync(folder+'/progress.json',JSON.stringify({target,accepted:accepted.length,held:held.length,reviewed,pool:candidates.length,latest:accepted.at(-1)?.book.title},null,2))}
function removeTemporary(file){const resolved=path.resolve(file),parent=path.resolve(folder+'/temporary-sources')+path.sep;if(!resolved.startsWith(parent))throw Error('Unexpected source cleanup path');if(fs.existsSync(file))fs.unlinkSync(file)}
(async()=>{const workers=Array.from({length:Number(process.env.CATALOGUE_REVIEW_WORKERS)||4},worker);try{await Promise.all(workers.map(async w=>{
 while(next<candidates.length&&accepted.length<target&&!stopping&&!fs.existsSync(stopFile)){
  const candidate=candidates[next++];if(done.has(candidate.id))continue;done.add(candidate.id);if(partialTitle(candidate.title)){held.push({id:candidate.id,title:candidate.title,reason:'Separate partial volume or adapted text'});fs.appendFileSync(folder+'/held.ndjson',JSON.stringify(held.at(-1))+'\n');reviewed++;continue}
  const rdf=folder+'/rdf/'+candidate.id+'.rdf',epub=folder+'/temporary-sources/'+candidate.id+'.epub';let result;
  try{
   if(!fs.existsSync(rdf)&&cached.has(candidate.id+'.rdf'))fs.copyFileSync(cached.get(candidate.id+'.rdf'),rdf);
   await download('https://gutenberg.pglaf.org/cache/epub/'+candidate.id+'/pg'+candidate.id+'.rdf',rdf);
   const metadata=await w.query({op:'metadata',candidate,rdf});if(!metadata.ok)throw Error(metadata.error);
   await downloadSource(metadata.result.mirror,epub);
   result=await w.query({op:'edition',book:metadata.result,epub});if(!result.ok)throw Error(result.error);
   const row=result.result,identity=identify(row.book,fs.readFileSync(rdf,'utf8'));if(keys(identity).some(key=>workKeys.has(key)))throw Error('Duplicate underlying work or alternate source title');row.book.workIdentity=identity;if(textHashes.has(row.proof.sourceTextSha256))throw Error('Duplicate complete source text');
   for(const key of keys(identity))workKeys.add(key);textHashes.add(row.proof.sourceTextSha256);row.proof.editionFingerprint=fingerprint(row.book);accepted.push(row);fs.appendFileSync(folder+'/accepted.ndjson',JSON.stringify(row)+'\n');
   // A few ignored fixtures support browser conversion checks. Other source bytes
   // are discarded after their full review, never copied into Git or dist.
   if(accepted.length<=8||accepted.length%250===0){const fixtures=folder+'/fixtures';fs.mkdirSync(fixtures,{recursive:true});fs.copyFileSync(epub,fixtures+'/'+candidate.id+'.epub')}
  }catch(e){const row={id:candidate.id,title:candidate.title,reason:e.message};held.push(row);fs.appendFileSync(folder+'/held.ndjson',JSON.stringify(row)+'\n')}
  finally{removeTemporary(epub);reviewed++;checkpoint();if(reviewed%20===0)console.log('Reviewed',reviewed,'accepted',accepted.length,'held',held.length,'/',candidates.length)}
  await pause(150);
 }
 }));}finally{workers.forEach(w=>w.close());checkpoint()}
 console.log(accepted.length>=target||next>=candidates.length?'Review batch complete:':'Review checkpoint saved:',accepted.length,'accepted;',held.length,'held. Source files remain external.');
})().catch(e=>{stopping=true;console.error(e);process.exitCode=1});
