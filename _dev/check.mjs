// Verificações estáticas do jogo (sem dependências). Uso: node _dev/check.mjs [pasta]
// Por omissão verifica a pasta acima de _dev. Sai com código 1 se houver problemas.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));
const problems = [], warns = [];
const P = m => problems.push(m), W = m => warns.push(m);
const read = f => fs.readFileSync(path.join(root, f), "utf8");
const exists = f => fs.existsSync(path.join(root, f));
const jsFiles = fs.readdirSync(root).filter(f => f.endsWith(".js") && f !== "phaser.min.js");
const isComment = l => /^\s*(\/\/|\/\*|\*)/.test(l);

// 1) Uma única string ?v= em todo o lado (senão o mesmo módulo carrega duas vezes ou fica em cache velha)
const stamps = new Map();
for (const f of ["index.html", ...jsFiles.filter(x => x !== "sw.js")]) for (const m of read(f).matchAll(/\?v=([A-Za-z0-9_]+)/g)) stamps.set(m[1], (stamps.get(m[1]) || 0) + 1);
if (stamps.size !== 1) P(`Strings ?v= diferentes: ${[...stamps].map(([k, n]) => `${k}×${n}`).join(", ")}`);
const stamp = [...stamps.keys()][0];
if (stamp && !read("README.md").includes(stamp)) W(`README não menciona a versão atual (${stamp})`);

