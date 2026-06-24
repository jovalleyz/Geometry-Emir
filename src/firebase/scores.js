// Scores y leaderboard en Firestore (+ fallback local).
import {
  doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs, serverTimestamp,
} from 'firebase/firestore';
import { db } from './config.js';
import { authState } from './auth.js';
import { store } from '../utils/helpers.js';

const LOCAL_SCORES = 'geoemir_scores_v1';

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
