/*************************************************
 * VanBerto's — Missão Cibersegurança 🛡️  ·  game/ui.js
 *
 * Botões e atalhos: ecrã inteiro, pausa, alto contraste, navegação por teclado, Nova Aventura e dificuldade.
 *
 * Faz parte de dia-crianca.js, dividido em módulos (ver README.md, «Estrutura do código»).
 * As variáveis de estado vivem em state.js; aqui alteram-se com set_<nome>().
 *************************************************/

import { resetAllProgress } from "./artefacts.js?v=20260929v96";
import { startBossFight } from "./boss-core.js?v=20260929v96";
import { btnCloseHow, btnHow, btnMute, btnPause, btnStart, gameOverOverlay, playerNameInput, quizAnswers, quizOverlay, startOverlay, winOverlay } from "./dom.js?v=20260929v96";
import { playLevelTransition } from "./door.js?v=20260929v96";
import { loadLevel, updateHearts } from "./level.js?v=20260929v96";
import { renderMap } from "./map.js?v=20260929v96";
import { closeOverlay, openOverlay, saveGame } from "./overlays.js?v=20260929v96";
import { resetQuizStats, showHistory, usedQuizByLevel, usedQuizByTheme } from "./quiz.js?v=20260929v96";
import { showPauseScreen } from "./scene.js?v=20260929v96";
import { bossState, currentLevel, getStartLives, inBossFight, pausedByTeacher, powerHaloGfx, sceneRef, score, scoreText, setDifficulty, set__overlayPaused, set_awaitingQuiz, set_currentLevel, set_lives, set_livesLostThisLevel, set_pausedByTeacher, set_playerName, set_score, shadowGfx } from "./state.js?v=20260929v96";
import { flushScoreToStats } from "./stats.js?v=20260929v96";
import { toggleMuted, ensureAudio, SFX } from "../audio.js?v=20260929v96";
import { loadNamespace, saveNamespace } from "../storage.js?v=20260929v96";

// Botão "Sair" no menu principal — fecha mesmo o jogo (diferente do
// "Sair para o Menu" que existe durante o jogo, que só volta ao menu
// principal). window.close() só funciona em separadores/janelas abertos
// por script (ou apps instaladas como PWA em alguns browsers); nos
// restantes casos os browsers bloqueiam-no por segurança, por isso fica
// sempre uma mensagem simpática como alternativa para o caso de o
// separador não se fechar sozinho.

const btnExitGame = document.getElementById("btnExitGame");

// ===== Ecrã todo =====

const isIOS=/iP(hone|ad|od)/.test(navigator.userAgent);

