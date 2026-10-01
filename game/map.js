/*************************************************
 * VanBerto's — Missão Cibersegurança 🛡️  ·  game/map.js
 *
 * Mapa da aventura: progresso, mundos, carregamento dos fundos e arranque de um nível a partir do mapa.
 *
 * Faz parte de dia-crianca.js, dividido em módulos (ver README.md, «Estrutura do código»).
 * As variáveis de estado vivem em state.js; aqui alteram-se com set_<nome>().
 *************************************************/

import { vbSay } from "./dialogue.js?v=20261001v98";
import { startOverlay } from "./dom.js?v=20261001v98";
import { playLevelTransition } from "./door.js?v=20261001v98";
import { loadLevel } from "./level.js?v=20261001v98";
import { openOverlay, saveGame } from "./overlays.js?v=20261001v98";
import { showHistory } from "./quiz.js?v=20261001v98";
import { initPhaser } from "./scene.js?v=20261001v98";
import { currentLevel, getStartLives, mapProgress, pausedByTeacher, playerName, playerNameHUD, powerHaloGfx, sceneRef, score, set__historySubOpen, set__overlayPaused, set__winOverlaySubOpen, set_currentLevel, set_lives, shadowGfx } from "./state.js?v=20261001v98";
import { loadNamespace, saveNamespace } from "../storage.js?v=20261001v98";
import { MAP_REGIONS } from "../data-progression.js?v=20261001v98";
import { applyBackground as applyBackgroundRaw } from "../background.js?v=20261001v98";
import { LEVELS, THEMES } from "../data-levels.js?v=20261001v98";
import { ensureAudio, SFX } from "../audio.js?v=20261001v98";
import { playTitleCard } from "../cinematics.js?v=20261001v98";
import { starsForLevel } from "../stars.js?v=20261001v98";
import { REGION_INTRO } from "../data-story.js?v=20261001v98";
import { VB_LEVEL_INTRO } from "../data-flavor.js?v=20261001v98";


// ===== Dicas =====

// ===== Artigo da Convenção por tema =====

// ===== Perguntas — 3 opções, 1 certa + explicação =====

// ===== TEMAS visuais — colorido e alegre =====

// ===== Níveis (10) =====

// ===== MAPA DA AVENTURA — Fase 1 (agora com 4 mundos, cada um com o seu boss) =====
// Agrupa os 20 níveis existentes em 4 mundos temáticos, em blocos contíguos.
// Cada mundo só desbloqueia depois do anterior estar 100% concluído — ver
// regionStatus()/isLastLevelOfRegion() mais abaixo.
// =====================================================

function loadMapProgress() {
  const d = loadNamespace("map", {});
  if (typeof d.highestLevelReached === "number") mapProgress.highestLevelReached = d.highestLevelReached;
  if (Array.isArray(d.levelsCompleted)) mapProgress.levelsCompleted = d.levelsCompleted;
}

export function saveMapProgress() {
  saveNamespace("map", mapProgress);
}

// Chamado quando um nível é concluído (porta aberta com sucesso)

export function markLevelCompleted(idx) {
  if (!mapProgress.levelsCompleted.includes(idx)) mapProgress.levelsCompleted.push(idx);
  if (idx + 1 > mapProgress.highestLevelReached) mapProgress.highestLevelReached = idx + 1;
  saveMapProgress();
}

// Devolve a região (de MAP_REGIONS) a que um nível pertence, ou null se nenhuma
// (ex.: níveis "soltos" ainda não atribuídos a nenhuma região).

export function regionForLevel(idx) {
  return MAP_REGIONS.find(r => r.levels.includes(idx)) || null;
}

// Fundos por NÍVEL, mais detalhados que o do mapa — vão sendo
// acrescentados mundo a mundo. Um nível sem entrada aqui usa o fundo
// único do seu mundo (mapBg / regionForLevel), como até agora.

