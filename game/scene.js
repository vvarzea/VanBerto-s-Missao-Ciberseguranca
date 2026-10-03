/*************************************************
 * VanBerto's — Missão Cibersegurança 🛡️  ·  game/scene.js
 *
 * Configuração e ciclo do Phaser: preload, create, update (o ciclo de cada frame) e o ecrã de pausa.
 *
 * Faz parte de dia-crianca.js, dividido em módulos (ver README.md, «Estrutura do código»).
 * As variáveis de estado vivem em state.js; aqui alteram-se com set_<nome>().
 *************************************************/

import { createArtOrbs } from "./artefacts.js?v=20261003v100";
import { updateBossFight } from "./boss-combat.js?v=20261003v100";
import { btnCloseQuiz, btnMute, btnPause, btnRestart, btnRestartGame, gameOverOverlay, historyOverlay, quizOverlay, startOverlay, winOverlay } from "./dom.js?v=20261003v100";
import { playLevelTransition } from "./door.js?v=20261003v100";
import { pickPraise, showFloat } from "./feedback.js?v=20261003v100";
import { createTouchInput } from "./input.js?v=20261003v100";
import { onCollectItem, onHitMalware, poweredCountdownVal } from "./items.js?v=20261003v100";
import { loadLevel, updateHUD, updateHearts, updateProgressBar } from "./level.js?v=20261003v100";
import { BG_FILES, _bootLevelIdx, bgKeyForLevel, prefersReducedMotion, renderMap, setupBackgroundLoading } from "./map.js?v=20261003v100";
import { SECONDARY_OVERLAYS, closeAllSecondaryOverlays, loadGame, openOverlay, saveGame } from "./overlays.js?v=20261003v100";
import { clearQuizReview, quizStats, resetQuizStats, showHistory, usedQuizByLevel, usedQuizByTheme } from "./quiz.js?v=20261003v100";
import { exitCrouch, setCrouchHitbox, tryEnterPipe } from "./rooms.js?v=20261003v100";
import { COYOTE_MS, GRAVITY, JUMP_BUFFER_MS, _critterSession, _doorAnimRunning, _doorWatchdogTimer, _hudDirty, _landingCheckTimer, _overlayPaused, _pipeDownWasHeld, _pipeWarping, _suppressCrouchUntilRelease, awaitingQuiz, awaitingStory, balloons, bossState, controlsInvertedUntil, coyoteUntil, critters, currentLevel, cursors, door, doorOverlap, doubleJumpActive, doubleJumpUsed, getStartLives, hazards, inBossFight, inSecretRoom, invuln, isCrouching, itemsGroup, jumpBufferedUntil, keyS, keySpace, lives, malwareGroup, mapProgress, pauseOverlayGfx, pausedByTeacher, pipes, platforms, player, powerHaloGfx, powered, progressBg, progressFill, resetPipeWarpState, sceneRef, score, scoreText, set__doorAnimRunning, set__doorWatchdogTimer, set__historySubOpen, set__hudDirty, set__landingCheckTimer, set__overlayPaused, set__pipeDownWasHeld, set__suppressCrouchUntilRelease, set_awaitingQuiz, set_awaitingStory, set_coyoteUntil, set_cursors, set_difficultyBadge, set_doorOverlap, set_doubleJumpUsed, set_heartsGfx, set_hudText, set_isCrouching, set_itemCountText, set_itemsGroup, set_jumpBufferedUntil, set_keyS, set_keySpace, set_lives, set_livesLostThisLevel, set_malwareGroup, set_pauseOverlayGfx, set_pausedByTeacher, set_platforms, set_player, set_playerNameHUD, set_powerHaloGfx, set_powerIndicator, set_progressBg, set_progressFill, set_sceneRef, set_score, set_scoreText, set_shadowGfx, set_sunAngle, set_tipText, set_transitionGfx, set_transitionLabel, shadowGfx, starPower, starPowerCountVal, sunAngle, touch, updateDifficultyBadge } from "./state.js?v=20261003v100";
import { flushScoreToStats } from "./stats.js?v=20261003v100";
import { applyVanBertoTexture, scheduleBlink, triggerVanBertoWink } from "./vanberto.js?v=20261003v100";
import { updateDecorativePipeReactions, updateHazards, updateMovingPlatforms, updatePipeHintSign, updateSecretSigns, updateSecrets, updateSigns, updateTrampolines } from "./world.js?v=20261003v100";
import { makeTextures } from "../textures.js?v=20261003v100";
import { initBackground, drawSun, NIGHT_THEMES, drawStars, clouds, drawCloud, updateTrail, updateFootsteps, updateDoorGlow, updatePlatformDecor, bgConfetti } from "../background.js?v=20261003v100";
import { isMuted, ensureAudio, SFX, beep } from "../audio.js?v=20261003v100";
import { LEVELS, THEMES } from "../data-levels.js?v=20261003v100";
import { ACHIEVEMENTS_DEFS } from "../data-progression.js?v=20261003v100";
import { unlockedAchievements } from "../achievements.js?v=20261003v100";
import { totalStarsEarned } from "../stars.js?v=20261003v100";
import { PAUSE_TIPS } from "../data-flavor.js?v=20261003v100";

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

