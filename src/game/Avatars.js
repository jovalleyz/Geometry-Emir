// Avatars — íconos seleccionables estilo Geometry Dash con caras animadas y gestos.
// La cara se dibuja sobre el cuerpo del modo actual (cube/ship/ball/...).
import { hexToRgba, store } from '../utils/helpers.js';
import { STORAGE_KEYS } from '../utils/constants.js';

export const AVATARS = [
  { id: 'classic', name: 'Classic', c1: '#00FFCC', c2: '#0a3a44', face: 'classic', acc: 'none' },
  { id: 'devil', name: 'Devil', c1: '#FF3344', c2: '#5a0a14', face: 'devil', acc: 'horns' },
  { id: 'happy', name: 'Happy', c1: '#44E08A', c2: '#0a4a2a', face: 'happy', acc: 'none' },
  { id: 'cool', name: 'Cool', c1: '#3aa0ff', c2: '#0a2a5a', face: 'cool', acc: 'none' },
  { id: 'robot', name: 'Robot', c1: '#FF9F3A', c2: '#5a3000', face: 'robot', acc: 'antenna' },
  { id: 'ghost', name: 'Ghost', c1: '#B66BFF', c2: '#2a0a4a', face: 'ghost', acc: 'none' },
  { id: 'ninja', name: 'Ninja', c1: '#2b2f44', c2: '#0a0a14', face: 'ninja', acc: 'band' },
  { id: 'star', name: 'Star', c1: '#FFD83A', c2: '#5a4500', face: 'star', acc: 'none' },
  { id: 'toxic', name: 'Toxic', c1: '#aaff00', c2: '#2a4a00', face: 'angry', acc: 'none' },
  { id: 'aqua', name: 'Aqua', c1: '#00e0ff', c2: '#003a4a', face: 'happy', acc: 'none' },
];

export const AVATARS_BY_ID = Object.fromEntries(AVATARS.map((a) => [a.id, a]));

export function getSelectedAvatar() {
  const id = store.get(STORAGE_KEYS.avatar, 'classic');
  return AVATARS_BY_ID[id] || AVATARS[0];
}
export function setSelectedAvatar(id) {
  if (AVATARS_BY_ID[id]) store.set(STORAGE_KEYS.avatar, id);
}

// Dibuja accesorios DETRÁS del cuerpo (cuernos, antena, banda) — coords locales, origen centro.
export function drawAvatarBack(ctx, avatar, S) {
  const h = S / 2;
  if (avatar.acc === 'horns') {
    ctx.fillStyle = '#f0f0f0';
    ctx.beginPath(); ctx.moveTo(-h * 0.7, -h * 0.7); ctx.lineTo(-h * 0.35, -h * 0.55); ctx.lineTo(-h * 0.4, -h * 1.05); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(h * 0.7, -h * 0.7); ctx.lineTo(h * 0.35, -h * 0.55); ctx.lineTo(h * 0.4, -h * 1.05); ctx.closePath(); ctx.fill();
  } else if (avatar.acc === 'antenna') {
    ctx.strokeStyle = '#f0f0f0'; ctx.lineWidth = S * 0.05;
    ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(0, -h * 1.4); ctx.stroke();
    ctx.fillStyle = avatar.c1; ctx.beginPath(); ctx.arc(0, -h * 1.45, S * 0.08, 0, Math.PI * 2); ctx.fill();
  }
}

