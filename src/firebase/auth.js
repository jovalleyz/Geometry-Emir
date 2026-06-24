// Autenticación: Google + Anónimo, con observador de estado.
import {
  GoogleAuthProvider, signInWithPopup, signInAnonymously,
  onAuthStateChanged, signOut as fbSignOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config.js';
import { store } from '../utils/helpers.js';
import { STORAGE_KEYS } from '../utils/constants.js';

export const authState = { user: null, profile: null };
const listeners = new Set();
export function onAuth(cb) { listeners.add(cb); if (authState.user !== undefined) cb(authState); return () => listeners.delete(cb); }
function emit() { for (const cb of listeners) cb(authState); }

onAuthStateChanged(auth, async (user) => {
  authState.user = user;
  if (user) {
    authState.profile = await ensureProfile(user);
  } else {
    authState.profile = null;
  }
  emit();
});

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const res = await signInWithPopup(auth, provider);
  return res.user;
}

export async function signInGuest() {
  try {
    const res = await signInAnonymously(auth);
    return res.user;
  } catch (e) {
    // Fallback: invitado 100% local si el método anónimo no está habilitado.
    console.warn('Anonymous auth no disponible, usando invitado local:', e.code);
    let id = store.get(STORAGE_KEYS.guestId);
    if (!id) { id = 'local_' + Math.random().toString(36).slice(2, 10); store.set(STORAGE_KEYS.guestId, id); }
    authState.user = { uid: id, isAnonymous: true, local: true, displayName: 'Invitado' };
    authState.profile = { displayName: 'Invitado', stats: emptyStats() };
    emit();
    return authState.user;
  }
}

export function signOut() { return fbSignOut(auth); }

export function currentUser() { return authState.user; }

function emptyStats() { return { totalAttempts: 0, levelsCompleted: 0, stars: 0, orbs: 0, coins: 0 }; }

async function ensureProfile(user) {
  if (user.local) return authState.profile;
  const ref = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) return snap.data();
    const profile = {
      displayName: user.displayName || `Player${user.uid.slice(0, 5)}`,
      avatarUrl: user.photoURL || '',
      iconKit: { cube: 0, color1: '#00FFCC', color2: '#FF00AA' },
      stats: emptyStats(),
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
    };
    await setDoc(ref, profile);
    return profile;
  } catch (e) {
    console.warn('No se pudo cargar/crear perfil:', e.code);
    return { displayName: user.displayName || 'Player', stats: emptyStats() };
  }
}

export async function updateProfileStats(patch) {
  const user = authState.user;
  if (!user || user.local) return;
  try {
    await setDoc(doc(db, 'users', user.uid), { ...patch, lastActive: serverTimestamp() }, { merge: true });
  } catch (e) { console.warn('updateProfileStats falló:', e.code); }
}
