// ===== Definição dos níveis e paletas visuais =====
// THEMES, LEVELS

export const THEMES = [
  // ── 20 paletas, agora agrupadas em 4 "famílias" — uma por mundo do mapa —
  // para o visual dos níveis acompanhar a arte dos mundos (dia, cidade-tech,
  // fortaleza noturna, cidade neon). Dentro de cada família mantém-se
  // variação nível a nível, só a família (dia/noite, gama de cor) é comum.
  // Reino dos Fundamentos (níveis 1,2,3,6,10) — dia, prado alegre 🌍
  { skyTop:0x1a6ab5, skyBot:0x8ed6f8, hillColor:0x2e9e52, grassTop:0x44cc6a }, //  0 · Nível  1 — azul rico de manhã
  { skyTop:0x2a7fd0, skyBot:0xffe0a0, hillColor:0x3aa860, grassTop:0x58cc78 }, //  1 · Nível  2 — manhã dourada quente
  { skyTop:0x0088a0, skyBot:0x70e8e0, hillColor:0x0a8a78, grassTop:0x20c8b0 }, //  2 · Nível  3 — aqua tropical
  { skyTop:0x0a70a8, skyBot:0x9ee4ff, hillColor:0x155a90, grassTop:0x2e7fb8 }, //  3 · Nível  4 — azul-ciano tech (Comunicação Segura)
  { skyTop:0x1470c0, skyBot:0xa8e0ff, hillColor:0x2050a0, grassTop:0x3878c8 }, //  4 · Nível  5 — azul tech claro (Comunicação Segura)
  { skyTop:0x2a90d8, skyBot:0xb8f0ff, hillColor:0x3ab850, grassTop:0x5cd868 }, //  5 · Nível  6 — verde-primavera brilhante (Fundamentos)
  { skyTop:0x0a1040, skyBot:0x3a2a78, hillColor:0x1a1050, grassTop:0x2a1868 }, //  6 · Nível  7 — índigo noturno (Fortaleza) 🌙
  { skyTop:0x5a0030, skyBot:0xff80b8, hillColor:0xb02070, grassTop:0xd83090 }, //  7 · Nível  8 — magenta neon (Cidade da Identidade) 🌙
  { skyTop:0x0888c0, skyBot:0x90e8f8, hillColor:0x106898, grassTop:0x2088b8 }, //  8 · Nível  9 — azul tech (Comunicação Segura)
  { skyTop:0x3a7fc0, skyBot:0xffd890, hillColor:0xc07010, grassTop:0xe0a020 }, //  9 · Nível 10 — âmbar dourado (Fundamentos)
  { skyTop:0x1a0838, skyBot:0xd040c8, hillColor:0x3a1868, grassTop:0x581e88 }, // 10 · Nível 11 — magenta-roxo neon (Cidade da Identidade) 🌙
  { skyTop:0x120a48, skyBot:0x4a2c88, hillColor:0x201060, grassTop:0x321878 }, // 11 · Nível 12 — índigo profundo (Fortaleza) 🌙
  { skyTop:0x2a0050, skyBot:0xa860f0, hillColor:0x5010a0, grassTop:0x7030c0 }, // 12 · Nível 13 — violeta mágico (Fortaleza) 🌙
  { skyTop:0x160a4a, skyBot:0x5a3898, hillColor:0x281270, grassTop:0x3a2088 }, // 13 · Nível 14 — roxo profundo (Fortaleza) 🌙
  { skyTop:0x0a1050, skyBot:0x40c8ff, hillColor:0x1a2878, grassTop:0x2848a0 }, // 14 · Nível 15 — ciano neon sobre céu escuro (Cidade da Identidade) 🌙
  { skyTop:0x1a0838, skyBot:0xff60d0, hillColor:0x381860, grassTop:0x502080 }, // 15 · Nível 16 — rosa-neon noturno (Cidade da Identidade) 🌙
  { skyTop:0x1858a8, skyBot:0x90d0ff, hillColor:0x204888, grassTop:0x3068a8 }, // 16 · Nível 17 — azul tech (Comunicação Segura)
  { skyTop:0x1a0a50, skyBot:0x6040a0, hillColor:0x2c1878, grassTop:0x402090 }, // 17 · Nível 18 — roxo-fortaleza (Fortaleza) 🌙
  { skyTop:0x100848, skyBot:0x4c2c90, hillColor:0x241468, grassTop:0x361c80 }, // 18 · Nível 19 — roxo-ameixa (Fortaleza) 🌙
  { skyTop:0xff6a1a, skyBot:0xffe39a, hillColor:0xe0871a, grassTop:0x5ec85a }, // 19 · Nível 20 — FINAL festivo pôr-do-sol dourado (mantido — é o grande final, fica fora da família do seu mundo de propósito)
];

