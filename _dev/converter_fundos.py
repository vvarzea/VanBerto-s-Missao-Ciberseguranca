#!/usr/bin/env python3
"""Converte os fundos (mundo*.jpg, map-mundo*.jpg, sala_secreta.jpg) para WebP e atualiza as referências.
Os JPG originais ficam em _dev/originais/ (nunca se perdem); --reverter volta aos JPG.
Uso:  python3 _dev/converter_fundos.py [--quality 85]      converte
      python3 _dev/converter_fundos.py --reverter          repõe os JPG e as referências
Precisa de Pillow (pip install pillow)."""
import argparse, glob, os, pathlib, re, shutil, sys
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
ORIG = ROOT / "_dev" / "originais"
STEMS = re.compile(r"^(mundo\d_n[\w]+|map-mundo\d|sala_secreta)$")
TEXT = [ROOT / f for f in ("index.html", "dia-crianca.css", "dia-crianca.js", "data-progression.js", "README.md")]

ap = argparse.ArgumentParser(); ap.add_argument("--quality", type=int, default=85); ap.add_argument("--reverter", action="store_true")
a = ap.parse_args()

def rewrite(old_ext, new_ext):
    n = 0
    for f in TEXT:
        s = f.read_text(encoding="utf8")
        s2 = re.sub(r"\b((?:mundo\d_n[\w]+|map-mundo\d|sala_secreta))\." + old_ext + r"\b", r"\1." + new_ext, s)
        s2 = s2.replace("`mundo*." + old_ext + "`", "`mundo*." + new_ext + "`").replace("`map-mundo*." + old_ext + "`", "`map-mundo*." + new_ext + "`").replace("`sala_secreta." + old_ext + "`", "`sala_secreta." + new_ext + "`")
        s2 = s2.replace("As `map-mundo*." + old_ext + "`", "As `map-mundo*." + new_ext + "`")
        if s2 != s: n += 1; f.write_text(s2, encoding="utf8")
    return n

if a.reverter:
    if not ORIG.exists(): sys.exit("Não há _dev/originais/ — nada a repor.")
    for f in ORIG.glob("*.jpg"):
        shutil.copy2(f, ROOT / f.name)
        w = ROOT / (f.stem + ".webp")
        if w.exists(): w.unlink()
    print("JPG repostos; ficheiros de texto atualizados:", rewrite("webp", "jpg")); sys.exit(0)

ORIG.mkdir(parents=True, exist_ok=True)
before = after = 0
for f in sorted(ROOT.glob("*.jpg")):
    if not STEMS.match(f.stem): continue
    dst = ROOT / (f.stem + ".webp")
    Image.open(f).convert("RGB").save(dst, "WEBP", quality=a.quality, method=6)
    before += f.stat().st_size; after += dst.stat().st_size
    shutil.move(str(f), str(ORIG / f.name))
print(f"WebP q{a.quality}: {before/1048576:.2f} MB → {after/1048576:.2f} MB ({100*(1-after/before):.0f}% menos); originais em _dev/originais/")
print("ficheiros de texto atualizados:", rewrite("jpg", "webp"))
