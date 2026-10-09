/*************************************************
 * VanBerto's — Missão Cibersegurança 🛡️  ·  game/artefacts.js
 *
 * Artefactos mágicos, reset de progresso, popups épicos, HUD de orbes, Galeria final e Álbum dos Direitos.
 *
 * Faz parte de dia-crianca.js, dividido em módulos (ver README.md, «Estrutura do código»).
 * As variáveis de estado vivem em state.js; aqui alteram-se com set_<nome>().
 *************************************************/

import { isLastLevelOfRegion, saveMapProgress } from "./map.js?v=20261009v103";
import { resetQuizStats, usedQuizByLevel, usedQuizByTheme } from "./quiz.js?v=20261009v103";
import { itemsTotal, mapProgress, score, scoreText, set_mapProgress, set_score } from "./state.js?v=20261009v103";
import { globalStats, saveGlobalStats } from "./stats.js?v=20261009v103";
import { loadNamespace, saveNamespace } from "../storage.js?v=20261009v103";
import { resetAchievements } from "../achievements.js?v=20261009v103";
import { resetAllStars, getStarRecord, starsForLevel } from "../stars.js?v=20261009v103";
import { ARTEFACTS, ARTEFACT_SETS, SET_REACTIONS } from "../data-progression.js?v=20261009v103";
import { ensureAudio, beep, SFX } from "../audio.js?v=20261009v103";
import { LEVELS, THEMES } from "../data-levels.js?v=20261009v103";
import { QUIZ_ARTICLE, HISTORY } from "../data-quiz.js?v=20261009v103";
import { BOSSES } from "../data-bosses.js?v=20261009v103";

// Popup curto "Direito recuperado!" — mostrado ao concluir um nível
// =====================================================
// ===== SISTEMA DE ARTEFACTOS MÁGICOS =====
// 20 artefactos únicos — um por competência de cibersegurança recuperada.
// Cada artefacto tem: emoji visual, nome curto, cor temática,
// fala do VanBerto e conjunto temático para bónus.
// =====================================================

// Nomes dos conjuntos e bónus

// Reacções extras do VanBerto ao completar cada conjunto


export let collectedArtefacts = {}; // { [artIdx]: true } — chave é o índice no ARTEFACTS (0-19), não a posição em LEVELS

function loadArtefacts() {
  collectedArtefacts = loadNamespace("artefacts", {});
}

function saveArtefacts() {
  saveNamespace("artefacts", collectedArtefacts);
}

// Álbum dos Direitos dos Bosses (novo — ver "Direito Recuperado" em
// startBossQuizPhase): { [bossId]: {flawless:bool} }, mesmo padrão de
// collectedArtefacts acima, só que a chave é o id do boss (data-bosses.js)
// em vez do índice no ARTEFACTS. Namespace próprio ("bossRights"), não
// misturado com "artefacts", para os 20 artefactos normais continuarem
// exatamente como estavam para quem já tenha progresso guardado.

export let collectedBossRights = {};

function loadBossRights() {
  collectedBossRights = loadNamespace("bossRights", {});
}

export function saveBossRights() {
  saveNamespace("bossRights", collectedBossRights);
}

// =====================================================
// ===== RESET COMPLETO DE PROGRESSO =====
// Função única chamada por TODOS os pontos de "recomeçar" (menu inicial
// "Começar", "Jogar de novo" no ecrã de vitória, "Jogar de novo" no
// certificado, e "Apagar progresso" nas Estatísticas), para garantir que
// todos têm exatamente o mesmo comportamento: mapa, álbum, conquistas,
// estrelas e estatísticas globais voltam sempre a 0. Pensado para vários
// alunos jogarem sucessivamente no mesmo dispositivo sem herdar o
// progresso do jogador anterior.
// =====================================================

