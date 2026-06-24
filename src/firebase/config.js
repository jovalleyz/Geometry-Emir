// Configuración pública del cliente Firebase (proyecto geometry-emir).
// Nota: estas claves son del SDK web y son públicas por diseño; la seguridad
// real vive en las Security Rules (firestore.rules / storage.rules) y App Check.
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyCPVW7QOYIHLKpuL-Ym7QuabxYnR5GBJs0',
  authDomain: 'geometry-emir.firebaseapp.com',
  projectId: 'geometry-emir',
  storageBucket: 'geometry-emir.firebasestorage.app',
  messagingSenderId: '360421401467',
  appId: '1:360421401467:web:1f32c0d99a2f0e7ece53de',
  measurementId: 'G-QFHWP08KMV',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
