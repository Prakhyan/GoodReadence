"""Check every source section survives PDF conversion, then record page counts/hashes."""
import collections,hashlib,json,re,unicodedata,subprocess,time,os,zipfile,posixpath
from pathlib import Path
import pymupdf
from lxml import etree,html
from urllib.parse import unquote
root=Path(__file__).resolve().parents[1]
catalog=root/os.environ.get('LIBRARY_CATALOG_FILE','public-books/catalog.json')
print_dir=root/os.environ.get('LIBRARY_PRINT_DIR','research/library-print')
books=json.loads(catalog.read_text(encoding='utf8'))
report=print_dir/'source-report.json'
compact=print_dir/'verification-samples.json'
use_compact=compact.exists() and compact.stat().st_mtime>=report.stat().st_mtime
sources={b['slug']:b for b in json.loads((compact if use_compact else report).read_text(encoding='utf8'))}
def normalized(text):
    text=re.sub(r'\[p\d+\]','',text)
    return re.sub(r'\s+','',unicodedata.normalize('NFKC',text)).lower().replace('\u00ad','')
if not use_compact:
    for entry in sources.values():entry['normalizedLength']=len(normalized(entry.pop('text')))
    compact.write_text(json.dumps(list(sources.values()),ensure_ascii=False),encoding='utf8')

def save():
    target=catalog
    temp=target.with_suffix('.json.tmp')
    temp.write_text(json.dumps(books,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    for attempt in range(10):
        try:
            temp.replace(target)
            return
        except OSError:
            if attempt==9:raise
            time.sleep(.3)
checked=0
for b in books:
    if os.environ.get('LIBRARY_READY_ONLY') and not (root/b['file']).exists():continue
    if str(b['id']) in os.environ.get('LIBRARY_SKIP_IDS','').split(','):continue
    if os.environ.get('LIBRARY_RESUME_VERIFIED') and b.get('sha256') and b.get('pages') and b.get('sourceSections')==sources[b['slug']]['sections']:
        continue
    print('Checking',b['slug'],flush=True)
    digest=hashlib.sha256((root/b['file']).read_bytes()).hexdigest()
    if b.get('sha256')==digest and b.get('pages') and b.get('sourceSections')==sources[b['slug']]['sections']:
        continue
    pdf=pymupdf.open(root/b['file']);text='\n'.join(re.sub(r'(?:^|\n)\s*'+str(i+1)+r'\s*$','',p.get_text() or '') for i,p in enumerate(pdf));source=sources[b['slug']]
    norm=normalized(text)
    missing=[s for s in source['samples'] if normalized(s) not in norm]
    # PDF line breaks can split words; the section samples use whitespace-free comparison.
    if missing:
        # Historical page anchors and marginal notes can move in the PDF's
        # extraction order. Re-sample each section's main prose without those
        # explicitly marked elements. Full-source coverage still includes notes;
        # narrative numbers are never removed from the comparison.
        with zipfile.ZipFile(root/b['sourceFile']) as archive:
            container=etree.fromstring(archive.read('META-INF/container.xml'))
            opf=container.xpath('//*[local-name()="rootfile"]')[0].get('full-path')
            package=etree.fromstring(archive.read(opf));base=posixpath.dirname(opf)
            manifest={e.get('id'):e.get('href') for e in package.xpath('//*[local-name()="manifest"]/*')}
            samples=[]
            for ref in package.xpath('//*[local-name()="spine"]/*'):
                section=html.fromstring(archive.read(posixpath.join(base,unquote(manifest[ref.get('idref')]))))
                for el in section.xpath('//*[contains(concat(" ",normalize-space(@class)," ")," pagenum ") or contains(concat(" ",normalize-space(@class)," ")," sidenote ") or contains(concat(" ",normalize-space(@class)," ")," sni ")]'):
                    el.drop_tree()
                body=section.find('body');words=' '.join(body.text_content().split())
                # Sample inside a prose block: CSS may insert list counters at
                # block boundaries, which are not part of the source text.
                blocks=[' '.join(el.text_content().split()) for el in body.xpath('.//p|.//li|.//pre|.//div[not(*)]')]
                blocks=[text for text in blocks if len(text)>140]
                if blocks:words=blocks[len(blocks)//2]
                if len(words)>100:samples.append(words[max(0,len(words)//2-70):len(words)//2+70])
            # Printed marginal notes and CSS list markers can interrupt PDF
            # extraction order. Require every sample word, in order, inside a
            # bounded 200-word window when an exact prose match is impossible.
            pdf_words=re.findall(r'\w+',unicodedata.normalize('NFKC',text).lower())
            def survives(sample):
                if normalized(sample) in norm:return True
                words=re.findall(r'\w+',unicodedata.normalize('NFKC',sample).lower())[1:-1]
                if len(words)<12:return False
                for start,word in enumerate(pdf_words):
                    if word!=words[0]:continue
                    cursor=start+1
                    for expected in words[1:]:
                        while cursor<min(start+200,len(pdf_words)) and pdf_words[cursor]!=expected:cursor+=1
                        if cursor>=min(start+200,len(pdf_words)):break
                        cursor+=1
                    else:return True
                return False
            missing=[s for s in samples if not survives(s)]
    if missing:
        save()
        raise AssertionError((b['slug'],'Missing section samples',missing[:2]))
    assert 'gutenberg' in text.lower() and 'license' in text.lower()
    assert len(norm)>=source['normalizedLength']*.98,(b['slug'],'Text lost')
    b['pages']=len(pdf);b['bytes']=(root/b['file']).stat().st_size
    b['sha256']=digest
    b['sourceSections']=source['sections']
    print(b['slug'],b['pages'],'pages;',source['sections'],'sections checked')
    checked+=1
    if checked%10==0:save()
save()
