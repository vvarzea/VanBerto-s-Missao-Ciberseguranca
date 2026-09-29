// ============================================================================================
// FERRAMENTA DE UMA ÚNICA VEZ — a divisão de dia-crianca.js (10 356 linhas) nos módulos de game/
// já foi feita (ver README.md, «Estrutura do código»). Isto fica guardado aqui como REGISTO de
// como foi feita e verificada — não corre automaticamente, não faz parte do jogo, e não precisa
// de ser corrido de novo para o trabalho do dia a dia (esse edita-se directamente em game/*.js).
// Só voltaria a ser útil para repetir uma divisão semelhante (ex.: dividir um módulo grande outra
// vez), a partir de um novo ficheiro único guardado nesta pasta.
//
// Lê dia-crianca.antes-da-divisao.js (o ficheiro único, ANTES da divisão — não o dia-crianca.js
// atual do jogo, que já está dividido) e gera os módulos em game/ + o dia-crianca.js que os liga.
// Modo: node split_source.mjs report|write [pasta_do_original] [pasta_de_saída]
//   report — só imprime um resumo (tamanhos, nomes por resolver, etc.), não escreve nada
//   write  — escreve os ficheiros gerados em <pasta_de_saída>/game/ e <pasta_de_saída>/dia-crianca.js
// A seguir a um "write", correr verify_split.mjs para confirmar, função a função e efeito a
// efeito, que o resultado tem exactamente o mesmo comportamento do original.
import fs from "fs"; import path from "path";
import * as acorn from "acorn"; import * as walk from "acorn-walk"; import * as escope from "eslint-scope";
const MODE = process.argv[2] || "report";
const HERE = new URL(".", import.meta.url).pathname;
const ROOT = process.argv[3] || HERE, OUT = process.argv[4] || (HERE + "saida");
// Por omissão lê o monólito congelado (ANTES da divisão em módulos) guardado nesta pasta —
// não o dia-crianca.js atual do jogo, que já está dividido.
const src = fs.readFileSync(ROOT + "/dia-crianca.antes-da-divisao.js", "utf8");
const lines = src.split("\n");
const ast = acorn.parse(src, { ecmaVersion: "latest", sourceType: "module", locations: true, ranges: true });

