"""Build a distinct, screened catalogue, retaining current qualified editions first."""
import json,re,unicodedata,zipfile
from pathlib import Path
from lxml import etree
root=Path(__file__).resolve().parents[1];out=root/'research/expansion-500'
old=json.loads((out/'baseline.json').read_text(encoding='utf8'))
records=json.loads((out/'candidates.json').read_text(encoding='utf8'))
screened={b['id']:b for b in json.loads((out/'screened.json').read_text(encoding='utf8'))}
def key(s):
    s=unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower()
    s=re.split(r'[:;\[]',s)[0]
    s=re.sub(r'^(the|an|a)\s+','',s)
    s=re.sub(r'\b(illustrated|complete|unabridged|novel|romance)\b','',s)
    return re.sub(r'[^a-z0-9]','',s)
def display(n):
    p=n.split(', ')
    return ' '.join(p[1:]+p[:1]) if len(p)==2 else n
def rdf(id):return etree.parse(str(out/f'rdf/{id}.rdf'))
def values(doc,tag):return doc.xpath('//*[local-name()="'+tag+'"]//text()')
books=[];manifest=[];seen=set();used=set();sources=[]
authors=json.loads((root/'public-books/authors.json').read_text(encoding='utf8'))
ordered=[screened.get(b['id']) for b in old]+[screened.get(r['id']) for r in records if not r.get('existing')]
for r in ordered:
    if not r or not r.get('screenPassed') or r['id'] in used:continue
    id=r['id'];doc=rdf(id);title=' '.join(values(doc,'title')).strip();title=re.sub(r'\$[a-z]\s*','',title);k=key(title)
    if not k or k in seen:continue
    # Recognise obvious alternate editions, including the source's explicit cross-edition links.
    same=re.findall(r'(?:also available as|also available in).*?(?:#|eBook\s+)(\d+)', ' '.join(values(doc,'description')),re.I)
    if any(int(n) in used for n in same):continue
    main=doc.xpath('//*[local-name()="creator"]//*[local-name()="agent"]')
    agents=doc.xpath('//*[local-name()="agent"]')
    if not main:continue
    names=[''.join(a.xpath('./*[local-name()="name"]/text()')) for a in main]
    author=' · '.join(display(n) for n in names)
    authorKey=key(author)
    if any(key(b['author'])==authorKey and min(len(k),len(key(b['title'])))>12 and (k.startswith(key(b['title'])) or key(b['title']).startswith(k)) for b in books):continue
    original=next((b for b in old if b['id']==id),None)
    if original:b=dict(original)
    else:
        summary=' '.join(values(doc,'marc520'));summary=re.sub(r'\(This is an automatically generated summary\.\)','',summary).strip()
        sentences=re.split(r'(?<=[.!?])\s+',summary)
        short=sentences[0] if summary else f'A complete {r["genre"].lower()} edition by {author}.'
        long=' '.join(sentences[1:3]) if len(sentences)>1 else 'Read the complete historical source edition, with its original language and edition credits preserved.'
        a=main[0];life='–'.join(''.join(a.xpath('./*[local-name()="'+t+'"]//text()')) for t in ['birthdate','deathdate'])
        webpage=a.xpath('./*[local-name()="webpage"]/@*[local-name()="resource"]')
        info=next((dict(x['authorInfo']) for x in old if key(x['author'])==authorKey),None) or {'life':life,'bio':f'{author} ({life}) is the author of {title}. This historical edition is part of the author’s surviving literary work. Explore the linked biographical record for their life and bibliography.','source':webpage[0] if webpage else f'https://www.gutenberg.org/ebooks/{id}','works':[title],'edition':'Complete source edition, with original credits and licence retained.'}
        b={'id':id,'title':title,'sourceTitle':title,'author':author,'genre':r['genre'],'description':short,'longDescription':long,'year':'','slug':f'pg-{id}','colour':'#533a54','source':f'https://www.gutenberg.org/ebooks/{id}','file':f'public-books/pg-{id}.epub','sourceFile':f'public-books/pg-{id}.epub','mirror':f'https://gutenberg.pglaf.org/cache/epub/{id}/pg{id}.epub','rating':None,'authorInfo':info}
    b['rights']='Source edition: public domain in the United States. Listed creative contributors screened for India, UK and EU; original licence retained.'
    contributors=[]
    for agent in agents:
        name=''.join(agent.xpath('./*[local-name()="name"]/text()'))
        death=int(agent.xpath('./*[local-name()="deathdate"]/text()')[0]);assert death<=1945
        contributors.append({'name':name,'death':death})
    b['rightsReview']={'source':f'https://www.gutenberg.org/ebooks/{id}.rdf','checked':'2026-11-18','markets':['India','US','UK','EU'],'listedContributors':contributors,'policy':'Source states US public domain; listed creative contributors died by 1945. Unknown dates excluded. This is a screening record, not a legal certification.'}
    seen.add(k);used.add(id);manifest.append(r);books.append(b);sources.append(b['rightsReview'])
    if len(books)>=650:break
(out/'pool.json').write_text(json.dumps(books,ensure_ascii=False,indent=2),encoding='utf8')
(out/'pool-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False),encoding='utf8')
print('Distinct screened pool:',len(books),'retained:',sum(b['id'] in {x['id'] for x in old} for b in books))
