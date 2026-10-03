/*************************************************
 * VanBerto's — Missão Cibersegurança 🛡️  ·  game/overlays.js
 *
 * Gestão de ecrãs sobrepostos: abrir/fechar, pausa da física, guardar/carregar jogo, MutationObserver dos overlays.
 *
 * Faz parte de dia-crianca.js, dividido em módulos (ver README.md, «Estrutura do código»).
 * As variáveis de estado vivem em state.js; aqui alteram-se com set_<nome>().
 *************************************************/

import { historyOverlay, howOverlay, quizOverlay, startOverlay } from "./dom.js?v=20261003v99";
import { _doorAnimRunning, _historySubOpen, _starMelodyInterval, _winOverlaySubOpen, awaitingQuiz, awaitingStory, currentLevel, difficulty, pausedByTeacher, sceneRef, set__historySubOpen, set__overlayPaused, set__starMelodyInterval, set__winOverlaySubOpen, set_awaitingQuiz, set_awaitingStory, set_difficulty } from "./state.js?v=20261003v99";
import { updatePlayTime } from "./stats.js?v=20261003v99";
import { loadNamespace, saveNamespace } from "../storage.js?v=20261003v99";
import { isMuted, setMuted } from "../audio.js?v=20261003v99";

// ===== Guardar =====
// "settings" guarda apenas preferências (som, alto contraste) — nunca
// progresso de jogo. O progresso em curso (nível/pontos/vidas a meio de
// uma partida) não é persistido de propósito: quem quer retomar usa o
// Mapa, que já sabe até onde cada jogador chegou.

// ===== Gestão de overlay-open (desativa touch quando overlay visível) =====
// O cartão «Sabias que…?» (historyOverlay) e os ecrãs abertos pelo Menu (Mapa, Conquistas, Álbum, Estatísticas,
// Opções, Como Jogar, Rever Erros, Galeria) têm o mesmo z-index e o cartão vem depois no HTML — por isso, se o
// Menu fosse aberto com o cartão ainda por fechar, o ecrã ficava POR BAIXO dele. Enquanto um ecrã do Menu está
// aberto, escondemos o cartão (sem o «fechar»: o nível continua à espera dele — awaitingStory — e não conta
// como curiosidade lida) e repomo-lo quando o ecrã fecha. Tudo aqui é acionado pelo observer abaixo, por isso
// cobre qualquer caminho de abrir/fechar. (Lista própria, e não SECONDARY_OVERLAYS, que só existe mais abaixo:
// esta função corre já no arranque.)

const _SUB_OVERLAY_IDS = ["mapOverlay", "worldMapOverlay", "achievementsOverlay", "albumOverlay",
  "statsOverlay", "optionsOverlay", "howOverlay", "reviewOverlay", "artefactGalleryOverlay",
  "certificateOverlay"]; // certificateOverlay: agora também abre a meio do jogo (☰ Menu → 🏅 Certificado)

let _historySubLevel = -1;

function syncHistoryWithSubOverlays() {
  const subOpen = _SUB_OVERLAY_IDS.some(id => { const e = document.getElementById(id); return e && !e.classList.contains("hidden"); });
  const histHidden = historyOverlay.classList.contains("hidden");
  if (subOpen && !histHidden) {
    set__historySubOpen( true); _historySubLevel = currentLevel;
    historyOverlay.classList.add("hidden");
  } else if (!subOpen && _historySubOpen) {
    set__historySubOpen( false);
    // Só repõe se o cartão ainda é o do MESMO nível e continua por fechar (não ressuscita um cartão antigo
    // se o jogador entretanto escolheu outro nível ou reiniciou).
    if (histHidden && awaitingStory && currentLevel === _historySubLevel) historyOverlay.classList.remove("hidden");
  }
}

function updateOverlayOpenClass() {
  syncHistoryWithSubOverlays();
  const anyOpen = !startOverlay.classList.contains("hidden")
    || !howOverlay.classList.contains("hidden")
    || !quizOverlay.classList.contains("hidden")
    || !historyOverlay.classList.contains("hidden")
    || !document.getElementById("gameOverOverlay").classList.contains("hidden")
    || !document.getElementById("winOverlay").classList.contains("hidden")
    || !document.getElementById("reviewOverlay").classList.contains("hidden")
    || !document.getElementById("mainStoryOverlay")?.classList.contains("hidden")
    || !document.getElementById("mapOverlay")?.classList.contains("hidden")
    || !document.getElementById("achievementsOverlay")?.classList.contains("hidden")
    || !document.getElementById("albumOverlay")?.classList.contains("hidden")
    || !document.getElementById("statsOverlay")?.classList.contains("hidden")
    || !document.getElementById("optionsOverlay")?.classList.contains("hidden")
    || !document.getElementById("certificateOverlay")?.classList.contains("hidden")
    || !document.getElementById("artefactGalleryOverlay")?.classList.contains("hidden");
  document.body.classList.toggle("overlay-open", anyOpen);
}