// ---------- módulos (por linha de início do statement) ----------
const MODULES = {
  dom:        ["Referências aos elementos do HTML (overlays, botões, campos) usadas por todo o jogo."],
  dialogue:   ["Balões de fala do VanBerto's e diálogos dos bosses (vbSay, playBossDialogue) e a posição deles no ecrã."],
  overlays:   ["Gestão de ecrãs sobrepostos: abrir/fechar, pausa da física, guardar/carregar jogo, MutationObserver dos overlays."],
  feedback:   ["Elogios, números flutuantes, hit-stop e mensagens dinâmicas de feedback."],
  quiz:       ["Quiz: estatísticas, escolha da pergunta, revisão espaçada dos erros, «Sabias que…?» e o ecrã do quiz."],
  map:        ["Mapa da aventura: progresso, mundos, carregamento dos fundos e arranque de um nível a partir do mapa."],
  artefacts:  ["Artefactos mágicos, reset de progresso, popups épicos, HUD de orbes, Galeria final e Álbum dos Direitos."],
  state:      ["Estado partilhado do jogo (cena, jogador, vidas, pontos, poderes…) e regras por dificuldade."],
  scene:      ["Configuração e ciclo do Phaser: preload, create, update (o ciclo de cada frame) e o ecrã de pausa."],
  world:      ["Objetos do nível: balões, bichos, escudos, plataformas móveis, trampolins, perigos, passagens secretas e letreiros."],
  level:      ["Carregar um nível, vilões, drones e o HUD (pontos, corações, barra de progresso)."],
  rooms:      ["Agachar, canos e salas secretas: entrar, sair e reposicionar o jogador."],
  door:       ["A porta do nível: abrir, animação de saída e transição para o nível seguinte."],
  bossCore:   ["Bosses (1/4): estado do combate, arranque, fases por HP, sprite, arena e barra de vida."],
  bossAttacks:["Bosses (2/4): ataques e comportamentos (zonas tóxicas, mini-vírus, pop-ups, teleporte, rolar, decoy…)."],
  bossCombat: ["Bosses (3/4): dano, saltos, fúria, colisões, fase de recolha e ataque especial."],
  bossEnd:    ["Bosses (4/4): festa de vitória, quiz do boss, portal do boss e retoma do nível."],
  flow:       ["Fluxo do jogo: passar de nível, fim de jogo, confetis e ecrã de vitória."],
  items:      ["Itens apanháveis, malware, invulnerabilidade, escudo, duplo salto e Star Power."],
  input:      ["Controlos por toque (D-pad e botões no ecrã)."],
  vanberto:   ["Animação do VanBerto's (piscar, feliz, triste, dança) e os olhos do robô do HTML."],
  ui:         ["Botões e atalhos: ecrã inteiro, pausa, alto contraste, navegação por teclado, Nova Aventura e dificuldade."],
  stats:      ["Estatísticas globais persistentes, medalhas e rastreio de eventos."],
  screens:    ["Ecrãs de Conquistas, Álbum, Estatísticas, Opções e Certificado final."],
};
// Fronteiras por âncora: [módulo, 1.ª linha do 1.º statement da secção, n.º de ocorrência dessa linha].
// (Por linha de início do statement seria frágil: qualquer edição acima desloca tudo.)
const ANCHORS = [["dom", "const startOverlay   = document.getElementById(\"startOverlay\");", 0], ["dialogue", "let playerName = \"\";", 0], ["overlays", "const _SUB_OVERLAY_IDS = [\"mapOverlay\", \"worldMapOverlay\", \"achievementsOverlay\", \"albumOverlay\",", 0], ["feedback", "function pickPraise() { return PRAISE[Math.floor(Math.random() * PRAISE.length)]; }", 0], ["quiz", "const quizStats = { total:0, correct:0, everWrong:false, errors:[], errorsByTheme:{} };", 0], ["overlays", "let pausedByTeacher = false;", 0], ["quiz", "function showHistory(levelIndex, onDone) {", 0], ["map", "let mapProgress = { highestLevelReached: 0, levelsCompleted: [] };", 0], ["artefacts", "let collectedArtefacts = {}; // { [artIdx]: true } — chave é o índice no ARTEFACTS (0-19), não a pos", 0], ["state", "let sceneRef=null, currentLevel=0;", 0], ["scene", "const ROOM_WORLD_W   = 1000;  // > 960 (largura do ecrã) para nunca sobrar canto vazio", 0], ["world", "function spawnBalloons(scene,worldW) {", 0], ["level", "function loadLevel(scene,idx){", 0], ["rooms", "function revealPlayerEntrance(scene) {", 0], ["door", "function tryOpenDoor(scene){", 0], ["bossCore", "let inBossFight = false;", 0], ["bossAttacks", "let bossToxicZones = [];", 0], ["bossCombat", "function squishBoss(scene, b) {", 0], ["bossEnd", "function playBossVictoryFlourish(scene, def) {", 0], ["flow", "let _nextLevelGuard = false;", 0], ["quiz", "function showQuiz(quiz,done,attemptNum){", 0], ["items", "const ITEM_LABELS={", 0], ["input", "function createTouchInput(scene){", 0], ["vanberto", "function scheduleBlink(scene){", 0], ["ui", "btnMute.onclick=()=>{const m=toggleMuted();btnMute.textContent=m?\"🔇 Som: OFF\":\"🔊 Som: ON\";if(!m){e", 0], ["stats", "const QUIZ_ERRORS_MAX = 60; // limite do registo persistente de erros (≈15 KB no localStorage)", 0], ["feedback", "function showDynamicMsg(msgs, duration = 2400) {", 0], ["overlays", "const SECONDARY_OVERLAYS = [", 0], ["screens", "function openAchievementsScreen() {", 0], ["screens", "function showCertificate() {", 0], ["stats", "window.__vb_trackEnemyDefeat = function() {", 0], ["ui", "function openComingSoon(title, text) {", 0], ["stats", "const _origBtnStart_onclick = btnStart.onclick;", 0], ["vanberto", "(function initVanbertoPersonality() {", 0], ["overlays", "[", 0]];

