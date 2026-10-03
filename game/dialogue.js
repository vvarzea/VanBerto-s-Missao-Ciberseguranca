/*************************************************
 * VanBerto's — Missão Cibersegurança 🛡️  ·  game/dialogue.js
 *
 * Balões de fala do VanBerto's e diálogos dos bosses (vbSay, playBossDialogue) e a posição deles no ecrã.
 *
 * Faz parte de dia-crianca.js, dividido em módulos (ver README.md, «Estrutura do código»).
 * As variáveis de estado vivem em state.js; aqui alteram-se com set_<nome>().
 *************************************************/

import { _vbTimer, bossState, player, sceneRef, set__vbTimer } from "./state.js?v=20261003v100";
import { playCinematic } from "../cinematics.js?v=20261003v100";

export function vbSay(text,type="intro",duration=3400){
  if(document.body.classList.contains("hc-mode"))return;
  const el=document.getElementById("vbSpeech"),textEl=document.getElementById("vbSpeechText");
  if(!el||!textEl)return;
  if(_vbTimer){clearTimeout(_vbTimer);set__vbTimer(null);}
  textEl.textContent=text;el.className="vb-"+type;void el.offsetWidth;
  el.classList.add("vb-show");
  set__vbTimer(setTimeout(()=>{el.classList.remove("vb-show");set__vbTimer(null);},duration));
}

export function vbSayRandom(arr,type,duration){vbSay(arr[Math.floor(Math.random()*arr.length)],type,duration);}

// Diálogo de boss (entrada/derrota) — usa a caixa de diálogo de cinematics.js
// (retrato + nome + texto, avança ao toque) SEM as barras pretas, para não
// tapar a arena. Antes disto usava o balão vbSay (canto inferior direito,
// pensado para dicas rápidas) — ficava pequeno, avançava sozinho por tempo
// e longe da ação; agora fica centrado, legível, e o jogador controla o ritmo.

export function playBossDialogue(slides, onComplete) {
  playCinematic(slides, onComplete, false);
}

// Meia-largura REAL da caixa flutuante #cineDialog (dia-crianca.css), usada
// por bossDialogueAnchor/vbDialogueAnchor para não a deixar sair do ecrã.
// CORRIGIDO: esta conta vivia duplicada nas duas funções e não batia certo
// com o CSS — assumia sempre "width:92vw", mas o CSS tem uma media query
// (max-width:600px, ou seja, QUALQUER telemóvel) que muda a largura para
// "96vw". Em conjunto com a falta de box-sizing:border-box no CSS (ver
// dia-crianca.css, #cineDialog — corrigido também), a caixa acabava mais
// larga do que esta conta previa, saindo parcialmente do ecrã em qualquer
// telemóvel — incluindo, por vezes, o próprio botão "⏭ Saltar" lá dentro,
// sem nada tocável nessa parte cortada. Sem conseguir tocar na caixa nem
// no "Saltar", o jogo só desbloqueava sozinho ao fim do temporizador de 9s
// por fala (ver armAutoAdvance em cinematics.js) — dava exatamente a
// sensação de "bloqueia ao começar o boss" reportada. Agora que o CSS usa
// border-box, "width" já é a largura total real — só falta espelhar aqui
// a mesma media query. Qualquer alteração ao "width"/breakpoint no CSS de
// #cineDialog tem de vir acompanhada da mesma alteração aqui.

function dialogHalfWidth() {
  const isNarrow = window.innerWidth <= 600;
  const cssWidth = isNarrow ? window.innerWidth * 0.96 : Math.min(640, window.innerWidth * 0.92);
  return cssWidth / 2;
}

// Calcula, em pixels CSS de ecrã, o ponto por cima da cabeça do boss —
// usado para o balão de fala dele flutuar ali em vez de ficar fixo no
// fundo do ecrã (ver s.anchor em cinematics.js). Devolve null se não
// houver boss vivo no momento (ex.: diálogo de vitória, já destruído em
// startBossQuizPhase) — nesse caso a fala cai de volta na caixa normal.

export function bossDialogueAnchor() {
  if (!bossState || !bossState.sprite || !bossState.sprite.active) return null;
  const b = bossState.sprite, def = bossState.def;
  const cam = sceneRef.cameras.main;
  const canvas = sceneRef.game.canvas;
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const scaleX = rect.width / 960, scaleY = rect.height / 540;
  // Mesma referência da barra de vida (hpBarOffset) + folga extra para o
  // balão não colar à barra de vida.
  const aboveHead = (def.hpBarOffset != null ? def.hpBarOffset : ((b.displayHeight/2||40)+42)) + 46;
  let x = rect.left + (b.x - cam.scrollX) * scaleX;
  let y = rect.top + (b.y - aboveHead - cam.scrollY) * scaleY;
  // Não deixar o balão sair do ecrã pelas laterais. A margem tem de
  // acompanhar a largura REAL da caixa — ver dialogHalfWidth() acima.
  const halfDialogW = dialogHalfWidth() + 12;
  x = Math.max(rect.left+halfDialogW, Math.min(rect.right-halfDialogW, x));
  // CORREÇÃO: faltava impedir o balão de saltar por cima do topo do ecrã
  // (só x estava limitado). Se a "cabeça" do boss ficasse perto do topo do
  // canvas, aboveHead empurrava y para negativo, e a caixa ".cine-floating"
  // (que se estica para CIMA a partir do ponto de ancoragem) ficava parcial
  // ou totalmente fora do ecrã — sem nada visível/tocável para avançar a
  // fala, o jogo parecia "bloqueado" na cinemática de entrada do boss.
  y = Math.max(rect.top + 90, y);
  return { x, y };
}

// Mesma ideia, mas para o VanBerto's — assim as falas dele (reação/grito de
// guerra na entrada, e a linha de vitória) também flutuam por cima da sua
// própria cabeça, em vez de ficarem só a caixa fixa no fundo do ecrã. Só faz
// sentido durante um combate de boss (fora disso o VanBerto's usa vbSay,
// não esta caixa de diálogo) — devolve null se não houver player ativo.

export function vbDialogueAnchor() {
  if (!player || !player.active) return null;
  const cam = sceneRef.cameras.main;
  const canvas = sceneRef.game.canvas;
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const scaleX = rect.width / 960, scaleY = rect.height / 540;
  const aboveHead = (player.displayHeight/2 || 36) + 40;
  let x = rect.left + (player.x - cam.scrollX) * scaleX;
  let y = rect.top + (player.y - aboveHead - cam.scrollY) * scaleY;
  // Mesma margem dinâmica que bossDialogueAnchor() — ver dialogHalfWidth() acima.
  const halfDialogW = dialogHalfWidth() + 12;
  x = Math.max(rect.left+halfDialogW, Math.min(rect.right-halfDialogW, x));
  // Mesma correção de y que bossDialogueAnchor() — ver comentário lá.
  y = Math.max(rect.top + 90, y);
  return { x, y };
}
