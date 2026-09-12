// ===== Sistema de Conquistas — Fase 2 =====
// Persistente em localStorage. Critérios ligados a eventos já existentes no jogo.

import { LEVELS } from "./data-levels.js";
import { ACHIEVEMENTS_DEFS } from "./data-progression.js";
import { ensureAudio, beep } from "./audio.js";
import { levelStars, starsForLevel, incrementSecretsFound, markFirstTryThisLevel } from "./stars.js";
import { loadNamespace, saveNamespace } from "./storage.js";

export let unlockedAchievements = {}; // { [id]: true }
let historiesReadCount = 0;
let correctAnswersTotal = 0;
let secretRoomsFoundGlobal = []; // chaves (roomKey) únicas de salas secretas já encontradas, em todo o jogo

export function loadAchievements() {
  const d = loadNamespace("achievements", {});
  unlockedAchievements = d.unlocked || {};
  historiesReadCount = d.historiesReadCount || 0;
  correctAnswersTotal = d.correctAnswersTotal || 0;
  secretRoomsFoundGlobal = d.secretRoomsFoundGlobal || [];
}
export function saveAchievements() {
  saveNamespace("achievements", {
    unlocked: unlockedAchievements,
    historiesReadCount,
    correctAnswersTotal,
    secretRoomsFoundGlobal
  });
}
loadAchievements();

export function resetAchievements() {
  unlockedAchievements = {};
  historiesReadCount = 0;
  correctAnswersTotal = 0;
  secretRoomsFoundGlobal = [];
  saveAchievements();
}

export function unlockAchievement(id) {
  if (unlockedAchievements[id]) return; // já desbloqueada
  const def = ACHIEVEMENTS_DEFS.find(a => a.id === id);
  if (!def) return;
  unlockedAchievements[id] = true;
  saveAchievements();
  showAchievementToast(def);
}

export function showAchievementToast(def, label = "Conquista desbloqueada!") {
  const host = document.getElementById("achievementToastHost");
  if (!host) return;
  const toast = document.createElement("div");
  toast.className = "achv-toast";
  toast.innerHTML = `
    <div class="achv-toast-icon">${def.tier}</div>
    <div class="achv-toast-body">
      <p class="achv-toast-label">${label}</p>
      <p class="achv-toast-name">${def.name}</p>
    </div>
  `;
  host.appendChild(toast);
  ensureAudio();
  beep({freq:740, dur:0.08, type:"square", vol:0.06, slideTo:1040});
  setTimeout(() => beep({freq:1040, dur:0.14, type:"triangle", vol:0.06, slideTo:1320}), 90);
  setTimeout(() => {
    toast.classList.add("achv-toast-out");
    setTimeout(() => toast.remove(), 400);
  }, 3200);
}

// Avalia todas as conquistas com critérios cumulativos (chamado após eventos relevantes).
// levelsCompletedCount vem do sistema de mapa/progressão, que continua no ficheiro principal.
export function checkAchievements(levelsCompletedCount) {
  const totalLevels = LEVELS.length;
  if (levelsCompletedCount >= 1) unlockAchievement("primeiros_passos");
  if (historiesReadCount >= 10) unlockAchievement("curioso");
  if (correctAnswersTotal >= 20) unlockAchievement("sabio");
  if (levelsCompletedCount >= totalLevels) unlockAchievement("guardiao");

  // Mestre VanBerto's — todas as perguntas respondidas à primeira tentativa
  const allFirstTry = LEVELS.every((L, i) => levelStars[i] && levelStars[i].firstTry);
  if (levelsCompletedCount >= totalLevels && allFirstTry) unlockAchievement("mestre");

  // Lenda dos Direitos — 100%: todos os níveis concluídos com as 3 estrelas
  const allThreeStars = LEVELS.every((L, i) => starsForLevel(i) === 3);
  if (levelsCompletedCount >= totalLevels && allThreeStars) unlockAchievement("lenda");
}

// Chamado a cada segredo encontrado (de updateSecrets)
export function onSecretFoundForAchievements(totalSecretsInLevel) {
  const found = incrementSecretsFound();
  if (totalSecretsInLevel > 0 && found >= totalSecretsInLevel) {
    unlockAchievement("explorador");
  }
}
// Chamado ao apanhar a recompensa de uma sala secreta (cano com room:true)
// — diferente de onSecretFoundForAchievements: aquele é sobre L.secrets
// (itens escondidos fora do caminho principal, um sistema à parte), este é
// sobre as salas dos canos. roomKey identifica a sala de forma única em
// todo o jogo (ver roomKey = x+"_"+y em dia-crianca.js). Persistente, por
// isso conta em todo o jogo, não só no nível atual.
export function onSecretRoomFoundForAchievements(roomKey) {
  if (!roomKey || secretRoomsFoundGlobal.includes(roomKey)) return;
  secretRoomsFoundGlobal.push(roomKey);
  saveAchievements();
  const total = LEVELS.reduce((sum, L) => sum + (L.pipes||[]).filter(p=>p.room).length, 0);
  if (total > 0 && secretRoomsFoundGlobal.length >= total) unlockAchievement("caca_tesouros");
}
// Chamado quando uma curiosidade "Sabias que…?" é fechada pelo jogador
export function onHistoryReadForAchievements(levelsCompletedCount) {
  historiesReadCount += 1;
  saveAchievements();
  checkAchievements(levelsCompletedCount);
}
// Chamado quando o jogador acerta uma pergunta do quiz
export function onCorrectAnswerForAchievements(wasFirstTry) {
  correctAnswersTotal += 1;
  if (wasFirstTry) markFirstTryThisLevel();
  saveAchievements();
}

export function renderAchievements() {
  const grid = document.getElementById("achievementsGrid");
  if (!grid) return;
  grid.innerHTML = "";
  ACHIEVEMENTS_DEFS.forEach(def => {
    const unlocked = !!unlockedAchievements[def.id];
    const card = document.createElement("div");
    card.className = `achv-card ${unlocked ? "achv-card--unlocked" : "achv-card--locked"}`;
    card.innerHTML = `
      <div class="achv-card-icon">${unlocked ? def.tier : "🔒"}</div>
      <p class="achv-card-name">${def.name}</p>
      <p class="achv-card-desc">${def.desc}</p>
    `;
    grid.appendChild(card);
  });
  const count = ACHIEVEMENTS_DEFS.filter(d => unlockedAchievements[d.id]).length;
  const counterEl = document.getElementById("achievementsCounter");
  if (counterEl) counterEl.textContent = `${count}/${ACHIEVEMENTS_DEFS.length}`;
}
