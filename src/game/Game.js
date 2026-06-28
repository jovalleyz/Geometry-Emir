// Game — orquesta una partida: jugador, mundo, cámara, render neón, triggers y muerte.
import { Player } from './Player.js';
import { World } from './World.js';
import { Particles } from './Particles.js';
import { COLORS, MODE, ROWS_VISIBLE, GROUND_ROWS } from '../utils/constants.js';
import { clamp, aabb } from '../utils/helpers.js';
import { audio } from '../core/AudioManager.js';

export class Game {
  constructor(canvas, input, renderer, callbacks = {}) {
    this.canvas = canvas;
    this.renderer = renderer;       // PixiRenderer (WebGL)
    this.input = input;
    this.cb = callbacks;            // { onProgress, onAttempt, onComplete, onCoin, onMode, onDeath }
    this.player = new Player();
    this.particles = new Particles();

    this.state = 'idle';            // idle | playing | respawning | complete
    this.cameraX = 0;
    this.cameraY = 0;
    this.shake = 0;
    this.flash = 0;
    this.attempts = 0;
    this.bestPercent = 0;
    this.progress = 0;
    this.practice = false;
    this.checkpoints = [];
    this.iconColor = COLORS.accent1;
    this.iconColor2 = COLORS.accent2;
    this.colors = { ...COLORS }; // fondo por defecto (menú/idle)

    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 120));
    if (window.visualViewport) window.visualViewport.addEventListener('resize', () => this.resize());
  }

  resize() {
    const vv = window.visualViewport;
    const W = Math.round(vv?.width || window.innerWidth);
    const H = Math.round(vv?.height || window.innerHeight);
    this.W = W; this.H = H;
    this.tile = H / ROWS_VISIBLE;
    this.groundY = H - GROUND_ROWS * this.tile; // y de pantalla para world y=0
    this.renderer?.resize(W, H); // Pixi gestiona el tamaño del canvas (autoDensity)
  }

  loadLevel(level, { practice = false, avatar } = {}) {
    this.level = level;
    this.world = new World(level);
    this.colors = { ...COLORS, bg: level.colors?.bg || COLORS.bg, ground: level.colors?.ground || COLORS.ground, accent1: level.colors?.accent1 || COLORS.accent1, accent2: level.colors?.accent2 || COLORS.accent2 };
    this.avatar = avatar || this.avatar;
    this.iconColor = this.avatar?.c1 || COLORS.accent1;
    this.iconColor2 = this.avatar?.c2 || COLORS.accent2;
    this.practice = practice;
    this.attempts = 0;
    this.bestPercent = 0;
    this.coinsCollected = new Set();
    this._spawn = { x: 0, y: 0, mode: level.startMode || MODE.CUBE, gravDir: 1, speedMult: level.speed || 1 };
    this.renderer?.loadLevel(this.world, this.colors, this.iconColor, this.iconColor2);
    this._restart(true);
  }

  _restart(firstTime = false) {
    this.attempts += 1;
    this.player.reset({ x: this._spawn.x, y: this._spawn.y });
    this.player.setMode(this._spawn.mode);
    this.player.setSpeedMult(this._spawn.speedMult);
    this.player.gravDir = this._spawn.gravDir;
    this.world.resetInteractables();
    for (const c of this.world.coins) c.collected = false;
    this.coinsCollected = new Set();
    this.particles.clear();
    this.checkpoints = this.practice && this._lastCheckpoint ? [this._lastCheckpoint] : [];
    this.cameraX = 0; this.cameraY = 0;
    this.progress = 0;
    this.flash = 0; this.shake = 0;
    this.state = 'playing';
    this.input.reset();
    if (!firstTime) this.cb.onAttempt?.(this.attempts);
    audio.startMusic({ bpm: this.level.bpm || 140, scale: this.level.audio?.scale, root: this.level.audio?.root, seed: this.level.audio?.seed, track: this.level.music });
    this.cb.onMode?.(this.player.mode);
  }

  start() { if (this.state === 'idle') this._restart(true); this.state = 'playing'; audio.resume(); }
  retry() { this._lastCheckpoint = null; this._restart(false); }
  stop() { this.state = 'idle'; audio.stopMusic(); }
  pause() { if (this.state === 'playing') { this.state = 'paused'; audio.stopMusic(); } }
  resume() { if (this.state === 'paused') { this.state = 'playing'; audio.startMusic({ bpm: this.level.bpm || 140, scale: this.level.audio?.scale, root: this.level.audio?.root, seed: this.level.audio?.seed, track: this.level.music }); } }

  update(dt) {
    if (this.state !== 'playing') return;
    const p = this.player;
    const pressed = this.input.consumePressed();
    const held = this.input.held;

    // Activación de orbe (el tap consume el salto normal).
    let orbUsed = false;
    if (pressed) {
      for (const orb of this.world.orbs) {
        if (orb.used) continue;
        if (Math.abs(orb.x + 0.5 - (p.x + p.hitSize / 2)) < 1.0 && Math.abs(orb.y + 0.5 - (p.y + p.hitSize / 2)) < 1.0) {
          if (p.tryOrb(orb.power)) {
            orb.used = true; orbUsed = true;
            this.particles.spark(orb.x + 0.5, orb.y + 0.5, this.colors.accent3);
            audio.sfxOrb();
          }
          break;
        }
      }
    }

    p.update(dt, { held, pressed: orbUsed ? false : pressed }, this.world);

    // Jump pads (automáticos).
    for (const pad of this.world.pads) {
      if (aabb(p.x, p.y, p.hitSize, p.hitSize, pad.x + 0.1, pad.y, 0.8, 0.35)) {
        if (p.tryPad(pad.power)) { this.particles.spark(pad.x + 0.5, pad.y + 0.2, this.colors.accent1); audio.sfxPad(); }
      }
    }

    // Portales.
    for (const portal of this.world.portals) {
      if (portal.triggered) continue;
      if (p.x + p.hitSize / 2 >= portal.x + 0.5) {
        portal.triggered = true;
        this._applyPortal(portal);
        this.particles.spark(portal.x + 0.5, portal.y + 0.5, portal.kind === 'gravity' ? this.colors.accent2 : this.colors.accent1, 16);
        audio.sfxPortal();
      }
    }

    // Coins.
    for (const c of this.world.coins) {
      if (c.collected) continue;
      if (aabb(p.x, p.y, p.hitSize, p.hitSize, c.x + 0.2, c.y + 0.2, 0.6, 0.6)) {
        c.collected = true;
        this.coinsCollected.add(c.id);
        this.particles.spark(c.x + 0.5, c.y + 0.5, this.colors.accent3, 18);
        audio.sfxCoin();
        this.cb.onCoin?.(c.id, this.coinsCollected.size);
      }
    }

    // Muerte: spikes.
    let dead = false;
    for (const sp of this.world.spikes) {
      if (Math.abs(sp.x - p.x) > 2) continue;
      if (aabb(p.x + p.hitSize * 0.12, p.y + p.hitSize * 0.12, p.hitSize * 0.76, p.hitSize * 0.76, sp.box.x, sp.box.y, sp.box.w, sp.box.h)) { dead = true; break; }
    }
    // Muerte: chocar contra pared (penetración profunda en ambos ejes).
    if (!dead) {
      for (const b of this.world.solidsNear(p.x, 2)) {
        const ox = Math.min(p.x + p.hitSize, b.x + b.w) - Math.max(p.x, b.x);
        const oy = Math.min(p.y + p.hitSize, b.y + b.h) - Math.max(p.y, b.y);
        if (ox > 0.18 && oy > 0.18) { dead = true; break; }
      }
    }
    if (dead) { this._die(); return; }

    // Checkpoints (modo práctica).
    if (this.practice && p.onGround && (!this._lastCheckpoint || p.x - this._lastCheckpoint.x > 5)) {
      this._lastCheckpoint = { x: p.x - 1, y: p.y, mode: p.mode, gravDir: p.gravDir, speedMult: p.speedMult };
    }

    // Progreso.
    this.progress = clamp((p.x / this.world.length) * 100, 0, 100);
    this.bestPercent = Math.max(this.bestPercent, this.progress);
    this.cb.onProgress?.(this.progress);
    if (p.x >= this.world.length) { this._complete(); return; }

    // Cámara.
    const anchor = this.W * 0.30 / this.tile;
    this.cameraX += (p.x - anchor - this.cameraX) * Math.min(1, dt * 12);
    const targetCamY = clamp(p.y - 5, 0, 6);
    this.cameraY += (targetCamY - this.cameraY) * Math.min(1, dt * 6);

    this.particles.update(dt);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 3);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 4);
  }

  _applyPortal(portal) {
    if (portal.kind === 'mode') { this.player.setMode(portal.value); this.cb.onMode?.(portal.value); }
    else if (portal.kind === 'speed') this.player.setSpeedMult(portal.value);
    else if (portal.kind === 'gravity') this.player.flipGravity(portal.value);
  }

  _die() {
    const p = this.player;
    p.dead = true;
    this.particles.burst(p.x + p.hitSize / 2, p.y + p.hitSize / 2, this.iconColor, 40);
    this.shake = 1; this.flash = 1;
    audio.sfxDeath();
    audio.stopMusic();
    this.cb.onDeath?.(this.progress, this.attempts);
    if (this.practice && this._lastCheckpoint) {
      this.state = 'respawning';
      setTimeout(() => this._respawnCheckpoint(), 420);
    } else {
      this.state = 'respawning';
      setTimeout(() => { this._lastCheckpoint = null; this._restart(false); }, 480);
    }
  }

  _respawnCheckpoint() {
    const cp = this._lastCheckpoint;
    this.player.reset({ x: cp.x, y: cp.y });
    this.player.setMode(cp.mode);
    this.player.setSpeedMult(cp.speedMult);
    this.player.gravDir = cp.gravDir;
    this.world.resetInteractables();
    this.attempts += 1;
    this.cb.onAttempt?.(this.attempts);
    this.state = 'playing';
    this.input.reset();
    audio.startMusic({ bpm: this.level.bpm || 140, scale: this.level.audio?.scale, root: this.level.audio?.root, seed: this.level.audio?.seed, track: this.level.music });
  }

  _complete() {
    this.state = 'complete';
    this.progress = 100;
    audio.stopMusic();
    audio.sfxComplete();
    this.cb.onComplete?.({
      levelId: this.level.id,
      percent: 100,
      attempts: this.attempts,
      coins: [...this.coinsCollected],
      practice: this.practice,
    });
  }

  // ---------- RENDER (WebGL vía PixiRenderer) ----------
  render() {
    this.renderer?.render(this);
  }
}
