/*************************************************
 * VanBerto's — Missão Cibersegurança 🛡️  ·  game/quiz.js
 *
 * Quiz: estatísticas, escolha da pergunta, revisão espaçada dos erros, «Sabias que…?» e o ecrã do quiz.
 *
 * Faz parte de dia-crianca.js, dividido em módulos (ver README.md, «Estrutura do código»).
 * As variáveis de estado vivem em state.js; aqui alteram-se com set_<nome>().
 *************************************************/

import { damageBoss } from "./boss-combat.js?v=20261009v103";
import { startBossFight } from "./boss-core.js?v=20261009v103";
import { vbSayRandom } from "./dialogue.js?v=20261009v103";
import { btnCloseQuiz, btnHistory, historyOverlay, historyText, quizAnswers, quizExplanation, quizFeedback, quizOverlay, quizQuestion, startOverlay } from "./dom.js?v=20261009v103";
import { showDynamicMsg } from "./feedback.js?v=20261009v103";
import { showVictoryScreen } from "./flow.js?v=20261009v103";
import { openOverlay } from "./overlays.js?v=20261009v103";
import { revealPlayerEntrance } from "./rooms.js?v=20261009v103";
import { _vbTimer, bossState, currentLevel, getDifficulty, getMaxLives, getQuizPool, inBossFight, lives, mapProgress, pausedByTeacher, player, sceneRef, set__reviewReturnOverlay, set__vbTimer, set_awaitingQuiz, set_awaitingStory, set_invuln, set_lives } from "./state.js?v=20261009v103";
import { QUIZ_ERRORS_MAX, globalStats, saveGlobalStats } from "./stats.js?v=20261009v103";
import { QUIZ_BY_THEME, QUIZ_BY_THEME_AVANCADO, QUIZ_TIPS, QUIZ_ARTICLE, HISTORY } from "../data-quiz.js?v=20261009v103";
import { ensureAudio, SFX } from "../audio.js?v=20261009v103";
import { LEVELS } from "../data-levels.js?v=20261009v103";
import { onHistoryReadForAchievements, onCorrectAnswerForAchievements, checkAchievements } from "../achievements.js?v=20261009v103";
import { DYNAMIC_MSGS_CORRECT, VB_QUIZ_CORRECT, DYNAMIC_MSGS_WRONG, VB_QUIZ_WRONG } from "../data-flavor.js?v=20261009v103";

// ===== Quiz stats =====

export const quizStats = { total:0, correct:0, everWrong:false, errors:[], errorsByTheme:{} };

export const usedQuizByLevel = {};

export const usedQuizByTheme = {}; // anti-repetição global por tema (cross-nível)

const lastQuizPickByTheme = {}; // última pergunta saída por tema (para não repetir ao reiniciar o ciclo)

export function resetQuizStats() { quizStats.total=0; quizStats.correct=0; quizStats.everWrong=false; quizStats.errors=[]; quizStats.errorsByTheme={}; }

// Opções mostradas numa pergunta.
// Fácil: 3 opções (1 certa + 2 erradas). Difícil e Extremo: 4 opções (1 certa + 3 erradas); se a pergunta só tiver
// 2 distratores (ex.: tema sem banco avançado), ficam 3 opções. A ordem é sempre baralhada: nos dados a certa vem primeiro.
function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}
function buildQuizOptions(quiz) {
  const correct = quiz.a.filter(x => x.ok);
  const wrong = shuffleInPlace(quiz.a.filter(x => !x.ok));
  const nWrong = getDifficulty() === "facil" ? 2 : 3;
  return shuffleInPlace([...correct.slice(0, 1), ...wrong.slice(0, nWrong)]);
}


// ===== Modo Revisão — reutilizável a partir de vários pontos =====
// (vitória final, ecrã de "Missão Falhada" e menu suspenso a meio do jogo).
// Preenche a lista #reviewList com as perguntas erradas da tentativa atual.


// Escapa texto vindo do localStorage (os erros guardados) antes de o pôr em innerHTML.
const escHTML = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

