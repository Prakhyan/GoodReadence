from pathlib import Path
import re
root=Path(__file__).resolve().parents[3]
p=root/'index.html'
s=p.read_text(encoding='utf8')
s=re.sub(r'<p class="app-version">GoodReadence version <span data-app-version>[^<]+</span></p>','',s)
p.write_text(s,encoding='utf8')
p=root/'library.css'
s=p.read_text(encoding='utf8')+'\n.classic-card{display:flex;flex-direction:column}.classic-cover{flex:none}.classic-copy{display:flex;flex-direction:column;flex:1}.classic-actions{margin-top:auto;padding-top:20px}.classic-copy .edition-size{margin-bottom:16px}\n'
p.write_text(s,encoding='utf8')
for name in ['library.html','scripts/render-public-library.cjs']:
    p=root/name;s=p.read_text(encoding='utf8')
    s=re.sub(r'<p>The source editions identify themselves.*?</p>','<p class="library-credit-note">Source editions, author credits and original files are listed in each book’s More Info.</p>',s)
    p.write_text(s,encoding='utf8')
