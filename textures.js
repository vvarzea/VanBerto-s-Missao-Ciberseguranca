// ===== Geração de texturas Phaser/canvas — VanBerto's =====
// Extraído de dia-crianca.js. Ficheiro 100% autocontido: cada função só
// depende do parâmetro `scene` (instância Phaser) e de constantes locais.
// Não lê nem escreve nenhum estado partilhado do jogo (score, player, etc.).
// Só makeTextures() e makePlatformTextureThemed() são chamadas a partir de
// dia-crianca.js — as restantes (makePlatformTexture, makeDoorTexture,
// makeVilaosTextures, makeBossTextures, makeSparkTexture, makeItemTextures,
// makeVanBertoTexture, rrPath, rrVan, cVan, cfVan, lVan) são de uso interno
// deste módulo, por isso não são exportadas.

// ===== TEXTURAS =====

function rrPath(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
  ctx.closePath();
}
export function makeTextures(scene){
  makePlatformTexture(scene);
  makeDoorTexture(scene);
  makeVilaosTextures(scene);
  makeBossTextures(scene);
  makeSparkTexture(scene);
  makeItemTextures(scene);
  makeVanBertoTexture(scene,"vanberto_open",false,-1);
  makeVanBertoTexture(scene,"vanberto_blink",true,-1);
  makeVanBertoTexture(scene,"vanberto_wink","wink",-1);
  makeVanBertoTexture(scene,"vanberto_happy","happy",-1);
  makeVanBertoTexture(scene,"vanberto_sad","sad",-1);
  makeVanBertoTexture(scene,"vanberto_walk1",false,0);
  makeVanBertoTexture(scene,"vanberto_walk2",false,1);
  makeVanBertoTexture(scene,"vanberto_jump",false,-1,true);
}

// Plataforma colorida estilo cartoon
function makePlatformTexture(scene){
  if(scene.textures.exists("platform_grass")) return;
  makePlatformTextureThemed(scene,"platform_grass",0);
}

// Cano à Mario (pedido: "atalhos ou áreas secretas") — rebordo largo em
// cima + corpo mais estreito a descer, em verde, ao estilo clássico.
export function makePipeTexture(scene){
  if (scene.textures.exists("pipe_mario")) return;
  const RIMW=76, RIMH=20, BODYW=64, BODYH=44;
  const totalW=RIMW, totalH=RIMH+BODYH;
  const bx=(RIMW-BODYW)/2;
  const g=scene.make.graphics({x:0,y:0,add:false});
  // corpo
  g.fillStyle(0x0d5c1e,1); g.fillRect(bx,RIMH,BODYW,BODYH);
  g.fillStyle(0x1e8c34,1); g.fillRect(bx+7,RIMH,BODYW-14,BODYH);
  g.fillStyle(0x5cd873,0.55); g.fillRect(bx+10,RIMH+3,7,BODYH-6);
  // rebordo (mais largo, dá o aspeto de "boca" do cano)
  g.fillStyle(0x0d5c1e,1); g.fillRoundedRect(0,0,RIMW,RIMH+8,6);
  g.fillStyle(0x1e8c34,1); g.fillRoundedRect(4,3,RIMW-8,RIMH,5);
  g.fillStyle(0x5cd873,0.6); g.fillRoundedRect(8,4,RIMW-16,5,3);
  // contornos
  g.lineStyle(3,0x063610,1);
  g.strokeRoundedRect(0,0,RIMW,RIMH+8,6);
  g.strokeRect(bx,RIMH,BODYW,BODYH);
  g.generateTexture("pipe_mario",totalW,totalH); g.destroy();
}

// Gera uma textura de plataforma para cada tema
const PLAT_COLORS=[
  [0x0d3878,0x1e5cb8,0x6aa8ff], // tema0 azul rico
  [0x6a1800,0xc04018,0xff8850], // tema1 crepúsculo
  [0x004858,0x0090a0,0x60e8f0], // tema2 aqua profundo
  [0x780840,0xc03070,0xffa0c8], // tema3 rosa
  [0x200060,0x4810a0,0xc080ff], // tema4 lilás noturno
  [0x003a3a,0x008888,0x40e8e0], // tema5 turquesa
  [0x6a1800,0xb84010,0xff9050], // tema6 laranja quente
  [0x001040,0x0848a0,0x60b8f8], // tema7 azul noturno
  [0x580020,0xa01060,0xff80b8], // tema8 magenta rico
  [0x081808,0x185c28,0x70d870], // tema9 floresta
  [0x7a4a00,0xd9921a,0xffd86a], // tema10 final dourado
];
export function makePlatformTextureThemed(scene, key, themeIdx){
  if(scene.textures.exists(key)) return;
  const [dark, mid, light] = PLAT_COLORS[themeIdx % PLAT_COLORS.length];
  const g=scene.make.graphics({x:0,y:0,add:false});
  // Sombra exterior — mais larga e deslocada para dar profundidade
  g.fillStyle(0x000000,0.40); g.fillRoundedRect(4,25,98,8,4);
  // Corpo principal
  g.fillStyle(dark,1);        g.fillRoundedRect(0,7,100,17,5);
  // Face superior (mais clara)
  g.fillStyle(mid,1);         g.fillRoundedRect(0,0,100,12,5);
  // Brilho suave no topo (efeito vidro)
  g.fillStyle(light,0.35);    g.fillRoundedRect(4,1,92,6,3);
  // Linha de brilho no topo
  g.lineStyle(2,light,0.75);  g.beginPath(); g.moveTo(5,2); g.lineTo(95,2); g.strokePath();
  // Aresta inferior arredondada
  g.fillStyle(dark,1);        g.fillRoundedRect(0,21,100,3,{bl:5,br:5,tl:0,tr:0});
  // Contorno exterior
  g.lineStyle(2.5,dark,1);    g.strokeRoundedRect(0,0,100,24,5);
  // Realce lateral esquerdo (efeito 3D)
  g.lineStyle(1.5,light,0.28); g.beginPath(); g.moveTo(2,6); g.lineTo(2,22); g.strokePath();
  g.generateTexture(key,100,32); g.destroy();
}

