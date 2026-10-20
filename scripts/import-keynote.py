"""Import only source slides 36, 39 and 40, including original Keynote animation runtime."""
import json,shutil,hashlib,argparse
from pathlib import Path
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('source', type=Path, help='Keynote HTML export folder')
source=parser.parse_args().source;target=Path(__file__).resolve().parents[1]/'public'/'story'
(target/'assets').mkdir(parents=True,exist_ok=True)
h=json.loads((source/'assets/header.json').read_text());selected=[h['slideList'][i-1] for i in (36,39,40)]
assert len(selected)==3
for uid in selected:shutil.copytree(source/'assets'/uid,target/'assets'/uid,dirs_exist_ok=True)
shutil.copytree(source/'assets/player',target/'assets/player',dirs_exist_ok=True)
h.update(slideList=selected,slideCount=3,title='同框的诞生',filename='同框的诞生',loopSlideshow=0,showMode=0)
(target/'assets/header.json').write_text(json.dumps(h,ensure_ascii=False))
(target/'assets/header.jsonp').write_text('local_header('+json.dumps(h,ensure_ascii=False)+');')
shutil.copy2(source/'assets'/selected[0]/'thumbnail.jpeg',target/'assets/thumbnail.jpeg')
html=(source/'index.html').read_text().replace('<title>Keynote</title>','<title>同框的诞生</title>').replace('</body>','<script src="bridge.js"></script></body>')
(target/'index.html').write_text(html)
main=target/'assets/player/main.js';js=main.read_text();assert js.count('UC=new Eg,')==1
main.write_text(js.replace('UC=new Eg,','UC=new Eg,window.tongkuangPlayer=UC,'))
manifest={'sourcePages':[36,39,40],'slideIds':selected,'runtimeModification':'Expose existing playback controller for embedded replay; animation data and media unchanged.','files':{}}
for uid in selected:
 for f in (source/'assets'/uid).rglob('*'):
  if f.is_file():manifest['files'][str(f.relative_to(source))]=hashlib.sha256(f.read_bytes()).hexdigest()
(Path(__file__).parent/'keynote-source-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print('Imported',selected)
