#!/usr/bin/env python3
"""Copie web delle fotografie della home: WebP e AVIF, tre larghezze, mai piu' grandi
dell'originale. Gli originali restano dove sono: qui si scrive solo in public/hero.
Qualita' alta apposta: fregi e ferro battuto sono dettaglio fine, e a valori piu' bassi
la pietra si impasta."""
import os, sys
from PIL import Image

SRC = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "hero")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "hero")
FILE = [
    ("01-balconi-liberty.png", "balconi"),
    ("02-ingresso-monumentale.png", "ingresso"),
    ("03-finestra-decorata.png", "finestra"),
    ("04-cortile-logge.png", "cortile"),
]
LARGHEZZE = [768, 1152, 1536]

os.makedirs(OUT, exist_ok=True)
righe = []
for nome, slug in FILE:
    im = Image.open(os.path.join(SRC, nome)).convert("RGB")
    W, H = im.size
    for w in LARGHEZZE:
        if w > W:
            continue
        h = round(H * w / W)
        r = im.resize((w, h), Image.LANCZOS)
        for ext, kw in (("webp", dict(quality=82, method=6)), ("avif", dict(quality=66))):
            p = os.path.join(OUT, f"{slug}-{w}.{ext}")
            r.save(p, **kw)
            righe.append((os.path.basename(p), f"{w}x{h}", os.path.getsize(p) // 1024))
    print(f"{slug}: originale {W}x{H}")

for n, d, k in righe:
    print(f"  {n:28} {d:10} {k:4} KB")
print("totale", sum(k for _, _, k in righe), "KB")