export function resetAllProgress() {
  // Progresso do mapa da aventura
  set_mapProgress( { highestLevelReached: 0, levelsCompleted: [] });
  saveMapProgress();
  // Álbum dos Direitos
  collectedArtefacts = {};
  saveArtefacts();
  // Álbum dos Direitos dos Bosses (novo, ver loadBossRights/saveBossRights
  // acima) — sem isto, um "Apagar progresso" deixava crachás de bosses
  // antigos por trás, incoerentes com o resto do progresso já limpo.
  collectedBossRights = {};
  saveBossRights();
  // Conquistas (achievements.js) — desbloqueios + contadores internos
  resetAchievements();
  // Estrelas por nível (stars.js)
  resetAllStars();
  // Estatísticas globais (tempo de jogo, inimigos, quiz, curiosidades…)
  if (typeof globalStats !== "undefined") {
    globalStats.totalPlayTime = 0;
    globalStats.enemiesDefeated = 0;
    globalStats.quizTotal = 0;
    globalStats.quizCorrect = 0;
    globalStats.quizWrong = 0;
    globalStats.curiositiesRead = 0;
    globalStats.starsCollectedTotal = 0;
    globalStats.levelsCompleted = 0;
    globalStats.gamesPlayed = 0;
    globalStats.totalScoreEarned = 0;
    globalStats.quizErrors = [];
    if (typeof saveGlobalStats === "function") saveGlobalStats();
  }
  // Preferência de som — mantém o comportamento anterior (reset também a apaga,
  // voltando ao som ligado por omissão); o alto contraste NÃO é tocado aqui.
  const s = loadNamespace("settings", {});
  delete s.muted;
  saveNamespace("settings", s);
  resetQuizStats();
  Object.keys(usedQuizByLevel).forEach(k => usedQuizByLevel[k].clear());
  Object.keys(usedQuizByTheme).forEach(k => usedQuizByTheme[k].clear());
}

// Verifica se um conjunto de 5 artefactos ficou completo agora

function checkSetBonus(levelIdx) {
  const art  = ARTEFACTS[levelIdx];
  if (!art) return;
  const setId = art.set;
  const setLevels = ARTEFACTS.map((a,i) => a.set === setId ? i : -1).filter(i => i >= 0);
  const allDone = setLevels.every(i => collectedArtefacts[i]);
  if (!allDone) return;
  // Já tinha sido dado antes?
  const setBonusKey = `set_bonus_${setId}`;
  if (collectedArtefacts[setBonusKey]) return;
  collectedArtefacts[setBonusKey] = true;
  saveArtefacts();
  const setData = ARTEFACT_SETS[setId];
  set_score(score + ( setData.bonus));
  if (scoreText) scoreText.setText(`🌟 Pontos: ${score}`);
  // Mostrar popup de conjunto após 3.5s (depois do artefacto desaparecer)
  setTimeout(() => showSetBonusPopup(setId, setData), 3600);
}

// Popup de bónus de conjunto

function showSetBonusPopup(setId, setData) {
  const el = document.getElementById("setBonusOverlay");
  if (!el) return;
  document.getElementById("sbIcon").textContent  = setData.icon;
  document.getElementById("sbName").textContent  = setData.name;
  document.getElementById("sbBonus").textContent = `+${setData.bonus} pontos`;
  document.getElementById("sbMsg").textContent   = SET_REACTIONS[setId] || "Fantástico!";
  el.classList.add("show");
  ensureAudio();
  // Som de fanfarra (acorde ascendente)
  [0,80,160,260].forEach((t,i) => setTimeout(() =>
    beep({freq:[700,900,1100,1400][i], dur:0.18, type:"triangle", vol:0.07, slideTo:[900,1100,1400,1800][i]}), t));
  setTimeout(() => el.classList.remove("show"), 3800);
}

// =====================================================
// ===== POPUP ÉPICO DE ARTEFACTO =====
// Substitui o showRightRecovered simples por uma
// animação de 3.2s com artefacto, nome e fala do VanBerto.
// =====================================================
// Celebração de "nível concluído" — mostra-se ANTES da revelação do
// artefacto: título + estrelas a aparecer uma a uma + VanBerto's a
// celebrar + confetti. onContinue() só corre quando o jogador toca
// "Continuar" (sem avanço automático, para não apressar ninguém).

