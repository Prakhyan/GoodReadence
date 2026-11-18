"""Prepare complete, self-contained print HTML from every EPUB spine item.
Run from the repository root, then run scripts/build-library-pdfs.cjs.
No chapter, paragraph, or licence truncation; source EPUBs remain available.
Requires lxml and Pillow. The build report is used to check PDF completeness.
"""
import base64, hashlib, html as esc, json, mimetypes, posixpath, re, zipfile, os
from pathlib import Path
from urllib.parse import unquote
from lxml import etree, html
from PIL import Image
from io import BytesIO

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'research/library-print'
OUT.mkdir(parents=True, exist_ok=True)
books = json.loads((ROOT/'public-books/catalog.json').read_text(encoding='utf8'))
ns = {'o':'http://www.idpf.org/2007/opf'}
report = json.loads((OUT/'source-report.json').read_text(encoding='utf8')) if (OUT/'source-report.json').exists() else []
report_by_slug = {r['slug']:r for r in report}
report=[]
for b in books:
    if os.environ.get('LIBRARY_INCREMENTAL') and b['slug'] in report_by_slug and (OUT/(b['slug']+'.html')).exists():
        report.append(report_by_slug[b['slug']]);continue
    source = b.get('sourceFile', b['file'])
    z = zipfile.ZipFile(ROOT/source)
    container = etree.fromstring(z.read('META-INF/container.xml'))
    opf = container.xpath('//*[local-name()="rootfile"]')[0].get('full-path')
    root = etree.fromstring(z.read(opf))
    base = posixpath.dirname(opf)
    manifest = {i.get('id'):i for i in root.find('o:manifest',ns)}
    refs = list(root.find('o:spine',ns))
    cover_id = root.xpath('//*[local-name()="meta"][@name="cover"]')[0].get('content')
    cover_path = posixpath.join(base,manifest[cover_id].get('href'))
    cover = Image.open(BytesIO(z.read(cover_path))).convert('RGB')
    cover.thumbnail((600,900))
    b['cover'] = 'public-books/'+b['slug']+'-cover.jpg'
    cover.save(ROOT/b['cover'], quality=88)
    sections, texts, styles = [], [], []
    def data(path):
        mime=mimetypes.guess_type(path)[0] or 'application/octet-stream'
        return 'data:'+mime+';base64,'+base64.b64encode(z.read(path)).decode()
    for index,ref in enumerate(refs):
        path=posixpath.join(base,unquote(manifest[ref.get('idref')].get('href')))
        doc=html.fromstring(z.read(path))
        for link in doc.xpath('//link[@rel="stylesheet"]'):
            csspath=posixpath.normpath(posixpath.join(posixpath.dirname(path),link.get('href')))
            css=z.read(csspath).decode('utf8')
            if css not in styles: styles.append(css)
        for style in doc.xpath('//style'):
            if style.text and style.text not in styles: styles.append(style.text)
        body=doc.find('body')
        if body is None: raise ValueError('Missing body: '+path)
        for bad in body.xpath('.//script|.//iframe'):
            bad.drop_tree()
        for el in body.iter():
            if not isinstance(el.tag,str):continue
            for attr in list(el.attrib):
                if attr.startswith('on'): del el.attrib[attr]
            if el.get('src'):
                el.set('src',data(posixpath.normpath(posixpath.join(posixpath.dirname(path),unquote(el.get('src'))))))
            if etree.QName(el).localname=='image':
                for attr in list(el.attrib):
                    if attr.endswith('href'): el.set(attr,data(posixpath.normpath(posixpath.join(posixpath.dirname(path),unquote(el.get(attr))))))
            if el.tag=='a' and el.get('href') and not re.match(r'https?:|mailto:',el.get('href')):
                href=el.get('href'); el.set('href','#'+href.split('#')[-1] if '#' in href else '#section-'+str(index))
        text=' '.join(body.text_content().split())
        texts.append(text)
        # Retain the source cover as the first PDF page; only its container is fitted.
        cover_section=index==0 and len(text)<80
        sections.append('<section id="section-'+str(index)+'" class="'+('source-cover' if cover_section else 'source-section')+'">'+html.tostring(body,encoding='unicode')+'</section>')
    full='\n'.join(texts)
    credit=re.search(r'Credits:\s*(.*?)\s*\*\*\* START',full,re.S)
    b['editionCredits']=credit.group(1).strip() if credit else 'Project Gutenberg; individual edition credits are retained in the complete PDF.'
    b['sourceFile']=source
    b['sourceSha256']=hashlib.sha256((ROOT/source).read_bytes()).hexdigest()
    b['file']='public-books/'+b['slug']+'.pdf'
    css='''@page{size:6in 9in;margin:0.62in 0.55in 0.65in}html,body{margin:0!important;padding:0!important;background:white!important;color:#191919!important;font-family:Georgia,"Times New Roman",serif!important;font-size:11pt!important;line-height:1.48!important}body{width:auto!important;max-width:none!important}p{orphans:3;widows:3}h1,h2,h3,h4{break-after:avoid;line-height:1.25}h1{font-size:23pt}h2{font-size:18pt}img,svg{max-width:100%!important;max-height:6.7in!important;object-fit:contain}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:9pt}table{max-width:100%;font-size:10pt}a{color:inherit} .source-cover{height:7.6in;display:flex;align-items:center;justify-content:center;break-after:page}.source-cover body,.source-cover div{margin:0!important;padding:0!important}.source-cover img,.source-cover svg{width:4.9in!important;height:7.5in!important;max-height:7.5in!important;object-fit:contain}.source-section{overflow:visible!important}.source-section>body{display:contents}.pg-boilerplate{font-size:9pt}'''
    (OUT/(b['slug']+'.html')).write_text('<!doctype html><html><head><meta charset="utf-8"><title>'+esc.escape(b['title'])+'</title><style>'+'\n'.join(styles)+'\n'+css+'</style></head><body>'+''.join(sections)+'</body></html>',encoding='utf8')
    # Samples across EVERY spine document, plus the full source text for word coverage.
    report.append({'slug':b['slug'],'sections':len(refs),'text':full,'samples':[t[max(0,len(t)//2-70):len(t)//2+70] for t in texts if len(t)>100]})
    print(b['slug'],len(refs),'sections',len(full.split()),'words')
(OUT/'source-report.json').write_text(json.dumps(report,ensure_ascii=False),encoding='utf8')
(ROOT/'public-books/catalog.json').write_text(json.dumps(books,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
