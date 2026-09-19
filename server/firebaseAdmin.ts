import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

let adminApp: App | null = null;
let adminDb: Firestore | null = null;

export function initFirebaseAdmin(): { app: App; db: Firestore } {
  if (adminApp && adminDb) {
    return { app: adminApp, db: adminDb };
  }

  let config: any = {};
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (err) {
    console.warn('Could not read firebase-applet-config.json in server:', err);
  }

  const projectId = config.projectId || process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0187981933';
  const databaseId = config.firestoreDatabaseId || process.env.FIRESTORE_DATABASE_ID || 'ai-studio-e6643403-ae73-4828-b432-50211d00b5b6';

  const currentApps = getApps();
  if (!currentApps.length) {
    try {
      adminApp = initializeApp({
        projectId,
      });
    } catch (e) {
      console.warn('Firebase Admin default init notice:', e);
      adminApp = getApp();
    }
  } else {
    adminApp = currentApps[0]!;
  }

  try {
    adminDb = getFirestore(adminApp, databaseId);
  } catch (dbErr) {
    console.warn(`Could not initialize Firestore with databaseId ${databaseId}, falling back to default:`, dbErr);
    adminDb = getFirestore(adminApp);
  }

  return { app: adminApp, db: adminDb };
}

export function getAdminDb(): Firestore {
  if (!adminDb) {
    initFirebaseAdmin();
  }
  return adminDb!;
}

export function getAdminAuth(): Auth {
  if (!adminApp) {
    initFirebaseAdmin();
  }
  return getAuth(adminApp!);
}

export function hasAdminServiceAccount(): boolean {
  return Boolean(
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.FIREBASE_SERVICE_ACCOUNT
  );
}

/**
 * Parses Firestore REST API field structures into regular JS objects
 */
export function parseFirestoreRestFields(fields: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  if (!fields || typeof fields !== 'object') return result;

  for (const [key, value] of Object.entries(fields)) {
    if (!value || typeof value !== 'object') continue;
    if ('stringValue' in value) result[key] = value.stringValue;
    else if ('integerValue' in value) result[key] = parseInt(value.integerValue, 10);
    else if ('doubleValue' in value) result[key] = parseFloat(value.doubleValue);
    else if ('booleanValue' in value) result[key] = value.booleanValue;
    else if ('timestampValue' in value) result[key] = value.timestampValue;
    else if ('arrayValue' in value) {
      result[key] = (value.arrayValue?.values || []).map((v: any) => {
        if (!v || typeof v !== 'object') return v;
        if ('stringValue' in v) return v.stringValue;
        if ('integerValue' in v) return parseInt(v.integerValue, 10);
        if ('mapValue' in v) return parseFirestoreRestFields(v.mapValue?.fields || {});
        return Object.values(v)[0];
      });
    } else if ('mapValue' in value) {
      result[key] = parseFirestoreRestFields(value.mapValue?.fields || {});
    }
  }
  return result;
}

/**
 * Reads a user profile from Firestore using the user's validated ID token via Firestore REST API.
 * This completely avoids gRPC ADC permission errors in sandbox containers.
 */
export async function fetchUserProfileWithToken(uid: string, idToken: string): Promise<any | null> {
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) return null;
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const projectId = config.projectId || 'gen-lang-client-0187981933';
    const databaseId = config.firestoreDatabaseId || 'ai-studio-e6643403-ae73-4828-b432-50211d00b5b6';

    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/users/${uid}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!res.ok) {
      return null;
    }

    const docData = await res.json();
    return parseFirestoreRestFields(docData.fields || {});
  } catch (err) {
    return null;
  }
}

/**
 * Cryptographic token verification strictly via Firebase Admin SDK.
 * NEVER falls back to unverified base64 decoding, regex splitting, or dummy claims.
 * If verification fails, returns null (causing 401 UNAUTHORIZED / INVALID_TOKEN).
 */
export async function verifyFirebaseToken(idToken: string): Promise<{
  uid: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  role?: string;
  companyId?: string;
} | null> {
  if (!idToken || typeof idToken !== 'string') return null;

  try {
    const auth = getAdminAuth();
    // Cryptographically verify token signature and expiry with Firebase
    const decoded = await auth.verifyIdToken(idToken);
    if (!decoded || !decoded.uid) {
      return null;
    }

    return {
      uid: decoded.uid,
      email: decoded.email,
      email_verified: decoded.email_verified,
      name: decoded.name,
      role: (decoded as any).role,
      companyId: (decoded as any).companyId,
    };
  } catch (verifyErr: any) {
    console.error('Firebase Admin verifyIdToken cryptographic verification failed:', verifyErr?.message || verifyErr);
    return null;
  }
}
