"""Validate source-declared historical artwork and prepare compact display images."""
import json, hashlib, io, re
from pathlib import Path
from PIL import Image
folder=Path('research/covers-5000'); downloads=json.loads((folder/'historical-downloads.json').read_text());results={}
# Contact-sheet review: title pages are not original covers, and modern composites
# need a separate licence even when attached to an otherwise public-domain book.
visual_holds={43397:'Title page, not a historical front cover',42299:'Title page, not a historical front cover',49621:'Modern title-cover design without separately verified design permission',60562:'Composite title-page design without separately verified design permission',53241:'Modern cover composite without separately verified design permission'}
for b in json.loads((folder/'source-targets.json').read_text()):
    r=downloads.get(str(b['id']),{})
    try:
        assert b['id'] not in visual_holds,visual_holds.get(b['id'])
        assert r.get('status')=='ready',r.get('reason','Missing source')
        text=(folder/'historical-covers'/f"{b['id']}.html").read_text(errors='replace')
        text=re.sub(r'\s+',' ',re.sub(r'<[^>]*>',' ',text))
        assert not re.search(r'cover.{0,160}(?:created|produced|designed|transcriber)|(?:transcriber|created|produced|designed).{0,160}cover',text,re.I),'Possible new cover requires separate artwork permission'
        raw=Path(r['file']).read_bytes();im=Image.open(io.BytesIO(raw));im.verify();im=Image.open(io.BytesIO(raw)).convert('RGB')
        assert im.width>=180 and im.height>=250 and .4<im.width/im.height<1.1,'Unsuitable cover dimensions'
        artists=[c for c in b['rightsReview']['listedContributors'] if c['role']=='ill']
        assert artists and all(0<c['death']<=1900 for c in b['rightsReview']['listedContributors'])
        im.thumbnail((480,720));file=folder/'historical-covers'/f"{b['id']}.jpg";im.save(file,quality=85,optimize=True)
        results[str(b['id'])]={**r,'status':'accepted','file':str(file).replace('\\','/'),'source':b['source'],'sourceArchive':b['delivery']['url'],'sourceImageSha256':hashlib.sha256(raw).hexdigest(),'artists':artists,'credit':'Historical source-edition cover from Project Gutenberg. Credited illustrator: '+ '; '.join(c['name'] for c in artists)+'. Original edition credits retained.','rights':'Explicit US public-domain source edition; all named creative contributors died by 1900, screened for India, UK and EU.'}
    except Exception as e:results[str(b['id'])]={'id':b['id'],'status':'held','reason':str(e)}
(folder/'source-cover-review.json').write_text(json.dumps(results,indent=2)+'\n')
print({s:sum(r['status']==s for r in results.values()) for s in ['accepted','held']})
