// ===== Armazenamento consolidado — Fase 4 =====
// Antes: 7 chaves separadas em localStorage (uma por sistema: som/alto contraste,
// mapa, álbum de artefactos, estrelas, conquistas, estatísticas globais...),
// cada uma com o seu próprio try/catch e sem qualquer versão.
// Agora: UMA única chave "vanbertos_save_v2", com os dados de cada sistema
// guardados no seu próprio "namespace" dentro do mesmo objeto. Cada módulo
// continua tão independente como antes — só troca localStorage.getItem/setItem
// diretos por loadNamespace/saveNamespace.
//
// Migração: se um jogador já tiver progresso guardado nas chaves antigas
// (v1), esse progresso é lido uma única vez e copiado para a chave nova antes
// de ser apagado — ninguém perde progresso por causa desta reorganização.

const ROOT_KEY = "vanbertos_ciberseguranca_save_v1";

let root = null;

function loadRoot() {
  if (root) return root;
  try {
    const raw = localStorage.getItem(ROOT_KEY);
    root = raw ? JSON.parse(raw) : {};
  } catch {
    root = {};
  }
  if (!root || typeof root !== "object") root = {};
  return root;
}

function persistRoot() {
  try { localStorage.setItem(ROOT_KEY, JSON.stringify(root)); } catch {}
}

export function loadNamespace(ns, fallback = {}) {
  const r = loadRoot();
  return (r[ns] && typeof r[ns] === "object") ? r[ns] : fallback;
}

export function saveNamespace(ns, data) {
  const r = loadRoot();
  r[ns] = data;
  persistRoot();
}

export function clearNamespace(ns, fallback = {}) {
  const r = loadRoot();
  r[ns] = fallback;
  persistRoot();
}

// ===== Migração automática (chaves antigas v1 → v2) =====
// Só corre uma vez: se a chave nova já existir, presume-se que já foi migrado.
const OLD_KEYS = {
  map: "vanbertos_map_progress_v1",
  artefacts: "vanbertos_artefacts_v1",
  stars: "vanbertos_stars_v1",
  achievements: "vanbertos_achievements_v1",
  globalStats: "vanbertos_global_stats_v1",
};
const OLD_SETTINGS_KEY = "vanbertos_dia_crianca_v1"; // { muted }
const OLD_HC_KEY = "vanbertos_hc";                    // "1" / "0"

(function migrateFromOldKeys() {
  try {
    if (localStorage.getItem(ROOT_KEY)) return; // já está na v2
    const migrated = {};
    let foundAnything = false;

    for (const [ns, oldKey] of Object.entries(OLD_KEYS)) {
      const raw = localStorage.getItem(oldKey);
      if (raw == null) continue;
      try {
        migrated[ns] = JSON.parse(raw);
        foundAnything = true;
      } catch {}
    }

    const settings = {};
    const rawSettings = localStorage.getItem(OLD_SETTINGS_KEY);
    if (rawSettings != null) {
      try {
        const parsed = JSON.parse(rawSettings);
        if (typeof parsed.muted === "boolean") settings.muted = parsed.muted;
      } catch {}
    }
    const rawHC = localStorage.getItem(OLD_HC_KEY);
    if (rawHC != null) settings.hc = rawHC === "1";
    if (Object.keys(settings).length) { migrated.settings = settings; foundAnything = true; }

    if (foundAnything) {
      root = migrated;
      persistRoot();
    }

    // Limpar as chaves antigas para não deixar dados órfãos por trás.
    [...Object.values(OLD_KEYS), OLD_SETTINGS_KEY, OLD_HC_KEY].forEach(k => {
      try { localStorage.removeItem(k); } catch {}
    });
  } catch {
    // Se a migração falhar por qualquer razão, seguimos com um estado vazio
    // em vez de impedir o jogo de arrancar.
  }
})();