export function showLevelCompleteCelebration(levelIdx, onContinue) {
  const overlay = document.getElementById("levelCompleteOverlay");
  const panel   = document.getElementById("levelCompletePanel");
  const nameEl  = document.getElementById("lcLevelName");
  const starsWrap = document.getElementById("lcStars");
  const unlockEl = document.getElementById("lcUnlock");
  const confettiLayer = document.getElementById("lcConfettiLayer");
  const btnContinue = document.getElementById("lcContinue");
  if (!overlay || !panel) { onContinue?.(); return; }

  // Defesa extra: garantir SEMPRE que o quiz (e o seu botão "Continuar")
  // ficam escondidos antes desta celebração aparecer — encontrámos um caso
  // em que a caixa do quiz ainda ficava visível por trás.
  document.getElementById("quizOverlay")?.classList.add("hidden");
  document.getElementById("btnCloseQuiz")?.classList.add("hidden");

  const L = LEVELS[levelIdx];

  if (nameEl) nameEl.textContent = L ? L.name : "";

  // CLARIFICAÇÃO: antes, as estrelas só se acendiam pela ORDEM (1ª, 2ª,
  // 3ª), sem ligação a um critério fixo — um jogador com 2 estrelas nunca
  // sabia QUAL critério faltou para a 3ª. Agora cada posição representa
  // SEMPRE o mesmo critério (1=todos os itens, 2=sem perder vidas, 3=1ª
  // tentativa), com uma legenda por baixo, e só acende se esse critério
  // específico tiver sido mesmo cumprido nesta tentativa.
  // TROCA (pedido): a 1ª estrela era "encontrou 1 segredo" — passou a ser
  // "apanhou todos os itens do nível" (mesma contagem do HUD "⭐ Itens:
  // X/Y" — itemsCollected/itemsTotal, ainda válidos aqui porque loadLevel()
  // do próximo nível só corre depois desta celebração). hasItems espelha o
  // antigo hasSecrets: se o nível não tiver nenhum item, a estrela mostra
  // "Nível concluído" em vez de "0/0 itens", tal como antes mostrava
  // "Nível concluído" para níveis sem segredos.
  const rec = getStarRecord(levelIdx);
  const hasItems = itemsTotal > 0;
  const starCriteria = [
    { on: rec.allItems, label: hasItems ? "⭐ Todos os itens apanhados" : "🗺️ Nível concluído" },
    { on: rec.noDamage, label: "❤️ Sem perder vidas" },
    { on: rec.firstTry, label: "🎯 Acertaste à 1ª tentativa" }
  ];

  // Reset estrelas
  const starEls  = starsWrap ? [...starsWrap.querySelectorAll(".lc-star")] : [];
  const labelEls  = starsWrap ? [...starsWrap.querySelectorAll(".lc-star-label")] : [];
  starEls.forEach(s => s.classList.remove("lc-star--on"));
  labelEls.forEach((lbl, i) => {
    lbl.textContent = starCriteria[i] ? starCriteria[i].label : "";
    lbl.classList.remove("lc-star-label--on");
  });

  // Mensagem de desbloqueio — só faz sentido a meio de um mundo (o fim
  // de mundo já tem a sua própria celebração própria, ver celebrateWorldComplete)
  if (unlockEl) {
    if (!isLastLevelOfRegion(levelIdx)) {
      unlockEl.textContent = "🗺️ Próximo nível desbloqueado!";
      unlockEl.style.display = "inline-block";
    } else {
      unlockEl.style.display = "none";
    }
  }

  // Confetti — peças coloridas, posições/tempos aleatórios
  if (confettiLayer) {
    confettiLayer.innerHTML = "";
    const colors = ["#ff6b8a", "#ffd700", "#7fe0ff", "#b0ff8a", "#ff9adf", "#ffa500"];
    for (let i = 0; i < 24; i++) {
      const piece = document.createElement("div");
      piece.className = "lc-confetti-piece";
      const left = Math.random() * 100;
      const dur = 1.6 + Math.random() * 1.2;
      const delay = Math.random() * 0.4;
      const rot = 300 + Math.random() * 400;
      piece.style.left = left + "%";
      piece.style.background = colors[i % colors.length];
      piece.style.animationDuration = dur + "s";
      piece.style.animationDelay = delay + "s";
      piece.style.setProperty("--lc-rot", rot + "deg");
      confettiLayer.appendChild(piece);
    }
  }

  ensureAudio();
  SFX.levelComplete();
  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden", "false");

  // Estrelas a aparecer uma a uma, com um "ding" próprio para cada —
  // cada uma só acende se o SEU critério específico foi cumprido.
  starEls.forEach((s, i) => {
    if (!starCriteria[i] || !starCriteria[i].on) return;
    setTimeout(() => {
      s.classList.add("lc-star--on");
      if (labelEls[i]) labelEls[i].classList.add("lc-star-label--on");
      SFX.starDing(i);
    }, 650 + i * 380);
  });

  if (btnContinue) {
    btnContinue.onclick = () => {
      SFX.coin?.();
      overlay.classList.remove("show");
      overlay.setAttribute("aria-hidden", "true");
      onContinue?.();
    };
  }
}

