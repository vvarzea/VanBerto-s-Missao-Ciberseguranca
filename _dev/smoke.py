#!/usr/bin/env python3
"""Teste de fumo do jogo num Chromium sem interface. Uso: python3 _dev/smoke.py [pasta]
Precisa de: pip install playwright && playwright install chromium (já existe no ambiente de trabalho).
Sai com código 1 se algum teste falhar."""
import functools, http.server, json, pathlib, re, sys, threading, time
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parent.parent).resolve()
STAMP = re.search(r"dia-crianca\.js\?v=([A-Za-z0-9_]+)", (ROOT / "index.html").read_text(encoding="utf8")).group(1)
ARGS = ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"]

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(ROOT)))
BASE = f"http://127.0.0.1:{srv.server_address[1]}"
threading.Thread(target=srv.serve_forever, daemon=True).start()

def new_page(browser, w=960, h=600, touch=False, reduced=False, route=None, errs=None, external=None):
    ctx = browser.new_context(viewport={"width": w, "height": h}, has_touch=touch, is_mobile=touch,
                              reduced_motion="reduce" if reduced else "no-preference")
    pg = ctx.new_page()
    def default_route(r):
        if r.request.url.startswith(BASE): r.continue_()
        else:
            if external is not None: external.append(r.request.url)
            r.abort()
    pg.route("**/*", route or default_route)
    if errs is not None:
        pg.on("pageerror", lambda e: errs.append("pageerror: " + str(e)))
        pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" and "ERR_FAILED" not in m.text else None)
    return pg

def to_level1(pg, diff="#btnDiffFacil", name="Teste"):
    pg.goto(BASE + "/index.html", wait_until="networkidle")
    pg.fill("#playerName", name); pg.press("#playerName", "Enter")
    pg.wait_for_selector(diff); pg.click(diff)
    pg.wait_for_selector("#mainStoryOverlay .btn.primary"); pg.click("#mainStoryOverlay .btn.primary")
    pg.wait_for_selector(".map-region--current"); pg.click(".map-region--current")
    pg.wait_for_selector(".level-node:not(.level-node--locked)")

def start_level(pg):
    pg.click(".level-node:not(.level-node--locked) >> nth=0")

def dismiss_cards(pg, rounds=6, wait=1100):
    for _ in range(rounds):
        pg.wait_for_timeout(wait)
        btn = pg.query_selector(".overlay:not(.hidden) .btn.primary")
        if btn:
            try: btn.click(timeout=800)
            except Exception: pass

RESULTS = []
def test(name):
    def deco(fn):
        t0 = time.time()
        try:
            detail = fn() or ""; RESULTS.append((name, True, detail))
        except Exception as e:
            RESULTS.append((name, False, f"{type(e).__name__}: {str(e)[:300]}"))
        print(("  ok   " if RESULTS[-1][1] else "  FALHA"), name, "—", RESULTS[-1][2], f"({time.time()-t0:.1f}s)", flush=True)
        return fn
    return deco

