import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { USE_FIRESTORE } from '../config/appConfig.js';
import { db } from './firebase.js';
import { countries, cities, drivers, seedTrips } from './demoData.js';
import { findNearestAvailableDriver, haversineKm, estimateDurationMinutes } from './geo.js';
import { calculatePrice } from './pricing.js';
import { getCollection, setCollection } from './storage.js';

const COLLECTIONS = {
  countries: 'paises',
  cities: 'ciudades',
  drivers: 'conductores',
  trips: 'viajes'
};

function normalizeCity(city) {
  return {
    id: city.id,
    country: city.country,
    name: city.name,
    timezone: city.timezone,
    currency: city.currency,
    center: city.center,
    baseFare: city.baseFare,
    priceKm: city.priceKm,
    priceMinute: city.priceMinute,
    active: true
  };
}

function normalizeDriver(driver) {
  return {
    id: driver.id,
    name: driver.name,
    phone: driver.phone,
    country: driver.country,
    city: driver.city,
    status: driver.status,
    vehicleType: driver.vehicleType,
    vehicle: driver.vehicle,
    plate: driver.plate,
    lat: driver.lat,
    lng: driver.lng,
    acceptsCrypto: Boolean(driver.acceptsCrypto),
    activeTripId: driver.activeTripId || '',
    updatedAtIso: new Date().toISOString()
  };
}

function seedLocal() {
  setCollection('countries', countries);
  setCollection('cities', cities.map(normalizeCity));
  setCollection('drivers', drivers.map(normalizeDriver));
  setCollection(
    'trips',
    seedTrips.map((trip) => ({
      ...trip,
      updatedAtIso: new Date().toISOString()
    }))
  );
}

async function seedFirestore() {
  for (const country of countries) {
    await setDoc(doc(db, COLLECTIONS.countries, country.code), country, { merge: true });
  }
  for (const city of cities) {
    await setDoc(doc(db, COLLECTIONS.cities, city.id), normalizeCity(city), { merge: true });
  }
  for (const driver of drivers) {
    await setDoc(doc(db, COLLECTIONS.drivers, driver.id), normalizeDriver(driver), { merge: true });
  }
  for (const trip of seedTrips) {
    const { id, ...payload } = trip;
    await setDoc(
      doc(db, COLLECTIONS.trips, id),
      {
        ...payload,
        createdAtIso: payload.createdAtIso || new Date().toISOString(),
        updatedAtIso: new Date().toISOString()
      },
      { merge: true }
    );
  }
}

export async function seedBaseData() {
  if (USE_FIRESTORE) {
    try {
      return await seedFirestore();
    } catch (error) {
      console.warn('Firestore seed falló; se usa modo local.', error);
      seedLocal();
      return;
    }
  }
  seedLocal();
}

export async function getCities() {
  if (USE_FIRESTORE) {
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.cities));
      const rows = snapshot.docs.map((row) => ({ id: row.id, ...row.data() }));
      return rows.length ? rows : cities.map(normalizeCity);
    } catch (error) {
      console.warn('getCities fallback local', error);
      const local = getCollection('cities');
      return local.length ? local : cities.map(normalizeCity);
    }
  }
  const local = getCollection('cities');
  return local.length ? local : cities.map(normalizeCity);
}

export async function getDrivers() {
  if (USE_FIRESTORE) {
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.drivers));
      const rows = snapshot.docs.map((row) => ({ id: row.id, ...row.data() }));
      return rows.length ? rows : drivers.map(normalizeDriver);
    } catch (error) {
      console.warn('getDrivers fallback local', error);
      const local = getCollection('drivers');
      return local.length ? local : drivers.map(normalizeDriver);
    }
  }
  const local = getCollection('drivers');
  return local.length ? local : drivers.map(normalizeDriver);
}

export function subscribeTrips(onChange) {
  if (USE_FIRESTORE) {
    try {
      const q = query(collection(db, COLLECTIONS.trips));
      return onSnapshot(
        q,
        (snapshot) => {
          const rows = snapshot.docs
            .map((item) => ({ id: item.id, ...item.data() }))
            .sort((a, b) => String(b.createdAtIso || '').localeCompare(String(a.createdAtIso || '')));
          onChange(rows);
        },
        (error) => {
          console.warn('subscribeTrips fallback local', error);
          const local = getCollection('trips');
          onChange(local.length ? local : seedTrips);
        }
      );
    } catch (error) {
      console.warn('subscribeTrips local fallback sync', error);
      onChange(getCollection('trips'));
      return () => {};
    }
  }

  const local = getCollection('trips');
  onChange(local.length ? local : seedTrips);
  return () => {};
}

