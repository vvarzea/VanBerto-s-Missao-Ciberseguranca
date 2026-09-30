/*************************************************
 * VanBerto's — Missão Cibersegurança 🛡️  ·  game/boss-attacks.js
 *
 * Bosses (2/4): ataques e comportamentos (zonas tóxicas, mini-vírus, pop-ups, teleporte, rolar, decoy…).
 *
 * Faz parte de dia-crianca.js, dividido em módulos (ver README.md, «Estrutura do código»).
 * As variáveis de estado vivem em state.js; aqui alteram-se com set_<nome>().
 *************************************************/

import { bossHitPlayer } from "./boss-combat.js?v=20260930v97";
import { showFloat } from "./feedback.js?v=20260930v97";
import { bossMiniViruses, bossState, bossTimers, inBossFight, invuln, itemsGroup, malwareGroup, platforms, player, sceneRef, set_bossMiniViruses, set_bossPopupAnchors } from "./state.js?v=20260930v97";
import { _drawHazard } from "./world.js?v=20260930v97";
import { ensureAudio, beep } from "../audio.js?v=20260930v97";

// ---- Arena contaminada (Vírus Gigante): zonas tóxicas + vírus pequenos ----
// 100% aditivo e opt-in via def.contaminatedArena — não afeta bosses normais.

let bossToxicZones = [];

let toxicSplashTimer = null;

// Devolve a configuração de zonas de contaminação/poluição correspondente
// ao nível de fúria ATUAL do boss — usado para voltar a semear as zonas
// corretamente depois da Onda (cura/limpa), em vez de cair sempre no
// layout genérico de 2 zonas fixas independentemente do boss/fúria.

export function currentContaminationZones() {
  if (!bossState) return null;
  const def = bossState.def;
  const ca = (typeof def.contaminatedArena === "object") ? def.contaminatedArena : {};
  const esc = ca.escalations && ca.escalations[bossState.rageLevel];
  return { zones: (esc && esc.zones) ? esc.zones : ca.zonesBase, hazardType: ca.hazardType };
}

