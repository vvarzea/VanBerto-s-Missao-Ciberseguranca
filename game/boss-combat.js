/*************************************************
 * VanBerto's — Missão Cibersegurança 🛡️  ·  game/boss-combat.js
 *
 * Bosses (3/4): dano, saltos, fúria, colisões, fase de recolha e ataque especial.
 *
 * Faz parte de dia-crianca.js, dividido em módulos (ver README.md, «Estrutura do código»).
 * As variáveis de estado vivem em state.js; aqui alteram-se com set_<nome>().
 *************************************************/

import { clearMiniViruses, clearPopupHazard, clearToxicZones, currentContaminationZones, currentPopupConfig, doBossTeleport, showBossLaugh, spawnToxicZones, startPhishingDecoy, stopPhishingDecoy, triggerBossBlackout, updateToxicZones } from "./boss-attacks.js?v=20261009v103";
import { destroyBossHpBar, drawBossHpBar, enterBossPhase, startBossFinalStandBurst } from "./boss-core.js?v=20261009v103";
import { startBossQuizPhase } from "./boss-end.js?v=20261009v103";
import { vbSayRandom } from "./dialogue.js?v=20261009v103";
import { hitFlash } from "./dom.js?v=20261009v103";
import { applyHitStop, showFloat } from "./feedback.js?v=20261009v103";
import { showGameOver } from "./flow.js?v=20261009v103";
import { setInvuln } from "./items.js?v=20261009v103";
import { clearExtremoAllies, spawnExtremoReinforcement, updateHearts } from "./level.js?v=20261009v103";
import { snapPlayerToGround } from "./rooms.js?v=20261009v103";
import { awaitingQuiz, bossExtremoAllies, bossLockIcon, bossMiniViruses, bossOverlay, bossRageIcon, bossState, bossTimers, difficulty, heartsGfx, inBossFight, invuln, itemCountText, itemsGroup, lives, livesLostThisLevel, player, sceneRef, score, scoreText, set__hudDirty, set_awaitingQuiz, set_bossExtremoAllies, set_bossLockIcon, set_bossMiniViruses, set_bossOverlay, set_bossPopupAnchors, set_bossRageIcon, set_bossTimers, set_controlsInvertedUntil, set_invuln, set_lives, set_livesLostThisLevel, set_score, starPower, tipText } from "./state.js?v=20261009v103";
import { triggerVanBertoSad } from "./vanberto.js?v=20261009v103";
import { ensureAudio, beep, SFX } from "../audio.js?v=20261009v103";
import { BOSS_HP_TAUNTS } from "../data-story.js?v=20261009v103";
import { VB_STAR_POWER } from "../data-flavor.js?v=20261009v103";

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
  //
  // BUG CORRIGIDO (pedido do Berto: "a plataforma do meio está muito alta
  // ... ao estar nesta plataforma, sem me mexer, eu mato o boss"): isFalling
  // só olhava para a velocidade vertical (>=0), que é exatamente a mesma
  // ao CAIR e ao estar PARADO, especamente no chão (a gravidade empurra
  // para baixo, a plataforma trava a queda, mas a velocidade fica em 0 —
  // igual a "a começar a cair"). Numa plataforma alta o suficiente para o
  // boss (que flutua em onda) lhe passar por baixo dentro de
  // STOMP_TOLERANCE, isto contava como "salto certeiro" repetidamente, só
  // por estar ali parado, sem saltar nem se mexer. Basta exigir também que
  // o jogador não esteja apoiado em chão sólido (!blocked.down, a mesma
  // verificação já usada em todo o resto do jogo para "onGround") — só
  // conta como stomp quando está mesmo no ar a cair, nunca parado numa
  // plataforma.
  const isFalling = pBody.velocity.y >= 0 && !pBody.blocked.down;
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
  if (bossOverlay) { try{bossOverlay.destroy();}catch{} set_bossOverlay( null); }
  // Boss vencido — os temporizadores de combate (saltos, bolas, piscar, etc.)
  // já não têm nada para fazer a partir daqui (as suas callbacks verificam a
  // fase e ficam em no-op fora de "platform"), mas continuavam literalmente a
  // disparar até ao início do combate seguinte ou ao carregar do próximo
  // nível (ver loadLevel/startBossFight). Parar aqui evita esse trabalho
  // desnecessário assim que a fase de derrota começa.
  bossTimers.forEach(t=>{try{t.remove(false);}catch{}}); set_bossTimers([]);
  destroyBossHpBar();
  itemCountText.setText("");
  tipText.setText("");
  const sadKey = "boss_" + def.id + "_sad";
  if (b && b.active && sceneRef.textures.exists(sadKey)) b.setTexture(sadKey);
  // Choro contínuo (pedido: "chorar quando perde e vai embora") — em vez
  // de só a lágrima estática já desenhada na textura "_sad", pinga
  // lágrimas de verdade da cara do boss enquanto foge, até começar a
  // desvanecer (ver o delayedCall de 1750ms mais abaixo, que também
  // para este temporizador).
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
  // BUG POTENCIAL CORRIGIDO (reportado: "ao ir enfrentar o Boss apareceu-me
  // novamente a pergunta do quiz" — não foi possível reproduzir o gatilho
  // exato apesar de revisão extensa a toda a transição nível→boss, mas
  // este temporizador (o único que decide sozinho, 2.35s depois, se deve
  // abrir o quiz de fim de combate) nunca ficava registado em bossTimers[]
  // — ao contrário de quase tudo o resto num combate de boss, não era
  // cancelado ao repetir/reentrar num combate (btnRetry a meio de um
  // combate, ou uma 2ª tentativa rápida do mesmo boss). A verificação
  // "bossState.phase==='defeat'" já devia impedi-lo de disparar cedo
  // demais, mas guardá-lo aqui e cancelá-lo explicitamente em
  // startBossFight() (ver ali) elimina por completo qualquer hipótese de
  // um temporizador esquecido de uma tentativa anterior interferir com uma
  // nova entrada no combate.
  bossState.quizPhaseTimer = sceneRef.time.delayedCall(2350, () => { if (bossState && bossState.phase === "defeat") startBossQuizPhase(); });
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

