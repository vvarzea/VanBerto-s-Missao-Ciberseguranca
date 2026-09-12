// ===== Fundo, parallax e decorações animadas — VanBerto's =====
// Extraído de dia-crianca.js.
//
// Este módulo é dono do estado gráfico de fundo (nuvens, sol, lua, estrelas,
// camadas de parallax, decorações nas plataformas, halo da porta, confetes de
// fundo). O ficheiro principal só lhe passa o que precisa de fora: `scene`,
// `player`, `door`, `platforms` e `powered`, conforme cada função exige —
// nunca acede diretamente às variáveis gráficas internas deste módulo.
//
// `clouds` e `bgConfetti` são exportados como bindings "ao vivo" (o array é
// partilhado por referência), porque o loop principal de update ainda os
// percorre diretamente para animar a posição de cada nuvem/confete.
//
// `resetDoorGlow(scene)` e `clearPlatformDecor()` substituem o acesso direto
// que o ficheiro principal fazia às variáveis internas `doorGlowGfx` e
// `platDecorGfx`/`platDecorData` ao (re)carregar um nível.

import { THEMES } from "./data-levels.js";

let bgGraphics, farGraphics, hillsGraphics, groundGraphics, decorGraphics;
let platDecorGfx, sunGraphics, moonGraphics, starGraphics, doorGlowGfx;
// Sombra da lua — Image com textura de gradiente radial real (canvas),
// não Graphics. Phaser Graphics só desenha formas de contorno rígido; usar
// vários círculos semi-transparentes empilhados para simular um degradê
// criava anéis visíveis (como um alvo) em vez de uma transição suave. Ver
// ensureMoonShadowTexture()/drawMoon().
let moonShadowImg;
export let bgConfetti = [];
let platDecorData = [];
let footStepTimer = 0;

// Substitui o antigo acesso direto a doorGlowGfx em loadLevel(): destrói o
// halo do nível anterior e cria um novo, já pronto para o updateDoorGlow().
export function resetDoorGlow(scene){
  if(doorGlowGfx) doorGlowGfx.destroy();
  doorGlowGfx = scene.add.graphics().setDepth(1);
  doorGlowGfx._hintShown = false;
}

// Substitui o antigo acesso direto a platDecorData/platDecorGfx em loadLevel()
// ao limpar as decorações do nível anterior antes de montar um novo nível/boss.
export function clearPlatformDecor(){
  platDecorData.forEach(d=>{ if(d.gfx && d.gfx.active) d.gfx.destroy(); });
  platDecorData = [];
  if(platDecorGfx) platDecorGfx.clear();
}

// Substitui o antigo acesso direto a doorGlowGfx no ecrã de vitória, que
// limpava e escondia o halo da porta antes de mostrar o ecrã final.
export function hideDoorGlow(){
  if(doorGlowGfx){ try{ doorGlowGfx.clear(); doorGlowGfx.setVisible(false); }catch{} }
}

// ===== Fundo =====
// Nuvens animadas
export let clouds=[];
export function initBackground(scene){
  bgGraphics    =scene.add.graphics().setDepth(-60).setScrollFactor(0.0);
  farGraphics   =scene.add.graphics().setDepth(-57).setScrollFactor(0.06); // nova camada parallax profunda
  hillsGraphics =scene.add.graphics().setDepth(-50).setScrollFactor(0.25);
  groundGraphics=scene.add.graphics().setDepth(-10).setScrollFactor(1.0);
  decorGraphics =scene.add.graphics().setDepth(-8).setScrollFactor(1.0);
  platDecorGfx  =scene.add.graphics().setDepth(-6).setScrollFactor(1.0);
  sunGraphics   =scene.add.graphics().setDepth(-55).setScrollFactor(0.05);
  moonGraphics  =scene.add.graphics().setDepth(-55).setScrollFactor(0.05);
  starGraphics  =scene.add.graphics().setDepth(-59).setScrollFactor(0.02);
  applyBackground(scene,0,2600,[]);
  drawSun(0);
  spawnClouds(scene,2600);
}

function spawnClouds(scene,worldW){
  clouds.forEach(c=>{if(c.gfx)c.gfx.destroy();});
  clouds=[];
  const count=10+Math.floor(worldW/300);
  const types=["cumulo","cumulo","cumulo","cirro","cirro","coracao","estrela"]; // mais cúmulos
  for(let i=0;i<count;i++){
    const layer=Math.floor(Math.random()*3);
    const scale=[0.35,0.65,1.05][layer]+Math.random()*[0.25,0.35,0.55][layer];
    const alpha=[0.18,0.45,0.75][layer]+Math.random()*[0.18,0.20,0.18][layer];
    const speed=[0.05,0.14,0.28][layer]+Math.random()*[0.08,0.10,0.16][layer];
    const y=[15,25,30][layer]+Math.random()*[60,90,120][layer];
    const sf=[0.12,0.30,0.55][layer];
    const type=types[Math.floor(Math.random()*types.length)];
    const gfx=scene.add.graphics().setDepth(-47+layer).setScrollFactor(sf);
    clouds.push({ gfx, x:Math.random()*worldW, y, speed, scale, alpha, worldW, type });
  }
}

// ── Trail de movimento — removido ────────────────────────────
export function updateTrail(scene){}

// ── Partículas de passo ───────────────────────────────────────
export function updateFootsteps(scene, player, powered){
  if(!player||!player.body) return;
  const onGround=player.body.blocked.down;
  const moving=Math.abs(player.body.velocity.x)>60;
  if(onGround&&moving){
    footStepTimer++;
    if(footStepTimer>=14){
      footStepTimer=0;
      const px=player.x+(player.flipX?12:-12), py=player.y+24;
      const tint=powered?[0xffd700,0xffa040,0xffffff]:[0xa0ff80,0xffffff,0x80d0ff];
      const p=scene.add.particles(0,0,"spark_item",{
        x:px, y:py,
        speed:{min:20,max:60},
        angle:{min:220,max:320},
        lifespan:200,quantity:3,
        scale:{start:0.35,end:0},
        gravityY:200,
        tint
      });
      scene.time.delayedCall(120,()=>p.destroy());
    }
  } else { footStepTimer=0; }
}

