// PixiRenderer — render WebGL (PixiJS v8) con bloom global para el look neón.
// Reemplaza al render Canvas 2D; toda la lógica de juego vive en Game/Player/World.
import { Application, Container, Graphics, Sprite, Texture, Rectangle } from 'pixi.js';
import { AdvancedBloomFilter } from 'pixi-filters';
import { COLORS } from '../utils/constants.js';
import { clamp } from '../utils/helpers.js';
import { audio } from '../core/AudioManager.js';

const hexNum = (hex) => parseInt(hex.replace('#', ''), 16);

export class PixiRenderer {
  constructor() {
    this.app = null;
    this.ready = false;
  }

  async init(canvas) {
    this.app = new Application();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    await this.app.init({
      canvas,
      width: window.innerWidth,
      height: window.innerHeight,
      antialias: true,
      backgroundColor: hexNum(COLORS.bg),
      resolution: dpr,
      autoDensity: true,
      preference: 'webgl',
      powerPreference: 'high-performance',
    });
    this.app.ticker.stop(); // el render lo dispara nuestro GameLoop

    const stage = this.app.stage;
    // Capas pantalla.
    this.bgSprite = new Sprite(Texture.WHITE);
    this.starsG = new Graphics();
    this.parallaxG = new Graphics();
    this.groundG = new Graphics();
    // Mundo (escala = tile, se mueve con la cámara).
    this.world = new Container();
    this.solidsG = new Graphics();
    this.spikesG = new Graphics();
    this.portalsG = new Graphics();
    this.orbsG = new Graphics();
    this.coinsG = new Graphics();
    this.trailG = new Graphics();
    this.particlesG = new Graphics();
    this.playerG = new Graphics();
    this.world.addChild(this.solidsG, this.spikesG, this.portalsG, this.orbsG, this.coinsG, this.trailG, this.particlesG, this.playerG);
    this.flashG = new Graphics();

    stage.addChild(this.bgSprite, this.starsG, this.parallaxG, this.groundG, this.world, this.flashG);

    // Bloom global -> neón. Una sola pasada sobre todo el stage.
    this.bloom = new AdvancedBloomFilter({ threshold: 0.28, bloomScale: 1.1, brightness: 1.0, blur: 5, quality: 4 });
    stage.filters = [this.bloom];

    // Estrellas fijas (campo).
    this.stars = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random() * 0.85, z: 0.1 + Math.random() * 0.4, tw: Math.random() * Math.PI * 2, r: 0.5 + Math.random() * 1.5 }));

    this._lastMode = null;
    this.ready = true;
    this.resize(window.innerWidth, window.innerHeight);
  }

  resize(W, H) {
    if (!this.ready) return;
    this.app.renderer.resize(W, H);
    this.W = W; this.H = H;
    this.app.stage.filterArea = new Rectangle(0, 0, W, H);
    this._buildBg();
  }

  _buildBg() {
    if (!this._colors) this._colors = { ...COLORS };
    // Textura de gradiente vertical (offscreen canvas -> Texture).
    const c = document.createElement('canvas');
    c.width = 2; c.height = 256;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, shade(this._colors.bg, 1.7));
    grad.addColorStop(1, this._colors.bg);
    g.fillStyle = grad; g.fillRect(0, 0, 2, 256);
    if (this.bgSprite.texture && this.bgSprite.texture !== Texture.WHITE) this.bgSprite.texture.destroy(true);
    this.bgSprite.texture = Texture.from(c);
    this.bgSprite.width = this.W; this.bgSprite.height = this.H;
  }

  loadLevel(world, colors, iconColor, iconColor2) {
    this._colors = { ...COLORS, ...colors };
    this._world = world;
    this.iconColor = iconColor || COLORS.accent1;
    this.iconColor2 = iconColor2 || COLORS.accent2;
    this._buildBg();
    this._buildStatic();
    this._lastMode = null;
  }

  // Sólidos y spikes son estáticos: se dibujan una vez en unidades de mundo (y hacia abajo).
  _buildStatic() {
    const w = this._world;
    const groundCol = hexNum(this._colors.ground === COLORS.ground ? '#2a5c9a' : this._colors.accent1);
    const accent1 = hexNum(this._colors.accent1);
    const danger = hexNum(COLORS.danger);

    this.solidsG.clear();
    for (const b of w.solids) {
      this.solidsG.rect(b.x, -(b.y + b.h), b.w, b.h).fill({ color: groundCol, alpha: 0.55 });
      this.solidsG.rect(b.x, -(b.y + b.h), b.w, b.h).stroke({ width: 0.06, color: accent1, alpha: 0.9 });
      this.solidsG.rect(b.x, -(b.y + b.h), b.w, 0.08).fill({ color: accent1, alpha: 0.5 });
    }

    this.spikesG.clear();
    for (const sp of w.spikes) {
      const sc = sp.mini ? 0.55 : 1;
      const x = sp.x;
      let pts;
      if (sp.dir === 'down') pts = [x + 0.1, -(sp.y + 1), x + 0.9, -(sp.y + 1), x + 0.5, -(sp.y + 1 - sc)];
      else pts = [x + 0.1, -sp.y, x + 0.9, -sp.y, x + 0.5, -(sp.y + sc)];
      this.spikesG.poly(pts).fill({ color: danger, alpha: 0.9 });
      this.spikesG.poly(pts).stroke({ width: 0.05, color: danger, alpha: 1 });
    }
  }

  // ---------- frame ----------
  render(game) {
    if (!this.ready || !game.colors) return;
    const tile = game.tile, W = this.W, H = this.H;
    const pulse = clamp(1 - (performance.now() - audio.beatTime) / 180, 0, 1);
    const t = performance.now() / 1000;

    // Shake.
    const sh = game.shake > 0 ? game.shake * 8 : 0;
    this.app.stage.position.set(sh ? (Math.random() - 0.5) * sh : 0, sh ? (Math.random() - 0.5) * sh : 0);

    this._renderStars(t, pulse);
    this._renderParallax(game, pulse);
    this._renderGround(game, pulse);

    // Cámara del mundo.
    this.world.scale.set(tile);
    this.world.position.set(-game.cameraX * tile, game.groundY + game.cameraY * tile);

    if (game.world && game.state !== 'idle') {
      this.solidsG.visible = this.spikesG.visible = true;
      this._renderPortals(game);
      this._renderOrbsPads(game);
      this._renderCoins(game, t);
      this._renderParticles(game);
      this._renderPlayer(game);
      this.trailG.visible = this.playerG.visible = !game.player.dead;
    } else {
      this.solidsG.visible = this.spikesG.visible = false;
      this.portalsG.clear(); this.orbsG.clear(); this.coinsG.clear();
      this.particlesG.clear(); this.trailG.clear(); this.playerG.clear();
    }

    // Flash de muerte.
    this.flashG.clear();
    if (game.flash > 0) this.flashG.rect(0, 0, W, H).fill({ color: 0xffffff, alpha: game.flash * 0.5 });

    this.app.render();
  }

  _renderStars(t, pulse) {
    const g = this.starsG; g.clear();
    for (const s of this.stars) {
      const px = ((s.x * this.W) % this.W + this.W) % this.W;
      const py = s.y * this.H;
      const a = 0.35 + 0.4 * Math.sin(t * 2 + s.tw);
      g.rect(px, py, s.r, s.r).fill({ color: 0xffffff, alpha: a * (0.4 + s.z) });
    }
  }

  _renderParallax(game, pulse) {
    const g = this.parallaxG; g.clear();
    const acc = hexNum(this._colors.accent2 || COLORS.accent2);
    const spacing = 220, off = (game.cameraX * 30) % spacing;
    for (let i = -1; i < this.W / spacing + 1; i++) {
      const x = i * spacing - off;
      g.moveTo(x, this.H).lineTo(x + 120, this.H * 0.45);
    }
    g.stroke({ width: 2, color: acc, alpha: 0.10 + pulse * 0.06 });
  }

  _renderGround(game, pulse) {
    const g = this.groundG; g.clear();
    const gy = game.groundY;
    const accent1 = hexNum(this._colors.accent1);
    g.rect(0, gy, this.W, this.H - gy).fill({ color: hexNum(this._colors.ground), alpha: 0.92 });
    // grid vertical con desplazamiento de cámara.
    const tile = game.tile, off = (game.cameraX * tile) % tile;
    for (let x = -off; x < this.W; x += tile) g.moveTo(x, gy).lineTo(x, this.H);
    g.stroke({ width: 1, color: accent1, alpha: 0.10 });
    // línea neón superior.
    g.moveTo(0, gy).lineTo(this.W, gy).stroke({ width: 3, color: accent1, alpha: 1 });
  }

  _renderPortals(game) {
    const g = this.portalsG; g.clear();
    for (const p of game.world.portals) {
      const col = hexNum(p.kind === 'gravity' ? this._colors.accent2 : p.kind === 'speed' ? this._colors.accent3 : this._colors.accent1);
      const cx = p.x + 0.5, cy = -(p.y + 1.5);
      const a = p.triggered ? 0.3 : 1;
      g.ellipse(cx, cy, 0.42, 1.6).fill({ color: col, alpha: 0.18 * a }).stroke({ width: 0.08, color: col, alpha: a });
      // indicador (forma simple).
      this._portalIcon(g, p, cx, cy, col, a);
    }
  }
  _portalIcon(g, p, cx, cy, col, a) {
    if (p.kind === 'mode') {
      if (p.value === 'cube') g.rect(cx - 0.22, cy - 0.22, 0.44, 0.44).fill({ color: col, alpha: a });
      else if (p.value === 'ball') g.circle(cx, cy, 0.24).fill({ color: col, alpha: a });
      else if (p.value === 'ship') g.poly([cx - 0.25, cy + 0.2, cx + 0.28, cy, cx - 0.25, cy - 0.2]).fill({ color: col, alpha: a });
      else if (p.value === 'wave') g.poly([cx + 0.26, cy, cx - 0.22, cy + 0.24, cx - 0.22, cy - 0.24]).fill({ color: col, alpha: a });
      else if (p.value === 'ufo') g.ellipse(cx, cy, 0.28, 0.16).fill({ color: col, alpha: a });
    } else if (p.kind === 'gravity') {
      g.poly([cx, cy - 0.28, cx - 0.18, cy + 0.05, cx + 0.18, cy + 0.05]).fill({ color: col, alpha: a });
      g.poly([cx, cy + 0.28, cx - 0.18, cy - 0.05, cx + 0.18, cy - 0.05]).fill({ color: col, alpha: a });
    } else { // speed
      g.poly([cx - 0.1, cy - 0.22, cx + 0.2, cy, cx - 0.1, cy + 0.22]).fill({ color: col, alpha: a });
    }
  }

  _renderOrbsPads(game) {
    const g = this.orbsG; g.clear();
    const gold = hexNum(this._colors.accent3), c1 = hexNum(this._colors.accent1);
    for (const o of game.world.orbs) {
      const a = o.used ? 0.3 : 1;
      g.circle(o.x + 0.5, -(o.y + 0.5), 0.32).fill({ color: gold, alpha: 0.25 * a }).stroke({ width: 0.08, color: gold, alpha: a });
    }
    for (const pad of game.world.pads) {
      g.rect(pad.x + 0.1, -(pad.y + 0.25), 0.8, 0.18).fill({ color: c1, alpha: 0.6 }).stroke({ width: 0.05, color: c1, alpha: 1 });
    }
  }

  _renderCoins(game, t) {
    const g = this.coinsG; g.clear();
    const gold = hexNum(this._colors.accent3);
    for (const c of game.world.coins) {
      if (c.collected) continue;
      const pulse = 0.5 + 0.5 * Math.sin(t * 5 + c.id);
      g.circle(c.x + 0.5, -(c.y + 0.5), 0.34).fill({ color: gold, alpha: 0.15 + pulse * 0.15 }).stroke({ width: 0.08, color: gold, alpha: 1 });
      g.circle(c.x + 0.5, -(c.y + 0.5), 0.12).fill({ color: gold, alpha: 0.9 });
    }
  }

  _renderParticles(game) {
    const g = this.particlesG; g.clear();
    for (const p of game.particles.list) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      g.rect(p.x - p.size / 2, -(p.y + p.size / 2), p.size, p.size).fill({ color: hexNum(p.color), alpha: a });
    }
  }

  _renderPlayer(game) {
    const p = game.player, s = p.hitSize;
    // Trail.
    const tg = this.trailG; tg.clear();
    const icol = hexNum(this.iconColor);
    for (let i = 0; i < p.trail.length; i++) {
      const tp = p.trail[i];
      const a = (i / p.trail.length) * 0.35;
      const sz = s * (0.3 + 0.5 * i / p.trail.length);
      tg.rect(tp.x - sz / 2, -(tp.y + sz / 2), sz, sz).fill({ color: icol, alpha: a });
    }
    // Ícono (redibuja solo al cambiar de modo).
    if (this._lastMode !== p.mode) { this._drawIcon(p.mode, s); this._lastMode = p.mode; }
    this.playerG.position.set(p.x + s / 2, -(p.y + s / 2));
    this.playerG.rotation = -p.rotation;
  }

  _drawIcon(mode, s) {
    const g = this.playerG; g.clear();
    const c1 = hexNum(this.iconColor), c2 = hexNum(this.iconColor2);
    const h = s / 2;
    if (mode === 'cube' || mode === 'ufo') {
      g.rect(-h, -h, s, s).fill({ color: c1 }).stroke({ width: 0.06, color: 0xffffff });
      g.rect(-h * 0.45, -h * 0.45, s * 0.45, s * 0.45).fill({ color: c2, alpha: 0.9 });
      if (mode === 'ufo') g.ellipse(0, -h * 0.1, h * 0.7, h * 0.42).fill({ color: c2, alpha: 0.6 });
    } else if (mode === 'ship') {
      g.poly([-h, h * 0.6, h, 0, -h, -h * 0.6]).fill({ color: c1 }).stroke({ width: 0.06, color: 0xffffff });
      g.circle(0, 0, h * 0.3).fill({ color: c2, alpha: 0.9 });
    } else if (mode === 'ball') {
      g.circle(0, 0, h).fill({ color: c1 }).stroke({ width: 0.06, color: 0xffffff });
      g.rect(-h * 0.5, -h * 0.15, h, h * 0.3).fill({ color: c2, alpha: 0.9 });
    } else if (mode === 'wave') {
      g.poly([h, 0, -h, h * 0.7, -h * 0.4, 0, -h, -h * 0.7]).fill({ color: c1 }).stroke({ width: 0.05, color: 0xffffff });
    }
  }
}

function shade(hex, mult) {
  const h = hex.replace('#', '');
  const r = Math.min(255, parseInt(h.substring(0, 2), 16) * mult);
  const g = Math.min(255, parseInt(h.substring(2, 4), 16) * mult);
  const b = Math.min(255, parseInt(h.substring(4, 6), 16) * mult);
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
