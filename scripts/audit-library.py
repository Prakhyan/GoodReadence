"""Publication gate: asset identity, book count, attributed profiles and visual contact sheets."""
import hashlib,json,math
from pathlib import Path
from PIL import Image,ImageDraw
import pymupdf
root=Path(__file__).resolve().parents[1]
books=json.loads((root/'library-data.json').read_text(encoding='utf8'))
assert len(books)==500 and len({b['id'] for b in books})==500
assert len(list((root/'public-books').glob('*.pdf')))==500
out=root/'research/library-audit';out.mkdir(parents=True,exist_ok=True)
for batch in range(math.ceil(len(books)/10)):
    sheet=Image.new('RGB',(1500,1000),'#e5e1da');draw=ImageDraw.Draw(sheet)
    for i,b in enumerate(books[batch*10:batch*10+10]):
        pdfpath=root/b['file'];assert pdfpath.stat().st_size==b['bytes'];assert hashlib.sha256(pdfpath.read_bytes()).hexdigest()==b['sha256']
        doc=pymupdf.open(pdfpath);assert len(doc)==b['pages'];assert b['authorInfo']['bio'] and b['authorInfo']['source'] and b['authorInfo']['works'],b['id']
        if b.get('rating'):assert 0<=b['rating']['average']<=5 and b['rating']['count']>0 and b['rating']['url'].startswith('https://openlibrary.org/works/')
        assert (root/b['cover']).exists() and (root/b['sourceFile']).exists()
        p=doc[max(1,len(doc)//2)];pix=p.get_pixmap(matrix=pymupdf.Matrix(.65,.65));im=Image.frombytes('RGB',[pix.width,pix.height],pix.samples);im.thumbnail((290,465));sheet.paste(im,((i%5)*300,(i//5)*500));draw.text(((i%5)*300,(i//5)*500+475),str(b['id'])+' '+b['title'][:30],fill='#222')
    sheet.save(out/f'pages-{batch}.jpg',quality=85)
print('PASS: 500 complete PDF assets, hashes, page counts, covers, biographies and attributed ratings. Visual sheets ready.')
