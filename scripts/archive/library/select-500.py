import csv,gzip,json,re,unicodedata,collections
from pathlib import Path
root=Path(__file__).resolve().parents[3]
out=root/'research/expansion-500';out.mkdir(exist_ok=True,parents=True)
old=json.loads((root/'library-data.json').read_text(encoding='utf8'))
def genre(row):
    s=(row['Subjects']+' '+row['Bookshelves']).lower()
    for terms,name in [('detective|mystery','Mystery'),('science fiction','Science fiction'),('gothic|horror|ghost stories','Gothic fiction'),('fairy tales|fantasy|magic','Fantasy'),('poetry|poems','Poetry'),('drama|plays|tragedies','Drama'),('short stories','Short stories'),('sea stories|adventure|pirates','Adventure'),('love stories|romance','Romance'),('historical fiction','Historical fiction'),('humor|humour|satire','Humour'),('fables','Fables'),('juvenile fiction','Children’s fiction')]:
        if re.search(terms,s):return name
    return 'Literary fiction'
def key(title):
    title=unicodedata.normalize('NFKD',title).encode('ascii','ignore').decode().lower()
    title=re.split(r'[:;\[]',title)[0]
    title=re.sub(r'^(?:the|an|a)\s+','',title)
    title=re.sub(r'\b(?:illustrated|complete|unabridged|novel|romance)\b','',title)
    return re.sub(r'[^a-z0-9]','',title)
rows=list(csv.DictReader(gzip.open(out/'catalog.csv.gz','rt',encoding='utf8')))
byid={int(r['Text#']):r for r in rows}
groups=collections.defaultdict(list);known=set(key(b['title']) for b in old)
for r in rows:
    if r['Language']!='en' or r['Type']!='Text' or not re.search(r'fiction|poetry|poems|drama|stories|fables',r['Subjects']+' '+r['Bookshelves'],re.I):continue
    if re.search(r'\b(?:volumes?|vol\.|abridged|selections|part [ivx\d]+)\b',r['Title'],re.I):continue
    dates=re.findall(r'(?:\d{3,4}|\?)\s*-\s*(\d{3,4})(?:\b|\s*\[)',r['Authors'])
    if not dates or any(int(y)>1945 for y in dates):continue
    if key(r['Title']) in known:continue
    r['id']=int(r['Text#']);r['genre']=genre(r)
    groups[r['genre']].append(r)
candidates=[]
while groups and len(candidates)<1200:
    for g in list(groups):
        if groups[g]:candidates.append(groups[g].pop(0))
        if not groups[g]:del groups[g]
records=[dict(byid[b['id']],id=b['id'],genre=b['genre'],existing=True) for b in old if b['id'] in byid]+candidates
(out/'candidates.json').write_text(json.dumps(records,ensure_ascii=False),encoding='utf8')
print('Candidates:',len(candidates),'across',len({r['genre'] for r in candidates}),'genres; existing records:',len(records)-len(candidates))
