const fs=require('fs'),{download}=require('./expand-500.cjs');
const pool=JSON.parse(fs.readFileSync('research/expansion-500/pool.json'));
const ready=[];let next=0;
(async()=>{await Promise.all(Array.from({length:5},async()=>{while(next<pool.length&&ready.length<530){const b=pool[next++];try{await download(b.mirror,b.sourceFile);ready.push(b);fs.writeFileSync('research/expansion-500/downloaded.json',JSON.stringify(ready));console.log('Downloaded',ready.length,b.id,b.title)}catch(e){console.log('Skipped',b.id,e.message)}}}));if(ready.length<500)throw Error('Only '+ready.length+' complete sources available');console.log('Download pool complete',ready.length)})().catch(e=>{console.error(e);process.exitCode=1});
