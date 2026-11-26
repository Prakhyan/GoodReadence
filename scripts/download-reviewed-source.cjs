// Bounded full-edition fetches from the designated automated-download mirror.
const fs=require('fs'),{pause}=require('./library-tools.cjs');const MAX=32*1024*1024,CHUNK=262144;
async function part(url,start,end){
 for(let attempt=0;attempt<4;attempt++)try{
  const r=await fetch(url,{redirect:'error',headers:{Range:`bytes=${start}-${end}`,'User-Agent':'GoodReadence complete-edition review (goodreadence@proton.me)'},signal:AbortSignal.timeout(35000)});
  if(r.status===429||r.status===503){await r.body?.cancel();await pause(Math.max(3000,Math.min(60000,Number(r.headers.get('retry-after'))*1000||3000*(attempt+1))));throw Error('Source requested slower retrieval')}
  if(r.status!==206)throw Error('Unexpected source response '+r.status);
  const range=/bytes (\d+)-(\d+)\/(\d+)/.exec(r.headers.get('content-range')||'');
  if(!range||+range[1]!==start||+range[3]>MAX)throw Error('Unsupported source size or byte range');
  const bytes=Buffer.from(await r.arrayBuffer());if(+range[2]!==Math.min(end,+range[3]-1)||bytes.length!==+range[2]-start+1)throw Error('Incomplete source range');return{bytes,total:+range[3]};
 }catch(e){if(attempt===3)throw e;await pause(1000*(attempt+1))}
}
module.exports=async function downloadSource(url,file){
 if(fs.existsSync(file)&&fs.statSync(file).size>100)return;
 const source=new URL(url);if(source.protocol!=='https:'||source.hostname!=='gutenberg.pglaf.org')throw Error('Unreviewed source host');
 const first=await part(url,0,CHUNK-1),bytes=Buffer.alloc(first.total);first.bytes.copy(bytes);let next=first.bytes.length;
 await Promise.all(Array.from({length:2},async()=>{while(next<bytes.length){const start=next;next+=CHUNK;const p=await part(url,start,Math.min(bytes.length-1,start+CHUNK-1));if(p.total!==bytes.length)throw Error('Edition changed while downloading');p.bytes.copy(bytes,start)}}));
 fs.writeFileSync(file+'.part',bytes);fs.renameSync(file+'.part',file);
};