function populateReviewList(source = "attempt") {
  const reviewList = document.getElementById("reviewList");
  if (!reviewList) return;
  reviewList.innerHTML = "";
  const errorList = source === "adventure" ? globalStats.quizErrors : quizStats.errors;
  if (!errorList || errorList.length === 0) {
    reviewList.innerHTML = `<p style="text-align:center;color:#a0ffb0;font-size:14px;padding:20px 0;">🎉 Ainda não erraste nenhuma pergunta nesta tentativa. Continua assim!</p>`;
    return;
  }
  errorList.forEach((e,i)=>{
    const pool=getQuizPool(e.theme)||[];
    const orig=pool.find(q=>q.q===e.q);
    const exp=orig?.exp||"";
    const art=QUIZ_ARTICLE[e.theme];
    const div=document.createElement("div");
    div.className="review-question";
    div.innerHTML=`
        ${art?`<div style="margin-bottom:5px;"><span class="quiz-article-badge">📜 ${art}</span></div>`:""}
        <div class="review-question-text">${i+1}. ${escHTML(e.level)} — ${escHTML(e.q)}</div>
        <div class="review-wrong">❌ A tua resposta: <strong>${escHTML(e.wrong)}</strong></div>
        <div class="review-correct">✅ Resposta certa: <strong>${escHTML(e.correct)}</strong></div>
        ${exp?`<div class="review-explanation">💡 ${exp}</div>`:""}
      `;
    reviewList.appendChild(div);
  });
}

// Abre o Modo Revisão. Se returnOverlayId for indicado (ex.: "winOverlay",
// "gameOverOverlay"), esse overlay é escondido e reposto ao fechar — usado
// quando o jogo já está numa tela de fim de tentativa. Se for null, usa o
// sistema normal de overlays secundários (openOverlay/closeOverlay), para
// acesso a meio do jogo (ex.: menu suspenso), que já trata da pausa da física.

function openReviewScreen(returnOverlayId = null, source = "attempt") {
  populateReviewList(source);
  set__reviewReturnOverlay( returnOverlayId);
  if (returnOverlayId) {
    document.getElementById(returnOverlayId)?.classList.add("hidden");
    document.getElementById("reviewOverlay")?.classList.remove("hidden");
  } else {
    openOverlay("reviewOverlay");
  }
}

export function wireReviewButton(btnId, quizErrorsCount, labelSuffix, returnOverlayId, source = "attempt") {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (quizErrorsCount > 0) {
    btn.style.display = "block";
    btn.textContent = `📋 Ver ${quizErrorsCount} erro${quizErrorsCount>1?"s":""}${labelSuffix||""}`;
    btn.onclick = () => openReviewScreen(returnOverlayId, source);
  } else {
    btn.style.display = "none";
  }
}

export function pickQuizForLevel(levelIdx, theme) {
  const pool = getQuizPool(theme);
  // Rastreio global por tema — evita repetir a mesma pergunta em níveis diferentes com o mesmo tema
  if (!usedQuizByTheme[theme]) usedQuizByTheme[theme] = new Set();
  const usedGlobal = usedQuizByTheme[theme];
  if (usedGlobal.size >= pool.length) { // esgotou — reiniciar, mas sem repetir logo a última
    usedGlobal.clear();
    const last = lastQuizPickByTheme[theme];
    if (last !== undefined && pool.length > 1) usedGlobal.add(last);
  }
  const candidates = pool.map((_,i) => i).filter(i => !usedGlobal.has(i));
  const pick = candidates.length > 0
    ? candidates[Math.floor(Math.random() * candidates.length)]
    : Math.floor(Math.random() * pool.length);
  usedGlobal.add(pick);
  lastQuizPickByTheme[theme] = pick;
  if (!usedQuizByLevel[levelIdx]) usedQuizByLevel[levelIdx] = new Set();
  usedQuizByLevel[levelIdx].add(pick);
  return pool[pick];
}