export async function createTrip(payload) {
  const trip = {
    passengerName: payload.passengerName,
    passengerPhone: payload.passengerPhone,
    country: payload.country,
    city: payload.city,
    currency: payload.currency,
    originText: payload.originText,
    originLat: Number(payload.originLat),
    originLng: Number(payload.originLng),
    destinationText: payload.destinationText,
    destinationLat: Number(payload.destinationLat),
    destinationLng: Number(payload.destinationLng),
    estimatedDistanceKm: Number(payload.estimatedDistanceKm),
    estimatedDurationMin: Number(payload.estimatedDurationMin),
    price: Number(payload.price),
    paymentMethod: payload.paymentMethod,
    status: 'solicitado',
    driverId: '',
    driverName: '',
    createdAtIso: new Date().toISOString(),
    updatedAtIso: new Date().toISOString(),
    cryptoWallet: payload.cryptoWallet || '',
    cryptoTxId: payload.cryptoTxId || '',
    notes: payload.notes || ''
  };

  if (USE_FIRESTORE) {
    try {
      await addDoc(collection(db, COLLECTIONS.trips), {
        ...trip,
        createdAtServer: serverTimestamp(),
        updatedAtServer: serverTimestamp()
      });
      return;
    } catch (error) {
      console.warn('createTrip fallback local', error);
    }
  }

  const rows = getCollection('trips');
  rows.unshift({ id: `trip-${Date.now()}`, ...trip });
  setCollection('trips', rows);
}

export async function getTripsOnce() {
  if (USE_FIRESTORE) {
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.trips));
      const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      return rows.length ? rows : (getCollection('trips').length ? getCollection('trips') : seedTrips);
    } catch (error) {
      console.warn('getTripsOnce fallback local', error);
    }
  }
  const rows = getCollection('trips');
  return rows.length ? rows : seedTrips;
}

export async function assignNearestDriverToTrip(tripId) {
  const allDrivers = await getDrivers();
  const allCities = await getCities();
  const cityMap = Object.fromEntries(allCities.map((city) => [city.id, city]));
  const trips = await getTripsOnce();

  const trip = trips.find((item) => item.id === tripId);
  if (!trip) throw new Error('No se encontró el viaje');

  const nearest = findNearestAvailableDriver({
    drivers: allDrivers,
    city: trip.city,
    origin: { lat: Number(trip.originLat), lng: Number(trip.originLng) }
  });

  if (!nearest) throw new Error('No hay conductores disponibles en esta ciudad');

  const distanceKm = haversineKm(
    { lat: Number(trip.originLat), lng: Number(trip.originLng) },
    { lat: Number(trip.destinationLat), lng: Number(trip.destinationLng) }
  );

  const city = cityMap[trip.city] || allCities[0];
  const durationMin = estimateDurationMinutes(distanceKm);
  const price = calculatePrice({
    baseFare: city.baseFare,
    priceKm: city.priceKm,
    priceMinute: city.priceMinute,
    distanceKm,
    durationMin,
    minimumFare: city.baseFare
  });

  if (USE_FIRESTORE) {
    try {
      await updateDoc(doc(db, COLLECTIONS.trips, tripId), {
        driverId: nearest.id,
        driverName: nearest.name,
        status: 'aceptado',
        estimatedDistanceKm: Number(distanceKm.toFixed(2)),
        estimatedDurationMin: durationMin,
        price,
        updatedAtIso: new Date().toISOString(),
        updatedAtServer: serverTimestamp()
      });

      await updateDoc(doc(db, COLLECTIONS.drivers, nearest.id), {
        status: 'ocupado',
        activeTripId: tripId,
        updatedAtIso: new Date().toISOString()
      });
      return nearest;
    } catch (error) {
      console.warn('assignNearestDriverToTrip fallback local', error);
    }
  }

  const rows = trips.map((item) =>
    item.id === tripId
      ? {
          ...item,
          driverId: nearest.id,
          driverName: nearest.name,
          status: 'aceptado',
          estimatedDistanceKm: Number(distanceKm.toFixed(2)),
          estimatedDurationMin: durationMin,
          price,
          updatedAtIso: new Date().toISOString()
        }
      : item
  );
  setCollection('trips', rows);

  const driversRows = allDrivers.map((item) =>
    item.id === nearest.id
      ? { ...item, status: 'ocupado', activeTripId: tripId, updatedAtIso: new Date().toISOString() }
      : item
  );
  setCollection('drivers', driversRows);
  return nearest;
}

