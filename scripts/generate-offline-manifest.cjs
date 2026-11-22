// Build the small, versioned plan; audio is saved in the background, not during worker installation.
const fs=require('fs');const release=JSON.parse(fs.readFileSync('release.json')),audio=JSON.parse(fs.readFileSync('ambience/catalog.json'));
fs.writeFileSync('offline-assets.json',JSON.stringify({version:release.version,audioCache:'goodreadence-audio-v2',files:audio.map(t=>({url:'/'+t.file,label:t.label,bytes:t.bytes,sha256:t.sha256})),totalBytes:audio.reduce((sum,t)=>sum+t.bytes,0)},null,2)+'\n');
