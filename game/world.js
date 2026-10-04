/*************************************************
 * VanBerto's — Missão Cibersegurança 🛡️  ·  game/world.js
 *
 * Objetos do nível: balões, bichos, escudos, plataformas móveis, trampolins, perigos, passagens secretas e letreiros.
 *
 * Faz parte de dia-crianca.js, dividido em módulos (ver README.md, «Estrutura do código»).
 * As variáveis de estado vivem em state.js; aqui alteram-se com set_<nome>().
 *************************************************/

import { hitFlash } from "./dom.js?v=20261004v102";
import { applyHitStop, showFloat } from "./feedback.js?v=20261004v102";
import { showGameOver } from "./flow.js?v=20261004v102";
import { clearPower, setInvuln } from "./items.js?v=20261004v102";
import { updateHearts } from "./level.js?v=20261004v102";
import { saveGame } from "./overlays.js?v=20261004v102";
import { snapPlayerToGround } from "./rooms.js?v=20261004v102";
import { _critterSession, _overlayPaused, awaitingQuiz, balloons, collectedItemIndices, collectedRoomPipes, critters, currentLevel, currentSign, decorativePipes, extraShieldCounted, getVillainSpeedMult, hazards, invuln, isStarAllowedExtremo, itemCountText, itemsCollected, itemsGroup, itemsTotal, lives, livesLostThisLevel, malwareGroup, movingPlatforms, pausedByTeacher, pipeHintSign, player, powered, sceneRef, secretDoors, secretSigns, set__critterSession, set__hudDirty, set_awaitingQuiz, set_balloons, set_critters, set_currentSign, set_extraShieldCounted, set_hazards, set_invuln, set_itemsCollected, set_itemsTotal, set_lives, set_livesLostThisLevel, set_movingPlatforms, set_pipeHintSign, set_secretDoors, set_secretSigns, set_trampolines, tipText, touch, trampolines } from "./state.js?v=20261004v102";
import { triggerVanBertoSad } from "./vanberto.js?v=20261004v102";
import { THEMES, LEVELS } from "../data-levels.js?v=20261004v102";
import { makePlatformTextureThemed } from "../textures.js?v=20261004v102";
import { ensureAudio, SFX, beep } from "../audio.js?v=20261004v102";
import { onSecretFoundForAchievements } from "../achievements.js?v=20261004v102";
import { NPC_SIGNS } from "../data-story.js?v=20261004v102";

// ===== Balões flutuantes apanháveis =====

