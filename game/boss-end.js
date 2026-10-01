/*************************************************
 * VanBerto's — Missão Cibersegurança 🛡️  ·  game/boss-end.js
 *
 * Bosses (4/4): festa de vitória, quiz do boss, portal do boss e retoma do nível.
 *
 * Faz parte de dia-crianca.js, dividido em módulos (ver README.md, «Estrutura do código»).
 * As variáveis de estado vivem em state.js; aqui alteram-se com set_<nome>().
 *************************************************/

import { collectedBossRights, saveBossRights } from "./artefacts.js?v=20261001v98";
import { clearMiniViruses, clearPopupHazard, clearToxicZones, stopPhishingDecoy } from "./boss-attacks.js?v=20261001v98";
import { destroyBossHpBar, showBossBanner } from "./boss-core.js?v=20261001v98";
import { bossDialogueAnchor, playBossDialogue, vbDialogueAnchor } from "./dialogue.js?v=20261001v98";
import { clearExtremoAllies } from "./level.js?v=20261001v98";
import { pickQuizForLevel, showQuiz } from "./quiz.js?v=20261001v98";
import { bossLockIcon, bossOverlay, bossRageIcon, bossState, bossVignette, currentLevel, hudText, itemCountText, player, sceneRef, set__doorAnimRunning, set_awaitingQuiz, set_bossLockIcon, set_bossOverlay, set_bossRageIcon, set_bossState, set_bossVignette, set_inBossFight, tipText } from "./state.js?v=20261001v98";
import { playVanBertoDance } from "./vanberto.js?v=20261001v98";
import { ensureAudio, SFX, beep } from "../audio.js?v=20261001v98";
import { showAchievementToast } from "../achievements.js?v=20261001v98";
import { BOSS_VICTORY_VB } from "../data-story.js?v=20261001v98";

// ===== Flourish de vitória próprio de cada boss — Fase "Batalhas Épicas" =====
// Substitui/complementa o confetti genérico por algo ligado ao tema do boss
// vencido. Zero assets novos: só emoji + tweens, reaproveitando o padrão já
// usado em showFloat/showBossBanner. Só o Monstro tem flourish próprio por
// agora — os outros 3 bosses continuam só com o confetti genérico até
// chegarmos à vez deles.

function playBossVictoryFlourish(scene, def) {
  if (def.id === "monstro_ignorancia") {
    // "A luz do conhecimento": clarão quente + livros a subir e a dissipar-se,
    // como a névoa da ignorância a desfazer-se.
    scene.cameras.main.flash(420, 255, 246, 214);
    const cx = scene.cameras.main.worldView.centerX;
    for (let i = 0; i < 6; i++) {
      scene.time.delayedCall(i * 90, () => {
        if (!scene || !scene.add) return;
        const bx = cx - 150 + Math.random() * 300;
        const t = scene.add.text(bx, 420, "📚", { fontSize: "30px" }).setOrigin(0.5).setDepth(30).setAlpha(0);
        scene.tweens.add({ targets: t, y: 180, alpha: { from: 0, to: 1 }, duration: 900, ease: "Sine.easeOut" });
        scene.tweens.add({ targets: t, alpha: 0, duration: 300, delay: 700, onComplete: () => { try { t.destroy(); } catch {} } });
      });
    }
  }
}

