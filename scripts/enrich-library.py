import json,re,unicodedata,datetime,zipfile
from lxml import etree
from pathlib import Path
root=Path(__file__).resolve().parents[1]
books=json.loads((root/'public-books/catalog.json').read_text(encoding='utf8'))
authors=json.loads((root/'public-books/authors.json').read_text(encoding='utf8'))
def norm(s):return re.sub('[^a-z0-9 ]','',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower()).strip()
def title(s):return ' '.join(w for w in norm(s).split() if w not in {'the','a','an'}).replace('moby dick','mobydick')
docs=[d for p in (root/'research/ratings').glob('batch-*.json') for d in json.loads(p.read_text())['docs']]
profiles=[json.loads(p.read_text()) for p in (root/'research/author-profiles').glob('*.json')]
# Reviewed canonical work/author IDs: translated titles and abbreviated English titles
# differ from the catalogue wording. These map actual source records, never invented scores.
reviewed={159:('OL381550W','OL13066A'),1399:('OL267096W','OL26783A'),28054:('OL10432709W','OL22242A'),2638:('OL166925W','OL22242A'),1727:('OL61982W','OL18404A'),521:('OL45089W','OL18283A')}
original={norm(b['author']):authors[str(b['id'])] for b in books if str(b['id']) in authors}
aliases={'dostoyevsky':'dostoevsky','clemens':'twain','montgomery':'montgomery','baum':'baum','barrie':'barrie','nesbit':'nesbit'}
famous={
'herman melville':['Moby-Dick','Typee','Billy Budd'], 'mark twain':['Adventures of Huckleberry Finn','The Adventures of Tom Sawyer','The Prince and the Pauper'],
'robert louis stevenson':['Treasure Island','Strange Case of Dr Jekyll and Mr Hyde','Kidnapped'], 'l frank baum':['The Wonderful Wizard of Oz','The Marvelous Land of Oz','Ozma of Oz'],
'j m barrie':['Peter Pan','The Little White Bird','The Admirable Crichton'], 'frances hodgson burnett':['The Secret Garden','A Little Princess','Little Lord Fauntleroy'],
'lucy maud montgomery':['Anne of Green Gables','Anne of Avonlea','The Blue Castle'], 'louisa may alcott':['Little Women','Little Men','Jo’s Boys'],
'rudyard kipling':['The Jungle Book','Kim','Just So Stories'], 'e nesbit':['Five Children and It','The Railway Children','The Enchanted Castle'],
'franz kafka':['The Metamorphosis','The Trial','The Castle'], 'joseph conrad':['Heart of Darkness','Lord Jim','The Secret Agent'],
'bram stoker':['Dracula','The Jewel of Seven Stars','The Lair of the White Worm'], 'jonathan swift':['Gulliver’s Travels','A Tale of a Tub','A Modest Proposal'],
'george eliot':['Middlemarch','The Mill on the Floss','Silas Marner'], 'william shakespeare':['Hamlet','Macbeth','Romeo and Juliet'],
'fyodor dostoevsky':['Crime and Punishment','The Brothers Karamazov','The Idiot'], 'leo tolstoy':['War and Peace','Anna Karenina','The Death of Ivan Ilyich'],
'alexandre dumas':['The Count of Monte Cristo','The Three Musketeers','Twenty Years After'], 'victor hugo':['Les Misérables','The Hunchback of Notre-Dame','Toilers of the Sea'],
'voltaire':['Candide','Zadig','Micromégas'], 'jack london':['The Call of the Wild','White Fang','Martin Eden'],
'stephen crane':['The Red Badge of Courage','Maggie: A Girl of the Streets','The Open Boat'], 'agatha christie':['The Mysterious Affair at Styles','Murder on the Orient Express','And Then There Were None'],
'emily bronte':['Wuthering Heights','Poems by Currer, Ellis, and Acton Bell'], 'charlotte bronte':['Jane Eyre','Shirley','Villette'],
'anne bronte':['Agnes Grey','The Tenant of Wildfell Hall'], 'henry david thoreau':['Walden','Civil Disobedience','A Week on the Concord and Merrimack Rivers'],
'walt whitman':['Leaves of Grass','Drum-Taps','Specimen Days'], 'edgar allan poe':['The Raven','The Fall of the House of Usher','The Tell-Tale Heart'],
'daniel defoe':['Robinson Crusoe','Moll Flanders','A Journal of the Plague Year'], 'harriet beecher stowe':['Uncle Tom’s Cabin','Dred','The Minister’s Wooing'],
'dante alighieri':['The Divine Comedy','La Vita Nuova','De Monarchia'], 'homer':['The Iliad','The Odyssey']}
for b in books:
    name=norm(b['author'].split(' · ')[0]);a=original.get(norm(b['author']))
    with zipfile.ZipFile(root/b['sourceFile']) as z:
        c=etree.fromstring(z.read('META-INF/container.xml'));opf=c.xpath('//*[local-name()="rootfile"]')[0].get('full-path');meta=etree.fromstring(z.read(opf));b['contributors']=[]
        for item in meta.xpath('//*[local-name()="contributor"]'):
            role=next((v for k,v in item.attrib.items() if k.endswith('role')),'Contributor')
            role={'trl':'Translator','ill':'Illustrator','edt':'Editor','aui':'Introduction'}.get(role,role)
            if item.text:b['contributors'].append(role+': '+item.text)
    if not a:
        surname=aliases.get(name.split()[-1],name.split()[-1]); candidates=[p for p in profiles if norm(p['title']).split()[-1]==surname]
        if len(candidates)>1:candidates=[p for p in candidates if norm(p['title']).split()[0]==name.split()[0]]
        if not candidates: print('MISSING AUTHOR',b['id'],b['author']);continue
        p=candidates[0];sentences=re.split(r'(?<=[.!?])\s+(?=[A-Z])',p['extract']);excerpt=''
        for sentence in sentences:
            if len(excerpt)+len(sentence)>700 and excerpt:break
            excerpt+=(' ' if excerpt else '')+sentence
            if len(excerpt)>300:break
        a={'life':'','bio':excerpt,'source':p['content_urls']['desktop']['page'],'biographyCredit':'Biography excerpt: Wikipedia contributors, CC BY-SA 4.0; shortened from the linked article.','works':famous.get(norm(p['title']),[]),'edition':'Cover and complete text reproduced from the Project Gutenberg source edition. Original credits and licence retained.'}
    a=dict(a)
    if not a.get('works'):a['works']=[x['title'] for x in books if x['author']==b['author']][:4]
    authors[str(b['id'])]=a
    bt=title(b['title']);surname=aliases.get(name.split(' translated')[0].split()[-1],name.split(' translated')[0].split()[-1])
    candidates=[]
    for d in docs:
        dt=title(d['title']);names=[norm(n) for n in d.get('author_name',[])]
        same_author=any(surname in n.split() or (surname=='dostoevsky' and 'dostoyevsky' in n.split()) for n in names)
        same_title=bt==dt or (len(bt)>12 and dt.startswith(bt+' ') and len(bt)/len(dt)>.65)
        if b['id'] in reviewed:
            wk,ak=reviewed[b['id']]
            if d.get('key')=='/works/'+wk and ak in d.get('author_key',[]):same_title=same_author=True
        if same_author and same_title and d.get('ratings_count',0)>0 and 0<=d.get('ratings_average',-1)<=5:candidates.append(d)
    if candidates:
        d=max(candidates,key=lambda d:d['ratings_count']);b['rating']={'average':d['ratings_average'],'count':d['ratings_count'],'url':'https://openlibrary.org'+d['key'],'checked':datetime.date.today().isoformat(),'sourceTitle':d['title'],'sourceAuthors':d['author_name']}
    else:b['rating']=None
(root/'public-books/authors.json').write_text(json.dumps(authors,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
(root/'public-books/catalog.json').write_text(json.dumps(books,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('Ratings verified:',sum(b.get('rating') is not None for b in books),'/',len(books))
print('Without rating:',[(b['id'],b['title']) for b in books if not b.get('rating')])
