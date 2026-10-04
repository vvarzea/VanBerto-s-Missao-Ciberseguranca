/*************************************************
 * VanBerto's — Missão Cibersegurança 🛡️  ·  game/flow.js
 *
 * Fluxo do jogo: passar de nível, fim de jogo, confetis e ecrã de vitória.
 *
 * Faz parte de dia-crianca.js, dividido em módulos (ver README.md, «Estrutura do código»).
 * As variáveis de estado vivem em state.js; aqui alteram-se com set_<nome>().
 *************************************************/

import { collectedArtefacts, showArtefactGallery } from "./artefacts.js?v=20261004v102";
import { startBossFight } from "./boss-core.js?v=20261004v102";
import { bonusStars, btnCloseQuiz, quizOverlay } from "./dom.js?v=20261004v102";
import { clearDoubleJump, clearPower, clearStarPower } from "./items.js?v=20261004v102";
import { loadLevel } from "./level.js?v=20261004v102";
import { celebrateWorldComplete, enterLevelWithStory, isLastLevelOfRegion, regionForLevel, renderMap, renderWorldMap } from "./map.js?v=20261004v102";
import { closeOverlay, openOverlay, saveGame } from "./overlays.js?v=20261004v102";
import { quizStats, showHistory, wireReviewButton } from "./quiz.js?v=20261004v102";
import { openAchievementsScreen } from "./screens.js?v=20261004v102";
import { _doorWatchdogTimer, _landingCheckTimer, _reviewReturnOverlay, currentLevel, door, livesLostThisLevel, pausedByTeacher, player, playerName, powerHaloGfx, sceneRef, score, scoreText, set__doorWatchdogTimer, set__hudDirty, set__landingCheckTimer, set__reviewReturnOverlay, set__winOverlaySubOpen, set_awaitingQuiz, set_awaitingStory, set_livesLostThisLevel, set_score, shadowGfx, touch } from "./state.js?v=20261004v102";
import { adventureScore, globalStats, medalTextWin, medalTier } from "./stats.js?v=20261004v102";
import { btnWinRestart } from "./ui.js?v=20261004v102";
import { starsForLevel, totalStarsEarned, levelStars } from "../stars.js?v=20261004v102";
import { LEVELS } from "../data-levels.js?v=20261004v102";
import { BOSS_BY_LEVEL } from "../data-bosses.js?v=20261004v102";
import { ensureAudio, SFX } from "../audio.js?v=20261004v102";
import { hideDoorGlow } from "../background.js?v=20261004v102";
import { ARTEFACTS } from "../data-progression.js?v=20261004v102";

// BUG CORRIGIDO: nextLevel() não tinha nenhuma proteção contra ser chamada
// duas vezes seguidas para a MESMA conclusão de nível (ex.: o botão
// "Continuar" do ecrã de Nível Concluído a ser acionado tanto por um
// clique/toque como pelo atalho de teclado Enter praticamente ao mesmo
// tempo — btnContinue.onclick chama nextLevel() sem qualquer flag a
// impedir reentrada). Duas chamadas seguidas liam o MESMO currentLevel
// (ainda não avançado, isso só acontece dentro de loadLevel(), lá
// adiante) e agendavam duas transições independentes — a 2ª, ao disparar
// 750ms depois, podia calcular "justFinished"/o próximo nível já com o
// jogador a meio do nível seguinte (currentLevel entretanto mudado),
// reabrindo o mapa/mundo por cima do nível que a criança tinha acabado de
// começar a jogar — dava a sensação de "saltou um nível sem jogar".

let _nextLevelGuard = false;