// ── Halo pulsante da porta ────────────────────────────────────
export function updateDoorGlow(scene, door, player){
  if(!doorGlowGfx||!door||!player) return;
  doorGlowGfx.clear();
  const dist=Math.abs(player.x-door.x);
  const t=scene.time.now*0.003;
  const pulse=0.55+Math.sin(t*1.4)*0.45;
  const pulse2=0.55+Math.sin(t*2.2+1)*0.45;

  // Rotação dos anéis do portal — sempre visível, mais intenso perto
  const proximity=dist>500 ? 0.25 : 1-dist/500*0.75;
  const rBase=54+pulse*14;
  const rMid=38+pulse2*10;

  // Anel exterior — arco-íris rotativo
  doorGlowGfx.lineStyle(3,0xffd700,proximity*0.5*pulse);
  doorGlowGfx.strokeCircle(door.x,door.y-18,rBase);
  doorGlowGfx.lineStyle(3,0xa060ff,proximity*0.45*pulse2);
  doorGlowGfx.strokeCircle(door.x,door.y-18,rBase+4);

  // Anel médio — laranja
  doorGlowGfx.lineStyle(4,0xff6b35,proximity*0.65*pulse);
  doorGlowGfx.strokeCircle(door.x,door.y-18,rMid);

  // Halo de fundo difuso
  doorGlowGfx.fillStyle(0xa060ff,proximity*0.12*pulse2);
  doorGlowGfx.fillCircle(door.x,door.y-18,rBase+10);
  doorGlowGfx.fillStyle(0xffd700,proximity*0.14*pulse);
  doorGlowGfx.fillCircle(door.x,door.y-18,rMid+6);
  doorGlowGfx.fillStyle(0xffffff,proximity*0.10*pulse2);
  doorGlowGfx.fillCircle(door.x,door.y-18,22);

  // Faíscas orbitais (4 pontos a rodar)
  if(proximity>0.3){
    const orbitR=rBase-6;
    for(let k=0;k<4;k++){
      const a=t*1.8+k*Math.PI/2;
      const sx=door.x+Math.cos(a)*orbitR;
      const sy=(door.y-18)+Math.sin(a)*orbitR*0.55; // elipse
      const sparkAlpha=proximity*pulse*0.85;
      const sparkColors=[0xffd700,0xff6b35,0x80d0ff,0xff80c0];
      doorGlowGfx.fillStyle(sparkColors[k],sparkAlpha);
      doorGlowGfx.fillCircle(sx,sy,4+pulse*2);
    }
  }

  // Texto flutuante quando entra na zona pela primeira vez
  if(dist<320 && !doorGlowGfx._hintShown){
    doorGlowGfx._hintShown=true;
    const hint=scene.add.text(door.x, door.y-100, "✨ Vai ao Portal! ✨", {
      fontSize:"18px", fontStyle:"900", color:"#ffd700",
      stroke:"#200040", strokeThickness:5
    }).setOrigin(0.5).setDepth(20);
    scene.tweens.add({targets:hint, y:door.y-140, alpha:{from:1,to:0},
      duration:1800, ease:"Sine.easeOut", onComplete:()=>hint.destroy()});
  }
}

export function drawCloud(gfx, x, y, sc, alpha, type) {
  gfx.clear();
  if (!type || type === "cumulo") {
    // Nuvem cúmulo clássica — volumosa, com sombra e brilho
    gfx.fillStyle(0x8090b0, alpha * 0.15);
    gfx.fillEllipse(x + 5*sc, y + 9*sc, 84*sc, 22*sc); // sombra
    // Corpo branco-azulado (ligeiramente azul para dar profundidade)
    gfx.fillStyle(0xddeeff, alpha * 0.6);
    gfx.fillEllipse(x,       y,      56*sc, 34*sc);
    gfx.fillEllipse(x+22*sc, y-13*sc,46*sc, 32*sc);
    gfx.fillEllipse(x-19*sc, y-5*sc, 38*sc, 26*sc);
    gfx.fillEllipse(x+42*sc, y-3*sc, 36*sc, 24*sc);
    // Camada branca por cima
    gfx.fillStyle(0xffffff, alpha);
    gfx.fillEllipse(x+2*sc,   y-2*sc, 50*sc, 29*sc);
    gfx.fillEllipse(x+22*sc,  y-15*sc,40*sc, 27*sc);
    gfx.fillEllipse(x-17*sc,  y-6*sc, 32*sc, 22*sc);
    gfx.fillEllipse(x+42*sc,  y-4*sc, 30*sc, 20*sc);
    // Brilho topo
    gfx.fillStyle(0xffffff, alpha * 0.65);
    gfx.fillEllipse(x+8*sc, y-16*sc, 24*sc, 13*sc);
    // Franja escura na base
    gfx.fillStyle(0xc0d0e8, alpha * 0.35);
    gfx.fillEllipse(x+10*sc, y+10*sc, 50*sc, 14*sc);

  } else if (type === "cirro") {
    // Nuvem cirro — fina, alongada, semi-transparente (altitude alta)
    gfx.fillStyle(0xffffff, alpha * 0.45);
    gfx.fillEllipse(x,       y,      90*sc, 12*sc);
    gfx.fillEllipse(x+20*sc, y-4*sc, 60*sc, 8*sc);
    gfx.fillEllipse(x-20*sc, y+2*sc, 50*sc, 7*sc);
    // Filamentos
    gfx.fillStyle(0xffffff, alpha * 0.25);
    gfx.fillEllipse(x+50*sc, y+1*sc, 40*sc, 5*sc);
    gfx.fillEllipse(x-35*sc, y+3*sc, 30*sc, 4*sc);

  } else if (type === "coracao") {
    // Nuvem em forma de coração 🩷 — decorativa
    const cx = x, cy = y;
    const r = 13 * sc;
    gfx.fillStyle(0xffb0c8, alpha * 0.7);
    gfx.fillCircle(cx - r*0.55, cy - r*0.2, r);
    gfx.fillCircle(cx + r*0.55, cy - r*0.2, r);
    // Triângulo base do coração
    gfx.fillTriangle(
      cx - r*1.4, cy - r*0.1,
      cx + r*1.4, cy - r*0.1,
      cx,         cy + r*1.3
    );
    // Brilho
    gfx.fillStyle(0xffd8e8, alpha * 0.55);
    gfx.fillCircle(cx - r*0.3, cy - r*0.5, r * 0.5);

  } else if (type === "estrela") {
    // Nuvem em forma de estrela ⭐ — decorativa
    const cx = x, cy = y;
    const ro = 18 * sc, ri = 8 * sc;
    const pts = 5;
    gfx.fillStyle(0xfff0a0, alpha * 0.80);
    // Desenhar estrela de 5 pontas
    const starPts = [];
    for (let pi = 0; pi < pts * 2; pi++) {
      const angle = (Math.PI / pts) * pi - Math.PI / 2;
      const r = pi % 2 === 0 ? ro : ri;
      starPts.push(cx + Math.cos(angle) * r);
      starPts.push(cy + Math.sin(angle) * r);
    }
    // Phaser Graphics não tem fillPoints nativo fácil; usar fillTriangle a partir do centro
    for (let pi = 0; pi < pts * 2; pi++) {
      const i0 = pi * 2, i1 = ((pi + 1) % (pts * 2)) * 2;
      gfx.fillTriangle(cx, cy, starPts[i0], starPts[i0+1], starPts[i1], starPts[i1+1]);
    }
    // Brilho central
    gfx.fillStyle(0xffffff, alpha * 0.55);
    gfx.fillCircle(cx - ro*0.15, cy - ro*0.18, ro * 0.30);
  }
}

