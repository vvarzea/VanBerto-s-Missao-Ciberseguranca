/*************************************************
 * VanBerto's — Missão Cibersegurança 🛡️  ·  game/level.js
 *
 * Carregar um nível, vilões, drones e o HUD (pontos, corações, barra de progresso).
 *
 * Faz parte de dia-crianca.js, dividido em módulos (ver README.md, «Estrutura do código»).
 * As variáveis de estado vivem em state.js; aqui alteram-se com set_<nome>().
 *************************************************/

import { createArtOrbs } from "./artefacts.js?v=20260930v97";
import { clearBossArenaDecor } from "./boss-core.js?v=20260930v97";
import { tryOpenDoor } from "./door.js?v=20260930v97";
import { showFloat } from "./feedback.js?v=20260930v97";
import { clearDoubleJump, clearPower, clearStarPower } from "./items.js?v=20260930v97";
import { applyBackground, bgKeyForLevel, prefetchBackgrounds } from "./map.js?v=20260930v97";
import { saveGame } from "./overlays.js?v=20260930v97";
import { setCrouchHitbox, snapPlayerToGround } from "./rooms.js?v=20260930v97";
import { _doorWatchdogTimer, _landingCheckTimer, awaitingQuiz, bossExtremoAllies, bossState, bossTimers, currentLevel, currentLevelTip, decorativePipes, difficulty, door, doorOverlap, enemyTimers, getDifficulty, getMaxLives, getVillainJumpIntervalMult, getVillainSpeedMult, heartsGfx, hudText, invuln, isItemVisibleInDificil, isReducibleItemKind, isStarAllowedExtremo, itemCountText, itemsCollected, itemsGroup, itemsTotal, lives, malwareGroup, pipeExitDecor, pipes, platforms, player, playerName, playerNameHUD, powerHaloGfx, powerIndicator, powered, progressFill, resetPipeWarpState, score, scoreText, set__doorAnimRunning, set__doorWatchdogTimer, set__hudDirty, set__landingCheckTimer, set__pendingEntranceReveal, set_awaitingQuiz, set_bossExtremoAllies, set_bossTimers, set_collectedItemIndices, set_collectedRoomPipes, set_controlsInvertedUntil, set_currentLevel, set_currentLevelTip, set_decorativePipes, set_door, set_doorOverlap, set_enemyTimers, set_extraShieldCounted, set_inSecretRoom, set_invuln, set_isCrouching, set_itemsCollected, set_itemsTotal, set_livesLostThisLevel, set_pipeExitDecor, set_pipes, set_secretRoomHidden, set_secretRoomReturn, set_secretRoomTemp, shadowGfx, tipText, touch } from "./state.js?v=20260930v97";
import { clearHazards, clearMovingPlatforms, clearPipeHintSign, clearSecretSigns, clearSecrets, clearTrampolines, difficultyFactor, spawnBalloons, spawnCritters, spawnHazards, spawnLevelSign, spawnMovingPlatforms, spawnPipeHintSign, spawnSecrets, spawnShields, spawnTrampolines } from "./world.js?v=20260930v97";
import { LEVELS, THEMES } from "../data-levels.js?v=20260930v97";
import { resetLevelStarTracking } from "../stars.js?v=20260930v97";
import { makePlatformTextureThemed, makePipeTexture } from "../textures.js?v=20260930v97";
import { spawnPlatformDecor, resetDoorGlow } from "../background.js?v=20260930v97";
import { ensureAudio, SFX, beep } from "../audio.js?v=20260930v97";

// ===== Carregar nível =====