// Dibuja la cara ENCIMA del cuerpo. st = { t, blink(0..1 cerrado), excited(bool) }.
export function drawAvatarFace(ctx, avatar, S, st = {}) {
  const h = S / 2;
  const t = st.t || 0;
  const excited = !!st.excited;
  // Parpadeo automático.
  const cycle = (t % 3.2);
  const autoBlink = cycle > 3.0 ? 1 - Math.abs((cycle - 3.1) / 0.1) : 0;
  const blink = Math.max(st.blink || 0, autoBlink);
  const eyeOpen = 1 - blink;

  const eyeY = -h * 0.12;
  const eyeX = h * 0.34;
  const eyeRX = h * 0.20;
  const eyeRY = h * 0.26 * eyeOpen * (excited ? 1.15 : 1);
  const white = '#ffffff', dark = '#101018';

  const band = avatar.acc === 'band';
  if (band) { // banda ninja sobre los ojos
    ctx.fillStyle = avatar.c2; ctx.fillRect(-h, -h * 0.4, S, h * 0.36);
    ctx.fillStyle = '#ff3344'; ctx.fillRect(-h, -h * 0.18, S, h * 0.08);
  }

  const drawEye = (cx, neg) => {
    if (avatar.face === 'robot') {
      ctx.fillStyle = white; ctx.fillRect(cx - eyeRX, eyeY - eyeRY, eyeRX * 2, eyeRY * 2);
      ctx.fillStyle = avatar.c2; ctx.fillRect(cx - eyeRX * 0.4, eyeY - eyeRY * 0.9, eyeRX * 0.8, eyeRY * 1.8);
      return;
    }
    if (avatar.face === 'ninja') { // ojos rasgados
      ctx.fillStyle = white; ctx.beginPath(); ctx.ellipse(cx, eyeY, eyeRX, eyeRY * 0.45, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(cx, eyeY, eyeRY * 0.35, 0, Math.PI * 2); ctx.fill();
      return;
    }
    if (avatar.face === 'star') { // ojos estrella
      ctx.fillStyle = white; star(ctx, cx, eyeY, eyeRX * 1.1, 5);
      return;
    }
    // ojo redondo con pupila
    ctx.fillStyle = white; ctx.beginPath(); ctx.ellipse(cx, eyeY, eyeRX, eyeRY, 0, 0, Math.PI * 2); ctx.fill();
    if (eyeOpen > 0.2) {
      const px = cx + (excited ? 0 : neg * eyeRX * 0.18);
      const py = eyeY + eyeRY * 0.18;
      ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(px, py, eyeRY * 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = white; ctx.beginPath(); ctx.arc(px - eyeRY * 0.18, py - eyeRY * 0.18, eyeRY * 0.16, 0, Math.PI * 2); ctx.fill();
    }
  };

  // Cejas (devil/angry) — antes de los ojos para que se vean encima.
  drawEye(-eyeX, -1);
  drawEye(eyeX, 1);

  if (avatar.face === 'cool') { // gafas de sol sobre los ojos
    ctx.fillStyle = '#0a0a12';
    rr(ctx, -eyeX - eyeRX * 1.3, eyeY - eyeRY, eyeRX * 2.6, eyeRY * 2, 4);
    rr(ctx, eyeX - eyeRX * 1.3, eyeY - eyeRY, eyeRX * 2.6, eyeRY * 2, 4);
    ctx.fillRect(-eyeX * 0.2, eyeY - 2, eyeX * 0.4, 3);
    ctx.fillStyle = hexToRgba('#ffffff', 0.5); ctx.fillRect(-eyeX - eyeRX, eyeY - eyeRY * 0.6, eyeRX * 0.8, 2);
  }
  if (avatar.face === 'devil' || avatar.face === 'angry') {
    ctx.strokeStyle = dark; ctx.lineWidth = S * 0.06; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-eyeX - eyeRX, eyeY - eyeRY * 0.9); ctx.lineTo(-eyeX + eyeRX * 0.6, eyeY - eyeRY * 0.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(eyeX + eyeRX, eyeY - eyeRY * 0.9); ctx.lineTo(eyeX - eyeRX * 0.6, eyeY - eyeRY * 0.2); ctx.stroke();
  }

  // Boca.
  const my = h * 0.34;
  ctx.lineCap = 'round';
  if (avatar.face === 'devil') {
    // boca con colmillos
    ctx.fillStyle = dark; rr(ctx, -h * 0.45, my - h * 0.1, h * 0.9, h * 0.3, 4);
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) { const x = -h * 0.4 + i * h * 0.26; ctx.beginPath(); ctx.moveTo(x, my - h * 0.1); ctx.lineTo(x + h * 0.12, my - h * 0.1); ctx.lineTo(x + h * 0.06, my + h * 0.08); ctx.closePath(); ctx.fill(); }
  } else if (avatar.face === 'happy' || excited) {
    ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(0, my - h * 0.05, h * 0.36, 0.1 * Math.PI, 0.9 * Math.PI); ctx.fill();
    ctx.fillStyle = '#ff6b8a'; ctx.beginPath(); ctx.arc(0, my + h * 0.12, h * 0.18, 0, Math.PI); ctx.fill(); // lengua
  } else if (avatar.face === 'robot') {
    ctx.strokeStyle = dark; ctx.lineWidth = S * 0.05;
    ctx.beginPath(); ctx.moveTo(-h * 0.35, my); ctx.lineTo(h * 0.35, my); ctx.stroke();
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * h * 0.16, my - h * 0.08); ctx.lineTo(i * h * 0.16, my + h * 0.08); ctx.stroke(); }
  } else if (avatar.face === 'ghost') {
    ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(0, my, h * 0.16, h * 0.2, 0, 0, Math.PI * 2); ctx.fill();
  } else if (avatar.face === 'angry') {
    ctx.strokeStyle = dark; ctx.lineWidth = S * 0.06;
    ctx.beginPath(); ctx.arc(0, my + h * 0.2, h * 0.3, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke(); // ceño boca
  } else { // classic / cool / ninja / star: sonrisa
    ctx.strokeStyle = dark; ctx.lineWidth = S * 0.06;
    ctx.beginPath(); ctx.arc(0, my - h * 0.05, h * 0.3, 0.12 * Math.PI, 0.88 * Math.PI); ctx.stroke();
  }
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fill();
}
function star(ctx, cx, cy, r, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const ang = (Math.PI / points) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    ctx[i === 0 ? 'moveTo' : 'lineTo'](cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad);
  }
  ctx.closePath(); ctx.fill();
}

// Dibuja un avatar completo (cuerpo cubo + cara) centrado — usado en previews.
export function drawAvatarPreview(ctx, avatar, cx, cy, S, st = {}) {
  ctx.save();
  ctx.translate(cx, cy);
  drawAvatarBack(ctx, avatar, S);
  // cuerpo cubo
  const h = S / 2;
  ctx.save();
  ctx.shadowColor = avatar.c1; ctx.shadowBlur = S * 0.25;
  rrFill(ctx, -h, -h, S, S, S * 0.12, avatar.c1);
  ctx.restore();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = S * 0.05; rrStroke(ctx, -h, -h, S, S, S * 0.12);
  drawAvatarFace(ctx, avatar, S, st);
  ctx.restore();
}
function rrFill(ctx, x, y, w, h, r, color) { ctx.fillStyle = color; rr(ctx, x, y, w, h, r); }
function rrStroke(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.stroke();
}
