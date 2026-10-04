// Testes unitários rápidos (sem browser, sem dependências). Uso: node _dev/unit.mjs
// Cobrem a lógica pura: gravação/migração do save, estrelas, alcançabilidade dos níveis e dados do quiz.
// Correm em poucos segundos; o _dev/smoke.py (Chromium) continua a cobrir o jogo a funcionar.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const url = (f, q = "") => pathToFileURL(path.join(root, f)).href + q;

// ---- localStorage falso (só o que o jogo usa) ----
function makeStorage() {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem(k, v) { if (this.full) throw new Error("QuotaExceededError"); m.set(k, String(v)); },
    removeItem: k => m.delete(k),
    clear: () => m.clear(),
    _map: m, full: false,
  };
}
globalThis.localStorage = makeStorage();
const ROOT_KEY = "vanbertos_ciberseguranca_save_v1";
let n = 0;
const freshStorage = () => import(url("storage.js", `?t=${++n}`)); // módulo novo = «página recarregada»

const results = [];
async function test(name, fn) {
  try { localStorage.clear(); localStorage.full = false; await fn(); results.push([name, true]); }
  catch (e) { results.push([name, false, e]); }
}

// ===================== storage.js =====================
await test("storage: grava e lê um namespace", async () => {
  const s = await freshStorage();
  s.saveNamespace("map", { a: 1 });
  assert.deepEqual(s.loadNamespace("map", {}), { a: 1 });
  assert.deepEqual(s.loadNamespace("inexistente", { x: 9 }), { x: 9 });
});

await test("storage: dois separadores não se apagam um ao outro", async () => {
  const antigo = await freshStorage();            // separador esquecido em 2.º plano
  antigo.loadNamespace("map", {});                 // carrega a sua cópia (vazia)
  const novo = await freshStorage();
  novo.saveNamespace("achievements", { x: true }); // o separador novo guarda progresso
  antigo.saveNamespace("globalStats", { t: 5 });   // o antigo grava depois (ex.: beforeunload)
  const raw = JSON.parse(localStorage.getItem(ROOT_KEY));
  assert.deepEqual(raw.achievements, { x: true }, "as conquistas do outro separador perderam-se");
  assert.deepEqual(raw.globalStats, { t: 5 });
});

await test("storage: JSON corrompido ou tipo errado não rebenta o jogo", async () => {
  for (const lixo of ["{não é json", "123", "null", "[1,2]", '"texto"']) {
    localStorage.setItem(ROOT_KEY, lixo);
    const s = await freshStorage();
    assert.deepEqual(s.loadNamespace("map", { ok: 1 }), { ok: 1 }, `falhou com «${lixo}»`);
    s.saveNamespace("map", { b: 2 });              // e volta a conseguir gravar
    assert.deepEqual(s.loadNamespace("map", {}), { b: 2 });
  }
});

await test("storage: armazenamento cheio/bloqueado não rebenta", async () => {
  const s = await freshStorage();
  localStorage.full = true;
  s.saveNamespace("map", { a: 1 });                // não pode lançar erro
  assert.deepEqual(s.loadNamespace("map", {}), { a: 1 }, "deve ficar em memória nesta sessão");
});

await test("storage: clearNamespace repõe o valor por omissão e mantém o resto", async () => {
  const s = await freshStorage();
  s.saveNamespace("map", { a: 1 }); s.saveNamespace("stars", { 0: 1 });
  s.clearNamespace("map", {});
  assert.deepEqual(s.loadNamespace("map", { z: 1 }), {});
  assert.deepEqual(s.loadNamespace("stars", {}), { 0: 1 });
});

await test("storage: migra as chaves antigas uma só vez e apaga-as", async () => {
  localStorage.setItem("vanbertos_map_progress_v1", JSON.stringify({ levels: [1, 2] }));
  localStorage.setItem("vanbertos_stars_v1", JSON.stringify({ 0: { allItems: true } }));
  localStorage.setItem("vanbertos_dia_crianca_v1", JSON.stringify({ muted: true }));
  localStorage.setItem("vanbertos_hc", "1");
  const s = await freshStorage();
  assert.deepEqual(s.loadNamespace("map", {}), { levels: [1, 2] });
  assert.deepEqual(s.loadNamespace("stars", {}), { 0: { allItems: true } });
  assert.deepEqual(s.loadNamespace("settings", {}), { muted: true, hc: true });
  for (const k of ["vanbertos_map_progress_v1", "vanbertos_stars_v1", "vanbertos_dia_crianca_v1", "vanbertos_hc"])
    assert.equal(localStorage.getItem(k), null, `a chave antiga ${k} devia ter sido apagada`);
});

await test("storage: não migra por cima de um save novo já existente", async () => {
  localStorage.setItem(ROOT_KEY, JSON.stringify({ map: { novo: 1 } }));
  localStorage.setItem("vanbertos_map_progress_v1", JSON.stringify({ velho: 1 }));
  const s = await freshStorage();
  assert.deepEqual(s.loadNamespace("map", {}), { novo: 1 });
});

