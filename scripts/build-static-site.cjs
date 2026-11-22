// Publish an explicit static artifact; project notes and build tools stay outside it.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.cwd(),output=path.resolve(root,'dist');
assert.equal(path.dirname(output),root,'Build output must remain directly inside this checkout');
if(fs.existsSync(output)){
 assert(!fs.lstatSync(output).isSymbolicLink(),'Build output cannot be a symlink');
 assert(fs.existsSync(path.join(output,'.goodreadence-build')),'Existing dist folder is not a GoodReadence build; move it before building');
 fs.rmSync(output,{recursive:true,force:true});
}
require('./render-public-library.cjs');require('./generate-discoverability.cjs');
fs.mkdirSync(output);fs.writeFileSync(path.join(output,'.goodreadence-build'),'Generated static site. Recreate with npm run build:static.\n');
// Explicit names keep a locally saved backup or personal document out of builds.
const runtimeFiles=['404.html','about.html','index.html','library.html','faq.html','updates.html','contact.html','privacy.html','cloud-callback.html','mobile-ux.css','import-feedback.js','appearance.js','audio-cache.js','cloud-callback.js','cloud-sync.js','device-transfer.js','freehand.js','library-sync.js','library.js','pdf-engine.js','portability-ui.js','portable-data.js','premium-upgrade.js','reader-addons.js','reader-core.js','reader-epub.js','reader-polish.js','reader-refinements.js','reading-comfort.js','update-manager.js','discovery-pages.css','discovery.css','library.css','portability.css','premium-upgrade.css','premium.css','reader-polish.css','reader-refinements.css','reading-comfort.css','site.css','updates.css','brand-mark.svg','favicon.svg','icon-192.png','icon-512.png','apple-touch-icon.png','icon-maskable-512.png','cloud-config.json','library-data.json','manifest.webmanifest','release.json','robots.txt','sitemap.xml'];
for(const file of runtimeFiles)fs.copyFileSync(path.join(root,file),path.join(output,file));
for(const folder of ['assets','library','public-books','vendor','ambience','textures'])fs.cpSync(path.join(root,folder),path.join(output,folder),{recursive:true});
for(const forbidden of ['docs','scripts','research','node_modules','package.json','vercel.json'])assert(!fs.existsSync(path.join(output,forbidden)));
const shell=JSON.parse(fs.readFileSync('audio-cache.js','utf8').match(/const SHELL=(\[[\s\S]*?\]);/)[1]);
for(const file of shell)assert(fs.existsSync(path.join(output,file)),'Offline shell asset missing from publication: '+file);
console.log('Static publication artifact ready in dist/; source tools and project notes excluded.');
