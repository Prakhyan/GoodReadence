// A dependency update is incomplete until its locally served bundle is refreshed.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const packages=JSON.parse(fs.readFileSync('package.json')).dependencies,pins=JSON.parse(fs.readFileSync('vendor/PINS.json'));
for(const [name,version]of Object.entries(packages)){
  assert.equal(pins[name]?.version,version,'Refresh the vendored bundle and PINS.json for '+name);
  // Canonical LF makes text-bundle hashes reproducible on Windows and Linux.
  for(const[file,hash]of Object.entries(pins[name].files))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n')).digest('hex'),hash,'Unexpected vendored file: '+file);
}
console.log('PASS dependency versions match the locally served, hashed bundles');