export function showHistory(levelIndex, onDone) {
  // HISTORY[] está alinhado com os 20 níveis "de direitos" (0-19), não com a
  // posição bruta na LEVELS (que inclui os bosses). Por isso resolvemos pelo
  // artIdx do nível — os bosses não têm artIdx, por isso simplesmente não mostram história.
  const Lh = LEVELS[levelIndex];
  const histIdx = (Lh && Lh.artIdx != null) ? Lh.artIdx : levelIndex;
  const entry = HISTORY[histIdx] || null;
  if (!entry) { set_awaitingQuiz(false); if (sceneRef) revealPlayerEntrance(sceneRef); onDone?.(); return; }
  set_awaitingStory( true);
  // Cancelar qualquer fala pendente do VanBerto's (ex: setTimeout do nível anterior)
  // para o balão não aparecer "pendurado" por cima do cartão "Sabias que...?".
  if (_vbTimer) { clearTimeout(_vbTimer); set__vbTimer( null); }
  document.getElementById("vbSpeech")?.classList.remove("vb-show");
  historyText.innerHTML = `<strong class="history-title">${entry.title}</strong>\n${entry.text}`;
  historyOverlay.classList.remove("hidden");
  if (sceneRef) sceneRef.physics.pause();
  // Tap no fundo escuro (fora do cartão) também fecha — evita bloqueio em mobile
  historyOverlay.onclick = (e) => { if(e.target === historyOverlay) btnHistory.onclick?.(); };
  const _historyWatchdog = setTimeout(() => { if(!historyOverlay.classList.contains("hidden")) btnHistory.onclick?.(); }, 15000);
  btnHistory.onclick = () => {
    clearTimeout(_historyWatchdog);
    historyOverlay.onclick = null;
    historyOverlay.classList.add("hidden");
    set_awaitingStory( false);
    set_awaitingQuiz( false); // nível pronto a jogar — só agora desbloqueamos hits e porta
    // Rastrear leitura de curiosidade para conquistas e estatísticas
    onHistoryReadForAchievements(mapProgress.levelsCompleted.length);
    if(typeof globalStats !== "undefined") {
      globalStats.curiositiesRead += 1;
      saveGlobalStats();
    }
    if (sceneRef && !pausedByTeacher
        && startOverlay.classList.contains("hidden")
        && quizOverlay.classList.contains("hidden")) {
      sceneRef.physics.resume();
      revealPlayerEntrance(sceneRef);
    }
    onDone?.();
  };
}

