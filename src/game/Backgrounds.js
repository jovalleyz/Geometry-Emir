// Backgrounds — fondos temáticos con parallax multicapa que se desplazan según
// avanza el nivel (cameraX) y reaccionan al beat (pulse). Render Canvas 2D.
import { hexToRgba } from '../utils/helpers.js';

// Cada tema es función (ctx, env) donde env = { W, H, cameraX, cameraY, t, pulse, colors, groundY, stars }.
// Devuelve nada; dibuja el fondo completo (incluye cielo base).

function sky(ctx, W, H, top, bottom) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top); g.addColorStop(1, bottom);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

function drawStars(ctx, env, count = 60, color = '#FFFFFF', speed = 6) {
  const { W, H, cameraX, t, stars } = env;
  for (let i = 0; i < count && i < stars.length; i++) {
    const s = stars[i];
    const px = ((s.x * W - cameraX * speed * s.z) % W + W) % W;
    const py = s.y * H * 0.9;
    const a = 0.35 + 0.45 * Math.sin(t * 2 + s.tw);
    ctx.fillStyle = hexToRgba(color, a * (0.4 + s.z));
    ctx.fillRect(px, py, s.r, s.r);
  }
}

// Repite un patrón horizontal con desplazamiento parallax.
// Pasa un índice ESTABLE por elemento (ligado a la posición de mundo, no a la x
// de pantalla) para que altura/ventanas no cambien cada frame (evita parpadeo).
function tiled(ctx, env, layerSpeed, spacing, drawOne) {
  const { W, cameraX } = env;
  const scroll = cameraX * layerSpeed;
  const off = ((scroll % spacing) + spacing) % spacing;
  const baseIndex = Math.floor(scroll / spacing);
  let n = 0;
  for (let x = -off - spacing; x < W + spacing; x += spacing, n++) drawOne(x, baseIndex + n);
}

// ---------------- TEMAS ----------------

// Ciudad de caricatura (synthwave): rascacielos en capas + luna.
function city(ctx, env) {
  const { W, H, t, pulse, colors } = env;
  sky(ctx, W, H, '#2a0a4a', '#0a0220');
  // Luna / sol con glow.
  const mx = W * 0.78, my = H * 0.26, mr = Math.min(W, H) * 0.12;
  const mg = ctx.createRadialGradient(mx, my, mr * 0.2, mx, my, mr * 1.8);
  mg.addColorStop(0, hexToRgba(colors.accent3, 0.9));
  mg.addColorStop(0.5, hexToRgba(colors.accent2, 0.35));
  mg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, mr * 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = hexToRgba(colors.accent3, 0.95); ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
  drawStars(ctx, env, 40, '#ffffff', 3);
  // Capa lejana de edificios.
  const baseY = H * 0.72;
  const farBuild = (x, w, h, col, lit, idx) => {
    ctx.fillStyle = col; ctx.fillRect(x, baseY - h, w, h);
    // ventanas (patrón estable por columna/fila/idx -> no parpadea)
    ctx.fillStyle = hexToRgba(colors.accent1, lit);
    let row = 0;
    for (let wy = baseY - h + 8; wy < baseY - 6; wy += 14, row++) {
      let col2 = 0;
      for (let wx = x + 5; wx < x + w - 5; wx += 12, col2++) if ((col2 + row + idx) % 3 === 0) ctx.fillRect(wx, wy, 5, 7);
    }
  };
  tiled(ctx, env, 12, 130, (x, idx) => farBuild(x, 90, 90 + ((idx % 5) + 5) % 5 * 18, '#1a0f3a', 0.25, idx));
  tiled(ctx, env, 26, 100, (x, idx) => farBuild(x, 70, 130 + ((idx % 4) + 4) % 4 * 26, '#150a30', 0.4 + pulse * 0.3, idx));
  // Niebla inferior.
  const fog = ctx.createLinearGradient(0, baseY - 40, 0, baseY + 30);
  fog.addColorStop(0, 'rgba(0,0,0,0)'); fog.addColorStop(1, hexToRgba(colors.accent2, 0.25));
  ctx.fillStyle = fog; ctx.fillRect(0, baseY - 40, W, 70);
}

// Espacio: nebulosa, estrellas, planetas con anillo.
function space(ctx, env) {
  const { W, H, t, cameraX, colors } = env;
  sky(ctx, W, H, '#05021a', '#000010');
  // Nebulosa (blobs radiales).
  for (const b of NEBULA) {
    const bx = ((b.x * W - cameraX * 4) % (W * 1.4) + W * 1.4) % (W * 1.4) - W * 0.2;
    const by = b.y * H;
    const r = b.r * Math.min(W, H);
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, r);
    g.addColorStop(0, hexToRgba(b.c1, 0.5)); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill();
  }
  drawStars(ctx, env, 80, '#ffffff', 8);
  // Planeta con anillo.
  const px = (((0.7 * W) - cameraX * 16) % (W * 2) + W * 2) % (W * 2) - W * 0.5;
  const py = H * 0.3, pr = Math.min(W, H) * 0.1;
  ctx.save();
  ctx.fillStyle = hexToRgba(colors.accent2, 0.9); ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = hexToRgba(colors.accent1, 0.6); ctx.lineWidth = 4;
  ctx.save(); ctx.translate(px, py); ctx.rotate(-0.4); ctx.scale(1, 0.32);
  ctx.beginPath(); ctx.arc(0, 0, pr * 1.7, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  ctx.restore();
}
const NEBULA = [
  { x: 0.2, y: 0.3, r: 0.5, c1: '#5b2a9a' },
  { x: 0.7, y: 0.6, r: 0.6, c1: '#1a4a8a' },
  { x: 1.1, y: 0.25, r: 0.45, c1: '#9a2a6a' },
];