// ---------- inventário do closure ----------
const top = ast.body.find(n => n.type === "ExpressionStatement" && n.loc.start.line === 34);
const cb = top.expression.arguments[1]; const body = cb.body.body;
const closureEnd = top.end;
const trail = at => /^[ \t]*(?:\/\/[^\n]*|\/\*[^\n]*?\*\/)?/.exec(src.slice(at, at + 400))[0];
const stmts = []; let cursor = cb.body.start + 1;
for (const st of body) {
  const tr = trail(st.end);
  stmts.push({ node: st, i: stmts.length, segStart: cursor, leading: src.slice(cursor, st.start), code: src.slice(st.start, st.end), trailing: tr,
    line: st.loc.start.line, endLine: st.loc.end.line, mod: null });
  cursor = st.end + tr.length;
}
const patNames = p => { const a = []; (function f(x) { if (!x) return; if (x.type === "Identifier") a.push(x.name); else if (x.type === "ObjectPattern") x.properties.forEach(q => f(q.value || q.argument)); else if (x.type === "ArrayPattern") x.elements.forEach(f); else if (x.type === "AssignmentPattern") f(x.left); else if (x.type === "RestElement") f(x.argument); })(p); return a; };

{ // atribuir módulo a cada statement pelas âncoras
  const firstLine = st => src.slice(st.start, src.indexOf("\n", st.start)).trim().slice(0, 100);
  const seen = {}; const key = stmts.map(s => { const k = firstLine(s.node); seen[k] = (seen[k] ?? -1) + 1; return k + "\u0000" + seen[k]; });
  const at = ANCHORS.map(([m, txt, occ]) => { const i = key.indexOf(txt + "\u0000" + occ); if (i < 0) throw new Error("âncora não encontrada: " + m + " · " + txt); return [i, m]; });
  for (let k = 1; k < at.length; k++) if (at[k][0] <= at[k - 1][0]) throw new Error("âncoras fora de ordem: " + at[k][1]);
  let cur = 0; stmts.forEach((s, i) => { while (cur + 1 < at.length && at[cur + 1][0] <= i) cur++; s.mod = at[cur][1]; });
}
// ---------- escopos ----------
const sm = escope.analyze(ast, { ecmaVersion: 2022, sourceType: "module" });
const cbScope = sm.acquire(cb);
const stmtAt = pos => { let lo = 0, hi = stmts.length - 1; while (lo <= hi) { const m = (lo + hi) >> 1, s = stmts[m].node; if (pos < s.start) hi = m - 1; else if (pos >= s.end) lo = m + 1; else return m; } return -1; };
const parent = new Map(); walk.fullAncestor(ast, (node, _s, anc) => { if (anc.length > 1) parent.set(node, anc[anc.length - 2]); });

// declaração: nome -> {stmt, kind, declIdx}
const decl = new Map();
stmts.forEach(s => {
  const n = s.node;
  if (n.type === "FunctionDeclaration") decl.set(n.id.name, { stmt: s.i, kind: "function", d: -1 });
  else if (n.type === "VariableDeclaration") n.declarations.forEach((d, di) => patNames(d.id).forEach(nm => decl.set(nm, { stmt: s.i, kind: n.kind, d: di })));
  else if (n.type === "ClassDeclaration") decl.set(n.id.name, { stmt: s.i, kind: "class", d: -1 });
});
// imports originais: nome local -> {imported, source}
const modScope = sm.globalScope.childScopes[0];
const imports = new Map();
for (const v of modScope.variables) { const d = v.defs[0]; if (d && d.type === "ImportBinding") imports.set(v.name, { imported: d.node.imported ? d.node.imported.name : "default", source: d.parent.source.value }); }

