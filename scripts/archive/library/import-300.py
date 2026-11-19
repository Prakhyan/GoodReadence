"""Validate EPUB metadata and add 200 new editions without changing existing entries."""
import json, re, zipfile
from pathlib import Path
from lxml import etree
root=Path(__file__).resolve().parents[3]
prepared={b['id']:b for b in json.loads((root/'public-books/catalog.json').read_text(encoding='utf8'))}
books=json.loads((root/'library-data.json').read_text(encoding='utf8'))[:100]
selected=json.loads((root/'scripts/library-expansion-300.json').read_text(encoding='utf8'))
assert len(selected)==200
authors=json.loads((root/'public-books/authors.json').read_text(encoding='utf8'))
def genre(b):
    s=' '.join(b['bookshelves']+b['subjects']).lower()
    for terms,label in [('poetry|poems','Poetry'),('detective|mystery','Mystery'),('science fiction','Science fiction'),('gothic|horror','Gothic fiction'),('fantasy|fairy','Fantasy'),('adventure|sea stories','Adventure'),('romance|love stories','Romance'),('short stories','Short stories'),('drama|plays|tragedies','Drama'),('humor|humour|satire','Humour'),('historical fiction','Historical fiction')]:
        if re.search(terms,s):return label
    return 'Literary fiction'
def display(name):
    parts=name.split(', ')
    return ' '.join(parts[1:]+parts[:1]) if len(parts)==2 else name
for b in selected:
    id=b['id'];path=root/f'public-books/pg-{id}.epub'
    with zipfile.ZipFile(path) as z:
        assert z.testzip() is None
        c=etree.fromstring(z.read('META-INF/container.xml'));opf=c.xpath('//*[local-name()="rootfile"]')[0].get('full-path');doc=etree.fromstring(z.read(opf))
        def texts(name):return [n.text for n in doc.xpath('//*[local-name()="'+name+'"]') if n.text]
        assert 'Public domain in the USA' in ' '.join(texts('rights')),(id,texts('rights'))
        assert 'en' in texts('language'),id
        actual=texts('title')[0]
        assert re.sub(r'\W','',actual.split(':')[0]).lower() in re.sub(r'\W','',b['title']).lower() or re.sub(r'\W','',b['title'].split(':')[0]).lower() in re.sub(r'\W','',actual).lower(),(id,actual,b['title'])
    author=' · '.join(display(a['name']) for a in b['authors']);primary=b['authors'][0]
    existing=next((x['authorInfo'] for x in books if x['author']==author),None)
    works=list(dict.fromkeys(x['title'] for x in selected if x['authors'][0]['name']==primary['name']))[:6]
    life='–'.join(str(primary.get(k) or '?') for k in ['birth_year','death_year'])
    info=existing or {'life':life,'bio':f"{author} ({life}) is the credited author of this historical edition. Works available in this collection include "+', '.join(works)+'. The linked author record provides further bibliographic details.','source':'https://www.gutenberg.org/ebooks/search/?query='+__import__('urllib.parse',fromlist=['quote']).quote(primary['name']),'works':works,'edition':'Cover and complete text reproduced from the Project Gutenberg source edition. Original credits and licence retained.'}
    authors[str(id)]=info
    description=(b.get('summaries') or [f"A complete historical work by {author}."])[0].split('\n')[0]
    description=re.split(r'(?<=[.!?])\s',description,maxsplit=1)[0]
    topics=[s.split(' -- ')[0] for s in b['subjects']][:5]
    books.append({'id':id,'title':re.sub(r'\$[a-z]\s*','',b['title']),'sourceTitle':actual,'author':author,'genre':genre(b),'description':description,'longDescription':'Explore '+', '.join(dict.fromkeys(topics))+'. This complete source edition preserves the original text and its period language, with the edition credits and licence included.','year':'','slug':f'pg-{id}','colour':'#533a54','source':f'https://www.gutenberg.org/ebooks/{id}','file':f'public-books/pg-{id}.epub','sourceFile':f'public-books/pg-{id}.epub','mirror':f'https://gutenberg.pglaf.org/cache/epub/{id}/pg{id}.epub','rights':'Public domain in the United States; Project Gutenberg licence included. Check local copyright rules.','contributors':['Translator: '+display(a['name']) for a in b.get('translators',[])],'rating':None,'authorInfo':info})
books=[prepared[b['id']] if b['id'] in prepared and prepared[b['id']].get('cover') else b for b in books]
assert len(books)==300 and len({b['id'] for b in books})==300
(root/'public-books/catalog.json').write_text(json.dumps(books,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
(root/'public-books/authors.json').write_text(json.dumps(authors,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('Imported 200 validated editions; 300 total.')
