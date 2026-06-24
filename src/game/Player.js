// Player — física y modos de juego. Coordenadas en tiles, eje Y hacia arriba,
// suelo en y=0. El jugador ocupa [x, x+size] x [y, y+size].
import { MODE, BASE_SPEED } from '../utils/constants.js';
import { clamp } from '../utils/helpers.js';

// Parámetros físicos por modo (unidades tile/seg).
const P = {
  cube: { grav: 62, jump: 19.8 },
  ship: { grav: 42, thrust: 88, max: 23 },
  ball: { grav: 56 },
  wave: { },
  ufo: { grav: 52, impulse: 16.2 },
};
const CEIL = 12;          // techo del área jugable (tiles)
const PAD_POWER = 26;     // impulso de jump-pad
const ORB_POWER = 19.8;   // impulso de orbe

export class Player {
  constructor() {
    this.reset();
  }

  reset(spawn = { x: 0, y: 0 }) {
    this.mode = MODE.CUBE;
    this.x = spawn.x;
    this.y = spawn.y;
    this.vy = 0;
    this.size = 0.92;
    this.mini = false;
    this.gravDir = 1;        // 1 = gravedad hacia abajo, -1 = invertida
    this.speedMult = 1;
    this.speed = BASE_SPEED;
    this.onGround = false;
    this.dead = false;
    this.rotation = 0;
    this.trail = [];
    this._orbCooldown = 0;
    this._padCooldown = 0;
  }

  get hitSize() { return this.mini ? this.size * 0.6 : this.size; }

  setMode(mode) {
    if (this.mode === mode) return;
    this.mode = mode;
    // Al entrar en modos de vuelo, suaviza la velocidad vertical.
    if (mode === MODE.SHIP || mode === MODE.UFO || mode === MODE.WAVE) this.vy = 0;
  }
  setSpeedMult(m) { this.speedMult = m; this.speed = BASE_SPEED * m; }
  setMini(v) { this.mini = v; }
  flipGravity(dir) { this.gravDir = dir ?? -this.gravDir; }

  jump(power = ORB_POWER) { this.vy = power * this.gravDir; this.onGround = false; }
  pad(power = PAD_POWER) { this.vy = power * this.gravDir; this.onGround = false; }

  // input: { held, pressed }
  update(dt, input, world) {
    if (this.dead) return;
    const s = this.hitSize;
    this.prevY = this.y;
    this.prevTop = this.y + s;
    if (this._orbCooldown > 0) this._orbCooldown -= dt;
    if (this._padCooldown > 0) this._padCooldown -= dt;

    // Avance horizontal constante.
    this.x += this.speed * dt;

    // Física vertical por modo.
    switch (this.mode) {
      case MODE.CUBE: this._updateCube(dt, input); break;
      case MODE.SHIP: this._updateShip(dt, input); break;
      case MODE.BALL: this._updateBall(dt, input); break;
      case MODE.WAVE: this._updateWave(dt, input); break;
      case MODE.UFO: this._updateUfo(dt, input); break;
    }

    this.onGround = false;
    this.y += this.vy * dt;

    this._resolve(world);
    this._rotate(dt);

    // Trail (últimas posiciones).
    this.trail.push({ x: this.x + s / 2, y: this.y + s / 2 });
    if (this.trail.length > 14) this.trail.shift();
  }

  _updateCube(dt, input) {
    this.vy += -this.gravDir * P.cube.grav * dt;
    this.vy = clamp(this.vy, -28, 28);
    // Salta con tap (flanco) o manteniendo pulsado (multi-salto al aterrizar).
    if (this.onGround && (input.held || input.pressed)) {
      this.vy = P.cube.jump * this.gravDir;
      this.onGround = false;
    }
  }
  _updateShip(dt, input) {
    const a = (input.held ? P.ship.thrust : 0) - P.ship.grav;
    this.vy += this.gravDir * a * dt;
    this.vy = clamp(this.vy, -P.ship.max, P.ship.max);
  }
  _updateBall(dt, input) {
    this.vy += -this.gravDir * P.ball.grav * dt;
    this.vy = clamp(this.vy, -26, 26);
    if (input.pressed && this.onGround) {
      this.flipGravity();
      this.vy = 6 * this.gravDir; // pequeño empuje al cambiar
      this.onGround = false;
    }
  }
  _updateWave(dt, input) {
    // Movimiento a 45°: |vy| = velocidad horizontal.
    const dir = input.held ? 1 : -1;
    this.vy = dir * this.gravDir * this.speed;
  }
  _updateUfo(dt, input) {
    this.vy += -this.gravDir * P.ufo.grav * dt;
    this.vy = clamp(this.vy, -26, 26);
    if (input.pressed) {
      this.vy = P.ufo.impulse * this.gravDir;
    }
  }

  // Activación de orbe (al tocar + tap).
  tryOrb(power = ORB_POWER) {
    if (this._orbCooldown > 0) return false;
    this.jump(power);
    this._orbCooldown = 0.18;
    return true;
  }
  tryPad(power = PAD_POWER) {
    if (this._padCooldown > 0) return false;
    this.pad(power);
    this._padCooldown = 0.25;
    return true;
  }

  _rotate(dt) {
    const s = this.hitSize;
    if (this.mode === MODE.CUBE) {
      if (this.onGround) {
        // Encaja a múltiplos de 90°.
        const target = Math.round(this.rotation / (Math.PI / 2)) * (Math.PI / 2);
        this.rotation += (target - this.rotation) * Math.min(1, dt * 25);
      } else {
        this.rotation += this.gravDir * dt * 6.0; // gira en el aire
      }
    } else if (this.mode === MODE.BALL) {
      this.rotation += this.gravDir * this.speed * dt * 0.9;
    } else if (this.mode === MODE.SHIP || this.mode === MODE.UFO) {
      this.rotation = clamp(-this.vy * 0.03, -0.5, 0.5) * -this.gravDir;
    } else if (this.mode === MODE.WAVE) {
      this.rotation = this.vy >= 0 ? -Math.PI / 4 : Math.PI / 4;
    }
  }

  // Resolución de colisiones contra suelo, techo y bloques sólidos.
  _resolve(world) {
    const s = this.hitSize;
    // Límites del mundo.
    if (this.y < 0) {
      this.y = 0;
      if (this.gravDir === 1) { this.vy = 0; this.onGround = true; }
      else { this.vy = 0; } // tocar suelo con gravedad invertida = choque (se evalúa en hazard)
    }
    if (this.y + s > CEIL) {
      this.y = CEIL - s;
      if (this.gravDir === -1) { this.vy = 0; this.onGround = true; }
      else { this.vy = 0; }
    }

    // Bloques sólidos cercanos.
    const solids = world.solidsNear(this.x, 2);
    for (const b of solids) {
      if (!(this.x < b.x + b.w && this.x + s > b.x && this.y < b.y + b.h && this.y + s > b.y)) continue;
      const bTop = b.y + b.h, bBottom = b.y;
      // Aterrizar encima (venía de arriba).
      if (this.prevY >= bTop - 0.06 && this.vy <= 0) {
        this.y = bTop; this.vy = 0;
        if (this.gravDir === 1) this.onGround = true;
      } else if (this.prevTop <= bBottom + 0.06 && this.vy >= 0) {
        // Tocar por debajo (techo del bloque).
        this.y = bBottom - s; this.vy = 0;
        if (this.gravDir === -1) this.onGround = true;
      }
    }
  }
}
