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
    music: '/audio/track-stereo.ogg', theme: 'city',
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
    music: '/audio/track-neon.ogg', theme: 'synthwave',
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
    music: '/audio/track-voltage.ogg', theme: 'space',
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
    music: '/audio/track-gravity.ogg', theme: 'cave',
    speed: 1, startMode: MODE.CUBE, length: 236, objects: b.build(),
  };
}

// --- Nivel 5: City Lights (Normal, Cube + Ball) ---
function cityLights() {
  const b = new LB();
  b.spike(14).spike(24).spikes(34, 2).spike(46);
  b.platform(56, 2, 2).coin(57, 4, 0).spike(66).orb(74, 3).spike(82);
  b.mode(92, MODE.BALL, 3); b.block(98, 6, 36, 1);
  b.spike(106).spike(106, 6, 'down'); b.gravity(116, -1, 4);
  b.spike(124, 6, 'down').spike(132); b.gravity(140, 1, 4);
  b.coin(148, 2, 1);
  b.mode(156, MODE.CUBE, 3);
  b.spike(166).spikes(176, 2).orb(184, 3).spike(192).spike(202);
  return {
    id: 'city-lights', name: 'City Lights', difficulty: 'normal', bpm: 150,
    audio: { scale: 'minor', root: 45, seed: 55 },
    colors: { bg: '#0a0a2e', ground: '#2a2a6b', accent1: '#00FFCC', accent2: '#FF8C3A' },
    music: '/audio/track-retro.ogg', theme: 'city',
    speed: 1, startMode: MODE.CUBE, length: 214, objects: b.build(),
  };
}

// --- Nivel 6: Stardust (Hard, Cube + Ship + Wave) ---
function stardust() {
  const b = new LB();
  b.spike(14).spike(24).spikes(34, 2);
  b.mode(44, MODE.SHIP, 3); b.block(50, 9, 42, 1);
  b.spike(60).spike(66, 8, 'down').spike(78).spike(84, 8, 'down').coin(94, 5, 0);
  b.mode(104, MODE.WAVE, 3); b.block(110, 9, 46, 1);
  b.spike(120).spike(126, 8, 'down').spike(138).spike(148, 8, 'down');
  b.mode(160, MODE.CUBE, 3);
  b.spike(170).spikes(180, 2).orb(188, 3).spike(198).spike(208).coin(214, 2, 1);
  return {
    id: 'stardust', name: 'Stardust', difficulty: 'hard', bpm: 165,
    audio: { scale: 'dorian', root: 43, seed: 71 },
    colors: { bg: '#05021a', ground: '#2a1a5a', accent1: '#7ad0ff', accent2: '#FF00AA' },
    music: '/audio/track-stardust.ogg', theme: 'space',
    speed: 1, startMode: MODE.CUBE, length: 224, objects: b.build(),
  };
}

// --- Nivel 7: Retrowave (Harder, Cube + Ship + UFO) ---
function retrowave() {
  const b = new LB();
  b.spikes(12, 2).spike(22).orb(30, 3).spike(38).spike(48);
  b.mode(58, MODE.SHIP, 3).speed(58, 2, 5); b.block(64, 9, 44, 1);
  b.spike(76).spike(82, 8, 'down').spike(96).coin(106, 5, 0);
  b.mode(114, MODE.UFO, 3).speed(114, 1, 5); b.block(120, 9, 30, 1);
  b.spike(128).spike(134, 8, 'down').spike(144);
  b.mode(156, MODE.CUBE, 3);
  b.spike(166).spikes(176, 2).orb(184, 3).spike(192).spikes(202, 2).spike(214);
  return {
    id: 'retrowave', name: 'Retrowave', difficulty: 'harder', bpm: 178,
    audio: { scale: 'phrygian', root: 41, seed: 123 },
    colors: { bg: '#2a0a4a', ground: '#5a1a6b', accent1: '#FFD83A', accent2: '#FF00AA' },
    music: '/audio/track-tidal.ogg', theme: 'synthwave',
    speed: 1, startMode: MODE.CUBE, length: 230, objects: b.build(),
  };
}

