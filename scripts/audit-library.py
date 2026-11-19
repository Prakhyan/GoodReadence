"""Publication gate: asset identity, book count, attributed profiles and visual contact sheets."""
import hashlib,json,math,os
from pathlib import Path
from PIL import Image,ImageDraw
import pymupdf
root=Path(__file__).resolve().parents[1]
books=json.loads((root/'library-data.json').read_text(encoding='utf8'))
expected=int(os.environ.get('EXPECTED_LIBRARY_COUNT','750'))
assert len(books)==expected and len({b['id'] for b in books})==expected
assert len(list((root/'public-books').glob('*.pdf')))==expected
out=root/'research/library-audit';out.mkdir(parents=True,exist_ok=True)
visual=books[-250:] if os.environ.get('AUDIT_NEW_ONLY') else books
print('Checking PDF assets and visual samples:',len(visual),flush=True)
for batch in range(math.ceil(len(visual)/10)):
    print('Visual sheet',batch+1,'of',math.ceil(len(visual)/10),flush=True)
    sheet=Image.new('RGB',(1500,1000),'#e5e1da');draw=ImageDraw.Draw(sheet)
    for i,b in enumerate(visual[batch*10:batch*10+10]):
        pdfpath=root/b['file'];assert pdfpath.stat().st_size==b['bytes'];assert hashlib.sha256(pdfpath.read_bytes()).hexdigest()==b['sha256']
        doc=pymupdf.open(pdfpath);assert len(doc)==b['pages'];assert b['authorInfo']['bio'] and b['authorInfo']['source'] and b['authorInfo']['works'],b['id']
        if b.get('rating'):assert 0<=b['rating']['average']<=5 and b['rating']['count']>0 and b['rating']['url'].startswith('https://openlibrary.org/works/')
        assert (root/b['cover']).exists() and (root/b['sourceFile']).exists()
        p=doc[max(1,len(doc)//2)];pix=p.get_pixmap(matrix=pymupdf.Matrix(.65,.65));im=Image.frombytes('RGB',[pix.width,pix.height],pix.samples);im.thumbnail((290,465));sheet.paste(im,((i%5)*300,(i//5)*500));draw.text(((i%5)*300,(i//5)*500+475),str(b['id'])+' '+b['title'][:30],fill='#222')
    sheet.save(out/f'pages-{batch}.jpg',quality=85)
print('PASS: expected complete PDF assets, hashes, page counts, covers, biographies and attributed ratings. Visual sheets ready.')