// 2) Ficheiros referenciados existem
const html = read("index.html");
for (const m of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  const u = m[1]; if (/^(https?:|data:|mailto:)/.test(u)) { P(`Recurso externo no HTML: ${u}`); continue; }
  if (!exists(u.split("?")[0])) P(`index.html referencia ficheiro em falta: ${u}`);
}
const css = read("dia-crianca.css");
for (const m of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
  const u = m[1]; if (u.startsWith("data:") || u.startsWith("#") || u.startsWith("%23")) continue;
  if (/^https?:/.test(u)) P(`Recurso externo no CSS: ${u}`); else if (!exists(u.split("?")[0])) P(`CSS referencia ficheiro em falta: ${u}`);
}
if (/@import/.test(css)) P("CSS usa @import (pedido externo/encadeado)");
const manifest = JSON.parse(read("manifest.json"));
for (const i of manifest.icons || []) if (!exists(i.src.replace(/^\.?\//, ""))) P(`manifest.json: ícone em falta ${i.src}`);
const dc = read("dia-crianca.js");
const bgFiles = /const BG_FILES = \{([\s\S]*?)\};/.exec(dc);
const bgKeys = new Set();
if (!bgFiles) P("BG_FILES não encontrado em dia-crianca.js");
else for (const m of bgFiles[1].matchAll(/(bg_[a-z0-9_]+):\s*"([^"]+)"/g)) { bgKeys.add(m[1]); if (!exists(m[2])) P(`BG_FILES: ficheiro em falta ${m[2]}`); }
const ov = /const LEVEL_BG_OVERRIDE = \{([\s\S]*?)\};/.exec(dc);
if (ov) for (const m of ov[1].matchAll(/"(bg_[a-z0-9_]+)"/g)) if (!bgKeys.has(m[1])) P(`LEVEL_BG_OVERRIDE usa ${m[1]}, que não está em BG_FILES`);

// 2b) Service worker: versão igual ao ?v= e núcleo completo (senão o modo offline falha em silêncio)
if (!exists("sw.js")) P("Falta o sw.js (modo offline)");
else {
  const sw = read("sw.js");
  const swVer = /const VERSION = "([^"]+)"/.exec(sw)?.[1];
  if (swVer !== stamp) P(`sw.js: VERSION (${swVer}) é diferente da string ?v= (${stamp})`);
  const coreBlock = /const CORE = \[([\s\S]*?)\];/.exec(sw);
  const core = new Set([...(coreBlock ? coreBlock[1] : "").matchAll(/"([^"]+)"/g)].map(m => m[1]));
  for (const f of core) if (f !== "./" && !exists(f)) P(`sw.js: ficheiro do núcleo em falta: ${f}`);
  const need = new Set(["index.html", "manifest.json", ...jsFiles.filter(f => f !== "sw.js"), "dia-crianca.css", "phaser.min.js"]);
  for (const m of html.matchAll(/(?:src|href)="([^"#?]+)/g)) if (!/^(https?:|data:)/.test(m[1])) need.add(m[1]);
  for (const m of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) if (!/^(data:|#|%23)/.test(m[1]) && !/\.(jpg|jpeg|webp)$/i.test(m[1])) need.add(m[1].split("?")[0]);
  for (const i of manifest.icons || []) need.add(i.src.replace(/^\.?\//, ""));
  for (const f of need) if (!core.has(f)) P(`sw.js: «${f}» é usado pelo jogo mas não está no núcleo do service worker`);
  if (!/register\("sw\.js"\)/.test(html)) P("index.html não regista o sw.js");
}
  const sw2 = read("sw.js");
  if (!/type !== "CACHE_ALL"/.test(sw2)) P("sw.js: falta o handler de mensagens do botão «Guardar tudo» (CACHE_ALL)");
  if (!/optBtnDownloadAll/.test(html)) P("index.html: falta o botão «Guardar tudo» (optBtnDownloadAll)");
  if (!/CACHE_ALL/.test(dc)) P("dia-crianca.js: não liga o botão «Guardar tudo» ao service worker (CACHE_ALL)");

// 3) Sem pedidos externos nos scripts (o jogo tem de funcionar só com os ficheiros do pacote)
for (const f of jsFiles) read(f).split("\n").forEach((l, i) => {
  if (isComment(l)) return;
  for (const m of l.matchAll(/["'`](https?:\/\/[^"'`\s]+)/g)) if (!/^https?:\/\/www\.w3\.org\//.test(m[1])) P(`${f}:${i + 1}: URL externo ${m[1]}`);
});

// 4) Banco de perguntas
const Q = await import(pathToFileURL(path.join(root, "data-quiz.js")).href);
const banks = [["Fácil", Q.QUIZ_BY_THEME, 3], ["Difícil/Extremo", Q.QUIZ_BY_THEME_AVANCADO, 4]];
const themesA = Object.keys(Q.QUIZ_BY_THEME), themesB = Object.keys(Q.QUIZ_BY_THEME_AVANCADO);
if (JSON.stringify(themesA) !== JSON.stringify(themesB)) P("Os dois bancos de perguntas não têm os mesmos temas");
const stats = [];
for (const [name, bank, nOpt] of banks) {
  let n = 0, longest = 0, maxLen = 0;
  for (const [theme, list] of Object.entries(bank)) list.forEach((q, i) => {
    n++; const where = `${name} ${theme}#${i}`;
    if (!q.q || !q.exp) P(`${where}: falta pergunta ou explicação`);
    if (q.a.length !== nOpt) P(`${where}: ${q.a.length} opções (esperado ${nOpt})`);
    if (q.a.filter(x => x.ok).length !== 1) P(`${where}: tem de haver exatamente 1 opção certa`);
    const texts = q.a.map(x => x.t.trim().toLowerCase());
    if (new Set(texts).size !== texts.length) P(`${where}: opções repetidas`);
    const lens = q.a.map(x => x.t.length); maxLen = Math.max(maxLen, ...lens);
    if (Math.max(...lens) > 80) W(`${where}: opção com mais de 80 carateres`);
    const c = q.a.find(x => x.ok).t.length, mw = Math.max(...q.a.filter(x => !x.ok).map(x => x.t.length));
    if (c > mw) longest++;
  });
  const pct = Math.round(100 * longest / n);
  stats.push(`${name}: ${n} perguntas, opção maior ${maxLen} car., certa é a mais comprida em ${pct}%`);
  if (pct > 40) W(`${name}: a resposta certa é a mais comprida em ${pct}% das perguntas (acaso = ${Math.round(100 / nOpt)}%)`);
}
try {
  const L = await import(pathToFileURL(path.join(root, "data-levels.js")).href);
  for (const [i, lv] of L.LEVELS.entries()) if (lv.quizTheme && !Q.QUIZ_BY_THEME[lv.quizTheme]) P(`Nível ${i + 1}: quizTheme "${lv.quizTheme}" não existe no banco`);
} catch (e) { W("Não consegui carregar data-levels.js: " + e.message); }

// 5) Português europeu: palavras que não devem aparecer nos textos do jogo
const forbidden = [
  [/\bpasswords?\b/i, "usar «palavra-passe»"], [/\bwifi\b/i, "usar «Wi-Fi»"], [/\bvocês?\b/i, "tratar por «tu»"],
  [/\bcelulares?\b/i, "«telemóvel»"], [/\btelas?\b/i, "«ecrã»"], [/\busuários?\b/i, "«utilizador»"],
  [/\bfazer login\b/i, "«iniciar sessão»"], [/\bcompartilh\w*/i, "«partilhar»"], [/\bmouse\b/i, "«rato»"],
  [/\bdeletar\b/i, "«apagar»"], [/\bcadastr\w*/i, "«registar»"], [/digitação|digitar/i, "«escrita»/«escrever»"],
  [/\bespectador\w*/i, "AO90: «espetador»"], [/\bcaracteres\b/i, "AO90: «carateres»"],
  [/\b(actual|actuais|acção|acções|activ(?:o|a|os|as|idade|idades)|directo|directa|objectivo\w*|projecto\w*|óptimo|aspecto\w*|espectáculo\w*|electr[óo]nic[oa]s?|protecção|selecção|correcção|infecção)\b/i, "grafia anterior ao AO90"],
];
const textFiles = [...jsFiles.filter(f => /^(data-|achievements|cinematics)/.test(f)), "index.html"];
for (const f of textFiles) read(f).split("\n").forEach((l, i) => {
  if (isComment(l)) return;
  const line = f === "index.html" ? l.replace(/<[^>]+>/g, " ") : l;
  for (const [rx, hint] of forbidden) { const m = rx.exec(line); if (m) P(`${f}:${i + 1}: «${m[0]}» → ${hint}`); }
});

// 6) Sintaxe de todos os módulos
for (const f of jsFiles) {
  const r = spawnSync(process.execPath, ["--experimental-default-type=module", "--check", path.join(root, f)], { encoding: "utf8" });
  if (r.status !== 0) P(`Erro de sintaxe em ${f}: ${(r.stderr || "").split("\n").find(l => /Error/.test(l)) || r.stderr}`);
}

console.log(`Versão (?v=): ${stamp}`); stats.forEach(s => console.log(s));
warns.forEach(w => console.log("AVISO:", w));
if (problems.length) { problems.forEach(p => console.log("PROBLEMA:", p)); console.log(`\n${problems.length} problema(s).`); process.exit(1); }
console.log("check.mjs: tudo certo.");
