import { useMemo, useState } from 'react';
import TableCard from '../components/TableCard.jsx';
import { seedBaseData, assignNearestDriverToTrip, deleteTrip, setTripStatus } from '../services/tripService.js';
import { formatMoney } from '../services/pricing.js';

export default function AdminPanel({ cities, drivers, trips, refreshAll }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const cityName = useMemo(() => Object.fromEntries(cities.map((city) => [city.id, city.name])), [cities]);

  async function handleSeed() {
    try {
      setBusy(true);
      setMessage('Cargando base inicial...');
      await seedBaseData();
      await refreshAll();
      setMessage('Base inicial cargada correctamente.');
    } catch (error) {
      setMessage(`Error al sembrar datos: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleAssign(tripId) {
    try {
      setBusy(true);
      const nearest = await assignNearestDriverToTrip(tripId);
      setMessage(`Conductor asignado: ${nearest.name}`);
      await refreshAll();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(tripId) {
    try {
      setBusy(true);
      await deleteTrip(tripId);
      setMessage('Viaje eliminado.');
      await refreshAll();
    } catch (error) {
      setMessage(`No se pudo eliminar: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleTripStatus(tripId, status) {
    try {
      setBusy(true);
      await setTripStatus(tripId, status);
      setMessage(`Estado actualizado a ${status}.`);
      await refreshAll();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  const tripRows = trips.map((trip) => ({
    id: trip.id,
    passenger: trip.passengerName,
    city: cityName[trip.city] ?? trip.city,
    origin: trip.originText,
    destination: trip.destinationText,
    driver: trip.driverName || 'Sin asignar',
    payment: trip.paymentMethod,
    status: trip.status,
    price: formatMoney(trip.price, trip.currency)
  }));

  const driverRows = drivers.map((driver) => ({
    id: driver.id,
    name: driver.name,
    city: cityName[driver.city] ?? driver.city,
    vehicle: driver.vehicle,
    crypto: driver.acceptsCrypto ? 'Sí' : 'No',
    status: driver.status
  }));

  return (
    <div className="stack-lg">
      <section className="info-grid">
        <article className="info-card">
          <h2>Panel admin</h2>
          <p>
            Desde aquí puedes sembrar la base inicial, revisar viajes, asignar el conductor más cercano y cerrar viajes.
          </p>
        </article>
        <article className="info-card">
          <h2>Estado</h2>
          <p>{message || 'Listo para operar.'}</p>
          <button className="primary-button" onClick={handleSeed} disabled={busy}>
            {busy ? 'Procesando...' : 'Sembrar base inicial'}
          </button>
        </article>
      </section>

      <TableCard
        title="Viajes"
        columns={[
          { key: 'passenger', label: 'Pasajero' },
          { key: 'city', label: 'Ciudad' },
          { key: 'origin', label: 'Origen' },
          { key: 'destination', label: 'Destino' },
          { key: 'driver', label: 'Conductor' },
          { key: 'payment', label: 'Pago' },
          { key: 'price', label: 'Precio' },
          { key: 'status', label: 'Estado', type: 'status' }
        ]}
        rows={tripRows}
        actions={(row) => (
          <div className="action-stack">
            <button onClick={() => handleAssign(row.id)}>Asignar cercano</button>
            <button onClick={() => handleTripStatus(row.id, 'en_camino')}>En camino</button>
            <button onClick={() => handleTripStatus(row.id, 'en_viaje')}>En viaje</button>
            <button onClick={() => handleTripStatus(row.id, 'finalizado')}>Finalizar</button>
            <button className="danger-button" onClick={() => handleDelete(row.id)}>Eliminar</button>
          </div>
        )}
      />

      <TableCard
        title="Conductores"
        columns={[
          { key: 'name', label: 'Nombre' },
          { key: 'city', label: 'Ciudad' },
          { key: 'vehicle', label: 'Vehículo' },
          { key: 'crypto', label: 'Cripto' },
          { key: 'status', label: 'Estado', type: 'status' }
        ]}
        rows={driverRows}
      />
    </div>
  );
}
