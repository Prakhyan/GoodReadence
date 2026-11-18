import json,zipfile,posixpath,re
from pathlib import Path
from lxml import etree
root=Path(__file__).resolve().parents[1]
books=json.loads((root/'public-books/catalog.json').read_text(encoding='utf8'));ids={b['id'] for b in books}
for id,title,genre,description in json.loads((root/'scripts/library-expansion.json').read_text()):
    file=root/f'public-books/pg-{id}.epub'
    if id in ids or not file.exists():continue
    with zipfile.ZipFile(file) as z:
        assert z.testzip() is None
        container=etree.fromstring(z.read('META-INF/container.xml'));opf=container.xpath('//*[local-name()="rootfile"]')[0].get('full-path');doc=etree.fromstring(z.read(opf))
        def texts(name):return [x.text for x in doc.xpath('//*[local-name()="'+name+'"]') if x.text]
        actual=texts('title')[0];author=' · '.join(texts('creator'));rights=' '.join(texts('rights'))
        expected_words=set(re.findall(r'[a-z]+',title.lower()))-{'the','a','of','and','in','s'}
        actual_words=set(re.findall(r'[a-z]+',actual.lower()))
        if len(expected_words & actual_words)/max(1,len(expected_words))<.65:
            print('TITLE MISMATCH - SKIPPED',id,title,'=>',actual);continue
        assert 'Public domain in the USA' in rights,(id,rights)
        assert 'en' in texts('language'),(id,texts('language'))
        print(id,title,'=>',actual,'|',author)
        slug='pg-'+str(id)
        books.append(dict(id=id,title=title,sourceTitle=actual,author=author,genre=genre,description=description,year='',slug=slug,colour='#533a54',source=f'https://www.gutenberg.org/ebooks/{id}',file=f'public-books/{slug}.epub',sourceFile=f'public-books/{slug}.epub',rights='Public domain in the United States; Project Gutenberg licence included. Check local copyright rules.',mirror=f'https://gutenberg.pglaf.org/cache/epub/{id}/pg{id}.epub'))
(root/'public-books/catalog.json').write_text(json.dumps(books,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('Catalogue:',len(books))