export function startBossQuizPhase() {
  bossState.phase = "quiz";
  if(bossState.sprite) bossState.sprite.destroy();
  // Pedido da Vanda: confirmar que nenhuma pergunta se repete. O quiz do boss usa o MESMO tema do
  // último nível desse mundo (ex.: boss após o nível 4 → tema "virus_malware", igual ao nível 4) —
  // antes, esta 1.ª pergunta do boss era escolhida ao acaso diretamente do banco (pool[random]),
  // SEM olhar para as perguntas já usadas nesse tema, por isso podia calhar a MESMA pergunta que o
  // aluno acabou de ver à porta do nível anterior. pickQuizForLevel() é a função usada em todo o
  // resto do jogo para isto (incluindo nas tentativas seguintes DESTE MESMO quiz do boss, se a
  // resposta for errada — showQuiz() já a chama de novo em quiz.js) — passa a ser usada também aqui,
  // na 1.ª pergunta, para ficar consistente com o resto e nunca repetir.
  const quiz = pickQuizForLevel(currentLevel, bossState.def.quizTheme);
  set_awaitingQuiz( true);
  sceneRef.physics.pause();
  player.setAlpha(0);
  tipText.setText("❓ Responde para derrotar o boss de vez!");
  // showQuiz() já trata de tentativas repetidas até acertar — só precisamos do done(true)
  showQuiz(quiz, () => {
    const def = bossState.def;
    const finished = bossState.onComplete;
    // Combate Perfeito (novo): capturado ANTES de bossState ser posto a
    // null mais abaixo — usado depois de "Direito Recuperado" para saber
    // se este combate específico decorreu sem perder nenhuma vida.
    const flawless = !bossState.tookDamage;
    ensureAudio(); SFX.win();
    player.setAlpha(1);
    // Pequena "pose de vitória" — dois saltinhos rápidos do VanBerto's, para
    // o jogador sentir que o herói também está a celebrar, não só o ecrã.
    sceneRef.tweens.add({ targets: player, y: player.y - 24, duration: 170, yoyo: true, repeat: 1, ease: "Sine.easeOut" });
    if(bossOverlay){ try{bossOverlay.destroy();}catch{} set_bossOverlay(null); }
    if(bossLockIcon){ try{bossLockIcon.destroy();}catch{} set_bossLockIcon(null); }
    if(bossRageIcon){ try{bossRageIcon.destroy();}catch{} set_bossRageIcon(null); }
    if(bossVignette){ try{bossVignette.destroy();}catch{} set_bossVignette(null); }
    clearToxicZones(); clearMiniViruses();
    clearPopupHazard();
    stopPhishingDecoy();
    clearExtremoAllies();
    destroyBossHpBar();
    set_inBossFight( false); set_bossState( null);
    // NOTA: bossArenaDecor (livros flutuantes) fica de propósito durante a
    // celebração/confetti — sai já a seguir, em loadLevel() do próximo nível
    // (ou defensivamente lá, caso o fluxo mude no futuro).
    // Limpar o HUD do combate ANTES da cinemática — sem isto ficavam valores
    // congelados (ex.: "Itens: 5/5", a dica do quiz) visíveis por trás do diálogo.
    hudText.setText("🏆 Vitória!");
    itemCountText.setText("");
    tipText.setText("");
    // Momento de celebração — flash dourado + confetti no ecrã, logo após o
    // boss ser derrotado e antes do diálogo de despedida. Sem isto, vencer um
    // boss não tinha nenhum "clímax" visual, ao contrário do ecrã de vitória
    // final do jogo (que já tem confetti).
    sceneRef.cameras.main.flash(280, 255, 215, 60);
    playBossVictoryFlourish(sceneRef, def);
    const bossConfetti = sceneRef.add.particles(0, 0, "spark_item", {
      x: player.x, y: player.y - 40,
      speed: { min: 90, max: 260 }, lifespan: 900, quantity: 30,
      scale: { start: 1.1, end: 0 }, gravityY: 160,
      angle: { min: 0, max: 360 },
      tint: [0xffd700, 0xff6b35, 0x80d0ff, 0xffffff, 0x60ff80]
    });
    sceneRef.time.delayedCall(750, () => { try{bossConfetti.destroy();}catch{} });
    // Segunda onda de confetti, um pouco depois e com a cor do próprio boss
    // misturada — dá a sensação de uma celebração maior em vez de um único
    // burst instantâneo, sem exigir arte nova nenhuma.
    sceneRef.time.delayedCall(400, () => {
      const bossConfetti2 = sceneRef.add.particles(0, 0, "spark_item", {
        x: player.x, y: player.y - 30,
        speed: { min: 70, max: 220 }, lifespan: 1000, quantity: 26,
        scale: { start: 1, end: 0 }, gravityY: 140,
        angle: { min: 0, max: 360 },
        tint: [def.color, 0xffd700, 0xff80c0, 0x80ffea, 0xffffff]
      });
      sceneRef.time.delayedCall(900, () => { try{bossConfetti2.destroy();}catch{} });
    });
    // Pequeno acorde final a fechar a vitória — mais festivo do que o SFX.win()
    // sozinho, sem chegar ao exagero do fanfarrão do fim de jogo (finalWin()).
    setTimeout(() => {
      [880,1108,1318].forEach((f,i) => setTimeout(() =>
        beep({ freq:f, dur:0.22, type:"triangle", vol:0.05, slideTo:f*1.05 }), i*45));
    }, 300);
    // Cartão "✅ VITÓRIA!" a deslizar do topo — o mesmo tipo de flourish do
    // cartão de chegada do boss, para fechar a cena com o mesmo impacto com
    // que começou (antes só havia confetti, sem nenhum destaque de texto).
    showBossBanner(sceneRef, "✅ VITÓRIA!", "#8fffb0");
    // Toast "Direito Recuperado!" — nomeia concretamente o direito que este boss
    // guardava (em vez de só confetti genérico), reaproveitando o visual das
    // conquistas (achv-toast) que já existe e já é usado neste jogo.
    if (def.rightRecovered) {
      showAchievementToast({ tier: def.rightRecovered.emoji, name: def.rightRecovered.name }, "🎉 Direito Recuperado!");
      // Álbum dos Direitos dos Bosses (novo, pedido: os 4 "Direitos
      // Recuperados" apareciam e desapareciam num toast, sem nenhum sítio
      // onde a criança os visse todos juntos no fim). Regista este boss
      // como vencido — mostrado na Galeria de Competências, a seguir aos
      // 20 artefactos normais (ver showArtefactGallery).
      collectedBossRights[def.id] = { flawless };
      saveBossRights();
    }
    // Combate Perfeito (novo, pedido: "não há recompensa nenhuma por jogar
    // bem um boss") — um 2º toast, um pouco depois do primeiro para não
    // amontoar tudo no mesmo instante (banner+confetti+acorde+toast já
    // acontecem todos ali). Só visual (reaproveita o mesmo achv-toast já
    // usado no jogo) — não mexe no sistema de conquistas nem no HUD.
    if (flawless) {
      sceneRef.time.delayedCall(1200, () => {
        showAchievementToast({ tier: "🏆", name: "Nenhuma vida perdida neste combate!" }, "✨ Combate Perfeito!");
      });
    }
    // awaitingQuiz continua true durante a cinemática de vitória — só liberta
    // o jogador quando o portal for criado, a seguir ao diálogo.
    // NOVO — mesma rede de segurança da cinemática de entrada (ver
    // comentário completo em startBossFight): sem o try/catch, um erro
    // aqui travava o jogo com o combate já vencido mas o portal por criar,
    // ficando o jogador presa na arena para sempre.
    const startBossPortalPhase = () => {
      set_awaitingQuiz( false);
      scene_resumeAfterBoss();
      tipText.setText("🌀 Caminha até ao portal para continuares a aventura!");
      spawnBossPortal(sceneRef, finished, def);
    };
    try {
      playBossDialogue([
        { speaker:"boss", name:def.name, emoji:def.emoji, text: def.defeatLine, anchor: bossDialogueAnchor() },
        { speaker:"vb", text: BOSS_VICTORY_VB[def.id] || "Conseguimos! Mais um direito está a salvo!", anchor: vbDialogueAnchor() }
      ], startBossPortalPhase);
    } catch (err) {
      console.error("Cinemática de vitória do boss falhou — a criar o portal de qualquer forma:", err);
      startBossPortalPhase();
    }
  });
}

