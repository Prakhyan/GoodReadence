"""Check every source section survives PDF conversion, then record page counts/hashes."""
import collections,hashlib,json,re,unicodedata,subprocess
from pathlib import Path
from pypdf import PdfReader
root=Path(__file__).resolve().parents[1]
books=json.loads((root/'public-books/catalog.json').read_text(encoding='utf8'))
sources={b['slug']:b for b in json.loads((root/'research/library-print/source-report.json').read_text(encoding='utf8'))}
def normalized(text):
    return re.sub(r'\s+','',unicodedata.normalize('NFKC',text)).lower().replace('\u00ad','')
for b in books:
    pdf=PdfReader(root/b['file']);text='\n'.join(re.sub(r'\n\s*'+str(i+1)+r'\s*$','',p.extract_text() or '') for i,p in enumerate(pdf.pages));source=sources[b['slug']]
    norm=normalized(text)
    missing=[s for s in source['samples'] if normalized(s) not in norm]
    # PDF line breaks can split words; the section samples use whitespace-free comparison.
    if missing: raise AssertionError((b['slug'],'Missing section samples',missing[:2]))
    assert 'gutenberg' in text.lower() and 'license' in text.lower()
    assert len(norm)>=len(normalized(source['text']))*.98,(b['slug'],'Text lost')
    b['pages']=len(pdf.pages);b['bytes']=(root/b['file']).stat().st_size
    b['sha256']=hashlib.sha256((root/b['file']).read_bytes()).hexdigest()
    b['sourceSections']=source['sections']
    print(b['slug'],b['pages'],'pages;',source['sections'],'sections checked')
(root/'public-books/catalog.json').write_text(json.dumps(books,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
