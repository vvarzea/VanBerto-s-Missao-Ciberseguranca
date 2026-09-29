/*************************************************
 * VanBerto's — Missão Cibersegurança 🛡️  ·  game/stats.js
 *
 * Estatísticas globais persistentes, medalhas e rastreio de eventos.
 *
 * Faz parte de dia-crianca.js, dividido em módulos (ver README.md, «Estrutura do código»).
 * As variáveis de estado vivem em state.js; aqui alteram-se com set_<nome>().
 *************************************************/

import { btnStart } from "./dom.js?v=20260929v95";
import { score } from "./state.js?v=20260929v95";
import { loadNamespace, saveNamespace } from "../storage.js?v=20260929v95";

// =====================================================
// ===== ESTATÍSTICAS GLOBAIS — rastreio persistente =====
// =====================================================

export const QUIZ_ERRORS_MAX = 60; // limite do registo persistente de erros (≈15 KB no localStorage)

export let globalStats = {
  totalPlayTime: 0,        // segundos
  enemiesDefeated: 0,
  quizTotal: 0,
  quizCorrect: 0,
  quizWrong: 0,
  curiositiesRead: 0,
  starsCollectedTotal: 0,
  levelsCompleted: 0,
  gamesPlayed: 0,
  // BUG CORRIGIDO (Certificado Oficial): "score" é só da sessão/tentativa
  // atual — zerado sempre que se sai para o Menu, se tenta de novo depois
  // de "Game Over", ou se recomeça o nível/jogo a meio (ver os vários
  // "score=0" espalhados pelo código). O certificado, pelo contrário,
  // certifica a aventura TODA (as mesmas Estrelas e % de Acertos aqui já
  // são persistentes, ao contrário de "Pontos" até agora) — um jogador
  // que tivesse saído para o menu ou tentado de novo alguma vez a meio do
  // percurso via o certificado com "20/20 estrelas, 95% acertos" mas
  // "340 pontos", claramente incoerente. totalScoreEarned acumula tudo o
  // que "score" já tiver ganho, sempre imediatamente antes de "score" ser
  // reposto a 0 (ver flushScoreToStats(), chamada nesses mesmos sítios) —
  // exceto quando o reset é parte de um recomeço TOTAL (resetAllProgress,
  // que zera este campo também), onde não faria sentido preservá-lo.
  totalScoreEarned: 0,
  // Registo PERSISTENTE das perguntas falhadas à 1.ª tentativa (as últimas QUIZ_ERRORS_MAX).
  // Antes só existia quizStats.errors, que é reposto a zero ao sair para o menu, ao tentar de
  // novo depois de «Game Over», ao recomeçar o nível… — enquanto quizTotal/quizCorrect/quizWrong
  // persistem. Resultado (print do Berto): o ecrã de Vitória dizia «17/27 (63%)» — ou seja, 10
  // erros — mas o relatório listava só 1. O relatório final usa agora este registo.
  quizErrors: []
};

let _statsSessionStart = Date.now();

function loadGlobalStats() {
  const d = loadNamespace("globalStats", {});
  Object.keys(globalStats).forEach(k => {
    if (typeof d[k] === "number") globalStats[k] = d[k];
  });
  if (Array.isArray(d.quizErrors)) {
    globalStats.quizErrors = d.quizErrors
      .filter(e => e && typeof e.q === "string" && typeof e.theme === "string")
      .slice(-QUIZ_ERRORS_MAX);
  }
}

export function saveGlobalStats() {
  saveNamespace("globalStats", globalStats);
}

// Pontos da aventura toda (o que já foi somado de tentativas anteriores + a tentativa atual).
// Usado no ecrã de Vitória E no Certificado, para nunca mostrarem números diferentes.

export function adventureScore() { return globalStats.totalScoreEarned + score; }

// Uma só regra de medalhas para a Vitória e o Certificado (antes tinham limiares diferentes:
// por exemplo, com 85% um dizia «Ouro» e o outro «Excelente» prateado).

export function medalTier(pct) { return pct >= 100 ? "perfect" : pct >= 90 ? "gold" : pct >= 70 ? "silver" : pct >= 60 ? "bronze" : "improve"; }

export function medalTextWin(tier) {
  return tier === "silver" ? "🥈 Prata — muito bem!" : tier === "bronze" ? "🥉 Bronze — missão concluída!"
       : tier === "improve" ? "📚 Missão concluída — continua a treinar!" : "🥇 Ouro — excelente!";
}

export function medalTextCert(tier) {
  return tier === "perfect" ? "🥇 Perfeito" : tier === "gold" ? "🥇 Excelente" : tier === "silver" ? "🥈 Muito bom"
       : tier === "bronze" ? "🥉 Bom" : "📚 A Melhorar";
}

// Ver comentário em globalStats.totalScoreEarned acima.

export function flushScoreToStats() {
  if (score > 0) {
    globalStats.totalScoreEarned += score;
    saveGlobalStats();
  }
}

export function updatePlayTime() {
  const elapsed = Math.floor((Date.now() - _statsSessionStart) / 1000);
  globalStats.totalPlayTime += elapsed;
  _statsSessionStart = Date.now();
  saveGlobalStats();
}

// =====================================================
// ===== CONTAR PARTIDAS em Nova Aventura =====
// =====================================================

let _origBtnStart_onclick;

// ----- ligações executadas no arranque (ordem original preservada; chamadas por dia-crianca.js) -----
export function init_stats_0() {
  loadGlobalStats();
}

export function init_stats_1() {

  // =====================================================
  // ===== RASTREIO DE EVENTOS PARA ESTATÍSTICAS =====
  // Integra com eventos já existentes no jogo
  // =====================================================

  // Expor globalmente para ser chamado no lugar certo
  window.__vb_trackEnemyDefeat = function() {
    if(typeof globalStats !== "undefined") {
      globalStats.enemiesDefeated += 1;
      saveGlobalStats();
    }
  };

  // Salvar tempo de jogo ao fechar/esconder
  window.addEventListener("beforeunload", () => { updatePlayTime(); });
}

export function init_stats_2() {

  // _origBtnStart_onclick (declarado no início deste ficheiro)
  _origBtnStart_onclick = btnStart.onclick;
  btnStart.addEventListener("click", () => {
    if(typeof globalStats !== "undefined") {
      globalStats.gamesPlayed += 1;
      _statsSessionStart = Date.now();
      saveGlobalStats();
    }
  });
}
