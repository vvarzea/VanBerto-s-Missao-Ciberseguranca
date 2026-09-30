/*************************************************
 * VanBerto's — Missão Cibersegurança 🛡️  ·  game/boss-core.js
 *
 * Bosses (1/4): estado do combate, arranque, fases por HP, sprite, arena e barra de vida.
 *
 * Faz parte de dia-crianca.js, dividido em módulos (ver README.md, «Estrutura do código»).
 * As variáveis de estado vivem em state.js; aqui alteram-se com set_<nome>().
 *************************************************/

import { clearMiniViruses, clearPopupHazard, clearToxicZones, doBossBlink, doBossHop, doBossIdleArms, doBossIdleBlink, doBossRollQmark, doBossSmokePuff, doBossTeleport, doBossThrowBook, maintainMiniViruses, spawnMiniViruses, spawnPopupHazard, spawnToxicZones, stopPhishingDecoy } from "./boss-attacks.js?v=20260929v96";
import { bossDialogueAnchor, playBossDialogue, vbDialogueAnchor } from "./dialogue.js?v=20260929v96";
import { quizOverlay } from "./dom.js?v=20260929v96";
import { showFloat } from "./feedback.js?v=20260929v96";
import { clearDoubleJump, clearPower, clearStarPower, setInvuln } from "./items.js?v=20260929v96";
import { clearExtremoAllies } from "./level.js?v=20260929v96";
import { applyBackground, bgKeyForLevel } from "./map.js?v=20260929v96";
import { snapPlayerToGround } from "./rooms.js?v=20260929v96";
import { _critterSession, balloons, bossLockIcon, bossOverlay, bossRageIcon, bossState, bossTimers, bossVignette, critters, currentLevel, door, enemyTimers, getBossExtraHp, getBossSpeedMult, hudText, inBossFight, itemCountText, itemsGroup, malwareGroup, pipeExitDecor, platforms, player, set__critterSession, set__doorAnimRunning, set_awaitingQuiz, set_awaitingStory, set_balloons, set_bossLockIcon, set_bossOverlay, set_bossRageIcon, set_bossState, set_bossTimers, set_bossVignette, set_controlsInvertedUntil, set_critters, set_door, set_enemyTimers, set_inBossFight, set_invuln, set_pipeExitDecor, tipText } from "./state.js?v=20260929v96";
import { clearMovingPlatforms, clearSign, clearTrampolines, spawnBossSign, spawnMovingPlatforms } from "./world.js?v=20260929v96";
import { BOSS_BY_LEVEL } from "../data-bosses.js?v=20260929v96";
import { clearPlatformDecor } from "../background.js?v=20260929v96";
import { LEVELS, THEMES } from "../data-levels.js?v=20260929v96";
import { makePlatformTextureThemed } from "../textures.js?v=20260929v96";
import { ensureAudio, SFX, beep } from "../audio.js?v=20260929v96";
import { BOSS_OBJECTIVE, BOSS_INTRO_VB, BOSS_HP_TAUNTS } from "../data-story.js?v=20260929v96";


// =====================================================================
// ===== BOSSES TEMÁTICOS — Fase 3 (bloco 100% aditivo) =====
// Não altera LEVELS nem currentLevel numbering. O boss acontece "entre"
// dois níveis já existentes — currentLevel não avança durante o combate.
// =====================================================================


let bossArenaDecor = []; // elementos ambiente (emoji+tween) da arena temática — ver def.arena.decor

// Cartão que desliza rapidamente do topo do ecrã e desaparece sozinho —
// usado na chegada do boss ("⚠️ NOME DO BOSS") e na vitória ("✅ VITÓRIA!").
// Não bloqueia nada (não precisa de toque) — é só um flourish visual rápido.

