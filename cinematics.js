// ===== Cinemáticas — Fase "Mundo Vivo" =====
// Sistema autónomo: cria e gere o seu próprio DOM (tal como hitFlash/bonusStars
// já fazem em dia-crianca.js), sem depender de markup extra no index.html.
// Duas funções principais:
//   playCinematic(slides, onComplete)   → diálogo com barras de cinema (bosses)
//   playTitleCard(data, onComplete)     → cartão de título (entrada de região)
//
// Ambas pausam a física do lado de fora (quem chama é responsável por isso,
// tal como já acontece com showHistory/showQuiz) — este módulo só trata do ecrã.

let dialogEl = null, barTop = null, barBottom = null, dlgAvatar = null, dlgName = null, dlgText = null, dlgHint = null;
let titleEl = null;

// Enter faz a MESMA coisa que tocar na caixa — pedido: quem joga com
// teclado não devia ter de alcançar o rato só para avançar uma fala.
// (Não usámos também Espaço de propósito: é a tecla de saltar durante o
// jogo normal, e ficaria fácil de carregar sem querer a meio de um diálogo.)
// Guarda-se sempre a função "avançar" ativa (uma por cada playCinematic/
// playTitleCard em curso); o listener só existe UMA vez (module-level) e
// decide qual delas chamar consoante o que está mesmo visível no momento.
let _activeDialogAdvance = null;
let _activeTitleAdvance = null;
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  // Não roubar o Enter a um campo de texto (ex.: nome do jogador no ecrã inicial)
  if (e.target && e.target.matches("input, textarea, button")) return;
  if (dialogEl && dialogEl.classList.contains("cine-show") && _activeDialogAdvance) {
    e.preventDefault();
    _activeDialogAdvance();
  } else if (titleEl && titleEl.classList.contains("show") && _activeTitleAdvance) {
    e.preventDefault();
    _activeTitleAdvance();
  }
});

function ensureDialogDOM() {
  if (dialogEl) return;
  barTop = document.createElement("div"); barTop.id = "cineBarTop"; barTop.className = "cine-bar cine-bar-top";
  barBottom = document.createElement("div"); barBottom.id = "cineBarBottom"; barBottom.className = "cine-bar cine-bar-bottom";
  document.body.appendChild(barTop); document.body.appendChild(barBottom);

  dialogEl = document.createElement("div");
  dialogEl.id = "cineDialog";
  dialogEl.innerHTML = `
    <div id="cineAvatar"></div>
    <div id="cineBody">
      <p id="cineName"></p>
      <p id="cineText"></p>
      <p id="cineHint">Toca para continuar ▶</p>
    </div>
    <button id="cineSkip" type="button" aria-label="Saltar">⏭ Saltar</button>
  `;
  document.body.appendChild(dialogEl);
  dlgAvatar = document.getElementById("cineAvatar");
  dlgName   = document.getElementById("cineName");
  dlgText   = document.getElementById("cineText");
  dlgHint   = document.getElementById("cineHint");
}

const SPEAKER_STYLE = {
  vb:   { name: "VanBerto's", emoji: "", cls: "cine-vb" },
  boss: { name: "???",        emoji: "👾", cls: "cine-boss" },
  npc:  { name: "",           emoji: "🪧", cls: "cine-npc" }
};