const LEVEL_BG_OVERRIDE = {
  0: "bg_mundo1_n1e2", // Nível 1
  1: "bg_mundo1_n1e2", // Nível 2
  2: "bg_mundo1_n3e4", // Nível 3
  3: "bg_mundo1_n3e4", // Nível 4
  4: "bg_mundo1_n5",   // Nível 5
  5: "bg_mundo2_n6",   // Nível 6
  6: "bg_mundo2_n7",   // Nível 7
  7: "bg_mundo2_n8",   // Nível 8
  8: "bg_mundo2_n9",   // Nível 9
  9: "bg_mundo3_n10e11", // Nível 10
  10: "bg_mundo3_n10e11", // Nível 11
  11: "bg_mundo3_n12e13", // Nível 12
  12: "bg_mundo3_n12e13", // Nível 13
  13: "bg_mundo3_n14e15", // Nível 14
  14: "bg_mundo3_n14e15", // Nível 15
  15: "bg_mundo4_n16e17", // Nível 16
  16: "bg_mundo4_n16e17", // Nível 17
  17: "bg_mundo4_n18e19", // Nível 18
  18: "bg_mundo4_n18e19", // Nível 19
  19: "bg_mundo4_n20",    // Nível 20 (final)
};

// Chave da textura Phaser (pré-carregada em preload()) com a ilustração
// do mundo a que este nível pertence — null se o nível não tiver mundo
// ilustrado associado (ex.: salas secretas/boss não mapeadas).

export function bgKeyForLevel(idx) {
  if (LEVEL_BG_OVERRIDE[idx]) return LEVEL_BG_OVERRIDE[idx];
  const region = regionForLevel(idx);
  return region && region.mapBg ? "bg_" + region.id : null;
}

// ── Carregamento dos fundos (imagens grandes: ~4,5 MB no total) ────────────
// Antes carregavam todas no arranque. Agora o preload() só pede o fundo do nível
// em que o jogo arranca e o da sala secreta (os canos aparecem logo no nível 1);
// a cada nível que começa, pedem-se em segundo plano os fundos dos 2 níveis
// seguintes (BG_PREFETCH_AHEAD), para quem joga só uns níveis não gastar dados com
// o resto. Se um nível começar antes do seu fundo chegar, applyBackground() mostra
// o céu desenhado e troca pela ilustração assim que ela chegar.

export const BG_FILES = {
  bg_origens: "map-mundo1.webp", bg_desenvolvimento: "map-mundo2.webp",
  bg_protecao: "map-mundo3.webp", bg_participacao: "map-mundo4.webp", // só de reserva (ver bgKeyForLevel)
  bg_mundo1_n1e2: "mundo1_n1e2.webp", bg_mundo1_n3e4: "mundo1_n3e4.webp", bg_mundo1_n5: "mundo1_n5.webp",
  bg_mundo2_n6: "mundo2_n6.webp", bg_mundo2_n7: "mundo2_n7.webp", bg_mundo2_n8: "mundo2_n8.webp", bg_mundo2_n9: "mundo2_n9.webp",
  bg_mundo3_n10e11: "mundo3_n10e11.webp", bg_mundo3_n12e13: "mundo3_n12e13.webp", bg_mundo3_n14e15: "mundo3_n14e15.webp",
  bg_mundo4_n16e17: "mundo4_n16e17.webp", bg_mundo4_n18e19: "mundo4_n18e19.webp", bg_mundo4_n20: "mundo4_n20.webp",
  bg_sala_secreta: "sala_secreta.webp"
};

export let _bootLevelIdx = 0;          // nível em que o Phaser arranca (definido antes de initPhaser)

const _bgRequested = new Set(); // fundos já pedidos depois do preload

let _lastBg = null;             // último applyBackground, para repetir quando a imagem chegar

const BG_PREFETCH_AHEAD = 2;    // quantos fundos (distintos) à frente do nível atual se pedem

let _bgPrefetchTimer = null;

function requestBg(scene, key) {
  if (!key || !BG_FILES[key] || scene.textures.exists(key) || _bgRequested.has(key)) return;
  _bgRequested.add(key);
  scene.load.image(key, BG_FILES[key]);
  scene.load.start(); // não faz nada se o loader já estiver a trabalhar; os ficheiros novos entram na fila
}

export function setupBackgroundLoading(scene) {
  scene.load.maxParallelDownloads = 2; // não competir com o jogo pela ligação
  scene.load.on("filecomplete", (key) => {
    if (_lastBg && _lastBg.scene === scene && _lastBg.args[3] === key) applyBackgroundRaw(scene, ..._lastBg.args);
  });
  scene.load.on("loaderror", (file) => { _bgRequested.delete(file.key); }); // permite tentar de novo mais tarde
  prefetchBackgrounds(scene, _bootLevelIdx);
}

// Pede (em segundo plano) os fundos dos próximos BG_PREFETCH_AHEAD níveis com fundo diferente.
// Usa setTimeout (e não scene.time): o relógio da cena para com o jogo em pausa/cartões de história.

