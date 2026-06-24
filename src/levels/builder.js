// Builder fluido para autorar niveles de forma legible.
export class LB {
  constructor() { this.objects = []; }

  block(x, y, w = 1, h = 1) { this.objects.push({ type: 'block', x, y, w, h }); return this; }
  platform(x, y, w = 1) { return this.block(x, y, w, 1); }
  // Escalera ascendente (steps bloques de altura creciente).
  stairs(x, steps, baseH = 1) { for (let i = 0; i < steps; i++) this.block(x + i, 0, 1, baseH + i); return this; }

  spike(x, y = 0, dir = 'up') { this.objects.push({ type: 'spike', x, y, dir }); return this; }
  mini(x, y = 0, dir = 'up') { this.objects.push({ type: 'spike_s', x, y, dir }); return this; }
  // Grupo de n spikes consecutivos.
  spikes(x, n, y = 0) { for (let i = 0; i < n; i++) this.spike(x + i, y); return this; }

  orb(x, y, color = 'yellow', power = 19.8) { this.objects.push({ type: 'orb', x, y, color, power }); return this; }
  pad(x, y, power = 26) { this.objects.push({ type: 'pad', x, y, power }); return this; }
  coin(x, y, id) { this.objects.push({ type: 'coin', x, y, id }); return this; }

  mode(x, mode, y = 3) { this.objects.push({ type: 'portal_mode', x, mode, y }); return this; }
  speed(x, speed, y = 4) { this.objects.push({ type: 'portal_speed', x, speed, y }); return this; }
  gravity(x, dir = -1, y = 4) { this.objects.push({ type: 'portal_gravity', x, dir, y }); return this; }

  build() { return this.objects; }
}