export function showQuiz(quiz,done,attemptNum){
  // NOVO (rede de segurança, pedido: "o boss não pode começar antes do
  // quiz do nível" — voltou a acontecer mesmo depois da proteção em
  // startBossFight()) — essa proteção só cobre o instante em que o boss
  // ARRANCA; não ajuda se o quiz for aberto depois disso, seja qual for
  // o caminho exato que o causa. Aqui, no único sítio por onde QUALQUER
  // quiz tem de passar, adia-se a abertura em vez de a mostrar por cima
  // da cinemática de entrada/vitória do boss (#cineDialog, ver
  // cinematics.js) — repete-se a cada 250ms até essa caixa fechar, e só
  // aí mostra o quiz. Nunca dispara em jogo normal (a caixa está fechada
  // a maior parte do tempo) e garante que os dois nunca ficam visíveis
  // ao mesmo tempo, independentemente da causa exata do timing.
  const cineDialog = document.getElementById("cineDialog");
  // bossState.phase==="intro" (definido de forma síncrona, sem qualquer
  // atraso, logo na 1ª linha de startBossFight) cobre a janela mínima
  // entre o boss começar e a classe "cine-show" ser aplicada — ver o
  // setTimeout(0) em playCinematic/cinematics.js.
  if ((cineDialog && cineDialog.classList.contains("cine-show")) || (inBossFight && bossState && bossState.phase === "intro")) {
    setTimeout(() => showQuiz(quiz, done, attemptNum), 250);
    return;
  }
  // CORRIGIDO — isRetry era um booleano fixo: a partir da 2ª pergunta ficava
  // sempre "true" para sempre, por isso o rótulo dizia sempre "Segunda
  // tentativa!" mesmo na 3ª, 4ª, 5ª tentativa. Agora attemptNum conta mesmo
  // (1=primeira, nunca mostrado), e o rótulo/mensagem usam esse número real.
  attemptNum = attemptNum || 1;
  const isRetry = attemptNum > 1;
  quizOverlay.classList.remove("hidden");
  // bindTap(): liga a MESMA ação a "click" E a "touchend" (com preventDefault
  // para o touchend não disparar depois um "click" fantasma a duplicar).
  // Só usar .onclick deixava os botões do quiz por vezes surdos ao primeiro
  // toque em tablets — a sequência touchstart→touchend→click do browser
  // pode falhar a converter num "click" em certas condições (overlay a
  // aparecer a meio de outro gesto, física a retomar, etc.); ouvir também
  // "touchend" diretamente já não depende dessa conversão. Os handlers já
  // têm as suas próprias flags de proteção (answered/triggered), por isso
  // não há risco de disparar duas vezes se ambos os eventos chegarem a
  // acontecer.
  const bindTap = (el, handler) => {
    el.onclick = handler;
    el.ontouchend = (e) => { e.preventDefault(); handler(); };
  };
  // Em combate de boss, o tema certo é o do PRÓPRIO boss (bossState.def.quizTheme)
  // — não o do nível que acabou de terminar. Hoje os dois valores são sempre
  // iguais de propósito (ver comentários em data-bosses.js, "corrigido para
  // bater com o Nível X"), mas isso é mantido à mão em dois sítios diferentes;
  // se алguma vez ficarem dessincronizados, ler sempre LEVELS[currentLevel]
  // aqui mostraria o crachá/dica errados e a "2ª tentativa" escolheria
  // perguntas de outro tema. Resolver a partir do boss quando ele existe
  // elimina essa fragilidade.
  const _qTheme = bossState?.def?.quizTheme || LEVELS[currentLevel]?.quizTheme;
  const _article = QUIZ_ARTICLE[_qTheme];
  const _badgeHTML = _article ? `<span class="quiz-article-badge">📜 ${_article}</span><br>` : "";
  quizQuestion.innerHTML = _badgeHTML + (isRetry ? `🔄 ${attemptNum}ª tentativa! ` : "") + quiz.q;
  quizAnswers.innerHTML=""; quizFeedback.textContent=""; quizFeedback.style.color="#ff6b35";
  quizExplanation.textContent=""; quizExplanation.classList.add("hidden");
  // Limpar sempre o btnCloseQuiz ao abrir nova pergunta — evita cliques acidentais
  btnCloseQuiz.classList.add("hidden"); btnCloseQuiz.onclick=null; btnCloseQuiz.ontouchend=null;

  const correct = quiz.a.filter(x => x.ok); // a resposta certa (usada ao comparar e ao mostrar «A resposta certa era…»)
  const opts = buildQuizOptions(quiz);

  quizAnswers.classList.toggle("answers--four", opts.length>=4); // 2×2 em ecrãs largos (ver CSS)
  let answered=false;
  opts.forEach(ans=>{
    const b=document.createElement("button");
    b.className="btn"; b.textContent=ans.t;
    b.setAttribute("aria-label",`Resposta: ${ans.t}`);
    bindTap(b, () => {
      if(answered) return; answered=true;
      ensureAudio(); if(!isRetry) quizStats.total+=1;

      quizAnswers.querySelectorAll(".btn").forEach(btn=>{
        btn.disabled=true;
        if(btn.textContent===correct[0].t){
          btn.style.background="rgba(20,80,20,0.75)";
          btn.style.borderColor="#4caf50";
          btn.style.color="#b8ffb8";
        } else if(btn===b&&!ans.ok){
          btn.style.background="rgba(100,20,20,0.75)";
          btn.style.borderColor="#c0392b";
          btn.style.color="#ffb8b8";
        } else { btn.style.opacity="0.35"; }
      });

      if(ans.ok){
        if(!isRetry) quizStats.correct+=1;
        // Rastrear para estatísticas globais
        if(typeof globalStats !== "undefined") {
          if(!isRetry){
            globalStats.quizTotal += 1;
            globalStats.quizCorrect += 1;
            saveGlobalStats();
          }
          showDynamicMsg(DYNAMIC_MSGS_CORRECT);
        }
        // Rastrear conquistas (a reavaliação com a contagem de níveis é feita
        // depois de markLevelCompleted, no done(ok) — ver nextLevel/showQuiz)
        onCorrectAnswerForAchievements(!isRetry);
        checkAchievements(mapProgress.levelsCompleted.length);
        btnCloseQuiz.classList.add("hidden"); btnCloseQuiz.onclick=null; btnCloseQuiz.ontouchend=null;
        quizFeedback.textContent=isRetry?`✅ Conseguiste à ${attemptNum}ª tentativa! 💪`:"✅ Muito bem!";
        quizFeedback.style.color="#208050";
        SFX.coin();
        vbSayRandom(VB_QUIZ_CORRECT,"good",3200);
        // Mostrar SEMPRE: explicação do quiz E/OU dica do tema
        const tipFact = QUIZ_TIPS[_qTheme] || "";
        const expText = quiz.exp ? "💡 " + quiz.exp : "";
        const combined = expText || (tipFact ? "📌 Recorda: " + tipFact : "");
        if(combined){
          quizExplanation.textContent = combined;
          quizExplanation.classList.remove("hidden");
          btnCloseQuiz.classList.remove("hidden");
          btnCloseQuiz.textContent = "Continuar ▶";
          bindTap(btnCloseQuiz, () => {
            btnCloseQuiz.classList.add("hidden"); btnCloseQuiz.onclick=null; btnCloseQuiz.ontouchend=null;
            // Esconder robot ANTES de fechar o overlay
            if(sceneRef&&player){ sceneRef.tweens.killTweensOf(player); player.setAlpha(0); }
            quizOverlay.classList.add("hidden"); done(true);
          });
          btnCloseQuiz.focus({ preventScroll: true });
        } else {
          setTimeout(()=>{
            // Esconder robot ANTES de fechar o overlay
            if(sceneRef&&player){ sceneRef.tweens.killTweensOf(player); player.setAlpha(0); }
            quizOverlay.classList.add("hidden"); done(true);
          },900);
        }
      } else {
        quizStats.everWrong=true; SFX.hit();
        // Rastrear para estatísticas globais (só conta na primeira tentativa)
        if(!isRetry && typeof globalStats !== "undefined") {
          globalStats.quizTotal += 1;
          globalStats.quizWrong += 1;
          saveGlobalStats();
          showDynamicMsg(DYNAMIC_MSGS_WRONG);
        }
        if(sceneRef&&player){sceneRef.tweens.add({targets:player,angle:{from:-10,to:10},duration:80,yoyo:true,repeat:4,ease:"Sine.easeInOut",onComplete:()=>{if(player)player.setAngle(0);}});}
        vbSayRandom(VB_QUIZ_WRONG,"wrong",3200);

        quizStats.errors=quizStats.errors||[];
        if(!isRetry) {
          const qTheme = _qTheme || "historia";
          const _err = {level:LEVELS[currentLevel]?.name||`Nível ${currentLevel+1}`,theme:qTheme,q:quiz.q,wrong:ans.t,correct:correct[0].t};
          quizStats.errors.push(_err);
          quizStats.errorsByTheme[qTheme] = (quizStats.errorsByTheme[qTheme]||0) + 1;
          // Registo persistente: o relatório final mostra a aventura toda, não só a tentativa atual
          globalStats.quizErrors.push(_err);
          if (globalStats.quizErrors.length > QUIZ_ERRORS_MAX) globalStats.quizErrors.splice(0, globalStats.quizErrors.length - QUIZ_ERRORS_MAX);
          saveGlobalStats();
        }
        if(quiz.exp){quizExplanation.textContent="💡 "+quiz.exp;quizExplanation.classList.remove("hidden");}
        const tip=QUIZ_TIPS[_qTheme]||"";
        quizFeedback.textContent="❌ Quase! A resposta certa era: "+correct[0].t+"\nTenta outra pergunta!";
        if(tip) quizFeedback.textContent+=`\n💡 Lembra-te: ${tip}`;
        quizFeedback.style.color="#e84d10";
        btnCloseQuiz.classList.remove("hidden"); btnCloseQuiz.textContent="🔄 Tentar outra pergunta";
        bindTap(btnCloseQuiz, () => {
          btnCloseQuiz.classList.add("hidden");
          showQuiz(pickQuizForLevel(currentLevel,_qTheme),done,attemptNum+1);
        });
        btnCloseQuiz.focus({ preventScroll: true });
      }
    });
    quizAnswers.appendChild(b);
  });

  // Foca a primeira resposta automaticamente — permite já usar as setas
  // ↑/↓ e Enter sem ter de tocar antes no botão com o rato/dedo.
  quizAnswers.querySelector(".btn")?.focus({ preventScroll: true });
}