export function spawnBalloons(scene,worldW) {
  balloons.forEach(b=>{ if(b.sprite) b.sprite.destroy(); if(b.gfx) b.gfx.destroy(); });
  set_balloons([]);
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

export function spawnCritters(scene, worldW){
  set__critterSession(_critterSession + 1); // invalidar todos os delayedCall de respawn anteriores
  critters.forEach(c=>{ if(c.sprite&&c.sprite.active) c.sprite.destroy(); });
  set_critters([]);
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

export function spawnShields(scene, L) {
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
    set_extraShieldCounted( true);
    set_itemsTotal(itemsTotal + ( 1));
    if (itemCountText) itemCountText.setText(`⭐ Itens: ${itemsCollected}/${itemsTotal}`);
  }
}

// ===== PLATAFORMAS MÓVEIS =====

export function spawnMovingPlatforms(scene, L) {
  movingPlatforms.forEach(mp => {
    if (mp.sprite && mp.sprite.active) mp.sprite.destroy();
    if (mp.gfx    && mp.gfx.active)   mp.gfx.destroy();
  });
  set_movingPlatforms( []);
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

export function updateMovingPlatforms(scene) {
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

export function clearMovingPlatforms() {
  movingPlatforms.forEach(mp => {
    if (mp.collider1) { try{ sceneRef.physics.world.removeCollider(mp.collider1); }catch{} }
    if (mp.collider2) { try{ sceneRef.physics.world.removeCollider(mp.collider2); }catch{} }
    if (mp.sprite && mp.sprite.active) mp.sprite.destroy();
    if (mp.gfx    && mp.gfx.active)   mp.gfx.destroy();
  });
  set_movingPlatforms( []);
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

export function spawnTrampolines(scene, L) {
  trampolines.forEach(t => { if (t.gfx && t.gfx.active) t.gfx.destroy(); });
  set_trampolines( []);
  const defs = L.trampolines || [];
  if (!defs.length) return;
  defs.forEach(def => {
    const gfx = scene.add.graphics().setDepth(3);
    _drawTrampoline(gfx, def.x, def.y, false);
    trampolines.push({ x: def.x, y: def.y, gfx, cooldown: 0 });
  });
}

export function updateTrampolines(scene) {
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

export function clearTrampolines() {
  trampolines.forEach(t => { if (t.gfx && t.gfx.active) t.gfx.destroy(); });
  set_trampolines( []);
}

// ===== ZONAS DE PERIGO (lava / ácido / abismo) =====
// Cada hazard: { x, w, y, gfx, kind }
// kind: "lava" | "acid" | "void"
// O player perde uma vida instantaneamente se tocar (a não ser que invuln ou powered)


export function spawnHazards(scene, L) {
  set_hazards( []);
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

export function _drawHazard(gfx, x, y, w, kind, now, h) {
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

export function updateHazards(scene) {
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

  set_lives(lives - ( 1)); updateHearts(); set_livesLostThisLevel(livesLostThisLevel + 1); set__hudDirty( true);
  // Bug corrigido: quando esta é a última vida, travar já aqui o resto do
  // jogo (jogador continua a mexer-se, hazards e inimigos continuam a
  // atualizar) — só era travado dentro de showGameOver(), chamada só
  // depois da animação de knockback/respawn (várias centenas de ms
  // depois). Resultado: dava para continuar a jogar por um bom bocado
  // depois de perder a última vida, antes do ecrã de "Missão Falhada"
  // aparecer. awaitingQuiz é a mesma flag que showGameOver() liga — ao
  // ligá-la já aqui, a animação de knockback continua (é feita por tweens/
  // timers, não pelo update()), mas o jogador deixa de conseguir mexer-se.
  if (lives <= 0) set_awaitingQuiz( true);
  set_invuln( true);
  triggerVanBertoSad(scene);

  const hazardNames = { lava: "🔥 Lava!", acid: "☠️ Ácido!", void: "🌑 Abismo!" };
  showFloat(scene, player.x, player.y - 60, hazardNames[h.kind] || "⚠️ Perigo!", "#ff4400");
  // Aviso claro de perda de vida — mesmo motivo do onHitMalware (ver ali).
  showFloat(scene, player.x, player.y - 90, "💥 -1 Vida!", "#ff5050");

  // BUG CORRIGIDO: guardar o nível em que este toque aconteceu. Se o
  // jogador estiver perto da porta quando isto acontece, consegue às
  // vezes chegar à porta e terminar o nível ANTES destes 420ms passarem
  // — currentLevel já seria o do nível SEGUINTE (já carregado por
  // loadLevel()) quando este temporizador disparasse, e ele reposicionava
  // o jogador (e podia mesmo mostrar "Missão Falhada" com base numa vida
  // perdida no nível anterior) por cima de um nível que a criança acabou
  // de começar a jogar — dava a sensação de "perder uma vida"/"saltar o
  // nível" mesmo ao terminar um nível normalmente. bossHitPlayer() já
  // tinha uma proteção equivalente (verifica inBossFight); faltava aqui.
  const _levelAtHazardHit = currentLevel;
  scene.time.delayedCall(420, () => {
    if (!player || currentLevel !== _levelAtHazardHit) return;
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
  set_itemsCollected( 0);
  itemCountText.setText(`⭐ Itens: ${itemsCollected}/${itemsTotal}`);
  const keyMap = { estrela:"item_estrela", balao:"item_chave", brinquedo:"item_chip",
                   medalha:"item_medalha", heart:"item_heart", duplosalto:"item_duplosalto",
                   balaofesta:"item_cadeado_2" };
  let _starIdxRespawn = 0;
  LEVELS[currentLevel].items.forEach((it, idx) => {
    // Extremo — mesma regra de isStarAllowedExtremo() usada em loadLevel():
    // sem isto, uma estrela suprimida voltava a aparecer ao perder uma vida.
    if (it.kind === "estrela") {
      const sIdx = _starIdxRespawn++;
      if (!isStarAllowedExtremo(currentLevel, sIdx)) return;
    }
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

export function clearHazards() {
  hazards.forEach(h => {
    if (h.gfx && h.gfx.active) h.gfx.destroy();
    if (h.timer) h.timer.remove(false);
  });
  set_hazards( []);
}

// ===== PASSAGENS SECRETAS =====

export function spawnSecrets(scene, L) {
  secretDoors.forEach(s => {
    if (s.gfx  && s.gfx.active)  s.gfx.destroy();
    if (s.item && s.item.active)  s.item.destroy();
  });
  set_secretDoors( []);
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

export function updateSecrets(scene) {
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
    // balao -> item_chave (não item_cadeado_0): a "Chave de Acesso" já
    // usa este ícone em todo o resto do jogo (ver ITEM_LABELS/keyMap
    // principais) — aqui ainda apontava para o cadeado antigo, mostrando
    // um ícone diferente do rótulo "🔑 Chave de Acesso +10".
    const keyMap = { estrela:"item_estrela", medalha:"item_medalha", heart:"item_heart", brinquedo:"item_chip", duplosalto:"item_duplosalto", balao:"item_chave" };
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
      set_itemsTotal(itemsTotal + ( 1));
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

export function clearSecrets() {
  secretDoors.forEach(s => {
    if (s.gfx  && s.gfx.active)  s.gfx.destroy();
    if (s.item && s.item.active)  s.item.destroy();
  });
  set_secretDoors( []);
}

// ===== Letreiros/NPCs — Fase "Mundo Vivo" =====
// Um pequeno elemento por nível normal (não em arenas de boss). O jogador
// só precisa de caminhar perto para o "ler" — sem menu, sem pausa forçada.

export function clearSign() {
  if (currentSign) {
    try{ currentSign.obj?.destroy(); }catch{}
    try{ currentSign.badge?.destroy(); }catch{}
    // CORRIGIDO — faltava destruir o próprio balão de texto (activeLbl),
    // o que já era feito em clearSecretSigns/clearPipeHintSign mas ficou
    // esquecido aqui. Se o jogador estivesse perto do letreiro (balão
    // visível) no exato instante em que um boss arranca ou um novo nível
    // carrega, o balão antigo ficava "fantasma" para sempre no ecrã —
    // sem nenhum código a vigiá-lo depois de currentSign ser substituído —
    // e sobrepunha-se visualmente ao letreiro seguinte, dando a impressão
    // de dois textos de bosses diferentes empilhados um por cima do outro.
    try{ currentSign.activeLbl?.destroy(); }catch{}
  }
  set_currentSign( null);
}

// Curiosidades secretas dos canos (pedido: "cada cano leva a uma sala com
// uma curiosidade... e ganhar coisas") — MESMO visual/UX dos letreiros
// normais (_createSignAt/showSignMessage, reaproveitados tal e qual), mas
// num array próprio (secretSigns), independente de currentSign. Se
// usássemos spawnLevelSign/spawnBossSign para isto, o clearSign() lá
// dentro destruía o letreiro principal do nível assim que o jogador
// entrasse no cano — o letreiro normal desaparecia para sempre ao voltar.

export function clearSecretSigns() {
  secretSigns.forEach(s=>{ try{s.obj?.destroy();}catch{} try{s.badge?.destroy();}catch{} try{s.activeLbl?.destroy();}catch{} });
  set_secretSigns( []);
}

export function spawnSecretSign(scene, x, y, emoji, text) {
  secretSigns.push(_createSignAt(scene, x, y, emoji, text));
}

export function updateSecretSigns() {
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

export function spawnLevelSign(scene, L, idx) {
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
  set_currentSign( _createSignAt(scene, x, y, entry.emoji, entry.text));
}

// Letreiro do objetivo do boss — mesma UX dos letreiros normais (aproxima-te
// para "ler"), em vez de depender só do diálogo inicial, que passa depressa.

export function spawnBossSign(scene, x, y, emoji, text) {
  clearSign();
  set_currentSign( _createSignAt(scene, x, y, emoji, text));
}

export function updateSigns() {
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

export function spawnPipeHintSign(scene, x, y) {
  clearPipeHintSign();
  set_pipeHintSign( _createSignAt(scene, x, y, "🚇", "Chega-te a um cano e carrega ↓ para tentares um atalho!"));
}

export function clearPipeHintSign() {
  if (pipeHintSign) {
    try { pipeHintSign.obj?.destroy(); } catch {}
    try { pipeHintSign.badge?.destroy(); } catch {}
    try { pipeHintSign.activeLbl?.destroy(); } catch {}
  }
  set_pipeHintSign( null);
}

export function updatePipeHintSign() {
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

export function updateDecorativePipeReactions() {
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

export function difficultyFactor(idx) {
  let f = 1 + idx * 0.02;
  if (idx >= 8)  f += (idx - 8)  * 0.015;
  if (idx >= 14) f += (idx - 14) * 0.02;
  // × getVillainSpeedMult(): o nível de dificuldade escolhido pelo
  // jogador (Fácil/Difícil) — ver bloco no topo do ficheiro.
  return Math.min(1.35, f) * getVillainSpeedMult(); // cap mais baixo — 1.35 em vez de 1.85
}
