"""Read the official archive without extracting arbitrary paths or links."""
import json,re,tarfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'research/expansion-50000'
ids={b['id']for b in json.loads((OUT/'candidates.json').read_text(encoding='utf8'))};ids.update(b['id']for b in json.loads((OUT/'baseline.json').read_text(encoding='utf8')))
folder=OUT/'rdf';folder.mkdir(exist_ok=True);scanned=written=0
with tarfile.open(OUT/'rdf-files.tar.bz2',mode='r|bz2')as archive:
    for entry in archive:
        match=re.search(r'(?:^|/)pg(\d+)\.rdf$',entry.name)
        if not match or not entry.isfile():continue
        scanned+=1;ident=int(match[1]);target=folder/(str(ident)+'.rdf')
        if ident in ids and not target.exists():
            assert entry.size<2*1024*1024,'Oversized metadata record'
            data=archive.extractfile(entry).read();assert b'</rdf:RDF>'in data,'Truncated metadata record'
            try:
                with target.open('xb')as file:file.write(data)
                written+=1
            except FileExistsError:pass
        if scanned%10000==0:print('Catalogue metadata indexed',scanned,'records;',written,'new local records',flush=True)
print('Complete official metadata index:',scanned,'records;',written,'new records',flush=True)
(OUT/'metadata-index.json').write_text(json.dumps({'scanned':scanned,'selected':len(ids),'written':written}),encoding='utf8')
