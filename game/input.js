/*************************************************
 * VanBerto's — Missão Cibersegurança 🛡️  ·  game/input.js
 *
 * Controlos por toque (D-pad e botões no ecrã).
 *
 * Faz parte de dia-crianca.js, dividido em módulos (ver README.md, «Estrutura do código»).
 * As variáveis de estado vivem em state.js; aqui alteram-se com set_<nome>().
 *************************************************/

import { player, touch } from "./state.js?v=20261003v100";
import { ensureAudio } from "../audio.js?v=20261003v100";

// ===== Touch =====

export function createTouchInput(scene){
  let downAt=0, anyTouchBtnActive=false; const TAP_MS=190;
  const _teacherPanel = document.getElementById("teacherMenuPanel");
  const _isTeacherMenuOpen = () => _teacherPanel && _teacherPanel.classList.contains("open");
  // O toque direto no ecra (swipe) so funciona quando os botoes NAO estao visiveis
  const _canvasTouchAllowed = () => {
    const state = window._dc_touchState || "auto";
    if (state === "on") return false;  // botoes forcados — usar so botoes
    if (state === "off") return true;  // botoes ocultos — usar toque no ecra
    // "auto": verificar se os botoes estao visiveis (touch device portrait)
    const tc = document.getElementById("touchControls");
    return !(tc && getComputedStyle(tc).display !== "none");
  };
  scene.input.on("pointerdown",(p)=>{ensureAudio();if(anyTouchBtnActive||_isTeacherMenuOpen())return;if(!_canvasTouchAllowed())return;if(player&&player.getBounds&&player.getBounds().contains(p.worldX,p.worldY))return;downAt=scene.time.now;touch.left=p.x<scene.scale.width/2;touch.right=!touch.left;});
  scene.input.on("pointerup",()=>{if(anyTouchBtnActive||_isTeacherMenuOpen())return;if(!_canvasTouchAllowed()){touch.left=false;touch.right=false;return;}const held=scene.time.now-downAt;touch.left=false;touch.right=false;if(held<=TAP_MS)touch.jump=true;});
  scene.input.on("pointerout",()=>{touch.left=false;touch.right=false;touch.jump=false;});
  const btnL=document.getElementById("btnLeft"),btnR=document.getElementById("btnRight"),btnJ=document.getElementById("btnJump"),btnC=document.getElementById("btnCrouch");
  if(btnL&&btnR&&btnJ){
    const activeBtns=new Set(), updateActive=()=>{anyTouchBtnActive=activeBtns.size>0;};
    const press=(btn,action,val)=>{
      const start=(e)=>{e.preventDefault();ensureAudio();touch[action]=val;btn.classList.add("pressed");activeBtns.add(btn.id);updateActive();};
      const end=(e)=>{e.preventDefault();touch[action]=false;btn.classList.remove("pressed");activeBtns.delete(btn.id);updateActive();};
      btn.addEventListener("touchstart",start,{passive:false});btn.addEventListener("touchend",end,{passive:false});btn.addEventListener("touchcancel",end,{passive:false});
      btn.addEventListener("mousedown",start);btn.addEventListener("mouseup",end);btn.addEventListener("mouseleave",end);
    };
    press(btnL,"left",true); press(btnR,"right",true);
    if(btnC) press(btnC,"crouch",true);
    const jumpStart=(e)=>{e.preventDefault();ensureAudio();touch.jump=true;btnJ.classList.add("pressed");activeBtns.add(btnJ.id);updateActive();};
    const jumpEnd=(e)=>{e.preventDefault();touch.jump=false;btnJ.classList.remove("pressed");activeBtns.delete(btnJ.id);updateActive()};
    btnJ.addEventListener("touchstart",jumpStart,{passive:false});btnJ.addEventListener("touchend",jumpEnd,{passive:false});btnJ.addEventListener("touchcancel",jumpEnd,{passive:false});
    btnJ.addEventListener("mousedown",jumpStart);btnJ.addEventListener("mouseup",jumpEnd);btnJ.addEventListener("mouseleave",jumpEnd);
  }
}