export async function updateDriverStatus(driverId, status) {
  if (USE_FIRESTORE) {
    try {
      await updateDoc(doc(db, COLLECTIONS.drivers, driverId), {
        status,
        updatedAtIso: new Date().toISOString()
      });
      return;
    } catch (error) {
      console.warn('updateDriverStatus fallback local', error);
    }
  }
  const rows = getCollection('drivers').map((item) =>
    item.id === driverId ? { ...item, status, updatedAtIso: new Date().toISOString() } : item
  );
  setCollection('drivers', rows);
}

export async function updateDriverLocation(driverId, lat, lng) {
  if (USE_FIRESTORE) {
    try {
      await updateDoc(doc(db, COLLECTIONS.drivers, driverId), {
        lat: Number(lat),
        lng: Number(lng),
        updatedAtIso: new Date().toISOString()
      });
      return;
    } catch (error) {
      console.warn('updateDriverLocation fallback local', error);
    }
  }
  const rows = getCollection('drivers').map((item) =>
    item.id === driverId
      ? { ...item, lat: Number(lat), lng: Number(lng), updatedAtIso: new Date().toISOString() }
      : item
  );
  setCollection('drivers', rows);
}

export async function acceptTripAsDriver(tripId, driverId) {
  const driversRows = await getDrivers();
  const driver = driversRows.find((item) => item.id === driverId);
  if (!driver) throw new Error('Conductor no encontrado');

  if (USE_FIRESTORE) {
    try {
      await updateDoc(doc(db, COLLECTIONS.trips, tripId), {
        driverId,
        driverName: driver.name,
        status: 'aceptado',
        updatedAtIso: new Date().toISOString(),
        updatedAtServer: serverTimestamp()
      });

      await updateDoc(doc(db, COLLECTIONS.drivers, driverId), {
        status: 'ocupado',
        activeTripId: tripId,
        updatedAtIso: new Date().toISOString()
      });
      return;
    } catch (error) {
      console.warn('acceptTripAsDriver fallback local', error);
    }
  }

  const trips = getCollection('trips').map((item) =>
    item.id === tripId
      ? { ...item, driverId, driverName: driver.name, status: 'aceptado', updatedAtIso: new Date().toISOString() }
      : item
  );
  setCollection('trips', trips);

  const localDrivers = getCollection('drivers').map((item) =>
    item.id === driverId ? { ...item, status: 'ocupado', activeTripId: tripId, updatedAtIso: new Date().toISOString() } : item
  );
  setCollection('drivers', localDrivers);
}

export async function setTripStatus(tripId, status) {
  const trips = await getTripsOnce();
  const trip = trips.find((item) => item.id === tripId);
  if (!trip) throw new Error('Viaje no encontrado');

  if (USE_FIRESTORE) {
    try {
      await updateDoc(doc(db, COLLECTIONS.trips, tripId), {
        status,
        updatedAtIso: new Date().toISOString(),
        updatedAtServer: serverTimestamp()
      });

      if ((status === 'finalizado' || status === 'cancelado') && trip.driverId) {
        await updateDoc(doc(db, COLLECTIONS.drivers, trip.driverId), {
          status: 'disponible',
          activeTripId: '',
          updatedAtIso: new Date().toISOString()
        });
      }
      return;
    } catch (error) {
      console.warn('setTripStatus fallback local', error);
    }
  }

  const rows = trips.map((item) => (item.id === tripId ? { ...item, status, updatedAtIso: new Date().toISOString() } : item));
  setCollection('trips', rows);

  if ((status === 'finalizado' || status === 'cancelado') && trip.driverId) {
    const localDrivers = getCollection('drivers').map((item) =>
      item.id === trip.driverId
        ? { ...item, status: 'disponible', activeTripId: '', updatedAtIso: new Date().toISOString() }
        : item
    );
    setCollection('drivers', localDrivers);
  }
}

export async function deleteTrip(tripId) {
  if (USE_FIRESTORE) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.trips, tripId));
      return;
    } catch (error) {
      console.warn('deleteTrip fallback local', error);
    }
  }
  const rows = getCollection('trips').filter((item) => item.id !== tripId);
  setCollection('trips', rows);
}
