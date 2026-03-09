import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from './firebase.js';
import { cities as seedCities, drivers as seedDrivers } from './demoData.js';
import { findNearestAvailableDriver } from './geo.js';

function normalizeDriver(row) {
  const lat = row?.ubicacion?.lat ?? row?.lat ?? null;
  const lng = row?.ubicacion?.lng ?? row?.lng ?? null;
  const status = row?.status || row?.estado || 'disponible';
  const name = row?.name || row?.nombre || 'Conductor';
  const phone = row?.phone || row?.telefono || '';
  const city = row?.city || row?.ciudad || '';

  return {
    ...row,
    name,
    nombre: row?.nombre || name,
    phone,
    telefono: row?.telefono || phone,
    city,
    ciudad: row?.ciudad || city,
    status,
    estado: row?.estado || status,
    lat,
    lng,
    ubicacion:
      lat != null && lng != null
        ? {
            ...(row?.ubicacion || {}),
            lat: Number(lat),
            lng: Number(lng)
          }
        : row?.ubicacion || null
  };
}

function normalizeTrip(row, id) {
  const status = row?.status || row?.estado || 'solicitado';
  return {
    id: id || row?.id,
    ...row,
    status,
    estado: row?.estado || status,
    createdAt: row?.createdAt || row?.createdAtIso || ''
  };
}

export async function getCities() {
  try {
    const snapshot = await getDocs(collection(db, 'ciudades'));
    if (!snapshot.empty) {
      return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    }
  } catch (error) {
    console.warn('getCities:', error);
  }
  return seedCities;
}

export async function getDrivers() {
  try {
    const snapshot = await getDocs(collection(db, 'conductores'));
    return snapshot.docs.map((item) => normalizeDriver({ id: item.id, ...item.data() }));
  } catch (error) {
    console.warn('getDrivers:', error);
    return seedDrivers.map(normalizeDriver);
  }
}

export async function seedBaseData() {
  try {
    const citiesSnap = await getDocs(query(collection(db, 'ciudades'), limit(1)));
    if (citiesSnap.empty) {
      await Promise.all(
        seedCities.map((city) => setDoc(doc(db, 'ciudades', city.id), city))
      );
    }
  } catch (error) {
    console.warn('seedBaseData cities:', error);
  }
}

export function subscribeTrips(callback) {
  return onSnapshot(collection(db, 'viajes'), (snapshot) => {
    const rows = snapshot.docs.map((item) => normalizeTrip(item.data(), item.id));
    callback(rows);
  });
}

export async function createTrip(data) {
  const price = Number(data.price || 0);
  const comisionApp = Number((price * 0.1).toFixed(2));
  const gananciaConductor = Number((price - comisionApp).toFixed(2));

  const tripData = {
    ...data,
    price,
    comisionApp,
    gananciaConductor,
    status: data.status || data.estado || 'solicitado',
    estado: data.estado || data.status || 'solicitado',
    createdAt: data.createdAt || new Date().toISOString(),
    creado: serverTimestamp()
  };

  const ref = await addDoc(collection(db, 'viajes'), tripData);
  return { id: ref.id, ...tripData };
}

export async function setTripStatus(tripId, status) {
  await updateDoc(doc(db, 'viajes', tripId), {
    status,
    estado: status,
    updatedAt: serverTimestamp(),
    actualizadoEn: serverTimestamp()
  });
}

export async function updateDriverStatus(driverId, status) {
  await updateDoc(doc(db, 'conductores', driverId), {
    status,
    estado: status,
    updatedAt: serverTimestamp(),
    actualizadoEn: serverTimestamp()
  });
}

export async function updateDriverLocation(driverId, lat, lng) {
  await updateDoc(doc(db, 'conductores', driverId), {
    lat: Number(lat),
    lng: Number(lng),
    ubicacion: {
      lat: Number(lat),
      lng: Number(lng),
      actualizado: new Date().toISOString()
    },
    updatedAt: serverTimestamp(),
    actualizadoEn: serverTimestamp()
  });
}

export async function acceptTripAsDriver(tripId, driverId) {
  const drivers = await getDrivers();
  const driver = drivers.find((item) => item.id === driverId);
  if (!driver) throw new Error('Conductor no encontrado');

  await updateDoc(doc(db, 'viajes', tripId), {
    status: 'aceptado',
    estado: 'aceptado',
    driverId,
    conductorId: driverId,
    driverName: driver.name,
    conductorNombre: driver.name,
    conductorTelefono: driver.phone || '',
    updatedAt: serverTimestamp(),
    actualizadoEn: serverTimestamp()
  });

  await updateDriverStatus(driverId, 'ocupado');
  return driver;
}

export async function assignNearestDriverToTrip(tripId) {
  const [driversSnap, tripSnap] = await Promise.all([
    getDocs(query(collection(db, 'conductores'))),
    getDocs(query(collection(db, 'viajes'), where('__name__', '==', tripId)))
  ]);

  if (tripSnap.empty) throw new Error('Viaje no encontrado');

  const tripDoc = tripSnap.docs[0];
  const trip = normalizeTrip(tripDoc.data(), tripDoc.id);
  const drivers = driversSnap.docs.map((d) => normalizeDriver({ id: d.id, ...d.data() }));

  const nearest = findNearestAvailableDriver({
    drivers,
    city: trip.city || trip.ciudad,
    origin: { lat: Number(trip.originLat), lng: Number(trip.originLng) }
  });

  if (!nearest) throw new Error('No hay conductores disponibles');

  await acceptTripAsDriver(tripId, nearest.id);
  return nearest;
}