export function loadLevel(scene,idx){
  set_currentLevel(idx);
  set_controlsInvertedUntil( 0);
  const L=LEVELS[currentLevel];
  const T=THEMES[L.theme%THEMES.length];

  // Segurança: se por algum motivo um nível for recarregado a meio de uma
  // visita a uma sala secreta (ex.: reset externo), os objetos efémeros
  // da sala e as referências escondidas ficariam órfãos — o próprio
  // loadLevel já limpa/recria "platforms"/"itemsGroup"/"malwareGroup" a
  // seguir, por isso basta esvaziar aqui as referências e as flags.
  set_inSecretRoom( false);
  set_secretRoomReturn( null);
  set_secretRoomHidden( []);
  set_secretRoomTemp( { ledge:null, pipe:null, item:null, decor:[], key:null });
  resetPipeWarpState();

  scene.physics.world.setBounds(0,0,L.worldW,514);
  scene.cameras.main.setBounds(0,0,L.worldW,540);

  enemyTimers.forEach(t=>{try{t.remove(false);}catch{}}); set_enemyTimers([]);
  bossTimers.forEach(t=>{try{t.remove(false);}catch{}}); set_bossTimers([]);
  platforms.clear(true,true);itemsGroup.clear(true,true);
  malwareGroup.clear(true,true);
  pipeExitDecor.forEach(o=>{try{o.destroy();}catch{}}); set_pipeExitDecor([]);
  clearBossArenaDecor(); // segurança: sem isto, os "livros flutuantes" do Monstro
                          // ficavam órfãos no ecrã depois de se vencer o boss
  if(door){door.destroy();set_door(null);}
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
  if(_doorWatchdogTimer){ try{_doorWatchdogTimer.remove(false);}catch{} set__doorWatchdogTimer(null); }
  if(_landingCheckTimer){ try{_landingCheckTimer.remove(false);}catch{} set__landingCheckTimer(null); }
  set_awaitingQuiz(true); set_invuln(false); clearPower(scene); clearDoubleJump(scene); clearStarPower(scene); set_livesLostThisLevel(0); set__doorAnimRunning(false); resetLevelStarTracking();
  set_isCrouching(false); setCrouchHitbox(player, false);
  scene.physics.pause();
  // Garantir que halo e sombra estão visíveis no início do nível
  if(powerHaloGfx) powerHaloGfx.setVisible(true);
  if(shadowGfx)    shadowGfx.setVisible(true);
  set_itemsCollected(0);
  // itemsTotal — no Difícil conta só os itens "reduzíveis" que ficam
  // mesmo visíveis (ver isItemVisibleInDificil()/isReducibleItemKind()
  // acima); no Extremo conta também só as estrelas que realmente vão
  // aparecer (ver isStarAllowedExtremo()) — senão a coleta a 100% ficava
  // impossível em níveis onde nem todas as estrelas chegam a ser criadas.
  // Corações nunca saem da contagem.
  {
    let _r = 0, _s = 0;
    const visibleNonHeart = L.items.filter(it=>{
      if (it.kind === "heart") return false;
      if (it.kind === "estrela") { const sIdx=_s++; return isStarAllowedExtremo(idx, sIdx); }
      if (!isReducibleItemKind(it.kind)) return true;
      const idxR = _r++;
      return !(difficulty !== "facil" && !isItemVisibleInDificil(idxR));
    }).length;
    set_itemsTotal( visibleNonHeart
      + (L.pipes||[]).filter(p=>p.room && p.kind!=="heart").length);
  }
  set_extraShieldCounted(false);
  set_collectedItemIndices(new Set());
  set_collectedRoomPipes(new Set());
  set__hudDirty(true); updateHUD(L); applyBackground(scene,L.theme%THEMES.length,L.worldW,L.hazards||[],bgKeyForLevel(idx));
  prefetchBackgrounds(scene, idx);

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
  set_pipes( []);
  set_decorativePipes( []);
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

  set_door(scene.physics.add.staticSprite(L.doorX,448,"door_party").setDisplaySize(88,104));
  door.refreshBody(); // sincronizar hitbox físico com o tamanho visual (setDisplaySize não o faz automaticamente)
  door.clearTint();
  // Guardar referência ao collider para o poder destruir no momento do toque (evita re-disparo no móvel)
  if(doorOverlap) { try{ scene.physics.world.removeCollider(doorOverlap); }catch{} set_doorOverlap(null); }
  let _doorTriggered=false; // guarda local — evita disparo duplo no mesmo frame
  const _spawnX = L.spawn.x; // guardar spawn para verificação de distância mínima
  set_doorOverlap( scene.physics.add.overlap(player,door,()=>{
    if(awaitingQuiz||_doorTriggered||invuln) return;
    // Segurança: ignorar overlap se o player ainda está perto do spawn (evita disparo falso no 1º frame após resume)
    if(Math.abs(player.x - _spawnX) < 200) return;
    _doorTriggered=true;
    try{ scene.physics.world.removeCollider(doorOverlap); set_doorOverlap(null); }catch{}
    tryOpenDoor(scene);
  },null,scene));
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
  let _rIdx = 0, _starIdx = 0;
  L.items.forEach((it,idx)=>{
    if (isReducibleItemKind(it.kind)) {
      const idxR = _rIdx++;
      if (difficulty !== "facil" && !isItemVisibleInDificil(idxR)) return; // não cria este item
    }
    // Extremo — ver isStarAllowedExtremo(): no máximo 1 estrela por nível
    // (níveis 1-14), nenhuma a partir do nível 15.
    if (it.kind === "estrela") {
      const sIdx = _starIdx++;
      if (!isStarAllowedExtremo(currentLevel, sIdx)) return; // não cria esta estrela
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

  // Drone hostil — antes exclusivo do Extremo, agora também no Difícil
  // (pedido: "podemos colocar os drones maus no Difícil?"), mas com menos
  // intensidade — mantém a escalada gradual já usada no resto do jogo
  // (Fácil 0 → Difícil menos que Extremo → Extremo o máximo, ver
  // getBossSpeedMult/getBossExtraHp/getVillainSpeedMult acima, todos com o
  // mesmo padrão de 3 degraus). Extremo mantém a fórmula original (2 a
  // partir do Nível 1, +1 a cada 5 níveis, até 5); Difícil começa mais
  // fraco e sobe mais devagar (1 a partir do Nível 1, +1 a cada 6 níveis,
  // até 3) — sempre na banda alta do céu, afastados do spawn (para não
  // emboscar logo à entrada) e da porta (para não bloquear a saída).
  if (difficulty === "extremo" || difficulty === "dificil") {
    const droneCount = difficulty === "extremo"
      ? Math.min(5, 2 + Math.floor(currentLevel / 5))
      : Math.min(3, 1 + Math.floor(currentLevel / 6));
    const startX = (L.spawn?.x ?? 0) + 500;
    const spanX = Math.max(200, L.worldW - startX - 300);
    for (let i = 0; i < droneCount; i++) {
      const dx = startX + (spanX / droneCount) * i + Math.random() * (spanX / droneCount) * 0.6;
      const dy = 120 + Math.random() * 160;
      spawnHostileDrone(scene, dx, dy, 110 + Math.random() * 60);
    }
  }

  // Garantir que os 3 tipos de vilao aparecem SEMPRE em todos os niveis —
  // no Difícil os 3 tipos mantêm-se distintos (ver spawnVilao), só que os
  // limiares abaixo desbloqueiam bem mais cedo, para haver mais vilões
  // espalhados pelas plataformas (pedido: "mais vilões nas plataformas").
  if(L.platforms.length>=5) {
    const hardDif = getDifficulty() !== "facil";
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
    // reaproveitando exatamente as mesmas posições seguras (mid/q1/q3/
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

    // ===== Difícil: vilões extra a patrulhar as plataformas elevadas =====
    // Pedido do Berto: "no nível difícil quero que os vilões patrulhem
    // mais as plataformas, principalmente as superiores". Todos os spawns
    // acima nascem sempre a y:480 (chão) só alinhados em X com uma
    // plataforma — por gravidade, acabam quase sempre a cair para o chão
    // ou para a plataforma mais baixa por baixo, nunca ficando mesmo "em
    // cima" de uma plataforma alta no ar. Aqui escolhem-se as plataformas
    // mais altas do nível (menor y = mais alto no ecrã) e um vilão
    // "patrol" nasce já pousado em cada uma, com o percurso limitado à
    // própria largura da plataforma (bounds — ver spawnVilao/updateMalware
    // acima), para patrulhar ali para trás e para a frente em vez de
    // cair lá fora. Só no Difícil — no Fácil o comportamento das
    // plataformas altas mantém-se inalterado (continuam só com itens).
    //
    // CORREÇÃO (pedido: "vilões fixos nas plataformas... têm de
    // patrulhar mas os níveis têm de ser possíveis"): a margem antiga
    // (`Math.min(40, Math.max(10, p.w/2-10))`) definia os LIMITES onde o
    // vilão inverte a direção, não uma zona livre — em plataformas
    // estreitas (a partir de w:110) isso dava um percurso de patrulha tão
    // pequeno (por vezes só ~20-30px) que o vilão de 48px de largura
    // ficava sempre a cobrir a plataforma quase toda, parecendo fixo e
    // sem deixar o VanBerto's passar em segurança em NENHUM momento do
    // ciclo. Agora calcula-se ao contrário: primeiro garante-se sempre
    // "clearance" px totalmente livres de vilão em cada ponta da
    // plataforma (espaço para o VanBerto's — hitbox 44px — pousar e
    // passar), e só depois se filtram as plataformas largas o suficiente
    // para sobrar, no meio, uma amplitude de patrulha visível
    // ("minPatrolRange") — plataformas demasiado estreitas para isso
    // deixam simplesmente de receber vilão elevado (patrolCount ajusta-se
    // sozinho), em vez de gerar um vilão praticamente parado a bloquear
    // tudo.
    if (hardDif) {
      const spawnSafeX = (L.spawn?.x || 0) + 260; // nunca nascer em cima do jogador
      const villainHalfW = 24;   // metade da largura do vilão "patrol" (48px, ver spawnVilao)
      const clearance = 70;      // px SEMPRE livres de vilão em cada ponta da plataforma
      const minPatrolRange = 80; // amplitude mínima de patrulha — nunca deve parecer "fixo"
      const inset = clearance + villainHalfW; // distância do centro do vilão à borda da plataforma
      const minPlatformW = inset * 2 + minPatrolRange;
      const elevated = L.platforms
        .filter(p => p.w >= minPlatformW && p.x > spawnSafeX && Math.abs(p.x - L.doorX) > 140)
        .slice()
        .sort((a, b) => a.y - b.y); // menor y primeiro = plataformas mais altas
      const patrolCount = Math.min(4, elevated.length);
      for (let i = 0; i < patrolCount; i++) {
        const p = elevated[i];
        const half = 24; // metade da altura do vilão "patrol" (48px, ver spawnVilao)
        const topY = p.y - p.h / 2 - half - 4; // nasce já assente no topo da plataforma
        spawnVilao(
          scene, p.x, topY,
          (i % 2 === 0) ? 140 : -140,
          df, "patrol",
          { minLeft: p.x - p.w / 2 + inset, minRight: p.x + p.w / 2 - inset }
        );
      }
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
  set__pendingEntranceReveal( true);

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
    "📶 Evita iniciar sessão em contas importantes em Wi-Fi público!",
    "💾 Faz sempre cópias de segurança dos teus trabalhos!",
    "🔥 CUIDADO COM A LAVA! Mantém-te nas plataformas — não caias!",
    "🛒 Desconfia de ofertas online boas demais para ser verdade!",
    "📢 Usa o botão de denúncia sempre que precisares de ajuda!",
    "🧑‍💻 A maioria das redes sociais exige, no mínimo, 13 anos!",
    "🏃 As plataformas MOVEM-SE! Observa o ritmo antes de saltar!",
    "🚫 Nunca aceites pedidos de amizade de desconhecidos online!",
    "⚖️ Os teus direitos e deveres existem também no mundo digital!"
  ];
  set_currentLevelTip( (TIPS[currentLevel] || TIPS[0]) + (currentLevel >= 6 ? " ⚠️ Cuidado!" : ""));
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
// bounds (opcional) — {minLeft,minRight}: limita a patrulha a uma zona
// fixa em x (tal como o padrão "mini" já faz por omissão), usado para
// prender um vilão "patrol"/"jumper" à largura exata de UMA plataforma —
// ver bloco "Difícil: vilões extra a patrulhar as plataformas elevadas"
// em loadLevel(). Sem isto, um vilão nascido em cima de uma plataforma no
// ar só inverte direção nos limites do MUNDO (ver updateMalware()),
// acabando por caminhar para fora da plataforma e cair.

function spawnVilao(scene, x, y, vx, df, pattern="patrol", bounds=null) {
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

  // bounds explícitos (patrulha presa a UMA plataforma) têm sempre
  // prioridade sobre o ±120 por omissão do "mini" definido acima.
  if (bounds) {
    v.setData("minLeft", bounds.minLeft);
    v.setData("minRight", bounds.minRight);
  }

  // Saltos periódicos — patrol e jumper sempre; no Difícil o Trapalhão
  // ("mini") passa também a saltar (pedido: os 3 tipos saltarem mais no
  // Difícil), continuando sem saltar no Fácil ("lento e previsível").
  // × getVillainJumpIntervalMult(): no Difícil o intervalo encolhe, ou
  // seja, salta-se com mais frequência.
  const jimMult = getVillainJumpIntervalMult();
  if (pattern === "patrol" || pattern === "jumper" || (pattern === "mini" && difficulty !== "facil")) {
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

// ===== Drone hostil — inimigo aéreo do Difícil/Extremo =====
// Pedido original: "drones maus" no Extremo; depois estendido também ao
// Difícil (com menos intensidade — ver contagem em loadLevel), mas SEM
// mexer nos drones apanháveis normais (esses continuam a existir em
// TODOS os níveis, ver spawnCritters/item_drone) — este é um tipo de
// inimigo à parte, com o seu próprio visual (drone_hostil, ver
// textures.js), para nunca se confundir com o drone bom. Entra no MESMO
// malwareGroup que os vilões normais, por isso já herda de graça toda a
// colisão/dano/knockback/atropelamento por Star Power de onHitMalware() —
// não foi preciso tocar nessa função.
// patrolHalfWidth: distância (px) para cada lado de x que o drone
// patrulha, em voo, sem depender de plataformas nem de gravidade.

function spawnHostileDrone(scene, x, y, patrolHalfWidth = 140) {
  const v = malwareGroup.create(x, y, "drone_hostil");
  v.setCollideWorldBounds(true);
  v.setBounce(0);
  v.body.setAllowGravity(false); // voa — nunca cai nem pousa em plataformas
  v.setDisplaySize(52, 52); v.body.setSize(44, 44, true);
  v.setDepth(2);
  v.setData("pattern", "drone_hostil");
  v.setData("originX", x); v.setData("originY", y);
  v.setData("baseY", y);
  v.setData("bobPhase", Math.random() * Math.PI * 2);
  // × getVillainSpeedMult(): mesma escala de velocidade dos outros
  // vilões — no Extremo já sai a ×1.4 automaticamente.
  const spd = (70 + Math.random() * 30) * getVillainSpeedMult();
  v.setVelocityX(spd);
  v.setData("speed", spd);
  v.setData("dir", 1);
  v.setData("minLeft",  x - patrolHalfWidth);
  v.setData("minRight", x + patrolHalfWidth);
  // Pulsar o "olho" vermelho — leve variação de escala para chamar a
  // atenção como ameaça, distinto da flutuação suave do drone bom.
  scene.tweens.add({targets:v, scaleX:{from:1.0,to:1.08}, scaleY:{from:1.0,to:1.08},
    duration:260+Math.random()*120, yoyo:true, repeat:-1, ease:"Sine.easeInOut"});
  return v;
}


// ---- Reforço do chefe — habilidade exclusiva do Extremo nos combates de
// boss (pedido: "algo qualitativamente novo no Extremo, não só +HP/×1.4",
// tal como o drone hostil deu algo novo aos níveis normais). Ao chegar ao
// último salto por dar (hp===1), SÓ no Extremo, o boss "chama reforços":
// reaproveita o mesmíssimo drone hostil dos níveis normais (mesmo
// visual/voo/patrulha, ver spawnHostileDrone acima), mas retintado com a
// cor própria de cada boss (def.color) para parecer um reforço enviado
// por ELE, e marcado isMiniHazard=true para se comportar exatamente como
// um vírus pequeno da arena contaminada (dói ao tocar sem Star Power,
// esmaga-se com Star Power) — ver handleBossMalwareCollision. 100%
// opt-in via def.extremoReinforcement; nos modos Fácil/Difícil esta
// função não faz nada. ----


export function spawnExtremoReinforcement(scene) {
  if (!bossState || difficulty !== "extremo" || !bossState.def.extremoReinforcement) return;
  if (bossState.extremoReinforcementSpawned) return;
  bossState.extremoReinforcementSpawned = true;
  const worldW = (bossState.def.arena && bossState.def.arena.worldW) || 960;
  const v = spawnHostileDrone(scene, worldW / 2, 220, 150);
  v.setTint(bossState.def.color != null ? bossState.def.color : 0xffffff);
  v.setData("isMiniHazard", true);
  v.setData("mini_hitMsg", `🚨 Reforço do ${bossState.def.name}!`);
  v.setData("mini_destroyMsg", "💥 Reforço eliminado!");
  bossExtremoAllies.push(v);
  showFloat(scene, worldW / 2, 180, "🚨 Chamou reforços!", "#ff6a5c");
  ensureAudio(); beep({ freq: 90, dur: 0.22, type: "square", vol: 0.05, slideTo: 200 });
}

export function clearExtremoAllies() {
  bossExtremoAllies.forEach(v => { try{ if (v.active) v.destroy(); }catch{} });
  set_bossExtremoAllies( []);
}

export function updateHUD(L) {
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

export function updateProgressBar(L) {
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

export function updateHearts(){
  if(!heartsGfx) return;
  heartsGfx.clear();
  const startX=14,y=56,size=12,gap=17;
  for(let i=0;i<getMaxLives();i++){
    const x=startX+i*gap, full=i<lives;
    const r=size*0.52;
    heartsGfx.fillStyle(full?0xe84d10:0xffc0a0,full?1:0.4);
    heartsGfx.fillCircle(x-r*0.55,y-r*0.18,r); heartsGfx.fillCircle(x+r*0.55,y-r*0.18,r);
    heartsGfx.fillTriangle(x-size,y-r*0.1,x+size,y-r*0.1,x,y+size*1.05);
    if(full){heartsGfx.fillStyle(0xffffff,0.3);heartsGfx.fillCircle(x-r*0.3,y-r*0.5,r*0.3);}
  }
}
