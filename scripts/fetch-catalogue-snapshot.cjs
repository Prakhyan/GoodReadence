// Official bulk metadata only. Resume verified byte ranges without scraping pages.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const folder='research/expansion-50000',base='https://gutenberg.pglaf.org/cache/epub/feeds/';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function range(name,start,end){
 for(let retry=0;retry<4;retry++)try{
  const r=await fetch(base+name,{headers:{Range:`bytes=${start}-${end}`,'User-Agent':'GoodReadence edition review (goodreadence@proton.me)'},signal:AbortSignal.timeout(25000)});
  if(r.status!==206)throw Error('Expected a bounded metadata range: '+r.status);
  const match=/bytes (\d+)-(\d+)\/(\d+)/.exec(r.headers.get('content-range')||''),bytes=Buffer.from(await r.arrayBuffer());
  if(!match||+match[1]!==start||+match[2]!==Math.min(end,+match[3]-1)||bytes.length!==+match[2]-start+1)throw Error('Incomplete metadata range');
  return{bytes,total:+match[3],modified:r.headers.get('last-modified')};
 }catch(e){if(retry===3)throw e;await pause(800*(retry+1))}
}
async function download(name){
 const file=path.join(folder,name),stateFile=file+'.resume.json';
 if(fs.existsSync(file)){console.log('Using complete snapshot',name,fs.statSync(file).size);return}
 const size=name.endsWith('.bz2')?262144:65536,first=await range(name,0,size-1);if(first.total>200*1024*1024)throw Error('Unexpected metadata archive size');
 let state=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile)):{total:first.total,modified:first.modified,done:[]};
 if(state.total!==first.total||state.modified!==first.modified)throw Error('Metadata snapshot changed; review the saved partial snapshot before restarting');
 const previousSize=state.chunkSize||65536;if(previousSize!==size){const oldDone=new Set(state.done);state.done=Array.from({length:Math.ceil(first.total/size)},(_,i)=>i*size).filter(start=>Array.from({length:Math.ceil(Math.min(size,first.total-start)/previousSize)},(_,i)=>start+i*previousSize).every(offset=>oldDone.has(offset)))}state.chunkSize=size;
 const fileHandle=fs.openSync(file+'.part',fs.existsSync(file+'.part')?'r+':'w+');fs.ftruncateSync(fileHandle,first.total);
 const done=new Set(state.done);fs.writeSync(fileHandle,first.bytes,0,first.bytes.length,0);done.add(0);let next=0,finished=done.size;
 const save=()=>fs.writeFileSync(stateFile,JSON.stringify({...state,done:[...done]}));save();
 try{await Promise.all(Array.from({length:4},async()=>{while(next<first.total){const start=next;next+=size;if(done.has(start))continue;const data=await range(name,start,Math.min(first.total-1,start+size-1));if(data.total!==state.total||data.modified!==state.modified)throw Error('Source changed during metadata retrieval');fs.writeSync(fileHandle,data.bytes,0,data.bytes.length,start);done.add(start);finished++;if(finished%64===0){save();console.log(name,Math.round(done.size*size/first.total*100)+'%')}await pause(100)}}));
 }finally{save();fs.closeSync(fileHandle)}
 if(done.size!==Math.ceil(first.total/size))throw Error('Metadata snapshot is not complete');fs.renameSync(file+'.part',file);
 const digest=crypto.createHash('sha256');for await(const part of fs.createReadStream(file))digest.update(part);
 fs.writeFileSync(file+'.source.json',JSON.stringify({url:base+name,modified:first.modified,bytes:first.total,sha256:digest.digest('hex')},null,2));console.log('Complete',name,first.total);
}
fs.mkdirSync(folder,{recursive:true});(async()=>{await download('pg_catalog.csv.gz');await download('rdf-files.tar.bz2')})().catch(e=>{console.error(e);process.exitCode=1});