export function showRightRecovered(levelIdx) {
  // ARTEFACTS[] e HISTORY[] estão alinhados pelos 20 níveis "de direitos" (0-19),
  // não pela posição bruta em LEVELS (que inclui os 3 bosses). Por isso usamos
  // o artIdx do nível para tudo o que é artefacto/história — levelIdx continua a
  // servir para tudo o que é específico da posição (LEVELS[], contador "Nível X").
  const L = LEVELS[levelIdx];
  const artIdx = (L && L.artIdx != null) ? L.artIdx : levelIdx;
  const art = ARTEFACTS[artIdx];
  if (!art) return;

  // Marcar como colectado e guardar
  collectedArtefacts[artIdx] = true;
  saveArtefacts();
  updateArtOrbs();

  const overlay = document.getElementById("artefactRevealOverlay");
  if (!overlay) return;

  // Conteúdo base
  document.getElementById("arRevEmoji").textContent  = art.emoji;
  document.getElementById("arRevName").textContent   = art.name;
  document.getElementById("arRevShort").textContent  = "✅ Desbloqueado";

  // Artigo da Convenção
  const articleEl = document.getElementById("arRevArticle");
  const article = L ? (QUIZ_ARTICLE[L.quizTheme] || null) : null;
  if (articleEl) {
    if (article) {
      articleEl.textContent = "📋 " + article;
      articleEl.style.display = "";
    } else {
      articleEl.style.display = "none";
    }
  }

  // Curiosidade — texto breve do HISTORY
  const curioEl = document.getElementById("arRevCurio");
  const hist = HISTORY[artIdx];
  if (curioEl && hist) {
    // Primeira frase do texto histórico (até ao primeiro ponto final)
    const firstSentence = hist.text.split(/\.\s/)[0] + ".";
    curioEl.textContent = "💡 " + firstSentence;
    curioEl.style.display = "";
  } else if (curioEl) {
    curioEl.style.display = "none";
  }

  // Estatísticas: pontos ganhos + nível
  const statsEl = document.getElementById("arRevStats");
  if (statsEl) {
    const total = Object.values(collectedArtefacts).filter(Boolean).length;
    statsEl.innerHTML =
      "🌟 +" + (score > 0 ? score : "—") + " pontos &nbsp;|&nbsp; " +
      "🏅 " + total + "/20 direitos &nbsp;|&nbsp; " +
      "📊 Nível " + (levelIdx + 1);
    statsEl.style.display = "";
  }

  // Fala do VanBerto
  document.getElementById("arRevSpeech").textContent = "“" + art.vanberto + "”";

  // Cor temática
  overlay.style.setProperty("--art-color", art.color);
  overlay.style.setProperty("--art-glow",  art.glow);

  overlay.classList.add("show");
  ensureAudio();
  [0,110,230,370,540].forEach((t,i) => setTimeout(() =>
    beep({freq:[440,554,660,880,1100][i], dur:0.14, type:"triangle", vol:0.07, slideTo:[554,660,880,1100,1400][i]}), t));
  spawnArtefactParticles(overlay, art.color);

  // Fechar pelo botão OU após 7s (mais tempo para ler)
  let _closed = false;
  function _closeReveal() {
    if (_closed) return; _closed = true;
    overlay.classList.remove("show");
    checkSetBonus(artIdx);
  }
  const btn = document.getElementById("arRevClose");
  if (btn) { btn.onclick = _closeReveal; }
  setTimeout(_closeReveal, 7000);
}