// referências
const refs = []; // {name, stmt, r, write, read, evalTime, node, isCallee, init}
for (const v of cbScope.variables) {
  if (!decl.has(v.name)) continue;
  for (const r of v.references) {
    const si = stmtAt(r.identifier.start);
    const p = parent.get(r.identifier);
    refs.push({ name: v.name, stmt: si, r, write: r.isWrite(), read: r.isRead(), init: !!r.init, node: r.identifier,
      evalTime: r.from.variableScope === cbScope, callee: !!(p && (p.type === "CallExpression" || p.type === "NewExpression") && p.callee === r.identifier) });
  }
}
// referências não resolvidas (globais: window, document, Phaser…) e imports usados por statement
const unresolved = new Map(); // nome -> Set(stmt)
const importUse = new Map();  // stmt -> Set(local)
for (const r of cbScope.through) { const si = stmtAt(r.identifier.start); if (imports.has(r.identifier.name)) { (importUse.get(si) || importUse.set(si, new Set()).get(si)).add(r.identifier.name); } else { (unresolved.get(r.identifier.name) || unresolved.set(r.identifier.name, new Set()).get(r.identifier.name)).add(si); } }
// (through do cbScope inclui imports do módulo, que resolvem no escopo do módulo)

// ---------- classificação: declarador simples vs diferido ----------
const deferredName = new Set();     // nomes cujo valor inicial corre numa «init run»
const deferredDecl = new Set();     // "stmt:declIdx"
for (const s of stmts) {
  const n = s.node; if (n.type !== "VariableDeclaration") continue;
  n.declarations.forEach((d, di) => {
    if (!d.init) return;
    const inside = refs.filter(x => x.stmt === s.i && x.evalTime && x.node.start >= d.init.start && x.node.end <= d.init.end && !x.write);
    let why = null;
    for (const x of inside) {
      const dd = decl.get(x.name), dm = stmts[dd.stmt].mod;
      if (x.callee) { why = `chama ${x.name}()`; break; }
      if (dm !== s.mod && dd.kind !== "function") { why = `usa ${x.name} de ${dm}`; break; }
      if (deferredName.has(x.name)) { why = `usa ${x.name} (diferido)`; break; }
    }
    if (why) { deferredDecl.add(s.i + ":" + di); patNames(d.id).forEach(nm => deferredName.add(nm)); s.deferredWhy = (s.deferredWhy || []).concat([why]); }
  });
}
// ---------- escritas entre módulos ----------
const modOf = si => stmts[si].mod;
const crossWrites = refs.filter(x => x.write && !x.init && decl.get(x.name).kind !== "function" && modOf(x.stmt) !== modOf(decl.get(x.name).stmt));
const usedElsewhere = new Map(); // nome -> Set(módulos que o usam)
for (const x of refs) { const dm = modOf(decl.get(x.name).stmt), um = modOf(x.stmt); if (um !== dm) (usedElsewhere.get(x.name) || usedElsewhere.set(x.name, new Set()).get(x.name)).add(um); }
const setterNames = new Set(crossWrites.map(x => x.name));

