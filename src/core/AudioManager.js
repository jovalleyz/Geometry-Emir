// AudioManager — síntesis procedural de música electrónica sincronizada al BPM
// y efectos de sonido, todo con Web Audio API (cero assets, cero copyright).
import { store } from '../utils/helpers.js';
import { STORAGE_KEYS } from '../utils/constants.js';

// Escalas (semitonos sobre la tónica).
const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
};
const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    const s = store.get(STORAGE_KEYS.settings, {});
    this.musicVol = s.musicVol ?? 0.55;
    this.sfxVol = s.sfxVol ?? 0.7;

    // Scheduler
    this.bpm = 140;
    this.scale = SCALES.minor;
    this.rootMidi = 45; // A2
    this.playing = false;
    this.next16th = 0;       // tiempo (ctx) del próximo semicorchea
    this.step = 0;           // índice de step global
    this.lookahead = 0.025;  // s
    this.scheduleAhead = 0.12; // s
    this._timer = null;
    this.beatTime = 0;       // timestamp del último beat (para pulso visual)
    this.onBeat = null;
    this.seed = 1;

    // Reproducción de tracks reales.
    this.mode = 'procedural';   // 'track' | 'procedural'
    this._buffers = new Map();  // url -> AudioBuffer (cache)
    this.trackSource = null;
    this.analyser = null;
    this._beatRaf = null;
    this._musicToken = 0;
  }

  _ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 1;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicVol;
    this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxVol;
    this.sfxGain.connect(this.master);
  }

  // Debe llamarse tras un gesto del usuario.
  resume() {
    this._ensure();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  // Suspende el contexto (al pasar a segundo plano) para no consumir en background.
  suspend() {
    try { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); } catch { /* noop */ }
  }

  setMusicVol(v) { this.musicVol = v; if (this.musicGain) this.musicGain.gain.value = v; this._persist(); }
  setSfxVol(v) { this.sfxVol = v; if (this.sfxGain) this.sfxGain.gain.value = v; this._persist(); }
  _persist() {
    const s = store.get(STORAGE_KEYS.settings, {});
    store.set(STORAGE_KEYS.settings, { ...s, musicVol: this.musicVol, sfxVol: this.sfxVol });
  }

  _rng() { // PRNG determinista por seed (para que cada nivel suene consistente)
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  // Punto de entrada: reproduce un track real si se indica `track`, si no
  // recurre al sintetizador procedural (también si el track falla en cargar).
  startMusic({ bpm = 140, scale = 'minor', root = 45, seed = 1, track = null } = {}) {
    this._ensure();
    this.resume();
    this.bpm = bpm;
    this._musicToken += 1;
    const token = this._musicToken;
    this.stopMusic();
    if (track) {
      this._playTrack(track, token).catch((e) => {
        console.warn('Track no disponible, usando audio procedural:', e?.message || e);
        if (this._musicToken === token) this.startProcedural({ bpm, scale, root, seed });
      });
    } else {
      this.startProcedural({ bpm, scale, root, seed });
    }
  }

  startProcedural({ bpm = 140, scale = 'minor', root = 45, seed = 1 } = {}) {
    this.mode = 'procedural';
    this.bpm = bpm;
    this.scale = SCALES[scale] || SCALES.minor;
    this.rootMidi = root;
    this.seed = seed || 1;
    this.step = 0;
    this.playing = true;
    this.next16th = this.ctx.currentTime + 0.08;
    this._buildPatterns();
    this._scheduler();
  }

  async _playTrack(url, token) {
    let buf = this._buffers.get(url);
    if (!buf) {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arr = await res.arrayBuffer();
      buf = await this.ctx.decodeAudioData(arr);
      this._buffers.set(url, buf);
    }
    if (this._musicToken !== token) return; // se pidió otra cosa mientras cargaba
    this.mode = 'track';
    this.playing = true;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    src.connect(this.analyser);
    this.analyser.connect(this.musicGain);
    src.start(0);
    this.trackSource = src;
    this._startBeatDetect();
  }

  // Detección de beats por energía de graves -> pulso visual sincronizado a cualquier track.
  _startBeatDetect() {
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    let avg = 0, last = 0;
    const tick = () => {
      if (this.mode !== 'track' || !this.analyser) return;
      this.analyser.getByteFrequencyData(data);
      let e = 0; for (let i = 1; i < 10; i++) e += data[i]; e /= 9;
      avg = avg * 0.92 + e * 0.08;
      const now = performance.now();
      if (e > avg * 1.22 && e > 38 && now - last > 210) { last = now; this.beatTime = now; this.onBeat?.(); }
      this._beatRaf = requestAnimationFrame(tick);
    };
    this._beatRaf = requestAnimationFrame(tick);
  }

  stopMusic() {
    this.playing = false;
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    if (this._beatRaf) { cancelAnimationFrame(this._beatRaf); this._beatRaf = null; }
    if (this.trackSource) { try { this.trackSource.stop(); } catch { /* ya parado */ } this.trackSource.disconnect(); this.trackSource = null; }
    this.analyser = null;
  }

  _buildPatterns() {
    // 16 steps (1 compás) generados por seed: bajo, arpegio y melodía.
    const deg = this.scale;
    const pick = () => deg[Math.floor(this._rng() * deg.length)];
    this.bassPat = [];
    this.arpPat = [];
    this.leadPat = [];
    for (let i = 0; i < 16; i++) {
      this.bassPat.push(i % 4 === 0 ? this.rootMidi + (i % 8 === 0 ? 0 : pick()) : (this._rng() < 0.25 ? this.rootMidi + pick() : null));
      this.arpPat.push(this.rootMidi + 12 + deg[(i) % deg.length]);
      this.leadPat.push(this._rng() < 0.4 ? this.rootMidi + 24 + pick() : null);
    }
  }

  _scheduler() {
    if (!this.playing) return;
    const sixteenth = 60 / this.bpm / 4;
    while (this.next16th < this.ctx.currentTime + this.scheduleAhead) {
      this._scheduleStep(this.step, this.next16th);
      this.next16th += sixteenth;
      this.step++;
    }
    this._timer = setTimeout(() => this._scheduler(), this.lookahead * 1000);
  }

  _scheduleStep(step, time) {
    const s = step % 16;
    const sixteenth = 60 / this.bpm / 4;
    // Kick en negras
    if (s % 4 === 0) this._kick(time);
    // Snare/clap en el 2 y 4
    if (s === 4 || s === 12) this._snare(time);
    // Hi-hat en cada semicorchea (con variación)
    if (s % 2 === 1 || this._rng() < 0.3) this._hat(time, s % 4 === 2 ? 0.4 : 0.2);
    // Bajo
    if (this.bassPat[s] != null) this._bass(midiToFreq(this.bassPat[s]), time, sixteenth * 2);
    // Arpegio
    if (s % 2 === 0) this._arp(midiToFreq(this.arpPat[s]), time, sixteenth * 0.9);
    // Lead
    if (this.leadPat[s] != null) this._lead(midiToFreq(this.leadPat[s]), time, sixteenth * 1.5);

    // Pulso visual al beat (negra)
    if (s % 4 === 0) {
      const delay = Math.max(0, (time - this.ctx.currentTime) * 1000);
      setTimeout(() => { this.beatTime = performance.now(); this.onBeat?.(); }, delay);
    }
  }

  // --- Instrumentos ---
  _env(node, time, dur, peak, attack = 0.005, release = 0.05) {
    const g = node.gain;
    g.cancelScheduledValues(time);
    g.setValueAtTime(0.0001, time);
    g.exponentialRampToValueAtTime(peak, time + attack);
    g.exponentialRampToValueAtTime(0.0001, time + dur + release);
  }

  _kick(time) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.frequency.setValueAtTime(150, time);
    o.frequency.exponentialRampToValueAtTime(45, time + 0.12);
    g.gain.setValueAtTime(0.9, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
    o.connect(g).connect(this.musicGain);
    o.start(time); o.stop(time + 0.2);
  }
  _snare(time) {
    const noise = this._noiseBuffer(0.2);
    const src = this.ctx.createBufferSource(); src.buffer = noise;
    const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1500;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.5, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    src.connect(hp).connect(g).connect(this.musicGain);
    src.start(time); src.stop(time + 0.2);
  }
  _hat(time, amp) {
    const noise = this._noiseBuffer(0.05);
    const src = this.ctx.createBufferSource(); src.buffer = noise;
    const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(amp * 0.4, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    src.connect(hp).connect(g).connect(this.musicGain);
    src.start(time); src.stop(time + 0.06);
  }
  _bass(freq, time, dur) {
    const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600;
    const g = this.ctx.createGain();
    this._env(g, time, dur, 0.35, 0.005, 0.05);
    o.connect(lp).connect(g).connect(this.musicGain);
    o.start(time); o.stop(time + dur + 0.1);
  }
  _arp(freq, time, dur) {
    const o = this.ctx.createOscillator(); o.type = 'square'; o.frequency.value = freq;
    const g = this.ctx.createGain();
    this._env(g, time, dur, 0.12, 0.004, 0.04);
    o.connect(g).connect(this.musicGain);
    o.start(time); o.stop(time + dur + 0.08);
  }
  _lead(freq, time, dur) {
    const o = this.ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = freq;
    const g = this.ctx.createGain();
    this._env(g, time, dur, 0.18, 0.006, 0.12);
    o.connect(g).connect(this.musicGain);
    o.start(time); o.stop(time + dur + 0.15);
  }

  _noiseBuffer(dur) {
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  // --- SFX de juego ---
  sfxJump() { this._blip(520, 0.08, 'square', 0.18); }
  sfxOrb() { this._sweep(400, 900, 0.12, 'sine', 0.22); }
  sfxPad() { this._sweep(300, 1200, 0.18, 'triangle', 0.25); }
  sfxPortal() { this._sweep(200, 1400, 0.3, 'sawtooth', 0.18); }
  sfxCoin() {
    this._blip(880, 0.07, 'square', 0.2);
    setTimeout(() => this._blip(1320, 0.1, 'square', 0.2), 70);
  }
  sfxDeath() {
    this._ensure();
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(420, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.4);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    o.connect(g).connect(this.sfxGain); o.start(t); o.stop(t + 0.5);
    const noise = this._noiseBuffer(0.4);
    const src = this.ctx.createBufferSource(); src.buffer = noise;
    const ng = this.ctx.createGain(); ng.gain.setValueAtTime(0.25, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    src.connect(ng).connect(this.sfxGain); src.start(t); src.stop(t + 0.4);
  }
  sfxComplete() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => setTimeout(() => this._blip(f, 0.18, 'triangle', 0.25), i * 110));
  }

  _blip(freq, dur, type = 'sine', amp = 0.2) {
    this._ensure(); this.resume();
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(amp, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.sfxGain); o.start(t); o.stop(t + dur + 0.02);
  }
  _sweep(f1, f2, dur, type, amp) {
    this._ensure(); this.resume();
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(amp, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.sfxGain); o.start(t); o.stop(t + dur + 0.02);
  }
}

export const audio = new AudioManager();
