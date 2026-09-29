// ============================================================================================
// FERRAMENTA DE AUDITORIA — usada uma vez para confirmar que dividir dia-crianca.js em módulos
// (ver split_source.mjs, nesta mesma pasta) não mudou nada de comportamento. Compara, função a
// função e efeito de arranque a efeito de arranque (por AST, ignorando comentários/formatação),
// o dia-crianca.antes-da-divisao.js (guardado aqui) com os módulos gerados em game/.
// Modo: node verify_split.mjs [pasta_de_saída_do_split_source] [pasta_com_o_original]
// Dependências (não incluídas no jogo, só precisas delas para correr isto): `npm i acorn acorn-walk eslint-scope`
// ============================================================================================
import fs from "fs"; import path from "path";
import * as acorn from "acorn"; import * as walk from "acorn-walk"; import * as escope from "eslint-scope";
const HERE = new URL(".", import.meta.url).pathname;
const OUTDIR = process.argv[2] || (HERE + "saida"), ROOT = process.argv[3] || HERE;
const P = (m) => { problems.push(m); }; const problems = [];
const parse = (s) => acorn.parse(s, { ecmaVersion: "latest", sourceType: "module", locations: true, ranges: true });
// ---------- original ----------
const osrc = fs.readFileSync(ROOT + "/dia-crianca.antes-da-divisao.js", "utf8"); const oast = parse(osrc);
const otop = oast.body.find(n => n.type === "ExpressionStatement" && n.expression.callee?.property?.name === "addEventListener" && n.expression.arguments[0]?.value === "DOMContentLoaded");
const ocb = otop.expression.arguments[1], obody = ocb.body.body;
const osm = escope.analyze(oast, { ecmaVersion: 2022, sourceType: "module" });
const oGlobals = new Set(osm.acquire(ocb).through.map(r => r.identifier.name).filter(n => !oast.body.some(b => b.type === "ImportDeclaration" && b.specifiers.some(sp => sp.local.name === n))));
// ---------- normalização ----------
const isBin = op => !["||", "&&", "??"].includes(op);
function canon(node, assignedNames) {
  // devolve JSON string sem posições; reescritas set_x(...) e x+=/x++ → x = ...
  const rec = (n) => {
    if (Array.isArray(n)) return n.map(rec);
    if (n === null || typeof n !== "object") return n;
    if (n.type === "CallExpression" && n.callee.type === "Identifier" && /^set_/.test(n.callee.name) && n.arguments.length === 1)
      return { type: "AssignmentExpression", operator: "=", left: { type: "Identifier", name: n.callee.name.slice(4) }, right: rec(n.arguments[0]) };
    if (n.type === "AssignmentExpression" && n.operator !== "=" && n.left.type === "Identifier") {
      const op = n.operator.slice(0, -1);
      return { type: "AssignmentExpression", operator: "=", left: rec(n.left), right: { type: isBin(op) ? "BinaryExpression" : "LogicalExpression", operator: op, left: rec(n.left), right: rec(n.right) } };
    }
    if (n.type === "UpdateExpression" && n.argument.type === "Identifier") {
      const op = n.operator === "++" ? "+" : "-";
      return { type: "AssignmentExpression", operator: "=", left: rec(n.argument), right: { type: "BinaryExpression", operator: op, left: rec(n.argument), right: { type: "Literal", value: 1 } } };
    }
    const o = {}; for (const k of Object.keys(n)) { if (["start", "end", "loc", "range", "raw", "sourceType"].includes(k)) continue; o[k] = rec(n[k]); }
    return o;
  };
  const sortKeys = v => Array.isArray(v) ? v.map(sortKeys) : (v && typeof v === "object") ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sortKeys(v[k])])) : v;
  return JSON.stringify(sortKeys(rec(node)));
}
// ---------- inventário do original ----------
const oFuncs = new Map(), oEffects = [], oDecl = new Map();
for (const st of obody) {
  if (st.type === "FunctionDeclaration") oFuncs.set(st.id.name, canon(st));
  else if (st.type === "VariableDeclaration") for (const d of st.declarations) oDecl.set(src(d.id), { kind: st.kind, init: d.init ? canon(d.init) : null });
  else oEffects.push(canon(st));
}
function src(n) { return osrc.slice(n.start, n.end); }
// ---------- novo ----------
const files = fs.readdirSync(OUTDIR + "/game").filter(f => f.endsWith(".js")).map(f => "game/" + f);
const nFuncs = new Map(), nEffects = [], nDecl = new Map(), exportsOf = new Map(), declsOf = new Map();
const newGlobals = new Set(); let importedBindings = 0;
const DATA = new Map(); // ficheiro de dados -> exports
const exportsOfFile = (abs) => { if (DATA.has(abs)) return DATA.get(abs); const a = parse(fs.readFileSync(abs, "utf8")); const s = new Set();
  for (const n of a.body) if (n.type === "ExportNamedDeclaration") { if (n.declaration) { if (n.declaration.id) s.add(n.declaration.id.name); else n.declaration.declarations.forEach(d => { (function f(x){ if(x.type==="Identifier") s.add(x.name); else if(x.type==="ObjectPattern") x.properties.forEach(q=>f(q.value||q.argument)); else if(x.type==="ArrayPattern") x.elements.forEach(e=>e&&f(e)); })(d.id); }); } n.specifiers?.forEach(sp => s.add(sp.exported.name)); }
  DATA.set(abs, s); return s; };
