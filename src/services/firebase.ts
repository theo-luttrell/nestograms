import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, Auth, User } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'mock-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'mock.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'mock-project',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'mock.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '000000',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:000000:web:000000',
};

export const isFirebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== 'mock-key'
);

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.warn('Firebase initialization error (using fallback mode):', error);
}

export { app, auth, db };

export async function ensureAnonymousAuth(): Promise<User | null> {
  if (!auth) return null;
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth!, async (user) => {
      unsubscribe();
      if (user) {
        resolve(user);
      } else {
        try {
          const cred = await signInAnonymously(auth!);
          resolve(cred.user);
        } catch (err) {
          console.warn('Anonymous auth failed:', err);
          resolve(null);
        }
      }
    });
  });
}