export function spawnToxicZones(scene, customSpots, hazardType) {
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

export function clearToxicZones() {
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

export function updateToxicZones() {
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

export function spawnMiniViruses(scene, count) {
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

export function maintainMiniViruses(scene, desiredCount) {
  if (!inBossFight || !bossState || bossState.phase !== "platform" || !bossState.def.contaminatedArena) return;
  set_bossMiniViruses( bossMiniViruses.filter(v => v && v.active));
  const missing = desiredCount - bossMiniViruses.length;
  if (missing > 0) spawnMiniViruses(scene, missing);
}

export function clearMiniViruses() {
  bossMiniViruses.forEach(v => { try{ if(v.active) v.destroy(); }catch{} });
  set_bossMiniViruses( []);
}

// ---- Arena com pop-ups (Robô do Spam): janelas de spam que tapam pedaços
// do ecrã, em vez do chão contaminado (ácido/lava) que já é a assinatura
// do Vírus Gigante. Pedido: dar-lhe uma identidade mecânica diferente —
// "janelas de spam/pop-ups que tapam pedaços do ecrã", já que o Robô e o
// Vírus partilhavam antes exatamente a mesma mecânica (só a cor do chão
// mudava). 100% aditivo e opt-in via def.popupHazard — não toca em nada
// dos outros 3 bosses.
//
// Diferença de fundo em relação a contaminatedArena: os pop-ups NÃO
// ferem ao toque — são um obstáculo de VISÃO, não de contacto. Aparecem
// sobre pontos fixos da arena (normalmente por cima das plataformas onde
// vais aterrar), ficam visíveis por 1.9-2.4s e desaparecem sozinhos,
// como pop-ups a fechar — depois voltam a poder abrir noutro sítio.

let bossPopups = [];

// Configuração de pop-ups correspondente à fúria ATUAL — mesma lógica de
// currentContaminationZones(), mas para def.popupHazard.escalations.

export function currentPopupConfig() {
  if (!bossState) return null;
  const ph = bossState.def.popupHazard;
  if (!ph) return null;
  const esc = ph.escalations && ph.escalations[bossState.rageLevel];
  return {
    anchors: (esc && esc.anchors) ? esc.anchors : ph.anchors,
    spawnEvery: (esc && esc.spawnEvery != null) ? esc.spawnEvery : ph.spawnEvery,
    maxOnScreen: (esc && esc.maxOnScreen != null) ? esc.maxOnScreen : (ph.maxOnScreen || 1)
  };
}

// Desenha uma janela de pop-up (fundo + barra de título vermelha + "✖" +
// texto de isco) — tudo com Graphics/Text, sem precisar de texturas novas.
// CORRIGIDO (pedido: "as imagens dos spams são demasiado grandes") — barra
// de título, cantos e tipo de letra reduzidos junto com os anchors (ver
// popupHazard em data-bosses.js, agora ~25% mais pequenos), para a janela
// continuar proporcionada em vez de ficar com texto grande a mais dentro
// de uma caixa mais pequena.

function makePopupWindow(scene, x, y, w, h) {
  const gfx = scene.add.graphics().setDepth(25);
  gfx.fillStyle(0xf5f5f5, 0.97);
  gfx.fillRoundedRect(x - w/2, y - h/2, w, h, 6);
  gfx.fillStyle(0xff3030, 1);
  gfx.fillRoundedRect(x - w/2, y - h/2, w, 17);
  gfx.lineStyle(3, 0xff3030, 1);
  gfx.strokeRoundedRect(x - w/2, y - h/2, w, h, 6);
  const label = scene.add.text(x, y - h/2 + 9, "📧 SPAM", { fontSize:"10px", fontStyle:"900", color:"#ffffff" }).setOrigin(0.5).setDepth(26);
  const closeX = scene.add.text(x + w/2 - 12, y - h/2 + 9, "✖", { fontSize:"12px", fontStyle:"900", color:"#ffffff" }).setOrigin(0.5).setDepth(26);
  const body = scene.add.text(x, y + 8, "💰 OFERTA!\n👆 CLICA AQUI", { fontSize:"11px", fontStyle:"800", color:"#c72030", align:"center" }).setOrigin(0.5).setDepth(26);
  return { gfx, label, closeX, body };
}

function destroyPopupElements(elements) {
  ["gfx","label","closeX","body"].forEach(k => { try{ elements[k].destroy(); }catch{} });
}

// Liga o temporizador de spawn — chamado ao entrar no combate e sempre que
// a "onda" (se algum dia existir para este boss) limpar a arena.

export function spawnPopupHazard(scene) {
  clearPopupHazard();
  const cfg = currentPopupConfig();
  if (!cfg) return;
  set_bossPopupAnchors( cfg.anchors);
  const timer = scene.time.addEvent({ delay: cfg.spawnEvery, loop: true, callback: () => trySpawnPopup(scene) });
  bossTimers.push(timer);
  bossState.popupSpawnTimer = timer;
  // Primeiro pop-up não espera o intervalo completo — para se sentir a
  // mecânica logo nos primeiros segundos do combate.
  scene.time.delayedCall(1200, () => trySpawnPopup(scene));
}

export function clearPopupHazard() {
  bossPopups.forEach(p => destroyPopupElements(p.elements));
  bossPopups = [];
  set_bossPopupAnchors( []);
  if (bossState && bossState.popupSpawnTimer) { try{ bossState.popupSpawnTimer.remove(false); }catch{} bossState.popupSpawnTimer = null; }
}

function trySpawnPopup(scene) {
  if (!inBossFight || !bossState || bossState.phase !== "platform" || !bossState.def.popupHazard) return;
  bossPopups = bossPopups.filter(p => p.active);
  const cfg = currentPopupConfig();
  if (!cfg || bossPopups.length >= cfg.maxOnScreen) return;
  const occupied = new Set(bossPopups.map(p => p.anchorIdx));
  const freeIdx = cfg.anchors.map((_, i) => i).filter(i => !occupied.has(i));
  if (!freeIdx.length) return;
  const anchorIdx = freeIdx[Math.floor(Math.random() * freeIdx.length)];
  const a = cfg.anchors[anchorIdx];
  const elements = makePopupWindow(scene, a.x, a.y, a.w, a.h);
  const group = [elements.gfx, elements.label, elements.closeX, elements.body];
  group.forEach(g => g.setAlpha(0));
  const popup = { anchorIdx, elements, active: true };
  bossPopups.push(popup);
  scene.tweens.add({ targets: group, alpha: 1, duration: 220, ease: "Sine.easeOut" });
  ensureAudio(); beep({ freq: 700, dur: 0.05, type: "square", vol: 0.04, slideTo: 500 });
  const lifespan = 1900 + Math.random() * 500;
  scene.time.delayedCall(lifespan, () => {
    if (!popup.active) return;
    scene.tweens.add({
      targets: group, alpha: 0, duration: 220, ease: "Sine.easeIn",
      onComplete: () => { popup.active = false; destroyPopupElements(elements); bossPopups = bossPopups.filter(p => p !== popup); }
    });
  });
}

// ---- Movimento "blink" (Monstro da Ignorância): some e reaparece noutro sítio ----

export function doBossBlink(scene) {
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

export function doBossTeleport(scene) {
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

export function doBossThrowBook(scene) {
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

export function doBossHop(scene) {
  if (!inBossFight || !bossState || bossState.phase !== "platform") return;
  const b = bossState.sprite;
  if (!b || !b.active) return;
  const baseY = bossState.def.bossY != null ? bossState.def.bossY : bossState.baseY;
  scene.tweens.add({ targets:b, y: baseY-34, duration:180, yoyo:true, ease:"Quad.easeOut" });
}

// ---- Ataque do Monstro da Ignorância (redesenho): bolas ❓ que saltitam
// devagar pelo chão — lentas e fáceis de ver/evitar, nunca voam direto à
// cabeça do jogador. Substituem os livros/fake news do combate antigo. ----

export function doBossRollQmark(scene, isFollowUp) {
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
  // orbScale (opt-in, nova — pedido: "as imagens dos spams são demasiado
  // grandes"): o Robô do Spam atira sempre a pares e com o intervalo mais
  // curto dos 4 bosses (qmarkEvery 1750ms + alwaysDoubleThrow), por isso
  // vários envelopes ficam facilmente em ecrã ao mesmo tempo — reduzir só
  // este projétil (sem mexer nos outros 3 bosses) alivia a sensação de
  // amontoado. Omisso = 1 (tamanho normal), como sempre.
  if (def.orbScale) q.setScale(def.orbScale);
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

  // Personalidade do arremesso (pedido: os 4 bosses tinham exatamente o
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
    // CORRIGIDO (pedido: "fico aqui sem me mexer e ganho, ele nunca me
    // atinge") — só puxava em X; a subida inicial (-100, com gravidade
    // 480) mal passa 10px acima da altura de lançamento, por isso
    // qualquer plataforma elevada (ambas a 391/421, ver arena.platforms)
    // ficava permanentemente fora de alcance — bastava lá ficar para
    // nunca mais ser atingido. Agora também puxa em Y na direção do
    // VanBerto's (só nos primeiros ticks, antes da gravidade dominar, tal
    // como já era em X) — se estiver numa plataforma, a orbe ganha
    // impulso extra para lá chegar; se estiver no chão, o puxão em Y é
    // mínimo ou nulo e a trajetória sente-se quase igual a antes.
    q.setVelocity(towardPlayer * 55, -100);
    const homingTimer = scene.time.addEvent({
      delay: 150, repeat: 3,
      callback: () => {
        if (!q.active || !q.body) { try{homingTimer.remove(false);}catch{} return; }
        const dir = (player.x < q.x) ? -1 : 1;
        q.body.setVelocityX(Phaser.Math.Clamp(q.body.velocity.x + dir * 18, -110, 110));
        const dirY = (player.y < q.y) ? -1 : 1;
        q.body.setVelocityY(Phaser.Math.Clamp(q.body.velocity.y + dirY * 45, -260, 160));
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
      // Fúria final (nova, ver chaserGermAtMaxRage em data-bosses.js): os
      // filhos passam a caçar em vez de só se afastar — ver comentário
      // completo em spawnBossGermSplit.
      const chase = !!(def.chaserGermAtMaxRage && bossState.rageLevel >= 2);
      spawnBossGermSplit(scene, q.x, q.y, def, chase);
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
// jogo como o "pai"). chase (novo, ver chaserGermAtMaxRage em
// data-bosses.js): na fúria final, em vez de só se afastarem um do outro
// ao acaso, "puxam" ligeiramente na direção do VanBerto's nos primeiros
// instantes de voo — mesma técnica do homingDrift do Espião das Sombras,
// mas aplicada aos filhos, não ao projétil original (que continua com a
// trajetória normal do Vírus). Dá a este boss uma verdadeira escalada de
// ataque na 2ª fúria, em vez de só ficar mais rápido/mais frequente.

function spawnBossGermSplit(scene, x, y, def, chase) {
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
    if (chase) {
      const homingTimer = scene.time.addEvent({
        delay: 150, repeat: 3,
        callback: () => {
          if (!child.active || !child.body) { try{homingTimer.remove(false);}catch{} return; }
          const towards = (player.x < child.x) ? -1 : 1;
          child.body.setVelocityX(Phaser.Math.Clamp(child.body.velocity.x + towards * 22, -170, 170));
        }
      });
      bossTimers.push(homingTimer);
    }
  });
}

// ---- Isca falsa do Monstro do Phishing (fúria final — ver
// phishingDecoyAtMaxRage em data-bosses.js): uma "oferta grátis" que
// parece um bónus mas dói ao tocar, tal como um clique real num link de
// phishing. Vive em itemsGroup (não em malwareGroup) e é despachada por
// handleBossItemCollect, tal como os livros bons/maus do Monstro da
// Ignorância — reaproveita toda essa infraestrutura em vez de inventar
// uma nova. 100% opt-in: nenhum dos outros 3 bosses é afetado. ----

export function startPhishingDecoy(scene) {
  if (!bossState || bossState.decoySpawnTimer) return; // já ativo — não duplica o temporizador
  const timer = scene.time.addEvent({ delay: 3200, loop: true, callback: () => spawnPhishingDecoy(scene) });
  bossTimers.push(timer);
  bossState.decoySpawnTimer = timer;
  // A 1ª isca não espera o intervalo completo — para se sentir logo a
  // mudança ao entrar na fúria final.
  scene.time.delayedCall(700, () => spawnPhishingDecoy(scene));
}

export function stopPhishingDecoy() {
  if (bossState && bossState.decoySpawnTimer) { try{ bossState.decoySpawnTimer.remove(false); }catch{} bossState.decoySpawnTimer = null; }
  if (itemsGroup) itemsGroup.getChildren().slice().forEach(o => {
    if (o.getData("bossDecoy")) { const l = o.getData("decoyLabel"); try{ l && l.destroy(); }catch{} o.destroy(); }
  });
}

function spawnPhishingDecoy(scene) {
  if (!inBossFight || !bossState || bossState.phase !== "platform" || bossState.rageLevel < 2) return;
  if (itemsGroup.getChildren().some(o => o.active && o.getData("bossDecoy"))) return; // só 1 de cada vez
  const arena = bossState.def.arena || {};
  const plats = (arena.platforms || []).slice(1); // ignora o chão principal (índice 0) — só nas plataformas baixas/altas
  const plat = plats.length ? plats[Math.floor(Math.random() * plats.length)] : null;
  const x = plat ? plat[0] : (arena.playerStartX || 400) + (Math.random() < 0.5 ? -150 : 150);
  const y = plat ? plat[1] - 34 : 380;
  const it = itemsGroup.create(x, y, "item_estrela");
  it.setDepth(2).setTint(0xffe066).setData("bossDecoy", true);
  scene.tweens.add({ targets: it, y: it.y - 8, duration: 520, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  scene.tweens.add({ targets: it, angle: { from: -8, to: 8 }, duration: 420, yoyo: true, repeat: -1 });
  const label = scene.add.text(x, y - 28, "🎣 GRÁTIS!", { fontSize: "12px", fontStyle: "900", color: "#ffcf40", stroke: "#5a2d00", strokeThickness: 4 }).setOrigin(0.5).setDepth(3);
  it.setData("decoyLabel", label);
  // Desaparece sozinha se não for tocada, para não acumular na arena.
  scene.time.delayedCall(3600, () => { if (it.active) { try{ label.destroy(); }catch{} it.destroy(); } });
}

// ---- Apagão do Espião das Sombras (fúria final — ver blackoutAtMaxRage
// em data-bosses.js): um momento único ao entrar na 2ª fúria, condizente
// com o tema "nas sombras, ninguém vê" — a arena escurece nas bordas,
// deixando só uma janela central mais estreita que a vinheta normal do
// jogo (ver bossVignette/def.phases mais acima), antes de voltar ao
// normal sozinha. Puramente visual/atmosférico — não faz dano nem bloqueia
// controlos, só torna mais difícil ver o boss/projéteis por instantes. ----

export function triggerBossBlackout(scene) {
  if (!bossState) return;
  const W = 960, H = 540, margin = 220; // janela mais estreita que a vinheta normal — clímax mais intenso
  const g = scene.add.graphics().setScrollFactor(0).setDepth(40).setAlpha(0);
  g.fillStyle(0x030008, 0.86);
  g.fillRect(0, 0, W, margin);
  g.fillRect(0, H - (margin - 60), W, margin - 60);
  g.fillRect(0, 0, margin, H);
  g.fillRect(W - margin, 0, margin, H);
  scene.tweens.add({ targets: g, alpha: 1, duration: 260, ease: "Sine.easeOut" });
  const b = bossState.sprite;
  showFloat(scene, b ? b.x : bossState.baseX, (b ? b.y : bossState.baseY) - 74, "🌑 Não vais ver o que aí vem!", "#c9a0ff");
  ensureAudio(); beep({ freq: 140, dur: 0.22, type: "sine", vol: 0.05, slideTo: 60 });
  scene.time.delayedCall(2300, () => {
    scene.tweens.add({ targets: g, alpha: 0, duration: 400, ease: "Sine.easeIn", onComplete: () => { try{ g.destroy(); }catch{} } });
  });
}

// ---- Baforada de fumo do Poluidor Mecânico (marca própria do boss — ver
// smokePuffEvery em data-bosses.js): puramente atmosférico, nunca tira
// vida nem colide com o jogador — só uma nuvem cinzenta a subir da
// chaminé, que ofusca ligeiramente aquela zona da arena por instantes.
// Pedido: os 4 bosses "stomp" partilhavam exatamente a mesma receita
// (andar/flutuar/teleportar + bola ❓); isto dá ao Poluidor uma
// personalidade visual só sua, condizente com o tema industrial/poluente. ----

export function doBossSmokePuff(scene) {
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

export function doBossIdleArms(scene) {
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

export function doBossIdleBlink(scene) {
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

export function showBossLaugh(scene) {
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
