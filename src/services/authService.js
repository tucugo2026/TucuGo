import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "firebase/firestore";
import { auth, db } from "./firebase.js";

export async function loginUser(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function registerUser({
  name,
  email,
  password,
  role,
  city,
  phone = "",
  vehicleType = "",
  licensePlate = ""
}) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  const now = new Date();
  const freeMonthEnd = new Date();
  freeMonthEnd.setDate(now.getDate() + 30);

  const perfilBase = {
    uid: user.uid,
    nombre: name,
    email,
    rol: role,
    ciudad: city,
    telefono: phone,
    aprobado: role === "conductor" ? false : true,
    creado: serverTimestamp(),
    createdAt: now.toISOString()
  };

  await setDoc(doc(db, "usuarios", user.uid), perfilBase);

  if (role === "conductor") {
    await setDoc(doc(db, "conductores", user.uid), {
      uid: user.uid,
      nombre: name,
      email,
      telefono: phone,
      city,
      ciudad: city,

      estado: "pendiente",
      status: "pendiente",
      aprobado: false,

      vehicleType: vehicleType || "",
      vehiculoTipo: vehicleType || "",
      tipoVehiculo: vehicleType || "",

      patente: licensePlate || "",

      fechaRegistro: now.toISOString(),
      finPeriodoGratis: freeMonthEnd.toISOString(),

      suscripcionActiva: true,
      planActivo: true,
      plan: "trial",
      planMensualUSD: 3,
      ultimoPago: null,

      viajeActualId: "",
      ubicacion: null,

      createdAt: serverTimestamp(),
      actualizadoEn: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  return user;
}

export async function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

export async function logoutUser() {
  return signOut(auth);
}

export function subscribeAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function getUserProfile(uid) {
  if (!uid) return null;

  const userRef = doc(db, "usuarios", uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) return null;

  const profile = {
    id: userSnap.id,
    uid,
    ...userSnap.data()
  };

  if (profile.rol === "conductor") {
    const conductorRef = doc(db, "conductores", uid);
    const conductorSnap = await getDoc(conductorRef);

    if (conductorSnap.exists()) {
      return {
        ...profile,
        ...conductorSnap.data(),
        id: conductorSnap.id,
        uid
      };
    }
  }

  return profile;
}

export async function approveDriver(uid) {
  if (!uid) throw new Error("UID requerido");

  await updateDoc(doc(db, "usuarios", uid), {
    aprobado: true
  });

  await updateDoc(doc(db, "conductores", uid), {
    aprobado: true,
    estado: "disponible",
    status: "disponible",
    actualizadoEn: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function rejectDriver(uid) {
  if (!uid) throw new Error("UID requerido");

  await updateDoc(doc(db, "usuarios", uid), {
    aprobado: false
  });

  await updateDoc(doc(db, "conductores", uid), {
    aprobado: false,
    estado: "rechazado",
    status: "rechazado",
    actualizadoEn: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateDriverSubscription(uid, data = {}) {
  if (!uid) throw new Error("UID requerido");

  await updateDoc(doc(db, "conductores", uid), {
    ...data,
    actualizadoEn: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}