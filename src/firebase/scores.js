// Scores y leaderboard en Firestore (+ fallback local).
import {
  doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs, serverTimestamp, increment,
} from 'firebase/firestore';
import { db } from './config.js';
import { authState } from './auth.js';
import { store } from '../utils/helpers.js';
import { STORAGE_KEYS, POINTS } from '../utils/constants.js';

const LOCAL_SCORES = 'geoemir_scores_v1';

// Calcula los puntos de una partida completada.
export function computeRunPoints({ gems = 0, coins = 0, difficulty = 'normal' }) {
  return gems * POINTS.gem + coins * POINTS.coin + (POINTS.completion[difficulty] || 100);
}

// Total local de puntos (suma del mejor por nivel). { total, perLevel }
export function getLocalPoints() {
  return store.get(STORAGE_KEYS.points, { total: 0, perLevel: {}, completions: 0 });
}

// Otorga puntos por completar un nivel (solo la mejora respecto al mejor previo,
// para evitar farmeo al repetir). Actualiza local y Firestore (stats.points).
export async function awardPoints({ levelId, gems = 0, coins = 0, difficulty = 'normal' }) {
  const runPoints = computeRunPoints({ gems, coins, difficulty });
  const lp = getLocalPoints();
  const prev = lp.perLevel[levelId] || 0;
  const firstTime = prev === 0;
  const delta = Math.max(0, runPoints - prev);
  if (delta > 0) { lp.perLevel[levelId] = runPoints; lp.total += delta; }
  if (firstTime) lp.completions = (lp.completions || 0) + 1;
  store.set(STORAGE_KEYS.points, lp);

  const user = authState.user;
  if (user && !user.local && delta >= 0) {
    try {
      await setDoc(doc(db, 'users', user.uid), {
        displayName: authState.profile?.displayName || 'Player',
        stats: { points: increment(delta), completions: increment(firstTime ? 1 : 0) },
        lastActive: serverTimestamp(),
      }, { merge: true });
    } catch (e) { console.warn('awardPoints falló:', e.code); }
  }
  return { runPoints, delta, total: lp.total };
}

// Ranking global de jugadores por puntos.
export async function getPlayerRanking(top = 50) {
  try {
    const q = query(collection(db, 'users'), orderBy('stats.points', 'desc'), limit(top));
    const snap = await getDocs(q);
    const rows = [];
    snap.forEach((d) => { const v = d.data(); rows.push({ uid: d.id, displayName: v.displayName || 'Player', points: v.stats?.points || 0, completions: v.stats?.completions || 0 }); });
    return rows;
  } catch (e) { console.warn('getPlayerRanking falló:', e.code); return []; }
}

// Envía/actualiza el mejor resultado del usuario en un nivel.
export async function submitScore({ levelId, percent, completed, attempts, coins = [] }) {
  // Guarda local siempre (progreso offline).
  const local = store.get(LOCAL_SCORES, {});
  const prev = local[levelId] || { bestPercent: 0, completed: false, coins: [] };
  local[levelId] = {
    bestPercent: Math.max(prev.bestPercent, percent),
    completed: prev.completed || completed,
    attempts: (prev.attempts || 0) + 1,
    coins: [...new Set([...(prev.coins || []), ...coins])],
  };
  store.set(LOCAL_SCORES, local);

  const user = authState.user;
  if (!user || user.local) return { local: true };

  try {
    const ref = doc(db, 'scores', levelId, 'entries', user.uid);
    const snap = await getDoc(ref);
    const existing = snap.exists() ? snap.data() : { bestPercent: 0, attempts: 0 };
    if (percent < (existing.bestPercent || 0) && !completed) return { skipped: true };
    await setDoc(ref, {
      userId: user.uid,
      displayName: authState.profile?.displayName || 'Player',
      bestPercent: Math.max(existing.bestPercent || 0, percent),
      completed: existing.completed || completed,
      attempts: (existing.attempts || 0) + 1,
      secretCoins: Math.max(existing.secretCoins || 0, coins.length),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return { ok: true };
  } catch (e) {
    console.warn('submitScore falló (se conserva local):', e.code);
    return { error: e.code };
  }
}

export function getLocalScore(levelId) {
  return store.get(LOCAL_SCORES, {})[levelId] || null;
}
export function getAllLocalScores() { return store.get(LOCAL_SCORES, {}); }

// Top N del leaderboard de un nivel.
export async function getLeaderboard(levelId, top = 50) {
  try {
    const q = query(collection(db, 'scores', levelId, 'entries'), orderBy('bestPercent', 'desc'), limit(top));
    const snap = await getDocs(q);
    const rows = [];
    snap.forEach((d) => rows.push(d.data()));
    return rows;
  } catch (e) {
    console.warn('getLeaderboard falló:', e.code);
    return [];
  }
}
