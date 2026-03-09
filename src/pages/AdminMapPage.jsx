import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Circle,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { db } from '../services/firebase.js';
import {
  findNearestDrivers,
  getTripOriginCoords,
  getTripDestinationCoords,
  getDriverCoords
} from '../services/geo.js';
import { notifyDriver } from '../services/authService.js';

const DEFAULT_CENTER = { lat: -26.8241, lng: -65.2226 };
const HEAT_RADIUS_METERS = 350;
const HOT_ZONES_RADIUS_KM = 4;

function FitMapToData({ drivers, trips }) {
  const map = useMap();

  useEffect(() => {
    const points = [];

    drivers.forEach((driver) => {
      const coords = getDriverCoords(driver);
      if (coords) points.push([coords.lat, coords.lng]);
    });

    trips.forEach((trip) => {
      const origin = getTripOriginCoords(trip);
      const destination = getTripDestinationCoords(trip);

      if (origin) points.push([origin.lat, origin.lng]);
      if (destination) points.push([destination.lat, destination.lng]);
    });

    if (!points.length) {
      map.setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 13);
      return;
    }

    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, drivers, trips]);

  return null;
}

function getTripStatusLabel(status) {
  switch (status) {
    case 'solicitado': return 'Solicitado';
    case 'reservado': return 'Reservado';
    case 'aceptado': return 'Aceptado';
    case 'en_camino': return 'En camino';
    case 'llegue': return 'Llegó';
    case 'en_viaje': return 'En viaje';
    case 'finalizado': return 'Finalizado';
    case 'cancelado': return 'Cancelado';
    default: return status || '-';
  }
}

function isTripPending(status) {
  return ['solicitado', 'reservado'].includes(status);
}

function getZoneColor(zone) {
  if (zone.score >= 3) return '#dc2626';
  if (zone.score >= 2) return '#ea580c';
  return '#eab308';
}

function getZoneLabel(zone) {
  if (zone.score >= 3) return 'Demanda alta';
  if (zone.score >= 2) return 'Demanda media';
  return 'Demanda leve';
}

