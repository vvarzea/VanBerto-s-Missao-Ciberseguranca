/*************************************************
 * VanBerto's — Missão Cibersegurança 🛡️  ·  game/dom.js
 *
 * Referências aos elementos do HTML (overlays, botões, campos) usadas por todo o jogo.
 *
 * Faz parte de dia-crianca.js, dividido em módulos (ver README.md, «Estrutura do código»).
 * As variáveis de estado vivem em state.js; aqui alteram-se com set_<nome>().
 *************************************************/


// ===== DOM =====

export const startOverlay   = document.getElementById("startOverlay");

export const howOverlay     = document.getElementById("howOverlay");

export const quizOverlay    = document.getElementById("quizOverlay");

export const historyOverlay = document.getElementById("historyOverlay");

export const historyText    = document.getElementById("historyText");

export const btnHistory     = document.getElementById("btnHistory");

export const quizQuestion   = document.getElementById("quizQuestion");

export const quizAnswers    = document.getElementById("quizAnswers");

export const quizFeedback   = document.getElementById("quizFeedback");

export const quizExplanation= document.getElementById("quizExplanation");

export const btnCloseQuiz   = document.getElementById("btnCloseQuiz");

export const btnStart       = document.getElementById("btnStart");

export const btnHow         = document.getElementById("btnHow");

export const btnCloseHow    = document.getElementById("btnCloseHow");

export const btnMute        = document.getElementById("btnMute");

export const btnPause       = document.getElementById("btnPause");

export const btnRestart     = document.getElementById("btnRestartLevel");

export const btnRestartGame = document.getElementById("btnRestartGame");

export const playerNameInput= document.getElementById("playerName");

export const gameOverOverlay= document.getElementById("gameOverOverlay");

export const winOverlay     = document.getElementById("winOverlay");

export const hitFlash   = document.createElement("div"); 

export const bonusStars = document.createElement("div"); 

// ----- ligações executadas no arranque (ordem original preservada; chamadas por dia-crianca.js) -----
export function init_dom_0() {
  // NOVO (pedido: "o Enter devia dar para entrar no jogo") — um <input>
  // de texto normal não reage ao Enter sozinho (isso só acontece dentro de
  // um <form> com submit, que aqui não existe). O resto do jogo já trata
  // bem o Enter — só faltava mesmo este listener dedicado ao campo do
  // nome. btnStart.click() (não .onclick() direto) para disparar o mesmo
  // fluxo de sempre, incluindo o ecrã de dificuldade.
  playerNameInput?.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); btnStart.click(); }
  });
hitFlash.id = "hitFlash";   
document.body.appendChild(hitFlash);
bonusStars.id = "bonusStars"; 
document.body.appendChild(bonusStars);
}