// ===================== stars.js =====================
globalThis.localStorage = makeStorage();
const stars = await import(url("stars.js"));
const { LEVELS } = await import(url("data-levels.js"));

await test("estrelas: nível sem itens ganha a 1.ª estrela ao concluir", () => {
  stars.resetAllStars(); stars.resetLevelStarTracking();
  stars.finalizeLevelStars(0, 3, 0, 0);
  assert.deepEqual(stars.getStarRecord(0), { allItems: true, noDamage: false, firstTry: false });
  assert.equal(stars.starsForLevel(0), 1);
});

await test("estrelas: 3 estrelas = todos os itens + sem perder vidas + 1.ª tentativa", () => {
  stars.resetAllStars(); stars.resetLevelStarTracking(); stars.markFirstTryThisLevel();
  stars.finalizeLevelStars(1, 0, 5, 5);
  assert.equal(stars.starsForLevel(1), 3);
});

await test("estrelas: faltar um item ou perder uma vida tira a estrela correspondente", () => {
  stars.resetAllStars(); stars.resetLevelStarTracking();
  stars.finalizeLevelStars(2, 1, 4, 5);
  assert.deepEqual(stars.getStarRecord(2), { allItems: false, noDamage: false, firstTry: false });
});

await test("estrelas: repetir um nível só pode subir ou manter, nunca descer", () => {
  stars.resetAllStars();
  stars.resetLevelStarTracking(); stars.markFirstTryThisLevel();
  stars.finalizeLevelStars(3, 0, 5, 5);                       // 1.ª vez: 3 estrelas
  stars.resetLevelStarTracking();                             // 2.ª vez: tudo pior
  stars.finalizeLevelStars(3, 2, 0, 5);
  assert.equal(stars.starsForLevel(3), 3, "uma repetição pior não pode baixar as estrelas");
  stars.resetAllStars();
  stars.resetLevelStarTracking(); stars.finalizeLevelStars(4, 1, 5, 5);   // 1.ª vez: só itens
  stars.resetLevelStarTracking(); stars.markFirstTryThisLevel(); stars.finalizeLevelStars(4, 0, 2, 5); // 2.ª: sem dano + 1.ª tentativa
  assert.equal(stars.starsForLevel(4), 3, "deve juntar o melhor de cada tentativa");
});

await test("estrelas: total, «todos à 1.ª» e «todos com 3 estrelas»", () => {
  stars.resetAllStars();
  LEVELS.forEach((_, i) => { stars.resetLevelStarTracking(); stars.markFirstTryThisLevel(); stars.finalizeLevelStars(i, 0, 1, 1); });
  assert.equal(stars.totalStarsEarned(), LEVELS.length * 3);
  assert.ok(stars.allLevelsFirstTry() && stars.allLevelsThreeStars());
  stars.resetAllStars();
  assert.ok(!stars.allLevelsFirstTry() && !stars.allLevelsThreeStars());
  assert.equal(stars.totalStarsEarned(), 0);
});

await test("estrelas: o progresso fica guardado e volta ao recarregar", async () => {
  stars.resetAllStars(); stars.resetLevelStarTracking(); stars.markFirstTryThisLevel();
  stars.finalizeLevelStars(7, 0, 1, 1);
  const raw = JSON.parse(localStorage.getItem(ROOT_KEY));
  assert.equal(raw.stars[7].firstTry, true);
});

// ===================== níveis: física e alcançabilidade =====================
// As constantes têm de coincidir com o código; se alguém mudar a física, este teste avisa em vez de dar falsos «ok».
const src = f => fs.readFileSync(path.join(root, f), "utf8");
const G = Number(src("game/state.js").match(/export const GRAVITY\s*=\s*(\d+)/)[1]);
await test("física: as constantes usadas nos testes ainda coincidem com o código", () => {
  assert.equal(G, 1100, "GRAVITY mudou — atualiza as constantes em _dev/unit.mjs");
  assert.ok(src("game/scene.js").includes("powered?-680:-650"), "o salto mudou — atualiza V em _dev/unit.mjs");
  assert.ok(src("game/scene.js").includes("powered?320:280"), "a velocidade mudou — atualiza S em _dev/unit.mjs");
  assert.ok(src("game/world.js").includes("powered ? -1200 : -960"), "o trampolim mudou — atualiza _dev/unit.mjs");
});