export function prefetchBackgrounds(scene, fromIdx) {
  clearTimeout(_bgPrefetchTimer);
  _bgPrefetchTimer = setTimeout(() => {
    const seen = new Set([bgKeyForLevel(fromIdx)]);
    let found = 0;
    for (let i = fromIdx + 1; i < LEVELS.length && found < BG_PREFETCH_AHEAD; i++) {
      const key = bgKeyForLevel(i);
      if (!key || seen.has(key)) continue;
      seen.add(key); found++; requestBg(scene, key);
    }
  }, 1500);
}

export function applyBackground(scene, themeIdx, worldW, hazards, key) {
  _lastBg = { scene, args: [themeIdx, worldW, hazards, key] };
  applyBackgroundRaw(scene, themeIdx, worldW, hazards, key);
  if (key && !scene.textures.exists(key)) requestBg(scene, key); // ainda não chegou: pede já
}

export function prefersReducedMotion() {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; }
}

// O jogo só avança automaticamente DENTRO do mesmo mundo. Ao terminar o
// último nível de um mundo (com ou sem boss), o jogador volta sempre ao
// mapa — só entra no mundo seguinte por escolha própria.

export function isLastLevelOfRegion(idx) {
  const r = regionForLevel(idx);
  return !!(r && r.levels.length && r.levels[r.levels.length - 1] === idx);
}

export function celebrateWorldComplete(region, onDone) {
  if (!region) { onDone?.(); return; }
  ensureAudio(); SFX.win();
  playTitleCard({
    icon: region.icon,
    name: `${region.name} — Completo! 🎉`,
    sub: region.sub,
    lines: ["Mais um mundo protegido! Escolhe no mapa para onde vamos a seguir."]
  }, onDone);
}

function regionStatus(region) {
  if (region.levels.length === 0) return "done"; // Base — sempre acessível/concluída visualmente
  const allDone = region.levels.every(i => mapProgress.levelsCompleted.includes(i));
  const anyReachable = region.levels.some(i => i <= mapProgress.highestLevelReached);
  if (allDone) return "done";
  if (anyReachable) return "current";
  return "locked";
}

export function renderMap() {
  const grid = document.getElementById("mapRegionsGrid");
  if (!grid) return;
  grid.innerHTML = "";
  let totalLevels = 0, totalDone = 0;
  MAP_REGIONS.forEach(region => {
    if (region.levels.length) totalLevels += region.levels.length;
  });
  totalDone = mapProgress.levelsCompleted.length;

  MAP_REGIONS.forEach(region => {
    const status = regionStatus(region);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `map-region map-region--${status}`;
    const doneCount = region.levels.filter(i => mapProgress.levelsCompleted.includes(i)).length;
    let badge = "";
    if (region.levels.length === 0) {
      badge = "🏠";
    } else if (status === "done") {
      badge = "✅ Completo";
    } else if (status === "current") {
      badge = `${doneCount}/${region.levels.length}`;
    } else {
      badge = "🔒";
    }
    // Mundo bloqueado: diz o que falta (o mundo anterior da lista), em vez de só mostrar um cadeado.
    let unlockHint = "";
    if (status === "locked") {
      const prev = MAP_REGIONS.slice(0, MAP_REGIONS.indexOf(region)).reverse().find(r => r.levels.length);
      if (prev) unlockHint = `<p class="map-region-unlock">🔒 Completa «${prev.name}» para abrir</p>`;
    }
    btn.innerHTML = `
        <div class="map-region-icon">${region.icon}</div>
        <div class="map-region-body">
          <p class="map-region-name">${region.name}</p>
          <p class="map-region-sub">${region.sub}</p>
          ${unlockHint}
        </div>
        <div class="map-region-badge">${badge}</div>
      `;
    if (region.mapBg) btn.style.backgroundImage = `url("${region.mapBg}")`;
    if (status === "locked") {
      btn.disabled = true;
    } else {
      btn.onclick = () => {
        ensureAudio(); SFX.coin();
        if (region.levels.length && region.mapBg) {
          openWorldMap(region);
        } else {
          // Regiões sem mapa ilustrado próprio (ex.: "Base") mantêm o
          // comportamento antigo — avançam direto para o nível.
          let targetLevel = region.levels.find(i => !mapProgress.levelsCompleted.includes(i));
          if (targetLevel === undefined) targetLevel = region.levels[region.levels.length - 1] ?? 0;
          startLevelFromMap(targetLevel);
        }
      };
    }
    grid.appendChild(btn);
  });

  const pct = totalLevels > 0 ? Math.round((totalDone / totalLevels) * 100) : 0;
  const pctEl = document.getElementById("mapProgressPct");
  const fillEl = document.getElementById("mapProgressFill");
  const starsEl = document.getElementById("mapStarsTotal");
  if (pctEl) pctEl.textContent = `${pct}%`;
  if (fillEl) fillEl.style.width = `${pct}%`;
  if (starsEl) starsEl.textContent = String(score || 0);

  // Foco automático (pedido: jogar tudo sem rato) — preferir o mundo
  // "current" (o que o jogador está mesmo a jogar), senão o 1º
  // desbloqueado. Sem isto, quem chega aqui só de teclado (ex.: Enter no
  // ecrã de dificuldade) ficava sem nenhum botão focado, e as setas
  // ↑/↓/←/→ (ver focusAdjacentButton) não tinham onde começar.
  const focusTarget = grid.querySelector(".map-region--current:not(:disabled)")
    || grid.querySelector(".map-region:not(:disabled)");
  focusTarget?.focus({ preventScroll: true });
}

