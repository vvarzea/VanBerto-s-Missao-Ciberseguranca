/*************************************************
 * VanBerto's — Missão Cibersegurança 🛡️  ·  game/items.js
 *
 * Itens apanháveis, malware, invulnerabilidade, escudo, duplo salto e Star Power.
 *
 * Faz parte de dia-crianca.js, dividido em módulos (ver README.md, «Estrutura do código»).
 * As variáveis de estado vivem em state.js; aqui alteram-se com set_<nome>().
 *************************************************/

import { handleBossItemCollect, handleBossMalwareCollision } from "./boss-combat.js?v=20261009v103";
import { vbSayRandom } from "./dialogue.js?v=20261009v103";
import { hitFlash } from "./dom.js?v=20261009v103";
import { applyHitStop, pickPraise, showFloat } from "./feedback.js?v=20261009v103";
import { showGameOver } from "./flow.js?v=20261009v103";
import { updateHearts } from "./level.js?v=20261009v103";
import { saveGame } from "./overlays.js?v=20261009v103";
import { snapPlayerToGround } from "./rooms.js?v=20261009v103";
import { _critterSession, _overlayPaused, _starMelodyInterval, awaitingQuiz, collectedItemIndices, collectedRoomPipes, currentLevel, currentLevelTip, difficulty, doubleJumpActive, doubleJumpCountdown, doubleJumpTimer, getMaxLives, heartsGfx, inSecretRoom, invuln, invulnBlinkEvent, invulnEndEvent, isStarAllowedExtremo, itemCountText, itemsCollected, itemsGroup, itemsTotal, lives, livesLostThisLevel, pausedByTeacher, player, powerCountdown, powerIndicator, powered, poweredTimer, sceneRef, score, scoreText, secretRoomTemp, set__hudDirty, set__starMelodyInterval, set_awaitingQuiz, set_doubleJumpActive, set_doubleJumpCountdown, set_doubleJumpTimer, set_doubleJumpUsed, set_invuln, set_invulnBlinkEvent, set_invulnEndEvent, set_itemsCollected, set_lives, set_livesLostThisLevel, set_powerCountdown, set_powered, set_poweredTimer, set_score, set_starPower, set_starPowerCountVal, set_starPowerCountdown, set_starPowerTimer, starPower, starPowerCountVal, starPowerCountdown, starPowerTimer, tipText, touch } from "./state.js?v=20261009v103";
import { globalStats, saveGlobalStats } from "./stats.js?v=20261009v103";
import { triggerVanBertoHappy, triggerVanBertoSad } from "./vanberto.js?v=20261009v103";
import { spawnShields } from "./world.js?v=20261009v103";
import { onSecretRoomFoundForAchievements } from "../achievements.js?v=20261009v103";
import { ensureAudio, SFX, beep } from "../audio.js?v=20261009v103";
import { LEVELS } from "../data-levels.js?v=20261009v103";
import { VB_HIT, VB_STAR_POWER } from "../data-flavor.js?v=20261009v103";

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

export function onCollectItem(playerObj,itemObj){
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
  set_score(score + ( totalPoints)); scoreText.setText(`🌟 Pontos: ${score}`); set__hudDirty(true);
  if(kind!=="heart"){ set_itemsCollected(Math.min(itemsCollected+1,itemsTotal)); itemCountText.setText(`⭐ Itens: ${itemsCollected}/${itemsTotal}`); }
  const lbl=ITEM_LABELS[kind]||{label:"+10 ⭐",color:"#ff6b35"};
  // Duração do Star Power varia com a dificuldade (ver getStarPowerDurationSec) —
  // o texto fixo de ITEM_LABELS.estrela ("...8s") só está certo no Fácil/Difícil.
  const floatLabel = (kind==="estrela") ? `⭐ STAR POWER! ${getStarPowerDurationSec()}s` : lbl.label;
  showFloat(sceneRef,playerObj.x,playerObj.y-68,floatLabel,lbl.color);
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
    if(lives<getMaxLives()){
      set_lives(lives + (1)); updateHearts(); ensureAudio(); SFX.life();
      tipText.setText("❤️ Ganhaste uma vida extra!");
      triggerVanBertoHappy(sceneRef);
      if(heartsGfx&&sceneRef) sceneRef.tweens.add({targets:heartsGfx,scaleX:{from:1,to:1.25},scaleY:{from:1,to:1.25},duration:140,yoyo:true,repeat:1,ease:"Back.easeOut"});
    } else { showFloat(sceneRef,playerObj.x,playerObj.y-100,"❤️ MÁXIMO!","#e84d10"); }
  }
  saveGame();
}

