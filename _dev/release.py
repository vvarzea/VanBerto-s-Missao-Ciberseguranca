#!/usr/bin/env python3
"""Prepara uma versão do jogo: carimba o ?v= (igual em todo o lado), corre as verificações e o teste
de fumo e gera o zip. Uso:
    python3 _dev/release.py v79 descricao_curta            # carimba, verifica, testa e gera o zip
    python3 _dev/release.py --check-only                   # só verifica e testa (não muda nada nem gera zip)
Opções: --out PASTA (por omissão /mnt/user-data/outputs)   --no-smoke (salta o teste no Chromium)
"""
import argparse, datetime, pathlib, re, subprocess, sys, zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
DEV = ROOT / "_dev"
ap = argparse.ArgumentParser()
ap.add_argument("tag", nargs="?"); ap.add_argument("name", nargs="?", default="")
ap.add_argument("--out", default="/mnt/user-data/outputs"); ap.add_argument("--check-only", action="store_true"); ap.add_argument("--no-smoke", action="store_true")
a = ap.parse_args()
if not a.check_only and not a.tag: ap.error("indica a versão, por exemplo: v79 (ou usa --check-only)")

def run(cmd, label):
    print(f"\n== {label} ==", flush=True)
    if subprocess.run(cmd, cwd=ROOT).returncode != 0:
        sys.exit(f"\nFalhou: {label}. Não gerei o zip.")

TEXT_EXT = {".html", ".js", ".css", ".md", ".json"}
if not a.check_only:
    idx = (ROOT / "index.html").read_text(encoding="utf8")
    old = re.search(r"dia-crianca\.js\?v=([A-Za-z0-9_]+)", idx).group(1)
    new = datetime.date.today().strftime("%Y%m%d") + a.tag
    if new == old: sys.exit(f"A versão {new} já está carimbada.")
    n = 0
    for f in ROOT.rglob("*"):
        if f.is_file() and f.suffix in TEXT_EXT and f.name != "phaser.min.js" and "_dev" not in f.parts:
            s = f.read_text(encoding="utf8")
            if old in s: n += s.count(old); f.write_text(s.replace(old, new), encoding="utf8")
    print(f"Carimbo {old} → {new} ({n} substituições)")

run(["node", str(DEV / "check.mjs")], "verificações estáticas")
if not a.no_smoke: run([sys.executable, str(DEV / "smoke.py")], "teste de fumo (Chromium)")
if a.check_only: sys.exit(0)

out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
name = f"Missao_Ciberseguranca_{a.tag}" + (f"_{a.name}" if a.name else "") + ".zip"
zpath = out / name
if zpath.exists(): zpath.unlink()
with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
    for f in sorted(ROOT.rglob("*")):
        if f.is_file() and "__pycache__" not in f.parts and f.suffix != ".pyc": z.write(f, f.relative_to(ROOT).as_posix())
print(f"\nZip: {zpath} ({zpath.stat().st_size/1048576:.1f} MB)")
