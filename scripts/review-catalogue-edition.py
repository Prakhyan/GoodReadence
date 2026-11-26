"""Persistent, inert source reviewer. JSON-lines requests; no website writes."""
import csv,gzip,hashlib,json,posixpath,re,sys,unicodedata,zipfile
from io import BytesIO
from pathlib import Path
from urllib.parse import unquote,urlparse
from lxml import etree
from fontTools.ttLib import TTFont

ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'research/expansion-50000'
PARSER=etree.XMLParser(resolve_entities=False,no_network=True)
def normal(s):return re.sub(r'[^\w]', '',unicodedata.normalize('NFKD',s).casefold())
def namekey(s):
    s=re.sub(r'\b(sir|lord|lady|count|baron|dr|rev|junior|jr)\b\.?','',s,flags=re.I)
    return ''.join(sorted(re.findall(r'\w+',unicodedata.normalize('NFKD',s).casefold())))
def values(node,name):return [x for x in node.xpath('//*[local-name()="'+name+'"]//text()')if x.strip()]
AUTHORITY={}
for row in csv.DictReader(gzip.open(OUT/'pg_catalog.csv.gz','rt',encoding='utf8')):
    for name in row['Authors'].split('; '):
        m=re.search(r',\s*-?\d{1,4}\??\s*-\s*(-?\d{1,4})\b',name)
        if m:AUTHORITY.setdefault(namekey(name[:m.start()]),set()).add(int(m[1]))
GLYPHS=set()
for file in (ROOT/'assets/fonts').glob('*-Regular.ttf'):
    font=TTFont(file);GLYPHS.update(font.getBestCmap()or{});font.close()
def display(name):
    pieces=name.split(', ')
    return ' '.join(pieces[1:2]+pieces[:1])if len(pieces)>1 else name
def source_name(name,base):
    parsed=urlparse(name)
    assert not parsed.scheme and not parsed.netloc and not parsed.query,'External source asset'
    path=posixpath.normpath(posixpath.join(posixpath.dirname(base),unquote(parsed.path)))
    assert not path.startswith(('/', '../'))and '\\'not in path,'Unsafe source path'
    return path
def metadata(request):
    b=dict(request['candidate']);doc=etree.fromstring(Path(request['rdf']).read_bytes(),PARSER)
    rights=' '.join(values(doc,'rights'));assert 'Public domain in the USA'in rights,'Source permission is not public domain in the USA'
    assert doc.xpath('//*[local-name()="Work"]/*[local-name()="license"]/@*[local-name()="resource"]')==['https://creativecommons.org/publicdomain/zero/1.0/'],'Unreviewed metadata licence'
    title=' '.join(values(doc,'title')[0].split());assert normal(title)==normal(b['title']),'Title changed since catalogue snapshot'
    contributors=[];agents=doc.xpath('//*[local-name()="agent"]');assert agents,'No identified creative contributor'
    for agent in agents:
        names=agent.xpath('./*[local-name()="name"]/text()');deaths=agent.xpath('./*[local-name()="deathdate"]/text()')
        assert names and deaths and len(set(deaths))==1 and re.fullmatch(r'-?\d+',deaths[0]),'Unknown contributor dates'
        death=int(deaths[0]);assert death<=1900,'Contributor died after the new-edition cutoff'
        contributors.append({'name':names[0],'death':death,'aliases':agent.xpath('./*[local-name()="alias"]/text()'),'role':etree.QName(agent.getparent()).localname,'source':'https://www.gutenberg.org/ebooks/'+str(b['id'])+'.rdf'})
    creators=doc.xpath('//*[local-name()="creator"]/*[local-name()="agent"]');assert creators,'Unresolved source author'
    main=creators[0];name=main.xpath('./*[local-name()="name"]/text()')[0];b['author']=display(name)
    born=main.xpath('./*[local-name()="birthdate"]/text()');died=main.xpath('./*[local-name()="deathdate"]/text()');life=(born[0]+'–'if born else 'Died ')+died[0]
    pages=main.xpath('./*[local-name()="webpage"]/@*[local-name()="resource"]');wiki=next((p for p in pages if p.startswith('https://en.wikipedia.org/wiki/')),None)
    b['authorInfo']={'life':life,'bio':b['author']+' ('+life+') is the credited author of this historical edition. The source reference provides their catalogue and biographical references.','source':wiki or 'https://www.gutenberg.org/ebooks/'+str(b['id']),'works':[title],'edition':'Complete source text and original edition credits retained.'}
    summary=' '.join(values(doc,'marc520')).strip();summary=re.sub(r'\s*\(This is an automatically generated summary\.\)\s*$','',summary)
    # Use the source catalogue's CC0 introductory metadata, without plot outcomes.
    sentences=re.split(r'(?<=[.!?])\s+(?=[A-Z"“])',summary);intro=[]
    for sentence in sentences:
        if re.search(r'\b(ultimately|finally|ending|ends with|turns out|murderer is|dies|revealed to be)\b',sentence,re.I):break
        if sum(map(len,intro))+len(sentence)>650:break
        intro.append(sentence)
        if len(intro)>=2 and sum(map(len,intro))>120:break
    subject='; '.join(b['subjects'][:3]);fallback=title+' by '+b['author']+'. A complete historical edition catalogued under '+subject+'.'
    description=' '.join(intro)if sum(map(len,intro))>=80 else fallback
    # Long summaries stay in More Info; cards keep a whole-sentence introduction.
    b.update(title=title,sourceTitle=title,description=description,longDescription='Source subjects: '+subject+'.',rating=None,year='',source='https://www.gutenberg.org/ebooks/'+str(b['id']),mirror='https://gutenberg.pglaf.org/cache/epub/'+str(b['id'])+'/pg'+str(b['id'])+'.epub',rights='Source edition: public domain in the United States. Named creative contributors screened for India, UK and EU; original licence retained.',rightsReview={'source':'https://www.gutenberg.org/ebooks/'+str(b['id'])+'.rdf','checked':'2026-11-26','markets':['India','US','UK','EU'],'listedContributors':contributors,'policy':'Explicit US public-domain source. Every named creative contributor has a resolved death year no later than 1900. Complete edition and original credits reviewed; not a worldwide legal certification.','metadataLicense':'https://creativecommons.org/publicdomain/zero/1.0/'})
    return b