export default function AdminMapPage() {
  const [drivers, setDrivers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [assigningTripId, setAssigningTripId] = useState('');
  const [notifyingTripId, setNotifyingTripId] = useState('');

  useEffect(() => {
    const unsubDrivers = onSnapshot(collection(db, 'conductores'), (snap) => {
      const rows = snap.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data()
      }));
      setDrivers(rows);
    });

    const unsubTrips = onSnapshot(collection(db, 'viajes'), (snap) => {
      const rows = snap.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data()
      }));
      setTrips(rows);
    });

    return () => {
      unsubDrivers();
      unsubTrips();
    };
  }, []);

  const activeTrips = useMemo(() => {
    return trips.filter((trip) =>
      ['solicitado', 'reservado', 'aceptado', 'en_camino', 'llegue', 'en_viaje'].includes(
        trip.estado || trip.status
      )
    );
  }, [trips]);

  const enrichedPendingTrips = useMemo(() => {
    return activeTrips
      .filter((trip) => isTripPending(trip.estado || trip.status))
      .map((trip) => {
        const origin = getTripOriginCoords(trip);
        const nearestDrivers = findNearestDrivers({
          drivers,
          city: trip.city || trip.ciudad || '',
          origin,
          serviceType: trip.serviceType || trip.vehicleTypeRequested || trip.tripType || '',
          limit: 3
        });

        return {
          ...trip,
          nearestDrivers
        };
      });
  }, [activeTrips, drivers]);

  const hotZones = useMemo(() => {
    const pending = activeTrips.filter((trip) => isTripPending(trip.estado || trip.status));

    return pending
      .map((trip) => {
        const origin = getTripOriginCoords(trip);
        if (!origin) return null;

        const activeTripsInZone = pending.filter((otherTrip) => {
          const otherOrigin = getTripOriginCoords(otherTrip);
          if (!otherOrigin) return false;

          const dx = origin.lat - otherOrigin.lat;
          const dy = origin.lng - otherOrigin.lng;
          const roughDistance = Math.sqrt(dx * dx + dy * dy) * 111;
          return roughDistance <= HOT_ZONES_RADIUS_KM;
        }).length;

        const driversInZone = drivers.filter((driver) => {
          const coords = getDriverCoords(driver);
          const status = (driver.estado || driver.status || '').toLowerCase();
          if (!coords) return false;
          if (status !== 'disponible') return false;

          const dx = origin.lat - coords.lat;
          const dy = origin.lng - coords.lng;
          const roughDistance = Math.sqrt(dx * dx + dy * dy) * 111;
          return roughDistance <= HOT_ZONES_RADIUS_KM;
        }).length;

        const score =
          activeTripsInZone >= 4 && driversInZone <= 1
            ? 3
            : activeTripsInZone >= 2 && driversInZone <= 2
            ? 2
            : 1;

        return {
          id: trip.id,
          lat: origin.lat,
          lng: origin.lng,
          activeTripsInZone,
          driversInZone,
          score
        };
      })
      .filter(Boolean);
  }, [activeTrips, drivers]);

  async function assignDriverToTrip(trip, driver) {
    try {
      setAssigningTripId(trip.id);

      const driverId = driver?.id || driver?.uid || driver?.driverId || '';
      const driverName = driver?.nombre || driver?.name || 'Conductor';
      const driverPhone = driver?.telefono || driver?.phone || '';

      await updateDoc(doc(db, 'viajes', trip.id), {
        estado: 'aceptado',
        status: 'aceptado',
        conductorId: driverId,
        driverId: driverId,
        conductorNombre: driverName,
        driverName: driverName,
        conductorTelefono: driverPhone,
        assignedAutomatically: true,
        updatedAt: serverTimestamp(),
        actualizadoEn: serverTimestamp()
      });

      await updateDoc(doc(db, 'conductores', driverId), {
        estado: 'ocupado',
        status: 'ocupado',
        viajeActualId: trip.id,
        updatedAt: serverTimestamp(),
        actualizadoEn: serverTimestamp()
      });

      alert(`Viaje asignado a ${driverName}`);
    } catch (error) {
      console.error(error);
      alert('No se pudo asignar el viaje.');
    } finally {
      setAssigningTripId('');
    }
  }

  async function notifyNearestDriver(trip) {
    try {
      setNotifyingTripId(trip.id);

      const nearestDriver = trip.nearestDrivers?.[0];
      if (!nearestDriver) {
        alert('No hay conductor cercano para notificar.');
        return;
      }

      const driverId = nearestDriver.id || nearestDriver.uid || nearestDriver.driverId;
      const driverName = nearestDriver.nombre || nearestDriver.name || 'Conductor';

      await notifyDriver(driverId, {
        type: 'nuevo_viaje',
        title: 'Nuevo viaje cerca tuyo',
        message: `Tienes un viaje a ${nearestDriver.distanceKm?.toFixed(2)} km`,
        tripId: trip.id,
        passengerName: trip.passengerName || '',
        originText: trip.originText || '',
        destinationText: trip.destinationText || '',
        serviceType: trip.serviceType || ''
      });

      alert(`Notificación enviada a ${driverName}`);
    } catch (error) {
      console.error(error);
      alert('No se pudo notificar al conductor.');
    } finally {
      setNotifyingTripId('');
    }
  }

  return (
    <div className="stack-lg">
      <section className="info-grid">
        <article className="info-card">
          <h2>Conductores en vivo</h2>
          <p><b>Total:</b> {drivers.length}</p>
          <p>
            <b>Disponibles:</b>{' '}
            {drivers.filter((driver) =>
              (driver.estado || driver.status || '').toLowerCase() === 'disponible'
            ).length}
          </p>
          <p>
            <b>Ocupados:</b>{' '}
            {drivers.filter((driver) =>
              (driver.estado || driver.status || '').toLowerCase() === 'ocupado'
            ).length}
          </p>
        </article>

        <article className="info-card">
          <h2>Viajes activos</h2>
          <p><b>Total:</b> {activeTrips.length}</p>
          <p><b>Pendientes:</b> {enrichedPendingTrips.length}</p>
        </article>

        <article className="info-card">
          <h2>Zonas calientes</h2>
          <p><b>Total:</b> {hotZones.length}</p>
          <p><b>Radio:</b> {HOT_ZONES_RADIUS_KM} km</p>
        </article>
      </section>

      <section className="info-card">
        <h2>Mapa admin en vivo</h2>

        <MapContainer
          center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]}
          zoom={13}
          scrollWheelZoom={true}
          style={{ height: '520px', width: '100%', borderRadius: '16px' }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitMapToData drivers={drivers} trips={activeTrips} />

          {drivers.map((driver) => {
            const coords = getDriverCoords(driver);
            if (!coords) return null;

            return (
              <Marker key={`driver-${driver.id}`} position={[coords.lat, coords.lng]}>
                <Popup>
                  <b>{driver.nombre || 'Conductor'}</b>
                  <br />
                  Estado: {driver.estado || driver.status || '-'}
                  <br />
                  Tipo: {driver.vehicleType || driver.vehiculoTipo || driver.tipoVehiculo || '-'}
                  <br />
                  Tel: {driver.telefono || '-'}
                </Popup>
              </Marker>
            );
          })}

          {activeTrips.map((trip) => {
            const origin = getTripOriginCoords(trip);
            if (!origin) return null;

            return (
              <Circle
                key={`trip-origin-${trip.id}`}
                center={[origin.lat, origin.lng]}
                radius={120}
                pathOptions={{
                  color: isTripPending(trip.estado || trip.status) ? '#ea580c' : '#2563eb',
                  fillOpacity: 0.25
                }}
              >
                <Popup>
                  <b>Viaje</b>
                  <br />
                  Pasajero: {trip.passengerName || '-'}
                  <br />
                  Estado: {getTripStatusLabel(trip.estado || trip.status)}
                  <br />
                  Servicio: {trip.serviceType || '-'}
                  <br />
                  Origen: {trip.originText || '-'}
                  <br />
                  Destino: {trip.destinationText || '-'}
                </Popup>
              </Circle>
            );
          })}

          {hotZones.map((zone) => (
            <Circle
              key={`hot-zone-${zone.id}`}
              center={[zone.lat, zone.lng]}
              radius={HEAT_RADIUS_METERS}
              pathOptions={{
                color: getZoneColor(zone),
                fillColor: getZoneColor(zone),
                fillOpacity: 0.18
              }}
            >
              <Popup>
                <b>{getZoneLabel(zone)}</b>
                <br />
                Viajes cerca: {zone.activeTripsInZone}
                <br />
                Conductores cerca: {zone.driversInZone}
              </Popup>
            </Circle>
          ))}
        </MapContainer>
      </section>

      <section className="stack-md">
        <h2>Autoasignación inteligente</h2>

        {enrichedPendingTrips.length === 0 ? (
          <p>No hay viajes pendientes ahora mismo.</p>
        ) : (
          enrichedPendingTrips.map((trip) => (
            <div key={trip.id} className="info-card">
              <p><b>Pasajero:</b> {trip.passengerName || '-'}</p>
              <p><b>Servicio:</b> {trip.serviceType || '-'}</p>
              <p><b>Estado:</b> {getTripStatusLabel(trip.estado || trip.status)}</p>
              <p><b>Origen:</b> {trip.originText || '-'}</p>
              <p><b>Destino:</b> {trip.destinationText || '-'}</p>

              <div style={{ marginTop: '12px' }}>
                <b>Conductores más cercanos:</b>
              </div>

              {trip.nearestDrivers.length === 0 ? (
                <p style={{ marginTop: '8px' }}>No hay conductores compatibles cerca.</p>
              ) : (
                trip.nearestDrivers.map((driver, index) => (
                  <div
                    key={`${trip.id}-${driver.id}-${index}`}
                    style={{
                      marginTop: '10px',
                      padding: '12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px'
                    }}
                  >
                    <p><b>{driver.nombre || 'Conductor'}</b></p>
                    <p><b>Distancia:</b> {driver.distanceKm?.toFixed(2)} km</p>
                    <p><b>Estado:</b> {driver.estado || driver.status || '-'}</p>
                    <p><b>Tipo:</b> {driver.vehicleType || driver.vehiculoTipo || driver.tipoVehiculo || '-'}</p>

                    <div className="button-row" style={{ flexWrap: 'wrap' }}>
                      <button
                        className="primary-button"
                        onClick={() => assignDriverToTrip(trip, driver)}
                        disabled={assigningTripId === trip.id}
                      >
                        {assigningTripId === trip.id ? 'Asignando...' : 'Asignar este conductor'}
                      </button>

                      {index === 0 ? (
                        <button
                          onClick={() => notifyNearestDriver(trip)}
                          disabled={notifyingTripId === trip.id}
                        >
                          {notifyingTripId === trip.id ? 'Notificando...' : 'Notificar más cercano'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
}