/*************************************************
 * VanBerto's — Missão Cibersegurança 🛡️  ·  game/feedback.js
 *
 * Elogios, números flutuantes, hit-stop e mensagens dinâmicas de feedback.
 *
 * Faz parte de dia-crianca.js, dividido em módulos (ver README.md, «Estrutura do código»).
 * As variáveis de estado vivem em state.js; aqui alteram-se com set_<nome>().
 *************************************************/

import { PRAISE } from "../data-flavor.js?v=20261003v100";

// ===== Elogios =====

export function pickPraise() { return PRAISE[Math.floor(Math.random() * PRAISE.length)]; }

// Reportado (screenshot): apanhar vários itens/segredos quase ao mesmo
// tempo (ex: ao correr por um grupo denso de colecionáveis) fazia todos
// os textos flutuantes ("Drone +15", "Pacote +10", "Escudo! PROTEGIDO",
// "+50", "Fantástico!"...) nascerem exatamente na mesma posição, uns
// por cima dos outros — ilegível, e parecia "erro" mesmo sem nenhuma
// exceção. _floatBurst guarda os instantes recentes de showFloat() para
// desviar verticalmente cada novo texto de um "rebentamento" (janela de
// 500ms), em vez de os empilhar todos no mesmo sítio.

let _floatBurst = [];

export function showFloat(scene, x, y, msg, color="#ff6b35") {
  const now = scene.time.now;
  _floatBurst = _floatBurst.filter(ts => now - ts < 500);
  const offsetY = Math.min(_floatBurst.length, 5) * 26;
  _floatBurst.push(now);
  const startY = y - offsetY;
  const t = scene.add.text(x, startY, msg, { fontSize:"24px", fontStyle:"900", color, stroke:"#fff8e0", strokeThickness:5 }).setOrigin(0.5).setDepth(999);
  scene.tweens.add({ targets:t, y:startY-44, alpha:0, duration:640, ease:"Sine.easeOut", onComplete:()=>t.destroy() });
}

// "Hit-stop": congela a física e os tweens por instantes (efeito clássico
// de plataformas para dar peso a um golpe). Chamado logo a seguir a
// configurar o knockback/rotação de um toque — como a velocidade e os
// tweens já foram todos definidos antes de pausar, ficam visualmente
// "presos" na pose do impacto por ms milissegundos, e só depois
// continuam a animar normalmente. Sem isto, o toque, o tremor de câmara,
// o flash e o texto flutuante aconteciam todos ao mesmo tempo e depressa
// demais para uma criança perceber claramente que perdeu uma vida.
// _hitStopDepth (novo) — corrige um caso real quando 2 toques acontecem
// em rápida sucessão (plausível num grupo denso de vilões, como no
// screenshot reportado): antes, o resume() do 1º toque disparava a meio
// da janela de "congelar" do 2º toque (pausas/resumes não sabiam uns dos
// outros), destravando física/tweens demasiado cedo e sobrepondo a
// sensação de impacto dos dois toques. Agora só o ÚLTIMO resume pendente
// (_hitStopDepth chega a 0) volta mesmo a destravar tudo.

let _hitStopDepth = 0;

export function applyHitStop(scene, ms = 80) {
  if (!scene || !scene.physics || !scene.physics.world) return;
  _hitStopDepth++;
  scene.physics.world.pause();
  scene.tweens.pauseAll();
  scene.time.delayedCall(ms, () => {
    _hitStopDepth = Math.max(0, _hitStopDepth - 1);
    if (_hitStopDepth > 0) return; // outro hit-stop mais recente ainda a decorrer
    if (!scene || !scene.physics || !scene.physics.world) return;
    scene.physics.world.resume();
    scene.tweens.resumeAll();
  });
}

// =====================================================
// ===== MENSAGENS DINÂMICAS (feedback contextual) =====
// =====================================================


export function showDynamicMsg(msgs, duration = 2400) {
  // Não mostrar no alto contraste (distração)
  if (document.body.classList.contains("hc-mode")) return;
  const overlay = document.getElementById("dynamicMsgOverlay");
  const textEl  = document.getElementById("dynamicMsgText");
  if (!overlay || !textEl) return;
  textEl.textContent = msgs[Math.floor(Math.random() * msgs.length)];
  overlay.classList.add("show");
  setTimeout(() => overlay.classList.remove("show"), duration);
}
