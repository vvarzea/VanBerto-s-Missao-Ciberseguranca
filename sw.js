// Service worker: depois da 1.ª visita, o jogo abre e funciona sem rede.
//  • Na instalação guarda o «núcleo» (páginas, scripts, estilos, Phaser, fontes, ícones), com o mesmo ?v= que o index.html pede.
//  • As imagens dos fundos (grandes) guardam-se à medida que o jogo as pede: sem rede, os níveis que já foram
//    jogados têm fundo; os outros mostram o céu desenhado (o jogo já lida com isso em applyBackground).
//  • Cada versão tem a sua própria cache, por isso nunca se misturam ficheiros de versões diferentes.
// VERSION é carimbada pelo _dev/release.py e tem de ser igual à string ?v= do index.html (o check.mjs verifica).
const VERSION = "20260922v86";
const CACHE = "vanbertos-" + VERSION;

// Ficheiros do núcleo. Os .js e .css pedem-se com ?v=VERSION, como no index.html e nos imports.
const CORE = [
  "./", "index.html", "manifest.json",
  "dia-crianca.css", "dia-crianca.js", "phaser.min.js",
  "achievements.js", "audio.js", "background.js", "cinematics.js", "stars.js", "storage.js", "textures.js",
  "data-bosses.js", "data-flavor.js", "data-levels.js", "data-progression.js", "data-quiz.js", "data-story.js",
  "vanberto_real.png", "apple-touch-icon.png", "favicon.ico", "favicon-16x16.png", "favicon-32x32.png", "favicon-48x48.png",
  "icon-192.png", "icon-512.png", "icon-maskable-512.png",
  "fonts/baloo-2-latin-400-normal.woff2", "fonts/baloo-2-latin-600-normal.woff2",
  "fonts/baloo-2-latin-700-normal.woff2", "fonts/baloo-2-latin-800-normal.woff2",
  "fonts/nunito-latin-400-normal.woff2", "fonts/nunito-latin-400-italic.woff2",
  "fonts/nunito-latin-600-normal.woff2", "fonts/nunito-latin-700-normal.woff2"
];
const versioned = f => /\.(js|css)$/.test(f) ? f + "?v=" + VERSION : f;

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // cache:"reload" ignora a cache HTTP do browser, para guardar mesmo a versão que está no servidor
    await cache.addAll(CORE.map(f => new Request(versioned(f), { cache: "reload" })));
    // o mesmo conteúdo serve para «/» e para «/index.html»
    const home = await cache.match("index.html");
    if (home) await cache.put("./", home.clone());
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("vanbertos-") && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function timeoutFetch(req, ms) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try { return await fetch(req, { signal: ctl.signal }); } finally { clearTimeout(t); }
}

// Páginas: rede primeiro (apanha logo a versão nova), com cache como reserva se não houver rede ou estiver lenta.
async function pageRequest(req) {
  const cache = await caches.open(CACHE);
  const cached = (await cache.match(req)) || (await cache.match("./"));
  try {
    const res = cached ? await timeoutFetch(req, 4000) : await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    return cached || Response.error();
  }
}

// Tudo o resto: cache primeiro; se faltar, vai à rede e guarda.
async function assetRequest(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    return Response.error();
  }
}

// Descarregar TUDO de propósito (botão "Guardar para jogar sem rede", em Opções): o cliente envia
// a lista de fundos (dia-crianca.js sabe-a — BG_FILES) por uma MessageChannel e o service worker
// vai buscando e guardando cada um, respondendo o progresso à medida que avança.
self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_ALL") return;
  const port = event.ports[0];
  const files = event.data.files || [];
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    let done = 0, failed = [];
    for (const f of files) {
      try {
        if (!(await cache.match(f))) {
          const res = await fetch(f);
          if (res && res.ok) await cache.put(f, res.clone()); else failed.push(f);
        }
      } catch (e) { failed.push(f); }
      done++;
      port?.postMessage({ type: "CACHE_ALL_PROGRESS", done, total: files.length });
    }
    port?.postMessage({ type: "CACHE_ALL_DONE", failed });
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.endsWith("/sw.js")) return;
  event.respondWith(req.mode === "navigate" ? pageRequest(req) : assetRequest(req));
});
