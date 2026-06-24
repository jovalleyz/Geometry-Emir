// Game — orquesta una partida: jugador, mundo, cámara, render neón, triggers y muerte.
import { Player } from './Player.js';
import { World } from './World.js';
import { Particles } from './Particles.js';
import { Background } from './Background.js';
import { COLORS, MODE, OBJ, ROWS_VISIBLE, GROUND_ROWS } from '../utils/constants.js';
import { clamp, aabb, hexToRgba } from '../utils/helpers.js';
import { audio } from '../core/AudioManager.js';

export class Game {
  constructor(canvas, input, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = input;
    this.cb = callbacks;            // { onProgress, onAttempt, onComplete, onCoin, onMode, onDeath }
    this.player = new Player();
    this.particles = new Particles();
    this.bg = new Background();

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
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = this.canvas.clientWidth || window.innerWidth;
    const H = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = Math.floor(W * dpr);
    this.canvas.height = Math.floor(H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.W = W; this.H = H;
    this.tile = H / ROWS_VISIBLE;
    this.groundY = H - GROUND_ROWS * this.tile; // y de pantalla para world y=0
  }

  loadLevel(level, { practice = false, iconColor, iconColor2 } = {}) {
    this.level = level;
    this.world = new World(level);
    this.colors = { ...COLORS, bg: level.colors?.bg || COLORS.bg, ground: level.colors?.ground || COLORS.ground, accent1: level.colors?.accent1 || COLORS.accent1, accent2: level.colors?.accent2 || COLORS.accent2 };
    this.iconColor = iconColor || COLORS.accent1;
    this.iconColor2 = iconColor2 || COLORS.accent2;
    this.practice = practice;
    this.attempts = 0;
    this.bestPercent = 0;
    this.coinsCollected = new Set();
    this._spawn = { x: 0, y: 0, mode: level.startMode || MODE.CUBE, gravDir: 1, speedMult: level.speed || 1 };
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
    audio.startMusic({ bpm: this.level.bpm || 140, scale: this.level.audio?.scale, root: this.level.audio?.root, seed: this.level.audio?.seed });
    this.cb.onMode?.(this.player.mode);
  }

  start() { if (this.state === 'idle') this._restart(true); this.state = 'playing'; audio.resume(); }
  retry() { this._lastCheckpoint = null; this._restart(false); }
  stop() { this.state = 'idle'; audio.stopMusic(); }
  pause() { if (this.state === 'playing') { this.state = 'paused'; audio.stopMusic(); } }
  resume() { if (this.state === 'paused') { this.state = 'playing'; audio.startMusic({ bpm: this.level.bpm || 140, scale: this.level.audio?.scale, root: this.level.audio?.root, seed: this.level.audio?.seed }); } }

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
    audio.startMusic({ bpm: this.level.bpm || 140, scale: this.level.audio?.scale, root: this.level.audio?.root, seed: this.level.audio?.seed });
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

  // ---------- RENDER ----------
  render(alpha) {
    const ctx = this.ctx, W = this.W, H = this.H;
    if (!this.colors) { ctx.clearRect(0, 0, W, H); return; }
    const pulse = clamp(1 - (performance.now() - audio.beatTime) / 180, 0, 1);

    ctx.save();
    if (this.shake > 0) {
      const s = this.shake * 8;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }

    this.bg.render(ctx, W, H, this.cameraX, this.colors, pulse, performance.now() / 1000);

    // Suelo siempre (también de fondo en el menú).
    this._drawGround(ctx, pulse);

    // Mundo (sólo con nivel cargado y en juego).
    if (this.world && this.state !== 'idle') {
      this._drawSolids(ctx);
      this._drawSpikes(ctx);
      this._drawPortals(ctx);
      this._drawOrbsPads(ctx);
      this._drawCoins(ctx);
      this._drawParticles(ctx);
      if (!this.player.dead) this._drawPlayer(ctx);
    }

    ctx.restore();

    if (this.flash > 0) {
      ctx.fillStyle = hexToRgba('#FFFFFF', this.flash * 0.5);
      ctx.fillRect(0, 0, W, H);
    }
  }

  // Coordenadas mundo -> pantalla.
  sx(wx) { return (wx - this.cameraX) * this.tile; }
  sy(wy) { return this.groundY - (wy - this.cameraY) * this.tile; }

  _drawGround(ctx, pulse) {
    const t = this.tile;
    const gy = this.sy(0);
    // Banda de suelo.
    const grad = ctx.createLinearGradient(0, gy, 0, this.H);
    grad.addColorStop(0, hexToRgba(this.colors.ground, 0.95));
    grad.addColorStop(1, hexToRgba(this.colors.bg, 1));
    ctx.fillStyle = grad;
    ctx.fillRect(0, gy, this.W, this.H - gy);
    // Línea neón superior.
    ctx.save();
    ctx.shadowColor = this.colors.accent1;
    ctx.shadowBlur = 16 + pulse * 12;
    ctx.strokeStyle = this.colors.accent1;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(this.W, gy); ctx.stroke();
    ctx.restore();
    // Rejilla del suelo.
    ctx.strokeStyle = hexToRgba(this.colors.accent1, 0.10);
    ctx.lineWidth = 1;
    const off = (this.cameraX * t) % t;
    for (let x = -off; x < this.W; x += t) {
      ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, this.H); ctx.stroke();
    }
  }

