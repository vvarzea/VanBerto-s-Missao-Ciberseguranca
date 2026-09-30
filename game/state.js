/*************************************************
 * VanBerto's — Missão Cibersegurança 🛡️  ·  game/state.js
 *
 * Estado partilhado do jogo (cena, jogador, vidas, pontos, poderes…) e regras por dificuldade.
 *
 * Faz parte de dia-crianca.js, dividido em módulos (ver README.md, «Estrutura do código»).
 * Estado partilhado: LÊ-SE diretamente (import); para ALTERAR usa as funções set_<nome>() — os imports ES são só de leitura.
 *************************************************/

import { loadNamespace, saveNamespace } from "../storage.js?v=20260930v97";
import { QUIZ_BY_THEME, QUIZ_BY_THEME_AVANCADO } from "../data-quiz.js?v=20260930v97";

export let playerName = "";

export let _vbTimer=null;

export let _historySubOpen = false;

let lastQuizTheme = "historia";

export let _reviewReturnOverlay = null; // overlay a repor ao fechar (ou null -> usa closeOverlay normal)

export let pausedByTeacher = false;

export let _overlayPaused  = false; // true quando um overlay de consulta (mapa, conquistas, etc.) está aberto

// true enquanto o Mapa/Conquistas está aberto por cima do ecrã de vitória (winOverlay
// fica escondido nesse intervalo — ver botões "🗺️ Mapa"/"🏆 Conquistas" do winOverlay
// e closeOverlay()). Sem isto, o overlay novo abria por trás do ecrã de vitória (mesmo
// z-index, mas o winOverlay vem depois no HTML) e ficava invisível/impossível de usar.

export let _winOverlaySubOpen = false;

// Pedido do Berto: o certificado só era acessível na hora, logo a seguir a
// terminar o jogo — se fosse ver o Mapa/Conquistas a seguir (ou fechasse o
// jogo), perdia o acesso por completo. Agora também pode ser aberto a
// partir de Estatísticas (menu principal), a qualquer momento depois de
// terminar o jogo pelo menos uma vez — esta flag lembra por onde foi
// aberto, para "Voltar" no certificado saber para onde regressar.

export let _certificateOpenedFrom = "win";

export let mapProgress = { highestLevelReached: 0, levelsCompleted: [] };

// ===== Phaser =====

export let sceneRef=null;

export let currentLevel=0;

export let shadowGfx;

export let powerHaloGfx;

export let sunAngle = 0;

let trailSprites = [];

export let balloons=[];

export let critters=[];

export let enemyTimers=[];

export let bossTimers=[];

export let movingPlatforms=[];

export let trampolines=[];

export let secretDoors=[];

export let hazards=[];

// Canos à Mario (pedido: "atalhos ou áreas secretas") — cada nível pode
// opcionalmente ter L.pipes: [{x,y,w,toX,toY}]. O jogador entra parando
// em cima e carregando em baixo/S (a mesma tecla de agachar). Ver
// tryEnterPipe/enterPipe mais abaixo.
// Posições variadas, nem todos os canos de entrar: cada entrada em
// L.pipes pode ainda ter:
//   - decorative:true → cano falso: sólido (dá para subir/ficar em
//     cima), mas NUNCA entra no array "pipes" usado por tryEnterPipe(), logo
//     carregar em baixo não faz nada. Recebe um tint subtil para dar uma
//     pista visual discreta (ver loop de criação em loadLevel).
//   - caso contrário → cano normal: leva a uma plataforma/área secreta com
//     uma recompensa (item), sem placas nem texto.

export let pipes=[];

export let _pipeWarping=false;

export let _pipeDownWasHeld=false;

// Canos "de regresso" só visuais (sem física, ver criação em loadLevel) —
// pedido: "quando se entra num cano tem de sair de 1 cano". Guardados aqui
// para serem destruídos ao (re)carregar o nível/arena de boss, já que não
// pertencem ao grupo físico "platforms" (que se limpa a si próprio).

export let pipeExitDecor=[];

// Canos falsos (decorative:true) — só para a reação tola ao saltar-lhes
// em cima (pedido). Cada entrada: { spr, poofed }. "poofed" evita repetir
// o efeito de cada vez que o jogador fica parado em cima do mesmo cano.

export let decorativePipes = [];

