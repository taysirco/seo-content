/**
 * Firebase Admin SDK — server-side only
 * Uses service account credentials for privileged Firestore access.
 * This bypasses Firestore security rules (needed since rules require auth).
 */
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

function getAdminApp(): App {
  const existing = getApps();
  if (existing.length > 0) return existing[0];

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
  }

  // Fallback: Application Default Credentials (works on Firebase App Hosting)
  return initializeApp({ projectId });
}

let _adminDb: Firestore | null = null;

export function getAdminDb(): Firestore {
  if (!_adminDb) {
    const app = getAdminApp();
    _adminDb = getFirestore(app);
  }
  return _adminDb;
}

export { getAdminApp };
