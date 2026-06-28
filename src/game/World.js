// World — parsea el nivel normalizado en estructuras consultables por el motor.
import { OBJ, SPEEDS, MODE } from '../utils/constants.js';

export class World {
  constructor(level) {
    this.level = level;
    this.length = level.length;           // endX en tiles
    this.solids = [];                     // {x,y,w,h}
    this.spikes = [];                     // {x,y,dir, box:{x,y,w,h}}
    this.orbs = [];                       // {x,y,color,power,used}
    this.pads = [];                       // {x,y,power}
    this.coins = [];                      // {x,y,id,collected}
    this.gems = [];                       // {x,y,collected} — puntos
    this.portals = [];                    // {x,y,kind,value,triggered}
    this._parse(level.objects || []);
    this.solids.sort((a, b) => a.x - b.x);
  }

  _parse(objects) {
    for (const o of objects) {
      switch (o.type) {
        case OBJ.BLOCK:
        case OBJ.PLATFORM:
          this.solids.push({ x: o.x, y: o.y, w: o.w || 1, h: o.h || 1, kind: o.type });
          break;
        case OBJ.SPIKE:
          this.spikes.push({ x: o.x, y: o.y, dir: o.dir || 'up', mini: false, box: spikeBox(o.x, o.y, o.dir || 'up', false) });
          break;
        case OBJ.SPIKE_S:
          this.spikes.push({ x: o.x, y: o.y, dir: o.dir || 'up', mini: true, box: spikeBox(o.x, o.y, o.dir || 'up', true) });
          break;
        case OBJ.ORB:
          this.orbs.push({ x: o.x, y: o.y, color: o.color || 'yellow', power: o.power || 19.8, used: false });
          break;
        case OBJ.PAD:
          this.pads.push({ x: o.x, y: o.y, power: o.power || 26 });
          break;
        case OBJ.COIN:
          this.coins.push({ x: o.x, y: o.y, id: o.id ?? this.coins.length, collected: false });
          break;
        case OBJ.GEM:
          this.gems.push({ x: o.x, y: o.y ?? 1, collected: false });
          break;
        case OBJ.PORTAL_MODE:
          this.portals.push({ x: o.x, y: o.y ?? 4, kind: 'mode', value: o.mode || MODE.CUBE, triggered: false });
          break;
        case OBJ.PORTAL_SPEED:
          this.portals.push({ x: o.x, y: o.y ?? 5, kind: 'speed', value: o.speed ?? 1, triggered: false });
          break;
        case OBJ.PORTAL_GRAVITY:
          this.portals.push({ x: o.x, y: o.y ?? 5, kind: 'gravity', value: o.dir ?? -1, triggered: false });
          break;
        default: break;
      }
    }
  }

  // Sólidos cercanos a una posición x (para colisión).
  solidsNear(x, radius = 2) {
    const out = [];
    for (const b of this.solids) {
      if (b.x + b.w < x - radius) continue;
      if (b.x > x + radius + 1) break;
      out.push(b);
    }
    return out;
  }

  resetInteractables() {
    for (const o of this.orbs) o.used = false;
    for (const p of this.portals) p.triggered = false;
    // Las coins recogidas se conservan hasta completar/abandonar.
  }
}

function spikeBox(x, y, dir, mini) {
  const w = mini ? 0.3 : 0.42;
  const h = mini ? 0.32 : 0.6;
  const cx = x + 0.5 - w / 2;
  if (dir === 'down') return { x: cx, y: y + 1 - h, w, h };
  return { x: cx, y, w, h };
}
