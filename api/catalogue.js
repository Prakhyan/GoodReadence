const query=require('../server/catalogue.cjs').createCatalogue(require('../catalogue-index.json'));
module.exports=(req,res)=>{
  if(req.method!=='GET'){res.setHeader('Allow','GET');res.writeHead(405).end();return}
  const params=new URL(req.url,'https://goodreadence.vercel.app').searchParams;
  if([...params.keys()].some(key=>!['q','genre','page','book','shuffle'].includes(key))||String(req.url).length>1200){res.writeHead(400).end('Invalid catalogue query.');return}
  res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control','public, max-age=60, s-maxage=300, stale-while-revalidate=3600');
  res.end(JSON.stringify(query(params)));
};