// Observer para detetar mudanças nos overlays

const _overlayObserver = new MutationObserver(updateOverlayOpenClass);

export function saveGame() {
  const s = loadNamespace("settings", {});
  s.muted = isMuted();
  s.difficulty = difficulty;
  saveNamespace("settings", s);
}

export function loadGame() {
  const s = loadNamespace("settings", {});
  if (typeof s.muted === "boolean") setMuted(s.muted);
  if (s.difficulty === "dificil" || s.difficulty === "facil" || s.difficulty === "extremo") set_difficulty( s.difficulty);
}


// ===== "Sabias que…?" — curiosidades sobre Cibersegurança =====

// =====================================================
// ===== UTILITÁRIO: pausar/retomar física ao abrir overlays =====
// Qualquer ecrã que abre por cima do jogo deve pausar a física.
// =====================================================

// IDs dos overlays secundários (não o jogo nem o quiz/história que têm fluxo próprio)

export const SECONDARY_OVERLAYS = [
  "mapOverlay", "worldMapOverlay", "achievementsOverlay", "albumOverlay",
  "statsOverlay", "optionsOverlay", "howOverlay",
  "reviewOverlay", "artefactGalleryOverlay",
];

// Fecha todos os overlays secundários antes de abrir um novo — evita sobreposições

export function closeAllSecondaryOverlays() {
  SECONDARY_OVERLAYS.forEach(id => {
    document.getElementById(id)?.classList.add("hidden");
  });
}

// Abre um overlay secundário garantindo que os outros estão fechados

export function openOverlay(id, beforeOpen) {
  closeAllSecondaryOverlays();
  pauseForOverlay();
  // CORREÇÃO (pedido: "toco no enter e não entra no jogo"): beforeOpen()
  // é quem preenche o mapa/nível E dá foco automático ao botão certo
  // (renderMap/renderWorldMap — ver os seus focusTarget?.focus() no
  // fim). Antes, beforeOpen() corria ANTES de tirar a classe "hidden"
  // deste overlay — ou seja, o botão a focar ainda estava dentro de um
  // elemento com display:none. Um elemento invisível não pode receber
  // foco (o browser ignora .focus() nesse caso em silêncio), por isso o
  // foco automático falhava sempre, o Enter não tinha em que "clicar", e
  // só as setas (que focam o 1º botão mesmo sem foco prévio válido)
  // resolviam por acaso. Agora o overlay fica visível PRIMEIRO, para que
  // o .focus() chamado dentro de beforeOpen() já incida num botão real e
  // visível.
  document.getElementById(id)?.classList.remove("hidden");
  beforeOpen?.();
}

// Fecha um overlay secundário e retoma a física

export function closeOverlay(id) {
  document.getElementById(id)?.classList.add("hidden");
  resumeAfterOverlay();
  // Se este overlay foi aberto a partir do ecrã de vitória (botões "Mapa"/"Conquistas"
  // do fim de jogo), o winOverlay tinha sido escondido para o novo overlay ficar visível
  // por cima — ver _winOverlaySubOpen mais abaixo. Repõe-lo agora que o utilizador fechou.
  if (_winOverlaySubOpen) {
    set__winOverlaySubOpen( false);
    document.getElementById("winOverlay")?.classList.remove("hidden");
  }
}

function pauseForOverlay() {
  if (sceneRef && startOverlay.classList.contains("hidden")) {
    set__overlayPaused( true);
    sceneRef.physics.pause();
    // NOVO (pedido: abrir o Mapa da Aventura durante a animação do
    // portal do fim de boss deixava o ecrã "estranho" ao fechar) — só se
    // pausava a física; os tweens (a dança do VanBerto's, o portal a
    // girar/"sugar", e a transição de nível a seguir) continuavam a
    // correr por baixo do overlay, escondidos, e podiam chegar ao fim —
    // incluindo a mudança de nível/mundo em si — sem o jogador ver nada
    // disso, ficando com o ecrã e o overlay dessincronizados um do
    // outro ao fechar. Pausar os tweens também garante que QUALQUER
    // cinemática (entrada/vitória de boss, animação da porta, etc.)
    // fica mesmo parada enquanto um menu estiver aberto, tal como a
    // física já ficava.
    sceneRef.tweens.pauseAll();
  }
}

