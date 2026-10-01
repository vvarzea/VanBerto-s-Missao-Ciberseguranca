/*************************************************
 * VanBerto's — Missão Cibersegurança 🛡️
 * Professora: Vanda Várzea
 *
 * Jogo educativo sobre Cibersegurança para crianças:
 * palavras-passe, dados pessoais, phishing, privacidade
 * e outros hábitos digitais seguros.
 *
 * 20 níveis · 3 opções por pergunta · Segunda tentativa
 * VanBerto's: mascote-robô guardião da cibersegurança
 *
 * Este ficheiro só arranca o jogo: o código está dividido em módulos em game/ (ver README.md, «Estrutura do código»).
 * Os módulos só DECLARAM funções e estado; as ligações que antes corriam por esta ordem dentro de um único
 * DOMContentLoaded são agora funções init_<módulo>_<n>() chamadas aqui, na MESMA ordem de antes.
 *************************************************/

import { init_dom_0 } from "./game/dom.js?v=20261001v98";
import { init_overlays_0, init_overlays_1 } from "./game/overlays.js?v=20261001v98";
import { init_quiz_0 } from "./game/quiz.js?v=20261001v98";
import { init_map_0 } from "./game/map.js?v=20261001v98";
import { init_artefacts_0 } from "./game/artefacts.js?v=20261001v98";
import { init_scene_0 } from "./game/scene.js?v=20261001v98";
import { init_ui_0, init_ui_1 } from "./game/ui.js?v=20261001v98";
import { init_stats_0, init_stats_1, init_stats_2 } from "./game/stats.js?v=20261001v98";
import { init_screens_0 } from "./game/screens.js?v=20261001v98";
import { init_vanberto_0 } from "./game/vanberto.js?v=20261001v98";
import "./game/dialogue.js?v=20261001v98";
import "./game/feedback.js?v=20261001v98";
import "./game/state.js?v=20261001v98";
import "./game/world.js?v=20261001v98";
import "./game/level.js?v=20261001v98";
import "./game/rooms.js?v=20261001v98";
import "./game/door.js?v=20261001v98";
import "./game/boss-core.js?v=20261001v98";
import "./game/boss-attacks.js?v=20261001v98";
import "./game/boss-combat.js?v=20261001v98";
import "./game/boss-end.js?v=20261001v98";
import "./game/flow.js?v=20261001v98";
import "./game/items.js?v=20261001v98";
import "./game/input.js?v=20261001v98";

window.addEventListener("DOMContentLoaded", () => {
  init_dom_0();
  init_overlays_0();
  init_quiz_0();
  init_map_0();
  init_artefacts_0();
  init_scene_0();
  init_ui_0();
  init_stats_0();
  init_screens_0();
  init_stats_1();
  init_ui_1();
  init_stats_2();
  init_vanberto_0();
  init_overlays_1();
});


// Resize
window.addEventListener("resize",()=>{try{if(window.__dc_game?.scale)window.__dc_game.scale.refresh();}catch{}});