// Partículas de CSS no popup do artefacto

function spawnArtefactParticles(container, color) {
  const host = document.getElementById("arRevParticles");
  if (!host) return;
  host.innerHTML = "";
  for (let i = 0; i < 18; i++) {
    const p = document.createElement("div");
    const angle = (i / 18) * 360;
    const dist  = 55 + Math.random() * 45;
    const size  = 5 + Math.random() * 7;
    const dur   = 0.6 + Math.random() * 0.5;
    const delay = Math.random() * 0.25;
    p.style.cssText = `
        position:absolute; width:${size}px; height:${size}px;
        border-radius:50%; background:${color};
        left:50%; top:50%;
        box-shadow:0 0 6px ${color};
        animation:artParticleBurst ${dur}s ${delay}s ease-out forwards;
        --ax:${Math.cos(angle*Math.PI/180)*dist}px;
        --ay:${Math.sin(angle*Math.PI/180)*dist}px;
      `;
    host.appendChild(p);
  }
}

// =====================================================
// ===== HUD DE ORBES — faixa de artefactos no jogo =====
// 20 orbes pequenos no canto inferior, em Phaser.
// =====================================================

let _artOrbsEl=null;

export function createArtOrbs(scene){
  if(_artOrbsEl){_artOrbsEl.remove();_artOrbsEl=null;}
  const strip=document.createElement("div");strip.id="artOrbsHUD";
  strip.style.cssText="position:fixed;bottom:6px;left:50%;transform:translateX(-50%);display:flex;gap:3px;align-items:center;z-index:110;pointer-events:none;";
  document.body.appendChild(strip);_artOrbsEl=strip;updateArtOrbs();
}

function updateArtOrbs(){
  if(!_artOrbsEl)return;_artOrbsEl.innerHTML="";
  // Percorrer LEVELS (ordem física, Nível 1→20) em vez de ARTEFACTS (ordem
  // fixa por artIdx) — desde a reorganização em 4 mundos, essas duas ordens
  // já não coincidem para vários níveis (ex: "Nível 4 — Participação" tem
  // artIdx:7). Sem isto, o orbe de um nível aparecia na posição do seu
  // artIdx antigo em vez da posição do nível a que agora corresponde.
  LEVELS.forEach((L)=>{
    const i=L.artIdx; if(i==null) return;
    const art=ARTEFACTS[i]; if(!art) return;
    const got=!!collectedArtefacts[i],orb=document.createElement("div");orb.title=art.name;
    if(got){
      // THEMES[i] (não L.theme) — theme e artIdx são sempre o mesmo valor
      // em data-levels.js, por isso THEMES[i] dá sempre a cor certa.
      const theme=THEMES[i]??THEMES[0];
      const skyCol="#"+theme.skyBot.toString(16).padStart(6,"0");
      const grassCol="#"+theme.grassTop.toString(16).padStart(6,"0");
      orb.style.cssText="width:18px;height:18px;border-radius:50%;background:"+skyCol+";box-shadow:0 0 5px "+grassCol+"99,0 0 2px rgba(255,255,255,0.5) inset;border:1.5px solid "+grassCol+";display:flex;align-items:center;justify-content:center;font-size:10px;line-height:1;";
      orb.textContent=art.emoji;
    }else{
      orb.style.cssText="width:18px;height:18px;border-radius:50%;background:rgba(30,30,60,0.55);border:1px solid rgba(100,100,140,0.35);display:flex;align-items:center;justify-content:center;font-size:9px;line-height:1;color:rgba(120,120,160,0.5);";
      orb.textContent="·";
    }
    _artOrbsEl.appendChild(orb);
  });
}

