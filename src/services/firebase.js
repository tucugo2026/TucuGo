// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-analytics.js";

// Configuración de tu proyecto
const firebaseConfig = {
  apiKey: "AIzaSyBVu53drRzUbLSIYxdaGlxYK63JrSWIYxc",
  authDomain: "tucugo-37d6c.firebaseapp.com",
  projectId: "tucugo-37d6c",
  storageBucket: "tucugo-37d6c.firebasestorage.app",
  messagingSenderId: "156717270913",
  appId: "1:156717270913:web:1a57d2f998d7b5983a8a80",
  measurementId: "G-GMYQY8EEYS"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Servicios que usará TucuGo
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

export { app, db, auth, analytics };