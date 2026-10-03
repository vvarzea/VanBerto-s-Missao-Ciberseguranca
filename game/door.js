/*************************************************
 * VanBerto's — Missão Cibersegurança 🛡️  ·  game/door.js
 *
 * A porta do nível: abrir, animação de saída e transição para o nível seguinte.
 *
 * Faz parte de dia-crianca.js, dividido em módulos (ver README.md, «Estrutura do código»).
 * As variáveis de estado vivem em state.js; aqui alteram-se com set_<nome>().
 *************************************************/

import { showLevelCompleteCelebration, showRightRecovered } from "./artefacts.js?v=20261003v99";
import { quizOverlay } from "./dom.js?v=20261003v99";
import { nextLevel } from "./flow.js?v=20261003v99";
import { markLevelCompleted } from "./map.js?v=20261003v99";
import { pickQuizForLevel, showQuiz, withQuizReview } from "./quiz.js?v=20261003v99";
import { snapPlayerToGround } from "./rooms.js?v=20261003v99";
import { _doorAnimRunning, _doorWatchdogTimer, _landingCheckTimer, _levelAtDoorTrigger, _starMelodyInterval, awaitingQuiz, awaitingStory, currentLevel, door, doorOverlap, doubleJumpCountdown, doubleJumpTimer, invuln, invulnBlinkEvent, invulnEndEvent, itemsCollected, itemsTotal, livesLostThisLevel, mapProgress, player, playerName, powerCountdown, powerHaloGfx, poweredTimer, set__doorAnimRunning, set__doorWatchdogTimer, set__landingCheckTimer, set__levelAtDoorTrigger, set__starMelodyInterval, set_awaitingQuiz, set_doorOverlap, set_doubleJumpActive, set_doubleJumpCountdown, set_doubleJumpTimer, set_invuln, set_invulnBlinkEvent, set_invulnEndEvent, set_lastQuizTheme, set_powerCountdown, set_powered, set_poweredTimer, set_starPower, set_starPowerCountdown, set_starPowerTimer, shadowGfx, starPowerCountdown, starPowerTimer, touch } from "./state.js?v=20261003v99";
import { playVanBertoDance } from "./vanberto.js?v=20261003v99";
import { ensureAudio, SFX } from "../audio.js?v=20261003v99";
import { LEVELS, THEMES } from "../data-levels.js?v=20261003v99";
import { finalizeLevelStars } from "../stars.js?v=20261003v99";
import { checkAchievements } from "../achievements.js?v=20261003v99";
import { LEVEL_ENTRY_PHRASES } from "../data-flavor.js?v=20261003v99";

// ===== Porta + Quiz =====

export function tryOpenDoor(scene){
  if(awaitingQuiz) return;
  set_awaitingQuiz(true);
  // Parar melodia da estrela ao chegar à porta
  if(_starMelodyInterval){ clearInterval(_starMelodyInterval); set__starMelodyInterval(null); }
  // Cancelar TODOS os timers/tweens que possam alterar alpha/scale do player
  if(scene && scene.tweens) scene.tweens.killTweensOf(player);
  if(invulnBlinkEvent){ invulnBlinkEvent.remove(false); set_invulnBlinkEvent(null); }
  if(invulnEndEvent){   invulnEndEvent.remove(false);   set_invulnEndEvent(null); }
  if(starPowerTimer){   starPowerTimer.remove(false);   set_starPowerTimer(null); }
  if(starPowerCountdown){ starPowerCountdown.remove(false); set_starPowerCountdown(null); }
  if(poweredTimer){     poweredTimer.remove(false);     set_poweredTimer(null); }
  if(powerCountdown){   powerCountdown.remove(false);   set_powerCountdown(null); }
  if(doubleJumpTimer){  doubleJumpTimer.remove(false);  set_doubleJumpTimer(null); }
  if(doubleJumpCountdown){ doubleJumpCountdown.remove(false); set_doubleJumpCountdown(null); }
  set_invuln(false); set_starPower(false); set_powered(false); set_doubleJumpActive(false);
  player.setAlpha(1); player.setScale(1); player.clearTint();
  // Remover overlap da porta imediatamente — antes de qualquer resume() da física
  if(doorOverlap){ try{ scene.physics.world.removeCollider(doorOverlap); }catch{} set_doorOverlap(null); }
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
  if(_landingCheckTimer){ try{_landingCheckTimer.remove(false);}catch{} set__landingCheckTimer(null); }
  set__landingCheckTimer( scene.time.addEvent({
    delay: 16, loop: true,
    callback: () => {
      if(_animStarted) return;
      waited += 16;
      const onGround = player.body && player.body.blocked.down;
      // No móvel o body.blocked pode não atualizar — forçar após 200ms
      if (onGround || waited >= 200) {
        _animStarted = true;
        if(_landingCheckTimer){ try{_landingCheckTimer.remove(false);}catch{} set__landingCheckTimer(null); }
        player.setVelocity(0, 0);
        snapPlayerToGround();
        scene.physics.pause();
        ensureAudio(); SFX.doorOpen();
        startDoorAnimation(scene, doorOrigX);
      }
    }
  }));
  // Timeout de segurança: se ao fim de 7s o quiz ainda não apareceu, desbloquear
  // (antes eram 4s — a dança do robô antes do portal sugar acrescenta ~800ms à
  // sequência normal, e 4s ficava demasiado apertado, disparando o watchdog a
  // meio da animação e cortando a transição de nível)
  // Guarda snapshot do nível para evitar disparo no nível seguinte
  set__levelAtDoorTrigger( currentLevel);
  if(_doorWatchdogTimer){ try{_doorWatchdogTimer.remove(false);}catch{} set__doorWatchdogTimer(null); }
  set__doorWatchdogTimer( scene.time.delayedCall(7000, () => {
    set__doorWatchdogTimer( null);
    if (!awaitingQuiz) return; // já resolveu normalmente
    if (currentLevel !== _levelAtDoorTrigger) return; // já avançou de nível
    if (awaitingStory) return; // história ainda visível — não interferir
    const quizVisible = !quizOverlay.classList.contains("hidden");
    if (!quizVisible) {
      // Quiz não apareceu — desbloquear o jogo
      set_awaitingQuiz( false);
      set__doorAnimRunning( false);
      if(powerHaloGfx) powerHaloGfx.setVisible(true);
      if(shadowGfx)    shadowGfx.setVisible(true);
      scene.physics.resume();
      // Recriar o overlap da porta para nova tentativa
      if(doorOverlap) { try{ scene.physics.world.removeCollider(doorOverlap); }catch{} set_doorOverlap(null); }
      let _retryTriggered=false;
      set_doorOverlap( scene.physics.add.overlap(player, door, () => {
        if(awaitingQuiz||_retryTriggered||invuln) return;
        if(Math.abs(player.x - door.x) > 120) return; // segurança extra: só activa perto da porta
        _retryTriggered=true;
        try{ scene.physics.world.removeCollider(doorOverlap); set_doorOverlap(null); }catch{}
        tryOpenDoor(scene);
      }, null, scene));
    }
  }));
}

