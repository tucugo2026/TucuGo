import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp
} from "firebase/firestore";
import { auth, db } from "./firebase.js";

const SUPER_ADMIN_EMAILS = [
  "tucugo2026@gmail.com"
];

function applySuperAdmin(profile) {
  if (!profile) return profile;

  const currentEmail =
    auth.currentUser?.email ||
    profile.email ||
    "";

  if (SUPER_ADMIN_EMAILS.includes(String(currentEmail).toLowerCase())) {
    return {
      ...profile,
      rol: "admin",
      aprobado: true,
      superAdmin: true
    };
  }

  return profile;
}

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
  licensePlate = "",
  defaultPaymentMethod = "Transferencia",
  favoriteAddresses = []
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
    activo: true,
    bloqueado: false,
    aprobado: role === "conductor" ? false : true,
    metodoPagoDefault: defaultPaymentMethod,
    direccionesHabituales: Array.isArray(favoriteAddresses) ? favoriteAddresses : [],
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
      estadoSolicitud: "pendiente",
      aprobado: false,
      bloqueado: false,
      motivoBloqueo: "",
      notificacionPendiente: null,
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
      return applySuperAdmin({
        ...profile,
        ...conductorSnap.data(),
        id: conductorSnap.id,
        uid
      });
    }
  }

  return applySuperAdmin(profile);
}

export async function updateUserProfile(uid, data = {}) {
  if (!uid) throw new Error("UID requerido");

  await updateDoc(doc(db, "usuarios", uid), {
    ...data,
    actualizadoEn: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function approveDriver(uid) {
  if (!uid) throw new Error("UID requerido");

  await updateDoc(doc(db, "usuarios", uid), {
    aprobado: true,
    activo: true,
    bloqueado: false,
    actualizadoEn: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  const conductorRef = doc(db, "conductores", uid);
  const conductorSnap = await getDoc(conductorRef);

  if (conductorSnap.exists()) {
    await updateDoc(conductorRef, {
      aprobado: true,
      bloqueado: false,
      motivoBloqueo: "",
      estado: "disponible",
      status: "disponible",
      estadoSolicitud: "activo",
      actualizadoEn: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }
}

export async function rejectDriver(uid) {
  if (!uid) throw new Error("UID requerido");

  await updateDoc(doc(db, "usuarios", uid), {
    aprobado: false,
    actualizadoEn: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  const conductorRef = doc(db, "conductores", uid);
  const conductorSnap = await getDoc(conductorRef);

  if (conductorSnap.exists()) {
    await updateDoc(conductorRef, {
      aprobado: false,
      estado: "rechazado",
      status: "rechazado",
      estadoSolicitud: "rechazado",
      actualizadoEn: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }
}

export async function blockDriver(uid, motivo = "Bloqueado por admin") {
  if (!uid) throw new Error("UID requerido");

  await updateDoc(doc(db, "usuarios", uid), {
    bloqueado: true,
    activo: false,
    actualizadoEn: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  await updateDoc(doc(db, "conductores", uid), {
    bloqueado: true,
    motivoBloqueo: motivo,
    estado: "bloqueado",
    status: "bloqueado",
    actualizadoEn: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function unblockDriver(uid) {
  if (!uid) throw new Error("UID requerido");

  await updateDoc(doc(db, "usuarios", uid), {
    bloqueado: false,
    activo: true,
    actualizadoEn: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  await updateDoc(doc(db, "conductores", uid), {
    bloqueado: false,
    motivoBloqueo: "",
    estado: "disponible",
    status: "disponible",
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

export async function listUsers() {
  const snapshot = await getDocs(collection(db, "usuarios"));
  const rows = [];

  for (const docItem of snapshot.docs) {
    const baseData = {
      id: docItem.id,
      uid: docItem.id,
      ...docItem.data()
    };

    if (baseData.rol === "conductor") {
      const conductorRef = doc(db, "conductores", docItem.id);
      const conductorSnap = await getDoc(conductorRef);

      if (conductorSnap.exists()) {
        rows.push(
          applySuperAdmin({
            ...baseData,
            ...conductorSnap.data(),
            id: docItem.id,
            uid: docItem.id
          })
        );
        continue;
      }
    }

    rows.push(applySuperAdmin(baseData));
  }

  return rows;
}

export async function updateUserRole(uid, role) {
  if (!uid) throw new Error("UID requerido");
  if (!role) throw new Error("Rol requerido");

  await updateDoc(doc(db, "usuarios", uid), {
    rol: role,
    actualizadoEn: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  if (role === "conductor") {
    const conductorRef = doc(db, "conductores", uid);
    const conductorSnap = await getDoc(conductorRef);
    const userSnap = await getDoc(doc(db, "usuarios", uid));

    const userData = userSnap.exists() ? userSnap.data() : {};
    const now = new Date();
    const freeMonthEnd = new Date();
    freeMonthEnd.setDate(now.getDate() + 30);

    if (!conductorSnap.exists()) {
      await setDoc(conductorRef, {
        uid,
        nombre: userData.nombre || "Sin nombre",
        email: userData.email || "",
        telefono: userData.telefono || "",
        city: userData.ciudad || "",
        ciudad: userData.ciudad || "",
        estado: "pendiente",
        status: "pendiente",
        estadoSolicitud: "pendiente",
        aprobado: false,
        bloqueado: false,
        motivoBloqueo: "",
        notificacionPendiente: null,
        vehicleType: "",
        vehiculoTipo: "",
        tipoVehiculo: "",
        patente: "",
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
  }
}

export async function notifyDriver(uid, notification) {
  if (!uid) throw new Error("UID requerido");

  await updateDoc(doc(db, "conductores", uid), {
    notificacionPendiente: {
      ...notification,
      createdAt: new Date().toISOString()
    },
    actualizadoEn: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function clearDriverNotification(uid) {
  if (!uid) throw new Error("UID requerido");

  await updateDoc(doc(db, "conductores", uid), {
    notificacionPendiente: null,
    actualizadoEn: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}