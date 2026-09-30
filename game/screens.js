/*************************************************
 * VanBerto's — Missão Cibersegurança 🛡️  ·  game/screens.js
 *
 * Ecrãs de Conquistas, Álbum, Estatísticas, Opções e Certificado final.
 *
 * Faz parte de dia-crianca.js, dividido em módulos (ver README.md, «Estrutura do código»).
 * As variáveis de estado vivem em state.js; aqui alteram-se com set_<nome>().
 *************************************************/

import { renderAlbum, resetAllProgress } from "./artefacts.js?v=20260929v96";
import { btnMute, btnPause } from "./dom.js?v=20260929v96";
import { playLevelTransition } from "./door.js?v=20260929v96";
import { loadLevel, updateHearts } from "./level.js?v=20260929v96";
import { BG_FILES } from "./map.js?v=20260929v96";
import { closeOverlay, openOverlay, saveGame } from "./overlays.js?v=20260929v96";
import { showHistory } from "./quiz.js?v=20260929v96";
import { showPauseScreen } from "./scene.js?v=20260929v96";
import { _certificateOpenedFrom, difficulty, getStartLives, mapProgress, pausedByTeacher, playerName, powerHaloGfx, sceneRef, score, scoreText, setDifficulty, set__certificateOpenedFrom, set__overlayPaused, set_awaitingQuiz, set_currentLevel, set_lives, set_livesLostThisLevel, set_pausedByTeacher, set_score, shadowGfx } from "./state.js?v=20260929v96";
import { adventureScore, globalStats, medalTextCert, medalTier, updatePlayTime } from "./stats.js?v=20260929v96";
import { toggleFullscreen } from "./ui.js?v=20260929v96";
import { ensureAudio, SFX, isMuted, toggleMuted } from "../audio.js?v=20260929v96";
import { renderAchievements, unlockedAchievements } from "../achievements.js?v=20260929v96";
import { LEVELS } from "../data-levels.js?v=20260929v96";
import { totalStarsEarned, levelStars } from "../stars.js?v=20260929v96";
import { ACHIEVEMENTS_DEFS } from "../data-progression.js?v=20260929v96";
import { loadNamespace, saveNamespace } from "../storage.js?v=20260929v96";

// =====================================================
// ===== CONQUISTAS =====
// =====================================================

export function openAchievementsScreen() {
  ensureAudio(); SFX.coin();
  openOverlay("achievementsOverlay", renderAchievements);
}

// =====================================================
// ===== ÁLBUM =====
// =====================================================

function openAlbumScreen() {
  ensureAudio(); SFX.coin();
  openOverlay("albumOverlay", renderAlbum);
}

// =====================================================
// ===== ESTATÍSTICAS — ecrã completo =====
// =====================================================