// ── Sol animado ────────────────────────────────────────────────
const SUN_X=160, SUN_Y=72, SUN_R=38;
export function drawSun(angle){
  if(!sunGraphics) return;
  sunGraphics.clear();
  // Halo exterior suave
  sunGraphics.fillStyle(0xffe080,0.10); sunGraphics.fillCircle(SUN_X,SUN_Y,SUN_R+30);
  sunGraphics.fillStyle(0xffe080,0.18); sunGraphics.fillCircle(SUN_X,SUN_Y,SUN_R+22);
  sunGraphics.fillStyle(0xffd700,0.26); sunGraphics.fillCircle(SUN_X,SUN_Y,SUN_R+13);
  // Raios longos (12)
  sunGraphics.lineStyle(3,0xffd700,0.55);
  for(let ri=0;ri<12;ri++){
    const a=angle+Math.PI*2*ri/12;
    sunGraphics.beginPath();
    sunGraphics.moveTo(SUN_X+Math.cos(a)*(SUN_R+15),SUN_Y+Math.sin(a)*(SUN_R+15));
    sunGraphics.lineTo(SUN_X+Math.cos(a)*(SUN_R+30),SUN_Y+Math.sin(a)*(SUN_R+30));
    sunGraphics.strokePath();
  }
  // Raios curtos intercalados
  sunGraphics.lineStyle(2,0xffd700,0.30);
  for(let ri=0;ri<12;ri++){
    const a=angle+Math.PI*2*ri/12+Math.PI/12;
    sunGraphics.beginPath();
    sunGraphics.moveTo(SUN_X+Math.cos(a)*(SUN_R+15),SUN_Y+Math.sin(a)*(SUN_R+15));
    sunGraphics.lineTo(SUN_X+Math.cos(a)*(SUN_R+22),SUN_Y+Math.sin(a)*(SUN_R+22));
    sunGraphics.strokePath();
  }
  // Disco principal
  sunGraphics.fillStyle(0xfff8b0,1); sunGraphics.fillCircle(SUN_X,SUN_Y,SUN_R);
  sunGraphics.fillStyle(0xffd700,1); sunGraphics.fillCircle(SUN_X,SUN_Y,SUN_R-6);
  // Brilho superior esquerdo
  sunGraphics.fillStyle(0xffe040,0.55); sunGraphics.fillCircle(SUN_X-11,SUN_Y-11,SUN_R*0.42);
  sunGraphics.fillStyle(0xffffff,0.22); sunGraphics.fillCircle(SUN_X-14,SUN_Y-14,SUN_R*0.22);
  // ── Face fofa do sol ────────────────────────────────────────
  // Olhos
  sunGraphics.fillStyle(0x7a4000,1);
  sunGraphics.fillCircle(SUN_X-10, SUN_Y-5, 4.5);
  sunGraphics.fillCircle(SUN_X+10, SUN_Y-5, 4.5);
  // Brilho nos olhos
  sunGraphics.fillStyle(0xffffff,0.8);
  sunGraphics.fillCircle(SUN_X-8,  SUN_Y-7, 1.8);
  sunGraphics.fillCircle(SUN_X+12, SUN_Y-7, 1.8);
  // Sorriso (arco)
  sunGraphics.lineStyle(3, 0x7a4000, 1);
  sunGraphics.beginPath();
  sunGraphics.arc(SUN_X, SUN_Y+2, 11, 0.25, Math.PI-0.25);
  sunGraphics.strokePath();
  // Bochechas coradas
  sunGraphics.fillStyle(0xff8060, 0.28);
  sunGraphics.fillCircle(SUN_X-16, SUN_Y+4, 7);
  sunGraphics.fillCircle(SUN_X+16, SUN_Y+4, 7);
}

// ── Estrelas noturnas (temas 4+) ───────────────────────────────
let starSeed = [];
export function drawStars(themeIdx, worldW){
  if(!starGraphics) return;
  starGraphics.clear();
  if(!NIGHT_THEMES.has(themeIdx)) return; // só em temas escuros/noturnos
  // Gerar seed consistente por worldW
  if(starSeed.length===0||starSeed._w!==worldW){
    starSeed=[]; starSeed._w=worldW;
    const count=80+Math.floor(worldW/40);
    for(let i=0;i<count;i++)
      starSeed.push({ x:Math.random()*worldW, y:10+Math.random()*280,
                      r:0.8+Math.random()*1.8, phase:Math.random()*Math.PI*2 });
  }
  const t=Date.now()*0.0008;
  starSeed.forEach(s=>{
    const a=0.4+Math.sin(t+s.phase)*0.35;
    starGraphics.fillStyle(0xffffff,a);
    starGraphics.fillCircle(s.x,s.y,s.r);
  });
}

// Textura do gradiente da sombra — criada uma única vez (cache pelo
// texture manager) e reutilizada em todos os níveis noturnos. Núcleo
// escuro e opaco, a esbater para um tom quente ténue perto da borda
// (sugere luz solar a rasar o rebordo) e depois totalmente transparente.
function ensureMoonShadowTexture(scene){
  if (scene.textures.exists("moon_shadow_grad")) return;
  const size = 220, cx = size/2, cy = size/2, r = size/2 - 2;
  const tex = scene.textures.createCanvas("moon_shadow_grad", size, size);
  const ctx = tex.getContext();
  const grad = ctx.createRadialGradient(cx, cy, r*0.05, cx, cy, r);
  grad.addColorStop(0.00, "rgba(18,10,34,0.97)");
  grad.addColorStop(0.55, "rgba(24,14,44,0.93)");
  grad.addColorStop(0.78, "rgba(50,32,60,0.55)");
  grad.addColorStop(0.92, "rgba(90,60,50,0.22)");
  grad.addColorStop(1.00, "rgba(120,90,60,0)");
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
  tex.refresh();
}

// ── Lua (temas noturnos 4+) ────────────────────────────────────
function drawMoon(scene, themeIdx){
  if(!moonGraphics) return;
  moonGraphics.clear();
  if(!NIGHT_THEMES.has(themeIdx)){ if(moonShadowImg) moonShadowImg.setVisible(false); return; }
  const mx=820, my=74, mr=36; // maior que antes (era 30) — mais presença no céu
  // Halo suave em várias camadas — mais uma camada extra e mais larga do
  // que antes, para dar sensação de luar a espalhar-se pelo céu à volta.
  moonGraphics.fillStyle(0xfffbe0,0.05); moonGraphics.fillCircle(mx,my,mr+40);
  moonGraphics.fillStyle(0xfffbe0,0.09); moonGraphics.fillCircle(mx,my,mr+26);
  moonGraphics.fillStyle(0xfffbe0,0.15); moonGraphics.fillCircle(mx,my,mr+14);
  moonGraphics.fillStyle(0xfffbe0,0.24); moonGraphics.fillCircle(mx,my,mr+6);
  // Disco cheio — duas camadas quase iguais para um degradê muito suave do
  // centro (mais quente) para o rebordo (mais pálido), em vez de uma cor lisa.
  moonGraphics.fillStyle(0xfff3c4,1); moonGraphics.fillCircle(mx,my,mr);
  moonGraphics.fillStyle(0xfffaE0,1); moonGraphics.fillCircle(mx-mr*0.12,my-mr*0.12,mr*0.72);
  // Sombra crescente — REMOVIDA a pedido ("quando é noite prefiro Lua
  // cheia"). O disco fica completo (halo + crateras + brilho, só sem a
  // sombra escura por cima). Mantém-se ensureMoonShadowTexture()/
  // moonShadowImg no ficheiro (não usados) caso se queira repor uma fase
  // da lua no futuro — basta voltar a chamar o bloco original aqui.
  if (moonShadowImg) moonShadowImg.setVisible(false);
  // Crateras na parte visível (esquerda/baixo) — mais uma do que antes,
  // cada uma com sombra + pequeno brilho para dar profundidade em vez de
  // ficarem lisas.
  [[mx-13,my+7,5.5],[mx-22,my-5,3.6],[mx-8,my+19,3.0],[mx-24,my+14,2.2]].forEach(([cx,cy,cr])=>{
    moonGraphics.fillStyle(0xd8c078,0.45); moonGraphics.fillCircle(cx+1,cy+1,cr);
    moonGraphics.fillStyle(0xb89848,0.30); moonGraphics.fillCircle(cx+1.5,cy+1.5,cr-1.2);
    moonGraphics.fillStyle(0xfffdf0,0.35); moonGraphics.fillCircle(cx-1,cy-1,cr*0.35);
  });
  // Brilho topo-esquerdo (especular, "molhado") — um pouco maior.
  moonGraphics.fillStyle(0xffffff,0.5); moonGraphics.fillEllipse(mx-13,my-14,13,8);
  moonGraphics.fillStyle(0xffffff,0.28); moonGraphics.fillEllipse(mx-9,my-9,7,4.5);
  // Pequenas estrelas decorativas à volta da lua — uma extra, tamanhos variados.
  [[mx+52,my-22,2.4],[mx+42,my+30,1.7],[mx-40,my-24,1.5],[mx+64,my+10,2.0],[mx-30,my+30,1.3]].forEach(([sx,sy,sr])=>{
    moonGraphics.fillStyle(0xffffff,0.75); moonGraphics.fillCircle(sx,sy,sr);
    moonGraphics.fillStyle(0xffffff,0.35); moonGraphics.fillCircle(sx,sy,sr+2.2);
  });
}