// ---------- relatório ----------
const sizes = {}; stmts.forEach(s => sizes[s.mod] = (sizes[s.mod] || 0) + (s.endLine - s.line + 1));
if (MODE === "report") {
  console.log("statements:", stmts.length, " módulos:", Object.keys(sizes).length);
  console.log("tamanho por módulo (linhas):", JSON.stringify(sizes));
  const tipos = {}; stmts.forEach(s => tipos[s.node.type] = (tipos[s.node.type] || 0) + 1); console.log("tipos:", JSON.stringify(tipos));
  const eff = stmts.filter(s => !/Function|Variable|Class/.test(s.node.type)); console.log("statements de efeito (init):", eff.length, " linhas:", eff.reduce((a, s) => a + s.endLine - s.line + 1, 0));
  console.log("declarações diferidas:", deferredDecl.size);
  for (const s of stmts) if (s.deferredWhy) console.log("  diferido", s.line, s.node.declarations.map(d => patNames(d.id).join("/")).join(","), "←", s.deferredWhy.join("; "));
  console.log("escritas entre módulos:", crossWrites.length, " variáveis com setter:", setterNames.size);
  const byVar = {}; crossWrites.forEach(x => byVar[x.name] = (byVar[x.name] || 0) + 1); console.log(JSON.stringify(byVar));
  const kinds = {}; crossWrites.forEach(x => { const p = parent.get(x.node); const k = p.type + (p.operator ? p.operator : "") + ((p.type === "UpdateExpression" && parent.get(p).type !== "ExpressionStatement" && !(parent.get(p).type==="ForStatement")) ? "(valor usado)" : ""); kinds[k] = (kinds[k] || 0) + 1; });
  console.log("formas das escritas:", JSON.stringify(kinds));
  console.log("globais não resolvidos:", [...unresolved.keys()].join(", "));
  // this/arguments/return/await no closure
  let bad = []; walk.fullAncestor(cb.body, (n, _s, anc) => { if (n.type === "ThisExpression" || (n.type === "Identifier" && n.name === "arguments") || n.type === "ReturnStatement" || n.type === "AwaitExpression") { const fn = [...anc].reverse().find(a => /Function/.test(a.type)); if (!fn) bad.push(n.type + "@" + n.loc.start.line); } }); console.log("this/arguments/return/await ao nível do closure:", bad.length ? bad.join(",") : "nenhum");
  process.exit(0);
}

// ======================= GERAÇÃO =======================
const STAMP = /\?v=([A-Za-z0-9_]+)/.exec(src)[1];
const FILE = m => m.replace(/[A-Z]/g, c => "-" + c.toLowerCase());          // bossCore -> boss-core
const modPath = m => `./${FILE(m)}.js?v=${STAMP}`;
const lineStarts = [0]; for (let k = 0; k < src.length; k++) if (src[k] === "\n") lineStarts.push(k + 1);
const lineOf = off => { let lo = 0, hi = lineStarts.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (lineStarts[m] <= off) lo = m; else hi = m - 1; } return lo + 1; };
const noDedent = new Set(); walk.full(ast, n => { if (n.type === "TemplateLiteral") for (let l = n.loc.start.line + 1; l <= n.loc.end.line; l++) noDedent.add(l); });

// --- onde fica cada nome ---
const finalMod = new Map(); for (const [nm, d] of decl) finalMod.set(nm, stmts[d.stmt].mod);
const placeMod = si => stmts[si].mod;
const isVar = nm => { const k = decl.get(nm).kind; return k === "let" || k === "var"; };
// escritas entre módulos (1.ª passagem, com os módulos de origem) → candidatos a irem para state.js
const cw0 = new Set(refs.filter(x => x.write && !x.init && isVar(x.name) && placeMod(x.stmt) !== finalMod.get(x.name)).map(x => x.name));
const moved = new Set(), keptWhy = [];
for (const s of stmts) if (s.node.type === "VariableDeclaration" && s.node.kind !== "const") s.node.declarations.forEach((d, di) => {
  const names = patNames(d.id); if (!names.some(n => cw0.has(n))) return;
  if (deferredDecl.has(s.i + ":" + di)) { keptWhy.push(names.join("/") + " (diferido)"); return; }
  const inside = refs.filter(x => x.stmt === s.i && x.node.start >= d.start && x.node.end <= d.end && x.evalTime && !x.init);
  if (inside.length) { keptWhy.push(names.join("/") + " (inicializador usa " + inside.map(x => x.name).join(",") + ")"); return; }
  names.forEach(n => { finalMod.set(n, "state"); moved.add(n); });
});
const wr = refs.filter(x => x.write && !x.init && isVar(x.name) && placeMod(x.stmt) !== finalMod.get(x.name));
const setters = new Set(wr.map(x => x.name));

