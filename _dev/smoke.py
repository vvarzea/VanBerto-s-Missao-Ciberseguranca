#!/usr/bin/env python3
"""Teste de fumo do jogo num Chromium sem interface. Uso: python3 _dev/smoke.py [pasta] [--only="Nome1|Nome2"]
Precisa de: pip install playwright && playwright install chromium (já existe no ambiente de trabalho).
Sai com código 1 se algum teste falhar."""
import functools, http.server, json, pathlib, re, sys, threading, time
from playwright.sync_api import sync_playwright

_args = [a for a in sys.argv[1:] if not a.startswith("--")]
ONLY = next((a[len("--only="):].split("|") for a in sys.argv[1:] if a.startswith("--only=")), None)  # ex.: --only="Quiz Fácil|HUD"
ROOT = pathlib.Path(_args[0] if _args else pathlib.Path(__file__).resolve().parent.parent).resolve()
STAMP = re.search(r"dia-crianca\.js\?v=([A-Za-z0-9_]+)", (ROOT / "index.html").read_text(encoding="utf8")).group(1)
ARGS = ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"]

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(ROOT)))
BASE = f"http://127.0.0.1:{srv.server_address[1]}"
threading.Thread(target=srv.serve_forever, daemon=True).start()

def new_page(browser, w=960, h=600, touch=False, reduced=False, route=None, errs=None, external=None):
    # service_workers="block": estes testes interceptam pedidos com page.route, que não vê os pedidos tratados por um service worker.
    # O service worker tem testes próprios (abaixo).
    ctx = browser.new_context(viewport={"width": w, "height": h}, has_touch=touch, is_mobile=touch,
                              reduced_motion="reduce" if reduced else "no-preference", service_workers="block")
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
    try: pg.wait_for_selector(diff, state="visible", timeout=8000)
    except Exception:            # às vezes o Enter chega antes de o menu estar pronto: usa o botão «Nova Aventura»
        pg.click("#btnStart"); pg.wait_for_selector(diff, state="visible", timeout=15000)
    pg.click(diff)
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

def open_map(pg):
    """Abre o Mapa e espera pela região atual (repete o clique se o menu ainda não estiver pronto)."""
    for attempt in range(3):
        pg.click("#btnOpenMap")
        try: pg.wait_for_selector(".map-region--current", timeout=8000); return
        except Exception:
            if attempt == 2: raise

TELEPORT_JS = """async()=>{ const s=window.__dc_game.scene.scenes[0], kids=s.children.list;
          const pl=kids.find(c=>c.texture&&c.texture.key==='vanberto_open'), door=kids.find(c=>/^door/.test((c.texture||{}).key||''));
          const items=kids.filter(c=>c.texture&&/^item_(estrela|medalha|chip)$/.test(c.texture.key)&&c.body);
          const sleep=ms=>new Promise(r=>setTimeout(r,ms));
          for(const it of items){ pl.body.reset(it.x,it.y); await sleep(120); }
          await sleep(700); pl.body.reset(door.x,door.y); await sleep(400); }"""

def teleport_to_door(pg):
    """Apanha os itens do nível e vai ao portal. Repete se o nível ainda estiver a montar-se (evita falhas esporádicas)."""
    pg.wait_for_function("window.__dc_game.scene.scenes[0].children.list.some(c=>c.texture&&/^door/.test(c.texture.key))", timeout=20000)
    for attempt in range(4):
        pg.wait_for_timeout(800 if attempt == 0 else 1800)
        try:
            pg.evaluate(TELEPORT_JS)
            return
        except Exception:
            if attempt == 3: raise

IMG_RE = re.compile(r"\.(?:jpg|webp)(?:\?|$)")
def img_stem(url):
    """Nome do ficheiro de imagem sem extensão (os testes valem para .jpg e para .webp)."""
    return re.sub(r"\.(jpg|webp)$", "", url.split("/")[-1].split("?")[0])

