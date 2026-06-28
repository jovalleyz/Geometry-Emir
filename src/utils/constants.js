// Constantes globales de Geometry-Emir.

// Paleta neón (de la sección 10.1 del GDD).
export const COLORS = {
  bg: '#000820',
  accent1: '#00FFCC', // cyan — salto, coins
  accent2: '#FF00AA', // magenta — portales, eventos
  accent3: '#FFD700', // amarillo — orbes, rewards
  danger: '#FF3333',  // spikes, muerte
  ground: '#1A3A6B',
  glow: 'rgba(0,255,204,0.4)',
  uiBg: 'rgba(0,8,32,0.9)',
  textPrimary: '#FFFFFF',
  textSecondary: '#8899BB',
};

// Mundo en unidades de "tile". 1 tile = un bloque.
export const ROWS_VISIBLE = 13;       // filas visibles verticalmente
export const GROUND_ROWS = 2.2;       // altura del suelo bajo y=0

// Física (en unidades de tile / segundo).
export const BASE_SPEED = 10.4;       // tiles/seg a velocidad 1x (referencia GD)
export const SPEED_MULT = { 0.5: 0.806, 1: 1, 2: 1.243, 3: 1.502, 4: 1.849 };
export const GRAVITY = 0.876 * 60 * 60 / 100; // ajustado abajo; ver Player

// Multiplicadores de velocidad por portal (índices comunes de GD).
export const SPEEDS = [0.5, 1, 2, 3, 4];

// Dificultades.
export const DIFFICULTY = {
  auto: { label: 'Auto', stars: 1, color: '#3aa0ff' },
  easy: { label: 'Easy', stars: 2, color: '#27d07c' },
  normal: { label: 'Normal', stars: 3, color: '#ffd83a' },
  hard: { label: 'Hard', stars: 4, color: '#ff8c3a' },
  harder: { label: 'Harder', stars: 6, color: '#ff3a6e' },
  insane: { label: 'Insane', stars: 8, color: '#c23aff' },
  demon: { label: 'Demon', stars: 10, color: '#ff2222' },
};

// Modos de juego.
export const MODE = {
  CUBE: 'cube',
  SHIP: 'ship',
  BALL: 'ball',
  WAVE: 'wave',
  UFO: 'ufo',
};

// Tipos de objeto del nivel.
export const OBJ = {
  BLOCK: 'block',
  SPIKE: 'spike',
  SPIKE_S: 'spike_s',     // mini-spike
  PLATFORM: 'platform',   // bloque fino superior
  ORB: 'orb',             // jump ring (requiere tap)
  PAD: 'pad',             // jump pad (automático)
  COIN: 'coin',           // moneda secreta
  GEM: 'gem',             // gema coleccionable (puntos para el ranking)
  PORTAL_MODE: 'portal_mode',
  PORTAL_SPEED: 'portal_speed',
  PORTAL_GRAVITY: 'portal_gravity',
  END: 'end',
};

// Puntuación: por gema, por moneda secreta y bonus de compleción por dificultad.
export const POINTS = {
  gem: 25,
  coin: 150,
  completion: { auto: 50, easy: 100, normal: 200, hard: 350, harder: 500, insane: 750, demon: 1200 },
};

// Rangos de jugador según puntos totales acumulados.
export const RANKS = [
  { min: 0, name: 'Novato', color: '#8899BB' },
  { min: 500, name: 'Aprendiz', color: '#27d07c' },
  { min: 1500, name: 'Corredor', color: '#3aa0ff' },
  { min: 3500, name: 'Pro', color: '#ffd83a' },
  { min: 6500, name: 'Experto', color: '#ff8c3a' },
  { min: 10000, name: 'Maestro', color: '#ff3a6e' },
  { min: 16000, name: 'Leyenda', color: '#c23aff' },
];
export function rankFor(points) {
  let r = RANKS[0];
  for (const x of RANKS) if (points >= x.min) r = x;
  return r;
}

export const STORAGE_KEYS = {
  progress: 'geoemir_progress_v1',
  settings: 'geoemir_settings_v1',
  guestId: 'geoemir_guest_v1',
  avatar: 'geoemir_avatar_v1',
  points: 'geoemir_points_v1',
};
