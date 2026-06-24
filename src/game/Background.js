// Fondo neón: estrellas parpadeantes + 3 capas parallax + pulso al BPM.
import { rand } from '../utils/helpers.js';
import { hexToRgba } from '../utils/helpers.js';

export class Background {
  constructor() {
    this.stars = [];
    for (let i = 0; i < 70; i++) {
      this.stars.push({ x: Math.random(), y: Math.random(), z: rand(0.1, 0.5), tw: rand(0, Math.PI * 2), r: rand(0.5, 1.8) });
    }
  }

  // pulse: 0..1 (intensidad del beat), t: tiempo en segundos.
  render(ctx, W, H, cameraX, colors, pulse, t) {
    // Gradiente de fondo.
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, shade(colors.bg, 1.6));
    g.addColorStop(1, colors.bg);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Estrellas.
    for (const s of this.stars) {
      const px = ((s.x * W - cameraX * 8 * s.z) % W + W) % W;
      const py = s.y * H * 0.85;
      const a = 0.35 + 0.4 * Math.sin(t * 2 + s.tw);
      ctx.fillStyle = hexToRgba('#FFFFFF', a * (0.5 + s.z));
      ctx.fillRect(px, py, s.r, s.r);
    }

    // Capas parallax: líneas/triángulos neón tenues.
    const acc = colors.accent2 || '#FF00AA';
    ctx.save();
    ctx.globalAlpha = 0.10 + pulse * 0.06;
    ctx.strokeStyle = acc;
    ctx.lineWidth = 2;
    const spacing = 220;
    const off = (cameraX * 30) % spacing;
    for (let i = -1; i < W / spacing + 1; i++) {
      const x = i * spacing - off;
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.lineTo(x + 120, H * 0.45);
      ctx.stroke();
    }
    ctx.restore();

    // Glow de pulso central.
    if (pulse > 0.01) {
      const rg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.6);
      rg.addColorStop(0, hexToRgba(colors.accent1, pulse * 0.05));
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);
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
