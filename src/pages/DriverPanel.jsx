import { useMemo, useState } from 'react';
import MapView from '../components/MapView.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { acceptTripAsDriver, setTripStatus, updateDriverLocation, updateDriverStatus } from '../services/tripService.js';

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function formatMoney(value, currency = 'ARS') {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'ARS' ? 0 : 2
    }).format(amount);
  } catch {
    return `$${amount}`;
  }
}

function buildMapsUrl({ originText, destinationText, originLat, originLng, destinationLat, destinationLng }) {
  const origin = originLat && originLng ? `${originLat},${originLng}` : originText;
  const destination = destinationLat && destinationLng ? `${destinationLat},${destinationLng}` : destinationText;
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin || '')}&destination=${encodeURIComponent(destination || '')}&travelmode=driving`;
}

function buildSinglePointUrl({ label, lat, lng }) {
  const query = lat && lng ? `${lat},${lng}` : label;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || '')}`;
}

export default function DriverPanel({ cities, drivers, trips, refreshAll, profile }) {
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [message, setMessage] = useState('');
  const [busyAction, setBusyAction] = useState('');

  const preferredDriver = useMemo(() => {
    if (!drivers.length) return null;
    const profileName = normalizeText(profile?.nombre);
    const profileCity = normalizeText(profile?.ciudad);

    return (
      drivers.find((item) => item.userUid && item.userUid === profile?.uid) ||
      drivers.find((item) => normalizeText(item.name) === profileName) ||
      drivers.find((item) => normalizeText(item.phone) === normalizeText(profile?.telefono)) ||
      drivers.find(
        (item) =>
          profileName &&
          normalizeText(item.name).includes(profileName.split(' ')[0]) &&
          (!profileCity || normalizeText(item.city) === profileCity)
      ) ||
      drivers.find((item) => !profileCity || normalizeText(item.city) === profileCity) ||
      drivers[0]
    );
  }, [drivers, profile]);

  const selectedDriver = useMemo(() => {
    return drivers.find((item) => item.id === selectedDriverId) || preferredDriver || null;
  }, [drivers, selectedDriverId, preferredDriver]);

  const city = useMemo(
    () => cities.find((item) => item.id === selectedDriver?.city) ?? cities[0],
    [cities, selectedDriver]
  );

  const activeTrip = useMemo(() => {
    if (!selectedDriver) return null;
    return (
      trips.find((item) => item.driverId === selectedDriver.id && item.status !== 'finalizado' && item.status !== 'cancelado') ||
      trips.find((item) => item.id === selectedDriver.activeTripId) ||
      null
    );
  }, [trips, selectedDriver]);

  const availableTrips = useMemo(() => {
    if (!selectedDriver) return [];
    return trips
      .filter((item) => item.city === selectedDriver.city && item.status === 'solicitado')
      .sort((a, b) => String(b.createdAtIso || '').localeCompare(String(a.createdAtIso || '')));
  }, [trips, selectedDriver]);

  const nearbyDrivers = useMemo(() => {
    if (!selectedDriver) return [];
    return drivers.filter((item) => item.city === selectedDriver.city);
  }, [drivers, selectedDriver]);

  async function runAction(actionName, callback, successMessage) {
    setBusyAction(actionName);
    try {
      await callback();
      setMessage(successMessage);
      await refreshAll();
    } catch (error) {
      setMessage(error.message || 'No se pudo completar la acción.');
    } finally {
      setBusyAction('');
    }
  }

  async function changeStatus(status) {
    if (!selectedDriver) return;
    await runAction(`status-${status}`, () => updateDriverStatus(selectedDriver.id, status), `Tu estado cambió a ${status}.`);
  }

  async function acceptTrip(tripId) {
    if (!selectedDriver) return;
    await runAction(`accept-${tripId}`, () => acceptTripAsDriver(tripId, selectedDriver.id), 'Viaje aceptado. Ya te figura como ocupado.');
  }

  async function updateTrip(tripId, status) {
    await runAction(`trip-${tripId}-${status}`, () => setTripStatus(tripId, status), `Viaje actualizado a ${status}.`);
  }

  async function captureLocation() {
    if (!selectedDriver) return;
    if (!navigator.geolocation) {
      setMessage('Este dispositivo no permite leer la ubicación.');
      return;
    }

    setBusyAction('gps');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await updateDriverLocation(selectedDriver.id, position.coords.latitude, position.coords.longitude);
          setMessage('Ubicación actualizada con el GPS del celular.');
          await refreshAll();
        } catch (error) {
          setMessage(error.message || 'No se pudo actualizar la ubicación.');
        } finally {
          setBusyAction('');
        }
      },
      (error) => {
        setBusyAction('');
        setMessage(`No se pudo leer la ubicación: ${error.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  function moveDriver(deltaLat, deltaLng) {
    if (!selectedDriver) return;
    runAction(
      `move-${deltaLat}-${deltaLng}`,
      () => updateDriverLocation(selectedDriver.id, Number(selectedDriver.lat) + deltaLat, Number(selectedDriver.lng) + deltaLng),
      'Ubicación del conductor actualizada.'
    );
  }

  const mapsTripUrl = activeTrip ? buildMapsUrl(activeTrip) : '';
  const mapsPickupUrl = activeTrip
    ? buildSinglePointUrl({
        label: activeTrip.originText,
        lat: activeTrip.originLat,
        lng: activeTrip.originLng
      })
    : '';

  return (
    <div className="driver-mobile-layout">
      <section className="driver-hero-card">
        <div>
          <p className="eyebrow">Modo conductor</p>
          <h2>{selectedDriver?.name || 'Conductor'}</h2>
          <p className="driver-hero-subtitle">
            Panel pensado para usar desde el celular: acepta viajes, cambia tu estado, abre Maps y actualiza tu ubicación.
          </p>
        </div>
        <div className="driver-status-pill-row">
          <StatusBadge value={selectedDriver?.status || 'offline'} />
          {activeTrip ? <StatusBadge value={activeTrip.status} /> : <span className="driver-mini-pill">Sin viaje actual</span>}
        </div>
      </section>

      <section className="driver-summary-grid">
        <article className="driver-summary-card highlight">
          <span className="driver-summary-label">Ciudad</span>
          <strong>{city?.name || selectedDriver?.city || 'Sin ciudad'}</strong>
        </article>
        <article className="driver-summary-card">
          <span className="driver-summary-label">Vehículo</span>
          <strong>{selectedDriver?.vehicle || 'No cargado'}</strong>
          <small>{selectedDriver?.plate || 'Sin patente'}</small>
        </article>
        <article className="driver-summary-card">
          <span className="driver-summary-label">Viajes pendientes</span>
          <strong>{availableTrips.length}</strong>
        </article>
      </section>

      {drivers.length > 1 ? (
        <section className="info-card driver-selector-card">
          <label>
            Conductor activo
            <select value={selectedDriver?.id || ''} onChange={(event) => setSelectedDriverId(event.target.value)}>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name} · {driver.city}
                </option>
              ))}
            </select>
          </label>
          <p className="helper-text">Si el conductor inicia sesión desde su propio celular, aquí debería quedar seleccionado él mismo.</p>
        </section>
      ) : null}

      <section className="driver-action-grid">
        <article className="info-card">
          <h2>Estado</h2>
          <div className="driver-button-grid">
            <button className="primary-button" disabled={busyAction === 'status-disponible'} onClick={() => changeStatus('disponible')}>Estoy disponible</button>
            <button disabled={busyAction === 'status-ocupado'} onClick={() => changeStatus('ocupado')}>Estoy ocupado</button>
            <button disabled={busyAction === 'status-offline'} onClick={() => changeStatus('offline')}>Salir de línea</button>
          </div>
        </article>

        <article className="info-card">
          <h2>Ubicación</h2>
          <div className="driver-button-grid">
            <button className="primary-button" disabled={busyAction === 'gps'} onClick={captureLocation}>Actualizar con GPS</button>
            <button disabled={busyAction.startsWith('move-')} onClick={() => moveDriver(0.0025, 0)}>Mover norte</button>
            <button disabled={busyAction.startsWith('move-')} onClick={() => moveDriver(-0.0025, 0)}>Mover sur</button>
            <button disabled={busyAction.startsWith('move-')} onClick={() => moveDriver(0, 0.0025)}>Mover este</button>
            <button disabled={busyAction.startsWith('move-')} onClick={() => moveDriver(0, -0.0025)}>Mover oeste</button>
          </div>
          <p className="helper-text">
            Posición actual: {Number(selectedDriver?.lat || 0).toFixed(5)}, {Number(selectedDriver?.lng || 0).toFixed(5)}
          </p>
        </article>
      </section>

      {message ? <div className="driver-toast">{message}</div> : null}

      <article className="driver-current-trip-card">
        <div className="driver-card-header">
          <div>
            <p className="eyebrow">Mi viaje actual</p>
            <h2>{activeTrip ? `${activeTrip.originText} → ${activeTrip.destinationText}` : 'Todavía no aceptaste ningún viaje'}</h2>
          </div>
          {activeTrip ? <StatusBadge value={activeTrip.status} /> : null}
        </div>

        {activeTrip ? (
          <>
            <div className="driver-trip-detail-grid">
              <div><span>Pasajero</span><strong>{activeTrip.passengerName || 'Sin nombre'}</strong></div>
              <div><span>Pago</span><strong>{activeTrip.paymentMethod || '—'}</strong></div>
              <div><span>Precio</span><strong>{formatMoney(activeTrip.price, activeTrip.currency)}</strong></div>
              <div><span>Teléfono</span><strong>{activeTrip.passengerPhone || '—'}</strong></div>
            </div>

            <div className="driver-button-grid">
              <a className="driver-link-button" href={mapsPickupUrl} target="_blank" rel="noreferrer">Ir a buscar pasajero</a>
              <a className="driver-link-button" href={mapsTripUrl} target="_blank" rel="noreferrer">Abrir ruta completa</a>
              <button disabled={busyAction === `trip-${activeTrip.id}-en_camino`} onClick={() => updateTrip(activeTrip.id, 'en_camino')}>En camino</button>
              <button disabled={busyAction === `trip-${activeTrip.id}-en_viaje`} onClick={() => updateTrip(activeTrip.id, 'en_viaje')}>Iniciar viaje</button>
              <button className="primary-button" disabled={busyAction === `trip-${activeTrip.id}-finalizado`} onClick={() => updateTrip(activeTrip.id, 'finalizado')}>Finalizar viaje</button>
              <button className="danger-button" disabled={busyAction === `trip-${activeTrip.id}-cancelado`} onClick={() => updateTrip(activeTrip.id, 'cancelado')}>Cancelar</button>
            </div>
          </>
        ) : (
          <p className="helper-text">Cuando aceptes un viaje, aquí verás el pasajero, la ruta y los botones grandes para trabajar desde el teléfono.</p>
        )}
      </article>

      <MapView
        center={city?.center ?? { lat: -26.8241, lng: -65.2226 }}
        passenger={activeTrip ? { lat: Number(activeTrip.originLat), lng: Number(activeTrip.originLng) } : selectedDriver ? { lat: Number(selectedDriver.lat), lng: Number(selectedDriver.lng) } : null}
        destination={activeTrip ? { lat: Number(activeTrip.destinationLat), lng: Number(activeTrip.destinationLng) } : null}
        drivers={nearbyDrivers}
      />

      <section className="driver-trip-list-card">
        <div className="driver-card-header">
          <div>
            <p className="eyebrow">Viajes disponibles</p>
            <h2>{availableTrips.length ? 'Solicitudes cercanas a tu ciudad' : 'Sin solicitudes por ahora'}</h2>
          </div>
          <span className="driver-mini-pill">{availableTrips.length} pendientes</span>
        </div>

        {!availableTrips.length ? (
          <p className="helper-text">Mantente disponible y actualiza tu GPS. Cuando entre un viaje nuevo aparecerá aquí.</p>
        ) : (
          <div className="driver-trip-list">
            {availableTrips.map((trip) => (
              <article key={trip.id} className="driver-trip-item">
                <div className="driver-trip-item-top">
                  <div>
                    <strong>{trip.originText} → {trip.destinationText}</strong>
                    <p>{trip.passengerName || 'Pasajero'} · {trip.paymentMethod || 'Pago no indicado'}</p>
                  </div>
                  <div className="driver-trip-side">
                    <StatusBadge value={trip.status} />
                    <strong>{formatMoney(trip.price, trip.currency)}</strong>
                  </div>
                </div>
                <div className="driver-button-grid compact">
                  <a className="driver-link-button" href={buildSinglePointUrl({ label: trip.originText, lat: trip.originLat, lng: trip.originLng })} target="_blank" rel="noreferrer">Ver origen</a>
                  <button className="primary-button" disabled={Boolean(activeTrip) || busyAction === `accept-${trip.id}`} onClick={() => acceptTrip(trip.id)}>Aceptar viaje</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