with sync_playwright() as p:
    B = p.chromium.launch(args=ARGS)

    @test("Arranque: Phaser local, fontes locais, sem pedidos externos nem erros")
    def _():
        errs, ext = [], []; pg = new_page(B, errs=errs, external=ext)
        pg.goto(BASE + "/index.html", wait_until="networkidle"); pg.wait_for_timeout(500)
        v = pg.evaluate("typeof Phaser!=='undefined' ? Phaser.VERSION : null")
        fonts = pg.evaluate("document.fonts.check(\"800 20px 'Baloo 2'\") && document.fonts.check(\"400 16px 'Nunito'\")")
        assert v, "Phaser não carregou"; assert fonts, "fontes locais não carregaram"
        assert not ext, f"pedidos externos: {ext[:3]}"; assert not errs, errs[:3]
        pg.context.close(); return f"Phaser {v}"

    @test("Carregamento: nível 1 arranca com poucas imagens e as outras chegam depois")
    def _():
        errs, imgs = [], []; pg = new_page(B, errs=errs)
        pg.on("response", lambda r: imgs.append((time.time(), r.url.split("/")[-1].split("?")[0], int(r.headers.get("content-length", "0")))) if ".jpg" in r.url else None)
        to_level1(pg); mark = len(imgs); start_level(pg)
        pg.wait_for_selector("canvas", timeout=20000); tc = time.time(); pg.wait_for_timeout(7000)
        new = imgs[mark:]; before = [i for i in new if i[0] <= tc]; later = [i for i in new if i[0] > tc]
        kb = sum(i[2] for i in before) / 1024
        assert len(before) <= 3 and kb < 900, f"{len(before)} imagens / {kb:.0f} KB antes de jogar"
        assert len(later) >= 10, f"só {len(later)} imagens em segundo plano"
        assert not errs, errs[:3]; pg.context.close()
        return f"{len(before)} imagens ({kb:.0f} KB) antes de jogar; {len(later)} depois"

    @test("Fundo em falta: se o 1.º pedido falhar, o jogo pede outra vez")
    def _():
        hits = {"n": 0}
        def route(r):
            u = r.request.url
            if not u.startswith(BASE): return r.abort()
            if u.split("?")[0].endswith("/mundo1_n1e2.jpg"):
                hits["n"] += 1
                if hits["n"] == 1: return r.abort()
            r.continue_()
        errs = []; pg = new_page(B, route=route, errs=errs)
        to_level1(pg); start_level(pg); dismiss_cards(pg, 5); pg.wait_for_timeout(2000)
        ok = pg.evaluate("window.__dc_game.textures.exists('bg_mundo1_n1e2')")
        assert ok and hits["n"] == 2, f"textura={ok}, pedidos={hits['n']}"; assert not errs, errs[:3]
        pg.context.close(); return "recuperou ao 2.º pedido"

    def quiz_case(diff_sel, expected, four):
        errs = []; pg = new_page(B, errs=errs); to_level1(pg, diff_sel); start_level(pg)
        dismiss_cards(pg, 6); pg.wait_for_timeout(1000)
        pg.evaluate("""async()=>{ const s=window.__dc_game.scene.scenes[0], kids=s.children.list;
          const pl=kids.find(c=>c.texture&&c.texture.key==='vanberto_open'), door=kids.find(c=>c.texture&&c.texture.key==='door_party');
          const items=kids.filter(c=>c.texture&&/^item_(estrela|medalha|chip)$/.test(c.texture.key)&&c.body);
          const sleep=ms=>new Promise(r=>setTimeout(r,ms));
          for(const it of items){ pl.body.reset(it.x,it.y); await sleep(120); }
          await sleep(700); pl.body.reset(door.x,door.y); await sleep(400); }""")
        for _ in range(14):
            if pg.query_selector("#quizOverlay:not(.hidden)"): break
            btn = pg.query_selector(".overlay:not(.hidden) .btn.primary")
            if btn:
                try: btn.click(timeout=800)
                except Exception: pass
            pg.wait_for_timeout(900)
        pg.wait_for_selector("#quizOverlay:not(.hidden)", timeout=3000); pg.wait_for_timeout(500)
        n = pg.evaluate("document.querySelectorAll('#quizAnswers .btn').length")
        cls = pg.evaluate("document.getElementById('quizAnswers').classList.contains('answers--four')")
        q = pg.evaluate("document.getElementById('quizQuestion').textContent")
        res = pg.evaluate("""async([q,stamp])=>{ const m=await import('./data-quiz.js?v='+stamp);
          for(const bank of [m.QUIZ_BY_THEME_AVANCADO,m.QUIZ_BY_THEME]) for(const t of Object.keys(bank)) for(const it of bank[t]) if(q.endsWith(it.q)){
            const c=it.a.find(x=>x.ok).t; const b=[...document.querySelectorAll('#quizAnswers .btn')].find(x=>x.textContent===c);
            if(b){b.click(); return 'ok';} return 'correta não está nos botões'; } return 'pergunta não encontrada'; }""", [q, STAMP])
        pg.wait_for_timeout(700); fb = pg.evaluate("document.getElementById('quizFeedback').textContent")
        assert n == expected and cls == four, f"{n} opções (esperado {expected}), classe four={cls}"
        assert res == "ok" and "Muito bem" in fb, f"{res}; feedback={fb!r}"; assert not errs, errs[:3]
        pg.context.close(); return f"{n} opções, resposta certa aceite"

    @test("Quiz Fácil: 3 opções")
    def _(): return quiz_case("#btnDiffFacil", 3, False)

    @test("Quiz Difícil: 4 opções")
    def _(): return quiz_case("#btnDiffDificil", 4, True)

    @test("Movimento reduzido: sem animações CSS nem abanões")
    def _():
        out = []
        for reduced in (False, True):
            errs = []; pg = new_page(B, reduced=reduced, errs=errs); to_level1(pg); start_level(pg)
            pg.wait_for_selector("canvas", timeout=15000); pg.wait_for_timeout(1200)
            anim = pg.evaluate("getComputedStyle(document.querySelector('.card')).animationDuration")
            noop = pg.evaluate("window.__dc_game.scene.scenes[0].cameras.main.shake.toString().length < 60")
            assert not errs, errs[:3]; assert noop == reduced, f"reduced={reduced}, shake desativado={noop}"
            out.append(f"{'reduzido' if reduced else 'normal'}: {anim}"); pg.context.close()
        return "; ".join(out)

    @test("HUD: o nome do jogador não tapa o Menu nem o texto do HUD")
    def _():
        bad = []
        for name, w, h, touch in [("960x600", 960, 600, False), ("1366x768", 1366, 768, False), ("844x390", 844, 390, True), ("640x360", 640, 360, True)]:
            pg = new_page(B, w, h, touch); to_level1(pg, name="Maria Isabel Santos!"); start_level(pg)
            pg.wait_for_selector("canvas", timeout=15000); dismiss_cards(pg, 5); pg.wait_for_timeout(800)
            r = pg.evaluate("""()=>{ const rc=e=>{const r=e.getBoundingClientRect(); return {l:r.left,t:r.top,r:r.right,b:r.bottom}};
              const badge=rc(document.getElementById('playerNameHtml')), menu=rc(document.getElementById('btnTeacherMenu'));
              const cv=document.querySelector('canvas').getBoundingClientRect(), sc=cv.width/960, s=window.__dc_game.scene.scenes[0];
              const hud=s.children.list.filter(c=>c.type==='Text'&&c.scrollFactorX===0&&c.text&&c.y<130&&c.x<400).map(c=>{const g=c.getBounds(); return {l:cv.left+g.x*sc,t:cv.top+g.y*sc,r:cv.left+(g.x+g.width)*sc,b:cv.top+(g.y+g.height)*sc}});
              const hit=(a,b)=>!(a.r<=b.l||b.r<=a.l||a.b<=b.t||b.b<=a.t);
              return {menu:hit(badge,menu), hud:hud.some(h=>hit(badge,h))}}""")
            if r["menu"] or r["hud"]: bad.append(f"{name}: menu={r['menu']} hud={r['hud']}")
            pg.context.close()
        assert not bad, "; ".join(bad); return "4 tamanhos de ecrã sem sobreposição"

    @test("Ecrãs do menu: o botão de fechar fica sempre à vista")
    def _():
        tiles = [("Mapa", "#btnOpenMap", "#btnCloseMap"), ("Conquistas", "#btnAchievements", "#btnCloseAchievements"),
                 ("Álbum", "#btnAlbum", "#btnCloseAlbum"), ("Estatísticas", "#btnStats", "#btnCloseStats"),
                 ("Opções", "#btnOptions", "#btnCloseOptions"), ("Como Jogar", "#btnHow", "#btnCloseHow")]
        bad = []
        for vname, w, h, touch in [("960x600", 960, 600, False), ("844x390", 844, 390, True), ("667x375", 667, 375, True)]:
            for tname, tile, close in tiles:
                pg = new_page(B, w, h, touch); pg.goto(BASE + "/index.html", wait_until="networkidle")
                pg.click(tile); pg.wait_for_timeout(600)
                r = pg.evaluate("""(sel)=>{const b=document.querySelector(sel).getBoundingClientRect();
                  return b.top>=0 && b.bottom<=innerHeight}""", close)
                if not r: bad.append(f"{tname}@{vname}")
                pg.context.close()
        assert not bad, "botão de fechar fora do ecrã: " + ", ".join(bad)
        return "6 ecrãs x 3 tamanhos"

    B.close()

srv.shutdown()
falhas = [r for r in RESULTS if not r[1]]
print(f"\nsmoke.py: {len(RESULTS)-len(falhas)}/{len(RESULTS)} testes passaram.")
sys.exit(1 if falhas else 0)
