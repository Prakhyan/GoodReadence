"""Inventory genuine source candidates; this does not approve or publish books."""
import collections, csv, gzip, json, re, unicodedata
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'research/expansion-50000'
def normal(value):
    return re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFKD',value).encode('ascii','ignore').decode().lower())
def title_key(value):
    value=re.split(r'[:;\n]',value)[0]
    value=re.sub(r'\([^)]*\)|\[[^]]*\]', '',value)
    return normal(re.sub(r'^(the|an|a)\s+', '',value,flags=re.I))
def author_key(value):
    value=re.sub(r',\s*-?\d+\??\s*-\s*-?\d+.*$', '',value)
    value=re.sub(r'\[[^]]*\]', '',value).strip()
    return ' '.join(sorted(re.findall(r'[a-z0-9]+',unicodedata.normalize('NFKD',value).encode('ascii','ignore').decode().lower())))
def genre(row):
    subjects=(row['Subjects']+' '+row['Bookshelves']).lower()
    tests=[('philosophy|ethics|metaphysics','Philosophy'),('architecture|painting|sculpture|art history','Art & architecture'),('letters|diaries|autobiography|memoirs','Memoir & letters'),('essays','Essays'),('grammar|linguistics|literary criticism|rhetoric|philology','Language & literature'),('mathematics|astronomy|physics|chemistry|inventions|natural philosophy','Science & ideas'),('detective|mystery','Mystery'),('science fiction','Science fiction'),('utopias|utopian','Utopian fiction'),('gothic|horror|ghost stories','Gothic fiction'),('fairy tales','Fairy tales'),('fantasy|magic','Fantasy'),('epic poetry|epics','Epic poetry'),('poetry|poems|sonnets','Poetry'),('drama|plays|tragedies|comedies','Drama'),('fables','Fables'),('short stories','Short stories'),('sea stories|adventure stories|pirates','Adventure'),('love stories|romances','Romance'),('historical fiction','Historical fiction'),('satire','Satire'),('humor|humour','Humour'),('juvenile fiction','Children’s fiction'),('family|domestic fiction','Family fiction'),('botany|zoology|birds|natural history|gardening|animals|forests','Nature writing'),('fiction','Literary fiction'),('biography|history','History & biography'),('travel|description and travel|voyages','Travel'),('religion|theology|christian|mythology','Religion & mythology')]
    return next((name for terms,name in tests if re.search(terms,subjects)), 'General nonfiction')

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    baseline=json.loads((ROOT/'public-books/catalog.json').read_text(encoding='utf8'))
    if not (OUT/'baseline.json').exists():(OUT/'baseline.json').write_text(json.dumps(baseline,ensure_ascii=False),encoding='utf8')
    rows=list(csv.DictReader(gzip.open(OUT/'pg_catalog.csv.gz','rt',encoding='utf8')))
    known={title_key(b['title'])+':'+author_key(b['author'])for b in baseline};ids={b['id']for b in baseline};candidates=[];held=collections.Counter();seen=set()
    languages={'en','fr','de','it','es','pt','nl','fi','sv','da','no','la','eo','pl','hu','ro','cs','is'}
    for row in rows:
        ident=int(row['Text#']); title=row['Title']; author=row['Authors'].split('; ')[0]
        if ident in ids:continue
        if row['Type']!='Text' or row['Language'] not in languages:held['format or unsupported language']+=1;continue
        if not row['Authors'] or re.search(r'\b(?:unknown|anonymous|various)\b',row['Authors'],re.I):held['unresolved author']+=1;continue
        agents=row['Authors'].split('; ')
        deaths=[re.search(r',\s*-?\d{1,4}\??\s*-\s*(-?\d{1,4})\b',name)for name in agents]
        if not all(deaths)or any(int(d[1])>1900 for d in deaths):held['missing or later contributor date']+=1;continue
        if re.search(r'\b(?:volumes?|vol\.|part\s+[ivxlcdm\d]+|book\s+[ivxlcdm\d]+|abridged|selections|retold|epitome|magazine|periodical|journal|number\s+\d+)\b',title,re.I):held['partial, periodical or adapted edition']+=1;continue
        key=title_key(title)+':'+author_key(author)
        if key in known or key in seen:held['duplicate work']+=1;continue
        seen.add(key);candidates.append({'id':ident,'title':title,'catalogueAuthor':author,'catalogueAuthors':row['Authors'],'language':row['Language'],'subjects':row['Subjects'].split('; '),'genre':genre(row)})
    groups=collections.defaultdict(list)
    for b in candidates:groups[(b['language']!='en',b['genre'])].append(b)
    # Start with English and underserved genres; then widen language coverage.
    counts=collections.Counter(b['genre']for b in baseline);ordered=[]
    for foreign in [False,True]:
        keys=sorted([g for g in groups if g[0]==foreign],key=lambda g:(counts[g[1]],g[1]))
        while keys:
            for key in keys[:]:
                if groups[key]:ordered.append(groups[key].pop(0))
                if not groups[key]:keys.remove(key)
    report={'sourceRecords':len(rows),'potentialCandidates':len(ordered),'languages':dict(collections.Counter(b['language']for b in ordered)),'preScreenHolds':dict(held),'policy':'Candidates only. All listed contributors must be dated no later than 1900; actual source permissions, credits, complete reading order, images, supported glyphs and duplicates still require review.'}
    (OUT/'candidates.json').write_text(json.dumps(ordered,ensure_ascii=False),encoding='utf8');(OUT/'inventory.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps(report,ensure_ascii=False),flush=True)
if __name__=='__main__':main()