// ── Camada parallax profunda: edifícios em todos os níveis ──────
function drawFarLayer(themeIdx, worldW){
  if(!farGraphics) return;
  farGraphics.clear();
  // Paletas de cor dos edifícios por tema (20 — uma por nível)
  const BUILD_PALETTES = [
    { walls:[0x1a3060,0x0a2050,0x162848,0x0e1e3a], wins:[0xffd700,0x80d0ff,0xffe880,0xff8040] }, //  0 azul rico
    { walls:[0x5a2800,0x3a1800,0x6a3010,0x2e1200], wins:[0xffd700,0xffe880,0xff8040,0xffc060] }, //  1 crepúsculo
    { walls:[0x005040,0x003830,0x006858,0x002e28], wins:[0x80ffe0,0x40d4b8,0xffd700,0xb0fff0] }, //  2 aqua
    { walls:[0x5a1030,0x3e0820,0x6e1840,0x2e0818], wins:[0xff80c0,0xffd700,0xffb0d0,0xff6090] }, //  3 rosa
    { walls:[0x1a0840,0x0a1a40,0x200830,0x0a2040], wins:[0xffd700,0xffe880,0x80d0ff,0xff8040] }, //  4 lilás noturno
    { walls:[0x103820,0x082810,0x185030,0x062010], wins:[0xa0ffb0,0x40c060,0xffd700,0x80ff90] }, //  5 turquesa
    { walls:[0x5a1800,0x401000,0x682000,0x300c00], wins:[0xffa060,0xffd700,0xff8040,0xffb880] }, //  6 laranja
    { walls:[0x083060,0x042048,0x0c3870,0x021838], wins:[0x80d0ff,0x2898e0,0xffd700,0xb0e8ff] }, //  7 azul noturno
    { walls:[0x500828,0x380518,0x601030,0x280410], wins:[0xffa0c8,0xffd700,0xff80c0,0xffc8de] }, //  8 magenta
    { walls:[0x104020,0x082e10,0x185028,0x061c08], wins:[0xb0ff80,0x30a050,0xffd700,0xd0ffb0] }, //  9 floresta
    { walls:[0x1e4000,0x103000,0x286000,0x0a2800], wins:[0xc0ff40,0x80e000,0xffd700,0xa0f030] }, // 10 verde lima
    { walls:[0x7a3a00,0x5a2a00,0x8a4a10,0x3e1c00], wins:[0xffd700,0xfff0a0,0xff9040,0xffe880] }, // 11 âmbar
    { walls:[0x002050,0x001030,0x003070,0x001828], wins:[0x60d0ff,0x2080e0,0xffd700,0xa0e0ff] }, // 12 oceano
    { walls:[0x3a0060,0x280040,0x500080,0x180030], wins:[0xe080ff,0xffd700,0xc040ff,0xf0b0ff] }, // 13 violeta
    { walls:[0x003830,0x002820,0x005040,0x001e18], wins:[0x40ffe0,0x00d0b0,0xffd700,0x80fff0] }, // 14 teal
    { walls:[0x600010,0x440008,0x780018,0x300008], wins:[0xff8080,0xffd700,0xff4040,0xffb0b0] }, // 15 escarlate
    { walls:[0x003060,0x002048,0x004080,0x001838], wins:[0x80d8ff,0x2898e0,0xffd700,0xb0e8ff] }, // 16 azul céu
    { walls:[0x1a0838,0x0e0428,0x260c50,0x080218], wins:[0xd080ff,0xffd700,0xa040e0,0xf0c0ff] }, // 17 índigo
    { walls:[0x003818,0x002410,0x005228,0x001808], wins:[0x60ff90,0x20d060,0xffd700,0xa0ffb0] }, // 18 verde floresta
    { walls:[0x7a3a00,0x5a2a00,0x8a4a10,0x3e1c00], wins:[0xffd700,0xfff0a0,0xff9040,0xffe880] }, // 19 final dourado
  ];
  const palette = BUILD_PALETTES[themeIdx % BUILD_PALETTES.length];
  const buildColors = palette.walls;
  const winColors   = palette.wins;
  const step=90;
  const groundBase=520;
  for(let i=0;i<Math.ceil(worldW/step)+2;i++){
    const bx=i*step+(i%3)*18;
    const bh=60+((i*37)%80);
    const bw=44+((i*23)%30);
    farGraphics.fillStyle(buildColors[i%buildColors.length],0.75);
    farGraphics.fillRect(bx,groundBase-bh,bw,bh);
    // Janelas iluminadas
    const wc=winColors[i%winColors.length];
    for(let wy=groundBase-bh+8;wy<groundBase-8;wy+=14){
      for(let wx=bx+6;wx<bx+bw-8;wx+=12){
        if(Math.abs(Math.sin(i*7+wy+wx))>0.3){
          farGraphics.fillStyle(wc,0.50+Math.abs(Math.sin(i+wy*0.1))*0.35);
          farGraphics.fillRect(wx,wy,7,8);
        }
      }
    }
    // Contorno topo
    farGraphics.fillStyle(0xffffff,0.07);
    farGraphics.fillRect(bx,groundBase-bh,bw,2);
  }
}

// ── Confetes de fundo nos últimos níveis (7+) ─────────────────
function spawnBgConfetti(scene, themeIdx, worldW){
  bgConfetti.forEach(c=>{if(c.gfx)c.gfx.destroy();});
  bgConfetti=[];
  if(themeIdx < 7) return; // só nos últimos 3 níveis
  const emojis=["🎈","🌟","✨","🎊","⭐"];
  const count=18+Math.floor(worldW/200);
  for(let i=0;i<count;i++){
    const gfx=scene.add.text(
      Math.random()*worldW,
      50+Math.random()*380,
      emojis[i%emojis.length],
      {fontSize:"16px"}
    ).setDepth(-45).setScrollFactor(0.08).setAlpha(0.18+Math.random()*0.14);
    bgConfetti.push({gfx, baseY:parseFloat(gfx.y), speed:0.15+Math.random()*0.25, phase:Math.random()*Math.PI*2});
  }
}