// ── Canos (pedido: posições variadas, nem todos entráveis — "tipo Mario"). ──
// Cada entrada em L.pipes[] pode ser:
//   • Cano de sala secreta: {x,y,room:true,kind,returnX?,returnY?} — leva a
//     uma SALA SECRETA ISOLADA "tipo os bosses": o nível principal inteiro
//     é escondido (sem nada ser destruído) e trocado por uma salinha à
//     parte, pequena e independente, com fundo totalmente redesenhado —
//     não é uma plataforma algures no mesmo mundo do nível. kind é a
//     recompensa (🔑 balao / 🔒 balaofesta / ⭐ estrela / ❤️ heart /
//     🛡️ medalha). Por OMISSÃO o regresso é pelo MESMO cano em que se
//     entrou (returnX/returnY não definidos) — não se desenha nenhum cano
//     extra, o VanBerto's simplesmente volta a sair pelo cano físico que já
//     lá está. Só define returnX/returnY quando o regresso tiver mesmo de
//     ficar noutro sítio do nível (usado só no Nível 4, de propósito, como
//     atalho alternativo ao vão do trampolim) — nesse caso é desenhado um
//     2º cano no ponto de regresso, que também é ENTRÁVEL (dá para voltar a
//     entrar por ali e visitar a sala secreta outra vez). O cano de volta dentro
//     da própria sala secreta é sempre criado automaticamente pelo motor,
//     não precisa de ser definido aqui. Ver ROOM_* e
//     enterSecretRoomFlow()/exitSecretRoomFlow() em dia-crianca.js.
//   • Cano decorativo: {x,y,decorative:true} — não entra, é só obstáculo/
//     mistério (tint subtil aplicado automaticamente no motor).
// Ver comentário completo em dia-crianca.js junto a "let pipes=[]".
export const LEVELS = [
  {
    name: "Nível 1 — Nasce a Internet",
    artIdx:0, theme:0, quizTheme:"historia_internet", worldW:2900,
    spawn:{x:480,y:460}, doorX:2400,
    // signX: por defeito o letreiro ficaria em spawn.x+240 (=720). Colocado
    // bem antes do túnel (que agora só começa em x=850) — a criança lê a
    // dica de "agachar" com tempo de sobra antes de encontrar o obstáculo.
    signX: 800,
    platforms:[
      // Chão inicial alargado (era w:900) — dá muito mais espaço livre a
      // seguir ao spawn (480) antes de qualquer obstáculo ou vilão aparecer.
      {x:600,y:520,w:1200,h:28},
      // Túnel baixo — demonstração da nova funcionalidade de agachar (↓/S).
      // Vão de 34px entre o chão (topo em y=506) e este teto (fundo em y=472):
      // alto demais para passar de pé (corpo normal ~48px), mas cabe agachado
      // (corpo ~24px). Empurrado para x:850-1050 (era 550-750), dando à
      // criança uma boa distância de corrida livre antes do 1º obstáculo.
      {x:950,y:461,w:200,h:22},
      {x:1340,y:450,w:300,h:22},{x:1680,y:380,w:270,h:22},
      {x:2000,y:310,w:240,h:22},{x:2350,y:520,w:900,h:28},
      // Plataforma alta — pedido: "uma mistura, alguns para a sala secreta,
      // outros para plataformas mais altas". Bem acima da plataforma de
      // entrada (~270px de folga vs. os ~192px do salto normal), mas com
      // margem suficiente do topo do ecrã (y:0) para o VanBerto's nunca
      // ficar cortado.
      {x:570,y:200,w:160,h:22}
    ],
    // 1º par de canos do jogo, de demonstração — mostra o mecanismo
    // clássico de atalho para plataforma alta (não uma sala isolada).
    // Entra-se parando em cima e carregando em baixo/S. O regresso pousa
    // em x:670 (não em cima do próprio cano de entrada) para não disparar
    // logo outra vez ao aterrar.
    pipes:[
      {x:570,y:474,toX:620,toY:157},
      {x:620,y:157,toX:570,toY:474}
    ],
    items:[{x:1340,y:400,kind:"estrela"},{x:1680,y:330,kind:"medalha"},{x:2000,y:260,kind:"brinquedo"},{x:570,y:160,kind:"estrela"}],
    // Vilões empurrados para a direita, na mesma proporção do resto do nível
    // (era x:1500/1960) — o 1º só aparece bem depois do túnel e do 2º item,
    // dando à criança um troço inicial bem mais longo e calmo.
    malwares:[{x:1800,y:480,vx:0,pattern:"mini"},{x:2260,y:480,vx:-150,pattern:"patrol"}]
  },
  {
    name: "Nível 2 — Palavras-passe Fortes",
    artIdx:1, theme:1, quizTheme:"palavras_passe", worldW:2800,
    spawn:{x:480,y:460}, doorX:2350,
    platforms:[
      {x:520,y:520,w:980,h:28},{x:900,y:450,w:240,h:22},{x:1180,y:380,w:240,h:22},
      {x:1460,y:310,w:240,h:22},{x:1740,y:380,w:240,h:22},{x:2020,y:450,w:240,h:22},
      {x:2380,y:520,w:980,h:28}
    ],
    // 1 par, a meio do nível — recompensa: ❤️ vida extra.
    pipes:[
      {x:1180,y:337,room:true,kind:"heart",fact:"Sabias que a Declaração de 1959 tinha 10 princípios para proteger as crianças?"}
    ],
    items:[{x:900,y:400,kind:"balao"},{x:1460,y:260,kind:"medalha"},{x:1740,y:330,kind:"estrela"}],
    malwares:[{x:1320,y:480,vx:0,pattern:"mini"},{x:2140,y:480,vx:-155,pattern:"patrol"}]
  },
  {
    name: "Nível 3 — Não Partilhes Dados Pessoais",
    artIdx:2, theme:2, quizTheme:"dados_pessoais", worldW:2900,
    spawn:{x:480,y:460}, doorX:2500,
    // signX: por defeito o letreiro/informação ficaria em spawn.x+240 (=720), que
    // cai mesmo debaixo da plataforma elevada {x:840,y:460,w:240} (720-960).
    // Movido para a esquerda, para zona livre entre o coração (x:560) e essa
    // plataforma — confirmado sem sobreposição com nenhuma plataforma/item.
    signX: 630,
    platforms:[
      {x:520,y:520,w:1040,h:28},{x:840,y:460,w:240,h:22},{x:1180,y:390,w:240,h:22},
      {x:1520,y:320,w:240,h:22},{x:1860,y:390,w:240,h:22},{x:2200,y:460,w:240,h:22},
      {x:2480,y:520,w:1040,h:28}
    ],
    // Nível SEM túneis (variedade — pedido: "alguns níveis podem não ter
    // túneis") — segue-se logo a seguir a um nível com túnel a meio (Nível 2)
    // e antecede um nível com 2 pares (Nível 4), reforçando que a mecânica
    // não aparece sempre da mesma forma.
    items:[{x:840,y:220,kind:"estrela"},{x:1520,y:270,kind:"medalha"},{x:2200,y:410,kind:"brinquedo"},{x:560,y:470,kind:"heart"}],
    malwares:[{x:1000,y:480,vx:0,pattern:"mini"},{x:1700,y:480,vx:-160,pattern:"patrol"},{x:2350,y:480,vx:155,pattern:"patrol"}]
  },
  {
    name: "Nível 4 — Quem Nos Protege Online",
    artIdx:3, theme:3, quizTheme:"instituicoes_apoio", worldW:3300,
    spawn:{x:480,y:460}, doorX:2950,
    // Layout: "trampolim central obrigatório" — vão largo a meio onde o trampolim é o único caminho
    platforms:[
      {x:520,y:520,w:1000,h:28},
      {x:840,y:440,w:200,h:22},
      {x:1080,y:360,w:200,h:22},
      {x:1320,y:460,w:140,h:22},   // plataforma baixa antes do vão
      // Vão de 400px — só o trampolim chega ao outro lado
      {x:1880,y:460,w:140,h:22},   // plataforma baixa depois do vão
      {x:2100,y:360,w:200,h:22},
      {x:2340,y:440,w:200,h:22},
      {x:2580,y:360,w:200,h:22},
      {x:2980,y:520,w:1000,h:28},
      // Plataforma alta do 1º cano — ver Nível 1.
      {x:650,y:200,w:160,h:22}
    ],
    // 2 pares — mistura pedida: o 1º é o atalho clássico para uma
    // plataforma alta (fica no mesmo mundo do nível), o 2º leva à sala
    // secreta isolada, por cima do vão do trampolim.
    pipes:[
      {x:650,y:474,toX:600,toY:157},
      {x:600,y:157,toX:650,toY:474},
      {x:1320,y:417,room:true,kind:"estrela",returnX:1880,returnY:417,fact:"Sabias que a UNICEF foi criada em 1946, logo a seguir à 2ª Guerra Mundial?"}
    ],
    items:[{x:840,y:390,kind:"brinquedo"},{x:1080,y:310,kind:"estrela"},{x:1600,y:330,kind:"duplosalto"},{x:2100,y:310,kind:"balao"},{x:2580,y:310,kind:"medalha"},{x:560,y:470,kind:"heart"},{x:650,y:165,kind:"balao"}],
    malwares:[{x:980,y:480,vx:180,pattern:"patrol"},{x:1580,y:480,vx:-183,pattern:"jumper"},{x:2040,y:480,vx:182,pattern:"jumper"},{x:2450,y:480,vx:-179,pattern:"jumper"},{x:2780,y:480,vx:177}],
    trampolines:[{x:1600,y:462}],
    secrets:[{x:1190,y:355,kind:"estrela",points:25}]
  },
  {
    name: "Nível 5 — Vírus e Malware",
    artIdx:4, theme:4, quizTheme:"virus_malware", worldW:3100,
    spawn:{x:480,y:460}, doorX:2950,
    platforms:[
      {x:520,y:520,w:1000,h:28},{x:880,y:450,w:220,h:22},{x:1160,y:380,w:220,h:22},
      {x:1460,y:310,w:220,h:22},{x:1760,y:380,w:220,h:22},{x:2060,y:450,w:220,h:22},
      {x:2360,y:380,w:220,h:22},{x:2660,y:520,w:1000,h:28},
      // Plataforma alta — ver Nível 1.
      {x:1760,y:154,w:150,h:22}
    ],
    // 1 par, em cima de uma plataforma a meio do nível — atalho clássico
    // para plataforma alta — recompensa: 🔒 cadeado especial.
    pipes:[
      {x:1760,y:337,toX:1810,toY:111},
      {x:1810,y:111,toX:1760,toY:337}
    ],
    items:[{x:880,y:230,kind:"estrela"},{x:1460,y:260,kind:"brinquedo"},{x:2060,y:400,kind:"balao"},{x:2360,y:330,kind:"medalha"},{x:1760,y:119,kind:"balaofesta"}],
    malwares:[{x:1020,y:480,vx:165},{x:1620,y:480,vx:-170},{x:2220,y:480,vx:165},{x:2820,y:480,vx:-160}],
    trampolines:[{x:1310,y:462},{x:2210,y:462}],
    secrets:[{x:740,y:470,kind:"estrela",points:20}]
  },
  {
    name: "Nível 6 — Jogar em Segurança",
    artIdx:5, theme:5, quizTheme:"jogos_seguros", worldW:3100,
    spawn:{x:480,y:460}, doorX:2700,
    // Layout: ilhas a alturas variadas — umas altas, outras baixas, sem padrão regular
    platforms:[
      {x:520,y:520,w:960,h:28},
      {x:860,y:430,w:180,h:22},
      {x:1100,y:340,w:220,h:22},
      {x:1340,y:460,w:160,h:22},
      {x:1560,y:310,w:200,h:22},
      {x:1800,y:410,w:180,h:22},
      {x:2050,y:340,w:160,h:22},
      {x:2260,y:450,w:190,h:22},
      {x:2500,y:370,w:170,h:22},
      {x:2720,y:520,w:960,h:28}
    ],
    // 1 par, perto do fim do nível — recompensa: 🛡️ escudo.
    pipes:[
      {x:2260,y:407,room:true,kind:"medalha",fact:"Sabias que brincar ajuda o cérebro a crescer tanto como estudar?"}
    ],
    items:[{x:860,y:380,kind:"medalha"},{x:1100,y:290,kind:"duplosalto"},{x:1560,y:260,kind:"estrela"},{x:2050,y:290,kind:"brinquedo"},{x:560,y:470,kind:"heart"}],
    malwares:[{x:1010,y:480,vx:170},{x:1480,y:480,vx:-170},{x:1940,y:480,vx:172},{x:2400,y:480,vx:-168},{x:2720,y:480,vx:165}],
    trampolines:[{x:1220,y:462}],
    secrets:[{x:2160,y:355,kind:"estrela",points:20}]
  },
  {
    name: "Nível 7 — A Tua Pegada Digital",
    artIdx:6, theme:6, quizTheme:"pegada_digital", worldW:2800,
    spawn:{x:480,y:460}, doorX:2630,
    // signX: por defeito o letreiro/informação ficaria em spawn.x+240 (=720),
    // o que cai quase em cima do 1º trampolim (x:680) e a poucos passos do
    // vilão logo a seguir (x:650, pattern "mini") — informação, trampolim e
    // vilão todos empilhados na mesma zona pequena. Movido para 540: zona
    // livre logo a seguir ao spawn, bem antes desse conjunto.
    signX: 540,
    // ══ MECÂNICA ESPECIAL: TRAMPOLINS ══
    // Plataformas mais largas (240px) e vãos mais curtos (~200px) — acessível em mobile.
    // Os trampolins são o caminho principal mas um bom salto normal chega às plataformas mais baixas.
    // Tematicamente: "brincar é essencial — sem brincar não chegas lá!"
    platforms:[
      // Ilhas separadas por vãos de ~200px — desafiante mas praticável em telemóvel
      {x:500,y:390,w:240,h:22},
      {x:880,y:430,w:240,h:22},
      {x:1260,y:370,w:240,h:22},
      {x:1640,y:420,w:240,h:22},
      {x:2020,y:360,w:240,h:22},
      {x:2400,y:410,w:240,h:22},
      // Plataforma final com o portal
      {x:2580,y:518,w:260,h:22}
    ],
    // Trampolins entre ilhas — caminho mais rápido e divertido
    trampolines:[
      {x:680,y:490},{x:1060,y:490},{x:1440,y:490},
      {x:1820,y:490},{x:2200,y:490}
    ],
    items:[
      {x:500,y:340,kind:"estrela"},{x:880,y:380,kind:"brinquedo"},
      {x:1260,y:320,kind:"medalha"},{x:1640,y:370,kind:"duplosalto"},
      {x:2020,y:310,kind:"balao"}
    ],
    malwares:[
      {x:650,y:480,vx:0,pattern:"mini"},
      {x:1030,y:480,vx:-145,pattern:"patrol"},
      {x:1410,y:480,vx:150,pattern:"patrol"},
      {x:1790,y:480,vx:-150,pattern:"jumper"},
      {x:2170,y:480,vx:145,pattern:"jumper"}
    ],
    secrets:[{x:1060,y:415,kind:"estrela",points:20}]
  },
  {
    name: "Nível 8 — Notícias Falsas (Fake News)",
    artIdx:7, theme:7, quizTheme:"fake_news", worldW:3400,
    spawn:{x:480,y:460}, doorX:3050,
    // Layout: "cascata de terraços" — desce e sobe de forma orgânica, com plataformas a alturas muito variadas
    platforms:[
      {x:520,y:520,w:960,h:28},
      {x:800,y:420,w:170,h:22},
      {x:980,y:330,w:150,h:22},
      {x:1140,y:460,w:150,h:22},   // buraco entre grupos
      {x:1600,y:270,w:160,h:22},   // pico alto
      {x:1820,y:370,w:170,h:22},
      {x:2050,y:450,w:150,h:22},
      {x:2270,y:340,w:170,h:22},
      {x:2500,y:420,w:160,h:22},
      {x:2720,y:310,w:170,h:22},
      {x:3080,y:520,w:960,h:28},
      // Plataforma alta do 1º cano — ver Nível 1.
      {x:500,y:200,w:160,h:22}
    ],
    // 2 pares — mistura: o 1º é o atalho clássico para plataforma alta, o
    // 2º a meio do nível leva à sala secreta isolada.
    pipes:[
      {x:570,y:474,toX:450,toY:157},
      {x:450,y:157,toX:570,toY:474},
      {x:1820,y:327,room:true,kind:"balaofesta",fact:"Sabias que há mais de 7000 línguas faladas no mundo inteiro?"}
    ],
    items:[{x:800,y:220,kind:"estrela"},{x:980,y:280,kind:"balao"},{x:1600,y:220,kind:"medalha"},{x:2270,y:290,kind:"brinquedo"},{x:2720,y:260,kind:"duplosalto"},{x:500,y:165,kind:"medalha"}],
    malwares:[{x:940,y:480,vx:185,pattern:"jumper"},{x:1490,y:480,vx:-188,pattern:"jumper"},{x:1960,y:480,vx:186,pattern:"jumper"},{x:2400,y:480,vx:-184,pattern:"jumper"},{x:2830,y:480,vx:182,pattern:"patrol"}],
    movingPlatforms:[{x:1380,y:340,w:150,h:22,rangeX:0,rangeY:70,speed:55}],
    trampolines:[{x:2160,y:462}],
    secrets:[{x:660,y:462,kind:"heart"}]
  },
  {
    name: "Nível 9 — Reconhece o Phishing",
    artIdx:8, theme:8, quizTheme:"phishing", worldW:3500,
    spawn:{x:480,y:460}, doorX:3100,
    platforms:[
      {x:520,y:520,w:1000,h:28},{x:920,y:442,w:185,h:22},{x:1200,y:368,w:185,h:22},
      {x:1480,y:298,w:185,h:22},{x:1760,y:368,w:185,h:22},{x:2040,y:442,w:185,h:22},
      {x:2320,y:368,w:185,h:22},{x:2600,y:442,w:185,h:22},
      {x:3150,y:520,w:1100,h:28},
      // Plataforma alta do 1º cano — ver Nível 1.
      {x:1760,y:142,w:150,h:22}
    ],
    // Mistura: o 1º cano é o atalho clássico para plataforma alta, o 2º
    // leva à sala secreta isolada.
    pipes:[
      {x:1760,y:325,toX:1810,toY:99},
      {x:1810,y:99,toX:1760,toY:325},
      {x:2320,y:325,room:true,kind:"estrela",fact:"Sabias que, ainda hoje, milhões de crianças no mundo não vão à escola?"}
    ],
    items:[{x:920,y:342,kind:"estrela"},{x:1480,y:248,kind:"medalha"},{x:2040,y:392,kind:"balao"},{x:2600,y:392,kind:"brinquedo"},{x:560,y:470,kind:"heart"},{x:1760,y:107,kind:"heart"}],
    malwares:[{x:1060,y:480,vx:190,pattern:"jumper"},{x:1660,y:480,vx:-195,pattern:"jumper"},{x:2260,y:480,vx:190,pattern:"jumper"},{x:2860,y:480,vx:-185,pattern:"jumper"},{x:3200,y:480,vx:188,pattern:"jumper"}],
    movingPlatforms:[
      {x:1640,y:360,w:140,h:22,rangeX:200,rangeY:0,speed:90},
      {x:2760,y:310,w:130,h:22,rangeX:0,rangeY:80,speed:60}
    ],
    trampolines:[{x:2180,y:462}],
    secrets:[{x:1150,y:430,kind:"heart"}]
  },
  {
    name: "Nível 10 — Cuida dos Teus Dispositivos",
    artIdx:9, theme:9, quizTheme:"dispositivos", worldW:3600,
    spawn:{x:480,y:460}, doorX:3200,
    // Layout: "escadinhas duplas" — dois picos com vale ao meio
    platforms:[
      {x:520,y:520,w:960,h:28},
      {x:820,y:440,w:170,h:22},
      {x:1040,y:360,w:160,h:22},
      {x:1260,y:280,w:160,h:22},   // 1º pico
      {x:1500,y:380,w:150,h:22},   // descida para o vale
      {x:1700,y:460,w:130,h:22},   // fundo do vale
      {x:1940,y:360,w:150,h:22},   // subida 2º pico
      {x:2160,y:280,w:160,h:22},   // 2º pico
      {x:2400,y:360,w:160,h:22},
      {x:2640,y:440,w:170,h:22},
      {x:2900,y:360,w:160,h:22},
      {x:3250,y:520,w:960,h:28}
    ],
    // Nível SEM túneis (variedade) — segue-se a um nível com 2 pares
    // (Nível 9) e antecede um nível com 1 par (Nível 11).
    items:[{x:820,y:360,kind:"estrela"},{x:1260,y:230,kind:"duplosalto"},{x:1700,y:410,kind:"balao"},{x:2160,y:230,kind:"medalha"},{x:2640,y:390,kind:"brinquedo"},{x:560,y:470,kind:"heart"}],
    malwares:[{x:940,y:480,vx:192,pattern:"patrol"},{x:1420,y:480,vx:-196,pattern:"jumper"},{x:1830,y:480,vx:194,pattern:"jumper"},{x:2300,y:480,vx:-192,pattern:"patrol"},{x:2760,y:480,vx:190,pattern:"jumper"}],
    secrets:[{x:1600,y:370,kind:"estrela",points:25}]
  },
  {
    name: "Nível 11 — Regras de Ecrã em Família",
    artIdx:10, theme:10, quizTheme:"regras_familia", worldW:3200,
    spawn:{x:480,y:460}, doorX:2850,
    // Layout: pirâmide central alta + plataformas laterais baixas
    platforms:[
      {x:520,y:520,w:960,h:28},
      {x:820,y:450,w:180,h:22},
      {x:1060,y:390,w:180,h:22},
      {x:1300,y:330,w:180,h:22},
      {x:1540,y:260,w:200,h:22},   // topo da pirâmide
      {x:1780,y:330,w:180,h:22},
      {x:2020,y:390,w:180,h:22},
      {x:2260,y:450,w:180,h:22},
      {x:2500,y:380,w:160,h:22},
      {x:2870,y:520,w:960,h:28},
      // Plataforma alta — ver Nível 1.
      {x:2260,y:164,w:150,h:22}
    ],
    pipes:[
      {x:2260,y:407,toX:2310,toY:121},
      {x:2310,y:121,toX:2260,toY:407}
    ],
    items:[{x:820,y:220,kind:"estrela"},{x:1300,y:280,kind:"balao"},{x:1540,y:210,kind:"medalha"},{x:2020,y:340,kind:"brinquedo"},{x:2500,y:330,kind:"duplosalto"},{x:2260,y:129,kind:"heart"}],
    malwares:[{x:970,y:480,vx:175,pattern:"patrol"},{x:1450,y:480,vx:-178,pattern:"patrol"},{x:1920,y:480,vx:177,pattern:"jumper"},{x:2360,y:480,vx:-175,pattern:"jumper"},{x:2720,y:480,vx:172}],
    secrets:[{x:680,y:462,kind:"heart"}]
  },
  {
    name: "Nível 12 — Cuidado com o Wi-Fi Público",
    artIdx:11, theme:11, quizTheme:"wifi_publico", worldW:3650,
    spawn:{x:480,y:460}, doorX:3340,
    // Layout: "mini-mundos" — 3 grupos de plataformas isolados com vãos entre eles
    platforms:[
      {x:520,y:520,w:960,h:28},
      // grupo A
      {x:820,y:430,w:180,h:22},
      {x:1040,y:340,w:180,h:22},
      {x:1240,y:440,w:160,h:22},
      // vão — trampolim necessário
      {x:1640,y:350,w:180,h:22},
      {x:1860,y:440,w:160,h:22},
      // grupo B
      {x:2100,y:350,w:180,h:22},
      {x:2320,y:270,w:160,h:22},
      {x:2540,y:360,w:160,h:22},
      // grupo C
      {x:2780,y:440,w:170,h:22},
      {x:3000,y:350,w:160,h:22},
      {x:3370,y:520,w:960,h:28}
    ],
    pipes:[
      {x:2100,y:307,room:true,kind:"medalha",fact:"Sabias que uma criança refugiada nunca perde o direito a ter um lar seguro?"}
    ],
    items:[{x:820,y:380,kind:"balao"},{x:1040,y:290,kind:"estrela"},{x:1640,y:300,kind:"duplosalto"},{x:2320,y:220,kind:"medalha"},{x:2780,y:390,kind:"brinquedo"},{x:560,y:470,kind:"heart"}],
    malwares:[{x:950,y:480,vx:194,pattern:"patrol"},{x:1530,y:480,vx:-198,pattern:"jumper"},{x:1980,y:480,vx:196,pattern:"jumper"},{x:2440,y:480,vx:-194,pattern:"patrol"},{x:2880,y:480,vx:192,pattern:"jumper"}],
    trampolines:[{x:1440,y:462}],
    secrets:[{x:3110,y:263,kind:"balao",points:15}]
  },
  {
    name: "Nível 13 — Faz Cópias de Segurança",
    artIdx:12, theme:12, quizTheme:"copias_seguranca", worldW:3700,
    spawn:{x:480,y:460}, doorX:3300,
    // Layout: "labirinto horizontal" — plataformas em ziguezague apertado exige precisão
    platforms:[
      {x:520,y:520,w:960,h:28},
      {x:820,y:400,w:150,h:22},
      {x:1010,y:310,w:150,h:22},
      {x:1200,y:400,w:130,h:22},
      {x:1380,y:310,w:130,h:22},
      {x:1560,y:400,w:130,h:22},
      {x:1760,y:300,w:150,h:22},
      {x:2000,y:420,w:130,h:22},
      {x:2200,y:330,w:150,h:22},
      {x:2430,y:420,w:140,h:22},
      {x:2650,y:310,w:150,h:22},
      {x:2880,y:410,w:140,h:22},
      {x:3070,y:320,w:150,h:22},
      {x:3360,y:520,w:960,h:28}
    ],
    // Nível SEM túneis (variedade) — o labirinto apertado já exige toda a
    // atenção do jogador, sem distrações extra.
    items:[{x:820,y:210,kind:"estrela"},{x:1010,y:260,kind:"balao"},{x:1760,y:250,kind:"duplosalto"},{x:2200,y:280,kind:"medalha"},{x:2650,y:260,kind:"brinquedo"}],
    malwares:[{x:1100,y:480,vx:196,pattern:"patrol"},{x:1660,y:480,vx:-200,pattern:"jumper"},{x:2100,y:480,vx:196,pattern:"patrol"},{x:2540,y:480,vx:-192,pattern:"jumper"},{x:2980,y:480,vx:194,pattern:"patrol"}],
    movingPlatforms:[{x:1560,y:370,w:120,h:22,rangeX:100,rangeY:0,speed:95}],
    secrets:[{x:680,y:462,kind:"heart"}]
  },
  {
    name: "Nível 14 — Tecnologia para Todos",
    artIdx:13, theme:13, quizTheme:"acessibilidade_digital", worldW:3750,
    spawn:{x:480,y:460}, doorX:3350,
    platforms:[
      {x:520,y:520,w:960,h:28},
      {x:880,y:440,w:200,h:22},
      {x:1140,y:360,w:180,h:22},
      {x:1400,y:440,w:200,h:22},
      {x:1660,y:350,w:180,h:22},
      {x:1920,y:440,w:200,h:22},
      {x:2180,y:360,w:180,h:22},
      {x:2440,y:440,w:200,h:22},
      {x:2700,y:350,w:180,h:22},
      {x:2960,y:440,w:200,h:22},
      {x:3430,y:520,w:960,h:28},
      // Plataforma alta do 1º cano — ver Nível 1.
      {x:1400,y:154,w:150,h:22}
    ],
    // Mistura: o 1º cano é o atalho clássico para plataforma alta, o 2º
    // (perto do fim) leva à sala secreta isolada.
    pipes:[
      {x:1400,y:397,toX:1450,toY:111},
      {x:1450,y:111,toX:1400,toY:397},
      {x:2960,y:397,room:true,kind:"balaofesta",fact:"Sabias que incluir todos, mesmo quem tem deficiência, torna o mundo mais forte?"}
    ],
    movingPlatforms:[
      {x:1270,y:400,w:130,h:22,rangeX:120,rangeY:0,speed:80},
      {x:1790,y:380,w:130,h:22,rangeX:0,rangeY:80,speed:65},
      {x:2310,y:400,w:130,h:22,rangeX:120,rangeY:0,speed:90},
      {x:2830,y:380,w:130,h:22,rangeX:0,rangeY:80,speed:70}
    ],
    items:[
      {x:880,y:390,kind:"balao"},{x:1140,y:310,kind:"estrela"},
      {x:1660,y:300,kind:"duplosalto"},{x:2180,y:310,kind:"medalha"},
      {x:2700,y:300,kind:"brinquedo"},{x:560,y:470,kind:"heart"},
      {x:1400,y:119,kind:"balao"}
    ],
    malwares:[
      {x:980,y:480,vx:190,pattern:"patrol"},
      {x:1520,y:480,vx:-194,pattern:"jumper"},
      {x:2020,y:480,vx:192,pattern:"patrol"},
      {x:2540,y:480,vx:-190,pattern:"jumper"},
      {x:3050,y:480,vx:188,pattern:"patrol"}
    ],
    secrets:[{x:2895,y:390,kind:"estrela",points:30}]
  },
  {
    name: "Nível 15 — Spam e Compras Seguras",
    artIdx:14, theme:14, quizTheme:"spam_compras", worldW:3800,
    spawn:{x:480,y:460}, doorX:3400,
    platforms:[
      {x:520,y:520,w:1000,h:28},{x:980,y:432,w:160,h:22},{x:1260,y:350,w:160,h:22},
      {x:1540,y:274,w:160,h:22},{x:1820,y:350,w:160,h:22},{x:2100,y:432,w:160,h:22},
      {x:2380,y:350,w:160,h:22},{x:2660,y:270,w:160,h:22},{x:2940,y:350,w:160,h:22},
      {x:3220,y:432,w:160,h:22},{x:3480,y:520,w:1100,h:28},
      // Plataforma alta — ver Nível 1.
      {x:1260,y:124,w:150,h:22}
    ],
    pipes:[
      {x:1260,y:307,toX:1310,toY:81},
      {x:1310,y:81,toX:1260,toY:307}
    ],
    items:[{x:980,y:382,kind:"estrela"},{x:1540,y:224,kind:"balao"},{x:2100,y:382,kind:"brinquedo"},{x:2660,y:220,kind:"medalha"},{x:3220,y:382,kind:"duplosalto"},{x:1260,y:89,kind:"estrela"}],
    malwares:[{x:1130,y:480,vx:200,pattern:"patrol"},{x:1760,y:480,vx:-204,pattern:"jumper"},{x:2360,y:480,vx:200,pattern:"patrol"},{x:2960,y:480,vx:-196,pattern:"jumper"},{x:3380,y:480,vx:-198,pattern:"patrol"}],
    movingPlatforms:[
      {x:1410,y:340,w:130,h:22,rangeX:190,rangeY:0,speed:110},
      {x:2230,y:280,w:120,h:22,rangeX:0,rangeY:100,speed:75},
      {x:3090,y:360,w:130,h:22,rangeX:220,rangeY:0,speed:125}
    ],
    trampolines:[{x:1690,y:462},{x:2810,y:462}],
    secrets:[{x:760,y:470,kind:"medalha"},{x:2820,y:262,kind:"estrela",points:30}]
  },
  {
    name: "Nível 16 — Denuncia e Pede Ajuda",
    artIdx:15, theme:15, quizTheme:"denuncia_conteudo", worldW:3850,
    spawn:{x:480,y:460}, doorX:3450,
    // Layout: "degraus duplos" — sobe dois andares, desce dois andares, plataformas estreitas
    platforms:[
      {x:520,y:520,w:960,h:28},
      {x:820,y:440,w:150,h:22},
      {x:1020,y:360,w:140,h:22},
      {x:1200,y:280,w:150,h:22},   // 1º andar
      {x:1380,y:200,w:130,h:22},   // 2º andar (topo)
      {x:1580,y:280,w:140,h:22},
      {x:1780,y:380,w:150,h:22},
      {x:2000,y:460,w:140,h:22},   // vale
      {x:2220,y:370,w:150,h:22},
      {x:2440,y:280,w:140,h:22},   // novo pico
      {x:2640,y:190,w:130,h:22},   // topo absoluto
      {x:2860,y:290,w:140,h:22},
      {x:3080,y:390,w:150,h:22},
      {x:3300,y:450,w:150,h:22},
      {x:3530,y:520,w:960,h:28}
    ],
    pipes:[
      {x:2860,y:247,room:true,kind:"heart",fact:"Sabias que a tua opinião deve ser ouvida em decisões que te digam respeito?"},
      // Túnel decorativo — mantido perto do início, afastado da plataforma
      // em x:820 (variedade: nem todos os túneis de um nível ficam juntos).
      {x:680,y:474,decorative:true}
    ],
    items:[{x:820,y:390,kind:"balao"},{x:1380,y:150,kind:"duplosalto"},{x:1780,y:330,kind:"estrela"},{x:2440,y:230,kind:"medalha"},{x:2640,y:140,kind:"brinquedo"},{x:560,y:470,kind:"heart"}],
    malwares:[{x:940,y:480,vx:202,pattern:"patrol"},{x:1680,y:480,vx:-205,pattern:"jumper"},{x:2100,y:480,vx:202,pattern:"jumper"},{x:2760,y:480,vx:-200,pattern:"jumper"},{x:3180,y:480,vx:198,pattern:"patrol"}],
    movingPlatforms:[{x:2000,y:430,w:120,h:22,rangeX:120,rangeY:0,speed:100}],
    trampolines:[{x:1480,y:462}],
    secrets:[{x:1100,y:273,kind:"estrela",points:25}]
  },
  {
    name: "Nível 17 — A Tua Identidade Digital",
    artIdx:16, theme:16, quizTheme:"identidade_digital", worldW:3900,
    spawn:{x:480,y:460}, doorX:3500,
    // Layout: "cultura em círculos" — plataformas em grupos de 3 como constelações
    platforms:[
      {x:520,y:520,w:960,h:28},
      // constelação A
      {x:820,y:420,w:155,h:22},
      {x:1020,y:330,w:155,h:22},
      {x:1220,y:420,w:140,h:22},
      // constelação B
      {x:1520,y:360,w:155,h:22},
      {x:1720,y:270,w:155,h:22},
      {x:1920,y:370,w:140,h:22},
      // constelação C
      {x:2220,y:440,w:155,h:22},
      {x:2420,y:340,w:155,h:22},
      {x:2620,y:440,w:140,h:22},
      // constelação D
      {x:3080,y:270,w:155,h:22},
      {x:3540,y:520,w:960,h:28}
    ],
    // Nível SEM túneis (variedade).
    items:[{x:820,y:220,kind:"estrela"},{x:1020,y:280,kind:"balao"},{x:1720,y:220,kind:"duplosalto"},{x:2420,y:290,kind:"medalha"},{x:3080,y:220,kind:"brinquedo"},{x:560,y:470,kind:"heart"}],
    malwares:[{x:950,y:480,vx:204,pattern:"patrol"},{x:1620,y:480,vx:-208,pattern:"jumper"},{x:2120,y:480,vx:204,pattern:"patrol"},{x:2720,y:480,vx:-200,pattern:"jumper"},{x:3180,y:480,vx:-202,pattern:"patrol"}],
    movingPlatforms:[
      {x:1520,y:330,w:130,h:22,rangeX:140,rangeY:0,speed:105},
      {x:2880,y:330,w:130,h:22,rangeX:0,rangeY:90,speed:80}
    ],
    secrets:[{x:2020,y:283,kind:"estrela",points:25}]
  },
  {
    name: "Nível 18 — Respeita a Privacidade",
    artIdx:17, theme:17, quizTheme:"privacidade", worldW:3950,
    spawn:{x:480,y:460}, doorX:3550,
    // ══ MECÂNICA ESPECIAL: ESTEIRA — PLATAFORMAS TODAS EM MOVIMENTO ══
    // Todas as plataformas intermédias se movem. Umas horizontalmente (esq/dir),
    // outras verticalmente (sobe/desce). O jogador tem de "surfar" o ritmo em vez
    // de saltar em escada estática.
    // Tematicamente: inclusão requer adaptação contínua — nada está fixo.
    platforms:[
      {x:520,y:520,w:960,h:28},     // arranque fixo
      {x:3590,y:520,w:960,h:28},    // chegada fixa
      // Plataforma alta — ver Nível 1.
      {x:3400,y:200,w:150,h:22}
    ],
    pipes:[
      {x:3400,y:474,toX:3450,toY:157},
      {x:3450,y:157,toX:3400,toY:474}
    ],
    // Todas as plataformas intermédias são móveis
    movingPlatforms:[
      // Grupo 1 — balancins horizontais lentos
      {x:900,  y:420, w:160, h:22, rangeX:140, rangeY:0,   speed:60},
      {x:1120, y:340, w:150, h:22, rangeX:0,   rangeY:110, speed:55},
      // Grupo 2 — elevadores verticais médios
      {x:1380, y:380, w:160, h:22, rangeX:120, rangeY:0,   speed:80},
      {x:1620, y:280, w:150, h:22, rangeX:0,   rangeY:130, speed:65},
      {x:1860, y:400, w:160, h:22, rangeX:110, rangeY:0,   speed:90},
      // Grupo 3 — plataformas rápidas
      {x:2120, y:320, w:145, h:22, rangeX:0,   rangeY:120, speed:75},
      {x:2360, y:250, w:150, h:22, rangeX:160, rangeY:0,   speed:100},
      {x:2600, y:370, w:145, h:22, rangeX:0,   rangeY:100, speed:85},
      // Grupo 4 — final mais caótico
      {x:2860, y:430, w:150, h:22, rangeX:130, rangeY:0,   speed:110},
      {x:3080, y:310, w:145, h:22, rangeX:0,   rangeY:120, speed:95},
      {x:3320, y:410, w:150, h:22, rangeX:140, rangeY:0,   speed:105}
    ],
    items:[
      {x:860,y:370,kind:"balao"},{x:1320,y:230,kind:"estrela"},
      {x:1520,y:180,kind:"duplosalto"},{x:2360,y:150,kind:"medalha"},
      {x:3040,y:210,kind:"brinquedo"},{x:560,y:470,kind:"heart"},
      {x:3400,y:175,kind:"medalha"}
    ],
    malwares:[
      {x:980,y:480,vx:206,pattern:"patrol"},{x:1620,y:480,vx:-210,pattern:"jumper"},
      {x:2040,y:480,vx:206,pattern:"patrol"},{x:2700,y:480,vx:-202,pattern:"jumper"},
      {x:3150,y:480,vx:-204,pattern:"patrol"}
    ],
    trampolines:[{x:2480,y:510}],
    secrets:[{x:1820,y:263,kind:"estrela",points:30}]
  },
  {
    name: "Nível 19 — Cuidado com Desconhecidos",
    artIdx:18, theme:18, quizTheme:"contacto_desconhecidos", worldW:4000,
    spawn:{x:480,y:460}, doorX:3600,
    // Layout: "floresta" — muitas plataformas pequenas a alturas variadas, como ramos de árvores
    platforms:[
      {x:520,y:520,w:960,h:28},
      {x:800,y:430,w:140,h:22},
      {x:980,y:350,w:130,h:22},
      {x:1160,y:440,w:120,h:22},
      {x:1340,y:360,w:130,h:22},
      {x:1520,y:280,w:130,h:22},
      {x:1720,y:360,w:120,h:22},
      {x:1920,y:270,w:130,h:22},  // galho alto
      {x:2120,y:360,w:120,h:22},
      {x:2320,y:440,w:130,h:22},
      {x:2720,y:260,w:130,h:22},  // galho mais alto
      {x:2920,y:340,w:130,h:22},
      {x:3120,y:430,w:130,h:22},
      {x:3340,y:340,w:130,h:22},
      {x:3630,y:520,w:960,h:28},
      // Plataforma alta do 1º cano — ver Nível 1.
      {x:1160,y:154,w:150,h:22}
    ],
    // Mistura: o 1º cano é o atalho clássico para plataforma alta, o 2º
    // leva à sala secreta isolada.
    pipes:[
      {x:1160,y:397,toX:1210,toY:111},
      {x:1210,y:111,toX:1160,toY:397},
      {x:2920,y:297,room:true,kind:"balaofesta",fact:"Sabias que exprimires-te livremente, com respeito, é um direito teu?"}
    ],
    items:[{x:800,y:220,kind:"estrela"},{x:1520,y:230,kind:"balao"},{x:1920,y:220,kind:"duplosalto"},{x:2720,y:210,kind:"medalha"},{x:3120,y:380,kind:"brinquedo"},{x:560,y:470,kind:"heart"},{x:1160,y:119,kind:"balao"}],
    malwares:[{x:880,y:480,vx:208,pattern:"patrol"},{x:1440,y:480,vx:-212,pattern:"jumper"},{x:2020,y:480,vx:208,pattern:"jumper"},{x:2620,y:480,vx:-204,pattern:"jumper"},{x:3220,y:480,vx:-206,pattern:"patrol"}],
    movingPlatforms:[
      {x:1340,y:330,w:110,h:22,rangeX:80,rangeY:0,speed:90},
      {x:2520,y:320,w:110,h:22,rangeX:0,rangeY:70,speed:70},
      {x:3340,y:310,w:110,h:22,rangeX:100,rangeY:0,speed:110}
    ],
    trampolines:[{x:2220,y:462}],
    secrets:[{x:1620,y:193,kind:"estrela",points:35},{x:2820,y:173,kind:"heart"}]
  },
  {
    name: "Nível 20 — Direitos e Deveres Digitais",
    artIdx:19, theme:19, quizTheme:"direitos_digitais", worldW:4100,
    spawn:{x:480,y:460}, doorX:3700,
    // Layout: "circuito digital" — plataformas em padrão de circuito impresso: retas longas com viragens bruscas
    platforms:[
      {x:520,y:520,w:960,h:28},
      {x:900,y:440,w:300,h:22},    // bloco horizontal longo
      {x:1500,y:280,w:300,h:22},   // outro bloco longo
      {x:1920,y:360,w:130,h:22},   // viragem
      {x:2100,y:440,w:300,h:22},   // bloco longo
      {x:2700,y:260,w:300,h:22},   // bloco longo no topo
      {x:3300,y:430,w:300,h:22},   // reta final
      {x:3680,y:520,w:1100,h:28},
      // Plataforma alta do 1º cano — ver Nível 1.
      {x:1920,y:134,w:150,h:22}
    ],
    // Nível final: mistura dos 3 tipos — atalho clássico para plataforma
    // alta, sala secreta isolada e túnel decorativo — como despedida da
    // mecânica ao longo do jogo, espalhados por posições bem diferentes do
    // habitual "logo no início".
    pipes:[
      {x:1920,y:317,toX:1970,toY:91},
      {x:1970,y:91,toX:1920,toY:317},
      {x:3300,y:387,room:true,kind:"medalha",fact:"Sabias que, desde 2021, a ONU reconhece direitos das crianças também online?"},
      // Túnel decorativo — perto do fim, no chão fixo, antes da porta,
      // afastado da plataforma em x:3300 (que fica logo por cima).
      {x:3480,y:474,decorative:true}
    ],
    items:[{x:1000,y:390,kind:"balao"},{x:1320,y:310,kind:"estrela"},{x:1650,y:230,kind:"duplosalto"},{x:2200,y:390,kind:"medalha"},{x:2800,y:210,kind:"brinquedo"},{x:560,y:470,kind:"heart"},{x:1920,y:99,kind:"balao"}],
    malwares:[
      {x:950,y:420,vx:130,pattern:"patrol"},{x:1100,y:420,vx:-130,pattern:"patrol"},
      {x:1580,y:260,vx:125,pattern:"patrol"},{x:1730,y:260,vx:-125,pattern:"patrol"},
      {x:2180,y:420,vx:122,pattern:"patrol"},{x:2340,y:420,vx:-122,pattern:"patrol"},
      {x:2760,y:240,vx:120,pattern:"patrol"},{x:2940,y:240,vx:-120,pattern:"patrol"},
      {x:3600,y:480,vx:-210,pattern:"jumper"}
    ],
    movingPlatforms:[
      {x:1320,y:330,w:110,h:22,rangeX:0,rangeY:60,speed:85},
      {x:2520,y:310,w:110,h:22,rangeX:120,rangeY:0,speed:115},
      {x:3120,y:310,w:110,h:22,rangeX:0,rangeY:70,speed:90}
    ],
    trampolines:[{x:1750,y:462},{x:3000,y:462}],
    secrets:[
      {x:1420,y:273,kind:"estrela",points:30},
      {x:2950,y:173,kind:"medalha"},
      {x:3550,y:343,kind:"estrela",points:40}
    ]
  },
];
