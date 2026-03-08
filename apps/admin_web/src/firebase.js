import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'COMPLETAR',
  authDomain: 'COMPLETAR',
  projectId: 'COMPLETAR',
  storageBucket: 'COMPLETAR',
  messagingSenderId: 'COMPLETAR',
  appId: 'COMPLETAR',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
