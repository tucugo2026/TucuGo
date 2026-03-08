import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { auth, db } from './firebase.js';

const USERS_COLLECTION = 'usuarios';

export function subscribeAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function loginUser(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function logoutUser() {
  await signOut(auth);
}

export async function registerUser({ name, email, password, role, city }) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  const needsApproval = role === 'conductor';

  await setDoc(doc(db, USERS_COLLECTION, user.uid), {
    uid: user.uid,
    nombre: name,
    email,
    rol: role,
    ciudad: city,
    activo: !needsApproval,
    aprobado: role === 'conductor' ? false : true,
    estadoSolicitud: role === 'conductor' ? 'pendiente' : 'activo',
    creadoEn: serverTimestamp()
  });

  return user;
}

export async function getUserProfile(uid) {
  const snapshot = await getDoc(doc(db, USERS_COLLECTION, uid));
  if (!snapshot.exists()) return null;
  return snapshot.data();
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

export async function listUsers() {
  const snapshot = await getDocs(collection(db, USERS_COLLECTION));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function listPendingDrivers() {
  const q = query(
    collection(db, USERS_COLLECTION),
    where('rol', '==', 'conductor'),
    where('aprobado', '==', false)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function approveDriver(uid) {
  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    aprobado: true,
    activo: true,
    estadoSolicitud: 'activo'
  });
}

export async function updateUserRole(uid, role) {
  const approved = role === 'conductor' ? false : true;
  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    rol: role,
    aprobado: approved,
    activo: role === 'conductor' ? false : true,
    estadoSolicitud: role === 'conductor' ? 'pendiente' : 'activo'
  });
}