// =====================================================
// ===== GALERIA FINAL =====
// Mostrada antes do winOverlay — desfila todos os artefactos.
// =====================================================

export function showArtefactGallery(onDone) {
  const overlay = document.getElementById("artefactGalleryOverlay");
  if (!overlay) { onDone?.(); return; }

  const grid = document.getElementById("agGrid");
  if (grid) {
    grid.innerHTML = "";
    ARTEFACTS.forEach((art, i) => {
      const got = !!collectedArtefacts[i];
      const cell = document.createElement("div");
      cell.className = "ag-cell" + (got ? " ag-cell--got" : " ag-cell--miss");
      cell.style.setProperty("--art-color", art.color);
      cell.style.setProperty("--art-glow",  art.glow);
      cell.style.animationDelay = (i * 60) + "ms";
      cell.innerHTML = `
          <div class="ag-emoji">${got ? art.emoji : "🔒"}</div>
          <div class="ag-name">${got ? art.short : "?"}</div>
        `;
      // Tooltip com fala ao hover (desktop)
      if (got) cell.title = art.vanberto;
      grid.appendChild(cell);
    });
  }

  const total = ARTEFACTS.length;
  const got   = Object.keys(collectedArtefacts).filter(k => !k.includes("set_")).length;
  const pctEl = document.getElementById("agPct");
  if (pctEl) pctEl.textContent = `${got}/${total} competências recuperadas`;

  // Crachás dos Bosses (novo, pedido: os "Direitos Recuperados" de cada
  // boss apareciam num toast e desapareciam, sem nenhum sítio onde a
  // criança os visse todos juntos no fim — um fecho narrativo mais forte
  // do que só o ecrã de vitória genérico). Reaproveita a MESMA grelha e
  // as mesmas classes CSS dos 20 artefactos normais (.ag-grid/.ag-cell —
  // zero CSS novo), só com os 4 bosses em vez dos 20 níveis; construída
  // uma única vez (guarda "agBossGrid") e só voltada a preencher em
  // chamadas seguintes, tal como a grelha principal acima.
  let bossHeading = document.getElementById("agBossHeading");
  let bossGrid = document.getElementById("agBossGrid");
  if (grid && grid.parentNode && (!bossHeading || !bossGrid)) {
    bossHeading = document.createElement("p");
    bossHeading.id = "agBossHeading";
    bossHeading.className = "ag-pct";
    bossHeading.style.marginTop = "10px";
    bossHeading.textContent = "🏆 Direitos Recuperados dos Bosses";
    grid.parentNode.insertBefore(bossHeading, grid.nextSibling);
    bossGrid = document.createElement("div");
    bossGrid.id = "agBossGrid";
    bossGrid.className = "ag-grid";
    grid.parentNode.insertBefore(bossGrid, bossHeading.nextSibling);
  }
  if (bossGrid) {
    bossGrid.innerHTML = "";
    [...BOSSES].sort((a, b) => a.afterLevel - b.afterLevel).forEach((b, i) => {
      const info = collectedBossRights[b.id];
      const gotIt = !!info;
      const cell = document.createElement("div");
      cell.className = "ag-cell" + (gotIt ? " ag-cell--got" : " ag-cell--miss");
      cell.style.animationDelay = (i * 60) + "ms";
      const rr = b.rightRecovered;
      const name = gotIt && rr ? rr.name + (info.flawless ? " ⭐" : "") : "?";
      cell.innerHTML = `
          <div class="ag-emoji">${gotIt && rr ? rr.emoji : "🔒"}</div>
          <div class="ag-name">${name}</div>
        `;
      if (gotIt && info.flawless) cell.title = "Combate Perfeito — nenhuma vida perdida!";
      bossGrid.appendChild(cell);
    });
  }

  overlay.classList.remove("hidden");
  overlay.classList.add("show");
  ensureAudio();
  // Fanfarra final
  [0,150,300,500,700,950].forEach((t,i) =>
    setTimeout(() => beep({freq:[440,550,660,880,1100,1320][i], dur:0.2, type:"triangle", vol:0.07, slideTo:[550,660,880,1100,1320,1600][i]}), t));

  document.getElementById("btnAgContinue")?.addEventListener("click", () => {
    overlay.classList.remove("show");
    overlay.classList.add("hidden");
    onDone?.();
  }, { once: true });
}