def edition(request):
    b=request['book'];raw=Path(request['epub']).read_bytes();assert 0<len(raw)<=32*1024*1024,'Source exceeds supported download size'
    with zipfile.ZipFile(BytesIO(raw))as z:
        entries=z.infolist();names=[i.filename for i in entries];assert len(names)==len(set(names))and len(names)<=5000,'Duplicate or excessive ZIP members'
        assert all(not i.flag_bits&1 and i.file_size<=12*1024*1024 and not i.filename.startswith('/')and '..'not in i.filename.split('/')and '\\'not in i.filename for i in entries),'Unsupported ZIP member'
        assert sum(i.file_size for i in entries)<=64*1024*1024,'Source exceeds expanded conversion size';assert z.testzip()is None,'Damaged source ZIP'
        parse=lambda path:etree.fromstring(z.read(path),PARSER)
        container=parse('META-INF/container.xml');opf=container.xpath('string(//*[local-name()="rootfile"]/@full-path)');pkg=parse(opf)
        assert any(re.search(r'(?:^|[/:])'+str(b['id'])+r'/?$',v)for v in values(pkg,'identifier')),'Wrong edition identifier'
        rights=' '.join(values(pkg,'rights'));assert re.search(r'public domain in (?:the )?(?:USA|United States)',rights,re.I),'Missing source permission statement'
        actual_names=pkg.xpath('//*[local-name()="creator" or local-name()="contributor"]/text()');assert actual_names,'Missing source creator'
        known={namekey(n) for c in b['rightsReview']['listedContributors']for n in [c['name']]+c.get('aliases',[])}
        for name in actual_names:
            if re.match(r'^(Producer|Digitizer):',name,re.I):continue
            if namekey(name)not in known:
                dates=AUTHORITY.get(namekey(name),set());assert len(dates)==1 and max(dates)<=1900,'Unresolved source contributor: '+name
                b['rightsReview']['listedContributors'].append({'name':name,'death':next(iter(dates)),'source':'https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv.gz'})
        manifest={i.get('id'):i for i in pkg.xpath('//*[local-name()="manifest"]/*[local-name()="item"]')};refs=pkg.xpath('//*[local-name()="spine"]/*[local-name()="itemref"]');assert refs,'Empty reading order'
        content=[];section_paths=[];referenced_images=set()
        for ref in refs:
            item=manifest.get(ref.get('idref'));assert item is not None,'Missing reading-order section'
            path=source_name(item.get('href'),opf);chapter=parse(path);body=chapter.find('.//{*}body');assert body is not None,'Missing chapter body'
            for el in body.xpath('.//*[local-name()="script" or local-name()="style" or local-name()="iframe" or local-name()="object" or local-name()="embed" or local-name()="form" or local-name()="nav"]'):
                if etree.QName(el).localname!='nav':el.getparent().remove(el)
            for svg in body.xpath('.//*[local-name()="svg"]'):
                assert svg.xpath('.//*[local-name()="image"]')or not svg.xpath('.//*[local-name()="path" or local-name()="polygon" or local-name()="rect" or local-name()="circle"]'),'Unsupported inline vector illustration'
            for image in body.xpath('.//*[local-name()="img" or local-name()="image"]'):
                href=image.get('src')or image.get('href')or image.get('{http://www.w3.org/1999/xlink}href')
                if href:referenced_images.add(source_name(href,path))
            content.append(' '.join(body.itertext()));section_paths.append(path)
        assert len(section_paths)==len(set(section_paths)),'Repeated reading-order sections'
        text='\n'.join(content);assert len(text)<=16*1024*1024 and len(text.split())>=700,'Empty, short or oversized source'
        assert 'project gutenberg'in text.casefold(),'Source licence missing from complete reading order'
        assert not re.search(r'(?:copyright|first published|first publication|originally published)[^0-9]{0,60}(?:19[3-9]\d|20\d\d)',text[:20000],re.I),'Later edition copyright notice requires separate review'
        # Match the renderer's supported characters before exposing an Add button.
        normalized=re.sub(r'[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u00ad\u200b\u2060\ufe0e\ufe0f\ufeff]','',unicodedata.normalize('NFC',text));unsupported={ord(c)for c in normalized if not c.isspace()and ord(c)not in GLYPHS}
        assert not unsupported,'Unsupported reading characters: '+','.join('U+'+format(c,'04X')for c in sorted(unsupported)[:12])
        image_paths={source_name(item.get('href'),opf):item for item in manifest.values()if(item.get('media-type')or'').startswith('image/')}
        assert referenced_images<=image_paths.keys(),'Missing or external illustration'
        for path,item in image_paths.items():
            image=z.read(path);assert image,'Empty illustration'
            assert item.get('media-type')in ['image/jpeg','image/png','image/gif','image/svg+xml'],'Unsupported image format'
        # Same complete-text comparison as the established baseline audit.
        body_text=re.split(r'\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG[^\n]*\*\*\*',text,flags=re.I)[-1]
        body_text=re.split(r'\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG',body_text,flags=re.I)[0]
        digest=hashlib.sha256(raw).hexdigest();text_hash=hashlib.sha256(re.sub(r'[^\w]','',body_text.casefold()).encode()).hexdigest()
        b['sourceSha256']=digest;b['sourceSections']=len(refs);b['sourceWords']=len(text.split());b['contributors']=actual_names
        b['editionCredits']='Project Gutenberg source edition; all original source credits and licence retained. Catalogue metadata is CC0.'
        b['rightsReview'].update(sourceSha256=digest,sourceTextSha256=text_hash,spineSections=len(refs),sourceWords=b['sourceWords'],editionMetadataChecked=True,manifestImagesChecked=len(image_paths),supportedCharactersChecked=True)
        b['delivery']={'provider':'Project Gutenberg','format':'epub','url':b['mirror'],'identifier':b['source'],'sourcePage':b['source'],'downloadBytes':len(raw),'reviewedNames':actual_names}
        proof={'id':b['id'],'accepted':True,'sourceSha256':digest,'sourceTextSha256':text_hash,'spineSections':len(refs),'manifestImagesChecked':len(image_paths),'words':b['sourceWords'],'sourceRights':rights,'errors':[]}
        for field in ['catalogueAuthor','catalogueAuthors']:b.pop(field,None)
        return {'book':b,'proof':proof}

for line in sys.stdin:
    try:
        request=json.loads(line);result=metadata(request)if request['op']=='metadata'else edition(request)
        print(json.dumps({'ok':True,'result':result},ensure_ascii=False),flush=True)
    except Exception as e:print(json.dumps({'ok':False,'error':str(e)},ensure_ascii=False),flush=True)