RESULTS = []
def test(name):
    def deco(fn):
        if ONLY and not any(k in name for k in ONLY): return fn
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

    @test("Carregamento: nível 1 arranca com 2 imagens e depois só pede os 2 fundos seguintes")
    def _():
        errs, imgs = [], []; pg = new_page(B, errs=errs)
        pg.on("response", lambda r: imgs.append((time.time(), img_stem(r.url), int(r.headers.get("content-length", "0")))) if IMG_RE.search(r.url) else None)
        to_level1(pg); mark = len(imgs); start_level(pg)
        pg.wait_for_selector("canvas", timeout=20000); tc = time.time(); pg.wait_for_timeout(7000)
        new = imgs[mark:]; before = [i for i in new if i[0] <= tc]; later = [i for i in new if i[0] > tc]
        kb = sum(i[2] for i in before) / 1024
        assert len(before) <= 3 and kb < 900, f"{len(before)} imagens / {kb:.0f} KB antes de jogar"
        names = sorted(i[1] for i in later)
        assert names == ["mundo1_n3e4", "mundo1_n5"], f"em segundo plano deviam vir só os 2 fundos seguintes, vieram: {names}"
        assert not errs, errs[:3]; pg.context.close()
        return f"{len(before)} imagens ({kb:.0f} KB) antes de jogar; {len(later)} depois"

    @test("Carregamento a meio do jogo: começar no nível 10 pede só o seu fundo e os 2 seguintes")
    def _():
        errs, imgs = [], []; pg = new_page(B, errs=errs)
        pg.add_init_script("localStorage.setItem('vanbertos_ciberseguranca_save_v1', JSON.stringify({map:{highestLevelReached:9, levelsCompleted:[0,1,2,3,4,5,6,7,8]}}))")
        pg.on("response", lambda r: imgs.append((time.time(), img_stem(r.url))) if IMG_RE.search(r.url) else None)
        pg.goto(BASE + "/index.html", wait_until="networkidle")
        open_map(pg)   # «Mapa» (continua o progresso guardado; «Nova Aventura» recomeçava do nível 1)
        pg.click(".map-region--current")
        pg.wait_for_selector(".level-node--current"); mark = len(imgs); pg.click(".level-node--current")
        pg.wait_for_selector("canvas", timeout=20000); tc = time.time(); pg.wait_for_timeout(7000)
        new = imgs[mark:]; before = sorted(i[1] for i in new if i[0] <= tc); later = sorted(i[1] for i in new if i[0] > tc)
        assert before == ["mundo3_n10e11", "sala_secreta"], f"antes de jogar: {before}"
        assert later == ["mundo3_n12e13", "mundo3_n14e15"], f"depois: {later}"
        assert not errs, errs[:3]; pg.context.close(); return f"{before} e depois {later}"

    def complete_level(pg):
        """Apanha os itens, vai ao portal, responde certo ao quiz e carrega em Continuar (volta ao mapa)."""
        teleport_to_door(pg)
        for _ in range(16):
            if pg.query_selector("#quizOverlay:not(.hidden)"): break
            btn = pg.query_selector(".overlay:not(.hidden) .btn.primary")
            if btn:
                try: btn.click(timeout=700)
                except Exception: pass
            pg.wait_for_timeout(800)
        pg.wait_for_selector("#quizOverlay:not(.hidden)", timeout=4000); pg.wait_for_timeout(400)
        q = pg.evaluate("document.getElementById('quizQuestion').textContent")
        pg.evaluate("""async([q,stamp])=>{ const m=await import('./data-quiz.js?v='+stamp);
          for(const bank of [m.QUIZ_BY_THEME_AVANCADO,m.QUIZ_BY_THEME]) for(const t of Object.keys(bank)) for(const it of bank[t]) if(q.endsWith(it.q)){
            const c=it.a.find(x=>x.ok).t; const b=[...document.querySelectorAll('#quizAnswers .btn')].find(x=>x.textContent===c); if(b) b.click(); return; } }""", [q, STAMP])
        pg.wait_for_timeout(700); pg.click("#btnCloseQuiz")
        pg.wait_for_selector("#lcContinue", state="visible", timeout=15000); pg.wait_for_timeout(800); pg.click("#lcContinue")

    @test("Progressão: cada nível que começa pede os fundos seguintes (o do mundo 2 só ao chegar ao nível 3)")
    def _():
        errs, imgs = [], []; pg = new_page(B, errs=errs)
        pg.on("response", lambda r: imgs.append(img_stem(r.url)) if IMG_RE.search(r.url) and "/map-" not in r.url else None)
        to_level1(pg); start_level(pg); pg.wait_for_selector("canvas", timeout=15000); dismiss_cards(pg, 5)
        seen = []
        for n in (1, 2, 3):
            complete_level(pg)
            pg.wait_for_selector(".level-node--current", state="visible", timeout=15000); pg.wait_for_timeout(800)
            pg.click(".level-node--current"); pg.wait_for_selector("canvas"); dismiss_cards(pg, 6); pg.wait_for_timeout(2500)
            seen.append(sorted(set(imgs)))
        # seen[0] = com o nível 2 a começar, seen[1] = nível 3, seen[2] = nível 4
        assert "mundo2_n6" not in seen[0], f"pediu o fundo do mundo 2 cedo demais: {seen[0]}"
        assert "mundo2_n6" in seen[1], f"não pediu o fundo seguinte ao chegar ao nível 3: {seen[1]}"
        assert "mundo2_n7" not in seen[2], f"pediu fundos a mais: {seen[2]}"
        assert not errs, errs[:3]; pg.context.close(); return f"até ao nível 4 só {len(seen[2])} imagens no total"

    def open_victory(save):
        """Abre o ecrã de Vitória com um jogo guardado à medida (globalStats/estrelas). Devolve (página, erros)."""
        errs = []; pg = new_page(B, errs=errs)
        pg.add_init_script("localStorage.setItem('vanbertos_ciberseguranca_save_v1', %s)" % json.dumps(json.dumps(save)))
        pg.goto(BASE + "/index.html", wait_until="networkidle")
        open_map(pg); pg.click(".map-region--current")
        pg.wait_for_selector(".level-node--current"); pg.click(".level-node--current"); pg.wait_for_selector("canvas", timeout=15000)
        dismiss_cards(pg, 5); pg.wait_for_timeout(800)
        pg.evaluate("window.__vb_showVictory()")
        for _ in range(30):   # o cartão do nível pode aparecer por cima da galeria; a galeria só mostra o botão no fim da animação
            if pg.query_selector("#winOverlay:not(.hidden)"): break
            for sel in ("#historyOverlay:not(.hidden) .btn.primary", "#btnAgContinue"):
                b = pg.query_selector(sel)
                if b and b.is_visible():
                    try: b.click(timeout=700)
                    except Exception: pass
            pg.wait_for_timeout(800)
        pg.wait_for_selector("#winOverlay:not(.hidden)", timeout=5000)
        return pg, errs

    def read_win_and_cert(pg):
        txt = lambda sel: pg.evaluate("(s)=>document.querySelector(s).textContent.trim()", sel)
        win = {"score": int(txt("#winScore")), "pct": txt("#winPct"), "medal": txt("#winMedal")}
        pg.click("#btnWinCertificate"); pg.wait_for_selector("#certificateOverlay:not(.hidden)")
        cert = {"score": int(txt("#certScore")), "pct": txt("#certCorrect"), "medal": txt("#certMedal")}
        m = re.search(r"\((\d+)%\)|^(\d+)%", win["pct"]); win_pct = int(m.group(1) or m.group(2))
        return win, cert, win_pct

    MEDAL_PAIRS = {"Ouro": ("Perfeito", "Excelente"), "Prata": ("Muito bom",), "Bronze": ("Bom",), "continua a treinar": ("A Melhorar",)}

    @test("Certificado de Progresso: sem terminar os 20 níveis, o ☰ Menu mostra o progresso (não 'Oficial'), a percentagem é justa e sem botão de reiniciar")
    def _():
        # Pedido da Vanda: os alunos jogam cada um no seu computador — o certificado deixou de
        # exigir terminar o jogo, para um aluno poder levar o que já fez até ao fim da aula.
        save = {"map": {"levelsCompleted": [0, 1, 2], "highestLevelReached": 3},
                "globalStats": {"quizTotal": 3, "quizCorrect": 3, "totalScoreEarned": 300},
                "stars": {str(i): {"allItems": True, "noDamage": True, "firstTry": True} for i in range(3)}}
        errs = []; pg = new_page(B, errs=errs)
        pg.add_init_script("localStorage.setItem('vanbertos_ciberseguranca_save_v1', %s)" % json.dumps(json.dumps(save)))
        pg.goto(BASE + "/index.html", wait_until="networkidle")
        open_map(pg); pg.click(".map-region--current")
        pg.wait_for_selector(".level-node--current"); pg.click(".level-node--current"); pg.wait_for_selector("canvas", timeout=15000)
        # Não dispensa o cartão «Sabias que…?»: serve também para testar que o certificado fica por
        # cima dele (mesma proteção da Base do «Cartão «Sabias que…?»» — ver _SUB_OVERLAY_IDS).
        pg.wait_for_selector("#historyOverlay:not(.hidden)", timeout=15000); pg.wait_for_timeout(400)
        pg.click("#btnTeacherMenu"); pg.click("#mBtnCertificate"); pg.wait_for_selector("#certificateOverlay:not(.hidden)"); pg.wait_for_timeout(400)
        on_top = pg.evaluate("""()=>{const r=document.querySelector('#certificateOverlay .card').getBoundingClientRect();
          const el=document.elementFromPoint(r.left+r.width/2, r.top+r.height/2); return !!(el && el.closest('#certificateOverlay'))}""")
        assert on_top, "o certificado não ficou por cima do cartão «Sabias que…?»"
        txt = lambda sel: pg.evaluate("(s)=>document.querySelector(s).textContent.trim()", sel)
        title, subtitle, pct = txt("#certTitle"), txt("#certSubtitle"), txt("#certCorrect")
        assert title == "Certificado de Progresso", f"título: {title!r}"
        assert "3 de 20 níveis" in subtitle, f"subtítulo: {subtitle!r}"
        # SEM o ajuste ao denominador (ver comentário em showCertificate), isto dava 15% (3 acertos
        # sobre os 20 níveis todos) em vez de 100% (3 acertos sobre os 3 níveis já jogados) — o
        # aluno via uma nota injustamente baixa só por não ter terminado.
        assert pct == "100%", f"percentagem devia refletir só os níveis já jogados (100%), veio {pct}"
        assert "hidden" in (pg.get_attribute("#btnCertRestart", "class") or ""), "«Jogar de novo» devia estar escondido a meio da aventura"
        pg.click("#btnCertBack"); pg.wait_for_timeout(400)
        assert pg.evaluate("document.getElementById('certificateOverlay').classList.contains('hidden')"), "«Voltar» não fechou o certificado"
        assert pg.evaluate("document.getElementById('winOverlay').classList.contains('hidden')"), "«Voltar» a meio do jogo não devia mostrar o ecrã de vitória"
        assert pg.evaluate("document.body.classList.contains('game-started')"), "o jogo devia continuar em curso depois de «Voltar»"
        assert not errs, errs[:3]; pg.context.close()
        return "título/percentagem corretos a meio da aventura; certificado por cima do cartão; «Voltar» resume o jogo"

    @test("Certificado ao terminar os 20 níveis: o ☰ Menu mostra 'Oficial' (não 'Progresso') e o botão de reiniciar")
    def _():
        save = {"map": {"levelsCompleted": list(range(20)), "highestLevelReached": 19},
                "globalStats": {"quizTotal": 20, "quizCorrect": 20, "totalScoreEarned": 6000},
                "stars": {str(i): {"allItems": True, "noDamage": True, "firstTry": True} for i in range(20)}}
        errs = []; pg = new_page(B, errs=errs)
        pg.add_init_script("localStorage.setItem('vanbertos_ciberseguranca_save_v1', %s)" % json.dumps(json.dumps(save)))
        pg.goto(BASE + "/index.html", wait_until="networkidle")
        # Com os 20 níveis completos, nenhuma região fica "--current" (todas passam a "--done") — ao
        # contrário do teste de progresso acima, aqui entra-se por uma região "--done" (o Mapa continua
        # a deixar repetir níveis já feitos).
        pg.click("#btnOpenMap"); pg.wait_for_selector(".map-region--done")
        pg.click(".map-region--done >> nth=0"); pg.wait_for_selector(".level-node:not(.level-node--locked)")
        pg.click(".level-node:not(.level-node--locked) >> nth=0")
        pg.wait_for_selector("canvas", timeout=15000); dismiss_cards(pg, 5); pg.wait_for_timeout(800)
        pg.click("#btnTeacherMenu"); pg.click("#mBtnCertificate"); pg.wait_for_selector("#certificateOverlay:not(.hidden)"); pg.wait_for_timeout(400)
        title = pg.evaluate("document.getElementById('certTitle').textContent.trim()")
        assert title == "Certificado Oficial", f"título: {title!r}"
        assert "hidden" not in (pg.get_attribute("#btnCertRestart", "class") or ""), "«Jogar de novo» devia estar visível depois de terminar"
        assert not errs, errs[:3]; pg.context.close()
        return "título 'Certificado Oficial' e botão de reiniciar visível quando os 20 níveis estão feitos"

    @test("Vitória e Certificado: mesmos pontos, mesma percentagem, medalhas coerentes e erros de toda a aventura")
    def _():
        save = {"globalStats": {"quizTotal": 27, "quizCorrect": 17, "quizWrong": 10, "totalScoreEarned": 10225, "quizErrors": [
                    {"level": "Nível 3", "theme": "phishing", "q": "O que é o phishing?", "wrong": "Um programa que protege as contas", "correct": "Tentar enganar alguém para lhe roubar dados"},
                    {"level": "Nível 7", "theme": "phishing", "q": "Como reconhecer phishing?", "wrong": "A", "correct": "B"},
                    {"level": "Nível 19", "theme": "direitos_digitais", "q": "O que são direitos digitais?", "wrong": "C", "correct": "D"}]},
                "stars": {str(i): {"allItems": True, "noDamage": i < 14, "firstTry": i < 14} for i in range(20)}}
        pg, errs = open_victory(save)
        rows = pg.evaluate("[...document.querySelectorAll('#winThemeTable tr')].slice(1).map(r=>parseInt(r.children[1].textContent))")
        btn_txt = pg.evaluate("document.getElementById('btnReviewMode').textContent.trim()")
        note = pg.evaluate("(document.getElementById('winErrorsNote')||{}).textContent||''")
        pg.click("#btnReviewMode"); pg.wait_for_selector("#reviewOverlay:not(.hidden)")
        n_review = pg.evaluate("document.querySelectorAll('#reviewList .review-question').length")
        pg.click("#btnCloseReview"); pg.wait_for_selector("#winOverlay:not(.hidden)")
        win, cert, pct_win = read_win_and_cert(pg)
        assert win["score"] == cert["score"] >= 10225, f"pontos: vitória={win['score']} certificado={cert['score']}"
        assert f"{pct_win}%" == cert["pct"], f"percentagem: vitória={win['pct']} certificado={cert['pct']}"
        assert win["pct"] == "17/27 (63%)", f"fração esperada 17/27 (63%), veio {win['pct']}"
        w = next(k for k in MEDAL_PAIRS if k in win["medal"])
        assert any(c in cert["medal"] for c in MEDAL_PAIRS[w]), f"medalhas incoerentes: {win['medal']} / {cert['medal']}"
        assert sum(rows) == 3 and btn_txt.startswith("📋 Ver 3 erros") and n_review == 3, f"erros: tabela={rows}, botão={btn_txt!r}, revisão={n_review}"
        assert "faltam 7 de 10" in note, f"nota sobre erros antigos: {note!r}"
        assert not errs, errs[:3]; pg.context.close()
        return f"{win['score']} pontos, {win['pct']}, {win['medal']} / {cert['medal']}; 3 erros listados + nota dos 7 anteriores"

    @test("Vitória e Certificado com poucos acertos: «A Melhorar» nas duas telas")
    def _():
        save = {"globalStats": {"quizTotal": 27, "quizCorrect": 10, "quizWrong": 17, "totalScoreEarned": 3000, "quizErrors": []},
                "stars": {str(i): {"allItems": True, "noDamage": False, "firstTry": i < 5} for i in range(20)}}
        pg, errs = open_victory(save)
        win, cert, pct_win = read_win_and_cert(pg)
        assert f"{pct_win}%" == cert["pct"] and pct_win < 60, f"percentagens: vitória={win['pct']} certificado={cert['pct']}"
        assert "continua a treinar" in win["medal"] and "A Melhorar" in cert["medal"], f"medalhas: {win['medal']} / {cert['medal']}"
        assert win["score"] == cert["score"], f"pontos: {win['score']} / {cert['score']}"
        assert not errs, errs[:3]; pg.context.close()
        return f"{win['pct']} → {win['medal']} / {cert['medal']}"

    CACHE_READY_JS = """async(name)=>{ await navigator.serviceWorker.ready;
      for(let i=0;i<80;i++){ const ks=await caches.keys();
        if(ks.length===1 && ks[0]===name){ const c=await caches.open(name); if((await c.keys()).length>=30) return ks; }
        await new Promise(r=>setTimeout(r,500)); }
      return await caches.keys(); }"""

    @test("Offline: depois da 1.ª visita o jogo abre e arranca sem rede")
    def _():
        errs, failed = [], []
        ctx = B.new_context(viewport={"width": 960, "height": 600}, service_workers="allow"); pg = ctx.new_page()
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("requestfailed", lambda r: failed.append(r.url) if r.url.startswith(BASE) else None)
        pg.goto(BASE + "/index.html", wait_until="networkidle")
        ks = pg.evaluate(CACHE_READY_JS, "vanbertos-" + STAMP)
        assert ks == ["vanbertos-" + STAMP], f"cache do service worker: {ks}"
        to_level1(pg); start_level(pg); pg.wait_for_selector("canvas", timeout=15000)
        pg.wait_for_timeout(5000)                       # dá tempo aos fundos seguintes para ficarem em cache
        ctx.set_offline(True)
        to_level1(pg); start_level(pg); pg.wait_for_selector("canvas", timeout=15000); pg.wait_for_timeout(2500)
        ok = pg.evaluate("({sw: !!navigator.serviceWorker.controller, phaser: typeof Phaser!=='undefined', font: document.fonts.check(\"800 20px 'Baloo 2'\"), bg: window.__dc_game.textures.exists('bg_mundo1_n1e2')})")
        assert all(ok.values()), f"sem rede: {ok}"
        assert not failed, f"pedidos locais falhados sem rede: {sorted(set(failed))[:4]}"
        assert not errs, errs[:3]; ctx.close()
        return "jogo carregado da cache, com fundo do nível 1 e sem pedidos falhados"

    @test("Atualização: uma versão nova substitui a cache antiga e carrega os ficheiros novos")
    def _():
        import shutil, tempfile
        tmp = pathlib.Path(tempfile.mkdtemp()); dst = tmp / "g"
        shutil.copytree(ROOT, dst, ignore=shutil.ignore_patterns("_dev", "__pycache__"))
        srv2 = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(dst)))
        threading.Thread(target=srv2.serve_forever, daemon=True).start(); base2 = f"http://127.0.0.1:{srv2.server_address[1]}"
        NEW = "TESTE" + str(len(STAMP)); errs = []  # não pode conter STAMP (senão os testes de «não há URLs antigos» enganam-se)
        try:
            ctx = B.new_context(service_workers="allow"); pg = ctx.new_page()
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.goto(base2 + "/index.html", wait_until="networkidle")
            ks = pg.evaluate(CACHE_READY_JS, "vanbertos-" + STAMP); assert ks == ["vanbertos-" + STAMP], f"antes: {ks}"
            for f in dst.rglob("*"):                    # simula o release.py: nova string em todo o lado
                if f.is_file() and f.suffix in (".html", ".js") and f.name != "phaser.min.js":
                    s = f.read_text(encoding="utf8")
                    if STAMP in s: f.write_text(s.replace(STAMP, NEW), encoding="utf8")
            pg.reload(wait_until="networkidle")
            ks = pg.evaluate(CACHE_READY_JS, "vanbertos-" + NEW); assert ks == ["vanbertos-" + NEW], f"depois: {ks}"
            urls = pg.evaluate("performance.getEntriesByType('resource').map(r=>r.name)")
            assert any("v=" + NEW in u for u in urls), "a página não carregou os ficheiros da versão nova"
            assert not any("v=" + STAMP in u for u in urls), "a página ainda carregou ficheiros da versão antiga"
            assert not errs, errs[:3]; ctx.close()
        finally:
            srv2.shutdown(); shutil.rmtree(tmp, ignore_errors=True)
        return "cache antiga apagada, página com a versão nova"

    @test("Botão «Guardar tudo»: descarrega os fundos todos e o jogo funciona sem rede em qualquer nível")
    def _():
        errs = []
        ctx = B.new_context(viewport={"width": 960, "height": 600}, service_workers="allow"); pg = ctx.new_page()
        pg.on("pageerror", lambda e: errs.append(str(e)))
        # nível 20 já desbloqueado, mas cujo fundo NUNCA foi pedido nesta sessão (não passa pelos 20 níveis a jogar)
        save = {"map": {"highestLevelReached": 19, "levelsCompleted": list(range(19))}}
        pg.add_init_script("localStorage.setItem('vanbertos_ciberseguranca_save_v1', %s)" % json.dumps(json.dumps(save)))
        pg.goto(BASE + "/index.html", wait_until="networkidle")
        pg.wait_for_function("navigator.serviceWorker.controller", timeout=15000)
        pg.click("#btnOptions"); pg.wait_for_selector("#optionsOverlay:not(.hidden)")
        assert pg.evaluate("getComputedStyle(document.getElementById('optionsOfflineSection')).display") != "none", "secção «Jogar sem rede» escondida com service worker ativo"
        pg.click("#optBtnDownloadAll")
        pg.wait_for_function("document.getElementById('offlineDownloadStatus').textContent.length>0", timeout=30000)
        status = pg.evaluate("document.getElementById('offlineDownloadStatus').textContent")
        assert "Tudo guardado" in status, f"estado inesperado: {status!r}"
        n = pg.evaluate(r"(name)=>caches.open(name).then(c=>c.keys()).then(ks=>ks.filter(k=>/\.webp$/.test(k.url)).length)", "vanbertos-" + STAMP)
        assert n == 18, f"fundos em cache: {n} (esperava 18)"
        pg.click("#btnCloseOptions"); ctx.set_offline(True)
        open_map(pg); pg.click(".map-region--current"); pg.wait_for_selector(".level-node--current"); pg.click(".level-node--current")
        pg.wait_for_selector("canvas", timeout=15000); pg.wait_for_timeout(2000)
        ok = pg.evaluate("window.__dc_game.textures.exists('bg_mundo4_n20')")
        assert ok, "fundo do nível 20 não disponível offline, apesar de «Guardar tudo»"
        assert not errs, errs[:3]; ctx.close()
        return "18 fundos guardados; nível 20 (nunca jogado) tem fundo mesmo sem rede"

    @test("Erro inesperado: mostra a rede de segurança, sem perder o progresso guardado")
    def _():
        pg = new_page(B)  # SEM errs=[] de propósito: um erro é esperado aqui, não é para falhar o teste
        pg.goto(BASE + "/index.html", wait_until="networkidle")
        pg.fill("#playerName", "Zé"); pg.press("#playerName", "Enter")
        pg.wait_for_selector("#btnDiffFacil"); pg.click("#btnDiffFacil")  # progresso: dificuldade escolhida, guardada no localStorage
        assert not pg.is_visible("#fatalErrorOverlay"), "a rede de segurança já estava visível antes de haver erro"
        pg.evaluate("window.__vb_triggerFatalError()")
        pg.wait_for_selector("#fatalErrorOverlay", state="visible", timeout=3000)
        assert "Ups" in pg.evaluate("document.getElementById('fatalErrorOverlay').textContent")
        before = pg.evaluate("localStorage.getItem('vanbertos_ciberseguranca_save_v1')")
        assert before and "facil" in before, f"o progresso não estava guardado antes de recarregar: {before!r}"
        pg.click("#btnFatalReload"); pg.wait_for_load_state("networkidle")
        assert not pg.is_visible("#fatalErrorOverlay"), "a rede de segurança ficou visível depois de recarregar, sem novo erro"
        after = pg.evaluate("localStorage.getItem('vanbertos_ciberseguranca_save_v1')")
        assert after == before, "o progresso mudou só por ter recarregado depois de um erro"
        pg.context.close(); return "overlay apareceu, «Recarregar» funcionou e o progresso manteve-se"

    @test("Fundo em falta: se o 1.º pedido falhar, o jogo pede outra vez")
    def _():
        hits = {"n": 0}
        def route(r):
            u = r.request.url
            if not u.startswith(BASE): return r.abort()
            if re.search(r"/mundo1_n1e2\.(jpg|webp)$", u.split("?")[0]):
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
        teleport_to_door(pg)
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

    def reach_level_quiz(pg):
        """Do arranque até ao 1.º quiz do nível 1 (teleporta para o portal e dispensa os cartões)."""
        start_level(pg); dismiss_cards(pg, 6); pg.wait_for_timeout(1000); teleport_to_door(pg)
        for _ in range(14):
            if pg.query_selector("#quizOverlay:not(.hidden)"): break
            btn = pg.query_selector(".overlay:not(.hidden) .btn.primary")
            if btn:
                try: btn.click(timeout=800)
                except Exception: pass
            pg.wait_for_timeout(900)
        pg.wait_for_selector("#quizOverlay:not(.hidden)", timeout=3000); pg.wait_for_timeout(500)

    ANSWER_JS = """async([q,stamp,wantCorrect])=>{ const m=await import('./data-quiz.js?v='+stamp);
      for(const bank of [m.QUIZ_BY_THEME_AVANCADO,m.QUIZ_BY_THEME]) for(const t of Object.keys(bank)) for(const it of bank[t]) if(q.endsWith(it.q)){
        const c=it.a.find(x=>x.ok).t; const btns=[...document.querySelectorAll('#quizAnswers .btn')];
        const b=wantCorrect ? btns.find(x=>x.textContent===c) : btns.find(x=>x.textContent!==c);
        if(b){ b.click(); return 'ok'; } return 'botão não encontrado'; } return 'pergunta não encontrada'; }"""

    @test("Revisão dos erros: uma pergunta falhada há ≥2 níveis volta como «Revisão rápida» antes do quiz do nível e sai da lista ao acertar")
    def _():
        errs = []; pg = new_page(B, errs=errs); to_level1(pg)
        q = pg.evaluate("""async(stamp)=>{ const m=await import('./data-quiz.js?v='+stamp); return m.QUIZ_BY_THEME['palavras_passe'][0].q; }""", STAMP)
        pg.evaluate("(q)=>window.__vb_quizReview.seed({q, theme:'palavras_passe', at:-5})", q)
        reach_level_quiz(pg)
        shown = pg.evaluate("document.getElementById('quizQuestion').textContent")
        assert "Revisão rápida" in shown and q in shown, f"1.º ecrã do quiz não é a revisão: {shown[:80]!r}"
        STATS_JS = "(()=>{const g=JSON.parse(localStorage.getItem('vanbertos_ciberseguranca_save_v1')).globalStats||{}; return [g.quizTotal||0,g.quizCorrect||0,g.quizWrong||0]})()"
        stats0 = pg.evaluate(STATS_JS)
        res = pg.evaluate(ANSWER_JS, [shown, STAMP, True]); assert res == "ok", res
        pg.wait_for_timeout(300)
        fb = pg.evaluate("document.getElementById('quizFeedback').textContent"); assert "Boa" in fb, fb
        assert pg.evaluate("window.__vb_quizReview.queue().length") == 0, "acertar devia tirar a pergunta da lista"
        assert pg.evaluate(STATS_JS) == stats0, "a revisão não devia contar para as estatísticas do quiz"
        pg.click("#btnCloseQuiz"); pg.wait_for_timeout(600)
        nxt = pg.evaluate("document.getElementById('quizQuestion').textContent")
        assert "Revisão rápida" not in nxt and nxt.strip(), f"depois da revisão devia vir o quiz normal: {nxt[:80]!r}"
        n = pg.evaluate("document.querySelectorAll('#quizAnswers .btn:not(:disabled)').length"); assert n == 3, f"{n} opções no quiz normal"
        assert not errs, errs[:3]; pg.context.close()
        return "revisão à frente do quiz normal; acertar remove-a; quiz normal segue com 3 opções"

    @test("Revisão dos erros: não aparece cedo demais, e um erro à 1.ª tentativa fica registado para mais tarde")
    def _():
        errs = []; pg = new_page(B, errs=errs); to_level1(pg)
        q = pg.evaluate("""async(stamp)=>{ const m=await import('./data-quiz.js?v='+stamp); return m.QUIZ_BY_THEME['palavras_passe'][0].q; }""", STAMP)
        pg.evaluate("(q)=>window.__vb_quizReview.seed({q, theme:'palavras_passe', at:0})", q)   # falhada neste mesmo nível: ainda não vence
        reach_level_quiz(pg)
        shown = pg.evaluate("document.getElementById('quizQuestion').textContent")
        assert "Revisão rápida" not in shown, "a revisão apareceu no próprio nível em que foi falhada"
        res = pg.evaluate(ANSWER_JS, [shown, STAMP, False]); assert res == "ok", res
        pg.wait_for_timeout(400)
        queue = pg.evaluate("window.__vb_quizReview.queue()")
        assert len(queue) == 2 and queue[1]["at"] == 0 and queue[1]["theme"] != "palavras_passe", f"lista: {queue}"
        saved = pg.evaluate("JSON.parse(localStorage.getItem('vanbertos_ciberseguranca_save_v1')).quizReview.queue.length")
        assert saved == 2, f"a lista não ficou guardada (guardadas: {saved})"
        assert not errs, errs[:3]; pg.context.close()
        return "sem revisão no mesmo nível; o erro ficou na lista (e guardado no localStorage)"

    @test("Revisão dos erros: falhar a última revisão permitida também tira a pergunta da lista (ninguém fica preso)")
    def _():
        errs = []; pg = new_page(B, errs=errs); to_level1(pg)
        q = pg.evaluate("""async(stamp)=>{ const m=await import('./data-quiz.js?v='+stamp); return m.QUIZ_BY_THEME['palavras_passe'][0].q; }""", STAMP)
        pg.evaluate("(q)=>window.__vb_quizReview.seed({q, theme:'palavras_passe', at:-5, tries:1})", q)
        reach_level_quiz(pg)
        shown = pg.evaluate("document.getElementById('quizQuestion').textContent"); assert "Revisão rápida" in shown, shown[:80]
        res = pg.evaluate(ANSWER_JS, [shown, STAMP, False]); assert res == "ok", res
        pg.wait_for_timeout(300)
        fb = pg.evaluate("document.getElementById('quizFeedback').textContent"); assert "resposta certa era" in fb, fb
        assert pg.evaluate("window.__vb_quizReview.queue().length") == 0, "2.ª revisão falhada devia tirar a pergunta da lista"
        pg.click("#btnCloseQuiz"); pg.wait_for_timeout(600)
        nxt = pg.evaluate("document.getElementById('quizQuestion').textContent"); assert "Revisão rápida" not in nxt and nxt.strip(), nxt[:80]
        assert not errs, errs[:3]; pg.context.close()
        return "falhou a 2.ª revisão → sai da lista e o quiz normal segue"

    @test("Bosses: os 4 combates arrancam, correm 5 s com todos os ataques ativos, e a derrota leva ao quiz do boss")
    def _():
        # Os bosses são ~1/3 do código do jogo e nenhum outro teste passa por lá: um nome mal ligado ao dividir o
        # ficheiro só rebentaria a meio de um combate, com uma criança a jogar.
        errs = []; pg = new_page(B, 960, 600, False, errs=errs); to_level1(pg); start_level(pg)
        pg.wait_for_selector("canvas", timeout=15000); dismiss_cards(pg, 6); pg.wait_for_timeout(800)
        seen = []
        for after in (4, 8, 14, 19):
            pg.evaluate("(a)=>window.__vb_test.startBoss(a)", after)
            for _ in range(40):                                # cinemática de entrada: dispensa cartões até o combate arrancar
                if pg.evaluate("window.__vb_test.inBossFight() && !!window.__vb_test.boss()"): break
                btn = pg.query_selector(".overlay:not(.hidden) .btn.primary, #cineSkip, .cine-skip")
                if btn:
                    try: btn.click(timeout=500)
                    except Exception: pass
                pg.wait_for_timeout(500)
            info = pg.evaluate("window.__vb_test.boss()"); assert info, f"boss após o nível {after} não arrancou"
            seen.append(info["id"])
            for _ in range(5):                                 # 5 s de combate: ataques, zonas tóxicas, pop-ups, etc.
                pg.evaluate("window.__vb_test.keepAlive()"); pg.wait_for_timeout(1000)
            hits = 0
            for _ in range(info["max"] + 2):                   # derrota: tira-lhe toda a vida (fases, fúria, últimos golpes)
                if pg.evaluate("window.__vb_test.hitBoss()"): hits += 1
                pg.evaluate("window.__vb_test.keepAlive()"); pg.wait_for_timeout(1300)
                left = pg.evaluate("window.__vb_test.boss()")
                if not left or left["hp"] <= 0: break
            for _ in range(60):                                # depois da derrota: quiz do boss (ou coleta de itens, conforme o boss)
                if pg.query_selector("#quizOverlay:not(.hidden)"): break
                pg.evaluate("window.__vb_test.keepAlive()"); pg.wait_for_timeout(700)
                btn = pg.query_selector(".overlay:not(.hidden):not(#quizOverlay) .btn.primary")
                if btn:
                    try: btn.click(timeout=500)
                    except Exception: pass
            assert pg.query_selector("#quizOverlay:not(.hidden)"), f"{info['id']}: depois da derrota não apareceu o quiz do boss (golpes dados: {hits})"
            q = pg.evaluate("document.getElementById('quizQuestion').textContent")
            res = pg.evaluate(ANSWER_JS, [q, STAMP, True]); assert res == "ok", f"{info['id']}: {res}"
            pg.wait_for_timeout(600)
            for _ in range(14):                                # fecha o quiz e o que vier a seguir (portal, cartões)
                pg.evaluate("window.__vb_test.keepAlive()")
                btn = pg.query_selector("#btnCloseQuiz:not(.hidden)") or pg.query_selector(".overlay:not(.hidden) .btn.primary")
                if btn:
                    try: btn.click(timeout=500)
                    except Exception: pass
                pg.wait_for_timeout(700)
            assert not errs, f"{info['id']}: {errs[:3]}"
            # volta a um nível normal para o combate seguinte partir de um estado limpo
            pg.evaluate("document.querySelectorAll('.overlay:not(.hidden)').forEach(e=>{ if(e.id!=='mapOverlay') e.classList.add('hidden'); })")
        pg.context.close()
        return "4 bosses: " + ", ".join(seen)

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

    @test("Opções: a secção «Jogar sem rede» não fica escondida atrás do rodapé fixo")
    def _():
        pg = new_page(B, 960, 600); pg.goto(BASE + "/index.html", wait_until="networkidle")
        pg.click("#btnOptions"); pg.wait_for_selector("#optionsOverlay:not(.hidden)"); pg.wait_for_timeout(300)
        r = pg.evaluate("""()=>{const rc=e=>e.getBoundingClientRect();
          const row=rc(document.querySelector('#optionsOverlay .row')), off=rc(document.getElementById('optionsOfflineSection'));
          return {overlap: !(off.bottom<=row.top || off.top>=row.bottom)}}""")
        assert not r["overlap"], "a secção «Jogar sem rede» sobrepõe-se ao rodapé fixo"
        pg.context.close(); return "sem sobreposição"

    @test("Menu inicial: em telemóvel na vertical, nenhum botão fica maior do que devia (item solto na grelha)")
    def _():
        bad = []
        for w, h in [(360, 780), (375, 812), (393, 851), (412, 915), (430, 932)]:
            pg = new_page(B, w, h, touch=True); pg.goto(BASE + "/index.html", wait_until="networkidle"); pg.wait_for_timeout(300)
            r = pg.evaluate("""()=>{const g=document.querySelector('.main-menu-grid'); const kids=[...g.children].filter(k=>!k.classList.contains('primary') && getComputedStyle(k).display!=='none');
              const widths=kids.map(k=>Math.round(k.getBoundingClientRect().width)); const maxW=Math.max(...widths), minW=Math.min(...widths);
              return {maxW, minW, cardW:Math.round(document.querySelector('#startOverlay .card').getBoundingClientRect().width)}}""")
            if r["maxW"] - r["minW"] > 4 or r["maxW"] > r["cardW"] * 0.7:
                bad.append(f"{w}x{h} (tiles entre {r['minW']} e {r['maxW']}px, cartão {r['cardW']}px)")
            pg.context.close()
        assert not bad, "botão(ões) fora do tamanho esperado: " + "; ".join(bad)
        return "5 larguras de telemóvel, todos os botões do mesmo tamanho"

    @test("Menu inicial: em telemóvel na vertical cabe inteiro (sem scroll), com a linha de Som/Ecrã todo à vista e sem «Sair»")
    def _():
        bad = []
        for w, h in [(360, 640), (375, 667), (360, 740), (412, 742), (390, 844), (430, 932)]:
            pg = new_page(B, w, h, touch=True); pg.goto(BASE + "/index.html", wait_until="networkidle"); pg.wait_for_timeout(300)
            r = pg.evaluate("""()=>{const c=document.querySelector('#startOverlay .card');
              const fs=document.getElementById('btnFullscreen').getBoundingClientRect();
              return {over:c.scrollHeight-c.clientHeight, fsBottom:Math.round(fs.bottom), vh:innerHeight,
                      exit:getComputedStyle(document.getElementById('btnExitGame')).display}}""")
            if r["over"] > 1 or r["fsBottom"] > r["vh"] or r["exit"] != "none":
                bad.append(f"{w}x{h} (scroll +{r['over']}px, «Ecrã todo» termina em {r['fsBottom']}px, «Sair» {r['exit']})")
            pg.context.close()
        assert not bad, "menu inicial em telemóvel na vertical: " + "; ".join(bad)
        return "6 tamanhos, tudo à vista sem deslizar"

    @test("Etiqueta de versão: visível no menu inicial e igual à string ?v= publicada")
    def _():
        pg = new_page(B); pg.goto(BASE + "/index.html", wait_until="networkidle")
        txt = pg.evaluate("document.getElementById('versionTag')?.textContent || ''")
        assert STAMP in txt, f"etiqueta de versão {txt!r} não contém {STAMP!r}"
        pg.context.close(); return txt

    @test("Menu inicial: cabe inteiro, sem scroll, em ecrãs de portátil e telemóvel na horizontal")
    def _():
        bad = []
        for w, h, touch in [(960, 600, False), (1024, 600, False), (1280, 680, False), (1280, 720, False), (1366, 768, False), (844, 390, True), (667, 375, True)]:
            pg = new_page(B, w, h, touch); pg.goto(BASE + "/index.html", wait_until="networkidle"); pg.wait_for_timeout(300)
            r = pg.evaluate("()=>{const c=document.querySelector('#startOverlay .card'); return c.scrollHeight - c.clientHeight}")
            if r > 1: bad.append(f"{w}x{h} (+{r}px)")
            pg.context.close()
        assert not bad, "o cartão do menu tem scroll em: " + ", ".join(bad)
        return "7 tamanhos sem scroll"

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

    @test("Ecrãs do menu: o título também fica à vista (não só o botão de fechar) e nada sai do ecrã na largura")
    def _():
        # O corte do Mapa em telemóvel na horizontal passou despercebido porque só se verificava o botão de fechar:
        # o cartão estava centrado e a deslizar, e o excesso cortava-se por igual em cima (título) e em baixo.
        tiles = [("Mapa", "#btnOpenMap", "#mapOverlay"), ("Conquistas", "#btnAchievements", "#achievementsOverlay"),
                 ("Álbum", "#btnAlbum", "#albumOverlay"), ("Estatísticas", "#btnStats", "#statsOverlay"),
                 ("Opções", "#btnOptions", "#optionsOverlay"), ("Como Jogar", "#btnHow", "#howOverlay")]
        bad = []
        sizes = [("960x600", 960, 600, False), ("932x430", 932, 430, True), ("915x412", 915, 412, True),
                 ("844x390", 844, 390, True), ("745x347", 745, 347, True), ("667x375", 667, 375, True)]
        for vname, w, h, touch in sizes:
            for tname, tile, ov in tiles:
                pg = new_page(B, w, h, touch); pg.goto(BASE + "/index.html", wait_until="networkidle")
                pg.click(tile); pg.wait_for_selector(ov + ":not(.hidden)"); pg.wait_for_timeout(500)
                r = pg.evaluate("""(ov)=>{const t=document.querySelector(ov+' h1, '+ov+' h2').getBoundingClientRect();
                  return {top:t.top, bottom:t.bottom, sw:document.documentElement.scrollWidth, vw:innerWidth, vh:innerHeight}}""", ov)
                if r["top"] < 0 or r["bottom"] > r["vh"]: bad.append(f"{tname}@{vname}: título fora do ecrã (top={r['top']:.0f})")
                if r["sw"] > r["vw"] + 1: bad.append(f"{tname}@{vname}: scroll horizontal ({r['sw']}>{r['vw']})")
                pg.context.close()
        assert not bad, "; ".join(bad)
        return f"6 ecrãs x {len(sizes)} tamanhos"

    @test("Cartão «Sabias que…?»: os ecrãs abertos pelo Menu ficam POR CIMA dele, e o cartão volta ao fechar")
    def _():
        errs = []; bad = []; import time; T0 = time.time(); step = ["início"]
        pg = new_page(B, 844, 390, True, errs=errs)
        # O cartão fecha-se sozinho ao fim de 15 s (rede de segurança do jogo). Este teste demora mais do que isso
        # em máquinas lentas e o resultado dependia de o cartão estar escondido ou visível quando o temporizador
        # disparava — por isso, só aqui, esse temporizador de 15 s não é agendado.
        pg.add_init_script("(()=>{const st=window.setTimeout; window.setTimeout=function(f,d,...a){ return d===15000 ? 0 : st.call(window,f,d,...a); };})();")
        to_level1(pg); start_level(pg)
        pg.wait_for_selector("#historyOverlay:not(.hidden)", timeout=15000); pg.wait_for_timeout(600); T0 = time.time()
        TOP_JS = """(ov)=>{const c=document.querySelector(ov+' .card'); const r=c.getBoundingClientRect();
          const el=document.elementFromPoint(r.left+r.width/2, r.top+r.height/2); return !!(el && el.closest(ov))}"""
        for tname, mbtn, ov, close in [("Mapa", "#mBtnMap", "#mapOverlay", "#btnCloseMap"),
                                       ("Conquistas", "#mBtnAchievements", "#achievementsOverlay", "#btnCloseAchievements"),
                                       ("Álbum", "#mBtnAlbum", "#albumOverlay", "#btnCloseAlbum"),
                                       ("Estatísticas", "#mBtnStats", "#statsOverlay", "#btnCloseStats")]:
            step[0] = f"{tname} ({time.time()-T0:.1f}s)"; pg.click("#btnTeacherMenu"); pg.click(mbtn); pg.wait_for_selector(ov + ":not(.hidden)"); pg.wait_for_timeout(500)
            if not pg.evaluate(TOP_JS, ov): bad.append(f"{tname}: ficou por baixo de outro ecrã")
            if not pg.evaluate("document.getElementById('historyOverlay').classList.contains('hidden')"): bad.append(f"{tname}: o cartão continua visível")
            try: pg.click(close, timeout=2500)
            except Exception:
                bad.append(f"{tname}: o botão «Fechar» não é clicável (tapado)")
                pg.evaluate("(s)=>document.querySelector(s).click()", close)   # fecha por JS só para o teste continuar
            pg.wait_for_timeout(500)
            if pg.evaluate("document.getElementById('historyOverlay').classList.contains('hidden')"): bad.append(f"{tname}: o cartão não voltou ao fechar")
        # O cartão continua a ser o que segura o nível: fechá-lo (Continuar) liberta o jogo como antes
        t_cont = time.time() - T0; step[0] = f"Continuar ({t_cont:.1f}s)"
        try: pg.click("#btnHistory", timeout=3000)
        except Exception: raise AssertionError(f"«Continuar» não clicável aos {time.time()-T0:.1f}s (passo: {step[0]}) — o cartão fecha sozinho aos 15 s")
        pg.wait_for_timeout(500)
        assert pg.evaluate("document.getElementById('historyOverlay').classList.contains('hidden')"), "«Continuar» não fechou o cartão"
        # E depois de lido, abrir/fechar um ecrã do Menu não o ressuscita
        pg.click("#btnTeacherMenu"); pg.click("#mBtnAlbum"); pg.wait_for_selector("#albumOverlay:not(.hidden)"); pg.wait_for_timeout(300)
        pg.click("#btnCloseAlbum"); pg.wait_for_timeout(500)
        if not pg.evaluate("document.getElementById('historyOverlay').classList.contains('hidden')"): bad.append("cartão já lido voltou a aparecer")
        assert not bad, "; ".join(bad); assert not errs, errs[:3]
        pg.context.close(); return f"4 ecrãs por cima do cartão; cartão volta ao fechar; lido → não volta "

    @test("Conquistas e Álbum em jogo: o nome do jogador e o «☰ Menu» não tapam o título nem o progresso")
    def _():
        bad = []
        for vname, w, h in [("960x600", 960, 600), ("844x390", 844, 390), ("667x375", 667, 375)]:
            pg = new_page(B, w, h, True); to_level1(pg, name="Maria Isabel Santos!"); start_level(pg)
            pg.wait_for_selector("canvas", timeout=15000); dismiss_cards(pg, 5); pg.wait_for_timeout(600)
            for tname, btn, ov in [("Conquistas", "#mBtnAchievements", "#achievementsOverlay"), ("Álbum", "#mBtnAlbum", "#albumOverlay")]:
                pg.click("#btnTeacherMenu"); pg.click(btn); pg.wait_for_selector(ov + ":not(.hidden)"); pg.wait_for_timeout(500)
                pg.evaluate("(ov)=>document.querySelectorAll('.overlay:not(.hidden)').forEach(e=>{ if('#'+e.id!==ov) e.classList.add('hidden'); })", ov)
                pg.wait_for_timeout(300)
                r = pg.evaluate("""(ov)=>{const rc=r=>({l:r.left,t:r.top,r:r.right,b:r.bottom});
                  const txt=e=>{const g=document.createRange(); g.selectNodeContents(e); return rc(g.getBoundingClientRect())};
                  const hit=(a,b)=>!(a.r<=b.l||b.r<=a.l||a.b<=b.t||b.b<=a.t);
                  const ctl=[document.getElementById('playerNameHtml'), document.getElementById('btnTeacherMenu')].map(e=>rc(e.getBoundingClientRect()));
                  const c=document.querySelector(ov+' .card');
                  const parts={título:txt(c.querySelector('h2')), progresso:txt(c.querySelector('.map-progress-line'))};
                  return Object.entries(parts).filter(([k,v])=>ctl.some(x=>hit(x,v))).map(([k])=>k)}""", ov)
                if r: bad.append(f"{tname}@{vname}: tapa {', '.join(r)}")
                pg.click(ov + " .row:last-child .btn"); pg.wait_for_timeout(300)
            pg.context.close()
        assert not bad, "; ".join(bad); return "2 ecrãs x 3 tamanhos sem sobreposição"

    @test("Mapa em jogo: o nome do jogador e o «☰ Menu» não tapam o título, a barra nem os mundos")
    def _():
        bad = []
        for vname, w, h in [("960x600", 960, 600), ("932x430", 932, 430), ("844x390", 844, 390), ("667x375", 667, 375)]:
            pg = new_page(B, w, h, True); to_level1(pg, name="Maria Isabel Santos!"); start_level(pg)
            pg.wait_for_selector("canvas", timeout=15000); dismiss_cards(pg, 5); pg.wait_for_timeout(600)
            pg.click("#btnTeacherMenu"); pg.click("#mBtnMap"); pg.wait_for_selector("#mapOverlay:not(.hidden)"); pg.wait_for_timeout(600)
            # Só interessa a geometria do Mapa: esconde outros cartões (ex.: «Sabias que…?» do nível) que possam estar por cima.
            pg.evaluate("document.querySelectorAll('.overlay:not(.hidden)').forEach(e=>{ if(e.id!=='mapOverlay') e.classList.add('hidden'); })")
            pg.wait_for_timeout(300)
            r = pg.evaluate("""()=>{const rc=r=>({l:r.left,t:r.top,r:r.right,b:r.bottom});
              const txt=e=>{const g=document.createRange(); g.selectNodeContents(e); return rc(g.getBoundingClientRect())};
              const hit=(a,b)=>!(a.r<=b.l||b.r<=a.l||a.b<=b.t||b.b<=a.t);
              const ctl=[document.getElementById('playerNameHtml'), document.getElementById('btnTeacherMenu')].map(e=>rc(e.getBoundingClientRect()));
              const c=document.querySelector('#mapOverlay .map-card');
              const parts={título:txt(c.querySelector('h2')), progresso:txt(c.querySelector('.map-progress-line')),
                           barra:rc(c.querySelector('.map-progress-track').getBoundingClientRect())};
              [...c.querySelectorAll('.map-region')].forEach((e,i)=>parts['mundo'+(i+1)]=rc(e.getBoundingClientRect()));
              // um mundo que está dentro da lista deslizante e fora da área visível dela não conta
              const g=c.querySelector('.map-regions-grid').getBoundingClientRect();
              return Object.entries(parts).filter(([k,v])=>!k.startsWith('mundo')||(v.t<g.bottom&&v.b>g.top)).filter(([k,v])=>ctl.some(x=>hit(x,v))).map(([k])=>k)}""")
            if r: bad.append(f"{vname}: tapa {', '.join(r)}")
            pg.context.close()
        assert not bad, "; ".join(bad); return "4 tamanhos sem sobreposição"

    B.close()

srv.shutdown()
falhas = [r for r in RESULTS if not r[1]]
print(f"\nsmoke.py: {len(RESULTS)-len(falhas)}/{len(RESULTS)} testes passaram.")
sys.exit(1 if falhas else 0)
