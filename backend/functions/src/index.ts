import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/https';

admin.initializeApp();
const db = admin.firestore();

export const approveDriver = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
  }

  const adminDoc = await db.collection('usuarios').doc(request.auth.uid).get();
  if (!adminDoc.exists || adminDoc.data()?.rol !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo un admin puede aprobar conductores.');
  }

  const { conductorId, observacionesAdmin = '' } = request.data as {
    conductorId: string;
    observacionesAdmin?: string;
  };

  if (!conductorId) {
    throw new HttpsError('invalid-argument', 'Falta conductorId.');
  }

  await db.collection('conductores').doc(conductorId).update({
    estadoValidacion: 'aprobado',
    observacionesAdmin,
    aprobadoEn: admin.firestore.FieldValue.serverTimestamp(),
    aprobadoPor: request.auth.uid,
  });

  return { ok: true };
});

export const rejectDriver = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
  }

  const adminDoc = await db.collection('usuarios').doc(request.auth.uid).get();
  if (!adminDoc.exists || adminDoc.data()?.rol !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo un admin puede rechazar conductores.');
  }

  const { conductorId, observacionesAdmin = '' } = request.data as {
    conductorId: string;
    observacionesAdmin?: string;
  };

  if (!conductorId) {
    throw new HttpsError('invalid-argument', 'Falta conductorId.');
  }

  await db.collection('conductores').doc(conductorId).update({
    estadoValidacion: 'rechazado',
    observacionesAdmin,
    rechazadoEn: admin.firestore.FieldValue.serverTimestamp(),
    rechazadoPor: request.auth.uid,
  });

  return { ok: true };
});