// Portal de Estrela — fim do nível muito mais apelativo que uma porta
function makeDoorTexture(scene){
  if(scene.textures.exists("door_party")) return;
  const w=88, h=104, tex=scene.textures.createCanvas("door_party",w,h), ctx=tex.getContext();
  const cx=w/2, cy=h*0.46;

  // ── Aura exterior pulsante (desenhada estaticamente; a animação fica no update) ──
  // Camadas de brilho arco-íris (externas)
  const auras=[
    {r:44, c:"rgba(160,80,255,0.13)"},
    {r:38, c:"rgba(255,107,53,0.16)"},
    {r:33, c:"rgba(255,215,0,0.18)"},
  ];
  auras.forEach(a=>{
    ctx.fillStyle=a.c;
    ctx.beginPath(); ctx.arc(cx,cy,a.r,0,Math.PI*2); ctx.fill();
  });

  // ── Anéis do portal ──
  // Anel 3 — exterior lilás
  const r3g=ctx.createRadialGradient(cx,cy,24,cx,cy,38);
  r3g.addColorStop(0,"rgba(200,120,255,0.0)");
  r3g.addColorStop(0.4,"rgba(200,120,255,0.45)");
  r3g.addColorStop(0.75,"rgba(255,107,53,0.35)");
  r3g.addColorStop(1,"rgba(255,215,0,0.0)");
  ctx.fillStyle=r3g; ctx.beginPath(); ctx.arc(cx,cy,38,0,Math.PI*2); ctx.fill();

  // Anel 2 — intermédio dourado
  const r2g=ctx.createRadialGradient(cx,cy,16,cx,cy,28);
  r2g.addColorStop(0,"rgba(255,215,0,0.0)");
  r2g.addColorStop(0.5,"rgba(255,215,0,0.55)");
  r2g.addColorStop(0.85,"rgba(255,107,53,0.40)");
  r2g.addColorStop(1,"rgba(255,215,0,0.0)");
  ctx.fillStyle=r2g; ctx.beginPath(); ctx.arc(cx,cy,28,0,Math.PI*2); ctx.fill();

  // Centro do portal — vórtice azul-ciano profundo
  const vortex=ctx.createRadialGradient(cx-3,cy-3,1,cx,cy,18);
  vortex.addColorStop(0,"#ffffff");
  vortex.addColorStop(0.18,"#c0f0ff");
  vortex.addColorStop(0.42,"#40b8ff");
  vortex.addColorStop(0.70,"#1040d0");
  vortex.addColorStop(0.88,"#060830");
  vortex.addColorStop(1,"#020415");
  ctx.fillStyle=vortex; ctx.beginPath(); ctx.arc(cx,cy,18,0,Math.PI*2); ctx.fill();

  // Espirais no vórtice (6 raios curvos brancos)
  ctx.save(); ctx.translate(cx,cy);
  for(let s=0;s<6;s++){
    ctx.save(); ctx.rotate(s*Math.PI/3);
    ctx.strokeStyle="rgba(255,255,255,0.22)"; ctx.lineWidth=1.5;
    ctx.beginPath();
    ctx.moveTo(2,0);
    ctx.bezierCurveTo(6,-4, 10,-2, 14,0);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // ── Estrela grande central de 5 pontas ──
  ctx.save(); ctx.translate(cx,cy);
  // Sombra da estrela
  ctx.shadowColor="rgba(255,215,0,0.9)"; ctx.shadowBlur=18;
  const sgr=ctx.createRadialGradient(-1,-2,0,0,0,16);
  sgr.addColorStop(0,"#ffffff");
  sgr.addColorStop(0.3,"#fffbe0");
  sgr.addColorStop(0.6,"#ffd700");
  sgr.addColorStop(1,"#ff9500");
  ctx.fillStyle=sgr;
  ctx.beginPath();
  for(let j=0;j<5;j++){
    const o=Math.PI*2*j/5-Math.PI/2, inn=o+Math.PI/5;
    j===0?ctx.moveTo(Math.cos(o)*16,Math.sin(o)*16):ctx.lineTo(Math.cos(o)*16,Math.sin(o)*16);
    ctx.lineTo(Math.cos(inn)*7,Math.sin(inn)*7);
  }
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur=0;
  // Brilho no centro da estrela
  ctx.fillStyle="rgba(255,255,255,0.75)";
  ctx.beginPath(); ctx.arc(-2,-3,4,0,Math.PI*2); ctx.fill();
  ctx.restore();

  // ── Partículas estáticas em redor (pequenas estrelinhas) ──
  const sparks=[
    {x:cx-30,y:cy-28,r:3.5,c:"#ffd700"},{x:cx+32,y:cy-24,r:3,c:"#ff6b35"},
    {x:cx-36,y:cy+8,r:2.5,c:"#ff80c0"},{x:cx+34,y:cy+12,r:2.5,c:"#80d0ff"},
    {x:cx-18,y:cy-40,r:3,c:"#a0ff80"},{x:cx+16,y:cy-42,r:2.5,c:"#c080ff"},
    {x:cx-4, y:cy+44,r:3.5,c:"#ffd700"},{x:cx+22,y:cy+38,r:2,c:"#ff6b35"},
    {x:cx-24,y:cy+36,r:2,c:"#80d0ff"},
  ];
  sparks.forEach(s=>{
    // Mini-estrela de 4 pontas
    ctx.save(); ctx.translate(s.x,s.y);
    ctx.fillStyle=s.c;
    ctx.shadowColor=s.c; ctx.shadowBlur=6;
    ctx.beginPath();
    for(let k=0;k<4;k++){
      const a=k*Math.PI/2-Math.PI/4, inn=a+Math.PI/4;
      k===0?ctx.moveTo(Math.cos(a)*s.r,Math.sin(a)*s.r):ctx.lineTo(Math.cos(a)*s.r,Math.sin(a)*s.r);
      ctx.lineTo(Math.cos(inn)*s.r*0.38,Math.sin(inn)*s.r*0.38);
    }
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur=0;
    ctx.restore();
  });

  // ── Texto de apelo no fundo ──
  ctx.font="bold 11px 'Baloo 2', sans-serif";
  ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillStyle="#ffd700";
  ctx.shadowColor="rgba(0,0,0,0.8)"; ctx.shadowBlur=4;
  ctx.fillText("PORTAL!", cx, h-10);
  ctx.shadowBlur=0;

  tex.refresh();
}

// Vilões — muito mais detalhados e com personalidade própria
function makeVilaosTextures(scene){

  // helper: olhos malvados com sobrancelhas
  function evilEyes(ctx,cx,cy,eyeColor){
    // Sobrancelhas malvadas (mais espessas e inclinadas)
    ctx.strokeStyle="#000"; ctx.lineWidth=3;
    ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(cx-14,cy-11); ctx.lineTo(cx-4,cy-6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx+14,cy-11); ctx.lineTo(cx+4,cy-6); ctx.stroke();
    // Brancos dos olhos (com sombra)
    ctx.shadowColor="rgba(0,0,0,0.4)"; ctx.shadowBlur=3;
    ctx.fillStyle="#fff";
    ctx.beginPath(); ctx.ellipse(cx-7,cy,5.5,6.5,Math.PI*0.08,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx+7,cy,5.5,6.5,-Math.PI*0.08,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    // Íris colorida
    ctx.fillStyle=eyeColor;
    ctx.beginPath(); ctx.ellipse(cx-7,cy+1,3.5,4.5,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx+7,cy+1,3.5,4.5,0,0,Math.PI*2); ctx.fill();
    // Pupila preta
    ctx.fillStyle="#000";
    ctx.beginPath(); ctx.ellipse(cx-7,cy+2,1.8,2.4,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx+7,cy+2,1.8,2.4,0,0,Math.PI*2); ctx.fill();
    // Brilho duplo na pupila (mais realista)
    ctx.fillStyle="rgba(255,255,255,0.75)";
    ctx.beginPath(); ctx.arc(cx-8,cy-0.5,1.4,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx+6,cy-0.5,1.4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="rgba(255,255,255,0.45)";
    ctx.beginPath(); ctx.arc(cx-6,cy+2,0.8,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx+8,cy+2,0.8,0,Math.PI*2); ctx.fill();
  }

  // helper: boca malvada com dentes e babas
  function evilMouth(ctx,cx,cy,color, drool=false){
    // Boca aberta (meia-lua)
    ctx.fillStyle="#1a0000";
    ctx.beginPath(); ctx.arc(cx,cy,10,0,Math.PI); ctx.fill();
    // Língua
    ctx.fillStyle="#cc2244";
    ctx.beginPath(); ctx.ellipse(cx, cy+5, 4, 3, 0, 0, Math.PI*2); ctx.fill();
    // Dentes (4 dentes irregulares)
    ctx.fillStyle="#ffffee";
    ctx.fillRect(cx-9, cy, 4, 6);
    ctx.fillRect(cx-4, cy, 4, 7);
    ctx.fillRect(cx+1, cy, 4, 6);
    ctx.fillRect(cx+6, cy, 4, 5);
    // Contorno da boca
    ctx.strokeStyle=color; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(cx,cy,10,0,Math.PI); ctx.stroke();
    // Babas (detalhe de vilão perigoso)
    if(drool){
      ctx.fillStyle="rgba(200,255,200,0.7)";
      ctx.beginPath(); ctx.moveTo(cx-3,cy+8); ctx.quadraticCurveTo(cx-3,cy+14,cx-2,cy+18); ctx.quadraticCurveTo(cx+0,cy+16,cx+1,cy+8); ctx.fill();
    }
  }

  // ── Vilão Redondo — bola vermelha mais elaborada ──────────────
  if(!scene.textures.exists("vilao_round")){
    const tex=scene.textures.createCanvas("vilao_round",64,64), ctx=tex.getContext();
    const cx=32,cy=32;

    // Sombra no chão
    ctx.fillStyle="rgba(0,0,0,0.22)";
    ctx.beginPath(); ctx.ellipse(cx,cy+26,20,5,0,0,Math.PI*2); ctx.fill();

    // Halo externo para contraste em qualquer fundo
    ctx.shadowColor="rgba(200,0,0,0.60)"; ctx.shadowBlur=10;
    ctx.strokeStyle="rgba(255,255,255,0.90)"; ctx.lineWidth=4.5;
    ctx.beginPath(); ctx.arc(cx,cy,23,0,Math.PI*2); ctx.stroke();
    ctx.shadowBlur=0;
    ctx.strokeStyle="rgba(0,0,0,0.30)"; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(cx,cy,25,0,Math.PI*2); ctx.stroke();

    // Corpo — gradiente esférico rico
    const gr=ctx.createRadialGradient(cx-8,cy-8,2,cx,cy,22);
    gr.addColorStop(0,"#ff7070");
    gr.addColorStop(0.25,"#ee1111");
    gr.addColorStop(0.65,"#bb0000");
    gr.addColorStop(1,"#6a0000");
    ctx.beginPath(); ctx.arc(cx,cy,22,0,Math.PI*2); ctx.fillStyle=gr; ctx.fill();

    // Padrão de pintas (marcas de perigo — como cogumelo venenoso)
    const spots = [[cx-8,cy-8,4.5],[cx+8,cy-5,3.5],[cx-5,cy+8,4],[cx+10,cy+7,3],[cx+1,cy-13,3]];
    spots.forEach(([px,py,pr])=>{
      ctx.fillStyle="rgba(255,255,255,0.22)";
      ctx.beginPath(); ctx.arc(px,py,pr,0,Math.PI*2); ctx.fill();
      // Borda branca da pinta
      ctx.strokeStyle="rgba(255,255,255,0.15)"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.arc(px,py,pr,0,Math.PI*2); ctx.stroke();
    });

    // Brilho esférico (canto sup. esq.)
    ctx.fillStyle="rgba(255,200,200,0.40)";
    ctx.beginPath(); ctx.ellipse(cx-8,cy-9,10,14,Math.PI*0.3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="rgba(255,255,255,0.25)";
    ctx.beginPath(); ctx.ellipse(cx-10,cy-12,5,7,Math.PI*0.3,0,Math.PI*2); ctx.fill();

    // Contorno final
    ctx.strokeStyle="#6a0000"; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.arc(cx,cy,22,0,Math.PI*2); ctx.stroke();

    // Cara malvada
    evilEyes(ctx,cx,cy-3,"#ff0000");
    evilMouth(ctx,cx,cy+10,"#8a0000", false);
    tex.refresh();
  }

  // ── Vilão Espinhoso — azul muito mais detalhado ────────────────
  if(!scene.textures.exists("vilao_spike")){
    const tex=scene.textures.createCanvas("vilao_spike",64,64), ctx=tex.getContext();
    const cx=32,cy=34;

    // Sombra
    ctx.fillStyle="rgba(0,0,0,0.20)";
    ctx.beginPath(); ctx.ellipse(cx,cy+22,18,5,0,0,Math.PI*2); ctx.fill();

    // Halo azul exterior
    ctx.shadowColor="rgba(0,80,220,0.55)"; ctx.shadowBlur=10;
    ctx.strokeStyle="rgba(255,255,255,0.88)"; ctx.lineWidth=4.5;
    ctx.beginPath(); ctx.arc(cx,cy,23,0,Math.PI*2); ctx.stroke();
    ctx.shadowBlur=0;
    ctx.strokeStyle="rgba(0,0,0,0.28)"; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(cx,cy,25,0,Math.PI*2); ctx.stroke();

    // Aura azul elétrica
    ctx.fillStyle="rgba(50,100,255,0.18)";
    ctx.beginPath(); ctx.arc(cx,cy,28,0,Math.PI*2); ctx.fill();

    // Espinhos (8 ao redor) — antes do corpo para ficarem por baixo
    ctx.fillStyle="#003090";
    ctx.shadowColor="rgba(0,60,180,0.50)"; ctx.shadowBlur=4;
    for(let si=0;si<8;si++){
      const sa=Math.PI*2*si/8 - Math.PI*0.08;
      const sx1=cx+Math.cos(sa)*20, sy1=cy+Math.sin(sa)*20;
      const sx2=cx+Math.cos(sa)*30, sy2=cy+Math.sin(sa)*30;
      const sxL=cx+Math.cos(sa+0.25)*21, syL=cy+Math.sin(sa+0.25)*21;
      const sxR=cx+Math.cos(sa-0.25)*21, syR=cy+Math.sin(sa-0.25)*21;
      ctx.beginPath(); ctx.moveTo(sx2,sy2); ctx.lineTo(sxL,syL); ctx.lineTo(sxR,syR); ctx.closePath(); ctx.fill();
    }
    ctx.shadowBlur=0;

    // Corpo principal — gradiente azul elétrico
    const gr=ctx.createRadialGradient(cx-7,cy-7,2,cx,cy,21);
    gr.addColorStop(0,"#80b0ff");
    gr.addColorStop(0.30,"#2255ee");
    gr.addColorStop(0.70,"#0030cc");
    gr.addColorStop(1,"#001080");
    ctx.beginPath(); ctx.arc(cx,cy,21,0,Math.PI*2); ctx.fillStyle=gr; ctx.fill();

    // Padrão de circuitos (linhas azuis brilhantes)
    ctx.strokeStyle="rgba(150,200,255,0.35)"; ctx.lineWidth=1;
    ctx.lineCap="round";
    [[cx-6,cy-10,cx-6,cy-3],[cx-6,cy-3,cx+4,cy-3],[cx+4,cy-3,cx+4,cy+5],
     [cx-12,cy+4,cx-4,cy+4],[cx+6,cy+8,cx+12,cy+2]].forEach(([x1,y1,x2,y2])=>{
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    });
    // Nódulos dos circuitos
    ctx.fillStyle="rgba(180,220,255,0.55)";
    [[cx-6,cy-3],[cx+4,cy+5],[cx-4,cy+4]].forEach(([nx,ny])=>{
      ctx.beginPath(); ctx.arc(nx,ny,2,0,Math.PI*2); ctx.fill();
    });

    // Brilho esférico
    ctx.fillStyle="rgba(160,200,255,0.38)";
    ctx.beginPath(); ctx.ellipse(cx-7,cy-8,9,13,Math.PI*0.3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="rgba(255,255,255,0.22)";
    ctx.beginPath(); ctx.ellipse(cx-9,cy-11,5,7,Math.PI*0.3,0,Math.PI*2); ctx.fill();

    // Contorno
    ctx.strokeStyle="#001580"; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.arc(cx,cy,21,0,Math.PI*2); ctx.stroke();

    evilEyes(ctx,cx,cy-2,"#0044ff");
    evilMouth(ctx,cx,cy+10,"#001080", false);
    tex.refresh();
  }

  // ── Vilão Inseto — verde muito mais elaborado ──────────────────
  if(!scene.textures.exists("vilao_bug")){
    const tex=scene.textures.createCanvas("vilao_bug",64,64), ctx=tex.getContext();
    const cx=32,cy=30;

    // Sombra
    ctx.fillStyle="rgba(0,0,0,0.22)";
    ctx.beginPath(); ctx.ellipse(cx,cy+28,22,6,0,0,Math.PI*2); ctx.fill();

    // Halo verde exterior
    ctx.shadowColor="rgba(0,160,0,0.55)"; ctx.shadowBlur=10;
    ctx.strokeStyle="rgba(255,255,255,0.82)"; ctx.lineWidth=4.5;
    ctx.beginPath(); ctx.arc(cx,cy,23,0,Math.PI*2); ctx.stroke();
    ctx.shadowBlur=0;
    ctx.strokeStyle="rgba(0,0,0,0.22)"; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(cx,cy,25,0,Math.PI*2); ctx.stroke();

    // Corpo principal — gradiente verde rico
    const gr=ctx.createRadialGradient(cx-6,cy-6,2,cx,cy,21);
    gr.addColorStop(0,"#90ff50");
    gr.addColorStop(0.35,"#30b020");
    gr.addColorStop(0.70,"#0d7010");
    gr.addColorStop(1,"#044806");
    ctx.beginPath(); ctx.arc(cx,cy,21,0,Math.PI*2); ctx.fillStyle=gr; ctx.fill();

    // Patas (3 de cada lado, com articulações)
    ctx.strokeStyle="#1a6010"; ctx.lineWidth=2.5; ctx.lineCap="round";
    for(let pi=0;pi<3;pi++){
      const py=cy-5+pi*7;
      // Pata esquerda — 2 segmentos com joelho
      ctx.beginPath(); ctx.moveTo(cx-21,py); ctx.lineTo(cx-28,py-5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx-28,py-5); ctx.lineTo(cx-35,py+4); ctx.stroke();
      // Garra esquerda
      ctx.fillStyle="#064806"; ctx.beginPath(); ctx.arc(cx-35,py+4,3.5,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle="#1a6010"; ctx.lineWidth=1; ctx.stroke();
      // Pata direita
      ctx.strokeStyle="#1a6010"; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.moveTo(cx+21,py); ctx.lineTo(cx+28,py-5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx+28,py-5); ctx.lineTo(cx+35,py+4); ctx.stroke();
      ctx.fillStyle="#064806"; ctx.beginPath(); ctx.arc(cx+35,py+4,3.5,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle="#1a6010"; ctx.lineWidth=1; ctx.stroke();
    }

    // Antenas curvas com bola brilhante
    ctx.strokeStyle="#064806"; ctx.lineWidth=2.5; ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(cx-7,cy-20); ctx.quadraticCurveTo(cx-18,cy-36,cx-11,cy-45); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx+7,cy-20); ctx.quadraticCurveTo(cx+18,cy-36,cx+11,cy-45); ctx.stroke();
    // Bolas das antenas com brilho
    ctx.shadowColor="rgba(255,100,50,0.70)"; ctx.shadowBlur=6;
    ctx.fillStyle="#ff5520";
    ctx.beginPath(); ctx.arc(cx-11,cy-45,5.5,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx+11,cy-45,5.5,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    ctx.strokeStyle="#c04000"; ctx.lineWidth=1.2;
    ctx.beginPath(); ctx.arc(cx-11,cy-45,5.5,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx+11,cy-45,5.5,0,Math.PI*2); ctx.stroke();
    // Brilho nas bolas
    ctx.fillStyle="rgba(255,220,180,0.65)";
    ctx.beginPath(); ctx.arc(cx-13,cy-47,2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx+9,cy-47,2,0,Math.PI*2); ctx.fill();

    // Segmentos do abdómen (3 anéis)
    ctx.strokeStyle="rgba(0,80,0,0.45)"; ctx.lineWidth=1.5;
    for(let s=0;s<3;s++){
      ctx.beginPath(); ctx.ellipse(cx,cy-3+s*9,16,3,0,0,Math.PI); ctx.stroke();
    }

    // Brilho esférico
    ctx.fillStyle="rgba(200,255,150,0.28)";
    ctx.beginPath(); ctx.ellipse(cx-7,cy-8,9,13,Math.PI*0.3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="rgba(255,255,255,0.20)";
    ctx.beginPath(); ctx.ellipse(cx-9,cy-11,5,7,Math.PI*0.3,0,Math.PI*2); ctx.fill();

    // Contorno final
    ctx.strokeStyle="#044806"; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.arc(cx,cy,21,0,Math.PI*2); ctx.stroke();

    evilEyes(ctx,cx,cy-2,"#00aa00");
    evilMouth(ctx,cx,cy+10,"#0a5000", true); // babas no inseto — mais assustador!
    tex.refresh();
  }
} // fim makeVilaosTextures

// ── Bosses — silhuetas próprias, uma por boss, para deixarem de ser o
//    vilão normal aumentado. Cada textura é desenhada uma única vez. ────
function makeBossTextures(scene){
  const S = 116, C = 58;

  function bossShadow(ctx){
    ctx.fillStyle="rgba(0,0,0,0.28)";
    ctx.beginPath(); ctx.ellipse(C,S-14,34,8,0,0,Math.PI*2); ctx.fill();
  }
  function glowEye(ctx,x,y,r,color){
    ctx.shadowColor=color; ctx.shadowBlur=10;
    ctx.fillStyle=color;
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    ctx.fillStyle="rgba(255,255,255,0.85)";
    ctx.beginPath(); ctx.arc(x-r*0.3,y-r*0.3,r*0.32,0,Math.PI*2); ctx.fill();
  }

  // ── 1) Monstro do Phishing — redesenho "pirata-hacker" (pedido: aproximar
  // a aparência de uma ilustração de referência fornecida pelo Berto) ────
  // Versão anterior: um blob roxo, rechonchuda, com pupilas em "?" — lida
  // à distância mas sem ligação visual nenhuma ao tema "phishing". Nova
  // versão: um caçador de dados sombrio — chapéu de pirata (o "anzol" é a
  // metáfora clássica do phishing: morde o isco e é fisgado), cabeça-ecrã
  // com uma cara maléfica tipo abóbora do Halloween em brilho ciano, capa
  // esfarrapada azul-marinho, uma garra grande de um lado e uma cana de
  // pesca com anzol do outro. Continua "stompBoss" (salta-lhe em cima 3
  // vezes) — só a pele muda, a mecânica é exactamente a mesma, e os 8
  // estados (normal/armsdown/blink/ouch/laugh/angry/sad/sentado) mantêm-se
  // todos, só desenhados de novo com esta identidade.
  //
  // Paleta centralizada num só objeto (PH) para as 8 variantes usarem
  // sempre exactamente as mesmas cores — evita o "cada estado com o seu
  // tom" que aconteceria copiando valores à mão em cada função.
  const PH = {
    cloakDark:  "#0b1330",
    cloakMid:   "#182a56",
    cloakLight: "#2c4a86",
    trim:       "#39d6ff",
    glow:       "#8ff2ff",
    screenBg:   "#081026",
    frame:      "#dbe2ee",
    frameDark:  "#8f9ab0",
    belt:       "#4a3220",
    buckle:     "#c7cedb",
    claw:       "#eef2f7",
    clawLine:   "#182a56",
    hatDark:    "#0c1730",
    envelope:   "#f4f7fb",
    warn:       "#ff3050"
  };

  // Uma "lâmina" da garra — larga na base, estreita depressa para uma ponta
  // fina, com uma junta articulada e um brilho fino ao longo do dorso.
  // Reutilizada 4x (3 dedos + 1 esporão) rodando o desenho à volta do
  // pulso, em vez de desenhar cada dedo à mão — garante que todos saem
  // consistentes.
  function drawClawFinger(ctx, wx, wy, angle, len, width) {
    ctx.save();
    ctx.translate(wx, wy);
    ctx.rotate(angle);
    const grad = ctx.createLinearGradient(0, -width / 2, 0, width / 2);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(1, "#bcc7d9");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -width / 2);
    ctx.quadraticCurveTo(len * 0.3, -width * 0.4, len * 0.72, -width * 0.08);
    ctx.lineTo(len, 0);
    ctx.lineTo(len * 0.72, width * 0.08);
    ctx.quadraticCurveTo(len * 0.3, width * 0.4, 0, width / 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PH.clawLine; ctx.lineWidth = 1.7;
    ctx.stroke();
    ctx.strokeStyle = "rgba(24,42,86,0.6)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(len * 0.34, -width * 0.34); ctx.lineTo(len * 0.34, width * 0.34); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(width * 0.1, -width * 0.28); ctx.lineTo(len * 0.68, -width * 0.06); ctx.stroke();
    ctx.restore();
  }

  // Capa/manto: ombros largos a estreitar até uma bainha esfarrapada em
  // zigue-zague (nunca reta — reforça o ar de vilão sombrio, tal como a
  // capa do Espião das Sombras, mas em azul-marinho/ciano). Inclui o cinto
  // com fivela em forma de anzol e o crachá de "email falso" que já
  // identificava este boss como o do phishing — mantido, só re-tonalizado.
  function drawPhishingCloak(ctx) {
    const grad = ctx.createLinearGradient(0, C - 14, 0, C + 34);
    grad.addColorStop(0, PH.cloakLight);
    grad.addColorStop(0.55, PH.cloakMid);
    grad.addColorStop(1, PH.cloakDark);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(C - 30, C - 6);
    ctx.quadraticCurveTo(C - 40, C + 10, C - 33, C + 24);
    ctx.lineTo(C - 27, C + 22);
    ctx.lineTo(C - 19, C + 34);
    ctx.lineTo(C - 9, C + 24);
    ctx.lineTo(C, C + 36);
    ctx.lineTo(C + 9, C + 24);
    ctx.lineTo(C + 19, C + 34);
    ctx.lineTo(C + 27, C + 22);
    ctx.lineTo(C + 33, C + 24);
    ctx.quadraticCurveTo(C + 40, C + 10, C + 30, C - 6);
    ctx.quadraticCurveTo(C, C - 16, C - 30, C - 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PH.cloakDark; ctx.lineWidth = 2.6;
    ctx.stroke();
    // orla a brilhar em ciano — dá o ar de "energia" que percorre o manto
    ctx.save();
    ctx.shadowColor = PH.trim; ctx.shadowBlur = 7;
    ctx.strokeStyle = "rgba(57,214,255,0.55)"; ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.restore();

    // cinto com fivela em forma de anzol
    ctx.fillStyle = PH.belt;
    ctx.beginPath(); ctx.roundRect(C - 29, C + 6, 58, 9, 3); ctx.fill();
    ctx.strokeStyle = PH.cloakDark; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = PH.buckle;
    ctx.beginPath(); ctx.roundRect(C - 8, C + 4, 16, 13, 3); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = PH.cloakMid; ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(C, C + 10.5, 3.6, Math.PI * 0.1, Math.PI * 1.35); ctx.stroke();

    // crachá de "email falso" — mantém a identidade "phishing" já usada na
    // versão anterior deste boss, só re-tonalizado para a nova paleta
    ctx.fillStyle = PH.envelope;
    ctx.beginPath(); ctx.roundRect(C - 11, C - 6, 22, 15, 2); ctx.fill();
    ctx.strokeStyle = PH.cloakDark; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(C - 11, C - 6); ctx.lineTo(C, C + 3); ctx.lineTo(C + 11, C - 6); ctx.stroke();
    ctx.fillStyle = PH.warn;
    ctx.beginPath(); ctx.arc(C + 6, C + 6, 4.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fffaff"; ctx.font = "bold 7px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("!", C + 6, C + 6.5);
    ctx.textBaseline = "alphabetic";
  }

  // Botas curtas e largas, sempre na mesma posição em todos os frames — o
  // boss fica bem "assente" no chão, importante para o salto-na-cabeça ser
  // sempre previsível. Pés terminam em C+49 (igual à medição original desta
  // arena — ver bossY em data-bosses.js), por isso bossY não precisou de
  // ser recalculado com este redesenho.
  function drawPhishingLegs(ctx) {
    ctx.strokeStyle = PH.cloakDark; ctx.lineWidth = 2.4;
    [-15, 15].forEach(dx => {
      ctx.fillStyle = PH.cloakMid;
      ctx.beginPath(); ctx.roundRect(C + dx - 6, C + 26, 12, 14, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = PH.hatDark;
      ctx.beginPath(); ctx.roundRect(C + dx - 11, C + 36, 22, 13, 4); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = PH.trim; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(C + dx - 11, C + 40); ctx.lineTo(C + dx + 11, C + 40); ctx.stroke();
      ctx.strokeStyle = PH.cloakDark; ctx.lineWidth = 2.4;
    });
  }

  // Cabeça-ecrã: moldura prateada + fundo escuro. A cara (olhos/boca) é
  // desenhada à parte, em drawPhishingFace, para poder variar por humor sem
  // repetir a moldura em cada uma das 8 texturas.
  function drawPhishingScreen(ctx, dy) {
    dy = dy || 0;
    ctx.fillStyle = PH.frameDark;
    ctx.beginPath(); ctx.roundRect(C - 24, 16 + dy, 48, 36, 8); ctx.fill();
    ctx.fillStyle = PH.frame;
    ctx.beginPath(); ctx.roundRect(C - 22, 18 + dy, 44, 32, 7); ctx.fill();
    ctx.strokeStyle = PH.cloakDark; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = PH.screenBg;
    ctx.beginPath(); ctx.roundRect(C - 18, 22 + dy, 36, 24, 5); ctx.fill();
    ctx.save();
    ctx.shadowColor = PH.trim; ctx.shadowBlur = 8;
    ctx.strokeStyle = "rgba(57,214,255,0.5)"; ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }

  // Chapéu de pirata: aba larga + copa em "dois bicos" (tricórnio), com um
  // pequeno emblema de anzol em ciano — reforça "phishing" = pesca ilegal
  // de dados, o mesmo raciocínio do anzol na cana que os braços seguram.
  function drawPhishingHat(ctx) {
    ctx.fillStyle = PH.hatDark;
    ctx.beginPath(); ctx.ellipse(C, 17, 26, 6.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = PH.cloakDark; ctx.lineWidth = 2; ctx.stroke();
    ctx.save();
    ctx.shadowColor = PH.trim; ctx.shadowBlur = 5;
    ctx.strokeStyle = "rgba(57,214,255,0.5)"; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.ellipse(C, 17, 26, 6.5, 0, 0, Math.PI); ctx.stroke();
    ctx.restore();

    const grad = ctx.createLinearGradient(C - 16, 0, C + 16, 20);
    grad.addColorStop(0, "#16264d");
    grad.addColorStop(1, PH.hatDark);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(C - 17, 18);
    ctx.quadraticCurveTo(C - 19, 5, C - 9, 2);
    ctx.quadraticCurveTo(C - 3, 8, C - 1, 10);
    ctx.quadraticCurveTo(C + 3, 6, C + 8, 6);
    ctx.quadraticCurveTo(C + 18, 5, C + 17, 18);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PH.cloakDark; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(C - 1, 10); ctx.lineTo(C + 3, 17); ctx.stroke();

    ctx.fillStyle = PH.glow;
    ctx.beginPath(); ctx.arc(C - 5, 12, 3.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = PH.glow; ctx.lineWidth = 1.5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(C - 5, 15); ctx.lineTo(C - 5, 18); ctx.arc(C - 3, 18, 2, Math.PI, Math.PI * 0.1, true); ctx.stroke();
  }

  // Corpo completo (tudo o que não muda por humor/braço): sombra, botas,
  // capa+cinto+crachá, cabeça-ecrã e chapéu, por esta ordem para o
  // sobrepor ficar correto (capa tapa o topo das botas, ecrã tapa o
  // decote da capa, chapéu fica por cima do ecrã).
  function drawPhishingBody(ctx) {
    bossShadow(ctx);
    drawPhishingLegs(ctx);
    drawPhishingCloak(ctx);
    drawPhishingScreen(ctx);
    drawPhishingHat(ctx);
  }

  // Braços: mood "wave" = pose de combate (garra grande de um lado, cana de
  // pesca com anzol do outro); mood "rest" = mangas simples junto ao corpo,
  // usado nos estados mais calmos (dor, tristeza, idle "braços em baixo").
  // O antebraço da garra tem anéis a brilhar (recorte + traço por cima),
  // sugerindo um braço blindado/segmentado como na ilustração de
  // referência, em vez de uma manga lisa.
  function drawPhishingArms(ctx, mood) {
    if (mood === "wave") {
      ctx.fillStyle = PH.cloakMid; ctx.strokeStyle = PH.cloakDark; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.ellipse(C - 33, C + 4, 13, 18, -0.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = "rgba(57,214,255,0.75)"; ctx.lineWidth = 2;
      [-8, 0, 8].forEach(oy => {
        ctx.beginPath(); ctx.ellipse(C - 33, C + 4 + oy, 13, 5, -0.25, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.restore();

      // garra grande — palma + 3 dedos a abrir em leque (cada um nasce num
      // ponto próprio da borda da palma, não todos no mesmo sítio, para não
      // colarem numa "luva" só) + um esporão traseiro que reforça a leitura
      // de garra.
      const wrist = { x: C - 44, y: C + 3 };
      ctx.fillStyle = PH.claw; ctx.strokeStyle = PH.clawLine; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.ellipse(wrist.x + 10, wrist.y, 13, 15, -0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      drawClawFinger(ctx, wrist.x + 4, wrist.y - 13, Math.PI * 0.96, 32, 9.5);
      drawClawFinger(ctx, wrist.x - 2, wrist.y + 1, Math.PI * 1.05, 37, 10.5);
      drawClawFinger(ctx, wrist.x + 3, wrist.y + 14, Math.PI * 1.17, 30, 9.5);
      drawClawFinger(ctx, wrist.x + 16, wrist.y + 11, Math.PI * 0.42, 15, 7);

      // manga direita + cana de pesca com anzol (a "isca digital" do boss)
      ctx.fillStyle = PH.cloakMid; ctx.strokeStyle = PH.cloakDark; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.ellipse(C + 32, C - 2, 9, 15, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#dfe6f0";
      ctx.beginPath(); ctx.arc(C + 34, C - 14, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = PH.hatDark; ctx.lineWidth = 3; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(C + 34, C - 14); ctx.quadraticCurveTo(C + 48, C - 34, C + 42, C - 52); ctx.stroke();
      ctx.strokeStyle = PH.trim; ctx.lineWidth = 1; ctx.lineCap = "butt";
      ctx.beginPath(); ctx.moveTo(C + 42, C - 52); ctx.quadraticCurveTo(C + 40, C - 24, C + 40, C - 2); ctx.stroke();
      ctx.strokeStyle = PH.glow; ctx.lineWidth = 2; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(C + 40, C - 2); ctx.quadraticCurveTo(C + 46, C + 4, C + 42, C + 10); ctx.stroke();
    } else {
      ctx.strokeStyle = PH.cloakDark; ctx.lineWidth = 2.2;
      [-33, 33].forEach(dx => {
        ctx.fillStyle = PH.cloakMid;
        ctx.beginPath(); ctx.ellipse(C + dx, C + 6, 8, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = PH.claw;
        ctx.beginPath(); ctx.arc(C + dx, C + 18, 7.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      });
    }
  }

  // Cara — desenhada dentro da área do ecrã (drawPhishingScreen), sempre em
  // brilho ciano (glow). "mood" cobre os 6 humores usados pelas 6 texturas
  // com cabeça normal (sentado tem a sua própria cara, à parte, porque a
  // pose toda é diferente).
  function drawPhishingFace(ctx, mood) {
    const ex = 15, ey = 32;
    ctx.save();
    ctx.shadowColor = PH.glow; ctx.shadowBlur = 6;
    ctx.fillStyle = PH.glow; ctx.strokeStyle = PH.glow;

    if (mood === "blink") {
      ctx.lineWidth = 2.4; ctx.lineCap = "round";
      [-ex, ex].forEach(dx => {
        ctx.beginPath(); ctx.moveTo(C + dx - 6, ey); ctx.lineTo(C + dx + 6, ey); ctx.stroke();
      });
    } else if (mood === "ouch") {
      [-ex, ex].forEach(dx => {
        ctx.beginPath(); ctx.arc(C + dx, ey, 6, 0, Math.PI * 2); ctx.fill();
      });
    } else if (mood === "laugh") {
      ctx.lineWidth = 2.6; ctx.lineCap = "round";
      [-ex, ex].forEach(dx => {
        ctx.beginPath(); ctx.arc(C + dx, ey + 2, 6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      });
    } else if (mood === "angry") {
      [-ex, ex].forEach(dx => {
        const side = dx < 0 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(C + dx - 7 * side, ey - 6);
        ctx.lineTo(C + dx + 7 * side, ey + 2);
        ctx.lineTo(C + dx - 2 * side, ey + 6);
        ctx.closePath(); ctx.fill();
      });
    } else if (mood === "sad") {
      [-ex, ex].forEach(dx => {
        const side = dx < 0 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(C + dx - 7 * side, ey + 4);
        ctx.lineTo(C + dx + 7 * side, ey - 3);
        ctx.lineTo(C + dx - 2 * side, ey - 6);
        ctx.closePath(); ctx.fill();
      });
    } else {
      // normal — olhos triangulares tipo "abóbora" (jack-o-lantern), a
      // referência visual mais forte do boss
      [-ex, ex].forEach(dx => {
        const side = dx < 0 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(C + dx - 7 * side, ey + 5);
        ctx.lineTo(C + dx + 7 * side, ey - 4);
        ctx.lineTo(C + dx + 7 * side, ey + 6);
        ctx.closePath(); ctx.fill();
      });
    }
    ctx.restore();

    ctx.save();
    ctx.shadowColor = PH.glow; ctx.shadowBlur = 5;
    ctx.fillStyle = PH.glow;
    const my = mood === "sad" ? 45 : 43;
    if (mood === "laugh") {
      ctx.beginPath();
      ctx.moveTo(C - 14, 39); ctx.lineTo(C - 8, 46); ctx.lineTo(C - 2, 39); ctx.lineTo(C + 4, 46);
      ctx.lineTo(C + 10, 39); ctx.lineTo(C + 14, 44); ctx.lineTo(C + 14, 48);
      ctx.lineTo(C - 14, 48); ctx.closePath(); ctx.fill();
    } else if (mood === "ouch") {
      ctx.beginPath(); ctx.ellipse(C, my, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
    } else if (mood === "sad") {
      ctx.lineWidth = 2.4; ctx.strokeStyle = PH.glow; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(C - 12, my + 3); ctx.quadraticCurveTo(C, my - 5, C + 12, my + 3); ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(C - 13, my - 3); ctx.lineTo(C - 7, my + 4); ctx.lineTo(C - 1, my - 3); ctx.lineTo(C + 5, my + 4);
      ctx.lineTo(C + 11, my - 3); ctx.lineTo(C + 13, my); ctx.lineTo(C + 13, my + 5);
      ctx.lineTo(C - 13, my + 5); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  if (!scene.textures.exists("boss_monstro_phishing")) {
    const tex = scene.textures.createCanvas("boss_monstro_phishing", S, S), ctx = tex.getContext();
    drawPhishingBody(ctx);
    drawPhishingArms(ctx, "wave");
    drawPhishingFace(ctx, "normal");
    tex.refresh();
  }
  // Duas variantes para a animação "idle" (ver doBossIdleArms/doBossIdleBlink
  // em dia-crianca.js) — o boss alterna braços "wave"/"rest" a espaços
  // regulares e pisca os olhos de vez em quando, tal como antes.
  if (!scene.textures.exists("boss_monstro_phishing_armsdown")) {
    const tex = scene.textures.createCanvas("boss_monstro_phishing_armsdown", S, S), ctx = tex.getContext();
    drawPhishingBody(ctx);
    drawPhishingArms(ctx, "rest");
    drawPhishingFace(ctx, "normal");
    tex.refresh();
  }
  if (!scene.textures.exists("boss_monstro_phishing_blink")) {
    const tex = scene.textures.createCanvas("boss_monstro_phishing_blink", S, S), ctx = tex.getContext();
    drawPhishingBody(ctx);
    drawPhishingArms(ctx, "wave");
    drawPhishingFace(ctx, "blink");
    tex.refresh();
  }
  // Estado "ouch" — usado por meio segundo sempre que leva um salto na
  // cabeça: olhos redondos e esbugalhados + boca em "o" de surpresa.
  if (!scene.textures.exists("boss_monstro_phishing_ouch")) {
    const tex = scene.textures.createCanvas("boss_monstro_phishing_ouch", S, S), ctx = tex.getContext();
    drawPhishingBody(ctx);
    drawPhishingArms(ctx, "rest");
    drawPhishingFace(ctx, "ouch");
    tex.refresh();
  }
  // Estado "riso maléfico" — usado na entrada do combate (intro): olhos
  // semicerrados de gozo + boca bem aberta em zigue-zague, confiante que
  // vai ganhar.
  if (!scene.textures.exists("boss_monstro_phishing_laugh")) {
    const tex = scene.textures.createCanvas("boss_monstro_phishing_laugh", S, S), ctx = tex.getContext();
    drawPhishingBody(ctx);
    drawPhishingArms(ctx, "wave");
    drawPhishingFace(ctx, "laugh");
    tex.refresh();
  }
  // Estado "zangado" — ao escalar de fúria a meio do combate (ver
  // bossEnterRage em dia-crianca.js): sobrolhos em V afiados, mais próximos.
  if (!scene.textures.exists("boss_monstro_phishing_angry")) {
    const tex = scene.textures.createCanvas("boss_monstro_phishing_angry", S, S), ctx = tex.getContext();
    drawPhishingBody(ctx);
    drawPhishingArms(ctx, "wave");
    drawPhishingFace(ctx, "angry");
    tex.refresh();
  }
  // Estado "triste" — usado na derrota, antes de passar ao "sentado":
  // olhos caídos + boca franzida para baixo.
  if (!scene.textures.exists("boss_monstro_phishing_sad")) {
    const tex = scene.textures.createCanvas("boss_monstro_phishing_sad", S, S), ctx = tex.getContext();
    drawPhishingBody(ctx);
    drawPhishingArms(ctx, "rest");
    drawPhishingFace(ctx, "sad");
    tex.refresh();
  }
  // Estado "sentado" — sequência de derrota simpática: senta-se no chão, o
  // chapéu cai-lhe ao lado (tombado), acena com a garra e mostra uma cara
  // feliz no ecrã. Não morre, não explode — só fica simpático, tal como
  // pedido na versão original deste boss.
  if (!scene.textures.exists("boss_monstro_phishing_sentado")) {
    const tex = scene.textures.createCanvas("boss_monstro_phishing_sentado", S, S), ctx = tex.getContext();
    bossShadow(ctx);
    ctx.strokeStyle = PH.cloakDark; ctx.lineWidth = 2.2;
    ctx.fillStyle = PH.cloakMid;
    ctx.beginPath(); ctx.ellipse(C - 17, C + 35, 18, 8, 0.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(C + 17, C + 35, 18, 8, -0.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PH.hatDark;
    [-28, 28].forEach(dx => {
      ctx.beginPath(); ctx.ellipse(C + dx, C + 39, 9, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = PH.trim; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(C + dx - 7, C + 39); ctx.lineTo(C + dx + 7, C + 39); ctx.stroke();
      ctx.strokeStyle = PH.cloakDark; ctx.lineWidth = 2.2;
    });

    const gradSit = ctx.createLinearGradient(0, C - 10, 0, C + 28);
    gradSit.addColorStop(0, PH.cloakLight);
    gradSit.addColorStop(0.55, PH.cloakMid);
    gradSit.addColorStop(1, PH.cloakDark);
    ctx.fillStyle = gradSit;
    ctx.beginPath(); ctx.ellipse(C, C + 10, 35, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = PH.cloakDark; ctx.lineWidth = 2.4; ctx.stroke();

    ctx.fillStyle = PH.belt;
    ctx.beginPath(); ctx.roundRect(C - 26, C + 4, 52, 8, 3); ctx.fill();
    ctx.strokeStyle = PH.cloakDark; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.fillStyle = PH.envelope;
    ctx.beginPath(); ctx.roundRect(C - 10, C - 8, 20, 14, 2); ctx.fill();
    ctx.strokeStyle = PH.cloakDark; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(C - 10, C - 8); ctx.lineTo(C, C); ctx.lineTo(C + 10, C - 8); ctx.stroke();

    // braço relaxado (esquerdo)
    ctx.fillStyle = PH.cloakMid; ctx.strokeStyle = PH.cloakDark; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.ellipse(C - 32, C + 14, 8, 14, 0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PH.claw;
    ctx.beginPath(); ctx.arc(C - 35, C + 26, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // braço a acenar (direito) — saudação amigável
    ctx.fillStyle = PH.cloakMid;
    ctx.beginPath(); ctx.ellipse(C + 31, C + 2, 8, 15, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PH.claw;
    ctx.beginPath(); ctx.ellipse(C + 39, C - 12, 7, 9, -0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    drawClawFinger(ctx, C + 41, C - 18, -Math.PI * 0.6, 13, 5.5);

    drawPhishingScreen(ctx, 4);

    // chapéu tombado ao lado, no chão — a piada visual de "derrota simpática"
    ctx.save();
    ctx.translate(C - 46, C + 40);
    ctx.rotate(-0.5);
    ctx.fillStyle = PH.hatDark;
    ctx.beginPath(); ctx.ellipse(0, 0, 17, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = PH.cloakDark; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -4, 10, 7, 0, Math.PI, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();

    // cara feliz — olhos curvos + sorriso largo, a brilhar
    ctx.save();
    ctx.shadowColor = PH.glow; ctx.shadowBlur = 6;
    ctx.strokeStyle = PH.glow; ctx.lineWidth = 2.6; ctx.lineCap = "round";
    [-15, 15].forEach(dx => {
      ctx.beginPath(); ctx.arc(C + dx, 36, 6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    });
    ctx.fillStyle = PH.glow;
    ctx.beginPath();
    ctx.moveTo(C - 12, 44); ctx.quadraticCurveTo(C, 52, C + 12, 44);
    ctx.quadraticCurveTo(C, 49, C - 12, 44);
    ctx.fill();
    ctx.restore();
    tex.refresh();
  }

  // ── 2) Vírus Gigante — redesenho "robô-vírus" (pedido: aproximar a
  // aparência de uma imagem de referência fornecida pelo Berto, a mesma
  // leva das referências usadas para os outros 3 bosses) ─────────────────
  // Versão anterior: uma esfera âmbar/preta com espigões angulares tipo
  // "pixel corrompido" e dois pseudópodes finos — lia-se bem como "vírus
  // digital" mas não tinha nenhuma relação de família com os outros 3
  // bosses (screen-head + capa/corpo + garras). Nova versão: usa a mesma
  // "receita" (corpo robótico + cabeça-ecrã com cara maléfica + garras
  // grandes) em tons vermelho/preto, com uma bola vírica espinhosa presa
  // atrás da cabeça como "capacete" (o mesmo slot que o chapéu de pirata do
  // Monstro do Phishing ou o capuz do Espião das Sombras) e 4 tentáculos-
  // cabo com fichas USB na ponta a saírem de trás dos ombros — a app
  // “é um vírus que infeta hardware”, não um organismo biológico.
  // Continua "stompBoss" com movimento em onda (flutua/pulsa) — só a pele
  // muda, tal como nos outros 3.
  //
  // Paleta própria (VG), irmã das paletas PH/SH — vermelho/preto em vez de
  // azul-ciano ou roxo-magenta, a condizer com o "perigo/infeção" do vírus.
  const VG = {
    bodyDark:  "#0e0e14",
    bodyMid:   "#1c1c26",
    bodyLight: "#33333f",
    glow:      "#ff4030",
    glow2:     "#ffb020",
    screenBg:  "#100608",
    frame:     "#8a8a96",
    frameDark: "#3c3c46",
    claw:      "#151018",
    clawGlow:  "#ff4030",
    virusBody: "#c7291f",
    virusDark: "#7a140e",
    panel:     "#18080a"
  };

  // Lâmina de garra — mesma técnica das outras 3 famílias (drawClawFinger),
  // aqui com o brilho a acender a vermelho em vez de ciano/magenta.
  function drawVirusClawFinger(ctx, wx, wy, angle, len, width) {
    ctx.save();
    ctx.translate(wx, wy);
    ctx.rotate(angle);
    const grad = ctx.createLinearGradient(0, 0, len, 0);
    grad.addColorStop(0, VG.claw);
    grad.addColorStop(0.6, VG.claw);
    grad.addColorStop(1, VG.clawGlow);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -width / 2);
    ctx.quadraticCurveTo(len * 0.3, -width * 0.4, len * 0.72, -width * 0.08);
    ctx.lineTo(len, 0);
    ctx.lineTo(len * 0.72, width * 0.08);
    ctx.quadraticCurveTo(len * 0.3, width * 0.4, 0, width / 2);
    ctx.closePath();
    ctx.save();
    ctx.shadowColor = VG.clawGlow; ctx.shadowBlur = 5;
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "#000"; ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,64,48,0.55)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(len * 0.34, -width * 0.3); ctx.lineTo(len * 0.34, width * 0.3); ctx.stroke();
    ctx.restore();
  }

  function drawVirusClawHand(ctx, wx, wy, spread) {
    ctx.fillStyle = VG.bodyMid; ctx.strokeStyle = "#000"; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.ellipse(wx, wy, 13, 15, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    drawVirusClawFinger(ctx, wx - 4, wy - 14, -0.6 * spread, 22, 9.5);
    drawVirusClawFinger(ctx, wx - 6, wy + 1, -0.08 * spread, 25, 10.5);
    drawVirusClawFinger(ctx, wx - 4, wy + 15, 0.48 * spread, 21, 9.5);
  }

  // Tentáculo-cabo: um cabo curvo com uma ficha USB na ponta (em vez de uma
  // ventosa/pseudópode orgânico) — reforça "vírus de hardware/software",
  // não biológico. Curva-se para fora e para cima como uma hidra.
  function drawVirusTentacle(ctx, x0, y0, x1, y1, x2, y2) {
    ctx.strokeStyle = VG.bodyDark; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x1, y1, x2, y2); ctx.stroke();
    ctx.save();
    ctx.shadowColor = VG.glow; ctx.shadowBlur = 3;
    ctx.strokeStyle = VG.glow; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x1, y1, x2, y2); ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.translate(x2, y2);
    ctx.rotate(Math.atan2(y2 - y1, x2 - x1));
    ctx.fillStyle = "#5a5a66";
    ctx.beginPath(); ctx.roundRect(-2, -5, 10, 10, 2); ctx.fill();
    ctx.strokeStyle = "#000"; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = VG.glow;
    ctx.fillRect(0, -2.5, 5, 5);
    ctx.restore();
  }

  // Bola vírica espinhosa, presa atrás/acima do ecrã — o "capacete" deste
  // boss, no mesmo slot visual do chapéu de pirata (Monstro do Phishing) ou
  // do capuz (Espião das Sombras).
  function drawVirusCrown(ctx) {
    const cx = C + 10, cy = 19, r = 10;
    ctx.save();
    for (let i = 0; i < 9; i++) {
      const a = (Math.PI * 2 * i) / 9;
      const x1 = cx + Math.cos(a) * r, y1 = cy + Math.sin(a) * r;
      const x2 = cx + Math.cos(a) * (r + 6), y2 = cy + Math.sin(a) * (r + 6);
      ctx.strokeStyle = VG.virusDark; ctx.lineWidth = 3.2; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.fillStyle = VG.virusBody;
      ctx.beginPath(); ctx.arc(x2, y2, 2.6, 0, Math.PI * 2); ctx.fill();
    }
    const grad = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, r);
    grad.addColorStop(0, "#ff8a70"); grad.addColorStop(0.5, VG.virusBody); grad.addColorStop(1, VG.virusDark);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#000"; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.restore();
  }

  // Cabeça-ecrã — mesma moldura da família (Monstro do Phishing/Espião das
  // Sombras), com pixels de "glitch" âmbar nos cantos em vez de lisa.
  function drawVirusScreen(ctx) {
    ctx.fillStyle = VG.frameDark;
    ctx.beginPath(); ctx.roundRect(C - 24, 20, 48, 36, 8); ctx.fill();
    ctx.fillStyle = VG.frame;
    ctx.beginPath(); ctx.roundRect(C - 22, 22, 44, 32, 7); ctx.fill();
    ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = VG.screenBg;
    ctx.beginPath(); ctx.roundRect(C - 18, 26, 36, 24, 5); ctx.fill();
    ctx.save();
    ctx.shadowColor = VG.glow; ctx.shadowBlur = 9;
    ctx.strokeStyle = "rgba(255,64,48,0.5)"; ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = VG.glow2;
    [[C - 22, 22], [C + 18, 22], [C - 22, 50], [C + 18, 50]].forEach(([x, y]) => {
      ctx.fillRect(x, y, 4, 4);
    });
  }

  // Torso robótico — bloco mecânico com ombros redondos e um painel de
  // peito com um ícone de vírus e linhas tipo circuito a irradiar, em vez
  // da capa/manto das outras 3 famílias (este boss não é "robed").
  function drawVirusTorso(ctx) {
    const grad = ctx.createLinearGradient(0, C - 4, 0, C + 30);
    grad.addColorStop(0, VG.bodyLight);
    grad.addColorStop(0.55, VG.bodyMid);
    grad.addColorStop(1, VG.bodyDark);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.roundRect(C - 27, C - 6, 54, 36, 8); ctx.fill();
    ctx.strokeStyle = "#000"; ctx.lineWidth = 2.4; ctx.stroke();
    [-30, 30].forEach(dx => {
      ctx.fillStyle = VG.bodyLight;
      ctx.beginPath(); ctx.arc(C + dx, C, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#000"; ctx.lineWidth = 1.8; ctx.stroke();
    });
    ctx.fillStyle = VG.panel;
    ctx.beginPath(); ctx.roundRect(C - 15, C + 2, 30, 20, 3); ctx.fill();
    ctx.strokeStyle = "#000"; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.save();
    ctx.shadowColor = VG.glow; ctx.shadowBlur = 4;
    ctx.strokeStyle = VG.glow; ctx.lineWidth = 1.3;
    [[-13, 12, -2, 7], [13, 12, 2, 7], [-13, 18, -3, 15], [13, 18, 3, 15]].forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath(); ctx.moveTo(C + x1, C + y1); ctx.lineTo(C + x2, C + y2); ctx.stroke();
    });
    ctx.fillStyle = VG.glow;
    ctx.beginPath(); ctx.arc(C, C + 12, 3.6, 0, Math.PI * 2); ctx.fill();
    [0, 1, 2, 3].forEach(i => {
      const a = (Math.PI * 2 * i) / 4 + Math.PI / 4;
      ctx.beginPath(); ctx.arc(C + Math.cos(a) * 3.6, C + 12 + Math.sin(a) * 3.6, 1, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }

  // Botas — mesma construção da família (Monstro do Phishing/Espião das
  // Sombras). Pés a C+49 abaixo do centro — ver bossY em data-bosses.js.
  function drawVirusLegs(ctx) {
    ctx.strokeStyle = "#000"; ctx.lineWidth = 2.4;
    [-15, 15].forEach(dx => {
      ctx.fillStyle = VG.bodyMid;
      ctx.beginPath(); ctx.roundRect(C + dx - 6, C + 26, 12, 14, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = VG.bodyDark;
      ctx.beginPath(); ctx.roundRect(C + dx - 11, C + 36, 22, 13, 4); ctx.fill(); ctx.stroke();
      ctx.save();
      ctx.shadowColor = VG.glow; ctx.shadowBlur = 4;
      ctx.strokeStyle = VG.glow; ctx.lineWidth = 1.8; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(C + dx - 5, C + 42.5); ctx.lineTo(C + dx + 5, C + 42.5); ctx.stroke();
      ctx.restore();
    });
  }

  function drawVirusBody(ctx) {
    bossShadow(ctx);
    drawVirusLegs(ctx);
    drawVirusTorso(ctx);
    // tentáculos atrás do corpo, antes do ecrã, para o ecrã lhes tapar as
    // raízes e a "hidra" parecer sair de trás da cabeça/ombros
    drawVirusTentacle(ctx, C - 24, C - 2, C - 46, C - 28, C - 38, C - 48);
    drawVirusTentacle(ctx, C - 20, C - 6, C - 48, C - 4, C - 53, C + 12);
    drawVirusTentacle(ctx, C + 24, C - 2, C + 46, C - 28, C + 38, C - 48);
    drawVirusTentacle(ctx, C + 20, C - 6, C + 48, C - 4, C + 53, C + 12);
    drawVirusScreen(ctx);
    drawVirusCrown(ctx);
  }

  // Braços: "wave" = as duas garras estendidas, "rest" = mangas simples com
  // garra pequena — mesma gramática das outras 3 famílias.
  function drawVirusArms(ctx, mood) {
    if (mood === "wave") {
      ctx.fillStyle = VG.bodyMid; ctx.strokeStyle = "#000"; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.ellipse(C - 28, C + 8, 12, 17, -0.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(C + 28, C + 8, 12, 17, 0.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      drawVirusClawHand(ctx, C - 30, C + 6, -1);
      drawVirusClawHand(ctx, C + 30, C + 6, 1);
    } else {
      ctx.strokeStyle = "#000"; ctx.lineWidth = 2.2;
      [-30, 30].forEach(dx => {
        ctx.fillStyle = VG.bodyMid;
        ctx.beginPath(); ctx.ellipse(C + dx, C + 10, 8, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = VG.claw;
        ctx.beginPath(); ctx.arc(C + dx, C + 22, 7.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.save();
        ctx.shadowColor = VG.glow; ctx.shadowBlur = 3;
        ctx.fillStyle = VG.glow;
        ctx.beginPath(); ctx.arc(C + dx, C + 22, 2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
    }
  }

  // Cara — mesma gramática das outras 3 famílias (drawPhishingFace/
  // drawGuardiaoFace), em vermelho em vez de ciano/magenta.
  function drawVirusFace(ctx, mood) {
    const ex = 15, ey = 36;
    ctx.save();
    ctx.shadowColor = VG.glow; ctx.shadowBlur = 6;
    ctx.fillStyle = VG.glow; ctx.strokeStyle = VG.glow;

    if (mood === "blink") {
      ctx.lineWidth = 2.4; ctx.lineCap = "round";
      [-ex, ex].forEach(dx => {
        ctx.beginPath(); ctx.moveTo(C + dx - 6, ey); ctx.lineTo(C + dx + 6, ey); ctx.stroke();
      });
    } else if (mood === "ouch") {
      [-ex, ex].forEach(dx => {
        ctx.beginPath(); ctx.arc(C + dx, ey, 6, 0, Math.PI * 2); ctx.fill();
      });
    } else if (mood === "laugh") {
      ctx.lineWidth = 2.6; ctx.lineCap = "round";
      [-ex, ex].forEach(dx => {
        ctx.beginPath(); ctx.arc(C + dx, ey + 2, 6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      });
    } else if (mood === "angry") {
      [-ex, ex].forEach(dx => {
        const side = dx < 0 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(C + dx - 7 * side, ey - 6);
        ctx.lineTo(C + dx + 7 * side, ey + 2);
        ctx.lineTo(C + dx - 2 * side, ey + 6);
        ctx.closePath(); ctx.fill();
      });
    } else if (mood === "sad") {
      ctx.lineWidth = 2; ctx.globalAlpha = 0.35;
      [-ex, ex].forEach(dx => {
        ctx.beginPath(); ctx.arc(C + dx, ey + 2, 4, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
    } else {
      [-ex, ex].forEach(dx => {
        const side = dx < 0 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(C + dx - 7 * side, ey + 5);
        ctx.lineTo(C + dx + 7 * side, ey - 4);
        ctx.lineTo(C + dx + 7 * side, ey + 6);
        ctx.closePath(); ctx.fill();
      });
    }
    ctx.restore();
    if (mood === "sad") return;

    ctx.save();
    ctx.shadowColor = VG.glow; ctx.shadowBlur = 5;
    ctx.fillStyle = VG.glow;
    const my = 47;
    if (mood === "laugh") {
      ctx.beginPath();
      ctx.moveTo(C - 14, 43); ctx.lineTo(C - 8, 50); ctx.lineTo(C - 2, 43); ctx.lineTo(C + 4, 50);
      ctx.lineTo(C + 10, 43); ctx.lineTo(C + 14, 48); ctx.lineTo(C + 14, 52);
      ctx.lineTo(C - 14, 52); ctx.closePath(); ctx.fill();
    } else if (mood === "ouch") {
      ctx.beginPath(); ctx.ellipse(C, my, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(C - 13, my - 3); ctx.lineTo(C - 7, my + 4); ctx.lineTo(C - 1, my - 3); ctx.lineTo(C + 5, my + 4);
      ctx.lineTo(C + 11, my - 3); ctx.lineTo(C + 13, my); ctx.lineTo(C + 13, my + 5);
      ctx.lineTo(C - 13, my + 5); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  if (!scene.textures.exists("boss_virus_gigante")) {
    const tex = scene.textures.createCanvas("boss_virus_gigante", S, S), ctx = tex.getContext();
    drawVirusBody(ctx); drawVirusArms(ctx, "wave"); drawVirusFace(ctx, "normal");
    tex.refresh();
  }
  if (!scene.textures.exists("boss_virus_gigante_armsdown")) {
    const tex = scene.textures.createCanvas("boss_virus_gigante_armsdown", S, S), ctx = tex.getContext();
    drawVirusBody(ctx); drawVirusArms(ctx, "rest"); drawVirusFace(ctx, "normal");
    tex.refresh();
  }
  if (!scene.textures.exists("boss_virus_gigante_blink")) {
    const tex = scene.textures.createCanvas("boss_virus_gigante_blink", S, S), ctx = tex.getContext();
    drawVirusBody(ctx); drawVirusArms(ctx, "rest"); drawVirusFace(ctx, "blink");
    tex.refresh();
  }
  // "ouch" — usado por meio segundo sempre que leva um salto na cabeça.
  if (!scene.textures.exists("boss_virus_gigante_ouch")) {
    const tex = scene.textures.createCanvas("boss_virus_gigante_ouch", S, S), ctx = tex.getContext();
    drawVirusBody(ctx); drawVirusArms(ctx, "wave"); drawVirusFace(ctx, "ouch");
    tex.refresh();
  }
  // Estado "riso maléfico" — entrada em combate.
  if (!scene.textures.exists("boss_virus_gigante_laugh")) {
    const tex = scene.textures.createCanvas("boss_virus_gigante_laugh", S, S), ctx = tex.getContext();
    drawVirusBody(ctx); drawVirusArms(ctx, "rest"); drawVirusFace(ctx, "laugh");
    tex.refresh();
  }
  // Estado "zangado" — durante a escalada de fúria; o motor de jogo aplica
  // também um tint avermelhado por cima deste estado.
  if (!scene.textures.exists("boss_virus_gigante_angry")) {
    const tex = scene.textures.createCanvas("boss_virus_gigante_angry", S, S), ctx = tex.getContext();
    drawVirusBody(ctx); drawVirusArms(ctx, "wave"); drawVirusFace(ctx, "angry");
    tex.refresh();
  }
  // Estado "triste" — derrota: o brilho da cara apaga-se quase todo antes
  // de fugir, tal como o Espião das Sombras.
  if (!scene.textures.exists("boss_virus_gigante_sad")) {
    const tex = scene.textures.createCanvas("boss_virus_gigante_sad", S, S), ctx = tex.getContext();
    drawVirusBody(ctx); drawVirusArms(ctx, "rest"); drawVirusFace(ctx, "sad");
    tex.refresh();
  }

  // ── 3) Espião das Sombras — redesenho "feiticeiro-espião" (pedido:
  // aproximar a aparência de uma segunda ilustração de referência fornecida
  // pelo Berto, desta vez para o boss final) ──────────────────────────────
  // Versão anterior: uma capa/robe lisa cinzento-arroxeada, sem pernas, só
  // com dois olhos ciano a brilhar dentro do capuz — lê-se bem mas não tem
  // nenhuma ligação de família com o resto do elenco (Monstro do Phishing,
  // ver secção 1 acima). Nova versão: usa exactamente a mesma "receita" do
  // Monstro do Phishing (cabeça-ecrã com cara maléfica + capuz/chapéu por
  // cima + garra articulada + botas) para os dois lerem como a mesma
  // família de bosses, mas em roxo-magenta em vez de azul-ciano, com capuz
  // de feiticeiro em vez de chapéu de pirata, um olho-que-tudo-vê bordado
  // no capuz, uma pequena gola com outro olho por baixo do ecrã, um
  // "coletor de dados" no peito (a mochila do espião) e, o mais importante,
  // GARRAS NOS DOIS BRAÇOS em vez de garra+cana — é o boss final, por isso
  // fica mais ameaçador que o Monstro do Phishing (que só tinha uma garra).
  // Continua "stompBoss" com entranceMaterialize/teleport — só a pele muda.
  //
  // Paleta própria (SH), irmã da paleta PH do Monstro do Phishing mas em
  // tons roxo-magenta em vez de azul-ciano — reforça que são a mesma
  // "família visual" de bosses sem serem iguais.
  const SH = {
    cloakDark:  "#120a26",
    cloakMid:   "#241246",
    cloakLight: "#402070",
    glow:       "#ff4fe6",
    glow2:      "#c86bff",
    screenBg:   "#0c0718",
    frame:      "#8a7aad",
    frameDark:  "#4a3d6e",
    belt:       "#2c2245",
    buckle:     "#7a6a98",
    claw:       "#1c0f38",
    clawGlow:   "#ff4fe6",
    hatDark:    "#0e0820",
    panel:      "#180d30"
  };

  // Uma "lâmina" da garra — mesma técnica do Monstro do Phishing
  // (drawClawFinger), mas com um gradiente escuro→magenta ao longo do
  // comprimento em vez de branco/prateado: aqui a garra não é metal polido,
  // é energia sombria condensada, por isso a ponta "acende".
  function drawShadowClawFinger(ctx, wx, wy, angle, len, width) {
    ctx.save();
    ctx.translate(wx, wy);
    ctx.rotate(angle);
    const grad = ctx.createLinearGradient(0, 0, len, 0);
    grad.addColorStop(0, SH.claw);
    grad.addColorStop(0.6, SH.claw);
    grad.addColorStop(1, SH.clawGlow);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -width / 2);
    ctx.quadraticCurveTo(len * 0.3, -width * 0.4, len * 0.72, -width * 0.08);
    ctx.lineTo(len, 0);
    ctx.lineTo(len * 0.72, width * 0.08);
    ctx.quadraticCurveTo(len * 0.3, width * 0.4, 0, width / 2);
    ctx.closePath();
    ctx.save();
    ctx.shadowColor = SH.clawGlow; ctx.shadowBlur = 5;
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "#000"; ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,79,230,0.55)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(len * 0.34, -width * 0.3); ctx.lineTo(len * 0.34, width * 0.3); ctx.stroke();
    ctx.restore();
  }

  // Mão inteira (palma + 3 dedos), reutilizada dos dois lados — "spread"
  // (-1 ou 1) inverte o leque para a garra abrir sempre para fora do corpo,
  // qualquer que seja o braço.
  function drawShadowClawHand(ctx, wx, wy, spread) {
    ctx.fillStyle = SH.cloakMid; ctx.strokeStyle = "#000"; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.ellipse(wx, wy, 12, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    drawShadowClawFinger(ctx, wx - 4, wy - 13, -0.6 * spread, 19, 8.5);
    drawShadowClawFinger(ctx, wx - 6, wy + 1, -0.08 * spread, 22, 9.5);
    drawShadowClawFinger(ctx, wx - 4, wy + 14, 0.48 * spread, 18, 8.5);
  }

  // Capa: mesma silhueta com bainha em zigue-zague do Monstro do Phishing
  // (drawPhishingCloak), em tons roxo-magenta. Cinto igual (fivela simples,
  // sem anzol — este boss não tem tema de "isco"). Em vez do crachá de
  // email falso, um pequeno "coletor de dados" no peito — duas ranhuras a
  // brilhar, como um leitor a copiar informação.
  function drawShadowCloak(ctx) {
    const grad = ctx.createLinearGradient(0, C - 14, 0, C + 34);
    grad.addColorStop(0, SH.cloakLight);
    grad.addColorStop(0.55, SH.cloakMid);
    grad.addColorStop(1, SH.cloakDark);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(C - 30, C - 6);
    ctx.quadraticCurveTo(C - 42, C + 10, C - 34, C + 24);
    ctx.lineTo(C - 27, C + 21);
    ctx.lineTo(C - 19, C + 35);
    ctx.lineTo(C - 9, C + 23);
    ctx.lineTo(C, C + 37);
    ctx.lineTo(C + 9, C + 23);
    ctx.lineTo(C + 19, C + 35);
    ctx.lineTo(C + 27, C + 21);
    ctx.lineTo(C + 34, C + 24);
    ctx.quadraticCurveTo(C + 42, C + 10, C + 30, C - 6);
    ctx.quadraticCurveTo(C, C - 18, C - 30, C - 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#000"; ctx.lineWidth = 2.6;
    ctx.stroke();
    ctx.save();
    ctx.shadowColor = SH.glow2; ctx.shadowBlur = 7;
    ctx.strokeStyle = "rgba(200,107,255,0.5)"; ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = SH.belt;
    ctx.beginPath(); ctx.roundRect(C - 29, C + 6, 58, 9, 3); ctx.fill();
    ctx.strokeStyle = "#000"; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = SH.buckle;
    ctx.beginPath(); ctx.roundRect(C - 8, C + 4, 16, 13, 3); ctx.fill(); ctx.stroke();
    ctx.save();
    ctx.shadowColor = SH.glow; ctx.shadowBlur = 4;
    ctx.fillStyle = SH.glow;
    ctx.beginPath(); ctx.arc(C, C + 10.5, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // coletor de dados — a "mochila" do espião, ao peito
    ctx.fillStyle = SH.panel;
    ctx.beginPath(); ctx.roundRect(C - 13, C - 8, 26, 17, 3); ctx.fill();
    ctx.strokeStyle = "#000"; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.save();
    ctx.shadowColor = SH.glow; ctx.shadowBlur = 5;
    ctx.fillStyle = SH.glow;
    ctx.beginPath(); ctx.roundRect(C - 9, C - 4, 18, 4, 2); ctx.fill();
    ctx.beginPath(); ctx.roundRect(C - 9, C + 2, 10, 4, 2); ctx.fill();
    ctx.restore();
  }

  // Botas — idênticas em construção às do Monstro do Phishing
  // (drawPhishingLegs), só recolorida. Pés a C+49 abaixo do centro, a
  // mesma medida da outra família — ver bossY em data-bosses.js.
  function drawShadowLegs(ctx) {
    ctx.strokeStyle = "#000"; ctx.lineWidth = 2.4;
    [-15, 15].forEach(dx => {
      ctx.fillStyle = SH.cloakMid;
      ctx.beginPath(); ctx.roundRect(C + dx - 6, C + 26, 12, 14, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = SH.hatDark;
      ctx.beginPath(); ctx.roundRect(C + dx - 11, C + 36, 22, 13, 4); ctx.fill(); ctx.stroke();
      ctx.save();
      ctx.shadowColor = SH.glow; ctx.shadowBlur = 4;
      ctx.strokeStyle = SH.glow; ctx.lineWidth = 1.8; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(C + dx - 5, C + 42.5); ctx.lineTo(C + dx + 5, C + 42.5); ctx.stroke();
      ctx.restore();
    });
  }

  // Cabeça-ecrã — moldura igual à do Monstro do Phishing (mesma função de
  // desenho, só que aqui inclui também a pequena gola com um segundo olho
  // por baixo, tal como na ilustração de referência deste boss.
  function drawShadowScreen(ctx) {
    ctx.fillStyle = SH.frameDark;
    ctx.beginPath(); ctx.roundRect(C - 24, 20, 48, 36, 8); ctx.fill();
    ctx.fillStyle = SH.frame;
    ctx.beginPath(); ctx.roundRect(C - 22, 22, 44, 32, 7); ctx.fill();
    ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = SH.screenBg;
    ctx.beginPath(); ctx.roundRect(C - 18, 26, 36, 24, 5); ctx.fill();
    ctx.save();
    ctx.shadowColor = SH.glow; ctx.shadowBlur = 9;
    ctx.strokeStyle = "rgba(255,79,230,0.5)"; ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    // gola com um segundo "olho", por baixo do ecrã
    ctx.fillStyle = SH.frameDark;
    ctx.beginPath(); ctx.arc(C, 60, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#000"; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = SH.panel;
    ctx.beginPath(); ctx.arc(C, 60, 4.6, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.shadowColor = SH.glow; ctx.shadowBlur = 5;
    ctx.fillStyle = SH.glow;
    ctx.beginPath(); ctx.ellipse(C, 60, 3, 1.7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Capuz de feiticeiro — desenhado ANTES do ecrã (ver drawShadowBody) para
  // que a cabeça-ecrã, desenhada por cima, "corte" a zona central e deixe
  // só a auréola do capuz visível no topo e nas laterais, tal como na
  // ilustração de referência. O emblema — um olho-que-tudo-vê bordado —
  // fica no pico, por isso continua visível acima do ecrã.
  function drawShadowHood(ctx) {
    const grad = ctx.createLinearGradient(C - 34, 0, C + 34, 54);
    grad.addColorStop(0, SH.cloakLight);
    grad.addColorStop(1, SH.cloakDark);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(C - 33, 55);
    ctx.quadraticCurveTo(C - 40, 24, C - 17, 6);
    ctx.quadraticCurveTo(C - 6, -1, C + 6, -1);
    ctx.quadraticCurveTo(C + 17, 6, C + 40, 24);
    ctx.quadraticCurveTo(C + 33, 55, C + 20, 46);
    ctx.quadraticCurveTo(C, 40, C - 20, 46);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#000"; ctx.lineWidth = 2.4; ctx.stroke();
    ctx.save();
    ctx.shadowColor = SH.glow2; ctx.shadowBlur = 6;
    ctx.strokeStyle = "rgba(200,107,255,0.5)"; ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.shadowColor = SH.glow; ctx.shadowBlur = 6;
    ctx.strokeStyle = SH.glow; ctx.lineWidth = 1.6; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(C - 9, 11); ctx.quadraticCurveTo(C, 5, C + 9, 11);
    ctx.quadraticCurveTo(C, 15, C - 9, 11);
    ctx.stroke();
    ctx.fillStyle = SH.glow;
    ctx.beginPath(); ctx.arc(C, 11, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawGuardiaoBody(ctx) {
    bossShadow(ctx);
    drawShadowLegs(ctx);
    drawShadowCloak(ctx);
    drawShadowHood(ctx);
    drawShadowScreen(ctx);
  }

  // Braços: "wave" = as duas garras estendidas (mais ameaçador que o
  // Monstro do Phishing, que só tinha uma) — cada uma nasce de um antebraço
  // com anéis a brilhar, igual ao braço blindado do Monstro. "rest" =
  // mangas simples com uma garra pequena na ponta, para os estados calmos.
  function drawGuardiaoArms(ctx, mood) {
    if (mood === "wave") {
      ctx.fillStyle = SH.cloakMid; ctx.strokeStyle = "#000"; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.ellipse(C - 28, C + 4, 12, 17, -0.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(C + 28, C + 4, 12, 17, 0.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.save();
      ctx.strokeStyle = SH.glow; ctx.lineWidth = 1.6; ctx.shadowColor = SH.glow; ctx.shadowBlur = 3;
      [[-28, -0.25], [28, 0.25]].forEach(([dx, rot]) => {
        ctx.save(); ctx.translate(C + dx, C + 4); ctx.rotate(rot);
        ctx.beginPath(); ctx.ellipse(0, 0, 12, 4.5, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      });
      ctx.restore();
      drawShadowClawHand(ctx, C - 33, C + 2, -1);
      drawShadowClawHand(ctx, C + 33, C + 2, 1);
    } else {
      ctx.strokeStyle = "#000"; ctx.lineWidth = 2.2;
      [-33, 33].forEach(dx => {
        ctx.fillStyle = SH.cloakMid;
        ctx.beginPath(); ctx.ellipse(C + dx, C + 6, 8, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = SH.claw;
        ctx.beginPath(); ctx.arc(C + dx, C + 18, 7.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.save();
        ctx.shadowColor = SH.glow; ctx.shadowBlur = 3;
        ctx.fillStyle = SH.glow;
        ctx.beginPath(); ctx.arc(C + dx, C + 18, 2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
    }
  }

  // Cara — mesma gramática do Monstro do Phishing (drawPhishingFace), em
  // magenta em vez de ciano. O estado "triste" aqui é diferente de
  // propósito: em vez de olhos caídos, o ecrã praticamente apaga-se (só
  // resta um fiapo de luz) — mais coerente com "espião das sombras a
  // perder o seu poder" do que uma cara triste desenhada.
  function drawGuardiaoFace(ctx, mood) {
    const ex = 15, ey = 36;
    ctx.save();
    ctx.shadowColor = SH.glow; ctx.shadowBlur = 6;
    ctx.fillStyle = SH.glow; ctx.strokeStyle = SH.glow;

    if (mood === "blink") {
      ctx.lineWidth = 2.4; ctx.lineCap = "round";
      [-ex, ex].forEach(dx => {
        ctx.beginPath(); ctx.moveTo(C + dx - 6, ey); ctx.lineTo(C + dx + 6, ey); ctx.stroke();
      });
    } else if (mood === "ouch") {
      [-ex, ex].forEach(dx => {
        ctx.beginPath(); ctx.arc(C + dx, ey, 6, 0, Math.PI * 2); ctx.fill();
      });
    } else if (mood === "laugh") {
      ctx.lineWidth = 2.6; ctx.lineCap = "round";
      [-ex, ex].forEach(dx => {
        ctx.beginPath(); ctx.arc(C + dx, ey + 2, 6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      });
    } else if (mood === "angry") {
      [-ex, ex].forEach(dx => {
        const side = dx < 0 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(C + dx - 7 * side, ey - 6);
        ctx.lineTo(C + dx + 7 * side, ey + 2);
        ctx.lineTo(C + dx - 2 * side, ey + 6);
        ctx.closePath(); ctx.fill();
      });
    } else if (mood === "sad") {
      ctx.lineWidth = 2; ctx.globalAlpha = 0.35;
      [-ex, ex].forEach(dx => {
        ctx.beginPath(); ctx.arc(C + dx, ey + 2, 4, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
    } else {
      [-ex, ex].forEach(dx => {
        const side = dx < 0 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(C + dx - 7 * side, ey + 5);
        ctx.lineTo(C + dx + 7 * side, ey - 4);
        ctx.lineTo(C + dx + 7 * side, ey + 6);
        ctx.closePath(); ctx.fill();
      });
    }
    ctx.restore();
    if (mood === "sad") return;

    ctx.save();
    ctx.shadowColor = SH.glow; ctx.shadowBlur = 5;
    ctx.fillStyle = SH.glow;
    const my = 47;
    if (mood === "laugh") {
      ctx.beginPath();
      ctx.moveTo(C - 14, 43); ctx.lineTo(C - 8, 50); ctx.lineTo(C - 2, 43); ctx.lineTo(C + 4, 50);
      ctx.lineTo(C + 10, 43); ctx.lineTo(C + 14, 48); ctx.lineTo(C + 14, 52);
      ctx.lineTo(C - 14, 52); ctx.closePath(); ctx.fill();
    } else if (mood === "ouch") {
      ctx.beginPath(); ctx.ellipse(C, my, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(C - 13, my - 3); ctx.lineTo(C - 7, my + 4); ctx.lineTo(C - 1, my - 3); ctx.lineTo(C + 5, my + 4);
      ctx.lineTo(C + 11, my - 3); ctx.lineTo(C + 13, my); ctx.lineTo(C + 13, my + 5);
      ctx.lineTo(C - 13, my + 5); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  if (!scene.textures.exists("boss_espiao_sombras")) {
    const tex = scene.textures.createCanvas("boss_espiao_sombras", S, S), ctx = tex.getContext();
    drawGuardiaoBody(ctx); drawGuardiaoArms(ctx, "wave"); drawGuardiaoFace(ctx, "normal");
    tex.refresh();
  }
  if (!scene.textures.exists("boss_espiao_sombras_armsdown")) {
    const tex = scene.textures.createCanvas("boss_espiao_sombras_armsdown", S, S), ctx = tex.getContext();
    drawGuardiaoBody(ctx); drawGuardiaoArms(ctx, "rest"); drawGuardiaoFace(ctx, "normal");
    tex.refresh();
  }
  if (!scene.textures.exists("boss_espiao_sombras_blink")) {
    const tex = scene.textures.createCanvas("boss_espiao_sombras_blink", S, S), ctx = tex.getContext();
    drawGuardiaoBody(ctx); drawGuardiaoArms(ctx, "rest"); drawGuardiaoFace(ctx, "blink");
    tex.refresh();
  }
  // "ouch": braços em garra levantados em choque + olhos redondos
  // esbugalhados — a mesma reação do Monstro do Phishing.
  if (!scene.textures.exists("boss_espiao_sombras_ouch")) {
    const tex = scene.textures.createCanvas("boss_espiao_sombras_ouch", S, S), ctx = tex.getContext();
    drawGuardiaoBody(ctx); drawGuardiaoArms(ctx, "wave"); drawGuardiaoFace(ctx, "ouch");
    tex.refresh();
  }
  // Estado "riso maléfico" — entrada em combate: confiante que a escuridão
  // vai vencer.
  if (!scene.textures.exists("boss_espiao_sombras_laugh")) {
    const tex = scene.textures.createCanvas("boss_espiao_sombras_laugh", S, S), ctx = tex.getContext();
    drawGuardiaoBody(ctx); drawGuardiaoArms(ctx, "rest"); drawGuardiaoFace(ctx, "laugh");
    tex.refresh();
  }
  // Estado "zangado" — durante a escalada de fúria; o motor de jogo aplica
  // também um tint avermelhado por cima deste estado.
  if (!scene.textures.exists("boss_espiao_sombras_angry")) {
    const tex = scene.textures.createCanvas("boss_espiao_sombras_angry", S, S), ctx = tex.getContext();
    drawGuardiaoBody(ctx); drawGuardiaoArms(ctx, "wave"); drawGuardiaoFace(ctx, "angry");
    tex.refresh();
  }
  // Estado "triste" — derrota: o brilho da cara apaga-se quase todo (ver
  // comentário em drawGuardiaoFace) antes de fugir, em vez de uma cara
  // triste desenhada — mais coerente com "sombra a perder o poder".
  if (!scene.textures.exists("boss_espiao_sombras_sad")) {
    const tex = scene.textures.createCanvas("boss_espiao_sombras_sad", S, S), ctx = tex.getContext();
    drawGuardiaoBody(ctx); drawGuardiaoArms(ctx, "rest"); drawGuardiaoFace(ctx, "sad");
    tex.refresh();
  }

  // ── 4) Poluidor Mecânico — redesenho (pedido: "esteticamente pode ser
  // muito melhor" + expressões "mais vincadas") ──────────────────────────
  // Antes: um só LED vermelho ao centro mudava de forma ligeiramente entre
  // TODOS os estados (normal/riso/zangado/triste/choque) — daí serem quase
  // impossíveis de distinguir. Agora tem uma cara a sério, com a mesma
  // gramática visual legível dos outros 3 bosses (sobrancelhas + 2 olhos +
  // boca), só que em versão mecânica: duas lentes num visor escuro
  // embutido, sobrancelhas em forma de placas de metal articuladas, e uma
  // boca-grelha cuja FORMA muda por completo por estado (não só o brilho).
  // O corpo também ganhou mais detalhe/leitura: faixa de perigo
  // amarela/preta, manchas de ferrugem, e uma base de lagartas/rodas para
  // deixar de parecer que flutua — agora está mesmo "pousado" no chão,
  // como convém a um robô industrial pesado.
  function drawPoluidorBody(ctx){
    bossShadow(ctx);
    // envelopes de spam a transbordar da tampa — mais vívidos/coloridos e
    // maiores que antes (pedido: aproximar de uma ilustração de
    // referência), para ler como "a entupir" em vez de um sussurro pálido.
    [[C-14,C-42,-0.3,"#e8352a"],[C-2,C-48,0.15,"#fffaff"],[C+10,C-43,-0.15,"#2c5aa0"],
     [C+2,C-53,0.35,"#fffaff"],[C-10,C-54,-0.25,"#e8352a"]].forEach(([x,y,a,col])=>{
      ctx.save(); ctx.translate(x,y); ctx.rotate(a);
      ctx.fillStyle=col;
      ctx.beginPath(); ctx.roundRect(-8,-6,16,11,1.5); ctx.fill();
      ctx.strokeStyle="#3a0a06"; ctx.lineWidth=1.2; ctx.stroke();
      ctx.strokeStyle = col==="#fffaff" ? "#c7291f" : "rgba(255,255,255,0.85)";
      ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(-8,-6); ctx.lineTo(0,1.5); ctx.lineTo(8,-6); ctx.stroke();
      ctx.restore();
    });
    // tampa da caixa de correio — maior e com uma aba interior mais escura
    // por baixo do rebordo, para ler como "aberta em 3D" em vez de um
    // telhadinho plano.
    ctx.fillStyle="#c72a20";
    ctx.beginPath();
    ctx.moveTo(C-22,C-30); ctx.lineTo(C+22,C-30); ctx.lineTo(C+15,C-45); ctx.lineTo(C-15,C-45);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle="#7a140e"; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle="#8a1a12";
    ctx.beginPath(); ctx.moveTo(C-15,C-45); ctx.lineTo(C+15,C-45); ctx.lineTo(C+15,C-41); ctx.lineTo(C-15,C-41); ctx.closePath(); ctx.fill();
    ctx.fillStyle="#fffaff";
    ctx.beginPath(); ctx.roundRect(C-8,C-41,16,7,1); ctx.fill();
    // fresta escura por baixo da tampa (a "boca" por onde sai o spam)
    ctx.fillStyle="#3a0a06"; ctx.fillRect(C-18,C-31,36,4);
    // corpo — caixa metálica, gradiente vermelho vivo com mais contraste
    const gr=ctx.createLinearGradient(C-30,C-22,C+30,C+26);
    gr.addColorStop(0,"#e8564a"); gr.addColorStop(0.5,"#c7291f"); gr.addColorStop(1,"#7a140e");
    ctx.fillStyle=gr;
    rrPath(ctx,C-30,C-22,60,44,4); ctx.fill();
    ctx.strokeStyle="#4a0d08"; ctx.lineWidth=2.5; ctx.stroke();
    // faixa de perigo amarela/preta — ao longo da base do corpo
    ctx.save();
    rrPath(ctx,C-30,C+10,60,12,3); ctx.clip();
    ctx.fillStyle="#1c1c1c"; ctx.fillRect(C-30,C+10,60,12);
    ctx.fillStyle="#e8c73c";
    for(let x=-36;x<40;x+=10){
      ctx.save(); ctx.translate(C+x,C+16); ctx.rotate(Math.PI/4);
      ctx.fillRect(-3,-11,6,22);
      ctx.restore();
    }
    ctx.restore();
    // riscos/amolgadelas — decorativos, baixa opacidade (em vez de ferrugem,
    // que não fazia sentido num robô vermelho novo)
    ctx.fillStyle="rgba(30,10,8,0.3)";
    [[C-23,C-12,5],[C+21,C+2,4],[C-15,C+1,3]].forEach(([x,y,r])=>{
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    });
    // rebites
    ctx.fillStyle="#3a0d08";
    [[-25,-17],[25,-17],[-25,-3],[25,-3]].forEach(([dx,dy])=>{
      ctx.beginPath(); ctx.arc(C+dx,C+dy,2.2,0,Math.PI*2); ctx.fill();
    });
    // ombros — anel azul (pauldron) por trás da engrenagem, a condizer
    // com a junta azul dos braços na imagem de referência
    [[-30,-4],[30,-4]].forEach(([dx,dy])=>{
      const gx=C+dx, gy=C+dy;
      ctx.fillStyle="#2c5aa0";
      ctx.beginPath(); ctx.arc(gx,gy,10,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle="#1c3a6a"; ctx.lineWidth=1.5; ctx.stroke();
      ctx.fillStyle="#38383e";
      for(let i=0;i<8;i++){
        const a=(Math.PI*2*i)/8;
        ctx.save(); ctx.translate(gx,gy); ctx.rotate(a);
        ctx.fillRect(-2,-11,4,5);
        ctx.restore();
      }
      ctx.beginPath(); ctx.arc(gx,gy,7,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#c7291f"; ctx.beginPath(); ctx.arc(gx,gy,3,0,Math.PI*2); ctx.fill();
    });
    // base com propulsores azuis — deixa de parecer que flutua
    ctx.fillStyle="#1c1c22";
    rrPath(ctx,C-28,C+22,56,13,3); ctx.fill();
    ctx.strokeStyle="#0e0e12"; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle="#2c5aa0";
    [-20,-7,7,20].forEach(dx=>{
      ctx.beginPath(); ctx.arc(C+dx,C+28,4.2,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#ff4030"; ctx.beginPath(); ctx.arc(C+dx,C+28,1.6,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#2c5aa0";
    });
    // visor — painel escuro só para os olhos (sem grelha de boca, como na
    // imagem de referência: só duas fendas a brilhar no preto)
    ctx.fillStyle="#12100e";
    rrPath(ctx,C-23,C-19,46,17,3); ctx.fill();
    ctx.strokeStyle="#0e0f0a"; ctx.lineWidth=2; ctx.stroke();
    // ventilação — 4 riscas finas acima dos olhos, como na imagem
    ctx.strokeStyle="#38383e"; ctx.lineWidth=1.4;
    for(let i=0;i<4;i++){ const x=C-6+i*4; ctx.beginPath(); ctx.moveTo(x,C-16); ctx.lineTo(x,C-13); ctx.stroke(); }
    // compartimento inferior — grelha metálica com o correio-lixo lá dentro
    // à vista, tal como o "porão" cheio de envelopes da imagem de referência
    ctx.fillStyle="#4a4a52";
    rrPath(ctx,C-23,C-1,46,13,3); ctx.fill();
    ctx.strokeStyle="#242428"; ctx.lineWidth=2; ctx.stroke();
    ctx.save();
    rrPath(ctx,C-20,C+1.5,40,8,2); ctx.clip();
    ctx.fillStyle="#1c1a1a"; ctx.fillRect(C-20,C+1.5,40,8);
    const envColors=["#e8352a","#fffaff","#2c5aa0","#fffaff","#e8352a","#2c5aa0"];
    envColors.forEach((col,i)=>{
      ctx.save();
      ctx.translate(C-17+i*7, C+5.5+((i%2)?1.5:-1));
      ctx.rotate((i%2?1:-1)*0.25);
      ctx.fillStyle=col; ctx.fillRect(-3.2,-2.6,6.4,5.2);
      ctx.restore();
    });
    ctx.restore();
    ctx.fillStyle="#26262c";
    [[-19,2.5],[19,2.5],[-19,10],[19,10]].forEach(([dx,dy])=>{
      ctx.beginPath(); ctx.arc(C+dx,C+dy,1.5,0,Math.PI*2); ctx.fill();
    });
    // triângulo de aviso — pequeno pormenor amarelo/preto no peito, do
    // lado esquerdo, como na imagem
    ctx.save(); ctx.translate(C-27,C-4);
    ctx.fillStyle="#e8c73c";
    ctx.beginPath(); ctx.moveTo(0,-5); ctx.lineTo(4.5,4); ctx.lineTo(-4.5,4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle="#1c1c1c"; ctx.lineWidth=1; ctx.stroke();
    ctx.fillStyle="#1c1c1c";
    ctx.fillRect(-0.6,-2,1.2,4.5); ctx.beginPath(); ctx.arc(0,3.3,0.9,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
  // Braços mecânicos: tubo articulado (2 segmentos, anéis azuis nas
  // juntas) + pinça de 3 dentes na ponta — redesenho (pedido: aproximar de
  // uma ilustração de referência) do leque de garras triangulares anterior,
  // que a esta escala lia como "asa de morcego" em vez de um braço.
  // "wave" estendido para o lado (a agarrar), "rest" dobrado ao longo do
  // corpo, sem tocar na fiada de rodas.
  function drawPoluidorArms(ctx, mood){
    if (mood === "wave") {
      [-1,1].forEach(side=>{
        const sx=C+side*28, sy=C-2;
        const mx=sx+side*14, my=sy-13;
        const ex=sx+side*23, ey=sy-7;
        ctx.strokeStyle="#3a3a42"; ctx.lineWidth=9; ctx.lineCap="round";
        ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(mx,my); ctx.stroke();
        ctx.lineWidth=7.5;
        ctx.beginPath(); ctx.moveTo(mx,my); ctx.lineTo(ex,ey); ctx.stroke();
        [[sx,sy],[mx,my]].forEach(([jx,jy])=>{
          ctx.fillStyle="#2c5aa0"; ctx.beginPath(); ctx.arc(jx,jy,6,0,Math.PI*2); ctx.fill();
          ctx.strokeStyle="#1c3a6a"; ctx.lineWidth=1.4; ctx.stroke();
        });
        // pinça — 2 dedos a abrir em V + 1 polegar curto
        ctx.save();
        ctx.translate(ex,ey);
        ctx.rotate(Math.atan2(ey-my, ex-mx));
        ctx.fillStyle="#4a4a52"; ctx.strokeStyle="#18181c"; ctx.lineWidth=1.6;
        [[-0.5,14],[0.55,15],[0.05,-9]].forEach(([da,len])=>{
          ctx.save(); ctx.rotate(da);
          ctx.beginPath();
          ctx.moveTo(0,-3); ctx.lineTo(len*0.8,-1.5); ctx.lineTo(len,0); ctx.lineTo(len*0.8,1.5); ctx.lineTo(0,3);
          ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.restore();
        });
        ctx.restore();
        ctx.fillStyle="#ff4030";
        ctx.beginPath(); ctx.arc(sx,sy,2.6,0,Math.PI*2); ctx.fill();
      });
    } else {
      [-1,1].forEach(side=>{
        const sx=C+side*28, sy=C-2;
        const mx=sx+side*17, my=sy+13;
        const ex=sx+side*21, ey=sy+24;
        ctx.strokeStyle="#3a3a42"; ctx.lineWidth=9; ctx.lineCap="round";
        ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(mx,my); ctx.stroke();
        ctx.lineWidth=7.5;
        ctx.beginPath(); ctx.moveTo(mx,my); ctx.lineTo(ex,ey); ctx.stroke();
        [[sx,sy],[mx,my]].forEach(([jx,jy])=>{
          ctx.fillStyle="#2c5aa0"; ctx.beginPath(); ctx.arc(jx,jy,6,0,Math.PI*2); ctx.fill();
          ctx.strokeStyle="#1c3a6a"; ctx.lineWidth=1.4; ctx.stroke();
        });
        ctx.fillStyle="#4a4a52"; ctx.strokeStyle="#18181c"; ctx.lineWidth=1.6;
        ctx.beginPath(); ctx.arc(ex,ey,6.5,0,Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.fillStyle="#ff4030";
        ctx.beginPath(); ctx.arc(sx,sy,2.6,0,Math.PI*2); ctx.fill();
      });
    }
  }
  // Sobrancelhas mecânicas — placas de metal articuladas, uma por estado,
  // com um rebite no ponto de fixação. Ângulos bem diferentes entre si
  // (pedido: "mais vincado") para se lerem à distância.
  function drawPoluidorBrow(ctx, mood){
    ctx.strokeStyle="#1c1e14"; ctx.lineWidth=5; ctx.lineCap="round";
    const VT = C-19; // borda de cima do visor — as sobrancelhas ficam mesmo por cima
    const shapes = {
      normal:  [[C-21,VT-6,C-7,VT-4],[C+7,VT-4,C+21,VT-6]],
      laugh:   [[C-21,VT-9,C-6,VT-5],[C+6,VT-5,C+21,VT-9]],
      angry:   [[C-21,VT-10,C-6,VT+2],[C+6,VT+2,C+21,VT-10]],
      sad:     [[C-21,VT+0,C-6,VT-7],[C+6,VT-7,C+21,VT+0]],
      ouch:    [[C-22,VT-12,C-5,VT-10],[C+5,VT-10,C+22,VT-12]],
    };
    (shapes[mood]||shapes.normal).forEach(([x1,y1,x2,y2])=>{
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    });
    ctx.fillStyle="#4a4a3a";
    [-14,14].forEach(dx=>{ ctx.beginPath(); ctx.arc(C+dx,VT-6,2,0,Math.PI*2); ctx.fill(); });
  }
  // Fenda angulada e hostil (pedido: aproximar de uma ilustração de
  // referência) — antes era um losango mais "gema/jóia"; agora é uma fenda
  // esguia e assimétrica, como um visor de ódio. Tamanho/cor variam por
  // estado. "blink" fecha-as como um obturador mecânico.
  function drawPoluidorEyes(ctx, mood){
    const pos=[[-10,-9],[10,-9]];
    if (mood==="blink"){
      ctx.strokeStyle="#ff4030"; ctx.lineWidth=2.5; ctx.lineCap="round";
      ctx.shadowColor="#ff4030"; ctx.shadowBlur=5;
      pos.forEach(([dx,dy])=>{ ctx.beginPath(); ctx.moveTo(C+dx-4,C+dy); ctx.lineTo(C+dx+4,C+dy); ctx.stroke(); });
      ctx.shadowBlur=0;
      return;
    }
    let s=1, color="#ff4030", dyAdj=0;
    if (mood==="angry"){ s=1.2; color="#ff2010"; }
    if (mood==="laugh"){ s=0.9; color="#ff6030"; }
    if (mood==="ouch"){  s=1.3; color="#ffffff"; }
    if (mood==="sad"){   s=0.8; color="#ff8070"; dyAdj=3; }
    pos.forEach(([dx,dy],i)=>{
      const side = i===0 ? -1 : 1;
      const ex=C+dx, ey=C+dy+dyAdj;
      ctx.save();
      ctx.shadowColor=color; ctx.shadowBlur=7;
      ctx.fillStyle=color;
      ctx.beginPath();
      ctx.moveTo(ex-side*9*s, ey+2*s);
      ctx.lineTo(ex+side*2*s, ey-4*s);
      ctx.lineTo(ex+side*9*s, ey-1*s);
      ctx.lineTo(ex+side*2*s, ey+3.5*s);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    });
  }
  // Reúne sobrancelhas + olhos — um só ponto de entrada por estado,
  // reaproveitado pelos 7 blocos de textura abaixo. Sem boca-grelha: a
  // imagem de referência só tem os olhos a brilhar no visor preto.
  function drawPoluidorFace(ctx, mood){
    drawPoluidorBrow(ctx, mood);
    drawPoluidorEyes(ctx, mood);
  }
  if(!scene.textures.exists("boss_robo_spam")){
    const tex=scene.textures.createCanvas("boss_robo_spam",S,S), ctx=tex.getContext();
    drawPoluidorBody(ctx); drawPoluidorArms(ctx,"wave"); drawPoluidorFace(ctx,"normal");
    tex.refresh();
  }
  if(!scene.textures.exists("boss_robo_spam_armsdown")){
    const tex=scene.textures.createCanvas("boss_robo_spam_armsdown",S,S), ctx=tex.getContext();
    drawPoluidorBody(ctx); drawPoluidorArms(ctx,"rest"); drawPoluidorFace(ctx,"normal");
    tex.refresh();
  }
  if(!scene.textures.exists("boss_robo_spam_blink")){
    const tex=scene.textures.createCanvas("boss_robo_spam_blink",S,S), ctx=tex.getContext();
    drawPoluidorBody(ctx); drawPoluidorArms(ctx,"wave"); drawPoluidorFace(ctx,"blink");
    tex.refresh();
  }
  // "ouch" — sobrancelhas esbugalhadas, olhos brancos de sobrecarga, boca
  // ovalada bem aberta + faíscas dos cantos do visor.
  if(!scene.textures.exists("boss_robo_spam_ouch")){
    const tex=scene.textures.createCanvas("boss_robo_spam_ouch",S,S), ctx=tex.getContext();
    drawPoluidorBody(ctx); drawPoluidorArms(ctx,"rest"); drawPoluidorFace(ctx,"ouch");
    ctx.strokeStyle="#ffe85c"; ctx.lineWidth=2; ctx.lineCap="round";
    [[C-21,C-12,C-29,C-22],[C+21,C-12,C+29,C-22],[C-17,C+12,C-25,C+20]].forEach(([x1,y1,x2,y2])=>{
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    });
    tex.refresh();
  }
  // "riso maléfico" — entrada em combate: sobrancelhas trocistas erguidas
  // nas pontas, lentes com brilho quente, boca-grelha bem aberta a rir.
  if(!scene.textures.exists("boss_robo_spam_laugh")){
    const tex=scene.textures.createCanvas("boss_robo_spam_laugh",S,S), ctx=tex.getContext();
    drawPoluidorBody(ctx); drawPoluidorArms(ctx,"wave"); drawPoluidorFace(ctx,"laugh");
    tex.refresh();
  }
  // "zangado" (vermelho) — sobrancelhas em V bem carregado, lentes maiores
  // e mais intensas, boca em grelha cerrada/dentada. O motor de jogo
  // aplica também um tint por cima deste estado.
  if(!scene.textures.exists("boss_robo_spam_angry")){
    const tex=scene.textures.createCanvas("boss_robo_spam_angry",S,S), ctx=tex.getContext();
    drawPoluidorBody(ctx); drawPoluidorArms(ctx,"wave"); drawPoluidorFace(ctx,"angry");
    tex.refresh();
  }
  // "triste" — derrota: sobrancelhas preocupadas (caídas para dentro),
  // lentes pequenas e baças, boca-grelha descaída, antes de fugir a coxear.
  if(!scene.textures.exists("boss_robo_spam_sad")){
    const tex=scene.textures.createCanvas("boss_robo_spam_sad",S,S), ctx=tex.getContext();
    drawPoluidorBody(ctx); drawPoluidorArms(ctx,"rest"); drawPoluidorFace(ctx,"sad");
    tex.refresh();
  }

  // ── Projéteis do Monstro da Ignorância — livro bom vs. livro mau ────
  // Muito diferentes ao olhar: dourado/brilhante vs. escuro/rabiscado com X vermelho.
  if(!scene.textures.exists("boss_proj_book")){
    const w=34,h=28,tex=scene.textures.createCanvas("boss_proj_book",w,h), ctx=tex.getContext();
    ctx.shadowColor="rgba(255,220,80,0.8)"; ctx.shadowBlur=9;
    // capa
    const gr=ctx.createLinearGradient(2,2,w-2,h-2);
    gr.addColorStop(0,"#fff2b0"); gr.addColorStop(0.5,"#ffd23f"); gr.addColorStop(1,"#e08a00");
    ctx.fillStyle=gr; rrPath(ctx,2,2,w-4,h-4,4); ctx.fill();
    ctx.shadowBlur=0;
    ctx.strokeStyle="#8a5200"; ctx.lineWidth=2; ctx.stroke();
    // lombada
    ctx.strokeStyle="rgba(138,82,0,0.6)"; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(w/2,3); ctx.lineTo(w/2,h-3); ctx.stroke();
    // páginas
    ctx.fillStyle="#fffdf0";
    ctx.fillRect(5,6,w/2-6,h-12); ctx.fillRect(w/2+1,6,w/2-6,h-12);
    // brilho de "conhecimento"
    ctx.fillStyle="rgba(255,255,255,0.55)";
    ctx.beginPath(); ctx.ellipse(9,8,4,3,Math.PI/4,0,Math.PI*2); ctx.fill();
    tex.refresh();
  }
  if(!scene.textures.exists("boss_proj_badbook")){
    const w=34,h=28,tex=scene.textures.createCanvas("boss_proj_badbook",w,h), ctx=tex.getContext();
    const gr=ctx.createLinearGradient(2,2,w-2,h-2);
    gr.addColorStop(0,"#5a4a5c"); gr.addColorStop(0.5,"#3a2a3c"); gr.addColorStop(1,"#1a0e1c");
    ctx.fillStyle=gr; rrPath(ctx,2,2,w-4,h-4,4); ctx.fill();
    ctx.strokeStyle="#0a050a"; ctx.lineWidth=2; ctx.stroke();
    // rabiscos confusos
    ctx.strokeStyle="rgba(180,160,190,0.5)"; ctx.lineWidth=1;
    for(let i=0;i<3;i++){ ctx.beginPath(); ctx.moveTo(6,9+i*5); ctx.lineTo(16,7+i*6); ctx.stroke(); }
    // aviso — X vermelho bem visível
    ctx.shadowColor="rgba(255,40,40,0.7)"; ctx.shadowBlur=6;
    ctx.strokeStyle="#ff3030"; ctx.lineWidth=3.5; ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(w-15,7); ctx.lineTo(w-3,19); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w-3,7); ctx.lineTo(w-15,19); ctx.stroke();
    ctx.shadowBlur=0;
    tex.refresh();
  }
  // ── Bola ❓ do Monstro da Ignorância (redesenho) — rola devagar pelo chão,
  // saltitando um pouco, em vez de voar direto à cabeça. Lenta e fácil de
  // ver/evitar de propósito — nada de "aviso vermelho" agressivo aqui.
  if(!scene.textures.exists("boss_proj_qmark")){
    const w=30,h=30,tex=scene.textures.createCanvas("boss_proj_qmark",w,h), ctx=tex.getContext();
    const gr=ctx.createRadialGradient(w/2-4,h/2-4,2,w/2,h/2,15);
    gr.addColorStop(0,"#c8aeff"); gr.addColorStop(0.6,"#8a5cff"); gr.addColorStop(1,"#5228b0");
    ctx.fillStyle=gr;
    ctx.beginPath(); ctx.arc(w/2,h/2,13,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="#2a1060"; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle="#fff8ff"; ctx.font="bold 15px sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText("?", w/2, h/2+1);
    ctx.textBaseline="alphabetic";
    tex.refresh();
  }

  // ── Anzol do Monstro do Phishing (novo, redesenho "pirata-hacker") — a
  // bola "?" roxa acima ficou associada ao Monstro do Phishing desde o
  // início, mas agora destoava da nova paleta azul-marinho/ciano do boss
  // (ver makeBossTextures acima) e, tal como aconteceu com o Vírus Gigante/
  // Espião das Sombras/Robô do Spam antes dele, também não tinha sentido
  // temático nenhum para este boss em particular. Um anzol prateado a
  // brilhar em ciano — a mesma "isca" que a cana de pesca segura — é a
  // metáfora óbvia de "morde o isco e é fisgado" que faltava.
  if(!scene.textures.exists("boss_proj_hook")){
    const w=30,h=30,tex=scene.textures.createCanvas("boss_proj_hook",w,h), ctx=tex.getContext();
    ctx.save();
    ctx.shadowColor="#39d6ff"; ctx.shadowBlur=6;
    ctx.strokeStyle="#eef2f7"; ctx.lineWidth=3.4; ctx.lineCap="round";
    ctx.beginPath();
    ctx.moveTo(15,4);
    ctx.lineTo(15,17);
    ctx.arc(19,17,4,Math.PI,Math.PI*0.1,true);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle="#8f9ab0"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(15,5,2.6,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle="#182a56";
    ctx.beginPath(); ctx.arc(15,5,1.3,0,Math.PI*2); ctx.fill();
    tex.refresh();
  }

  // ── Micróbio do Vírus Gigante — bolinha com espigões curtos, sem símbolo
  // nenhum (o "?" só fazia sentido no Monstro da Ignorância). Desenhada em
  // tons neutros/claros para o setTint (orbTint em data-bosses.js) pintar
  // limpo por cima, tal como já acontecia com a bola ❓ original.
  if(!scene.textures.exists("boss_proj_germ")){
    const w=30,h=30,tex=scene.textures.createCanvas("boss_proj_germ",w,h), ctx=tex.getContext();
    const cx=w/2, cy=h/2, r=10;
    // espigões curtos angulares à volta (fragmento de malware, não organismo)
    ctx.strokeStyle="#ffd23f"; ctx.lineWidth=2.2;
    for(let i=0;i<8;i++){
      const a=(Math.PI*2*i)/8;
      const x1=cx+Math.cos(a)*r, y1=cy+Math.sin(a)*r;
      const x2=cx+Math.cos(a)*(r+4.5), y2=cy+Math.sin(a)*(r+4.5);
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x2,y2,1.6,0,Math.PI*2); ctx.fillStyle="#ffd23f"; ctx.fill();
    }
    const gr=ctx.createRadialGradient(cx-3,cy-3,1,cx,cy,r);
    gr.addColorStop(0,"#ffe8b0"); gr.addColorStop(0.6,"#a85a00"); gr.addColorStop(1,"#1c0d00");
    ctx.fillStyle=gr;
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
    // pequenos pixels de corrupção internos
    ctx.fillStyle="rgba(64,224,255,0.55)";
    ctx.beginPath(); ctx.arc(cx-3,cy+2,2.4,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx+3,cy-3,1.8,0,Math.PI*2); ctx.fill();
    tex.refresh();
  }

  // ── Orbe sombrio do Guardião das Sombras — antes era só um círculo liso
  // com um traço fino (não lia como "nuvem" nenhuma, parecia só uma bolinha
  // igual às outras). Agora é um aglomerado de bolhas sobrepostas (silhueta
  // tipo nuvenzinha), com 2 caudas de fumo a espiralar para os lados e um
  // par de "olhos" ténues — dá logo a ideia de nuvem/sombra com alguma
  // presença assombrada, sem símbolo nenhum. Desenhada quase branca (o tint
  // em data-bosses.js é que lhe dá a cor roxo-escura final).
  if(!scene.textures.exists("boss_proj_shadow")){
    const w=30,h=30,tex=scene.textures.createCanvas("boss_proj_shadow",w,h), ctx=tex.getContext();
    const cx=w/2, cy=h/2;
    ctx.shadowColor="#e8e0ff"; ctx.shadowBlur=6;
    const gr=ctx.createRadialGradient(cx-2,cy-2,1,cx,cy,13);
    gr.addColorStop(0,"#ffffff"); gr.addColorStop(0.45,"#d8ccf5"); gr.addColorStop(1,"#9a86d0");
    ctx.fillStyle=gr;
    // Várias bolhas sobrepostas em vez de um único círculo perfeito — é isto
    // que dá a silhueta irregular e "fofa" de nuvem, em vez de uma bola lisa.
    [[0,-2,7],[-6,1,5.5],[6,1,5.5],[-3,5,5],[3,5,5],[0,0,8]].forEach(([dx,dy,r])=>{
      ctx.beginPath(); ctx.arc(cx+dx,cy+dy,r,0,Math.PI*2); ctx.fill();
    });
    ctx.shadowBlur=0;
    // Duas caudas de fumo/sombra a espiralar para os lados opostos — reforça
    // a sensação de algo imaterial (nem espigões de vírus, nem contorno reto
    // de porca/parafuso).
    ctx.strokeStyle="rgba(255,255,255,0.5)"; ctx.lineWidth=1.4;
    ctx.beginPath(); ctx.moveTo(cx-9,cy-1); ctx.quadraticCurveTo(cx-13,cy-6,cx-11,cy-11); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx+9,cy+2); ctx.quadraticCurveTo(cx+13,cy+7,cx+10,cy+12); ctx.stroke();
    // Par de "olhos" bem ténues — presença ligeiramente assombrada, sem
    // exagerar (isto continua a ser um jogo do 4º ano).
    ctx.fillStyle="rgba(230,220,255,0.9)";
    ctx.beginPath(); ctx.ellipse(cx-2.5,cy-1,1.1,1.6,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx+2.5,cy-1,1.1,1.6,0,0,Math.PI*2); ctx.fill();
    tex.refresh();
  }

  // ── Envelope de spam do Robô do Spam — envelope branco com dobra e
  // selo vermelho de aviso (⚠), tal como os que o robô atira/cospe —
  // troca a porca dourada (tema industrial genérico) por algo que se lê
  // de imediato como "correio indesejado a ser atirado".
  if(!scene.textures.exists("boss_proj_spam")){
    const w=32,h=24,tex=scene.textures.createCanvas("boss_proj_spam",w,h), ctx=tex.getContext();
    ctx.shadowColor="rgba(220,40,30,0.6)"; ctx.shadowBlur=6;
    // corpo do envelope
    ctx.fillStyle="#fffaff";
    ctx.beginPath(); ctx.roundRect(1,1,w-2,h-2,3); ctx.fill();
    ctx.shadowBlur=0;
    ctx.strokeStyle="#c7291f"; ctx.lineWidth=1.8; ctx.stroke();
    // dobra em V
    ctx.beginPath();
    ctx.moveTo(1,1); ctx.lineTo(w/2,h*0.6); ctx.lineTo(w-1,1);
    ctx.stroke();
    // linhas finas de "texto" — só para dar textura de carta
    ctx.strokeStyle="#e0b8b4"; ctx.lineWidth=1.2;
    ctx.beginPath(); ctx.moveTo(5,h-6); ctx.lineTo(13,h-6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w-13,h-6); ctx.lineTo(w-5,h-6); ctx.stroke();
    // selo de aviso — círculo vermelho com "!" branco, no canto
    const bx=w-8, by=8, br=6.5;
    ctx.fillStyle="#e8352a";
    ctx.beginPath(); ctx.arc(bx,by,br,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="#7a140e"; ctx.lineWidth=1.2; ctx.stroke();
    ctx.fillStyle="#fffaff";
    ctx.fillRect(bx-1,by-3.5,2,4.5);
    ctx.beginPath(); ctx.arc(bx,by+3,1.1,0,Math.PI*2); ctx.fill();
    tex.refresh();
  }
}

function makeSparkTexture(scene){
  if(scene.textures.exists("spark_item")) return;
  const g=scene.make.graphics({x:0,y:0,add:false});
  g.fillStyle(0xffd700,1);
  g.beginPath();
  for(let _i=0;_i<5;_i++){
    const _o=Math.PI*2*_i/5-Math.PI/2, _in=_o+Math.PI/5;
    _i===0?g.moveTo(8+Math.cos(_o)*8,8+Math.sin(_o)*8):g.lineTo(8+Math.cos(_o)*8,8+Math.sin(_o)*8);
    g.lineTo(8+Math.cos(_in)*3,8+Math.sin(_in)*3);
  }
  g.closePath(); g.fillPath();
  g.generateTexture("spark_item",16,16); g.destroy();
}

function makeItemTextures(scene){
  // Estrela
  if(!scene.textures.exists("item_estrela")){
    const tex=scene.textures.createCanvas("item_estrela",36,36), ctx=tex.getContext();
    // Sombra escura por baixo para contraste com qualquer fundo
    ctx.fillStyle="rgba(0,0,0,0.35)"; ctx.shadowColor="rgba(0,0,0,0.5)"; ctx.shadowBlur=6;
    ctx.save(); ctx.translate(18,20);
    ctx.beginPath();
    for(let j=0;j<5;j++){
      const o=Math.PI*2*j/5-Math.PI/2, i=o+Math.PI/5;
      j===0?ctx.moveTo(Math.cos(o)*16,Math.sin(o)*16):ctx.lineTo(Math.cos(o)*16,Math.sin(o)*16);
      ctx.lineTo(Math.cos(i)*7,Math.sin(i)*7);
    }
    ctx.closePath(); ctx.fill(); ctx.restore(); ctx.shadowBlur=0;
    // Estrela principal
    ctx.fillStyle="#ffd700"; ctx.shadowColor="#ff6b35"; ctx.shadowBlur=8;
    ctx.save(); ctx.translate(18,18);
    ctx.beginPath();
    for(let j=0;j<5;j++){
      const o=Math.PI*2*j/5-Math.PI/2, i=o+Math.PI/5;
      j===0?ctx.moveTo(Math.cos(o)*16,Math.sin(o)*16):ctx.lineTo(Math.cos(o)*16,Math.sin(o)*16);
      ctx.lineTo(Math.cos(i)*7,Math.sin(i)*7);
    }
    ctx.closePath(); ctx.fill();
    // Contorno escuro
    ctx.strokeStyle="rgba(100,60,0,0.7)"; ctx.lineWidth=2;
    ctx.beginPath();
    for(let j=0;j<5;j++){
      const o=Math.PI*2*j/5-Math.PI/2, i=o+Math.PI/5;
      j===0?ctx.moveTo(Math.cos(o)*16,Math.sin(o)*16):ctx.lineTo(Math.cos(o)*16,Math.sin(o)*16);
      ctx.lineTo(Math.cos(i)*7,Math.sin(i)*7);
    }
    ctx.closePath(); ctx.stroke();
    ctx.restore(); ctx.shadowBlur=0;
    ctx.fillStyle="rgba(255,255,255,0.5)"; ctx.beginPath(); ctx.arc(13,11,4,0,Math.PI*2); ctx.fill();
    tex.refresh();
  }
  // Cadeados 🔒 flutuantes — 6 cores
  const LOCK_COLORS=[
    {hi:"#ff9080", lo:"#e84d10", stroke:"#b03000"}, // laranja-vermelho
    {hi:"#ffe080", lo:"#ffd700", stroke:"#b09000"}, // amarelo
    {hi:"#ff90d0", lo:"#e0209a", stroke:"#900060"}, // rosa
    {hi:"#90d0ff", lo:"#1a90e0", stroke:"#005090"}, // azul
    {hi:"#90ffb0", lo:"#20c060", stroke:"#008030"}, // verde
    {hi:"#d0a0ff", lo:"#9030e0", stroke:"#500090"}, // lilás
  ];
  LOCK_COLORS.forEach((bc,ci)=>{
    const key="item_cadeado_"+ci;
    if(scene.textures.exists(key)) return;
    const tex=scene.textures.createCanvas(key,32,36), ctx=tex.getContext();
    // Brilho de fundo
    ctx.shadowColor=bc.lo; ctx.shadowBlur=7;
    // Argola do cadeado (shackle)
    ctx.strokeStyle=bc.stroke; ctx.lineWidth=4;
    ctx.beginPath(); ctx.arc(16,13,7,Math.PI,0,false); ctx.stroke();
    ctx.shadowBlur=0;
    // Corpo do cadeado
    const gr=ctx.createLinearGradient(4,15,4,33);
    gr.addColorStop(0,bc.hi); gr.addColorStop(1,bc.lo);
    ctx.fillStyle=gr;
    ctx.beginPath(); ctx.roundRect(4,15,24,18,5); ctx.fill();
    // Contorno
    ctx.strokeStyle=bc.stroke; ctx.lineWidth=1.6;
    ctx.beginPath(); ctx.roundRect(4,15,24,18,5); ctx.stroke();
    // Brilho oval
    ctx.fillStyle="rgba(255,255,255,0.5)";
    ctx.beginPath(); ctx.ellipse(10,20,4,3,Math.PI/5,0,Math.PI*2); ctx.fill();
    // Buraco da fechadura
    ctx.fillStyle=bc.stroke;
    ctx.beginPath(); ctx.arc(16,23,2.6,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(14.6,24.5); ctx.lineTo(17.4,24.5); ctx.lineTo(16.6,29); ctx.lineTo(15.4,29); ctx.closePath(); ctx.fill();
    tex.refresh();
  });
  // Chave 🔑 — desenhado em Canvas (consistente com todos os outros itens)
  if(!scene.textures.exists("item_chave")){
    const tex=scene.textures.createCanvas("item_chave",52,56), ctx=tex.getContext();
    const cx=26, cy=28;

    ctx.save(); ctx.translate(cx,cy); ctx.rotate(-0.5);

    // Halo exterior dourado (brilho de "acesso concedido")
    const haloGr = ctx.createRadialGradient(0,0,10,0,0,22);
    haloGr.addColorStop(0,"rgba(255,230,120,0.35)");
    haloGr.addColorStop(1,"rgba(255,230,120,0)");
    ctx.fillStyle=haloGr;
    ctx.beginPath(); ctx.arc(0,0,22,0,Math.PI*2); ctx.fill();

    ctx.shadowColor="rgba(255,215,0,0.6)"; ctx.shadowBlur=6;

    // Argola (bow) da chave — anel dourado à esquerda
    const ringGr=ctx.createLinearGradient(-24,-9,-24,9);
    ringGr.addColorStop(0,"#ffe680"); ringGr.addColorStop(1,"#c07000");
    ctx.strokeStyle=ringGr; ctx.lineWidth=5;
    ctx.beginPath(); ctx.arc(-15,0,8,0,Math.PI*2); ctx.stroke();

    // Haste da chave
    const shaftGr=ctx.createLinearGradient(0,-3,0,3);
    shaftGr.addColorStop(0,"#ffe680"); shaftGr.addColorStop(1,"#c07000");
    ctx.fillStyle=shaftGr;
    ctx.beginPath(); ctx.roundRect(-8,-3,24,6,2); ctx.fill();

    // Dentes da chave (bit) — dois dentes na ponta direita
    ctx.beginPath(); ctx.roundRect(9,3,4,7,1); ctx.fill();
    ctx.beginPath(); ctx.roundRect(15,3,4,10,1); ctx.fill();

    ctx.shadowBlur=0;
    // Contorno geral
    ctx.strokeStyle="#8a5200"; ctx.lineWidth=1.4;
    ctx.beginPath(); ctx.roundRect(-8,-3,24,6,2); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(9,3,4,7,1); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(15,3,4,10,1); ctx.stroke();

    // Ponto digital a piscar no centro da argola (detalhe "ciber")
    ctx.fillStyle="#40e0ff"; ctx.shadowColor="#40e0ff"; ctx.shadowBlur=5;
    ctx.beginPath(); ctx.arc(-15,0,2.4,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;

    // Brilho ao longo da haste
    ctx.strokeStyle="rgba(255,255,255,0.55)"; ctx.lineWidth=1.4;
    ctx.beginPath(); ctx.moveTo(-6,-1.5); ctx.lineTo(8,-1.5); ctx.stroke();

    ctx.restore();
    tex.refresh();
  }
  // Chip de Segurança 🔐 — chip dourado tipo cartão/SIM com um cadeado ao
  // centro. Silhueta simples e muito reconhecível mesmo em ecrã pequeno
  // (substitui uma tentativa anterior de "impressão digital" pouco clara).
  if(!scene.textures.exists("item_chip")){
    const tex=scene.textures.createCanvas("item_chip",44,44), ctx=tex.getContext();
    const cx=22, cy=22;

    // Halo de brilho por trás do chip
    const halo=ctx.createRadialGradient(cx,cy,4,cx,cy,20);
    halo.addColorStop(0,"rgba(255,215,0,0.30)"); halo.addColorStop(1,"rgba(255,215,0,0)");
    ctx.fillStyle=halo; ctx.beginPath(); ctx.arc(cx,cy,20,0,Math.PI*2); ctx.fill();

    // Corpo dourado do chip (como o contacto metálico de um cartão/SIM)
    const chipGr=ctx.createLinearGradient(cx-16,cy-13,cx+16,cy+13);
    chipGr.addColorStop(0,"#fff3c0"); chipGr.addColorStop(0.5,"#ffd23f"); chipGr.addColorStop(1,"#c08800");
    ctx.fillStyle=chipGr;
    ctx.beginPath(); ctx.roundRect(cx-16,cy-13,32,26,5); ctx.fill();
    ctx.strokeStyle="#8a5f00"; ctx.lineWidth=1.6;
    ctx.beginPath(); ctx.roundRect(cx-16,cy-13,32,26,5); ctx.stroke();

    // Linhas de contacto (padrão típico de chip de cartão)
    ctx.strokeStyle="rgba(138,95,0,0.6)"; ctx.lineWidth=1.1;
    [-8,0,8].forEach(dx=>{ ctx.beginPath(); ctx.moveTo(cx+dx,cy-13); ctx.lineTo(cx+dx,cy+13); ctx.stroke(); });
    ctx.beginPath(); ctx.moveTo(cx-16,cy); ctx.lineTo(cx-4,cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx+4,cy); ctx.lineTo(cx+16,cy); ctx.stroke();
    // cantos "cortados" (como nos chips reais)
    ctx.strokeStyle="rgba(138,95,0,0.6)"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(cx-16,cy-7); ctx.lineTo(cx-9,cy-7); ctx.lineTo(cx-9,cy-13); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx+16,cy+7); ctx.lineTo(cx+9,cy+7); ctx.lineTo(cx+9,cy+13); ctx.stroke();

    // Brilho diagonal
    ctx.fillStyle="rgba(255,255,255,0.45)";
    ctx.beginPath(); ctx.ellipse(cx-8,cy-7,7,3,-0.5,0,Math.PI*2); ctx.fill();

    // Selo central escuro com cadeado — deixa claro que é um chip "seguro"
    ctx.fillStyle="#1c1408"; ctx.shadowColor="rgba(0,0,0,0.4)"; ctx.shadowBlur=3;
    ctx.beginPath(); ctx.arc(cx,cy,7.4,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    ctx.strokeStyle="#ffd23f"; ctx.lineWidth=1.2;
    ctx.beginPath(); ctx.arc(cx,cy,7.4,0,Math.PI*2); ctx.stroke();
    // corpo do cadeado
    ctx.fillStyle="#40e0ff";
    ctx.beginPath(); ctx.roundRect(cx-3.4,cy-0.5,6.8,5.5,1.4); ctx.fill();
    // argola do cadeado
    ctx.strokeStyle="#40e0ff"; ctx.lineWidth=1.4;
    ctx.beginPath(); ctx.arc(cx,cy-2,2.6,Math.PI,0,false); ctx.stroke();
    // buraco da fechadura
    ctx.fillStyle="#1c1408";
    ctx.beginPath(); ctx.arc(cx,cy+2,0.9,0,Math.PI*2); ctx.fill();

    tex.refresh();
  }
  // Escudo — canvas 52×58, forma classica de escudo heraldico
  if(!scene.textures.exists("item_medalha")){
    const tex=scene.textures.createCanvas("item_medalha",52,58), ctx=tex.getContext();
    const cx=26, cy=26;

    // Funcao auxiliar para desenhar a forma do escudo
    function shieldPath(ctx, x, y, w, h){
      const r=w*0.18;
      ctx.beginPath();
      ctx.moveTo(x+r, y);
      ctx.lineTo(x+w-r, y);
      ctx.quadraticCurveTo(x+w, y, x+w, y+r);
      ctx.lineTo(x+w, y+h*0.55);
      // Curva inferior que forma a ponta do escudo
      ctx.quadraticCurveTo(x+w, y+h*0.82, x+w/2, y+h);
      ctx.quadraticCurveTo(x, y+h*0.82, x, y+h*0.55);
      ctx.lineTo(x, y+r);
      ctx.quadraticCurveTo(x, y, x+r, y);
      ctx.closePath();
    }

    // Sombra exterior
    ctx.shadowColor="rgba(255,215,0,0.55)"; ctx.shadowBlur=8;
    // Borda exterior dourada
    const borderGr=ctx.createLinearGradient(0,0,0,54);
    borderGr.addColorStop(0,"#ffe060"); borderGr.addColorStop(1,"#c07000");
    ctx.fillStyle=borderGr; shieldPath(ctx,1,1,50,54); ctx.fill();
    ctx.shadowBlur=0;

    // Corpo do escudo — gradiente azul real
    const bodyGr=ctx.createLinearGradient(4,4,4,50);
    bodyGr.addColorStop(0,"#4a90e8"); bodyGr.addColorStop(0.5,"#1a50b8"); bodyGr.addColorStop(1,"#0a2878");
    ctx.fillStyle=bodyGr; shieldPath(ctx,4,4,44,50); ctx.fill();

    // Reflexo de luz no topo esquerdo
    ctx.fillStyle="rgba(255,255,255,0.28)";
    ctx.beginPath(); ctx.ellipse(16,14,9,13,Math.PI*0.15,0,Math.PI*2); ctx.fill();

    // Divisao central horizontal (cruz do escudo — faixa horizontal)
    ctx.fillStyle="rgba(255,215,0,0.22)";
    ctx.fillRect(4,24,44,6);
    // Divisao central vertical
    ctx.fillRect(23,4,6,50);

    // Estrela dourada no centro
    ctx.save(); ctx.translate(cx, cy+4);
    ctx.shadowColor="#ffd700"; ctx.shadowBlur=6;
    const sg=ctx.createRadialGradient(-1,-2,1,0,0,10);
    sg.addColorStop(0,"#ffffff"); sg.addColorStop(0.35,"#ffe060"); sg.addColorStop(1,"#ffa000");
    ctx.fillStyle=sg;
    ctx.beginPath();
    for(let j=0;j<5;j++){
      const o=Math.PI*2*j/5-Math.PI/2, inn=o+Math.PI/5;
      j===0?ctx.moveTo(Math.cos(o)*11,Math.sin(o)*11):ctx.lineTo(Math.cos(o)*11,Math.sin(o)*11);
      ctx.lineTo(Math.cos(inn)*5,Math.sin(inn)*5);
    }
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur=0;
    ctx.restore();

    // Contorno exterior dourado
    ctx.strokeStyle="#ffd700"; ctx.lineWidth=2.5;
    shieldPath(ctx,4,4,44,50); ctx.stroke();
    // Linha de brilho interior
    ctx.strokeStyle="rgba(255,255,255,0.35)"; ctx.lineWidth=1.2;
    shieldPath(ctx,7,7,38,44); ctx.stroke();

    tex.refresh();
  }
  // Livro do saber — 46×44, item de recolha do Monstro da Ignorância (fase "collect").
  // Reaproveita a paleta dourada/brilhante do projétil "boss_proj_book", mas maior
  // e com mais detalhe (páginas abertas), para não parecer um projétil a voar.
  if(!scene.textures.exists("item_livro")){
    const w=46,h=44,tex=scene.textures.createCanvas("item_livro",w,h), ctx=tex.getContext();
    ctx.save(); ctx.translate(w/2,h/2+2);
    ctx.shadowColor="rgba(255,220,80,0.75)"; ctx.shadowBlur=9;
    // capa de trás (levemente rodada, dá volume ao livro aberto)
    ctx.fillStyle="#c07a10";
    ctx.beginPath(); ctx.ellipse(0,2,19,13,0,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    // página esquerda
    const grL=ctx.createLinearGradient(-19,-10,0,10);
    grL.addColorStop(0,"#fffdf0"); grL.addColorStop(1,"#ffe9a0");
    ctx.fillStyle=grL;
    ctx.beginPath();
    ctx.moveTo(0,-11); ctx.quadraticCurveTo(-20,-14,-19,0); ctx.quadraticCurveTo(-20,14,0,11); ctx.closePath(); ctx.fill();
    // página direita
    const grR=ctx.createLinearGradient(0,-10,19,10);
    grR.addColorStop(0,"#ffe9a0"); grR.addColorStop(1,"#fffdf0");
    ctx.fillStyle=grR;
    ctx.beginPath();
    ctx.moveTo(0,-11); ctx.quadraticCurveTo(20,-14,19,0); ctx.quadraticCurveTo(20,14,0,11); ctx.closePath(); ctx.fill();
    // lombada central
    ctx.strokeStyle="#8a5200"; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(0,-11); ctx.lineTo(0,11); ctx.stroke();
    // linhas de texto simuladas em cada página
    ctx.strokeStyle="rgba(138,82,0,0.45)"; ctx.lineWidth=1;
    for(let i=0;i<3;i++){
      ctx.beginPath(); ctx.moveTo(-15,-5+i*5); ctx.lineTo(-3,-5+i*5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(3,-5+i*5); ctx.lineTo(15,-5+i*5); ctx.stroke();
    }
    // contorno geral
    ctx.strokeStyle="#8a5200"; ctx.lineWidth=1.6;
    ctx.beginPath();
    ctx.moveTo(0,-11); ctx.quadraticCurveTo(-20,-14,-19,0); ctx.quadraticCurveTo(-20,14,0,11);
    ctx.quadraticCurveTo(20,14,19,0); ctx.quadraticCurveTo(20,-14,0,-11); ctx.stroke();
    // brilho de "conhecimento" a saltar do livro
    ctx.fillStyle="rgba(255,255,255,0.6)";
    ctx.beginPath(); ctx.ellipse(-9,-8,3,2.2,Math.PI/4,0,Math.PI*2); ctx.fill();
    ctx.restore();
    tex.refresh();
  }
  // Ícones de "conhecimento" — lápis, diploma, lâmpada — desenhados a partir do
  // próprio emoji (glow por trás), para dar variedade rápida ao Monstro da
  // Ignorância sem ter de desenhar 3 ícones vetoriais à mão. Junta-se ao
  // item_livro já existente para formar o conjunto de 4 usado nesse combate.
  function makeEmojiItemTexture(scene, key, emoji, size = 44, glow = "rgba(255,220,80,0.75)") {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, size, size), ctx = tex.getContext();
    ctx.save();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `${Math.round(size*0.78)}px sans-serif`;
    ctx.shadowColor = glow; ctx.shadowBlur = 10;
    ctx.fillText(emoji, size/2, size/2+2);
    ctx.restore();
    tex.refresh();
  }
  makeEmojiItemTexture(scene, "item_lapis",   "✏️", 44, "rgba(255,180,80,0.75)");
  makeEmojiItemTexture(scene, "item_diploma", "🎓", 46, "rgba(160,140,255,0.75)");
  makeEmojiItemTexture(scene, "item_lampada", "💡", 44, "rgba(255,240,120,0.85)");
  // Pacote de Dados — envelope digital selado com cadeado dourado no lacre.
  // Substitui o "avião de papel" anterior: este lê-se de imediato como
  // "mensagem/dado protegido", em vez de um símbolo genérico de correio.
  const PACKET_COLORS=[
    {top:"#ff9ad0",bot:"#c8158a"}, // rosa
    {top:"#9adcff",bot:"#1470c8"}, // azul
    {top:"#b0ffa0",bot:"#1ca858"}, // verde
    {top:"#ffe680",bot:"#ff9500"}, // laranja-dourado
    {top:"#dcb0ff",bot:"#7e20d0"}, // lilás
  ];
  PACKET_COLORS.forEach((bc,ci)=>{
    const key="item_pacote_"+ci;
    if(scene.textures.exists(key)) return;
    const tex=scene.textures.createCanvas(key,48,36), ctx=tex.getContext();
    const cx=24, cy=18, ew=32, eh=22;

    // Halo de brilho por trás
    const halo=ctx.createRadialGradient(cx,cy,2,cx,cy,22);
    halo.addColorStop(0,bc.top+"50"); halo.addColorStop(1,bc.top+"00");
    ctx.fillStyle=halo;
    ctx.beginPath(); ctx.arc(cx,cy,22,0,Math.PI*2); ctx.fill();

    // Rasto de movimento (mantido do design anterior — ainda faz sentido
    // para uma mensagem "em trânsito" na rede)
    ctx.strokeStyle=bc.top; ctx.lineCap="round";
    [[0,0.5,9],[3,0.34,6],[6,0.2,4]].forEach(([dy,alpha,len])=>{
      ctx.globalAlpha=alpha; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(cx-ew/2-6,cy-2+dy); ctx.lineTo(cx-ew/2-6+len,cy-2+dy); ctx.stroke();
    });
    ctx.globalAlpha=1;

    // Corpo do envelope
    const bodyGr=ctx.createLinearGradient(cx,cy-eh/2,cx,cy+eh/2);
    bodyGr.addColorStop(0,bc.top); bodyGr.addColorStop(1,bc.bot);
    ctx.fillStyle=bodyGr;
    ctx.beginPath(); ctx.roundRect(cx-ew/2,cy-eh/2,ew,eh,4); ctx.fill();
    ctx.strokeStyle="#3a1030"; ctx.lineWidth=1.4;
    ctx.beginPath(); ctx.roundRect(cx-ew/2,cy-eh/2,ew,eh,4); ctx.stroke();

    // Aba triangular (dobra do envelope)
    ctx.fillStyle="rgba(255,255,255,0.28)";
    ctx.beginPath();
    ctx.moveTo(cx-ew/2+1,cy-eh/2+1);
    ctx.lineTo(cx,cy+2);
    ctx.lineTo(cx+ew/2-1,cy-eh/2+1);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle="rgba(60,16,48,0.5)"; ctx.lineWidth=1;
    ctx.stroke();

    // Símbolo "@" na aba — reforça a leitura de "mensagem/email digital",
    // ligando o objeto ao tema de cibersegurança.
    ctx.fillStyle="rgba(58,16,48,0.7)";
    ctx.font="bold 10px sans-serif";
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText("@", cx, cy-7);

    // Cadeado dourado no lacre — o elemento que liga isto ao tema de
    // cibersegurança (mensagem fechada = dado protegido).
    const lockY=cy+1;
    ctx.fillStyle="#3a2200";
    ctx.beginPath(); ctx.roundRect(cx-4.5,lockY-1,9,7,2); ctx.fill();
    ctx.strokeStyle="#3a2200"; ctx.lineWidth=1.6; ctx.lineCap="round";
    ctx.beginPath(); ctx.arc(cx,lockY-1,3,Math.PI,0); ctx.stroke();
    const lockGr=ctx.createLinearGradient(cx,lockY-1,cx,lockY+6);
    lockGr.addColorStop(0,"#ffe680"); lockGr.addColorStop(1,"#ffb020");
    ctx.fillStyle=lockGr;
    ctx.beginPath(); ctx.roundRect(cx-4,lockY-0.3,8,6,1.6); ctx.fill();
    ctx.fillStyle="#7a3a00";
    ctx.beginPath(); ctx.arc(cx,lockY+2.6,1,0,Math.PI*2); ctx.fill();

    tex.refresh();
  });

  // Mini-Drone amigável — 64×52. Visual futurista: chassis facetado tipo
  // "stealth", núcleo de energia pulsante ao centro, faixa de luz cyan,
  // braços finos luminosos terminados em anéis de plasma (em vez de
  // discos de hélice comuns), estabilizadores em lâmina e um scanner
  // com feixe de luz por baixo em vez de uma câmara comum.
  if(!scene.textures.exists("item_drone")){
    const tex=scene.textures.createCanvas("item_drone",64,52), ctx=tex.getContext();
    const bx=32, by=23; // centro do corpo

    // --- AURA AMBIENTE (glow cyan por trás de tudo) ---
    const aura=ctx.createRadialGradient(bx,by,4,bx,by,29);
    aura.addColorStop(0,"rgba(80,220,255,0.22)");
    aura.addColorStop(1,"rgba(80,220,255,0)");
    ctx.fillStyle=aura;
    ctx.beginPath(); ctx.arc(bx,by,29,0,Math.PI*2); ctx.fill();

    // --- 4 BRAÇOS + ANÉIS DE PLASMA (atrás do corpo) ---
    const arms=[[-21,-8],[21,-8],[-21,8],[21,8]];
    arms.forEach(([dx,dy])=>{
      const rx=bx+dx, ry=by+dy;
      ctx.strokeStyle="#182230"; ctx.lineWidth=3; ctx.lineCap="round";
      ctx.beginPath(); ctx.moveTo(bx+dx*0.22,by+dy*0.3); ctx.lineTo(rx,ry); ctx.stroke();
      ctx.strokeStyle="rgba(110,225,255,0.85)"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(bx+dx*0.22,by+dy*0.3); ctx.lineTo(rx,ry); ctx.stroke();
      // housing do motor, hexagonal
      ctx.fillStyle="#1c2836";
      ctx.beginPath();
      ctx.moveTo(rx-4,ry); ctx.lineTo(rx-2,ry-3); ctx.lineTo(rx+2,ry-3);
      ctx.lineTo(rx+4,ry); ctx.lineTo(rx+2,ry+3); ctx.lineTo(rx-2,ry+3);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle="rgba(110,225,255,0.6)"; ctx.lineWidth=0.8; ctx.stroke();
      // anel de plasma do motor, achatado para sugerir perspetiva
      ctx.save();
      ctx.translate(rx,ry-1); ctx.scale(1,0.38);
      const ringGr=ctx.createRadialGradient(0,0,1,0,0,10);
      ringGr.addColorStop(0,"rgba(200,245,255,0.95)");
      ringGr.addColorStop(0.5,"rgba(70,200,255,0.55)");
      ringGr.addColorStop(1,"rgba(70,200,255,0)");
      ctx.fillStyle=ringGr;
      ctx.shadowColor="#5ce1ff"; ctx.shadowBlur=6;
      ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      ctx.strokeStyle="rgba(255,255,255,0.8)"; ctx.lineWidth=0.9;
      ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.stroke();
      ctx.restore();
    });

    // --- ESTABILIZADORES EM LÂMINA (em vez de pernas em L) ---
    ctx.strokeStyle="#182230"; ctx.lineWidth=2;
    [[-9,1],[9,1]].forEach(([dx])=>{
      ctx.beginPath(); ctx.moveTo(bx+dx,by+8); ctx.lineTo(bx+dx*1.6,by+15); ctx.stroke();
    });
    ctx.strokeStyle="rgba(110,225,255,0.7)"; ctx.lineWidth=1.4; ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(bx-16,by+15); ctx.lineTo(bx-8,by+15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx+8,by+15); ctx.lineTo(bx+16,by+15); ctx.stroke();

    // --- ANTENA (estilo VanBerto's: haste fina + halo dourado da marca) ---
    ctx.strokeStyle="#182230"; ctx.lineWidth=1.6;
    ctx.beginPath(); ctx.moveTo(bx,by-9); ctx.lineTo(bx,by-16); ctx.stroke();
    const halo=ctx.createRadialGradient(bx,by-18,0.5,bx,by-18,6);
    halo.addColorStop(0,"rgba(255,210,74,0.7)"); halo.addColorStop(1,"rgba(255,210,74,0)");
    ctx.fillStyle=halo; ctx.beginPath(); ctx.arc(bx,by-18,6,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#ffd24a"; ctx.shadowColor="#ffd24a"; ctx.shadowBlur=5;
    ctx.beginPath(); ctx.arc(bx,by-18,2,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;

    // --- CORPO (chassis angular facetado, tipo "stealth") ---
    ctx.beginPath();
    ctx.moveTo(bx-14,by);
    ctx.lineTo(bx-7,by-9);
    ctx.lineTo(bx+7,by-9);
    ctx.lineTo(bx+14,by);
    ctx.lineTo(bx+7,by+9);
    ctx.lineTo(bx-7,by+9);
    ctx.closePath();
    const bodyGr=ctx.createLinearGradient(bx,by-9,bx,by+9);
    bodyGr.addColorStop(0,"#3a4a60"); bodyGr.addColorStop(0.5,"#20293a"); bodyGr.addColorStop(1,"#10151f");
    ctx.fillStyle=bodyGr; ctx.fill();
    ctx.strokeStyle="rgba(110,225,255,0.9)"; ctx.lineWidth=1.3;
    ctx.shadowColor="#5ce1ff"; ctx.shadowBlur=3;
    ctx.stroke();
    ctx.shadowBlur=0;

    // faixa de luz central (linha de energia)
    const stripGr=ctx.createLinearGradient(bx-11,by,bx+11,by);
    stripGr.addColorStop(0,"rgba(90,225,255,0)");
    stripGr.addColorStop(0.5,"rgba(150,240,255,0.9)");
    stripGr.addColorStop(1,"rgba(90,225,255,0)");
    ctx.fillStyle=stripGr;
    ctx.beginPath(); ctx.roundRect(bx-11,by-1,22,2,1); ctx.fill();

    // núcleo de energia (diamante pulsante ao centro)
    ctx.save(); ctx.translate(bx,by-3); ctx.rotate(Math.PI/4);
    const coreGr=ctx.createRadialGradient(0,0,0.5,0,0,4.5);
    coreGr.addColorStop(0,"#ffffff"); coreGr.addColorStop(0.4,"#7fe0ff"); coreGr.addColorStop(1,"rgba(70,200,255,0)");
    ctx.fillStyle=coreGr; ctx.shadowColor="#7fe0ff"; ctx.shadowBlur=6;
    ctx.beginPath(); ctx.roundRect(-3.2,-3.2,6.4,6.4,1.5); ctx.fill();
    ctx.restore(); ctx.shadowBlur=0;

    // Luzes de estado verde/vermelho, pequenas e nítidas
    ctx.fillStyle="#3ef07a"; ctx.shadowColor="#3ef07a"; ctx.shadowBlur=3;
    ctx.beginPath(); ctx.arc(bx-10,by+4,1.3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#ff4a4a"; ctx.shadowColor="#ff4a4a";
    ctx.beginPath(); ctx.arc(bx+10,by+4,1.3,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;

    // --- SCANNER PENDURADO POR BAIXO (lente com anel + feixe de luz) ---
    ctx.strokeStyle="#182230"; ctx.lineWidth=1.6;
    ctx.beginPath(); ctx.moveTo(bx,by+9); ctx.lineTo(bx,by+11); ctx.stroke();
    ctx.fillStyle="#0e1420";
    ctx.beginPath(); ctx.roundRect(bx-6,by+10,12,7,3); ctx.fill();
    ctx.strokeStyle="rgba(110,225,255,0.6)"; ctx.lineWidth=0.9;
    ctx.beginPath(); ctx.roundRect(bx-6,by+10,12,7,3); ctx.stroke();
    const lensIris=ctx.createRadialGradient(bx-0.6,by+13.3,0.3,bx,by+13.8,3.2);
    lensIris.addColorStop(0,"#ffffff"); lensIris.addColorStop(0.35,"#7fe0ff"); lensIris.addColorStop(1,"#0f6fb8");
    ctx.fillStyle=lensIris; ctx.shadowColor="#7fe0ff"; ctx.shadowBlur=3;
    ctx.beginPath(); ctx.arc(bx,by+13.8,3.2,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    // feixe de scan subtil
    const beam=ctx.createLinearGradient(bx,by+16,bx,by+22);
    beam.addColorStop(0,"rgba(120,230,255,0.5)"); beam.addColorStop(1,"rgba(120,230,255,0)");
    ctx.fillStyle=beam;
    ctx.beginPath(); ctx.moveTo(bx-3,by+16); ctx.lineTo(bx+3,by+16); ctx.lineTo(bx+5,by+22); ctx.lineTo(bx-5,by+22); ctx.closePath(); ctx.fill();

    tex.refresh();
  }

  // Coração — vermelho vivo, grande, com brilho e gradiente
  if(!scene.textures.exists("item_heart")){
    const tex=scene.textures.createCanvas("item_heart",44,40), ctx=tex.getContext();
    const cx=22, cy=20;

    // Função para desenhar o coração centrado
    function heartPath(){
      ctx.beginPath();
      ctx.moveTo(cx, cy+12);
      // Lado esquerdo
      ctx.bezierCurveTo(cx-2, cy+10, cx-14, cy+4, cx-14, cy-4);
      ctx.bezierCurveTo(cx-14, cy-13, cx-6, cy-15, cx, cy-8);
      // Lado direito
      ctx.bezierCurveTo(cx+6, cy-15, cx+14, cy-13, cx+14, cy-4);
      ctx.bezierCurveTo(cx+14, cy+4, cx+2, cy+10, cx, cy+12);
      ctx.closePath();
    }

    // Sombra exterior rosada
    ctx.shadowColor="rgba(255,80,80,0.55)"; ctx.shadowBlur=10;
    const hg=ctx.createRadialGradient(cx-3,cy-5,2,cx,cy,16);
    hg.addColorStop(0,"#ff6080");
    hg.addColorStop(0.4,"#ff2040");
    hg.addColorStop(0.8,"#cc0020");
    hg.addColorStop(1,"#990010");
    ctx.fillStyle=hg;
    heartPath(); ctx.fill();
    ctx.shadowBlur=0;

    // Contorno fino
    ctx.strokeStyle="rgba(140,0,20,0.5)"; ctx.lineWidth=1.2;
    heartPath(); ctx.stroke();

    // Brilho principal (oval branco no canto superior esquerdo)
    ctx.fillStyle="rgba(255,255,255,0.55)";
    ctx.beginPath(); ctx.ellipse(cx-5,cy-6,5,7,Math.PI*0.35,0,Math.PI*2); ctx.fill();

    // Brilho secundário (pequeno)
    ctx.fillStyle="rgba(255,255,255,0.30)";
    ctx.beginPath(); ctx.ellipse(cx+4,cy-3,3,4,Math.PI*0.2,0,Math.PI*2); ctx.fill();

    tex.refresh();
  }

  // Duplo Salto — asa azul luminosa com fundo circular
  if(!scene.textures.exists("item_duplosalto")){
    const tex=scene.textures.createCanvas("item_duplosalto",64,56), ctx=tex.getContext();
    const cx=32, cy=30;

    // ── Fundo circular azul-celeste ────────────────────────────
    const bg=ctx.createRadialGradient(cx,cy,1,cx,cy,24);
    bg.addColorStop(0,"#eaf9ff"); bg.addColorStop(0.4,"#7dd6ff");
    bg.addColorStop(0.85,"#1a8fe0"); bg.addColorStop(1,"#0050a0");
    ctx.fillStyle=bg;
    ctx.beginPath(); ctx.arc(cx,cy,24,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,0.80)"; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(cx,cy,23,0,Math.PI*2); ctx.stroke();

    // ── Desenho de asa (reutilizável para esq. e dir.) ─────────
    function wing(dir) { // dir = -1 esq, +1 dir
      ctx.save();
      ctx.translate(cx + dir*3, cy+2);
      ctx.scale(dir, 1);

      // Silhueta principal da asa — forma de asa de anjo
      const wg = ctx.createLinearGradient(0,-14,26,4);
      wg.addColorStop(0,"#fffbe0");
      wg.addColorStop(0.45,"#ffd740");
      wg.addColorStop(1,"#e08000");
      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.moveTo(0, 4);                         // base interior
      ctx.bezierCurveTo( 4,  4,  8, -2, 12,-10); // bordo superior
      ctx.bezierCurveTo(18,-16, 26,-14, 28, -6); // ponta da asa
      ctx.bezierCurveTo(24,  2, 16,  6,  8,  8); // bordo inferior
      ctx.bezierCurveTo( 4,  8,  0,  6,  0,  4);
      ctx.closePath();
      ctx.fill();

      // Contorno fino
      ctx.strokeStyle="rgba(160,80,0,0.50)"; ctx.lineWidth=0.8;
      ctx.stroke();

      // ── 4 penas sobrepostas ──────────────────────────────────
      const penas = [
        {x:4,  y:2,  a:-0.30, l:12, w:3.2},
        {x:9,  y:-2, a:-0.52, l:14, w:3.5},
        {x:15, y:-6, a:-0.72, l:14, w:3.2},
        {x:21, y:-9, a:-0.88, l:11, w:2.6},
      ];
      penas.forEach((p,i)=>{
        const t = i/3;
        const c1 = `rgba(255,${245-i*20},${100-i*15},0.95)`;
        const c2 = `rgba(255,${220-i*20},${60-i*10},0)`;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.a);
        const fg=ctx.createLinearGradient(0,-p.w/2, p.l, p.w/2);
        fg.addColorStop(0,c1); fg.addColorStop(0.6,c1); fg.addColorStop(1,c2);
        ctx.fillStyle=fg;
        // Pena com forma ligeiramente arqueada
        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.bezierCurveTo(p.l*0.3,-p.w*0.7, p.l*0.7,-p.w*0.5, p.l,0);
        ctx.bezierCurveTo(p.l*0.7, p.w*0.5, p.l*0.3, p.w*0.7, 0,0);
        ctx.fill();
        // Veia central
        ctx.strokeStyle="rgba(200,120,0,0.35)"; ctx.lineWidth=0.7;
        ctx.beginPath(); ctx.moveTo(1,0); ctx.lineTo(p.l-2,0); ctx.stroke();
        ctx.restore();
      });

      // Brilho topo da asa
      ctx.fillStyle="rgba(255,255,255,0.30)";
      ctx.beginPath();
      ctx.moveTo(2, 2);
      ctx.bezierCurveTo(5,-6, 14,-12, 20,-8);
      ctx.bezierCurveTo(14,-5, 6,-2, 2, 2);
      ctx.fill();

      ctx.restore();
    }

    wing(-1); // asa esquerda
    wing(1);  // asa direita

    // ── Setas ↑↑ douradas com contorno ────────────────────────
    [[cy-8],[cy+2]].forEach(([ay])=>{
      ctx.fillStyle="#ffe040"; ctx.strokeStyle="#7a4000"; ctx.lineWidth=1.2;
      ctx.beginPath();
      ctx.moveTo(cx,     ay-5);   // ponta
      ctx.lineTo(cx-5,   ay+1);
      ctx.lineTo(cx-2.5, ay+1);
      ctx.lineTo(cx-2.5, ay+5);
      ctx.lineTo(cx+2.5, ay+5);
      ctx.lineTo(cx+2.5, ay+1);
      ctx.lineTo(cx+5,   ay+1);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    });

    // Brilho central
    ctx.fillStyle="rgba(255,255,255,0.55)";
    ctx.beginPath(); ctx.ellipse(cx,cy-6,5,4,0,0,Math.PI*2); ctx.fill();

    tex.refresh();
  }
}

// ===== VanBerto — robozinho 100% original do jogo da UE =====
function rrVan(ctx,x,y,w,h,r){
  const rr=Math.min(r,w/2,h/2);
  ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();
}
function cVan(ctx,x,y,r){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
function cfVan(ctx,x,y,r,color){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
function lVan(ctx,x1,y1,x2,y2){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}

function makeVanBertoTexture(scene,key,blink,step,armsUp){
  if(scene.textures.exists(key)) return;
  const w=96,h=96, tex=scene.textures.createCanvas(key,w,h), ctx=tex.getContext();
  ctx.clearRect(0,0,w,h);
  ctx.lineJoin="round"; ctx.lineCap="round";
  // Desloca todo o desenho 6px para baixo para o halo da antena (y≈0) não ser cortado.
  // O setOffset do corpo físico foi ajustado em igual medida para o robô ficar na mesma posição no ecrã.
  ctx.save(); ctx.translate(0, 6);
  const NAVY="#16233e", NAVY2="#26365a", OUT="#101a30";
  function white(x0,y0,x1,y1){const g=ctx.createLinearGradient(x0,y0,x1,y1);g.addColorStop(0,"#ffffff");g.addColorStop(0.55,"#e6edf7");g.addColorStop(1,"#b4c4dc");return g;}

  // ===== PERNAS (bem visíveis por baixo do tronco; passo marcado) =====
  const LIFT=8, STRIDE=3;
  let lTop=70, rTop=70, lDX=0, rDX=0;          // topo da coxa; planta=70 -> pé a y=88
  if(step===0){ lTop=70-LIFT; lDX=STRIDE; rDX=-STRIDE; }
  else if(step===1){ rTop=70-LIFT; rDX=STRIDE; lDX=-STRIDE; }
  function leg(cx,top){
    rrVan(ctx,cx-5,top,10,11,4.5); ctx.fillStyle=white(cx-5,top,cx+5,top); ctx.fill();
    ctx.lineWidth=2.6; ctx.strokeStyle=OUT; ctx.stroke();
    const fy=top+9;
    rrVan(ctx,cx-6.5,fy,13,9,4); ctx.fillStyle=NAVY; ctx.fill();
    ctx.lineWidth=2.6; ctx.strokeStyle=OUT; ctx.stroke();
    rrVan(ctx,cx-6.5,fy+2,13,2.4,1.2); ctx.fillStyle="rgba(255,255,255,0.85)"; ctx.fill();
    cfVan(ctx,cx-2.5,fy+4.5,1.4,"rgba(255,255,255,0.5)");
  }
  leg(41+lDX,lTop); leg(55+rDX,rTop);

  // ===== BRAÇOS (curtos e encostados; balançam ao contrário da perna do
  // mesmo lado — braço esquerdo para trás quando a perna esquerda avança,
  // tal como um passo natural — só nos frames de caminhar, step 0/1) =====
  // Frame de salto (armsUp=true): braços erguidos quase direitos para cima,
  // só com uma ligeira inclinação para fora — ignora o balanço de andar,
  // usa outro ângulo. (Era 2.4 rad, o que punha as mãos longe do corpo,
  // com um ar "descolado"; a 2.9 rad ficam coladas à cabeça, só saindo
  // ligeiramente para os lados.)
  const ARM_SWING = 0.24; // radianos
  const JUMP_RAISE = 2.9; // radianos — braço roda de "para baixo" para "quase direito para cima"
  let lArmSwing = 0, rArmSwing = 0;
  if(armsUp){ lArmSwing = JUMP_RAISE; rArmSwing = -JUMP_RAISE; }
  else if(step===0){ lArmSwing=-ARM_SWING; rArmSwing=ARM_SWING; }
  else if(step===1){ lArmSwing=ARM_SWING; rArmSwing=-ARM_SWING; }
  function arm(sx,swing){
    ctx.save();
    const px=sx+4.5, py=52; // pivô no ombro
    ctx.translate(px,py); ctx.rotate(swing); ctx.translate(-px,-py);
    rrVan(ctx,sx,52,9,13,4.5); ctx.fillStyle=white(sx,52,sx+9,52); ctx.fill();
    ctx.lineWidth=2.6; ctx.strokeStyle=OUT; ctx.stroke();
    const hx=sx+4.5, hy=67;
    cfVan(ctx,hx,hy,5,NAVY);
    ctx.lineWidth=2.3; ctx.strokeStyle=OUT; ctx.beginPath(); ctx.arc(hx,hy,5,0,Math.PI*2); ctx.stroke();
    cfVan(ctx,hx-2,hy+1.6,1.4,NAVY2); cfVan(ctx,hx+0.5,hy+2.4,1.4,NAVY2); cfVan(ctx,hx+2.5,hy+1.6,1.4,NAVY2);
    ctx.restore();
  }
  arm(17,lArmSwing); arm(70,rArmSwing);

  // ===== TRONCO (estreito: x26–70, igual à cabeça) =====
  rrVan(ctx,26,44,44,32,15); ctx.fillStyle=white(28,46,68,46); ctx.fill();
  ctx.save(); rrVan(ctx,26,44,44,32,15); ctx.clip();
  const wg=ctx.createLinearGradient(0,64,0,76); wg.addColorStop(0,"rgba(22,35,62,0)"); wg.addColorStop(0.4,"#1c2c4c"); wg.addColorStop(1,"#142038");
  ctx.fillStyle=wg; ctx.fillRect(26,62,44,16);
  ctx.strokeStyle="rgba(16,26,48,0.6)"; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(28,64); ctx.lineTo(68,64); ctx.stroke();
  ctx.fillStyle="rgba(255,255,255,0.5)"; ctx.beginPath(); ctx.ellipse(36,52,9,5.5,-0.5,0,Math.PI*2); ctx.fill();
  ctx.restore();
  ctx.lineWidth=3; ctx.strokeStyle=OUT; rrVan(ctx,26,44,44,32,15); ctx.stroke();

  // ===== PAINEL DO PEITO =====
  cfVan(ctx,48,56,8,NAVY);
  ctx.lineWidth=2.5; ctx.strokeStyle=OUT; ctx.beginPath(); ctx.arc(48,56,8,0,Math.PI*2); ctx.stroke();
  const dome=ctx.createRadialGradient(45.5,53.5,1,48,56,7); dome.addColorStop(0,"#aebccf"); dome.addColorStop(0.6,"#5a6a85"); dome.addColorStop(1,"#2b3a57");
  ctx.fillStyle=dome; ctx.beginPath(); ctx.arc(48,56,5.7,0,Math.PI*2); ctx.fill();
  cfVan(ctx,46,53.8,1.5,"rgba(255,255,255,0.85)");

  // ===== EAR PODS (atrás do capacete) =====
  function pod(cx){
    cfVan(ctx,cx,32,6,NAVY);
    ctx.lineWidth=2.3; ctx.strokeStyle=OUT; ctx.beginPath(); ctx.arc(cx,32,6,0,Math.PI*2); ctx.stroke();
    cfVan(ctx,cx,32,2.8,NAVY2); cfVan(ctx,cx-0.8,31,1,"rgba(255,255,255,0.6)");
  }
  pod(25); pod(71);

  // ===== ANTENA =====
  ctx.fillStyle=NAVY; ctx.beginPath(); ctx.moveTo(45,16); ctx.lineTo(51,16); ctx.lineTo(49.2,8); ctx.lineTo(46.8,8); ctx.closePath(); ctx.fill();
  const halo=ctx.createRadialGradient(48,5,1,48,5,11); halo.addColorStop(0,"rgba(90,200,255,0.55)"); halo.addColorStop(1,"rgba(90,200,255,0)");
  ctx.fillStyle=halo; ctx.beginPath(); ctx.arc(48,5,11,0,Math.PI*2); ctx.fill();
  const bg=ctx.createRadialGradient(46.3,3.5,0.5,48,5,5.5); bg.addColorStop(0,"#e6f7ff"); bg.addColorStop(0.4,"#48b4ff"); bg.addColorStop(1,"#1670d8");
  ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(48,5,5.5,0,Math.PI*2); ctx.fill();
  cfVan(ctx,46.2,3.4,1.6,"#ffffff");

  // ===== CAPACETE =====
  rrVan(ctx,26,14,44,34,17); ctx.fillStyle=white(28,15,68,15); ctx.fill();
  ctx.lineWidth=3; ctx.strokeStyle=OUT; ctx.stroke();
  ctx.save(); rrVan(ctx,26,14,44,34,17); ctx.clip();
  ctx.fillStyle="rgba(255,255,255,0.6)"; ctx.beginPath(); ctx.ellipse(38,19,10,4,-0.5,0,Math.PI*2); ctx.fill(); ctx.restore();

  // ===== MOLDURA + VISEIRA =====
  rrVan(ctx,30,20,36,23,12); ctx.fillStyle=NAVY; ctx.fill();
  rrVan(ctx,32.5,22,31,19,10);
  const vg=ctx.createLinearGradient(0,22,0,41); vg.addColorStop(0,"#7fd4ff"); vg.addColorStop(0.5,"#2a9bf0"); vg.addColorStop(1,"#1366c6");
  ctx.fillStyle=vg; ctx.fill();
  ctx.save(); rrVan(ctx,32.5,22,31,19,10); ctx.clip();
  ctx.fillStyle="rgba(255,255,255,0.45)"; ctx.beginPath(); ctx.ellipse(42,25,9,3.5,-0.4,0,Math.PI*2); ctx.fill(); ctx.restore();

  // ===== OLHOS =====
  if(!blink){
    ctx.fillStyle="#0a0f1c";
    ctx.beginPath(); ctx.ellipse(41,30,3.3,4,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(55,30,3.3,4,0,0,Math.PI*2); ctx.fill();
    cfVan(ctx,42.3,28.4,1.5,"#fff"); cfVan(ctx,39.9,31,0.8,"#fff");
    cfVan(ctx,56.3,28.4,1.5,"#fff"); cfVan(ctx,53.9,31,0.8,"#fff");
  } else if(blink==="wink"){
    // pisca-olho brincalhão — olho esquerdo aberto normal, direito fechado num arco
    ctx.fillStyle="#0a0f1c";
    ctx.beginPath(); ctx.ellipse(41,30,3.3,4,0,0,Math.PI*2); ctx.fill();
    cfVan(ctx,42.3,28.4,1.5,"#fff"); cfVan(ctx,39.9,31,0.8,"#fff");
    ctx.lineWidth=3; ctx.strokeStyle="#0a0f1c"; ctx.lineCap="round";
    ctx.beginPath(); ctx.arc(55,31,3.5,0.15*Math.PI,0.85*Math.PI); ctx.stroke();
  } else if(blink==="happy"){
    // sorriso grande e feliz — olhos fechados em arco (mais generosos que o piscar normal)
    // + bochechas coradas, para se distinguir claramente do sorriso base neutro.
    ctx.lineWidth=3.2; ctx.strokeStyle="#0a0f1c"; ctx.lineCap="round";
    ctx.beginPath(); ctx.arc(41,31,3.9,0.10*Math.PI,0.90*Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(55,31,3.9,0.10*Math.PI,0.90*Math.PI); ctx.stroke();
    cfVan(ctx,33.5,35.5,3,"rgba(255,120,120,0.55)");
    cfVan(ctx,62.5,35.5,3,"rgba(255,120,120,0.55)");
  } else if(blink==="sad"){
    // sobrancelhas preocupadas (inclinadas para cima no centro) + olhos tristes + lágrima
    ctx.strokeStyle="#0a0f1c"; ctx.lineWidth=2.3; ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(37,24); ctx.lineTo(44.5,27); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(59,24); ctx.lineTo(51.5,27); ctx.stroke();
    ctx.fillStyle="#0a0f1c";
    ctx.beginPath(); ctx.ellipse(41,32,2.8,3.1,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(55,32,2.8,3.1,0,0,Math.PI*2); ctx.fill();
    cfVan(ctx,42,30.7,1.1,"#fff"); cfVan(ctx,56,30.7,1.1,"#fff");
    // lagrimazinha a escorrer do olho direito
    ctx.fillStyle="#6fd0ff";
    ctx.beginPath();
    ctx.moveTo(56,35); ctx.quadraticCurveTo(59,40,56,43.5); ctx.quadraticCurveTo(53,40,56,35);
    ctx.closePath(); ctx.fill();
  } else {
    // piscar feliz — arcos ^_^
    ctx.lineWidth=3; ctx.strokeStyle="#0a0f1c";
    ctx.beginPath(); ctx.arc(41,31,3.5,0.15*Math.PI,0.85*Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(55,31,3.5,0.15*Math.PI,0.85*Math.PI); ctx.stroke();
  }
  // ===== BOCA — sorriso aberto e contente (variantes: maior no pisca-olho/feliz, invertida na tristeza) =====
  ctx.fillStyle="#0a0f1c";
  if(blink==="wink"){
    ctx.beginPath(); ctx.ellipse(48,36,5.6,3.6,0,0,Math.PI); ctx.fill();   // sorriso maroto, um pouco mais largo
    ctx.fillStyle="#ff7a7a";
    ctx.beginPath(); ctx.ellipse(48,37.6,2.9,1.7,0,0,Math.PI); ctx.fill();
  } else if(blink==="happy"){
    ctx.beginPath(); ctx.ellipse(48,36,6.2,4.2,0,0,Math.PI); ctx.fill();   // sorriso grande, o maior de todos
    ctx.fillStyle="#ff7a7a";
    ctx.beginPath(); ctx.ellipse(48,38,3.2,1.9,0,0,Math.PI); ctx.fill();
  } else if(blink==="sad"){
    // boca triste — arco invertido, cantos para baixo (sem preenchimento, só o traço)
    ctx.strokeStyle="#0a0f1c"; ctx.lineWidth=2.4; ctx.lineCap="round";
    ctx.beginPath(); ctx.arc(48,40,4.2,Math.PI,Math.PI*2); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.ellipse(48,36,4.6,3.2,0,0,Math.PI); ctx.fill();   // metade de baixo = sorriso
    ctx.fillStyle="#ff7a7a";
    ctx.beginPath(); ctx.ellipse(48,37.4,2.4,1.5,0,0,Math.PI); ctx.fill(); // línguinha
  }

  ctx.restore();
  tex.refresh();
}