// CORRIGIDO — _pipeWarping (e player.body.moves) só voltavam a false dentro do
// onComplete da 2ª tween da animação de cano/sala secreta (~400ms depois de
// começar). Se essa cadeia de tweens fosse interrompida a meio — killAll()
// faz exatamente isso, sem disparar onComplete — as duas ficavam presas
// para sempre: update() força setVelocityX(0) todos os frames enquanto
// _pipeWarping for true (linha ~1485), e body.moves=false impede a física
// de mexer o jogador de todo. Resultado: o VanBerto's congelava
// permanentemente. Chamar isto logo a seguir a qualquer killAll() do
// jogador (botões "Reiniciar Nível"/"Reiniciar Jogo"/"Sair para o Menu")
// repõe sempre um estado limpo, mesmo que a interrupção tenha apanhado a
// animação a meio.

export function resetPipeWarpState() {
  _pipeWarping = false;
  _suppressCrouchUntilRelease = false;
  if (player?.body) player.body.moves = true;
}

// Enquanto true, ignora "para baixo" para efeitos de agachar (mas não
// para o resto do jogo) — ligado sempre que um cano/sala secreta começa
// a animação, desligado só quando a tecla é MESMO largada. Isto evita
// que o mesmo "carregar em baixo" que serviu para entrar/sair do cano
// também agache o VanBerto's mesmo depois de já ter aterrado (ver
// enterPipe/enterSecretRoomFlow/exitSecretRoomFlow).

export let _suppressCrouchUntilRelease = false;

export let currentSign = null; // { x,y,obj,badge,triggered,text } — letreiro/NPC do nível atual

export let secretSigns = []; // curiosidades dentro das salas dos canos — ver clearSecretSigns/spawnSecretSign

// Letreiro de tutorial do 1º cano do jogo (pedido: "falta explicar os
// túneis ao início") — igual em tudo aos outros letreiros (aproxima-te
// para ler), mas num slot próprio, independente de currentSign, para não
// substituir o letreiro normal do Nível 1 (ambos ficam visíveis perto do
// spawn, um a seguir ao outro). Só é criado uma vez, no Nível 1 — ver
// spawnPipeHintSign, chamado de loadLevel só quando idx===0.

export let pipeHintSign = null;

// Sala secreta isolada ("tipo os bosses") — ver comentário completo junto
// a ROOM_WORLD_W. inSecretRoom=true enquanto o jogador está lá dentro;
// secretRoomReturn guarda onde aterrar de volta no nível principal;
// secretRoomHidden guarda os objetos do nível principal escondidos
// temporariamente (para os repor exatamente como estavam); secretRoomTemp
// guarda os objetos efémeros da própria sala (destruídos ao sair).

export let inSecretRoom = false;

export let secretRoomReturn = null;

export let secretRoomHidden = [];

export let secretRoomTemp = { ledge:null, pipe:null, item:null, decor:[], key:null };

export let player;

export let platforms;

export let itemsGroup;

export let malwareGroup;

export let door;

export let doorOverlap=null;

// Janela (timestamp de scene.time.now) durante a qual applyVanBertoTexture() não deve
// substituir a textura — usada pelo piscar de olhos idle e pelo pisca-olho ao toque,
// para não serem imediatamente sobrepostos pela animação normal no frame seguinte.

export let _eyeOverrideUntil = 0;

// Fase "entrada visível só quando o jogo arranca": loadLevel() já posiciona
// e alinha o VanBerto's ao chão, mas mantém-no invisível (alpha 0). A
// animação de "pop" (fade-in + estica-encolhe) só corre quando o "Sabias
// que...?" fecha e o jogo arranca de verdade — ver revealPlayerEntrance(),
// chamada a partir de showHistory(). Isto evita qualquer desalinhamento
// visível ENQUANTO a física está pausada (nesse período nada corrige a
// posição automaticamente, ao contrário do que acontece já em jogo).

export let _pendingEntranceReveal = false;

export let cursors;

export let keySpace;

export let keyS;

export let isCrouching = false; // ===== Agachar — nova funcionalidade =====

export let hudText;

export let scoreText;

export let heartsGfx;

export let tipText;

export let itemCountText;

export let progressBg;

export let progressFill;

export let powerIndicator;

export let playerNameHUD;

let difficultyBadge;

export let pauseOverlayGfx;

let pauseVanImg;

let pauseLabel;

let transitionGfx;

let transitionLabel;

export let score=0;

export let lives=3;

export let livesLostThisLevel=0;