function resumeAfterOverlay() {
  if (!sceneRef) return;
  set__overlayPaused( false);
  if (startOverlay.classList.contains("hidden")
      && !pausedByTeacher && !awaitingQuiz && !awaitingStory
      && quizOverlay.classList.contains("hidden")
      && historyOverlay.classList.contains("hidden")) {
    sceneRef.physics.resume();
    sceneRef.tweens.resumeAll();
  }
}

// ----- ligações executadas no arranque (ordem original preservada; chamadas por dia-crianca.js) -----
export function init_overlays_0() {
  [startOverlay, howOverlay, quizOverlay, historyOverlay,
   document.getElementById("gameOverOverlay"), document.getElementById("winOverlay"),
   document.getElementById("reviewOverlay"),
   document.getElementById("mainStoryOverlay"), document.getElementById("mapOverlay"),
   document.getElementById("achievementsOverlay"), document.getElementById("albumOverlay"),
   document.getElementById("statsOverlay"), document.getElementById("optionsOverlay"),
   document.getElementById("certificateOverlay"), document.getElementById("artefactGalleryOverlay")
  ].forEach(el => { if(el) _overlayObserver.observe(el, { attributes: true, attributeFilter: ["class"] }); });
  updateOverlayOpenClass();
}

export function init_overlays_1() {

  // =====================================================
  // ===== ATUALIZAÇÃO DOS OVERLAYS NO MutationObserver =====
  // =====================================================
  [
    document.getElementById("achievementsOverlay"),
    document.getElementById("albumOverlay"),
    document.getElementById("statsOverlay"),
    document.getElementById("optionsOverlay"),
    document.getElementById("certificateOverlay"),
  ].forEach(el => {
    if (el) _overlayObserver.observe(el, { attributes: true, attributeFilter: ["class"] });
  });

  // =====================================================
  // ===== Pausa automática ao mudar de separador =====
  // =====================================================
  // Nota: isto tem de viver AQUI DENTRO do fecho (closure) do
  // DOMContentLoaded, não a seguir a ele — antes estava fora, e por isso
  // `awaitingQuiz`/`pausedByTeacher`/`_doorAnimRunning` não existiam nesse
  // âmbito (o `typeof awaitingQuiz !== "undefined"` era sempre falso, nunca
  // detetava nada). Na prática isso significava que, ao voltar ao separador
  // com o VanBerto's a meio de uma transição (ex.: mesmo a tocar o portal),
  // a física ficava para sempre em pausa — nem o portal reagia, nem sequer
  // era possível perder uma vida, porque nenhuma colisão física corre com o
  // mundo em pausa. Corrigido: agora lê o estado real do jogo e, se não
  // houver nenhum overlay/animação genuinamente a decorrer, desbloqueia logo.
  document.addEventListener("visibilitychange", () => {
    try {
      if (!sceneRef) return;
      if (document.hidden) {
        sceneRef.physics.pause();
        if (_starMelodyInterval) { clearInterval(_starMelodyInterval); set__starMelodyInterval( null); window._dc_starMelodyInterval = null; }
        if (typeof updatePlayTime === "function") updatePlayTime();
      } else {
        const overlays = ["startOverlay","quizOverlay","historyOverlay","gameOverOverlay","winOverlay",
          "achievementsOverlay","albumOverlay","statsOverlay","optionsOverlay","certificateOverlay",
          "artefactGalleryOverlay","reviewOverlay"];
        const anyOpen = overlays.some(id => { const el = document.getElementById(id); return el && !el.classList.contains("hidden"); });
        // Cinemáticas (cinematics.js) criam o seu próprio DOM fora dos overlays
        // acima — sem isto, voltar ao separador a meio de um diálogo de boss
        // ou de um cartão de título de região também retomava a física demasiado
        // cedo, antes de o jogador ter tocado para avançar.
        const cineShowing = !!document.getElementById("cineDialog")?.classList.contains("cine-show")
          || document.body.classList.contains("cine-active")
          || !!document.getElementById("cineTitleCard")?.classList.contains("show");
        const isPaused = !!pausedByTeacher;
        if (anyOpen || isPaused || cineShowing || _doorAnimRunning) return; // razão legítima para continuar em pausa
        // Nada visível a bloquear — se ainda assim awaitingQuiz/awaitingStory
        // tiverem ficado presos a true (por termos saído mesmo a meio de uma
        // transição breve), desbloqueia já em vez de esperar até 6s pelo
        // watchdog do update().
        if (awaitingQuiz || awaitingStory) { set_awaitingQuiz( false); set_awaitingStory( false); }
        sceneRef.physics.resume();
      }
    } catch {}
  });
}