// --- edições de texto (escritas entre módulos → set_x(...)) ---
const edits = []; // {start,end,text}
const opEndAfter = (from, op) => { let k = from; while (/\s/.test(src[k])) k++; if (!src.startsWith(op, k)) throw new Error("operador não encontrado em " + lineOf(from)); return k + op.length; };
const manual = [];
for (const x of wr) {
  const P = parent.get(x.node), nm = x.name;
  if (P.type === "AssignmentExpression" && P.left === x.node) {
    const opEnd = opEndAfter(x.node.end, P.operator);
    if (P.operator === "=") { edits.push({ start: x.node.start, end: opEnd, text: `set_${nm}(` }); edits.push({ start: P.end, end: P.end, text: ")" }); }
    else { const bin = P.operator.slice(0, -1); edits.push({ start: x.node.start, end: opEnd, text: `set_${nm}(${nm} ${bin} (` }); edits.push({ start: P.end, end: P.end, text: "))" }); }
  } else if (P.type === "UpdateExpression") {
    const G = parent.get(P); const asStmt = G.type === "ExpressionStatement" || (G.type === "ForStatement" && G.update === P);
    const d = P.operator === "++" ? "+" : "-", inv = P.operator === "++" ? "-" : "+";
    let txt = `set_${nm}(${nm} ${d} 1)`;
    if (!asStmt && !P.prefix) txt = `(${txt}, ${nm} ${inv} 1)`;
    edits.push({ start: P.start, end: P.end, text: txt });
  } else manual.push(`${nm}@${x.node.loc.start.line} (${P.type})`);
}
if (manual.length) { console.error("ESCRITAS SEM REGRA AUTOMÁTICA:", manual.join("; ")); process.exit(2); }
function render(start, end) {
  const es = edits.filter(e => e.start >= start && e.end <= end).sort((a, b) => b.start - a.start || b.end - a.end);
  let t = src.slice(start, end);
  for (const e of es) t = t.slice(0, e.start - start) + e.text + t.slice(e.end - start);
  return t;
}
const dedent = (text, firstLine) => text.split("\n").map((ln, k) => noDedent.has(firstLine + k) ? ln : ln.replace(/^  /, "")).join("\n");

// --- uso de nomes por módulo (para exports/imports) ---
const usesFrom = new Map(); // módulo -> Map(módulo-dono -> Set(nomes))
const addUse = (mod, owner, nm) => { if (mod === owner) return; const m = usesFrom.get(mod) || usesFrom.set(mod, new Map()).get(mod); (m.get(owner) || m.set(owner, new Set()).get(owner)).add(nm); };
const exported = new Set(); // nomes a exportar
for (const x of refs) {
  const pm = placeMod(x.stmt), om = finalMod.get(x.name);
  if (pm === om) continue;
  const isW = x.write && !x.init && isVar(x.name);
  if (isW) { const P = parent.get(x.node); addUse(pm, om, "set_" + x.name); exported.add("set_" + x.name); if (P.type !== "AssignmentExpression" || P.operator !== "=") { addUse(pm, om, x.name); exported.add(x.name); } }
  else if (!x.init) { addUse(pm, om, x.name); exported.add(x.name); }
}
// imports de dados (módulos da raiz) por módulo
const dataUse = new Map(); // módulo -> Map(source -> Map(local -> imported))
for (const [si, set] of importUse) { const pm = placeMod(si); for (const local of set) { const imp = imports.get(local); const m = dataUse.get(pm) || dataUse.set(pm, new Map()).get(pm); const mm = m.get(imp.source) || m.set(imp.source, new Map()).get(imp.source); mm.set(local, imp.imported); } }

