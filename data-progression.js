// ===== Sistemas de progressão: mapa, artefactos, conquistas — MISSÃO CIBERSEGURANÇA =====
// MAP_REGIONS, ARTEFACTS, ARTEFACT_SETS, SET_REACTIONS, ACHIEVEMENTS_DEFS

// Mantém os 20 níveis e a sua dificuldade intactos (só o TEMA de cada
// nível mudou, ver data-levels.js). Os 4 mundos e as posições dos bosses
// mantêm-se exactamente iguais à estrutura original.
export const MAP_REGIONS = [
  { id:"origens",        icon:"🌐", name:"Reino dos Fundamentos",         sub:"Internet, palavras-passe e o primeiro vírus",      levels:[0,1,2,3,4],
    mapBg:"map-mundo1.jpg",
    nodePos:[{x:22.7,y:85.0},{x:37.1,y:76.5},{x:52.6,y:68.0},{x:68.8,y:51.0},{x:85.5,y:20.2}] },
  { id:"desenvolvimento",icon:"📡", name:"Vale da Comunicação Segura",    sub:"Jogos, pegada digital e o Monstro do Phishing",    levels:[5,6,7,8],
    mapBg:"map-mundo2.jpg",
    nodePos:[{x:25.0,y:53.0},{x:40.0,y:56.5},{x:53.0,y:58.5},{x:60.5,y:54.5}] },
  { id:"protecao",       icon:"🛡️", name:"Fortaleza da Proteção Digital", sub:"Dispositivos, família, backups e o Robô do Spam",  levels:[9,10,11,12,13,14],
    mapBg:"map-mundo3.jpg",
    nodePos:[{x:5.0,y:87.0},{x:14.5,y:76.0},{x:24.5,y:67.5},{x:22.5,y:57.0},{x:33.0,y:54.0},{x:40.0,y:49.5}] },
  { id:"participacao",   icon:"🔒", name:"Cidade da Identidade Digital",  sub:"Privacidade, identidade e o Espião das Sombras",   levels:[15,16,17,18,19],
    mapBg:"map-mundo4.jpg",
    nodePos:[{x:5.0,y:78.0},{x:18.0,y:89.0},{x:35.0,y:82.0},{x:30.0,y:59.0},{x:50.0,y:53.0}] },
  { id:"base",           icon:"🏠", name:"Base do VanBerto's",            sub:"O teu ponto de partida",                           levels:[] },
];

