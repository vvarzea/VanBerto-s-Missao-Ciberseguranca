/*************************************************
 * VanBerto's — Missão Cibersegurança 🛡️  ·  game/vanberto.js
 *
 * Animação do VanBerto's (piscar, feliz, triste, dança) e os olhos do robô do HTML.
 *
 * Faz parte de dia-crianca.js, dividido em módulos (ver README.md, «Estrutura do código»).
 * As variáveis de estado vivem em state.js; aqui alteram-se com set_<nome>().
 *************************************************/

import { historyOverlay, startOverlay } from "./dom.js?v=20261009v103";
import { showFloat } from "./feedback.js?v=20261009v103";
import { _eyeOverrideUntil, _overlayPaused, awaitingQuiz, awaitingStory, doubleJumpActive, invuln, pausedByTeacher, player, powered, set__eyeOverrideUntil, starPower } from "./state.js?v=20261009v103";
import { ensureAudio, beep } from "../audio.js?v=20261009v103";

// ===== Animação VanBerto =====

export function scheduleBlink(scene){
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
      set__eyeOverrideUntil( scene.time.now + dur);
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

export function triggerVanBertoWink(scene){
  if(!player || player.getData("usingPng") || _vbWinkBusy) return;
  if(awaitingQuiz || awaitingStory || pausedByTeacher || _overlayPaused) return;
  if(!startOverlay.classList.contains("hidden") || !historyOverlay.classList.contains("hidden")) return;
  _vbWinkBusy = true;
  ensureAudio(); beep({freq:1000,dur:0.05,type:"triangle",vol:0.045,slideTo:1300});
  set__eyeOverrideUntil( scene.time.now + 320);
  player.setTexture("vanberto_wink");
  showFloat(scene, player.x, player.y-46, "😉", "#ffd700");
  scene.time.delayedCall(320, () => {
    _vbWinkBusy = false;
    if(player) applyVanBertoTexture(scene);
  });
}

// Sorriso grande ao acontecer algo bom (ex: apanhar um coração) — reação breve,
// não interativa, só reforça positivamente o momento.

export function triggerVanBertoHappy(scene, duration=650){
  if(!player || player.getData("usingPng")) return;
  if(!startOverlay.classList.contains("hidden") || !historyOverlay.classList.contains("hidden")) return;
  set__eyeOverrideUntil( scene.time.now + duration);
  player.setTexture("vanberto_happy");
  scene.time.delayedCall(duration, () => { if(player) applyVanBertoTexture(scene); });
}

// Cara triste ao perder uma vida — dura o suficiente para se ver durante o
// knockback e o teletransporte de volta ao spawn, sem se prolongar depois disso.

export function triggerVanBertoSad(scene, duration=900){
  if(!player || player.getData("usingPng")) return;
  set__eyeOverrideUntil( scene.time.now + duration);
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

export function applyVanBertoTexture(scene){
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

export function playVanBertoDance(scene, onComplete, beats = 4) {
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

// ----- ligações executadas no arranque (ordem original preservada; chamadas por dia-crianca.js) -----
export function init_vanberto_0() {

  // =====================================================
  // ===== VANBERTO'S PERSONALITY — piscar olhos HTML =====
  // =====================================================
  (function initVanbertoPersonality() {
    function blinkRobots() {
      if (document.hidden) return; // separador em segundo plano: nada para piscar
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
      let particleTimer = null;
      const spawnParticle = () => {
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
      };
      // Só gera partículas enquanto o ecrã da história está visível (antes corria para sempre, mesmo escondido).
      const storyOverlay = document.getElementById("mainStoryOverlay");
      const syncParticles = () => {
        const visible = storyOverlay && !storyOverlay.classList.contains("hidden") && !document.hidden;
        if (visible && !particleTimer) particleTimer = setInterval(spawnParticle, 350);
        else if (!visible && particleTimer) { clearInterval(particleTimer); particleTimer = null; }
      };
      if (storyOverlay) {
        new MutationObserver(syncParticles).observe(storyOverlay, { attributes: true, attributeFilter: ["class"] });
        document.addEventListener("visibilitychange", syncParticles);
        syncParticles();
      }
    }
  })();
}