export function onHitMalware(playerObj, malwareObj){
  // Reordenado (mesma família do bug corrigido em bossHitPlayer, acima):
  // handleBossMalwareCollision() era chamada ANTES desta verificação, por
  // isso qualquer caminho de dano lá dentro corria mesmo com o quiz aberto.
  // scene.physics.pause() já devia impedir este overlap de disparar de
  // todo enquanto o quiz está visível, mas verificar aqui primeiro
  // também garante que nenhum toque é processado nesse intervalo, seja
  // qual for a causa exata.
  if(invuln||awaitingQuiz||_overlayPaused||pausedByTeacher) return;
  if (handleBossMalwareCollision(malwareObj)) return;

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
    set_score(score + (50)); scoreText.setText(`🌟 Pontos: ${score}`); set__hudDirty(true);
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
  set_lives(lives - (1)); updateHearts(); set_livesLostThisLevel(livesLostThisLevel + 1); set__hudDirty(true);
  // Bug corrigido: ver o mesmo comentário em hitByHazard — sem isto o
  // jogador continuava a conseguir mexer-se e o nível continuava a
  // atualizar-se durante os ~400ms de animação antes do ecrã de "Missão
  // Falhada" aparecer.
  if (lives <= 0) set_awaitingQuiz( true);
  triggerVanBertoSad(sceneRef);
  if(heartsGfx&&sceneRef) sceneRef.tweens.add({targets:heartsGfx,x:{from:-4,to:4},duration:60,yoyo:true,repeat:3,ease:"Sine.easeInOut",onComplete:()=>{if(heartsGfx)heartsGfx.x=0;}});
  // Marca invuln imediatamente para bloquear hits durante o voo de knockback
  set_invuln(true);
  // Aviso claro de perda de vida — antes só existia nos combates de boss
  // (bossHitPlayer), por isso num toque normal de vilão a perda de vida
  // passava despercebida (só o coração no HUD mudava, pequeno e discreto).
  showFloat(sceneRef, playerObj.x, playerObj.y-90, "💥 -1 Vida!", "#ff5050");
  // BUG CORRIGIDO (mesma família do já corrigido em hitByHazard, ver ali)
  // — se este toque acontecer perto da porta, o jogador pode terminar o
  // nível antes destes 400ms passarem; sem guardar em que nível o toque
  // aconteceu, este temporizador ia reposicionar o jogador (e a sua
  // itemsCollected/heartIndices) usando LEVELS[currentLevel] já apontado
  // para o nível SEGUINTE, entretanto carregado por loadLevel() — dava a
  // sensação de "perder uma vida"/estado trocado mesmo ao terminar um
  // nível normalmente.
  const _levelAtMalwareHit = currentLevel;
  // Após o voo de knockback, teletransportar e iniciar 2s de proteção completa
  sceneRef.time.delayedCall(400, () => {
    if(!player || currentLevel !== _levelAtMalwareHit) return;
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
  set_itemsCollected( 0);
  itemCountText.setText(`⭐ Itens: ${itemsCollected}/${itemsTotal}`);
  const keyMap={
    estrela:"item_estrela",
    balao:"item_chave",
    brinquedo:"item_chip",medalha:"item_medalha",heart:"item_heart",
    duplosalto:"item_duplosalto"
  };
  let _starIdxRespawn2 = 0;
  LEVELS[currentLevel].items.forEach((it,idx)=>{
    if(it.kind==="heart" && heartIndicesCollected.has(idx)) return;
    // Extremo — mesma regra de isStarAllowedExtremo() usada em loadLevel():
    // sem isto, uma estrela suprimida voltava a aparecer ao perder uma vida.
    if (it.kind === "estrela") {
      const sIdx = _starIdxRespawn2++;
      if (!isStarAllowedExtremo(currentLevel, sIdx)) return;
    }
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

export function setInvuln(scene,ms){
  // Cancelar timers anteriores para evitar conflito de alpha
  if(invulnBlinkEvent){ invulnBlinkEvent.remove(false); set_invulnBlinkEvent(null); }
  if(invulnEndEvent){   invulnEndEvent.remove(false);   set_invulnEndEvent(null); }

  set_invuln(true);
  player.setAlpha(1);
  const blinks=Math.floor(ms/160);
  let blinkCount=0;
  set_invulnBlinkEvent(scene.time.addEvent({
    delay:80,
    repeat:blinks*2,
    callback:()=>{
      blinkCount++;
      // Só pisca se invuln ainda estiver ativo (evita sobrepor o reset final)
      if(!invuln) return;
      if(blinkCount%2===1) player.setAlpha(0.25);
      else player.setAlpha(1);
    }
  }));
  set_invulnEndEvent(scene.time.delayedCall(ms,()=>{
    // Cancelar o blink event primeiro, para garantir que não dispara mais
    if(invulnBlinkEvent){ invulnBlinkEvent.remove(false); set_invulnBlinkEvent(null); }
    set_invuln(false);
    player.setAlpha(1);
    player.setScale(powered?1.18:1.0);
    // Só limpar o tint se não houver poder ativo com cor própria
    if(!starPower && !doubleJumpActive) {
      player.clearTint();
    }
    set_invulnEndEvent(null);
  }));
}

export let poweredCountdownVal=0;

function givePower(scene){
  set_powered(true); SFX.power();
  player.clearTint();
  if(powerIndicator) powerIndicator.setText("🛡️ ESCUDO 8s");
  if(poweredTimer) poweredTimer.remove(false);
  if(powerCountdown) powerCountdown.remove(false);
  poweredCountdownVal=8;
  set_powerCountdown(scene.time.addEvent({delay:1000,loop:true,callback:()=>{
    poweredCountdownVal--;
    if(powerIndicator) powerIndicator.setText(`🛡️ ESCUDO ${poweredCountdownVal}s`);
    if(poweredCountdownVal<=0){clearPower(scene);}
  }}));
  set_poweredTimer(scene.time.delayedCall(8000,()=>clearPower(scene)));
}

export function clearPower(scene){
  set_powered(false);
  if(poweredTimer){poweredTimer.remove(false);set_poweredTimer(null);}
  if(powerCountdown){powerCountdown.remove(false);set_powerCountdown(null);}
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

let doubleJumpCountVal=0;

function giveDoubleJump(scene){
  set_doubleJumpActive(true); set_doubleJumpUsed(false);
  ensureAudio(); SFX.power();
  if(powerIndicator) powerIndicator.setText("🦅 DUPLO SALTO 10s");
  if(doubleJumpTimer)    doubleJumpTimer.remove(false);
  if(doubleJumpCountdown) doubleJumpCountdown.remove(false);
  doubleJumpCountVal=10;
  set_doubleJumpCountdown(scene.time.addEvent({delay:1000,loop:true,callback:()=>{
    doubleJumpCountVal--;
    if(powerIndicator) powerIndicator.setText(`🦅 DUPLO SALTO ${doubleJumpCountVal}s`);
    if(doubleJumpCountVal<=0) clearDoubleJump(scene);
  }}));
  set_doubleJumpTimer(scene.time.delayedCall(10000,()=>clearDoubleJump(scene)));
  tipText.setText("🦅 DUPLO SALTO ATIVO: carrega ↑ novamente no ar!");
}

export function clearDoubleJump(scene){
  set_doubleJumpActive(false); set_doubleJumpUsed(false);
  if(doubleJumpTimer){doubleJumpTimer.remove(false);set_doubleJumpTimer(null);}
  if(doubleJumpCountdown){doubleJumpCountdown.remove(false);set_doubleJumpCountdown(null);}
  if(!powered&&powerIndicator) powerIndicator.setText("");
  if(tipText) tipText.setText(currentLevelTip);
}


// ===== STAR POWER — atropela vilões por 8s =====


// Duração do Star Power — 8s por omissão, encurtado para 4s no Extremo
// (pedido: já com no máximo 1 por nível, fica ainda mais arriscado usá-lo).

function getStarPowerDurationSec() { return difficulty === "extremo" ? 4 : 8; }

function giveStarPower(scene){
  set_starPower(true);
  ensureAudio();
  const durSec = getStarPowerDurationSec();
  if(powerIndicator) powerIndicator.setText(`⭐ STAR POWER ${durSec}s`);
  tipText.setText("⭐ STAR POWER: atropela os maus!");
  if(starPowerTimer)    starPowerTimer.remove(false);
  if(starPowerCountdown) starPowerCountdown.remove(false);
  // Tocar melodia imediatamente e depois em loop a cada 1520ms (16 notas × 95ms)
  SFX.starMelody();
  if(_starMelodyInterval) clearInterval(_starMelodyInterval);
  set__starMelodyInterval( setInterval(()=>{ if(starPower) SFX.starMelody(); }, 1520));
  window._dc_starMelodyInterval = _starMelodyInterval; // exposto para visibilitychange
  set_starPowerCountVal(durSec);
  set_starPowerCountdown(scene.time.addEvent({delay:1000,loop:true,callback:()=>{
    set_starPowerCountVal(starPowerCountVal - 1);
    if(powerIndicator) powerIndicator.setText(`⭐ STAR POWER ${starPowerCountVal}s`);
    if(starPowerCountVal<=0) clearStarPower(scene);
  }}));
  set_starPowerTimer(scene.time.delayedCall(durSec*1000,()=>clearStarPower(scene)));
  // Piscar apenas — sem tint de cor
  if(player) player.clearTint();
  vbSayRandom(VB_STAR_POWER,"star",2800);
}

export function clearStarPower(scene){
  set_starPower(false);
  if(starPowerTimer){starPowerTimer.remove(false);set_starPowerTimer(null);}
  if(starPowerCountdown){starPowerCountdown.remove(false);set_starPowerCountdown(null);}
  if(_starMelodyInterval){ clearInterval(_starMelodyInterval); set__starMelodyInterval(null); }
  window._dc_starMelodyInterval = null;
  if(player){ player.clearTint(); player.setAlpha(1); }
  // Limpar estado visual arco-íris
  if(sceneRef){ sceneRef._starBlinkTimer=0; sceneRef._starColorIdx=0; sceneRef._starTrailTimer=0; }
  if(!powered&&!doubleJumpActive&&powerIndicator) powerIndicator.setText("");
  if(tipText) tipText.setText(currentLevelTip);
}