// Extraído de startDoorAnimation para poder ser chamado tanto no fim normal
// da animação da porta, como num "fallback" de segurança se a animação
// falhar a meio (ver bug "trava no boss 3" — mesma família de problema
// pode acontecer na porta normal se `door` deixar de ser válida a meio).
//
// CORRIGIDO (revertido) — uma versão anterior desta função saltava esta
// pergunta por completo nos níveis antes de um boss (5, 9, 15, 20), por
// interpretar mal o pedido "não pode aparecer pergunta quando entra o
// boss": Berto esclareceu que a lógica certa é a ORDEM, não a ausência —
// a pergunta do NÍVEL tem sempre de aparecer e ser respondida ANTES do
// boss entrar em cena; só depois de o vencer é que aparece a pergunta
// PRÓPRIA do boss (startBossQuizPhase). Como showQuiz() só chama
// nextLevel()/startBossFight() dentro do "done(true)" — ou seja, depois
// de a pergunta já estar resolvida — esta ordem já é garantida pela
// própria estrutura da função; nunca houve aqui uma corrida entre a
// pergunta e a entrada do boss.

function showQuizAfterDoorAnimation(scene){
  scene.time.delayedCall(560, () => {
    if(!awaitingQuiz) return; // segurança: só mostrar se ainda estamos à espera
    set__doorAnimRunning( false); // reset para próxima porta
    set_lastQuizTheme( LEVELS[currentLevel].quizTheme);
    withQuizReview(() => showQuiz(pickQuizForLevel(currentLevel, LEVELS[currentLevel].quizTheme), (ok) => {
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
    }));
  });
}

function startDoorAnimation(scene, doorOrigX){
  // Impedir execução dupla — só pode correr uma vez por abertura de porta
  if(_doorAnimRunning) return;
  set__doorAnimRunning( true);
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
      // CORRIGIDO — bug reportado (crash "Cannot set properties of null
      // (setting 'x')" logo ao aparecer o boss): ao contrário das restantes
      // fases desta animação (FASE 2/3/4, ver abaixo), esta FASE 1 nunca
      // verificava se "door" ainda existia antes de lhe mexer. Se a arena do
      // boss arrancasse entretanto e destruísse "door" (door=null, ver
      // limpeza no arranque da arena), este onComplete — que dispara mais
      // tarde, quando o Tween Manager finalmente processa a fase pendente —
      // rebentava aqui. Mesma guarda defensiva já usada mais abaixo.
      if (!door || !door.active) { showQuizAfterDoorAnimation(scene); return; }
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
                            if(invulnBlinkEvent){ invulnBlinkEvent.remove(false); set_invulnBlinkEvent(null); }
                            if(invulnEndEvent){   invulnEndEvent.remove(false);   set_invulnEndEvent(null); }
                            set_invuln( false);
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


export function playLevelTransition(scene, nextIdx, onMidpoint, onComplete){
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