// Abre o mapa ilustrado de um mundo específico (fundo pintado + níveis
// como nós clicáveis por cima, posicionados em region.nodePos).

function openWorldMap(region) {
  openOverlay("worldMapOverlay", () => renderWorldMap(region));
}

export function renderWorldMap(region) {
  const panel = document.getElementById("worldMapPanel");
  const iconEl = document.getElementById("worldMapIcon");
  const nameEl = document.getElementById("worldMapName");
  const subEl = document.getElementById("worldMapSub");
  const progressEl = document.getElementById("worldMapProgress");
  const nodesLayer = document.getElementById("worldMapNodes");
  if (!panel || !nodesLayer) return;

  panel.style.backgroundImage = region.mapBg ? `url("${region.mapBg}")` : "";
  if (iconEl) iconEl.textContent = region.icon;
  if (nameEl) nameEl.textContent = region.name;
  if (subEl) subEl.textContent = region.sub;

  const total = region.levels.length;
  const doneCount = region.levels.filter(i => mapProgress.levelsCompleted.includes(i)).length;
  if (progressEl) {
    progressEl.textContent = (total > 0 && doneCount === total) ? `${total}/${total} ✅` : `${doneCount}/${total}`;
  }

  nodesLayer.innerHTML = "";
  let currentNodePos = null;
  region.levels.forEach((idx, i) => {
    const pos = (region.nodePos && region.nodePos[i]) || { x: 50, y: 50 };
    const unlocked = idx <= mapProgress.highestLevelReached;
    const done = mapProgress.levelsCompleted.includes(idx);
    const status = !unlocked ? "locked" : (done ? "done" : "current");
    const levelNum = idx + 1;
    if (status === "current") currentNodePos = pos;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `level-node level-node--${status}`;
    btn.style.left = pos.x + "%";
    btn.style.top = pos.y + "%";

    if (status === "locked") {
      btn.innerHTML = "🔒";
      btn.disabled = true;
      btn.setAttribute("aria-label", `Nível ${levelNum} — bloqueado`);
    } else {
      if (status === "done") {
        const stars = starsForLevel(idx);
        // BUG CORRIGIDO: usava "★".repeat(stars) + "☆".repeat(3-stars) com a
        // MESMA cor dourada (#ffd700) aplicada ao span todo — ao tamanho
        // minúsculo deste crachá (6-9px), a estrela vazia "☆" (só um
        // contorno) ficava visualmente indistinguível da estrela cheia "★"
        // depois de colorida a dourado, por isso QUALQUER nível concluído
        // parecia ter sempre 3 estrelas, mesmo tendo ganho só 1 ou 2.
        // Agora cada estrela é o MESMO glifo cheio "★", mas as não-ganhas
        // ficam com uma classe "--off" (cor apagada, sem brilho) e só as
        // ganhas ficam douradas — igual à técnica já usada e comprovada no
        // ecrã de fim de nível (.lc-star / .lc-star--on).
        let starsHTML = "";
        for (let s = 0; s < 3; s++) {
          starsHTML += `<span class="level-node-star${s < stars ? " level-node-star--on" : " level-node-star--off"}">★</span>`;
        }
        // CORRIGIDO (pedido: "não deveria aparecer dentro da bolinha
        // verde o número do nível?") — antes só mostrava "✓", sem
        // nenhuma forma de saber a que nível cada bolinha concluída
        // correspondia sem tocar/ler o aria-label. O número passa a ser
        // o conteúdo principal (mesmo estilo dos nós "a jogar a
        // seguir"), com o "✓" como um pequeno crachá no canto — o mapa
        // continua a mostrar de relance quais estão concluídos, mas
        // agora também QUAL nível é cada um.
        btn.innerHTML = `<span class="level-node-num">${levelNum}</span><span class="level-node-check">✓</span><span class="level-node-stars">${starsHTML}</span>`;
        btn.setAttribute("aria-label", `Nível ${levelNum} — concluído, ${stars} estrelas. Toca para repetir.`);
      } else {
        btn.innerHTML = String(levelNum);
        btn.setAttribute("aria-label", `Nível ${levelNum} — a jogar a seguir`);
      }
      btn.onclick = () => {
        ensureAudio(); SFX.coin();
        startLevelFromMap(idx);
      };
    }
    nodesLayer.appendChild(btn);
  });

  if (currentNodePos) {
    const mascot = document.createElement("img");
    mascot.src = "vanberto_real.png";
    mascot.alt = "";
    mascot.className = "world-map-mascot";
    mascot.style.left = currentNodePos.x + "%";
    mascot.style.top = currentNodePos.y + "%";
    nodesLayer.appendChild(mascot);
  }

  // Foco automático (pedido: jogar tudo sem rato, entrar nos níveis com
  // Enter) — preferir o nível "current" (o próximo a jogar), senão o
  // primeiro nó desbloqueado. Sem foco inicial, as setas ←→↑↓ (ver
  // focusAdjacentButton) não tinham onde começar dentro deste mapa.
  const focusTarget = nodesLayer.querySelector(".level-node--current:not(:disabled)")
    || nodesLayer.querySelector(".level-node:not(:disabled)");
  focusTarget?.focus({ preventScroll: true });
}

