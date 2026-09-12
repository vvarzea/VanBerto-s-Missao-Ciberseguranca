// ===== Definições dos Bosses temáticos — Fase 3 =====
// Ficheiro puramente de dados — zero acoplamento ao motor do jogo.
// "afterLevel" é o índice (0-based) do nível DEPOIS do qual o boss aparece,
// exactamente como currentLevel já é usado em LEVELS — NUNCA altera o array LEVELS.
//
// quizTheme tem de corresponder a uma chave existente em QUIZ_BY_THEME (data-quiz.js).
// Confirma os nomes exactos das chaves aí antes de ativar cada boss.

export const BOSSES = [
  {
    id: "monstro_phishing",
    afterLevel: 8,           // Fecha o mundo "Vale da Comunicação Segura" (Níveis 6-9 —
                              // jogos seguros, pegada digital, fake news, phishing).
    name: "Monstro do Phishing",
    emoji: "👾",
    // Cor alinhada com o redesenho "pirata-hacker" (ver makeBossTextures em
    // textures.js) — antes era roxo (0x8a5cff), a cor do blob antigo; agora
    // é o mesmo ciano da orla/olhos/brilho do novo boss. Usada no overlay
    // de fundo da arena, nas partículas de dano/derrota e como rede de
    // segurança (setTint) caso a textura não carregue.
    color: 0x39d6ff,
    // Anzol prateado em vez da bola "?" roxa genérica — ver comentário
    // completo junto a boss_proj_hook em textures.js. Sem orbTint: o anzol
    // já tem as suas próprias cores (prateado + brilho ciano), tal como o
    // envelope do Robô do Spam.
    orbTexture: "boss_proj_hook",
    // Personalidade do arremesso (ver doBossRollQmark em dia-crianca.js):
    // o anzol "lança-se" na horizontal como uma cana de pesca a fisgar, em
    // vez de cair a direito como os outros 3 bosses.
    hookDrift: true,
    // ===== Redesenho "Boss clássico à Mario" (nova) =====
    // Filosofia: arena do tamanho da janela (sem scroll), poucas plataformas,
    // e uma mecânica só — saltar-lhe em cima 3 vezes. Nada de fases, nada de
    // ataque especial, nada de fase de recolha à parte. Simples, rápido,
    // divertido. stompBoss=true liga este modo dedicado no motor do jogo;
    // os outros 3 bosses (ainda sem stompBoss) continuam exactamente iguais.
    stompBoss: true,
    stompsToDefeat: 3,       // 3 saltos na cabeça = derrotado (reaproveita def.hp)
    // Melhorias "mais género Mario" (pedido), sem nenhum perigo novo no
    // chão — ver spawnBossSprite/damageBoss/doBossRollQmark em
    // dia-crianca.js: entrada dramática (cresce até ao tamanho final),
    // golpe final mais espetacular (hitstop + flash + explosão maior no
    // 3º salto) e ataque duplo quando está na fúria máxima.
    entranceGrow: true,
    epicDefeat: true,
    doubleThrowAtMaxRage: true,
    // "Último fôlego" (nova — antes só o Espião das Sombras tinha isto):
    // startBossFinalStandBurst() já era 100% genérica (usa def.name,
    // def.orbTexture/orbTint, arena.worldW), por isso ativar aqui só pede
    // ao motor para disparar o mesmo momento de clímax ao chegar a 1 salto
    // por dar — com o anzol (boss_proj_hook) próprio deste boss, não com o
    // orbe sombrio do Espião. Sem isto, só o último boss do jogo tinha um
    // momento culminante — os outros 3 terminavam sem nenhum.
    finalStandBurst: true,
    // Falas próprias na transição de fúria (ver bossEnterRage em
    // dia-crianca.js) — antes caíam sempre no genérico ("Ainda não
    // acabou!"/"Não... não pode ser!") por não existir def.rageLines em
    // nenhum dos 4 bosses. Distintas das taunts curtas de BOSS_HP_TAUNTS
    // (data-story.js) — aquelas disparam a cada salto certeiro; estas só
    // nos 2 momentos de escalada de fúria (mais impacto: câmara+flash).
    rageLines: { angry: "Achavas que era só um clique?!", desperate: "Não... a isca não pegou!" },
    // Escalada própria na 1ª fúria (nova) — este boss passa a atirar em par
    // (ver doBossRollQmark em dia-crianca.js) já ao primeiro salto certeiro,
    // uma fúria mais cedo que os outros 3 "doubleThrowAtMaxRage" (só na 2ª).
    // Dá-lhe uma identidade de escalada própria, tal como o chão contaminado
    // dá ao Vírus/Robô e o teletransporte-surpresa dá ao Espião.
    doubleThrowFromRage1: true,
    // Rótulo temático do contador de saltos no HUD (nova) — antes os 4
    // bosses mostravam sempre "👣 Saltos: X/3", sem ligação ao tema.
    stompLabel: "🎣 Mordidas",
    movementType: "patrol",  // anda devagar de um lado para o outro — nunca teletransporta, nunca desaparece
    patrolSpeed: 55,
    hopEvery: 2400,          // de vez em quando dá um pequeno salto (só visual)
    qmarkEvery: 1700,        // 2200→1700: pedido "demoram muito a atirar" (ver mesmo ajuste nos outros 3 bosses, incluindo o Vírus Gigante)
    // Chão ao mesmo nível dos níveis normais (plataforma principal com topo
    // em y=506, tal como o chão de qualquer nível — ver data-levels.js) —
    // antes desta arena tinha o chão 21px mais alto (topo em y=485, igual
    // aos outros 2 bosses), o que o destacava visualmente dos níveis normais
    // que vêm mesmo antes/depois do combate.
    //
    // bossY: centro do sprite, NÃO os pés — tem de descontar a metade do
    // corpo desenhado (canvas 116px, escala 1.5, pés ~49px abaixo do centro
    // → 49*1.5≈73px) até à superfície do chão da arena (plataforma principal
    // agora em y=521 com 30px de altura → topo em y=506). 506-73=433.
    bossY: 433,
    bossScale: 1.5,          // ~2x a altura do VanBerto's — dá para saltar-lhe em cima sem dificuldade
    // A textura (116x116) tem bastante espaço vazio por cima da cabeça (o
    // corpo começa só a ~1/5 do canvas) — sem isto a barra de vida usava a
    // conta genérica (baseada no canvas inteiro) e ficava muito afastada da
    // cabeça. 72px do centro chega perto o suficiente, com uma pequena folga.
    // hpBarOffset: recalculado com o redesenho "pirata-hacker" (ver
    // makeBossTextures em textures.js) — o chapéu tricórnio agora chega a
    // ~1px do topo da tela (116px), bem mais alto do que a sobrancelha do
    // desenho antigo. Medido o pixel mais alto desenhado (~57px acima do
    // centro do canvas) × bossScale (1.5) ≈ 85, mais uma pequena folga →
    // 96. Os pés continuam a ~49px abaixo do centro, exactamente como no
    // desenho antigo, por isso bossY (abaixo) NÃO precisou de mudar.
    hpBarOffset: 96,
    // Letreiro do objetivo (ver startBossFight): fica perto do chão, junto
    // ao ponto de partida do jogador — 486 é o mesmo valor por omissão dos
    // níveis normais, por isso não precisa de ajuste com a mudança de chão.
    signY: 486,
    // signX (opt-in): sem isto, o letreiro do objetivo usava playerStartX+80
    // (=480) por omissão — como este boss tem playerStartX deslocado para o
    // centro (ver arena.playerStartX, mais abaixo), isso caía mesmo no vão
    // ABERTO entre as duas plataformas baixas (155-305 e 655-805), a flutuar
    // no ar em vez de ficar por baixo de alguma delas. 230 é o centro da
    // plataforma baixa esquerda — reposiciona o letreiro para ficar
    // visualmente "pousado" por baixo dela. Os outros 3 bosses têm o mesmo
    // problema (playerStartX também em 400, ver comentário nas respetivas
    // arenas) e por isso têm o seu próprio signX explícito, cada um com o
    // centro da sua plataforma baixa esquerda.
    signX: 230,
    intro: "Um clique... e caíste na minha rede!",
    defeatLine: "Nãoo! Viste através do meu disfarce!",
    quizTheme: "phishing",
    hp: 3,
    // Tema próprio removido — os temas passaram a estar agrupados por
    // família de mundo (ver data-levels.js/THEMES), por isso "saltar" para
    // um índice de outro mundo já não faz sentido; a arena usa agora o
    // mesmo tema/imagem do nível anterior, como todos os outros ecrãs.
    rightRecovered: { emoji: "🕵️", name: "Alerta Anti-Phishing" },
    // Arena simples: do tamanho da janela (960x540, sem scroll), chão
    // principal + só 2 plataformas baixas para dar alguma variedade ao salto.
    arena: {
      worldW: 960,
      // 514 = mesmo limite físico usado por omissão pelos níveis normais e
      // pelos outros bosses (ver startBossFight em dia-crianca.js) — o chão
      // principal (topo em y=506) fica ligeiramente acima deste limite,
      // exactamente como acontece nos níveis normais, por isso não precisa
      // de um valor próprio.
      worldH: 514,
      // Variedade de silhueta (nova — antes as 4 arenas tinham quase a
      // mesma forma: chão + 2 plataformas simétricas à mesma altura). Só
      // o Y da plataforma direita mudou (391, 30px mais alta que a
      // esquerda) — o X mantém-se exactamente igual, por isso signX (mais
      // abaixo) continua válido sem recálculo.
      platforms: [
        [480,521,960,30],   // chão principal, de ponta a ponta — topo em y=506, igual aos níveis normais
        [230,421,150,20],   // plataforma baixa esquerda (deslocada 21px para baixo, junto com o chão)
        [730,391,150,20]    // plataforma direita — 30px mais alta que a esquerda (nova, dá um salto extra)
      ],
      // Pedido: o VanBerto's começava sempre bem junto à margem esquerda
      // (120px, o valor por omissão). 400px fica bem mais ao centro da arena
      // (960px de largura), mas ainda fora do alcance das duas plataformas
      // baixas (155-305 e 655-805) — continua a aterrar no chão principal,
      // tal como antes, só que mais perto do meio do ecrã.
      playerStartX: 400,
      decor: [
        { emoji:"📧", x:90,  y:150 },
        { emoji:"🎣", x:870, y:170 },
        { emoji:"⚠️", x:480, y:120 }
      ]
    }
  },
  {
    id: "virus_gigante",
    afterLevel: 4,            // Fecha o mundo "Reino dos Fundamentos" (Níveis 1-5 — internet,
                               // palavras-passe, dados pessoais, instituições de apoio, vírus).
    name: "Vírus Gigante",
    emoji: "🦠",
    // Cor alinhada com o redesenho "robô-vírus" (ver makeBossTextures em
    // textures.js) — antes era rosa (0xe0409a), a cor da esfera antiga;
    // agora é o vermelho do brilho da cara/garras/tentáculos do novo boss.
    color: 0xff4030,
    // Convertido para o mesmo "boss clássico à Mario" do Monstro da
    // Ignorância (ver esse comentário para a filosofia completa): arena do
    // tamanho da janela, sem scroll, e uma mecânica só — saltar-lhe em cima
    // 3 vezes. Mantém o seu próprio movimento em onda (flutua, pulsa) e a
    // bola ❓ (aqui retintada a rosa) como única diferença de personalidade.
    stompBoss: true,
    stompsToDefeat: 3,
    // Melhorias "mais género Mario" (ver comentário completo no Monstro
    // da Ignorância, acima) — mesmo pacote, sem perigo novo no chão.
    entranceGrow: true,
    epicDefeat: true,
    doubleThrowAtMaxRage: true,
    // "Último fôlego" (nova) — ver comentário completo no Monstro do
    // Phishing; aqui usa o micróbio (boss_proj_germ) próprio deste boss.
    finalStandBurst: true,
    // Decidido depois de discutir a dificuldade dos 4 bosses: o motor por
    // omissão manda 3 projéteis no último fôlego (ver startBossFinalStandBurst
    // em dia-crianca.js), mas este continua a ser o 1º boss do jogo — fica
    // nos 2 originais, mais gentil, enquanto os outros 3 sobem para 3.
    finalStandBurstHits: 2,
    // Falas próprias de fúria (nova) — ver comentário completo no Monstro
    // do Phishing.
    rageLines: { angry: "Vou replicar-me outra vez!", desperate: "O antivírus... está a vencer!" },
    // Rótulo temático do contador de saltos no HUD (nova, ver mesmo
    // comentário no Monstro do Phishing).
    stompLabel: "🦠 Infeções travadas",
    // Arena contaminada reativada (nova) — este boss já teve isto antes da
    // conversão para "boss clássico à Mario" (2 zonas fixas + vírus a
    // flutuar), mas ficou por trazer de volta no redesenho. Só a zona
    // tóxica no chão (sem vírus a flutuar — virusBase:0, ver
    // spawnMiniViruses em dia-crianca.js, que ainda tinha coordenadas da
    // arena antiga de 1600px de largura e por isso ficava fora do ecrã na
    // arena atual de 960px; corrigido à parte, mas mantido desligado aqui
    // por agora, só a zona de chão). Zonas colocadas exactamente por baixo
    // de cada plataforma baixa (mesmo X/W dela) — o chão nessa faixa fica
    // tóxico, o que transforma as 2 plataformas num "precisas de saltar
    // para lá" em vez de um extra opcional. O corredor central (entre
    // ~x=270 e ~x=690, onde fica o spawn do jogador em x=400) continua
    // sempre livre. escalations alarga as zonas a cada fúria (bossEnterRage
    // já lê isto — ver currentContaminationZones em dia-crianca.js).
    contaminatedArena: {
      hazardType: "acid",
      zonesBase: [ {x:200,w:140}, {x:760,w:140} ],
      virusBase: 0,
      escalations: {
        1: { zones: [ {x:200,w:180}, {x:760,w:180} ] },
        2: { zones: [ {x:200,w:220}, {x:760,w:220} ] }
      }
    },
    movementType: "wave",    // continua a flutuar em onda, pulsando de tamanho — só a forma de o vencer mudou
    // REBALANCEADO OUTRA VEZ (pedido: "o boss da saúde tem de ser mais fácil
    // porque é o primeiro") — ao passar a ser o 1º boss do jogo (antes era o
    // 2º), o pico de ~168px/s herdado do rebalanceamento anterior (ver
    // histórico abaixo) deixou de fazer sentido: é a primeira vez que a
    // criança vê este tipo de combate, e o movimento em onda (contínuo,
    // sinusoidal) já é menos previsível do que a patrulha simples do Monstro
    // da Ignorância (que continua a ser 55px/s, constante). waveSpeedMult
    // desceu de 0.5 para 0.3 — o pico cai para ~100px/s, bem mais perto do
    // ritmo "primeiro contacto" do outro boss inicial, mantendo waveRange
    // igual para não perder a cobertura da arena (só fica mais lento a
    // percorrê-la, não mais pequeno).
    //
    // Histórico do rebalanceamento anterior (já não se aplica ao contexto
    // atual, mas mantido para registo): "o 2º Boss estava demasiado
    // rápido/frustrante para o 4º ano" → waveSpeedMult reduzido ~32%; depois
    // "ainda instável, movimentos estranhos e muito rápidos" → waveRange
    // encurtado de ~360px para 210px e waveSpeedMult descido para 0.5,
    // chegando ao pico de ~168px/s (próximo dos 110-150px/s dos outros
    // bosses de então). Essa referência ("outros bosses") já não é o padrão
    // certo agora que este é o boss de abertura.
    waveSpeedMult: 0.3,
    waveRange: 210,
    // NOVO (pedido: "morre quase logo ao começar" — arranca demasiado
    // perto do ponto de partida do VanBerto's): sem isto, o boss começava
    // a onda mesmo no centro da arena (480), a só ~80px do spawn (400).
    // Math.PI/2 arranca-o antes no extremo mais longe do spawn (~690px,
    // quase 290px de distância) — ver updateBossFight em dia-crianca.js.
    wavePhaseOffset: Math.PI / 2,
    // qmarkEvery: history 2400 → 2900 → 3400 (1º boss, dava mais tempo para
    // perceber o movimento em onda) → agora 2400 outra vez, a pedido depois
    // de sentir que TODOS os bosses demoravam muito a atirar — ainda um
    // pouco mais lento que os outros 3 (1600-1750ms), por continuar a ser
    // o 1º boss do jogo.
    qmarkEvery: 2400,
    forceFirstOrbRight: true, // pedido: o 1º ataque deste boss vai sempre para a direita — só a partir do 2º persegue mesmo o VanBerto's
    orbTexture: "boss_proj_germ", // micróbio com espigões — antes reutilizava a bola "?" do Monstro, sem sentido temático para um vírus
    // Personalidade do arremesso (ver doBossRollQmark/spawnBossGermSplit em
    // dia-crianca.js): ao primeiro toque no chão, o micróbio "replica-se"
    // em 2 mais pequenos — só este boss faz isto, tal como só ele tem um
    // tema biológico entre os 4.
    splitOnBounce: true,
    // orbTint: era rosa (0xe0409a, a condizer com a esfera antiga) — agora
    // vermelho, a condizer com o redesenho "robô-vírus".
    orbTint: 0xff4030,
    // bossY: recalculado com o redesenho "robô-vírus" (ver makeBossTextures
    // em textures.js) — a esfera antiga não tinha pernas (pixel mais baixo
    // a ~44px do centro); agora tem botas, tal como os outros 3 bosses, com
    // os pés exactamente na mesma posição da família (~49px abaixo do
    // centro × bossScale 1.5 ≈ 73,5 → 506-73,5≈433).
    bossY: 433,
    bossScale: 1.5,
    // hpBarOffset: também recalculado — a bola vírica espinhosa no topo da
    // cabeça chega quase ao topo da tela (116px), tal como o chapéu do
    // Monstro do Phishing ou o capuz do Espião das Sombras, por isso usa a
    // mesma folga (96) em vez do valor antigo (88, medido para a esfera
    // sem nada por cima).
    hpBarOffset: 96,
    signY: 486,
    // signX: centro da plataforma baixa esquerda (x=200, ver arena.platforms
    // abaixo) — mesma lógica aplicada ao Monstro do Phishing: o letreiro
    // fica explicitamente "pousado" por baixo dela, em vez de depender do
    // cálculo por omissão (playerStartX+80, que com o playerStartX agora em
    // 400 daria 480 e cairia no vão aberto entre as plataformas).
    signX: 200,
    intro: "Vou infetar todos os teus ficheiros!",
    defeatLine: "Argh! O antivírus... venceu-me!",
    quizTheme: "virus_malware",
    hp: 3,                     // 4→3: agora são sempre 3 saltos na cabeça, como os outros bosses "stomp"
    // themeIdx próprio removido — ver comentário igual no boss do phishing.
    rightRecovered: { emoji: "🛡️", name: "Dispositivo Protegido" },
    // Arena do tamanho do ecrã (960x540, sem scroll) — chão principal +
    // 2 plataformas baixas, tal como o Monstro do Phishing.
    arena: {
      worldW: 960,
      worldH: 514,
      // Variedade de silhueta (nova, ver mesmo comentário no Monstro do
      // Phishing) — plataforma direita 30px mais alta; X inalterado.
      platforms: [
        [480,521,960,30],   // chão principal, de ponta a ponta — topo em y=506
        [200,421,140,20],   // plataforma baixa esquerda
        [760,391,140,20]    // plataforma direita — 30px mais alta que a esquerda
      ],
      // Mesma lógica do Monstro do Phishing: o VanBerto's deve começar
      // sempre no mesmo sítio em todos os bosses, em vez do 120 por omissão
      // (que ficaria colado à margem esquerda) — 400 fica fora do alcance
      // das duas plataformas baixas (130-270 e 690-830), continuando a
      // aterrar no chão principal.
      playerStartX: 400,
      decor: [
        { emoji:"💾", x:90,  y:150 },
        { emoji:"🦠", x:480, y:110 },
        { emoji:"💾", x:870, y:170 }
      ]
    }
  },
  {
    id: "espiao_sombras",
    afterLevel: 19,          // Último boss do jogo — fecha o mundo "Cidade da Identidade
                              // Digital" (Níveis 16-20) E o jogo inteiro. Ao ser derrotado,
                              // nextLevel() já não tem mais níveis a seguir (ver next>=LEVELS.length
                              // em goToNextLevel) e mostra o ecrã de vitória final.
    name: "Espião das Sombras",
    emoji: "🌑",
    // Cor alinhada com o redesenho "feiticeiro-espião" (ver makeBossTextures
    // em textures.js, secção 3) — antes era um cinzento-arroxeado neutro
    // (0x3a3a5c) da capa lisa antiga; agora é o mesmo magenta do brilho da
    // cara/garras/capuz do novo boss. Mesma família visual do Monstro do
    // Phishing (que usa ciano), só que este é magenta — reforça que os dois
    // partilham a mesma "receita" de design.
    color: 0xff4fe6,
    // Mesma conversão para stompBoss — mantém o teletransporte entre 3
    // pontos (agora sempre à altura do chão, ver bossY/doBossTeleport em
    // dia-crianca.js) como a sua marca própria, mais difícil de apanhar
    // no ar do que um boss que só anda.
    stompBoss: true,
    stompsToDefeat: 3,
    // Melhorias "mais género Mario" — este boss usa entranceMaterialize em
    // vez de entranceGrow (ver spawnBossSprite em dia-crianca.js): em vez
    // de crescer, materializa-se a partir de sombras, condizente com a
    // sua identidade de teletransporte/desaparecimento.
    entranceMaterialize: true,
    epicDefeat: true,
    doubleThrowAtMaxRage: true,
    movementType: "teleport",
    teleportDelay: 1700,       // mais rápido que o valor por omissão (2400) — mais difícil de prever
    qmarkEvery: 1600,          // 2000→1600: pedido "demoram muito a atirar" (ver mesmo ajuste nos outros 2 bosses "normais", em monstro_phishing e robo_spam)
    orbTexture: "boss_proj_shadow", // orbe sombrio próprio — antes reutilizava a bola "?" do Monstro só retintada, sem sentido temático para um guardião das sombras
    orbTint: 0x6a3fb5,
    // Personalidade do arremesso (ver doBossRollQmark em dia-crianca.js):
    // a orbe parte mais devagar que os outros 3, mas vai-se "puxando"
    // ligeiramente atrás do VanBerto's nos primeiros instantes de voo —
    // não é perseguição perfeita, só o suficiente para parecer que o
    // Espião está mesmo a mirar, condizente com o tema de vigilância.
    homingDrift: true,
    // Momento "último fôlego" (nova, opt-in — só este boss): ao ficar a só 1
    // salto de ser derrotado (bossState.hp===1), lança 2 sombras vindas dos
    // extremos da arena, à altura da cabeça — só se evitam agachado (ver
    // startBossFinalStandBurst em dia-crianca.js). Um pequeno clímax visual
    // para o combate final, sem tocar no hp nem na dificuldade geral.
    finalStandBurst: true,
    // Falas próprias de fúria (nova) — ver comentário completo no Monstro
    // do Phishing (data-bosses.js, boss monstro_phishing).
    rageLines: { angry: "As sombras ficam mais fundas!", desperate: "A tua privacidade... está a vencer-me!" },
    // Teletransporte-surpresa na fúria (nova, ver bossEnterRage em
    // dia-crianca.js) — este boss já teletransporta sozinho por temporizador
    // (teleportDelay); isto acrescenta UM extra exactamente ao entrar em
    // cada fúria, tornando-o ainda mais difícil de apanhar mesmo quando já
    // está a perder, tal como o Vírus/Robô ganham chão contaminado e o
    // Monstro do Phishing ganha o ataque duplo mais cedo.
    extraTeleportOnRage: true,
    // Rótulo temático do contador de saltos no HUD (nova, ver mesmo
    // comentário no Monstro do Phishing).
    stompLabel: "👁️ Exposições",
    // bossY: recalculado com o redesenho "feiticeiro-espião" (ver
    // makeBossTextures em textures.js) — a capa/robe antiga não tinha
    // pernas (bainha a ~43px abaixo do centro); agora tem botas, tal como
    // o Monstro do Phishing, com os pés exactamente na mesma posição
    // (~49px abaixo do centro × bossScale 1.5 ≈ 73,5 → 506-73,5≈433).
    bossY: 433,
    bossScale: 1.5,
    // hpBarOffset: também recalculado — o capuz agora chega quase ao topo
    // da tela (116px), tal como o chapéu do Monstro do Phishing, por isso
    // usa a mesma folga (96) em vez do valor antigo (82, medido para a
    // capa lisa sem capuz alto).
    hpBarOffset: 96,
    signY: 486,
    // signX: centro da plataforma baixa esquerda (x=220, ver arena.platforms
    // abaixo) — mesma lógica dos outros bosses (ver comentário no Monstro
    // da Ignorância).
    signX: 220,
    intro: "Nas sombras, ninguém vê os teus dados a desaparecer!",
    defeatLine: "A tua privacidade... venceu-me!",
    quizTheme: "direitos_digitais", // CORRIGIDO: estava "contacto_desconhecidos" (tema do
                              // Nível 19), por isso a pergunta do boss não coincidia com a
                              // pergunta que já tinha fechado o Nível 20 — pareciam duas
                              // perguntas a mais/desencontradas em vez de reforçarem o mesmo tema.
    hp: 3,                     // 4→3: agora são sempre 3 saltos na cabeça
    // themeIdx próprio removido — ver comentário igual no boss do phishing.
    rightRecovered: { emoji: "🔐", name: "Privacidade Protegida" },
    // Arena do tamanho do ecrã, tal como o Monstro — 3 pontos de teletransporte
    // (spawnSpots) ajustados à nova largura de 960px em vez de 1600px.
    arena: {
      worldW: 960,
      worldH: 514,
      // Variedade de silhueta (nova, ver mesmo comentário no Monstro do
      // Phishing) — plataforma direita 30px mais alta; X inalterado, por
      // isso spawnSpots (mais abaixo) continua válido sem recálculo.
      platforms: [
        [480,521,960,30],   // chão principal, de ponta a ponta — topo em y=506
        [220,421,120,20],   // plataforma baixa esquerda
        [740,391,120,20]    // plataforma direita — 30px mais alta que a esquerda
      ],
      // Mesma lógica do Monstro do Phishing: o VanBerto's deve começar
      // sempre no mesmo sítio em todos os bosses, em vez do 120 por omissão
      // — 400 fica fora do alcance das duas plataformas baixas (160-280 e
      // 680-800), continuando a aterrar no chão principal.
      playerStartX: 400,
      spawnSpots: [220, 480, 740],
      // Decor adicionado (pedido: aproximar da ilustração de referência,
      // que mostra várias orbes sombrias com um olho a brilhar, a flutuar à
      // volta do feiticeiro) — era o único dos 4 bosses sem nenhum decor na
      // arena. Mesmo padrão dos outros 3 (3 emojis, posições espalhadas).
      decor: [
        { emoji:"🔮", x:90,  y:150 },
        { emoji:"👁️", x:480, y:110 },
        { emoji:"🔮", x:870, y:170 }
      ]
    }
  },
  {
    id: "robo_spam",
    afterLevel: 14,          // Fecha o mundo "Fortaleza da Proteção Digital" (Níveis 10-15 —
                             // dispositivos, família, wi-fi, backups, acessibilidade, spam).
    name: "Robô do Spam",
    emoji: "📮",
    color: 0xc7291f,
    // Mesma conversão para stompBoss — mantém a patrulha rápida (sensação
    // industrial) mas larga as plataformas móveis e a arena poluída, para
    // caber num único ecrã sem scroll, tal como os outros 3 bosses.
    stompBoss: true,
    stompsToDefeat: 3,
    // Melhorias "mais género Mario" (ver comentário completo no Monstro
    // da Ignorância) — mesmo pacote, sem perigo novo no chão.
    entranceGrow: true,
    epicDefeat: true,
    doubleThrowAtMaxRage: true,
    // "Último fôlego" (nova) — ver comentário completo no Monstro do
    // Phishing; aqui usa o envelope de spam (boss_proj_spam) próprio.
    finalStandBurst: true,
    // Falas próprias de fúria (nova) — ver comentário completo no Monstro
    // do Phishing.
    rageLines: { angry: "Mais mensagens! Mais spam!", desperate: "Os meus circuitos... sobrecarregados!" },
    // Rótulo temático do contador de saltos no HUD (nova, ver mesmo
    // comentário no Monstro do Phishing).
    stompLabel: "📛 Bloqueios",
    // Arena contaminada reativada (nova) — mesma lógica do Vírus Gigante
    // (ver esse comentário completo), hazardType "lava" em vez de "acid"
    // para condizer com a estética mecânica/industrial deste boss (chaminé
    // + caixa metálica, ver drawPoluidorBody em textures.js) em vez do
    // verde tóxico do vírus.
    contaminatedArena: {
      hazardType: "lava",
      zonesBase: [ {x:200,w:150}, {x:760,w:150} ],
      virusBase: 0,
      escalations: {
        1: { zones: [ {x:200,w:190}, {x:760,w:190} ] },
        2: { zones: [ {x:200,w:230}, {x:760,w:230} ] }
      }
    },
    movementType: "patrol",
    patrolSpeed: 150,        // mais rápido — sensação industrial
    hopEvery: 2000,
    qmarkEvery: 1750,        // 2000→1750: pedido "demoram muito a atirar" — corte mais pequeno que os outros 2, porque este já atira sempre a pares (alwaysDoubleThrow), logo já é o mais denso dos 4
    orbTexture: "boss_proj_spam", // envelope de spam com selo de aviso vermelho — o robô atira correio, não parafusos
    orbTint: 0xffffff,       // sem tint — o envelope já tem as suas próprias cores (branco/vermelho)
    // Personalidade do arremesso (ver doBossRollQmark em dia-crianca.js):
    // este boss atira sempre aos pares, não só na 2ª fúria como os outros
    // 3 (doubleThrowAtMaxRage, mantido também aqui para o par ficar ainda
    // mais rápido quando está a perder) — spam vem sempre em quantidade,
    // é a sua assinatura.
    alwaysDoubleThrow: true,
    // bossY: o Poluidor é uma caixa mecânica larga mas mais baixa que os
    // outros — medi o pixel mais baixo do corpo (~26px abaixo do centro do
    // canvas, bem menos que os outros porque não tem "cabeça" alta, só caixa
    // + chaminé). 506 - 26*1.5 = 467.
    bossY: 467,
    bossScale: 1.5,
    // CORRIGIDO — a barra de vida sobrepunha o boss em jogo. hpBarOffset
    // ficou em 82 desde antes da tampa+pilha de envelopes serem
    // redesenhadas (mais altas — ver drawPoluidorBody em textures.js); nunca
    // foi recalculado depois disso. Medido de novo o pixel mais alto
    // desenhado (~56px acima do centro do canvas, já com a tampa/pilha
    // corrigidas para não saírem da tela) × bossScale (1.5) ≈ 84, mais a
    // mesma pequena folga dos outros 3 bosses → 96 (em vez de 82).
    hpBarOffset: 96,
    signY: 486,
    // signX: centro da plataforma baixa esquerda (x=200, ver arena.platforms
    // abaixo) — mesma lógica dos outros bosses (ver comentário no Monstro
    // da Ignorância).
    signX: 200,
    intro: "Vou encher a tua caixa de correio para sempre!",
    defeatLine: "As minhas mensagens... foram todas bloqueadas!",
    quizTheme: "spam_compras",
    hp: 3,                     // 5→3: agora são sempre 3 saltos na cabeça
    // themeIdx próprio removido — ver comentário igual no boss do phishing.
    rightRecovered: { emoji: "📭", name: "Caixa de Correio Limpa" },
    // Arena do tamanho do ecrã, tal como o Monstro.
    arena: {
      worldW: 960,
      worldH: 514,
      // Variedade de silhueta (nova): as duas plataformas baixas mantêm-se
      // iguais (signX depende do X da esquerda, ver acima), mas há agora
      // uma 3ª plataforma central mais alta — um "degrau" a meio da arena,
      // condizente com a sensação industrial/fabril deste boss (uma
      // esteira/andaime suspenso). x=480 fica centrado, longe de ambas as
      // plataformas baixas, e nunca colide com a patrulha do boss (que anda
      // à altura bossY=467, bem abaixo desta plataforma).
      platforms: [
        [480,521,960,30],   // chão principal, de ponta a ponta — topo em y=506
        [200,421,150,20],   // plataforma baixa esquerda
        [760,421,150,20],   // plataforma baixa direita
        [480,381,120,20]    // plataforma central, mais alta (nova)
      ],
      // Mesma lógica do Monstro do Phishing: o VanBerto's deve começar
      // sempre no mesmo sítio em todos os bosses, em vez do 120 por omissão
      // — 400 fica fora do alcance das duas plataformas baixas (125-275 e
      // 685-835), continuando a aterrar no chão principal.
      playerStartX: 400,
      decor: [
        { emoji:"📧", x:90,  y:140 },
        { emoji:"⚙️", x:480, y:110 },
        { emoji:"📩", x:870, y:160 }
      ]
    }
  }
];

// Lookup rápido por índice de nível — usado em nextLevel()
export const BOSS_BY_LEVEL = Object.fromEntries(BOSSES.map(b => [b.afterLevel, b]));