// Portal que aparece na arena depois de um boss derrotado — o jogador tem de
// caminhar até ele para avançar, em vez de seguir automaticamente para o
// próximo nível. Reaproveita a mesma coreografia em fases da porta normal
// (startDoorAnimation): aviso a pulsar → giro/crescimento com antecipação →
// burst de partículas → jogador é puxado e desaparece no vórtice.
// Centrado na arena (tal como o portal fica sempre bem visível a meio de um
// nível normal) e SEM tinta — usa o mesmo "door_party" com o mesmo aspeto
// exato da porta normal, para não parecer um objeto diferente. "color" só é
// usado agora no brilho das partículas à volta, para manter alguma
// identidade do boss sem alterar o próprio portal.

function spawnBossPortal(scene, onEnter, def) {
  const color = (def && def.color != null) ? def.color : 0x9060ff;
  // Antes: px/py fixos em (800,380) — só calhavam bem nas arenas "grandes"
  // (1600px) dos 3 bosses originais, porque 800 é exatamente o centro
  // dessas arenas. Na arena "do tamanho da janela" do Monstro da Ignorância
  // (960px), 800 fica perto do bordo direito, sem garantia de chão por
  // baixo — o portal podia ficar difícil ou impossível de alcançar.
  // Agora: centrado na LARGURA REAL da arena de cada boss (worldW/2) e
  // encostado ao chão principal dessa mesma arena (a plataforma mais larga
  // em def.arena.platforms), em vez de flutuar a meio-ar — garante que dá
  // sempre para lá chegar a pé, seja qual for o tamanho/layout da arena.
  const worldW = (def && def.arena && def.arena.worldW) || 1600;
  const plats = def && def.arena && def.arena.platforms;
  let floorTopY = 485; // por omissão: chão a y=500 (topo em 485), igual ao usado por todos os bosses
  if (plats && plats.length) {
    let floor = plats[0];
    for (const p of plats) if (p[2] > floor[2]) floor = p; // mais larga = chão principal
    floorTopY = floor[1] - floor[3] / 2;
  }
  const px = (def && def.arena && def.arena.portalX != null) ? def.arena.portalX : Math.round(worldW / 2);
  const py = floorTopY - 56; // ~metade da altura do portal (104px) — encostado ao chão, não a flutuar
  const portal = scene.physics.add.staticSprite(px, py, "door_party").setDisplaySize(88,104);
  portal.clearTint();
  portal.refreshBody();
  scene.tweens.add({ targets:portal, scaleX:{from:1,to:1.1}, scaleY:{from:1,to:1.1}, duration:700, yoyo:true, repeat:-1, ease:"Sine.easeInOut" });
  const ring = scene.add.particles(0,0,"spark_item",{
    x:px, y:py, speed:{min:20,max:60}, lifespan:900, quantity:1, frequency:120,
    scale:{start:0.7,end:0}, tint:[color,0xffd700,0xffffff]
  });
  const lbl = scene.add.text(px, py-88, "🌀 Portal!", { fontSize:"16px", fontStyle:"900", color:"#e0c8ff", stroke:"#200040", strokeThickness:5 }).setOrigin(0.5).setDepth(20);
  scene.tweens.add({ targets:lbl, y:py-98, duration:900, yoyo:true, repeat:-1, ease:"Sine.easeInOut" });

  let triggered = false;
  let ov = null;
  let portalWatchdog = null;
  // enterPortal() é chamado tanto pelo overlap físico como pelo watchdog de
  // proximidade abaixo — só um dos dois dispara realmente (o "triggered"
  // protege contra disparo duplo), mas ter as duas vias garante que o
  // VanBerto's entra sempre no portal.
  //
  // PORQUÊ um watchdog de proximidade e não só o overlap: este portal é
  // criado a meio de uma transição cheia de física pausada/retomada
  // (pause() no quiz, resume() já dentro do diálogo de vitória — ver
  // startBossQuizPhase acima) e de tweens que mexem em player.x/y
  // diretamente (a "pose de vitória"). Se o overlap for registado num
  // instante em que a física ainda não deu um passo completo, ou se o
  // jogador "teletransportar" para dentro da zona do portal num único
  // frame (câmara a assentar, tween a terminar), o Arcade Physics pode
  // nunca chegar a reportar esse overlap — o VanBerto's fica visualmente
  // dentro/à frente do portal para sempre, sem nada o disparar. A porta
  // normal (tryOpenDoor) já usa exatamente este tipo de rede de segurança
  // por polling (_landingCheckTimer) por este mesmo motivo.
  const enterPortal = () => {
    if (triggered) return;
    triggered = true;
    if (portalWatchdog) { try{ portalWatchdog.remove(false); }catch{} portalWatchdog = null; }
    try{ scene.physics.world.removeCollider(ov); }catch{}
    try{ ring.stop(); }catch{}
    scene.tweens.killTweensOf(lbl);
    scene.tweens.add({ targets:lbl, alpha:0, duration:200, onComplete:()=>lbl.destroy() });
    ensureAudio(); SFX.doorOpen();
    scene.physics.pause();
    // Este portal (fim de boss) tinha a sua própria variável local "triggered"
    // como única proteção, sem nunca marcar _doorAnimRunning — o watchdog de
    // visibilitychange (ver mais abaixo no ficheiro) não tinha como saber que
    // esta animação estava a decorrer, e podia retomar a física a meio da
    // sequência (ou, pior, deixar tudo preso) se o jogador mudasse de separador
    // exatamente ao tocar no portal. Marcar _doorAnimRunning aqui também dá a
    // este portal a mesma proteção que a porta normal já tinha.
    set__doorAnimRunning( true);

    // FASE 1 — aviso: o portal pulsa depressa antes de "acordar"
    scene.tweens.killTweensOf(portal);
    scene.tweens.add({
      targets: portal,
      scaleX: { from: portal.scaleX, to: portal.scaleX * 1.18 },
      scaleY: { from: portal.scaleY, to: portal.scaleY * 1.18 },
      duration: 110, yoyo: true, repeat: 2,
      ease: "Sine.easeInOut",
      onComplete: () => {
        portal.setScale(1);

        // Burst de partículas na ativação (mesma sensação da porta normal)
        const burst = scene.add.particles(0, 0, "spark_item", {
          x: px, y: py - 10,
          speed: { min: 60, max: 200 }, lifespan: 500, quantity: 22,
          scale: { start: 1.1, end: 0 }, gravityY: 60,
          angle: { min: 0, max: 360 },
          tint: [color, 0xffd700, 0xffffff, 0x80d0ff]
        });
        scene.time.delayedCall(420, () => { try{burst.destroy();}catch{} });

        // Ponto único de conclusão desta sequência — garante que onEnter()
        // é chamado exatamente uma vez, mesmo que o portal ou o jogador
        // deixem de existir a meio (ex.: "targets is null" ao construir um
        // tween sobre um objeto já destruído). BUG CORRIGIDO ("trava no
        // boss 3"): antes, se `portal` (ou `player`) fosse inválido no
        // momento em que a FASE 2/3 era construída, o tween atirava um
        // erro que escapava sem ser apanhado (a chamada final a
        // onComplete?.() dentro de playVanBertoDance não tinha try/catch),
        // e como isso acontecia a meio da cadeia, onEnter() nunca chegava
        // a ser chamado — o jogo ficava preso para sempre depois do boss.
        let _portalSeqDone = false;
        const finishPortalSequence = () => {
          if (_portalSeqDone) return;
          _portalSeqDone = true;
          try { if (scene && scene.tweens) scene.tweens.killTweensOf(player); } catch(e) {}
          try { if (player) { player.setAlpha(0); player.setAngle(0); player.setScale(1); } } catch(e) {}
          try{ ring.destroy(); }catch{}
          try{ portal.destroy(); }catch{}
          set__doorAnimRunning( false); // reset — sequência do portal genuinamente terminada
          // Repor awaitingQuiz=true (tinha sido desligado de propósito, mais acima,
          // só para o jogador poder caminhar até ao portal) — sem isto, o VanBerto's
          // ficava sem NENHUMA proteção contra o "safety-net" de alpha do update()
          // durante o fade-in do ecrã seguinte (cartão de fim de mundo ou transição
          // de nível), reaparecendo por instantes antes desse ecrã cobrir tudo.
          // goToNextLevel()/loadLevel() tratam de repor awaitingQuiz=false quando o
          // ecrã seguinte já estiver mesmo pronto — tal como já acontece na porta normal.
          set_awaitingQuiz( true);
          onEnter();
        };

        // FASE 1.5 — o VanBerto's faz a dança do robô antes de ser sugado
        playVanBertoDance(scene, () => {
          try {
            if (!portal || !portal.active) { finishPortalSequence(); return; }

            // FASE 2 — o portal gira e cresce (efeito de antecipação), só depois é que "suga"
            scene.tweens.add({
              targets: portal,
              angle: { from: 0, to: 360 },
              scaleX: { from: 1, to: 1.3 },
              scaleY: { from: 1, to: 1.3 },
              duration: 380, ease: "Back.easeIn",
              onComplete: () => {
                try {
                  if (!player || !player.active || !portal) { finishPortalSequence(); return; }

                  // FASE 3 — jogador é puxado para o centro do portal e desaparece no vórtice
                  scene.tweens.add({
                    targets: player, x: portal.x, y: portal.y - 10,
                    scaleX: 0.05, scaleY: 0.05, angle: 720, alpha: 0,
                    duration: 380, ease: "Sine.easeIn",
                    onComplete: finishPortalSequence
                  });
                } catch (e) { console.error("Fase 3 do portal (pós-boss) falhou — a continuar de qualquer forma:", e); finishPortalSequence(); }
              }
            });
          } catch (e) { console.error("Fase 2 do portal (pós-boss) falhou — a continuar de qualquer forma:", e); finishPortalSequence(); }
        }); // fim playVanBertoDance (FASE 1.5)
      }
    });
  };

  ov = scene.physics.add.overlap(player, portal, enterPortal, null, scene);

  // Rede de segurança por proximidade (mesmo raciocínio do _landingCheckTimer
  // já usado na porta normal, ver tryOpenDoor acima) — confirma a cada 100ms
  // se o VanBerto's já está mesmo junto ao portal e força a entrada mesmo
  // que o overlap físico nunca chegue a disparar sozinho.
  portalWatchdog = scene.time.addEvent({
    delay: 100, loop: true,
    callback: () => {
      if (triggered || !player.active) return;
      if (Math.abs(player.x - px) < 50 && Math.abs(player.y - py) < 70) enterPortal();
    }
  });
}

function scene_resumeAfterBoss() {
  if (sceneRef) sceneRef.physics.resume();
}
