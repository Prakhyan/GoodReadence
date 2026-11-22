// Decode every compressed recording, not just its header, before publishing audio changes.
const fs=require('fs'),crypto=require('crypto'),assert=require('assert/strict'),{execFileSync}=require('child_process'),tracks=JSON.parse(fs.readFileSync('ambience/catalog.json'));
let before=0,after=0;
for(const track of tracks){const data=fs.readFileSync(track.file);assert.equal(data.length,track.bytes);assert.equal(crypto.createHash('sha256').update(data).digest('hex'),track.sha256);assert(track.bytes<track.originalAudioBytes);execFileSync(process.env.FFMPEG_PATH||'ffmpeg',['-hide_banner','-loglevel','error','-xerror','-nostdin','-i',track.file,'-f','null','-'],{stdio:['ignore','ignore','pipe']});before+=track.originalAudioBytes;after+=track.bytes}
console.log('PASS all '+tracks.length+' compact AAC recordings decode completely; checksums/byte sizes match; '+(after/1048576).toFixed(1)+' MB vs '+(before/1048576).toFixed(1)+' MB ('+Math.round((1-after/before)*100)+'% smaller).');