// --- construir os módulos ---
const out = new Map(); for (const m of Object.keys(MODULES)) out.set(m, { pieces: [], inits: [], setters: [] });
const initItems = []; // por ordem: {mod, text}
// Cabeçalhos de secção («// ===== TÍTULO =====» e o parágrafo de comentário que os acompanha) ficam no módulo de origem,
// mesmo quando a variável que vinha a seguir vai para state.js.
const carry = new Map(); // módulo -> texto a antepor à próxima peça desse módulo
const isHeaderLine = l => /^\s*\/\/\s*(={3,}|─{3,}|-{3,})/.test(l);
function splitHeaders(leadingText) { // devolve {header, rest} (blocos separados por linhas em branco)
  const blocks = leadingText.split(/\n[ \t]*\n/); const head = [], rest = [];
  for (const b of blocks) (b.split("\n").some(isHeaderLine) ? head : rest).push(b);
  return { header: head.join("\n\n"), rest: rest.join("\n\n") };
}
const tidyLead = (leading, firstLine) => { const ls = leading.split("\n"); ls.shift(); const t = ls.join("\n").replace(/\n{3,}/g, "\n\n"); return t.trim() ? dedent(t, firstLine + 1).replace(/^\n+/, "") + "\n" : ""; };
const takeCarry = m => { const c = carry.get(m) || ""; carry.delete(m); return c; };
const expPrefix = nm => exported.has(nm) ? "export " : "";
for (const s of stmts) {
  const n = s.node, firstLine = lineOf(s.segStart);
  if (n.type === "FunctionDeclaration") {
    let code = dedent(render(n.start, n.end), s.line);
    if (exported.has(n.id.name)) code = "export " + code;
    out.get(s.mod).pieces.push(takeCarry(s.mod) + tidyLead(s.leading, firstLine) + code + s.trailing);
  } else if (n.type === "VariableDeclaration") {
    let leadDone = false;
    n.declarations.forEach((d, di) => {
      const names = patNames(d.id), key = s.i + ":" + di, fm = finalMod.get(names[0]);
      let leadRaw = leadDone ? "" : s.leading; leadDone = true;
      if (leadRaw && fm !== s.mod) { const sp = splitHeaders(leadRaw.replace(/^[^\n]*\n/, "")); if (sp.header.trim()) { carry.set(s.mod, (carry.get(s.mod) || "") + dedent(sp.header, firstLine + 1) + "\n\n"); leadRaw = "\n" + sp.rest; } }
      const lead = tidyLead(leadRaw, firstLine);
      const last = di === n.declarations.length - 1;
      const exp = names.some(x => exported.has(x)) ? "export " : "";
      const idText = src.slice(d.id.start, d.id.end);
      let text;
      if (!d.init) text = `${exp}${n.kind} ${idText};`;
      else if (deferredDecl.has(key)) {
        text = `${exp}let ${names.join(", ")};`;
        const initText = render(d.init.start, d.init.end);
        const assign = d.id.type === "Identifier" ? `  ${idText} = ${initText};` : `  (${idText} = ${initText});`;
        initItems.push({ mod: s.mod, text: "\n  // " + names.join(", ") + " (declarado no início deste ficheiro)\n" + assign });
      } else text = `${exp}${n.kind} ${dedent(render(d.start, d.end), lineOf(d.start))};`;
      out.get(fm).pieces.push(takeCarry(fm) + lead + text + (last ? s.trailing : ""));
    });
  } else { // efeito
    initItems.push({ mod: s.mod, text: s.leading.replace(/^[^\n]*\n/, "").replace(/\n{3,}/g, "\n\n") + render(n.start, n.end) + s.trailing });
  }
}
for (const [m, c] of carry) out.get(m).pieces.push(c.trim());
// setters
for (const nm of setters) out.get(finalMod.get(nm)).setters.push(`export function set_${nm}(v) { ${nm} = v; return v; }`);
// init runs: agrupar itens consecutivos do mesmo módulo
const runs = []; for (const it of initItems) { const last = runs[runs.length - 1]; if (last && last.mod === it.mod) last.items.push(it.text); else runs.push({ mod: it.mod, items: [it.text] }); }
const runCount = {}; const runCalls = [];
for (const r of runs) { const k = runCount[r.mod] = (runCount[r.mod] ?? -1) + 1; const nm = `init_${r.mod}_${k}`; out.get(r.mod).inits.push(`export function ${nm}() {\n${r.items.join("\n")}\n}`); runCalls.push({ mod: r.mod, nm }); }

