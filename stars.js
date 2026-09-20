// ===== Estrelas por nível — Fase 2 =====
// Por nível, até 3 estrelas:
//  ⭐1 = apanhou todos os itens do nível (se o nível tiver itens; senão concede-se ao concluir)
//  ⭐2 = completou sem perder nenhuma vida
//  ⭐3 = acertou a pergunta à primeira tentativa
// Rastreio paralelo guardado em localStorage — não interfere com pontuação nem lógica de jogo.
//
// TROCA (pedido): a 1ª estrela era "encontrou 1 segredo" — passou a ser
// "apanhou TODOS os itens do nível" (mesma contagem que já existia no HUD,
// "⭐ Itens: X/Y" — ver itemsCollected/itemsTotal em dia-crianca.js), por
// serem conceptualmente parecidas (ambas recompensam explorar bem o nível,
// não só chegar à porta) e para não sobrepor com a estrela de "1ª
// tentativa" (essa continua ligada à aprendizagem, sem alterações). O
// rastreio de segredos (secretsFoundThisLevel/incrementSecretsFound) NÃO foi
// tocado — continua a existir e a ser usado pela conquista "Explorador" em
// achievements.js, só deixou de decidir esta estrela.
import { LEVELS } from "./data-levels.js?v=20260920v76";
import { loadNamespace, saveNamespace } from "./storage.js?v=20260920v76";

export let levelStars = {};           // { [levelIdx]: { allItems:bool, noDamage:bool, firstTry:bool } }
let secretsFoundThisLevel = 0;        // reposto em cada loadLevel — ainda usado pela conquista "Explorador"
let quizFirstTryThisLevel = false;

export function loadStars() {
  levelStars = loadNamespace("stars", {});
}
export function saveStars() {
  saveNamespace("stars", levelStars);
}
loadStars();

export function starsForLevel(idx) {
  const rec = levelStars[idx];
  if (!rec) return 0;
  return (rec.allItems ? 1 : 0) + (rec.noDamage ? 1 : 0) + (rec.firstTry ? 1 : 0);
}
// Devolve o registo completo (allItems/noDamage/firstTry) de um nível, para
// que o ecrã de "Nível Concluído" possa mostrar exatamente QUAL critério foi
// cumprido em cada estrela, e não só quantas estrelas no total — pedido
// explicitamente para deixar claro o que faltou para a 3ª estrela.
export function getStarRecord(idx) {
  const rec = levelStars[idx];
  return rec ? rec : { allItems:false, noDamage:false, firstTry:false };
}
export function totalStarsEarned() {
  return Object.keys(levelStars).reduce((sum, k) => sum + starsForLevel(k), 0);
}
// Chamado ao entrar num nível novo — reinicia os contadores transitórios
export function resetLevelStarTracking() {
  secretsFoundThisLevel = 0;
  quizFirstTryThisLevel = false;
}
export function getSecretsFoundThisLevel() { return secretsFoundThisLevel; }
export function incrementSecretsFound() { secretsFoundThisLevel += 1; return secretsFoundThisLevel; }
export function markFirstTryThisLevel() { quizFirstTryThisLevel = true; }

// Chamado quando o nível é concluído (resposta certa, antes de markLevelCompleted).
// itemsCollected/itemsTotal: mesma contagem já usada no HUD (ver dia-crianca.js,
// "⭐ Itens: X/Y") — inclui os itens normais de L.items MAIS qualquer bónus de
// segredo já descoberto nesta tentativa (heart não conta, tal como no HUD).
export function finalizeLevelStars(idx, livesLostThisLevel, itemsCollected, itemsTotal) {
  // BUG CORRIGIDO: isto lia o record já guardado (levelStars[idx] || {...}) e
  // só ACRESCENTAVA flags a "true", nunca as repunha — por isso, assim que um
  // nível ganhava as 3 estrelas uma única vez, ficava preso em 3/3 para
  // sempre, mesmo que uma repetição perdesse vidas, não apanhasse todos os
  // itens ou errasse a pergunta à primeira. Foi mudado para cada finalização
  // refletir só a tentativa que acabou de terminar.
  //
  // BUG CORRIGIDO (2ª ronda — pedido do Berto: quer poder voltar a um nível
  // onde só teve 2 estrelas e melhorar para 3, o que a correção acima
  // impedia na prática): sem NENHUMA memória do que já tinha sido
  // conseguido antes, tentar melhorar um nível era um risco — bastava
  // perder uma vida por azar nessa repetição para a repetição ficar PIOR do
  // que já estava, mesmo tendo conseguido as 3 estrelas numa tentativa
  // anterior. A solução correta é usar o melhor dos dois em CADA critério
  // individualmente (allItems/noDamage/firstTry cada um por si, não o
  // conjunto todo escolhido de uma vez) — uma repetição pode ganhar uma
  // estrela que faltava e perder outra que já tinha (ex.: desta vez sem
  // perder vidas, mas sem apanhar todos os itens); o resultado guardado deve
  // ficar com as duas, nunca escolher entre uma tentativa ou a outra. Assim,
  // uma repetição só pode subir ou manter, nunca descer.
  const prev = levelStars[idx] || { allItems:false, noDamage:false, firstTry:false };
  const rec = { allItems:false, noDamage:false, firstTry:false };
  // Se o nível não tem itens (itemsTotal===0), a 1ª estrela é concedida
  // automaticamente ao concluir — mesma lógica que já existia para "sem segredos".
  if (!itemsTotal) rec.allItems = true;
  else if (itemsCollected >= itemsTotal) rec.allItems = true;
  if (livesLostThisLevel === 0) rec.noDamage = true;
  if (quizFirstTryThisLevel) rec.firstTry = true;
  levelStars[idx] = {
    allItems:  prev.allItems  || rec.allItems,
    noDamage:  prev.noDamage  || rec.noDamage,
    firstTry:  prev.firstTry  || rec.firstTry,
  };
  saveStars();
}

export function allLevelsFirstTry() {
  return LEVELS.every((L, i) => levelStars[i] && levelStars[i].firstTry);
}
export function allLevelsThreeStars() {
  return LEVELS.every((L, i) => starsForLevel(i) === 3);
}
export function resetAllStars() {
  levelStars = {};
  saveStars();
}
