// Verified community average first; ties prefer more ratings, then a stable title/id.
module.exports=(a,b)=>{
 const score=b=>Number.isFinite(b.rating?.average)&&b.rating.count>0?b.rating.average:-1;
 return score(b)-score(a)||(b.rating?.count||0)-(a.rating?.count||0)||a.title.localeCompare(b.title,'en')||a.id-b.id;
};
