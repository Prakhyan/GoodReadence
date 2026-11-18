"""Check every source section survives PDF conversion, then record page counts/hashes."""
import collections,hashlib,json,re,unicodedata,subprocess,time,os
from pathlib import Path
import pymupdf
root=Path(__file__).resolve().parents[1]
books=json.loads((root/'public-books/catalog.json').read_text(encoding='utf8'))
sources={b['slug']:b for b in json.loads((root/'research/library-print/source-report.json').read_text(encoding='utf8'))}
def normalized(text):
    text=re.sub(r'\[p\d+\]','',text)
    return re.sub(r'\s+','',unicodedata.normalize('NFKC',text)).lower().replace('\u00ad','')
def save():
    target=root/'public-books/catalog.json'
    temp=target.with_suffix('.json.tmp')
    temp.write_text(json.dumps(books,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    for attempt in range(10):
        try:
            temp.replace(target)
            return
        except OSError:
            if attempt==9:raise
            time.sleep(.3)
for b in books:
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
    if missing: raise AssertionError((b['slug'],'Missing section samples',missing[:2]))
    assert 'gutenberg' in text.lower() and 'license' in text.lower()
    assert len(norm)>=len(normalized(source['text']))*.98,(b['slug'],'Text lost')
    b['pages']=len(pdf);b['bytes']=(root/b['file']).stat().st_size
    b['sha256']=digest
    b['sourceSections']=source['sections']
    print(b['slug'],b['pages'],'pages;',source['sections'],'sections checked')
    save()
save()