// Synthwave: sol retro + rejilla en perspectiva + montañas.
function synthwave(ctx, env) {
  const { W, H, cameraX, t, pulse, colors } = env;
  sky(ctx, W, H, '#3a0a5a', '#0a0226');
  // Sol con bandas.
  const sx = W * 0.5, sy = H * 0.4, sr = Math.min(W, H) * 0.2;
  const sg = ctx.createLinearGradient(sx, sy - sr, sx, sy + sr);
  sg.addColorStop(0, colors.accent3); sg.addColorStop(1, colors.accent2);
  ctx.save(); ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = sg; ctx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
  ctx.fillStyle = '#0a0226';
  for (let i = 0; i < 8; i++) { const yy = sy + i * 7 - 4; ctx.fillRect(sx - sr, yy + i * i * 0.4, sr * 2, 3 + i); }
  ctx.restore();
  drawStars(ctx, env, 30, '#ffffff', 2);
  // Montañas.
  const baseY = H * 0.66;
  ctx.fillStyle = hexToRgba(colors.accent2, 0.4);
  const mScroll = cameraX * 14;
  const mOff = ((mScroll % 160) + 160) % 160;
  const mBase = Math.floor(mScroll / 160);
  ctx.beginPath(); ctx.moveTo(-mOff - 160, baseY);
  for (let x = -mOff - 160, i = 0; x < W + 160; x += 160, i++) { const hh = 40 + (((mBase + i) % 3) + 3) % 3 * 30; ctx.lineTo(x, baseY - hh); ctx.lineTo(x + 80, baseY); }
  ctx.lineTo(W, baseY); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  // Rejilla en perspectiva.
  ctx.strokeStyle = hexToRgba(colors.accent1, 0.25 + pulse * 0.15); ctx.lineWidth = 1.5;
  const horizon = baseY;
  for (let i = 1; i <= 10; i++) { const yy = horizon + (H - horizon) * (i / 10) * (i / 10); ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke(); }
  const gx = (cameraX * 30) % 80;
  for (let i = -20; i <= 20; i++) { const x0 = W / 2 + i * 30 - gx; ctx.beginPath(); ctx.moveTo(W / 2 + (x0 - W / 2) * 0.1, horizon); ctx.lineTo(x0, H); ctx.stroke(); }
}

// Cueva neón: estalactitas y cristales.
function cave(ctx, env) {
  const { W, H, cameraX, pulse, colors } = env;
  sky(ctx, W, H, '#0a1a14', '#020806');
  drawStars(ctx, env, 25, colors.accent1, 4);
  // Estalactitas (techo) y estalagmitas (suelo) en capas.
  const spike = (x, w, h, yTop, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, yTop); ctx.lineTo(x + w, yTop); ctx.lineTo(x + w / 2, yTop + h); ctx.closePath(); ctx.fill(); };
  tiled(ctx, env, 10, 90, (x, idx) => spike(x, 70, 80 + (((idx % 5) + 5) % 5) * 20, 0, hexToRgba(colors.accent2, 0.25)));
  tiled(ctx, env, 20, 110, (x, idx) => spike(x, 60, 110 + (((idx % 4) + 4) % 4) * 24, 0, hexToRgba(colors.accent2, 0.4)));
  // Cristales flotantes con glow.
  tiled(ctx, env, 30, 240, (x, idx) => {
    const cy = H * 0.55 + (((idx % 3) + 3) % 3) * 30;
    ctx.save(); ctx.translate(x, cy); ctx.rotate(0.5);
    ctx.fillStyle = hexToRgba(colors.accent1, 0.35 + pulse * 0.3);
    ctx.fillRect(-8, -16, 16, 32); ctx.restore();
  });
}

// Atardecer oceánico: sol, mar con reflejos.
function ocean(ctx, env) {
  const { W, H, cameraX, t, colors } = env;
  sky(ctx, W, H, '#ff7a3a', '#2a1060');
  const sx = W * 0.5, sy = H * 0.38, sr = Math.min(W, H) * 0.16;
  ctx.fillStyle = hexToRgba('#FFE08A', 0.95); ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
  // Mar.
  const seaY = H * 0.6;
  ctx.fillStyle = hexToRgba('#102a6a', 0.85); ctx.fillRect(0, seaY, W, H - seaY);
  // Reflejos.
  ctx.strokeStyle = hexToRgba('#FFE08A', 0.5); ctx.lineWidth = 2;
  for (let i = 0; i < 18; i++) { const yy = seaY + i * ((H - seaY) / 18); const ww = sr * (1 - i / 22); ctx.beginPath(); ctx.moveTo(sx - ww + Math.sin(t * 2 + i) * 6, yy); ctx.lineTo(sx + ww + Math.sin(t * 2 + i) * 6, yy); ctx.stroke(); }
  // Olas parallax.
  tiled(ctx, env, 22, 60, (x) => { ctx.strokeStyle = hexToRgba('#7ad0ff', 0.3); ctx.beginPath(); ctx.arc(x, seaY + 20, 16, Math.PI, 0); ctx.stroke(); });
}

export const BACKGROUNDS = { city, space, synthwave, cave, ocean };

export function renderBackground(theme, ctx, env) {
  (BACKGROUNDS[theme] || synthwave)(ctx, env);
}