export const ROOM_WORLD_W   = 1000;  // > 960 (largura do ecrã) para nunca sobrar canto vazio

export const ROOM_THEME_IDX = 12;    // "violeta mágico" 🌙 — assinatura visual fixa de TODAS as salas secretas, sempre igual, para se reconhecer logo "sala secreta" independentemente do nível

export const ROOM_LEDGE   = {x:500,y:460,w:280,h:28};

export const ROOM_ITEM_XY = {x:500,y:360};

export const ROOM_PIPE_XY = {x:600,y:414,w:64,h:64}; // tamanho normal (64×64) — antes 56×44, ficava desproporcionado/"cortado" tal como os outros canos que já corrigimos; y ajustado para a base continuar encostada ao chão da sala (ROOM_LEDGE.y=460,h=28 → topo em 446 = 414+32)

export const ROOM_LANDING_Y = 400; // ponto de aterragem ao entrar (x:420 — ver enterSecretRoomFlow)

let config;

function preload() {
  // PNG externa desativada: a imagem vanberto_real.png não é quadrada
  // (555×788px) e o jogo força-a num quadrado 72×72, o que a deixa
  // esticada/distorcida. Por isso usamos sempre o robô desenhado em
  // Canvas ("vanberto_open"), que é o que aparece corretamente tanto
  // localmente como online — e, desde a v67, é também a MESMA imagem
  // (vanberto_real.png, gerada a partir deste desenho em Canvas) usada nos
  // ecrãs fora do jogo (certificado, vitória, derrota, pausa, etc.), para
  // o robô ter sempre o mesmo aspeto em todo o lado (pedido do Berto).
  // this.load.image("vanberto_png", "vanberto_real.png");

  // Fundos dos níveis: só o do nível em que o jogo arranca e o das salas secretas
  // (fixo em todos os mundos, de propósito — ver ROOM_THEME_IDX). Os outros são
  // carregados em segundo plano por setupBackgroundLoading().
  [bgKeyForLevel(_bootLevelIdx), "bg_sala_secreta"].forEach(k => { if (k && BG_FILES[k]) this.load.image(k, BG_FILES[k]); });
}

export function initPhaser() {
  if (window.__dc_game) return;
  // Texturas em canvas (ex.: "PORTAL!" em textures.js) usam o Baloo 2 700: pede-o já,
  // para estar carregado quando o preload das imagens terminar e as texturas forem geradas.
  try { document.fonts && document.fonts.load("700 11px 'Baloo 2'"); } catch (e) {}
  const game = new Phaser.Game(config);
  window.__dc_game = game;
}

