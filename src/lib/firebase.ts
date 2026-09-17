import { initializeApp, getApps } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let app: any = null;
let dbInstance: any = null;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    }),
  }, firebaseConfig.firestoreDatabaseId || '(default)');
} catch (e) {
  console.warn('Firebase initialization warning (quota exceeded or offline):', e);
  try {
    if (!app && firebaseConfig && firebaseConfig.apiKey) {
      app = initializeApp(firebaseConfig);
    }
    if (app) {
      dbInstance = getFirestore(app);
    }
  } catch (err) {
    console.warn('Fallback Firestore init failed, running in local-only mode:', err);
  }
}

export const db = dbInstance;