export function updateBossFight(scene) {
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
  // à Mario" ficavam sempre exatamente ao mesmo ritmo do 1º ao 3º salto.
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
      // a atenção exatamente no instante em que o chão fica mais perigoso.
      const flashRGB = def.contaminatedArena.hazardType === "lava" ? [255,120,20] : [40,220,80];
      scene.cameras.main.flash(260, flashRGB[0], flashRGB[1], flashRGB[2]);
    }
  }

  // Escalada dos pop-ups (Robô do Spam) — mais janelas em simultâneo e a
  // abrir mais depressa a cada fúria; na 2ª fúria a config pode incluir uma
  // âncora extra perto da altura de patrulha do próprio boss (ver
  // popupHazard.escalations[2].anchors em data-bosses.js), tapando também
  // o próprio Robô, não só o chão — a identidade de fúria própria deste
  // boss, tal como o chão contaminado é a do Vírus Gigante. NÃO fecha os
  // pop-ups já abertos (pedido explícito) — só afeta os PRÓXIMOS a abrir.
  if (def.popupHazard) {
    const cfg = currentPopupConfig();
    if (cfg) {
      set_bossPopupAnchors( cfg.anchors);
      if (bossState.popupSpawnTimer) bossState.popupSpawnTimer.delay = cfg.spawnEvery;
      scene.cameras.main.flash(220, 255, 255, 255); // "mais janelas a abrir" — flash branco, distinto do verde/laranja do chão contaminado
    }
  }

  // Ataques novos de fúria final (nova — pedido: os 4 bosses só ficavam
  // "mais rápidos", nunca ganhavam nada qualitativamente diferente ao
  // chegar à 2ª fúria/desesperado). Cada um dos 3 bosses "normais" (o
  // Robô do Spam já tem a sua própria identidade de fúria via popups,
  // acima) ganha agora UM comportamento novo, só seu, só nesta fase —
  // ver comentário completo de cada def.xxxAtMaxRage em data-bosses.js.
  if (level === 2) {
    if (def.phishingDecoyAtMaxRage) startPhishingDecoy(scene);
    if (def.blackoutAtMaxRage) triggerBossBlackout(scene);
    // chaserGermAtMaxRage não precisa de disparo aqui — é lido
    // diretamente em doBossRollQmark/spawnBossGermSplit a partir de
    // bossState.rageLevel, porque só se aplica ao próximo micróbio a
    // partir-se, não a um evento único.
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
  if (bossRageIcon) { try{bossRageIcon.destroy();}catch{} set_bossRageIcon( null); }

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

// ---- Alívio de fúria: chamado quando o BOSS acerta no VanBerto's (pedido:
// "tem de se perceber quando o VanBerto's perde a vida com o Boss" — o
// boss "recupera o fôlego" e desce 1 nível de fúria, em vez do combate
// simplesmente continuar exatamente tão intenso como estava antes do
// toque). Espelha bossEnterRage (mesmas fórmulas de speedMult/timers),
// mas ao contrário — e só nos modos Fácil/Difícil: no Extremo, a fúria
// já acumulada NUNCA desce, para o combate continuar tão apertado quanto
// o jogador o deixou (pedido explícito: "no Extremo mantém-se").
//
// NÃO toca nas zonas contaminadas do Vírus Gigante/Robô do Spam (pedido
// explícito: "não, mantêm-se do tamanho atual") — só a velocidade/cadência
// de ataque do boss é que cede; o chão que já ficou mais perigoso continua
// exatamente assim até ao fim do combate.

function coolBossRageOnPlayerHit(scene) {
  if (!inBossFight || !bossState || bossState.phase !== "platform") return;
  if (difficulty === "extremo") return; // fúria acumulada nunca desce no Extremo
  if (!bossState.rageLevel || bossState.rageLevel <= 0) return;
  const newLevel = bossState.rageLevel - 1;
  bossState.rageLevel = newLevel;
  bossState.speedMult = (newLevel === 0 ? 1 : newLevel === 1 ? 1.35 : 1.7) * (bossState.baseSpeedMult || 1);
  const def = bossState.def, b = bossState.sprite;

  // Mesmos timers que bossEnterRage ajusta, só que agora a abrandar —
  // ver esse comentário para a lista completa e a razão de cada um.
  if (bossState.blinkTimer) bossState.blinkTimer.delay = bossState.blinkBaseDelay / bossState.speedMult;
  if (bossState.teleTimer)  bossState.teleTimer.delay  = bossState.teleBaseDelay  / bossState.speedMult;
  if (bossState.bookTimer)  bossState.bookTimer.delay  = bossState.bookBaseDelay  / bossState.speedMult;
  if (bossState.orbTimer)   bossState.orbTimer.delay   = bossState.orbBaseDelay   / bossState.speedMult;
  if (bossState.hopTimer)   bossState.hopTimer.delay   = bossState.hopBaseDelay   / bossState.speedMult;
  if (bossState.qmarkTimer) bossState.qmarkTimer.delay = bossState.qmarkBaseDelay / bossState.speedMult;
  if (bossState.smokeTimer) bossState.smokeTimer.delay = bossState.smokeBaseDelay / bossState.speedMult;

  // Cara volta ao estado correspondente ao novo nível — normal se
  // newLevel===0, ainda "zangada" (mas com o tint mais claro da fase 1)
  // se ainda ficou a meio.
  if (b && b.active) {
    if (newLevel === 0) {
      const normalKey = "boss_" + def.id;
      if (scene.textures.exists(normalKey)) b.setTexture(normalKey);
      b.clearTint();
    } else {
      const angryKey = "boss_" + def.id + "_angry";
      if (scene.textures.exists(angryKey)) b.setTexture(angryKey);
      b.setTint(0xffb0a0);
    }
  }

  // Reação mais suave que bossEnterRage (isto é um alívio para o
  // jogador, não uma escalada) — sem shake/flash de câmara, só uma fala
  // curta a marcar a mudança.
  showFloat(scene, b ? b.x : bossState.baseX, (b ? b.y : bossState.baseY) - 74, "😮‍💨 Ufa, ganhei fôlego...", "#9be89b");
  ensureAudio();
  beep({ freq: 200, dur: 0.14, type: "sawtooth", vol: 0.05, slideTo: 320 });
}

// Dano ao boss (1 HP) reutilizável — tanto o toque com Star Power (bosses normais)
// como o Raio do Conhecimento (bosses com ataque especial) passam por aqui, para
// as fases de raiva e o fim do combate funcionarem sempre da mesma forma.

export function damageBoss(scene, x, y, label = "💥 Boss atingido!", shakeAmount = 0.006) {
  if (!bossState) return;
  bossState.hp -= 1;
  scene.cameras.main.shake(100, shakeAmount);
  set_score(score + ( 20)); scoreText.setText(`🌟 Pontos: ${score}`);
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
    // Guardião das Sombras, por agora): dispara exatamente uma vez, ao
    // ficar com apenas 1 salto por dar (bossState.hp===1), independente
    // da fúria genérica acima. finalBurstDone evita repetir se o jogador
    // ainda tocar no boss mais vezes antes do 3º salto certeiro.
    if (bossState.def.finalStandBurst && bossState.hp === 1 && !bossState.finalBurstDone) {
      bossState.finalBurstDone = true;
      startBossFinalStandBurst(scene);
    }
    // Reforço do chefe (Extremo, ver spawnExtremoReinforcement) — mesmo
    // gatilho (hp===1), mas totalmente independente do finalStandBurst:
    // um boss pode ter as duas coisas, só uma, ou nenhuma.
    if (bossState.hp === 1) spawnExtremoReinforcement(scene);
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

export function handleBossMalwareCollision(malwareObj) {
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
    // Mensagens configuráveis (nova) — o vírus pequeno da arena
    // contaminada continua com o texto de sempre por omissão; o reforço
    // do Extremo (ver spawnExtremoReinforcement) define as suas próprias
    // via mini_hitMsg/mini_destroyMsg, sem precisar de um ramo à parte.
    const destroyMsg = malwareObj.getData("mini_destroyMsg") || "💥 Vírus eliminado!";
    const hitMsg = malwareObj.getData("mini_hitMsg") || "🦠 Cuidado com os vírus!";
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
      set_score(score + ( 15)); scoreText.setText(`🌟 Pontos: ${score}`);
      showFloat(sceneRef, malwareObj.x, malwareObj.y-40, destroyMsg, "#30c060");
      set_bossMiniViruses( bossMiniViruses.filter(v => v !== malwareObj));
      set_bossExtremoAllies( bossExtremoAllies.filter(v => v !== malwareObj));
      malwareObj.destroy();
    } else {
      bossHitPlayer(sceneRef, malwareObj, hitMsg);
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

export function bossHitPlayer(scene, sourceObj, warnMsg) {
  // CORRIGIDO (bug reportado: "aparece pergunta nova a meio da luta do
  // boss, e depois disso é que ficam vidas perdidas") — esta função era a
  // única fonte de dano do combate de boss que NÃO verificava awaitingQuiz,
  // ao contrário de handleBossItemCollect/handleBossMalwareCollision (que
  // já absorvem qualquer toque em silêncio fora da fase "platform"). Sem
  // isto, se por qualquer via bossHitPlayer() for chamada enquanto o quiz
  // está visível (overlay do quiz aberto, awaitingQuiz=true) e o jogador não
  // estiver invulnerável nesse instante, a vida era mesma assim descontada
  // por baixo do ecrã do quiz — a criança via a pergunta aparecer e, sem
  // perceber porquê, ia ficando sem vidas até "Missão Falhada".
  if (invuln || lives <= 0 || awaitingQuiz) return;
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
  set_lives(lives - ( 1)); updateHearts(); set_livesLostThisLevel(livesLostThisLevel + 1); set__hudDirty( true);
  // Alívio de fúria ao seres atingido (pedido, ver coolBossRageOnPlayerHit)
  // — só faz sentido enquanto o combate continua, por isso fica antes do
  // "lives<=0" (nesse caso o combate já vai acabar de qualquer forma).
  coolBossRageOnPlayerHit(scene);
  // Bug corrigido: ver o mesmo comentário em hitByHazard — sem isto o
  // combate de boss continuava totalmente jogável durante a festa do boss
  // (até 1300ms) antes do ecrã de "Missão Falhada" aparecer.
  if (lives <= 0) set_awaitingQuiz( true);
  triggerVanBertoSad(scene);
  if (heartsGfx) scene.tweens.add({targets:heartsGfx,x:{from:-4,to:4},duration:60,yoyo:true,repeat:3,ease:"Sine.easeInOut",onComplete:()=>{if(heartsGfx)heartsGfx.x=0;}});
  set_invuln( true); // bloqueia novos toques já durante o voo de knockback
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
    // NOVO (pedido inicial: "1 sítio seguro para retomar sempre que perde
    // a vida"; refinado depois para "fique na ponta esquerda da
    // plataforma esquerda"; e agora para "a plataforma mais alta") —
    // antes disto o VanBerto's ficava exatamente onde o empurrão do
    // golpe o tivesse deixado. Passou por uma versão intermédia (v49, que
    // escolhia entre o ponto de entrada e o seu espelho, o que estivesse
    // mais longe do boss); agora é sempre o mesmo sítio FIXO pedido —
    // calculado em startBossFight() a partir das plataformas reais desta
    // arena (bossState.spawnX/spawnY, ver ali "plataforma elevada mais
    // alta"), não da posição do boss. Só faz sentido se ainda houver
    // boss (não interfere com a arena "collect"/"quiz", já sem perigos
    // ativos).
    if (bossState && bossState.spawnX != null && (bossState.phase === "platform" || bossState.phase === "intro")) {
      const safeY = bossState.spawnY != null ? bossState.spawnY : 200;
      player.setVelocity(0, 0);
      player.setPosition(bossState.spawnX, safeY);
      if (player.body) player.body.reset(bossState.spawnX, safeY);
      snapPlayerToGround();
    }
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
  bossTimers.forEach(t=>{try{t.remove(false);}catch{}}); set_bossTimers([]);
  if (bossLockIcon) { try{bossLockIcon.destroy();}catch{} set_bossLockIcon(null); } // boss já não é tocável — ícone deixa de fazer sentido
  if (bossRageIcon) { try{bossRageIcon.destroy();}catch{} set_bossRageIcon(null); }
  destroyBossHpBar(); // vida chegou a 0 — a barra já não tem função a partir daqui
  if (bossState.def.contaminatedArena) { clearToxicZones(); clearMiniViruses(); } // arena "cura-se" ao vencer o boss
  if (bossState.def.popupHazard) clearPopupHazard(); // idem para as janelas de spam do Robô
  if (bossState.def.phishingDecoyAtMaxRage) stopPhishingDecoy(); // idem para a isca falsa do Monstro
  clearExtremoAllies(); // idem para o reforço do Extremo, se tiver sido chamado
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

export function handleBossItemCollect(itemObj) {
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
    set_score(score + ( 10)); scoreText.setText(`🌟 Pontos: ${score}`);
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
    set_controlsInvertedUntil( sceneRef.time.now + 1200);
    bossHitPlayer(sceneRef, null, "😵 Informação errada!");
    return true;
  }
  if (itemObj.getData("bossCharge")) {
    handleChargeItemCollect(itemObj);
    return true;
  }
  if (itemObj.getData("bossDecoy")) {
    // Isca falsa do Monstro do Phishing (fúria final) — ver
    // startPhishingDecoy/spawnPhishingDecoy: parece um bónus, mas dói ao
    // tocar, tal como um clique real num link de phishing.
    const label = itemObj.getData("decoyLabel");
    try{ label && label.destroy(); }catch{}
    itemObj.destroy();
    if (invuln) return true; // já protegido — ignora durante os i-frames
    ensureAudio(); beep({freq:200,dur:0.16,type:"sawtooth",vol:0.06,slideTo:90});
    bossHitPlayer(sceneRef, null, "🎣 Isso era uma armadilha!");
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
  set_score(score + ( 10)); scoreText.setText(`🌟 Pontos: ${score}`);
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
  set_score(score + ( 10)); scoreText.setText(`🌟 Pontos: ${score}`);
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