// Mostra o cartão de entrada de região (ícone + nome + 2 falas do VanBerto's)
// antes da transição normal de nível — dá ao mapa um verdadeiro sentido de "mundo".

function playRegionTitleCard(region, onComplete) {
  if (!region || !REGION_INTRO[region.id]) { onComplete?.(); return; }
  const intro = REGION_INTRO[region.id];
  playTitleCard({ icon: region.icon, name: region.name, sub: region.sub, lines: [intro.vanberto, intro.arrival] }, onComplete);
}

// Envolve playLevelTransition: se o próximo nível pertence a uma região diferente
// da atual, mostra primeiro o cartão de título dessa região.

export function enterLevelWithStory(scene, nextIdx, onMidpoint, onComplete) {
  const prevRegion = regionForLevel(currentLevel);
  const newRegion = regionForLevel(nextIdx);
  const crossingRegion = newRegion && (!prevRegion || prevRegion.id !== newRegion.id) && newRegion.levels[0] === nextIdx;
  if (crossingRegion) {
    const Lc = LEVELS[nextIdx];
    if (Lc) applyBackground(scene, Lc.theme % THEMES.length, Lc.worldW, Lc.hazards || [], bgKeyForLevel(nextIdx));
    playRegionTitleCard(newRegion, () => playLevelTransition(scene, nextIdx, onMidpoint, onComplete));
  } else {
    playLevelTransition(scene, nextIdx, onMidpoint, onComplete);
  }
}

// Arranca (ou continua) o jogo Phaser diretamente num nível escolhido no mapa

