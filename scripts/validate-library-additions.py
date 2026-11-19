"""Keep the baseline catalogue; admit only distinct, complete, screened source editions."""
import collections,csv,gzip,hashlib,json,os,re,unicodedata,zipfile
from pathlib import Path
from lxml import etree,html
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/os.environ.get('LIBRARY_REVIEW_DIR','research/expansion-750')
def key(value):
    value=unicodedata.normalize('NFKD',value).encode('ascii','ignore').decode().lower()
    value=re.split(r'[:;,\[\n]',value)[0];value=re.sub(r'\([^)]*\)','',value)
    value=re.sub(r'^(the|a|an)\s+','',value);value=re.sub(r'\b(illustrated|complete|unabridged|novel|romance)\b','',value)
    return re.sub('[^a-z0-9]','',value)
def names(value):
    value=re.sub(r'^\w+:\s*','',value)
    return{key(value),key(' '.join(value.split(', ')[1:]+value.split(', ')[:1])),''.join(sorted(re.findall(r'\w+',unicodedata.normalize('NFKD',value).encode('ascii','ignore').decode().lower())))}
authority=collections.defaultdict(set)
for row in csv.DictReader(gzip.open(ROOT/'research/expansion-500/catalog.csv.gz','rt',encoding='utf8')):
    for name in row['Authors'].split('; '):
        match=re.search(r',\s*-?\d{3,4}\??\s*-\s*(-?\d{3,4})\b',name)
        if match:
            for variant in names(name[:match.start()]):authority[variant].add(int(match[1]))
baseline=json.loads((OUT/'curated-baseline.json').read_text(encoding='utf8'))
pool=json.loads((OUT/'pool.json').read_text(encoding='utf8'))
prepared={b['id']:b for b in json.loads((ROOT/'public-books/catalog.json').read_text(encoding='utf8'))}
seen={key(b['title'])for b in baseline};ids={b['id']for b in baseline};accepted=[];held=[];fingerprints=set()
parser=etree.XMLParser(resolve_entities=False,no_network=True)
for source in pool:
    if len(accepted)>=250:break
    if not(ROOT/source['sourceFile']).exists():continue
    book=json.loads(json.dumps(source));ident=book['id']
    try:
        assert ident not in ids and key(book['title'])not in seen,'Duplicate work'
        assert not re.search(r'\b(?:volumes?|vol|v\d+|book\s+[ivxlcdm\d]+|part\s+[ivxlcdm\d]+|abridged|retold|retelling|selections|epitome)\b|one syllable',book['title'],re.I),'Partial volume, selection or adapted text'
        assert ident not in {8789,8795,59306,8226,50316},'Partial/critical edition or overlap with a current collection'
        with zipfile.ZipFile(ROOT/book['sourceFile'])as archive:
            assert archive.testzip()is None,'Damaged source ZIP'
            assert sum(i.file_size for i in archive.infolist())<150*1024*1024,'Oversized expanded source'
            container=etree.fromstring(archive.read('META-INF/container.xml'),parser)
            opf=container.xpath('//*[local-name()="rootfile"]')[0].get('full-path')
            package=etree.fromstring(archive.read(opf),parser)
            values=lambda name:[e.text for e in package.xpath('//*[local-name()="'+name+'"]')if e.text]
            assert 'Public domain in the USA'in' '.join(values('rights')),'No public-domain source statement'
            assert 'en'in values('language'),'Non-English source'
            actual=values('title')[0];assert key(actual)==key(book['title'])or key(actual).startswith(key(book['title']))or key(book['title']).startswith(key(actual)),'Edition/title mismatch'
            contributors=book['rightsReview']['listedContributors'];known=set().union(*(names(a['name'])for a in contributors));book['contributors']=[]
            for element in package.xpath('//*[local-name()="creator" or local-name()="contributor"]'):
                name=element.text
                if not name:continue
                role=next((v for k,v in element.attrib.items()if k.endswith('role')),'Contributor')
                book['contributors'].append({'trl':'Translator','ill':'Illustrator','edt':'Editor','aui':'Introduction'}.get(role,role)+': '+name)
                if re.match(r'^(Producer|Digitizer):',name,re.I):continue
                if not(names(name)&known):
                    deaths=set().union(*(authority.get(v,set())for v in names(name)))
                    assert len(deaths)==1 and max(deaths)<=1900,'Unresolved creative contributor: '+name
                    contributors.append({'name':name,'death':next(iter(deaths)),'source':'https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv.gz'})
            assert all(a['death']<=1900 for a in contributors),'Contributor age check'
            manifest={e.get('id'):e.get('href')for e in package.xpath('//*[local-name()="manifest"]/*')}
            spine=[e.get('idref')for e in package.xpath('//*[local-name()="spine"]/*')]
            assert spine and all(i in manifest for i in spine),'Incomplete spine'
            import posixpath
            from urllib.parse import unquote
            sections=[]
            for item in spine:
                path=posixpath.normpath(posixpath.join(posixpath.dirname(opf),unquote(manifest[item])))
                doc=html.fromstring(archive.read(path))
                for element in doc.xpath('//*[@id="pg-header" or @id="pg-footer" or contains(concat(" ",normalize-space(@class)," ")," pg-boilerplate ")]'):element.drop_tree()
                sections.append(' '.join(doc.text_content().split()))
            body='\n'.join(sections);words=len(body.split())
            assert words>700,'Source too short to verify as a book edition'
            assert not re.search(r'(?:copyright|first published|first publication|originally published)[^0-9]{0,80}(?:19[3-9]\d|20\d\d)',body[:12000],re.I),'Later copyright/publication notice needs separate review'
            digest=hashlib.sha256(re.sub(r'\s+','',body).encode()).hexdigest()
            assert digest not in fingerprints,'Duplicate source text'
            fingerprints.add(digest)
            book['rightsReview'].update({'sourceSha256':hashlib.sha256((ROOT/book['sourceFile']).read_bytes()).hexdigest(),'sourceTextSha256':digest,'spineSections':len(spine),'sourceWords':words,'editionMetadataChecked':True})
            book['sourceWords']=words
            if ident==23169:book['genre']='Short story'
            if ident==877 and book['genre']=='Short story':book['genre']='Humour'
            for field in ['genres','canonicalKey','authorKey','sourceSubjects']:book.pop(field,None)
            existing=prepared.get(ident,{})
            if existing.get('file','').endswith('.pdf'):
                for field in ['file','cover','editionCredits','sourceSha256','pages','bytes','sha256','sourceSections']:
                    if field in existing:book[field]=existing[field]
            accepted.append(book);ids.add(ident);seen.add(key(book['title']))
    except Exception as error:held.append({'id':ident,'title':book['title'],'reason':str(error)})
(OUT/'validated.json').write_text(json.dumps(accepted,ensure_ascii=False,indent=2),encoding='utf8')
(OUT/'held.json').write_text(json.dumps(held,ensure_ascii=False,indent=2),encoding='utf8')
if os.environ.get('LIBRARY_REQUIRE_COMPLETE'):assert len(accepted)==250,('Need more verified editions',len(accepted),held)
books=baseline+accepted
(ROOT/'public-books/catalog.json').write_text(json.dumps(books,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
authors=json.loads((ROOT/'public-books/authors.json').read_text(encoding='utf8'))
for b in accepted:authors[str(b['id'])]=b['authorInfo']
(ROOT/'public-books/authors.json').write_text(json.dumps(authors,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('Verified additions:',len(accepted),'held:',len(held),'catalogue:',len(books))
print('Genre totals:',dict(sorted(collections.Counter(b['genre']for b in books).items(),key=lambda v:v[1])))