// --- ficheiros ---
const HEADER = (m) => `/*************************************************\n * VanBerto's — Missão Cibersegurança 🛡️  ·  game/${FILE(m)}.js\n *\n * ${MODULES[m][0]}\n *\n * Faz parte de dia-crianca.js, dividido em módulos (ver README.md, «Estrutura do código»).\n * ${m === "state" ? "Estado partilhado: LÊ-SE diretamente (import); para ALTERAR usa as funções set_<nome>() — os imports ES são só de leitura." : "As variáveis de estado vivem em state.js; aqui alteram-se com set_<nome>()."}\n *************************************************/\n`;
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT + "/game", { recursive: true });
console.log("A escrever em", OUT, "(a partir de", ROOT + "/dia-crianca.antes-da-divisao.js)");
const report = [];
for (const [m, o] of out) {
  if (!o.pieces.length && !o.inits.length) { report.push(`${m}: vazio`); continue; }
  const imp = [];
  const um = usesFrom.get(m) || new Map();
  for (const [owner, names] of [...um].sort((a, b) => a[0].localeCompare(b[0]))) imp.push(`import { ${[...names].sort().join(", ")} } from "${modPath(owner)}";`);
  const dm = dataUse.get(m) || new Map();
  for (const [source, mm] of dm) imp.push(`import { ${[...mm].map(([local, imported]) => local === imported ? local : `${imported} as ${local}`).join(", ")} } from "${source.replace(/^\.\//, "../")}";`);
  const text = HEADER(m) + "\n" + imp.join("\n") + (imp.length ? "\n\n" : "\n") + o.pieces.join("\n\n") + (o.setters.length ? "\n\n// ----- escrita a partir de outros módulos -----\n" + o.setters.join("\n") : "") + (o.inits.length ? "\n\n// ----- ligações executadas no arranque (ordem original preservada; chamadas por dia-crianca.js) -----\n" + o.inits.join("\n\n") : "") + "\n";
  fs.writeFileSync(`${OUT}/game/${FILE(m)}.js`, text);
  report.push(`${m}: ${text.split("\n").length} linhas`);
}
// ficheiro principal
const head = src.slice(0, src.indexOf("import "));
const importedMods = new Set(runCalls.map(r => r.mod));
const mainImports = [...importedMods].map(m => `import { ${runCalls.filter(r => r.mod === m).map(r => r.nm).join(", ")} } from "./game/${FILE(m)}.js?v=${STAMP}";`);
const sideOnly = [...out].filter(([m, o]) => (o.pieces.length || o.inits.length) && !importedMods.has(m)).map(([m]) => `import "./game/${FILE(m)}.js?v=${STAMP}";`);
const tail = src.slice(closureEnd);
const main = head.replace(/\s+$/, "") + `\n *\n * Este ficheiro só arranca o jogo: o código está dividido em módulos em game/ (ver README.md, «Estrutura do código»).\n * Os módulos só DECLARAM funções e estado; as ligações que antes corriam por esta ordem dentro de um único\n * DOMContentLoaded são agora funções init_<módulo>_<n>() chamadas aqui, na MESMA ordem de antes.\n *************************************************/\n\n` ;
// o cabeçalho original termina com "*****/": remover o fecho duplicado
const mainFixed = main.replace(/\n \*{10,}\/\n \*\n \* Este ficheiro/, "\n *\n * Este ficheiro");
fs.writeFileSync(OUT + "/dia-crianca.js", mainFixed + mainImports.join("\n") + (sideOnly.length ? "\n" + sideOnly.join("\n") : "") + `\n\nwindow.addEventListener("DOMContentLoaded", () => {\n${runCalls.map(r => `  ${r.nm}();`).join("\n")}\n});\n` + tail);
console.log(report.join("\n"));
console.log("movidas para state:", moved.size, " mantidas no dono:", keptWhy.length); keptWhy.forEach(x => console.log("   ", x));
console.log("escritas reescritas:", wr.length, " setters:", setters.size, " runs de init:", runCalls.length, " exports:", exported.size);