// ── Cartazes pedagógicos no fundo ────────────────────────────
// Cada nível pode ter um QUIZ_TIPS[quizTheme] associado.
// Criamos 2-3 cartazes a diferentes alturas ao longo do nível,
// com a dica-chave, para a criança chegar à porta "quente".
let levelPosters = [];
function spawnLevelPosters(scene, L){
  levelPosters.forEach(p=>{ if(p&&p.active) p.destroy(); });
  levelPosters = [];
  const theme = L.quizTheme || "historia";
  const tip   = QUIZ_TIPS[theme] || "";
  if (!tip) return;

  // Posições distribuídas ao longo do nível (evita spawn e porta)
  const worldW  = L.worldW || 2600;
  const doorX   = L.doorX  || worldW - 200;
  const spawnX  = L.spawn?.x || 120;
  const gap     = (doorX - spawnX - 200) / 3;
  const posX    = [spawnX + 140, spawnX + gap + 200, spawnX + gap * 2 + 160];
  const posY    = [360, 300, 360]; // alturas variadas, sempre acima do chão

  // Quebrar o tip em linhas de ~26 chars
  function wrapText(str, maxLen) {
    const words = str.split(" "); const lines = []; let cur = "";
    words.forEach(w => {
      if ((cur + " " + w).trim().length > maxLen) { lines.push(cur.trim()); cur = w; }
      else cur = (cur + " " + w).trim();
    });
    if (cur) lines.push(cur.trim());
    return lines;
  }
  const lines = wrapText(tip, 28);

  posX.forEach((px, i) => {
    const py = posY[i % posY.length];
    const w  = 200, lh = 16;
    const h  = 14 + lines.length * lh + 8;

    // Poste
    const gfx = scene.add.graphics().setDepth(-4).setScrollFactor(1.0);
    gfx.fillStyle(0x7a4a20, 0.90);
    gfx.fillRect(px - 4, py + h * 0.5, 8, 510 - py - h * 0.5);

    // Fundo do cartaz
    gfx.fillStyle(0x1a0440, 0.82);
    gfx.fillRoundedRect(px - w/2, py - h/2, w, h, 8);
    // Borda colorida
    const borderColors = [0xff6b35, 0xffd700, 0x80d0ff, 0xa0ff80];
    gfx.lineStyle(2, borderColors[i % borderColors.length], 0.90);
    gfx.strokeRoundedRect(px - w/2, py - h/2, w, h, 8);
    // Ícone de lâmpada no topo
    const icon = scene.add.text(px, py - h/2 - 10, "💡",
      { fontSize:"14px" }).setOrigin(0.5, 0.5).setDepth(-3).setScrollFactor(1.0).setAlpha(0.88);

    // Texto das linhas
    const textObjs = lines.map((line, li) => {
      const isFirst = li === 0;
      return scene.add.text(px, py - h/2 + 10 + li * lh, line, {
        fontSize: isFirst ? "11px" : "10px",
        fontStyle: isFirst ? "700" : "400",
        color: "#fff0d0",
        stroke: "#000020", strokeThickness: 2,
        wordWrap: { width: w - 14 }
      }).setOrigin(0.5, 0).setDepth(-3).setScrollFactor(1.0).setAlpha(0.92);
    });

    // Pulsar suave no ícone
    scene.tweens.add({ targets: icon, y: icon.y - 4, alpha: { from:0.88, to:1 },
      duration: 1100, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    levelPosters.push(gfx, icon, ...textObjs);
  });
}

function clearLevelPosters(){
  levelPosters.forEach(p=>{ if(p&&p.active) p.destroy(); });
  levelPosters = [];
}

// ── Decorações animadas nas plataformas ───────────────────────
export function spawnPlatformDecor(scene, platforms){
  platDecorData.forEach(d=>{if(d.gfx&&d.gfx.active)d.gfx.destroy();});
  platDecorData=[];
  if(!platDecorGfx) return;
  const nodeColors=[0xff6b35,0xffd700,0xff80c0,0x80d0ff,0xa0ff80,0xffffff,0xc080ff];
  platforms.getChildren().forEach((plat,pi)=>{
    if(!plat.body) return;
    const pw=plat.displayWidth, px=plat.body.left, py=plat.body.top;
    // Nos de sinal (pequenas luzes tipo sensor/LED): 1 por cada 80px de plataforma
    const numNodes=Math.max(1,Math.floor(pw/80));
    for(let fi=0;fi<numNodes;fi++){
      const fx=px+30+fi*(pw-60)/Math.max(1,numNodes-1);
      const fc=nodeColors[(pi*3+fi)%nodeColors.length];
      platDecorData.push({type:"node", x:fx, y:py-4, color:fc, phase:Math.random()*Math.PI*2, gfx:null});
    }
    // Sinal de dados a flutuar: 1 por cada 3 plataformas
    if(pi%3===0 && pw>100){
      const bx=px+pw*0.6;
      platDecorData.push({type:"signal", x:bx, y:py-12, color:nodeColors[pi%nodeColors.length], phase:Math.random()*Math.PI*2, gfx:null});
    }
  });
}

export function updatePlatformDecor(scene){
  if(!platDecorGfx||platDecorData.length===0) return;
  platDecorGfx.clear();
  const t=scene.time.now*0.001;
  platDecorData.forEach(d=>{
    const sway=Math.sin(t*1.4+d.phase)*2.5; // balanco suave
    if(d.type==="node"){
      const fy=d.y+sway*0.3;
      // Pequena antena/haste
      platDecorGfx.lineStyle(1.2,0x60a0c0,0.65);
      platDecorGfx.beginPath(); platDecorGfx.moveTo(d.x,fy+6); platDecorGfx.lineTo(d.x+sway*0.5,fy-2); platDecorGfx.strokePath();
      // Halo pulsante da luz
      const pulse=0.55+Math.sin(t*3+d.phase)*0.25;
      platDecorGfx.fillStyle(d.color,0.25*pulse);
      platDecorGfx.fillCircle(d.x+sway*0.5,fy-4,7);
      // Luz/no central
      platDecorGfx.fillStyle(d.color,0.85);
      platDecorGfx.fillCircle(d.x+sway*0.5,fy-4,3);
      platDecorGfx.fillStyle(0xffffff,0.9);
      platDecorGfx.fillCircle(d.x+sway*0.5-0.8,fy-4.8,1.1);
    } else if(d.type==="signal"){
      const flutter=Math.sin(t*3+d.phase)*0.5;
      const bx=d.x+Math.sin(t*0.8+d.phase)*18; // deriva horizontal
      const by=d.y+Math.sin(t*0.5+d.phase)*8;
      // Ondas de sinal concentricas (tipo wifi/bluetooth a "ping")
      platDecorGfx.lineStyle(1.4,d.color,0.55+flutter*0.2);
      platDecorGfx.beginPath(); platDecorGfx.arc(bx,by,4,Math.PI*1.15,Math.PI*1.85); platDecorGfx.strokePath();
      platDecorGfx.lineStyle(1.4,d.color,0.40+flutter*0.15);
      platDecorGfx.beginPath(); platDecorGfx.arc(bx,by,7.5,Math.PI*1.15,Math.PI*1.85); platDecorGfx.strokePath();
      platDecorGfx.lineStyle(1.2,d.color,0.28+flutter*0.1);
      platDecorGfx.beginPath(); platDecorGfx.arc(bx,by,11,Math.PI*1.15,Math.PI*1.85); platDecorGfx.strokePath();
      // Pontinho de origem do sinal
      platDecorGfx.fillStyle(d.color,0.9);
      platDecorGfx.fillCircle(bx,by,2.2);
    }
  });
}

// Temas "noturnos" — céu escuro (lua + estrelas + aurora boreal)
// tema 4  → Nível  5 (lilás noturno)
// tema 6  → Nível  7 (azul noturno profundo)
// tema 7  → Nível  8 (magenta)
// tema 11 → Nível 12 (azul oceano)
// tema 12 → Nível 13 (violeta mágico)
// tema 13 → Nível 14 (teal escuro)
// tema 16 → Nível 17 (índigo cósmico)
// tema 17 → Nível 18 (verde floresta)
// tema 18 → Nível 19 (vermelho escarlate)
// Temas noturnos (luar/estrelas) — agora alinhados com os mundos que na
// arte do mapa já são noturnos: Fortaleza da Proteção Digital e Cidade da
// Identidade Digital. Exceção: o nível 20 (tema 19) é o final festivo e
// fica de propósito fora da família noturna do seu mundo.
export const NIGHT_THEMES = new Set([6,7,10,11,12,13,14,15,17,18]);

let worldBgImage = null; // imagem fixa (não faz scroll) do mundo atual, por trás de tudo

export function applyBackground(scene,themeIdx,worldW,hazardDefs=[],bgImageKey=null){
  const T=THEMES[themeIdx]||THEMES[0];
  const isNight = NIGHT_THEMES.has(themeIdx);

  // ── ILUSTRAÇÃO DO MUNDO — camada fixa mais ao fundo de todas ──
  // É a mesma arte usada no mapa; aqui funciona como o "céu/vista distante"
  // do nível — as colinas/árvores/casas processuais continuam por cima,
  // exatamente como antes, a dar textura de jogo ao primeiro plano.
  if (bgImageKey && scene.textures.exists(bgImageKey)) {
    if (!worldBgImage || worldBgImage.scene !== scene) {
      if (worldBgImage) worldBgImage.destroy();
      worldBgImage = scene.add.image(480, 270, bgImageKey)
        .setDepth(-61).setScrollFactor(0);
    }
    if (worldBgImage.texture.key !== bgImageKey) worldBgImage.setTexture(bgImageKey);
    // "cover" 960×540 mantendo a proporção da imagem (1280×720 = mesma 16:9,
    // mas o setDisplaySize cobre bem qualquer ligeira diferença de rácio)
    worldBgImage.setDisplaySize(960, 540);
    worldBgImage.setVisible(true);
  } else if (worldBgImage) {
    worldBgImage.setVisible(false);
  }

  const showImage = !!(worldBgImage && worldBgImage.visible);

  // ── CÉU com gradiente triplo mais rico ────────────────────────
  bgGraphics.clear();
  // Camada base — gradiente superior/inferior (some quando há ilustração
  // do mundo por trás; os raios de luz / aurora acima dela mantêm-se)
  if (!showImage) {
    bgGraphics.fillGradientStyle(T.skyTop,T.skyTop,T.skyBot,T.skyBot,1);
    bgGraphics.fillRect(0,0,worldW,540);

    // Faixa de horizonte — tom mais quente/suave no meio
    const horizColor = isNight ? 0x1a0840 : 0xfff0a0;
    bgGraphics.fillStyle(horizColor, isNight ? 0.26 : 0.30);
    bgGraphics.fillRect(0, 300, worldW, 150);
  }

  // Raios de luz / aurora — escondidos quando há ilustração do mundo: a
  // imagem já tem o seu próprio sol/lua pintado numa posição diferente da
  // constante SUN_X/SUN_Y, por isso os raios ficavam a sair do "nada".
  if (!showImage) {
  if (!isNight) {
    // ── RAIOS DE LUZ (god rays) — só temas diurnos ──────────────
    const rayColors = [0xffffff, 0xffe8a0, 0xffd070];
    const numRays = 7;
    for (let ri = 0; ri < numRays; ri++) {
      const rx = SUN_X + (ri - numRays/2) * 38;
      const spread = 180 + ri * 40;
      bgGraphics.fillStyle(rayColors[ri % rayColors.length], 0.025 + (ri%3)*0.010);
      // Triângulo fino do sol até ao chão
      bgGraphics.fillTriangle(SUN_X, SUN_Y, rx - spread*0.5, 540, rx + spread*0.5, 540);
    }
    // Reflexo de luz no chão (halo laranja-amarelo)
    bgGraphics.fillStyle(0xffd070, 0.08);
    bgGraphics.fillEllipse(SUN_X, 490, 400, 80);
  } else {
    // ── AURORA BOREAL — temas noturnos ───────────────────────────
    const auroraColors = [
      [0x00ff80, 0x0080ff],  // índigo-cósmico (tema 4 — lilás)
      [0x00c8ff, 0x0040ff],  // azul noturno vivo (tema 7)
      [0xff40c0, 0x8000ff],  // magenta (tema 8)
      [0x40ff80, 0x00c0ff],  // floresta verde (tema 9)
      [0x00ffcc, 0x4040ff],  // oceano profundo (tema 12)
      [0xc040ff, 0x8000ff],  // violeta mágico (tema 13)
      [0xa040ff, 0x0040e0],  // índigo cósmico (tema 17)
      [0x40ff80, 0x00a040],  // verde floresta brilhante (tema 18)
    ];
    const nightList = [...NIGHT_THEMES].sort((a,b)=>a-b);
    const nightPos  = nightList.indexOf(themeIdx);
    const ac = auroraColors[nightPos % auroraColors.length];
    const auroraCount = 5;
    for (let ai = 0; ai < auroraCount; ai++) {
      const ax = worldW * (0.1 + ai * 0.18);
      const aw = 120 + ai * 60;
      const ah = 80 + ai * 30;
      const alpha = 0.06 + (ai % 3) * 0.03;
      // Faixa vertical ondulada (simulada com elipses inclinadas)
      bgGraphics.fillStyle(ac[ai % 2], alpha);
      bgGraphics.fillEllipse(ax, 180 + ai * 20, aw * 0.35, ah);
      bgGraphics.fillStyle(ac[(ai+1) % 2], alpha * 0.6);
      bgGraphics.fillEllipse(ax + aw * 0.15, 160 + ai * 15, aw * 0.25, ah * 0.7);
    }
  }
  } // fim if (!showImage) — raios/aurora

  // ── CAMADA PARALLAX PROFUNDA (edifícios) ──────────────────────
  // Removida por pedido — um "horizonte de prédios" genérico aparecia
  // sempre, mesmo em níveis/mundos onde não fazia sentido nenhum
  // (ex.: o campo do Reino dos Fundamentos). farGraphics fica sempre
  // limpa; drawFarLayer() continua definida caso volte a fazer falta.
  if (farGraphics) farGraphics.clear();

  // ── LUA (temas noturnos) — idem, a ilustração já tem a sua própria
  if (!showImage) drawMoon(scene, themeIdx);

  // ── SOL — desenhado em sunGraphics (animado no update) ────────
  // Escondido em temas noturnos E sempre que há ilustração do mundo
  // (que já traz o seu próprio sol/lua pintado).
  if(sunGraphics) sunGraphics.setAlpha((showImage || NIGHT_THEMES.has(themeIdx)) ? 0 : 1);

  // ── ESTRELAS (temas noturnos, redesenhadas no update) ─────────
  starSeed=[]; // forçar reseed
  drawStars(themeIdx, worldW);

  // ── COLINAS, ÁRVORES E CASINHAS ────────────────────────────────
  // Escondidas quando há ilustração do mundo — já vêm com colinas, árvores
  // e casas bem mais detalhadas do que estas siluetas processuais, que só
  // ficavam a "amarrotar" por cima da imagem (testado: fica com um véu
  // esverdeado turvo em cima da relva já pintada).
  hillsGraphics.clear();
  if (!showImage) {
  // Colinas traseiras — tom derivado do tema (não sempre verde)
  const backHillColor = isNight
    ? Phaser.Display.Color.IntegerToColor(T.skyTop).darken(10).color
    : Phaser.Display.Color.IntegerToColor(T.hillColor).lighten(25).color;
  hillsGraphics.fillStyle(backHillColor, isNight ? 0.22 : 0.18);
  for(let i=0;i<Math.ceil(worldW/340)+1;i++)
    hillsGraphics.fillEllipse(i*340+170+(i%2)*40,445,400,200);
  // Colinas da frente — scrollFactor médio
  hillsGraphics.fillStyle(T.hillColor,0.48);
  for(let i=0;i<Math.ceil(worldW/260)+1;i++)
    hillsGraphics.fillEllipse(i*260+130+(i%3)*30,462,320,170);

  // ── ÁRVORES ────────────────────────────────────────────────────
  // Posições alternadas com as casas para não sobrepor
  const treeColors=[0x2d8a40,0x3aaa50,0x228830,0x44cc55];
  // Árvores nos intervalos entre casas: 160, 500, 820, 1220, 1580, 1940, 2280, 2620…
  const treePositions=[];
  for(let i=0;i<Math.ceil(worldW/220);i++)
    treePositions.push(160+i*220+(i%2)*30);

  treePositions.filter(tx=>tx<worldW-40).forEach((tx,ti)=>{
    const tc  = treeColors[ti%treeColors.length];
    const tcL = treeColors[(ti+1)%treeColors.length]; // camada mais clara
    const base= 510;          // Y do chão
    const th  = 60+((ti*41)%30); // altura total 60-90 px
    const tw  = 24+((ti*17)%10); // meia-largura base 24-34

    // 1. Tronco — desenhado primeiro (fica atrás da copa)
    const trunkW=8, trunkH=Math.round(th*0.28);
    hillsGraphics.fillStyle(0x7a4a20,1);
    hillsGraphics.fillRect(tx-trunkW/2, base-trunkH, trunkW, trunkH);
    // Sombra lateral do tronco
    hillsGraphics.fillStyle(0x4a2a08,0.5);
    hillsGraphics.fillRect(tx+trunkW/2-3, base-trunkH, 3, trunkH);

    // Base do tronco onde encontra o chão
    hillsGraphics.fillStyle(0x5a3010,0.6);
    hillsGraphics.fillEllipse(tx, base, trunkW+6, 5);

    // 2. Copa — 3 triângulos sobrepostos, de baixo para cima
    // Camada 1 — base (mais larga, mais escura)
    const y1b = base - trunkH + 4;  // topo desta camada
    const y1t = base - trunkH - Math.round(th*0.28);
    hillsGraphics.fillStyle(tc, 0.9);
    hillsGraphics.fillTriangle(tx-tw, y1b, tx+tw, y1b, tx, y1t);

    // Camada 2 — meio (média largura)
    const y2b = y1t + Math.round(th*0.10);
    const y2t = y2b - Math.round(th*0.28);
    hillsGraphics.fillStyle(tcL, 0.85);
    hillsGraphics.fillTriangle(tx-tw*0.78, y2b, tx+tw*0.78, y2b, tx, y2t);

    // Camada 3 — topo (mais estreita, mais clara)
    const y3b = y2t + Math.round(th*0.10);
    const y3t = y3b - Math.round(th*0.26);
    hillsGraphics.fillStyle(0x44dd66, 0.9);
    hillsGraphics.fillTriangle(tx-tw*0.52, y3b, tx+tw*0.52, y3b, tx, y3t);

    // Brilho no topo da copa
    hillsGraphics.fillStyle(0xaaffaa, 0.30);
    hillsGraphics.fillEllipse(tx-4, y3t+6, 12, 8);
  });

  // ── CASINHAS ──────────────────────────────────────────────────
  const houseColors=[0xf4a090,0x90c0f0,0xf5d080,0xa8d8a0,0xd0a8f0];
  const roofColors =[0xb02020,0x1a6ab0,0xc07800,0x2a8040,0x7020b0];
  const houseX=[340,680,1050,1420,1780,2120,2460];
  houseX.filter(hx=>hx<worldW-80).forEach((hx,hi)=>{
    const hc  = houseColors[hi%houseColors.length];
    const rc  = roofColors[hi%roofColors.length];
    const hw  = 48;           // largura parede
    const hh  = 36;           // altura parede
    const base= 510;          // Y do chão
    const hy  = base - hh;    // Y topo da parede
    const cx  = hx + hw/2;    // centro horizontal

    // --- Sombra no chão ---
    hillsGraphics.fillStyle(0x000000,0.10);
    hillsGraphics.fillEllipse(cx, base+2, hw+8, 6);

    // --- CHAMINÉ — desenhada ANTES do telhado para ficar por baixo ---
    const chimX = cx + 10;
    const chimTop = hy - 22;   // topo visível da chaminé (acima do telhado)
    const chimBot = hy - 4;    // base (enterrada no telhado)
    hillsGraphics.fillStyle(0x9a7055,1);
    hillsGraphics.fillRect(chimX-4, chimTop, 9, chimBot-chimTop);
    // Topo da chaminé (chapéu)
    hillsGraphics.fillStyle(0x6a4a28,1);
    hillsGraphics.fillRect(chimX-6, chimTop-3, 13, 4);

    // --- TELHADO (triângulo) ---
    const roofPeak = hy - 22;  // pico do telhado, mesmo nível do topo visível da chaminé
    hillsGraphics.fillStyle(rc, 1);
    hillsGraphics.fillTriangle(hx-4, hy, hx+hw+4, hy, cx, roofPeak);
    // Face escura (sombra lado esquerdo)
    hillsGraphics.fillStyle(0x000000,0.18);
    hillsGraphics.fillTriangle(cx, roofPeak, hx-4, hy, cx, hy);
    // Beirado (linha branca fina no fundo do telhado)
    hillsGraphics.fillStyle(0xffffff,0.25);
    hillsGraphics.fillRect(hx-4, hy-2, hw+8, 3);

    // --- PAREDE ---
    hillsGraphics.fillStyle(hc, 1);
    hillsGraphics.fillRect(hx, hy, hw, hh);
    // Sombra lateral direita
    hillsGraphics.fillStyle(0x000000,0.08);
    hillsGraphics.fillRect(hx+hw-5, hy, 5, hh);

    // --- JANELAS (2) ---
    const winY = hy + 7;
    [[hx+6, winY],[hx+hw-17, winY]].forEach(([wx,wy])=>{
      // Moldura
      hillsGraphics.fillStyle(0xffffff,0.6);
      hillsGraphics.fillRect(wx-1,wy-1,13,12);
      // Vidro
      hillsGraphics.fillStyle(0xc8eaff,0.9);
      hillsGraphics.fillRect(wx,wy,12,11);
      // Cruz da janela
      hillsGraphics.fillStyle(0xffffff,0.7);
      hillsGraphics.fillRect(wx,wy+4,12,2);
      hillsGraphics.fillRect(wx+5,wy,2,11);
      // Reflexo
      hillsGraphics.fillStyle(0xffffff,0.35);
      hillsGraphics.fillRect(wx+1,wy+1,4,4);
    });

    // --- PORTA ---
    const doorW=12, doorH=18;
    const doorX=cx-doorW/2, doorY=base-doorH;
    // Moldura
    hillsGraphics.fillStyle(0x5a3010,1);
    hillsGraphics.fillRect(doorX-1,doorY-1,doorW+2,doorH+1);
    // Porta
    hillsGraphics.fillStyle(0x8b5a2a,1);
    hillsGraphics.fillRect(doorX,doorY,doorW,doorH);
    // Arco
    hillsGraphics.fillStyle(0x8b5a2a,1);
    hillsGraphics.fillEllipse(cx,doorY,doorW,8);
    hillsGraphics.fillStyle(0x5a3010,0.4);
    hillsGraphics.fillEllipse(cx,doorY,doorW+2,8);
    // Maçaneta
    hillsGraphics.fillStyle(0xffd700,1);
    hillsGraphics.fillCircle(doorX+doorW-3,doorY+doorH/2,2);
  });
  } // fim if (!showImage) — colinas/árvores/casinhas

  // ── CHÃO com relva temática ────────────────────────────────────
  groundGraphics.clear();
  // Cor da relva adaptada ao tema
  const grassMain = T.grassTop || 0x3aaa50;
  const grassLight = Phaser.Display.Color.IntegerToColor(grassMain);
  // Helper: verifica se uma posição X está dentro de uma zona de hazard
  const inHazard = (x, margin=0) => hazardDefs.some(h => {
    const half = h.w / 2;
    return x >= h.x - half - margin && x <= h.x + half + margin;
  });
  // Camada de terra — comum a tudo (a lava fica por cima nas zonas de perigo)
  groundGraphics.fillStyle(isNight ? 0x180830 : 0x6b3a1f, 1);
  groundGraphics.fillRect(0,518,worldW,22);
  // Faixa de relva — apenas nas zonas sem hazard
  groundGraphics.fillStyle(grassMain, 1);
  if (!hazardDefs.length) {
    groundGraphics.fillRect(0,510,worldW,12);
  } else {
    // Desenhar relva em segmentos, pulando as zonas de lava
    let sx = 0;
    while (sx < worldW) {
      if (!inHazard(sx + 7)) {
        // encontrar fim do segmento seguro
        let ex = sx;
        while (ex < worldW && !inHazard(ex + 7)) ex += 7;
        groundGraphics.fillRect(sx,510,ex-sx,12);
        sx = ex;
      } else {
        sx += 7;
      }
    }
  }
  // Relva detalhada — tufos triangulares apenas onde não há lava
  const grassHighlight = Phaser.Display.Color.IntegerToColor(grassMain);
  groundGraphics.fillStyle(
    Phaser.Display.Color.GetColor(
      Math.min(255, grassHighlight.r + 30),
      Math.min(255, grassHighlight.g + 30),
      Math.min(255, grassHighlight.b + 20)
    ), 0.85
  );
  for(let gi=0;gi<Math.floor(worldW/14);gi++){
    const gx=gi*14+(gi%3)*2;
    if(inHazard(gx+3, 4)) continue; // pular tufos sobre lava
    groundGraphics.fillTriangle(gx,510, gx+7,510, gx+3,500);
    if(gi%2===0) groundGraphics.fillTriangle(gx+4,510,gx+10,510,gx+7,503);
  }
  // Linha de brilho topo relva — apenas fora das zonas de lava
  groundGraphics.fillStyle(isNight ? 0x8080ff : 0x80ff90, isNight ? 0.18 : 0.32);
  if (!hazardDefs.length) {
    groundGraphics.fillRect(0,510,worldW,3);
  } else {
    let sx2 = 0;
    while (sx2 < worldW) {
      if (!inHazard(sx2 + 4)) {
        let ex2 = sx2;
        while (ex2 < worldW && !inHazard(ex2 + 4)) ex2 += 4;
        groundGraphics.fillRect(sx2,510,ex2-sx2,3);
        sx2 = ex2;
      } else {
        sx2 += 4;
      }
    }
  }
  // Linha sombra base
  groundGraphics.fillStyle(0x000000,0.14);
  groundGraphics.fillRect(0,536,worldW,4);
  // Pedra escura nas zonas de hazard — substitui visualmente a relva por chão de rocha calcinada
  if (hazardDefs.length) {
    hazardDefs.forEach(h => {
      const half = h.w / 2;
      // Base de rocha escura
      groundGraphics.fillStyle(0x2a1a0a, 1);
      groundGraphics.fillRect(h.x - half, 510, h.w, 30);
      // Crachas/fissuras na pedra
      groundGraphics.fillStyle(0x1a0a00, 0.9);
      for(let ci=0; ci<Math.floor(h.w/18); ci++){
        const cx = h.x - half + 6 + ci*18 + (ci%3)*3;
        groundGraphics.fillRect(cx, 512, 2, 6 + (ci%3)*3);
        groundGraphics.fillRect(cx+5, 515, 1, 4);
      }
      // Borda superior avermelhada (calor da lava)
      groundGraphics.fillStyle(0x8b2200, 0.85);
      groundGraphics.fillRect(h.x - half, 510, h.w, 4);
      // Pontos de brasa incandescente
      groundGraphics.fillStyle(0xff4400, 0.6);
      for(let bi=0; bi<Math.floor(h.w/22); bi++){
        const bx = h.x - half + 8 + bi*22 + (bi%4)*3;
        groundGraphics.fillCircle(bx, 511, 2);
      }
    });
  }

  // ── FLORES no chão ─────────────────────────────────────────────
  decorGraphics.clear();
  const fc=[0xff6b35,0xffd700,0xff80c0,0x80d0ff,0xa0ff80,0xffffff];
  for(let fi=0;fi<Math.floor(worldW/38);fi++){
    const fx=18+fi*38+(fi%4)*5, fy=507+(fi%2)*2;
    if(inHazard(fx, 8)) continue; // não colocar flores sobre zonas de lava/ácido/abismo
    const cc=fc[fi%fc.length];
    // Pétalas
    decorGraphics.fillStyle(cc,0.85);
    decorGraphics.fillCircle(fx,fy-3,4);
    decorGraphics.fillCircle(fx+3,fy,4);
    decorGraphics.fillCircle(fx-3,fy,4);
    decorGraphics.fillCircle(fx,fy+3,4);
    // Centro amarelo
    decorGraphics.fillStyle(0xffd700,1);
    decorGraphics.fillCircle(fx,fy,2.5);
  }

  // Respawnar nuvens com nova worldW
  if(clouds.length>0) spawnClouds(scene,worldW);

  // Confetes de fundo (últimos níveis)
  spawnBgConfetti(scene, themeIdx, worldW);
}
