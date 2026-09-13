/*************************************************
 * VanBerto's — Missão Cibersegurança 🛡️
 * Professora: Vanda Várzea
 *
 * Jogo educativo sobre Cibersegurança para crianças:
 * palavras-passe, dados pessoais, phishing, privacidade
 * e outros hábitos digitais seguros.
 *
 * 20 níveis · 3 opções por pergunta · Segunda tentativa
 * VanBerto's: mascote-robô guardião da cibersegurança
 *************************************************/

import { HISTORY, QUIZ_TIPS, QUIZ_ARTICLE, QUIZ_BY_THEME, QUIZ_BY_THEME_AVANCADO } from "./data-quiz.js";
import { THEMES, LEVELS } from "./data-levels.js";
import { MAP_REGIONS, ARTEFACTS, ARTEFACT_SETS, SET_REACTIONS, ACHIEVEMENTS_DEFS } from "./data-progression.js";
import { PRAISE, PAUSE_TIPS, LEVEL_ENTRY_PHRASES, DYNAMIC_MSGS_CORRECT, DYNAMIC_MSGS_WRONG,
         VB_LEVEL_INTRO, VB_HIT, VB_QUIZ_CORRECT, VB_QUIZ_WRONG, VB_STAR_POWER, VB_PERFECT_LEVEL } from "./data-flavor.js";
import { ensureAudio, beep, SFX, isMuted, setMuted, toggleMuted } from "./audio.js";
import { starsForLevel, totalStarsEarned, resetLevelStarTracking, finalizeLevelStars,
         resetAllStars, getStarRecord } from "./stars.js";
import { unlockedAchievements, checkAchievements, onSecretFoundForAchievements,
         onHistoryReadForAchievements, onCorrectAnswerForAchievements, renderAchievements,
         resetAchievements, showAchievementToast, onSecretRoomFoundForAchievements } from "./achievements.js";
import { BOSSES, BOSS_BY_LEVEL } from "./data-bosses.js";
import { REGION_INTRO, BOSS_OBJECTIVE, BOSS_INTRO_VB, BOSS_VICTORY_VB, NPC_SIGNS, BOSS_HP_TAUNTS } from "./data-story.js";
import { playTitleCard, playCinematic } from "./cinematics.js";
import { loadNamespace, saveNamespace } from "./storage.js";
import { makeTextures, makePlatformTextureThemed, makePipeTexture } from "./textures.js";
import { initBackground, applyBackground, drawSun, drawStars, drawCloud,
         updateTrail, updateFootsteps, updateDoorGlow, updatePlatformDecor,
         spawnPlatformDecor, resetDoorGlow, clearPlatformDecor, hideDoorGlow,
         clouds, bgConfetti, NIGHT_THEMES } from "./background.js";

window.addEventListener("DOMContentLoaded", () => {

  // ===== DOM =====
  const startOverlay   = document.getElementById("startOverlay");
  const howOverlay     = document.getElementById("howOverlay");
  const quizOverlay    = document.getElementById("quizOverlay");
  const historyOverlay = document.getElementById("historyOverlay");
  const historyText    = document.getElementById("historyText");
  const btnHistory     = document.getElementById("btnHistory");
  const quizQuestion   = document.getElementById("quizQuestion");
  const quizAnswers    = document.getElementById("quizAnswers");
  const quizFeedback   = document.getElementById("quizFeedback");
  const quizExplanation= document.getElementById("quizExplanation");
  const btnCloseQuiz   = document.getElementById("btnCloseQuiz");
  const btnStart       = document.getElementById("btnStart");
  const btnHow         = document.getElementById("btnHow");
  const btnCloseHow    = document.getElementById("btnCloseHow");
  const btnMute        = document.getElementById("btnMute");
  const btnPause       = document.getElementById("btnPause");
  const btnRestart     = document.getElementById("btnRestartLevel");
  const btnRestartGame = document.getElementById("btnRestartGame");
  const playerNameInput= document.getElementById("playerName");
  // NOVO (pedido: "o Enter devia dar para entrar no jogo") — um <input>
  // de texto normal não reage ao Enter sozinho (isso só acontece dentro de
  // um <form> com submit, que aqui não existe). O resto do jogo já trata
  // bem o Enter — só faltava mesmo este listener dedicado ao campo do
  // nome. btnStart.click() (não .onclick() direto) para disparar o mesmo
  // fluxo de sempre, incluindo o ecrã de dificuldade.
  playerNameInput?.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); btnStart.click(); }
  });
  const gameOverOverlay= document.getElementById("gameOverOverlay");
  const winOverlay     = document.getElementById("winOverlay");

  const hitFlash   = document.createElement("div"); hitFlash.id = "hitFlash";   document.body.appendChild(hitFlash);
  const bonusStars = document.createElement("div"); bonusStars.id = "bonusStars"; document.body.appendChild(bonusStars);

  let playerName = "";

  let _vbTimer=null;
  function vbSay(text,type="intro",duration=3400){
    if(document.body.classList.contains("hc-mode"))return;
    const el=document.getElementById("vbSpeech"),textEl=document.getElementById("vbSpeechText");
    if(!el||!textEl)return;
    if(_vbTimer){clearTimeout(_vbTimer);_vbTimer=null;}
    textEl.textContent=text;el.className="vb-"+type;void el.offsetWidth;
    el.classList.add("vb-show");
    _vbTimer=setTimeout(()=>{el.classList.remove("vb-show");_vbTimer=null;},duration);
  }
  function vbSayRandom(arr,type,duration){vbSay(arr[Math.floor(Math.random()*arr.length)],type,duration);}

  // Diálogo de boss (entrada/derrota) — usa a caixa de diálogo de cinematics.js
  // (retrato + nome + texto, avança ao toque) SEM as barras pretas, para não
  // tapar a arena. Antes disto usava o balão vbSay (canto inferior direito,
  // pensado para dicas rápidas) — ficava pequeno, avançava sozinho por tempo
  // e longe da ação; agora fica centrado, legível, e o jogador controla o ritmo.
  function playBossDialogue(slides, onComplete) {
    playCinematic(slides, onComplete, false);
  }

  // Meia-largura REAL da caixa flutuante #cineDialog (dia-crianca.css), usada
  // por bossDialogueAnchor/vbDialogueAnchor para não a deixar sair do ecrã.
  // CORRIGIDO: esta conta vivia duplicada nas duas funções e não batia certo
  // com o CSS — assumia sempre "width:92vw", mas o CSS tem uma media query
  // (max-width:600px, ou seja, QUALQUER telemóvel) que muda a largura para
  // "96vw". Em conjunto com a falta de box-sizing:border-box no CSS (ver
  // dia-crianca.css, #cineDialog — corrigido também), a caixa acabava mais
  // larga do que esta conta previa, saindo parcialmente do ecrã em qualquer
  // telemóvel — incluindo, por vezes, o próprio botão "⏭ Saltar" lá dentro,
  // sem nada tocável nessa parte cortada. Sem conseguir tocar na caixa nem
  // no "Saltar", o jogo só desbloqueava sozinho ao fim do temporizador de 9s
  // por fala (ver armAutoAdvance em cinematics.js) — dava exatamente a
  // sensação de "bloqueia ao começar o boss" reportada. Agora que o CSS usa
  // border-box, "width" já é a largura total real — só falta espelhar aqui
  // a mesma media query. Qualquer alteração ao "width"/breakpoint no CSS de
  // #cineDialog tem de vir acompanhada da mesma alteração aqui.
  function dialogHalfWidth() {
    const isNarrow = window.innerWidth <= 600;
    const cssWidth = isNarrow ? window.innerWidth * 0.96 : Math.min(640, window.innerWidth * 0.92);
    return cssWidth / 2;
  }

  // Calcula, em pixels CSS de ecrã, o ponto por cima da cabeça do boss —
  // usado para o balão de fala dele flutuar ali em vez de ficar fixo no
  // fundo do ecrã (ver s.anchor em cinematics.js). Devolve null se não
  // houver boss vivo no momento (ex.: diálogo de vitória, já destruído em
  // startBossQuizPhase) — nesse caso a fala cai de volta na caixa normal.
  function bossDialogueAnchor() {
    if (!bossState || !bossState.sprite || !bossState.sprite.active) return null;
    const b = bossState.sprite, def = bossState.def;
    const cam = sceneRef.cameras.main;
    const canvas = sceneRef.game.canvas;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const scaleX = rect.width / 960, scaleY = rect.height / 540;
    // Mesma referência da barra de vida (hpBarOffset) + folga extra para o
    // balão não colar à barra de vida.
    const aboveHead = (def.hpBarOffset != null ? def.hpBarOffset : ((b.displayHeight/2||40)+42)) + 46;
    let x = rect.left + (b.x - cam.scrollX) * scaleX;
    let y = rect.top + (b.y - aboveHead - cam.scrollY) * scaleY;
    // Não deixar o balão sair do ecrã pelas laterais. A margem tem de
    // acompanhar a largura REAL da caixa — ver dialogHalfWidth() acima.
    const halfDialogW = dialogHalfWidth() + 12;
    x = Math.max(rect.left+halfDialogW, Math.min(rect.right-halfDialogW, x));
    // CORREÇÃO: faltava impedir o balão de saltar por cima do topo do ecrã
    // (só x estava limitado). Se a "cabeça" do boss ficasse perto do topo do
    // canvas, aboveHead empurrava y para negativo, e a caixa ".cine-floating"
    // (que se estica para CIMA a partir do ponto de ancoragem) ficava parcial
    // ou totalmente fora do ecrã — sem nada visível/tocável para avançar a
    // fala, o jogo parecia "bloqueado" na cinemática de entrada do boss.
    y = Math.max(rect.top + 90, y);
    return { x, y };
  }

  // Mesma ideia, mas para o VanBerto's — assim as falas dele (reação/grito de
  // guerra na entrada, e a linha de vitória) também flutuam por cima da sua
  // própria cabeça, em vez de ficarem só a caixa fixa no fundo do ecrã. Só faz
  // sentido durante um combate de boss (fora disso o VanBerto's usa vbSay,
  // não esta caixa de diálogo) — devolve null se não houver player ativo.
  function vbDialogueAnchor() {
    if (!player || !player.active) return null;
    const cam = sceneRef.cameras.main;
    const canvas = sceneRef.game.canvas;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const scaleX = rect.width / 960, scaleY = rect.height / 540;
    const aboveHead = (player.displayHeight/2 || 36) + 40;
    let x = rect.left + (player.x - cam.scrollX) * scaleX;
    let y = rect.top + (player.y - aboveHead - cam.scrollY) * scaleY;
    // Mesma margem dinâmica que bossDialogueAnchor() — ver dialogHalfWidth() acima.
    const halfDialogW = dialogHalfWidth() + 12;
    x = Math.max(rect.left+halfDialogW, Math.min(rect.right-halfDialogW, x));
    // Mesma correção de y que bossDialogueAnchor() — ver comentário lá.
    y = Math.max(rect.top + 90, y);
    return { x, y };
  }

  // ===== Guardar =====
  // "settings" guarda apenas preferências (som, alto contraste) — nunca
  // progresso de jogo. O progresso em curso (nível/pontos/vidas a meio de
  // uma partida) não é persistido de propósito: quem quer retomar usa o
  // Mapa, que já sabe até onde cada jogador chegou.

  // ===== Gestão de overlay-open (desativa touch quando overlay visível) =====
  function updateOverlayOpenClass() {
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
  [startOverlay, howOverlay, quizOverlay, historyOverlay,
   document.getElementById("gameOverOverlay"), document.getElementById("winOverlay"),
   document.getElementById("reviewOverlay"),
   document.getElementById("mainStoryOverlay"), document.getElementById("mapOverlay"),
   document.getElementById("achievementsOverlay"), document.getElementById("albumOverlay"),
   document.getElementById("statsOverlay"), document.getElementById("optionsOverlay"),
   document.getElementById("certificateOverlay"), document.getElementById("artefactGalleryOverlay")
  ].forEach(el => { if(el) _overlayObserver.observe(el, { attributes: true, attributeFilter: ["class"] }); });
  updateOverlayOpenClass();
  function saveGame() {
    const s = loadNamespace("settings", {});
    s.muted = isMuted();
    s.difficulty = difficulty;
    saveNamespace("settings", s);
  }
  function loadGame() {
    const s = loadNamespace("settings", {});
    if (typeof s.muted === "boolean") setMuted(s.muted);
    if (s.difficulty === "dificil" || s.difficulty === "facil") difficulty = s.difficulty;
  }

  // ===== Elogios =====
  function pickPraise() { return PRAISE[Math.floor(Math.random() * PRAISE.length)]; }

  function showFloat(scene, x, y, msg, color="#ff6b35") {
    const t = scene.add.text(x, y, msg, { fontSize:"24px", fontStyle:"900", color, stroke:"#fff8e0", strokeThickness:5 }).setOrigin(0.5).setDepth(999);
    scene.tweens.add({ targets:t, y:y-44, alpha:0, duration:640, ease:"Sine.easeOut", onComplete:()=>t.destroy() });
  }

  // "Hit-stop": congela a física e os tweens por instantes (efeito clássico
  // de plataformas para dar peso a um golpe). Chamado logo a seguir a
  // configurar o knockback/rotação de um toque — como a velocidade e os
  // tweens já foram todos definidos antes de pausar, ficam visualmente
  // "presos" na pose do impacto por ms milissegundos, e só depois
  // continuam a animar normalmente. Sem isto, o toque, o tremor de câmara,
  // o flash e o texto flutuante aconteciam todos ao mesmo tempo e depressa
  // demais para uma criança perceber claramente que perdeu uma vida.
  function applyHitStop(scene, ms = 80) {
    if (!scene || !scene.physics || !scene.physics.world) return;
    scene.physics.world.pause();
    scene.tweens.pauseAll();
    scene.time.delayedCall(ms, () => {
      if (!scene || !scene.physics || !scene.physics.world) return;
      scene.physics.world.resume();
      scene.tweens.resumeAll();
    });
  }

  // ===== Quiz stats =====
  const quizStats = { total:0, correct:0, everWrong:false, errors:[], errorsByTheme:{} };
  const usedQuizByLevel = {};
  const usedQuizByTheme = {}; // anti-repetição global por tema (cross-nível)
  let lastQuizTheme = "historia";

  function resetQuizStats() { quizStats.total=0; quizStats.correct=0; quizStats.everWrong=false; quizStats.errors=[]; quizStats.errorsByTheme={}; }

  // ===== Modo Revisão — reutilizável a partir de vários pontos =====
  // (vitória final, ecrã de "Missão Falhada" e menu suspenso a meio do jogo).
  // Preenche a lista #reviewList com as perguntas erradas da tentativa atual.
  let _reviewReturnOverlay = null; // overlay a repor ao fechar (ou null -> usa closeOverlay normal)

  function populateReviewList() {
    const reviewList = document.getElementById("reviewList");
    if (!reviewList) return;
    reviewList.innerHTML = "";
    if (!quizStats.errors || quizStats.errors.length === 0) {
      reviewList.innerHTML = `<p style="text-align:center;color:#a0ffb0;font-size:14px;padding:20px 0;">🎉 Ainda não erraste nenhuma pergunta nesta tentativa. Continua assim!</p>`;
      return;
    }
    quizStats.errors.forEach((e,i)=>{
      const pool=getQuizPool(e.theme)||[];
      const orig=pool.find(q=>q.q===e.q);
      const exp=orig?.exp||"";
      const art=QUIZ_ARTICLE[e.theme];
      const div=document.createElement("div");
      div.className="review-question";
      div.innerHTML=`
        ${art?`<div style="margin-bottom:5px;"><span class="quiz-article-badge">📜 ${art}</span></div>`:""}
        <div class="review-question-text">${i+1}. ${e.level} — ${e.q}</div>
        <div class="review-wrong">❌ A tua resposta: <strong>${e.wrong}</strong></div>
        <div class="review-correct">✅ Resposta certa: <strong>${e.correct}</strong></div>
        ${exp?`<div class="review-explanation">💡 ${exp}</div>`:""}
      `;
      reviewList.appendChild(div);
    });
  }

  // Abre o Modo Revisão. Se returnOverlayId for indicado (ex.: "winOverlay",
  // "gameOverOverlay"), esse overlay é escondido e reposto ao fechar — usado
  // quando o jogo já está numa tela de fim de tentativa. Se for null, usa o
  // sistema normal de overlays secundários (openOverlay/closeOverlay), para
  // acesso a meio do jogo (ex.: menu suspenso), que já trata da pausa da física.
  function openReviewScreen(returnOverlayId = null) {
    populateReviewList();
    _reviewReturnOverlay = returnOverlayId;
    if (returnOverlayId) {
      document.getElementById(returnOverlayId)?.classList.add("hidden");
      document.getElementById("reviewOverlay")?.classList.remove("hidden");
    } else {
      openOverlay("reviewOverlay");
    }
  }
  window.__vb_openReview = () => openReviewScreen(null);

  function wireReviewButton(btnId, quizErrorsCount, labelSuffix, returnOverlayId) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (quizErrorsCount > 0) {
      btn.style.display = "block";
      btn.textContent = `📋 Ver ${quizErrorsCount} erro${quizErrorsCount>1?"s":""}${labelSuffix||""}`;
      btn.onclick = () => openReviewScreen(returnOverlayId);
    } else {
      btn.style.display = "none";
    }
  }

  function pickQuizForLevel(levelIdx, theme) {
    const pool = getQuizPool(theme);
    // Rastreio global por tema — evita repetir a mesma pergunta em níveis diferentes com o mesmo tema
    if (!usedQuizByTheme[theme]) usedQuizByTheme[theme] = new Set();
    const usedGlobal = usedQuizByTheme[theme];
    if (usedGlobal.size >= pool.length) usedGlobal.clear(); // esgotou — reiniciar
    const candidates = pool.map((_,i) => i).filter(i => !usedGlobal.has(i));
    const pick = candidates.length > 0
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : Math.floor(Math.random() * pool.length);
    usedGlobal.add(pick);
    if (!usedQuizByLevel[levelIdx]) usedQuizByLevel[levelIdx] = new Set();
    usedQuizByLevel[levelIdx].add(pick);
    return pool[pick];
  }

  // ===== "Sabias que…?" — curiosidades sobre Cibersegurança =====

  let pausedByTeacher = false;
  let _overlayPaused  = false; // true quando um overlay de consulta (mapa, conquistas, etc.) está aberto
  // true enquanto o Mapa/Conquistas está aberto por cima do ecrã de vitória (winOverlay
  // fica escondido nesse intervalo — ver botões "🗺️ Mapa"/"🏆 Conquistas" do winOverlay
  // e closeOverlay()). Sem isto, o overlay novo abria por trás do ecrã de vitória (mesmo
  // z-index, mas o winOverlay vem depois no HTML) e ficava invisível/impossível de usar.
  let _winOverlaySubOpen = false;

  function showHistory(levelIndex, onDone) {
    // HISTORY[] está alinhado com os 20 níveis "de direitos" (0-19), não com a
    // posição bruta na LEVELS (que inclui os bosses). Por isso resolvemos pelo
    // artIdx do nível — os bosses não têm artIdx, por isso simplesmente não mostram história.
    const Lh = LEVELS[levelIndex];
    const histIdx = (Lh && Lh.artIdx != null) ? Lh.artIdx : levelIndex;
    const entry = HISTORY[histIdx] || null;
    if (!entry) { awaitingQuiz=false; if (sceneRef) revealPlayerEntrance(sceneRef); onDone?.(); return; }
    awaitingStory = true;
    // Cancelar qualquer fala pendente do VanBerto's (ex: setTimeout do nível anterior)
    // para o balão não aparecer "pendurado" por cima do cartão "Sabias que...?".
    if (_vbTimer) { clearTimeout(_vbTimer); _vbTimer = null; }
    document.getElementById("vbSpeech")?.classList.remove("vb-show");
    historyText.innerHTML = `<strong class="history-title">${entry.title}</strong>\n${entry.text}`;
    historyOverlay.classList.remove("hidden");
    if (sceneRef) sceneRef.physics.pause();
    // Tap no fundo escuro (fora do cartão) também fecha — evita bloqueio em mobile
    historyOverlay.onclick = (e) => { if(e.target === historyOverlay) btnHistory.onclick?.(); };
    const _historyWatchdog = setTimeout(() => { if(!historyOverlay.classList.contains("hidden")) btnHistory.onclick?.(); }, 15000);
    btnHistory.onclick = () => {
      clearTimeout(_historyWatchdog);
      historyOverlay.onclick = null;
      historyOverlay.classList.add("hidden");
      awaitingStory = false;
      awaitingQuiz = false; // nível pronto a jogar — só agora desbloqueamos hits e porta
      // Rastrear leitura de curiosidade para conquistas e estatísticas
      onHistoryReadForAchievements(mapProgress.levelsCompleted.length);
      if(typeof globalStats !== "undefined") {
        globalStats.curiositiesRead += 1;
        saveGlobalStats();
      }
      if (sceneRef && !pausedByTeacher
          && startOverlay.classList.contains("hidden")
          && quizOverlay.classList.contains("hidden")) {
        sceneRef.physics.resume();
        revealPlayerEntrance(sceneRef);
      }
      onDone?.();
    };
  }

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

  let mapProgress = { highestLevelReached: 0, levelsCompleted: [] };

  function loadMapProgress() {
    const d = loadNamespace("map", {});
    if (typeof d.highestLevelReached === "number") mapProgress.highestLevelReached = d.highestLevelReached;
    if (Array.isArray(d.levelsCompleted)) mapProgress.levelsCompleted = d.levelsCompleted;
  }
  function saveMapProgress() {
    saveNamespace("map", mapProgress);
  }
  loadMapProgress(); // carregar logo no arranque — disponível mesmo antes do Phaser iniciar
  // Chamado quando um nível é concluído (porta aberta com sucesso)
  function markLevelCompleted(idx) {
    if (!mapProgress.levelsCompleted.includes(idx)) mapProgress.levelsCompleted.push(idx);
    if (idx + 1 > mapProgress.highestLevelReached) mapProgress.highestLevelReached = idx + 1;
    saveMapProgress();
  }

  // Devolve a região (de MAP_REGIONS) a que um nível pertence, ou null se nenhuma
  // (ex.: níveis "soltos" ainda não atribuídos a nenhuma região).
  function regionForLevel(idx) {
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
  function bgKeyForLevel(idx) {
    if (LEVEL_BG_OVERRIDE[idx]) return LEVEL_BG_OVERRIDE[idx];
    const region = regionForLevel(idx);
    return region && region.mapBg ? "bg_" + region.id : null;
  }

  // O jogo só avança automaticamente DENTRO do mesmo mundo. Ao terminar o
  // último nível de um mundo (com ou sem boss), o jogador volta sempre ao
  // mapa — só entra no mundo seguinte por escolha própria.
  function isLastLevelOfRegion(idx) {
    const r = regionForLevel(idx);
    return !!(r && r.levels.length && r.levels[r.levels.length - 1] === idx);
  }
  function celebrateWorldComplete(region, onDone) {
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

  function renderMap() {
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
      btn.innerHTML = `
        <div class="map-region-icon">${region.icon}</div>
        <div class="map-region-body">
          <p class="map-region-name">${region.name}</p>
          <p class="map-region-sub">${region.sub}</p>
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
  }

  // Abre o mapa ilustrado de um mundo específico (fundo pintado + níveis
  // como nós clicáveis por cima, posicionados em region.nodePos).
  function openWorldMap(region) {
    openOverlay("worldMapOverlay", () => renderWorldMap(region));
  }

  function renderWorldMap(region) {
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
          btn.innerHTML = `✓<span class="level-node-stars">${starsHTML}</span>`;
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
      mascot.src = "vanberto_voar.png";
      mascot.alt = "";
      mascot.className = "world-map-mascot";
      mascot.style.left = currentNodePos.x + "%";
      mascot.style.top = currentNodePos.y + "%";
      nodesLayer.appendChild(mascot);
    }
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
  function enterLevelWithStory(scene, nextIdx, onMidpoint, onComplete) {
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
    document.getElementById("mapOverlay")?.classList.add("hidden");
    document.getElementById("worldMapOverlay")?.classList.add("hidden");
    startOverlay.classList.add("hidden");
    // Sem isto, _overlayPaused ficava preso a "true" (só closeOverlay() o repõe),
    // e o update() do jogo trava a velocidade do robot a 0 para sempre a partir
    // daqui — era por isso que o robot deixava de se mexer ao entrar num nível
    // escolhido no mapa (ex.: nível 6, logo a seguir a completar o Mundo 1).
    _overlayPaused = false;
    document.body.classList.add("game-started");
    const begin = () => {
      currentLevel = idx;
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

  // Popup curto "Direito recuperado!" — mostrado ao concluir um nível
  // =====================================================
  // ===== SISTEMA DE ARTEFACTOS MÁGICOS =====
  // 20 artefactos únicos — um por competência de cibersegurança recuperada.
  // Cada artefacto tem: emoji visual, nome curto, cor temática,
  // fala do VanBerto e conjunto temático para bónus.
  // =====================================================

  // Nomes dos conjuntos e bónus

  // Reacções extras do VanBerto ao completar cada conjunto

  let collectedArtefacts = {}; // { [artIdx]: true } — chave é o índice no ARTEFACTS (0-19), não a posição em LEVELS

  function loadArtefacts() {
    collectedArtefacts = loadNamespace("artefacts", {});
  }
  function saveArtefacts() {
    saveNamespace("artefacts", collectedArtefacts);
  }
  loadArtefacts();

  // Álbum dos Direitos dos Bosses (novo — ver "Direito Recuperado" em
  // startBossQuizPhase): { [bossId]: {flawless:bool} }, mesmo padrão de
  // collectedArtefacts acima, só que a chave é o id do boss (data-bosses.js)
  // em vez do índice no ARTEFACTS. Namespace próprio ("bossRights"), não
  // misturado com "artefacts", para os 20 artefactos normais continuarem
  // exactamente como estavam para quem já tenha progresso guardado.
  let collectedBossRights = {};
  function loadBossRights() {
    collectedBossRights = loadNamespace("bossRights", {});
  }
  function saveBossRights() {
    saveNamespace("bossRights", collectedBossRights);
  }
  loadBossRights();

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
  function resetAllProgress() {
    // Progresso do mapa da aventura
    mapProgress = { highestLevelReached: 0, levelsCompleted: [] };
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
    score += setData.bonus;
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
  function showLevelCompleteCelebration(levelIdx, onContinue) {
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

  function showRightRecovered(levelIdx) {
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
  function createArtOrbs(scene){
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
  function showArtefactGallery(onDone) {
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
  function renderAlbum() {
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

  // ===== Phaser =====
  let sceneRef=null, currentLevel=0;
  let shadowGfx;
  let powerHaloGfx;
  let sunAngle = 0;
  let trailSprites = [];
  let balloons=[], critters=[], enemyTimers=[];
  let bossTimers=[];
  let movingPlatforms=[], trampolines=[], secretDoors=[], hazards=[];
  // Canos à Mario (pedido: "atalhos ou áreas secretas") — cada nível pode
  // opcionalmente ter L.pipes: [{x,y,w,toX,toY}]. O jogador entra parando
  // em cima e carregando em baixo/S (a mesma tecla de agachar). Ver
  // tryEnterPipe/enterPipe mais abaixo.
  // Posições variadas, nem todos os canos de entrar: cada entrada em
  // L.pipes pode ainda ter:
  //   - decorative:true → cano falso: sólido (dá para subir/ficar em
  //     cima), mas NUNCA entra no array "pipes" usado por tryEnterPipe(), logo
  //     carregar em baixo não faz nada. Recebe um tint subtil para dar uma
  //     pista visual discreta (ver loop de criação em loadLevel).
  //   - caso contrário → cano normal: leva a uma plataforma/área secreta com
  //     uma recompensa (item), sem placas nem texto.
  let pipes=[], _pipeWarping=false, _pipeDownWasHeld=false;
  // Canos "de regresso" só visuais (sem física, ver criação em loadLevel) —
  // pedido: "quando se entra num cano tem de sair de 1 cano". Guardados aqui
  // para serem destruídos ao (re)carregar o nível/arena de boss, já que não
  // pertencem ao grupo físico "platforms" (que se limpa a si próprio).
  let pipeExitDecor=[];
  // Canos falsos (decorative:true) — só para a reação tola ao saltar-lhes
  // em cima (pedido). Cada entrada: { spr, poofed }. "poofed" evita repetir
  // o efeito de cada vez que o jogador fica parado em cima do mesmo cano.
  let decorativePipes = [];
  // CORRIGIDO — _pipeWarping (e player.body.moves) só voltavam a false dentro do
  // onComplete da 2ª tween da animação de cano/sala secreta (~400ms depois de
  // começar). Se essa cadeia de tweens fosse interrompida a meio — killAll()
  // faz exactamente isso, sem disparar onComplete — as duas ficavam presas
  // para sempre: update() força setVelocityX(0) todos os frames enquanto
  // _pipeWarping for true (linha ~1485), e body.moves=false impede a física
  // de mexer o jogador de todo. Resultado: o VanBerto's congelava
  // permanentemente. Chamar isto logo a seguir a qualquer killAll() do
  // jogador (botões "Reiniciar Nível"/"Reiniciar Jogo"/"Sair para o Menu")
  // repõe sempre um estado limpo, mesmo que a interrupção tenha apanhado a
  // animação a meio.
  function resetPipeWarpState() {
    _pipeWarping = false;
    _suppressCrouchUntilRelease = false;
    if (player?.body) player.body.moves = true;
  }
  // Enquanto true, ignora "para baixo" para efeitos de agachar (mas não
  // para o resto do jogo) — ligado sempre que um cano/sala secreta começa
  // a animação, desligado só quando a tecla é MESMO largada. Isto evita
  // que o mesmo "carregar em baixo" que serviu para entrar/sair do cano
  // também agache o VanBerto's mesmo depois de já ter aterrado (ver
  // enterPipe/enterSecretRoomFlow/exitSecretRoomFlow).
  let _suppressCrouchUntilRelease = false;
  let currentSign = null; // { x,y,obj,badge,triggered,text } — letreiro/NPC do nível atual
  let secretSigns = []; // curiosidades dentro das salas dos canos — ver clearSecretSigns/spawnSecretSign
  // Letreiro de tutorial do 1º cano do jogo (pedido: "falta explicar os
  // túneis ao início") — igual em tudo aos outros letreiros (aproxima-te
  // para ler), mas num slot próprio, independente de currentSign, para não
  // substituir o letreiro normal do Nível 1 (ambos ficam visíveis perto do
  // spawn, um a seguir ao outro). Só é criado uma vez, no Nível 1 — ver
  // spawnPipeHintSign, chamado de loadLevel só quando idx===0.
  let pipeHintSign = null;
  // Sala secreta isolada ("tipo os bosses") — ver comentário completo junto
  // a ROOM_WORLD_W. inSecretRoom=true enquanto o jogador está lá dentro;
  // secretRoomReturn guarda onde aterrar de volta no nível principal;
  // secretRoomHidden guarda os objetos do nível principal escondidos
  // temporariamente (para os repor exactamente como estavam); secretRoomTemp
  // guarda os objetos efémeros da própria sala (destruídos ao sair).
  let inSecretRoom = false;
  let secretRoomReturn = null;
  let secretRoomHidden = [];
  let secretRoomTemp = { ledge:null, pipe:null, item:null, decor:[], key:null };
  let player, platforms, itemsGroup, malwareGroup, door, doorOverlap=null;
  // Janela (timestamp de scene.time.now) durante a qual applyVanBertoTexture() não deve
  // substituir a textura — usada pelo piscar de olhos idle e pelo pisca-olho ao toque,
  // para não serem imediatamente sobrepostos pela animação normal no frame seguinte.
  let _eyeOverrideUntil = 0;
  // Fase "entrada visível só quando o jogo arranca": loadLevel() já posiciona
  // e alinha o VanBerto's ao chão, mas mantém-no invisível (alpha 0). A
  // animação de "pop" (fade-in + estica-encolhe) só corre quando o "Sabias
  // que...?" fecha e o jogo arranca de verdade — ver revealPlayerEntrance(),
  // chamada a partir de showHistory(). Isto evita qualquer desalinhamento
  // visível ENQUANTO a física está pausada (nesse período nada corrige a
  // posição automaticamente, ao contrário do que acontece já em jogo).
  let _pendingEntranceReveal = false;
  let cursors, keySpace, keyS;
  let isCrouching = false; // ===== Agachar — nova funcionalidade =====
  let hudText, scoreText, heartsGfx, tipText, itemCountText;
  let progressBg, progressFill, powerIndicator, playerNameHUD;
  let pauseOverlayGfx, pauseVanImg, pauseLabel;
  let transitionGfx, transitionLabel;
  let score=0, lives=3, livesLostThisLevel=0;
  const MAX_LIVES=5;
  // ===== Nível de dificuldade — Fácil (1º/2º ciclo) / Difícil (3º ciclo e
  // secundário) =====
  // Pedido do Berto: o jogo era só para 1º/2º ciclo; este ano vai também
  // usá-lo com 3º ciclo e secundário, por isso precisa de um 2º nível mais
  // desafiante. Escolhido sempre que se começa uma "Nova Aventura" (ver
  // btnStart mais abaixo), guardado em "settings" para sobreviver a um
  // refresh de página a meio de uma partida, e também alterável mais tarde
  // em Opções (optBtnDifficulty), sem ser preciso recomeçar tudo.
  // NOTA: isto não tem nada a ver com difficultyFactor(idx) mais abaixo, que
  // é a progressão natural de dificuldade ao longo dos 20 níveis (sempre
  // existiu). Os dois multiplicam-se — ver getVillainSpeedMult().
  let difficulty = "facil"; // "facil" | "dificil"
  function getDifficulty() { return difficulty; }
  function setDifficulty(d) {
    difficulty = (d === "dificil") ? "dificil" : "facil";
    const s = loadNamespace("settings", {});
    s.difficulty = difficulty;
    saveNamespace("settings", s);
  }
  // Vidas iniciais — 3 no Fácil (como sempre foi), 2 no Difícil (pedido:
  // "jogo mais desafiante... menos vidas").
  function getStartLives() { return difficulty === "dificil" ? 2 : 3; }
  // Multiplicador de velocidade/ritmo de ataque dos BOSSES — ver
  // bossState.speedMult/baseSpeedMult em spawnBossFight e bossEnterRage.
  function getBossSpeedMult() { return difficulty === "dificil" ? 1.2 : 1; }
  // Multiplicador de velocidade dos VILÕES normais (Trapalhão/Saltitão/
  // Perseguilão) — aplicado dentro de difficultyFactor(), a única função que
  // já controlava a velocidade deles consoante o nível.
  function getVillainSpeedMult() { return difficulty === "dificil" ? 1.2 : 1; }
  // Multiplicador do intervalo entre saltos dos VILÕES normais — no
  // Difícil o intervalo encolhe (saltam com mais frequência). Usado em
  // spawnVilao() para o Trapalhão/Saltitão/Perseguilão continuarem a ser os
  // mesmos 3 tipos no Difícil, só que mais rápidos E a saltar mais, em vez
  // de trocarem todos para o comportamento "jumper".
  function getVillainJumpIntervalMult() { return difficulty === "dificil" ? 0.6 : 1; }
  // CORRIGIDO — a versão original desta função reduzia TODOS os itens
  // menos corações, incluindo estrela (Star Power — a ÚNICA forma de matar
  // vilões), medalha (escudo) e duplosalto (o único duplo-salto do nível
  // inteiro nalguns casos). Simulei os 20 níveis: isso deixava 4 níveis
  // (4, 12, 18, 20) SEM NENHUMA estrela no Difícil — impossível matar
  // vilões nesses níveis, e ainda por cima com mais vilões (pedido
  // anterior). Agora só reduz os itens puramente de bónus/pontuação
  // (balão, brinquedo, balão de festa) — nunca poderes.
  function isReducibleItemKind(kind) { return kind === "balao" || kind === "brinquedo" || kind === "balaofesta"; }
  // Quantos itens "reduzíveis" (balão/brinquedo/balão de festa) ficam
  // visíveis num nível — no Difícil fica só cerca de metade (idx par),
  // para a recolha a 100% ser mais desafiante sem tocar em nenhum poder.
  function isItemVisibleInDificil(reducibleIdx) { return reducibleIdx % 2 === 0; }
  // Banco de perguntas a usar, conforme o nível escolhido — cai sempre para
  // o banco base (Fácil) se o avançado ainda não tiver perguntas para aquele
  // tema, para nunca ficar sem quiz nenhum a meio de um combate.
  function getQuizPool(theme) {
    const base = QUIZ_BY_THEME[theme] || QUIZ_BY_THEME["historia_internet"];
    if (difficulty === "dificil") {
      const adv = QUIZ_BY_THEME_AVANCADO[theme];
      if (adv && adv.length) return adv;
    }
    return base;
  }
  let itemsCollected=0, itemsTotal=0;
  let extraShieldCounted=false; // garante que o escudo extra (spawnShields) só entra no total UMA vez por nível
  let collectedItemIndices=new Set(); // índices dos itens já apanhados neste nível
  // NOVO — recompensas das salas secretas (canos com room:true) já apanhadas
  // neste nível/vida. Chave = "x_y" do cano de entrada (único por nível).
  // Sem isto, voltar a entrar no mesmo cano dava a recompensa outra vez,
  // indefinidamente (pedido: "se já apanhei a recompensa não deve mais lá
  // estar, só se perder a vida"). Reposto por completo ao (re)carregar o
  // nível; ao perder uma vida mantém só os corações já apanhados, tal como
  // já acontece com collectedItemIndices.
  let collectedRoomPipes=new Set();
  let _hudDirty=true; // flag: só redesenha HUD quando algo mudou
  let touch={left:false,right:false,jump:false,crouch:false};
  let awaitingQuiz=false, awaitingStory=false;
  let _doorWatchdogTimer=null, _landingCheckTimer=null, _levelAtDoorTrigger=-1;
  let powered=false, poweredTimer=null, powerCountdown=null, invuln=false;
  let starPower=false, starPowerTimer=null, starPowerCountdown=null, starPowerCountVal=0;
  let doubleJumpActive=false, doubleJumpUsed=false; // duplo salto power-up
  // Coyote time + buffer de salto — torna o salto mais "justo" para as crianças
  let coyoteUntil=0, jumpBufferedUntil=0;
  const COYOTE_MS=110, JUMP_BUFFER_MS=130;
  let currentLevelTip = "⭐ Apanha estrelas e chega ao Portal ✨!";
  const GRAVITY=1100;

  // ===== Salas secretas isoladas ("tipo os bosses") =====
  // Em vez de uma plataforma algures no mesmo mundo do nível, entrar num
  // cano de sala secreta agora faz a MESMA troca que startBossFight() faz
  // para os combates de boss: o nível principal é escondido por completo
  // (visibilidade desligada + corpos físicos desligados — NADA é destruído,
  // ver hideMainLevelForRoom()/showMainLevelAfterRoom()) e o mundo físico
  // /câmara encolhem para uma sala pequena e independente, com fundo
  // totalmente redesenhado (applyBackground com o seu próprio tema — ver
  // ROOM_THEME_IDX). Por não destruir nada do nível, o regresso é
  // instantâneo e exato: nenhum item já apanhado reaparece, nenhum vilão
  // volta à posição inicial, nenhuma plataforma móvel salta de posição.
  const ROOM_WORLD_W   = 1000;  // > 960 (largura do ecrã) para nunca sobrar canto vazio
  const ROOM_THEME_IDX = 12;    // "violeta mágico" 🌙 — assinatura visual fixa de TODAS as salas secretas, sempre igual, para se reconhecer logo "sala secreta" independentemente do nível
  const ROOM_LEDGE   = {x:500,y:460,w:280,h:28};
  const ROOM_ITEM_XY = {x:500,y:360};
  const ROOM_PIPE_XY = {x:600,y:414,w:64,h:64}; // tamanho normal (64×64) — antes 56×44, ficava desproporcionado/"cortado" tal como os outros canos que já corrigimos; y ajustado para a base continuar encostada ao chão da sala (ROOM_LEDGE.y=460,h=28 → topo em 446 = 414+32)
  const ROOM_LANDING_Y = 400; // ponto de aterragem ao entrar (x:420 — ver enterSecretRoomFlow)

  const config = {
    type: Phaser.AUTO,
    width: 960, height: 540,
    parent: "game",
    backgroundColor: "#000000",
    transparent: true,
    physics: { default:"arcade", arcade:{ gravity:{y:GRAVITY}, debug:false, overlapBias:12, tileBias:32 } },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 960, height: 540
    },
    scene: { preload, create, update }
  };

  function preload() {
    // PNG externa desativada: a imagem vanberto_voar.png não é quadrada (420×537px)
    // e o jogo força-a num quadrado 72×72, o que a deixa esticada/distorcida.
    // Por isso usamos sempre o robô desenhado em Canvas ("vanberto_open"), que é
    // o que aparece corretamente tanto localmente como online.
    // this.load.image("vanberto_png", "vanberto_voar.png");

    // Ilustrações dos 4 mundos (as mesmas usadas no mapa) — servem de fundo
    // fixo (não faz scroll) durante o próprio nível, para o jogo "estar"
    // visualmente dentro do mundo em que o jogador está a jogar.
    this.load.image("bg_origens", "map-mundo1.jpg");
    this.load.image("bg_desenvolvimento", "map-mundo2.jpg");
    this.load.image("bg_protecao", "map-mundo3.jpg");
    this.load.image("bg_participacao", "map-mundo4.jpg");

    // Fundos por NÍVEL (mais detalhados que os do mapa) — os 4 Mundos têm
    // agora fundo dedicado por nível (alguns partilhados entre pares); a
    // imagem única do mapa (bg_origens/desenvolvimento/protecao/participacao)
    // já só é usada como reserva para níveis "soltos" sem mundo atribuído.
    this.load.image("bg_mundo1_n1e2", "mundo1_n1e2.jpg");
    this.load.image("bg_mundo1_n3e4", "mundo1_n3e4.jpg");
    this.load.image("bg_mundo1_n5", "mundo1_n5.jpg");
    this.load.image("bg_mundo2_n6", "mundo2_n6.jpg");
    this.load.image("bg_mundo2_n7", "mundo2_n7.jpg");
    this.load.image("bg_mundo2_n8", "mundo2_n8.jpg");
    this.load.image("bg_mundo2_n9", "mundo2_n9.jpg");
    this.load.image("bg_mundo3_n10e11", "mundo3_n10e11.jpg");
    this.load.image("bg_mundo3_n12e13", "mundo3_n12e13.jpg");
    this.load.image("bg_mundo3_n14e15", "mundo3_n14e15.jpg");
    this.load.image("bg_mundo4_n16e17", "mundo4_n16e17.jpg");
    this.load.image("bg_mundo4_n18e19", "mundo4_n18e19.jpg");
    this.load.image("bg_mundo4_n20", "mundo4_n20.jpg");
    // Fundo fixo das salas secretas (canos) — o mesmo em TODOS os mundos/níveis,
    // de propósito (ver ROOM_THEME_IDX): reforça que o jogador entrou numa
    // "sala secreta", reconhecível de imediato, independentemente de onde veio.
    this.load.image("bg_sala_secreta", "sala_secreta.jpg");
  }

  function initPhaser() {
    if (window.__dc_game) return;
    const game = new Phaser.Game(config);
    window.__dc_game = game;
  }

  function create() {
    sceneRef = this;
    cursors  = this.input.keyboard.createCursorKeys();
    keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    keyS     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S); // tecla alternativa para agachar
    // Impede o browser de fazer scroll da página com as setas — ↓ agora tem
    // função no jogo (agachar), por isso a captura evita "tremor" da página
    // tal como já acontecia com as outras setas.
    this.input.keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.UP, Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.LEFT, Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.SPACE
    ]);

    this.physics.world.setBounds(0, 0, 2600, 514);
    this.cameras.main.setBounds(0, 0, 2600, 540);

    makeTextures(this);
    initBackground(this);

    shadowGfx = this.add.graphics().setDepth(1);
    powerHaloGfx = this.add.graphics().setDepth(2);

    // HUD
    hudText      = this.add.text(14, 10, "", { fontSize:"16px", fontStyle:"900", color:"#fff5e0", stroke:"#200040", strokeThickness:4 }).setScrollFactor(0).setDepth(100);
    scoreText    = this.add.text(14, 32, "", { fontSize:"14px", fontStyle:"900", color:"#ffd700", stroke:"#200040", strokeThickness:3 }).setScrollFactor(0).setDepth(100);
    // Nome do jogador — elemento HTML fixo (não Phaser), acima de tudo
    playerNameHUD = document.getElementById("playerNameHtml");
    heartsGfx    = this.add.graphics().setScrollFactor(0).setDepth(100);
    tipText      = this.add.text(14, 74, "", { fontSize:"13px", fontStyle:"800", color:"#ff6b35", stroke:"#fff5e0", strokeThickness:3 }).setScrollFactor(0).setDepth(100);
    itemCountText= this.add.text(14, 92, "", { fontSize:"12px", fontStyle:"800", color:"#fff5e0", stroke:"#200040", strokeThickness:2 }).setScrollFactor(0).setDepth(100);

    progressBg   = this.add.graphics().setScrollFactor(0).setDepth(100);
    progressFill = this.add.graphics().setScrollFactor(0).setDepth(100);
    progressBg.fillStyle(0x000000, 0.20);
    progressBg.fillRoundedRect(8, 110, 230, 10, 5);

    powerIndicator = this.add.text(960-14, 52, "", { fontSize:"14px", fontStyle:"900", color:"#ffd700", stroke:"#200040", strokeThickness:4 }).setScrollFactor(0).setDepth(102).setOrigin(1,0);

    // ── HUD de orbes dos artefactos ────────────────────────────────
    createArtOrbs(this);

    // Assinatura da professora — dentro da faixa castanha do chão, muito subtil
    this.add.text(960-8, 536, "✦ © Prof.ª Vanda Várzea ✦", {
      fontSize:"11px", fontStyle:"italic", fontFamily:"Georgia, 'Times New Roman', serif", color:"#f5d9a8",
      stroke:"#3a1a00", strokeThickness:2
    }).setScrollFactor(0).setDepth(100).setOrigin(1,1).setAlpha(0.7);

    pauseOverlayGfx = this.add.graphics().setScrollFactor(0).setDepth(500);
    // pauseVanImg e pauseLabel removidos — substituídos pelo overlay HTML #pauseInfoOverlay

    transitionGfx   = this.add.graphics().setScrollFactor(0).setDepth(800).setAlpha(0);
    transitionLabel = this.add.text(480, 270, "", { fontSize:"32px", fontStyle:"900", color:"#ffd700", stroke:"#200040", strokeThickness:8, align:"center" }).setOrigin(0.5).setScrollFactor(0).setDepth(801).setAlpha(0);

    platforms    = this.physics.add.staticGroup();
    itemsGroup   = this.physics.add.group({ allowGravity:false });
    malwareGroup = this.physics.add.group();

    // Usar a PNG original do VanBerto's como sprite de jogo se disponível,
    // senão cair no Canvas gerado como fallback
    const vanKey = this.textures.exists("vanberto_png") ? "vanberto_png" : "vanberto_open";
    player = this.physics.add.sprite(480, 460, vanKey);
    // Redimensionar a PNG para 72×72 no jogo (tamanho visual idêntico ao Canvas anterior)
    if (vanKey === "vanberto_png") {
      player.setDisplaySize(72, 72);
      player.body.setSize(44, 52);
      player.body.setOffset(
        (player.width  - 44) / 2,
        (player.height - 52) / 2 + 4
      );
    } else {
      player.setCollideWorldBounds(true);
      player.body.setSize(44, 48);
      player.body.setOffset(26, 46);
    }
    player.setCollideWorldBounds(true);
    // Guardar se está a usar a PNG para ajustar animações
    player.setData("usingPng", vanKey === "vanberto_png");

    // Tocar/clicar no VanBerto's faz-lhe um pisca-olho — pequena interação
    // divertida, sem qualquer efeito na jogabilidade (score, vidas, etc.).
    player.setInteractive({ useHandCursor: true });
    player.on("pointerdown", () => triggerVanBertoWink(this));

    this.physics.add.collider(player, platforms);
    this.physics.add.overlap(player, itemsGroup, onCollectItem, null, this);
    this.physics.add.collider(malwareGroup, platforms);
    this.physics.add.overlap(player, malwareGroup, (p,m)=>onHitMalware(p,m), null, this);

    // Lerp 1.0 = snap instantâneo; loadLevel repõe 0.08 após posicionar
    this.cameras.main.startFollow(player, true, 1.0, 1.0);
    this.cameras.main.setDeadzone(140, 90);

    // Pausar a física e escoder o VanBerto's já aqui, logo após a criação —
    // sem isto, entre este ponto e a chamada a loadLevel() (que só acontece
    // ~350ms depois, no midpoint do ecrã de transição) a gravidade já estava
    // a puxar o robô para baixo sem nenhuma plataforma criada ainda, e via-se
    // essa queda por trás do overlay de transição enquanto ele ainda estava
    // semitransparente (fade de 0→1 em 300ms). loadLevel() já pausa a física
    // de novo (idempotente) e showHistory() é quem sempre a resume — este
    // pause() extra só cobre a janela entre create() e o primeiro loadLevel().
    player.setAlpha(0);
    this.physics.pause();

    createTouchInput(this);
    scheduleBlink(this);
    loadGame();
    btnMute.textContent = isMuted() ? "🔇 Som: OFF" : "🔊 Som: ON";
    // Level loaded by btnStart

    if (btnPause && btnRestart) {
      btnPause.onclick = () => {
        if (!sceneRef) return;
        pausedByTeacher = !pausedByTeacher;
        if (pausedByTeacher) {
          sceneRef.physics.pause(); btnPause.textContent = "▶ Continuar"; showPauseScreen(true);
        } else {
          if (!awaitingQuiz && startOverlay.classList.contains("hidden") && historyOverlay.classList.contains("hidden"))
            sceneRef.physics.resume();
          btnPause.textContent = "⏸ Pausa"; showPauseScreen(false);
        }
      };
      btnRestart.onclick = () => {
        if (!sceneRef) return;
        const lvlName = LEVELS[currentLevel]?.name || `Nível ${currentLevel+1}`;
        if (!confirm(`⚠️ Reiniciar o ${lvlName}?\nO progresso neste nível perde-se.`)) return;
        pausedByTeacher=false; _overlayPaused=false; btnPause.textContent="⏸ Pausa"; showPauseScreen(false);
        quizOverlay.classList.add("hidden"); btnCloseQuiz.classList.add("hidden");
        historyOverlay.classList.add("hidden");
        // Matar todos os tweens pendentes (porta e robot) para evitar que callbacks antigos
        // disparem showQuiz no nível novo se o botão for pressionado durante a animação da porta
        try { sceneRef.tweens.killAll(); } catch {}
        resetPipeWarpState();
        _doorAnimRunning = false;
        touch.left=touch.right=touch.jump=touch.crouch=false;
        loadLevel(sceneRef,currentLevel);
        showHistory(currentLevel, () => { awaitingQuiz=false; if(!pausedByTeacher) sceneRef.physics.resume(); });
        saveGame();
      };
    }

    // exitToMainMenu: fecha tudo o que possa estar aberto (quiz, história,
    // pausa) e volta ao ecrã principal — a meio de um nível, no ecrã de
    // vitória/derrota ou onde quer que o jogador esteja. Usada pelo botão
    // "🚪 Sair para o Menu" do menu suspenso.
    function exitToMainMenu() {
      if (!sceneRef) return;
      try { sceneRef.physics.pause(); } catch {}
      try { sceneRef.tweens.killAll(); } catch {}
      resetPipeWarpState();
      _doorAnimRunning = false;
      touch.left = touch.right = touch.jump = touch.crouch = false;
      pausedByTeacher = false; _overlayPaused = false;
      if (btnPause) btnPause.textContent = "⏸ Pausa"; showPauseScreen(false);
      teacherMenuPanel?.classList.remove("open");
      quizOverlay.classList.add("hidden"); btnCloseQuiz.classList.add("hidden");
      historyOverlay.classList.add("hidden");
      gameOverOverlay.classList.add("hidden");
      winOverlay.classList.add("hidden"); document.getElementById("confetti")?.classList.add("hidden");
      closeAllSecondaryOverlays();
      lives = getStartLives(); score = 0; resetQuizStats(); livesLostThisLevel = 0;
      startOverlay.classList.remove("hidden");
      saveGame();
    }

    if (btnRestartGame) {
      btnRestartGame.onclick = () => {
        if (!sceneRef) return;
        pausedByTeacher=false; _overlayPaused=false; btnPause.textContent="⏸ Pausa"; showPauseScreen(false);
        quizOverlay.classList.add("hidden"); btnCloseQuiz.classList.add("hidden");
        historyOverlay.classList.add("hidden");
        // Matar todos os tweens pendentes antes de reiniciar
        try { sceneRef.tweens.killAll(); } catch {}
        resetPipeWarpState();
        _doorAnimRunning = false;
        touch.left=touch.right=touch.jump=touch.crouch=false;
        score=0; lives=getStartLives(); livesLostThisLevel=0;
        resetQuizStats(); Object.keys(usedQuizByLevel).forEach(k=>usedQuizByLevel[k].clear()); Object.keys(usedQuizByTheme).forEach(k=>usedQuizByTheme[k].clear());
        scoreText.setText(`🌟 Pontos: ${score}`); updateHearts();
        loadLevel(sceneRef,0);
        showHistory(0, () => { awaitingQuiz=false; if(!pausedByTeacher) sceneRef.physics.resume(); });
        saveGame();
      };
    }

    // Botão "Ir para nível" — seletor de nível para a professora (protegido por PIN)
    // Nota de segurança: isto é só uma barreira de conveniência (não há como
    // guardar um segredo real só com JavaScript no browser). Por isso guarda-se
    // o hash SHA-256 do PIN em vez do PIN em texto simples — um aluno que veja
    // o código-fonte não lê o código diretamente, só o hash (irreversível na
    // prática). Para trocar o PIN, gera um novo hash (ex.: na consola do
    // browser: `await crypto.subtle.digest("SHA-256", new TextEncoder().encode("NOVOPIN"))`
    // e converte para hex) e substitui o valor abaixo.
    const TEACHER_PIN_HASH = "d4cd013f21bbf4b52c431691b7056337c35d0ad6fc7acc7084abc1039633618e";
    async function sha256Hex(text) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    }
    const btnGoToLevel = document.getElementById("btnGoToLevel");
    if (btnGoToLevel) {
      btnGoToLevel.onclick = async () => {
        if (!sceneRef) return;
        const pin = prompt("🔒 Código da professora:");
        if (pin === null) return;
        const pinHash = await sha256Hex(pin);
        if (pinHash !== TEACHER_PIN_HASH) { alert("❌ Código incorreto."); return; }
        const levelNames = LEVELS.map((l,i)=>`${i+1}. ${l.name.replace(/^Nível \d+\s*[—–-]\s*/,"")}`).join("\n");
        const input = prompt(
          `🎯 Ir para qual nível? (1-${LEVELS.length})\n\n${levelNames}`,
          String(currentLevel + 1)
        );
        if (input === null) return; // cancelou
        const idx = parseInt(input, 10) - 1;
        if (isNaN(idx) || idx < 0 || idx >= LEVELS.length) {
          alert(`❌ Nível inválido. Escolhe entre 1 e ${LEVELS.length}.`); return;
        }
        pausedByTeacher=false; btnPause.textContent="⏸ Pausa"; showPauseScreen(false);
        quizOverlay.classList.add("hidden"); btnCloseQuiz.classList.add("hidden");
        historyOverlay.classList.add("hidden"); awaitingQuiz=false;
        // Cancelar timers da porta antes de mudar de nível
        if(_doorWatchdogTimer){ try{_doorWatchdogTimer.remove(false);}catch{} _doorWatchdogTimer=null; }
        if(_landingCheckTimer){ try{_landingCheckTimer.remove(false);}catch{} _landingCheckTimer=null; }
        // Remover overlap da porta antiga antes da transição para evitar disparo acidental
        if(doorOverlap){ try{ sceneRef.physics.world.removeCollider(doorOverlap); }catch{} doorOverlap=null; }
        touch.left=touch.right=touch.jump=touch.crouch=false;
        livesLostThisLevel=0;
        sceneRef.physics.resume();
        playLevelTransition(sceneRef, idx,
          () => { loadLevel(sceneRef, idx); saveGame(); },
          () => { showHistory(idx, () => { if(!pausedByTeacher) sceneRef.physics.resume(); }); }
        );
      };
    }


    // Botão "Mapa" — disponível durante o jogo, pausa a física e mostra o mapa por cima
    const btnInGameMap = document.getElementById("btnInGameMap");
    if (btnInGameMap) {
      btnInGameMap.onclick = () => {
        if (!sceneRef) return;
        openOverlay("mapOverlay", renderMap);
      };
    }

    // Botões de acesso rápido durante o jogo — usam as funções globais expostas via window.__vb_*
    const _quickBtn = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.onclick = () => { if (fn) fn(); };
    };
    _quickBtn("btnInGameAchievements", () => window.__vb_openAchievements?.());
    _quickBtn("btnInGameAlbum",        () => window.__vb_openAlbum?.());
    _quickBtn("btnInGameStats",        () => window.__vb_openStats?.());
    _quickBtn("btnInGameOptions",      () => window.__vb_openOptions?.());
    _quickBtn("btnInGameHow",          () => window.__vb_openHow?.());

    // Botão hamburger mobile — abre/fecha painel suspenso
    const btnTeacherMenu = document.getElementById("btnTeacherMenu");
    const teacherMenuPanel = document.getElementById("teacherMenuPanel");
    if (btnTeacherMenu && teacherMenuPanel) {
      btnTeacherMenu.onclick = (e) => {
        e.stopPropagation();
        teacherMenuPanel.classList.toggle("open");
        if (teacherMenuPanel.classList.contains("open")) {
          // Pausar a física enquanto o menu está aberto
          _overlayPaused = true;
          if (sceneRef && startOverlay.classList.contains("hidden")) sceneRef.physics.pause();
          touch.left = touch.right = touch.jump = touch.crouch = false;

          // Injectar badges de progresso em tempo real
          const _badge = (id, text) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.querySelector(".tmenu-badge")?.remove();
            if (text) {
              const b = document.createElement("span");
              b.className = "tmenu-badge";
              b.textContent = text;
              el.appendChild(b);
            }
          };
          const mapPct = LEVELS.length > 0
            ? Math.round((mapProgress.levelsCompleted.length / LEVELS.length) * 100) : 0;
          _badge("mBtnMap", mapPct + "%");
          const achvDone = ACHIEVEMENTS_DEFS.filter(a => unlockedAchievements[a.id]).length;
          _badge("mBtnAchievements", achvDone + "/" + ACHIEVEMENTS_DEFS.length);
          _badge("mBtnAlbum", mapProgress.levelsCompleted.length + "/" + LEVELS.length);
          _badge("mBtnStats", "⭐ " + totalStarsEarned() + "/" + (LEVELS.length * 3));
          _badge("mBtnErrors", quizStats.errors?.length ? String(quizStats.errors.length) : "");
          const mBtnPauseEl = document.getElementById("mBtnPause");
          if (mBtnPauseEl) mBtnPauseEl.textContent = (pausedByTeacher ? "▶ Continuar" : "⏸ Pausa");
        } else {
          // Retomar ao fechar o menu
          _overlayPaused = false;
          if (sceneRef && startOverlay.classList.contains("hidden")
              && !pausedByTeacher && !awaitingQuiz && !awaitingStory
              && quizOverlay.classList.contains("hidden")
              && historyOverlay.classList.contains("hidden")) {
            sceneRef.physics.resume();
          }
        }
      };
      // Fechar ao clicar fora — e retomar a física
      document.addEventListener("click", (e) => {
        if (!teacherMenuPanel.contains(e.target) && e.target !== btnTeacherMenu) {
          if (teacherMenuPanel.classList.contains("open")) {
            teacherMenuPanel.classList.remove("open");
            _overlayPaused = false;
            if (sceneRef && startOverlay.classList.contains("hidden")
                && !pausedByTeacher && !awaitingQuiz && !awaitingStory
                && quizOverlay.classList.contains("hidden")
                && historyOverlay.classList.contains("hidden")) {
              sceneRef.physics.resume();
            }
          }
        }
      });
      // Ligar botões do painel aos originais
      const mirror = (mId, origId) => {
        const m = document.getElementById(mId);
        const o = document.getElementById(origId);
        if (m && o) m.onclick = () => {
          o.click();
          teacherMenuPanel.classList.remove("open");
          // Sem isto, _overlayPaused ficava preso a "true" para sempre depois
          // de clicar em botões DENTRO do painel que NÃO abrem outro overlay
          // (ex.: "Reiniciar Jogo"/"Reiniciar Nível") — só o clique FORA do
          // painel ou o toggle do hamburger é que o repunham (ver os dois
          // sítios acima). Mesmo bug/mesma causa já corrigida para
          // startLevelFromMap (ver comentário lá): o robot ficava travado a 0
          // de velocidade para sempre. Só repomos aqui se a própria ação não
          // deixou nenhum outro overlay visível (ex.: "Mapa" abre o
          // mapOverlay de propósito — nesse caso a pausa deve continuar).
          const stillHasOverlay = SECONDARY_OVERLAYS.some(id => !document.getElementById(id)?.classList.contains("hidden"))
            || !historyOverlay.classList.contains("hidden")
            || !quizOverlay.classList.contains("hidden")
            || !document.getElementById("gameOverOverlay")?.classList.contains("hidden")
            || !document.getElementById("winOverlay")?.classList.contains("hidden");
          if (!stillHasOverlay) {
            _overlayPaused = false;
            if (sceneRef && startOverlay.classList.contains("hidden")
                && !pausedByTeacher && !awaitingQuiz && !awaitingStory) {
              sceneRef.physics.resume();
            }
          }
        };
      };      mirror("mBtnFullscreen", "btnFullscreenGame");
      mirror("mBtnTouch",      "btnTouchToggle");
      mirror("mBtnPause",      "btnPause");
      mirror("mBtnMap",        "btnInGameMap");
      mirror("mBtnLevel",      "btnRestartLevel");
      mirror("mBtnGoToLevel",  "btnGoToLevel");
      mirror("mBtnRestart",    "btnRestartGame");

      // Botão "Sair para o Menu" — permite acabar o jogo a qualquer momento,
      // mesmo a meio de um nível (pedido: "falta o botão sair, para quando
      // quiserem possam acabar o jogo"). Pede confirmação (mesmo padrão do
      // "Reiniciar nível"/"Limpar estatísticas") porque o progresso deste
      // nível em curso não fica guardado.
      const mBtnExit = document.getElementById("mBtnExit");
      if (mBtnExit) {
        mBtnExit.onclick = () => {
          if (!confirm("🚪 Sair para o menu principal?\nO progresso deste nível ainda não guardado perde-se.")) return;
          teacherMenuPanel.classList.remove("open");
          exitToMainMenu();
        };
      }

      // Botões de acesso rápido — chamam diretamente as funções expostas
      const _panelBtn = (id, fn) => {
        const el = document.getElementById(id);
        if (el) el.onclick = () => { teacherMenuPanel.classList.remove("open"); fn?.(); };
      };
      _panelBtn("mBtnAchievements", () => window.__vb_openAchievements?.());
      _panelBtn("mBtnAlbum",        () => window.__vb_openAlbum?.());
      _panelBtn("mBtnStats",        () => window.__vb_openStats?.());
      _panelBtn("mBtnErrors",       () => window.__vb_openReview?.());
      _panelBtn("mBtnOptions",      () => window.__vb_openOptions?.());
      _panelBtn("mBtnHow",          () => window.__vb_openHow?.());
    }
  }

  // Dicas de pausa rotativas
  let _pauseTipIdx = 0;

  function showPauseScreen(on) {
    const overlay = document.getElementById("pauseInfoOverlay");
    if (!overlay) return;
    if (pauseOverlayGfx) {
      if (on) {
        pauseOverlayGfx.clear();
        pauseOverlayGfx.fillStyle(0x000000, 0.55);
        pauseOverlayGfx.fillRect(0, 0, 960, 540);
      } else {
        pauseOverlayGfx.clear();
      }
    }
    if (on) {
      const lvl = currentLevel + 1;
      const lvlName = (typeof LEVELS !== "undefined" && LEVELS[currentLevel]?.name) ? LEVELS[currentLevel].name : `Nível ${lvl}`;
      const total = (typeof LEVELS !== "undefined") ? LEVELS.length : 20;
      const el = id => document.getElementById(id);
      if (el("pauseLevel"))    el("pauseLevel").textContent    = lvlName;
      if (el("pauseScore"))    el("pauseScore").textContent    = score ?? 0;
      if (el("pauseLives"))    el("pauseLives").textContent    = (lives ?? 3) + " ❤️".repeat(Math.min(lives ?? 3, 5)).replace(/ /g,"");
      if (el("pauseProgress")) el("pauseProgress").textContent = `${lvl} / ${total}`;
      // Dica contextual: priorizar dicas dos níveis especiais
      let tipIdx;
      if (currentLevel === 6)  tipIdx = 8;  // nível trampolins (Direito ao Brincar) — atualizado depois de mover este nível para o Reino da Educação
      else if (currentLevel === 17) tipIdx = 10; // nível esteira (Direito à Inclusão) — corrigido: estava a apontar para o índice 19 (Direitos Digitais), que não tem esta mecânica
      else { _pauseTipIdx = (_pauseTipIdx + 1) % 8; tipIdx = _pauseTipIdx; }
      if (el("pauseTip")) el("pauseTip").innerHTML = PAUSE_TIPS[tipIdx];
      overlay.classList.remove("hidden");
      document.body.classList.add("overlay-open");
    } else {
      overlay.classList.add("hidden");
      document.body.classList.remove("overlay-open");
    }
  }

  // ===== UPDATE =====
  function updateCritters() {
    if(player){
      const px=player.x, py=player.y;
      const now=sceneRef.time.now*0.001;
      critters.forEach(c=>{
        if(c.collected||!c.sprite||!c.sprite.active) return;

        // Garantir velocidade mínima robusta — nunca ficam paradas
        if(Math.abs(c.speedX) < 0.7) c.speedX = (c.speedX >= 0 ? 1 : -1) * 0.7;
        if(Math.abs(c.speedY) < 0.5) c.speedY = (c.speedY >= 0 ? 1 : -1) * 0.5;
        // Acumular angulo proprio por critter
        if(c.angle === undefined) c.angle = c.phase;
        c.angle += c.isDrone ? 0.06 : 0.04;
        c.x += c.speedX;
        c.y += c.speedY * Math.sin(c.angle);
        // Rebater nas bordas
        if(c.x < 40) { c.x=40; c.speedX=Math.abs(c.speedX); }
        if(c.x > c.worldW-40) { c.x=c.worldW-40; c.speedX=-Math.abs(c.speedX); }
        if(c.y < 30)  { c.y=30;  c.speedY= Math.abs(c.speedY); }
        if(c.y > 310) { c.y=310; c.speedY=-Math.abs(c.speedY); }
        const sc=c.isDrone?0.75:0.80;
        // Batimento de asas — scaleY oscilante
        const wingFlap=1+Math.sin(now*(c.isDrone?18:9)+c.wingPhase)*(c.isDrone?0.18:0.12);
        c.sprite.setFlipX(c.speedX < 0);
        c.sprite.setScale(sc, sc*wingFlap);
        c.sprite.setPosition(c.x, c.y);
        // Colisao com o jogador — hitbox ligeiramente maior para facilitar apanhar
        const pb=player.body;
        if(pb.right>c.x-32&&pb.left<c.x+32&&pb.bottom>c.y-26&&pb.top<c.y+26){
          c.collected=true; c.sprite.destroy(); c.sprite=null;
          const pts=c.isDrone?15:10;
          score+=pts; scoreText.setText(`🌟 Pontos: ${score}`);
          showFloat(sceneRef,px,py-68,c.isDrone?`🛸 Drone +${pts}`:`📦 Pacote +${pts}`,c.isDrone?"#c0d8f0":"#ff80c0");
          if(Math.random()<0.4) showFloat(sceneRef,px,py-100,pickPraise(),"#ffd700");
          ensureAudio(); SFX.coin();
          const tint=c.isDrone?[0xc0d8f0,0x40e0ff,0xffffff]:[0xff80c0,0xd0a0ff,0x80d0ff,0xffffff];
          const pt=sceneRef.add.particles(0,0,"spark_item",{x:px,y:py,speed:{min:50,max:170},lifespan:380,quantity:c.isDrone?14:12,scale:{start:0.9,end:0},gravityY:280,tint});
          sceneRef.time.delayedCall(280,()=>pt.destroy());
          saveGame();
          // Respawnar após 5-9 segundos — usar session para ignorar se o nível mudou
          const wW=LEVELS[currentLevel]?.worldW||2600;
          const mySession = c.session;
          sceneRef.time.delayedCall(5000+Math.random()*4000,()=>{
            // Ignorar se o nível foi reiniciado ou mudou (nova session)
            if(mySession !== _critterSession) return;
            if(!c.collected) return;
            c.collected=false;
            c.x=120+Math.random()*(wW-240); c.y=60+Math.random()*260;
            // Garantir velocidade mínima robusta no respawn
            const dir = Math.random() < 0.5 ? 1 : -1;
            c.speedX = dir * (0.7 + Math.random() * 0.6);
            c.speedY = (Math.random() < 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.5);
            c.angle = Math.random() * Math.PI * 2;
            c.sprite=sceneRef.add.image(c.x,c.y,c.key).setDepth(2).setScale(c.isDrone?0.75:0.80).setAlpha(0.92);
          });
        }
      });
    }
  }

  function update() {
    const _updOverlay = awaitingQuiz || awaitingStory
      || !startOverlay.classList.contains('hidden')
      || !historyOverlay.classList.contains('hidden')
      || !quizOverlay.classList.contains('hidden');
    if (!_updOverlay && !inSecretRoom) {
      updateCritters();
      updateTrampolines(sceneRef);
      updateSecrets(sceneRef);
      updateHazards(sceneRef);
      updateSigns();
      updateSecretSigns();
      updatePipeHintSign();
      updateDecorativePipeReactions();
      if (inBossFight) updateBossFight(sceneRef);
    }
    if (!inSecretRoom) updateMovingPlatforms(sceneRef);
    // A curiosidade da sala secreta (spawnSecretSign, ver
    // buildSecretRoomContents) usa este mesmo "secretSigns" — por isso tem
    // de continuar a ser atualizado MESMO dentro da sala (o bloco acima,
    // gated por "!inSecretRoom", existia de antes de a curiosidade lá
    // dentro existir, e só serve o resto dos sistemas do nível principal).
    // Bug corrigido: sem esta linha, o letreiro aparecia (lâmpada + "!")
    // mas nunca mostrava o texto — "não diz nada".
    if (inSecretRoom) updateSecretSigns();
    const _overlayOpen = awaitingQuiz || awaitingStory || _overlayPaused
      || !startOverlay.classList.contains("hidden")
      || !historyOverlay.classList.contains("hidden")
      || !quizOverlay.classList.contains("hidden")
      || !document.getElementById("gameOverOverlay").classList.contains("hidden")
      || !document.getElementById("winOverlay").classList.contains("hidden");
    if (_overlayOpen) {
      // ── Watchdog anti-bloqueio ──────────────────────────────────────────────
      // Deteta awaitingQuiz=true sem nenhum overlay visível E sem transição de
      // nível a decorrer. O threshold é 6000ms — acima do tempo máximo da
      // animação da porta/portal (≈3.5s, já a incluir a dança do robô antes
      // de ser sugado) mas abaixo de qualquer bloqueio real. Era 3000ms,
      // calibrado para a animação antiga (≈1640ms, sem dança) — ficava
      // apertado demais depois de a dança ser acrescentada e disparava a meio
      // da transição, impedindo o quiz de aparecer e devolvendo o jogador ao
      // mesmo nível.
      const _noVisibleOverlay =
            historyOverlay.classList.contains("hidden")
         && quizOverlay.classList.contains("hidden")
         && startOverlay.classList.contains("hidden")
         && document.getElementById("gameOverOverlay").classList.contains("hidden")
         && document.getElementById("winOverlay").classList.contains("hidden")
         // Ecrãs mostrados depois do winOverlay (galeria de artefactos, certificado)
         // também têm de "contar" como overlay visível — senão o watchdog conclui
         // (ao fim do threshold) que o jogo ficou preso por engano e retoma a física
         // por trás do certificado/galeria, deixando o VanBerto's a apanhar dano
         // invisível. Bug corrigido: adicionadas as verificações abaixo.
         && (document.getElementById("certificateOverlay")?.classList.contains("hidden") ?? true)
         && (document.getElementById("artefactGalleryOverlay")?.classList.contains("hidden") ?? true)
         && (document.getElementById("reviewOverlay")?.classList.contains("hidden") ?? true)
         && (document.getElementById("levelTransitionOverlay")?.style.display || "none") === "none"
         && !document.getElementById("artefactRevealOverlay")?.classList.contains("show")
         // mapOverlay (aberto ao completar um mundo) e o cartão de título
         // #cineTitleCard (cartão "Mundo Completo!"/entrada de região, ver
         // cinematics.js) também contam como overlay visível — awaitingQuiz
         // fica true durante ambos (ver goToNextLevel/spawnBossPortal).
         && (document.getElementById("mapOverlay")?.classList.contains("hidden") ?? true)
         && !document.getElementById("cineTitleCard")?.classList.contains("show")
         // CORRIGIDO: faltava aqui a MESMA verificação que o handler de
         // "visibilitychange" mais abaixo já faz (ver esse comentário) — as
         // cinemáticas de boss (cinematics.js: caixa "#cineDialog" com a
         // classe "cine-show", diálogo de entrada/vitória do boss) criam o
         // seu próprio DOM fora da lista de overlays acima, por isso este
         // watchdog não as via como "coisa legítima a decorrer". Cada fala
         // do diálogo do boss pode legitimamente ficar até 9s à espera de um
         // toque (ver armAutoAdvance em cinematics.js) — bem acima do
         // threshold de 6s abaixo — por isso o watchdog disparava A MEIO da
         // entrada do boss, quase sempre, resumindo a física e limpando
         // awaitingQuiz enquanto a fala ainda estava no ecrã. Com o resto do
         // jogo já "destravado" por baixo da cinemática (updateCritters/
         // updateHazards/etc. voltavam a correr, o boss ainda em fase
         // "intro"), o jogador podia mover-se e a arena reagir de forma
         // inconsistente enquanto a caixa de fala continuava especada por
         // cima — exactamente a sensação de "o jogo bloqueia ao chegar ao
         // boss" reportada. Sem esta linha, era só uma questão de tempo (o
         // combate acabava mesmo por arrancar quando a cinemática terminasse
         // sozinha, ~9-27s depois) — mas com ela o watchdog deixa de mexer
         // em nada enquanto o diálogo do boss estiver mesmo visível.
         && !document.getElementById("cineDialog")?.classList.contains("cine-show")
         && !document.body.classList.contains("cine-active")
         // Mesma lacuna, para o ecrã de "Nível completo!" (estrelas/confetti,
         // ver showLevelCompleteCelebration) — este também fica à espera de
         // um toque em "Continuar", sem NENHUM limite de tempo (ao contrário
         // do diálogo do boss, que pelo menos teria o auto-avanço de 9s).
         // Uma criança a apreciar as estrelas/confetti mais de 6s já bastava
         // para o watchdog disparar por baixo deste ecrã também.
         && !document.getElementById("levelCompleteOverlay")?.classList.contains("show");
      if ((awaitingQuiz || awaitingStory) && !_overlayPaused && _noVisibleOverlay) {
        if (!sceneRef._wdStart) sceneRef._wdStart = Date.now();
        if (Date.now() - sceneRef._wdStart > 6000) {
          sceneRef._wdStart = 0;
          awaitingQuiz = false;
          awaitingStory = false;
          if (!pausedByTeacher) sceneRef.physics.resume();
        }
      } else {
        sceneRef._wdStart = 0;
      }
      // ───────────────────────────────────────────────────────────────────────
      exitCrouch();
      player.setVelocityX(0); applyVanBertoTexture(sceneRef); updateShadow(); return;
    }
    sceneRef._wdStart = 0;
    // Watchdog: retomar física só se não houver nenhuma razão legítima de pausa
    if (!pausedByTeacher && !awaitingStory && !awaitingQuiz && !_overlayPaused
        && sceneRef.physics.world.isPaused) {
      sceneRef.physics.resume();
    }
    let leftDown=cursors.left.isDown||touch.left;
    let rightDown=cursors.right.isDown||touch.right;
    if (sceneRef.time.now < controlsInvertedUntil) { const _t=leftDown; leftDown=rightDown; rightDown=_t; }

    // ===== Agachar — nova funcionalidade =====
    // ↓ / S / botão touch. Reduz a hitbox (esquiva ataques altos como os
    // livros do boss ou o "Fake News" na horizontal, e permite passar por
    // baixo de plataformas baixas), mas trava o salto e anda mais devagar —
    // não dá para atravessar um nível todo agachado sem custo nenhum.
    // Suprimido enquanto _suppressCrouchUntilRelease: entrar/sair de um
    // cano usa a MESMA tecla (↓), por isso mantê-la premida durante e logo
    // a seguir à animação não pode também agachar o VanBerto's — mesmo já
    // aterrado, a hitbox pequena aplicada ainda "no ar" (durante o
    // pequeno salto de reaparecimento) empurrava-o para dentro da
    // plataforma. Só volta ao normal quando a tecla é mesmo largada.
    const downHeld = cursors.down.isDown || (keyS && keyS.isDown) || touch.crouch;
    if (!downHeld) _suppressCrouchUntilRelease = false;
    const wasCrouching = isCrouching;
    if (!_pipeWarping && !_suppressCrouchUntilRelease) {
      isCrouching = !!downHeld && !awaitingQuiz && !awaitingStory;
      if (isCrouching !== wasCrouching) setCrouchHitbox(player, isCrouching);
    }

    // Entrar num cano (pedido: "atalhos ou áreas secretas") — mesma tecla
    // de agachar (↓/S/toque), mas só dispara no INSTANTE em que se carrega
    // (não enquanto se mantém premido) e só se o jogador estiver mesmo em
    // cima de um, parado no chão. Ver tryEnterPipe/enterPipe mais abaixo.
    if (downHeld && !_pipeDownWasHeld && !awaitingQuiz && !awaitingStory && !_pipeWarping
        && player.body && player.body.blocked.down && pipes.length) {
      tryEnterPipe(sceneRef);
    }
    _pipeDownWasHeld = downHeld;

    let speed=powered?320:280;
    if (isCrouching) speed *= 0.55;

    if (_pipeWarping) {
      player.setVelocityX(0);
    } else if (leftDown&&!rightDown) { player.setVelocityX(-speed); player.setFlipX(true);  player.setAngle(-2); }
    else if (rightDown&&!leftDown) { player.setVelocityX(speed); player.setFlipX(false); player.setAngle(2); }
    else { player.setVelocityX(0); player.setAngle(0); }
    // Só aplica escala se não estiver a piscar (invuln) nem a entrar num
    // cano (_pipeWarping) — caso contrário este bloco, que corre todos os
    // frames, sobrepunha-se de imediato à animação de encolher no cano.
    if(!invuln && !_pipeWarping){
      if(player.getData("usingPng")){
        const ps = powered ? 72*1.18 : 72;
        if (isCrouching) player.setDisplaySize(ps*1.08, ps*0.6);
        else player.setDisplaySize(ps, ps);
      } else {
        const baseScale = powered?1.18:1.0;
        if (isCrouching) player.setScale(baseScale*1.08, baseScale*0.6);
        else player.setScale(baseScale);
      }
    }

    // ── COYOTE TIME + BUFFER DE SALTO ────────────────────────────
    const now=sceneRef.time.now;
    const onGround=player.body.blocked.down;
    if(onGround){ coyoteUntil=now+COYOTE_MS; doubleJumpUsed=false; }

    // Deteção de "carregar saltar" (flanco, não "premido") — guarda o pedido por uns ms
    let jumpJustPressed=false;
    if(Phaser.Input.Keyboard.JustDown(cursors.up))  jumpJustPressed=true;
    if(Phaser.Input.Keyboard.JustDown(keySpace))    jumpJustPressed=true;
    if(touch.jump){ jumpJustPressed=true; touch.jump=false; }
    if(jumpJustPressed) jumpBufferedUntil=now+JUMP_BUFFER_MS;

    const wantJump  = now<=jumpBufferedUntil;                  // pedido (flanco) ainda dentro da janela
    const jumpHeld  = cursors.up.isDown||keySpace.isDown;      // tecla mantida (saltar segurando no chão)
    const canGround = now<=coyoteUntil;                        // ainda dá para saltar do "chão" (inclui coyote)

    if ((wantJump||jumpHeld) && canGround && !isCrouching) {
      // Salto normal — chão, coyote time (acabou de sair da plataforma) ou tecla mantida
      player.setVelocityY(powered?-680:-650); ensureAudio(); SFX.jump();
      jumpBufferedUntil=0; coyoteUntil=0; doubleJumpUsed=false;
      sceneRef.tweens.add({targets:player,scaleY:powered?1.26:1.11,scaleX:powered?1.11:0.95,duration:120,yoyo:true});
    } else if (wantJump&&!onGround&&doubleJumpActive&&!doubleJumpUsed&&!isCrouching) {
      // DUPLO SALTO — só com toque/tecla NOVO no ar (flanco), nunca por manter premido
      doubleJumpUsed=true; jumpBufferedUntil=0;
      player.setVelocityY(-920); // muito mais alto que o salto normal (-650)
      ensureAudio();
      // Som especial duplo (acorde ascendente)
      beep({freq:520,dur:0.07,type:"triangle",vol:0.07,slideTo:880});
      setTimeout(()=>beep({freq:880,dur:0.12,type:"triangle",vol:0.07,slideTo:1200}),70);
      // Explosão de asas — círculo de partículas douradas/azuis
      const burst=sceneRef.add.particles(0,0,"spark_item",{
        x:player.x, y:player.y+10,
        speed:{min:60,max:200}, angle:{min:0,max:360},
        lifespan:420, quantity:20, scale:{start:1.1,end:0}, gravityY:120,
        tint:[0xffd700,0xffffff,0x80d0ff,0xffe080,0x40c0ff]
      });
      sceneRef.time.delayedCall(300,()=>burst.destroy());
      // Squash & stretch exagerado para sentir o impulso
      sceneRef.tweens.add({targets:player,scaleY:0.6,scaleX:1.4,duration:80,yoyo:true,
        onComplete:()=>{ player.setScale(1); }});
      showFloat(sceneRef,player.x,player.y-60,"🦅 DUPLO SALTO!","#ffd700");
    }

    // Rastro de partículas de asa enquanto doubleJumpActive e no ar
    if (doubleJumpActive && player && !player.body.blocked.down) {
      if (!sceneRef._wingTrailTimer) sceneRef._wingTrailTimer = 0;
      sceneRef._wingTrailTimer += sceneRef.sys.game.loop.delta;
      if (sceneRef._wingTrailTimer > 80) {
        sceneRef._wingTrailTimer = 0;
        const t = sceneRef.add.particles(0,0,"spark_item",{
          x:player.x, y:player.y+8,
          speed:{min:15,max:50}, angle:{min:80,max:100},
          lifespan:220, quantity:3, scale:{start:0.7,end:0}, gravityY:60,
          tint:[0xffd700,0x80d0ff,0xffffff]
        });
        sceneRef.time.delayedCall(180,()=>t.destroy());
      }
    } else if (!doubleJumpActive && sceneRef._wingTrailTimer !== undefined) {
      sceneRef._wingTrailTimer = 0;
    }

    // Efeito visual estrela: tint arco-íris rápido (dourado/laranja/branco) — como Super Mario
    if (starPower && player && !invuln) {
      if (!sceneRef._starBlinkTimer) sceneRef._starBlinkTimer = 0;
      sceneRef._starBlinkTimer += sceneRef.sys.game.loop.delta;
      // Ciclo de cores arco-íris a cada 80ms: amarelo→laranja→branco→ciano→laranja→amarelo
      const starColors = [0xffd700, 0xff9500, 0xffffff, 0x80ffff, 0xff6b35, 0xffd700];
      if (sceneRef._starBlinkTimer > 80) {
        sceneRef._starBlinkTimer = 0;
        if (!sceneRef._starColorIdx) sceneRef._starColorIdx = 0;
        sceneRef._starColorIdx = (sceneRef._starColorIdx + 1) % starColors.length;
        player.setTint(starColors[sceneRef._starColorIdx]);
        // !_doorAnimRunning: sem isto, a animação do portal do boss (que
        // deixa awaitingQuiz=false de propósito, para o jogador poder andar
        // até ele) tinha este reset de alpha a competir, frame a frame, com
        // o tween que o faz desaparecer no vórtice — o VanBerto's nunca
        // chegava a ficar invisível. A porta normal nunca sofria disto
        // porque mantém awaitingQuiz=true durante toda a sua animação.
        if (!awaitingQuiz && !_doorAnimRunning) player.setAlpha(1); // visível durante star power, mas não durante quiz/porta
      }
      // Rastro de estrelinhas douradas enquanto move
      if (Math.abs(player.body.velocity.x) > 30 || Math.abs(player.body.velocity.y) > 60) {
        if (!sceneRef._starTrailTimer) sceneRef._starTrailTimer = 0;
        sceneRef._starTrailTimer += sceneRef.sys.game.loop.delta;
        if (sceneRef._starTrailTimer > 60) {
          sceneRef._starTrailTimer = 0;
          const t = sceneRef.add.particles(0,0,"spark_item",{
            x:player.x, y:player.y+4,
            speed:{min:20,max:80}, angle:{min:0,max:360},
            lifespan:280, quantity:4, scale:{start:0.9,end:0}, gravityY:80,
            tint:[0xffd700,0xffffff,0xff9500,0xffe080]
          });
          sceneRef.time.delayedCall(200,()=>t.destroy());
        }
      }
    } else if (!starPower && !invuln && player) {
      sceneRef._starBlinkTimer = 0;
      sceneRef._starColorIdx  = 0;
      sceneRef._starTrailTimer = 0;
      // Repõe alpha e limpa tint (só se não há outro power ativo)
      if (!powered) player.clearTint();
      // Só repõe alpha se o robot estiver visível no jogo (não durante
      // animação de porta/quiz normal, NEM durante a animação do portal do
      // boss — ver comentário acima sobre _doorAnimRunning).
      if (player.alpha < 0.9 && !awaitingQuiz && !_doorAnimRunning) player.setAlpha(1);
    }

    applyVanBertoTexture(sceneRef);
    updatePowerHalo(sceneRef);
    updateShadow();

    if (progressFill&&LEVELS[currentLevel]) {
      if (_hudDirty) { updateHUD(LEVELS[currentLevel]); _hudDirty=false; }
      else { updateProgressBar(LEVELS[currentLevel]); } // só a posição do marcador
    }

    // Animar sol (rotação lenta dos raios)
    sunAngle += 0.004;
    drawSun(sunAngle);

    // Animar estrelas noturnas (piscar) — durante um boss, segue o tema do
    // nível que o boss fecha (def.themeIdx já não existe — foi removido ao
    // deixar de haver temas "à parte" por boss, ver data-bosses.js).
    if (inBossFight && bossState) {
      const bossThemeIdx = LEVELS[currentLevel] ? LEVELS[currentLevel].theme % THEMES.length : 0;
      if (NIGHT_THEMES.has(bossThemeIdx)) drawStars(bossThemeIdx, 1600);
    } else if(LEVELS[currentLevel]&&NIGHT_THEMES.has(LEVELS[currentLevel].theme)) {
      drawStars(LEVELS[currentLevel].theme, LEVELS[currentLevel].worldW||2600);
    }

    // Animar nuvens
    clouds.forEach(c=>{
      c.x += c.speed;
      if(c.x > c.worldW+120) c.x=-120;
      drawCloud(c.gfx,c.x,c.y,c.scale,c.alpha,c.type||"cumulo");
    });

    // Trail de movimento (super modo ou no ar)
    updateTrail(sceneRef);

    // Partículas de passo quando corre no chão
    updateFootsteps(sceneRef, player, powered);

    // Halo da porta quando o player está perto
    updateDoorGlow(sceneRef, door, player);

    // Decorações animadas nas plataformas
    updatePlatformDecor(sceneRef);

    // Confetes de fundo — deriva suave
    bgConfetti.forEach(c=>{
      if(!c.gfx||!c.gfx.active) return;
      c.gfx.y = c.baseY + Math.sin(sceneRef.time.now*0.0008+c.phase)*18;
    });

    // Itens sem rotação — apenas flutuam

    // Animar e verificar colisão dos balões flutuantes apanháveis
    if(player){
      const px=player.x, py=player.y;
      balloons.forEach(b=>{
        if(b.collected||!b.sprite) return;
        // Movimento flutuante — sobem pelo ar com deriva lateral
        b.y -= 0.45 + b.speed * 0.12;
        b.x += Math.sin(b.y * 0.018 + b.phase) * 0.6;
        if(b.y < -50){ b.y=560; b.x=80+Math.random()*((LEVELS[currentLevel]?.worldW||2600)-160); }
        b.sprite.setPosition(b.x, b.y);
        b.sprite.setAngle(0);
        // Oscilação suave de alpha
        b.sprite.setAlpha(0.82+Math.sin(Date.now()*0.003+b.phase)*0.12);
        // Colisão com jogador
        const pb=player.body;
        const bLeft=b.x-20, bRight=b.x+20, bTop=b.y-28, bBot=b.y+10;
        if(pb.right>bLeft&&pb.left<bRight&&pb.bottom>bTop&&pb.top<bBot){
          b.collected=true;
          b.sprite.destroy(); b.sprite=null;
          score+=10; scoreText.setText(`🌟 Pontos: ${score}`);
          showFloat(sceneRef,px,py-68,"🔒 Cadeado +10","#ff6b35");
          if(Math.random()<0.35) showFloat(sceneRef,px,py-100,pickPraise(),"#ffd700");
          ensureAudio(); SFX.coin();
          const tint=[0xff6b35,0xffd700,0xff80c0,0x80d0ff];
          const p=sceneRef.add.particles(0,0,"spark_item",{x:px,y:py,speed:{min:60,max:160},lifespan:340,quantity:12,scale:{start:0.9,end:0},gravityY:300,tint});
          sceneRef.time.delayedCall(240,()=>p.destroy());
          saveGame();
          // Respawnar lá em baixo após 4-7 segundos
          const worldW=LEVELS[currentLevel]?.worldW||2600;
          // _critterSession (não currentLevel!) — currentLevel não muda ao entrar
          // num boss, por isso comparar só com currentLevel deixava passar respawns
          // "fantasma" de balões apanhados mesmo antes do boss começar.
          const _balloonSession=_critterSession;
          sceneRef.time.delayedCall(4000+Math.random()*3000,()=>{
            if(_balloonSession!==_critterSession) return; // nível/boss mudou — ignorar
            if(!b.collected) return;
            b.collected=false;
            b.x=80+Math.random()*(worldW-160); b.y=560;
            const newKey="item_cadeado_"+Math.floor(Math.random()*6);
            b.sprite=sceneRef.add.image(b.x,b.y,newKey).setDepth(1).setScale(0.85).setAlpha(0.92);
          });
        }
      });
    }

    // Animar pacotes de dados e drones apanháveis
    malwareGroup.getChildren().forEach(m=>{
      if (!m.active || !m.body) return;
      const isBoss = !!m.getData("isBoss"); // bosses não devem girar como os vilões pequenos
      const pat = m.getData("pattern") || "patrol";
      const spd = m.getData("speed") || 120;
      const dir = m.getData("dir") || 1;  // direcao guardada

      if (pat === "mini") {
        const minL = m.getData("minLeft")  ?? (m.x - 120);
        const minR = m.getData("minRight") ?? (m.x + 120);
        if (m.x <= minL || m.body.blocked.left)  { m.setVelocityX(spd);  m.setData("dir", 1); }
        if (m.x >= minR || m.body.blocked.right) { m.setVelocityX(-spd); m.setData("dir", -1); }
        if (Math.abs(m.body.velocity.x) < 8) { m.setVelocityX(spd * dir); }
        if (!isBoss) m.rotation += 0.012;
      } else {
        if (m.body.blocked.left)  { m.setVelocityX(spd);  m.setData("dir", 1); }
        if (m.body.blocked.right) { m.setVelocityX(-spd); m.setData("dir", -1); }
        if (door && m.x > door.x - 220 && m.body.velocity.x > 0) { m.setVelocityX(-spd); m.setData("dir", -1); }
        // Impede vilões de cair em zonas de perigo (lava/ácido/abismo) — inverte na borda da plataforma
        // Só ativa em níveis com hazards, para não afetar o comportamento normal
        if (hazards.length && m.body.onFloor()) {
          // Sonda um passo à frente, ao nível do chão do vilão
          const probeX = m.x + (m.body.velocity.x > 0 ? 32 : -32);
          const feetY  = m.body.bottom;
          // 1) Verificar se há plataforma sólida sob esse ponto (margem generosa de 30px)
          const hasPlatformAhead = platforms.getChildren().some(p => {
            if (!p.body) return false;
            return probeX >= p.body.left && probeX <= p.body.right &&
                   feetY  >= p.body.top  - 30 && feetY <= p.body.bottom + 30;
          });
          // 2) Verificar se o passo à frente cai numa zona de lava/perigo
          const inHazardAhead = hazards.some(h =>
            probeX >= h.x - h.w / 2 && probeX <= h.x + h.w / 2
          );
          if (!hasPlatformAhead || inHazardAhead) {
            const newDir = m.body.velocity.x > 0 ? -1 : 1;
            m.setVelocityX(spd * newDir);
            m.setData("dir", newDir);
          }
        }
        // Watchdog robusto: se parou, usar direção guardada
        if (Math.abs(m.body.velocity.x) < 8) { m.setVelocityX(spd * (m.getData("dir") || 1)); }
        if (!isBoss) m.rotation += pat === "jumper" ? 0.038 : 0.022;
      }
      if (m.body.velocity.x < -2) m.setFlipX(true);
      else if (m.body.velocity.x > 2) m.setFlipX(false);
    });
  }

  function updateShadow() {
    if (!shadowGfx||!player) return;
    shadowGfx.clear();
    if (awaitingQuiz) return;
    const px=player.x,py=player.y; let groundY=520;
    platforms.getChildren().forEach(p=>{
      if(!p.body) return;
      if(px>=p.body.left&&px<=p.body.right&&p.body.top>py&&p.body.top<groundY) groundY=p.body.top;
    });
    const dist=Math.max(0,groundY-py), alpha=Math.max(0,0.28-dist*0.001), sc=Math.max(0.3,1-dist*0.003);
    shadowGfx.fillStyle(0x000000,alpha); shadowGfx.fillEllipse(player.x,groundY+2,44*sc,10*sc);
  }

  function updatePowerHalo(scene) {
    if (!powerHaloGfx||!player) return;
    powerHaloGfx.clear();
    // Esconder halo durante animação da porta ou quiz
    if (awaitingQuiz) return;

    // ── Barra de Star Power por cima do robô ─────────────────────
    if (starPower) {
      const barW = 46, barH = 6;
      const bx = player.x - barW/2;
      // Se o escudo também estiver ativo, a barra da estrela fica uma linha acima
      const by = powered ? player.y - 66 : player.y - 54;
      const pct = Math.max(0, starPowerCountVal / 8);
      // Halo estelar à volta do robô — cor arco-íris pulsante
      const t2 = scene.time.now * 0.006;
      const pulse2 = 0.45 + Math.sin(t2 * 1.3) * 0.45;
      powerHaloGfx.lineStyle(3, 0xffd700, 0.65 * pulse2);
      powerHaloGfx.strokeCircle(player.x, player.y, 38 + pulse2 * 5);
      powerHaloGfx.lineStyle(2, 0xffe080, 0.40 * pulse2);
      powerHaloGfx.strokeCircle(player.x, player.y, 28 + pulse2 * 3);
      // Fundo escuro
      powerHaloGfx.fillStyle(0x000000, 0.50);
      powerHaloGfx.fillRoundedRect(bx-1, by-1, barW+2, barH+2, 4);
      // Preenchimento — amarelo→laranja→vermelho conforme acaba
      const starBarColor = pct > 0.5 ? 0xffd700 : pct > 0.25 ? 0xff9500 : 0xff3300;
      powerHaloGfx.fillStyle(starBarColor, 0.95);
      powerHaloGfx.fillRoundedRect(bx, by, Math.max(3, barW * pct), barH, 3);
      // Brilho
      powerHaloGfx.fillStyle(0xffffff, 0.35);
      powerHaloGfx.fillRoundedRect(bx, by, Math.max(3, barW * pct), barH/2, 3);
      // Ícone ⭐ à esquerda da barra (círculo dourado — fillStar não existe em Phaser)
      powerHaloGfx.fillStyle(0xffd700, 0.9);
      powerHaloGfx.fillCircle(bx - 8, by + barH/2, 5);
    }

    if (!powered) return;
    const t = scene.time.now * 0.004;
    const pulse = 0.55 + Math.sin(t) * 0.45;
    // Halo exterior — azul royal
    powerHaloGfx.lineStyle(4, 0x4488ff, 0.55 * pulse);
    powerHaloGfx.strokeCircle(player.x, player.y, 34 + pulse * 6);
    // Halo interior — azul claro
    powerHaloGfx.lineStyle(2.5, 0x88ccff, 0.7 * pulse);
    powerHaloGfx.strokeCircle(player.x, player.y, 26 + pulse * 4);
    // Barra de tempo por cima do robô
    const barW = 46, barH = 6;
    const bx = player.x - barW/2, by = player.y - 54;
    const pct = Math.max(0, poweredCountdownVal / 8);
    // Fundo da barra
    powerHaloGfx.fillStyle(0x000000, 0.45);
    powerHaloGfx.fillRoundedRect(bx-1, by-1, barW+2, barH+2, 4);
    // Preenchimento — azul vivo → azul claro → vermelho conforme acaba
    const barColor = pct > 0.5 ? 0x2266ff : pct > 0.25 ? 0x55aaff : 0xff4400;
    powerHaloGfx.fillStyle(barColor, 0.92);
    powerHaloGfx.fillRoundedRect(bx, by, Math.max(3, barW * pct), barH, 3);
    // Brilho no topo da barra
    powerHaloGfx.fillStyle(0xffffff, 0.30);
    powerHaloGfx.fillRoundedRect(bx, by, Math.max(3, barW * pct), barH/2, 3);
  }

  // ===== Balões flutuantes apanháveis =====
  function spawnBalloons(scene,worldW) {
    balloons.forEach(b=>{ if(b.sprite) b.sprite.destroy(); if(b.gfx) b.gfx.destroy(); });
    balloons=[];
    const count=6+(currentLevel%4);
    for(let i=0;i<count;i++){
      const x=80+Math.random()*(worldW-160);
      const y=80+Math.random()*380; // espalhados pelo ar
      const bKey="item_cadeado_"+(i%6);
      const sprite=scene.add.image(x,y,bKey).setDepth(1).setScale(0.85).setAlpha(0.92);
      balloons.push({
        sprite, x, y,
        colorKey:bKey, speed:0.4+Math.random()*0.7,
        phase:Math.random()*Math.PI*2,
        collected:false
      });
    }
  }
  function drawBalloon() {} // mantida para compatibilidade

  // ===== Drones e Pacotes de Dados apanháveis =====
  // Calcula posições dos nós de sinal do chão para poder enviar pacotes de dados até lá
  function getFlowerPositions(worldW) {
    const flowers = [];
    for(let fi=0; fi<Math.floor(worldW/38); fi++){
      flowers.push({ x: 18+fi*38+(fi%4)*5, y: 507+(fi%2)*2 });
    }
    return flowers;
  }

  let _critterSession = 0; // incrementado a cada loadLevel para invalidar respawns pendentes

  function spawnCritters(scene, worldW){
    _critterSession++; // invalidar todos os delayedCall de respawn anteriores
    critters.forEach(c=>{ if(c.sprite&&c.sprite.active) c.sprite.destroy(); });
    critters=[];
    const count = 3 + Math.floor(currentLevel / 2); // 3 no nível 1, até ~12 nos últimos
    const session = _critterSession;
    for(let i=0; i<count; i++){
      // Alternar: metade são pacotes de dados, metade são drones
      const isDrone = (i % 2 === 0);
      const colorIdx = i % 5;
      const key = isDrone ? "item_drone" : "item_pacote_"+colorIdx;
      const x = 120 + Math.random() * (worldW - 240);
      const y = 60 + Math.random() * 260;
      const sprite = scene.add.image(x, y, key)
        .setDepth(2).setScale(isDrone ? 0.75 : 0.80).setAlpha(0.92);
      critters.push({
        sprite, x, y, isDrone, key,
        speedX: (Math.random() < 0.5 ? 1 : -1) * (0.7 + Math.random() * 0.6),
        speedY: (Math.random() < 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.5),
        phase: Math.random() * Math.PI * 2,
        wingPhase: Math.random() * Math.PI * 2,
        collected: false, worldW,
        session // identificador de sessão para cancelar respawns obsoletos
      });
    }
  }

  // ===== Escudos extra distribuídos pelo nível =====
  // Cria 2-3 escudos adicionais espalhados pelo mapa (além do que já está em L.items),
  // posicionados acima das plataformas existentes para ficarem acessíveis.
  // Os escudos ficam no itemsGroup normal e são tratados como "medalha".
  function spawnShields(scene, L) {
    if (currentLevel < 3) return;

    const spawnX = L.spawn?.x ?? 0;
    const plats = L.platforms.filter(p => p.w < 600 && Math.abs(p.x - spawnX) > 200); // excluir plataforma de arranque
    if (!plats.length) return;

    // Ordenar da esquerda para a direita — queremos o escudo perto do início
    const sorted = [...plats].sort((a, b) => a.x - b.x);

    // Primeira plataforma que não tenha NENHUM item de L.items dentro dos seus limites
    // (margem de 8px para dar espaço ao sprite do item) e que também não tenha
    // nenhum CANO em cima — um cano é um corpo sólido alto (~100px) montado
    // sobre a plataforma; se o escudo caísse dentro dessa "coluna" ficava
    // preso lá dentro, visível mas impossível de apanhar (o cano bloqueia o
    // acesso). Por isso os canos contam como "ocupado" tal como os itens.
    const pipes = L.pipes || [];
    // Colunas ocupadas por um cano: o ponto de entrada (x) e, quando existir
    // um regresso num sítio diferente (returnX/returnY, só usado no Nível 4),
    // também esse ponto — lá é desenhado um 2º cano decorativo físico.
    const pipeXs = [];
    pipes.forEach(pp => {
      pipeXs.push(pp.x);
      if (pp.returnX != null && pp.returnX !== pp.x) pipeXs.push(pp.returnX);
    });
    const p = sorted.find(pl => {
      const left  = pl.x - pl.w / 2 - 8;
      const right = pl.x + pl.w / 2 + 8;
      const freeOfItems = L.items.every(it => it.x < left || it.x > right);
      const freeOfPipes = pipeXs.every(px => px < left - 32 || px > right + 32);
      return freeOfItems && freeOfPipes;
    });
    if (!p) return;

    const sx = p.x;
    const sy = p.y - 52;
    const obj = itemsGroup.create(sx, sy, "item_medalha");
    obj.setDepth(2);
    scene.tweens.add({ targets: obj, y: sy - 8, duration: 940, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    obj.setData("kind", "medalha");
    obj.setData("itemIdx", -1); // -1 = escudo extra, não entra no collectedItemIndices
    // Este escudo não está em L.items, por isso não entrava na contagem de
    // "⭐ Itens: X/Y" — o HUD dizia p.ex. "4" quando na verdade havia 5 para
    // apanhar. Ao criá-lo aqui, o total é corrigido (uma única vez por nível).
    if (!extraShieldCounted) {
      extraShieldCounted = true;
      itemsTotal += 1;
      if (itemCountText) itemCountText.setText(`⭐ Itens: ${itemsCollected}/${itemsTotal}`);
    }
  }
  // ===== PLATAFORMAS MÓVEIS =====
  function spawnMovingPlatforms(scene, L) {
    movingPlatforms.forEach(mp => {
      if (mp.sprite && mp.sprite.active) mp.sprite.destroy();
      if (mp.gfx    && mp.gfx.active)   mp.gfx.destroy();
    });
    movingPlatforms = [];
    const defs = L.movingPlatforms || [];
    if (!defs.length) return;
    const themeIdx = (L.theme || 0) % THEMES.length;
    const platKey  = "platform_t" + themeIdx;
    if (!scene.textures.exists(platKey)) makePlatformTextureThemed(scene, platKey, themeIdx);
    defs.forEach(def => {
      const speed  = def.speed  || 80;
      const rangeX = def.rangeX || 0;
      const rangeY = def.rangeY || 0;
      const spr = scene.physics.add.image(def.x, def.y, platKey)
        .setDisplaySize(def.w, def.h || 22).setDepth(2).setImmovable(true);
      spr.body.allowGravity = false;
      const collider1 = scene.physics.add.collider(player, spr);
      const collider2 = scene.physics.add.collider(malwareGroup, spr);
      const gfx = scene.add.graphics().setDepth(3);
      movingPlatforms.push({
        sprite: spr, gfx, collider1, collider2,
        originX: def.x, originY: def.y,
        rangeX, rangeY, speed, dirX: 1, dirY: 1
      });
    });
  }

  function updateMovingPlatforms(scene) {
    if (!movingPlatforms.length) return;
    const dt = scene.sys.game.loop.delta * 0.001;
    movingPlatforms.forEach(mp => {
      if (!mp.sprite || !mp.sprite.active) return;
      if (mp.rangeX > 0) {
        mp.sprite.x += mp.dirX * mp.speed * dt;
        if (mp.sprite.x >= mp.originX + mp.rangeX) { mp.sprite.x = mp.originX + mp.rangeX; mp.dirX = -1; }
        if (mp.sprite.x <= mp.originX - mp.rangeX) { mp.sprite.x = mp.originX - mp.rangeX; mp.dirX =  1; }
      }
      if (mp.rangeY > 0) {
        mp.sprite.y += mp.dirY * (mp.speed * 0.6) * dt;
        if (mp.sprite.y >= mp.originY + mp.rangeY) { mp.sprite.y = mp.originY + mp.rangeY; mp.dirY = -1; }
        if (mp.sprite.y <= mp.originY - mp.rangeY) { mp.sprite.y = mp.originY - mp.rangeY; mp.dirY =  1; }
      }
      // Arrastar o jogador se estiver em cima
      if (player && player.body && player.body.blocked.down) {
        const pb = player.body, sb = mp.sprite.body;
        const onTop = pb.right > sb.left && pb.left < sb.right && Math.abs(pb.bottom - sb.top) < 8;
        if (onTop) {
          if (mp.rangeX > 0) player.x += mp.dirX * mp.speed * dt;
          if (mp.rangeY > 0 && mp.dirY < 0) player.y += mp.dirY * (mp.speed * 0.6) * dt;
        }
      }
      mp.sprite.body.reset(mp.sprite.x, mp.sprite.y);
      // Setas indicadoras
      mp.gfx.clear();
      mp.gfx.lineStyle(2, 0xffd700, 0.55);
      const cx = mp.sprite.x, cy = mp.sprite.y - 18;
      if (mp.rangeX > 0) {
        mp.gfx.beginPath(); mp.gfx.moveTo(cx-10,cy); mp.gfx.lineTo(cx+10,cy); mp.gfx.strokePath();
        mp.gfx.fillStyle(0xffd700, 0.55);
        mp.gfx.fillTriangle(cx-13,cy, cx-7,cy-3, cx-7,cy+3);
        mp.gfx.fillTriangle(cx+13,cy, cx+7,cy-3, cx+7,cy+3);
      } else {
        mp.gfx.beginPath(); mp.gfx.moveTo(cx,cy-8); mp.gfx.lineTo(cx,cy+8); mp.gfx.strokePath();
        mp.gfx.fillStyle(0xffd700, 0.55);
        mp.gfx.fillTriangle(cx,cy-11, cx-3,cy-5, cx+3,cy-5);
        mp.gfx.fillTriangle(cx,cy+11, cx-3,cy+5, cx+3,cy+5);
      }
    });
  }

  function clearMovingPlatforms() {
    movingPlatforms.forEach(mp => {
      if (mp.collider1) { try{ sceneRef.physics.world.removeCollider(mp.collider1); }catch{} }
      if (mp.collider2) { try{ sceneRef.physics.world.removeCollider(mp.collider2); }catch{} }
      if (mp.sprite && mp.sprite.active) mp.sprite.destroy();
      if (mp.gfx    && mp.gfx.active)   mp.gfx.destroy();
    });
    movingPlatforms = [];
  }

  // ===== TRAMPOLINS =====
  function _drawTrampoline(gfx, x, y, compressed) {
    gfx.clear();
    const w = 72, topY = compressed ? y - 4 : y;
    gfx.lineStyle(4, 0xa0a0a0, 0.9);
    gfx.beginPath(); gfx.moveTo(x-w*0.4, topY+14); gfx.lineTo(x-w*0.28, topY); gfx.strokePath();
    gfx.beginPath(); gfx.moveTo(x+w*0.4, topY+14); gfx.lineTo(x+w*0.28, topY); gfx.strokePath();
    const springColors = [0xffd700, 0xff6b35];
    for (let si=0; si<3; si++) {
      gfx.fillStyle(springColors[si%2], 0.9);
      gfx.fillRect(x-5, topY+(compressed?2:4)+si*(compressed?2:3), 10, compressed?2:2.5);
    }
    const arcY = compressed ? topY-2 : topY-6;
    gfx.fillStyle(0xff6b35, 0.95);
    gfx.fillRoundedRect(x-w/2, arcY, w, 9, 4);
    gfx.fillStyle(0xffffff, 0.28);
    gfx.fillRoundedRect(x-w/2+4, arcY+1, w-8, 4, 3);
    gfx.lineStyle(1.5, 0xffd700, 0.55);
    for (let ri=-20; ri<=20; ri+=10) {
      gfx.beginPath(); gfx.moveTo(x+ri, arcY+2); gfx.lineTo(x+ri+5, arcY+7); gfx.strokePath();
    }
    if (!compressed) { gfx.fillStyle(0xffd700, 0.70); gfx.fillCircle(x, arcY-8, 5); }
  }

  function spawnTrampolines(scene, L) {
    trampolines.forEach(t => { if (t.gfx && t.gfx.active) t.gfx.destroy(); });
    trampolines = [];
    const defs = L.trampolines || [];
    if (!defs.length) return;
    defs.forEach(def => {
      const gfx = scene.add.graphics().setDepth(3);
      _drawTrampoline(gfx, def.x, def.y, false);
      trampolines.push({ x: def.x, y: def.y, gfx, cooldown: 0 });
    });
  }

  function updateTrampolines(scene) {
    if (!trampolines.length || !player || !player.body) return;
    const now = scene.time.now;
    trampolines.forEach(t => {
      if (!t.gfx || !t.gfx.active || t.cooldown > now) return;
      const pb = player.body;
      const hit = pb.right > t.x-38 && pb.left < t.x+38 &&
                  pb.bottom > t.y-20 && pb.bottom < t.y+12 &&
                  pb.velocity.y >= 0;
      if (!hit) return;
      player.setVelocityY(powered ? -1200 : -960);
      t.cooldown = now + 600;
      _drawTrampoline(t.gfx, t.x, t.y, true);
      scene.time.delayedCall(140, () => { if (t.gfx && t.gfx.active) _drawTrampoline(t.gfx, t.x, t.y, false); });
      const burst = scene.add.particles(0, 0, "spark_item", {
        x: t.x, y: t.y-10, speed:{min:40,max:140}, angle:{min:200,max:340},
        lifespan:320, quantity:12, scale:{start:0.9,end:0}, gravityY:200,
        tint:[0xff6b35,0xffd700,0xffffff]
      });
      scene.time.delayedCall(240, () => burst.destroy());
      ensureAudio();
      showFloat(scene, player.x, player.y-60, "🌟 Trampolim!", "#ffd700");
    });
  }

  function clearTrampolines() {
    trampolines.forEach(t => { if (t.gfx && t.gfx.active) t.gfx.destroy(); });
    trampolines = [];
  }

  // ===== ZONAS DE PERIGO (lava / ácido / abismo) =====
  // Cada hazard: { x, w, y, gfx, kind }
  // kind: "lava" | "acid" | "void"
  // O player perde uma vida instantaneamente se tocar (a não ser que invuln ou powered)

  function spawnHazards(scene, L) {
    hazards = [];
    const defs = L.hazards || [];
    if (!defs.length) return;

    defs.forEach(def => {
      const kind   = def.kind || "lava";
      const gfx    = scene.add.graphics().setDepth(2).setScrollFactor(1);
      _drawHazard(gfx, def.x, def.y ?? 510, def.w, kind, scene.time.now);
      // Animação de ondulação — recria a cada 120ms
      const timer = scene.time.addEvent({
        delay: 120, loop: true,
        callback: () => {
          if (!gfx || !gfx.active) return;
          _drawHazard(gfx, def.x, def.y ?? 510, def.w, kind, scene.time.now);
        }
      });
      hazards.push({ x: def.x, y: def.y ?? 510, w: def.w, gfx, kind, timer });
    });
  }

  function _drawHazard(gfx, x, y, w, kind, now, h) {
    gfx.clear();
    const t = now * 0.003;
    const half = w / 2;
    // h (opcional, por omissão 30 — igual ao comportamento de sempre nos
    // níveis normais): altura da camada de base. Pedido: "não era o chão
    // todo para o lado mas sim para baixo" — as zonas contaminadas de boss
    // (spawnToxicZones) passam um h maior, para a base preencher a
    // plataforma até ao fundo em vez de flutuar como uma faixa fina só em
    // cima dela. As camadas de detalhe da SUPERFÍCIE (brilho, bolhas,
    // faíscas) mantêm-se sempre perto do topo — é aí que faz sentido
    // continuarem a aparecer, seja qual for a profundidade da base.
    const H = h || 30;

    if (kind === "lava") {
      // Base: laranja escuro → vermelho
      gfx.fillStyle(0xcc2200, 1);
      gfx.fillRect(x - half, y, w, H);
      // Camada brilhante — laranja quente
      gfx.fillStyle(0xff5500, 0.85);
      gfx.fillRect(x - half, y, w, 18);
      // Bolhas/ondas animadas
      gfx.fillStyle(0xff8800, 0.9);
      for (let i = 0; i < Math.floor(w / 22); i++) {
        const bx = x - half + 11 + i * 22 + Math.sin(t + i * 1.3) * 6;
        const by = y + 4 + Math.sin(t * 1.4 + i * 0.9) * 3;
        gfx.fillCircle(bx, by, 6 + Math.sin(t * 2 + i) * 2);
      }
      // Brilho topo — linha amarela pulsante
      gfx.fillStyle(0xffdd00, 0.55 + Math.sin(t * 3) * 0.2);
      gfx.fillRect(x - half, y, w, 3);
      // Faíscas individuais
      gfx.fillStyle(0xffee88, 0.85);
      for (let i = 0; i < 5; i++) {
        const sx = x - half + ((i * 137 + Math.floor(t * 8)) % w);
        const sy = y - 2 - ((Math.floor(t * 6 + i * 3)) % 8);
        gfx.fillCircle(sx, sy, 2);
      }
      // Label 🔥 — texto Phaser não funciona em graphics, usamos círculo como símbolo visual
    } else if (kind === "acid") {
      // Verde ácido tóxico
      gfx.fillStyle(0x004400, 1);
      gfx.fillRect(x - half, y, w, H);
      gfx.fillStyle(0x00aa00, 0.85);
      gfx.fillRect(x - half, y, w, 18);
      // Ondas verdes
      gfx.fillStyle(0x44ff44, 0.75);
      for (let i = 0; i < Math.floor(w / 18); i++) {
        const bx = x - half + 9 + i * 18 + Math.sin(t * 1.2 + i * 1.5) * 5;
        const by = y + 5 + Math.sin(t * 1.8 + i * 0.7) * 3;
        gfx.fillCircle(bx, by, 5 + Math.sin(t * 2.5 + i) * 1.5);
      }
      gfx.fillStyle(0x88ff88, 0.45 + Math.sin(t * 4) * 0.18);
      gfx.fillRect(x - half, y, w, 3);
      // Bolhas de gás a subir
      gfx.fillStyle(0x00ff66, 0.6);
      for (let i = 0; i < 4; i++) {
        const bx2 = x - half + ((i * 79 + Math.floor(t * 5)) % w);
        const by2 = y - 1 - ((Math.floor(t * 4 + i * 4)) % 10);
        gfx.fillCircle(bx2, by2, 2.5);
      }
    } else {
      // void — abismo escuro com aura
      gfx.fillStyle(0x000000, 1);
      gfx.fillRect(x - half, y, w, H);
      gfx.fillStyle(0x220044, 0.8);
      gfx.fillRect(x - half, y, w, 8);
      // Estrelinhas no abismo
      gfx.fillStyle(0xffffff, 0.5 + Math.sin(t * 2) * 0.3);
      for (let i = 0; i < 6; i++) {
        const sx = x - half + ((i * 53 + Math.floor(t * 2)) % w);
        const sy = y + 6 + (i % 3) * 6;
        gfx.fillCircle(sx, sy, 1.5);
      }
    }
  }

  function updateHazards(scene) {
    if (!hazards.length || !player || !player.body) return;
    if (invuln) return; // já protegido
    hazards.forEach(h => {
      const pb = player.body;
      const half = h.w / 2;
      const inX = pb.right > h.x - half + 4 && pb.left < h.x + half - 4;
      const inY = pb.bottom >= h.y - 2 && pb.top < h.y + 20;
      if (!inX || !inY) return;
      // Toca na lava — tratar como hit de inimigo sem knockback horizontal fixo
      hitByHazard(scene, h);
    });
  }

  function hitByHazard(scene, h) {
    if (invuln || awaitingQuiz || _overlayPaused || pausedByTeacher) return;
    ensureAudio(); SFX.hit();
    hitFlash.classList.add("active"); setTimeout(() => hitFlash.classList.remove("active"), 200);
    scene.cameras.main.shake(180, 0.010);

    // Salto de knockback para cima
    player.setVelocityX(0);
    player.setVelocityY(-500);

    // Flash visual no jogador
    scene.tweens.add({
      targets: player,
      angle: { from: -20, to: 20 },
      duration: 70, yoyo: true, repeat: 2,
      ease: "Sine.easeInOut",
      onComplete: () => { if (player) player.setAngle(0); }
    });
    applyHitStop(scene);

    if (powered) { clearPower(scene); setInvuln(scene, 800); tipText.setText("🛡️ Escudo usado! Cuidado."); return; }

    lives -= 1; updateHearts(); livesLostThisLevel++; _hudDirty = true;
    invuln = true;
    triggerVanBertoSad(scene);

    const hazardNames = { lava: "🔥 Lava!", acid: "☠️ Ácido!", void: "🌑 Abismo!" };
    showFloat(scene, player.x, player.y - 60, hazardNames[h.kind] || "⚠️ Perigo!", "#ff4400");
    // Aviso claro de perda de vida — mesmo motivo do onHitMalware (ver ali).
    showFloat(scene, player.x, player.y - 90, "💥 -1 Vida!", "#ff5050");

    scene.time.delayedCall(420, () => {
      if (!player) return;
      const L = LEVELS[currentLevel];
      touch.left = touch.right = touch.jump = touch.crouch = false;
      player.setVelocity(0, 0);
      player.setPosition(L.spawn.x, L.spawn.y);
      snapPlayerToGround();
      if (lives <= 0) { showGameOver(); return; }
      setInvuln(scene, 2000);
      const spawnFlash = scene.add.graphics().setDepth(10);
      spawnFlash.fillStyle(0xffffff, 0.7);
      spawnFlash.fillCircle(L.spawn.x, L.spawn.y, 30);
      scene.tweens.add({ targets: spawnFlash, alpha: 0, scaleX: 2.5, scaleY: 2.5,
        duration: 400, ease: "Quad.easeOut", onComplete: () => spawnFlash.destroy() });
      tipText.setText("⚡ Protegido por 2s!");
    });

    if (lives <= 0) return;
    collectedItemIndices.clear();
    collectedRoomPipes.clear();
    itemsCollected = 0;
    itemCountText.setText(`⭐ Itens: ${itemsCollected}/${itemsTotal}`);
    const keyMap = { estrela:"item_estrela", balao:"item_chave", brinquedo:"item_chip",
                     medalha:"item_medalha", heart:"item_heart", duplosalto:"item_duplosalto",
                     balaofesta:"item_cadeado_2" };
    LEVELS[currentLevel].items.forEach((it, idx) => {
      const exists = itemsGroup.getChildren().some(o => o.getData("itemIdx") === idx);
      if (exists) return;
      const _km = keyMap[it.kind]; const _key = (typeof _km === "function" ? _km() : _km) || "item_estrela";
      const obj = itemsGroup.create(it.x, it.y, _key);
      obj.setDepth(2);
      scene.tweens.add({ targets:obj, y:obj.y-8, duration:940, yoyo:true, repeat:-1, ease:"Sine.easeInOut" });
      obj.setData("kind", it.kind);
      obj.setData("itemIdx", idx);
    });
    const hasExtraShield = itemsGroup.getChildren().some(o => o.getData("itemIdx") === -1);
    if (!hasExtraShield) spawnShields(scene, LEVELS[currentLevel]);
    saveGame();
  }

  function clearHazards() {
    hazards.forEach(h => {
      if (h.gfx && h.gfx.active) h.gfx.destroy();
      if (h.timer) h.timer.remove(false);
    });
    hazards = [];
  }

  // ===== PASSAGENS SECRETAS =====
  function spawnSecrets(scene, L) {
    secretDoors.forEach(s => {
      if (s.gfx  && s.gfx.active)  s.gfx.destroy();
      if (s.item && s.item.active)  s.item.destroy();
    });
    secretDoors = [];
    const defs = L.secrets || [];
    if (!defs.length) return;
    defs.forEach(def => {
      const kind   = def.kind   || "estrela";
      const points = def.points || 0;
      // Criar textura própria para o marcador de segredo (mais visível que emoji)
      const mkKey = "secret_marker";
      if (!scene.textures.exists(mkKey)) {
        const mt = scene.textures.createCanvas(mkKey, 36, 40), mc = mt.getContext();
        // Fundo vermelho vivo com borda amarela
        mc.fillStyle = "#cc0000";
        mc.beginPath(); mc.roundRect(1, 1, 34, 34, 7); mc.fill();
        mc.strokeStyle = "#ffd700"; mc.lineWidth = 2.5;
        mc.beginPath(); mc.roundRect(1, 1, 34, 34, 7); mc.stroke();
        // Ponto de interrogação branco em negrito
        mc.fillStyle = "#ffffff";
        mc.font = "bold 26px Arial";
        mc.textAlign = "center"; mc.textBaseline = "middle";
        mc.fillText("?", 18, 17);
        // Pontinho inferior
        mc.beginPath(); mc.arc(18, 33, 3, 0, Math.PI*2);
        mc.fillStyle = "#ffd700"; mc.fill();
        mt.refresh();
      }
      const gfx = scene.add.image(def.x, def.y - 34, mkKey)
        .setOrigin(0.5).setDepth(4).setAlpha(1);
      scene.tweens.add({ targets:gfx, alpha:{from:0.80,to:1}, scaleX:{from:1,to:1.20}, scaleY:{from:1,to:1.20},
        duration:700, yoyo:true, repeat:-1, ease:"Sine.easeInOut" });
      secretDoors.push({ x:def.x, y:def.y, kind, points, gfx, item:null, triggered:false });
    });
  }

  function updateSecrets(scene) {
    if (!secretDoors.length || !player || !player.body) return;
    secretDoors.forEach(s => {
      if (s.triggered) return;
      const pb = player.body;
      const near = pb.right > s.x-32 && pb.left < s.x+32 && pb.bottom > s.y-60 && pb.top < s.y+10;
      if (!near) return;
      s.triggered = true;
      // Rastrear para a conquista "Explorador" (encontrar todos os segredos do nível)
      onSecretFoundForAchievements((LEVELS[currentLevel]?.secrets || []).length);
      if (s.gfx && s.gfx.active) {
        scene.tweens.add({ targets:s.gfx, alpha:0, y:s.y-60, duration:400,
          onComplete:()=>{ if(s.gfx&&s.gfx.active) s.gfx.destroy(); } });
      }

      // ── Flash de ecrã amarelo ──────────────────────────────────
      const flash = scene.add.graphics().setDepth(200).setScrollFactor(0);
      flash.fillStyle(0xffd700, 0.55);
      flash.fillRect(0, 0, 960, 540);
      scene.tweens.add({ targets:flash, alpha:0, duration:350,
        onComplete:()=>flash.destroy() });

      // ── Explosão de raios dourados MUITO mais visível ──────────
      const rays = scene.add.graphics().setDepth(5);
      rays.fillStyle(0xffd700, 0.80);
      for (let ri=0; ri<12; ri++) {
        const a = (Math.PI*2*ri)/12;
        rays.fillTriangle(s.x, s.y-20,
          s.x+Math.cos(a)*80, s.y-20+Math.sin(a)*80,
          s.x+Math.cos(a+0.22)*80, s.y-20+Math.sin(a+0.22)*80);
      }
      // Segundo anel de raios mais curtos
      rays.fillStyle(0xffffff, 0.60);
      for (let ri=0; ri<8; ri++) {
        const a = (Math.PI*2*ri)/8 + Math.PI/8;
        rays.fillTriangle(s.x, s.y-20,
          s.x+Math.cos(a)*40, s.y-20+Math.sin(a)*40,
          s.x+Math.cos(a+0.30)*40, s.y-20+Math.sin(a+0.30)*40);
      }
      scene.tweens.add({ targets:rays, alpha:0, scaleX:1.8, scaleY:1.8,
        duration:600, ease:"Sine.easeOut", onComplete:()=>rays.destroy() });

      // ── Burst de partículas douradas + coloridas ───────────────
      const burst = scene.add.particles(0,0,"spark_item",{
        x:s.x, y:s.y-20,
        speed:{min:80,max:260}, angle:{min:0,max:360},
        lifespan:520, quantity:30, scale:{start:1.2,end:0}, gravityY:180,
        tint:[0xffd700,0xffffff,0xff9500,0xff80c0,0x80d0ff,0xffe080]
      });
      scene.time.delayedCall(380,()=>burst.destroy());

      // ── Item bónus ─────────────────────────────────────────────
      const keyMap = { estrela:"item_estrela", medalha:"item_medalha", heart:"item_heart", brinquedo:"item_chip", duplosalto:"item_duplosalto", balao:"item_cadeado_0" };
      const it = itemsGroup.create(s.x, s.y-40, keyMap[s.kind]||"item_estrela");
      it.setDepth(3);
      it.setData("kind", s.kind);
      it.setData("itemIdx", -99);
      it.setData("secretPoints", s.points);
      s.item = it;
      // Este item bónus (recompensa por encontrar um segredo) não está em
      // L.items, por isso não entrava na contagem "⭐ Itens: X/Y" — mas ao
      // ser apanhado incrementa itemsCollected na mesma (ver onCollectItem),
      // fazendo o total mostrado ficar errado. Corrigido aqui, com a mesma
      // regra do apanhar (heart não conta).
      if (s.kind !== "heart") {
        itemsTotal += 1;
        if (itemCountText) itemCountText.setText(`⭐ Itens: ${itemsCollected}/${itemsTotal}`);
      }
      // Item aparece com pop de escala
      it.setScale(0.1);
      scene.tweens.add({ targets:it, scaleX:1, scaleY:1, duration:300, ease:"Back.easeOut" });
      scene.tweens.add({ targets:it, y:it.y-8, duration:940, yoyo:true, repeat:-1, ease:"Sine.easeInOut", delay:300 });

      // ── Texto MUITO MAIOR e mais visível ──────────────────────
      const lbl = scene.add.text(s.x, s.y-60, "🔍 SEGREDO!", {
        fontSize:"26px", fontStyle:"900", color:"#ffd700",
        stroke:"#200040", strokeThickness:7
      }).setOrigin(0.5).setDepth(200).setAlpha(0).setScale(0.5);
      scene.tweens.add({ targets:lbl, alpha:1, scaleX:1.3, scaleY:1.3, y:s.y-100,
        duration:300, ease:"Back.easeOut",
        onComplete:()=>scene.time.delayedCall(1600, ()=>{
          scene.tweens.add({ targets:lbl, alpha:0, y:s.y-130, duration:300,
            onComplete:()=>lbl.destroy() });
        }) });

      // ── Som especial de segredo — fanfarra curta ──────────────
      ensureAudio();
      beep({freq:440, dur:0.06, type:"square",   vol:0.07, slideTo:660});
      setTimeout(()=>beep({freq:660, dur:0.06, type:"square",   vol:0.07, slideTo:880}),  70);
      setTimeout(()=>beep({freq:880, dur:0.10, type:"triangle", vol:0.07, slideTo:1320}), 140);
      setTimeout(()=>beep({freq:1320,dur:0.18, type:"triangle", vol:0.07, slideTo:1760}), 260);

      showFloat(scene, s.x, s.y-140, `✨ +${s.points||10} pontos!`, "#ffe080");
    });
  }

  function clearSecrets() {
    secretDoors.forEach(s => {
      if (s.gfx  && s.gfx.active)  s.gfx.destroy();
      if (s.item && s.item.active)  s.item.destroy();
    });
    secretDoors = [];
  }

  // ===== Letreiros/NPCs — Fase "Mundo Vivo" =====
  // Um pequeno elemento por nível normal (não em arenas de boss). O jogador
  // só precisa de caminhar perto para o "ler" — sem menu, sem pausa forçada.
  function clearSign() {
    if (currentSign) {
      try{ currentSign.obj?.destroy(); }catch{}
      try{ currentSign.badge?.destroy(); }catch{}
    }
    currentSign = null;
  }
  // Curiosidades secretas dos canos (pedido: "cada cano leva a uma sala com
  // uma curiosidade... e ganhar coisas") — MESMO visual/UX dos letreiros
  // normais (_createSignAt/showSignMessage, reaproveitados tal e qual), mas
  // num array próprio (secretSigns), independente de currentSign. Se
  // usássemos spawnLevelSign/spawnBossSign para isto, o clearSign() lá
  // dentro destruía o letreiro principal do nível assim que o jogador
  // entrasse no cano — o letreiro normal desaparecia para sempre ao voltar.
  function clearSecretSigns() {
    secretSigns.forEach(s=>{ try{s.obj?.destroy();}catch{} try{s.badge?.destroy();}catch{} try{s.activeLbl?.destroy();}catch{} });
    secretSigns = [];
  }
  function spawnSecretSign(scene, x, y, emoji, text) {
    secretSigns.push(_createSignAt(scene, x, y, emoji, text));
  }
  function updateSecretSigns() {
    if (!player || !secretSigns.length) return;
    secretSigns.forEach(sign=>{
      const dx = Math.abs(player.x - sign.x), dy = Math.abs(player.y - sign.y);
      const near = dx <= 130 && dy <= 170;
      if (near && !sign.wasNear) { sign.wasNear = true; showSignMessage(sign); }
      else if (!near && sign.wasNear) { sign.wasNear = false; hideSignMessage(sign); }
    });
  }
  // Cria o letreiro (emoji + badge "!") numa posição dada — partilhado entre
  // os letreiros normais dos níveis (NPC_SIGNS) e o letreiro do objetivo do boss.
  function _createSignAt(scene, x, y, emoji, text) {
    // padding evita que o emoji (glifo largo/duplo) seja cortado pela caixa
    // de render que o Phaser calcula automaticamente para o texto.
    const obj = scene.add.text(x, y, emoji, {
      fontSize:"30px", padding:{ x:10, y:10 }
    }).setOrigin(0.5).setDepth(2);
    scene.tweens.add({ targets:obj, y:y-8, duration:1100, yoyo:true, repeat:-1, ease:"Sine.easeInOut" });
    const badge = scene.add.text(x+16, y-22, "!", {
      fontSize:"15px", fontStyle:"900", color:"#ffe060", stroke:"#200040", strokeThickness:4,
      padding:{ x:6, y:6 }
    }).setOrigin(0.5).setDepth(3);
    scene.tweens.add({ targets:badge, scaleX:{from:0.8,to:1.15}, scaleY:{from:0.8,to:1.15}, duration:520, yoyo:true, repeat:-1, ease:"Sine.easeInOut" });
    return { x, y, obj, badge, wasNear:false, activeLbl:null, text };
  }
  function spawnLevelSign(scene, L, idx) {
    clearSign();
    const entry = NPC_SIGNS[L.artIdx != null ? L.artIdx : idx];
    if (!entry) return;
    // L.signX/L.signY permitem afinar a posição do letreiro num nível específico
    // (por defeito fica a spawn.x+240, mas nalguns níveis isso cai debaixo de
    // uma plataforma elevada — ver Nível 3 em data-levels.js).
    let x = (typeof L.signX === "number") ? L.signX : L.spawn.x + 240;
    const y = (typeof L.signY === "number") ? L.signY : 486;
    // Afastar o letreiro das bordas do nível — perto do início/fim, a câmara
    // fica "encostada" ao limite do mundo e o balão de texto (até 220px de
    // largura) pode acabar parcialmente fora da área visível.
    const SIGN_MARGIN = 160;
    x = Phaser.Math.Clamp(x, SIGN_MARGIN, L.worldW - SIGN_MARGIN);
    currentSign = _createSignAt(scene, x, y, entry.emoji, entry.text);
  }
  // Letreiro do objetivo do boss — mesma UX dos letreiros normais (aproxima-te
  // para "ler"), em vez de depender só do diálogo inicial, que passa depressa.
  function spawnBossSign(scene, x, y, emoji, text) {
    clearSign();
    currentSign = _createSignAt(scene, x, y, emoji, text);
  }
  function updateSigns() {
    if (!currentSign || !player) return;
    const dx = Math.abs(player.x - currentSign.x), dy = Math.abs(player.y - currentSign.y);
    const near = dx <= 130 && dy <= 170;
    // Volta a mostrar a informação sempre que o jogador ENTRA na zona do
    // letreiro (não só na primeira vez) — dispara na transição longe→perto,
    // por isso não repete a cada frame enquanto o jogador está parado ali.
    if (near && !currentSign.wasNear) {
      currentSign.wasNear = true;
      showSignMessage(currentSign);
    } else if (!near && currentSign.wasNear) {
      currentSign.wasNear = false;
      hideSignMessage(currentSign);
    }
  }
  // Letreiro de tutorial do cano — só no Nível 1, mesmo mecanismo dos
  // outros (aproxima-te para ler). Explica o atalho "chega perto + ↓" que,
  // de outra forma, só se descobre por acidente (o cano parece só um
  // obstáculo sólido, sem nenhuma pista visual do que fazer).
  function spawnPipeHintSign(scene, x, y) {
    clearPipeHintSign();
    pipeHintSign = _createSignAt(scene, x, y, "🚇", "Chega-te a um cano e carrega ↓ para tentares um atalho!");
  }
  function clearPipeHintSign() {
    if (pipeHintSign) {
      try { pipeHintSign.obj?.destroy(); } catch {}
      try { pipeHintSign.badge?.destroy(); } catch {}
      try { pipeHintSign.activeLbl?.destroy(); } catch {}
    }
    pipeHintSign = null;
  }
  function updatePipeHintSign() {
    if (!pipeHintSign || !player) return;
    const dx = Math.abs(player.x - pipeHintSign.x), dy = Math.abs(player.y - pipeHintSign.y);
    const near = dx <= 130 && dy <= 170;
    if (near && !pipeHintSign.wasNear) {
      pipeHintSign.wasNear = true;
      showSignMessage(pipeHintSign);
    } else if (!near && pipeHintSign.wasNear) {
      pipeHintSign.wasNear = false;
      hideSignMessage(pipeHintSign);
    }
  }
  // Reaçãozinha tola ao saltar em cima de um cano falso (decorative:true) —
  // pedido: recompensar quem tenta mesmo os canos "errados" em vez de
  // ficarem completamente inertes. Só dispara 1x por cano por visita ao
  // nível (flag "poofed"); "em cima" = a tocar por baixo do corpo mesmo
  // por cima do cano (não simplesmente encostado de lado).
  function updateDecorativePipeReactions() {
    if (!player || !player.body || !decorativePipes.length) return;
    const pb = player.body;
    if (!pb.touching.down && !pb.blocked.down) return;
    decorativePipes.forEach(dp => {
      if (dp.poofed || !dp.spr || !dp.spr.body) return;
      const b = dp.spr.body;
      const overlapX = pb.right > b.left && pb.left < b.right;
      const onTop = Math.abs(pb.bottom - b.top) <= 4;
      if (!overlapX || !onTop) return;
      dp.poofed = true;
      ensureAudio(); SFX.poof();
      // "Poof" — squish rápido do próprio cano + nuvenzinha de emoji, só
      // para dar um feedback engraçado, sem nenhuma consequência de jogo.
      sceneRef.tweens.add({ targets:dp.spr, scaleY:dp.spr.scaleY*0.8, duration:90, yoyo:true, ease:"Sine.easeOut" });
      const poof = sceneRef.add.text(dp.spr.x, b.top-10, "💨", { fontSize:"22px" }).setOrigin(0.5).setDepth(3);
      sceneRef.tweens.add({ targets:poof, y:poof.y-24, alpha:0, duration:500, ease:"Sine.easeOut",
        onComplete:()=>{ try{poof.destroy();}catch{} } });
    });
  }
  function showSignMessage(sign) {
    // Se já houver uma mensagem deste letreiro a meio (ex.: o jogador saiu e
    // voltou a entrar muito depressa), substitui-a em vez de empilhar as duas.
    if (sign.activeLbl) { try { sign.activeLbl.destroy(); } catch {} sign.activeLbl = null; }
    // Texto aparece junto ao próprio letreiro (não no balão do VanBerto's) — só
    // um sítio a mostrar a informação, em vez de duplicar em dois locais.
    const lbl = sceneRef.add.text(sign.x, sign.y-56, sign.text, {
      fontSize:"13px", fontStyle:"800", color:"#baffef", stroke:"#062a28", strokeThickness:4,
      align:"center", wordWrap:{width:200, useAdvancedWrap:true},
      padding:{ x:10, y:8 }
    }).setOrigin(0.5).setDepth(200).setAlpha(0).setScale(0.7);
    sign.activeLbl = lbl;
    sceneRef.tweens.add({ targets:lbl, alpha:1, scaleX:1, scaleY:1, y:sign.y-70, duration:260, ease:"Back.easeOut" });
    // Pedido: "a informação desaparece muito rápido nem dá para ler" — antes
    // escondia-se sempre ao fim de 4,2s, mesmo que o jogador continuasse
    // parado a lê-la. Agora fica aberta enquanto ele estiver perto (ver
    // hideSignMessage, chamada só quando se afasta), por isso o tempo de
    // leitura deixa de ter limite nenhum.
  }
  // Esconde a mensagem de um letreiro (chamada quando o jogador se afasta) —
  // partilhada por updateSigns/updateSecretSigns/updatePipeHintSign.
  function hideSignMessage(sign) {
    const lbl = sign.activeLbl;
    if (!lbl || !lbl.active) return;
    sceneRef.tweens.add({ targets:lbl, alpha:0, duration:300, onComplete:()=>{ try{lbl.destroy();}catch{} if(sign.activeLbl===lbl) sign.activeLbl=null; } });
  }

  function difficultyFactor(idx) {
    let f = 1 + idx * 0.02;
    if (idx >= 8)  f += (idx - 8)  * 0.015;
    if (idx >= 14) f += (idx - 14) * 0.02;
    // × getVillainSpeedMult(): o nível de dificuldade escolhido pelo
    // jogador (Fácil/Difícil) — ver bloco no topo do ficheiro.
    return Math.min(1.35, f) * getVillainSpeedMult(); // cap mais baixo — 1.35 em vez de 1.85
  }

  // ===== Carregar nível =====
  function loadLevel(scene,idx){
    currentLevel=idx;
    controlsInvertedUntil = 0;
    const L=LEVELS[currentLevel];
    const T=THEMES[L.theme%THEMES.length];

    // Segurança: se por algum motivo um nível for recarregado a meio de uma
    // visita a uma sala secreta (ex.: reset externo), os objetos efémeros
    // da sala e as referências escondidas ficariam órfãos — o próprio
    // loadLevel já limpa/recria "platforms"/"itemsGroup"/"malwareGroup" a
    // seguir, por isso basta esvaziar aqui as referências e as flags.
    inSecretRoom = false;
    secretRoomReturn = null;
    secretRoomHidden = [];
    secretRoomTemp = { ledge:null, pipe:null, item:null, decor:[], key:null };
    resetPipeWarpState();

    scene.physics.world.setBounds(0,0,L.worldW,514);
    scene.cameras.main.setBounds(0,0,L.worldW,540);

    enemyTimers.forEach(t=>{try{t.remove(false);}catch{}}); enemyTimers=[];
    bossTimers.forEach(t=>{try{t.remove(false);}catch{}}); bossTimers=[];
    platforms.clear(true,true);itemsGroup.clear(true,true);
    malwareGroup.clear(true,true);
    pipeExitDecor.forEach(o=>{try{o.destroy();}catch{}}); pipeExitDecor=[];
    clearBossArenaDecor(); // segurança: sem isto, os "livros flutuantes" do Monstro
                            // ficavam órfãos no ecrã depois de se vencer o boss
    if(door){door.destroy();door=null;}
    spawnLevelSign(scene, L, idx);
    clearSecretSigns(); // as curiosidades são (re)criadas mais abaixo, uma por cada L.pipes[].fact
    // Tutorial do cano — só no Nível 1 (idx===0), o "par de demonstração".
    // Posicionado antes do 1º cano do nível (a x:570), mas depois do spawn,
    // para o VanBerto's ler a dica com tempo de sobra antes de lá chegar.
    clearPipeHintSign();
    if (idx === 0) {
      const firstPipe = (L.pipes||[]).find(p=>!p.decorative);
      if (firstPipe) spawnPipeHintSign(scene, firstPipe.x - 50, 486);
    }

    // Recriar HUD de orbes (profundidade sobrevive ao clear das plataformas)
    createArtOrbs(scene);

    // Manter awaitingQuiz=true e física pausada durante todo o setup do nível.
    // O chamador (nextLevel → showHistory callback) é responsável por fazer resume().
    // Evita que o overlap da porta dispare no 1º frame antes do player estar no spawn.
    // Cancelar timers da porta pendentes antes de qualquer setup do nível
    if(_doorWatchdogTimer){ try{_doorWatchdogTimer.remove(false);}catch{} _doorWatchdogTimer=null; }
    if(_landingCheckTimer){ try{_landingCheckTimer.remove(false);}catch{} _landingCheckTimer=null; }
    awaitingQuiz=true; invuln=false; clearPower(scene); clearDoubleJump(scene); clearStarPower(scene); livesLostThisLevel=0; _doorAnimRunning=false; resetLevelStarTracking();
    isCrouching=false; setCrouchHitbox(player, false);
    scene.physics.pause();
    // Garantir que halo e sombra estão visíveis no início do nível
    if(powerHaloGfx) powerHaloGfx.setVisible(true);
    if(shadowGfx)    shadowGfx.setVisible(true);
    itemsCollected=0;
    // itemsTotal — no Difícil conta só os itens "reduzíveis" que ficam
    // mesmo visíveis (ver isItemVisibleInDificil()/isReducibleItemKind()
    // acima); corações e poderes (estrela/medalha/duplosalto) nunca saem
    // da contagem.
    {
      let _r = 0;
      const visibleNonHeart = L.items.filter(it=>{
        if (it.kind === "heart") return false;
        if (!isReducibleItemKind(it.kind)) return true;
        const idxR = _r++;
        return !(difficulty === "dificil" && !isItemVisibleInDificil(idxR));
      }).length;
      itemsTotal = visibleNonHeart
        + (L.pipes||[]).filter(p=>p.room && p.kind!=="heart").length;
    }
    extraShieldCounted=false;
    collectedItemIndices=new Set();
    collectedRoomPipes=new Set();
    _hudDirty=true; updateHUD(L); applyBackground(scene,L.theme%THEMES.length,L.worldW,L.hazards||[],bgKeyForLevel(idx));

    L.platforms.forEach(p=>{
      const themeIdx = L.theme % THEMES.length;
      const platKey = "platform_t"+themeIdx;
      if(!scene.textures.exists(platKey)) makePlatformTextureThemed(scene, platKey, themeIdx);
      const plat=platforms.create(p.x,p.y,platKey);
      plat.displayWidth=p.w; plat.displayHeight=p.h; plat.refreshBody();
      if(plat.body){plat.body.checkCollision.left=false;plat.body.checkCollision.right=false;}
    });

    // Canos à Mario (opcional, ver L.pipes em data-levels.js) — sólidos
    // (entram no grupo "platforms", por isso o jogador já colide com eles
    // como qualquer chão), mais o registo em "pipes" com o destino do
    // salto, usado por tryEnterPipe() no update(). Posição e quantidade (0,
    // 1 ou 2 pares) variam de nível para nível — ver comentário no topo de
    // data-levels.js junto a LEVELS. Sem placas/texto — só o cano e, do
    // outro lado, uma recompensa (item).
    //
    // Altura por omissão AUMENTADA (era 64, igual à largura — ficava mais
    // baixo do que o VanBerto's, que tem 72px de alto parado). Reportado:
    // "não fica em cima do cano" — ao chegar-se ao pé do cano ao nível do
    // chão (é assim que se ativa o atalho: chegar perto + carregar em
    // baixo, não é preciso saltar-lhe para cima), a cabeça do VanBerto's
    // só ultrapassava o topo do cano por ~8px, ficando o resto do corpo
    // visualmente "engolido" por ele. Com 100px o cano fica claramente
    // mais alto do que o VanBerto's, tal como um cano a sério — ele fica
    // à frente/ao lado, não dentro. A BASE mantém-se sempre encostada ao
    // chão/plataforma por baixo (pipeCenterY só estica o TOPO para cima),
    // por isso não é preciso mexer em nenhum y de nenhum nível.
    const PIPE_DEFAULT_H = 100;
    // p.y em data-levels.js foi sempre pensado como CENTRO de um cano de
    // 64px (base = y+32) — ver comentários junto a "pipes:" em cada
    // nível. Ao usar uma altura por omissão maior, preservamos essa MESMA
    // base (só o topo sobe) para não ser preciso recalcular y em lado
    // nenhum. Se p.h vier definido explicitamente, assume-se que y já foi
    // calculado de propósito para essa altura exata — não se mexe.
    const pipeCenterY = (p) => p.h ? p.y : ((p.y + 32) - PIPE_DEFAULT_H / 2);
    pipes = [];
    decorativePipes = [];
    (L.pipes||[]).forEach(p=>{
      if(!scene.textures.exists("pipe_mario")) makePipeTexture(scene);
      const w = p.w||64, h = p.h||PIPE_DEFAULT_H;
      const spr = platforms.create(p.x, pipeCenterY(p), "pipe_mario");
      spr.displayWidth = w; spr.displayHeight = h; spr.refreshBody();
      // Sólido nos 4 lados (pedido: "não pode passar pela frente, tem de se
      // saltar") — tanto o VanBerto's como os vilões (malwareGroup também
      // colide com "platforms", ver linha ~977) batem de lado e são
      // travados/viram para trás, tendo mesmo de saltar por cima.
      if (p.decorative) {
        // Cano falso (pedido: "nem todos os túneis são de entrar") — fica só
        // como obstáculo/plataforma; por não entrar no array "pipes" abaixo,
        // tryEnterPipe() nunca o reconhece, mesmo que o jogador carregue em
        // baixo em cima dele. Tint subtil (esverdeado mais baço/acinzentado)
        // — pista discreta para quem reparar, sem ser óbvia à distância.
        spr.setTint(0x9fb89f);
        // Registo para a reaçãozinha tola ao saltar-lhe em cima (pedido:
        // recompensar quem tenta mesmo os canos "errados") — ver
        // updateDecorativePipeReactions() no update().
        decorativePipes.push({ spr, poofed:false });
      } else if (p.room) {
        const roomKey = p.x+"_"+p.y; // identifica este cano de sala secreta de forma única no nível
        // Por omissão o regresso é pelo MESMO cano (returnX/returnY = x/y) —
        // não há "cano de saída" nenhum a desenhar, o jogador simplesmente
        // volta a aparecer a sair do cano físico que já lá está (o mesmo em
        // que entrou). Só quando o nível define returnX/returnY diferentes
        // (ver data-levels.js) é que o regresso fica noutro sítio — usado só
        // no Nível 4, de propósito, como atalho alternativo ao vão do
        // trampolim. Nesse caso (e só nesse) desenhamos um 2º cano no ponto
        // de regresso, do MESMO tamanho/proporção do cano normal (64×64 —
        // antes era 56×44, espremido, o que o fazia parecer cortado).
        const hasCustomReturn = p.returnX!=null && p.returnY!=null
          && (p.returnX!==p.x || p.returnY!==p.y);
        const returnX = hasCustomReturn ? p.returnX : p.x;
        const returnY = hasCustomReturn ? p.returnY : p.y;
        pipes.push({x:p.x, y:p.y, w, room:true, kind:p.kind, returnX, returnY, key:roomKey, fact:p.fact});
        if (hasCustomReturn) {
          // Físico (entra no grupo "platforms", tal como um cano decorativo
          // normal) — antes era só uma imagem sem corpo, por isso o
          // VanBerto's nunca conseguia mesmo ficar em cima dele: caía sempre
          // na plataforma por baixo.
          const exImg = platforms.create(returnX, pipeCenterY({x:returnX,y:returnY,h:p.h}), "pipe_mario");
          exImg.displayWidth = w; exImg.displayHeight = h; exImg.refreshBody();
          // Pedido: "os túneis por onde saímos também dá para voltar a
          // entrar" — por isso este cano de saída ENTRA no array "pipes"
          // (deixa de ser só decorativo), com room:true e regresso PARA SI
          // PRÓPRIO (returnX/returnY = as suas próprias coordenadas — igual
          // ao comportamento por omissão de um cano sem returnX/returnY
          // definidos). Mesma roomKey do cano de entrada original, para o
          // prémio da sala continuar a ser contado uma única vez, venha o
          // jogador por que lado vier. Sem tint acinzentado — agora é um
          // cano a sério, tal como o de entrada, e deve parecer um.
          pipes.push({x:returnX, y:returnY, w, room:true, kind:p.kind,
            returnX, returnY, key:roomKey, fact:p.fact});
          pipeExitDecor.push(exImg);
        }
      } else {
        pipes.push({x:p.x, y:p.y, w, toX:p.toX, toY:p.toY});
      }
    });

    door=scene.physics.add.staticSprite(L.doorX,448,"door_party").setDisplaySize(88,104);
    door.refreshBody(); // sincronizar hitbox físico com o tamanho visual (setDisplaySize não o faz automaticamente)
    door.clearTint();
    // Guardar referência ao collider para o poder destruir no momento do toque (evita re-disparo no móvel)
    if(doorOverlap) { try{ scene.physics.world.removeCollider(doorOverlap); }catch{} doorOverlap=null; }
    let _doorTriggered=false; // guarda local — evita disparo duplo no mesmo frame
    const _spawnX = L.spawn.x; // guardar spawn para verificação de distância mínima
    doorOverlap = scene.physics.add.overlap(player,door,()=>{
      if(awaitingQuiz||_doorTriggered||invuln) return;
      // Segurança: ignorar overlap se o player ainda está perto do spawn (evita disparo falso no 1º frame após resume)
      if(Math.abs(player.x - _spawnX) < 200) return;
      _doorTriggered=true;
      try{ scene.physics.world.removeCollider(doorOverlap); doorOverlap=null; }catch{}
      tryOpenDoor(scene);
    },null,scene);
    scene.tweens.add({targets:door,alpha:{from:1,to:0.82},duration:900,yoyo:true,repeat:-1});

    // Decorações animadas nas plataformas
    spawnPlatformDecor(scene, platforms);

    const keyMap={
      estrela:"item_estrela",
      balao:"item_chave",
      brinquedo:"item_chip",medalha:"item_medalha",heart:"item_heart",
      duplosalto:"item_duplosalto",
      balaofesta:"item_cadeado_2"
    };
    // Velocidade de rotação por tipo de item — removida (itens ficam fixos)
    const rotSpeeds={};
    // No Difícil, cerca de metade dos itens "reduzíveis" (balão/brinquedo/
    // balão de festa) fica de fora do nível — nunca estrela/medalha/
    // duplosalto/coração (ver isReducibleItemKind() acima). Usa o MESMO
    // critério (idx par/ímpar) que o cálculo de itemsTotal logo acima, para
    // os dois nunca desalinharem.
    let _rIdx = 0;
    L.items.forEach((it,idx)=>{
      if (isReducibleItemKind(it.kind)) {
        const idxR = _rIdx++;
        if (difficulty === "dificil" && !isItemVisibleInDificil(idxR)) return; // não cria este item
      }
      const _km=keyMap[it.kind]; const _key=typeof _km==="function"?_km():(_km||"item_estrela");
      const obj=itemsGroup.create(it.x,it.y,_key);
      obj.setDepth(2);
      scene.tweens.add({targets:obj,y:obj.y-8,duration:940,yoyo:true,repeat:-1,ease:"Sine.easeInOut"});
      obj.setData("kind",it.kind);
      obj.setData("itemIdx",idx);
    });

    // Halo da porta (criado aqui, atualizado no update)
    resetDoorGlow(scene);

    const df=difficultyFactor(currentLevel);
    L.malwares.forEach(m=>spawnVilao(scene,m.x,480,m.vx,df,m.pattern||"patrol"));

    // Garantir que os 3 tipos de vilao aparecem SEMPRE em todos os niveis —
    // no Difícil os 3 tipos mantêm-se distintos (ver spawnVilao), só que os
    // limiares abaixo desbloqueiam bem mais cedo, para haver mais vilões
    // espalhados pelas plataformas (pedido: "mais vilões nas plataformas").
    if(L.platforms.length>=5) {
      const hardDif = getDifficulty() === "dificil";
      const mid  = L.platforms[Math.floor(L.platforms.length/2)];
      const q1   = L.platforms[Math.floor(L.platforms.length/4)];
      const q3   = L.platforms[Math.floor(L.platforms.length*3/4)];

      // Tipo 1 - vilao_round (mini/redondo): sempre presente, zona central
      spawnVilao(scene, mid.x, 480, (currentLevel%2===0)?120:-120, df, "mini");

      // Tipo 2 - vilao_spike (patrol): sempre presente no 1/4 do nivel
      spawnVilao(scene, q1.x, 480, (currentLevel%2===0)?-170:170, df, "patrol");

      // Tipo 3 - vilao_bug (jumper): sempre presente no 3/4 do nivel (a
      // partir do nivel 2; no Difícil, mais vilões espalhados pelo nível —
      // pedido do Berto — por isso os limiares abaixo são bem mais baixos,
      // reaproveitando exactamente as mesmas posições seguras (mid/q1/q3/
      // qEx/qLate) já validadas pelo design de cada nível, só desbloqueadas
      // mais cedo em vez de inventar posições novas.
      if(hardDif || currentLevel>=2){
        spawnVilao(scene, q3.x, 480, (currentLevel%2===0)?190:-190, df, "jumper");
      }
      // Segundo jumper extra a partir do nivel 4 (Difícil: já a partir do
      // nivel 2 — o 1º nivel do Difícil fica só com mid/q1/q3, um pouco
      // mais calmo como introdução)
      if(hardDif ? currentLevel>=1 : currentLevel>=4){
        const qEx = L.platforms[Math.floor(L.platforms.length*2/3)];
        spawnVilao(scene, qEx.x, 480, (currentLevel%2===0)?-200:200, df, "jumper");
      }
      // Terceiro jumper e patrol extra nos ultimos 6 niveis (Difícil: pediu
      // "mais vilões nas plataformas" — passa a ser bem mais cedo, a
      // partir do nivel 4)
      if(hardDif ? currentLevel>=3 : currentLevel>=14){
        const qLate = L.platforms[Math.floor(L.platforms.length*5/6)] || q3;
        spawnVilao(scene, qLate.x, 480, (currentLevel%2===0)?210:-210, df, "jumper");
        spawnVilao(scene, q1.x+200, 480, (currentLevel%2===0)?-160:160, df, "patrol");
      }
      // Ultimo nivel — viloes em todos os quartos (Difícil: a partir do
      // nivel 7, em vez de só no fim do jogo)
      if(hardDif ? currentLevel>=6 : currentLevel>=19){
        spawnVilao(scene, mid.x+300, 480, (currentLevel%2===0)?220:-220, df, "jumper");
        spawnVilao(scene, mid.x-300, 480, (currentLevel%2===0)?-180:180, df, "patrol");
      }
    }

    spawnBalloons(scene,L.worldW);
    spawnCritters(scene,L.worldW);
    spawnShields(scene,L);
    clearMovingPlatforms(); spawnMovingPlatforms(scene,L);
    clearTrampolines();     spawnTrampolines(scene,L);
    clearSecrets();         spawnSecrets(scene,L);
    clearHazards();         spawnHazards(scene,L);

    player.setAlpha(0); player.setAngle(0); player.setFlipX(false); player.setOrigin(0.5,0.5); player.setDepth(3);
    // Importante: manter o tamanho NORMAL aqui (não o "achatado" do pop de
    // entrada) — snapPlayerToGround(), chamado mais abaixo, precisa de medir
    // o corpo físico ao tamanho real. A animação de "pop" (encolhida→normal)
    // só é aplicada mais tarde por revealPlayerEntrance(), quando o jogo
    // realmente arranca — nunca aqui, enquanto a física ainda está pausada
    // e nada corrigiria um eventual desalinhamento entretanto.
    if(player.getData("usingPng")){
      player.setDisplaySize(72, 72);
    } else {
      player.setScale(1);
    }
    player.setPosition(L.spawn.x, L.spawn.y); player.setVelocity(0, 0);
    if (player.body) player.body.reset(L.spawn.x, L.spawn.y); // forçar corpo físico para o spawn imediatamente
    // Snap instantâneo da câmara para o spawn, depois repor lerp suave para o jogo.
    // Importante: centrar em L.spawn.y (posição real do VanBerto's), não num Y fixo —
    // um valor fixo (ex: 270) não corresponde ao chão do nível, o que fazia o
    // VanBerto's aparecer "afundado" perto do fundo do ecrã ao arrancar o nível
    // (visível sobretudo no ecrã "Sabias que...?", que aparece antes de a câmara
    // ter tempo de se corrigir sozinha a seguir o jogador).
    scene.cameras.main.startFollow(player, true, 1.0, 1.0);
    scene.cameras.main.centerOn(L.spawn.x, L.spawn.y);
    scene.time.delayedCall(50, () => scene.cameras.main.startFollow(player, true, 0.08, 0.08));
    touch.left=touch.right=touch.jump=touch.crouch=false;
    // Alinhar já o VanBerto's ao chão (mesmo cálculo que antes corria 80ms
    // depois) — mas sem o revelar. Enquanto o cartão de transição/"Sabias
    // que...?" estiver a decorrer, a física continua pausada, por isso
    // nada vai desalinhar isto entretanto. A animação de entrada (fade-in +
    // "pop") só corre em revealPlayerEntrance(), chamada quando o jogo
    // realmente arranca (ver showHistory).
    snapPlayerToGround();
    _pendingEntranceReveal = true;

    const TIPS = [
      "🌐 A internet liga o mundo — apanha as estrelas e chega ao Portal ✨!",
      "🔐 Uma palavra-passe forte é o teu primeiro escudo digital!",
      "🪪 Nunca partilhes os teus dados pessoais com desconhecidos!",
      "🦘 USA OS TRAMPOLINS! Os vãos são intransponíveis sem eles!",
      "🦠 Um antivírus atualizado protege-te dos vírus informáticos!",
      "🎮 Respeita sempre a idade mínima recomendada (PEGI) dos jogos!",
      "👣 Tudo o que publicas deixa um rasto digital — pensa antes!",
      "📰 Nem tudo o que lês online é verdade — verifica a fonte!",
      "🎣 Nunca cliques em links suspeitos — pode ser phishing!",
      "💻 Mantém os teus dispositivos sempre atualizados!",
      "👨‍👩‍👧 Combina regras de ecrã com a tua família!",
      "📶 Evita fazer login em contas importantes em Wi-Fi público!",
      "💾 Faz sempre cópias de segurança dos teus trabalhos!",
      "🔥 CUIDADO COM A LAVA! Mantém-te nas plataformas — não caias!",
      "🛒 Desconfia de ofertas online boas demais para ser verdade!",
      "📢 Usa o botão de denúncia sempre que precisares de ajuda!",
      "🧑‍💻 A maioria das redes sociais exige, no mínimo, 13 anos!",
      "🏃 As plataformas MOVEM-SE! Observa o ritmo antes de saltar!",
      "🚫 Nunca aceites pedidos de amizade de desconhecidos online!",
      "⚖️ Os teus direitos e deveres existem também no mundo digital!"
    ];
    currentLevelTip = (TIPS[currentLevel] || TIPS[0]) + (currentLevel >= 6 ? " ⚠️ Cuidado!" : "");
    tipText.setText(currentLevelTip);
    ensureAudio(); SFX.door(); saveGame();
  }

  /*
   * spawnVilao — 3 padrões de comportamento:
   *   "mini"    → patrulha zona pequena (±120px), devagar, sem saltar (mais fácil, níveis 1-3)
   *   "patrol"  → patrulha horizontal normal (médio, níveis 1-8)
   *   "jumper"  → patrulha E salta frequentemente (difícil, níveis 7-10)
   * No modo Difícil (getDifficulty()) os 3 tipos continuam a aparecer tal
   * como no Fácil — em vez de trocarem todos para "jumper", ficam mais
   * rápidos e saltam mais (mini passa também a saltar) — ver
   * getVillainSpeedMult()/getVillainJumpIntervalMult() acima.
   */
  function spawnVilao(scene, x, y, vx, df, pattern="patrol") {
    const keyMap = { mini:"vilao_round", patrol:"vilao_spike", jumper:"vilao_bug" };
    const keys = ["vilao_round","vilao_spike","vilao_bug"];
    const key = keyMap[pattern] || keys[Math.floor(Math.random()*keys.length)];

    const v = malwareGroup.create(x, y, key);
    v.setCollideWorldBounds(true);
    v.setBounce(0);
    // Tamanho distinto por tipo: mini=pequeno, patrol=médio, jumper=grande
    if (pattern === "mini") {
      v.setDisplaySize(36, 36); v.body.setSize(34, 34, true);
    } else if (pattern === "jumper") {
      v.setDisplaySize(58, 58); v.body.setSize(54, 54, true);
    } else {
      v.setDisplaySize(48, 48); v.body.setSize(48, 48, true);
    }
    v.setDepth(2);
    v.setData("pattern", pattern);
    v.setData("originX", x);
    v.setData("originY", y);

    if (pattern === "mini") {
      // × getVillainSpeedMult(): antes só o patrol/jumper ficavam mais
      // rápidos no Difícil — o Trapalhão mantinha sempre a mesma
      // velocidade lenta, mesmo no Difícil.
      const miniSpeed = (60 + Math.random() * 40) * getVillainSpeedMult();
      v.setVelocityX(miniSpeed);
      v.setData("speed", miniSpeed);
      v.setData("dir", 1);
      v.setData("minLeft",  x - 120);
      v.setData("minRight", x + 120);
    } else if (pattern === "jumper") {
      const spd = Math.round(Math.abs(vx) * df * 0.60) || 120;
      v.setVelocityX(vx >= 0 ? spd : -spd);
      v.setData("speed", spd);
      v.setData("dir", vx >= 0 ? 1 : -1);
    } else {
      const spd = Math.round(Math.abs(vx) * df) || 120;
      v.setVelocityX(vx >= 0 ? spd : -spd);
      v.setData("speed", spd);
      v.setData("dir", vx >= 0 ? 1 : -1);
    }

    // Saltos periódicos — patrol e jumper sempre; no Difícil o Trapalhão
    // ("mini") passa também a saltar (pedido: os 3 tipos saltarem mais no
    // Difícil), continuando sem saltar no Fácil ("lento e previsível").
    // × getVillainJumpIntervalMult(): no Difícil o intervalo encolhe, ou
    // seja, salta-se com mais frequência.
    const jimMult = getVillainJumpIntervalMult();
    if (pattern === "patrol" || pattern === "jumper" || (pattern === "mini" && difficulty === "dificil")) {
      const jumpInterval = pattern === "jumper"
        ? (1400 + Math.random() * 700) * jimMult
        : pattern === "mini"
          ? (2600 + Math.random() * 1400) * jimMult
          : (2200 + Math.random() * 1400) * jimMult;

      const outerTimer = scene.time.addEvent({
        delay: 400 + Math.random() * 1000,
        callback: () => {
          const innerTimer = scene.time.addEvent({
            delay: jumpInterval, loop: true,
            callback: () => {
              if (!v.active || !v.body) return;
              if (!v.body.blocked.down) return;
              if (pattern === "jumper" && player) {
                // Salto inteligente: força proporcional à altura do jogador
                const dy = v.y - player.y; // positivo se jogador está acima
                const targetForce = dy > 30
                  ? -Math.min(780, Math.sqrt(2 * 1100 * (dy + 30)) + 60)
                  : -380;
                // Virar na direção do jogador ao saltar
                const dirX = player.x > v.x ? 1 : -1;
                const spd2 = v.getData("speed") || 150;
                v.setVelocityX(dirX * spd2);
                v.setVelocityY(targetForce);
              } else {
                v.setVelocityY(-420 - Math.random() * 80);
              }
            }
          });
          enemyTimers.push(innerTimer);
        }
      });
      enemyTimers.push(outerTimer);
    }

    // Timer anti-stuck: verifica posição real a cada 600ms
    let lastX = v.x;
    const stuckTimer = scene.time.addEvent({
      delay: 600, loop: true,
      callback: () => {
        if (!v.active || !v.body) return;
        const moved = Math.abs(v.x - lastX);
        if (moved < 4) {
          // Verdadeiramente parado — forçar velocidade na direção guardada
          const d = v.getData("dir") || 1;
          const s = v.getData("speed") || 120;
          v.setVelocityX(s * d);
        } else {
          // Atualizar dir com base no movimento real
          if (v.x > lastX) v.setData("dir", 1);
          else v.setData("dir", -1);
        }
        lastX = v.x;
      }
    });
    enemyTimers.push(stuckTimer);

    // Animações visuais
    if (pattern === "mini") {
      // Rotação lenta + pulsação suave — menos ameaçador
      scene.tweens.add({targets:v, angle:{from:-8,to:8},
        duration:1100+Math.random()*400, yoyo:true, repeat:-1, ease:"Sine.easeInOut"});
      scene.tweens.add({targets:v, scaleX:{from:0.92,to:1.08}, scaleY:{from:1.08,to:0.92},
        duration:900+Math.random()*300, yoyo:true, repeat:-1, ease:"Sine.easeInOut"});

    } else if (pattern === "patrol") {
      scene.tweens.add({targets:v, angle:{from:-6,to:6},
        duration:700+Math.random()*300, yoyo:true, repeat:-1, ease:"Sine.easeInOut"});
      scene.tweens.add({targets:v, scaleX:{from:1.0,to:1.15}, scaleY:{from:1.0,to:1.15},
        duration:500+Math.random()*200, yoyo:true, repeat:-1, ease:"Sine.easeInOut"});

    } else if (pattern === "jumper") {
      scene.tweens.add({targets:v, angle:{from:-12,to:12},
        duration:320+Math.random()*160, yoyo:true, repeat:-1, ease:"Sine.easeInOut"});
      scene.tweens.add({targets:v, scaleX:{from:0.95,to:1.20}, scaleY:{from:1.20,to:0.95},
        duration:380+Math.random()*120, yoyo:true, repeat:-1, ease:"Sine.easeInOut"});

    }
  }



  function updateHUD(L) {
    hudText.setText(`${L.name}  (${currentLevel+1}/${LEVELS.length})`);
    scoreText.setText(`🌟 Pontos: ${score}`);
    updateHearts();
    itemCountText.setText(`⭐ Itens: ${itemsCollected}/${itemsTotal}`);
    if(powerIndicator&&!powered) powerIndicator.setText("");
    if(playerNameHUD){
      playerNameHUD.textContent = playerName ? `⭐ ${playerName}` : "";
      playerNameHUD.style.display = playerName ? "block" : "none";
    }
    updateProgressBar(L);
  }

  function updateProgressBar(L) {
    if(!progressFill) return;
    progressFill.clear();
    const BAR_X=8,BAR_Y=110,BAR_W=230,BAR_H=10;
    const levelPct=currentLevel/LEVELS.length;
    const levelNextPct=(currentLevel+1)/LEVELS.length;
    progressFill.fillStyle(0x200040,0.55);
    progressFill.fillRoundedRect(BAR_X,BAR_Y,Math.max(4,Math.round(BAR_W*levelPct)),BAR_H,5);
    if(player&&L){
      const worldW=L.worldW||2600,doorX=L.doorX||worldW-200,spawnX=L.spawn?.x||120;
      const px=Math.max(spawnX,Math.min(player.x,doorX));
      const inLevelPct=(px-spawnX)/Math.max(1,doorX-spawnX);
      const segStart=BAR_X+Math.round(BAR_W*levelPct);
      const segEnd=BAR_X+Math.round(BAR_W*levelNextPct);
      const segW=segEnd-segStart;
      progressFill.fillStyle(0xff6b35,0.9);
      progressFill.fillRoundedRect(segStart,BAR_Y,Math.max(3,Math.round(segW*inLevelPct)),BAR_H,5);
      const markerX=segStart+Math.round(segW*inLevelPct);
      progressFill.fillStyle(0x200040,1); progressFill.fillCircle(markerX,BAR_Y+BAR_H/2,6);
      progressFill.fillStyle(0xffd700,1); progressFill.fillCircle(markerX,BAR_Y+BAR_H/2,3);
      progressFill.fillStyle(0xff6b35,1); progressFill.fillRect(segEnd-5,BAR_Y+1,8,BAR_H-2);
    }
  }

  function updateHearts(){
    if(!heartsGfx) return;
    heartsGfx.clear();
    const startX=14,y=56,size=12,gap=17;
    for(let i=0;i<MAX_LIVES;i++){
      const x=startX+i*gap, full=i<lives;
      const r=size*0.52;
      heartsGfx.fillStyle(full?0xe84d10:0xffc0a0,full?1:0.4);
      heartsGfx.fillCircle(x-r*0.55,y-r*0.18,r); heartsGfx.fillCircle(x+r*0.55,y-r*0.18,r);
      heartsGfx.fillTriangle(x-size,y-r*0.1,x+size,y-r*0.1,x,y+size*1.05);
      if(full){heartsGfx.fillStyle(0xffffff,0.3);heartsGfx.fillCircle(x-r*0.3,y-r*0.5,r*0.3);}
    }
  }

  // Anima a entrada do VanBerto's (fade-in + "pop" estica-encolhe) — chamada
  // só quando o jogo realmente arranca (ver showHistory), nunca enquanto o
  // cartão de transição ou o "Sabias que...?" ainda estão visíveis. Os pés
  // ficam sempre presos ao chão durante a animação (ver pinFeet), mesmo que
  // esta corra já com a física em andamento.
  function revealPlayerEntrance(scene) {
    if (!_pendingEntranceReveal) return;
    _pendingEntranceReveal = false;
    if (!player) return;
    // Reconfirmar o chão mesmo agora, antes de capturar groundY — segurança
    // extra: mesmo que algo tenha corrido entre o snapPlayerToGround() lá
    // de trás (em loadLevel) e este momento (ex.: uma pausa mais longa do
    // que o costume, ou física retomada por outro caminho entretanto), a
    // posição usada para toda a animação de entrada fica sempre validada
    // de fresco, e não a assumir que o valor antigo ainda está correto.
    snapPlayerToGround();
    const groundY = player.y;
    const finalH  = player.displayHeight;
    const pinFeet = () => { player.y = groundY - (player.displayHeight - finalH) / 2; };
    const onComplete = () => {
      pinFeet();
      if (sceneRef && !sceneRef.physics.world.isPaused) player.setVelocityY(-160);
    };
    if (player.getData("usingPng")) {
      scene.tweens.add({
        targets: player,
        alpha: { from: 0, to: 1 },
        displayWidth:  { from: 72*0.6, to: 72 },
        displayHeight: { from: 72*1.3, to: 72 },
        duration: 320, ease: "Back.easeOut",
        onUpdate: pinFeet,
        onComplete
      });
    } else {
      scene.tweens.add({
        targets: player,
        alpha: { from: 0, to: 1 },
        scaleX: { from: 0.6, to: 1 },
        scaleY: { from: 1.3, to: 1 },
        duration: 320, ease: "Back.easeOut",
        onUpdate: pinFeet,
        onComplete
      });
    }
  }

  // ===== Agachar — hitbox e reposição =====
  // Ajusta o corpo físico (não só o visual) quando o estado de agachado muda,
  // seguindo o mesmo padrão de valores fixos que snapPlayerToGround() já usa
  // — os pés ficam sempre no mesmo sítio, só a altura do corpo encolhe.
  function setCrouchHitbox(playerObj, crouching){
    if (!playerObj || !playerObj.body) return;
    if (playerObj.getData("usingPng")) {
      if (crouching) { playerObj.body.setSize(44,28); playerObj.body.setOffset(14,38); }
      else            { playerObj.body.setSize(44,52); playerObj.body.setOffset(14,14); }
    } else {
      if (crouching) { playerObj.body.setSize(44,24); playerObj.body.setOffset(26,70); }
      else            { playerObj.body.setSize(44,48); playerObj.body.setOffset(26,46); }
    }
  }
  // Força a saída do estado agachado (chamado sempre que o jogo pausa a física
  // por outras razões — quiz, porta, transição — para nunca ficar "preso"
  // visualmente encolhido nem com a hitbox pequena por engano).
  function exitCrouch(){
    if (!isCrouching) return;
    isCrouching = false;
    if (player) { setCrouchHitbox(player, false); player.setScale(1); }
  }

  // Canos à Mario (pedido: "atalhos ou áreas secretas") ──────────────────
  // tryEnterPipe: vê se o jogador está mesmo em cima de algum cano deste
  // nível (só compara X — já sabemos que está no chão e a carregar em
  // baixo, ver o chamador no update()) e, se estiver, arranca a animação.
  // Tolerância do "estás mesmo em cima do cano" — meia largura do cano MAIS
  // meia largura do corpo do VanBerto's (44px de corpo → 20px de margem),
  // para bastar estar em qualquer parte de cima do cano (não só bem ao
  // centro) e carregar em baixo para entrar logo. player.body.blocked.down
  // já garante que está mesmo apoiado nalguma coisa; isto só confirma que
  // essa "coisa" é este cano.
  function tryEnterPipe(scene){
    if (inSecretRoom) {
      const rp = secretRoomTemp.pipe;
      if (rp && Math.abs(player.x - rp.x) <= (rp.w/2 + 20)) exitSecretRoomFlow(scene);
      return;
    }
    // Corrigido: antes usava-se o 1º cano dentro da tolerância (.find),
    // mas pares de cano "atalho" ficam tipicamente muito perto um do outro
    // no eixo X (ex.: chão em x:570, topo em x:620 — só 50px de distância),
    // menos do que a tolerância combinada dos dois (52px cada lado), por
    // isso as duas zonas de deteção sobrepunham-se. Estando em cima do
    // cano de CIMA, o jogo continuava a "encontrar" primeiro o cano de
    // BAIXO (que aparece primeiro no array) e reenviava o jogador para o
    // mesmo sítio onde já estava — parecia que o caminho de volta
    // simplesmente não funcionava. Agora escolhe-se sempre o cano
    // FISICAMENTE mais próximo (menor distância em X), não o primeiro.
    let p = null, bestDist = Infinity;
    pipes.forEach(pp => {
      const d = Math.abs(player.x - pp.x);
      if (d <= (pp.w/2 + 20) && d < bestDist) { bestDist = d; p = pp; }
    });
    if (!p) return;
    if (p.room) enterSecretRoomFlow(scene, p);
    else enterPipe(scene, p);
  }
  // enterPipe: animação de teletransporte RÁPIDA (pedido: "0,4s"), o
  // VanBerto's encolhe para dentro do cano, "salta" para o destino (toX/toY)
  // já lá dentro (a câmara acompanha sem fazer pan pelo nível todo) e volta
  // a crescer do lado de lá, com um pequeno impulso a reaparecer. Fica
  // invulnerável desde o 1º instante (mesmo ainda a entrar) até um pouco
  // depois de reaparecer, para nunca poder ser atingido a meio da viagem
  // nem mesmo aterrar em cima de um vilão.
  // Usa body.moves=false enquanto dura para a física não interferir a
  // meio (gravidade, colisões) — ver o guard "!_pipeWarping" no update()
  // para as outras partes do código (escala, esquerda/direita) que também
  // dão prioridade a esta animação enquanto ela corre.
  const TUNNEL_WARP_MS = 200; // 200ms a entrar + 200ms a sair = 0,4s no total
  function enterPipe(scene, p){
    if (_pipeWarping || !player?.body) return;
    _pipeWarping = true;
    _suppressCrouchUntilRelease = true;
    exitCrouch();
    ensureAudio(); beep({ freq: 480, dur: 0.09, type: "square", vol: 0.05, slideTo: 220 });
    player.body.moves = false;
    // Invulnerável já a partir do instante em que entra — cobre toda a
    // viagem (0,4s) mais uma pequena margem extra ao sair.
    setInvuln(scene, TUNNEL_WARP_MS*2 + 500);
    const startScaleX = player.scaleX, startScaleY = player.scaleY;
    // Calcular JÁ AQUI (antes de qualquer animação) a posição Y final e
    // correta de aterragem — em cima do cano de destino, se existir um
    // fisicamente nas coordenadas toX/toY. Antes, isto só era calculado
    // DEPOIS da animação terminar, o que fazia o VanBerto's "cair" até ao
    // centro do cano (toY) e só depois saltar de repente para a posição
    // certa no topo — visualmente parecia que ia cair e só depois é que
    // "apanhava-se". Calculando já aqui, a animação de saída vai logo
    // diretamente para o sítio certo, sem nenhum salto no fim.
    const destPipe = platforms.getChildren().find(pl =>
      pl.texture && pl.texture.key === "pipe_mario"
      && Math.abs(pl.x - p.toX) < 4 && Math.abs(pl.y - p.toY) < 4
    );
    const landingY = (destPipe && destPipe.body)
      ? (destPipe.body.top - 1 - player.body.halfHeight)
      : p.toY;
    scene.tweens.add({
      targets: player, y: player.y + 20, scaleY: startScaleY*0.12, scaleX: startScaleX*1.15, alpha: 0.35,
      duration: TUNNEL_WARP_MS, ease: "Quad.easeIn",
      onComplete: () => {
        player.x = p.toX; player.y = landingY - 18;
        scene.cameras.main.startFollow(player, true, 1.0, 1.0);
        scene.time.delayedCall(40, () => scene.cameras.main.startFollow(player, true, 0.08, 0.08));
        ensureAudio(); beep({ freq: 220, dur: 0.09, type: "square", vol: 0.05, slideTo: 480 });
        scene.tweens.add({
          targets: player, y: landingY, scaleY: startScaleY, scaleX: startScaleX, alpha: 1,
          duration: TUNNEL_WARP_MS, ease: "Back.easeOut",
          onComplete: () => {
            player.body.moves = true;
            player.body.updateFromGameObject();
            // Rede de segurança: só se não havia mesmo nenhum cano físico
            // em (toX,toY) — não devia acontecer — é que caímos no snap
            // genérico da plataforma mais próxima.
            if (!destPipe || !destPipe.body) snapToPipeLanding();
            // Pequeno impulso horizontal ao reaparecer — "sai" ligeiramente
            // do túnel em vez de simplesmente reaparecer parado. Sem impulso
            // vertical: isso fazia o VanBerto's subir no ar e cair de volta
            // logo a seguir, o que parecia visualmente "vou cair ao chão"
            // mesmo ficando na mesma plataforma.
            if (player.body) {
              player.body.setVelocityX((player.flipX ? -1 : 1) * 90);
            }
            _pipeWarping = false;
          }
        });
      }
    });
  }

  // ===== Esconder/repor o nível principal (sem destruir nada) =====
  function hideMainLevelForRoom() {
    secretRoomHidden = [];
    const collect = (o) => { if (o && o.active !== false) secretRoomHidden.push(o); };
    platforms.getChildren().forEach(collect);
    itemsGroup.getChildren().forEach(collect);
    malwareGroup.getChildren().forEach(collect);
    if (door) collect(door);
    movingPlatforms.forEach(mp => { collect(mp.sprite); collect(mp.gfx); });
    trampolines.forEach(t => collect(t.gfx));
    critters.forEach(c => collect(c.sprite));
    balloons.forEach(b => { collect(b.sprite); collect(b.gfx); });
    if (currentSign) { collect(currentSign.obj); collect(currentSign.badge); }
    secretRoomHidden.forEach(o => {
      o.visible = false;
      if (o.body) o.body.enable = false;
    });
  }
  function showMainLevelAfterRoom() {
    secretRoomHidden.forEach(o => {
      if (o.active === false) return; // segurança — nada devia ter sido destruído enquanto escondido
      o.visible = true;
      if (o.body) o.body.enable = true;
    });
    secretRoomHidden = [];
  }

  // ===== Conteúdo efémero da sala secreta (chão + prémio + cano de volta) =====
  // roomKey identifica este cano de sala secreta (ver "key" criado em
  // loadLevel) — usado para saber se a recompensa já foi apanhada nesta
  // vida/nível (pedido: "se já apanhei a recompensa não deve mais lá estar,
  // só se perder a vida"). Se já foi apanhada, a sala fica sem o item.
  function buildSecretRoomContents(scene, kind, roomKey, fact) {
    destroySecretRoomContents();
    const alreadyCollected = !!(roomKey && collectedRoomPipes.has(roomKey));
    secretRoomTemp.key = roomKey || null;
    const platKey = "platform_t"+ROOM_THEME_IDX;
    if(!scene.textures.exists(platKey)) makePlatformTextureThemed(scene, platKey, ROOM_THEME_IDX);
    const ledge = platforms.create(ROOM_LEDGE.x, ROOM_LEDGE.y, platKey);
    ledge.displayWidth = ROOM_LEDGE.w; ledge.displayHeight = ROOM_LEDGE.h; ledge.refreshBody();
    if (ledge.body) { ledge.body.checkCollision.left=false; ledge.body.checkCollision.right=false; }
    secretRoomTemp.ledge = ledge;

    if(!scene.textures.exists("pipe_mario")) makePipeTexture(scene);
    const pipeSpr = platforms.create(ROOM_PIPE_XY.x, ROOM_PIPE_XY.y, "pipe_mario");
    pipeSpr.displayWidth = ROOM_PIPE_XY.w; pipeSpr.displayHeight = ROOM_PIPE_XY.h; pipeSpr.refreshBody();
    secretRoomTemp.pipe = { x:ROOM_PIPE_XY.x, y:ROOM_PIPE_XY.y, w:ROOM_PIPE_XY.w, sprite:pipeSpr };

    // Emoji do rótulo varia consoante a recompensa — pequeno toque de
    // variedade entre salas sem mexer no tema roxo fixo (que se mantém de
    // propósito, para se reconhecer logo "sala secreta" em qualquer nível).
    const kindEmoji = { estrela:"⭐", balao:"🔑", brinquedo:"🔐", medalha:"🏅",
      heart:"❤️", duplosalto:"🦘", balaofesta:"🔒" };

    if (!alreadyCollected) {
      const keyMap={ estrela:"item_estrela", balao:"item_chave", brinquedo:"item_chip",
        medalha:"item_medalha", heart:"item_heart", duplosalto:"item_duplosalto", balaofesta:"item_cadeado_2" };
      const item = itemsGroup.create(ROOM_ITEM_XY.x, ROOM_ITEM_XY.y, keyMap[kind]||"item_estrela");
      item.setDepth(2);
      item.setData("kind", kind);
      scene.tweens.add({ targets:item, y:item.y-8, duration:940, yoyo:true, repeat:-1, ease:"Sine.easeInOut" });
      secretRoomTemp.item = item;

      // "Ta-da" — só na 1ª vez que se descobre esta sala (pedido: reforçar
      // a sensação de "descobri algo"). Flash roxo (a condizer com o tema
      // ROOM_THEME_IDX) + jingle mágico distinto do "coin()" normal de
      // apanhar um item — ver SFX.secretRoom() em audio.js.
      const flash = scene.add.graphics().setDepth(200).setScrollFactor(0);
      flash.fillStyle(0xb080ff, 0.5);
      flash.fillRect(0, 0, 960, 540);
      scene.tweens.add({ targets:flash, alpha:0, duration:500, onComplete:()=>flash.destroy() });
      ensureAudio(); SFX.secretRoom();
    }

    // Sparkles + rótulo — reforço visual por cima do fundo já próprio (ROOM_THEME_IDX).
    const decor = [];
    for (let i=0;i<6;i++){
      const sx = 140+Math.random()*720, sy = 90+Math.random()*260;
      const star = scene.add.text(sx, sy, "✨", { fontSize:(10+Math.random()*8)+"px" }).setOrigin(0.5).setAlpha(0.5).setDepth(1);
      scene.tweens.add({ targets:star, alpha:{from:0.2,to:0.65}, duration:900+Math.random()*800, yoyo:true, repeat:-1, ease:"Sine.easeInOut" });
      decor.push(star);
    }
    const label = scene.add.text(ROOM_ITEM_XY.x, ROOM_ITEM_XY.y-70,
      alreadyCollected ? "✅ Recompensa já recolhida" : `${kindEmoji[kind]||"🎁"} Sala Secreta`, {
      fontSize:"20px", fontStyle:"900", color:"#ffe9a8", stroke:"#2a0a4a", strokeThickness:5, padding:{x:8,y:6}
    }).setOrigin(0.5).setDepth(1);
    scene.tweens.add({ targets:label, y:label.y-6, duration:1300, yoyo:true, repeat:-1, ease:"Sine.easeInOut" });
    decor.push(label);
    secretRoomTemp.decor = decor;

    // Curiosidade da sala (pedido: "cada cano leva a uma sala com uma
    // curiosidade... e ganhar coisas") — mesmo letreiro reaproveitado dos
    // NPCs/boss (aproxima-te para ler), posicionado à esquerda da
    // recompensa para não se sobrepor. Fica visível mesmo depois de já ter
    // sido recolhida a recompensa (a curiosidade é sempre boa de reler).
    if (fact) spawnSecretSign(scene, 390, 420, "💡", fact);
  }
  function destroySecretRoomContents() {
    if (secretRoomTemp.ledge) { try{secretRoomTemp.ledge.destroy();}catch{} }
    if (secretRoomTemp.pipe && secretRoomTemp.pipe.sprite) { try{secretRoomTemp.pipe.sprite.destroy();}catch{} }
    if (secretRoomTemp.item && secretRoomTemp.item.active) { try{secretRoomTemp.item.destroy();}catch{} }
    (secretRoomTemp.decor||[]).forEach(o=>{ try{o.destroy();}catch{} });
    clearSecretSigns(); // limpa a curiosidade da sala (se houver) — ver spawnSecretSign em buildSecretRoomContents
    secretRoomTemp = { ledge:null, pipe:null, item:null, decor:[], key:null };
  }

  // ===== Entrar / sair da sala secreta — mesma animação de 0,4s do cano
  // normal (encolher/crescer), só que a meio troca-se o nível principal
  // inteiro pela sala isolada (ou vice-versa), tal como startBossFight()
  // já faz para os combates de boss.
  function enterSecretRoomFlow(scene, p) {
    if (_pipeWarping || !player?.body) return;
    _pipeWarping = true;
    _suppressCrouchUntilRelease = true;
    exitCrouch();
    ensureAudio(); beep({ freq: 480, dur: 0.09, type: "square", vol: 0.05, slideTo: 220 });
    player.body.moves = false;
    setInvuln(scene, TUNNEL_WARP_MS*2 + 500);
    const startScaleX = player.scaleX, startScaleY = player.scaleY;
    scene.tweens.add({
      targets: player, y: player.y + 20, scaleY: startScaleY*0.12, scaleX: startScaleX*1.15, alpha: 0.35,
      duration: TUNNEL_WARP_MS, ease: "Quad.easeIn",
      onComplete: () => {
        inSecretRoom = true;
        secretRoomReturn = { x: p.returnX, y: p.returnY };
        hideMainLevelForRoom();
        scene.physics.world.setBounds(0,0,ROOM_WORLD_W,514);
        scene.cameras.main.setBounds(0,0,ROOM_WORLD_W,540);
        applyBackground(scene, ROOM_THEME_IDX, ROOM_WORLD_W, [], "bg_sala_secreta");
        buildSecretRoomContents(scene, p.kind, p.key, p.fact);

        player.x = 420; player.y = ROOM_LANDING_Y - 18;
        scene.cameras.main.startFollow(player, true, 1.0, 1.0);
        scene.time.delayedCall(40, () => scene.cameras.main.startFollow(player, true, 0.08, 0.08));
        ensureAudio(); beep({ freq: 220, dur: 0.09, type: "square", vol: 0.05, slideTo: 480 });
        scene.tweens.add({
          targets: player, y: ROOM_LANDING_Y, scaleY: startScaleY, scaleX: startScaleX, alpha: 1,
          duration: TUNNEL_WARP_MS, ease: "Back.easeOut",
          onComplete: () => {
            player.body.moves = true;
            player.body.updateFromGameObject();
            snapToPipeLanding();
            // Sem impulso vertical (ver enterPipe) — evita o "sobe e cai de
            // volta" que parecia uma queda ao chegar à sala secreta.
            if (player.body) { player.body.setVelocityX((player.flipX?-1:1)*90); }
            _pipeWarping = false;
          }
        });
      }
    });
  }
  function exitSecretRoomFlow(scene) {
    if (_pipeWarping || !player?.body) return;
    _pipeWarping = true;
    _suppressCrouchUntilRelease = true;
    exitCrouch();
    ensureAudio(); beep({ freq: 480, dur: 0.09, type: "square", vol: 0.05, slideTo: 220 });
    player.body.moves = false;
    setInvuln(scene, TUNNEL_WARP_MS*2 + 500);
    const startScaleX = player.scaleX, startScaleY = player.scaleY;
    const ret = secretRoomReturn || { x: player.x, y: player.y };
    // Calcular já aqui a posição Y final correta (ver comentário equivalente
    // em enterPipe()) — evita o "cai até ao centro do cano e só depois
    // salta para a posição certa" no fim da animação.
    const destPipe = platforms.getChildren().find(pl =>
      pl.texture && pl.texture.key === "pipe_mario"
      && Math.abs(pl.x - ret.x) < 4 && Math.abs(pl.y - ret.y) < 4
    );
    const landingY = (destPipe && destPipe.body)
      ? (destPipe.body.top - 1 - player.body.halfHeight)
      : ret.y;
    scene.tweens.add({
      targets: player, y: player.y + 20, scaleY: startScaleY*0.12, scaleX: startScaleX*1.15, alpha: 0.35,
      duration: TUNNEL_WARP_MS, ease: "Quad.easeIn",
      onComplete: () => {
        destroySecretRoomContents();
        const L = LEVELS[currentLevel];
        scene.physics.world.setBounds(0,0,L.worldW,514);
        scene.cameras.main.setBounds(0,0,L.worldW,540);
        applyBackground(scene, L.theme%THEMES.length, L.worldW, L.hazards||[], bgKeyForLevel(currentLevel));
        showMainLevelAfterRoom();
        inSecretRoom = false;
        secretRoomReturn = null;

        player.x = ret.x; player.y = landingY - 18;
        scene.cameras.main.startFollow(player, true, 1.0, 1.0);
        scene.time.delayedCall(40, () => scene.cameras.main.startFollow(player, true, 0.08, 0.08));
        ensureAudio(); beep({ freq: 220, dur: 0.09, type: "square", vol: 0.05, slideTo: 480 });
        scene.tweens.add({
          targets: player, y: landingY, scaleY: startScaleY, scaleX: startScaleX, alpha: 1,
          duration: TUNNEL_WARP_MS, ease: "Back.easeOut",
          onComplete: () => {
            player.body.moves = true;
            player.body.updateFromGameObject();
            // Rede de segurança: só se não havia mesmo nenhum cano físico
            // nas coordenadas de regresso é que caímos no snap genérico.
            if (!destPipe || !destPipe.body) snapToPipeLanding();
            // Sem impulso vertical (ver enterPipe) — evita o "sobe e cai de
            // volta" que parecia uma queda ao voltar ao nível principal.
            if (player.body) { player.body.setVelocityX((player.flipX?-1:1)*90); }
            _pipeWarping = false;
          }
        });
      }
    });
  }

  function snapPlayerToGround(){
    if(!player?.body||!platforms) return;
    // Nota: NÃO usar updateFromGameObject() aqui — esta função corre 80ms
    // depois do início do nível, ENQUANTO o "pop" de entrada ainda está a
    // meio (o VanBerto's começa achatado/pequeno e só depois anima até ao
    // tamanho normal). updateFromGameObject() copiava esse tamanho
    // temporário e distorcido para o corpo físico, o que desalinhava o
    // cálculo do chão e fazia o VanBerto's aparecer meio enterrado no
    // passeio/relva assim que o nível arrancava. Repor sempre o hitbox
    // definido em create() garante que o alinhamento ao chão usa o
    // tamanho real do personagem, independentemente da animação em curso.
    if(player.getData("usingPng")){
      player.body.setSize(44,52);
      player.body.setOffset((72-44)/2,(72-52)/2+4);
    } else {
      player.body.setSize(44,48);
      player.body.setOffset(26,46);
    }
    const pb=player.body; let best=null,bestTop=Infinity;
    platforms.getChildren().forEach(p=>{
      if(!p.body) return;
      if(pb.right>p.body.left&&pb.left<p.body.right){
        const top=p.body.top;
        if(top>=pb.bottom-2&&top<bestTop){bestTop=top;best=p;}
      }
    });
    if(best){const dy=pb.bottom-(best.body.top-1);player.setVelocity(0,0);player.y-=dy;player.body.updateFromGameObject();}
  }

  // Pouso ao sair de um cano/sala secreta — mais tolerante que
  // snapPlayerToGround() (que só aceita ~2px de folga, pensado para o
  // arranque do nível). Coordenadas de regresso (returnY/toY) tunadas
  // manualmente podem, nalguns casos, deixar o VanBerto's a aterrar já um
  // pouco "dentro" da plataforma — e nesse caso a física empurra-o para
  // baixo (o caminho de separação mais curto) em vez de para cima, fazendo-o
  // cair direto ao chão em vez de ficar na plataforma. Isto procura a
  // plataforma mais próxima que o jogador sobrepõe horizontalmente, seja
  // qual for a distância vertical inicial (dentro de um alcance generoso),
  // e assenta-o exatamente em cima dela.
  function snapToPipeLanding(maxDist=90){
    if(!player?.body||!platforms) return;
    const pb=player.body; let best=null,bestDist=Infinity;
    platforms.getChildren().forEach(p=>{
      if(!p.body||!p.active) return;
      if(pb.right>p.body.left && pb.left<p.body.right){
        const dist=Math.abs(pb.bottom-p.body.top);
        if(dist<maxDist && dist<bestDist){bestDist=dist;best=p;}
      }
    });
    if(best){
      const dy=pb.bottom-(best.body.top-1);
      player.y-=dy;
      player.body.updateFromGameObject();
    }
  }

  // ===== Porta + Quiz =====
  function tryOpenDoor(scene){
    if(awaitingQuiz) return;
    awaitingQuiz=true;
    // Parar melodia da estrela ao chegar à porta
    if(_starMelodyInterval){ clearInterval(_starMelodyInterval); _starMelodyInterval=null; }
    // Cancelar TODOS os timers/tweens que possam alterar alpha/scale do player
    if(scene && scene.tweens) scene.tweens.killTweensOf(player);
    if(invulnBlinkEvent){ invulnBlinkEvent.remove(false); invulnBlinkEvent=null; }
    if(invulnEndEvent){   invulnEndEvent.remove(false);   invulnEndEvent=null; }
    if(starPowerTimer){   starPowerTimer.remove(false);   starPowerTimer=null; }
    if(starPowerCountdown){ starPowerCountdown.remove(false); starPowerCountdown=null; }
    if(poweredTimer){     poweredTimer.remove(false);     poweredTimer=null; }
    if(powerCountdown){   powerCountdown.remove(false);   powerCountdown=null; }
    if(doubleJumpTimer){  doubleJumpTimer.remove(false);  doubleJumpTimer=null; }
    if(doubleJumpCountdown){ doubleJumpCountdown.remove(false); doubleJumpCountdown=null; }
    invuln=false; starPower=false; powered=false; doubleJumpActive=false;
    player.setAlpha(1); player.setScale(1); player.clearTint();
    // Remover overlap da porta imediatamente — antes de qualquer resume() da física
    if(doorOverlap){ try{ scene.physics.world.removeCollider(doorOverlap); }catch{} doorOverlap=null; }
    // Esconder halo e sombra imediatamente — não redesenhar durante animação
    if(powerHaloGfx) { powerHaloGfx.clear(); powerHaloGfx.setVisible(false); }
    if(shadowGfx)    { shadowGfx.clear();    shadowGfx.setVisible(false); }
    player.setVelocityX(0);
    player.setFlipX(false);
    touch.left=touch.right=touch.jump=touch.crouch=false;
    const doorOrigX = door.x;
    // Garantir que a física está ativa para o body.blocked atualizar corretamente
    scene.physics.resume();
    let waited = 0;
    let _animStarted = false; // guarda — impede startDoorAnimation de ser chamado duas vezes
    if(_landingCheckTimer){ try{_landingCheckTimer.remove(false);}catch{} _landingCheckTimer=null; }
    _landingCheckTimer = scene.time.addEvent({
      delay: 16, loop: true,
      callback: () => {
        if(_animStarted) return;
        waited += 16;
        const onGround = player.body && player.body.blocked.down;
        // No móvel o body.blocked pode não atualizar — forçar após 200ms
        if (onGround || waited >= 200) {
          _animStarted = true;
          if(_landingCheckTimer){ try{_landingCheckTimer.remove(false);}catch{} _landingCheckTimer=null; }
          player.setVelocity(0, 0);
          snapPlayerToGround();
          scene.physics.pause();
          ensureAudio(); SFX.doorOpen();
          startDoorAnimation(scene, doorOrigX);
        }
      }
    });
    // Timeout de segurança: se ao fim de 7s o quiz ainda não apareceu, desbloquear
    // (antes eram 4s — a dança do robô antes do portal sugar acrescenta ~800ms à
    // sequência normal, e 4s ficava demasiado apertado, disparando o watchdog a
    // meio da animação e cortando a transição de nível)
    // Guarda snapshot do nível para evitar disparo no nível seguinte
    _levelAtDoorTrigger = currentLevel;
    if(_doorWatchdogTimer){ try{_doorWatchdogTimer.remove(false);}catch{} _doorWatchdogTimer=null; }
    _doorWatchdogTimer = scene.time.delayedCall(7000, () => {
      _doorWatchdogTimer = null;
      if (!awaitingQuiz) return; // já resolveu normalmente
      if (currentLevel !== _levelAtDoorTrigger) return; // já avançou de nível
      if (awaitingStory) return; // história ainda visível — não interferir
      const quizVisible = !quizOverlay.classList.contains("hidden");
      if (!quizVisible) {
        // Quiz não apareceu — desbloquear o jogo
        awaitingQuiz = false;
        _doorAnimRunning = false;
        if(powerHaloGfx) powerHaloGfx.setVisible(true);
        if(shadowGfx)    shadowGfx.setVisible(true);
        scene.physics.resume();
        // Recriar o overlap da porta para nova tentativa
        if(doorOverlap) { try{ scene.physics.world.removeCollider(doorOverlap); }catch{} doorOverlap=null; }
        let _retryTriggered=false;
        doorOverlap = scene.physics.add.overlap(player, door, () => {
          if(awaitingQuiz||_retryTriggered||invuln) return;
          if(Math.abs(player.x - door.x) > 120) return; // segurança extra: só activa perto da porta
          _retryTriggered=true;
          try{ scene.physics.world.removeCollider(doorOverlap); doorOverlap=null; }catch{}
          tryOpenDoor(scene);
        }, null, scene);
      }
    });
  }

  // Extraído de startDoorAnimation para poder ser chamado tanto no fim normal
  // da animação da porta, como num "fallback" de segurança se a animação
  // falhar a meio (ver bug "trava no boss 3" — mesma família de problema
  // pode acontecer na porta normal se `door` deixar de ser válida a meio).
  function showQuizAfterDoorAnimation(scene){
    scene.time.delayedCall(560, () => {
      if(!awaitingQuiz) return; // segurança: só mostrar se ainda estamos à espera
      _doorAnimRunning = false; // reset para próxima porta
      lastQuizTheme = LEVELS[currentLevel].quizTheme;
      showQuiz(pickQuizForLevel(currentLevel, LEVELS[currentLevel].quizTheme), (ok) => {
        if(ok){
          ensureAudio();
          finalizeLevelStars(currentLevel, livesLostThisLevel, itemsCollected, itemsTotal);
          markLevelCompleted(currentLevel);
          // Reavaliar conquistas AGORA, com a contagem de níveis já atualizada
          // (a chamada dentro de showQuiz() corre antes de markLevelCompleted,
          // por isso "Guardião", "Mestre" e "Lenda" nunca desbloqueavam — bug corrigido).
          checkAchievements(mapProgress.levelsCompleted.length);
          // Celebração (título + estrelas a aparecer + VanBerto's +
          // confetti) antes da revelação do artefacto de sempre — em
          // TODOS os níveis, incluindo o último: se houver boss a
          // seguir (ex.: o do Mundo 4, agora preso ao Nível 20),
          // nextLevel() trata de o lutar antes do ecrã de vitória
          // final aparecer (ver goToNextLevel).
          showLevelCompleteCelebration(currentLevel, () => {
            showRightRecovered(currentLevel);
            nextLevel(scene);
          });
        }
      });
    });
  }

  let _doorAnimRunning = false;
  function startDoorAnimation(scene, doorOrigX){
    // Impedir execução dupla — só pode correr uma vez por abertura de porta
    if(_doorAnimRunning) return;
    _doorAnimRunning = true;
    door.setOrigin(0.5, 0.5);
    door.x = doorOrigX;

    // FASE 1 — portal pulsa para indicar que está a ativar
    scene.tweens.add({
      targets: door,
      scaleX: { from: 1, to: 1.18 },
      scaleY: { from: 1, to: 1.18 },
      duration: 120, yoyo: true, repeat: 3,
      ease: "Sine.easeInOut",
      onComplete: () => {
        door.x = doorOrigX;
        door.setScale(1);

        // Brilho dourado no chão à frente do portal
        const glow = scene.add.graphics().setDepth(10);
        glow.fillStyle(0xffd700, 0.7);
        glow.fillEllipse(doorOrigX, door.y + 36, 90, 20);
        scene.tweens.add({ targets: glow, alpha: { from: 0.7, to: 0 }, duration: 600,
          onComplete: () => glow.destroy() });

        // Burst de partículas ao ativar o portal
        const portalBurst = scene.add.particles(0, 0, "spark_item", {
          x: doorOrigX, y: door.y - 20,
          speed: { min: 60, max: 200 }, lifespan: 500, quantity: 22,
          scale: { start: 1.1, end: 0 }, gravityY: 60,
          angle: { min: 0, max: 360 },
          tint: [0xffd700, 0xa060ff, 0x80d0ff, 0xff6b35, 0xffffff]
        });
        scene.time.delayedCall(400, () => portalBurst.destroy());

        // FASE 1.5 — o VanBerto's faz a dança do robô antes de ser sugado
        playVanBertoDance(scene, () => {
          try {
            if (!door || !door.active) { showQuizAfterDoorAnimation(scene); return; }

            // FASE 2 — portal gira e cresce (ativação)
            scene.tweens.add({
              targets: door,
              angle: { from: 0, to: 360 },
              scaleX: { from: 1, to: 1.3 },
              scaleY: { from: 1, to: 1.3 },
              duration: 400, ease: "Back.easeIn",
              onComplete: () => {
                try {
                  if (!player || !player.active || !door) { showQuizAfterDoorAnimation(scene); return; }

                  // FASE 3 — robot voa para o portal (spin + encolhe)
                  player.setDepth(2);
                  player.setFlipX(false);

                  // Pequenas partículas do portal ao absorver
                  const burst = scene.add.particles(0, 0, "spark_item", {
                    x: doorOrigX, y: door.y - 10,
                    speed: { min: 30, max: 120 },
                    lifespan: 400, quantity: 14,
                    scale: { start: 0.8, end: 0 },
                    gravityY: -40,
                    angle: { min: 0, max: 360 },
                    tint: [0xffd700, 0xa060ff, 0xffffff, 0x80d0ff]
                  });
                  scene.time.delayedCall(320, () => burst.destroy());

                  // Robot desloca-se até ao portal enquanto gira
                  scene.tweens.add({
                    targets: player,
                    x: doorOrigX,
                    y: door.y - 18,
                    duration: 280, ease: "Sine.easeIn",
                    onComplete: () => {
                      try {
                        if (!player || !player.active || !door) { showQuizAfterDoorAnimation(scene); return; }

                        // FASE 4 — robot entra no portal: gira e desaparece no vórtice
                        scene.tweens.add({
                          targets: player,
                          scaleX: { from: player.scaleX, to: 0.05 },
                          scaleY: { from: player.scaleY, to: 0.05 },
                          angle:  { from: 0, to: 720 },
                          alpha: { from: 1, to: 0 },
                          duration: 280, ease: "Sine.easeIn",
                          onComplete: () => {
                            try {
                              // Robot está completamente dentro da porta
                              // Matar todos os tweens (invuln, star power, etc.) para nenhum restaurar o alpha
                              if(scene && scene.tweens) scene.tweens.killTweensOf(player);
                              if(invulnBlinkEvent){ invulnBlinkEvent.remove(false); invulnBlinkEvent=null; }
                              if(invulnEndEvent){   invulnEndEvent.remove(false);   invulnEndEvent=null; }
                              invuln = false;
                              player.setOrigin(0.5, 0.5);
                              player.setScale(1);
                              player.setAlpha(0); // manter invisível enquanto o quiz está aberto
                              player.setDepth(3);
                              // Esconder porta completamente durante o quiz
                              if (door) {
                                door.setOrigin(0.5, 0.5);
                                door.x = doorOrigX;
                                door.setScale(1);
                                door.setAlpha(0);
                              }

                              // Label "Responde!"
                              const label = scene.add.text(doorOrigX, door.y - 70, "✨ Responde! ✨", {
                                fontSize: "20px", fontStyle: "900",
                                color: "#ffd700", stroke: "#200040", strokeThickness: 5
                              }).setOrigin(0.5).setDepth(20).setAlpha(0);
                              scene.tweens.add({
                                targets: label, alpha: 1, y: door.y - 88,
                                duration: 240, ease: "Back.easeOut",
                                onComplete: () => scene.time.delayedCall(280, () => {
                                  scene.tweens.add({ targets: label, alpha: 0, duration: 160,
                                    onComplete: () => label.destroy() });
                                })
                              });

                              // FASE 5 — mostrar quiz
                              showQuizAfterDoorAnimation(scene);
                            } catch (e) { console.error("Fase 4 da porta falhou — a mostrar o quiz de qualquer forma:", e); showQuizAfterDoorAnimation(scene); }
                          }
                        });
                      } catch (e) { console.error("Fase 3 da porta falhou — a mostrar o quiz de qualquer forma:", e); showQuizAfterDoorAnimation(scene); }
                    }
                  });
                } catch (e) { console.error("Fase 2 da porta falhou — a mostrar o quiz de qualquer forma:", e); showQuizAfterDoorAnimation(scene); }
              }
            });
          } catch (e) {
            console.error("Animação da porta falhou a meio — a mostrar o quiz de qualquer forma:", e);
            showQuizAfterDoorAnimation(scene);
          }
        }); // fim playVanBertoDance (FASE 1.5)
      }
    });
  }

  // Frases motivacionais por nível — mostradas na transição de entrada

  function playLevelTransition(scene, nextIdx, onMidpoint, onComplete){
    const nextL = LEVELS[nextIdx];
    if(!nextL){ onMidpoint?.(); onComplete?.(); return; }

    const ov    = document.getElementById("levelTransitionOverlay");
    const panel = document.getElementById("levelTransitionPanel");
    const elNum    = document.getElementById("ltNum");
    const elTitle  = document.getElementById("ltTitle");
    const elPhrase = document.getElementById("ltPhrase");
    const elName   = document.getElementById("ltName");
    const elTap    = document.getElementById("ltTap");
    if(!ov){ onMidpoint?.(); onComplete?.(); return; }

    // Cor do céu do nível seguinte
    const T      = THEMES[nextL.theme] || THEMES[0];
    const topHex = T.skyTop;
    const botHex = T.skyBot;
    const topR=(topHex>>16)&0xff, topG=(topHex>>8)&0xff, topB=topHex&0xff;
    const botR=(botHex>>16)&0xff, botG=(botHex>>8)&0xff, botB=botHex&0xff;
    const midR=Math.round((topR+botR)/2), midG=Math.round((topG+botG)/2), midB=Math.round((topB+botB)/2);
    const brightness = 0.299*midR + 0.587*midG + 0.114*midB;
    const isDark = brightness < 110;

    const topCss = `rgb(${topR},${topG},${topB})`;
    const botCss = `rgb(${botR},${botG},${botB})`;
    const textCol  = isDark ? "#ffd700" : "#1a0040";
    const subCol   = isDark ? "#ffe0b0" : "#3a0868";
    const nameCol  = isDark ? "#fff5e0" : "#200050";
    const numCol   = isDark ? "rgba(255,215,0,0.80)" : "rgba(40,0,80,0.65)";
    const borderCol= isDark ? "rgba(255,215,0,0.35)" : "rgba(255,255,255,0.45)";

    // Aplicar estilos dinâmicos
    ov.style.background    = `linear-gradient(180deg, ${topCss} 0%, ${botCss} 100%)`;
    panel.style.borderColor = borderCol;
    panel.style.background  = isDark ? "rgba(0,0,0,0.40)" : "rgba(255,255,255,0.18)";

    elNum.style.color    = numCol;
    elNum.textContent    = `Nível ${nextIdx+1} / ${LEVELS.length}`;
    elTitle.style.color  = textCol;
    elTitle.textContent  = nextL.name.replace(/^Nível \d+\s*[—–-]\s*/, "");
    elPhrase.style.color = subCol;
      {
      elPhrase.textContent = LEVEL_ENTRY_PHRASES[nextIdx] || "Vai em frente! 🛡️";
    }
    elName.style.color   = nameCol;
    elName.textContent   = playerName ? `✨ Vai, ${playerName}! ✨` : "✨ Vai lá! ✨";
    // BUG CORRIGIDO: "toca para continuar" nunca tinha cor própria definida
    // — ficava sempre com a cor de texto padrão do browser (preto), que
    // desaparecia quase por completo sobre fundos escuros (a maioria dos
    // níveis). Agora segue a mesma cor clara/escura escolhida para o resto
    // do texto deste ecrã, consoante o fundo do nível seguinte.
    if (elTap) elTap.style.color = nameCol;

    // Mostrar overlay com fade-in CSS
    ov.style.opacity   = "0";
    ov.style.display   = "flex";
    ov.style.transition= "opacity 0.30s ease";
    ov.style.cursor    = "pointer";
    requestAnimationFrame(()=>{ ov.style.opacity = "1"; });

    let midpointDone = false;
    function runMidpoint() {
      if (midpointDone) return;
      midpointDone = true;
      clearTimeout(midTimer);
      onMidpoint?.();
    }
    const midTimer = setTimeout(runMidpoint, 350);

    let hidden = false;
    function hidePanel() {
      if (hidden) return;
      hidden = true;
      runMidpoint();
      ov.style.cursor = "";
      ov.removeEventListener("click", hidePanel);
      ov.removeEventListener("touchstart", hidePanel);
      ov.style.opacity = "0";
      setTimeout(()=>{ ov.style.display = "none"; onComplete?.(); }, 320);
    }

    // Manter visível 2 s; clique ou toque avança imediatamente
    const hideTimer = setTimeout(hidePanel, 2000);
    ov.addEventListener("click", hidePanel);
    ov.addEventListener("touchstart", hidePanel, { passive: true });

    ov._midTimer  = midTimer;
    ov._hideTimer = hideTimer;
  }

  // =====================================================================
  // ===== BOSSES TEMÁTICOS — Fase 3 (bloco 100% aditivo) =====
  // Não altera LEVELS nem currentLevel numbering. O boss acontece "entre"
  // dois níveis já existentes — currentLevel não avança durante o combate.
  // =====================================================================
  let inBossFight = false;
  let bossState = null; // { def, sprite, hp, phase, collected, onComplete, hitCooldownUntil }
  let bossOverlay = null; // rectangle usado pelo Guardião das Sombras
  let bossLockIcon = null; // 🔒/⭐ flutuante por cima do boss — lembrete visual permanente,
                           // sem depender de o jogador ler o texto do objetivo
  let bossRageIcon = null; // já não é criado em lado nenhum (ver bossEnterRage) — a variável e as
  let controlsInvertedUntil = 0; // usado pelo "livro mau" do Monstro da Ignorância
  let bossVignette = null; // moldura escura nos cantos — usada pela fase final de def.phases (ex.: "Preconceito")
  let bossArenaDecor = []; // elementos ambiente (emoji+tween) da arena temática — ver def.arena.decor

  // Cartão que desliza rapidamente do topo do ecrã e desaparece sozinho —
  // usado na chegada do boss ("⚠️ NOME DO BOSS") e na vitória ("✅ VITÓRIA!").
  // Não bloqueia nada (não precisa de toque) — é só um flourish visual rápido.
  function showBossBanner(scene, text, color = "#ffffff") {
    // x=480: centro real do ecrã, não 800. O jogo corre numa resolução fixa
    // de 960px (ver `width: 960` na config do Phaser) e este texto usa
    // setScrollFactor(0) — fica preso ao ecrã, não ao mundo, tal como o
    // transitionLabel (também centrado em x=480, ver mais acima). x=800
    // deixava o texto a começar perto do bordo direito, cortado para nomes
    // mais compridos (ex.: "⚠️ MONSTRO DA IGNORÂNCIA ⚠️" aparecia cortado
    // a meio) — não é um bug novo desta conversão, já acontecia antes, só
    // que agora este cartão também é usado no "✅ VITÓRIA!" dos 4 bosses.
    const label = scene.add.text(480, -40, text, {
      fontSize: "30px", fontStyle: "900", color, stroke: "#1a0025", strokeThickness: 7
    }).setOrigin(0.5).setDepth(50).setScrollFactor(0).setAlpha(0);
    scene.tweens.add({
      targets: label, y: 54, alpha: 1, duration: 380, ease: "Back.easeOut",
      onComplete: () => {
        scene.time.delayedCall(1400, () => {
          if (!label.active) return;
          scene.tweens.add({ targets: label, y: -40, alpha: 0, duration: 320, ease: "Sine.easeIn",
            onComplete: () => { try{label.destroy();}catch{} } });
        });
      }
    });
  }

  function startBossFight(scene, levelJustCompleted, onComplete) {
    const rawDef = BOSS_BY_LEVEL[levelJustCompleted];
    if (!rawDef) { onComplete(); return; } // sem boss neste ponto — segue o fluxo normal
    // No Difícil, o boss aguenta +1 salto na cabeça (nunca mexe no objeto
    // original de data-bosses.js, partilhado por todas as partidas — clona-
    // -se só aqui). def.hp é o único valor lido daqui para a frente (pela
    // barra de vida, pelo HUD "saltos: X/Y" e pelos taunts), por isso basta
    // este clone para tudo ficar consistente, sem precisar de tocar em mais
    // nenhum sítio do combate.
    const def = getDifficulty() === "dificil" ? { ...rawDef, hp: rawDef.hp + 1 } : rawDef;

    inBossFight = true;
    controlsInvertedUntil = 0;
    // invuln=false: mesma defesa que loadLevel() já faz ao iniciar um nível
    // — garante que repetir um combate de boss (ex.: depois de perder todas
    // as vidas) nunca começa com uma proteção presa de "true" (ver o bug
    // corrigido em bossHitPlayer, mais abaixo). Sem isto, TODOS os toques no
    // boss, incluindo saltar-lhe em cima, eram ignorados em silêncio.
    invuln = false;
    // NOVO — bug reportado ("trava ao chegar ao boss", visto com STAR POWER
    // ainda visível no HUD no momento do travamento): loadLevel() já limpa
    // todos os poderes (clearPower/clearDoubleJump/clearStarPower) sempre que
    // um nível novo começa — startBossFight() nunca fazia o mesmo, porque não
    // passa por loadLevel() (tem a sua própria montagem de arena). Um poder
    // apanhado nos últimos instantes do nível anterior (estrela/escudo/duplo
    // salto) ficava então "pendurado": os seus temporizadores (scene.time,
    // independentes de scene.physics.pause()) continuavam a contar e a tocar
    // durante toda a cinemática de entrada do boss — incluindo o intervalo
    // de melodia (_starMelodyInterval, um setInterval() nativo, à parte de
    // qualquer array de timers que a arena do boss limpa) e o próprio
    // clearStarPower/clearPower a meio da cinemática, a forçar setAlpha(1)/
    // setScale/clearTint no VanBerto's exactamente enquanto este código está
    // com muito cuidado a posicioná-lo e a só revelá-lo no momento certo (ver
    // comentário mais abaixo, "setAlpha(1) só aqui"). Limpar tudo aqui, ANTES
    // de mais nada, garante que nenhum poder da tentativa anterior sobrevive
    // para a arena do boss — mesmo comportamento que já existe ao entrar em
    // qualquer nível normal.
    clearPower(scene); clearDoubleJump(scene); clearStarPower(scene);
    // Defesa extra: se uma tentativa anterior tiver ficado presa a meio da
    // animação do portal (ex.: o jogador mudou de separador exatamente ao
    // tocar-lhe), _doorAnimRunning podia ficar "true" para sempre, bloqueando
    // qualquer porta/portal futuro (ver visibilitychange mais abaixo). Repetir
    // o combate do boss é sempre um recomeço limpo, por isso reinicia-se aqui
    // tal como loadLevel() já faz para os níveis normais.
    _doorAnimRunning = false;
    // Se houver uma barra de vida de uma tentativa anterior (ex.: repetir o
    // combate depois de perder todas as vidas), destruir ANTES de substituir
    // bossState — senão a referência perde-se e a barra antiga fica órfã no ecrã.
    destroyBossHpBar();
    // Começa em "intro": todos os timers/movimentos do boss (que verificam
    // phase!=="platform") ficam inertes enquanto decorre a cinemática de entrada.
    bossState = { def, hp: def.hp, phase: "intro", collected: 0, onComplete, hitCooldownUntil: 0, rageLevel: 0, speedMult: getBossSpeedMult(), baseSpeedMult: getBossSpeedMult(), qmarkShotCount: 0,
      // tookDamage (novo): fica true na 1ª vez que bossHitPlayer() acertar
      // durante este combate — usado só no fim (ver "Combate Perfeito" na
      // vitória do quiz) para saber se o jogador não perdeu nenhuma vida.
      tookDamage: false };

    // Limpar o palco tal como loadLevel já faz — arena dedicada, isolada do nível anterior
    enemyTimers.forEach(t=>{try{t.remove(false);}catch{}}); enemyTimers=[];
    bossTimers.forEach(t=>{try{t.remove(false);}catch{}}); bossTimers=[];
    platforms.clear(true,true); itemsGroup.clear(true,true); malwareGroup.clear(true,true);
    pipeExitDecor.forEach(o=>{try{o.destroy();}catch{}}); pipeExitDecor=[];
    clearMovingPlatforms();
    clearTrampolines(); // sem isto, um trampolim do nível anterior ficava "pendurado" na arena do boss
    // Decorações do nível anterior (cadeados, pacotes de dados/drones, sinais nas plataformas) —
    // sem isto ficavam por destruir e continuavam visíveis/a voar durante o boss.
    // _critterSession++ ANTES de limpar os arrays: sem isto, um cadeado/drone/pacote
    // apanhado pouco antes do boss começar reaparecia sozinho (o seu delayedCall de
    // respawn ainda estava pendente) já sem estar no array ativo — ficava então uma
    // imagem "fantasma" para sempre parada e impossível de apanhar, porque updateCritters()
    // e o loop dos balões só percorrem o array atual, e o próprio loadLevel seguinte também
    // só destrói o que está nesse array atual. Era esta a causa de drones/pacotes/cadeados
    // "parados" que apareciam ocasionalmente depois de um combate de boss.
    _critterSession++;
    balloons.forEach(b=>{ if(b.sprite) b.sprite.destroy(); if(b.gfx) b.gfx.destroy(); }); balloons=[];
    critters.forEach(c=>{ if(c.sprite&&c.sprite.active) c.sprite.destroy(); }); critters=[];
    clearPlatformDecor();
    clearSign();
    if(bossOverlay){ try{bossOverlay.destroy();}catch{} bossOverlay=null; }
    if(bossLockIcon){ try{bossLockIcon.destroy();}catch{} bossLockIcon=null; }
    if(bossRageIcon){ try{bossRageIcon.destroy();}catch{} bossRageIcon=null; }
    if(bossVignette){ try{bossVignette.destroy();}catch{} bossVignette=null; } // vinheta de fase (ex.: Preconceito)
    clearToxicZones();
    clearMiniViruses();
    clearBossArenaDecor(); // decoração ambiente temática (ver def.arena.decor)
    if(door){ door.destroy(); door=null; }

    // ===== Arena — Fase "Bosses de Verdade" =====
    // def.arena (opt-in, data-bosses.js) permite a cada boss ter o seu próprio
    // tamanho de mundo e layout de plataformas, em vez da arena genérica
    // partilhada por todos. Bosses sem def.arena (ainda) caem exactamente no
    // layout de sempre — zero impacto nos combates que ainda não foram lá.
    const worldW = def.arena?.worldW || 1600;
    // worldH (opt-in, ver data-bosses.js): normalmente o chão de uma arena
    // fica quase colado ao limite físico do mundo (514) — mas ao levantar o
    // chão do Monstro da Ignorância (ver arena.platforms) sobrou uma "zona
    // morta" enorme por baixo da plataforma. Como o jogador tem
    // setCollideWorldBounds(true), se alguma vez fosse ali parar (ex.: um
    // choque/knockback a atravessar a plataforma fina), ficava preso lá
    // embaixo, sem conseguir voltar a subir através do chão sólido por cima
    // dele. Um worldH ajustado ao chão real da arena elimina essa zona morta.
    const worldH = def.arena?.worldH || 514;
    scene.physics.world.setBounds(0,0,worldW,worldH);
    scene.cameras.main.setBounds(0,0,worldW,540);

    // Fundo dedicado à arena do boss — antes disto o ecrã ficava com o fundo do
    // nível anterior (desenhado para outro worldW), daí parecer "preso" e desalinhado.
    const themeIdx = (def.themeIdx != null) ? def.themeIdx : (LEVELS[currentLevel] ? LEVELS[currentLevel].theme % THEMES.length : 0);
    applyBackground(scene, themeIdx, worldW, [], bgKeyForLevel(currentLevel));

    const platKey = "platform_t"+themeIdx;
    if(!scene.textures.exists(platKey)) makePlatformTextureThemed(scene, platKey, themeIdx);
    const arenaPlatforms = def.arena?.platforms || [[800,520,1600,28],[300,380,220,24],[1300,380,220,24]];
    arenaPlatforms.forEach(([x,y,w,h])=>{
      const plat = platforms.create(x,y,platKey);
      plat.displayWidth=w; plat.displayHeight=h; plat.refreshBody();
      if(plat.body){plat.body.checkCollision.left=false;plat.body.checkCollision.right=false;}
    });

    // Decoração ambiente da arena (ex.: livros flutuantes na biblioteca do
    // Monstro) — puramente visual, sem colisão, criada DEPOIS das plataformas
    // para ficar por cima do fundo mas atrás do jogador/boss (depth 1).
    if (def.arena?.decor) spawnBossArenaDecor(scene, def.arena.decor);

    // Repor a escala tal como loadLevel() já faz — sem isto, uma animação em
    // curso no instante exato em que o nível termina (respirar parado, o
    // squash/stretch do salto/aterragem, o achatamento do duplo salto) pode
    // deixar scaleX/scaleY "presos" fora de 1 ao entrar na cinemática do
    // boss. snapPlayerToGround(), logo a seguir, mede o corpo físico para
    // calcular onde ficam os "pés" — com a escala errada, o cálculo fica
    // errado e o VanBerto's aparece enterrado na plataforma da arena.
    if(player.getData("usingPng")){
      player.setDisplaySize(72, 72);
    } else {
      player.setScale(1);
    }
    // y=200: bem acima do chão de QUALQUER arena de boss (incluindo arenas
    // "levantadas" como a do Monstro da Ignorância) — snapPlayerToGround(),
    // logo a seguir, só encontra uma plataforma se ela estiver ao/abaixo dos
    // pés do jogador; um valor fixo demasiado baixo (ex.: 460) deixava de
    // funcionar sempre que uma arena movia o chão principal para mais acima,
    // fazendo o VanBerto's ficar preso a meio da plataforma em vez de em cima.
    player.setAngle(0);
    // playerStartX (opt-in, def.arena — ver data-bosses.js) permite a uma
    // arena de boss escolher onde o VanBerto's começa, em vez do valor fixo
    // de sempre (120px, bem junto à margem esquerda). Sem isto o VanBerto's
    // aparecia sempre encostado à esquerda em TODAS as arenas de boss,
    // mesmo nas mais largas — pedido para começar mais ao centro. Bosses
    // sem este campo mantêm exactamente o comportamento de sempre (120).
    const playerStartX = def.arena?.playerStartX != null ? def.arena.playerStartX : 120;
    player.setPosition(playerStartX,200); player.setVelocity(0,0);
    if(player.body) player.body.reset(playerStartX,200);
    // Alinhar já ao chão da arena (mesmo cálculo usado no arranque de nível
    // normal, via snapPlayerToGround) — e só tornar o VanBerto's visível
    // DEPOIS disto (setAlpha(1) só aqui, não antes de setPosition/snap).
    // Antes, setAlpha(1) corria logo no início desta função, com o jogador
    // ainda na posição do nível anterior/no y=200 provisório — como a física
    // está pausada durante toda a cinemática de entrada, isso ficava visível
    // (aos "pés enterrados", ou preso a meio da plataforma) até a física
    // retomar no fim do diálogo, altura em que a colisão o empurrava de
    // repente para a posição certa. Seguindo agora exactamente o mesmo
    // padrão do loadLevel() (esconder → posicionar → só depois revelar),
    // o VanBerto's só aparece já na posição final correta.
    snapPlayerToGround();
    // Causa raiz do "VanBerto's enterrado no chão" nos Bosses, confirmada no
    // código-fonte do Phaser (Body.reset usa gameObject.getTopLeft(), que
    // ignora completamente body.offset — só updateFromGameObject()/o passo de
    // física é que o aplica). Por isso, logo a seguir a um body.reset(), a
    // primeira chamada a snapPlayerToGround() calcula a distância ao chão
    // (dy) com o "pb.bottom" a faltar exactamente offset.y (46px), o que
    // deixa o VanBerto's exactamente offset.y a mais para baixo — enterrado.
    // Nos níveis normais isto nunca se via porque revealPlayerEntrance() já
    // chama snapPlayerToGround() uma SEGUNDA vez (comentário lá: "segurança
    // extra"), sem nenhum reset() pelo meio — e, como a 1ª chamada já deixou
    // o corpo físico com o offset aplicado (via updateFromGameObject no fim
    // da própria função), essa 2ª chamada mede a posição real correctamente
    // e converge exactamente para o chão. Os Bosses nunca tinham essa 2ª
    // chamada. Replicá-la aqui resolve na origem, com o mesmo mecanismo já
    // testado e a funcionar em todos os níveis normais — não uma lógica nova.
    snapPlayerToGround();
    // Rede de segurança final, só para o caso limite (não deve acontecer)
    // de nenhuma plataforma ter sido encontrada de todo pelas chamadas
    // acima — força o jogador para cima do chão principal da arena.
    (function ensureBossSpawnOnGround(){
      const pb = player.body; if(!pb) return;
      let mainFloor = arenaPlatforms[0];
      arenaPlatforms.forEach(([x,y,w,h])=>{ if(w>mainFloor[2]) mainFloor=[x,y,w,h]; });
      let onAnyPlatform=false;
      platforms.getChildren().forEach(p=>{
        if(!p.body) return;
        if(pb.right>p.body.left && pb.left<p.body.right && Math.abs(pb.bottom-p.body.top)<=2) onAnyPlatform=true;
      });
      if(onAnyPlatform) return; // já resolvido — nada a fazer
      const floorTopY = mainFloor[1] - mainFloor[3]/2;
      const bottomFromCenter = pb.height + pb.offset.y - player.height/2; // distância do centro do sprite ao fundo do corpo físico
      player.setVelocity(0,0);
      player.y = floorTopY - 1 - bottomFromCenter;
      player.body.updateFromGameObject();
    })();
    player.setAlpha(1);
    // Snap instantâneo da câmara para o spawn (tal como loadLevel já faz),
    // antes de mudar para o seguimento suave — sem isto, a câmara ainda
    // estava a meio da posição do nível anterior (normalmente bem mais larga
    // que a arena do boss) e demorava um instante a apanhar o VanBerto's,
    // dando a sensação de ele estar "enterrado" no chão até a câmara chegar lá.
    scene.cameras.main.startFollow(player, true, 1.0, 1.0);
    scene.cameras.main.centerOn(player.x, player.y);
    scene.time.delayedCall(50, () => scene.cameras.main.startFollow(player, true, 0.08, 0.08));

    spawnBossSprite(scene, def, worldW-200);
    createBossHpBar(scene, def);
    if (def.stompBoss) {
      // Boss "clássico à Mario": sem estrela, sem carga — o único jeito de
      // lhe fazer dano é saltar-lhe em cima (ver handleBossMalwareCollision).
    } else if (def.specialAttack) {
      // Bosses com ataque especial próprio (ex.: Monstro da Ignorância) não usam
      // a lógica genérica de "apanha a estrela para atropelar o boss" — em vez
      // disso recolhem itens temáticos que carregam um ataque nomeado.
      bossState.chargeCollected = 0;
      spawnChargeItem(scene);
      const chargeTimer = scene.time.addEvent({ delay: 950, loop: true, callback: () => spawnChargeItem(scene) });
      bossTimers.push(chargeTimer);
    } else {
      spawnBossStarItem(scene);
      const starTimer = scene.time.addEvent({ delay: 1000, loop: true, callback: () => spawnBossStarItem(scene) });
      bossTimers.push(starTimer);
    }
    if (def.contaminatedArena) {
      // Vírus Gigante / Poluidor Mecânico: a arena fica contaminada — zonas de
      // perigo fixas no chão (ácido ou lava, ver hazardType) + opcionalmente
      // vírus pequenos a flutuar, ambos independentes do boss principal.
      // def.contaminatedArena pode ser só "true" (comportamento antigo, 2 zonas
      // fixas + 3 vírus) ou um objeto de configuração — 100% retrocompatível.
      const ca = (typeof def.contaminatedArena === "object") ? def.contaminatedArena : {};
      const baseVirus = ca.virusBase != null ? ca.virusBase : 3;
      bossState.desiredVirusCount = baseVirus;
      spawnToxicZones(scene, ca.zonesBase, ca.hazardType);
      if (baseVirus > 0) spawnMiniViruses(scene, baseVirus);
      const virusTimer = scene.time.addEvent({ delay: 3000, loop: true, callback: () => maintainMiniViruses(scene, bossState.desiredVirusCount) });
      bossTimers.push(virusTimer);
    }

    // Entrada com mais impacto — antes o boss só "aparecia" sem drama nenhum.
    scene.cameras.main.shake(220, 0.012);
    const arriveBurst = scene.add.particles(0, 0, "spark_item", {
      x: worldW-200, y: 380, speed:{min:80,max:260}, lifespan:700, quantity:34,
      scale:{start:1.2,end:0}, gravityY:120, angle:{min:0,max:360},
      tint:[def.color, 0x000000, 0xffffff]
    });
    scene.time.delayedCall(600, () => { try{arriveBurst.destroy();}catch{} });
    showBossBanner(scene, `⚠️ ${def.name.toUpperCase()} ⚠️`, "#ff9090");

    if (def.movingArena) {
      spawnMovingPlatforms(scene, {
        theme: LEVELS[currentLevel] ? LEVELS[currentLevel].theme : 0,
        movingPlatforms: [
          { x: 550, y: 430, w: 190, h: 22, rangeX: 220, speed: 95 },
          { x: 1050, y: 430, w: 190, h: 22, rangeY: 90, speed: 75 }
        ]
      });
    }
    if (def.movementType === "blink") {
      const blinkTimer = scene.time.addEvent({ delay: 2600 / bossState.speedMult, loop: true, callback: () => doBossBlink(scene) });
      bossTimers.push(blinkTimer); bossState.blinkTimer = blinkTimer; bossState.blinkBaseDelay = 2600;
    } else if (def.movementType === "teleport") {
      // Véu de sombra suave, ligado à cor do próprio boss (não um bloco opaco fixo)
      bossOverlay = scene.add.rectangle(worldW/2, 257, worldW, 514, def.color, 0.16).setDepth(1);
      // CORRIGIDO: a animação tinha ficado com alpha:{from:0.75,to:1} — quase
      // opaco (75%-100%), quando o retângulo cobre a arena toda a uma
      // profundidade (depth 1) acima do próprio boss (depth 0, por omissão).
      // Resultado: o Guardião das Sombras ficava tapado por um véu escuro
      // praticamente sólido mal o combate começava — impossível de ver para
      // lhe saltar em cima, e por isso "bloqueava" o jogo. Os valores certos
      // andam à volta do alpha inicial (0.16), para ser mesmo um véu suave,
      // como o comentário acima sempre disse ("não um bloco opaco fixo").
      scene.tweens.add({ targets: bossOverlay, alpha:{from:0.12,to:0.22}, duration:1900, yoyo:true, repeat:-1, ease:"Sine.easeInOut" });
      // teleportDelay (opt-in): permite a cada boss teleportar-se mais rápido
      // que o valor por omissão — sem isto, todos os bosses "teleport" ficavam
      // presos ao mesmo ritmo do Guardião das Sombras original.
      const teleDelay = def.teleportDelay || 2400;
      const teleTimer = scene.time.addEvent({ delay: teleDelay / bossState.speedMult, loop: true, callback: () => doBossTeleport(scene) });
      bossTimers.push(teleTimer); bossState.teleTimer = teleTimer; bossState.teleBaseDelay = teleDelay;
    }
    if (def.throwsOrbs) {
      // Orbe genérico (reaproveita o projétil ❓ do Monstro, retintado via
      // def.orbTint/def.orbTexture) — antes só disponível dentro do bloco
      // def.stompBoss; agora qualquer boss pode ligar este ataque sozinho,
      // sem precisar de ser um boss "clássico à Mario".
      const orbDelay = def.orbEvery || 2200;
      const orbTimer = scene.time.addEvent({ delay: orbDelay / bossState.speedMult, loop: true, callback: () => doBossRollQmark(scene) });
      bossTimers.push(orbTimer); bossState.orbTimer = orbTimer; bossState.orbBaseDelay = orbDelay;
    }
    if (def.throwsBooks) {
      const bookTimer = scene.time.addEvent({ delay: 1700 / bossState.speedMult, loop: true, callback: () => doBossThrowBook(scene) });
      bossTimers.push(bookTimer); bossState.bookTimer = bookTimer; bossState.bookBaseDelay = 1700;
    }
    // hopTimer/qmarkTimer (stompBoss) deixaram de ser criados aqui — ver o
    // callback de playBossDialogue, mais abaixo, e o comentário lá sobre o
    // porquê (pedido: "o ataque tem de ser mais calmo ao início").
    if (def.smokePuffEvery) {
      // Marca própria do Poluidor Mecânico (ver data-bosses.js) — baforadas
      // de fumo da chaminé, puramente visuais/atmosféricas.
      const smokeTimer = scene.time.addEvent({ delay: def.smokePuffEvery, loop: true, callback: () => doBossSmokePuff(scene) });
      bossTimers.push(smokeTimer); bossState.smokeTimer = smokeTimer; bossState.smokeBaseDelay = def.smokePuffEvery;
    }
    // Animação "idle" — antes só o Monstro da Ignorância tinha isto (e só
    // porque este bloco vivia dentro do "if (def.stompBoss)" acima); os
    // outros bosses ficavam completamente estáticos fora dos golpes. Agora
    // corre para QUALQUER boss: alterna entre a pose normal e uma pose
    // alternativa ("_armsdown" — braços em repouso no Monstro, mas o nome
    // do ficheiro de textura é só uma convenção, cada boss usa essa variante
    // à sua maneira, ver textures.js) a espaços regulares, e pisca os olhos
    // de vez em quando, como qualquer personagem viva. doBossIdleArms/
    // doBossIdleBlink já verificam sozinhas se a textura existe para este
    // boss (scene.textures.exists) — para um boss que ainda não tenha as
    // variantes próprias, os timers simplesmente não fazem nada visível.
    // Ambas guardadas por bossState.squishing (ver squishBoss) para não
    // trocarem a textura por baixo da reação de dor a meio de um golpe.
    const armsTimer = scene.time.addEvent({ delay: 1100, loop: true, callback: () => doBossIdleArms(scene) });
    bossTimers.push(armsTimer); bossState.armsTimer = armsTimer;
    const idleBlinkTimer = scene.time.addEvent({ delay: 2600 + Math.random()*1600, loop: true, callback: () => doBossIdleBlink(scene) });
    bossTimers.push(idleBlinkTimer); bossState.idleBlinkTimer = idleBlinkTimer;

    hudText.setText(`${def.emoji} ${def.name}`);
    itemCountText.setText("");
    tipText.setText("🎬 " + def.name + " apareceu!");
    ensureAudio(); SFX.bossArrive();

    // Mantém awaitingQuiz=true (já estava) durante a cinemática — assim update()
    // não avança o boss/timers/vilões enquanto o diálogo decorre.
    const objective = (BOSS_OBJECTIVE[def.id] || "Foge dele até apanhares uma estrela ⭐ para o atingires!")
      .replace("{N}", def.hp); // def.hp já reflete o modo Difícil (+1) — ver clone de rawDef acima
    // A explicação do objetivo já não vai no diálogo (passava depressa demais) —
    // passa a ser um letreiro, tal como nos níveis normais: o jogador aproxima-se
    // e "lê-o" ao seu ritmo. Só a apresentação dramática (VanBerto's + boss) fica no diálogo.
    // 3 falas em vez de 2: o VanBerto's reage ANTES do boss se apresentar, e responde
    // com um "grito de guerra" DEPOIS — dá a sensação de cena, não de anúncio a passar depressa.
    const introVB = BOSS_INTRO_VB[def.id] || { reaction: "Sinto algo estranho aqui...", rally: "Vamos enfrentar isto juntos!" };
    // NOVO — try/catch à volta de toda a cinemática de entrada (ver mais
    // abaixo, junto à chamada a playBossDialogue): se algo aqui lançar um
    // erro (ex.: cálculo do anchor com um valor inesperado do ecrã/canvas),
    // sem isto o erro escapava por completo do controlo do Phaser e travava
    // o jogo inteiro na entrada do boss — exactamente o "trava ao chegar ao
    // boss" reportado, sem nada a responder e sem o auto-avanço de 9s (nunca
    // chegava a ser armado, porque a exceção interrompia tudo antes disso).
    // Extraído para uma função nomeada para poder ser chamado tanto pela
    // cinemática (via callback normal) como pelo catch (a saltar direto para
    // o combate, sem cinemática, em vez de travar por completo).
    const startBossPlatformPhase = () => {
      if (!bossState) return; // segurança: nível pode ter sido reiniciado entretanto
      bossState.phase = "platform";
      // Sai do riso maléfico da intro (ver spawnBossSprite) assim que o
      // combate a sério começa — volta à cara normal, para a animação idle
      // (doBossIdleArms/doBossIdleBlink) assumir a partir daqui.
      if (bossState.sprite && bossState.sprite.active) {
        const normalKey = "boss_" + def.id;
        if (scene.textures.exists(normalKey) && bossState.sprite.texture.key !== normalKey) {
          bossState.sprite.setTexture(normalKey);
        }
      }
      if (def.phases) enterBossPhase(scene, def, def.hp); // fase 1 (vida cheia)
      // Só agora o boss "ganha vida": velocidade de patrulha (ver
      // spawnBossSprite) ou o tween de respiração/pulsar dos bosses "wave" —
      // exactamente quando o jogador termina/salta o diálogo de entrada.
      if (bossState.sprite && bossState.sprite.active) {
        if (def.movementType === "wave") {
          const b = bossState.sprite;
          const pulseScale = b.scaleX * 1.18; // pulsa ~18% maior, proporcional à escala base
          scene.tweens.add({ targets: b, scaleX: pulseScale, scaleY: pulseScale, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
          // CORRIGIDO — bloqueava qualquer hipótese de reagir à 1ª investida:
          // o movimento em onda (ver updateBossFight) calculava a posição a
          // partir de scene.time.now, ou seja, o tempo TOTAL desde que a
          // página abriu — não desde que o combate começou. Isso fazia o
          // Vírus Gigante "saltar" instantaneamente (não deslizar) para um
          // ponto qualquer da onda mal a fase "platform" arrancava — podia
          // muito bem calhar mesmo em cima do VanBerto's, sem aviso nenhum
          // nem tempo de reação, dependendo só de há quanto tempo o jogo
          // estava aberto. Guardar aqui o instante exato em que o combate
          // começa (waveStartTime) e usar SÓ o tempo decorrido a partir daí
          // (ver updateBossFight) garante que a onda começa sempre no
          // centro da arena, previsível, dando ao jogador um instante para
          // se orientar antes de o boss começar a deslizar de um lado para o outro.
          bossState.waveStartTime = scene.time.now;
        } else if (def.movementType !== "blink" && def.movementType !== "teleport") {
          // Mesma condição "senão" de spawnBossSprite (patrol e qualquer
          // futuro tipo por omissão) — mantém as duas funções em sincronia.
          bossState.sprite.setVelocityX(-(def.patrolSpeed || 110));
        }
      }
      const objEmoji = def.stompBoss ? "👣" : (def.specialAttack ? (def.specialAttack.emoji || "⚡") : "⭐");
      tipText.setText(objEmoji + " " + objective);
      if (def.stompBoss) {
        // CORRIGIDO (pedido: "o boss não pode ir logo atacar, é impossível
        // fugir — ao início o ataque tem de ser mais calmo"). Estes dois
        // temporizadores costumavam ser criados na fase de preparação, ANTES
        // do diálogo de entrada — como o relógio do Phaser corre por trás
        // independentemente de o diálogo ainda estar a decorrer, o 1º orbe
        // podia chegar quase de imediato mal o jogador ganhava controlo,
        // dependendo só de quanto tempo tinha demorado a ler o diálogo (o
        // mesmo problema de fundo já corrigido para o movimento em onda do
        // Vírus Gigante, ver bossState.waveStartTime, mais acima). Agora só
        // começam a contar a partir DAQUI — o instante exato em que o
        // combate a sério começa — e o 1º arremesso tem ainda um alívio
        // extra (+1500ms) por cima do intervalo normal, para dar tempo a
        // perceber o movimento do boss antes do primeiro ataque de verdade.
        const hopDelay = def.hopEvery || 2400;
        const hopTimer = scene.time.addEvent({ delay: hopDelay / bossState.speedMult, loop: true, callback: () => doBossHop(scene) });
        bossTimers.push(hopTimer); bossState.hopTimer = hopTimer; bossState.hopBaseDelay = hopDelay;
        const qmarkDelay = def.qmarkEvery || 2200;
        const firstQmark = scene.time.delayedCall(qmarkDelay / bossState.speedMult + 1500, () => {
          doBossRollQmark(scene);
          const qmarkTimer = scene.time.addEvent({ delay: qmarkDelay / bossState.speedMult, loop: true, callback: () => doBossRollQmark(scene) });
          bossTimers.push(qmarkTimer); bossState.qmarkTimer = qmarkTimer; bossState.qmarkBaseDelay = qmarkDelay;
        });
        bossTimers.push(firstQmark);
      }
      awaitingQuiz = false; awaitingStory = false;
      scene.physics.resume();
      if (def.stompBoss) {
        // Instantes de proteção ao ganhar controlo (pedido: "morre quase
        // logo ao começar", reportado no Vírus Gigante, o boss de
        // abertura) — reaproveita o mesmo setInvuln() já usado depois de
        // levar um golpe, mas agora também no ARRANQUE do combate. Dá à
        // criança um instante para se orientar antes de qualquer contacto
        // poder doer, tal como um boss clássico nunca ataca no exato
        // instante em que o jogador ganha controlo. Aplica-se aos 4
        // bosses (não só ao Vírus) — mesmo problema, mesma solução.
        setInvuln(scene, 1600);
      }
      // Letreiro do objetivo — perto do ponto de partida do jogador na arena,
      // para ser o primeiro coisa que encontra ao começar a andar. signX
      // (opt-in, def.arena — tal como signY) permite a um boss afinar esta
      // posição; por omissão fica só 80px à frente do spawn (era 160 — em
      // arenas mais estreitas isso empurrava o letreiro visivelmente para lá
      // do centro do ecrã, longe do ponto onde o jogador realmente começa).
      const signX = def.signX != null ? def.signX : playerStartX + 80;
      spawnBossSign(scene, signX, def.signY != null ? def.signY : 486, objEmoji, objective);
      if (def.stompBoss) {
        // Sem estrela, sem carga — o HUD mostra logo o progresso dos saltos.
        // stompLabel (nova, opt-in): rótulo temático por boss em vez do
        // genérico "👣 Saltos" para todos — dá mais identidade a cada
        // combate (ver data-bosses.js).
        itemCountText.setText(`${def.stompLabel || "👣 Saltos"}: 0/${def.hp}`);
      } else if (!def.specialAttack) {
        // Lembrete visual permanente por cima do boss — 🔒 enquanto não podes
        // tocar-lhe, ⭐ assim que apanhas o poder da estrela. Substitui/completa
        // o texto do objetivo, que passa depressa e nem todos leem a tempo.
        // (Bosses com ataque especial próprio mostram o progresso da carga no
        // HUD — itemCountText — em vez deste ícone, porque tocar-lhes dói SEMPRE,
        // não há um estado "desbloqueado" por toque.)
        if (bossLockIcon) { try{bossLockIcon.destroy();}catch{} }
        bossLockIcon = scene.add.text(0, 0, "🔒", { fontSize:"24px" }).setOrigin(0.5).setDepth(6);
        scene.tweens.add({ targets:bossLockIcon, scaleX:{from:0.85,to:1.15}, scaleY:{from:0.85,to:1.15},
          duration:520, yoyo:true, repeat:-1, ease:"Sine.easeInOut" });
      } else {
        itemCountText.setText(`⚡ Carga: 0/${def.specialAttack.chargeCount}`);
      }
    };
    try {
      playBossDialogue([
        { speaker:"vb",   text: introVB.reaction, anchor: vbDialogueAnchor() },
        { speaker:"boss", name: def.name, emoji: def.emoji, text: def.intro, anchor: bossDialogueAnchor() },
        { speaker:"vb",   text: introVB.rally, anchor: vbDialogueAnchor() }
      ], startBossPlatformPhase);
    } catch (err) {
      console.error("Cinemática de entrada do boss falhou — a avançar direto para o combate:", err);
      startBossPlatformPhase();
    }
  }

  // ===== Fases de combate por HP — Fase "Batalhas Épicas" =====
  // Genérico e opt-in: só bosses com def.phases (por agora, só o Monstro da
  // Ignorância) passam por aqui. Bosses sem def.phases continuam a usar
  // bossEnterRage() como antes — zero impacto nos outros 3 combates.
  // Cada fase pode redefinir a cadência de ataques (bookThrowDelay/blinkDelay/
  // badBookChance), ligar o ataque de "fake news" (a partir da fase 2) e a
  // vinheta escura da fase final — tudo lido de data-bosses.js, sem valores
  // mágicos aqui dentro.
  function enterBossPhase(scene, def, hp) {
    if (!bossState || !def.phases) return;
    const phase = def.phases.find(p => p.atHp === hp) || def.phases[def.phases.length - 1];
    if (!phase || bossState.currentPhaseId === phase.id) return; // já estamos nesta fase
    bossState.currentPhaseId = phase.id;
    bossState.badBookChance = phase.badBookChance;

    // Cadência dos ataques já existentes — cada fase tem os seus próprios valores
    // (mais rápido a cada fase), em vez do multiplicador genérico de bossEnterRage.
    if (bossState.bookTimer) bossState.bookTimer.delay = phase.bookThrowDelay;
    if (bossState.blinkTimer) bossState.blinkTimer.delay = phase.blinkDelay;

    // Ataque de "fake news" — liga na fase que o pedir e fica ativo até ao fim
    // do combate (não se desliga entre fases 2→3), mas agora a CADÊNCIA
    // atualiza-se a cada fase (fase.fakeNewsDelay) tal como já acontecia com
    // os livros e o blink — antes ficava sempre fixo em 2100ms, mesmo na
    // fase final, que era suposto ser a mais intensa.
    if (phase.fakeNewsAttack) {
      if (!bossState.fakeNewsTimer) {
        const fnTimer = scene.time.addEvent({ delay: phase.fakeNewsDelay || 2100, loop: true, callback: () => doBossThrowFakeNews(scene) });
        bossTimers.push(fnTimer); bossState.fakeNewsTimer = fnTimer;
      } else if (phase.fakeNewsDelay) {
        bossState.fakeNewsTimer.delay = phase.fakeNewsDelay;
      }
    }

    // Vinheta escura — representa o boss a "não querer ver" que está a perder.
    // Bordas do ecrã escurecem com um leve pulsar, sem nunca esconder o centro
    // (onde o jogador e os itens continuam bem visíveis).
    if (phase.vignette && !bossVignette) {
      // Vinheta real fixa ao ecrã (scrollFactor 0) — molduras escuras nos 4
      // lados, deixando uma "janela" iluminada ao centro, onde jogador e itens
      // continuam sempre bem visíveis. Acompanha o ecrã, não o mundo, para
      // funcionar em qualquer ponto da arena, não só perto do centro.
      const W = 960, H = 540, margin = 170;
      const g = scene.add.graphics().setScrollFactor(0).setDepth(40).setAlpha(0);
      g.fillStyle(0x050014, 0.62);
      g.fillRect(0, 0, W, margin);              // topo
      g.fillRect(0, H - (margin - 60), W, margin - 60); // fundo (janela mais alta que larga)
      g.fillRect(0, 0, margin, H);               // esquerda
      g.fillRect(W - margin, 0, margin, H);      // direita
      bossVignette = g;
      scene.tweens.add({ targets: g, alpha: 1, duration: 900, ease: "Sine.easeOut" });
      scene.tweens.add({ targets: g, alpha: { from: 0.8, to: 1 }, duration: 1400, delay: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }

    // Sprite do boss reage visualmente à mudança de fase — um "glitch" rápido
    // de transparência (fase 2, "sinal a falhar") ou um tingir avermelhado
    // pulsante (fase 3, "corrupção"), sem precisar de nenhuma arte nova.
    const b = bossState.sprite;
    if (b && b.active) {
      scene.tweens.killTweensOf(b);
      if (phase.id === "fakenews") {
        scene.tweens.add({ targets:b, alpha:{from:1,to:0.25}, duration:70, yoyo:true, repeat:5 });
      } else if (phase.id === "preconceito") {
        b.setTint(0xff5050);
        scene.tweens.add({ targets:b, alpha:{from:1,to:0.4}, duration:120, yoyo:true, repeat:5,
          onComplete: () => { if (b.active) { b.setAlpha(1); b.setTint(def.color); } } });
      }
      const pulseScale = (def.movementType === "wave") ? b.scaleX : (b.scaleX * 1.22);
      scene.tweens.add({ targets:b, scaleX:pulseScale, scaleY:pulseScale, duration:160, yoyo:true, repeat:1, ease:"Sine.easeOut" });
    }

    // Fala curta e própria da fase — reaproveita BOSS_HP_TAUNTS (data-story.js),
    // já escrito mas nunca antes ligado ao motor.
    const tauntKey = phase.atHp === 3 ? "atStart" : (phase.atHp === 2 ? "hp2" : "hp1");
    const taunts = BOSS_HP_TAUNTS[def.id] || {};
    const tauntEntry = taunts[tauntKey];
    if (tauntEntry) {
      const tauntText = Array.isArray(tauntEntry) ? tauntEntry[Math.floor(Math.random()*tauntEntry.length)] : tauntEntry;
      showFloat(scene, b ? b.x : bossState.baseX, (b ? b.y : bossState.baseY) - 74, tauntText, "#ff9090");
    }

    // Aviso curto de fase no HUD (não bloqueia nada, só um flourish rápido)
    if (phase.label) showBossBanner(scene, phase.label, "#ffd280");
    scene.cameras.main.shake(phase.id === "preconceito" ? 220 : 150, phase.id === "preconceito" ? 0.012 : 0.008);
  }

  // ---- Ataque "Fake News" (fases 2-3 do Monstro da Ignorância): um ❌ voa na
  // horizontal de um lado ao outro da arena — evitar, nunca apanhar. Reaproveita
  // a textura escura do livro mau (já pensada para parecer "informação errada"),
  // só que agora em voo reto em vez de arco lançado pelo boss — para se sentir
  // como um ataque novo, não um livro mau a mais. ----
  function doBossThrowFakeNews(scene) {
    if (!inBossFight || !bossState || bossState.phase !== "platform") return;
    const fromLeft = Math.random() < 0.5;
    const y = 340 + Math.random() * 90;
    const x = fromLeft ? -20 : 1620;
    const news = itemsGroup.create(x, y, "boss_proj_badbook");
    news.setDepth(2).setData("bossProjBad", true).setAngle(fromLeft ? -12 : 12);
    news.body.setAllowGravity(false);
    news.setVelocityX(fromLeft ? 340 : -340);
    news.setAngularVelocity(fromLeft ? -200 : 200);
    scene.time.delayedCall(2600, () => { if (news.active) news.destroy(); });
  }

  // ---- Momento "último fôlego" (opt-in via def.finalStandBurst — agora
  // nos 4 bosses, ver data-bosses.js): disparado uma única vez a partir de
  // damageBoss() quando o boss fica a só 1 salto de ser derrotado. Lança 3
  // sombras vindas dos extremos da arena, a voar na horizontal (sem
  // gravidade, tal como o antigo "Fake News", mas com as dimensões da
  // arena ATUAL — 960px, não os 1600px de antes da conversão para "boss
  // clássico à Mario"). altura da cabeça: o chão da arena tem o topo em
  // y=506 e o VanBerto's de pé mede ~72px (pés sempre no mesmo sítio) →
  // cabeça de pé por volta de y=434; agachado (~60% da altura, ver
  // isCrouching) → cabeça por volta de y=463. y=452 fica a meio dos dois:
  // acerta em pé, passa por cima agachado. Não altera hp nem timers normais
  // do boss (patrulha/teleporte/❓ continuam) — é só uma camada extra.
  function startBossFinalStandBurst(scene) {
    if (!bossState || bossState.phase !== "platform") return;
    const def = bossState.def;
    showBossBanner(scene, `🌑 ${def.name.toUpperCase()} — ÚLTIMO FÔLEGO! 🌑`, "#c9a6ff");
    scene.cameras.main.shake(200, 0.010);
    const worldW = def.arena?.worldW || 960;
    const y = 452;
    const spawnShadow = (fromLeft) => {
      // Guarda repetida aqui dentro (não só à entrada da função) porque
      // cada sombra nasce depois de um delayedCall — o combate pode já ter
      // terminado (3º salto certeiro) nesse intervalo.
      if (!bossState || bossState.phase !== "platform") return;
      const x = fromLeft ? -20 : worldW + 20;
      const shadow = itemsGroup.create(x, y, def.orbTexture || "boss_proj_shadow");
      if (def.orbTint != null) shadow.setTint(def.orbTint);
      shadow.setDepth(2).setData("bossFinalBurst", true).setAngle(fromLeft ? -12 : 12);
      shadow.body.setAllowGravity(false);
      shadow.setVelocityX(fromLeft ? 260 : -260);
      shadow.setAngularVelocity(fromLeft ? -180 : 180);
      scene.time.delayedCall(3000, () => { if (shadow.active) shadow.destroy(); });
    };
    // Sequência alternada (esquerda-direita-esquerda-...), espaçada 800ms —
    // dá tempo de perceber o padrão e agachar a tempo, mesmo sendo a 1ª vez
    // que a criança vê este ataque em particular. Número de sombras via
    // def.finalStandBurstHits (opt-in, omisso = 3): o último fôlego de
    // qualquer boss é pensado para ser o momento mais difícil do combate,
    // por isso o motor por omissão sobe para 3 (era só 2) — mas o Vírus
    // Gigante, por continuar a ser o 1º boss do jogo, pede explicitamente
    // para ficar nos 2 originais (ver finalStandBurstHits em data-bosses.js).
    const hits = def.finalStandBurstHits || 3;
    for (let i = 0; i < hits; i++) {
      scene.time.delayedCall(500 + i * 800, () => spawnShadow(i % 2 === 0));
    }
  }

  function spawnBossSprite(scene, def, x) {
    const texKey = "boss_"+def.id;
    const hasCustomTex = scene.textures.exists(texKey);
    // laughKey (riso maléfico, ver textures.js): se existir, o boss nasce já
    // com esta cara — mostra-se durante toda a cinemática de intro, antes de
    // o jogador poder reagir, e volta à cara normal mal o combate arranca
    // (ver o callback de playBossDialogue, mais abaixo).
    const laughKey = texKey + "_laugh";
    const hasLaugh = scene.textures.exists(laughKey);
    // bossY (opt-in, ver data-bosses.js) permite a um boss ficar fixo à
    // altura do chão da sua arena, em vez de flutuar sempre a meio do ecrã —
    // usado pelo Monstro da Ignorância, que "anda" e nunca flutua.
    const y = def.bossY != null ? def.bossY : 380;
    const boss = malwareGroup.create(x, y, hasLaugh ? laughKey : (hasCustomTex ? texKey : "vilao_bug"));
    boss.setScale(hasCustomTex ? (def.bossScale || 1.55) : 2.2);
    if (!hasCustomTex) boss.setTint(def.color); // rede de segurança, caso a textura não tenha carregado
    boss.setData("isBoss", true);
    boss.body.setAllowGravity(false);
    boss.setCollideWorldBounds(true); boss.setBounce(1,0);
    bossState.sprite = boss;
    bossState.baseX = x; bossState.baseY = y;

    // Entrada com mais impacto (pedido "mais género Mario"), sem mexer no
    // chão da arena — cada boss ganha uma assinatura própria em vez de
    // simplesmente "aparecer" já completo. 100% opt-in, puramente visual,
    // não interfere com a física (ainda pausada nesta fase da cinemática).
    if (def.entranceGrow) {
      // Bosses que andam/flutuam (Monstro, Vírus, Poluidor): nascem
      // minúsculos e crescem até ao tamanho final, com um pequeno
      // solavanco de câmara + som grave no fim — como um boss grande a
      // chegar à arena.
      const finalScaleX = boss.scaleX, finalScaleY = boss.scaleY;
      boss.setScale(0.05);
      scene.tweens.add({
        targets: boss, scaleX: finalScaleX, scaleY: finalScaleY,
        duration: 650, ease: "Back.easeOut",
        onComplete: () => {
          if (!boss.active) return;
          scene.cameras.main.shake(160, 0.01);
          ensureAudio(); beep({ freq: 90, dur: 0.14, type: "square", vol: 0.05, slideTo: 50 });
        }
      });
    } else if (def.entranceMaterialize) {
      // Guardião das Sombras: em vez de crescer, materializa-se a partir
      // de nada — começa invisível e ganha opacidade aos poucos, com um
      // pequeno turbilhão de partículas escuras à sua volta, condizente
      // com a temática de sombras (mais apropriado do que "crescer" para
      // um boss cuja marca já é aparecer/desaparecer por teletransporte).
      boss.setAlpha(0);
      const swirl = scene.add.particles(0, 0, "spark_item", {
        x: boss.x, y: boss.y, speed: { min: 20, max: 70 }, lifespan: 700,
        quantity: 2, frequency: 40, angle: { min: 0, max: 360 },
        scale: { start: 0.9, end: 0 }, tint: [def.color, 0x000000]
      });
      scene.tweens.add({
        targets: boss, alpha: 1, duration: 750, ease: "Sine.easeIn",
        onComplete: () => {
          try{ swirl.stop(); }catch{}
          scene.time.delayedCall(400, () => { try{ swirl.destroy(); }catch{} });
          if (!boss.active) return;
          scene.cameras.main.shake(140, 0.008);
        }
      });
    }

    if (def.movementType === "wave") {
      boss.setVelocity(0,0);
      // O tween de "respiração" (pulsar de tamanho) só arranca no fim do
      // diálogo agora — ver o callback do playBossDialogue mais abaixo —
      // pela mesma razão da velocidade de patrulha acima: nada no boss deve
      // dar sinais de vida antes do jogador poder reagir.
    } else if (def.movementType === "blink" || def.movementType === "teleport") {
      boss.setVelocity(0,0);
    } else {
      // "patrol" (ex.: Monstro da Ignorância): antes arrancava já com
      // velocidade definida aqui, mesmo com o boss ainda em phase="intro" —
      // ficava parado só porque scene.physics.pause() está ativo durante a
      // cinemática de entrada (chamado por quem invoca startBossFight). Isso
      // funciona nos fluxos que já pausam a física antes de chamar
      // startBossFight, mas o movimento ficava "à espera" de um resume, em vez
      // de só arrancar mesmo quando o diálogo termina — um único ponto a mais
      // a ter de se lembrar de pausar a física corretamente para o boss não
      // se mexer. Agora fica mesmo parado (velocidade 0) à nascença; a
      // velocidade de patrulha só é aplicada no fim do diálogo (ver o
      // callback do playBossDialogue, mais abaixo), exactamente quando o
      // jogador clica "Saltar" ou avança a última fala.
      boss.setVelocity(0,0);
    }
  }

  // ===== Decoração ambiente da arena de boss — Fase "Bosses de Verdade" =====
  // Puramente visual (sem colisão, sem grupo de física): emoji + tween, tal
  // como bossLockIcon/showFloat já fazem. Reaproveitável por qualquer boss via
  // def.arena.decor = [{emoji,x,y,size?}], sem precisar de nenhum asset novo.
  function spawnBossArenaDecor(scene, defs) {
    clearBossArenaDecor();
    (defs || []).forEach(d => {
      const t = scene.add.text(d.x, d.y, d.emoji, { fontSize: (d.size||26)+"px" })
        .setOrigin(0.5).setDepth(1).setAlpha(0.85);
      // Flutuação lenta + leve balanço — cada elemento com timing próprio para
      // não parecerem todos sincronizados (sensação mais orgânica).
      scene.tweens.add({ targets:t, y:d.y-14, duration:1400+Math.random()*600, yoyo:true, repeat:-1, ease:"Sine.easeInOut" });
      scene.tweens.add({ targets:t, angle:{from:-6,to:6}, duration:1800+Math.random()*500, yoyo:true, repeat:-1, ease:"Sine.easeInOut" });
      bossArenaDecor.push(t);
    });
  }
  function clearBossArenaDecor() {
    bossArenaDecor.forEach(t => { try{ if(t.active) t.destroy(); }catch{} });
    bossArenaDecor = [];
  }

  // Barra de vida do boss — flutua por cima do sprite, cor muda conforme a vida
  // restante (verde → dourado → vermelho), para dar feedback visual claro do
  // progresso do combate sem o jogador ter de contar hits.
  function createBossHpBar(scene, def) {
    if (!bossState) return;
    bossState.hpBarW = 100; bossState.hpBarH = 12;
    if (bossState.hpBarBg) { try{bossState.hpBarBg.destroy();}catch{} }
    if (bossState.hpBarFill) { try{bossState.hpBarFill.destroy();}catch{} }
    bossState.hpBarBg = scene.add.graphics().setDepth(6);
    bossState.hpBarFill = scene.add.graphics().setDepth(7);
    // Cresce de 0 até cheia em vez de aparecer já cheia — pequeno detalhe que
    // dá a sensação de "a vida a ser carregada", como em jogos profissionais.
    bossState.hpGrowFactor = 0;
    scene.tweens.add({ targets: bossState, hpGrowFactor: 1, duration: 550, ease: "Cubic.easeOut", onUpdate: drawBossHpBar });
    drawBossHpBar();
  }
  function drawBossHpBar() {
    if (!bossState || !bossState.hpBarBg || !bossState.hpBarFill || !bossState.sprite || !bossState.sprite.active) return;
    const b = bossState.sprite;
    const w = bossState.hpBarW, h = bossState.hpBarH;
    const def = bossState.def;
    // hpBarOffset (opt-in, ver data-bosses.js): distância fixa entre o centro
    // do sprite e a barra, para bosses cuja textura tem muito espaço vazio
    // por cima da cabeça desenhada (ex.: o Monstro da Ignorância, baixo e
    // rechonchudo dentro de um canvas quadrado) — sem isto, a conta genérica
    // (displayHeight/2 + 42) media a partir do topo do canvas "vazio", não do
    // topo real da cabeça, e a barra ficava a flutuar bem longe do boss.
    const x = b.x - w/2;
    const y = (def && def.hpBarOffset != null) ? (b.y - def.hpBarOffset) : (b.y - (b.displayHeight/2 || 40) - 42);
    bossState.hpBarBg.clear();
    bossState.hpBarBg.fillStyle(0x1a1a2e, 0.85);
    bossState.hpBarBg.fillRoundedRect(x, y, w, h, 5);
    bossState.hpBarBg.lineStyle(2, 0xffffff, 0.9);
    bossState.hpBarBg.strokeRoundedRect(x, y, w, h, 5);
    bossState.hpBarFill.clear();
    const growFactor = bossState.hpGrowFactor != null ? bossState.hpGrowFactor : 1;
    if (def && def.stompBoss) {
      // Barra contínua (pedido): verde no início, laranja logo depois do 1º
      // salto certeiro, vermelha depois do 2º — a cor reflete os SALTOS DADOS
      // (não uma percentagem genérica), porque com hp sempre a valer 3 uma
      // percentagem normal (>50%/>25%) não mudava de cor no sítio certo. O
      // contador "👣 Saltos: X/3" no HUD continua a dar o detalhe exato.
      const hitsTaken = (bossState.def.hp || 3) - bossState.hp;
      const fillColor = hitsTaken <= 0 ? 0x60e060 : (hitsTaken === 1 ? 0xff9500 : 0xff5050);
      const pct = Math.max(0, bossState.hp / bossState.def.hp) * growFactor;
      bossState.hpBarFill.fillStyle(fillColor, 1);
      bossState.hpBarFill.fillRoundedRect(x+2, y+2, Math.max(0,(w-4)*pct), h-4, 3);
      return;
    }
    const pct = Math.max(0, bossState.hp / bossState.def.hp) * growFactor;
    const fillColor = pct > 0.5 ? 0x60e060 : (pct > 0.25 ? 0xffd700 : 0xff5050);
    bossState.hpBarFill.fillStyle(fillColor, 1);
    bossState.hpBarFill.fillRoundedRect(x+2, y+2, Math.max(0,(w-4)*pct), h-4, 3);
  }
  function destroyBossHpBar() {
    if (!bossState) return;
    if (bossState.hpBarBg)   { try{bossState.hpBarBg.destroy();}catch{}   bossState.hpBarBg = null; }
    if (bossState.hpBarFill) { try{bossState.hpBarFill.destroy();}catch{} bossState.hpBarFill = null; }
  }

  // Mantém sempre uma estrela ⭐ disponível na arena enquanto o boss não foi enfraquecido —
  // usa o fluxo normal de onCollectItem (kind:"estrela", SEM bossCollect) para que o
  // giveStarPower() já existente dispare tal como em qualquer nível normal.
  function spawnBossStarItem(scene) {
    if (!inBossFight || !bossState || bossState.phase !== "platform") return;
    const hasStar = itemsGroup.getChildren().some(o => o.active && o.getData("kind")==="estrela" && !o.getData("bossCollect"));
    if (hasStar) return;
    // arena.spawnSpots (opt-in, ver data-bosses.js) permite a cada boss definir
    // os seus próprios pontos, alinhados com a sua arena temática — sem isso,
    // cai no comportamento genérico de sempre.
    const arenaSpots = bossState.def.arena?.spawnSpots;
    const spots = arenaSpots && arenaSpots.length ? arenaSpots : [280, 1320];
    const x = spots[Math.floor(Math.random()*spots.length)];
    const it = itemsGroup.create(x, 340, "item_estrela");
    it.setDepth(2).setData("kind","estrela").setData("itemIdx",-1);
    scene.tweens.add({targets:it,y:it.y-8,duration:820,yoyo:true,repeat:-1,ease:"Sine.easeInOut"});
  }

  // Itens de carga do ataque especial de cada boss (📚 Monstro / ❤️ Vírus...) —
  // reaproveita texturas já existentes com um tom próprio (definido em
  // specialAttack.chargeTexture/chargeTint), para se distinguir dos itens da
  // fase de recolha pós-derrota. Ao contrário da estrela (só 1 de cada vez),
  // mantemos até 2 em simultâneo — com 5 para apanhar, um só de cada vez
  // tornaria o ritmo demasiado lento.
  function spawnChargeItem(scene) {
    if (!inBossFight || !bossState || bossState.phase !== "platform" || !bossState.def.specialAttack) return;
    const sa = bossState.def.specialAttack;
    const already = itemsGroup.getChildren().filter(o => o.active && o.getData("bossCharge")).length;
    if (already >= 2) return;
    const arenaSpots = bossState.def.arena?.spawnSpots;
    const spots = arenaSpots && arenaSpots.length ? arenaSpots : [280, 800, 1320];
    const x = spots[Math.floor(Math.random()*spots.length)];
    const tex = sa.chargeTexture || "item_livro";
    const tint = sa.chargeTint != null ? sa.chargeTint : 0x80d8ff;
    const it = itemsGroup.create(x, 330 + Math.random()*40, tex);
    it.setDepth(2).setTint(tint).setData("kind","carga").setData("bossCharge", true);
    scene.tweens.add({targets:it,y:it.y-10,duration:760,yoyo:true,repeat:-1,ease:"Sine.easeInOut"});
    scene.tweens.add({targets:it,angle:{from:-6,to:6},duration:900,yoyo:true,repeat:-1,ease:"Sine.easeInOut"});
  }

  // ---- Arena contaminada (Vírus Gigante): zonas tóxicas + vírus pequenos ----
  // 100% aditivo e opt-in via def.contaminatedArena — não afeta bosses normais.
  let bossToxicZones = [];
  let bossMiniViruses = [];
  let toxicSplashTimer = null;

  // Devolve a configuração de zonas de contaminação/poluição correspondente
  // ao nível de fúria ATUAL do boss — usado para voltar a semear as zonas
  // corretamente depois da Onda (cura/limpa), em vez de cair sempre no
  // layout genérico de 2 zonas fixas independentemente do boss/fúria.
  function currentContaminationZones() {
    if (!bossState) return null;
    const def = bossState.def;
    const ca = (typeof def.contaminatedArena === "object") ? def.contaminatedArena : {};
    const esc = ca.escalations && ca.escalations[bossState.rageLevel];
    return { zones: (esc && esc.zones) ? esc.zones : ca.zonesBase, hazardType: ca.hazardType };
  }

  function spawnToxicZones(scene, customSpots, hazardType) {
    clearToxicZones();
    const spots = (customSpots && customSpots.length) ? customSpots : [ {x:520, w:200}, {x:1080, w:200} ];
    const kind = hazardType || "acid";
    // Altura da zona — 65 em vez dos 30 de omissão: a plataforma principal
    // da arena vai de y=506 a y=536 (topo em 521, altura 30), e a zona
    // desenhava-se a começar em y=496; com só 30 de altura ficava a
    // flutuar por cima da plataforma e deixava a parte de baixo dela à
    // mostra (por baixo do próprio verde/lava). 65 desce bem abaixo da
    // base da plataforma (536), cobrindo-a até ao fundo — pedido: "não era
    // o chão todo para o lado mas sim para baixo".
    const zoneH = 65;
    spots.forEach(s => {
      const gfx = scene.add.graphics().setDepth(2);
      _drawHazard(gfx, s.x, 496, s.w, kind, scene.time.now, zoneH);
      const timer = scene.time.addEvent({
        delay: 120, loop: true,
        callback: () => { if (gfx.active) _drawHazard(gfx, s.x, 496, s.w, kind, scene.time.now, zoneH); }
      });
      bossToxicZones.push({ x:s.x, y:496, w:s.w, gfx, timer, kind });
    });
    // Salpicos periódicos (pedido: "por vezes sair salpicos") — pequenos
    // rebentos de partículas a saltar da zona contaminada, para reforçar
    // visualmente que aquilo é perigoso mesmo parado (a zona já cobre
    // praticamente o chão todo — ver zonesBase em data-bosses.js).
    toxicSplashTimer = scene.time.addEvent({
      delay: 500 + Math.random()*400, loop: true,
      callback: () => spawnToxicSplash(scene)
    });
  }
  function clearToxicZones() {
    bossToxicZones.forEach(z => { try{z.gfx.destroy();}catch{} try{ z.timer && z.timer.remove(false); }catch{} });
    bossToxicZones = [];
    if (toxicSplashTimer) { try{ toxicSplashTimer.remove(false); }catch{} toxicSplashTimer = null; }
  }
  // Rebento de partículas a saltar de uma zona tóxica escolhida ao acaso —
  // verde/ácido para "acid", laranja/amarelo para "lava", tal como as
  // próprias cores de _drawHazard.
  function spawnToxicSplash(scene) {
    if (!bossToxicZones.length || !scene) return;
    const zone = bossToxicZones[Math.floor(Math.random()*bossToxicZones.length)];
    if (!zone || !zone.gfx || !zone.gfx.active) return;
    const half = zone.w/2;
    const sx = zone.x - half + Math.random()*zone.w;
    const sy = zone.y + 6;
    const tint = zone.kind === "lava" ? [0xff8800,0xffdd00,0xff5500] : [0x44ff44,0x00ff66,0x88ff88];
    const splash = scene.add.particles(0,0,"spark_item",{
      x:sx, y:sy, speed:{min:60,max:170}, angle:{min:255,max:285},
      lifespan:420, quantity:7, scale:{start:0.85,end:0}, gravityY:420, tint
    });
    scene.time.delayedCall(380, ()=>{ try{ splash.destroy(); }catch{} });
  }
  // Verifica se o jogador está numa zona tóxica — reaproveita bossHitPlayer
  // (dano seguro dentro da arena de boss) em vez do hitByHazard normal (que
  // reiniciaria o jogador no spawn do NÍVEL, não da arena).
  function updateToxicZones() {
    if (!bossToxicZones.length || !player || !player.body || invuln) return;
    const pb = player.body;
    bossToxicZones.some(z => {
      const half = z.w/2;
      const inX = pb.right > z.x - half + 4 && pb.left < z.x + half - 4;
      const inY = pb.bottom >= z.y - 2 && pb.top < z.y + 24;
      if (inX && inY) { bossHitPlayer(sceneRef, null, z.kind === "lava" ? "🏭 Zona poluída!" : "☠️ Zona tóxica!"); return true; }
      return false;
    });
  }
  function spawnMiniViruses(scene, count) {
    // CORRIGIDO — x ia de 350 a 1250, herdado da arena antiga (1600px de
    // largura, antes da conversão para "boss clássico à Mario"); nas
    // arenas atuais (960px) isso mandava vírus para fora do ecrã, à direita
    // da câmara. Agora usa a largura real da arena do boss em combate, com
    // uma margem de 60px de cada lado.
    const worldW = (bossState && bossState.def.arena && bossState.def.arena.worldW) || 960;
    for (let i=0;i<count;i++){
      const x = 60 + Math.random()*(worldW-120);
      const v = malwareGroup.create(x, 320 + Math.random()*100, "vilao_round");
      v.setScale(0.7).setTint(0x30c060).setData("isMiniHazard", true);
      v.body.setAllowGravity(false);
      v.setCollideWorldBounds(true); v.setBounce(1,1);
      const dirX = Math.random() < 0.5 ? -1 : 1, dirY = Math.random() < 0.5 ? -1 : 1;
      v.setVelocity(dirX * (40+Math.random()*40), dirY * (20+Math.random()*20));
      bossMiniViruses.push(v);
    }
  }
  function maintainMiniViruses(scene, desiredCount) {
    if (!inBossFight || !bossState || bossState.phase !== "platform" || !bossState.def.contaminatedArena) return;
    bossMiniViruses = bossMiniViruses.filter(v => v && v.active);
    const missing = desiredCount - bossMiniViruses.length;
    if (missing > 0) spawnMiniViruses(scene, missing);
  }
  function clearMiniViruses() {
    bossMiniViruses.forEach(v => { try{ if(v.active) v.destroy(); }catch{} });
    bossMiniViruses = [];
  }


  // ---- Movimento "blink" (Monstro da Ignorância): some e reaparece noutro sítio ----
  function doBossBlink(scene) {
    if (!inBossFight || !bossState || bossState.phase !== "platform") return;
    const b = bossState.sprite;
    if (!b || !b.active) return;
    scene.tweens.add({ targets:b, alpha:0, duration:220, onComplete: () => {
      if (!bossState || !bossState.sprite || !bossState.sprite.active) return;
      const arenaSpots = bossState.def.arena?.spawnSpots;
      const spots = arenaSpots && arenaSpots.length ? arenaSpots : [350, 800, 1250];
      const nx = spots[Math.floor(Math.random()*spots.length)];
      const ny = bossState.def.bossY != null ? bossState.def.bossY : 380;
      b.x = nx; b.y = ny;
      if (b.body) b.body.reset(nx, ny);
      showFloat(scene, nx, ny-60, "❓", "#8a5cff");
      scene.tweens.add({ targets:b, alpha:1, duration:220 });
    }});
  }

  // ---- Movimento "teleport" (Guardião das Sombras): salta entre 3 pontos fixos ----
  function doBossTeleport(scene) {
    if (!inBossFight || !bossState || bossState.phase !== "platform") return;
    const b = bossState.sprite;
    if (!b || !b.active) return;
    // Aviso ("vou desaparecer!") — antes o Guardião desaparecia sem qualquer
    // sinal prévio, o que podia parecer injusto (sobretudo com o
    // teleportDelay mais curto que os outros bosses "teleport"). Um brilho a
    // crescer no sítio onde ele está, ~320ms antes do salto em si, dá a uma
    // criança tempo de reagir sem tirar a imprevisibilidade do PARA ONDE vai
    // reaparecer (isso continua só a decidir-se no fim destes 320ms).
    ensureAudio(); beep({freq:640,dur:0.09,type:"sine",vol:0.03,slideTo:920});
    const warnGlow = scene.add.circle(b.x, b.y, 8, 0xffffff, 0).setDepth(5);
    scene.tweens.add({
      targets: warnGlow, radius: 46, alpha: { from: 0, to: 0.55 }, duration: 320, ease: "Sine.easeOut",
      onComplete: () => { try{ warnGlow.destroy(); }catch{} }
    });
    scene.time.delayedCall(320, () => {
      // CORRIGIDO — este era o bloqueio total ao entrar em combate com o
      // Guardião das Sombras. O tween acima e este delayedCall tinham AMBOS
      // 320ms — ao dispararem no mesmo instante, havia uma corrida: se este
      // delayedCall destruísse warnGlow antes de o tween processar o seu
      // último frame, o Phaser tentava continuar a atualizar a propriedade
      // "radius" num objeto já destruído (internamente nulo) e lançava
      // "Cannot set properties of null (setting 'radius')" — um erro por
      // apanhar que travava o motor de jogo por completo (nada respondia
      // mais). scene.tweens.killTweensOf() ANTES do destroy() garante que o
      // tween para de vez, em vez de tentar mais um frame de animação num
      // alvo que já não existe.
      if (warnGlow) { try{ scene.tweens.killTweensOf(warnGlow); }catch{} try{ warnGlow.destroy(); }catch{} }
      // Segurança: se o combate acabou/reiniciou durante estes 320ms
      // (ex.: o jogador derrotou o boss mesmo antes do aviso terminar),
      // não continuar para o teletransporte em si.
      if (!inBossFight || !bossState || bossState.phase !== "platform" || !b.active) return;
      const arenaSpots = bossState.def.arena?.spawnSpots;
      const spots = arenaSpots && arenaSpots.length ? arenaSpots : [300, 800, 1300];
      const nx = spots[Math.floor(Math.random()*spots.length)];
      // bossY (opt-in) em vez do antigo y=380 fixo — um boss "clássico à Mario"
      // (stompBoss) tem de reaparecer sempre à altura do chão da SUA arena,
      // para ficar ao alcance de um salto normal; y=380 fixo deixava-o a
      // flutuar bem acima do chão nas arenas mais pequenas (960px), fora de
      // alcance. Continua a usar 380 por omissão para não alterar bosses
      // "teleport" antigos que não definam bossY.
      const ny = bossState.def.bossY != null ? bossState.def.bossY : 380;
      scene.cameras.main.flash(120, 20, 20, 50);
      b.x = nx; b.y = ny;
      if (b.body) b.body.reset(nx, ny);
      ensureAudio(); beep({freq:220,dur:0.10,type:"sawtooth",vol:0.05,slideTo:120});
    });
  }

  // ---- Livros do Monstro da Ignorância: a maioria são bons (dourados, apanha!),
  // um em cada 4 é mau (escuro com X vermelho, foge!) — bem distintos visualmente
  // de propósito, para uma criança conseguir decidir só a olhar, sem ler nada. ----
  function doBossThrowBook(scene) {
    if (!inBossFight || !bossState || bossState.phase !== "platform") return;
    const b = bossState.sprite;
    if (!b || !b.active) return;
    const badChance = (bossState.badBookChance != null) ? bossState.badBookChance : 0.25;
    const isBad = Math.random() < badChance;
    const key = isBad ? "boss_proj_badbook" : "boss_proj_book";
    const book = itemsGroup.create(b.x, b.y, key);
    book.setDepth(2).setData(isBad ? "bossProjBad" : "bossProjGood", true);
    book.body.setAllowGravity(true);
    book.body.setGravityY(260);
    const towardPlayer = player.x < b.x ? -1 : 1;
    book.setVelocity(towardPlayer * (110 + Math.random()*60), -220 - Math.random()*60);
    book.setAngularVelocity(isBad ? 260 : 160);
    scene.time.delayedCall(3200, () => { if (book.active) book.destroy(); });
  }

  // ---- Movimento do Monstro da Ignorância (redesenho): anda devagar pela
  // arena e, de vez em quando, dá um pequeno salto — só personalidade
  // visual, nunca desaparece nem teletransporta. ----
  function doBossHop(scene) {
    if (!inBossFight || !bossState || bossState.phase !== "platform") return;
    const b = bossState.sprite;
    if (!b || !b.active) return;
    const baseY = bossState.def.bossY != null ? bossState.def.bossY : bossState.baseY;
    scene.tweens.add({ targets:b, y: baseY-34, duration:180, yoyo:true, ease:"Quad.easeOut" });
  }

  // ---- Ataque do Monstro da Ignorância (redesenho): bolas ❓ que saltitam
  // devagar pelo chão — lentas e fáceis de ver/evitar, nunca voam direto à
  // cabeça do jogador. Substituem os livros/fake news do combate antigo. ----
  function doBossRollQmark(scene, isFollowUp) {
    if (!inBossFight || !bossState || bossState.phase !== "platform") return;
    const b = bossState.sprite;
    if (!b || !b.active) return;
    const def = bossState.def;
    // qmarkShotCount conta quantos ataques este boss já disparou neste
    // combate (posto a 0 em startBossFight). Usado por forceFirstOrbRight
    // (opt-in em data-bosses.js) para o 1º ataque ir sempre para a direita,
    // independentemente de onde o VanBerto's estiver — só a partir do 2º
    // ataque é que persegue mesmo o jogador.
    const shotIdx = bossState.qmarkShotCount || 0;
    bossState.qmarkShotCount = shotIdx + 1;
    const isForcedFirstShot = (shotIdx === 0 && def.forceFirstOrbRight);
    const towardPlayer = isForcedFirstShot
      ? 1
      : (player.x < b.x ? -1 : 1);
    const q = itemsGroup.create(b.x, b.y - 10, def.orbTexture || "boss_proj_qmark");
    if (def.orbTint != null) q.setTint(def.orbTint);
    q.setDepth(2).setData("bossProjQmark", true);
    q.body.setAllowGravity(true);
    q.body.setGravityY(480);
    q.body.setBounce(0.5, 0);
    // CORRIGIDO (pedido: "o 2º boss continua a ir direito ao VanBerto's no
    // 1º disparo"): o Vírus Gigante nasce perto do limite direito da sua
    // arena (worldW-200, e a arena dele só tem 960px de largura — ver
    // spawnBossSprite/data-bosses.js), por isso a bola forçada para a
    // direita só percorria ~200px antes de bater no limite do mundo. Com
    // setCollideWorldBounds(true) + setBounce(0.5,0) ela ressaltava e
    // voltava mesmo a direito ao jogador, anulando a intenção de
    // forceFirstOrbRight (dar um 1º ataque "inofensivo"). Para o disparo
    // forçado, desliga-se a colisão com os limites do mundo — a bola sai
    // simplesmente de cena pela direita (é destruída aos 4500ms de
    // qualquer forma) em vez de voltar. Todos os outros disparos (a partir
    // do 2º, e qualquer boss sem forceFirstOrbRight) mantêm o
    // comportamento antigo, incluindo o ressalto normal nas plataformas.
    q.body.setCollideWorldBounds(!isForcedFirstShot);

    // Personalidade do arremesso (pedido: os 4 bosses tinham exactamente o
    // mesmo projétil físico — só a textura/tint mudavam). Cada boss "opt-in"
    // a uma pequena variação de trajectória própria, tudo por cima da mesma
    // base (gravidade 480, bounce 0.5) para continuar previsível/justo.
    if (def.hookDrift) {
      // Anzol do Monstro do Phishing: lançamento bem mais horizontal e
      // rápido (como um lance de cana de pesca), que "assenta" a meio do
      // ar — a velocidade horizontal cai de repente aos 380ms, como se o
      // anzol tivesse ficado sem linha e começasse só a cair/arrastar.
      q.setVelocity(towardPlayer * 170, -150);
      scene.time.delayedCall(380, () => {
        if (q.active && q.body) q.body.setVelocityX(towardPlayer * 45);
      });
    } else if (def.homingDrift) {
      // Orbe do Espião das Sombras: parte mais devagar que os outros 3, mas
      // vai sendo ligeiramente "puxada" na direção do VanBerto's nos
      // primeiros ~600ms de voo (pequenos empurrões, sempre com um teto de
      // velocidade) — não é perseguição perfeita, só o suficiente para
      // parecer que o boss está mesmo a mirar, em vez de atirar às cegas.
      q.setVelocity(towardPlayer * 55, -100);
      const homingTimer = scene.time.addEvent({
        delay: 150, repeat: 3,
        callback: () => {
          if (!q.active || !q.body) { try{homingTimer.remove(false);}catch{} return; }
          const dir = (player.x < q.x) ? -1 : 1;
          q.body.setVelocityX(Phaser.Math.Clamp(q.body.velocity.x + dir * 18, -110, 110));
        }
      });
      bossTimers.push(homingTimer);
    } else {
      q.setVelocity(towardPlayer * 90, -120);
    }
    q.setAngularVelocity(towardPlayer * 130);

    if (def.splitOnBounce) {
      // Micróbio do Vírus Gigante: ao primeiro toque numa plataforma,
      // "parte" em 2 micróbios mais pequenos que se afastam um do outro —
      // sensação de vírus a replicar-se, sem precisar de arte nova (reusa
      // a mesma textura, só mais pequena). hasSplit evita que os próprios
      // filhos (que não têm este collider especial) voltassem a partir-se.
      let hasSplit = false;
      scene.physics.add.collider(q, platforms, () => {
        if (hasSplit || !q.active) return;
        hasSplit = true;
        spawnBossGermSplit(scene, q.x, q.y, def);
        q.destroy();
      });
    } else {
      scene.physics.add.collider(q, platforms);
    }
    scene.time.delayedCall(4500, () => { if (q.active) q.destroy(); });

    // Ataque duplo (pedido "mais género Mario" — o boss fica mais intenso
    // nos seus próprios ataques, sem precisar de nenhum perigo novo no
    // chão): cada arremesso vem acompanhado de um 2º, um pouco atrás, como
    // um boss clássico a atirar em sequência. Antes só acontecia na 2ª
    // fúria (desesperada) de qualquer boss (doubleThrowAtMaxRage); o Robô
    // do Spam agora fá-lo sempre (alwaysDoubleThrow, opt-in em
    // data-bosses.js) — cartas de spam vêm sempre aos pares, é a sua
    // assinatura, não só quando está a perder. isFollowUp evita uma cadeia
    // infinita (o 2º disparo nunca gera um 3º, mesmo com as duas condições
    // reunidas). doubleThrowFromRage1 (nova, só Monstro do Phishing): este
    // boss passa a atirar em par já na 1ª fúria (rageLevel>=1), uma fúria
    // mais cedo que os outros 3 (que só duplicam na 2ª/desesperada) — dá-lhe
    // uma escalada própria em vez de só ficar mais rápido como antes.
    if (!isFollowUp && ((def.doubleThrowAtMaxRage && bossState.rageLevel >= 2) || def.alwaysDoubleThrow || (def.doubleThrowFromRage1 && bossState.rageLevel >= 1))) {
      scene.time.delayedCall(260, () => doBossRollQmark(scene, true));
    }
  }

  // Os 2 micróbios-filho de spawnBossGermSplit (ver splitOnBounce acima) —
  // mais pequenos, mais rápidos a espalhar-se, com um tempo de vida mais
  // curto que o micróbio original (não seria justo ficarem tanto tempo em
  // jogo como o "pai").
  function spawnBossGermSplit(scene, x, y, def) {
    [-1, 1].forEach(dir => {
      const child = itemsGroup.create(x, y - 4, def.orbTexture || "boss_proj_qmark");
      if (def.orbTint != null) child.setTint(def.orbTint);
      child.setScale(0.62).setDepth(2).setData("bossProjQmark", true);
      child.body.setAllowGravity(true);
      child.body.setGravityY(480);
      child.body.setBounce(0.5, 0);
      child.body.setCollideWorldBounds(true);
      child.setVelocity(dir * 140, -180);
      child.setAngularVelocity(dir * 200);
      scene.physics.add.collider(child, platforms);
      scene.time.delayedCall(2600, () => { if (child.active) child.destroy(); });
    });
  }

  // ---- Baforada de fumo do Poluidor Mecânico (marca própria do boss — ver
  // smokePuffEvery em data-bosses.js): puramente atmosférico, nunca tira
  // vida nem colide com o jogador — só uma nuvem cinzenta a subir da
  // chaminé, que ofusca ligeiramente aquela zona da arena por instantes.
  // Pedido: os 4 bosses "stomp" partilhavam exactamente a mesma receita
  // (andar/flutuar/teleportar + bola ❓); isto dá ao Poluidor uma
  // personalidade visual só sua, condizente com o tema industrial/poluente. ----
  function doBossSmokePuff(scene) {
    if (!inBossFight || !bossState || bossState.phase !== "platform") return;
    const b = bossState.sprite;
    if (!b || !b.active) return;
    const chimneyY = b.y - (b.displayHeight/2 || 50) - 4;
    const puff = scene.add.particles(0, 0, "spark_item", {
      x: b.x, y: chimneyY, speed:{min:20,max:55}, angle:{min:260,max:280},
      lifespan:1700, quantity:11, scale:{start:1.5,end:3.4}, alpha:{start:0.4,end:0},
      tint:[0x9a9a9a,0x6a6a6a,0xc4c4c4], gravityY:-14
    });
    scene.time.delayedCall(750, () => { try{puff.destroy();}catch{} });
    ensureAudio(); beep({freq:110,dur:0.10,type:"sine",vol:0.02,slideTo:70});
  }

  // ---- Animação "idle" de braços e piscar de olhos, para os bosses deixarem
  // de parecer estáticos entre golpes — os 4 bosses têm as suas próprias
  // variantes de textura (ver textures.js). Ambas ignoradas durante o "ouch"
  // (bossState.squishing) para não interromperem a reação de dor, e durante
  // qualquer fase que não seja "platform" (ex.: intro, derrota). ----
  function doBossIdleArms(scene) {
    // rageLevel>0: a cara já está "zangada"/vermelha (ver bossEnterRage) —
    // não voltar a trocar para braços normais/repouso por cima disso.
    if (!inBossFight || !bossState || bossState.phase !== "platform" || bossState.squishing || bossState.rageLevel > 0) return;
    const b = bossState.sprite;
    if (!b || !b.active) return;
    const id = bossState.def.id;
    const wavingKey = "boss_" + id, restKey = "boss_" + id + "_armsdown";
    if (!scene.textures.exists(restKey)) return; // segurança: só troca se a variante existir
    bossState.armsWaving = !bossState.armsWaving;
    const nextKey = bossState.armsWaving ? wavingKey : restKey;
    if (scene.textures.exists(nextKey)) b.setTexture(nextKey);
  }
  function doBossIdleBlink(scene) {
    // (pedido: "mais expressões, piscar o olho") — ao contrário de
    // doBossIdleArms, este continua a correr mesmo com bossState.rageLevel
    // > 0: mesmo zangado, o boss deve continuar a piscar os olhos de vez
    // em quando, para não ficar com uma cara "presa" e sem vida durante o
    // resto do combate. restoreKey (abaixo) já garante que volta sempre
    // ao estado correto — normal OU zangado, conforme onde estava.
    if (!inBossFight || !bossState || bossState.phase !== "platform" || bossState.squishing) return;
    const b = bossState.sprite;
    if (!b || !b.active) return;
    const id = bossState.def.id;
    const blinkKey = "boss_" + id + "_blink";
    if (!scene.textures.exists(blinkKey)) return;
    const restoreKey = b.texture.key; // volta ao estado (braços) em que estava antes de piscar
    b.setTexture(blinkKey);
    // NOVO (pedido: "não vejo... mexer os olhos") — 140ms era rápido demais
    // para se notar durante o jogo; passa a 230ms. O pequeno "pop" de escala
    // (leve aumento e volta) ajuda o olho a apanhar o instante da troca,
    // que de outra forma passa despercebido num sprite pequeno em movimento.
    const baseScaleY = b.scaleY, baseScaleX = b.scaleX;
    scene.tweens.add({
      targets: b, scaleY: baseScaleY * 1.08, scaleX: baseScaleX * 1.04,
      duration: 90, yoyo: true, ease: "Sine.easeOut",
      onComplete: () => { if (b.active) { b.scaleY = baseScaleY; b.scaleX = baseScaleX; } }
    });
    scene.time.delayedCall(230, () => {
      if (b.active && bossState && !bossState.squishing && scene.textures.exists(restoreKey)) b.setTexture(restoreKey);
    });
  }
  // Risada trocista (pedido: "mais expressões... rir" / "os bosses deviam
  // ficar contentes ao acertar-te") — mostra por instantes a cara de riso
  // maléfico ("_laugh"), com um pequeno saltinho de "contentamento", e
  // depois volta ao estado em que estava. Extraído para função própria
  // para poder ser chamado tanto na hora (bossHitPlayer) como em atraso
  // (squishBoss, ver pendingLaugh) — antes, um acerto do boss EXATAMENTE
  // enquanto ele ainda estava a reagir ao teu último salto na cabeça
  // (bossState.squishing) fazia-o não reagir rigorosamente NADA a ter-te
  // atingido — a troca de golpes onde a criança mais precisa de perceber
  // com clareza o que aconteceu, e por isso a queixa "às vezes nem dá
  // para perceber que perdi uma vida".
  function showBossLaugh(scene) {
    if (!bossState || !bossState.sprite || !bossState.sprite.active || bossState.squishing) return;
    const bb = bossState.sprite;
    const laughKey = "boss_" + bossState.def.id + "_laugh";
    if (!scene.textures.exists(laughKey)) return;
    const beforeKey = bb.texture.key;
    bb.setTexture(laughKey);
    const baseScaleX = bb.scaleX, baseScaleY = bb.scaleY;
    scene.tweens.add({
      targets: bb, scaleX: baseScaleX * 1.1, scaleY: baseScaleY * 1.1,
      duration: 140, yoyo: true, ease: "Quad.easeOut",
      onComplete: () => { if (bb.active) { bb.scaleX = baseScaleX; bb.scaleY = baseScaleY; } }
    });
    scene.time.delayedCall(650, () => {
      if (bb.active && bossState && !bossState.squishing && scene.textures.exists(beforeKey)) bb.setTexture(beforeKey);
    });
  }

  // Reação exagerada tipo desenho animado sempre que QUALQUER boss é atingido:
  // achata-se por meio segundo (textura "_ouch" + squash) e volta ao normal,
  // com um tremor (pequeno abanão lateral) por cima, para se sentir mesmo
  // "atingido" e não só espremido. bossState.squishing impede a animação
  // idle (braços/piscar) de trocar a textura por baixo desta reação.
  // Chamada de forma centralizada a partir de damageBoss() — assim TODOS os
  // bosses reagem da mesma forma a um acerto, não só o Monstro da Ignorância
  // (que a usava antes só a partir de handleStompBossTouch). Se um boss ainda
  // não tiver a variante "_ouch" própria (ver textures.js), simplesmente não
  // troca de textura — o tremor e o squash continuam a acontecer na mesma.
  function squishBoss(scene, b) {
    if (!b || !b.active) return;
    const normalTex = b.texture.key;
    const ouchKey = "boss_" + bossState.def.id + "_ouch";
    if (bossState) bossState.squishing = true;
    if (scene.textures.exists(ouchKey)) b.setTexture(ouchKey);
    const baseScaleY = b.scaleY, baseScaleX = b.scaleX;
    const baseX = b.x, baseAngle = b.angle;
    // Tremor: 4 abanões rápidos e decrescentes de lado a lado, em paralelo
    // com o squash — dá a sensação de choque/dor, não só de ser espremido.
    scene.tweens.add({
      targets: b, x: baseX - 6, angle: baseAngle - 5,
      duration: 55, yoyo: true, repeat: 3, ease: "Sine.easeInOut",
      onComplete: () => { if (b.active) { b.x = baseX; b.angle = baseAngle; } }
    });
    // NOVO (pedido: "não vejo os bosses a bufar") — antes durava só 130ms
    // (260ms com o yoyo) E vinha muito distorcido (scaleY 0.55/scaleX 1.2),
    // o suficiente para a cara "_ouch" nunca chegar a ler-se a tempo. Mais
    // lento (200ms → 400ms ao todo) e menos esmagado, para a criança
    // conseguir mesmo ver a cara de dor antes de voltar ao normal.
    scene.tweens.add({
      targets: b, scaleY: baseScaleY * 0.7, scaleX: baseScaleX * 1.12,
      duration: 200, yoyo: true, ease: "Quad.easeOut",
      onComplete: () => {
        if (b.active && scene.textures.exists(normalTex)) b.setTexture(normalTex);
        if (b.active) { b.scaleY = baseScaleY; b.scaleX = baseScaleX; }
        if (bossState) bossState.squishing = false;
        // A risada tinha ficado pendente (ver bossHitPlayer) porque o boss
        // ainda estava neste squish quando te acertou — mostra-a só agora.
        if (bossState && bossState.pendingLaugh) {
          bossState.pendingLaugh = false;
          showBossLaugh(scene);
        }
      }
    });
  }

  // Deteta se o jogador está a saltar em cima do Monstro (queda + por cima
  // da cabeça) ou a tocar-lhe de lado — mecânica "3 saltos na cabeça",
  // reaproveitando damageBoss()/bossHitPlayer() já existentes para o resto.
  function handleStompBossTouch(b) {
    if (sceneRef.time.now < bossState.hitCooldownUntil) return true;
    const pBody = player.body;
    const playerBottom = player.y + (pBody.halfHeight || 24);
    const bossTop = b.y - (b.displayHeight/2 || 60);
    // >=0 (em vez de >0) inclui o frame exato no topo do arco do salto, em
    // que a velocidade vertical ainda não passou a positiva mas o jogador já
    // está claramente a começar a cair sobre o boss.
    const isFalling = pBody.velocity.y >= 0;
    // Tolerância do golpe "certeiro" — ligeiramente mais generosa (22->30px)
    // para não recusar saltos que pareciam visualmente bons só por 1-2 frames
    // de física.
    const STOMP_TOLERANCE = 30;
    if (isFalling && playerBottom <= bossTop + STOMP_TOLERANCE) {
      bossState.hitCooldownUntil = sceneRef.time.now + 550;
      player.setVelocityY(-380);
      // squishBoss() já é chamado dentro de damageBoss() — não repetir aqui.
      ensureAudio(); beep({freq:500,dur:0.09,type:"square",vol:0.07,slideTo:900});
      damageBoss(sceneRef, b.x, b.y-70, "👣 Salto certeiro!", 0.008);
      return true;
    }
    // Corrige o erro reportado: um salto que o jogador claramente TENTOU
    // (estava a cair, ainda por cima da metade de cima do boss) mas que a
    // deteção não valida por poucos pixels NUNCA deve custar uma vida —
    // apenas ressalta o VanBerto's, sem consequências, para poder tentar de
    // novo. Só um toque que não é de todo uma tentativa de salto (o jogador
    // não estava a cair, ou já ia bem abaixo do meio do boss — contacto
    // lateral ou por baixo) é que dói a sério.
    const bossMidY = b.y;
    const nearMissJumpAttempt = isFalling && playerBottom <= bossMidY;
    if (nearMissJumpAttempt) {
      // Sem isto, este ramo disparava em TODOS os frames em que os corpos
      // continuassem sobrepostos (o overlap do Phaser corre a cada tick de
      // física) — som e ressalto a repetir em catadupa em vez de um único
      // empurrão limpo. Um cooldown curto (bem mais curto que o do golpe
      // certeiro) já chega para dar um frame de folga sem atrasar uma
      // tentativa de salto a sério logo a seguir.
      bossState.hitCooldownUntil = sceneRef.time.now + 300;
      player.setVelocityY(-220);
      ensureAudio(); beep({freq:340,dur:0.06,type:"square",vol:0.05,slideTo:260});
      return true;
    }
    // Nome do próprio boss em vez de "Monstro" fixo — esta função passou a
    // ser partilhada pelos 4 bosses "stomp", não só pelo Monstro da
    // Ignorância (ver conversão dos outros 3 bosses para esta mesma
    // mecânica); o aviso tinha ficado esquecido com o texto de quando só
    // servia para ele.
    bossHitPlayer(sceneRef, b, `🙈 Cuidado com ${bossState.def.name}!`);
    return true;
  }

  // ---- Sequência de derrota de um boss "stomp" (pedido: substitui por
  // completo a antiga cena calma — sentado, a ler um livro, polegar para
  // cima). Agora fecha o arco emocional do combate: riso maléfico na
  // entrada (ver spawnBossSprite) → cara vermelha ao escalar em fúria (ver
  // bossEnterRage) → aqui, ao perder, fica triste (textura "_sad", ver
  // textures.js) e foge a correr da arena, antes de seguir para a pergunta
  // final. ----
  function startBossStompDefeat() {
    if (!bossState) return;
    bossState.phase = "defeat";
    const b = bossState.sprite;
    const def = bossState.def;
    // Corpo continua com física ligada de propósito (ao contrário de antes)
    // — precisa de se poder mover a fugir, mais abaixo. handleBossMalwareCollision
    // já absorve qualquer toque em silêncio fora da fase "platform", por isso
    // não há risco de o jogador "levar dano" de um boss já derrotado.
    if (b) { b.setVelocity(0,0); b.clearTint(); }
    // Véu de sombra do Guardião das Sombras (bossOverlay, ver movementType
    // "teleport" em startBossFight): só a função de derrota dos bosses SEM
    // stompBoss o destruía — como agora TODOS os bosses são stompBoss, esse
    // caminho ficou morto e o véu nunca mais era removido ao vencer o
    // Guardião, ficando a piscar por cima dos níveis seguintes.
    if (bossOverlay) { try{bossOverlay.destroy();}catch{} bossOverlay = null; }
    // Boss vencido — os temporizadores de combate (saltos, bolas, piscar, etc.)
    // já não têm nada para fazer a partir daqui (as suas callbacks verificam a
    // fase e ficam em no-op fora de "platform"), mas continuavam literalmente a
    // disparar até ao início do combate seguinte ou ao carregar do próximo
    // nível (ver loadLevel/startBossFight). Parar aqui evita esse trabalho
    // desnecessário assim que a fase de derrota começa.
    bossTimers.forEach(t=>{try{t.remove(false);}catch{}}); bossTimers=[];
    destroyBossHpBar();
    itemCountText.setText("");
    tipText.setText("");
    const sadKey = "boss_" + def.id + "_sad";
    if (b && b.active && sceneRef.textures.exists(sadKey)) b.setTexture(sadKey);
    // Choro contínuo (pedido: "chorar quando perde e vai embora") — em vez
    // de só a lágrima estática já desenhada na textura "_sad", pinga
    // lágrimas de verdade da cara do boss enquanto foge, até começar a
    // desvanecer (ver o delayedCall de 1750ms mais abaixo, que também
    // pára este temporizador).
    const tearTimer = sceneRef.time.addEvent({
      delay: 220, loop: true,
      callback: () => {
        if (!b || !b.active) { try{ tearTimer.remove(false); }catch{} return; }
        const tx = b.x + (b.flipX ? 14 : -14);
        const ty = b.y - (b.displayHeight ? b.displayHeight * 0.18 : 20);
        const drop = sceneRef.add.particles(0, 0, "spark_item", {
          x: tx, y: ty, speed: { min: 15, max: 35 }, angle: { min: 78, max: 102 },
          lifespan: 420, quantity: 1, scale: { start: 0.55, end: 0.15 },
          gravityY: 260, tint: 0x7fc8ff
        });
        sceneRef.time.delayedCall(450, () => { try{ drop.destroy(); }catch{} });
      }
    });
    bossState.tearTimer = tearTimer;
    // Meio segundo de cara triste antes de fugir — dá tempo à criança de
    // "ler" a expressão antes de o boss se ir embora.
    sceneRef.time.delayedCall(500, () => {
      if (!b || !b.active) return;
      const worldW = def.arena?.worldW || 1600;
      const fleeDir = (b.x > worldW/2) ? 1 : -1; // foge para a borda mais próxima
      // Desliga a colisão com os limites do mundo só para este momento — sem
      // isto o boss ressaltava na borda em vez de sair mesmo da arena, o que
      // estragaria a sensação de fuga.
      if (b.body) b.body.setCollideWorldBounds(false);
      b.setVelocity(fleeDir * 260, 0);
      b.setFlipX(fleeDir < 0);
      // Pequeno solavanco vertical a cada passada, para parecer mesmo uma
      // corrida e não um deslize suave.
      sceneRef.tweens.add({ targets:b, y:b.y-9, duration:130, yoyo:true, repeat:8, ease:"Quad.easeOut" });
      ensureAudio(); beep({freq:180,dur:0.08,type:"square",vol:0.03,slideTo:90});
    });
    sceneRef.time.delayedCall(1750, () => {
      if (bossState && bossState.tearTimer) { try{ bossState.tearTimer.remove(false); }catch{} bossState.tearTimer = null; }
      if (!b || !b.active) return;
      sceneRef.tweens.add({ targets:b, alpha:0, duration:350,
        onComplete: () => { try{ if (b.body) b.body.setEnable(false); }catch{} } });
    });
    sceneRef.time.delayedCall(2350, () => { if (bossState && bossState.phase === "defeat") startBossQuizPhase(); });
  }

  // ---- Festa do VanBerto's ao perderes todas as vidas durante um combate de
  // boss (pedido, "tipo Super Mario"): antes de o ecrã de "Game Over"
  // aparecer, o boss celebra por instantes — reaproveita a mesma cara de
  // riso maléfico já criada para a intro (ver spawnBossSprite/textures.js),
  // com uns pequenos saltos de festa por cima. Só chamada a partir de
  // bossHitPlayer, já dentro do contexto de um combate de boss. ----
  function triggerBossParty(scene) {
    if (!bossState) return;
    const b = bossState.sprite, def = bossState.def;
    if (!b || !b.active) return;
    const laughKey = "boss_" + def.id + "_laugh";
    if (scene.textures.exists(laughKey)) b.setTexture(laughKey);
    b.setVelocity(0,0);
    const baseY = b.y;
    scene.tweens.add({ targets:b, y: baseY-26, duration:220, yoyo:true, repeat:4, ease:"Quad.easeOut" });
    scene.tweens.add({
      targets:b, angle:{from:-8,to:8}, duration:220, yoyo:true, repeat:4, ease:"Sine.easeInOut",
      onComplete: () => { if (b.active) b.setAngle(0); }
    });
    ensureAudio(); beep({freq:520,dur:0.09,type:"square",vol:0.05,slideTo:780});
  }

  function updateBossFight(scene) {
    if (!inBossFight || !bossState || !bossState.sprite || !bossState.sprite.active) return;
    if (bossState.phase !== "platform") return;
    const b = bossState.sprite;
    const mt = bossState.def.movementType;
    const speedMult = bossState.speedMult || 1;
    if (mt === "wave") {
      // Relativo ao instante em que o combate começou (waveStartTime, ver
      // acima) — NUNCA a scene.time.now diretamente. Ver comentário nesse
      // ponto: usar o tempo absoluto da sessão fazia a onda começar num
      // ponto aleatório (dependente de há quanto tempo o jogo estava
      // aberto), incluindo, por vezes, mesmo em cima do jogador logo no
      // primeiro frame do combate.
      const elapsed = scene.time.now - (bossState.waveStartTime != null ? bossState.waveStartTime : scene.time.now);
      // wavePhaseOffset (opt-in, ver data-bosses.js): desloca o ponto de
      // partida da onda ao longo da curva, sem mexer em velocidade nem
      // amplitude. Pedido: "o Vírus Gigante morre quase logo ao começar" —
      // sem offset, t=0 coloca o boss mesmo no CENTRO da arena (480),
      // apenas ~80px do ponto de partida do VanBerto's (400) — dá muito
      // pouca distância/tempo de reação logo que o jogador ganha controlo.
      // Math.PI/2 arranca a onda no extremo mais LONGE do spawn (~690,
      // quase 290px de distância) em vez do centro, dando um instante real
      // para o jogador se orientar antes do boss se aproximar.
      const t = elapsed * 0.0016 * (bossState.def.waveSpeedMult || 1) * speedMult + (bossState.def.wavePhaseOffset || 0);
      // Relativo ao worldW da própria arena — tal como o "patrol" logo a
      // seguir já estava corrigido para isto (ver comentário aí). Antes
      // este movimento tinha um deslocamento fixo (-700) e um raio fixo
      // (480px), calibrados só para a arena antiga de 1600px; numa arena
      // "tamanho da janela" (960px, ex.: Vírus Gigante depois de passar a
      // stompBoss) isso empurrava o boss para fora do ecrã, para valores
      // de x negativos.
      const worldW = bossState.def.arena?.worldW || 1600;
      const centerX = worldW / 2;
      // waveSpeedMult (abaixo) só desacelera a FREQUÊNCIA da onda — mas a
      // velocidade de pico do movimento depende de frequência × amplitude.
      // O raio por omissão (até 480px, quase a arena toda de 960px) continuava
      // a dar picos de velocidade bem acima da patrulha dos outros bosses
      // mesmo já com waveSpeedMult reduzido — sentia-se "estranho"/demasiado
      // rápido a meio da oscilação. waveRange (opt-in, ver data-bosses.js)
      // deixa um boss pedir um raio mais pequeno; sem ele, mantém-se o
      // comportamento antigo para não mexer em bosses "wave" futuros.
      const range = bossState.def.waveRange != null
        ? Math.min(bossState.def.waveRange, centerX - 120)
        : Math.min(480, centerX - 120);
      // Antes: b.y usava sin(t*1.7) — uma frequência diferente da de b.x
      // (sin(t)) — o que desenhava uma curva de Lissajous, sem ciclo simples
      // de prever. Isso tornava este boss muito mais difícil de "ler" do que
      // os outros 3 (que só se movem num eixo, ou ficam parados entre
      // saltos), mesmo já com a velocidade reduzida (waveSpeedMult).
      // Agora X e Y usam o MESMO t (com cos em vez de sin no eixo Y, só
      // para dar o efeito de órbita) — isto desenha uma elipse simples e
      // sempre igual, uma volta completa por ciclo: fácil de prever depois
      // de a criança ver passar uma vez.
      b.x = centerX + Math.sin(t) * range;
      b.y = bossState.baseY + Math.cos(t) * 40;
      if (b.body) b.body.reset(b.x, b.y);
    } else if (mt === "patrol" || !mt) {
      const speed = (bossState.def.patrolSpeed || 110) * speedMult;
      // Margem relativa ao worldW da própria arena — antes estava fixa em
      // 1600, o que dava um raio de patrulha errado em arenas mais pequenas
      // (ex.: a arena "tamanho da janela" do Monstro da Ignorância, 960px).
      const worldW = bossState.def.arena?.worldW || 1600;
      const margin = Math.min(250, worldW * 0.26);
      if (b.x < margin) b.setVelocityX(speed);
      if (b.x > worldW - margin) b.setVelocityX(-speed);
    } else if (mt === "teleport") {
      // NOVO (pedido: "os bosses precisam de mais movimento") — antes disto,
      // este era o único dos 4 bosses SEM nenhum movimento contínuo: entre
      // teletransportes (geridos à parte por doBossTeleport, que continua a
      // definir b.x/b.y diretamente nos seus pontos fixos) ficava
      // completamente parado, só com a troca de braços/piscar de olhos do
      // idle. Um balanço vertical leve dá sensação de estar a pairar/flutuar
      // nas sombras em vez de "colado" ao sítio. Mesma técnica do "wave"
      // acima (posição direta + body.reset, já que este boss não usa
      // velocity) — amplitude pequena (8px) de propósito, para não mudar a
      // altura a que é preciso saltar-lhe em cima.
      const baseY = bossState.def.bossY != null ? bossState.def.bossY : bossState.baseY;
      b.y = baseY + Math.sin(scene.time.now * 0.0022) * 8;
      if (b.body) b.body.reset(b.x, b.y);
    }
    // "blink" continua a ser gerido pelo seu próprio timer (doBossBlink)

    drawBossHpBar();

    // Ícone 🔒/⭐ acompanha o boss e reflete se já podes tocar-lhe ou não
    if (bossLockIcon && bossLockIcon.active) {
      bossLockIcon.setPosition(b.x, b.y - (b.displayHeight/2 || 40) - 18);
      const wantIcon = starPower ? "⭐" : "🔒";
      if (bossLockIcon.text !== wantIcon) bossLockIcon.setText(wantIcon);
    }
    if (bossState.def.contaminatedArena) updateToxicZones();
  }

  // ---- Fases de raiva: chamado quando o boss perde uma vida (level 1 = zangado,
  // level 2 = desesperado). Só dispara uma vez por fase (rageLevel só sobe). ----
  function bossEnterRage(scene, level) {
    if (!bossState || bossState.rageLevel >= level) return;
    bossState.rageLevel = level;
    bossState.speedMult = (level === 1 ? 1.35 : 1.7) * (bossState.baseSpeedMult || 1);
    const def = bossState.def, b = bossState.sprite;

    // Acelerar os timers de movimento/ataque já existentes — o boss não ganha
    // ataques novos, só fica mais rápido e imprevisível, o que é suficiente
    // para se sentir a escalada sem complicar o combate para uma criança.
    if (bossState.blinkTimer) bossState.blinkTimer.delay = bossState.blinkBaseDelay / bossState.speedMult;
    if (bossState.teleTimer)  bossState.teleTimer.delay  = bossState.teleBaseDelay  / bossState.speedMult;
    if (bossState.bookTimer)  bossState.bookTimer.delay  = bossState.bookBaseDelay  / bossState.speedMult;
    if (bossState.orbTimer)   bossState.orbTimer.delay   = bossState.orbBaseDelay   / bossState.speedMult;
    // Idem para os bosses "stomp" (salto/bola ❓/fumo) — antes a escalada de
    // fúria só existia para bosses com fases próprias; os 4 bosses "clássicos
    // à Mario" ficavam sempre exactamente ao mesmo ritmo do 1º ao 3º salto.
    if (bossState.hopTimer)   bossState.hopTimer.delay   = bossState.hopBaseDelay   / bossState.speedMult;
    if (bossState.qmarkTimer) bossState.qmarkTimer.delay = bossState.qmarkBaseDelay / bossState.speedMult;
    if (bossState.smokeTimer) bossState.smokeTimer.delay = bossState.smokeBaseDelay / bossState.speedMult;

    // Escalada da arena contaminada/poluída (Vírus Gigante, Robô do Spam) —
    // 100% opt-in via def.contaminatedArena.escalations[level]; bosses sem
    // esse campo (Monstro, Guardião) ficam exatamente iguais a antes. Os 2
    // bosses que a usam escalam nas 2 fúrias (zonas cada vez mais largas).
    if (def.contaminatedArena && typeof def.contaminatedArena === "object") {
      const esc = def.contaminatedArena.escalations && def.contaminatedArena.escalations[level];
      if (esc) {
        if (esc.zones) spawnToxicZones(scene, esc.zones, def.contaminatedArena.hazardType);
        if (esc.virus != null) bossState.desiredVirusCount = esc.virus;
        // Reação visual ao chão a piorar (nova) — sem isto, o alargamento das
        // zonas era silencioso, fácil de não notar a meio da ação. Um flash
        // rápido na cor do próprio perigo (verde ácido / laranja lava) chama
        // a atenção exactamente no instante em que o chão fica mais perigoso.
        const flashRGB = def.contaminatedArena.hazardType === "lava" ? [255,120,20] : [40,220,80];
        scene.cameras.main.flash(260, flashRGB[0], flashRGB[1], flashRGB[2]);
      }
    }

    // Teletransporte-surpresa (nova, só Espião das Sombras — def.extraTeleportOnRage):
    // ao entrar em fúria (1ª ou 2ª), o Espião desaparece e reaparece de
    // imediato, além dos seus teletransportes normais por temporizador —
    // reforça a identidade de "difícil de apanhar quando está a perder",
    // dando-lhe uma escalada própria tal como o chão contaminado dá ao
    // Vírus/Robô e o ataque duplo mais cedo dá ao Monstro do Phishing.
    if (def.extraTeleportOnRage && (def.movementType === "teleport" || def.movementType === "blink")) {
      doBossTeleport(scene);
    }

    // Cara fica vermelha de raiva (pedido) — nova variante de textura
    // "_angry" (ver textures.js) se existir, + tint avermelhado por cima
    // (mais intenso na 2ª fúria/desesperada). Persiste até à derrota — ver
    // o guard bossState.rageLevel>0 em doBossIdleArms/doBossIdleBlink, que
    // deixa de sobrepor esta cara com a animação idle normal a partir daqui.
    if (b && b.active) {
      const angryKey = "boss_" + def.id + "_angry";
      if (scene.textures.exists(angryKey)) b.setTexture(angryKey);
      b.setTint(level === 1 ? 0xffb0a0 : 0xff6a5c);
      // NOVO (pedido: "não vejo... mudar o sorriso") — o tint vermelho por
      // si só chamava a atenção, mas escondia que a CARA também tinha
      // mudado de forma. Um pequeno solavanco de escala no instante exato
      // da troca ajuda a marcar essa mudança como um momento visível, não
      // só uma alteração de cor.
      const baseScaleY = b.scaleY, baseScaleX = b.scaleX;
      scene.tweens.add({
        targets: b, scaleY: baseScaleY * 1.18, scaleX: baseScaleX * 1.1,
        duration: 130, yoyo: true, ease: "Back.easeOut",
        onComplete: () => { if (b.active) { b.scaleY = baseScaleY; b.scaleX = baseScaleX; } }
      });
    }

    // O ícone flutuante 😠/😡 que existia aqui foi removido (pedido: nada de
    // emojis por cima do boss — a cara dele, já trocada acima para "_angry"
    // + tint, é que deve exprimir a fúria sozinha, tal como um boss clássico
    // à Mario nunca teve um ícone de emoção a flutuar por cima).
    if (bossRageIcon) { try{bossRageIcon.destroy();}catch{} bossRageIcon = null; }

    // Reação de câmara mais forte quanto mais zangado — sem exagerar, só o
    // suficiente para se notar a diferença entre as duas fases.
    scene.cameras.main.shake(level===1?160:240, level===1?0.008:0.014);
    scene.cameras.main.flash(level===1?140:200, 255, level===1?150:70, 60);

    // Fala curta do boss, flutuante por cima dele — não pausa o jogo nem abre
    // diálogo, só reforça a personalidade durante o combate, como pedido.
    const lines = def.rageLines || {};
    const text = level === 1 ? (lines.angry || "Ainda não acabou!") : (lines.desperate || "Não... não pode ser!");
    showFloat(scene, b ? b.x : bossState.baseX, (b ? b.y : bossState.baseY) - 74, text, level===1 ? "#ffae42" : "#ff4040");

    ensureAudio();
    beep({ freq: level===1?260:200, dur:0.16, type:"sawtooth", vol:0.06, slideTo: level===1?140:90 });
  }

  // Dano ao boss (1 HP) reutilizável — tanto o toque com Star Power (bosses normais)
  // como o Raio do Conhecimento (bosses com ataque especial) passam por aqui, para
  // as fases de raiva e o fim do combate funcionarem sempre da mesma forma.
  function damageBoss(scene, x, y, label = "💥 Boss atingido!", shakeAmount = 0.006) {
    if (!bossState) return;
    bossState.hp -= 1;
    scene.cameras.main.shake(100, shakeAmount);
    score += 20; scoreText.setText(`🌟 Pontos: ${score}`);
    showFloat(scene, x, y, label, "#ff6b35");
    // Reação visual de "atingido" (squash + tremor + textura "_ouch" se
    // existir) — chamada aqui, de forma centralizada, para se aplicar a
    // QUALQUER boss que leve dano, seja qual for a forma de o atingir
    // (salto, toque com Star Power ou ataque especial).
    if (bossState.sprite) squishBoss(scene, bossState.sprite);
    // Pequenas partículas no ponto de impacto — o jogador tem de "sentir"
    // que causou dano, além do tremor/textura "_ouch" que squishBoss já dá.
    const hitBurst = scene.add.particles(0, 0, "spark_item", {
      x, y, speed: { min: 60, max: 160 }, lifespan: 380, quantity: 12,
      scale: { start: 0.8, end: 0 }, angle: { min: 0, max: 360 },
      tint: [0xffd700, 0xff6b35, 0xffffff]
    });
    scene.time.delayedCall(340, () => { try{ hitBurst.destroy(); }catch{} });
    const hitsTaken = bossState.def.hp - bossState.hp;
    // Invulnerabilidade temporária do boss após ser atingido (~1.7s, dentro
    // do intervalo pedido de 1-2s, com piscar visível) — reaproveita o mesmo
    // hitCooldownUntil já usado por handleStompBossTouch/
    // handleBossMalwareCollision para bloquear novos toques, e acrescenta o
    // piscar que faltava, tal como o VanBerto's já faz quando perde uma vida
    // (ver setInvuln). Só corre se o boss continuar vivo — na derrota,
    // startBossStompDefeat()/startBossCollectPhase() tratam da transição
    // visual sozinhos, sem precisar de continuar a piscar.
    if (bossState.hp > 0 && bossState.sprite && bossState.sprite.active) {
      const b2 = bossState.sprite;
      const invulnMs = 1700;
      bossState.hitCooldownUntil = scene.time.now + invulnMs;
      if (bossState.invulnBlinkEvent) { try{ bossState.invulnBlinkEvent.remove(false); }catch{} }
      let blinkN = 0;
      bossState.invulnBlinkEvent = scene.time.addEvent({
        delay: 110, repeat: Math.floor(invulnMs/110),
        callback: () => {
          if (!b2.active || !bossState || bossState.sprite !== b2) return;
          blinkN++;
          b2.setAlpha(blinkN % 2 === 0 ? 1 : 0.35);
        }
      });
      scene.time.delayedCall(invulnMs, () => {
        if (bossState && bossState.invulnBlinkEvent) { try{ bossState.invulnBlinkEvent.remove(false); }catch{} bossState.invulnBlinkEvent=null; }
        if (b2 && b2.active) b2.setAlpha(1);
      });
    }
    if (bossState.def.stompBoss) {
      // Boss "clássico à Mario": contador de saltos no HUD + fala curta
      // (taunts) — e agora também a mesma escalada de fúria genérica dos
      // outros bosses (mais rápido e mais imprevisível a cada salto
      // certeiro), para o combate não ficar sempre ao mesmo ritmo do 1º ao
      // 3º (e último) salto. Só sobe até ao 2º salto — no 3º o boss já foi
      // derrotado, não há "fúria" nenhuma para mostrar.
      const stomps = hitsTaken;
      itemCountText.setText(`${bossState.def.stompLabel || "👣 Saltos"}: ${Math.max(0,stomps)}/${bossState.def.hp}`);
      const taunts = BOSS_HP_TAUNTS[bossState.def.id];
      if (taunts && bossState.hp > 0) {
        const key = bossState.hp === 2 ? "hp2" : bossState.hp === 1 ? "hp1" : "atStart";
        const pool = taunts[key];
        if (pool && pool.length) showFloat(scene, x, y-30, pool[Math.floor(Math.random()*pool.length)], "#ff9090");
      }
      if (hitsTaken > 0 && bossState.hp > 0) bossEnterRage(scene, Math.min(2, hitsTaken));
      // Momento "último fôlego" (opt-in via def.finalStandBurst — só o
      // Guardião das Sombras, por agora): dispara exactamente uma vez, ao
      // ficar com apenas 1 salto por dar (bossState.hp===1), independente
      // da fúria genérica acima. finalBurstDone evita repetir se o jogador
      // ainda tocar no boss mais vezes antes do 3º salto certeiro.
      if (bossState.def.finalStandBurst && bossState.hp === 1 && !bossState.finalBurstDone) {
        bossState.finalBurstDone = true;
        startBossFinalStandBurst(scene);
      }
    } else if (bossState.def.phases) {
      // Bosses com fases próprias não usam a escalada genérica — cada
      // acerto muda de fase com comportamento próprio.
      if (bossState.hp > 0) enterBossPhase(scene, bossState.def, bossState.hp);
    } else if (hitsTaken > 0 && bossState.hp > 0) {
      bossEnterRage(scene, Math.min(2, hitsTaken));
    }
    if (bossState.hp <= 0) {
      if (bossState.def.stompBoss) {
        if (bossState.def.epicDefeat) {
          // Golpe final mais espetacular (opt-in via def.epicDefeat, ver
          // data-bosses.js): um instante de "hitstop" (física congela por
          // 180ms — os timers/tweens continuam a correr por trás), um
          // flash branco e uma explosão maior do que a normal, antes da
          // já existente sequência de fuga (startBossStompDefeat). Dá ao
          // 3º salto certeiro um peso extra, como o golpe final de um
          // boss clássico.
          scene.physics.pause();
          scene.cameras.main.flash(220, 255, 255, 255);
          const bigBurst = scene.add.particles(0, 0, "spark_item", {
            x, y, speed: { min: 120, max: 320 }, lifespan: 600, quantity: 40,
            scale: { start: 1.3, end: 0 }, angle: { min: 0, max: 360 }, gravityY: 200,
            tint: [bossState.def.color, 0xffffff, 0xffd700]
          });
          scene.time.delayedCall(560, () => { try{ bigBurst.destroy(); }catch{} });
          scene.time.delayedCall(180, () => {
            scene.physics.resume();
            startBossStompDefeat();
          });
        } else {
          startBossStompDefeat();
        }
      }
      else startBossCollectPhase();
    }
  }

  // Chamado a partir do TOPO de onHitMalware — intercepta QUALQUER colisão com o boss
  // OU com um vírus pequeno da arena contaminada, antes de qualquer lógica de dano
  // normal correr (evita usar LEVELS[currentLevel] com dados do nível já terminado,
  // e evita teleportar o jogador de volta ao spawn do nível a meio de um combate).
  function handleBossMalwareCollision(malwareObj) {
    if (!inBossFight || !malwareObj) return false;
    const isBoss = malwareObj.getData("isBoss");
    const isMini = malwareObj.getData("isMiniHazard");
    if (!isBoss && !isMini) return false;
    // Fora da fase "platform" (intro/defeat/collect/quiz), absorve o toque em
    // silêncio em vez de devolver false — devolver false aqui fazia a colisão
    // cair na lógica NORMAL de onHitMalware, que reposiciona o VanBerto's em
    // LEVELS[currentLevel].spawn. Durante um combate de boss, currentLevel
    // ainda aponta para o nível ANTERIOR (só é incrementado depois do boss
    // vencido), por isso esse spawn pertence a um mundo com outro tamanho —
    // nada a ver com a arena do boss onde o jogador está fisicamente. Era isto
    // que podia fazer o VanBerto's aparecer numa posição errada a meio ou no
    // fim de um combate (ex.: o corpo do boss ainda por desativar no instante
    // exato em que passa a "defeat", ou um vírus pequeno da arena contaminada
    // que ainda não foi limpo).
    if (bossState.phase !== "platform") {
      // Exceção: em "defeat" o boss está deliberadamente a fugir a correr
      // (ver startBossStompDefeat) e precisa do corpo físico ligado para se
      // mover — desativá-lo aqui só porque o jogador lhe tocou de raspão
      // durante a fuga pará-lo-ia a meio do caminho. Nas outras fases
      // (intro/collect/quiz) mantém-se o comportamento de sempre.
      if (bossState.phase !== "defeat") { try{malwareObj.body?.setEnable(false);}catch{} }
      return true;
    }
    if (invuln) return true; // já protegido — ignora este toque, sem reprocessar dano

    if (isMini) {
      // Vírus pequeno da arena contaminada — com Star Power esmaga-se como um
      // vilão normal (sem afetar o HP do boss principal); sem Star Power, dói
      // como qualquer outro toque, mas o vírus continua vivo (o timer de
      // manutenção repõe o número desejado, não é preciso geri-lo aqui).
      if (starPower) {
        ensureAudio(); beep({freq:600,dur:0.05,type:"square",vol:0.07,slideTo:200});
        const ex = sceneRef.add.particles(0,0,"spark_item",{
          x:malwareObj.x, y:malwareObj.y, speed:{min:70,max:200}, angle:{min:0,max:360},
          lifespan:340, quantity:14, scale:{start:0.9,end:0}, tint:[0x30c060,0xffffff]
        });
        sceneRef.time.delayedCall(280, () => { try{ex.destroy();}catch{} });
        score += 15; scoreText.setText(`🌟 Pontos: ${score}`);
        showFloat(sceneRef, malwareObj.x, malwareObj.y-40, "💥 Vírus eliminado!", "#30c060");
        bossMiniViruses = bossMiniViruses.filter(v => v !== malwareObj);
        malwareObj.destroy();
      } else {
        bossHitPlayer(sceneRef, malwareObj, "🦠 Cuidado com os vírus!");
      }
      return true;
    }

    // Boss "clássico à Mario" (ex.: Monstro da Ignorância, redesenho): nem
    // Star Power nem ataque especial — o único jeito de lhe fazer dano é
    // saltar-lhe em cima. Um toque de lado dói na mesma.
    if (bossState.def.stompBoss) return handleStompBossTouch(malwareObj);

    // Bosses com ataque especial próprio não têm um estado "desbloqueado por
    // Star Power" — o único jeito de lhe fazer dano é o ataque nomeado,
    // disparado ao completar a carga. Tocar-lhe dói SEMPRE.
    if (starPower && !bossState.def.specialAttack) {
      // Reaproveita a mesma sensação de "atropelar vilão" que já existe no jogo
      if(sceneRef.time.now < bossState.hitCooldownUntil) return true; // debita 1x por toque
      bossState.hitCooldownUntil = sceneRef.time.now + 500;
      ensureAudio(); beep({freq:600,dur:0.05,type:"square",vol:0.07,slideTo:200});
      damageBoss(sceneRef, malwareObj.x, malwareObj.y-60);
    } else {
      // Sem Star Power (ou num boss de ataque especial), tocar no boss agora DÓI
      // a sério — antes só empurrava, o que tornava os bosses demasiado
      // inofensivos. Perde-se uma vida, tal como ao tocar num vilão normal, com
      // o mesmo knockback e i-frames.
      const warn = bossState.def.specialAttack
        ? `⚡ Precisas do ${bossState.def.specialAttack.name}!`
        : "⭐ Precisas de Star Power!";
      bossHitPlayer(sceneRef, malwareObj, warn);
    }
    return true; // sinaliza a onHitMalware para NÃO aplicar a lógica normal de dano
  }

  // Dano do boss (toque direto ou projétil mau) — perde-se 1 vida, sofre-se um
  // knockback e fica-se protegido por instantes (i-frames), reaproveitando a
  // mesma sensação de onHitMalware. warnMsg é o aviso mostrado por cima da
  // perda de vida (varia consoante veio de um toque ou de um projétil).
  function bossHitPlayer(scene, sourceObj, warnMsg) {
    if (invuln || lives <= 0) return;
    ensureAudio(); SFX.hit();
    // Combate Perfeito (novo, ver "flawless" na vitória em startBossQuizPhase):
    // marca que este combate já não é "sem perder uma vida", assim que o
    // boss acerta pela 1ª vez. Só dentro de um combate ativo — bossHitPlayer
    // também é chamada por outras fontes de dano fora daí (ver comentário
    // logo abaixo sobre a risada trocista).
    if (inBossFight && bossState) bossState.tookDamage = true;
    // Risada trocista (pedido: "mais expressões... rir") — sempre que o
    // boss consegue acertar no VanBerto's durante o combate, mostra a
    // reação de riso (showBossLaugh, definida acima junto a squishBoss).
    // Se o boss ainda estiver a meio da sua própria reação de dor
    // (squishing), fica marcada como pendente em vez de se perder —
    // squishBoss mostra-a assim que essa reação acabar.
    if (inBossFight && bossState && bossState.sprite && bossState.sprite.active) {
      if (bossState.squishing) bossState.pendingLaugh = true;
      else showBossLaugh(scene);
    }
    hitFlash.classList.add("active"); setTimeout(()=>hitFlash.classList.remove("active"),200);
    const knockDir = (sourceObj && sourceObj.x < player.x) ? 1 : -1;
    player.setVelocityX(knockDir * 300);
    player.setVelocityY(-320);
    scene.cameras.main.shake(160, 0.010);
    scene.cameras.main.flash(120,180,40,40);
    scene.tweens.add({
      targets: player,
      angle: { from: knockDir * -22, to: knockDir * 22 },
      duration: 80, yoyo: true, repeat: 2,
      ease: "Sine.easeInOut",
      onComplete: () => { if(player) player.setAngle(0); }
    });
    applyHitStop(scene);
    lives -= 1; updateHearts(); livesLostThisLevel++; _hudDirty = true;
    triggerVanBertoSad(scene);
    if (heartsGfx) scene.tweens.add({targets:heartsGfx,x:{from:-4,to:4},duration:60,yoyo:true,repeat:3,ease:"Sine.easeInOut",onComplete:()=>{if(heartsGfx)heartsGfx.x=0;}});
    invuln = true; // bloqueia novos toques já durante o voo de knockback
    if (warnMsg) showFloat(scene, player.x, player.y-60, warnMsg, "#ffd700");
    showFloat(scene, player.x, player.y-90, "💥 -1 Vida!", "#ff5050");
    if (lives <= 0) {
      // Antes, este caminho definia invuln=true (linha acima) e nunca mais o
      // desligava — saltava logo para showGameOver() sem passar por
      // setInvuln(), que é quem agenda o fim da proteção. Ao "Tentar de
      // novo" depois de perder todas as vidas, invuln ficava preso a
      // "true" para sempre, e como handleBossMalwareCollision ignora
      // SEMPRE um toque no boss enquanto invuln for true (mesmo saltos em
      // cima da cabeça, não só toques de lado), o boss deixava de reagir
      // por completo — "salto por cima e não acontece nada". Chamar
      // setInvuln() aqui também garante que a proteção se desliga sozinha.
      setInvuln(scene, 1400);
      // Festa do boss (pedido, "tipo Super Mario") — antes do ecrã de "Game
      // Over" aparecer, dá-se uns instantes para o boss celebrar.
      triggerBossParty(scene);
      scene.time.delayedCall(1300, () => { if (lives<=0) showGameOver(); });
      return;
    }
    scene.time.delayedCall(400, () => {
      if (!player || !inBossFight) return;
      setInvuln(scene, 1400);
      tipText.setText("⚡ Protegido por instantes!");
    });
  }

  function startBossCollectPhase() {
    bossState.phase = "collect";
    const b = bossState.sprite;
    b.setVelocity(0,0); b.body.setEnable(false); b.setAlpha(0.35);
    // Ver comentário equivalente em startBossStompDefeat(): parar os
    // temporizadores de combate assim que o boss é vencido, em vez de os
    // deixar a disparar (em no-op) até ao combate seguinte.
    bossTimers.forEach(t=>{try{t.remove(false);}catch{}}); bossTimers=[];
    if (bossLockIcon) { try{bossLockIcon.destroy();}catch{} bossLockIcon=null; } // boss já não é tocável — ícone deixa de fazer sentido
    if (bossRageIcon) { try{bossRageIcon.destroy();}catch{} bossRageIcon=null; }
    destroyBossHpBar(); // vida chegou a 0 — a barra já não tem função a partir daqui
    if (bossState.def.contaminatedArena) { clearToxicZones(); clearMiniViruses(); } // arena "cura-se" ao vencer o boss
    itemsGroup.getChildren().slice().forEach(o => { if((o.getData("kind")==="estrela" || o.getData("bossCharge")) && !o.getData("bossCollect")) o.destroy(); });
    const keyMap = { estrela:"item_estrela", heart:"item_heart", medalha:"item_medalha",
                     brinquedo:"item_chip", balao:"item_chave", livro:"item_livro" };
    const key = keyMap[bossState.def.collectKind] || "item_estrela";
    for (let i=0;i<bossState.def.collectCount;i++){
      const collectWorldW = bossState.def.arena?.worldW || 1600;
      const x = 250 + i*((collectWorldW-500)/bossState.def.collectCount);
      const it = itemsGroup.create(x, 300+Math.random()*80, key);
      it.setDepth(2).setData("kind", bossState.def.collectKind).setData("bossCollect", true);
      sceneRef.tweens.add({targets:it,y:it.y-8,duration:940,yoyo:true,repeat:-1,ease:"Sine.easeInOut"});
    }
    tipText.setText("⭐ Apanha tudo para enfraquecer o boss de vez!");
    itemCountText.setText(`${bossState.def.emoji} Itens: 0/${bossState.def.collectCount}`);
    vbSayRandom(VB_STAR_POWER,"info",3000);
  }

  // Chamado a partir do TOPO de onCollectItem
  function handleBossItemCollect(itemObj) {
    if (!inBossFight) return false;
    // Fora da fase "platform" (intro/defeat/collect/quiz) qualquer projétil ou
    // item de boss ainda "vivo" (ex.: uma bola ❓ lançada mesmo antes do golpe
    // final, ainda a saltar pelo chão quando a cinemática de derrota começa)
    // tem de ser absorvido em silêncio — sem dano, sem inverter controlos, sem
    // pontos. Sem esta guarda (as outras funções do boss já a têm — ver
    // handleBossMalwareCollision/doBossRollQmark/updateBossFight), o VanBerto's
    // podia levar um empurrão/inversão de controlos "fantasma" mesmo ao
    // aparecer no início do combate ou logo a seguir a vencer o boss.
    if (!bossState || bossState.phase !== "platform") {
      if (itemObj.getData("bossProjGood") || itemObj.getData("bossProjBad") ||
          itemObj.getData("bossProjQmark") || itemObj.getData("bossCharge") ||
          itemObj.getData("bossCollect") || itemObj.getData("bossFinalBurst")) {
        itemObj.destroy();
        return true;
      }
      return false;
    }
    if (itemObj.getData("bossProjGood")) {
      itemObj.destroy();
      score += 10; scoreText.setText(`🌟 Pontos: ${score}`);
      ensureAudio(); SFX.coin();
      showFloat(sceneRef, player.x, player.y-68, "📖 +10 Sabedoria!", "#ffd700");
      return true;
    }
    if (itemObj.getData("bossProjBad")) {
      itemObj.destroy();
      if (invuln) return true; // já protegido — livro mau não conta durante i-frames
      ensureAudio(); beep({freq:180,dur:0.16,type:"sawtooth",vol:0.06,slideTo:80});
      // 1200ms (era 1500) — o livro mau já custa 1 vida + i-frames de 1400ms;
      // uma inversão mais curta reduz o risco de a criança ainda estar
      // confusa com os controlos quando os i-frames acabam.
      controlsInvertedUntil = sceneRef.time.now + 1200;
      bossHitPlayer(sceneRef, null, "😵 Informação errada!");
      return true;
    }
    if (itemObj.getData("bossCharge")) {
      handleChargeItemCollect(itemObj);
      return true;
    }
    if (itemObj.getData("bossProjQmark")) {
      itemObj.destroy();
      if (invuln) return true; // já protegido — ignora durante os i-frames
      ensureAudio(); beep({freq:220,dur:0.12,type:"square",vol:0.06,slideTo:120});
      bossHitPlayer(sceneRef, null, "❓ Apanhado por uma bola de dúvidas!");
      return true;
    }
    if (itemObj.getData("bossFinalBurst")) {
      // Sombra do momento "último fôlego" (ver startBossFinalStandBurst) —
      // mesma sensação de dano/i-frames que os outros projéteis de boss,
      // com aviso próprio em vez do genérico "bola de dúvidas".
      itemObj.destroy();
      if (invuln) return true;
      ensureAudio(); beep({freq:200,dur:0.14,type:"sawtooth",vol:0.06,slideTo:90});
      bossHitPlayer(sceneRef, null, "🌑 Apanhado pela sombra!");
      return true;
    }
    if (!itemObj.getData("bossCollect")) return false;
    itemObj.destroy();
    bossState.collected += 1;
    score += 10; scoreText.setText(`🌟 Pontos: ${score}`);
    ensureAudio(); SFX.coin();
    showFloat(sceneRef, player.x, player.y-68, `+1 (${bossState.collected}/${bossState.def.collectCount})`, "#ffd700");
    itemCountText.setText(`${bossState.def.emoji} Itens: ${bossState.collected}/${bossState.def.collectCount}`);
    if (bossState.collected >= bossState.def.collectCount) {
      // Pequena pausa antes de abrir o quiz — dá tempo ao dedo largar o botão
      // de movimento em ecrãs de toque. Sem isto, o quiz abria no MESMO
      // instante em que o último item era tocado (ainda a meio do gesto de
      // andar/saltar), e o primeiro toque na resposta às vezes não registava
      // — o mesmo cuidado que a porta normal (560ms) e o boss "stomp"
      // (2650ms, por causa da cinemática) já tinham, mas que faltava aqui.
      sceneRef.time.delayedCall(300, () => {
        if (bossState && bossState.phase === "platform") startBossQuizPhase();
      });
    }
    return true;
  }

  // Recolha de um item de carga (📚 do Monstro da Ignorância, por agora). Cada
  // item mostra uma curiosidade muito curta e quase invisível (não pausa nada),
  // reforçando a ideia de que o conhecimento é a arma — só ao apanhar o número
  // definido em specialAttack.chargeCount é que o ataque nomeado dispara sozinho.
  function handleChargeItemCollect(itemObj) {
    itemObj.destroy();
    if (!bossState || !bossState.def.specialAttack) return;
    const sa = bossState.def.specialAttack;
    bossState.chargeCollected = (bossState.chargeCollected || 0) + 1;
    score += 10; scoreText.setText(`🌟 Pontos: ${score}`);
    ensureAudio(); SFX.coin();
    const facts = sa.chargeFacts || [];
    const fact = facts.length ? facts[(bossState.chargeCollected - 1) % facts.length] : `+1 (${bossState.chargeCollected}/${sa.chargeCount})`;
    showFloat(sceneRef, player.x, player.y-68, fact, "#80d8ff");
    itemCountText.setText(`⚡ Carga: ${bossState.chargeCollected}/${sa.chargeCount}`);
    if (bossState.chargeCollected >= sa.chargeCount) fireBossSpecialAttack(sceneRef);
  }

  // O ataque especial em si — dispara automaticamente assim que a carga enche.
  // Visual configurável por boss (specialAttack.visual): "beam" (padrão, usado
  // pelo Monstro da Ignorância) ou "wave" (Onda da Saúde do Vírus Gigante, que
  // também limpa as zonas tóxicas da arena). Reaproveita damageBoss() para o
  // dano em si, para as fases de raiva reagirem exatamente como num boss normal.
  function fireBossSpecialAttack(scene) {
    if (!bossState || !bossState.sprite || !bossState.sprite.active) return;
    const sa = bossState.def.specialAttack;
    bossState.chargeCollected = 0;
    // Limpar itens de carga por apanhar, para a arena não ficar com "sobras"
    // enquanto decorre a animação do ataque.
    itemsGroup.getChildren().slice().forEach(o => { if (o.getData("bossCharge")) o.destroy(); });

    const b = bossState.sprite;
    const glowColor = sa.visualColor != null ? sa.visualColor : 0x80d8ff;
    itemCountText.setText(`⚡ ${sa.name}!`);
    showFloat(scene, player.x, player.y-90, `⚡ ${sa.name}!`, "#80d8ff");

    if (sa.visual === "wave") {
      // Onda da Saúde: um anel que se expande a partir do VanBerto's — sem
      // precisar de nenhuma textura nova, só Graphics redesenhado por frame.
      const ringGfx = scene.add.graphics().setDepth(9);
      const ringState = { r: 10 };
      scene.tweens.add({
        targets: ringState, r: 620, duration: 480, ease: "Cubic.easeOut",
        onUpdate: () => {
          if (!ringGfx.active) return;
          ringGfx.clear();
          ringGfx.lineStyle(8, glowColor, 0.65);
          ringGfx.strokeCircle(player.x, player.y - 20, ringState.r);
          ringGfx.lineStyle(3, 0xffffff, 0.6);
          ringGfx.strokeCircle(player.x, player.y - 20, ringState.r);
        },
        onComplete: () => { try{ringGfx.destroy();}catch{} }
      });
      // A onda "cura" a arena — limpa as zonas tóxicas e volta a semeá-las
      // pouco depois, para o desafio voltar sem deixar a arena limpa para sempre.
      if (bossState.def.contaminatedArena) {
        clearToxicZones();
        scene.time.delayedCall(4000, () => {
          if (inBossFight && bossState && bossState.phase === "platform" && bossState.def.contaminatedArena) {
            const zc = currentContaminationZones();
            spawnToxicZones(scene, zc && zc.zones, zc && zc.hazardType);
          }
        });
      }
    } else {
      // Raio (padrão): uma linha grossa que cresce do jogador até ao boss e
      // desaparece rapidamente.
      const beamGfx = scene.add.graphics().setDepth(9);
      beamGfx.lineStyle(6, glowColor, 0.95);
      beamGfx.beginPath();
      beamGfx.moveTo(player.x, player.y - 20);
      beamGfx.lineTo(b.x, b.y);
      beamGfx.strokePath();
      beamGfx.lineStyle(2, 0xffffff, 0.9);
      beamGfx.beginPath();
      beamGfx.moveTo(player.x, player.y - 20);
      beamGfx.lineTo(b.x, b.y);
      beamGfx.strokePath();
      scene.tweens.add({ targets: beamGfx, alpha: 0, duration: 340, delay: 90, onComplete: () => { try{beamGfx.destroy();}catch{} } });
    }

    scene.cameras.main.flash(200, (glowColor>>16)&255, (glowColor>>8)&255, glowColor&255);
    scene.cameras.main.shake(160, 0.010);
    ensureAudio();
    beep({ freq:440, dur:0.10, type:"square", vol:0.06, slideTo:1200 });
    setTimeout(() => beep({ freq:900, dur:0.16, type:"triangle", vol:0.06, slideTo:1600 }), 90);

    const impactBurst = scene.add.particles(0, 0, "spark_item", {
      x: b.x, y: b.y, speed:{min:100,max:260}, lifespan:520, quantity:26,
      scale:{start:1.1,end:0}, angle:{min:0,max:360}, tint:[glowColor, 0xffffff, 0xffd700]
    });
    scene.time.delayedCall(90, () => {
      damageBoss(scene, b.x, b.y-60, "💥 Atingido!", 0.012);
      scene.time.delayedCall(500, () => { try{impactBurst.destroy();}catch{} });
    });
  }

  // ===== Flourish de vitória próprio de cada boss — Fase "Batalhas Épicas" =====
  // Substitui/complementa o confetti genérico por algo ligado ao tema do boss
  // vencido. Zero assets novos: só emoji + tweens, reaproveitando o padrão já
  // usado em showFloat/showBossBanner. Só o Monstro tem flourish próprio por
  // agora — os outros 3 bosses continuam só com o confetti genérico até
  // chegarmos à vez deles.
  function playBossVictoryFlourish(scene, def) {
    if (def.id === "monstro_ignorancia") {
      // "A luz do conhecimento": clarão quente + livros a subir e a dissipar-se,
      // como a névoa da ignorância a desfazer-se.
      scene.cameras.main.flash(420, 255, 246, 214);
      const cx = scene.cameras.main.worldView.centerX;
      for (let i = 0; i < 6; i++) {
        scene.time.delayedCall(i * 90, () => {
          if (!scene || !scene.add) return;
          const bx = cx - 150 + Math.random() * 300;
          const t = scene.add.text(bx, 420, "📚", { fontSize: "30px" }).setOrigin(0.5).setDepth(30).setAlpha(0);
          scene.tweens.add({ targets: t, y: 180, alpha: { from: 0, to: 1 }, duration: 900, ease: "Sine.easeOut" });
          scene.tweens.add({ targets: t, alpha: 0, duration: 300, delay: 700, onComplete: () => { try { t.destroy(); } catch {} } });
        });
      }
    }
  }

  function startBossQuizPhase() {
    bossState.phase = "quiz";
    if(bossState.sprite) bossState.sprite.destroy();
    const pool = getQuizPool(bossState.def.quizTheme);
    const quiz = pool[Math.floor(Math.random()*pool.length)];
    awaitingQuiz = true;
    sceneRef.physics.pause();
    player.setAlpha(0);
    tipText.setText("❓ Responde para derrotar o boss de vez!");
    // showQuiz() já trata de tentativas repetidas até acertar — só precisamos do done(true)
    showQuiz(quiz, () => {
      const def = bossState.def;
      const finished = bossState.onComplete;
      // Combate Perfeito (novo): capturado ANTES de bossState ser posto a
      // null mais abaixo — usado depois de "Direito Recuperado" para saber
      // se este combate específico decorreu sem perder nenhuma vida.
      const flawless = !bossState.tookDamage;
      ensureAudio(); SFX.win();
      player.setAlpha(1);
      // Pequena "pose de vitória" — dois saltinhos rápidos do VanBerto's, para
      // o jogador sentir que o herói também está a celebrar, não só o ecrã.
      sceneRef.tweens.add({ targets: player, y: player.y - 24, duration: 170, yoyo: true, repeat: 1, ease: "Sine.easeOut" });
      if(bossOverlay){ try{bossOverlay.destroy();}catch{} bossOverlay=null; }
      if(bossLockIcon){ try{bossLockIcon.destroy();}catch{} bossLockIcon=null; }
      if(bossRageIcon){ try{bossRageIcon.destroy();}catch{} bossRageIcon=null; }
      if(bossVignette){ try{bossVignette.destroy();}catch{} bossVignette=null; }
      clearToxicZones(); clearMiniViruses();
      destroyBossHpBar();
      inBossFight = false; bossState = null;
      // NOTA: bossArenaDecor (livros flutuantes) fica de propósito durante a
      // celebração/confetti — sai já a seguir, em loadLevel() do próximo nível
      // (ou defensivamente lá, caso o fluxo mude no futuro).
      // Limpar o HUD do combate ANTES da cinemática — sem isto ficavam valores
      // congelados (ex.: "Itens: 5/5", a dica do quiz) visíveis por trás do diálogo.
      hudText.setText("🏆 Vitória!");
      itemCountText.setText("");
      tipText.setText("");
      // Momento de celebração — flash dourado + confetti no ecrã, logo após o
      // boss ser derrotado e antes do diálogo de despedida. Sem isto, vencer um
      // boss não tinha nenhum "clímax" visual, ao contrário do ecrã de vitória
      // final do jogo (que já tem confetti).
      sceneRef.cameras.main.flash(280, 255, 215, 60);
      playBossVictoryFlourish(sceneRef, def);
      const bossConfetti = sceneRef.add.particles(0, 0, "spark_item", {
        x: player.x, y: player.y - 40,
        speed: { min: 90, max: 260 }, lifespan: 900, quantity: 30,
        scale: { start: 1.1, end: 0 }, gravityY: 160,
        angle: { min: 0, max: 360 },
        tint: [0xffd700, 0xff6b35, 0x80d0ff, 0xffffff, 0x60ff80]
      });
      sceneRef.time.delayedCall(750, () => { try{bossConfetti.destroy();}catch{} });
      // Segunda onda de confetti, um pouco depois e com a cor do próprio boss
      // misturada — dá a sensação de uma celebração maior em vez de um único
      // burst instantâneo, sem exigir arte nova nenhuma.
      sceneRef.time.delayedCall(400, () => {
        const bossConfetti2 = sceneRef.add.particles(0, 0, "spark_item", {
          x: player.x, y: player.y - 30,
          speed: { min: 70, max: 220 }, lifespan: 1000, quantity: 26,
          scale: { start: 1, end: 0 }, gravityY: 140,
          angle: { min: 0, max: 360 },
          tint: [def.color, 0xffd700, 0xff80c0, 0x80ffea, 0xffffff]
        });
        sceneRef.time.delayedCall(900, () => { try{bossConfetti2.destroy();}catch{} });
      });
      // Pequeno acorde final a fechar a vitória — mais festivo do que o SFX.win()
      // sozinho, sem chegar ao exagero do fanfarrão do fim de jogo (finalWin()).
      setTimeout(() => {
        [880,1108,1318].forEach((f,i) => setTimeout(() =>
          beep({ freq:f, dur:0.22, type:"triangle", vol:0.05, slideTo:f*1.05 }), i*45));
      }, 300);
      // Cartão "✅ VITÓRIA!" a deslizar do topo — o mesmo tipo de flourish do
      // cartão de chegada do boss, para fechar a cena com o mesmo impacto com
      // que começou (antes só havia confetti, sem nenhum destaque de texto).
      showBossBanner(sceneRef, "✅ VITÓRIA!", "#8fffb0");
      // Toast "Direito Recuperado!" — nomeia concretamente o direito que este boss
      // guardava (em vez de só confetti genérico), reaproveitando o visual das
      // conquistas (achv-toast) que já existe e já é usado neste jogo.
      if (def.rightRecovered) {
        showAchievementToast({ tier: def.rightRecovered.emoji, name: def.rightRecovered.name }, "🎉 Direito Recuperado!");
        // Álbum dos Direitos dos Bosses (novo, pedido: os 4 "Direitos
        // Recuperados" apareciam e desapareciam num toast, sem nenhum sítio
        // onde a criança os visse todos juntos no fim). Regista este boss
        // como vencido — mostrado na Galeria de Competências, a seguir aos
        // 20 artefactos normais (ver showArtefactGallery).
        collectedBossRights[def.id] = { flawless };
        saveBossRights();
      }
      // Combate Perfeito (novo, pedido: "não há recompensa nenhuma por jogar
      // bem um boss") — um 2º toast, um pouco depois do primeiro para não
      // amontoar tudo no mesmo instante (banner+confetti+acorde+toast já
      // acontecem todos ali). Só visual (reaproveita o mesmo achv-toast já
      // usado no jogo) — não mexe no sistema de conquistas nem no HUD.
      if (flawless) {
        sceneRef.time.delayedCall(1200, () => {
          showAchievementToast({ tier: "🏆", name: "Nenhuma vida perdida neste combate!" }, "✨ Combate Perfeito!");
        });
      }
      // awaitingQuiz continua true durante a cinemática de vitória — só liberta
      // o jogador quando o portal for criado, a seguir ao diálogo.
      // NOVO — mesma rede de segurança da cinemática de entrada (ver
      // comentário completo em startBossFight): sem o try/catch, um erro
      // aqui travava o jogo com o combate já vencido mas o portal por criar,
      // ficando o jogador presa na arena para sempre.
      const startBossPortalPhase = () => {
        awaitingQuiz = false;
        scene_resumeAfterBoss();
        tipText.setText("🌀 Caminha até ao portal para continuares a aventura!");
        spawnBossPortal(sceneRef, finished, def);
      };
      try {
        playBossDialogue([
          { speaker:"boss", name:def.name, emoji:def.emoji, text: def.defeatLine, anchor: bossDialogueAnchor() },
          { speaker:"vb", text: BOSS_VICTORY_VB[def.id] || "Conseguimos! Mais um direito está a salvo!", anchor: vbDialogueAnchor() }
        ], startBossPortalPhase);
      } catch (err) {
        console.error("Cinemática de vitória do boss falhou — a criar o portal de qualquer forma:", err);
        startBossPortalPhase();
      }
    });
  }

  // Portal que aparece na arena depois de um boss derrotado — o jogador tem de
  // caminhar até ele para avançar, em vez de seguir automaticamente para o
  // próximo nível. Reaproveita a mesma coreografia em fases da porta normal
  // (startDoorAnimation): aviso a pulsar → giro/crescimento com antecipação →
  // burst de partículas → jogador é puxado e desaparece no vórtice.
  // Centrado na arena (tal como o portal fica sempre bem visível a meio de um
  // nível normal) e SEM tinta — usa o mesmo "door_party" com o mesmo aspeto
  // exato da porta normal, para não parecer um objeto diferente. "color" só é
  // usado agora no brilho das partículas à volta, para manter alguma
  // identidade do boss sem alterar o próprio portal.
  function spawnBossPortal(scene, onEnter, def) {
    const color = (def && def.color != null) ? def.color : 0x9060ff;
    // Antes: px/py fixos em (800,380) — só calhavam bem nas arenas "grandes"
    // (1600px) dos 3 bosses originais, porque 800 é exactamente o centro
    // dessas arenas. Na arena "do tamanho da janela" do Monstro da Ignorância
    // (960px), 800 fica perto do bordo direito, sem garantia de chão por
    // baixo — o portal podia ficar difícil ou impossível de alcançar.
    // Agora: centrado na LARGURA REAL da arena de cada boss (worldW/2) e
    // encostado ao chão principal dessa mesma arena (a plataforma mais larga
    // em def.arena.platforms), em vez de flutuar a meio-ar — garante que dá
    // sempre para lá chegar a pé, seja qual for o tamanho/layout da arena.
    const worldW = (def && def.arena && def.arena.worldW) || 1600;
    const plats = def && def.arena && def.arena.platforms;
    let floorTopY = 485; // por omissão: chão a y=500 (topo em 485), igual ao usado por todos os bosses
    if (plats && plats.length) {
      let floor = plats[0];
      for (const p of plats) if (p[2] > floor[2]) floor = p; // mais larga = chão principal
      floorTopY = floor[1] - floor[3] / 2;
    }
    const px = (def && def.arena && def.arena.portalX != null) ? def.arena.portalX : Math.round(worldW / 2);
    const py = floorTopY - 56; // ~metade da altura do portal (104px) — encostado ao chão, não a flutuar
    const portal = scene.physics.add.staticSprite(px, py, "door_party").setDisplaySize(88,104);
    portal.clearTint();
    portal.refreshBody();
    scene.tweens.add({ targets:portal, scaleX:{from:1,to:1.1}, scaleY:{from:1,to:1.1}, duration:700, yoyo:true, repeat:-1, ease:"Sine.easeInOut" });
    const ring = scene.add.particles(0,0,"spark_item",{
      x:px, y:py, speed:{min:20,max:60}, lifespan:900, quantity:1, frequency:120,
      scale:{start:0.7,end:0}, tint:[color,0xffd700,0xffffff]
    });
    const lbl = scene.add.text(px, py-88, "🌀 Portal!", { fontSize:"16px", fontStyle:"900", color:"#e0c8ff", stroke:"#200040", strokeThickness:5 }).setOrigin(0.5).setDepth(20);
    scene.tweens.add({ targets:lbl, y:py-98, duration:900, yoyo:true, repeat:-1, ease:"Sine.easeInOut" });

    let triggered = false;
    let ov = null;
    let portalWatchdog = null;
    // enterPortal() é chamado tanto pelo overlap físico como pelo watchdog de
    // proximidade abaixo — só um dos dois dispara realmente (o "triggered"
    // protege contra disparo duplo), mas ter as duas vias garante que o
    // VanBerto's entra sempre no portal.
    //
    // PORQUÊ um watchdog de proximidade e não só o overlap: este portal é
    // criado a meio de uma transição cheia de física pausada/retomada
    // (pause() no quiz, resume() já dentro do diálogo de vitória — ver
    // startBossQuizPhase acima) e de tweens que mexem em player.x/y
    // diretamente (a "pose de vitória"). Se o overlap for registado num
    // instante em que a física ainda não deu um passo completo, ou se o
    // jogador "teletransportar" para dentro da zona do portal num único
    // frame (câmara a assentar, tween a terminar), o Arcade Physics pode
    // nunca chegar a reportar esse overlap — o VanBerto's fica visualmente
    // dentro/à frente do portal para sempre, sem nada o disparar. A porta
    // normal (tryOpenDoor) já usa exactamente este tipo de rede de segurança
    // por polling (_landingCheckTimer) por este mesmo motivo.
    const enterPortal = () => {
      if (triggered) return;
      triggered = true;
      if (portalWatchdog) { try{ portalWatchdog.remove(false); }catch{} portalWatchdog = null; }
      try{ scene.physics.world.removeCollider(ov); }catch{}
      try{ ring.stop(); }catch{}
      scene.tweens.killTweensOf(lbl);
      scene.tweens.add({ targets:lbl, alpha:0, duration:200, onComplete:()=>lbl.destroy() });
      ensureAudio(); SFX.doorOpen();
      scene.physics.pause();
      // Este portal (fim de boss) tinha a sua própria variável local "triggered"
      // como única proteção, sem nunca marcar _doorAnimRunning — o watchdog de
      // visibilitychange (ver mais abaixo no ficheiro) não tinha como saber que
      // esta animação estava a decorrer, e podia retomar a física a meio da
      // sequência (ou, pior, deixar tudo preso) se o jogador mudasse de separador
      // exatamente ao tocar no portal. Marcar _doorAnimRunning aqui também dá a
      // este portal a mesma proteção que a porta normal já tinha.
      _doorAnimRunning = true;

      // FASE 1 — aviso: o portal pulsa depressa antes de "acordar"
      scene.tweens.killTweensOf(portal);
      scene.tweens.add({
        targets: portal,
        scaleX: { from: portal.scaleX, to: portal.scaleX * 1.18 },
        scaleY: { from: portal.scaleY, to: portal.scaleY * 1.18 },
        duration: 110, yoyo: true, repeat: 2,
        ease: "Sine.easeInOut",
        onComplete: () => {
          portal.setScale(1);

          // Burst de partículas na ativação (mesma sensação da porta normal)
          const burst = scene.add.particles(0, 0, "spark_item", {
            x: px, y: py - 10,
            speed: { min: 60, max: 200 }, lifespan: 500, quantity: 22,
            scale: { start: 1.1, end: 0 }, gravityY: 60,
            angle: { min: 0, max: 360 },
            tint: [color, 0xffd700, 0xffffff, 0x80d0ff]
          });
          scene.time.delayedCall(420, () => { try{burst.destroy();}catch{} });

          // Ponto único de conclusão desta sequência — garante que onEnter()
          // é chamado exatamente uma vez, mesmo que o portal ou o jogador
          // deixem de existir a meio (ex.: "targets is null" ao construir um
          // tween sobre um objeto já destruído). BUG CORRIGIDO ("trava no
          // boss 3"): antes, se `portal` (ou `player`) fosse inválido no
          // momento em que a FASE 2/3 era construída, o tween atirava um
          // erro que escapava sem ser apanhado (a chamada final a
          // onComplete?.() dentro de playVanBertoDance não tinha try/catch),
          // e como isso acontecia a meio da cadeia, onEnter() nunca chegava
          // a ser chamado — o jogo ficava preso para sempre depois do boss.
          let _portalSeqDone = false;
          const finishPortalSequence = () => {
            if (_portalSeqDone) return;
            _portalSeqDone = true;
            try { if (scene && scene.tweens) scene.tweens.killTweensOf(player); } catch(e) {}
            try { if (player) { player.setAlpha(0); player.setAngle(0); player.setScale(1); } } catch(e) {}
            try{ ring.destroy(); }catch{}
            try{ portal.destroy(); }catch{}
            _doorAnimRunning = false; // reset — sequência do portal genuinamente terminada
            // Repor awaitingQuiz=true (tinha sido desligado de propósito, mais acima,
            // só para o jogador poder caminhar até ao portal) — sem isto, o VanBerto's
            // ficava sem NENHUMA proteção contra o "safety-net" de alpha do update()
            // durante o fade-in do ecrã seguinte (cartão de fim de mundo ou transição
            // de nível), reaparecendo por instantes antes desse ecrã cobrir tudo.
            // goToNextLevel()/loadLevel() tratam de repor awaitingQuiz=false quando o
            // ecrã seguinte já estiver mesmo pronto — tal como já acontece na porta normal.
            awaitingQuiz = true;
            onEnter();
          };

          // FASE 1.5 — o VanBerto's faz a dança do robô antes de ser sugado
          playVanBertoDance(scene, () => {
            try {
              if (!portal || !portal.active) { finishPortalSequence(); return; }

              // FASE 2 — o portal gira e cresce (efeito de antecipação), só depois é que "suga"
              scene.tweens.add({
                targets: portal,
                angle: { from: 0, to: 360 },
                scaleX: { from: 1, to: 1.3 },
                scaleY: { from: 1, to: 1.3 },
                duration: 380, ease: "Back.easeIn",
                onComplete: () => {
                  try {
                    if (!player || !player.active || !portal) { finishPortalSequence(); return; }

                    // FASE 3 — jogador é puxado para o centro do portal e desaparece no vórtice
                    scene.tweens.add({
                      targets: player, x: portal.x, y: portal.y - 10,
                      scaleX: 0.05, scaleY: 0.05, angle: 720, alpha: 0,
                      duration: 380, ease: "Sine.easeIn",
                      onComplete: finishPortalSequence
                    });
                  } catch (e) { console.error("Fase 3 do portal (pós-boss) falhou — a continuar de qualquer forma:", e); finishPortalSequence(); }
                }
              });
            } catch (e) { console.error("Fase 2 do portal (pós-boss) falhou — a continuar de qualquer forma:", e); finishPortalSequence(); }
          }); // fim playVanBertoDance (FASE 1.5)
        }
      });
    };

    ov = scene.physics.add.overlap(player, portal, enterPortal, null, scene);

    // Rede de segurança por proximidade (mesmo raciocínio do _landingCheckTimer
    // já usado na porta normal, ver tryOpenDoor acima) — confirma a cada 100ms
    // se o VanBerto's já está mesmo junto ao portal e força a entrada mesmo
    // que o overlap físico nunca chegue a disparar sozinho.
    portalWatchdog = scene.time.addEvent({
      delay: 100, loop: true,
      callback: () => {
        if (triggered || !player.active) return;
        if (Math.abs(player.x - px) < 50 && Math.abs(player.y - py) < 70) enterPortal();
      }
    });
  }

  function scene_resumeAfterBoss() {
    if (sceneRef) sceneRef.physics.resume();
  }

  function nextLevel(scene){
    const next=currentLevel+1;
    // Cancelar timers da porta antes da transição — evita watchdog disparar no nível seguinte
    if(_doorWatchdogTimer){ try{_doorWatchdogTimer.remove(false);}catch{} _doorWatchdogTimer=null; }
    if(_landingCheckTimer){ try{_landingCheckTimer.remove(false);}catch{} _landingCheckTimer=null; }
    document.getElementById("artefactRevealOverlay")?.classList.remove("show");
    document.getElementById("setBonusOverlay")?.classList.remove("show");
    // Garantir robot invisível ANTES de fechar o quiz overlay
    scene.tweens.killTweensOf(player);
    player.setAlpha(0);
    player.setVelocity(0,0);
    if(door?.active) door.setAlpha(0);
    quizOverlay.classList.add("hidden"); btnCloseQuiz.classList.add("hidden");
    // Manter awaitingQuiz=true durante TODA a transição — o loadLevel trata de o resetar.
    // Se fosse false aqui, havia uma janela de ~750ms em que o jogador (invisível mas com
    // corpo físico ativo) podia ser atingido por um vilão e perder uma vida indevidamente.
    awaitingQuiz=true;
    scene.physics.pause();

    if(livesLostThisLevel===0){
      // BUG CORRIGIDO: este bónus dizia sempre "⭐⭐⭐ Nível Perfeito!" só por
      // não teres perdido vidas nesse nível — mas isso é só UM dos 3
      // critérios reais (ver stars.js: segredo + sem-dano + acertar à
      // primeira). Um nível sem segredo encontrado ou sem acertar o quiz à
      // primeira ficava corretamente com 2 estrelas no ecrã de fim de nível
      // (showLevelCompleteCelebration, que usa starsForLevel de verdade) mas
      // este popup à parte continuava a anunciar "3 estrelas" — dando a
      // impressão de um bug de contagem. Agora só mostra "⭐⭐⭐ Nível
      // Perfeito!" se as 3 estrelas reais tiverem sido mesmo ganhas; caso
      // contrário mostra um bónus mais honesto, só pelo "sem perder vidas".
      const realStars = starsForLevel(currentLevel);
      score+=50;
      bonusStars.textContent = (realStars === 3)
        ? "⭐⭐⭐\n+50 Nível Perfeito!"
        : "🛡️\n+50 Sem perder vidas!";
      bonusStars.classList.add("show"); setTimeout(()=>bonusStars.classList.remove("show"),2000);
    }
    livesLostThisLevel=0;

    setTimeout(()=>{
      score+=100; scoreText.setText(`🌟 Pontos: ${score}`); _hudDirty=true;

      const goToNextLevel = () => {
        const justFinished = currentLevel; // ainda não foi atualizado por loadLevel
        if (next >= LEVELS.length) {
          // Não há mais níveis a seguir a este — fim do jogo. Verifica-se
          // AQUI (depois do boss, se houver um) e não mais cedo, para um
          // boss preso ao último nível (ex.: o do Mundo 4) ter sempre
          // oportunidade de lutar antes do ecrã de vitória final aparecer.
          scene.physics.resume();
          showVictoryScreen(scene);
          return;
        }
        if (isLastLevelOfRegion(justFinished)) {
          // awaitingQuiz/awaitingStory só são libertados DEPOIS do mapa já estar
          // aberto (cobrindo tudo) — mantê-los a true durante o cartão "Mundo
          // Completo!" evita que o safety-net de alpha do update() reponha o
          // VanBerto's visível a meio do fade-in desse cartão (ver comentário
          // em spawnBossPortal/enterPortal sobre o mesmo mecanismo).
          celebrateWorldComplete(regionForLevel(justFinished), () => {
            openOverlay("mapOverlay", renderMap);
            awaitingQuiz = false; awaitingStory = false;
          });
          return;
        }
        // Entre níveis do MESMO mundo: o jogo volta sempre ao mapa ilustrado
        // desse mundo (o nível concluído aparece verde, o seguinte fica a
        // brilhar) em vez de avançar sozinho — o jogador é sempre quem toca
        // para continuar, tal como ao entrar de novo depois de "Nova Aventura".
        const nextRegion = regionForLevel(next);
        if (nextRegion && nextRegion.mapBg) {
          openOverlay("worldMapOverlay", () => renderWorldMap(nextRegion));
          awaitingQuiz = false; awaitingStory = false;
          return;
        }
        enterLevelWithStory(scene,next,
          ()=>{ loadLevel(scene,next); },
          ()=>{ showHistory(next,()=>{
            if(!pausedByTeacher) scene.physics.resume();
          }); }
        );
      };

      if (BOSS_BY_LEVEL[currentLevel]) {
        startBossFight(scene, currentLevel, goToNextLevel);
      } else {
        goToNextLevel();
      }
      saveGame();
    },750);
  }

  function _hideBossHUD(){ /* reservado para bosses futuros */ }

  function showGameOver(){
    try{sceneRef.physics.pause();}catch{}
    awaitingQuiz=true; touch.left=touch.right=touch.jump=touch.crouch=false;
    try{player.setVelocity(0,0);}catch{}
    _hideBossHUD();
    document.getElementById("artefactRevealOverlay")?.classList.remove("show");
    document.getElementById("setBonusOverlay")?.classList.remove("show");
    ensureAudio(); SFX.gameOver();
    wireReviewButton("btnReviewModeGO", quizStats.errors?.length||0, " nesta tentativa", "gameOverOverlay");
    document.getElementById("gameOverOverlay").classList.remove("hidden");
  }

  function startConfetti(durationMs=5000){
    const el=document.getElementById("confetti"); if(!el) return;
    el.classList.remove("hidden"); el.innerHTML="";
    const emojis=["🎈","✨","⭐","🌟","🤖","🎁","🎊","🎉","🏆","🎀","🌈","💫","🥳","🎆","🎇","🪅","🏅","🎵","🎶","❤️","🌺","📦","🛸"];
    const vw=Math.max(320,window.innerWidth||800);
    // Muito mais confetis na vitoria final
    const isMobile=window.matchMedia("(max-width:768px)").matches;
    const confettiCount=isMobile?180:400;
    for(let i=0;i<confettiCount;i++){
      const s=document.createElement("span");
      s.textContent=emojis[i%emojis.length];
      s.style.left=(Math.random()*vw)+"px";
      // Tamanhos variados para profundidade visual
      const sz=12+Math.floor(Math.random()*20);
      s.style.fontSize=sz+"px";
      s.style.animationDuration=(1.8+Math.random()*4.5)+"s";
      s.style.animationDelay=(Math.random()*3.5)+"s";
      s.style.opacity=(0.75+Math.random()*0.25).toFixed(2);
      el.appendChild(s);
    }
    setTimeout(()=>{el.classList.add("hidden");el.innerHTML="";},durationMs);
  }

  function showVictoryScreen(scene){
    try{scene.physics.pause();}catch{}
    awaitingQuiz=true;
    touch.left=touch.right=touch.jump=touch.crouch=false;
    try{clearPower(scene);}catch{}
    try{clearStarPower(scene);}catch{}
    try{clearDoubleJump(scene);}catch{}
    if(powerHaloGfx){try{powerHaloGfx.clear();powerHaloGfx.setVisible(false);}catch{}}
    if(shadowGfx){try{shadowGfx.clear();shadowGfx.setVisible(false);}catch{}}
    hideDoorGlow();
    const _gameDiv=document.getElementById("game");
    if(_gameDiv) _gameDiv.style.visibility="hidden";
    ensureAudio(); SFX.finalWin(); startConfetti(28000);
    // Galeria de artefactos → depois ecrã de vitória
    showArtefactGallery(() => {
      // BUG CORRIGIDO: a percentagem/medalha aqui vinham de quizStats, que é
      // só desta "sessão" do browser (reinicia sempre que a página é
      // recarregada — ver resetQuizStats). Como o mapa/estrelas/conquistas
      // TODOS persistem entre sessões (é assim que o jogo permite continuar
      // outro dia), um jogador que fechasse e reabrisse o jogo a meio da
      // aventura via aqui uma percentagem a refletir só a última sessão, não
      // o percurso todo — podendo até mostrar uma medalha pior do que a
      // realidade mesmo com todos os níveis a 3 estrelas. globalStats.quizTotal/
      // quizCorrect são a versão persistente do mesmo contador (ver
      // loadGlobalStats/saveGlobalStats), por isso é essa que deve mandar
      // aqui — e é também a que o Certificado usa, para os dois ecrãs
      // nunca se contradizerem entre si.
      const _allStars = totalStarsEarned() === LEVELS.length * 3;
      const gTotal = globalStats.quizTotal, gCorrect = globalStats.quizCorrect;
      const pct = _allStars ? 100 : (gTotal ? Math.round((gCorrect / gTotal) * 100) : 0);
      let medal="🥉 Bronze — missão concluída!";
      if(pct>=70) medal="🥈 Prata — muito bem!";
      if(pct>=90) medal="🥇 Ouro — excelente!";
      const master=(_allStars||(gTotal>0&&gCorrect===gTotal))?" 🌟 Defensor Perfeito da Cibersegurança!":"";
      document.getElementById("winPlayerName").textContent=playerName||"Ciber-Herói";
      document.getElementById("winScore").textContent=score;
      document.getElementById("winPct").textContent=_allStars?`${gTotal}/${gTotal} (100%)`:`${gCorrect}/${gTotal} (${pct}%)`;
      document.getElementById("winMedal").textContent=medal+master;

      // ── Tabela de temas com erros — aparece logo se existirem ───────
      const THEME_LABELS={
        historia_internet:"Nasce a Internet",palavras_passe:"Palavras-passe Fortes",
        dados_pessoais:"Dados Pessoais",instituicoes_apoio:"Quem Nos Protege",
        virus_malware:"Vírus e Malware",jogos_seguros:"Jogar em Segurança",
        pegada_digital:"Pegada Digital",fake_news:"Fake News",
        phishing:"Phishing",dispositivos:"Dispositivos Protegidos",
        regras_familia:"Ecrã em Família",wifi_publico:"Wi-Fi Público",
        copias_seguranca:"Cópias de Segurança",acessibilidade_digital:"Acessibilidade Digital",
        spam_compras:"Spam e Compras",denuncia_conteudo:"Denunciar e Pedir Ajuda",
        identidade_digital:"Identidade Digital",privacidade:"Privacidade",
        contacto_desconhecidos:"Cuidado com Desconhecidos",direitos_digitais:"Direitos Digitais"
      };
      const winThemeErrors=document.getElementById("winThemeErrors");
      const winThemeTable=document.getElementById("winThemeTable");
      const hasThemeErrors=Object.keys(quizStats.errorsByTheme||{}).length>0;
      if(winThemeErrors&&winThemeTable){
        if(hasThemeErrors){
          winThemeErrors.style.display="block";
          winThemeTable.innerHTML="";
          const hdr=document.createElement("tr");
          hdr.innerHTML=`<th style="text-align:left;padding:3px 6px;border-bottom:1px solid rgba(255,215,0,0.3);color:#ffd700;font-size:11px;">Tema</th><th style="text-align:center;padding:3px 6px;border-bottom:1px solid rgba(255,215,0,0.3);color:#ffd700;font-size:11px;">Erros</th>`;
          winThemeTable.appendChild(hdr);
          Object.entries(quizStats.errorsByTheme).sort((a,b)=>b[1]-a[1]).forEach(([theme,count])=>{
            const tr=document.createElement("tr");
            const label=THEME_LABELS[theme]||theme;
            const bg=count>=3?"rgba(255,80,50,0.12)":count===2?"rgba(255,160,50,0.08)":"transparent";
            const col=count>=3?"#ff6050":count===2?"#ffaa40":"#a0ffb0";
            tr.innerHTML=`<td style="padding:5px 6px;background:${bg};border-radius:4px 0 0 4px;">${label}</td><td style="text-align:center;padding:5px 6px;background:${bg};font-weight:700;color:${col};border-radius:0 4px 4px 0;">${count}</td>`;
            winThemeTable.appendChild(tr);
          });
        } else {
          winThemeErrors.style.display="none";
        }
      }

      // ── Botão "Ver erros" — visível apenas se houver erros ──────────
      wireReviewButton("btnReviewMode", quizStats.errors?.length||0, "", "winOverlay");
      const btnCloseReview=document.getElementById("btnCloseReview");
      if(btnCloseReview){
        btnCloseReview.onclick=()=>{
          document.getElementById("reviewOverlay").classList.add("hidden");
          if(_reviewReturnOverlay){
            document.getElementById(_reviewReturnOverlay)?.classList.remove("hidden");
            _reviewReturnOverlay=null;
          } else {
            closeOverlay("reviewOverlay");
          }
        };
      }
      // Grelha dos direitos conquistados
      const _rg=document.getElementById("winRightsGrid");
      if(_rg){
        _rg.innerHTML="";
        ARTEFACTS.forEach((art,i)=>{
          const done=!!collectedArtefacts[i];
          const div=document.createElement("div");
          div.className="win-right-card"+(done?" win-right-done":" win-right-locked");
          div.innerHTML=done
            ?`<span class="wrc-emoji">${art.emoji}</span><span class="wrc-name">${art.short}</span>`
            :`<span class="wrc-emoji">🔒</span><span class="wrc-name">???</span>`;
          div.title=done?art.name:"Direito por descobrir";
          _rg.appendChild(div);
        });
      }
      // Abrir sempre no separador Relatório
      document.querySelectorAll(".win-tab").forEach((t,i)=>t.classList.toggle("active",i===0));
      document.querySelectorAll(".win-panel").forEach((p,i)=>p.classList.toggle("active",i===0));
      // Ligar os separadores (Relatório / Direitos) aos respetivos painéis
      document.querySelectorAll(".win-tab").forEach(tabBtn=>{
        tabBtn.onclick=()=>{
          const targetId=tabBtn.dataset.panel;
          document.querySelectorAll(".win-tab").forEach(t=>t.classList.toggle("active",t===tabBtn));
          document.querySelectorAll(".win-panel").forEach(p=>p.classList.toggle("active",p.id===targetId));
        };
      });
      // ── Botões extra: Mapa e Conquistas (aditivo, reaproveita ecrãs já existentes) ──
      // Escondem o winOverlay ao abrir (ver _winOverlaySubOpen); closeOverlay() volta a
      // mostrá-lo automaticamente assim que o Mapa/Conquistas é fechado.
      if(typeof btnWinRestart !== "undefined" && btnWinRestart && !document.getElementById("btnWinMap")){
        const extraWrap=document.createElement("div");
        extraWrap.style.cssText="display:flex;gap:8px;justify-content:center;margin-top:8px;flex-wrap:wrap;";
        const mk=(id,label,fn)=>{
          const b=document.createElement("button");
          b.id=id; b.className="btn"; b.textContent=label;
          b.onclick=fn;
          return b;
        };
        extraWrap.appendChild(mk("btnWinMap","🗺️ Mapa",()=>{
          // Esconder o winOverlay antes de abrir o mapa — caso contrário o mapa abre
          // por trás dele (mesmo z-index, mas o winOverlay vem depois no HTML) e fica
          // invisível. closeOverlay("mapOverlay") repõe o winOverlay automaticamente.
          document.getElementById("winOverlay")?.classList.add("hidden");
          _winOverlaySubOpen = true;
          openOverlay("mapOverlay",renderMap);
        }));
        extraWrap.appendChild(mk("btnWinAchievements","🏆 Conquistas",()=>{
          document.getElementById("winOverlay")?.classList.add("hidden");
          _winOverlaySubOpen = true;
          openAchievementsScreen();
        }));
        btnWinRestart.parentElement.appendChild(extraWrap);
      }
      document.getElementById("winOverlay").classList.remove("hidden");
    }); // fim showArtefactGallery
  }

  function showQuiz(quiz,done,attemptNum){
    // CORRIGIDO — isRetry era um booleano fixo: a partir da 2ª pergunta ficava
    // sempre "true" para sempre, por isso o rótulo dizia sempre "Segunda
    // tentativa!" mesmo na 3ª, 4ª, 5ª tentativa. Agora attemptNum conta mesmo
    // (1=primeira, nunca mostrado), e o rótulo/mensagem usam esse número real.
    attemptNum = attemptNum || 1;
    const isRetry = attemptNum > 1;
    quizOverlay.classList.remove("hidden");
    // bindTap(): liga a MESMA ação a "click" E a "touchend" (com preventDefault
    // para o touchend não disparar depois um "click" fantasma a duplicar).
    // Só usar .onclick deixava os botões do quiz por vezes surdos ao primeiro
    // toque em tablets — a sequência touchstart→touchend→click do browser
    // pode falhar a converter num "click" em certas condições (overlay a
    // aparecer a meio de outro gesto, física a retomar, etc.); ouvir também
    // "touchend" diretamente já não depende dessa conversão. Os handlers já
    // têm as suas próprias flags de proteção (answered/triggered), por isso
    // não há risco de disparar duas vezes se ambos os eventos chegarem a
    // acontecer.
    const bindTap = (el, handler) => {
      el.onclick = handler;
      el.ontouchend = (e) => { e.preventDefault(); handler(); };
    };
    // Em combate de boss, o tema certo é o do PRÓPRIO boss (bossState.def.quizTheme)
    // — não o do nível que acabou de terminar. Hoje os dois valores são sempre
    // iguais de propósito (ver comentários em data-bosses.js, "corrigido para
    // bater com o Nível X"), mas isso é mantido à mão em dois sítios diferentes;
    // se алguma vez ficarem dessincronizados, ler sempre LEVELS[currentLevel]
    // aqui mostraria o crachá/dica errados e a "2ª tentativa" escolheria
    // perguntas de outro tema. Resolver a partir do boss quando ele existe
    // elimina essa fragilidade.
    const _qTheme = bossState?.def?.quizTheme || LEVELS[currentLevel]?.quizTheme;
    const _article = QUIZ_ARTICLE[_qTheme];
    const _badgeHTML = _article ? `<span class="quiz-article-badge">📜 ${_article}</span><br>` : "";
    quizQuestion.innerHTML = _badgeHTML + (isRetry ? `🔄 ${attemptNum}ª tentativa! ` : "") + quiz.q;
    quizAnswers.innerHTML=""; quizFeedback.textContent=""; quizFeedback.style.color="#ff6b35";
    quizExplanation.textContent=""; quizExplanation.classList.add("hidden");
    // Limpar sempre o btnCloseQuiz ao abrir nova pergunta — evita cliques acidentais
    btnCloseQuiz.classList.add("hidden"); btnCloseQuiz.onclick=null; btnCloseQuiz.ontouchend=null;

    const correct=quiz.a.filter(x=>x.ok), wrong=quiz.a.filter(x=>!x.ok);
    for(let i=wrong.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[wrong[i],wrong[j]]=[wrong[j],wrong[i]];}
    const opts=[...correct.slice(0,1),...wrong.slice(0,2)];
    for(let i=opts.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[opts[i],opts[j]]=[opts[j],opts[i]];}

    let answered=false;
    opts.forEach(ans=>{
      const b=document.createElement("button");
      b.className="btn"; b.textContent=ans.t;
      b.setAttribute("aria-label",`Resposta: ${ans.t}`);
      bindTap(b, () => {
        if(answered) return; answered=true;
        ensureAudio(); if(!isRetry) quizStats.total+=1;

        quizAnswers.querySelectorAll(".btn").forEach(btn=>{
          btn.disabled=true;
          if(btn.textContent===correct[0].t){
            btn.style.background="rgba(20,80,20,0.75)";
            btn.style.borderColor="#4caf50";
            btn.style.color="#b8ffb8";
          } else if(btn===b&&!ans.ok){
            btn.style.background="rgba(100,20,20,0.75)";
            btn.style.borderColor="#c0392b";
            btn.style.color="#ffb8b8";
          } else { btn.style.opacity="0.35"; }
        });

        if(ans.ok){
          if(!isRetry) quizStats.correct+=1;
          // Rastrear para estatísticas globais
          if(typeof globalStats !== "undefined") {
            if(!isRetry){
              globalStats.quizTotal += 1;
              globalStats.quizCorrect += 1;
              saveGlobalStats();
            }
            showDynamicMsg(DYNAMIC_MSGS_CORRECT);
          }
          // Rastrear conquistas (a reavaliação com a contagem de níveis é feita
          // depois de markLevelCompleted, no done(ok) — ver nextLevel/showQuiz)
          onCorrectAnswerForAchievements(!isRetry);
          checkAchievements(mapProgress.levelsCompleted.length);
          btnCloseQuiz.classList.add("hidden"); btnCloseQuiz.onclick=null; btnCloseQuiz.ontouchend=null;
          quizFeedback.textContent=isRetry?`✅ Conseguiste à ${attemptNum}ª tentativa! 💪`:"✅ Muito bem!";
          quizFeedback.style.color="#208050";
          SFX.coin();
          vbSayRandom(VB_QUIZ_CORRECT,"good",3200);
          // Mostrar SEMPRE: explicação do quiz E/OU dica do tema
          const tipFact = QUIZ_TIPS[_qTheme] || "";
          const expText = quiz.exp ? "💡 " + quiz.exp : "";
          const combined = expText || (tipFact ? "📌 Recorda: " + tipFact : "");
          if(combined){
            quizExplanation.textContent = combined;
            quizExplanation.classList.remove("hidden");
            btnCloseQuiz.classList.remove("hidden");
            btnCloseQuiz.textContent = "Continuar ▶";
            bindTap(btnCloseQuiz, () => {
              btnCloseQuiz.classList.add("hidden"); btnCloseQuiz.onclick=null; btnCloseQuiz.ontouchend=null;
              // Esconder robot ANTES de fechar o overlay
              if(sceneRef&&player){ sceneRef.tweens.killTweensOf(player); player.setAlpha(0); }
              quizOverlay.classList.add("hidden"); done(true);
            });
            btnCloseQuiz.focus({ preventScroll: true });
          } else {
            setTimeout(()=>{
              // Esconder robot ANTES de fechar o overlay
              if(sceneRef&&player){ sceneRef.tweens.killTweensOf(player); player.setAlpha(0); }
              quizOverlay.classList.add("hidden"); done(true);
            },900);
          }
        } else {
          quizStats.everWrong=true; SFX.hit();
          // Rastrear para estatísticas globais (só conta na primeira tentativa)
          if(!isRetry && typeof globalStats !== "undefined") {
            globalStats.quizTotal += 1;
            globalStats.quizWrong += 1;
            saveGlobalStats();
            showDynamicMsg(DYNAMIC_MSGS_WRONG);
          }
          if(sceneRef&&player){sceneRef.tweens.add({targets:player,angle:{from:-10,to:10},duration:80,yoyo:true,repeat:4,ease:"Sine.easeInOut",onComplete:()=>{if(player)player.setAngle(0);}});}
          vbSayRandom(VB_QUIZ_WRONG,"wrong",3200);

          quizStats.errors=quizStats.errors||[];
          if(!isRetry) {
            const qTheme = _qTheme || "historia";
            quizStats.errors.push({level:LEVELS[currentLevel]?.name||`Nível ${currentLevel+1}`,theme:qTheme,q:quiz.q,wrong:ans.t,correct:correct[0].t});
            quizStats.errorsByTheme[qTheme] = (quizStats.errorsByTheme[qTheme]||0) + 1;
          }
          if(quiz.exp){quizExplanation.textContent="💡 "+quiz.exp;quizExplanation.classList.remove("hidden");}
          const tip=QUIZ_TIPS[_qTheme]||"";
          quizFeedback.textContent="❌ Quase! A resposta certa era: "+correct[0].t+"\nTenta outra pergunta!";
          if(tip) quizFeedback.textContent+=`\n💡 Lembra-te: ${tip}`;
          quizFeedback.style.color="#e84d10";
          btnCloseQuiz.classList.remove("hidden"); btnCloseQuiz.textContent="🔄 Tentar outra pergunta";
          bindTap(btnCloseQuiz, () => {
            btnCloseQuiz.classList.add("hidden");
            showQuiz(pickQuizForLevel(currentLevel,_qTheme),done,attemptNum+1);
          });
          btnCloseQuiz.focus({ preventScroll: true });
        }
      });
      quizAnswers.appendChild(b);
    });

    // Foca a primeira resposta automaticamente — permite já usar as setas
    // ↑/↓ e Enter sem ter de tocar antes no botão com o rato/dedo.
    quizAnswers.querySelector(".btn")?.focus({ preventScroll: true });
  }

  // ===== Itens =====
  const ITEM_LABELS={
    estrela:    {label:"⭐ STAR POWER! 8s",      color:"#ffd700"},
    balao:      {label:"🔑 Chave de Acesso +10", color:"#e0209a"},
    brinquedo:  {label:"🔐 Chip de Segurança +10", color:"#a050ff"},
    medalha:    {label:"🛡️ Escudo! PROTEGIDO",  color:"#ffd700"},
    duplosalto: {label:"🦅 Duplo Salto! 10s",   color:"#80d0ff"},
    heart:      {label:"❤️ +1 Vida!",           color:"#e84d10"},
    balaofesta: {label:"🔒 Cadeado Especial +10", color:"#1a90e0"}
  };

  // Cores das partículas por tipo de item
  const ITEM_TINTS={
    estrela:    [0xffd700, 0xffe980, 0xffffff, 0xff6b35],
    balao:      [0xe0209a, 0xff80c0, 0xffd700, 0x9030e0],
    brinquedo:  [0xa050ff, 0xff80c0, 0xffd700, 0xffffff],
    medalha:    [0xffd700, 0xffe980, 0xffffff, 0xff9500],
    duplosalto: [0x80d0ff, 0xffffff, 0xffd700, 0xa0e8ff],
    heart:      [0xff2040, 0xff6080, 0xffffff, 0xe84d10],
    balaofesta: [0x1a90e0, 0x90d0ff, 0xffffff, 0xffd700]
  };

  function onCollectItem(playerObj,itemObj){
    if (handleBossItemCollect(itemObj)) return;
    if(awaitingQuiz) return;
    const kind=itemObj.getData("kind");
    const idx=itemObj.getData("itemIdx");
    const secretBonus = itemObj.getData("secretPoints") || 0;
    if(idx !== undefined && idx >= 0) collectedItemIndices.add(idx);
    // Recompensa de sala secreta apanhada — regista para não voltar a
    // aparecer se o jogador reentrar no mesmo cano nesta vida/nível.
    if(inSecretRoom && secretRoomTemp.item === itemObj && secretRoomTemp.key){
      collectedRoomPipes.add(secretRoomTemp.key);
      onSecretRoomFoundForAchievements(secretRoomTemp.key);
      secretRoomTemp.item = null;
    }
    itemObj.destroy();
    const totalPoints = 10 + secretBonus;
    score += totalPoints; scoreText.setText(`🌟 Pontos: ${score}`); _hudDirty=true;
    if(kind!=="heart"){ itemsCollected=Math.min(itemsCollected+1,itemsTotal); itemCountText.setText(`⭐ Itens: ${itemsCollected}/${itemsTotal}`); }
    const lbl=ITEM_LABELS[kind]||{label:"+10 ⭐",color:"#ff6b35"};
    showFloat(sceneRef,playerObj.x,playerObj.y-68,lbl.label,lbl.color);
    if(Math.random()<0.35) showFloat(sceneRef,playerObj.x,playerObj.y-100,pickPraise(),"#ffd700");
    ensureAudio(); SFX.coin();
    // Burst de partículas com cores específicas por tipo
    const tint = ITEM_TINTS[kind] || [0xffd700,0xff6b35,0xffffff,0xa0ff80];
    const qty  = kind==="medalha" ? 22 : kind==="heart" ? 18 : 14;
    const p=sceneRef.add.particles(0,0,"spark_item",{x:playerObj.x,y:playerObj.y,speed:{min:60,max:190},lifespan:420,quantity:qty,scale:{start:1.1,end:0},gravityY:380,tint});
    sceneRef.time.delayedCall(300,()=>p.destroy());
    if(kind==="medalha"){givePower(sceneRef);tipText.setText("🛡️ ESCUDO ATIVO: VanBerto's está protegido e aumentado!");}
    if(kind==="duplosalto"){giveDoubleJump(sceneRef);}
    if(kind==="estrela"){giveStarPower(sceneRef);}
    if(kind==="heart"){
      if(lives<MAX_LIVES){
        lives+=1; updateHearts(); ensureAudio(); SFX.life();
        tipText.setText("❤️ Ganhaste uma vida extra!");
        triggerVanBertoHappy(sceneRef);
        if(heartsGfx&&sceneRef) sceneRef.tweens.add({targets:heartsGfx,scaleX:{from:1,to:1.25},scaleY:{from:1,to:1.25},duration:140,yoyo:true,repeat:1,ease:"Back.easeOut"});
      } else { showFloat(sceneRef,playerObj.x,playerObj.y-100,"❤️ MÁXIMO!","#e84d10"); }
    }
    saveGame();
  }

  function onHitMalware(playerObj, malwareObj){
    if (handleBossMalwareCollision(malwareObj)) return;
    if(invuln||awaitingQuiz||_overlayPaused||pausedByTeacher) return;

    // ── STAR POWER: atropela o vilão ─────────────────────────────
    if(starPower && malwareObj && malwareObj.active){
      ensureAudio();
      beep({freq:600,dur:0.05,type:"square",vol:0.07,slideTo:200});
      // Explosão no sítio do vilão
      const ex=sceneRef.add.particles(0,0,"spark_item",{
        x:malwareObj.x, y:malwareObj.y,
        speed:{min:80,max:240}, angle:{min:0,max:360},
        lifespan:380, quantity:18, scale:{start:1.1,end:0}, gravityY:200,
        tint:[0xffd700,0xff6b35,0xff0000,0xffffff]
      });
      sceneRef.time.delayedCall(280,()=>ex.destroy());
      sceneRef.cameras.main.shake(100,0.006);
      score+=50; scoreText.setText(`🌟 Pontos: ${score}`); _hudDirty=true;
      showFloat(sceneRef,malwareObj.x,malwareObj.y-50,"💥 +50","#ff6b35");
      // Rastrear inimigo derrotado
      if(typeof globalStats !== "undefined") {
        globalStats.enemiesDefeated += 1;
        saveGlobalStats();
      }
      // Destruir o vilão (com respawn depois de 4s, como os outros)
      malwareObj.setActive(false).setVisible(false);
      malwareObj.body.setEnable(false);
      const _cs=_critterSession;
      sceneRef.time.delayedCall(4000,()=>{
        if(_cs!==_critterSession||!malwareObj) return;
        malwareObj.setPosition(malwareObj.getData("originX")||malwareObj.x,
                               malwareObj.getData("originY")||malwareObj.y);
        malwareObj.setActive(true).setVisible(true);
        malwareObj.body.setEnable(true);
        // Proteger o jogador por 1s se estiver perto do ponto de respawn
        if(player && !invuln){
          const ox = malwareObj.getData("originX") || malwareObj.x;
          const oy = malwareObj.getData("originY") || malwareObj.y;
          if(Math.hypot(player.x-ox, player.y-oy) < 140) setInvuln(sceneRef, 1000);
        }
      });
      return;
    }

    ensureAudio(); SFX.hit();
    hitFlash.classList.add("active"); setTimeout(()=>hitFlash.classList.remove("active"),200);

    // ── Knockback visual ──────────────────────────────────────
    // Direção oposta ao vilão; se não há referência usa esquerda
    const knockDir = (malwareObj && malwareObj.x < playerObj.x) ? 1 : -1;
    player.setVelocityX(knockDir * 320);
    player.setVelocityY(-340);
    sceneRef.cameras.main.shake(180, 0.009);
    // Flash vermelho no player + giro
    sceneRef.tweens.add({
      targets: player,
      angle: { from: knockDir * -25, to: knockDir * 25 },
      duration: 80, yoyo: true, repeat: 2,
      ease: "Sine.easeInOut",
      onComplete: () => { if(player) player.setAngle(0); }
    });
    // ─────────────────────────────────────────────────────────

    if(powered){clearPower(sceneRef);setInvuln(sceneRef,800);tipText.setText("🛡️ Escudo usado! Cuidado.");return;}
    applyHitStop(sceneRef);
    lives-=1; updateHearts(); livesLostThisLevel++; _hudDirty=true;
    triggerVanBertoSad(sceneRef);
    if(heartsGfx&&sceneRef) sceneRef.tweens.add({targets:heartsGfx,x:{from:-4,to:4},duration:60,yoyo:true,repeat:3,ease:"Sine.easeInOut",onComplete:()=>{if(heartsGfx)heartsGfx.x=0;}});
    // Marca invuln imediatamente para bloquear hits durante o voo de knockback
    invuln=true;
    // Aviso claro de perda de vida — antes só existia nos combates de boss
    // (bossHitPlayer), por isso num toque normal de vilão a perda de vida
    // passava despercebida (só o coração no HUD mudava, pequeno e discreto).
    showFloat(sceneRef, playerObj.x, playerObj.y-90, "💥 -1 Vida!", "#ff5050");
    // Após o voo de knockback, teletransportar e iniciar 2s de proteção completa
    sceneRef.time.delayedCall(400, () => {
      if(!player) return;
      const L=LEVELS[currentLevel];
      touch.left=touch.right=touch.jump=touch.crouch=false;
      player.setVelocity(0,0); player.setPosition(L.spawn.x,L.spawn.y); snapPlayerToGround();
      // setInvuln() ANTES do "if lives<=0 return" — o mesmo bug corrigido em
      // bossHitPlayer (invuln=true nunca desligado quando o jogo termina em
      // Game Over, porque o "return" antecipava-se ao setInvuln). Hoje isto
      // ficava mascarado porque loadLevel() já repõe invuln=false ao
      // recomeçar um nível normal, mas corrigir aqui também evita depender
      // só dessa repetição.
      setInvuln(sceneRef, 2000);
      if(lives<=0){showGameOver();return;}
      // Flash de "reaparecimento" — círculo de luz no spawn
      const spawnFlash = sceneRef.add.graphics().setDepth(10);
      spawnFlash.fillStyle(0xffffff, 0.7);
      spawnFlash.fillCircle(L.spawn.x, L.spawn.y, 30);
      sceneRef.tweens.add({ targets: spawnFlash, alpha: 0, scaleX: 2.5, scaleY: 2.5,
        duration: 400, ease: "Quad.easeOut",
        onComplete: () => spawnFlash.destroy() });
      tipText.setText("⚡ Protegido por 2s!");
      vbSayRandom(VB_HIT,"hit",3000);
    });
    if(lives<=0) return; // evitar correr o resto se já vai para game over
    // Ao perder uma vida, os itens voltam a aparecer — EXCETO os corações já apanhados
    const heartIndicesCollected = new Set(
      [...collectedItemIndices].filter(idx => LEVELS[currentLevel].items[idx]?.kind === "heart")
    );
    collectedItemIndices.clear();
    heartIndicesCollected.forEach(idx => collectedItemIndices.add(idx));
    // Idem para as recompensas das salas secretas — mantém só os corações já
    // apanhados, o resto volta a ficar disponível.
    const heartRoomKeysCollected = new Set(
      [...collectedRoomPipes].filter(key => (LEVELS[currentLevel].pipes||[]).some(pp => pp.room && pp.kind==="heart" && (pp.x+"_"+pp.y)===key))
    );
    collectedRoomPipes.clear();
    heartRoomKeysCollected.forEach(k => collectedRoomPipes.add(k));
    itemsCollected = 0;
    itemCountText.setText(`⭐ Itens: ${itemsCollected}/${itemsTotal}`);
    const keyMap={
      estrela:"item_estrela",
      balao:"item_chave",
      brinquedo:"item_chip",medalha:"item_medalha",heart:"item_heart",
      duplosalto:"item_duplosalto"
    };
    LEVELS[currentLevel].items.forEach((it,idx)=>{
      if(it.kind==="heart" && heartIndicesCollected.has(idx)) return;
      const exists=itemsGroup.getChildren().some(o=>o.getData("itemIdx")===idx);
      if(exists) return;
      const _km=keyMap[it.kind]; const _key=typeof _km==="function"?_km():(_km||"item_estrela");
      const obj=itemsGroup.create(it.x,it.y,_key);
      obj.setDepth(2);
      sceneRef.tweens.add({targets:obj,y:obj.y-8,duration:940,yoyo:true,repeat:-1,ease:"Sine.easeInOut"});
      obj.setData("kind",it.kind);
      obj.setData("itemIdx",idx);
    });
    // Recriar também os escudos extra (itemIdx === -1) se já não existir nenhum no mapa
    const hasExtraShield=itemsGroup.getChildren().some(o=>o.getData("itemIdx")===-1);
    if(!hasExtraShield) spawnShields(sceneRef, LEVELS[currentLevel]);
    saveGame();
  }

  let invulnBlinkEvent=null, invulnEndEvent=null;

  function setInvuln(scene,ms){
    // Cancelar timers anteriores para evitar conflito de alpha
    if(invulnBlinkEvent){ invulnBlinkEvent.remove(false); invulnBlinkEvent=null; }
    if(invulnEndEvent){   invulnEndEvent.remove(false);   invulnEndEvent=null; }

    invuln=true;
    player.setAlpha(1);
    const blinks=Math.floor(ms/160);
    let blinkCount=0;
    invulnBlinkEvent=scene.time.addEvent({
      delay:80,
      repeat:blinks*2,
      callback:()=>{
        blinkCount++;
        // Só pisca se invuln ainda estiver ativo (evita sobrepor o reset final)
        if(!invuln) return;
        if(blinkCount%2===1) player.setAlpha(0.25);
        else player.setAlpha(1);
      }
    });
    invulnEndEvent=scene.time.delayedCall(ms,()=>{
      // Cancelar o blink event primeiro, para garantir que não dispara mais
      if(invulnBlinkEvent){ invulnBlinkEvent.remove(false); invulnBlinkEvent=null; }
      invuln=false;
      player.setAlpha(1);
      player.setScale(powered?1.18:1.0);
      // Só limpar o tint se não houver poder ativo com cor própria
      if(!starPower && !doubleJumpActive) {
        player.clearTint();
      }
      invulnEndEvent=null;
    });
  }

  let poweredCountdownVal=0;
  function givePower(scene){
    powered=true; SFX.power();
    player.clearTint();
    if(powerIndicator) powerIndicator.setText("🛡️ ESCUDO 8s");
    if(poweredTimer) poweredTimer.remove(false);
    if(powerCountdown) powerCountdown.remove(false);
    poweredCountdownVal=8;
    powerCountdown=scene.time.addEvent({delay:1000,loop:true,callback:()=>{
      poweredCountdownVal--;
      if(powerIndicator) powerIndicator.setText(`🛡️ ESCUDO ${poweredCountdownVal}s`);
      if(poweredCountdownVal<=0){clearPower(scene);}
    }});
    poweredTimer=scene.time.delayedCall(8000,()=>clearPower(scene));
  }
  function clearPower(scene){
    powered=false;
    if(poweredTimer){poweredTimer.remove(false);poweredTimer=null;}
    if(powerCountdown){powerCountdown.remove(false);powerCountdown=null;}
    if(player){
      player.clearTint();
      // Só repõe escala, alpha e mata tweens se não estiver em invuln
      // (mover killTweensOf para dentro evita matar o blink event de invulnerabilidade
      // e deixar o alpha preso em 0.25)
      if(!invuln){
        if(scene&&scene.tweens) scene.tweens.killTweensOf(player);
        player.setScale(1.0); player.setAlpha(1);
      }
    }
    if(powerIndicator) powerIndicator.setText("");
    if(tipText) tipText.setText(currentLevelTip);
  }

  let doubleJumpTimer=null, doubleJumpCountdown=null, doubleJumpCountVal=0;
  function giveDoubleJump(scene){
    doubleJumpActive=true; doubleJumpUsed=false;
    ensureAudio(); SFX.power();
    if(powerIndicator) powerIndicator.setText("🦅 DUPLO SALTO 10s");
    if(doubleJumpTimer)    doubleJumpTimer.remove(false);
    if(doubleJumpCountdown) doubleJumpCountdown.remove(false);
    doubleJumpCountVal=10;
    doubleJumpCountdown=scene.time.addEvent({delay:1000,loop:true,callback:()=>{
      doubleJumpCountVal--;
      if(powerIndicator) powerIndicator.setText(`🦅 DUPLO SALTO ${doubleJumpCountVal}s`);
      if(doubleJumpCountVal<=0) clearDoubleJump(scene);
    }});
    doubleJumpTimer=scene.time.delayedCall(10000,()=>clearDoubleJump(scene));
    tipText.setText("🦅 DUPLO SALTO ATIVO: carrega ↑ novamente no ar!");
  }
  function clearDoubleJump(scene){
    doubleJumpActive=false; doubleJumpUsed=false;
    if(doubleJumpTimer){doubleJumpTimer.remove(false);doubleJumpTimer=null;}
    if(doubleJumpCountdown){doubleJumpCountdown.remove(false);doubleJumpCountdown=null;}
    if(!powered&&powerIndicator) powerIndicator.setText("");
    if(tipText) tipText.setText(currentLevelTip);
  }

  // ===== STAR POWER — atropela vilões por 8s =====
  let _starMelodyInterval = null;
  function giveStarPower(scene){
    starPower=true;
    ensureAudio();
    if(powerIndicator) powerIndicator.setText("⭐ STAR POWER 8s");
    tipText.setText("⭐ STAR POWER: atropela os maus!");
    if(starPowerTimer)    starPowerTimer.remove(false);
    if(starPowerCountdown) starPowerCountdown.remove(false);
    // Tocar melodia imediatamente e depois em loop a cada 1520ms (16 notas × 95ms)
    SFX.starMelody();
    if(_starMelodyInterval) clearInterval(_starMelodyInterval);
    _starMelodyInterval = setInterval(()=>{ if(starPower) SFX.starMelody(); }, 1520);
    window._dc_starMelodyInterval = _starMelodyInterval; // exposto para visibilitychange
    starPowerCountVal=8;
    starPowerCountdown=scene.time.addEvent({delay:1000,loop:true,callback:()=>{
      starPowerCountVal--;
      if(powerIndicator) powerIndicator.setText(`⭐ STAR POWER ${starPowerCountVal}s`);
      if(starPowerCountVal<=0) clearStarPower(scene);
    }});
    starPowerTimer=scene.time.delayedCall(8000,()=>clearStarPower(scene));
    // Piscar apenas — sem tint de cor
    if(player) player.clearTint();
    vbSayRandom(VB_STAR_POWER,"star",2800);
  }
  function clearStarPower(scene){
    starPower=false;
    if(starPowerTimer){starPowerTimer.remove(false);starPowerTimer=null;}
    if(starPowerCountdown){starPowerCountdown.remove(false);starPowerCountdown=null;}
    if(_starMelodyInterval){ clearInterval(_starMelodyInterval); _starMelodyInterval=null; }
    window._dc_starMelodyInterval = null;
    if(player){ player.clearTint(); player.setAlpha(1); }
    // Limpar estado visual arco-íris
    if(sceneRef){ sceneRef._starBlinkTimer=0; sceneRef._starColorIdx=0; sceneRef._starTrailTimer=0; }
    if(!powered&&!doubleJumpActive&&powerIndicator) powerIndicator.setText("");
    if(tipText) tipText.setText(currentLevelTip);
  }

  // ===== Touch =====
  function createTouchInput(scene){
    let downAt=0, anyTouchBtnActive=false; const TAP_MS=190;
    const _teacherPanel = document.getElementById("teacherMenuPanel");
    const _isTeacherMenuOpen = () => _teacherPanel && _teacherPanel.classList.contains("open");
    // O toque direto no ecra (swipe) so funciona quando os botoes NAO estao visiveis
    const _canvasTouchAllowed = () => {
      const state = window._dc_touchState || "auto";
      if (state === "on") return false;  // botoes forcados — usar so botoes
      if (state === "off") return true;  // botoes ocultos — usar toque no ecra
      // "auto": verificar se os botoes estao visiveis (touch device portrait)
      const tc = document.getElementById("touchControls");
      return !(tc && getComputedStyle(tc).display !== "none");
    };
    scene.input.on("pointerdown",(p)=>{ensureAudio();if(anyTouchBtnActive||_isTeacherMenuOpen())return;if(!_canvasTouchAllowed())return;if(player&&player.getBounds&&player.getBounds().contains(p.worldX,p.worldY))return;downAt=scene.time.now;touch.left=p.x<scene.scale.width/2;touch.right=!touch.left;});
    scene.input.on("pointerup",()=>{if(anyTouchBtnActive||_isTeacherMenuOpen())return;if(!_canvasTouchAllowed()){touch.left=false;touch.right=false;return;}const held=scene.time.now-downAt;touch.left=false;touch.right=false;if(held<=TAP_MS)touch.jump=true;});
    scene.input.on("pointerout",()=>{touch.left=false;touch.right=false;touch.jump=false;});
    const btnL=document.getElementById("btnLeft"),btnR=document.getElementById("btnRight"),btnJ=document.getElementById("btnJump"),btnC=document.getElementById("btnCrouch");
    if(btnL&&btnR&&btnJ){
      const activeBtns=new Set(), updateActive=()=>{anyTouchBtnActive=activeBtns.size>0;};
      const press=(btn,action,val)=>{
        const start=(e)=>{e.preventDefault();ensureAudio();touch[action]=val;btn.classList.add("pressed");activeBtns.add(btn.id);updateActive();};
        const end=(e)=>{e.preventDefault();touch[action]=false;btn.classList.remove("pressed");activeBtns.delete(btn.id);updateActive();};
        btn.addEventListener("touchstart",start,{passive:false});btn.addEventListener("touchend",end,{passive:false});btn.addEventListener("touchcancel",end,{passive:false});
        btn.addEventListener("mousedown",start);btn.addEventListener("mouseup",end);btn.addEventListener("mouseleave",end);
      };
      press(btnL,"left",true); press(btnR,"right",true);
      if(btnC) press(btnC,"crouch",true);
      const jumpStart=(e)=>{e.preventDefault();ensureAudio();touch.jump=true;btnJ.classList.add("pressed");activeBtns.add(btnJ.id);updateActive();};
      const jumpEnd=(e)=>{e.preventDefault();touch.jump=false;btnJ.classList.remove("pressed");activeBtns.delete(btnJ.id);updateActive()};
      btnJ.addEventListener("touchstart",jumpStart,{passive:false});btnJ.addEventListener("touchend",jumpEnd,{passive:false});btnJ.addEventListener("touchcancel",jumpEnd,{passive:false});
      btnJ.addEventListener("mousedown",jumpStart);btnJ.addEventListener("mouseup",jumpEnd);btnJ.addEventListener("mouseleave",jumpEnd);
    }
  }

  // ===== Animação VanBerto =====
  function scheduleBlink(scene){
    const blinkOnce=()=>{
      if(!player) return;
      if(player.getData("usingPng")){
        // PNG mode: piscar com fade rápido de alpha (0.85) e scaleY ligeiro
        const origAlpha = player.alpha;
        scene.tweens.add({
          targets: player,
          scaleY: { from: player.scaleY, to: player.scaleY * 0.85 },
          alpha:  { from: origAlpha, to: Math.max(0.7, origAlpha - 0.15) },
          duration: 60, yoyo: true,
          onComplete: () => { if(player) player.setAlpha(origAlpha); }
        });
      } else {
        // De vez em quando (≈35%) o piscar idle é antes um pisca-olho brincalhão —
        // reaproveita exatamente o mesmo mecanismo, só troca a textura usada.
        const isWink = Math.random() < 0.35;
        const dur = isWink ? 220 : 120;
        _eyeOverrideUntil = scene.time.now + dur;
        player.setTexture(isWink ? "vanberto_wink" : "vanberto_blink");
        scene.time.delayedCall(dur,()=>{if(player)applyVanBertoTexture(scene);});
      }
      scene.time.delayedCall(2200+Math.floor(Math.random()*2600),blinkOnce);
    };
    scene.time.delayedCall(1800,blinkOnce);
  }

  // Pisca-olho ao tocar/clicar no VanBerto's — interação direta, independente do
  // ciclo idle acima. Ignorado durante overlays/quiz/pausa e em modo PNG (sem textura própria).
  let _vbWinkBusy = false;
  function triggerVanBertoWink(scene){
    if(!player || player.getData("usingPng") || _vbWinkBusy) return;
    if(awaitingQuiz || awaitingStory || pausedByTeacher || _overlayPaused) return;
    if(!startOverlay.classList.contains("hidden") || !historyOverlay.classList.contains("hidden")) return;
    _vbWinkBusy = true;
    ensureAudio(); beep({freq:1000,dur:0.05,type:"triangle",vol:0.045,slideTo:1300});
    _eyeOverrideUntil = scene.time.now + 320;
    player.setTexture("vanberto_wink");
    showFloat(scene, player.x, player.y-46, "😉", "#ffd700");
    scene.time.delayedCall(320, () => {
      _vbWinkBusy = false;
      if(player) applyVanBertoTexture(scene);
    });
  }

  // Sorriso grande ao acontecer algo bom (ex: apanhar um coração) — reação breve,
  // não interativa, só reforça positivamente o momento.
  function triggerVanBertoHappy(scene, duration=650){
    if(!player || player.getData("usingPng")) return;
    if(!startOverlay.classList.contains("hidden") || !historyOverlay.classList.contains("hidden")) return;
    _eyeOverrideUntil = scene.time.now + duration;
    player.setTexture("vanberto_happy");
    scene.time.delayedCall(duration, () => { if(player) applyVanBertoTexture(scene); });
  }

  // Cara triste ao perder uma vida — dura o suficiente para se ver durante o
  // knockback e o teletransporte de volta ao spawn, sem se prolongar depois disso.
  function triggerVanBertoSad(scene, duration=900){
    if(!player || player.getData("usingPng")) return;
    _eyeOverrideUntil = scene.time.now + duration;
    player.setTexture("vanberto_sad");
    // Ligeiro tom avermelhado enquanto a cara triste dura — reforça visualmente
    // a dor do "ai!" além da expressão. Restaura a cor certa a seguir (sem
    // atropelar star power/duplo salto, que têm as suas próprias cores).
    player.setTint(0xffaaaa);
    scene.time.delayedCall(duration, () => {
      if(!player) return;
      applyVanBertoTexture(scene);
      if(!starPower && !doubleJumpActive) player.clearTint();
    });
  }

  function applyVanBertoTexture(scene){
    if(!player||!player.body) return;
    if(scene.time.now < _eyeOverrideUntil) return; // não interromper um piscar/pisca-olho em curso
    if(awaitingQuiz||!startOverlay.classList.contains("hidden")||!historyOverlay.classList.contains("hidden")){
      if(player.getData("usingPng")){
        // PNG: estado parado — mostrar sem inclinação
        if(!invuln) { player.setScale(powered ? 1.18 : 1.0); }
      } else {
        if(player.texture.key!=="vanberto_open") player.setTexture("vanberto_open");
      }
      return;
    }
    const onGround=!!player.body.blocked.down, moving=Math.abs(player.body.velocity.x)>5;

    if(player.getData("usingPng")){
      // PNG mode: animar com squash/stretch e bob vertical
      const baseScale = powered ? 1.18 : 1.0;
      const displayW = 72 * baseScale;
      const displayH = 72 * baseScale;
      if(onGround && moving){
        // Bob de andar — passo alternado a cada 140ms com squash/stretch suave
        const step = Math.floor(scene.time.now / 140) % 4;
        // 4 fases: 0=neutro, 1=comprime (foot down), 2=neutro, 3=estica (push off)
        const bobY  = [0, 3, 0, -4][step];
        const scaleX = [1.0, 1.08, 1.0, 0.93][step];
        const scaleY = [1.0, 0.92, 1.0, 1.09][step];
        if(!invuln){
          player.setDisplaySize(displayW * scaleX, displayH * scaleY);
        }
        // Deslocar o sprite ligeiramente para cima/baixo no bob
        // (usamos a posição Y base + bobY — só visual, não afeta body)
        player.y += bobY * 0.15; // suave, não o frame inteiro
      } else if(onGround){
        // Parado — animar respiração leve
        const breathe = 0.5 + Math.sin(scene.time.now * 0.002) * 0.5;
        const scaleXb = 1.0 + breathe * 0.012;
        const scaleYb = 1.0 - breathe * 0.010;
        if(!invuln) player.setDisplaySize(displayW * scaleXb, displayH * scaleYb);
      } else {
        // No ar — esticar ligeiramente na vertical
        const vy = player.body.velocity.y;
        const stretch = vy < 0 ? 1.10 : (vy > 200 ? 0.88 : 1.0);
        const squeeze = vy < 0 ? 0.90 : (vy > 200 ? 1.12 : 1.0);
        if(!invuln) player.setDisplaySize(displayW * squeeze, displayH * stretch);
      }
    } else {
      // Canvas mode — comportamento original
      if(onGround&&moving){
        const step=Math.floor(scene.time.now/140)%2;
        const tex=step===0?"vanberto_walk1":"vanberto_walk2";
        if(player.texture.key!==tex) player.setTexture(tex);
      } else if(!onGround){
        // No ar (a saltar ou a cair) — braços erguidos, tipo "hurra!"
        if(player.texture.key!=="vanberto_jump") player.setTexture("vanberto_jump");
      } else { if(player.texture.key!=="vanberto_open") player.setTexture("vanberto_open"); }
    }
  }

  // ===== Dança do robô — antes de ser sugado pelo portal =====
  // Pequena coreografia (~4 passos, uma "dança do robô" clássica: saltinho +
  // rotação alternada esquerda/direita) tocada logo depois do portal acordar
  // e ANTES de começar a "sugar" o VanBerto's (fases de giro/encolher já
  // existentes). Puramente visual e não mexe no body físico — o jogo já está
  // em pausa nesta altura (scene.physics.pause() já foi chamado antes), tal
  // como o resto da animação de entrada no portal.
  //
  // IMPORTANTE: onComplete tem de disparar SEMPRE, exatamente uma vez, ou o
  // resto da animação do portal (e a transição de nível) fica presa. Por
  // isso os passos da dança em si (tweens, beeps, troca de textura) estão
  // isolados em try/catch e onComplete só é chamado a partir de UM único
  // temporizador de segurança com a duração total já prevista — nunca a
  // partir do fim de cada passo individual.
  function playVanBertoDance(scene, onComplete, beats = 4) {
    if (!player || !scene) { onComplete?.(); return; }
    const baseX = player.x, baseY = player.y;
    let usingPng = false;
    try { usingPng = !!(player.getData && player.getData("usingPng")); } catch (e) {}
    try { ensureAudio(); } catch (e) {}

    const beatMs = 190;
    const totalMs = beatMs * (beats + 1);

    function doBeat(i) {
      if (i >= beats || !player) return;
      try {
        const dir = i % 2 === 0 ? 1 : -1;
        scene.tweens.add({
          targets: player,
          y: baseY - 14,
          angle: dir * 16,
          duration: beatMs * 0.5,
          ease: "Sine.easeOut",
          yoyo: true
        });
        beep({ freq: 500 + i * 60, dur: 0.06, type: "square", vol: 0.05, slideTo: 700 + i * 60 });
        if (!usingPng && player.setTexture) player.setTexture(i % 2 === 0 ? "vanberto_happy" : "vanberto_wink");
        if (i % 2 === 0) showFloat(scene, baseX, baseY - 46, "🎵", "#ffd700");
      } catch (e) { /* nunca deixar um erro visual travar a dança */ }
      scene.time.delayedCall(beatMs, () => doBeat(i + 1));
    }
    doBeat(0);

    // Único ponto de saída — garante sempre a continuação do portal.
    scene.time.delayedCall(totalMs + 60, () => {
      try {
        if (player) {
          player.setAngle(0);
          player.y = baseY;
          if (!usingPng && player.setTexture) player.setTexture("vanberto_open");
        }
      } catch (e) {}
      // onComplete?.() é a única saída desta função e TEM de correr sempre — os
      // dois chamadores (porta normal e portal pós-boss) já protegem a sua
      // própria sequência com try/catch, mas este apanha-tudo extra garante
      // que um erro nunca escapa daqui por cima sem sequer ser registado.
      try { onComplete?.(); } catch (e) { console.error("onComplete da dança do VanBerto's falhou:", e); }
    });
  }

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

  // Botão "Sair" no menu principal — fecha mesmo o jogo (diferente do
  // "Sair para o Menu" que existe durante o jogo, que só volta ao menu
  // principal). window.close() só funciona em separadores/janelas abertos
  // por script (ou apps instaladas como PWA em alguns browsers); nos
  // restantes casos os browsers bloqueiam-no por segurança, por isso fica
  // sempre uma mensagem simpática como alternativa para o caso de o
  // separador não se fechar sozinho.
  const btnExitGame = document.getElementById("btnExitGame");
  if (btnExitGame) {
    btnExitGame.onclick = () => {
      if (!confirm("🚪 Sair do jogo?")) return;
      window.close();
      setTimeout(() => {
        alert("👋 Já podes fechar este separador. Até à próxima aventura!");
      }, 300);
    };
  }

  // ===== Ecrã todo =====
  const isIOS=/iP(hone|ad|od)/.test(navigator.userAgent);

  function toggleFullscreen(){
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
  document.addEventListener("fullscreenchange",()=>updateFsButtons(!!document.fullscreenElement));
  document.addEventListener("webkitfullscreenchange",()=>updateFsButtons(!!document.webkitFullscreenElement));
  const btnFs=document.getElementById("btnFullscreen");
  const btnFsGame=document.getElementById("btnFullscreenGame");
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

  // ===== Enter = clicar no botão principal ("OK"/"Continuar ▶") do ecrã aberto =====
  // Cobre os overlays de um único botão de avançar/fechar — histórico
  // ("Sabias que...?"), conquistas, álbum, estatísticas, opções, certificado,
  // galeria final, etc. — que já seguem a convenção .btn.primary no HTML, e
  // o popup de "Competência Recuperada", que é o único caso que não segue
  // essa convenção (usa a classe .show em vez de .hidden, e o botão não tem
  // .primary). O quiz tem o seu próprio fluxo acima, por isso fica de fora
  // aqui (evita clicar duas vezes no mesmo botão já focado).
  window.addEventListener("keydown", e => {
    if (e.key !== "Enter") return;
    if (e.target && e.target.matches("input, textarea, button")) return;
    const reveal = document.getElementById("artefactRevealOverlay");
    if (reveal && reveal.classList.contains("show")) {
      e.preventDefault();
      document.getElementById("arRevClose")?.click();
      return;
    }
    const primary = document.querySelector(".overlay:not(.hidden) .btn.primary:not(:disabled)");
    if (primary) { e.preventDefault(); primary.click(); }
  });

  // "Começar" mostra primeiro o ecrã de nível de dificuldade (pedido do
  // Berto — o jogo era só para 1º/2º ciclo, este ano é preciso também para
  // 3º ciclo e secundário); só depois de escolhido é que o jogo reinicia de
  // facto. Ver reallyStartNewGame() e o difficultyOverlay em index.html.
  function reallyStartNewGame(){
    ensureAudio();SFX.coin();
    playerName=(playerNameInput?.value||"").trim();
    currentLevel=0;score=0;lives=getStartLives();livesLostThisLevel=0;
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
  const btnDiffFacil = document.getElementById("btnDiffFacil");
  const btnDiffDificil = document.getElementById("btnDiffDificil");
  const pickDifficultyAndStart = (level) => {
    setDifficulty(level);
    document.getElementById("difficultyOverlay")?.classList.add("hidden");
    reallyStartNewGame();
  };
  btnDiffFacil?.addEventListener("click", () => { SFX.coin(); pickDifficultyAndStart("facil"); });
  btnDiffDificil?.addEventListener("click", () => { SFX.coin(); pickDifficultyAndStart("dificil"); });

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

  // =====================================================
  // ===== ESTATÍSTICAS GLOBAIS — rastreio persistente =====
  // =====================================================
  let globalStats = {
    totalPlayTime: 0,        // segundos
    enemiesDefeated: 0,
    quizTotal: 0,
    quizCorrect: 0,
    quizWrong: 0,
    curiositiesRead: 0,
    starsCollectedTotal: 0,
    levelsCompleted: 0,
    gamesPlayed: 0
  };
  let _statsSessionStart = Date.now();

  function loadGlobalStats() {
    const d = loadNamespace("globalStats", {});
    Object.keys(globalStats).forEach(k => {
      if (typeof d[k] === "number") globalStats[k] = d[k];
    });
  }
  function saveGlobalStats() {
    saveNamespace("globalStats", globalStats);
  }
  function updatePlayTime() {
    const elapsed = Math.floor((Date.now() - _statsSessionStart) / 1000);
    globalStats.totalPlayTime += elapsed;
    _statsSessionStart = Date.now();
    saveGlobalStats();
  }
  loadGlobalStats();

  // =====================================================
  // ===== MENSAGENS DINÂMICAS (feedback contextual) =====
  // =====================================================

  function showDynamicMsg(msgs, duration = 2400) {
    // Não mostrar no alto contraste (distração)
    if (document.body.classList.contains("hc-mode")) return;
    const overlay = document.getElementById("dynamicMsgOverlay");
    const textEl  = document.getElementById("dynamicMsgText");
    if (!overlay || !textEl) return;
    textEl.textContent = msgs[Math.floor(Math.random() * msgs.length)];
    overlay.classList.add("show");
    setTimeout(() => overlay.classList.remove("show"), duration);
  }

  // =====================================================
  // ===== UTILITÁRIO: pausar/retomar física ao abrir overlays =====
  // Qualquer ecrã que abre por cima do jogo deve pausar a física.
  // =====================================================

  // IDs dos overlays secundários (não o jogo nem o quiz/história que têm fluxo próprio)
  const SECONDARY_OVERLAYS = [
    "mapOverlay", "worldMapOverlay", "achievementsOverlay", "albumOverlay",
    "statsOverlay", "optionsOverlay", "howOverlay",
    "reviewOverlay", "artefactGalleryOverlay",
  ];

  // Fecha todos os overlays secundários antes de abrir um novo — evita sobreposições
  function closeAllSecondaryOverlays() {
    SECONDARY_OVERLAYS.forEach(id => {
      document.getElementById(id)?.classList.add("hidden");
    });
  }

  // Abre um overlay secundário garantindo que os outros estão fechados
  function openOverlay(id, beforeOpen) {
    closeAllSecondaryOverlays();
    pauseForOverlay();
    beforeOpen?.();
    document.getElementById(id)?.classList.remove("hidden");
  }

  // Fecha um overlay secundário e retoma a física
  function closeOverlay(id) {
    document.getElementById(id)?.classList.add("hidden");
    resumeAfterOverlay();
    // Se este overlay foi aberto a partir do ecrã de vitória (botões "Mapa"/"Conquistas"
    // do fim de jogo), o winOverlay tinha sido escondido para o novo overlay ficar visível
    // por cima — ver _winOverlaySubOpen mais abaixo. Repõe-lo agora que o utilizador fechou.
    if (_winOverlaySubOpen) {
      _winOverlaySubOpen = false;
      document.getElementById("winOverlay")?.classList.remove("hidden");
    }
  }

  function pauseForOverlay() {
    if (sceneRef && startOverlay.classList.contains("hidden")) {
      _overlayPaused = true;
      sceneRef.physics.pause();
    }
  }
  function resumeAfterOverlay() {
    if (!sceneRef) return;
    _overlayPaused = false;
    if (startOverlay.classList.contains("hidden")
        && !pausedByTeacher && !awaitingQuiz && !awaitingStory
        && quizOverlay.classList.contains("hidden")
        && historyOverlay.classList.contains("hidden")) {
      sceneRef.physics.resume();
    }
  }

  // =====================================================
  // ===== CONQUISTAS =====
  // =====================================================
  function openAchievementsScreen() {
    ensureAudio(); SFX.coin();
    openOverlay("achievementsOverlay", renderAchievements);
  }
  window.__vb_openAchievements = openAchievementsScreen;
  document.getElementById("btnAchievements")?.addEventListener("click", openAchievementsScreen);
  document.getElementById("btnCloseAchievements")?.addEventListener("click", () => {
    closeOverlay("achievementsOverlay");
  });

  // =====================================================
  // ===== ÁLBUM =====
  // =====================================================
  function openAlbumScreen() {
    ensureAudio(); SFX.coin();
    openOverlay("albumOverlay", renderAlbum);
  }
  window.__vb_openAlbum = openAlbumScreen;
  document.getElementById("btnAlbum")?.addEventListener("click", openAlbumScreen);
  document.getElementById("btnCloseAlbum")?.addEventListener("click", () => {
    closeOverlay("albumOverlay");
  });

  // =====================================================
  // ===== ESTATÍSTICAS — ecrã completo =====
  // =====================================================
  function renderStats() {
    const el = document.getElementById("statsContent");
    if (!el) return;
    updatePlayTime();

    const totalMinutes = Math.floor(globalStats.totalPlayTime / 60);
    const totalSeconds = globalStats.totalPlayTime % 60;
    const timeStr = totalMinutes > 0 ? `${totalMinutes}m ${totalSeconds}s` : `${totalSeconds}s`;
    const accuracy     = globalStats.quizTotal > 0 ? Math.round((globalStats.quizCorrect / globalStats.quizTotal) * 100) : 0;
    const levelsTotal  = LEVELS.length;
    const levelsComp   = mapProgress.levelsCompleted.length;
    const totalStars   = levelsTotal * 3;
    const earnedStars  = totalStarsEarned();
    const achvUnlocked = ACHIEVEMENTS_DEFS.filter(a => unlockedAchievements[a.id]).length;
    const pctLevels    = Math.round(levelsComp / levelsTotal * 100);
    const pctStars     = Math.round(earnedStars / totalStars * 100);
    const pctAchv      = Math.round(achvUnlocked / ACHIEVEMENTS_DEFS.length * 100);

    // ── Donut SVG de precisão ──────────────────────────────────────────
    function donutSVG(pct, color, bg) {
      const r = 36, cx = 44, cy = 44, stroke = 10;
      const circ = 2 * Math.PI * r;
      const dash = (pct / 100) * circ;
      return `<svg class="stats-donut-svg" width="88" height="88" viewBox="0 0 88 88">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${bg}" stroke-width="${stroke}"/>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"
          stroke-dasharray="${dash} ${circ}" stroke-dashoffset="${circ/4}"
          stroke-linecap="round" style="transition:stroke-dasharray .6s ease"/>
        <text x="${cx}" y="${cy+5}" text-anchor="middle" font-family="Baloo 2,sans-serif"
          font-size="16" font-weight="900" fill="${color}">${pct}%</text>
      </svg>`;
    }

    // ── Barras horizontais ─────────────────────────────────────────────
    function barChart(items) {
      const max = Math.max(...items.map(i => i.val), 1);
      return `<div class="stats-bar-chart">${items.map(({label, val, color}) => `
        <div class="stats-bar-row">
          <span class="stats-bar-row-label">${label}</span>
          <div class="stats-bar-row-track">
            <div class="stats-bar-row-fill" style="width:${Math.round(val/max*100)}%;background:${color}"></div>
          </div>
          <span class="stats-bar-row-val">${val}</span>
        </div>`).join("")}</div>`;
    }

    el.innerHTML = `
      <!-- ── Gráficos resumo ── -->
      <p class="stats-section-title">📊 Resumo Visual</p>
      <div class="stats-charts-row">
        <div class="stats-chart-block">
          ${donutSVG(accuracy, "#4dff91", "rgba(77,255,145,0.15)")}
          <p class="stats-chart-label">Precisão no Quiz</p>
          <p class="stats-chart-value">${globalStats.quizCorrect}✅ ${globalStats.quizWrong}❌</p>
        </div>
        <div class="stats-chart-block">
          ${donutSVG(pctStars, "#ffd700", "rgba(255,215,0,0.15)")}
          <p class="stats-chart-label">Estrelas Obtidas</p>
          <p class="stats-chart-value">${earnedStars} / ${totalStars} ⭐</p>
        </div>
        <div class="stats-chart-block">
          ${donutSVG(pctLevels, "#60c8ff", "rgba(96,200,255,0.15)")}
          <p class="stats-chart-label">Níveis Concluídos</p>
          <p class="stats-chart-value">${levelsComp} / ${levelsTotal} 🏁</p>
        </div>
        <div class="stats-chart-block">
          ${donutSVG(pctAchv, "#ff80c0", "rgba(255,128,192,0.15)")}
          <p class="stats-chart-label">Conquistas</p>
          <p class="stats-chart-value">${achvUnlocked} / ${ACHIEVEMENTS_DEFS.length} 🏆</p>
        </div>
      </div>

      <!-- ── Barras — Jogo ── -->
      <p class="stats-section-title">🎮 Jogo</p>
      ${barChart([
        { label:"👾 Inimigos",    val: globalStats.enemiesDefeated, color:"#ff6b35" },
        { label:"📖 Curiosidades",val: globalStats.curiositiesRead,  color:"#60c8ff" },
        { label:"🎮 Partidas",    val: globalStats.gamesPlayed,      color:"#ff80c0" },
        { label:"🌟 Pontos",      val: score || 0,                   color:"#ffd700" },
      ])}
      <div class="stats-grid">
        <div class="stats-item">
          <span class="stats-item-icon">⏱️</span>
          <div class="stats-item-body">
            <p class="stats-item-label">Tempo de Jogo</p>
            <p class="stats-item-value">${timeStr}</p>
          </div>
        </div>
      </div>

      <!-- ── Barras — Quiz ── -->
      <p class="stats-section-title">❓ Quiz</p>
      ${barChart([
        { label:"📋 Respondidas", val: globalStats.quizTotal,   color:"#a0a0ff" },
        { label:"✅ Certas",      val: globalStats.quizCorrect, color:"#4dff91" },
        { label:"❌ Erradas",     val: globalStats.quizWrong,   color:"#ff5555" },
      ])}
    `;
  }

  function openStatsScreen() {
    ensureAudio(); SFX.coin();
    openOverlay("statsOverlay", renderStats);
  }
  window.__vb_openStats = openStatsScreen;
  document.getElementById("btnStats")?.addEventListener("click", openStatsScreen);
  document.getElementById("btnCloseStats")?.addEventListener("click", () => {
    closeOverlay("statsOverlay");
  });
  document.getElementById("btnResetStats")?.addEventListener("click", () => {
    if (!confirm("⚠️ Apagar todas as estatísticas, conquistas, estrelas e progresso?\nEsta ação não pode ser desfeita.")) return;
    resetAllProgress();
    renderStats();
  });

  // =====================================================
  // ===== OPÇÕES — ecrã completo =====
  // =====================================================
  function syncOptionsUI() {
    const btnSound = document.getElementById("optBtnSound");
    const btnHC    = document.getElementById("optBtnHC");
    const btnTouch = document.getElementById("optBtnTouch");
    const btnFS    = document.getElementById("optBtnFS");
    const btnDiff  = document.getElementById("optBtnDifficulty");
    if (btnDiff) {
      btnDiff.textContent = difficulty === "dificil" ? "🎓 Difícil" : "😊 Fácil";
    }
    if (btnSound) {
      btnSound.textContent = isMuted() ? "🔇 OFF" : "🔊 ON";
      btnSound.classList.toggle("active", !isMuted());
    }
    const hcOn = document.body.classList.contains("hc-mode");
    if (btnHC) {
      btnHC.textContent = hcOn ? "⬛ ON" : "⬛ OFF";
      btnHC.classList.toggle("active", hcOn);
    }
    const forceTouch = document.body.classList.contains("force-touch");
    const hideTouch  = document.body.classList.contains("hide-touch");
    if (btnTouch) {
      if (forceTouch) btnTouch.textContent = "📱 ON (forçado)";
      else if (hideTouch) btnTouch.textContent = "📱 OFF";
      else btnTouch.textContent = "📱 AUTO";
    }
    if (btnFS) {
      const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement);
      btnFS.textContent = isFS ? "⛶ Sair" : "⛶ Entrar";
      btnFS.classList.toggle("active", isFS);
    }
  }

  function openOptionsScreen() {
    ensureAudio(); SFX.coin();
    openOverlay("optionsOverlay", syncOptionsUI);
  }
  window.__vb_openOptions = openOptionsScreen;
  document.getElementById("btnOptions")?.addEventListener("click", openOptionsScreen);
  document.getElementById("btnCloseOptions")?.addEventListener("click", () => {
    closeOverlay("optionsOverlay");
  });

  // Botões dentro de Opções
  document.getElementById("optBtnSound")?.addEventListener("click", () => {
    ensureAudio();
    const m = toggleMuted();
    btnMute.textContent = m ? "🔇 Som: OFF" : "🔊 Som: ON";
    saveGame();
    syncOptionsUI();
  });
  document.getElementById("optBtnDifficulty")?.addEventListener("click", () => {
    ensureAudio(); SFX.coin();
    setDifficulty(difficulty === "dificil" ? "facil" : "dificil");
    syncOptionsUI();
  });
  document.getElementById("optBtnHC")?.addEventListener("click", () => {
    const hcOn = document.body.classList.contains("hc-mode");
    document.body.classList.toggle("hc-mode", !hcOn);
    const s = loadNamespace("settings", {});
    s.hc = !hcOn;
    saveNamespace("settings", s);
    syncOptionsUI();
  });
  document.getElementById("optBtnTouch")?.addEventListener("click", () => {
    // Ciclar: AUTO → ON → OFF → AUTO
    const forceTouch = document.body.classList.contains("force-touch");
    const hideTouch  = document.body.classList.contains("hide-touch");
    if (!forceTouch && !hideTouch) {
      document.body.classList.add("force-touch");
    } else if (forceTouch) {
      document.body.classList.remove("force-touch");
      document.body.classList.add("hide-touch");
    } else {
      document.body.classList.remove("hide-touch");
    }
    syncOptionsUI();
  });
  document.getElementById("optBtnFS")?.addEventListener("click", () => {
    toggleFullscreen();
    setTimeout(syncOptionsUI, 300);
  });

  // =====================================================
  // ===== CERTIFICADO FINAL =====
  // =====================================================
  function showCertificate() {
    const overlay = document.getElementById("certificateOverlay");
    if (!overlay) return;

    // Nome
    const certName = document.getElementById("certPlayerName");
    if (certName) certName.textContent = playerName || "Ciber-Herói";

    // Pontuação
    const certScore = document.getElementById("certScore");
    if (certScore) certScore.textContent = score;

    // Estrelas — fonte de verdade (persistente) para tudo o resto abaixo
    const earned = totalStarsEarned();
    const totalStarsPossible = LEVELS.length * 3;
    const allThreeStarsEverywhere = earned === totalStarsPossible;

    // Percentagem
    // BUG CORRIGIDO: isto usava quizStats (contador só desta sessão do
    // browser, reposto a 0 sempre que a página é recarregada — ver
    // resetQuizStats), enquanto "Estrelas" logo abaixo já usa
    // totalStarsEarned(), que É persistente. Resultado: um jogador que
    // fechasse e reabrisse o jogo a meio da aventura podia ver, no MESMO
    // certificado, "60/60 estrelas" e ao mesmo tempo uma percentagem/medalha
    // baixa (ou 0%), porque só contava os quizzes respondidos depois do
    // último carregamento da página — incoerente. globalStats.quizTotal/
    // quizCorrect é a versão persistente do mesmo contador (soma de todas as
    // sessões), por isso é essa que deve ser usada aqui. Além disso, se
    // todos os níveis já têm 3 estrelas, o certificado garante sempre
    // 100% / Perfeito — nunca deve contradizer esse resultado.
    const pct = allThreeStarsEverywhere
      ? 100
      : (globalStats.quizTotal > 0 ? Math.round((globalStats.quizCorrect / globalStats.quizTotal) * 100) : 0);
    const certCorrect = document.getElementById("certCorrect");
    if (certCorrect) certCorrect.textContent = `${pct}%`;

    // Medalha
    const certMedal = document.getElementById("certMedal");
    if (certMedal) {
      certMedal.textContent = allThreeStarsEverywhere ? "🥇 Perfeito" : pct >= 80 ? "🥈 Excelente" : pct >= 60 ? "🥉 Bom" : "📚 A Melhorar";
    }

    // Estrelas
    const certStars = document.getElementById("certStars");
    if (certStars) {
      certStars.textContent = `${earned}/${totalStarsPossible}`;
    }

    // Data
    const certDate = document.getElementById("certDate");
    if (certDate) {
      const now = new Date();
      certDate.textContent = now.toLocaleDateString("pt-PT", { day:"numeric", month:"long", year:"numeric" });
    }

    overlay.classList.remove("hidden");
    ensureAudio(); SFX.finalWin();
  }

  document.getElementById("btnWinCertificate")?.addEventListener("click", () => {
    document.getElementById("winOverlay")?.classList.add("hidden");
    showCertificate();
  });

  // "Voltar" — fecha certificado e volta ao ecrã de vitória
  document.getElementById("btnCertBack")?.addEventListener("click", () => {
    document.getElementById("certificateOverlay")?.classList.add("hidden");
    document.getElementById("winOverlay")?.classList.remove("hidden");
  });

  // "Jogar de novo" — fecha tudo e recomeça
  document.getElementById("btnCertRestart")?.addEventListener("click", () => {
    document.getElementById("certificateOverlay")?.classList.add("hidden");
    document.getElementById("confetti")?.classList.add("hidden");
    const _gameDiv = document.getElementById("game");
    if (_gameDiv) _gameDiv.style.visibility = "";
    try{sceneRef.scene.resume();}catch{}
    if (powerHaloGfx) { powerHaloGfx.clear(); powerHaloGfx.setVisible(true); }
    if (shadowGfx) shadowGfx.setVisible(true);
    // Sem isto, se o jogo tivesse ficado em pausa (professora) ou com um
    // overlay do menu/mapa aberto no momento em que a última pergunta foi
    // respondida, estas flags ficavam presas a "true" — e como nenhum
    // watchdog protege contra _overlayPaused sozinho (só awaitingQuiz/
    // awaitingStory têm um), o robot ficava travado a 0 de velocidade para
    // sempre no nível 1, dando a sensação de "recomeçar não funciona".
    pausedByTeacher = false; _overlayPaused = false;
    if (btnPause) btnPause.textContent = "⏸ Pausa";
    showPauseScreen(false);
    lives=getStartLives(); score=0; currentLevel=0; livesLostThisLevel=0;
    // "Jogar de novo" é sempre um recomeço total — ver resetAllProgress()
    resetAllProgress();
    awaitingQuiz=true;
    scoreText?.setText("🌟 Pontos: 0"); updateHearts?.();
    document.body.classList.add("game-started");
    playLevelTransition(sceneRef, 0,
      () => { loadLevel(sceneRef, 0); saveGame(); },
      () => { showHistory(0, () => { awaitingQuiz=false; if(!pausedByTeacher) sceneRef?.physics.resume(); }); }
    );
  });

  document.getElementById("btnCertPrint")?.addEventListener("click", () => {
    window.print();
  });

  // =====================================================
  // ===== RASTREIO DE EVENTOS PARA ESTATÍSTICAS =====
  // Integra com eventos já existentes no jogo
  // =====================================================

  // Expor globalmente para ser chamado no lugar certo
  window.__vb_trackEnemyDefeat = function() {
    if(typeof globalStats !== "undefined") {
      globalStats.enemiesDefeated += 1;
      saveGlobalStats();
    }
  };

  // Salvar tempo de jogo ao fechar/esconder
  window.addEventListener("beforeunload", () => { updatePlayTime(); });

  // =====================================================
  // Compatibilidade: openComingSoon ainda existe mas nunca
  // deve ser chamado (substituímos todos os botões acima)
  // =====================================================
  function openComingSoon(title, text) {
    // fallback: não deve ser chamado
    console.warn("openComingSoon chamado para:", title);
  }

  const btnRetry=document.getElementById("btnRetry"), btnExit=document.getElementById("btnExit");
  if(btnRetry) btnRetry.onclick=()=>{
    gameOverOverlay.classList.add("hidden");
    pausedByTeacher=false; _overlayPaused=false;
    lives=getStartLives(); livesLostThisLevel=0; updateHearts();
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
    score=0;resetQuizStats();
    Object.keys(usedQuizByLevel).forEach(k=>usedQuizByLevel[k].clear());
    Object.keys(usedQuizByTheme).forEach(k=>usedQuizByTheme[k].clear());
    scoreText.setText(`🌟 Pontos: ${score}`);
    const retryLevel = currentLevel ?? 0;
    loadLevel(sceneRef, retryLevel);
    showHistory(retryLevel, () => { awaitingQuiz=false; if(!pausedByTeacher) sceneRef.physics.resume(); });
    saveGame();
  };
  if(btnExit) btnExit.onclick=()=>{
    gameOverOverlay.classList.add("hidden");try{sceneRef.physics.pause();}catch{}
    lives=getStartLives();score=0;resetQuizStats();livesLostThisLevel=0;
    startOverlay.classList.remove("hidden");
  };

  const btnWinRestart=document.getElementById("btnWinRestart");
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
    pausedByTeacher = false; _overlayPaused = false;
    if (btnPause) btnPause.textContent = "⏸ Pausa";
    showPauseScreen(false);
    lives=getStartLives();score=0;currentLevel=0;livesLostThisLevel=0;
    // "Jogar de novo" é sempre um recomeço total — ver resetAllProgress()
    resetAllProgress();
    awaitingQuiz=true;
    scoreText?.setText(`🌟 Pontos: 0`); updateHearts?.();
    document.body.classList.add("game-started");
    playLevelTransition(sceneRef, 0,
      () => { loadLevel(sceneRef, 0); saveGame(); },
      () => { showHistory(0, () => { awaitingQuiz=false; if(!pausedByTeacher) sceneRef?.physics.resume(); }); }
    );
  };

  // =====================================================
  // ===== CONTAR PARTIDAS em Nova Aventura =====
  // =====================================================
  const _origBtnStart_onclick = btnStart.onclick;
  btnStart.addEventListener("click", () => {
    if(typeof globalStats !== "undefined") {
      globalStats.gamesPlayed += 1;
      _statsSessionStart = Date.now();
      saveGlobalStats();
    }
  });

  // =====================================================
  // ===== VANBERTO'S PERSONALITY — piscar olhos HTML =====
  // =====================================================
  (function initVanbertoPersonality() {
    function blinkRobots() {
      document.querySelectorAll(
        ".win-robot-img, .pause-robot-img, .gameover-robot-img, .main-story-robot-img, .certificate-robot-img"
      ).forEach(img => {
        const origFilter = img.style.filter || "";
        img.style.transition = "filter 0.04s";
        img.style.filter = origFilter + " brightness(0.1)";
        setTimeout(() => { img.style.filter = origFilter; }, 80);
      });
    }
    function schedBlink() {
      const delay = 2000 + Math.random() * 3000;
      setTimeout(() => { blinkRobots(); schedBlink(); }, delay);
    }
    schedBlink();

    // Partículas brilhantes na história principal
    const particlesEl = document.querySelector(".main-story-particles");
    if (particlesEl) {
      const styleTag = document.createElement("style");
      styleTag.textContent = `
        @keyframes msParticle0 { 0%{transform:translate(0,0)scale(0);opacity:0}30%{opacity:1}100%{transform:translate(-28px,-34px)scale(0.3);opacity:0} }
        @keyframes msParticle1 { 0%{transform:translate(0,0)scale(0);opacity:0}30%{opacity:1}100%{transform:translate(22px,-28px)scale(0.3);opacity:0} }
        @keyframes msParticle2 { 0%{transform:translate(0,0)scale(0);opacity:0}30%{opacity:1}100%{transform:translate(-14px,-42px)scale(0.3);opacity:0} }
        @keyframes msParticle3 { 0%{transform:translate(0,0)scale(0);opacity:0}30%{opacity:1}100%{transform:translate(30px,-18px)scale(0.3);opacity:0} }
      `;
      document.head.appendChild(styleTag);
      let pIdx = 0;
      setInterval(() => {
        const p = document.createElement("div");
        const colors = ["#ffd700","#ff80ff","#80d0ff","#a0ff80","#ffa0a0"];
        p.style.cssText = `
          position:absolute;width:6px;height:6px;border-radius:50%;
          background:${colors[pIdx%colors.length]};
          left:${25+Math.random()*50}%;top:${35+Math.random()*40}%;
          opacity:0;pointer-events:none;
          animation:msParticle${pIdx%4} ${0.9+Math.random()*0.5}s ease-out forwards;
        `;
        particlesEl.appendChild(p);
        setTimeout(() => p.remove(), 1500);
        pIdx++;
      }, 350);
    }
  })();

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
        if (_starMelodyInterval) { clearInterval(_starMelodyInterval); _starMelodyInterval = null; window._dc_starMelodyInterval = null; }
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
        if (awaitingQuiz || awaitingStory) { awaitingQuiz = false; awaitingStory = false; }
        sceneRef.physics.resume();
      }
    } catch {}
  });

});

// Resize
window.addEventListener("resize",()=>{try{if(window.__dc_game?.scale)window.__dc_game.scale.refresh();}catch{}});