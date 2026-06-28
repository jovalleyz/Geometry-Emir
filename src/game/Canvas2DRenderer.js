// Canvas2DRenderer — render de respaldo (Canvas 2D), interfaz idéntica a PixiRenderer.
// Se usa cuando WebGL no está disponible. Render verificado y a 60fps.
import { COLORS } from '../utils/constants.js';
import { clamp, hexToRgba, rand } from '../utils/helpers.js';
import { audio } from '../core/AudioManager.js';
import { renderBackground } from './Backgrounds.js';
import { drawAvatarFace, drawAvatarBack, AVATARS } from './Avatars.js';

export class Canvas2DRenderer {
  constructor() { this.ready = false; }

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.stars = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random() * 0.85, z: rand(0.1, 0.5), tw: rand(0, Math.PI * 2), r: rand(0.5, 1.8) }));
    this._colors = { ...COLORS };
    this.ready = true;
    return Promise.resolve();
  }

  resize(W, H) {
    if (!this.ready) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.style.width = W + 'px';
    this.canvas.style.height = H + 'px';
    this.canvas.width = Math.floor(W * dpr);
    this.canvas.height = Math.floor(H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.W = W; this.H = H;
  }

  loadLevel(world, colors, iconColor, iconColor2) {
    this._colors = { ...COLORS, ...colors };
    this.iconColor = iconColor || COLORS.accent1;
    this.iconColor2 = iconColor2 || COLORS.accent2;
  }

  sx(game, wx) { return (wx - game.cameraX) * game.tile; }
  sy(game, wy) { return game.groundY - (wy - game.cameraY) * game.tile; }

  render(game) {
    const ctx = this.ctx, W = this.W, H = this.H;
    if (!ctx || !game.colors) return;
    const c = game.colors;
    const pulse = clamp(1 - (performance.now() - audio.beatTime) / 180, 0, 1);
    const t = performance.now() / 1000;

    ctx.save();
    if (game.shake > 0) { const s = game.shake * 8; ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s); }

    const theme = game.level?.theme || 'synthwave';
    renderBackground(theme, ctx, { W, H, cameraX: game.cameraX, cameraY: game.cameraY, t, pulse, colors: c, groundY: this.sy(game, 0), stars: this.stars });
    this._ground(ctx, game, c, pulse);

    if (game.world && game.state !== 'idle') {
      this._solids(ctx, game, c);
      this._spikes(ctx, game, c);
      this._portals(ctx, game, c);
      this._orbsPads(ctx, game, c);
      this._coins(ctx, game, c);
      this._particles(ctx, game);
      if (!game.player.dead) this._player(ctx, game);
    }
    ctx.restore();

    if (game.flash > 0) { ctx.fillStyle = hexToRgba('#FFFFFF', game.flash * 0.5); ctx.fillRect(0, 0, W, H); }
  }

  _ground(ctx, game, c, pulse) {
    const gy = this.sy(game, 0), t = game.tile;
    const grad = ctx.createLinearGradient(0, gy, 0, this.H);
    grad.addColorStop(0, hexToRgba(c.ground, 0.95)); grad.addColorStop(1, hexToRgba(c.bg, 1));
    ctx.fillStyle = grad; ctx.fillRect(0, gy, this.W, this.H - gy);
    ctx.save();
    ctx.shadowColor = c.accent1; ctx.shadowBlur = 16 + pulse * 12;
    ctx.strokeStyle = c.accent1; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(this.W, gy); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = hexToRgba(c.accent1, 0.10); ctx.lineWidth = 1;
    const off = (game.cameraX * t) % t;
    for (let x = -off; x < this.W; x += t) { ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, this.H); ctx.stroke(); }
  }

  _glowRect(ctx, x, y, w, h, color, blur = 12, fillAlpha = 0.22) {
    ctx.save();
    ctx.shadowColor = color; ctx.shadowBlur = blur;
    ctx.fillStyle = hexToRgba(color, fillAlpha); ctx.fillRect(x, y, w, h);
    ctx.shadowBlur = 0; ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  _solids(ctx, game, c) {
    const t = game.tile;
    for (const b of game.world.solids) {
      const x = this.sx(game, b.x), y = this.sy(game, b.y + b.h);
      if (x + b.w * t < -50 || x > this.W + 50) continue;
      this._glowRect(ctx, x, y, b.w * t, b.h * t, c.ground === COLORS.ground ? '#2a5c9a' : c.accent1, 10, 0.5);
      ctx.fillStyle = hexToRgba(c.accent1, 0.25); ctx.fillRect(x, y, b.w * t, 3);
    }
  }

  _spikes(ctx, game, c) {
    const t = game.tile;
    for (const sp of game.world.spikes) {
      const x = this.sx(game, sp.x);
      if (x + t < -50 || x > this.W + 50) continue;
      const scale = sp.mini ? 0.55 : 1, w = t;
      ctx.save();
      ctx.shadowColor = c.danger; ctx.shadowBlur = 12;
      ctx.fillStyle = hexToRgba(c.danger, 0.85);
      ctx.beginPath();
      if (sp.dir === 'down') {
        const bY = this.sy(game, sp.y + 1), tY = this.sy(game, sp.y + 1 - scale);
        ctx.moveTo(x + w * 0.1, bY); ctx.lineTo(x + w * 0.9, bY); ctx.lineTo(x + w * 0.5, tY);
      } else {
        const baseY = this.sy(game, sp.y), topY = this.sy(game, sp.y + scale);
        ctx.moveTo(x + w * 0.1, baseY); ctx.lineTo(x + w * 0.9, baseY); ctx.lineTo(x + w * 0.5, topY);
      }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = c.danger; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
  }

  _portals(ctx, game, c) {
    const t = game.tile;
    for (const portal of game.world.portals) {
      const x = this.sx(game, portal.x), cy = this.sy(game, portal.y + 1.5);
      if (x + t < -50 || x > this.W + 50) continue;
      const col = portal.kind === 'gravity' ? c.accent2 : portal.kind === 'speed' ? c.accent3 : c.accent1;
      ctx.save();
      ctx.shadowColor = col; ctx.shadowBlur = 18; ctx.strokeStyle = col; ctx.lineWidth = 3;
      ctx.globalAlpha = portal.triggered ? 0.3 : 1;
      ctx.beginPath(); ctx.ellipse(x + t * 0.5, cy, t * 0.42, t * 1.6, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = hexToRgba(col, 0.18); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = col; ctx.font = `bold ${t * 0.5}px "Exo 2", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const label = portal.kind === 'mode' ? ({ cube: '◼', ship: '▲', ball: '●', wave: '◆', ufo: '⬭' }[portal.value] || '?') : portal.kind === 'speed' ? `${portal.value}×` : '⇅';
      ctx.fillText(label, x + t * 0.5, cy);
      ctx.restore();
    }
  }

  _orbsPads(ctx, game, c) {
    const t = game.tile;
    for (const orb of game.world.orbs) {
      const cx = this.sx(game, orb.x + 0.5), cy = this.sy(game, orb.y + 0.5);
      if (cx < -50 || cx > this.W + 50) continue;
      ctx.save();
      ctx.shadowColor = c.accent3; ctx.shadowBlur = 14; ctx.globalAlpha = orb.used ? 0.3 : 1;
      ctx.strokeStyle = c.accent3; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, t * 0.32, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = hexToRgba(c.accent3, 0.25); ctx.fill();
      ctx.restore();
    }
    for (const pad of game.world.pads) {
      const x = this.sx(game, pad.x + 0.1), y = this.sy(game, pad.y + 0.25);
      this._glowRect(ctx, x, y, t * 0.8, t * 0.18, c.accent1, 12, 0.5);
    }
  }

  _coins(ctx, game, c) {
    const t = game.tile;
    for (const coin of game.world.coins) {
      if (coin.collected) continue;
      const cx = this.sx(game, coin.x + 0.5), cy = this.sy(game, coin.y + 0.5);
      if (cx < -50 || cx > this.W + 50) continue;
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 200 + coin.id);
      ctx.save();
      ctx.shadowColor = c.accent3; ctx.shadowBlur = 12 + pulse * 8;
      ctx.strokeStyle = c.accent3; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, t * 0.34, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = hexToRgba(c.accent3, 0.15 + pulse * 0.15); ctx.fill();
      ctx.fillStyle = c.accent3; ctx.font = `bold ${t * 0.4}px "Press Start 2P", monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowBlur = 0;
      ctx.fillText('C', cx, cy + 1);
      ctx.restore();
    }
  }

  _particles(ctx, game) {
    const t = game.tile;
    for (const p of game.particles.list) {
      const x = this.sx(game, p.x), y = this.sy(game, p.y);
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = hexToRgba(p.color, a);
      const sz = p.size * t;
      ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
    }
  }

  _player(ctx, game) {
    const p = game.player, s = p.hitSize;
    const cx = this.sx(game, p.x + s / 2), cy = this.sy(game, p.y + s / 2);
    const size = s * game.tile;
    const av = game.avatar || AVATARS[0];
    const c1 = av.c1, c2 = av.c2;
    // Estela con el color del avatar.
    ctx.save();
    for (let i = 0; i < p.trail.length; i++) {
      const tp = p.trail[i], a = (i / p.trail.length) * 0.35;
      ctx.fillStyle = hexToRgba(c1, a);
      const tsz = size * (0.3 + 0.5 * i / p.trail.length);
      ctx.fillRect(this.sx(game, tp.x) - tsz / 2, this.sy(game, tp.y) - tsz / 2, tsz, tsz);
    }
    ctx.restore();

    const st = { t: performance.now() / 1000, excited: Math.abs(p.vy) > 6 };
    const h = size / 2;
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(p.rotation);
    ctx.shadowColor = c1; ctx.shadowBlur = 16;
    drawAvatarBack(ctx, av, size);

    if (p.mode === 'cube' || p.mode === 'ufo') {
      rrPath(ctx, -h, -h, size, size, size * 0.14); ctx.fillStyle = c1; ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      drawAvatarFace(ctx, av, size * 0.96, st);
      if (p.mode === 'ufo') { ctx.fillStyle = hexToRgba(c2, 0.55); ctx.beginPath(); ctx.ellipse(0, h * 0.9, h * 1.2, h * 0.4, 0, 0, Math.PI * 2); ctx.fill(); }
    } else if (p.mode === 'ball') {
      ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(0, 0, h, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      drawAvatarFace(ctx, av, size * 0.92, st);
    } else if (p.mode === 'ship') {
      ctx.save(); ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(-h, h * 0.7); ctx.lineTo(h * 1.05, 0); ctx.lineTo(-h, -h * 0.7); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      // cabina con cara
      ctx.save(); ctx.translate(-h * 0.15, 0); drawAvatarFace(ctx, av, size * 0.66, st); ctx.restore();
    } else if (p.mode === 'wave') {
      ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(h, 0); ctx.lineTo(-h, h * 0.75); ctx.lineTo(-h * 0.35, 0); ctx.lineTo(-h, -h * 0.75); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    ctx.restore();
  }
}

function rrPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function shade(hex, mult) {
  const h = hex.replace('#', '');
  const r = Math.min(255, parseInt(h.substring(0, 2), 16) * mult);
  const g = Math.min(255, parseInt(h.substring(2, 4), 16) * mult);
  const b = Math.min(255, parseInt(h.substring(4, 6), 16) * mult);
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