// ===== Nível de dificuldade — Fácil (1º/2º ciclo) / Difícil (3º ciclo e
// secundário) / Extremo (pedido: "um nível acima do Difícil") =====
// Pedido do Berto: o jogo era só para 1º/2º ciclo; este ano vai também
// usá-lo com 3º ciclo e secundário, por isso precisa de um 2º nível mais
// desafiante. Escolhido sempre que se começa uma "Nova Aventura" (ver
// btnStart mais abaixo), guardado em "settings" para sobreviver a um
// refresh de página a meio de uma partida, e também alterável mais tarde
// em Opções (optBtnDifficulty), sem ser preciso recomeçar tudo.
// NOTA: isto não tem nada a ver com difficultyFactor(idx) mais abaixo, que
// é a progressão natural de dificuldade ao longo dos 20 níveis (sempre
// existiu). Os dois multiplicam-se — ver getVillainSpeedMult().

export let difficulty = "facil"; // "facil" | "dificil" | "extremo"

export function getDifficulty() { return difficulty; }

export function setDifficulty(d) {
  difficulty = (d === "dificil" || d === "extremo") ? d : "facil";
  const s = loadNamespace("settings", {});
  s.difficulty = difficulty;
  saveNamespace("settings", s);
  updateDifficultyBadge();
}

// Pedido do Berto: mostrar sempre, escrito e bem visível durante o jogo
// (não só escondido em Opções), em que dificuldade se está a jogar —
// canto superior direito do HUD, com uma cor diferente por nível para dar
// para perceber de relance.

export function updateDifficultyBadge() {
  if (!difficultyBadge) return;
  const label = difficulty === "extremo" ? "🔥 Extremo" : difficulty === "dificil" ? "🎓 Difícil" : "😊 Fácil";
  const color = difficulty === "extremo" ? "#ff4d4d" : difficulty === "dificil" ? "#ffb703" : "#8affc1";
  difficultyBadge.setText(label).setColor(color);
}

// Vidas iniciais — 3 no Fácil (como sempre foi), 2 no Difícil, 1 no
// Extremo (pedido: "jogo mais desafiante... menos vidas").

export function getStartLives() { return difficulty === "extremo" ? 1 : difficulty === "dificil" ? 2 : 3; }

// Teto de vidas acumuláveis (corações extra) — 5 por omissão, reduzido a
// 3 no Extremo para não dar para "almofadar" o desafio com corações.

export function getMaxLives() { return difficulty === "extremo" ? 3 : 5; }

// Multiplicador de velocidade/ritmo de ataque dos BOSSES — ver
// bossState.speedMult/baseSpeedMult em spawnBossFight e bossEnterRage.
// CORRIGIDO (pedido: "colocar a dificuldade dos bosses do Extremo no
// Difícil") — Difícil passa a usar o MESMO ×1.4 do Extremo, em vez do
// ×1.2 anterior. Vidas (getStartLives acima), quiz avançado, drones maus
// e as restantes diferenças não-boss do Difícil mantêm-se como estavam —
// só o desafio dos PRÓPRIOS bosses (velocidade e HP extra, já abaixo) é
// que passa a ser idêntico ao do Extremo.

export function getBossSpeedMult() { return (difficulty === "extremo" || difficulty === "dificil") ? 1.4 : 1; }

// Multiplicador de velocidade dos VILÕES normais (Trapalhão/Saltitão/
// Perseguilão) — aplicado dentro de difficultyFactor(), a única função que
// já controlava a velocidade deles consoante o nível.

export function getVillainSpeedMult() { return difficulty === "extremo" ? 1.4 : difficulty === "dificil" ? 1.2 : 1; }

// Multiplicador do intervalo entre saltos dos VILÕES normais — no
// Difícil/Extremo o intervalo encolhe (saltam com mais frequência). Usado
// em spawnVilao() para o Trapalhão/Saltitão/Perseguilão continuarem a ser
// os mesmos 3 tipos, só que mais rápidos E a saltar mais, em vez de
// trocarem todos para o comportamento "jumper".

export function getVillainJumpIntervalMult() { return difficulty === "extremo" ? 0.4 : difficulty === "dificil" ? 0.6 : 1; }

// HP extra dos bosses (stomps a levar para derrotar) — antes +1 no
// Difícil, +2 no Extremo; agora ambos +2 (mesmo pedido acima, ver
// getBossSpeedMult).

export function getBossExtraHp() { return (difficulty === "extremo" || difficulty === "dificil") ? 2 : 0; }