export const ARTEFACTS = [
  // idx 0-4 — Conjunto: Fundamentos
  { emoji:"🌐", name:"Fio da Internet",       short:"Nasce a Internet",          color:"#40d0ff", glow:"rgba(64,208,255,0.6)",  vanberto:"1969! Os primeiros computadores ligaram-se em rede!", set:0 },
  { emoji:"🔐", name:"Cadeado da Palavra-Passe",short:"Palavras-passe Fortes",   color:"#ffd700", glow:"rgba(255,215,0,0.6)",   vanberto:"Letras, números e símbolos — imbatível!", set:0 },
  { emoji:"🪪", name:"Escudo dos Dados",      short:"Dados Pessoais Protegidos", color:"#ff9060", glow:"rgba(255,144,96,0.6)", vanberto:"Os teus dados são só teus!", set:0 },
  { emoji:"🆘", name:"Sinal de Ajuda",        short:"Quem Nos Protege Online",   color:"#80ffb0", glow:"rgba(128,255,176,0.6)",vanberto:"Nunca estamos sozinhos online!", set:0 },
  { emoji:"🦠", name:"Vacina Digital",        short:"Vírus e Malware",           color:"#e0409a", glow:"rgba(224,64,154,0.6)", vanberto:"Antivírus atualizado, computador protegido!", set:0 },
  // idx 5-9 — Conjunto: Comunicação
  { emoji:"🎮", name:"Comando Seguro",        short:"Jogar em Segurança",        color:"#c0a0ff", glow:"rgba(192,160,255,0.6)",vanberto:"Jogar com regras é jogar melhor!", set:1 },
  { emoji:"👣", name:"Pegada de Luz",         short:"Pegada Digital",            color:"#60e060", glow:"rgba(96,224,96,0.6)",  vanberto:"Pensa antes de publicar!", set:1 },
  { emoji:"📰", name:"Lupa da Verdade",       short:"Contra as Fake News",       color:"#ffa040", glow:"rgba(255,160,64,0.6)", vanberto:"Verificar a fonte é sempre a resposta certa!", set:1 },
  { emoji:"🎣", name:"Anzol Quebrado",        short:"Vencer o Phishing",         color:"#8a5cff", glow:"rgba(138,92,255,0.6)", vanberto:"Nunca vou clicar em links suspeitos!", set:1 },
  { emoji:"🌟", name:"Estrela do Espírito Crítico",short:"Comunicação Segura",   color:"#ffe060", glow:"rgba(255,224,96,0.6)", vanberto:"Pensar antes de agir é um super-poder!", set:1 },
  // idx 10-14 — Conjunto: Proteção
  { emoji:"💻", name:"Chip Atualizado",       short:"Dispositivos Protegidos",   color:"#60ffff", glow:"rgba(96,255,255,0.6)", vanberto:"Tudo atualizado, tudo mais seguro!", set:2 },
  { emoji:"👨‍👩‍👧", name:"Regras da Família", short:"Ecrã em Família",           color:"#ffc060", glow:"rgba(255,192,96,0.6)", vanberto:"Juntos decidimos as melhores regras!", set:2 },
  { emoji:"📶", name:"Antena Prudente",       short:"Wi-Fi Público Seguro",      color:"#80c8ff", glow:"rgba(128,200,255,0.6)",vanberto:"Em Wi-Fi público, cuidado redobrado!", set:2 },
  { emoji:"💾", name:"Disco de Backup",       short:"Cópias de Segurança",       color:"#ff6060", glow:"rgba(255,96,96,0.6)",  vanberto:"Nunca mais perco um trabalho outra vez!", set:2 },
  { emoji:"♿", name:"Roda da Acessibilidade",short:"Tecnologia para Todos",     color:"#ffd080", glow:"rgba(255,208,128,0.6)",vanberto:"A tecnologia é para toda a gente!", set:2 },
  // idx 15-19 — Conjunto: Identidade
  { emoji:"🛒", name:"Cesto Seguro",          short:"Compras Seguras",           color:"#c080ff", glow:"rgba(192,128,255,0.6)",vanberto:"Nunca dados de cartão em sites suspeitos!", set:3 },
  { emoji:"📢", name:"Megafone da Denúncia",  short:"Denunciar e Pedir Ajuda",   color:"#ff80a0", glow:"rgba(255,128,160,0.6)",vanberto:"Denunciar protege-te a ti e aos outros!", set:3 },
  { emoji:"🧑‍💻", name:"Máscara da Identidade",short:"Identidade Digital",       color:"#60d0ff", glow:"rgba(96,208,255,0.6)", vanberto:"A tua identidade digital também é tua!", set:3 },
  { emoji:"🔒", name:"Cadeado da Privacidade",short:"Privacidade Respeitada",    color:"#80ff80", glow:"rgba(128,255,128,0.6)",vanberto:"Os teus segredos são teus! Cuida-os!", set:3 },
  { emoji:"⚖️", name:"Balança Digital",      short:"Direitos e Deveres Digitais",color:"#ff6b35", glow:"rgba(255,107,53,0.6)", vanberto:"Online também tens direitos — e deveres!", set:3 },
];

export const ARTEFACT_SETS = [
  { name:"Fundamentos da Cibersegurança", icon:"🌐", bonus:150 },
  { name:"Comunicação Segura",            icon:"📡", bonus:150 },
  { name:"Proteção Digital",              icon:"🛡️", bonus:150 },
  { name:"Identidade e Privacidade",      icon:"🔒", bonus:200 },
];

export const SET_REACTIONS = [
  "🎉 Conjunto FUNDAMENTOS completo! És um verdadeiro pioneiro da internet!",
  "📡 Conjunto COMUNICAÇÃO completo! Ninguém te engana com fake news ou phishing!",
  "🛡️ Conjunto PROTEÇÃO completo! Os teus dispositivos estão sempre seguros!",
  "🔒 Conjunto COMPLETO! GUARDIÃO SUPREMO da Cibersegurança!",
];

export const ACHIEVEMENTS_DEFS = [
  { id:"primeiros_passos", tier:"🥉", name:"Primeiros Passos",        desc:"Completa o primeiro nível." },
  { id:"curioso",          tier:"🥉", name:"Curioso",                  desc:"Lê 10 curiosidades." },
  { id:"explorador",       tier:"🥈", name:"Explorador",               desc:"Encontra todos os segredos de um nível." },
  { id:"sabio",            tier:"🥈", name:"Sábio",                    desc:"Acerta 20 perguntas." },
  { id:"caca_tesouros",    tier:"🏆", name:"Caçador de Tesouros",      desc:"Encontra todas as salas secretas do jogo." },
  { id:"guardiao",         tier:"🥇", name:"Guardião da Cibersegurança",desc:"Completa o jogo." },
  { id:"mestre",           tier:"🥇", name:"Mestre VanBerto's",        desc:"Acerta todas as perguntas à primeira tentativa." },
  { id:"lenda",            tier:"🏆", name:"Lenda Digital",            desc:"100% de conclusão — todos os níveis e todas as estrelas." },
];