function renderStats() {
  const el = document.getElementById("statsContent");
  if (!el) return;
  updatePlayTime();

  const totalMinutes = Math.floor(globalStats.totalPlayTime / 60);
  const totalSeconds = globalStats.totalPlayTime % 60;
  const timeStr = totalMinutes > 0 ? `${totalMinutes}m ${totalSeconds}s` : `${totalSeconds}s`;
  const accuracy     = globalStats.quizTotal > 0 ? Math.round((globalStats.quizCorrect / globalStats.quizTotal) * 100) : 0;
  const levelsTotal  = LEVELS.length;
  const levelsComp   = mapProgress.levelsCompleted.length;
  const totalStars   = levelsTotal * 3;
  const earnedStars  = totalStarsEarned();
  const achvUnlocked = ACHIEVEMENTS_DEFS.filter(a => unlockedAchievements[a.id]).length;
  const pctLevels    = Math.round(levelsComp / levelsTotal * 100);
  const pctStars     = Math.round(earnedStars / totalStars * 100);
  const pctAchv      = Math.round(achvUnlocked / ACHIEVEMENTS_DEFS.length * 100);

  // ── Donut SVG de precisão ──────────────────────────────────────────
  function donutSVG(pct, color, bg) {
    const r = 36, cx = 44, cy = 44, stroke = 10;
    const circ = 2 * Math.PI * r;
    const dash = (pct / 100) * circ;
    return `<svg class="stats-donut-svg" width="88" height="88" viewBox="0 0 88 88">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${bg}" stroke-width="${stroke}"/>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"
          stroke-dasharray="${dash} ${circ}" stroke-dashoffset="${circ/4}"
          stroke-linecap="round" style="transition:stroke-dasharray .6s ease"/>
        <text x="${cx}" y="${cy+5}" text-anchor="middle" font-family="Baloo 2,sans-serif"
          font-size="16" font-weight="900" fill="${color}">${pct}%</text>
      </svg>`;
  }

  // ── Barras horizontais ─────────────────────────────────────────────
  function barChart(items) {
    const max = Math.max(...items.map(i => i.val), 1);
    return `<div class="stats-bar-chart">${items.map(({label, val, color}) => `
        <div class="stats-bar-row">
          <span class="stats-bar-row-label">${label}</span>
          <div class="stats-bar-row-track">
            <div class="stats-bar-row-fill" style="width:${Math.round(val/max*100)}%;background:${color}"></div>
          </div>
          <span class="stats-bar-row-val">${val}</span>
        </div>`).join("")}</div>`;
  }

  el.innerHTML = `
      <!-- ── Gráficos resumo ── -->
      <p class="stats-section-title">📊 Resumo Visual</p>
      <div class="stats-charts-row">
        <div class="stats-chart-block">
          ${donutSVG(accuracy, "#4dff91", "rgba(77,255,145,0.15)")}
          <p class="stats-chart-label">Precisão no Quiz</p>
          <p class="stats-chart-value">${globalStats.quizCorrect}✅ ${globalStats.quizWrong}❌</p>
        </div>
        <div class="stats-chart-block">
          ${donutSVG(pctStars, "#ffd700", "rgba(255,215,0,0.15)")}
          <p class="stats-chart-label">Estrelas Obtidas</p>
          <p class="stats-chart-value">${earnedStars} / ${totalStars} ⭐</p>
        </div>
        <div class="stats-chart-block">
          ${donutSVG(pctLevels, "#60c8ff", "rgba(96,200,255,0.15)")}
          <p class="stats-chart-label">Níveis Concluídos</p>
          <p class="stats-chart-value">${levelsComp} / ${levelsTotal} 🏁</p>
        </div>
        <div class="stats-chart-block">
          ${donutSVG(pctAchv, "#ff80c0", "rgba(255,128,192,0.15)")}
          <p class="stats-chart-label">Conquistas</p>
          <p class="stats-chart-value">${achvUnlocked} / ${ACHIEVEMENTS_DEFS.length} 🏆</p>
        </div>
      </div>

      <!-- ── Barras — Jogo ── -->
      <p class="stats-section-title">🎮 Jogo</p>
      ${barChart([
        { label:"👾 Inimigos",    val: globalStats.enemiesDefeated, color:"#ff6b35" },
        { label:"📖 Curiosidades",val: globalStats.curiositiesRead,  color:"#60c8ff" },
        { label:"🎮 Partidas",    val: globalStats.gamesPlayed,      color:"#ff80c0" },
        { label:"🌟 Pontos",      val: score || 0,                   color:"#ffd700" },
      ])}
      <div class="stats-grid">
        <div class="stats-item">
          <span class="stats-item-icon">⏱️</span>
          <div class="stats-item-body">
            <p class="stats-item-label">Tempo de Jogo</p>
            <p class="stats-item-value">${timeStr}</p>
          </div>
        </div>
      </div>

      <!-- ── Barras — Quiz ── -->
      <p class="stats-section-title">❓ Quiz</p>
      ${barChart([
        { label:"📋 Respondidas", val: globalStats.quizTotal,   color:"#a0a0ff" },
        { label:"✅ Certas",      val: globalStats.quizCorrect, color:"#4dff91" },
        { label:"❌ Erradas",     val: globalStats.quizWrong,   color:"#ff5555" },
      ])}
    `;

  // Pedido do Berto: o certificado só era acessível logo a seguir a
  // terminar o jogo — ver comentário completo em _certificateOpenedFrom.
  // Só faz sentido mostrar este botão depois de ter terminado o jogo pelo
  // menos uma vez (os 20 níveis), tal como o próprio certificado exige.
  const oldCertBtn = document.getElementById("btnStatsCertificate");
  if (oldCertBtn) oldCertBtn.remove();
  if (levelsComp >= levelsTotal) {
    const certBtn = document.createElement("button");
    certBtn.id = "btnStatsCertificate";
    certBtn.className = "btn";
    certBtn.style.cssText = "display:block;margin:14px auto 0;";
    certBtn.textContent = "🏅 Ver Certificado";
    certBtn.onclick = () => {
      document.getElementById("statsOverlay")?.classList.add("hidden");
      set__certificateOpenedFrom( "stats");
      showCertificate();
    };
    el.appendChild(certBtn);
  }
}

