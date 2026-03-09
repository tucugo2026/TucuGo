import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase.js";

export function conductorPuedeTrabajar(conductor) {
  if (!conductor) return false;

  const ahora = new Date();

  const finGratis = conductor.finPeriodoGratis
    ? new Date(conductor.finPeriodoGratis)
    : null;

  if (finGratis && ahora < finGratis) {
    return true;
  }

  if (conductor.suscripcionActiva === true) {
    return true;
  }

  return false;
}

export async function activarSuscripcionConductor(uid) {
  const ahora = new Date();

  const proximoMes = new Date();
  proximoMes.setDate(ahora.getDate() + 30);

  await updateDoc(doc(db, "conductores", uid), {
    suscripcionActiva: true,
    planActivo: true,
    plan: "pro",
    ultimoPago: ahora.toISOString(),
    proximoPago: proximoMes.toISOString(),
    actualizadoEn: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function desactivarSuscripcion(uid) {
  await updateDoc(doc(db, "conductores", uid), {
    suscripcionActiva: false,
    planActivo: false,
    actualizadoEn: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}