function create() {
  set_sceneRef( this);
  set_cursors( this.input.keyboard.createCursorKeys());
  set_keySpace( this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE));
  set_keyS( this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S)); // tecla alternativa para agachar
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
  // Respeita "reduzir movimento" do sistema: sem abanões nem flashes do ecrã.
  if (prefersReducedMotion()) { const cam = this.cameras.main; cam.shake = () => cam; cam.flash = () => cam; }
  setupBackgroundLoading(this);

  makeTextures(this);
  initBackground(this);

  set_shadowGfx( this.add.graphics().setDepth(1));
  set_powerHaloGfx( this.add.graphics().setDepth(2));

  // HUD
  set_hudText( this.add.text(14, 10, "", { fontSize:"16px", fontStyle:"900", color:"#fff5e0", stroke:"#200040", strokeThickness:4 }).setScrollFactor(0).setDepth(100));
  set_scoreText( this.add.text(14, 32, "", { fontSize:"14px", fontStyle:"900", color:"#ffd700", stroke:"#200040", strokeThickness:3 }).setScrollFactor(0).setDepth(100));
  // Nome do jogador — elemento HTML fixo (não Phaser), acima de tudo
  set_playerNameHUD( document.getElementById("playerNameHtml"));
  set_heartsGfx( this.add.graphics().setScrollFactor(0).setDepth(100));
  set_tipText( this.add.text(14, 74, "", { fontSize:"13px", fontStyle:"800", color:"#ff6b35", stroke:"#fff5e0", strokeThickness:3 }).setScrollFactor(0).setDepth(100));
  set_itemCountText( this.add.text(14, 92, "", { fontSize:"12px", fontStyle:"800", color:"#fff5e0", stroke:"#200040", strokeThickness:2 }).setScrollFactor(0).setDepth(100));

  set_progressBg( this.add.graphics().setScrollFactor(0).setDepth(100));
  set_progressFill( this.add.graphics().setScrollFactor(0).setDepth(100));
  progressBg.fillStyle(0x000000, 0.20);
  progressBg.fillRoundedRect(8, 110, 230, 10, 5);

  set_powerIndicator( this.add.text(960-14, 52, "", { fontSize:"14px", fontStyle:"900", color:"#ffd700", stroke:"#200040", strokeThickness:4 }).setScrollFactor(0).setDepth(102).setOrigin(1,0));

  // Crachá fixo da dificuldade atual (Fácil/Difícil/Extremo) — sempre
  // visível, canto superior direito, por baixo do powerIndicator (y=52),
  // que é a mesma zona onde o "⭐ STAR POWER" já fica sempre bem visível,
  // sem ser tapado pelo botão HTML "☰ Menu" (fixo no verdadeiro canto do
  // ecrã, fora do canvas — y=10 ficava por baixo dele, reportado com print).
  set_difficultyBadge( this.add.text(960-14, 76, "", { fontSize:"13px", fontStyle:"900", color:"#8affc1", stroke:"#200040", strokeThickness:3 }).setScrollFactor(0).setDepth(102).setOrigin(1,0));
  updateDifficultyBadge();

  // ── HUD de orbes dos artefactos ────────────────────────────────
  createArtOrbs(this);

  // Assinatura da professora — dentro da faixa castanha do chão, muito subtil
  this.add.text(960-8, 536, "✦ © Prof.ª Vanda Várzea ✦", {
    fontSize:"11px", fontStyle:"italic", fontFamily:"Georgia, 'Times New Roman', serif", color:"#f5d9a8",
    stroke:"#3a1a00", strokeThickness:2
  }).setScrollFactor(0).setDepth(100).setOrigin(1,1).setAlpha(0.7);

  set_pauseOverlayGfx( this.add.graphics().setScrollFactor(0).setDepth(500));
  // pauseVanImg e pauseLabel removidos — substituídos pelo overlay HTML #pauseInfoOverlay

  set_transitionGfx( this.add.graphics().setScrollFactor(0).setDepth(800).setAlpha(0));
  set_transitionLabel( this.add.text(480, 270, "", { fontSize:"32px", fontStyle:"900", color:"#ffd700", stroke:"#200040", strokeThickness:8, align:"center" }).setOrigin(0.5).setScrollFactor(0).setDepth(801).setAlpha(0));

  set_platforms( this.physics.add.staticGroup());
  set_itemsGroup( this.physics.add.group({ allowGravity:false }));
  set_malwareGroup( this.physics.add.group());

  // Usar a PNG original do VanBerto's como sprite de jogo se disponível,
  // senão cair no Canvas gerado como fallback
  const vanKey = this.textures.exists("vanberto_png") ? "vanberto_png" : "vanberto_open";
  set_player( this.physics.add.sprite(480, 460, vanKey));
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
      set_pausedByTeacher( !pausedByTeacher);
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
      set_pausedByTeacher(false); set__overlayPaused(false); btnPause.textContent="⏸ Pausa"; showPauseScreen(false);
      quizOverlay.classList.add("hidden"); btnCloseQuiz.classList.add("hidden");
      historyOverlay.classList.add("hidden"); set__historySubOpen( false);
      // Matar todos os tweens pendentes (porta e robot) para evitar que callbacks antigos
      // disparem showQuiz no nível novo se o botão for pressionado durante a animação da porta
      try { sceneRef.tweens.killAll(); } catch {}
      resetPipeWarpState();
      set__doorAnimRunning( false);
      touch.left=touch.right=touch.jump=touch.crouch=false;
      loadLevel(sceneRef,currentLevel);
      showHistory(currentLevel, () => { set_awaitingQuiz(false); if(!pausedByTeacher) sceneRef.physics.resume(); });
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
    set__doorAnimRunning( false);
    touch.left = touch.right = touch.jump = touch.crouch = false;
    set_pausedByTeacher( false); set__overlayPaused( false);
    if (btnPause) btnPause.textContent = "⏸ Pausa"; showPauseScreen(false);
    teacherMenuPanel?.classList.remove("open");
    quizOverlay.classList.add("hidden"); btnCloseQuiz.classList.add("hidden");
    historyOverlay.classList.add("hidden"); set__historySubOpen( false);
    gameOverOverlay.classList.add("hidden");
    winOverlay.classList.add("hidden"); document.getElementById("confetti")?.classList.add("hidden");
    closeAllSecondaryOverlays();
    set_lives( getStartLives()); flushScoreToStats(); set_score( 0); resetQuizStats(); set_livesLostThisLevel( 0);
    startOverlay.classList.remove("hidden");
    saveGame();
  }

  if (btnRestartGame) {
    btnRestartGame.onclick = () => {
      if (!sceneRef) return;
      set_pausedByTeacher(false); set__overlayPaused(false); btnPause.textContent="⏸ Pausa"; showPauseScreen(false);
      quizOverlay.classList.add("hidden"); btnCloseQuiz.classList.add("hidden");
      historyOverlay.classList.add("hidden"); set__historySubOpen( false);
      // Matar todos os tweens pendentes antes de reiniciar
      try { sceneRef.tweens.killAll(); } catch {}
      resetPipeWarpState();
      set__doorAnimRunning( false);
      touch.left=touch.right=touch.jump=touch.crouch=false;
      flushScoreToStats(); set_score(0); set_lives(getStartLives()); set_livesLostThisLevel(0);
      resetQuizStats(); Object.keys(usedQuizByLevel).forEach(k=>usedQuizByLevel[k].clear()); Object.keys(usedQuizByTheme).forEach(k=>usedQuizByTheme[k].clear()); clearQuizReview();
      scoreText.setText(`🌟 Pontos: ${score}`); updateHearts();
      loadLevel(sceneRef,0);
      showHistory(0, () => { set_awaitingQuiz(false); if(!pausedByTeacher) sceneRef.physics.resume(); });
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
      set_pausedByTeacher(false); btnPause.textContent="⏸ Pausa"; showPauseScreen(false);
      quizOverlay.classList.add("hidden"); btnCloseQuiz.classList.add("hidden");
      historyOverlay.classList.add("hidden"); set__historySubOpen( false); set_awaitingQuiz(false);
      // Cancelar timers da porta antes de mudar de nível
      if(_doorWatchdogTimer){ try{_doorWatchdogTimer.remove(false);}catch{} set__doorWatchdogTimer(null); }
      if(_landingCheckTimer){ try{_landingCheckTimer.remove(false);}catch{} set__landingCheckTimer(null); }
      // Remover overlap da porta antiga antes da transição para evitar disparo acidental
      if(doorOverlap){ try{ sceneRef.physics.world.removeCollider(doorOverlap); }catch{} set_doorOverlap(null); }
      touch.left=touch.right=touch.jump=touch.crouch=false;
      set_livesLostThisLevel(0);
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
        set__overlayPaused( true);
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
        set__overlayPaused( false);
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
          set__overlayPaused( false);
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
          set__overlayPaused( false);
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
    _panelBtn("mBtnCertificate",  () => window.__vb_openCertificate?.());
    _panelBtn("mBtnOptions",      () => window.__vb_openOptions?.());
    _panelBtn("mBtnHow",          () => window.__vb_openHow?.());
  }
}

