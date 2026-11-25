const fs=require('fs'),{fingerprint,check}=require('./catalogue-approval.cjs');
const books=JSON.parse(fs.readFileSync('public-books/catalog.json')),report=JSON.parse(fs.readFileSync('docs/catalogue-edition-audit.json')),byId=new Map(books.map(b=>[b.id,b]));
if(report.held)throw Error('Resolve held editions before publishing.');
for(const proof of report.records)if(proof.editionFingerprint!==fingerprint(byId.get(proof.id)))throw Error('Edition metadata changed after its audit. Rerun the edition review: '+proof.id);
fs.writeFileSync('docs/catalogue-edition-audit.json',JSON.stringify(report,null,2)+'\n');fs.writeFileSync('catalogue-approval.json',JSON.stringify({checked:report.checked,records:report.records.map(({id,accepted,editionFingerprint,sourceSha256,spineSections,words})=>({id,accepted,editionFingerprint,sourceSha256,spineSections,words}))})+'\n');check(books);console.log('PASS reviewed-edition publication gate:',books.length,'complete, screened, duplicate-checked editions.');