// CORRIGIDO — a versão original desta função reduzia TODOS os itens
// menos corações, incluindo estrela (Star Power — a ÚNICA forma de matar
// vilões), medalha (escudo) e duplosalto (o único duplo-salto do nível
// inteiro nalguns casos). Simulei os 20 níveis: isso deixava 4 níveis
// (4, 12, 18, 20) SEM NENHUMA estrela no Difícil — impossível matar
// vilões nesses níveis, e ainda por cima com mais vilões (pedido
// anterior). Agora só reduz os itens puramente de bónus/pontuação
// (balão, brinquedo, balão de festa) — nunca poderes.

export function isReducibleItemKind(kind) { return kind === "balao" || kind === "brinquedo" || kind === "balaofesta"; }

// Quantos itens "reduzíveis" (balão/brinquedo/balão de festa) ficam
// visíveis num nível — no Difícil/Extremo fica só cerca de metade (idx
// par), para a recolha a 100% ser mais desafiante sem tocar em nenhum
// poder.

export function isItemVisibleInDificil(reducibleIdx) { return reducibleIdx % 2 === 0; }

// Star Power no Extremo (pedido: "no máximo 1 Star Power por nível" nos
// níveis 1-14, e "a partir do nível 15 não haver Star Powers"). levelIdx
// é 0-based (Nível 15 = idx 14). starOrderIdx é a posição desta estrela
// dentro da lista de estrelas do próprio nível (0 = a 1ª). "Por vida":
// esta função só decide QUAIS estrelas se CRIAM; como os itens são
// sempre recriados do zero ao perder uma vida (ver hitByHazard/
// onHitMalware) ou ao (re)carregar o nível (loadLevel), o limite reinicia
// sozinho em cada nova tentativa — nunca fica preso entre vidas.

export function isStarAllowedExtremo(levelIdx, starOrderIdx) {
  if (difficulty !== "extremo") return true;
  if (levelIdx >= 14) return false; // Nível 15 em diante: nenhum Star Power
  return starOrderIdx === 0; // só a 1ª estrela do nível
}

// Banco de perguntas a usar, conforme o nível escolhido — cai sempre para
// o banco base (Fácil) se o avançado ainda não tiver perguntas para aquele
// tema, para nunca ficar sem quiz nenhum a meio de um combate.

export function getQuizPool(theme) {
  const base = QUIZ_BY_THEME[theme] || QUIZ_BY_THEME["historia_internet"];
  // Extremo usa o mesmo banco avançado do Difícil (não há um 3º banco
  // dedicado) — nunca deve voltar ao banco base, que seria mais fácil.
  if (difficulty !== "facil") {
    const adv = QUIZ_BY_THEME_AVANCADO[theme];
    if (adv && adv.length) return adv;
  }
  return base;
}

export let itemsCollected=0;

export let itemsTotal=0;

export let extraShieldCounted=false; // garante que o escudo extra (spawnShields) só entra no total UMA vez por nível

export let collectedItemIndices=new Set(); // índices dos itens já apanhados neste nível

// NOVO — recompensas das salas secretas (canos com room:true) já apanhadas
// neste nível/vida. Chave = "x_y" do cano de entrada (único por nível).
// Sem isto, voltar a entrar no mesmo cano dava a recompensa outra vez,
// indefinidamente (pedido: "se já apanhei a recompensa não deve mais lá
// estar, só se perder a vida"). Reposto por completo ao (re)carregar o
// nível; ao perder uma vida mantém só os corações já apanhados, tal como
// já acontece com collectedItemIndices.

export let collectedRoomPipes=new Set();

export let _hudDirty=true; // flag: só redesenha HUD quando algo mudou

export let touch={left:false,right:false,jump:false,crouch:false};

export let awaitingQuiz=false;

export let awaitingStory=false;

export let _doorWatchdogTimer=null;

export let _landingCheckTimer=null;

export let _levelAtDoorTrigger=-1;

export let powered=false;

export let poweredTimer=null;

export let powerCountdown=null;

export let invuln=false;

export let starPower=false;

export let starPowerTimer=null;

export let starPowerCountdown=null;

export let starPowerCountVal=0;

export let doubleJumpActive=false;

export let doubleJumpUsed=false; // duplo salto power-up

// Coyote time + buffer de salto — torna o salto mais "justo" para as crianças

export let coyoteUntil=0;

export let jumpBufferedUntil=0;

export const COYOTE_MS=110;

export const JUMP_BUFFER_MS=130;

export let currentLevelTip = "⭐ Apanha estrelas e chega ao Portal ✨!";