// ----- ligações executadas no arranque (ordem original preservada; chamadas por dia-crianca.js) -----
export function init_quiz_0() {
  // Usado pelo menu (☰ → Erros): fica sempre disponível.
  window.__vb_openReview = () => openReviewScreen(null);

  // Ganchos SÓ para os testes automáticos (_dev/smoke.py). Só existem quando o browser está a ser controlado por
  // automação (navigator.webdriver, que o Playwright/Chromium põe a true); num telemóvel ou computador normal
  // um aluno não os encontra na consola. Não mudar para ficarem sempre ativos.
  if (navigator.webdriver) {
    window.__vb_showVictory = () => showVictoryScreen(sceneRef);
    // Arrancam um combate de boss diretamente, tiram-lhe 1 de vida (damageBoss trata sozinho das fases, da fúria
    // e da derrota) e deixam ver o estado.
    window.__vb_test = {
      startBoss: (afterLevel) => { startBossFight(sceneRef, afterLevel, () => {}); },
      hitBoss: () => {
        if (!bossState || !bossState.sprite || !bossState.sprite.active) return false;
        bossState.hitCooldownUntil = 0; damageBoss(sceneRef, bossState.sprite.x, bossState.sprite.y); return true;
      },
      boss: () => bossState ? { id: bossState.def.id, hp: bossState.hp, max: bossState.def.hp } : null,
      inBossFight: () => inBossFight,
      level: () => currentLevel,
      lives: () => lives,
      keepAlive: () => { set_lives( getMaxLives()); set_invuln( true); }
    };
  }
}