export function nextLevel(scene){
  if (_nextLevelGuard) return;
  _nextLevelGuard = true;
  const next=currentLevel+1;
  // Cancelar timers da porta antes da transição — evita watchdog disparar no nível seguinte
  if(_doorWatchdogTimer){ try{_doorWatchdogTimer.remove(false);}catch{} set__doorWatchdogTimer(null); }
  if(_landingCheckTimer){ try{_landingCheckTimer.remove(false);}catch{} set__landingCheckTimer(null); }
  document.getElementById("artefactRevealOverlay")?.classList.remove("show");
  document.getElementById("setBonusOverlay")?.classList.remove("show");
  // Garantir robot invisível ANTES de fechar o quiz overlay
  scene.tweens.killTweensOf(player);
  player.setAlpha(0);
  player.setVelocity(0,0);
  if(door?.active) door.setAlpha(0);
  quizOverlay.classList.add("hidden"); btnCloseQuiz.classList.add("hidden");
  // Manter awaitingQuiz=true durante TODA a transição — o loadLevel trata de o resetar.
  // Se fosse false aqui, havia uma janela de ~750ms em que o jogador (invisível mas com
  // corpo físico ativo) podia ser atingido por um vilão e perder uma vida indevidamente.
  set_awaitingQuiz(true);
  scene.physics.pause();

  if(livesLostThisLevel===0){
    // BUG CORRIGIDO: este bónus dizia sempre "⭐⭐⭐ Nível Perfeito!" só por
    // não teres perdido vidas nesse nível — mas isso é só UM dos 3
    // critérios reais (ver stars.js: segredo + sem-dano + acertar à
    // primeira). Um nível sem segredo encontrado ou sem acertar o quiz à
    // primeira ficava corretamente com 2 estrelas no ecrã de fim de nível
    // (showLevelCompleteCelebration, que usa starsForLevel de verdade) mas
    // este popup à parte continuava a anunciar "3 estrelas" — dando a
    // impressão de um bug de contagem. Agora só mostra "⭐⭐⭐ Nível
    // Perfeito!" se as 3 estrelas reais tiverem sido mesmo ganhas; caso
    // contrário mostra um bónus mais honesto, só pelo "sem perder vidas".
    const realStars = starsForLevel(currentLevel);
    set_score(score + (50));
    bonusStars.textContent = (realStars === 3)
      ? "⭐⭐⭐\n+50 Nível Perfeito!"
      : "🛡️\n+50 Sem perder vidas!";
    bonusStars.classList.add("show"); setTimeout(()=>bonusStars.classList.remove("show"),2000);
  }
  set_livesLostThisLevel(0);

  setTimeout(()=>{
    // A partir daqui uma nova chamada a nextLevel() já corresponde a uma
    // conclusão de nível seguinte, genuína — pode repor a flag.
    _nextLevelGuard = false;
    set_score(score + (100)); scoreText.setText(`🌟 Pontos: ${score}`); set__hudDirty(true);

    const goToNextLevel = () => {
      const justFinished = currentLevel; // ainda não foi atualizado por loadLevel
      if (next >= LEVELS.length) {
        // Não há mais níveis a seguir a este — fim do jogo. Verifica-se
        // AQUI (depois do boss, se houver um) e não mais cedo, para um
        // boss preso ao último nível (ex.: o do Mundo 4) ter sempre
        // oportunidade de lutar antes do ecrã de vitória final aparecer.
        scene.physics.resume();
        showVictoryScreen(scene);
        return;
      }
      if (isLastLevelOfRegion(justFinished)) {
        // awaitingQuiz/awaitingStory só são libertados DEPOIS do mapa já estar
        // aberto (cobrindo tudo) — mantê-los a true durante o cartão "Mundo
        // Completo!" evita que o safety-net de alpha do update() reponha o
        // VanBerto's visível a meio do fade-in desse cartão (ver comentário
        // em spawnBossPortal/enterPortal sobre o mesmo mecanismo).
        celebrateWorldComplete(regionForLevel(justFinished), () => {
          openOverlay("mapOverlay", renderMap);
          set_awaitingQuiz( false); set_awaitingStory( false);
        });
        return;
      }
      // Entre níveis do MESMO mundo: o jogo volta sempre ao mapa ilustrado
      // desse mundo (o nível concluído aparece verde, o seguinte fica a
      // brilhar) em vez de avançar sozinho — o jogador é sempre quem toca
      // para continuar, tal como ao entrar de novo depois de "Nova Aventura".
      const nextRegion = regionForLevel(next);
      if (nextRegion && nextRegion.mapBg) {
        openOverlay("worldMapOverlay", () => renderWorldMap(nextRegion));
        set_awaitingQuiz( false); set_awaitingStory( false);
        return;
      }
      enterLevelWithStory(scene,next,
        ()=>{ loadLevel(scene,next); },
        ()=>{ showHistory(next,()=>{
          if(!pausedByTeacher) scene.physics.resume();
        }); }
      );
    };

    if (BOSS_BY_LEVEL[currentLevel]) {
      startBossFight(scene, currentLevel, goToNextLevel);
    } else {
      goToNextLevel();
    }
    saveGame();
  },750);
}

function _hideBossHUD(){ /* reservado para bosses futuros */ }

