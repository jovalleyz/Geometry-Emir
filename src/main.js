// main.js — punto de entrada: cablea motor, juego, UI y Firebase.
import './style.css';
import { GameLoop } from './core/GameLoop.js';
import { InputManager } from './core/InputManager.js';
import { audio } from './core/AudioManager.js';
import { Game } from './game/Game.js';
import { UI } from './ui/UI.js';
import { LEVELS, LEVELS_BY_ID } from './levels/official.js';
import { onAuth, authState, signInWithGoogle, signInGuest, signOut, updateProfileStats } from './firebase/auth.js';
import { submitScore, getLocalScore, getLeaderboard } from './firebase/scores.js';

const canvas = document.getElementById('game-canvas');
const uiRoot = document.getElementById('ui-root');
const input = new InputManager(canvas);

let currentLevel = null;
let practice = false;

function totalCoins(level) { return level ? level.objects.filter((o) => o.type === 'coin').length : 0; }

// --- Juego con callbacks hacia la UI ---
const game = new Game(canvas, input, {
  onProgress: (p) => ui.updateProgress(p),
  onAttempt: (n) => { ui.setAttempts(n); ui.setCoins(0, totalCoins(currentLevel)); },
  onMode: (m) => ui.setMode(m),
  onCoin: (_id, count) => ui.setCoins(count, totalCoins(currentLevel)),
  onComplete: (result) => handleComplete(result),
  onDeath: () => {},
});

// --- Controlador inyectado a la UI ---
const ctl = {
  levels: LEVELS,
  audio,
  getAuth: () => authState,
  signInGoogle: signInWithGoogle,
  signInGuest,
  signOut,
  scores: { getLocalScore, getLeaderboard },
  hasNext: (id) => LEVELS.findIndex((l) => l.id === id) < LEVELS.length - 1,

  startLevel(id, opts = {}) {
    currentLevel = LEVELS_BY_ID[id];
    practice = !!opts.practice;
    audio.resume();
    game.loadLevel(currentLevel, { practice, iconColor: '#00FFCC', iconColor2: '#FF00AA' });
    ui.showHUD({ ...currentLevel, practice });
    ui.setCoins(0, totalCoins(currentLevel));
    ui.setMode(game.player.mode);
    game.start();
  },
  pause() { game.pause(); ui.showPause({ progress: game.progress, best: game.bestPercent, attempts: game.attempts, practice }); },
  resume() { ui.closePause(); game.resume(); },
  retry() { ui.closePause(); game.attempts = 0; game._lastCheckpoint = null; ui.showHUD({ ...currentLevel, practice }); ui.setCoins(0, totalCoins(currentLevel)); game.retry(); },
  togglePractice() { ctl.startLevel(currentLevel.id, { practice: !practice }); },
  exitToMenu() { game.stop(); ui.showMenu(); },
  nextLevel(id) {
    const idx = LEVELS.findIndex((l) => l.id === id);
    if (idx < LEVELS.length - 1) ctl.startLevel(LEVELS[idx + 1].id, { practice: false });
    else ui.showLevelSelect();
  },
};

const ui = new UI(uiRoot, ctl);

// Pausa con teclado.
input.onPause = () => {
  if (game.state === 'playing') ctl.pause();
  else if (game.state === 'paused') ctl.resume();
};

async function handleComplete(result) {
  ui.showComplete(result, currentLevel);
  if (result.coins.length) ui.toast(`◇ ${result.coins.length} coin(s) secreta(s)`);
  const res = await submitScore({
    levelId: result.levelId, percent: 100, completed: true,
    attempts: result.attempts, coins: result.coins,
  });
  if (res?.ok) ui.toast('Score guardado ☁');
  // Actualiza stats del perfil.
  const stars = { easy: 2, normal: 3, hard: 4, harder: 6, insane: 8, demon: 10 }[currentLevel.difficulty] || 1;
  updateProfileStats({ [`completed.${result.levelId}`]: true }).catch(() => {});
}

// --- Game loop (siempre activo; el juego decide qué actualizar) ---
const loop = new GameLoop({
  update: (dt) => game.update(dt),
  render: (alpha) => game.render(alpha),
});
loop.start();

// Hook de depuración / testing.
window.__GE = { game, ctl, LEVELS };

// --- Audio: desbloquear en el primer gesto ---
const unlock = () => { audio.resume(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);

// --- Arranque: esperar estado de auth e ir al menú ---
let booted = false;
onAuth(() => {
  if (!booted) { booted = true; ui.showMenu(); }
  else if (game.state === 'idle') ui.showMenu(); // refresca el menú al iniciar/cerrar sesión
});
// Fallback por si auth tarda.
setTimeout(() => { if (!booted) { booted = true; ui.showMenu(); } }, 1500);