function openStatsScreen() {
  ensureAudio(); SFX.coin();
  openOverlay("statsOverlay", renderStats);
}

// =====================================================
// ===== OPÇÕES — ecrã completo =====
// =====================================================

function syncOptionsUI() {
  const btnSound = document.getElementById("optBtnSound");
  const btnHC    = document.getElementById("optBtnHC");
  const btnTouch = document.getElementById("optBtnTouch");
  const btnFS    = document.getElementById("optBtnFS");
  const btnDiff  = document.getElementById("optBtnDifficulty");
  if (btnDiff) {
    btnDiff.textContent = difficulty === "extremo" ? "🔥 Extremo" : difficulty === "dificil" ? "🎓 Difícil" : "😊 Fácil";
  }
  if (btnSound) {
    btnSound.textContent = isMuted() ? "🔇 OFF" : "🔊 ON";
    btnSound.classList.toggle("active", !isMuted());
  }
  const hcOn = document.body.classList.contains("hc-mode");
  if (btnHC) {
    btnHC.textContent = hcOn ? "⬛ ON" : "⬛ OFF";
    btnHC.classList.toggle("active", hcOn);
  }
  const forceTouch = document.body.classList.contains("force-touch");
  const hideTouch  = document.body.classList.contains("hide-touch");
  if (btnTouch) {
    if (forceTouch) btnTouch.textContent = "📱 ON (forçado)";
    else if (hideTouch) btnTouch.textContent = "📱 OFF";
    else btnTouch.textContent = "📱 AUTO";
  }
  if (btnFS) {
    const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement);
    btnFS.textContent = isFS ? "⛶ Sair" : "⛶ Entrar";
    btnFS.classList.toggle("active", isFS);
  }
}

function openOptionsScreen() {
  ensureAudio(); SFX.coin();
  openOverlay("optionsOverlay", syncOptionsUI);
}

// =====================================================
// ===== CERTIFICADO FINAL =====
// =====================================================

