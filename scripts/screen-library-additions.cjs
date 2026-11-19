// Screen every listed creative contributor, including translators/illustrators.
const fs=require('node:fs'),path=require('node:path'),{download}=require('./library-tools.cjs');
const folder=process.env.LIBRARY_REVIEW_DIR||'research/expansion-750',records=JSON.parse(fs.readFileSync(path.join(folder,'candidates.json'))),results=[];let index=0;
fs.mkdirSync(path.join(folder,'rdf'),{recursive:true});
(async()=>{await Promise.all(Array.from({length:4},async()=>{while(index<records.length){const book=records[index++],file=path.join(folder,'rdf',book.id+'.rdf');try{
  const cached='research/expansion-500/rdf/'+book.id+'.rdf';if(!fs.existsSync(file)&&fs.existsSync(cached))fs.copyFileSync(cached,file);
  await download('https://gutenberg.pglaf.org/cache/epub/'+book.id+'/pg'+book.id+'.rdf',file);
  const text=fs.readFileSync(file,'utf8'),agents=text.match(/<pgterms:agent\b[\s\S]*?<\/pgterms:agent>/g)||[];
  const passed=text.includes('</rdf:RDF>')&&text.includes('Public domain in the USA')&&agents.length>0&&agents.every(agent=>{const deaths=[...agent.matchAll(/<pgterms:deathdate[^>]*>(-?\d+)<\/pgterms:deathdate>/g)].map(m=>Number(m[1]));return deaths.length&&Math.max(...deaths)<=1900});
  results.push({...book,screenPassed:!!passed});
}catch(error){results.push({...book,screenPassed:false,reason:error.message})}
if(results.length%25===0){fs.writeFileSync(path.join(folder,'screened.json'),JSON.stringify(results));console.log('Reviewed',results.length,'of',records.length,'eligible',results.filter(b=>b.screenPassed).length)}}}));fs.writeFileSync(path.join(folder,'screened.json'),JSON.stringify(results));console.log('Finished',results.length,'records;',results.filter(b=>b.screenPassed).length,'eligible')})().catch(error=>{console.error(error);process.exitCode=1});