export function showGameOver(){
  try{sceneRef.physics.pause();}catch{}
  set_awaitingQuiz(true); touch.left=touch.right=touch.jump=touch.crouch=false;
  try{player.setVelocity(0,0);}catch{}
  _hideBossHUD();
  document.getElementById("artefactRevealOverlay")?.classList.remove("show");
  document.getElementById("setBonusOverlay")?.classList.remove("show");
  ensureAudio(); SFX.gameOver();
  wireReviewButton("btnReviewModeGO", quizStats.errors?.length||0, " nesta tentativa", "gameOverOverlay");
  document.getElementById("gameOverOverlay").classList.remove("hidden");
}

function startConfetti(durationMs=5000){
  const el=document.getElementById("confetti"); if(!el) return;
  el.classList.remove("hidden"); el.innerHTML="";
  const emojis=["🎈","✨","⭐","🌟","🤖","🎁","🎊","🎉","🏆","🎀","🌈","💫","🥳","🎆","🎇","🪅","🏅","🎵","🎶","❤️","🌺","📦","🛸"];
  const vw=Math.max(320,window.innerWidth||800);
  // Muito mais confetis na vitoria final
  const isMobile=window.matchMedia("(max-width:768px)").matches;
  const confettiCount=isMobile?180:400;
  for(let i=0;i<confettiCount;i++){
    const s=document.createElement("span");
    s.textContent=emojis[i%emojis.length];
    s.style.left=(Math.random()*vw)+"px";
    // Tamanhos variados para profundidade visual
    const sz=12+Math.floor(Math.random()*20);
    s.style.fontSize=sz+"px";
    s.style.animationDuration=(1.8+Math.random()*4.5)+"s";
    s.style.animationDelay=(Math.random()*3.5)+"s";
    s.style.opacity=(0.75+Math.random()*0.25).toFixed(2);
    el.appendChild(s);
  }
  setTimeout(()=>{el.classList.add("hidden");el.innerHTML="";},durationMs);
}