const parsed = new Map();
for (const f of files) {
  const text = fs.readFileSync(path.join(OUTDIR, f), "utf8"); let ast; try { ast = parse(text); } catch (e) { P(`${f}: erro de sintaxe: ${e.message}`); continue; } parsed.set(f, { text, ast });
  exportsOf.set(f, exportsOfFile(path.join(OUTDIR, f)));
}
for (const [f, { text, ast }] of parsed) {
  const sm = escope.analyze(ast, { ecmaVersion: 2022, sourceType: "module" }); const ms = sm.globalScope.childScopes[0];
  const topNames = new Set(); const importLocals = new Map();
  for (const n of ast.body) {
    if (n.type === "ImportDeclaration") {
      const target = path.normalize(path.join(path.dirname(path.join(OUTDIR, f)), n.source.value.split("?")[0]));
      let ex; try { ex = exportsOfFile(target.startsWith(OUTDIR + "/game/") ? target : path.join(ROOT, path.relative(OUTDIR, target))); } catch (e) { P(`${f}: import de ficheiro que não existe: ${n.source.value}`); continue; }
      for (const sp of n.specifiers) { const imp = sp.imported?.name; importedBindings++; if (imp && !ex.has(imp)) P(`${f}: importa «${imp}» de ${n.source.value}, que não o exporta`); if (importLocals.has(sp.local.name)) P(`${f}: nome importado duas vezes: ${sp.local.name}`); importLocals.set(sp.local.name, n.source.value); }
    } else {
      const decls = n.type === "ExportNamedDeclaration" ? n.declaration : n; if (!decls) continue;
      const names = decls.type === "FunctionDeclaration" ? [decls.id.name] : decls.type === "VariableDeclaration" ? decls.declarations.flatMap(d => { const a=[]; (function f2(x){ if(x.type==="Identifier")a.push(x.name); else if(x.type==="ObjectPattern")x.properties.forEach(q=>f2(q.value||q.argument)); else if(x.type==="ArrayPattern")x.elements.forEach(e=>e&&f2(e)); })(d.id); return a; }) : [];
      names.forEach(nm => { if (topNames.has(nm)) P(`${f}: declarado duas vezes: ${nm}`); topNames.add(nm); if (importLocals.has(nm)) P(`${f}: «${nm}» é importado e declarado no mesmo módulo`); });
      declsOf.set(f, topNames);
      if (decls.type === "FunctionDeclaration") {
        const nm = decls.id.name;
        if (/^set_/.test(nm) && decls.body.body.length === 2) continue;             // setters: novos
        if (/^init_[A-Za-z]+_\d+$/.test(nm)) { for (const st of decls.body.body) nEffects.push({ f, c: canon(st), line: st.loc.start.line }); continue; }
        if (nFuncs.has(nm)) P(`função duplicada entre módulos: ${nm}`); nFuncs.set(nm, canon(decls));
      } else if (decls.type === "VariableDeclaration") for (const d of decls.declarations) nDecl.set(text.slice(d.id.start, d.id.end), { kind: decls.kind, init: d.init ? canon(d.init) : null });
    }
  }
  // globais não resolvidos
  for (const r of ms.through) newGlobals.add(r.identifier.name);
  for (const r of sm.globalScope.through) newGlobals.add(r.identifier.name);
  // escritas em bindings importados
  for (const v of ms.variables) { const d = v.defs[0]; if (d && d.type === "ImportBinding") for (const r of v.references) if (r.isWrite()) P(`${f}:${r.identifier.loc.start.line}: escreve num binding importado (${v.name})`); }
  // segurança de ordem de avaliação: nada ao nível do módulo pode ler/chamar bindings de outros módulos do jogo
  for (const v of ms.variables) { const d = v.defs[0]; if (!d || d.type !== "ImportBinding") continue; if (!String(d.parent.source.value).startsWith("./")) continue;
    for (const r of v.references) if (r.from.variableScope === ms) P(`${f}:${r.identifier.loc.start.line}: usa «${v.name}» (de outro módulo do jogo) ao nível do módulo, na avaliação`); }
}
// ---------- comparações ----------
for (const g of newGlobals) if (!oGlobals.has(g)) P(`nome não resolvido no novo código (faltou um import?): ${g}`);
for (const g of oGlobals) if (!newGlobals.has(g)) console.log("aviso: global do original que já não aparece:", g);
let same = 0, diff = [];
for (const [nm, c] of oFuncs) { if (!nFuncs.has(nm)) { P(`função em falta: ${nm}`); continue; } if (nFuncs.get(nm) === c) same++; else diff.push(nm); }
for (const nm of nFuncs.keys()) if (!oFuncs.has(nm)) P(`função a mais: ${nm}`);
if (diff.length) P(`funções com AST diferente do original: ${diff.join(", ")}`);
if (process.env.DBG) for (const nm of diff.slice(0, +process.env.DBG)) { const a = JSON.parse(oFuncs.get(nm)), b = JSON.parse(nFuncs.get(nm)); const find = (x, y, p) => { if (JSON.stringify(x) === JSON.stringify(y)) return null; if (x && y && typeof x === "object" && typeof y === "object") { const ks = new Set([...Object.keys(x), ...Object.keys(y)]); for (const k of ks) { const r = find(x[k], y[k], p + "." + k); if (r) return r; } return null; } return p + "\n   original: " + JSON.stringify(x)?.slice(0, 300) + "\n   novo:     " + JSON.stringify(y)?.slice(0, 300); }; console.log("DIFF em", nm, find(a, b, "")); }
// efeitos: multiconjunto
const bag = new Map(); for (const c of oEffects) bag.set(c, (bag.get(c) || 0) + 1);
const extra = []; for (const e of nEffects) { if (bag.get(e.c)) bag.set(e.c, bag.get(e.c) - 1); else extra.push(e); }
const missing = [...bag.entries()].filter(([, n]) => n > 0);
// declaradores diferidos: no novo ficam «let x;» + uma atribuição «x = init;» na função init; confirmar que a atribuição existe e é igual
const sortKeys = v => Array.isArray(v) ? v.map(sortKeys) : (v && typeof v === "object") ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sortKeys(v[k])])) : v;
let deferredOk = 0;
for (const [nm, d] of oDecl) {
  if (!nDecl.has(nm)) continue; const nd = nDecl.get(nm);
  if (nd.init === null && d.init !== null) {
    const want = JSON.stringify(sortKeys({ type: "ExpressionStatement", expression: { type: "AssignmentExpression", operator: "=", left: { type: "Identifier", name: nm }, right: JSON.parse(d.init) } }));
    const k = extra.findIndex(e => e.c === want);
    if (k < 0) P(`declaração diferida «${nm}»: não encontrei a atribuição igual na função init`); else { extra.splice(k, 1); deferredOk++; }
    continue;
  }
  if (d.init !== nd.init && d.init !== null) P(`declaração «${nm}»: inicializador diferente do original`);
  if (d.kind !== nd.kind && !(d.kind === "const" && nd.kind === "let")) P(`declaração «${nm}»: kind mudou ${d.kind}→${nd.kind}`);
}
console.log("declarações diferidas verificadas:", deferredOk);
for (const nm of oDecl.keys()) if (!nDecl.has(nm)) console.log("aviso: declaração sem correspondente direto (diferida?):", nm);
console.log(`funções idênticas ao original (módulo set_): ${same}/${oFuncs.size} · statements de arranque: original ${oEffects.length}, novo ${nEffects.length}, sem par no novo ${missing.length}, a mais ${extra.length} · imports verificados: ${importedBindings}`);
extra.forEach(e => P(`statement de arranque a mais no novo: ${e.f} linha ${e.line}: ${e.c.slice(0, 120)}`));
if (missing.length) P(`statements de arranque do original sem par no novo: ${missing.length}`);
console.log(problems.length ? "\nPROBLEMAS:\n - " + problems.join("\n - ") : "\nverificação estática: OK");
process.exit(problems.length ? 1 : 0);
