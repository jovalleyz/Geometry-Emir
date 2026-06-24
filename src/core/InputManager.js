// Gestión de input unificado (teclado, mouse, touch).
// Expone estado "held" (sostenido) y eventos "pressed"/"released" por frame.
export class InputManager {
  constructor(target = window) {
    this.held = false;
    this._pressedQueue = false;
    this._releasedQueue = false;
    this.onPause = null;

    const press = (e) => {
      if (e.cancelable) e.preventDefault();
      if (!this.held) this._pressedQueue = true;
      this.held = true;
    };
    const release = (e) => {
      if (e && e.cancelable) e.preventDefault();
      if (this.held) this._releasedQueue = true;
      this.held = false;
    };

    // Teclado
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if ([' ', 'ArrowUp', 'w', 'W'].includes(e.key)) { e.preventDefault(); press(e); }
      else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { this.onPause?.(); }
    });
    window.addEventListener('keyup', (e) => {
      if ([' ', 'ArrowUp', 'w', 'W'].includes(e.key)) release(e);
    });

    // Mouse
    target.addEventListener('mousedown', (e) => { if (e.button === 0) press(e); });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) release(e); });

    // Touch
    target.addEventListener('touchstart', press, { passive: false });
    target.addEventListener('touchend', release, { passive: false });
    target.addEventListener('touchcancel', release, { passive: false });

    // Pierde foco -> soltar
    window.addEventListener('blur', () => { this.held = false; });
  }

  // Consume el flag de "pressed" de este frame.
  consumePressed() {
    const p = this._pressedQueue;
    this._pressedQueue = false;
    return p;
  }
  consumeReleased() {
    const r = this._releasedQueue;
    this._releasedQueue = false;
    return r;
  }
  reset() {
    this.held = false;
    this._pressedQueue = false;
    this._releasedQueue = false;
  }
}