// =====================================================
// ===== ÁLBUM DOS DIREITOS — Fase 2 =====
// Cada direito desbloqueado (= nível concluído) gera uma carta,
// usando os dados já existentes em HISTORY e QUIZ_ARTICLE.
// =====================================================

export function renderAlbum() {
  const grid = document.getElementById("albumGrid");
  if (!grid) return;
  grid.innerHTML = "";
  let unlockedCount = 0;
  const normalLevels = LEVELS.map((L, idx) => ({ L, idx }));
  normalLevels.forEach(({ L, idx }) => {
    const artIdx = (L.artIdx != null) ? L.artIdx : idx;
    const entry = HISTORY[artIdx];
    const unlocked = mapProgress.levelsCompleted.includes(idx);
    if (unlocked) unlockedCount += 1;
    const card = document.createElement("div");
    card.className = `album-card ${unlocked ? "album-card--unlocked" : "album-card--locked"}`;
    const stars = starsForLevel(idx);
    const starsHTML = unlocked
      ? `<p class="album-card-stars">${"⭐".repeat(stars)}${"☆".repeat(3 - stars)}</p>`
      : "";
    if (unlocked && entry) {
      const article = QUIZ_ARTICLE[L.quizTheme];
      const artEmoji = ARTEFACTS[artIdx]?.emoji || entry.title.split(" ")[0];
      card.innerHTML = `
          <div class="album-card-icon">${artEmoji}</div>
          <p class="album-card-name">${entry.title}</p>
          ${article ? `<p class="album-card-article">📜 ${article}</p>` : ""}
          <p class="album-card-desc">${entry.text}</p>
          <p class="album-card-more">👆 Toca para ler tudo</p>
          ${starsHTML}
        `;
      card.onclick = () => {
        const expanding = !card.classList.contains("album-card--expanded");
        card.classList.toggle("album-card--expanded", expanding);
        const moreEl = card.querySelector(".album-card-more");
        if (moreEl) moreEl.textContent = expanding ? "👆 Toca para fechar" : "👆 Toca para ler tudo";
      };
    } else {
      card.innerHTML = `
          <div class="album-card-icon">🔒</div>
          <p class="album-card-name">Direito por descobrir</p>
          <p class="album-card-desc">Recupera este direito para desbloquear a carta.</p>
        `;
    }
    grid.appendChild(card);
  });
  const pct = Math.round((unlockedCount / normalLevels.length) * 100);
  const pctEl = document.getElementById("albumProgressPct");
  const fillEl = document.getElementById("albumProgressFill");
  if (pctEl) pctEl.textContent = `${pct}%`;
  if (fillEl) fillEl.style.width = `${pct}%`;
}

// ----- ligações executadas no arranque (ordem original preservada; chamadas por dia-crianca.js) -----
export function init_artefacts_0() {
  loadArtefacts();
  loadBossRights();
}
