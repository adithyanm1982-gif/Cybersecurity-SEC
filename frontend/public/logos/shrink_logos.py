"""Shrinks the logo PNGs so phones don't have to download / decode huge images.
Run it once INSIDE frontend/public/logos :   python shrink_logos.py
Needs Pillow:  pip install pillow      (originals are kept in a folder called originals/)"""
import os, shutil
from PIL import Image

MAX_SIDE = 900  # the logos are shown at about 40-300 px, so 900 px is plenty (sharp on retina screens)
os.makedirs("originals", exist_ok=True)
for name in sorted(os.listdir(".")):
    if not name.lower().endswith(".png"):
        continue
    before = os.path.getsize(name)
    im = Image.open(name).convert("RGBA")
    if max(im.size) <= MAX_SIDE and before < 400_000:
        print(f"{name}: already small, skipped")
        continue
    shutil.copy2(name, os.path.join("originals", name))
    scale = min(1.0, MAX_SIDE / max(im.size))
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    im.save(name, optimize=True)
    print(f"{name}: {before/1024:.0f} KB -> {os.path.getsize(name)/1024:.0f} KB   ({im.width}x{im.height})")