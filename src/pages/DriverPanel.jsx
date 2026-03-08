import { useMemo, useState } from 'react';
import MapView from '../components/MapView.jsx';
import TableCard from '../components/TableCard.jsx';
import { acceptTripAsDriver, setTripStatus, updateDriverLocation, updateDriverStatus } from '../services/tripService.js';

export default function DriverPanel({ cities, drivers, trips, refreshAll }) {
  const [selectedDriverId, setSelectedDriverId] = useState(drivers[0]?.id || '');
  const [message, setMessage] = useState('');

  const selectedDriver = useMemo(
    () => drivers.find((item) => item.id === selectedDriverId) ?? drivers[0],
    [drivers, selectedDriverId]
  );

  const city = useMemo(
    () => cities.find((item) => item.id === selectedDriver?.city) ?? cities[0],
    [cities, selectedDriver]
  );

  const pendingTrips = useMemo(
    () => trips.filter((item) => item.city === selectedDriver?.city && (item.status === 'solicitado' || item.driverId === selectedDriver?.id)),
    [trips, selectedDriver]
  );

  async function moveDriver(deltaLat, deltaLng) {
    if (!selectedDriver) return;
    try {
      await updateDriverLocation(
        selectedDriver.id,
        Number(selectedDriver.lat) + deltaLat,
        Number(selectedDriver.lng) + deltaLng
      );
      setMessage('Ubicación del conductor actualizada.');
      await refreshAll();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function changeStatus(status) {
    if (!selectedDriver) return;
    try {
      await updateDriverStatus(selectedDriver.id, status);
      setMessage(`Estado del conductor: ${status}`);
      await refreshAll();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function acceptTrip(tripId) {
    if (!selectedDriver) return;
    try {
      await acceptTripAsDriver(tripId, selectedDriver.id);
      setMessage('Viaje aceptado por el conductor.');
      await refreshAll();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function setStatusTrip(tripId, status) {
    try {
      await setTripStatus(tripId, status);
      setMessage(`Viaje actualizado a ${status}.`);
      await refreshAll();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <div className="stack-lg">
      <section className="info-grid">
        <article className="info-card">
          <h2>Panel conductor</h2>
          <label>
            Conductor activo
            <select value={selectedDriverId} onChange={(event) => setSelectedDriverId(event.target.value)}>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name} · {driver.city}
                </option>
              ))}
            </select>
          </label>
          <p>{message || 'Desde aquí puedes simular movimientos, aceptar viajes y finalizarlos.'}</p>
        </article>

        <article className="info-card">
          <h2>Controles rápidos</h2>
          <div className="button-row wrap">
            <button onClick={() => changeStatus('disponible')}>Disponible</button>
            <button onClick={() => changeStatus('ocupado')}>Ocupado</button>
            <button onClick={() => changeStatus('offline')}>Offline</button>
          </div>
          <div className="button-row wrap">
            <button onClick={() => moveDriver(0.003, 0)}>Mover norte</button>
            <button onClick={() => moveDriver(-0.003, 0)}>Mover sur</button>
            <button onClick={() => moveDriver(0, 0.003)}>Mover este</button>
            <button onClick={() => moveDriver(0, -0.003)}>Mover oeste</button>
          </div>
        </article>
      </section>

      <MapView
        center={city?.center ?? { lat: -26.8241, lng: -65.2226 }}
        passenger={selectedDriver ? { lat: Number(selectedDriver.lat), lng: Number(selectedDriver.lng) } : null}
        destination={null}
        drivers={drivers.filter((item) => item.city === selectedDriver?.city)}
      />

      <TableCard
        title="Viajes para este conductor / ciudad"
        columns={[
          { key: 'passengerName', label: 'Pasajero' },
          { key: 'originText', label: 'Origen' },
          { key: 'destinationText', label: 'Destino' },
          { key: 'paymentMethod', label: 'Pago' },
          { key: 'status', label: 'Estado', type: 'status' }
        ]}
        rows={pendingTrips}
        actions={(row) => (
          <div className="action-stack">
            <button onClick={() => acceptTrip(row.id)}>Aceptar</button>
            <button onClick={() => setStatusTrip(row.id, 'en_camino')}>En camino</button>
            <button onClick={() => setStatusTrip(row.id, 'en_viaje')}>En viaje</button>
            <button onClick={() => setStatusTrip(row.id, 'finalizado')}>Finalizar</button>
          </div>
        )}
      />
    </div>
  );
}