// Dicas de pausa rotativas

let _pauseTipIdx = 0;

export function showPauseScreen(on) {
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
        set_score(score + (pts)); scoreText.setText(`🌟 Pontos: ${score}`);
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

// Wrapper de segurança: chama o update "real" (updateGameFrame) dentro de
// um try/catch. Sem isto, QUALQUER erro não previsto lançado a meio de um
// frame (em qualquer sub-sistema: canos, balões, vilões, drones, etc.)
// interrompe a própria função update() do Phaser antes de esta terminar —
// como o motor de jogo volta a chamar update() através do seu próprio
// requestAnimationFrame recursivo, uma exceção a meio impede esse
// reagendamento e o jogo congela por completo, para sempre, exatamente
// como reportado (ecrã parado, sem resposta a nada). Isto explica também
// vários bugs de "travamento" já corrigidos antes (cada um por sua causa
// própria) — o padrão é sempre o mesmo: uma exceção nova e ainda não
// encontrada em qualquer parte do update() trava tudo. Este wrapper não
// corrige a causa de nenhum erro específico, mas impede que qualquer erro
// futuro — já identificado ou não — volte a travar o jogo por completo:
// o erro fica registado na consola (F12) em vez de silenciosamente
// parar tudo, e o jogo continua a correr no frame seguinte.

function update() {
  try {
    updateGameFrame();
  } catch (err) {
    console.error("[VanBerto] Erro no update() — frame ignorado para não travar o jogo:", err);
  }
}

function updateGameFrame() {
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
       // cima — exatamente a sensação de "o jogo bloqueia ao chegar ao
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
        set_awaitingQuiz( false);
        set_awaitingStory( false);
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
  // Watchdog dos TWEENS — mesma lógica, mas para sceneRef.tweens.pauseAll().
  // CAUSA REAL do "fica tudo parado" (confirmado por screenshot: texto
  // flutuante "Drone +15"/"Chave de Acesso +10" preso a meio da animação
  // de desaparecer, nunca a completar): pauseForOverlay() (abrir o menu
  // de pausa, mapa, conquistas, etc.) pausa TAMBÉM os tweens, não só a
  // física — mas o resume correspondente (resumeAfterOverlay) só corre
  // nesse MESMO sítio, com uma lista de condições. Se QUALQUER outro
  // caminho do jogo tirasse a física da pausa sem passar por
  // resumeAfterOverlay() (ex: um quiz/história a terminar do lado de lá
  // do overlay, chamando só physics.resume() sem tweens.resumeAll()), os
  // tweens ficavam presos para sempre — incluindo TODOS os textos
  // flutuantes, cinemáticas e animações do jogo — mesmo com a física e o
  // resto a funcionar normalmente (por isso não aparecia erro nenhum na
  // consola). Mesma proteção do watchdog da física: só retoma quando não
  // há mesmo nenhuma razão legítima para os tweens continuarem parados.
  if (!pausedByTeacher && !awaitingStory && !awaitingQuiz && !_overlayPaused
      && sceneRef.tweens.paused) {
    sceneRef.tweens.resumeAll();
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
  if (!downHeld) set__suppressCrouchUntilRelease( false);
  const wasCrouching = isCrouching;
  if (!_pipeWarping && !_suppressCrouchUntilRelease) {
    set_isCrouching( !!downHeld && !awaitingQuiz && !awaitingStory);
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
  set__pipeDownWasHeld( downHeld);

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
  if(onGround){ set_coyoteUntil(now+COYOTE_MS); set_doubleJumpUsed(false); }

  // Deteção de "carregar saltar" (flanco, não "premido") — guarda o pedido por uns ms
  let jumpJustPressed=false;
  if(Phaser.Input.Keyboard.JustDown(cursors.up))  jumpJustPressed=true;
  if(Phaser.Input.Keyboard.JustDown(keySpace))    jumpJustPressed=true;
  if(touch.jump){ jumpJustPressed=true; touch.jump=false; }
  if(jumpJustPressed) set_jumpBufferedUntil(now+JUMP_BUFFER_MS);

  const wantJump  = now<=jumpBufferedUntil;                  // pedido (flanco) ainda dentro da janela
  const jumpHeld  = cursors.up.isDown||keySpace.isDown;      // tecla mantida (saltar segurando no chão)
  const canGround = now<=coyoteUntil;                        // ainda dá para saltar do "chão" (inclui coyote)

  if ((wantJump||jumpHeld) && canGround && !isCrouching) {
    // Salto normal — chão, coyote time (acabou de sair da plataforma) ou tecla mantida
    player.setVelocityY(powered?-680:-650); ensureAudio(); SFX.jump();
    set_jumpBufferedUntil(0); set_coyoteUntil(0); set_doubleJumpUsed(false);
    sceneRef.tweens.add({targets:player,scaleY:powered?1.26:1.11,scaleX:powered?1.11:0.95,duration:120,yoyo:true});
  } else if (wantJump&&!onGround&&doubleJumpActive&&!doubleJumpUsed&&!isCrouching) {
    // DUPLO SALTO — só com toque/tecla NOVO no ar (flanco), nunca por manter premido
    set_doubleJumpUsed(true); set_jumpBufferedUntil(0);
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
    if (_hudDirty) { updateHUD(LEVELS[currentLevel]); set__hudDirty(false); }
    else { updateProgressBar(LEVELS[currentLevel]); } // só a posição do marcador
  }

  // Animar sol (rotação lenta dos raios)
  set_sunAngle(sunAngle + ( 0.004));
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
        set_score(score + (10)); scoreText.setText(`🌟 Pontos: ${score}`);
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
    } else if (pat === "drone_hostil") {
      // Drone Extremo — voa em patrulha horizontal (mesmo esquema de
      // minLeft/minRight do "mini"), mas SEM tocar no chão: gravidade
      // desligada em spawnHostileDrone(), e oscila em altura com um seno
      // em torno de "baseY" para dar sensação de voo, em vez de girar
      // como os vilões de chão (não faz sentido um drone rodar sobre si
      // próprio).
      const minL = m.getData("minLeft") ?? (m.x - 140);
      const minR = m.getData("minRight") ?? (m.x + 140);
      if (m.x <= minL || m.body.blocked.left)  { m.setVelocityX(spd);  m.setData("dir", 1); }
      if (m.x >= minR || m.body.blocked.right) { m.setVelocityX(-spd); m.setData("dir", -1); }
      if (Math.abs(m.body.velocity.x) < 8) { m.setVelocityX(spd * dir); }
      const baseY = m.getData("baseY") ?? m.y;
      const phase = (m.getData("bobPhase") || 0) + sceneRef.time.now * 0.0018;
      m.y = baseY + Math.sin(phase) * 16;
      m.rotation = Math.sin(phase * 0.5) * 0.06; // ligeira inclinação ao voar, nunca gira 360°
    } else {
      // minLeft/minRight (opcional, ver spawnVilao) — prende "patrol"/
      // "jumper" à largura de uma plataforma específica, exatamente como
      // o "mini" já faz por omissão com o seu ±120. Sem bounds definidos,
      // comportamento inalterado (só inverte nos limites do mundo).
      const minL = m.getData("minLeft");
      const minR = m.getData("minRight");
      if (minL != null && (m.x <= minL || m.body.blocked.left))       { m.setVelocityX(spd);  m.setData("dir", 1); }
      else if (m.body.blocked.left)  { m.setVelocityX(spd);  m.setData("dir", 1); }
      if (minR != null && (m.x >= minR || m.body.blocked.right))      { m.setVelocityX(-spd); m.setData("dir", -1); }
      else if (m.body.blocked.right) { m.setVelocityX(-spd); m.setData("dir", -1); }
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

// ----- ligações executadas no arranque (ordem original preservada; chamadas por dia-crianca.js) -----
export function init_scene_0() {

  // config (declarado no início deste ficheiro)
  config = {
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
}