// --- Nivel 8: Deep Cavern (Insane, todos + gravedad) ---
function deepCavern() {
  const b = new LB();
  b.spike(12).spikes(20, 2).spike(30).spike(40);
  b.mode(50, MODE.BALL, 3); b.block(56, 6, 32, 1);
  b.spike(64).spike(64, 6, 'down').gravity(74, -1, 4).spike(82, 6, 'down').gravity(92, 1, 4).spike(100);
  b.mode(110, MODE.WAVE, 3); b.block(116, 9, 40, 1);
  b.spike(124).spike(130, 8, 'down').spike(142).spike(150, 8, 'down').coin(156, 5, 0);
  b.mode(164, MODE.UFO, 3); b.block(170, 9, 26, 1);
  b.spike(178).spike(184, 8, 'down').spike(192);
  b.mode(202, MODE.CUBE, 3);
  b.spike(212).spikes(222, 2).orb(230, 3).spike(238).spike(248);
  return {
    id: 'deep-cavern', name: 'Deep Cavern', difficulty: 'insane', bpm: 190,
    audio: { scale: 'phrygian', root: 38, seed: 222 },
    colors: { bg: '#0a1a14', ground: '#1a5a3a', accent1: '#00FFAA', accent2: '#B66BFF' },
    music: '/audio/track-final.ogg', theme: 'cave',
    speed: 1, startMode: MODE.CUBE, length: 262, objects: b.build(),
  };
}

// --- Nivel 9: Tidal (Hard, UFO + Ship) ---
function tidal() {
  const b = new LB();
  b.spike(14).spike(24).spikes(34, 2).spike(46);
  b.mode(56, MODE.UFO, 3); b.block(62, 9, 38, 1);
  b.spike(72).spike(78, 8, 'down').spike(92).coin(100, 5, 0);
  b.mode(110, MODE.SHIP, 3); b.block(116, 9, 42, 1);
  b.spike(126).spike(132, 8, 'down').spike(146).spike(152, 8, 'down');
  b.mode(164, MODE.CUBE, 3);
  b.spike(174).spikes(184, 2).orb(192, 3).spike(200).spike(210).coin(216, 2, 1);
  return {
    id: 'tidal', name: 'Tidal', difficulty: 'hard', bpm: 160,
    audio: { scale: 'dorian', root: 45, seed: 88 },
    colors: { bg: '#102a6a', ground: '#0a4a6b', accent1: '#7ad0ff', accent2: '#FFE08A' },
    music: '/audio/track-voltage.ogg', theme: 'ocean',
    speed: 1, startMode: MODE.CUBE, length: 226, objects: b.build(),
  };
}

// --- Nivel 10: Final Rush (Demon, todos los modos) ---
function finalRush() {
  const b = new LB();
  b.spike(12).spikes(20, 2).spike(30).orb(38, 3).spike(46).spike(56);
  b.mode(66, MODE.SHIP, 3).speed(66, 2, 5); b.block(72, 9, 46, 1);
  b.spike(86).spike(92, 8, 'down').spike(108).coin(116, 5, 0);
  b.mode(124, MODE.WAVE, 3).speed(124, 1, 5); b.block(130, 9, 40, 1);
  b.spike(140).spike(146, 8, 'down').spike(158).spike(166, 8, 'down');
  b.mode(176, MODE.BALL, 3); b.block(182, 6, 26, 1);
  b.spike(190).gravity(198, -1, 4).spike(206, 6, 'down').gravity(214, 1, 4).spike(222);
  b.mode(232, MODE.CUBE, 3);
  b.spike(242).spikes(252, 2).orb(260, 3).spike(268).spike(278).coin(284, 2, 1);
  return {
    id: 'final-rush', name: 'Final Rush', difficulty: 'demon', bpm: 200,
    audio: { scale: 'phrygian', root: 36, seed: 666 },
    colors: { bg: '#1a0014', ground: '#5a0a2a', accent1: '#FF3344', accent2: '#FFD83A' },
    music: '/audio/track-gravity.ogg', theme: 'space',
    speed: 1, startMode: MODE.CUBE, length: 296, objects: b.build(),
  };
}

// Añade gemas coleccionables (puntos) a lo largo del nivel, evitando spikes.
function withGems(level) {
  const spikeX = new Set();
  for (const o of level.objects) if (o.type === 'spike' || o.type === 'spike_s') {
    for (let dx = -2; dx <= 2; dx++) spikeX.add(Math.round(o.x) + dx);
  }
  for (let x = 10; x < level.length - 6; x += 13) {
    if (spikeX.has(x)) continue;
    level.objects.push({ type: 'gem', x, y: 1 });
  }
  return level;
}

export const LEVELS = [
  stereoRush(), neonPulse(), voltage(), gravityStorm(), cityLights(),
  stardust(), retrowave(), deepCavern(), tidal(), finalRush(),
].map(withGems);
export const LEVELS_BY_ID = Object.fromEntries(LEVELS.map((l) => [l.id, l]));