function showCertificate() {
  const overlay = document.getElementById("certificateOverlay");
  if (!overlay) return;

  // Pedido da Vanda: o certificado deixou de exigir ter terminado os 20 níveis — agora também
  // pode ser aberto A MEIO da aventura (novo botão "🏅 Certificado" no ☰ Menu, ver
  // window.__vb_openCertificate mais abaixo), para um aluno levar consigo o que já fez até ao
  // fim da aula, mesmo sem ter chegado ao fim. `finished` decide qual dos dois textos usar.
  // Só o caminho novo (☰ Menu, a meio de um nível) precisa de descobrir se o jogo já terminou —
  // "win" (ecrã de vitória) e "stats" (que só mostra o botão do certificado depois de terminar, ver
  // showCertificate ao contrário: o botão só aparece com levelsComp>=levelsTotal) só são alcançáveis
  // DEPOIS de terminar, por construção, e devem continuar a comportar-se exatamente como antes desta
  // funcionalidade — mesmo que, como nos saves sintéticos dos testes, mapProgress.levelsCompleted
  // nunca tenha chegado a ser preenchido (só a via oficial de jogar preenche o Mapa; o atalho
  // window.__vb_showVictory() dos testes não passa por lá).
  const levelsCompletedSoFar = mapProgress.levelsCompleted.length;
  const finished = _certificateOpenedFrom !== "menu" || levelsCompletedSoFar >= LEVELS.length;

  // Nome
  const certName = document.getElementById("certPlayerName");
  if (certName) certName.textContent = playerName || "Ciber-Herói";

  // Título, subtítulo e texto do corpo — só mudam de "Oficial" (missão concluída) para
  // "Progresso" (a meio da aventura); os restantes campos abaixo (pontos, estrelas, %, medalha,
  // data) usam sempre o mesmo cálculo, os dois casos só diferem no enquadramento do texto.
  const certTitle = document.getElementById("certTitle");
  if (certTitle) certTitle.textContent = finished ? "Certificado Oficial" : "Certificado de Progresso";
  const certSubtitle = document.getElementById("certSubtitle");
  if (certSubtitle) certSubtitle.textContent = finished
    ? "de Guardião da Cibersegurança"
    : `em Cibersegurança — ${levelsCompletedSoFar} de ${LEVELS.length} níveis`;
  const certIntro2 = document.getElementById("certIntro2");
  if (certIntro2) certIntro2.textContent = finished
    ? "que, com coragem, atenção e sabedoria, concluiu a missão das"
    : "que, com coragem, atenção e sabedoria, está a completar a missão das";
  const certHighlight = document.getElementById("certHighlight");
  if (certHighlight) certHighlight.textContent = finished
    ? "20 Competências de Cibersegurança"
    : `${levelsCompletedSoFar} de 20 Competências de Cibersegurança`;
  const certOutro = document.getElementById("certOutro");
  if (certOutro) certOutro.textContent = finished
    ? "tornando-se oficialmente Guardião da Cibersegurança."
    : "e está a caminho de se tornar Guardião da Cibersegurança.";
  // "Jogar de novo" apaga TODO o progresso (resetAllProgress, ver o próprio botão mais abaixo) —
  // faz sentido logo depois de terminar o jogo, mas seria perigoso deixá-lo à vista a meio da
  // aventura: um clique sem querer, a pensar que era só fechar o certificado, apagava tudo.
  document.getElementById("btnCertRestart")?.classList.toggle("hidden", !finished);

  // Pontuação
  // BUG CORRIGIDO: "score" só reflete a tentativa/sessão atual (ver
  // comentário em globalStats.totalScoreEarned) — somado aqui com o total
  // já acumulado de tentativas anteriores, para o certificado mostrar
  // sempre os pontos da aventura toda, tal como já acontece com Estrelas
  // e Acertos.
  const certScore = document.getElementById("certScore");
  if (certScore) certScore.textContent = adventureScore();

  // Estrelas — fonte de verdade (persistente) para tudo o resto abaixo
  const earned = totalStarsEarned();
  const totalStarsPossible = LEVELS.length * 3;
  const allThreeStarsEverywhere = earned === totalStarsPossible;

  // Percentagem
  // BUG CORRIGIDO: isto usava quizStats (contador só desta sessão do
  // browser, reposto a 0 sempre que a página é recarregada — ver
  // resetQuizStats), enquanto "Estrelas" logo abaixo já usa
  // totalStarsEarned(), que É persistente. Resultado: um jogador que
  // fechasse e reabrisse o jogo a meio da aventura podia ver, no MESMO
  // certificado, "60/60 estrelas" e ao mesmo tempo uma percentagem/medalha
  // baixa (ou 0%), porque só contava os quizzes respondidos depois do
  // último carregamento da página — incoerente. globalStats.quizTotal/
  // quizCorrect é a versão persistente do mesmo contador (soma de todas as
  // sessões), por isso é essa que deve ser usada aqui. Além disso, se
  // todos os níveis já têm 3 estrelas, o certificado garante sempre
  // 100% / Perfeito — nunca deve contradizer esse resultado.
  //
  // BUG CORRIGIDO (2ª ronda, print do Berto: "48/60 estrelas" mas na
  // mesma "100% acertos", mesmo tendo repetido uma pergunta): mesmo com a
  // correção acima, globalStats.quizTotal/quizCorrect podem ainda
  // divergir da realidade nalgum caso raro que não foi possível
  // reproduzir aqui (ex.: showQuiz() só regista no globalStats na
  // PRIMEIRA tentativa de cada nível — não deveria haver forma de um erro
  // passar ao lado, mas o print mostra que, nalgum caminho, passa). Em
  // vez de continuar a confiar cegamente nesse único contador, cruza-se
  // agora com levelStars (stars.js) — a mesma fonte, já persistente e já
  // comprovadamente correta (é dela que vem o "48/60"), que guarda por
  // nível se a pergunta da porta foi acertada à primeira (rec.firstTry).
  // Usa-se sempre o valor MAIS BAIXO dos dois — nunca mostra 100% a não
  // ser que AMBAS as fontes concordem que não houve nenhum erro.
  //
  // AJUSTE (certificado de progresso, ver `finished` acima): dividir por LEVELS.length (todos os
  // 20) só é justo quando o jogo terminou — o aluno teve mesmo oportunidade de errar em todos.
  // A meio da aventura isso penalizava sem razão: um aluno com 100% de acertos nos 3 níveis que já
  // fez via, por exemplo, "3 de 20" → 15%, não "100%". Por isso, sem terminar, a percentagem é
  // calculada sobre os níveis já feitos (levelsCompletedSoFar), não sobre os 20 — mede o
  // desempenho no que já jogou, não penaliza o que ainda não chegou a jogar. (globalStats.quizTotal/
  // quizCorrect já eram só "até agora" por natureza — nada a corrigir nesse lado.)
  const firstTryLevels = Object.keys(levelStars).filter(k => levelStars[k]?.firstTry).length;
  const pctFromStars = Math.round((firstTryLevels / (finished ? LEVELS.length : Math.max(levelsCompletedSoFar, 1))) * 100);
  const pctFromGlobalStats = globalStats.quizTotal > 0
    ? Math.round((globalStats.quizCorrect / globalStats.quizTotal) * 100)
    : 100;
  const pct = allThreeStarsEverywhere ? 100 : Math.min(pctFromStars, pctFromGlobalStats);
  const certCorrect = document.getElementById("certCorrect");
  if (certCorrect) certCorrect.textContent = `${pct}%`;

  // Medalha — "(até agora)" só no certificado de progresso, para não se ler como resultado final.
  const certMedal = document.getElementById("certMedal");
  if (certMedal) {
    certMedal.textContent = medalTextCert(medalTier(pct)) + (finished ? "" : " (até agora)");
  }

  // Estrelas
  const certStars = document.getElementById("certStars");
  if (certStars) {
    certStars.textContent = `${earned}/${totalStarsPossible}`;
  }

  // Data
  const certDate = document.getElementById("certDate");
  if (certDate) {
    const now = new Date();
    certDate.textContent = now.toLocaleDateString("pt-PT", { day:"numeric", month:"long", year:"numeric" });
  }

  overlay.classList.remove("hidden");
  ensureAudio(); SFX.finalWin();
}

