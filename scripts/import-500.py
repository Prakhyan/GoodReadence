"""Validate source files and finalise exactly 500 distinct screened editions."""
import json,re,zipfile,unicodedata,csv,gzip,collections
from pathlib import Path
from lxml import etree
root=Path(__file__).resolve().parents[1];out=root/'research/expansion-500'
pool=json.loads((out/'pool.json').read_text(encoding='utf8'))
downloaded={b['id'] for b in json.loads((out/'downloaded.json').read_text(encoding='utf8'))}
selected=[];held=[]
def norm(s):return re.sub(r'[^a-z0-9]','',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower())
def variants(name):
    names=[name,re.sub(r'\([^)]*\)','',name)]
    return {v for s in names for v in (norm(s),norm(' '.join(s.split(', ')[1:]+s.split(', ')[:1])),''.join(sorted(re.findall(r'[a-z0-9]+',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower()))))}
authority=collections.defaultdict(set)
for row in csv.DictReader(gzip.open(out/'catalog.csv.gz','rt',encoding='utf8')):
    for name in row['Authors'].split('; '):
        m=re.search(r',\s*-?\d{3,4}\??\s*-\s*(-?\d{3,4})\b',name)
        if not m:continue
        death=int(m[1]);name=name[:m.start()]
        for n in variants(name):authority[n].add(death)
for b in pool:
    if b['id'] not in downloaded:continue
    try:
        with zipfile.ZipFile(root/b['sourceFile']) as z:
            assert z.testzip() is None
            c=etree.fromstring(z.read('META-INF/container.xml'));opf=c.xpath('//*[local-name()="rootfile"]')[0].get('full-path');doc=etree.fromstring(z.read(opf))
            def texts(name):return [n.text for n in doc.xpath('//*[local-name()="'+name+'"]') if n.text]
            assert 'Public domain in the USA' in ' '.join(texts('rights'))
            assert 'en' in texts('language')
            actual=texts('title')[0];assert norm(actual.split(':')[0]) in norm(b.get('sourceTitle',b['title'])) or norm(b.get('sourceTitle',b['title']).split(':')[0]) in norm(actual)
            agents=b['rightsReview']['listedContributors'];names=set().union(*(variants(a['name']) for a in agents))
            for name in texts('creator')+texts('contributor'):
                if re.match(r'^(Producer|Digitizer):',name,re.I):continue
                stripped=re.sub(r'^\w+:\s*','',name)
                n=norm(stripped)
                # EPUB and RDF names use the same catalogue record; refuse unlisted names.
                if not (variants(stripped)&names):
                    deaths=set().union(*(authority.get(v,set()) for v in variants(stripped)))
                    assert len(deaths)==1 and max(deaths)<=1945,(name,'no unambiguous qualifying contributor date')
                    agents.append({'name':stripped,'death':next(iter(deaths)),'source':'https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv.gz'})
        selected.append(b)
        if len(selected)==500:break
    except Exception as e:held.append({'id':b['id'],'title':b['title'],'reason':str(e)})
(out/'epub-held.json').write_text(json.dumps(held,ensure_ascii=False,indent=2),encoding='utf8')
assert len(selected)==500,('Need more validated sources',len(selected),held[:4])
old=json.loads((out/'baseline.json').read_text(encoding='utf8'));retained={b['id'] for b in selected};removed=[b for b in old if b['id'] not in retained]
(out/'removed.json').write_text(json.dumps(removed,ensure_ascii=False,indent=2),encoding='utf8')
(root/'public-books/catalog.json').write_text(json.dumps(selected,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
authors=json.loads((root/'public-books/authors.json').read_text(encoding='utf8'))
for b in selected:authors[str(b['id'])]=b['authorInfo']
(root/'public-books/authors.json').write_text(json.dumps(authors,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
(root/'scripts/library-expansion-500.json').write_text(json.dumps([{'id':b['id'],'title':b['title'],'genre':b['genre'],'rightsReview':b['rightsReview']} for b in selected],ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('Validated 500 EPUB sources; replaced',len(removed),'previous entries; extra held:',len(held))