export function showVictoryScreen(scene){
  try{scene.physics.pause();}catch{}
  set_awaitingQuiz(true);
  touch.left=touch.right=touch.jump=touch.crouch=false;
  try{clearPower(scene);}catch{}
  try{clearStarPower(scene);}catch{}
  try{clearDoubleJump(scene);}catch{}
  if(powerHaloGfx){try{powerHaloGfx.clear();powerHaloGfx.setVisible(false);}catch{}}
  if(shadowGfx){try{shadowGfx.clear();shadowGfx.setVisible(false);}catch{}}
  hideDoorGlow();
  const _gameDiv=document.getElementById("game");
  if(_gameDiv) _gameDiv.style.visibility="hidden";
  ensureAudio(); SFX.finalWin(); startConfetti(28000);
  // Galeria de artefactos → depois ecrã de vitória
  showArtefactGallery(() => {
    // BUG CORRIGIDO: a percentagem/medalha aqui vinham de quizStats, que é
    // só desta "sessão" do browser (reinicia sempre que a página é
    // recarregada — ver resetQuizStats). Como o mapa/estrelas/conquistas
    // TODOS persistem entre sessões (é assim que o jogo permite continuar
    // outro dia), um jogador que fechasse e reabrisse o jogo a meio da
    // aventura via aqui uma percentagem a refletir só a última sessão, não
    // o percurso todo — podendo até mostrar uma medalha pior do que a
    // realidade mesmo com todos os níveis a 3 estrelas. globalStats.quizTotal/
    // quizCorrect são a versão persistente do mesmo contador (ver
    // loadGlobalStats/saveGlobalStats), por isso é essa que deve mandar
    // aqui — e é também a que o Certificado usa, para os dois ecrãs
    // nunca se contradizerem entre si.
    //
    // BUG CORRIGIDO (2ª ronda — mesma correção aplicada ao Certificado,
    // ver showCertificate(): print do Berto mostrou 48/60 estrelas mas
    // 100% de acertos, mesmo tendo repetido uma pergunta — prova de que
    // globalStats.quizTotal/quizCorrect podem divergir da realidade nalgum
    // caminho ainda não isolado. Este ecrã de Vitória usava exatamente o
    // mesmo cálculo, por isso tinha o mesmo risco — agora cruza-se também
    // aqui com levelStars (firstTry por nível), usando sempre o valor mais
    // baixo, para os dois ecrãs continuarem a nunca se contradizer.
    const _allStars = totalStarsEarned() === LEVELS.length * 3;
    const gTotal = globalStats.quizTotal, gCorrect = globalStats.quizCorrect;
    const _firstTryLevels = Object.keys(levelStars).filter(k => levelStars[k]?.firstTry).length;
    const _pctFromStars = Math.round((_firstTryLevels / LEVELS.length) * 100);
    const _pctFromGlobalStats = gTotal > 0 ? Math.round((gCorrect / gTotal) * 100) : 100;
    const pct = _allStars ? 100 : Math.min(_pctFromStars, _pctFromGlobalStats);
    const _tier=medalTier(pct);
    const medal=medalTextWin(_tier);
    const master=(_tier==="perfect")?" 🌟 Defensor Perfeito da Cibersegurança!":"";
    document.getElementById("winPlayerName").textContent=playerName||"Ciber-Herói";
    document.getElementById("winScore").textContent=adventureScore();
    // Só mostra a fração se a percentagem for a dela; se as estrelas mandarem (valor mais baixo), mostra só a percentagem — nunca «17/27 (50%)».
    document.getElementById("winPct").textContent=(gTotal>0&&pct===_pctFromGlobalStats)?`${gCorrect}/${gTotal} (${pct}%)`:`${pct}%`;
    document.getElementById("winMedal").textContent=medal+master;

    // ── Tabela de temas com erros — aparece logo se existirem ───────
    const THEME_LABELS={
      historia_internet:"Nasce a Internet",palavras_passe:"Palavras-passe Fortes",
      dados_pessoais:"Dados Pessoais",instituicoes_apoio:"Quem Nos Protege",
      virus_malware:"Vírus e Malware",jogos_seguros:"Jogar em Segurança",
      pegada_digital:"Pegada Digital",fake_news:"Fake News",
      phishing:"Phishing",dispositivos:"Dispositivos Protegidos",
      regras_familia:"Ecrã em Família",wifi_publico:"Wi-Fi Público",
      copias_seguranca:"Cópias de Segurança",acessibilidade_digital:"Acessibilidade Digital",
      spam_compras:"Spam e Compras",denuncia_conteudo:"Denunciar e Pedir Ajuda",
      identidade_digital:"Identidade Digital",privacidade:"Privacidade",
      contacto_desconhecidos:"Cuidado com Desconhecidos",direitos_digitais:"Direitos Digitais"
    };
    const winThemeErrors=document.getElementById("winThemeErrors");
    const winThemeTable=document.getElementById("winThemeTable");
    // Erros da aventura toda (registo persistente) — o mesmo âmbito de «17/27 (63%)» acima
    const advErrors=globalStats.quizErrors||[];
    const advByTheme={};
    advErrors.forEach(e=>{ advByTheme[e.theme]=(advByTheme[e.theme]||0)+1; });
    const missingErrors=Math.max(0,(globalStats.quizWrong||0)-advErrors.length);
    const hasThemeErrors=advErrors.length>0;
    if(winThemeErrors&&winThemeTable){
      if(hasThemeErrors){
        winThemeErrors.style.display="block";
        winThemeTable.innerHTML="";
        const hdr=document.createElement("tr");
        hdr.innerHTML=`<th style="text-align:left;padding:3px 6px;border-bottom:1px solid rgba(255,215,0,0.3);color:#ffd700;font-size:11px;">Tema</th><th style="text-align:center;padding:3px 6px;border-bottom:1px solid rgba(255,215,0,0.3);color:#ffd700;font-size:11px;">Erros</th>`;
        winThemeTable.appendChild(hdr);
        Object.entries(advByTheme).sort((a,b)=>b[1]-a[1]).forEach(([theme,count])=>{
          const tr=document.createElement("tr");
          const label=THEME_LABELS[theme]||theme;
          const bg=count>=3?"rgba(255,80,50,0.12)":count===2?"rgba(255,160,50,0.08)":"transparent";
          const col=count>=3?"#ff6050":count===2?"#ffaa40":"#a0ffb0";
          tr.innerHTML=`<td style="padding:5px 6px;background:${bg};border-radius:4px 0 0 4px;">${label}</td><td style="text-align:center;padding:5px 6px;background:${bg};font-weight:700;color:${col};border-radius:0 4px 4px 0;">${count}</td>`;
          winThemeTable.appendChild(tr);
        });
      } else if(missingErrors>0){
        winThemeErrors.style.display="block";
        winThemeTable.innerHTML="";
      } else {
        winThemeErrors.style.display="none";
      }
      // Erros anteriores a este registo (jogos guardados de versões antigas): diz-se com franqueza
      let _note=document.getElementById("winErrorsNote");
      if(!_note){
        _note=document.createElement("p"); _note.id="winErrorsNote";
        _note.style.cssText="font-size:11px;opacity:.75;margin:6px 0 0;text-align:center;";
        winThemeErrors.appendChild(_note);
      }
      _note.textContent=missingErrors>0?`Só há detalhe dos erros feitos a partir desta versão: faltam ${missingErrors} de ${globalStats.quizWrong}.`:"";
    }

    // ── Botão "Ver erros" — visível apenas se houver erros ──────────
    wireReviewButton("btnReviewMode", advErrors.length, "", "winOverlay", "adventure");
    const btnCloseReview=document.getElementById("btnCloseReview");
    if(btnCloseReview){
      btnCloseReview.onclick=()=>{
        document.getElementById("reviewOverlay").classList.add("hidden");
        if(_reviewReturnOverlay){
          document.getElementById(_reviewReturnOverlay)?.classList.remove("hidden");
          set__reviewReturnOverlay(null);
        } else {
          closeOverlay("reviewOverlay");
        }
      };
    }
    // Grelha dos direitos conquistados
    const _rg=document.getElementById("winRightsGrid");
    if(_rg){
      _rg.innerHTML="";
      ARTEFACTS.forEach((art,i)=>{
        const done=!!collectedArtefacts[i];
        const div=document.createElement("div");
        div.className="win-right-card"+(done?" win-right-done":" win-right-locked");
        div.innerHTML=done
          ?`<span class="wrc-emoji">${art.emoji}</span><span class="wrc-name">${art.short}</span>`
          :`<span class="wrc-emoji">🔒</span><span class="wrc-name">???</span>`;
        div.title=done?art.name:"Direito por descobrir";
        _rg.appendChild(div);
      });
    }
    // Abrir sempre no separador Relatório
    document.querySelectorAll(".win-tab").forEach((t,i)=>t.classList.toggle("active",i===0));
    document.querySelectorAll(".win-panel").forEach((p,i)=>p.classList.toggle("active",i===0));
    // Ligar os separadores (Relatório / Direitos) aos respetivos painéis
    document.querySelectorAll(".win-tab").forEach(tabBtn=>{
      tabBtn.onclick=()=>{
        const targetId=tabBtn.dataset.panel;
        document.querySelectorAll(".win-tab").forEach(t=>t.classList.toggle("active",t===tabBtn));
        document.querySelectorAll(".win-panel").forEach(p=>p.classList.toggle("active",p.id===targetId));
      };
    });
    // ── Botões extra: Mapa e Conquistas (aditivo, reaproveita ecrãs já existentes) ──
    // Escondem o winOverlay ao abrir (ver _winOverlaySubOpen); closeOverlay() volta a
    // mostrá-lo automaticamente assim que o Mapa/Conquistas é fechado.
    if(typeof btnWinRestart !== "undefined" && btnWinRestart && !document.getElementById("btnWinMap")){
      const extraWrap=document.createElement("div");
      extraWrap.style.cssText="display:flex;gap:8px;justify-content:center;margin-top:8px;flex-wrap:wrap;";
      const mk=(id,label,fn)=>{
        const b=document.createElement("button");
        b.id=id; b.className="btn"; b.textContent=label;
        b.onclick=fn;
        return b;
      };
      extraWrap.appendChild(mk("btnWinMap","🗺️ Mapa",()=>{
        // Esconder o winOverlay antes de abrir o mapa — caso contrário o mapa abre
        // por trás dele (mesmo z-index, mas o winOverlay vem depois no HTML) e fica
        // invisível. closeOverlay("mapOverlay") repõe o winOverlay automaticamente.
        document.getElementById("winOverlay")?.classList.add("hidden");
        set__winOverlaySubOpen( true);
        openOverlay("mapOverlay",renderMap);
      }));
      extraWrap.appendChild(mk("btnWinAchievements","🏆 Conquistas",()=>{
        document.getElementById("winOverlay")?.classList.add("hidden");
        set__winOverlaySubOpen( true);
        openAchievementsScreen();
      }));
      btnWinRestart.parentElement.appendChild(extraWrap);
    }
    document.getElementById("winOverlay").classList.remove("hidden");
  }); // fim showArtefactGallery
}
