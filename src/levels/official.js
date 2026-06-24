// Niveles oficiales de Geometry-Emir. Diseñados para ser superables:
// separación de obstáculos acorde al arco de salto (~6 tiles de alcance, ~3 de alto).
import { LB } from './builder.js';
import { MODE } from '../utils/constants.js';

// --- Nivel 1: Stereo Rush (Auto/Easy, solo Cube) ---
function stereoRush() {
  const b = new LB();
  // Intro suave.
  b.spike(16).spike(27).spike(38);
  // Plataforma con moneda.
  b.platform(48, 2, 3).coin(49, 3, 0);
  b.spike(60).spike(61); // doble
  // Escaloncito.
  b.block(72, 0, 1, 1).spike(78);
  b.platform(88, 2, 2).spike(96);
  // Orbe de salto sobre un grupo.
  b.spikes(106, 2).orb(112, 3, 'yellow');
  b.spike(122).spike(132);
  b.platform(142, 2, 2).coin(143, 4, 1);
  b.spike(152).spike(160).spike(168);
  return {
    id: 'stereo-rush', name: 'Stereo Rush', difficulty: 'easy', bpm: 140,
    audio: { scale: 'minor', root: 45, seed: 7 },
    colors: { bg: '#000820', ground: '#1A3A6B', accent1: '#00FFCC', accent2: '#FF00AA' },
    speed: 1, startMode: MODE.CUBE, length: 182, objects: b.build(),
  };
}

// --- Nivel 2: Neon Pulse (Normal, Cube + Ship) ---
function neonPulse() {
  const b = new LB();
  b.spike(14).spike(24).spikes(34, 2);
  b.platform(46, 2, 2).coin(47, 4, 0);
  b.spike(58).orb(66, 3, 'yellow').spike(74);
  // Portal a nave: corredor.
  b.mode(86, MODE.SHIP, 3);
  // Corredor de nave (suelo y techo amplios).
  b.block(92, 8, 28, 1);              // techo
  b.spike(100).spike(112);            // spikes en el suelo
  b.spike(106, 7, 'down');            // spike colgando del techo (clearance amplio)
  b.coin(116, 5, 1);
  // Volver a cube.
  b.mode(124, MODE.CUBE, 3);
  b.spike(134).spikes(144, 2).orb(152, 3, 'yellow').spike(160);
  b.platform(170, 2, 2).spike(180).spike(190);
  return {
    id: 'neon-pulse', name: 'Neon Pulse', difficulty: 'normal', bpm: 160,
    audio: { scale: 'dorian', root: 43, seed: 21 },
    colors: { bg: '#0a0024', ground: '#3a1a6b', accent1: '#00FFCC', accent2: '#FF00AA' },
    speed: 1, startMode: MODE.CUBE, length: 204, objects: b.build(),
  };
}

// --- Nivel 3: Voltage (Hard, Cube + Ship + Ball + gravedad) ---
function voltage() {
  const b = new LB();
  b.spike(12).spikes(20, 2).spike(30);
  b.platform(40, 2, 2).coin(41, 4, 0).spike(50);
  // Ball + gravedad.
  b.mode(60, MODE.BALL, 3);
  b.block(66, 6, 30, 1);             // techo para rodar invertido
  b.spike(72).spike(72, 6, 'down');  // elige arriba o abajo
  b.gravity(80, -1, 4);
  b.spike(88, 6, 'down').spike(96);
  b.gravity(102, 1, 4);
  // Nave rápida.
  b.mode(112, MODE.SHIP, 3).speed(112, 2, 5);
  b.block(118, 9, 40, 1);
  b.spike(128).spike(140).spike(134, 8, 'down');
  b.coin(150, 5, 1);
  // Cube final.
  b.mode(162, MODE.CUBE, 3).speed(162, 1, 5);
  b.spike(172).spikes(182, 2).orb(190, 3, 'yellow').spike(198).spike(208);
  return {
    id: 'voltage', name: 'Voltage', difficulty: 'hard', bpm: 175,
    audio: { scale: 'phrygian', root: 41, seed: 99 },
    colors: { bg: '#1a0014', ground: '#6b1a3a', accent1: '#FFD700', accent2: '#FF00AA' },
    speed: 1, startMode: MODE.CUBE, length: 222, objects: b.build(),
  };
}

// --- Nivel 4: Gravity Storm (Harder, Cube + Wave + UFO + Ball) ---
function gravityStorm() {
  const b = new LB();
  b.spikes(12, 2).spike(22).orb(30, 3, 'yellow').spike(38);
  // Wave.
  b.mode(48, MODE.WAVE, 3);
  b.block(54, 9, 36, 1);
  b.spike(62).spike(70, 8, 'down').spike(78).coin(86, 5, 0);
  // UFO.
  b.mode(94, MODE.UFO, 3);
  b.block(100, 9, 30, 1);
  b.spike(108).spike(118).spike(112, 8, 'down');
  // Ball con gravedad.
  b.mode(132, MODE.BALL, 3);
  b.block(138, 6, 28, 1);
  b.gravity(146, -1, 4).spike(152, 6, 'down').gravity(160, 1, 4).spike(166);
  b.coin(170, 2, 1);
  // Cube final intenso.
  b.mode(178, MODE.CUBE, 3);
  b.spikes(188, 2).orb(196, 3).spike(204).spikes(212, 2).spike(222);
  return {
    id: 'gravity-storm', name: 'Gravity Storm', difficulty: 'harder', bpm: 185,
    audio: { scale: 'phrygian', root: 38, seed: 333 },
    colors: { bg: '#001a14', ground: '#1a6b4a', accent1: '#00FFCC', accent2: '#FFD700' },
    speed: 1, startMode: MODE.CUBE, length: 236, objects: b.build(),
  };
}

export const LEVELS = [stereoRush(), neonPulse(), voltage(), gravityStorm()];
export const LEVELS_BY_ID = Object.fromEntries(LEVELS.map((l) => [l.id, l]));
