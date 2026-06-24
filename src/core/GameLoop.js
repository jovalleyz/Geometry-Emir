// Game loop con fixed timestep (60Hz) + render interpolado (sección 9.1 del GDD).
export class GameLoop {
  constructor({ update, render }) {
    this.update = update;   // update(dtSeconds) — paso físico fijo
    this.render = render;   // render(alpha) — alpha de interpolación [0,1)
    this.fixedStep = 1000 / 60;
    this.maxFrame = 50;     // cap anti-spiral-of-death
    this.accumulator = 0;
    this.lastTime = 0;
    this.running = false;
    this._tick = this._tick.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    requestAnimationFrame(this._tick);
  }

  stop() { this.running = false; }

  _tick(now) {
    if (!this.running) return;
    let delta = now - this.lastTime;
    if (delta > this.maxFrame) delta = this.maxFrame;
    this.lastTime = now;
    this.accumulator += delta;

    while (this.accumulator >= this.fixedStep) {
      this.update(this.fixedStep / 1000);
      this.accumulator -= this.fixedStep;
    }
    this.render(this.accumulator / this.fixedStep);
    requestAnimationFrame(this._tick);
  }
}
