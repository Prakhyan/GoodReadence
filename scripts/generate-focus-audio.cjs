/* Regenerate the original 12-minute, sample-free focus tracks; never runs during deployment. */
const fs=require('node:fs'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const encoder=process.env.FFMPEG_PATH||'ffmpeg',catalog=JSON.parse(fs.readFileSync('ambience/catalog.json','utf8'));
for(const entry of catalog.filter(t=>t.generation)){
  const g=entry.generation,result=spawnSync(encoder,['-hide_banner','-loglevel','error','-f','lavfi','-i',`anoisesrc=color=${g.colour}:duration=${g.duration}:sample_rate=${g.sampleRate}:amplitude=${g.amplitude}:seed=${g.seed}`,'-af',`afade=t=in:d=0.15,afade=t=out:st=${g.duration-.15}:d=0.15`,'-c:a','libmp3lame','-b:a','96k','-ac','1','-y',entry.file],{stdio:'inherit'});
  if(result.error)throw result.error;if(result.status!==0)throw Error('Audio encoding failed: '+entry.label);
  const bytes=fs.readFileSync(entry.file);entry.bytes=bytes.length;entry.sha256=crypto.createHash('sha256').update(bytes).digest('hex');
}
fs.writeFileSync('ambience/catalog.json',JSON.stringify(catalog,null,2)+'\n');const core=fs.readFileSync('reader-core.js','utf8');fs.writeFileSync('reader-core.js',core.replace(/^const AMBIENCE_TRACKS=.*;$/m,'const AMBIENCE_TRACKS='+JSON.stringify(catalog)+';'));console.log('Updated original focus tracks, checksums and player catalogue.');
