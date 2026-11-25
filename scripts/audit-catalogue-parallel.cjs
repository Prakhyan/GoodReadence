// Bound independent source checks to three processes, then check duplicates across all batches.
const fs=require('fs'),{spawn}=require('child_process'),{fingerprint}=require('./catalogue-approval.cjs');
const books=JSON.parse(fs.readFileSync('public-books/catalog.json')),folder='research/performance';fs.mkdirSync(folder,{recursive:true});
const py=process.env.PYTHON||'python';
(async()=>{
 const paths=await Promise.all(Array.from({length:3},(_,i)=>new Promise((resolve,reject)=>{
  const output=folder+'/audit-part-'+i+'.json';if(fs.existsSync(output))fs.unlinkSync(output);const child=spawn(py,['-u','scripts/audit-catalogue-editions.py'],{env:{...process.env,AUDIT_START:String(Math.floor(i*books.length/3)),AUDIT_END:String(Math.floor((i+1)*books.length/3)),AUDIT_OUTPUT:output},windowsHide:true});
  child.stdout.on('data',chunk=>process.stdout.write('Batch '+(i+1)+': '+chunk));child.stderr.on('data',chunk=>process.stderr.write(chunk));child.on('error',reject);child.on('exit',code=>{if(fs.existsSync(output))resolve(output);else reject(Error('Edition check failed: '+code))});
 })));
 const parts=paths.map(p=>JSON.parse(fs.readFileSync(p))),records=parts.flatMap(p=>p.records),byId=new Map(books.map(b=>[b.id,b])),ids=new Set(),urls=new Map(),titles=new Map(),text=new Map();
 for(const record of records){const book=byId.get(record.id);record.editionFingerprint=fingerprint(book);if(ids.has(book.id))record.errors.push('Duplicate ID');ids.add(book.id);for(const [map,key,label]of [[urls,book.delivery.url,'source URL'],[titles,(book.title+'|'+book.author).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,''),'title and author'],[text,record.sourceTextSha256,'complete source text']]){if(map.has(key)&&map.get(key)!==book.id&&!record.errors.some(e=>e.startsWith('Duplicate '+label)))record.errors.push('Duplicate '+label+': '+map.get(key));map.set(key,book.id)}record.accepted=!record.errors.length}
 const report={...parts[0],total:records.length,accepted:records.filter(r=>r.accepted).length,held:records.filter(r=>!r.accepted).length,records};fs.writeFileSync('docs/catalogue-edition-audit.json',JSON.stringify(report,null,2)+'\n');console.log('Total reviewed:',report.total,'Accepted:',report.accepted,'Held:',report.held);if(report.held){console.log(records.filter(r=>!r.accepted).map(r=>({id:r.id,errors:r.errors})));process.exitCode=1}
})().catch(error=>{console.error(error);process.exitCode=1});
