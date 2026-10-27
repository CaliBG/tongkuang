"""Rebuild responsive variants without changing the original artwork."""
from pathlib import Path
from io import BytesIO
import hashlib
import json
from PIL import Image

root = Path(__file__).resolve().parents[1]
assets = root / 'public/assets'
destination = assets / 'responsive'
destination.mkdir(exist_ok=True)
manifest = {}
for name in ['dual.webp', 'record.webp', 'vlog.webp', 'screen-camera-selfie.jpg',
             'story-intro.webp', 'story-design.webp']:
    image = Image.open(assets / name)
    widths = ([640, 960, 1280] if name.startswith('story-') else
              [320, 480, 640, 850] if name.endswith('.jpg') else [320, 480, 640, 772])
    variants = []
    for width in widths:
        width = min(width, image.width)
        height = round(image.height * width / image.width)
        buffer = BytesIO()
        image.resize((width, height), Image.Resampling.LANCZOS).save(
            buffer, format='WEBP', quality=76, method=6)
        data = buffer.getvalue()
        filename = f'{Path(name).stem}-{width}-{hashlib.sha256(data).hexdigest()[:10]}.webp'
        (destination / filename).write_bytes(data)
        variants.append({'width': width, 'height': height,
                         'src': f'assets/responsive/{filename}', 'bytes': len(data)})
    manifest[name] = variants
(root / 'src/responsive-images.json').write_text(json.dumps(manifest, indent=2) + '\n')