function startLevelFromMap(idx) {
  set__historySubOpen( false); // escolher outro nível a partir do Mapa: o cartão «Sabias que…?» antigo não volta
  document.getElementById("mapOverlay")?.classList.add("hidden");
  document.getElementById("worldMapOverlay")?.classList.add("hidden");
  startOverlay.classList.add("hidden");
  document.getElementById("winOverlay")?.classList.add("hidden");
  document.getElementById("confetti")?.classList.add("hidden");
  // Repõe já aqui — sem isto, se o utilizador tivesse chegado a este mapa
  // pelos botões "Mapa"/"Conquistas" do ecrã de vitória (ver
  // _winOverlaySubOpen), ficava a pensar que ainda tinha de "voltar" a
  // esse ecrã, e o winOverlay reaparecia por cima do PRÓXIMO overlay
  // secundário que fosse fechado, mesmo já a meio deste nível novo.
  set__winOverlaySubOpen( false);
  // CORRIGIDO (pedido: ecrã em branco a repetir um nível depois de
  // terminar o jogo todo) — showVictoryScreen() esconde o próprio canvas
  // (#game, visibility:hidden) para revelar a Galeria de Artefactos por
  // cima; só ficava visível de novo através dos botões "Jogar de novo" do
  // ecrã de vitória/certificado. Mas o ecrã de vitória também tem botões
  // "Mapa"/"Conquistas" (ver _winOverlaySubOpen) que levam aqui — a um
  // nível escolhido para REPETIR, não a recomeçar tudo — e este caminho
  // nunca repunha a visibilidade. O jogo continuava mesmo a correr por
  // baixo (por isso ainda se ouviam/liam reações como "perdeste uma
  // vida") — só o canvas é que ficava invisível para sempre.
  const _gameDiv = document.getElementById("game");
  if (_gameDiv) _gameDiv.style.visibility = "";
  if (powerHaloGfx) { powerHaloGfx.clear(); powerHaloGfx.setVisible(true); }
  if (shadowGfx) shadowGfx.setVisible(true);
  // Sem isto, _overlayPaused ficava preso a "true" (só closeOverlay() o repõe),
  // e o update() do jogo trava a velocidade do robot a 0 para sempre a partir
  // daqui — era por isso que o robot deixava de se mexer ao entrar num nível
  // escolhido no mapa (ex.: nível 6, logo a seguir a completar o Mundo 1).
  set__overlayPaused( false);
  document.body.classList.add("game-started");
  // CORRIGIDO — entrar por aqui como primeiríssima ação da sessão (ex.: botão
  // "Mapa" do menu principal, sem passar por "Nova Aventura") arrancava sempre
  // o Phaser do zero (window.__dc_game ainda não existe) mas nunca aplicava
  // getStartLives(): "lives" ficava presa ao valor por omissão da declaração
  // (3), ignorando a dificuldade guardada ("difícil"=2, "extremo"=1). Só se
  // aplica nesta primeira entrada da sessão — navegar pelo mapa a meio de uma
  // partida já em curso (Phaser já inicializado) continua a preservar as
  // vidas restantes, como seria de esperar ao escolher outro nível a meio-jogo.
  const isFreshSessionEntry = !window.__dc_game;
  const begin = () => {
    set_currentLevel( idx);
    if (isFreshSessionEntry) set_lives( getStartLives());
    const startTransition = () => playLevelTransition(sceneRef, idx,
      () => { loadLevel(sceneRef, idx); saveGame(); },
      () => { showHistory(idx, () => {
        if (!pausedByTeacher) sceneRef.physics.resume();
        // Fala de boas-vindas do VanBerto's — antes só disparava no
        // arranque direto do jogo; agora todo o Nível 1 passa por aqui.
        if (idx === 0) setTimeout(() => vbSay(VB_LEVEL_INTRO[0], "intro", 4000), 800);
      }); }
    );
    // Aplicar já o fundo do nível ANTES do cartão de título da região —
    // sem isto, o cartão aparecia com o fundo antigo/genérico por trás
    // (o de antes de loadLevel correr), o que ficava sem sentido nenhum
    // quando o mundo já tem ilustração própria.
    const L0 = LEVELS[idx];
    if (L0) applyBackground(sceneRef, L0.theme % THEMES.length, L0.worldW, L0.hazards || [], bgKeyForLevel(idx));
    // Vindo do mapa, entrar numa região mostra sempre o seu cartão de título —
    // é literalmente o jogador a escolher "entrar" naquele mundo.
    playRegionTitleCard(regionForLevel(idx), startTransition);
  };
  if (!window.__dc_game) {
    _bootLevelIdx = idx;
    initPhaser();
    const waitScene = setInterval(() => {
      if (sceneRef) {
        clearInterval(waitScene);
        if (playerNameHUD) {
          playerNameHUD.textContent = playerName ? `⭐ ${playerName}` : "";
          playerNameHUD.style.display = playerName ? "block" : "none";
        }
        begin();
      }
    }, 50);
  } else if (sceneRef) {
    begin();
  }
}

// ----- ligações executadas no arranque (ordem original preservada; chamadas por dia-crianca.js) -----
export function init_map_0() {
  loadMapProgress(); // carregar logo no arranque — disponível mesmo antes do Phaser iniciar
}
