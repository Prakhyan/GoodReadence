// Bulk sources come from the official mirror; range downloads are resumable per file.
const fs=require('node:fs'),path=require('node:path');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function part(url,start,end){for(let attempt=0;attempt<4;attempt++){try{const response=await fetch(url,{headers:{Range:`bytes=${start}-${end}`,'User-Agent':'GoodReadence library preparation (goodreadence@proton.me)'},signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('HTTP '+response.status);const data=Buffer.from(await response.arrayBuffer()),range=response.headers.get('content-range');return{data,total:range?Number(range.split('/')[1]):data.length,partial:response.status===206}}catch(error){if(attempt===3)throw error;await pause(600*(attempt+1))}}}
async function download(url,file){
  if(fs.existsSync(file)&&fs.statSync(file).size>100)return;
  const first=await part(url,0,65535);if(!Number.isSafeInteger(first.total)||first.total<1||first.total>50*1024*1024)throw Error('Unsupported source size');
  const bytes=Buffer.alloc(first.total);first.data.copy(bytes);let offset=first.data.length;
  if(first.partial)await Promise.all(Array.from({length:2},async()=>{while(offset<bytes.length){const start=offset;offset+=65536;const end=Math.min(bytes.length-1,start+65535),next=await part(url,start,end);if(next.total!==bytes.length||next.data.length!==end-start+1)throw Error('Incomplete range');next.data.copy(bytes,start)}}));
  else if(first.data.length!==first.total)throw Error('Incomplete source');
  fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.part',bytes);fs.renameSync(file+'.part',file);
}
module.exports={download,pause};