const V = 650, S = 280, VT = 960;
const canJump = (gap, rise, v) => { const d = v * v - 2 * G * rise; return d >= 0 && S * ((v + Math.sqrt(d)) / G) >= gap - 1; };
function reach(l) {
  const P = l.platforms.map(p => ({ l: p.x - p.w / 2, r: p.x + p.w / 2, top: p.y - p.h / 2 }));
  (l.movingPlatforms || []).forEach(m => {
    const w = m.w, y = m.y - (m.h || 22) / 2, rx = m.rangeX || 0, ry = m.rangeY || 0;
    for (const s of [-1, 1]) P.push({ l: m.x + s * rx - w / 2, r: m.x + s * rx + w / 2, top: y + s * ry, mov: true });
    P.push({ l: m.x - rx - w / 2, r: m.x + rx + w / 2, top: y, mov: true });
  });
  (l.trampolines || []).forEach(t => {
    const sob = P.find(p => t.x >= p.l && t.x <= p.r && Math.abs(p.top - (t.y + 14)) < 40);
    if (sob) sob.tramp = true; else P.push({ l: t.x - 38, r: t.x + 38, top: t.y + 8, tramp: true, pad: true });
  });
  P.forEach((p, k) => (p.k = k));
  const start = P.filter(p => l.spawn.x >= p.l && l.spawn.x <= p.r).sort((a, b) => a.top - b.top)[0];
  const seen = new Set(start ? [start.k] : []), q = start ? [start] : [];
  while (q.length) {
    const a = q.pop();
    for (const b of P) {
      if (seen.has(b.k)) continue;
      const gap = Math.max(0, Math.max(b.l - a.r, a.l - b.r)), rise = a.top - b.top;
      if (canJump(gap, rise, V) || (a.tramp && canJump(gap, rise, VT))) { seen.add(b.k); q.push(b); }
    }
    for (const pp of l.pipes || []) {
      if (pp.toX == null || pp.room || pp.x < a.l - 30 || pp.x > a.r + 30) continue;
      const d = P.filter(p => pp.toX >= p.l - 10 && pp.toX <= p.r + 10)
        .sort((x, y) => Math.abs(x.top - (pp.toY + 30)) - Math.abs(y.top - (pp.toY + 30)))[0];
      if (d && !seen.has(d.k)) { seen.add(d.k); q.push(d); }
    }
  }
  return { P, seen, start };
}
await test("níveis: em todos os 20 se chega à porta e a todas as plataformas fixas", () => {
  const erros = [];
  LEVELS.forEach((l, i) => {
    const { P, seen, start } = reach(l);
    if (!start) return erros.push(`nível ${i + 1}: o spawn não está sobre nenhuma plataforma`);
    const porta = P.filter(p => l.doorX >= p.l - 10 && l.doorX <= p.r + 10);
    if (!porta.some(p => seen.has(p.k))) erros.push(`nível ${i + 1}: a porta (x=${l.doorX}) não é alcançável`);
    const soltas = P.filter(p => !seen.has(p.k) && !p.mov);
    if (soltas.length) erros.push(`nível ${i + 1}: plataformas inalcançáveis ${soltas.map(p => `[${Math.round(p.l)}-${Math.round(p.r)}@${Math.round(p.top)}]`).join(" ")}`);
  });
  assert.equal(erros.length, 0, "\n  " + erros.join("\n  "));
});

await test("níveis: spawn, porta e plataformas dentro do mundo", () => {
  LEVELS.forEach((l, i) => {
    assert.ok(l.spawn.x >= 0 && l.spawn.x <= l.worldW, `nível ${i + 1}: spawn fora do mundo`);
    assert.ok(l.doorX > 0 && l.doorX <= l.worldW, `nível ${i + 1}: porta fora do mundo`);
  });
});

// ===================== dados do quiz =====================
const Q = await import(url("data-quiz.js"));
await test("quiz: cada pergunta tem exatamente 1 certa, sem opções repetidas e com explicação", () => {
  const erros = [];
  for (const [nome, banco] of [["Fácil", Q.QUIZ_BY_THEME], ["Difícil", Q.QUIZ_BY_THEME_AVANCADO]]) {
    for (const [tema, qs] of Object.entries(banco)) {
      const vistos = new Set();
      qs.forEach((q, i) => {
        const id = `${nome}/${tema}#${i + 1}`;
        if (q.a.filter(o => o.ok).length !== 1) erros.push(`${id}: não tem exatamente 1 resposta certa`);
        const txt = q.a.map(o => String(o.t ?? o.text ?? "").trim().toLowerCase());
        if (new Set(txt).size !== txt.length) erros.push(`${id}: opções repetidas`);
        if (txt.some(t => !t)) erros.push(`${id}: opção vazia`);
        if (!q.exp || !String(q.exp).trim()) erros.push(`${id}: sem explicação`);
        const chave = String(q.q ?? "").trim().toLowerCase();
        if (vistos.has(chave)) erros.push(`${id}: pergunta repetida no mesmo tema`);
        vistos.add(chave);
      });
    }
  }
  assert.equal(erros.length, 0, "\n  " + erros.slice(0, 15).join("\n  "));
});

// ===================== resultado =====================
let falhas = 0;
for (const [nome, ok, e] of results) {
  console.log(`${ok ? "  ok   " : "  FALHA"} ${nome}`);
  if (!ok) { falhas++; console.log("        " + String(e?.message ?? e).split("\n").join("\n        ")); }
}
console.log(`\nunit.mjs: ${results.length - falhas}/${results.length} testes passaram.`);
process.exit(falhas ? 1 : 0);
