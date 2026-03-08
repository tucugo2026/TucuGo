import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '../config/appConfig.js';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

export async function initAnalytics() {
  try {
    const supported = await isSupported();
    if (!supported) return null;
    return getAnalytics(app);
  } catch {
    return null;
  }
}

export { app };