// ----- ligações executadas no arranque (ordem original preservada; chamadas por dia-crianca.js) -----
export function init_screens_0() {
  window.__vb_openAchievements = openAchievementsScreen;
  document.getElementById("btnAchievements")?.addEventListener("click", openAchievementsScreen);
  document.getElementById("btnCloseAchievements")?.addEventListener("click", () => {
    closeOverlay("achievementsOverlay");
  });
  window.__vb_openAlbum = openAlbumScreen;
  document.getElementById("btnAlbum")?.addEventListener("click", openAlbumScreen);
  document.getElementById("btnCloseAlbum")?.addEventListener("click", () => {
    closeOverlay("albumOverlay");
  });
  window.__vb_openStats = openStatsScreen;
  document.getElementById("btnStats")?.addEventListener("click", openStatsScreen);
  document.getElementById("btnCloseStats")?.addEventListener("click", () => {
    closeOverlay("statsOverlay");
  });
  document.getElementById("btnResetStats")?.addEventListener("click", () => {
    if (!confirm("⚠️ Apagar todas as estatísticas, conquistas, estrelas e progresso?\nEsta ação não pode ser desfeita.")) return;
    resetAllProgress();
    renderStats();
  });
  window.__vb_openOptions = openOptionsScreen;
  document.getElementById("btnOptions")?.addEventListener("click", openOptionsScreen);
  document.getElementById("btnCloseOptions")?.addEventListener("click", () => {
    closeOverlay("optionsOverlay");
  });

  // Botões dentro de Opções
  document.getElementById("optBtnSound")?.addEventListener("click", () => {
    ensureAudio();
    const m = toggleMuted();
    btnMute.textContent = m ? "🔇 Som: OFF" : "🔊 Som: ON";
    saveGame();
    syncOptionsUI();
  });
  document.getElementById("optBtnDifficulty")?.addEventListener("click", () => {
    ensureAudio(); SFX.coin();
    // Ciclar: Fácil → Difícil → Extremo → Fácil
    const next = difficulty === "facil" ? "dificil" : difficulty === "dificil" ? "extremo" : "facil";
    setDifficulty(next);
    syncOptionsUI();
  });
  document.getElementById("optBtnHC")?.addEventListener("click", () => {
    const hcOn = document.body.classList.contains("hc-mode");
    document.body.classList.toggle("hc-mode", !hcOn);
    const s = loadNamespace("settings", {});
    s.hc = !hcOn;
    saveNamespace("settings", s);
    syncOptionsUI();
  });
  document.getElementById("optBtnTouch")?.addEventListener("click", () => {
    // Ciclar: AUTO → ON → OFF → AUTO
    const forceTouch = document.body.classList.contains("force-touch");
    const hideTouch  = document.body.classList.contains("hide-touch");
    if (!forceTouch && !hideTouch) {
      document.body.classList.add("force-touch");
    } else if (forceTouch) {
      document.body.classList.remove("force-touch");
      document.body.classList.add("hide-touch");
    } else {
      document.body.classList.remove("hide-touch");
    }
    syncOptionsUI();
  });
  document.getElementById("optBtnFS")?.addEventListener("click", () => {
    toggleFullscreen();
    setTimeout(syncOptionsUI, 300);
  });

  // ── "Guardar tudo para jogar sem rede" ──────────────────────────────────
  // Só aparece se houver service worker ativo (o mesmo que guarda o núcleo — ver sw.js).
  // Sem ele, o botão não teria onde guardar os fundos, por isso fica escondido em vez de falhar.
  (function setupOfflineDownload() {
    const section = document.getElementById("optionsOfflineSection");
    const btn = document.getElementById("optBtnDownloadAll");
    const status = document.getElementById("offlineDownloadStatus");
    if (!section || !btn || !status) return;
    if (!("serviceWorker" in navigator)) return;

    let downloading = false;
    navigator.serviceWorker.ready.then(() => { section.style.display = ""; }).catch(() => {});

    btn.addEventListener("click", () => {
      if (downloading) return;
      const reg = navigator.serviceWorker.controller;
      if (!reg) { status.textContent = "Ainda a preparar o modo offline — tenta outra vez daqui a um instante."; return; }
      downloading = true; btn.disabled = true; btn.textContent = "⏳ A guardar…";
      status.textContent = "";
      const files = [...new Set(Object.values(BG_FILES))]; // os fundos: o resto do jogo já fica em cache na 1.ª visita (ver sw.js)
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        const msg = event.data;
        if (msg.type === "CACHE_ALL_PROGRESS") {
          btn.textContent = `⏳ A guardar… ${msg.done}/${msg.total}`;
        } else if (msg.type === "CACHE_ALL_DONE") {
          downloading = false; btn.disabled = false; btn.textContent = "⬇️ Guardar tudo";
          status.textContent = msg.failed.length
            ? `Guardado, mas ${msg.failed.length} imagem(ns) falhou — repete quando tiveres melhor ligação.`
            : "✅ Tudo guardado — o jogo já funciona sem internet.";
        }
      };
      reg.postMessage({ type: "CACHE_ALL", files }, [channel.port2]);
    });
  })();

  document.getElementById("btnWinCertificate")?.addEventListener("click", () => {
    document.getElementById("winOverlay")?.classList.add("hidden");
    set__certificateOpenedFrom( "win");
    showCertificate();
  });

  // Certificado a meio da aventura (☰ Menu, a qualquer momento) — ver comentário sobre
  // `finished` no início de showCertificate(). Ao contrário de "stats"/"win" (abertos de dentro de
  // OUTRO overlay, já com o jogo em pausa), este pode ser aberto a meio de um nível em curso, por
  // isso passa por openOverlay(), que trata de pausar a física e fechar outros overlays sozinho.
  window.__vb_openCertificate = () => { set__certificateOpenedFrom("menu"); openOverlay("certificateOverlay", showCertificate); };

  // "Voltar" — fecha certificado e regressa a quem o abriu (ecrã de vitória,
  // Estatísticas ou — a meio do jogo — o próprio jogo; ver _certificateOpenedFrom).
  document.getElementById("btnCertBack")?.addEventListener("click", () => {
    if (_certificateOpenedFrom === "menu") { closeOverlay("certificateOverlay"); return; }
    document.getElementById("certificateOverlay")?.classList.add("hidden");
    if (_certificateOpenedFrom === "stats") {
      openOverlay("statsOverlay", renderStats);
    } else {
      document.getElementById("winOverlay")?.classList.remove("hidden");
    }
  });

  // "Jogar de novo" — fecha tudo e recomeça
  document.getElementById("btnCertRestart")?.addEventListener("click", () => {
    document.getElementById("certificateOverlay")?.classList.add("hidden");
    document.getElementById("confetti")?.classList.add("hidden");
    const _gameDiv = document.getElementById("game");
    if (_gameDiv) _gameDiv.style.visibility = "";
    try{sceneRef.scene.resume();}catch{}
    if (powerHaloGfx) { powerHaloGfx.clear(); powerHaloGfx.setVisible(true); }
    if (shadowGfx) shadowGfx.setVisible(true);
    // Sem isto, se o jogo tivesse ficado em pausa (professora) ou com um
    // overlay do menu/mapa aberto no momento em que a última pergunta foi
    // respondida, estas flags ficavam presas a "true" — e como nenhum
    // watchdog protege contra _overlayPaused sozinho (só awaitingQuiz/
    // awaitingStory têm um), o robot ficava travado a 0 de velocidade para
    // sempre no nível 1, dando a sensação de "recomeçar não funciona".
    set_pausedByTeacher( false); set__overlayPaused( false);
    if (btnPause) btnPause.textContent = "⏸ Pausa";
    showPauseScreen(false);
    set_lives(getStartLives()); set_score(0); set_currentLevel(0); set_livesLostThisLevel(0);
    // "Jogar de novo" é sempre um recomeço total — ver resetAllProgress()
    resetAllProgress();
    set_awaitingQuiz(true);
    scoreText?.setText("🌟 Pontos: 0"); updateHearts?.();
    document.body.classList.add("game-started");
    playLevelTransition(sceneRef, 0,
      () => { loadLevel(sceneRef, 0); saveGame(); },
      () => { showHistory(0, () => { set_awaitingQuiz(false); if(!pausedByTeacher) sceneRef?.physics.resume(); }); }
    );
  });

  document.getElementById("btnCertPrint")?.addEventListener("click", () => {
    window.print();
  });
}
