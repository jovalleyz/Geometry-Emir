// Sistema de partículas ligero para muertes, estelas y efectos.
import { rand } from '../utils/helpers.js';

export class Particles {
  constructor() { this.list = []; }

  clear() { this.list.length = 0; }

  // Explosión radial (muerte) en coords de mundo (tiles).
  burst(x, y, color, count = 36) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(4, 16);
      this.list.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(0.4, 0.8), maxLife: 0.8, size: rand(0.08, 0.24), color, grav: -10,
      });
    }
  }

  // Chispa puntual (orbe, pad).
  spark(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(2, 7);
      this.list.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(0.25, 0.5), maxLife: 0.5, size: rand(0.06, 0.14), color, grav: 0,
      });
    }
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) { this.list.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.grav * dt;
      p.vx *= 0.96;
    }
  }
}
