/*************************************************
 * VanBerto's — Missão Cibersegurança 🛡️  ·  game/rooms.js
 *
 * Agachar, canos e salas secretas: entrar, sair e reposicionar o jogador.
 *
 * Faz parte de dia-crianca.js, dividido em módulos (ver README.md, «Estrutura do código»).
 * As variáveis de estado vivem em state.js; aqui alteram-se com set_<nome>().
 *************************************************/

import { setInvuln } from "./items.js?v=20260930v97";
import { applyBackground, bgKeyForLevel } from "./map.js?v=20260930v97";
import { ROOM_ITEM_XY, ROOM_LANDING_Y, ROOM_LEDGE, ROOM_PIPE_XY, ROOM_THEME_IDX, ROOM_WORLD_W } from "./scene.js?v=20260930v97";
import { _pendingEntranceReveal, _pipeWarping, balloons, collectedRoomPipes, critters, currentLevel, currentSign, door, inSecretRoom, isCrouching, itemsGroup, malwareGroup, movingPlatforms, pipes, platforms, player, sceneRef, secretRoomHidden, secretRoomReturn, secretRoomTemp, set__pendingEntranceReveal, set__pipeWarping, set__suppressCrouchUntilRelease, set_inSecretRoom, set_isCrouching, set_secretRoomHidden, set_secretRoomReturn, set_secretRoomTemp, trampolines } from "./state.js?v=20260930v97";
import { clearSecretSigns, spawnSecretSign } from "./world.js?v=20260930v97";
import { ensureAudio, beep, SFX } from "../audio.js?v=20260930v97";
import { makePlatformTextureThemed, makePipeTexture } from "../textures.js?v=20260930v97";
import { LEVELS, THEMES } from "../data-levels.js?v=20260930v97";

// Anima a entrada do VanBerto's (fade-in + "pop" estica-encolhe) — chamada
// só quando o jogo realmente arranca (ver showHistory), nunca enquanto o
// cartão de transição ou o "Sabias que...?" ainda estão visíveis. Os pés
// ficam sempre presos ao chão durante a animação (ver pinFeet), mesmo que
// esta corra já com a física em andamento.

export function revealPlayerEntrance(scene) {
  if (!_pendingEntranceReveal) return;
  set__pendingEntranceReveal( false);
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

export function setCrouchHitbox(playerObj, crouching){
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

export function exitCrouch(){
  if (!isCrouching) return;
  set_isCrouching( false);
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

export function tryEnterPipe(scene){
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
  set__pipeWarping( true);
  set__suppressCrouchUntilRelease( true);
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
          set__pipeWarping( false);
        }
      });
    }
  });
}

// ===== Esconder/repor o nível principal (sem destruir nada) =====

function hideMainLevelForRoom() {
  set_secretRoomHidden( []);
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
  set_secretRoomHidden( []);
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
  set_secretRoomTemp( { ledge:null, pipe:null, item:null, decor:[], key:null });
}

// ===== Entrar / sair da sala secreta — mesma animação de 0,4s do cano
// normal (encolher/crescer), só que a meio troca-se o nível principal
// inteiro pela sala isolada (ou vice-versa), tal como startBossFight()
// já faz para os combates de boss.

function enterSecretRoomFlow(scene, p) {
  if (_pipeWarping || !player?.body) return;
  set__pipeWarping( true);
  set__suppressCrouchUntilRelease( true);
  exitCrouch();
  ensureAudio(); beep({ freq: 480, dur: 0.09, type: "square", vol: 0.05, slideTo: 220 });
  player.body.moves = false;
  setInvuln(scene, TUNNEL_WARP_MS*2 + 500);
  const startScaleX = player.scaleX, startScaleY = player.scaleY;
  scene.tweens.add({
    targets: player, y: player.y + 20, scaleY: startScaleY*0.12, scaleX: startScaleX*1.15, alpha: 0.35,
    duration: TUNNEL_WARP_MS, ease: "Quad.easeIn",
    onComplete: () => {
      set_inSecretRoom( true);
      set_secretRoomReturn( { x: p.returnX, y: p.returnY });
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
          set__pipeWarping( false);
        }
      });
    }
  });
}

function exitSecretRoomFlow(scene) {
  if (_pipeWarping || !player?.body) return;
  set__pipeWarping( true);
  set__suppressCrouchUntilRelease( true);
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
      set_inSecretRoom( false);
      set_secretRoomReturn( null);

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
          set__pipeWarping( false);
        }
      });
    }
  });
}

export function snapPlayerToGround(){
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