export function showBossBanner(scene, text, color = "#ffffff") {
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

export function startBossFight(scene, levelJustCompleted, onComplete) {
  const rawDef = BOSS_BY_LEVEL[levelJustCompleted];
  if (!rawDef) { onComplete(); return; } // sem boss neste ponto — segue o fluxo normal
  // NOVO (rede de segurança, pedido: "o boss não pode começar antes do
  // quiz do final do nível") — por construção, showQuiz() só chama
  // nextLevel()/startBossFight() dentro do seu "done(true)", já depois de
  // esconder o quizOverlay; mas startBossFight() TEM um segundo ponto de
  // entrada — btnRetry, para recomeçar só a arena depois de perder todas
  // as vidas A MEIO de um combate — que nunca passa pelo quiz. Se por
  // qualquer motivo (ex.: um overlay antigo nunca escondido) o quizOverlay
  // ainda estivesse visível nesse instante, a cinemática de entrada do
  // boss começava a aparecer por baixo/ao lado dele. Esconder aqui,
  // incondicionalmente, garante que os dois nunca ficam visíveis ao
  // mesmo tempo, independentemente de qual dos dois pontos de entrada
  // trouxe o código até aqui.
  if (quizOverlay && !quizOverlay.classList.contains("hidden")) {
    quizOverlay.classList.add("hidden");
  }
  // Ver comentário completo junto a "bossState.quizPhaseTimer =" (mais
  // abaixo, no fim da sequência de derrota "stomp"): cancela aqui um
  // temporizador esquecido de uma tentativa anterior deste ou de outro
  // combate, antes de bossState ser substituído por um novo — nunca deve
  // sobreviver de uma entrada no combate para a seguinte.
  if (bossState && bossState.quizPhaseTimer) {
    try { bossState.quizPhaseTimer.remove(false); } catch {}
  }
  // NOVO (pedido: "quando morro tenho de morrer logo e não dar para
  // apanhar nada... e se apanho uma estrela, ao iniciar o nível estou
  // com o power" — bug reproduzido: só acontecia num combate de boss) —
  // "Tentar outra vez" a meio de um combate chama startBossFight() direto
  // (ver btnRetry, sem passar por loadLevel()), e loadLevel() é o único
  // sítio que já limpava Escudo/Star Power/Duplo Salto ao (re)começar um
  // nível. Um Star Power apanhado mesmo antes de perder a última vida
  // (as recompensas em si já ficam bem bloqueadas por awaitingQuiz — ver
  // onCollectItem — mas o efeito de uma apanhada ANTES do golpe fatal
  // continuava ativo) sobrevivia ao "recomeço" da arena. Limpar aqui,
  // incondicionalmente, cobre os dois pontos de entrada de uma vez
  // (entrada normal e "Tentar outra vez"), tal como loadLevel() já fazia
  // para os níveis normais.
  clearPower(scene); clearStarPower(scene); clearDoubleJump(scene);
  // No Difícil/Extremo o boss aguenta +2 saltos na cabeça (ver
  // getBossExtraHp — nunca mexe no objeto original de data-bosses.js,
  // partilhado por todas as partidas — clona-se só aqui). def.hp é o único
  // valor lido daqui para a frente (pela barra de vida, pelo HUD "saltos:
  // X/Y" e pelos taunts), por isso basta este clone para tudo ficar
  // consistente, sem precisar de tocar em mais nenhum sítio do combate.
  const _bossExtraHp = getBossExtraHp();
  const def = _bossExtraHp > 0 ? { ...rawDef, hp: rawDef.hp + _bossExtraHp } : rawDef;

  set_inBossFight( true);
  set_controlsInvertedUntil( 0);
  // invuln=false: mesma defesa que loadLevel() já faz ao iniciar um nível
  // — garante que repetir um combate de boss (ex.: depois de perder todas
  // as vidas) nunca começa com uma proteção presa de "true" (ver o bug
  // corrigido em bossHitPlayer, mais abaixo). Sem isto, TODOS os toques no
  // boss, incluindo saltar-lhe em cima, eram ignorados em silêncio.
  set_invuln( false);
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
  set__doorAnimRunning( false);
  // Se houver uma barra de vida de uma tentativa anterior (ex.: repetir o
  // combate depois de perder todas as vidas), destruir ANTES de substituir
  // bossState — senão a referência perde-se e a barra antiga fica órfã no ecrã.
  destroyBossHpBar();
  // Começa em "intro": todos os timers/movimentos do boss (que verificam
  // phase!=="platform") ficam inertes enquanto decorre a cinemática de entrada.
  set_bossState( { def, hp: def.hp, phase: "intro", collected: 0, onComplete, hitCooldownUntil: 0, rageLevel: 0, speedMult: getBossSpeedMult(), baseSpeedMult: getBossSpeedMult(), qmarkShotCount: 0,
    // tookDamage (novo): fica true na 1ª vez que bossHitPlayer() acertar
    // durante este combate — usado só no fim (ver "Combate Perfeito" na
    // vitória do quiz) para saber se o jogador não perdeu nenhuma vida.
    tookDamage: false });

  // Limpar o palco tal como loadLevel já faz — arena dedicada, isolada do nível anterior
  enemyTimers.forEach(t=>{try{t.remove(false);}catch{}}); set_enemyTimers([]);
  bossTimers.forEach(t=>{try{t.remove(false);}catch{}}); set_bossTimers([]);
  platforms.clear(true,true); itemsGroup.clear(true,true); malwareGroup.clear(true,true);
  pipeExitDecor.forEach(o=>{try{o.destroy();}catch{}}); set_pipeExitDecor([]);
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
  set__critterSession(_critterSession + 1);
  balloons.forEach(b=>{ if(b.sprite) b.sprite.destroy(); if(b.gfx) b.gfx.destroy(); }); set_balloons([]);
  critters.forEach(c=>{ if(c.sprite&&c.sprite.active) c.sprite.destroy(); }); set_critters([]);
  clearPlatformDecor();
  clearSign();
  if(bossOverlay){ try{bossOverlay.destroy();}catch{} set_bossOverlay(null); }
  if(bossLockIcon){ try{bossLockIcon.destroy();}catch{} set_bossLockIcon(null); }
  if(bossRageIcon){ try{bossRageIcon.destroy();}catch{} set_bossRageIcon(null); }
  if(bossVignette){ try{bossVignette.destroy();}catch{} set_bossVignette(null); } // vinheta de fase (ex.: Preconceito)
  clearToxicZones();
  clearMiniViruses();
  clearPopupHazard(); // reset defensivo — ver comentário igual em clearToxicZones()/clearMiniViruses() aqui ao lado
  stopPhishingDecoy(); // idem para a isca falsa do Monstro do Phishing
  clearExtremoAllies(); // idem para o reforço do Extremo (qualquer boss)
  clearBossArenaDecor(); // decoração ambiente temática (ver def.arena.decor)
  if(door){ door.destroy(); set_door(null); }

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
  // CORRIGIDO (pedido: "quando morre no nível boss continua a não ficar
  // em cima da plataforma mais alta") — este cálculo já existia, mas só
  // corria DEPOIS de colocar o VanBerto's em playerStartX/200 (linhas
  // acima, na versão anterior), por isso só valia para o regresso
  // depois de perder uma vida A MEIO do combate (bossHitPlayer). Ao
  // "morrer" de facto (todas as vidas, ecrã de "Missão Falhada" →
  // "Tentar de novo"), btnRetry chama loadLevel() do zero, que entra de
  // novo AQUI, em playerStartX/200 — a plataforma mais alta nunca era
  // usada nesse caminho. Adiantar o cálculo para antes de posicionar o
  // VanBerto's, e usá-lo já na entrada inicial (mais abaixo), cobre os
  // dois casos com o mesmo código: primeira entrada no boss, regresso a
  // meio do combate, E "Tentar de novo" depois de morrer — os 3 caem
  // sempre no mesmo sítio seguro.
  // "Plataforma elevada" = qualquer uma que não seja o chão principal
  // (identificado por ser a mais larga — mais de 60% da arena; nunca faz
  // sentido começar "no alto" desse). Se um boss não tiver nenhuma
  // plataforma elevada, mantém-se o comportamento de sempre (playerStartX/200).
  const _nonGroundPlats = arenaPlatforms.filter(p => p[2] < worldW * 0.6);
  let _entryX = playerStartX, _entryY = 200;
  if (_nonGroundPlats.length) {
    const _highPlat = _nonGroundPlats.reduce((a, b) => a[1] < b[1] ? a : b);
    // Centro da própria plataforma (em vez da borda esquerda) — as
    // plataformas mais altas são normalmente mais estreitas, por isso
    // aparecer no centro evita cair logo por estar demasiado perto de
    // uma borda.
    _entryX = _highPlat[0];
    _entryY = _highPlat[1] - 40; // um pouco acima da própria plataforma
  }
  player.setPosition(_entryX,_entryY); player.setVelocity(0,0);
  if(player.body) player.body.reset(_entryX,_entryY);
  // Guardado em bossState — bossHitPlayer() usa isto para saber para
  // onde repor o VanBerto's sempre que perde uma vida a meio do combate
  // (mesmo ponto agora usado na entrada, acima).
  bossState.spawnX = _entryX;
  bossState.spawnY = _entryY;
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
  if (def.popupHazard) {
    // Robô do Spam: janelas de spam a tapar pedaços do ecrã, em vez do
    // chão contaminado do Vírus Gigante — ver comentário completo junto a
    // spawnPopupHazard().
    spawnPopupHazard(scene);
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
    set_bossOverlay( scene.add.rectangle(worldW/2, 257, worldW, 514, def.color, 0.16).setDepth(1));
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
    set_awaitingQuiz( false); set_awaitingStory( false);
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
      set_bossLockIcon( scene.add.text(0, 0, "🔒", { fontSize:"24px" }).setOrigin(0.5).setDepth(6));
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

export function enterBossPhase(scene, def, hp) {
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
    set_bossVignette( g);
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

export function startBossFinalStandBurst(scene) {
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
    if (def.orbScale) shadow.setScale(def.orbScale); // ver comentário em doBossRollQmark
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

export function clearBossArenaDecor() {
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

export function drawBossHpBar() {
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

export function destroyBossHpBar() {
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
