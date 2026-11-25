// Private test fixtures are intentionally separate from the lean published catalogue.
const fs=require('fs'),catalog=new Map(JSON.parse(fs.readFileSync('public-books/catalog.json')).map(b=>[b.id,b]));
module.exports=JSON.parse(fs.readFileSync('library-data.json')).map(b=>({...catalog.get(b.id),...b}));