export function toggleFullscreen(){
  if(isIOS){ alert("No iPhone/iPad usa 'Partilhar' → 'Adicionar ao ecrã de início'."); return; }
  if(!document.fullscreenElement&&!document.webkitFullscreenElement){
    const el=document.documentElement;
    if(el.requestFullscreen) el.requestFullscreen();
    else if(el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  } else {
    if(document.exitFullscreen) document.exitFullscreen();
    else if(document.webkitExitFullscreen) document.webkitExitFullscreen();
  }
}

function updateFsButtons(full){
  const lbl=full?"✕ Ecrã normal":"⛶ Ecrã todo";
  const b1=document.getElementById("btnFullscreen");
  const b2=document.getElementById("btnFullscreenGame");
  if(b1) b1.textContent=lbl;
  if(b2) b2.textContent=lbl;
}

const btnFs=document.getElementById("btnFullscreen");

const btnFsGame=document.getElementById("btnFullscreenGame");

// ===== Navegação por teclado no Mapa/Mundos — setas escolhem, Enter entra =====
// Pedido do Berto: "entrar nos níveis também deve ser permitido com a
// tecla enter, mudar de mundos com as setas e depois tecla enter" — dar
// para jogar tudo como se não houvesse rato. Tal como no quiz acima, usa-se
// o focus() real dos botões (todos são <button> — carregar Enter num botão
// focado já dispara o "click" nativamente, não é preciso lógica extra para
// isso); só falta mesmo mover o foco com as setas. mapOverlay tem os
// mundos (grelha .map-region), worldMapOverlay tem os níveis desse mundo
// (nós .level-node espalhados pelo mapa ilustrado) — a mesma função serve
// aos dois, seguindo sempre a ordem em que os botões aparecem no HTML
// (que já corresponde à ordem lógica de progressão em ambos os casos).

function focusAdjacentButton(container, forward) {
  const btns = Array.from(container.querySelectorAll("button:not(:disabled)"));
  if (!btns.length) return;
  let idx = btns.indexOf(document.activeElement);
  idx = idx === -1 ? 0 : idx + (forward ? 1 : -1);
  idx = ((idx % btns.length) + btns.length) % btns.length;
  btns[idx].focus({ preventScroll: true });
}

// "Começar" mostra primeiro o ecrã de nível de dificuldade (pedido do
// Berto — o jogo era só para 1º/2º ciclo, este ano é preciso também para
// 3º ciclo e secundário); só depois de escolhido é que o jogo reinicia de
// facto. Ver reallyStartNewGame() e o difficultyOverlay em index.html.

function reallyStartNewGame(){
  ensureAudio();SFX.coin();
  set_playerName((playerNameInput?.value||"").trim());
  set_currentLevel(0);set_score(0);set_lives(getStartLives());set_livesLostThisLevel(0);
  // "Começar" é sempre um recomeço total — ver resetAllProgress()
  resetAllProgress();
  startOverlay.classList.add("hidden");

  // A aventura passa sempre primeiro pelo mapa ilustrado — nunca salta
  // direto para o Nível 1. O jogador entra no Mundo 1 (o único
  // desbloqueado logo após um recomeço) e escolhe o Nível 1 ele próprio,
  // exatamente como a partir do botão "🗺️ Mapa" a meio do jogo.
  // initPhaser()/o resto do arranque fica todo a cargo de
  // startLevelFromMap(), chamado quando o nó do nível é tocado.
  const beginAdventure = () => {
    openOverlay("mapOverlay", renderMap);
  };

  // Mostrar a história principal (narrativa de introdução) antes do mapa
  const mainStoryOverlay = document.getElementById("mainStoryOverlay");
  const btnMainStoryContinue = document.getElementById("btnMainStoryContinue");
  if (mainStoryOverlay && btnMainStoryContinue) {
    mainStoryOverlay.classList.remove("hidden");
    btnMainStoryContinue.onclick = () => {
      ensureAudio(); SFX.door();
      mainStoryOverlay.classList.add("hidden");
      beginAdventure();
    };
  } else {
    beginAdventure();
  }
}

const btnDiffFacil = document.getElementById("btnDiffFacil");

const btnDiffDificil = document.getElementById("btnDiffDificil");

const btnDiffExtremo = document.getElementById("btnDiffExtremo");

const pickDifficultyAndStart = (level) => {
  setDifficulty(level);
  document.getElementById("difficultyOverlay")?.classList.add("hidden");
  reallyStartNewGame();
};

// =====================================================
// Compatibilidade: openComingSoon ainda existe mas nunca
// deve ser chamado (substituímos todos os botões acima)
// =====================================================

function openComingSoon(title, text) {
  // fallback: não deve ser chamado
  console.warn("openComingSoon chamado para:", title);
}

const btnRetry=document.getElementById("btnRetry");

const btnExit=document.getElementById("btnExit");

export const btnWinRestart=document.getElementById("btnWinRestart");

// ----- ligações executadas no arranque (ordem original preservada; chamadas por dia-crianca.js) -----
export function init_ui_0() {

  // ===== Texturas — ver textures.js =====

  // ===== Fundo, parallax e decorações — ver background.js =====

  // ===== Botões UI =====
  btnMute.onclick=()=>{const m=toggleMuted();btnMute.textContent=m?"🔇 Som: OFF":"🔊 Som: ON";if(!m){ensureAudio();SFX.coin();}saveGame();};

  // Botão 📱 Botões — disponível antes e durante o jogo
  // touchState exposto em window para createTouchInput poder consultar
  window._dc_touchState = "auto";
  (()=>{
    const applyTouchState = (state) => {
      window._dc_touchState = state;
      document.body.classList.toggle("force-touch", state === "on");
      document.body.classList.toggle("hide-touch",  state === "off");
      const lbl =
        state === "on"  ? "📱 Botões: ON"  :
        state === "off" ? "📱 Botões: OFF" : "📱 Botões: AUTO";
      ["btnTouchToggle","mBtnTouch","btnTouchToggleStart"].forEach(id => {
        const el = document.getElementById(id); if (el) el.textContent = lbl;
      });
    };
    const handleClick = () => {
      const tc = document.getElementById("touchControls");
      const autoVisible = tc && getComputedStyle(tc).display !== "none";
      const cur = window._dc_touchState;
      let next;
      if (cur === "auto") { next = autoVisible ? "off" : "on"; }
      else if (cur === "on") { next = "off"; }
      else { next = "auto"; }
      applyTouchState(next);
    };
    ["btnTouchToggle","mBtnTouch","btnTouchToggleStart"].forEach(id => {
      const el = document.getElementById(id); if (el) el.onclick = handleClick;
    });
  })();
  btnHow.onclick = () => { openOverlay("howOverlay"); };
  btnCloseHow.onclick = () => { closeOverlay("howOverlay"); };
  window.__vb_openHow = () => { openOverlay("howOverlay"); };
  if (btnExitGame) {
    btnExitGame.onclick = () => {
      if (!confirm("🚪 Sair do jogo?")) return;
      window.close();
      setTimeout(() => {
        alert("👋 Já podes fechar este separador. Até à próxima aventura!");
      }, 300);
    };
  }
  document.addEventListener("fullscreenchange",()=>updateFsButtons(!!document.fullscreenElement));
  document.addEventListener("webkitfullscreenchange",()=>updateFsButtons(!!document.webkitFullscreenElement));
  if(btnFs) btnFs.onclick=toggleFullscreen;
  if(btnFsGame) btnFsGame.onclick=toggleFullscreen;
  window.addEventListener("keydown",e=>{ if(e.key?.toLowerCase()==="f"&&!e.target.matches("input")) toggleFullscreen(); });

  // ===== Pausa — tecla P =====
  // Reaproveita o mesmo botão/lógica de sempre (btnPause.onclick já trata de
  // tudo: física, texto do botão, ecrã de pausa) — a tecla só simula o clique.
  window.addEventListener("keydown", e => {
    if (e.key?.toLowerCase() === "p" && !e.target.matches("input") && btnPause) btnPause.click();
  });

  // ===== Alto Contraste — tecla H =====
  (()=>{
    let hcOn = false;
    function applyHC(on) {
      hcOn = on;
      document.body.classList.toggle("hc-mode", on);
      const s = loadNamespace("settings", {});
      s.hc = on;
      saveNamespace("settings", s);
    }
    // Restaurar preferência guardada
    if (loadNamespace("settings", {}).hc === true) applyHC(true);
    // Tecla H
    window.addEventListener("keydown", e => {
      if (e.key?.toLowerCase() === "h" && !e.target.matches("input")) {
        applyHC(!hcOn);
      }
    });
  })();

  // ===== Navegação por teclado no Quiz — setas ↑/↓ escolhem, Enter confirma =====
  // Enter para avançar diálogos/cartões de título já existe em cinematics.js;
  // isto trata do quiz (vive fora desse módulo). Em vez de gerir uma seleção
  // à parte, usa-se o focus() real do botão: as setas movem o foco entre as
  // respostas (a caixa dourada vem do CSS em #quizAnswers .btn:focus) e o
  // Enter sobre um botão focado já dispara o "click" nativamente — não é
  // preciso lógica extra para isso aqui. mostrar a pergunta já foca a 1ª
  // resposta (ver showQuiz) e cada botão "Continuar"/"Tentar outra pergunta"
  // foca-se a si próprio ao aparecer, pela mesma razão.
  window.addEventListener("keydown", e => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    if (quizOverlay.classList.contains("hidden")) return;
    if (e.target && e.target.matches("input, textarea")) return;
    const btns = Array.from(quizAnswers.querySelectorAll(".btn:not(:disabled)"));
    if (!btns.length) return;
    e.preventDefault();
    let idx = btns.indexOf(document.activeElement);
    idx = idx === -1 ? 0 : idx + (e.key === "ArrowDown" ? 1 : -1);
    idx = ((idx % btns.length) + btns.length) % btns.length;
    btns[idx].focus({ preventScroll: true });
  });
  window.addEventListener("keydown", e => {
    if (!["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) return;
    if (e.target && e.target.matches("input, textarea")) return;
    const forward = (e.key === "ArrowRight" || e.key === "ArrowDown");
    const mapOverlayEl = document.getElementById("mapOverlay");
    const worldMapOverlayEl = document.getElementById("worldMapOverlay");
    // NOVO (pedido: "não consigo escolher pelo teclado" no ecrã de
    // dificuldade) — este ecrã já focava automaticamente "Fácil" ao abrir
    // (ver reallyStartNewGame), mas faltava mesmo isto: mover esse foco com
    // as setas entre as 3 fichas, tal como já acontece no Mapa/Mundos logo
    // abaixo. Sem isto, Tab ainda funcionava (são <button> reais) mas as
    // setas — o que se espera depois de as usar em todos os outros ecrãs
    // deste jogo — não faziam nada.
    const difficultyOverlayEl = document.getElementById("difficultyOverlay");
    if (difficultyOverlayEl && !difficultyOverlayEl.classList.contains("hidden")) {
      const opts = difficultyOverlayEl.querySelector(".difficulty-options");
      if (opts) { e.preventDefault(); focusAdjacentButton(opts, forward); }
    } else if (worldMapOverlayEl && !worldMapOverlayEl.classList.contains("hidden")) {
      const layer = document.getElementById("worldMapNodes");
      if (layer) { e.preventDefault(); focusAdjacentButton(layer, forward); }
    } else if (mapOverlayEl && !mapOverlayEl.classList.contains("hidden")) {
      const grid = document.getElementById("mapRegionsGrid");
      if (grid) { e.preventDefault(); focusAdjacentButton(grid, forward); }
    }
  });

  // ===== Enter = clicar no botão principal ("OK"/"Continuar ▶") do ecrã aberto =====
  // Cobre os overlays de um único botão de avançar/fechar — histórico
  // ("Sabias que...?"), conquistas, álbum, estatísticas, opções, certificado,
  // galeria final, etc. — que já seguem a convenção .btn.primary no HTML, e
  // dois casos à parte que NÃO seguem essa convenção (usam a classe .show
  // em vez de .hidden, e o botão não tem .primary): o popup de "Competência
  // Recuperada" e o ecrã de "Nível Concluído" (#lcContinue — era este que
  // ficava sem resposta ao Enter). O quiz tem o seu próprio fluxo acima,
  // por isso fica de fora aqui (evita clicar duas vezes no mesmo botão já
  // focado).
  window.addEventListener("keydown", e => {
    if (e.key !== "Enter") return;
    if (e.target && e.target.matches("input, textarea, button")) return;
    const reveal = document.getElementById("artefactRevealOverlay");
    if (reveal && reveal.classList.contains("show")) {
      e.preventDefault();
      document.getElementById("arRevClose")?.click();
      return;
    }
    // NOVO: ecrã "Nível Concluído" (levelCompleteOverlay) — era o motivo do
    // Enter continuar sem funcionar aqui. É o mesmo caso do
    // artefactRevealOverlay acima: usa a classe "show" (não "hidden") e o
    // seu botão #lcContinue tem classe própria "lc-continue-btn", não
    // ".btn.primary" — por isso ficava sempre fora do querySelector genérico
    // mais abaixo e só o clique com o rato é que funcionava.
    const levelComplete = document.getElementById("levelCompleteOverlay");
    if (levelComplete && levelComplete.classList.contains("show")) {
      e.preventDefault();
      document.getElementById("lcContinue")?.click();
      return;
    }
    const primary = document.querySelector(".overlay:not(.hidden) .btn.primary:not(:disabled)");
    if (primary) { e.preventDefault(); primary.click(); }
  });

  btnStart.onclick=()=>{
    ensureAudio();
    const diffOverlay = document.getElementById("difficultyOverlay");
    if (diffOverlay) {
      diffOverlay.classList.remove("hidden");
      // Foca já o 1º botão (Fácil) — sem isto, quem chegou até aqui só de
      // teclado (ex.: Enter no nome, ver playerNameInput mais abaixo) ficava
      // com o foco "perdido" no ecrã anterior, escondido, e tinha de usar o
      // rato ou andar às apalpadelas com Tab para continuar.
      document.getElementById("btnDiffFacil")?.focus({ preventScroll: true });
    }
    else reallyStartNewGame(); // rede de segurança, caso o HTML não tenha o overlay
  };
  btnDiffFacil?.addEventListener("click", () => { SFX.coin(); pickDifficultyAndStart("facil"); });
  btnDiffDificil?.addEventListener("click", () => { SFX.coin(); pickDifficultyAndStart("dificil"); });
  btnDiffExtremo?.addEventListener("click", () => { SFX.coin(); pickDifficultyAndStart("extremo"); });

  // ===== Menu Principal / In-game — botão Mapa =====
  document.getElementById("btnOpenMap")?.addEventListener("click", () => {
    ensureAudio(); SFX.coin();
    openOverlay("mapOverlay", renderMap);
  });
  document.getElementById("btnCloseMap")?.addEventListener("click", () => {
    closeOverlay("mapOverlay");
  });
  document.getElementById("btnBackToMap")?.addEventListener("click", () => {
    ensureAudio(); SFX.coin();
    openOverlay("mapOverlay", renderMap);
  });
}

export function init_ui_1() {
  if(btnRetry) btnRetry.onclick=()=>{
    gameOverOverlay.classList.add("hidden");
    set_pausedByTeacher(false); set__overlayPaused(false);
    set_lives(getStartLives()); set_livesLostThisLevel(0); updateHearts();
    // Perder durante um combate de boss só reinicia a arena do boss (com a
    // pontuação já ganha até ali preservada), em vez do nível inteiro — não
    // faz sentido obrigar a repetir toda a plataforma só para tentar de novo
    // um combate que acontece no fim.
    if (inBossFight && bossState && bossState.def) {
      const bossOnComplete = bossState.onComplete;
      const levelForBoss = currentLevel;
      startBossFight(sceneRef, levelForBoss, bossOnComplete);
      saveGame();
      return;
    }
    flushScoreToStats(); set_score(0);resetQuizStats();
    Object.keys(usedQuizByLevel).forEach(k=>usedQuizByLevel[k].clear());
    Object.keys(usedQuizByTheme).forEach(k=>usedQuizByTheme[k].clear());
    scoreText.setText(`🌟 Pontos: ${score}`);
    const retryLevel = currentLevel ?? 0;
    loadLevel(sceneRef, retryLevel);
    showHistory(retryLevel, () => { set_awaitingQuiz(false); if(!pausedByTeacher) sceneRef.physics.resume(); });
    saveGame();
  };
  if(btnExit) btnExit.onclick=()=>{
    gameOverOverlay.classList.add("hidden");try{sceneRef.physics.pause();}catch{}
    set_lives(getStartLives());flushScoreToStats();set_score(0);resetQuizStats();set_livesLostThisLevel(0);
    startOverlay.classList.remove("hidden");
  };
  if(btnWinRestart) btnWinRestart.onclick=()=>{
    winOverlay.classList.add("hidden");
    document.getElementById("confetti")?.classList.add("hidden");
    // Restaurar canvas e retomar loop Phaser
    const _gameDiv2=document.getElementById("game");
    if(_gameDiv2) _gameDiv2.style.visibility="";
    try{sceneRef.scene.resume();}catch{}
    if(powerHaloGfx){powerHaloGfx.clear();powerHaloGfx.setVisible(true);}
    if(shadowGfx) shadowGfx.setVisible(true);
    // Ver comentário igual em btnCertRestart — sem isto o robot podia ficar
    // travado para sempre depois de recomeçar, se o jogo tivesse ficado
    // pausado (professora) ou com o menu/mapa aberto no momento de terminar.
    set_pausedByTeacher( false); set__overlayPaused( false);
    if (btnPause) btnPause.textContent = "⏸ Pausa";
    showPauseScreen(false);
    set_lives(getStartLives());set_score(0);set_currentLevel(0);set_livesLostThisLevel(0);
    // "Jogar de novo" é sempre um recomeço total — ver resetAllProgress()
    resetAllProgress();
    set_awaitingQuiz(true);
    scoreText?.setText(`🌟 Pontos: 0`); updateHearts?.();
    document.body.classList.add("game-started");
    playLevelTransition(sceneRef, 0,
      () => { loadLevel(sceneRef, 0); saveGame(); },
      () => { showHistory(0, () => { set_awaitingQuiz(false); if(!pausedByTeacher) sceneRef?.physics.resume(); }); }
    );
  };
}
