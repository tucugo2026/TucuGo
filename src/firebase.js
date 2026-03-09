import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBVu53drRzUbLSIYxdaGlxYK63JrSWIYxc",
  authDomain: "tucugo-37d6c.firebaseapp.com",
  projectId: "tucugo-37d6c",
  storageBucket: "tucugo-37d6c.firebasestorage.app",
  messagingSenderId: "156717270913",
  appId: "1:156717270913:web:1a57d2f998d7b5983a8a80"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;