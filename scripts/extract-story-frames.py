#!/usr/bin/env python3
"""Extract real Keynote footage for deterministic, gesture-free scroll playback.

Requires Pillow and ffmpeg (on PATH, or supplied by imageio_ffmpeg).
Original movie files remain untouched. No generated or substitute imagery.
"""
import hashlib
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public/assets/interactive"
OUTPUT = ASSETS / "frames"
FPS = 16


def ffmpeg_path():
    executable = shutil.which("ffmpeg")
    if executable:
        return executable
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


manifest = {}
for name in ("intro", "design"):
    source = ASSETS / f"{name}.mp4"
    target = OUTPUT / name
    target.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="tongkuang-frames-") as temporary:
        subprocess.run([
            ffmpeg_path(), "-hide_banner", "-loglevel", "error",
            "-i", str(source), "-an", "-vf", f"fps={FPS},scale=960:-2",
            "-start_number", "0", str(Path(temporary) / "%03d.png")
        ], check=True)
        frames = sorted(Path(temporary).glob("*.png"))
        for frame in frames:
            with Image.open(frame) as image:
                image.save(target / f"{frame.stem}.webp", "WEBP", quality=78, method=6)
                width, height = image.size
        manifest[name] = {
            "count": len(frames), "fps": FPS, "width": width, "height": height,
            "path": f"assets/interactive/frames/{name}",
            "source": f"assets/interactive/{name}.mp4",
            "sourceSHA256": hashlib.sha256(source.read_bytes()).hexdigest(),
        }
        print(f"{name}: {len(frames)} real frames, {width}×{height}")

(ROOT / "src/story-frames.json").write_text(json.dumps(manifest, indent=2) + "\n")
