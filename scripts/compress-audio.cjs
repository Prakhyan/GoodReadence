// Re-encode retained source audio without shortening recordings or collapsing stereo.
// AUDIO_SOURCE_DIR must point to a private copy of the original MP3 assets.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const encoder=process.env.FFMPEG_PATH||'ffmpeg',source=process.env.AUDIO_SOURCE_DIR;
if(!source)throw Error('Set AUDIO_SOURCE_DIR to the retained original MP3 folder.');
const tracks=JSON.parse(fs.readFileSync('ambience/catalog.json'));
for(const track of tracks){
 const original=track.originalAudioFile||track.file,input=path.join(source,path.basename(original)),output=original.replace(/\.mp3$/,'.m4a');
 if(!fs.existsSync(input))throw Error('Missing original: '+input);
 if(!fs.existsSync(output))execFileSync(encoder,['-hide_banner','-loglevel','error','-nostdin','-i',input,'-map','0:a:0','-vn','-c:a','aac','-b:a','64k','-movflags','+faststart','-map_metadata','-1','-y',output],{stdio:'inherit'});
 const bytes=fs.readFileSync(output);track.originalAudioFile=original;track.originalAudioBytes??=track.bytes;track.originalAudioSha256??=track.sha256;
 track.file=output;track.bytes=bytes.length;track.bitrate=Math.round(bytes.length*8/track.durationInstalled);track.sha256=crypto.createHash('sha256').update(bytes).digest('hex');track.codec='AAC-LC';
 console.log(track.label+': '+(bytes.length/1048576).toFixed(2)+' MB');
}
fs.writeFileSync('ambience/catalog.json',JSON.stringify(tracks,null,2)+'\n');
fs.writeFileSync('reader-core.js',fs.readFileSync('reader-core.js','utf8').replace(/^const AMBIENCE_TRACKS=.*;$/m,'const AMBIENCE_TRACKS='+JSON.stringify(tracks)+';'));
console.log('Total: '+(tracks.reduce((n,t)=>n+t.bytes,0)/1048576).toFixed(1)+' MB');
