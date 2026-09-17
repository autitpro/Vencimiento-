import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager, 
  memoryLocalCache,
  getFirestore, 
  Firestore,
  setLogLevel
} from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence internal Firestore connection handshake advisories from polluting console.error
// Application-level errors are explicitly caught and surfaced via try/catch and UI state.
try {
  setLogLevel('silent');
} catch {
  // ignore
}

// 1. Initialize Firebase App (ensure singleton across dev reloads)
const app: FirebaseApp = getApps().length === 0 
  ? initializeApp(firebaseConfig) 
  : getApp();

// 2. Initialize Cloud Firestore with persistent cache and reliable transport
const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';

let firestoreInstance: Firestore;

try {
  // Use persistentLocalCache so all writes are preserved locally in IndexedDB
  // if connection is lost, and automatically synced upon reconnection.
  // experimentalAutoDetectLongPolling detects when long-polling is needed automatically,
  // preventing forced stream termination on initial connection handshakes.
  firestoreInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    }),
    experimentalAutoDetectLongPolling: true,
    experimentalLongPollingOptions: {
      timeoutSeconds: 30
    }
  }, databaseId);
} catch (cacheErr) {
  console.warn('Persistent IndexedDB cache unavailable, using memory cache:', cacheErr);
  try {
    firestoreInstance = initializeFirestore(app, {
      localCache: memoryLocalCache(),
      experimentalAutoDetectLongPolling: true,
      experimentalLongPollingOptions: {
        timeoutSeconds: 30
      }
    }, databaseId);
  } catch {
    firestoreInstance = getFirestore(app, databaseId);
  }
}

// 3. Initialize Firebase Auth
let authInstance: Auth | null = null;
try {
  authInstance = getAuth(app);
} catch (authErr) {
  console.warn('Firebase Auth initialization warning:', authErr);
}

export const db = firestoreInstance;
export const auth = authInstance;
export const googleProvider = new GoogleAuthProvider();