// bars=true → cinemática completa (barras pretas), usada nas cutscenes de boss antigas.
// bars=false → só a caixa de diálogo (retrato+nome+texto), sem tapar o resto do ecrã —
// usada agora no diálogo de boss, para não esconder a arena atrás das barras.
export function playCinematic(slides, onComplete, bars = true) {
  if (!slides || !slides.length) { onComplete?.(); return; }
  ensureDialogDOM();
  let i = 0;
  let finished = false;
  // REDE DE SEGURANÇA (nova): mesmo com a correção do touchend mais abaixo,
  // não havia NENHUM plano B se um toque simplesmente não acertasse na caixa
  // — por exemplo no diálogo "flutuante" (s.anchor, usado pelo boss/
  // VanBerto's durante um combate), que se posiciona por cima da cabeça de
  // um sprite; nalgum ecrã/dispositivo concreto isso podia deixar a caixa
  // parcialmente fora do ecrã ou tapada por outro elemento — nada tocável,
  // e o jogo ficava preso ali para sempre ("bloqueado no boss"). O cartão de
  // título (playTitleCard, mais abaixo neste ficheiro) já tinha um auto-
  // avanço destes; faltava aqui. Rearma-se a cada fala nova (armAutoAdvance,
  // chamado por render()); se ninguém tocar em 9s, avança sozinho (ou
  // termina, na última fala) — exactamente como um toque faria.
  let autoTimer = null;
  function armAutoAdvance() {
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => { if (!finished) advance(); }, 9000);
  }
  // 1) barras entram primeiro, a estabelecer o "modo cinema"...
  if (bars) document.body.classList.add("cine-active");
  // 2) ...só depois a caixa de diálogo desliza para cima — sem isto tudo
  //    aparecia de golpe, o que dava a sensação de corte/salto brusco.
  const showTimer = setTimeout(() => { dialogEl.classList.add("cine-show"); render(); }, bars ? 220 : 0);

  function render() {
    const s = slides[i];
    const style = SPEAKER_STYLE[s.speaker] || SPEAKER_STYLE.vb;
    dialogEl.className = "cine-show " + style.cls;
    const avatarEmoji = s.emoji || style.emoji;
    dlgAvatar.textContent = avatarEmoji;
    dlgAvatar.style.display = avatarEmoji ? "" : "none";
    dlgName.textContent = s.name || style.name;
    dlgText.textContent = s.text || "";
    dlgHint.textContent = (i === slides.length - 1) ? "Toca para continuar ▶" : "Toca para avançar ▶";
    // s.anchor={x,y} (opcional, em pixels CSS): em vez da caixa fixa no fundo
    // do ecrã, ancora-se por cima desse ponto — usado para o boss "falar"
    // com um balão por cima da própria cabeça, em vez de uma caixa genérica
    // lá em baixo. Sem anchor, mantém-se o comportamento de sempre.
    if (s.anchor) {
      dialogEl.classList.add("cine-floating");
      dialogEl.style.left = s.anchor.x + "px";
      dialogEl.style.top = s.anchor.y + "px";
    } else {
      dialogEl.classList.remove("cine-floating");
      dialogEl.style.left = "";
      dialogEl.style.top = "";
    }
    armAutoAdvance();
  }

  function advance() {
    if (!dialogEl.classList.contains("cine-show")) return; // ainda a entrar — ignora toques prematuros
    i++;
    if (i >= slides.length) { finish(); return; }
    render();
  }

  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(showTimer);
    clearTimeout(autoTimer);
    if (_activeDialogAdvance === advance) _activeDialogAdvance = null;
    dialogEl.onclick = null; dialogEl.ontouchend = null;
    const skipBtn = document.getElementById("cineSkip");
    skipBtn.onclick = null; skipBtn.ontouchend = null;
    // Sair na ordem inversa: diálogo desce primeiro, barras fecham a seguir.
    dialogEl.classList.remove("cine-show");
    setTimeout(() => {
      if (bars) document.body.classList.remove("cine-active");
      setTimeout(() => onComplete?.(), bars ? 340 : 120);
    }, 260);
  }

  render();
  // BUG CORRIGIDO: só "click" ficava por vezes surdo a toques em telemóvel/
  // tablet (a sequência touchstart→touchend→click do browser pode falhar a
  // converter num "click" — mesma razão pela qual o quiz já usa bindTap()).
  // Sem "touchend" aqui, e sem nenhum temporizador de recurso, um toque que
  // não vire "click" deixava o diálogo do boss (entrada ou vitória) parado
  // para sempre — é este o bug do jogo "bloquear no nível do boss".
  dialogEl.onclick = advance;
  dialogEl.ontouchend = (e) => { e.preventDefault(); advance(); };
  const skipBtn = document.getElementById("cineSkip");
  skipBtn.onclick = finish;
  skipBtn.ontouchend = (e) => { e.preventDefault(); finish(); };
  _activeDialogAdvance = advance;
  armAutoAdvance(); // arma já para a 1ª fala (as seguintes são armadas por render(), acima)
}

function ensureTitleDOM() {
  if (titleEl) return;
  titleEl = document.createElement("div");
  titleEl.id = "cineTitleCard";
  titleEl.innerHTML = `
    <div id="ctcIcon"></div>
    <p id="ctcName"></p>
    <p id="ctcSub"></p>
    <p id="ctcLine"></p>
  `;
  document.body.appendChild(titleEl);
}

// data: { icon, name, sub, lines: [string, string] }
export function playTitleCard(data, onComplete) {
  ensureTitleDOM();
  document.getElementById("ctcIcon").textContent = data.icon || "🌍";
  document.getElementById("ctcName").textContent = data.name || "";
  document.getElementById("ctcSub").textContent = data.sub || "";
  const lineEl = document.getElementById("ctcLine");
  const lines = data.lines && data.lines.length ? data.lines : [""];
  let i = 0;
  lineEl.textContent = lines[0];
  titleEl.classList.add("show");

  function advance() {
    i++;
    if (i >= lines.length) { finish(); return; }
    lineEl.textContent = lines[i];
  }
  function finish() {
    if (_activeTitleAdvance === advance) _activeTitleAdvance = null;
    titleEl.onclick = null; titleEl.ontouchend = null;
    titleEl.classList.remove("show");
    setTimeout(() => onComplete?.(), 320);
  }
  titleEl.onclick = advance;
  titleEl.ontouchend = (e) => { e.preventDefault(); advance(); };
  _activeTitleAdvance = advance;
  // avança sozinho ao fim de um tempo generoso, caso ninguém toque
  clearTimeout(titleEl._autoTimer);
  titleEl._autoTimer = setTimeout(() => { if (titleEl.classList.contains("show")) finish(); }, 2600 * lines.length);
}
