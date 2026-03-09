import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { appSettings } from '../config/appConfig';
import { db, hasFirebaseConfig } from './firebase';
import {
  seedCities,
  seedCountries,
  seedDrivers,
  seedPassengers,
  seedTrips,
  seedVehicleTypes
} from './seedData';
import { nearestDriver } from './geo';
import { calculatePrice } from './pricing';

const STORAGE_KEY = 'tucugo-global-db-v1';

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function buildInitialState() {
  return {
    countries: clone(seedCountries),
    cities: clone(seedCities),
    vehicleTypes: clone(seedVehicleTypes),
    drivers: clone(seedDrivers),
    users: clone(seedPassengers),
    trips: clone(seedTrips)
  };
}

function loadLocalState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = buildInitialState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(raw);
}

function saveLocalState(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
}

async function fetchCollection(name) {
  const snapshot = await getDocs(collection(db, name));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

async function upsertCollection(name, items) {
  await Promise.all(items.map((item) => setDoc(doc(db, name, item.id), item)));
}

export async function bootstrapDemoData() {
  if (hasFirebaseConfig && db) {
    await upsertCollection('countries', seedCountries);
    await upsertCollection('cities', seedCities);
    await upsertCollection('vehicleTypes', seedVehicleTypes);
    await upsertCollection('drivers', seedDrivers);
    await upsertCollection('users', seedPassengers);
    await upsertCollection('trips', seedTrips);
    return true;
  }

  saveLocalState(buildInitialState());
  return true;
}

export async function getAppData() {
  if (hasFirebaseConfig && db) {
    const [countries, cities, vehicleTypes, drivers, users, trips] = await Promise.all([
      fetchCollection('countries'),
      fetchCollection('cities'),
      fetchCollection('vehicleTypes'),
      fetchCollection('drivers'),
      fetchCollection('users'),
      fetchCollection('trips')
    ]);
    return { countries, cities, vehicleTypes, drivers, users, trips };
  }

  return loadLocalState();
}

export async function resetLocalDemo() {
  saveLocalState(buildInitialState());
}

function findCity(state, cityId) {
  return state.cities.find((city) => city.id === cityId);
}

function findPassenger(state, passengerId) {
  return state.users.find((user) => user.id === passengerId) || state.users[0];
}

function nextId(prefix) {
  return `${prefix}_${Date.now()}`;
}

async function saveTripToFirestore(trip) {
  await setDoc(doc(db, 'trips', trip.id), trip);
}

async function saveDriverToFirestore(driver) {
  await setDoc(doc(db, 'drivers', driver.id), driver);
}

export async function createTrip(payload) {
  const state = await getAppData();
  const city = findCity(state, payload.cityId);
  const passenger = findPassenger(state, payload.passengerId);
  const pricing = calculatePrice(city, payload.origen, payload.destino);
  const country = state.countries.find((item) => item.id === city.pais);

  const trip = {
    id: nextId('trip'),
    pasajeroId: passenger.id,
    pasajeroNombre: passenger.nombre,
    conductorId: '',
    conductorNombre: '',
    pais: city.pais,
    ciudad: city.id,
    servicio: payload.servicio || 'auto',
    moneda: country?.moneda || appSettings.defaultCurrency,
    estado: 'solicitado',
    pagoMetodo: payload.pagoMetodo,
    pagoEstado: payload.pagoMetodo === 'efectivo' ? 'pendiente' : 'pendiente_confirmacion',
    precio: pricing.precio,
    distanciaKm: pricing.distanciaKm,
    duracionMin: pricing.duracionMin,
    origen: payload.origen,
    destino: payload.destino,
    cryptoMoneda: payload.cryptoMoneda || '',
    creadoEn: new Date().toISOString()
  };

  if (hasFirebaseConfig && db) {
    await saveTripToFirestore(trip);
    return trip;
  }

  state.trips.unshift(trip);
  saveLocalState(state);
  return trip;
}

export async function autoAssignTrip(tripId) {
  const state = await getAppData();
  const trip = state.trips.find((item) => item.id === tripId);
  if (!trip || trip.conductorId) return trip;

  const drivers = state.drivers.filter(
    (driver) => driver.pais === trip.pais && driver.ciudad === trip.ciudad
  );
  const selectedDriver = nearestDriver(drivers, trip.origen);
  if (!selectedDriver) throw new Error('No hay conductores disponibles en esa ciudad');

  trip.conductorId = selectedDriver.id;
  trip.conductorNombre = selectedDriver.nombre;
  trip.estado = 'asignado';
  trip.asignadoEn = new Date().toISOString();
  trip.distanciaConductorKm = Number(selectedDriver.distanciaAlPasajero?.toFixed(2) || 0);

  const driver = state.drivers.find((item) => item.id === selectedDriver.id);
  driver.estado = 'ocupado';

  if (hasFirebaseConfig && db) {
    await Promise.all([
      updateDoc(doc(db, 'trips', trip.id), {
        conductorId: trip.conductorId,
        conductorNombre: trip.conductorNombre,
        estado: trip.estado,
        asignadoEn: trip.asignadoEn,
        distanciaConductorKm: trip.distanciaConductorKm
      }),
      updateDoc(doc(db, 'drivers', driver.id), { estado: 'ocupado' })
    ]);
    return trip;
  }

  saveLocalState(state);
  return trip;
}

export async function updateDriverStatus(driverId, estado) {
  const state = await getAppData();
  const driver = state.drivers.find((item) => item.id === driverId);
  if (!driver) return;
  driver.estado = estado;

  if (hasFirebaseConfig && db) {
    await updateDoc(doc(db, 'drivers', driver.id), { estado });
    return;
  }

  saveLocalState(state);
}

export async function acceptTrip(tripId, driverId) {
  const state = await getAppData();
  const trip = state.trips.find((item) => item.id === tripId);
  const driver = state.drivers.find((item) => item.id === driverId);
  if (!trip || !driver) return;

  trip.estado = 'aceptado';
  trip.conductorId = driver.id;
  trip.conductorNombre = driver.nombre;
  driver.estado = 'ocupado';

  if (hasFirebaseConfig && db) {
    await Promise.all([
      updateDoc(doc(db, 'trips', trip.id), {
        estado: 'aceptado',
        conductorId: driver.id,
        conductorNombre: driver.nombre
      }),
      updateDoc(doc(db, 'drivers', driver.id), { estado: 'ocupado' })
    ]);
    return trip;
  }

  saveLocalState(state);
  return trip;
}

export async function startTrip(tripId) {
  const state = await getAppData();
  const trip = state.trips.find((item) => item.id === tripId);
  if (!trip) return;
  trip.estado = 'en_viaje';
  trip.iniciadoEn = new Date().toISOString();

  if (hasFirebaseConfig && db) {
    await updateDoc(doc(db, 'trips', trip.id), {
      estado: 'en_viaje',
      iniciadoEn: trip.iniciadoEn
    });
    return trip;
  }

  saveLocalState(state);
  return trip;
}

export async function finishTrip(tripId) {
  const state = await getAppData();
  const trip = state.trips.find((item) => item.id === tripId);
  if (!trip) return;
  const driver = state.drivers.find((item) => item.id === trip.conductorId);

  trip.estado = 'finalizado';
  trip.finalizadoEn = new Date().toISOString();
  trip.pagoEstado = trip.pagoMetodo === 'efectivo' ? 'por_cobrar' : 'confirmado';

  if (driver) {
    driver.estado = 'disponible';
    driver.ganancias = Number((Number(driver.ganancias || 0) + Number(trip.precio || 0)).toFixed(2));
  }

  if (hasFirebaseConfig && db) {
    const tasks = [
      updateDoc(doc(db, 'trips', trip.id), {
        estado: trip.estado,
        finalizadoEn: trip.finalizadoEn,
        pagoEstado: trip.pagoEstado
      })
    ];

    if (driver) {
      tasks.push(
        updateDoc(doc(db, 'drivers', driver.id), {
          estado: driver.estado,
          ganancias: driver.ganancias
        })
      );
    }

    await Promise.all(tasks);
    return trip;
  }

  saveLocalState(state);
  return trip;
}

export async function deleteTrip(tripId) {
  if (hasFirebaseConfig && db) {
    await deleteDoc(doc(db, 'trips', tripId));
    return;
  }
  const state = await getAppData();
  state.trips = state.trips.filter((item) => item.id !== tripId);
  saveLocalState(state);
}