export const GRAVITY=1100;

export let _critterSession = 0; // incrementado a cada loadLevel para invalidar respawns pendentes

export let bossExtremoAllies = [];

export let _doorAnimRunning = false;

export let inBossFight = false;

export let bossState = null; // { def, sprite, hp, phase, collected, onComplete, hitCooldownUntil }

export let bossOverlay = null; // rectangle usado pelo Guardião das Sombras

export let bossLockIcon = null; // 🔒/⭐ flutuante por cima do boss — lembrete visual permanente,

                         // sem depender de o jogador ler o texto do objetivo

export let bossRageIcon = null; // já não é criado em lado nenhum (ver bossEnterRage) — a variável e as

export let controlsInvertedUntil = 0; // usado pelo "livro mau" do Monstro da Ignorância

export let bossVignette = null; // moldura escura nos cantos — usada pela fase final de def.phases (ex.: "Preconceito")

export let bossMiniViruses = [];

let bossPopupAnchors = [];

export let invulnBlinkEvent=null;

export let invulnEndEvent=null;

export let doubleJumpTimer=null;

export let doubleJumpCountdown=null;

export let _starMelodyInterval = null;

// ----- escrita a partir de outros módulos -----
export function set_playerName(v) { playerName = v; return v; }
export function set__vbTimer(v) { _vbTimer = v; return v; }
export function set__historySubOpen(v) { _historySubOpen = v; return v; }
export function set_lastQuizTheme(v) { lastQuizTheme = v; return v; }
export function set__reviewReturnOverlay(v) { _reviewReturnOverlay = v; return v; }
export function set_pausedByTeacher(v) { pausedByTeacher = v; return v; }
export function set__overlayPaused(v) { _overlayPaused = v; return v; }
export function set__winOverlaySubOpen(v) { _winOverlaySubOpen = v; return v; }
export function set__certificateOpenedFrom(v) { _certificateOpenedFrom = v; return v; }
export function set_mapProgress(v) { mapProgress = v; return v; }
export function set_sceneRef(v) { sceneRef = v; return v; }
export function set_currentLevel(v) { currentLevel = v; return v; }
export function set_shadowGfx(v) { shadowGfx = v; return v; }
export function set_powerHaloGfx(v) { powerHaloGfx = v; return v; }
export function set_sunAngle(v) { sunAngle = v; return v; }
export function set_balloons(v) { balloons = v; return v; }
export function set_critters(v) { critters = v; return v; }
export function set_enemyTimers(v) { enemyTimers = v; return v; }
export function set_bossTimers(v) { bossTimers = v; return v; }
export function set_movingPlatforms(v) { movingPlatforms = v; return v; }
export function set_trampolines(v) { trampolines = v; return v; }
export function set_secretDoors(v) { secretDoors = v; return v; }
export function set_hazards(v) { hazards = v; return v; }
export function set_pipes(v) { pipes = v; return v; }
export function set__pipeWarping(v) { _pipeWarping = v; return v; }
export function set__pipeDownWasHeld(v) { _pipeDownWasHeld = v; return v; }
export function set_pipeExitDecor(v) { pipeExitDecor = v; return v; }
export function set_decorativePipes(v) { decorativePipes = v; return v; }
export function set__suppressCrouchUntilRelease(v) { _suppressCrouchUntilRelease = v; return v; }
export function set_currentSign(v) { currentSign = v; return v; }
export function set_secretSigns(v) { secretSigns = v; return v; }
export function set_pipeHintSign(v) { pipeHintSign = v; return v; }
export function set_inSecretRoom(v) { inSecretRoom = v; return v; }
export function set_secretRoomReturn(v) { secretRoomReturn = v; return v; }
export function set_secretRoomHidden(v) { secretRoomHidden = v; return v; }
export function set_secretRoomTemp(v) { secretRoomTemp = v; return v; }
export function set_player(v) { player = v; return v; }
export function set_platforms(v) { platforms = v; return v; }
export function set_itemsGroup(v) { itemsGroup = v; return v; }
export function set_malwareGroup(v) { malwareGroup = v; return v; }
export function set_door(v) { door = v; return v; }
export function set_doorOverlap(v) { doorOverlap = v; return v; }
export function set__eyeOverrideUntil(v) { _eyeOverrideUntil = v; return v; }
export function set__pendingEntranceReveal(v) { _pendingEntranceReveal = v; return v; }
export function set_cursors(v) { cursors = v; return v; }
export function set_keySpace(v) { keySpace = v; return v; }
export function set_keyS(v) { keyS = v; return v; }
export function set_isCrouching(v) { isCrouching = v; return v; }
export function set_hudText(v) { hudText = v; return v; }
export function set_scoreText(v) { scoreText = v; return v; }
export function set_heartsGfx(v) { heartsGfx = v; return v; }
export function set_tipText(v) { tipText = v; return v; }
export function set_itemCountText(v) { itemCountText = v; return v; }
export function set_progressBg(v) { progressBg = v; return v; }
export function set_progressFill(v) { progressFill = v; return v; }
export function set_powerIndicator(v) { powerIndicator = v; return v; }
export function set_playerNameHUD(v) { playerNameHUD = v; return v; }
export function set_difficultyBadge(v) { difficultyBadge = v; return v; }
export function set_pauseOverlayGfx(v) { pauseOverlayGfx = v; return v; }
export function set_transitionGfx(v) { transitionGfx = v; return v; }
export function set_transitionLabel(v) { transitionLabel = v; return v; }
export function set_score(v) { score = v; return v; }
export function set_lives(v) { lives = v; return v; }
export function set_livesLostThisLevel(v) { livesLostThisLevel = v; return v; }
export function set_difficulty(v) { difficulty = v; return v; }
export function set_itemsCollected(v) { itemsCollected = v; return v; }
export function set_itemsTotal(v) { itemsTotal = v; return v; }
export function set_extraShieldCounted(v) { extraShieldCounted = v; return v; }
export function set_collectedItemIndices(v) { collectedItemIndices = v; return v; }
export function set_collectedRoomPipes(v) { collectedRoomPipes = v; return v; }
export function set__hudDirty(v) { _hudDirty = v; return v; }
export function set_awaitingQuiz(v) { awaitingQuiz = v; return v; }
export function set_awaitingStory(v) { awaitingStory = v; return v; }
export function set__doorWatchdogTimer(v) { _doorWatchdogTimer = v; return v; }
export function set__landingCheckTimer(v) { _landingCheckTimer = v; return v; }
export function set__levelAtDoorTrigger(v) { _levelAtDoorTrigger = v; return v; }
export function set_powered(v) { powered = v; return v; }
export function set_poweredTimer(v) { poweredTimer = v; return v; }
export function set_powerCountdown(v) { powerCountdown = v; return v; }
export function set_invuln(v) { invuln = v; return v; }
export function set_starPower(v) { starPower = v; return v; }
export function set_starPowerTimer(v) { starPowerTimer = v; return v; }
export function set_starPowerCountdown(v) { starPowerCountdown = v; return v; }
export function set_starPowerCountVal(v) { starPowerCountVal = v; return v; }
export function set_doubleJumpActive(v) { doubleJumpActive = v; return v; }
export function set_doubleJumpUsed(v) { doubleJumpUsed = v; return v; }
export function set_coyoteUntil(v) { coyoteUntil = v; return v; }
export function set_jumpBufferedUntil(v) { jumpBufferedUntil = v; return v; }
export function set_currentLevelTip(v) { currentLevelTip = v; return v; }
export function set__critterSession(v) { _critterSession = v; return v; }
export function set_bossExtremoAllies(v) { bossExtremoAllies = v; return v; }
export function set__doorAnimRunning(v) { _doorAnimRunning = v; return v; }
export function set_inBossFight(v) { inBossFight = v; return v; }
export function set_bossState(v) { bossState = v; return v; }
export function set_bossOverlay(v) { bossOverlay = v; return v; }
export function set_bossLockIcon(v) { bossLockIcon = v; return v; }
export function set_bossRageIcon(v) { bossRageIcon = v; return v; }
export function set_controlsInvertedUntil(v) { controlsInvertedUntil = v; return v; }
export function set_bossVignette(v) { bossVignette = v; return v; }
export function set_bossMiniViruses(v) { bossMiniViruses = v; return v; }
export function set_bossPopupAnchors(v) { bossPopupAnchors = v; return v; }
export function set_invulnBlinkEvent(v) { invulnBlinkEvent = v; return v; }
export function set_invulnEndEvent(v) { invulnEndEvent = v; return v; }
export function set_doubleJumpTimer(v) { doubleJumpTimer = v; return v; }
export function set_doubleJumpCountdown(v) { doubleJumpCountdown = v; return v; }
export function set__starMelodyInterval(v) { _starMelodyInterval = v; return v; }
