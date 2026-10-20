"""Extract original slide layers for direct, reversible browser interaction."""
import json
from io import BytesIO
from pathlib import Path
import fitz
from PIL import Image
root=Path(__file__).resolve().parents[1]
assets=root/'public/story/assets'
out=root/'public/assets/interactive'
out.mkdir(parents=True,exist_ok=True)
uid='D2C8AA9C-E0B2-4187-B621-C03103C583D5'
data=json.loads((assets/uid/(uid+'.json')).read_text())
textures={}
for key,item in data['assets'].items():
 if item['type']!='texture':continue
 document=fitz.open(assets/uid/item['url']['native'])
 pix=document[item['index']].get_pixmap(matrix=fitz.Matrix(2,2),alpha=True)
 image=Image.open(BytesIO(pix.tobytes('png')))
 image.save(out/(key+'.webp'),quality=92,method=6)
 textures[key]='assets/interactive/'+key+'.webp'
scene={'width':1920,'height':1080,'duration':1.75,'textures':textures,'root':data['events'][0]['effects'][0]['baseLayer']}
(out/'design.json').write_text(json.dumps(scene,separators=(',',':'),ensure_ascii=False))
print('Extracted',len(textures),'original transparent layers with original movement data')