  _glowRect(ctx, x, y, w, h, color, blur = 12, fillAlpha = 0.22) {
    ctx.save();
    ctx.shadowColor = color; ctx.shadowBlur = blur;
    ctx.fillStyle = hexToRgba(color, fillAlpha);
    ctx.fillRect(x, y, w, h);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  _drawSolids(ctx) {
    const t = this.tile;
    for (const b of this.world.solids) {
      const x = this.sx(b.x), y = this.sy(b.y + b.h);
      if (x + b.w * t < -50 || x > this.W + 50) continue;
      this._glowRect(ctx, x, y, b.w * t, b.h * t, this.colors.ground === COLORS.ground ? '#2a5c9a' : this.colors.accent1, 10, 0.5);
      // brillo superior
      ctx.fillStyle = hexToRgba(this.colors.accent1, 0.25);
      ctx.fillRect(x, y, b.w * t, 3);
    }
  }

  _drawSpikes(ctx) {
    const t = this.tile;
    for (const sp of this.world.spikes) {
      const x = this.sx(sp.x);
      if (x + t < -50 || x > this.W + 50) continue;
      const scale = sp.mini ? 0.55 : 1;
      const w = t, baseY = this.sy(sp.y), topY = this.sy(sp.y + 1 * scale);
      ctx.save();
      ctx.shadowColor = this.colors.danger; ctx.shadowBlur = 12;
      ctx.fillStyle = hexToRgba(this.colors.danger, 0.85);
      ctx.beginPath();
      if (sp.dir === 'down') {
        const bY = this.sy(sp.y + 1), tY = this.sy(sp.y + 1 - scale);
        ctx.moveTo(x + w * 0.1, bY); ctx.lineTo(x + w * 0.9, bY); ctx.lineTo(x + w * 0.5, tY);
      } else {
        ctx.moveTo(x + w * 0.1, baseY); ctx.lineTo(x + w * 0.9, baseY); ctx.lineTo(x + w * 0.5, topY);
      }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = this.colors.danger; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
  }

  _drawPortals(ctx) {
    const t = this.tile;
    for (const portal of this.world.portals) {
      const x = this.sx(portal.x), cy = this.sy(portal.y + 1.5);
      if (x + t < -50 || x > this.W + 50) continue;
      const col = portal.kind === 'gravity' ? this.colors.accent2 : portal.kind === 'speed' ? this.colors.accent3 : this.colors.accent1;
      ctx.save();
      ctx.shadowColor = col; ctx.shadowBlur = 18;
      ctx.strokeStyle = col; ctx.lineWidth = 3;
      ctx.globalAlpha = portal.triggered ? 0.3 : 1;
      ctx.beginPath();
      ctx.ellipse(x + t * 0.5, cy, t * 0.42, t * 1.6, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = hexToRgba(col, 0.18); ctx.fill();
      // etiqueta
      ctx.shadowBlur = 0; ctx.fillStyle = col; ctx.font = `bold ${t * 0.5}px "Exo 2", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const label = portal.kind === 'mode' ? ({ cube: '◼', ship: '▲', ball: '●', wave: '◆', ufo: '⬭' }[portal.value] || '?') : portal.kind === 'speed' ? `${portal.value}×` : '⇅';
      ctx.fillText(label, x + t * 0.5, cy);
      ctx.restore();
    }
  }

  _drawOrbsPads(ctx) {
    const t = this.tile;
    for (const orb of this.world.orbs) {
      const cx = this.sx(orb.x + 0.5), cy = this.sy(orb.y + 0.5);
      if (cx < -50 || cx > this.W + 50) continue;
      const col = this.colors.accent3;
      ctx.save();
      ctx.shadowColor = col; ctx.shadowBlur = 14;
      ctx.globalAlpha = orb.used ? 0.3 : 1;
      ctx.strokeStyle = col; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, t * 0.32, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = hexToRgba(col, 0.25); ctx.fill();
      ctx.restore();
    }
    for (const pad of this.world.pads) {
      const x = this.sx(pad.x + 0.1), y = this.sy(pad.y + 0.25);
      this._glowRect(ctx, x, y, t * 0.8, t * 0.18, this.colors.accent1, 12, 0.5);
    }
  }

  _drawCoins(ctx) {
    const t = this.tile;
    for (const c of this.world.coins) {
      if (c.collected) continue;
      const cx = this.sx(c.x + 0.5), cy = this.sy(c.y + 0.5);
      if (cx < -50 || cx > this.W + 50) continue;
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 200 + c.id);
      ctx.save();
      ctx.shadowColor = this.colors.accent3; ctx.shadowBlur = 12 + pulse * 8;
      ctx.strokeStyle = this.colors.accent3; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, t * 0.34, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = hexToRgba(this.colors.accent3, 0.15 + pulse * 0.15); ctx.fill();
      ctx.fillStyle = this.colors.accent3; ctx.font = `bold ${t * 0.4}px "Press Start 2P", monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowBlur = 0;
      ctx.fillText('C', cx, cy + 1);
      ctx.restore();
    }
  }

  _drawParticles(ctx) {
    const t = this.tile;
    for (const p of this.particles.list) {
      const x = this.sx(p.x), y = this.sy(p.y);
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = hexToRgba(p.color, a);
      const sz = p.size * t;
      ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
    }
  }

  _drawPlayer(ctx) {
    const p = this.player, t = this.tile, s = p.hitSize;
    const cx = this.sx(p.x + s / 2), cy = this.sy(p.y + s / 2);
    const size = s * t;

    // Trail.
    ctx.save();
    for (let i = 0; i < p.trail.length; i++) {
      const tp = p.trail[i];
      const a = (i / p.trail.length) * 0.35;
      ctx.fillStyle = hexToRgba(this.iconColor, a);
      const tsz = size * (0.3 + 0.5 * i / p.trail.length);
      ctx.fillRect(this.sx(tp.x) - tsz / 2, this.sy(tp.y) - tsz / 2, tsz, tsz);
    }
    ctx.restore();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(p.rotation);
    ctx.shadowColor = this.iconColor; ctx.shadowBlur = 16;

    if (p.mode === MODE.CUBE || p.mode === MODE.UFO) {
      this._iconCube(ctx, size);
      if (p.mode === MODE.UFO) { // domo del ufo
        ctx.fillStyle = hexToRgba(this.iconColor2, 0.6);
        ctx.beginPath(); ctx.ellipse(0, -size * 0.1, size * 0.35, size * 0.22, 0, Math.PI, 0); ctx.fill();
      }
    } else if (p.mode === MODE.SHIP) {
      this._iconShip(ctx, size);
    } else if (p.mode === MODE.BALL) {
      this._iconBall(ctx, size);
    } else if (p.mode === MODE.WAVE) {
      this._iconWave(ctx, size);
    }
    ctx.restore();
  }

  _iconCube(ctx, size) {
    const h = size / 2;
    ctx.fillStyle = this.iconColor;
    ctx.fillRect(-h, -h, size, size);
    ctx.fillStyle = hexToRgba(this.iconColor2, 0.9);
    ctx.fillRect(-h * 0.45, -h * 0.45, size * 0.45, size * 0.45);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    ctx.strokeRect(-h, -h, size, size);
  }
  _iconShip(ctx, size) {
    const h = size / 2;
    ctx.fillStyle = this.iconColor;
    ctx.beginPath();
    ctx.moveTo(-h, h * 0.6); ctx.lineTo(h, 0); ctx.lineTo(-h, -h * 0.6); ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = hexToRgba(this.iconColor2, 0.9);
    ctx.beginPath(); ctx.arc(0, 0, h * 0.3, 0, Math.PI * 2); ctx.fill();
  }
  _iconBall(ctx, size) {
    const r = size / 2;
    ctx.fillStyle = this.iconColor;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = hexToRgba(this.iconColor2, 0.9);
    ctx.fillRect(-r * 0.5, -r * 0.15, r, r * 0.3);
  }
  _iconWave(ctx, size) {
    const h = size / 2;
    ctx.fillStyle = this.iconColor;
    ctx.beginPath();
    ctx.moveTo(h, 0); ctx.lineTo(-h, h * 0.7); ctx.lineTo(-h * 0.4, 0); ctx.lineTo(-h, -h * 0.7); ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
  }
}
