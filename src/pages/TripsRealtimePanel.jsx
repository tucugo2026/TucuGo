import { useMemo, useState } from 'react';
import { assignNearestDriverToTrip, setTripStatus } from '../services/tripService.js';
import { formatMoney } from '../services/pricing.js';
import StatusBadge from '../components/StatusBadge.jsx';

const STATUS_COLUMNS = [
  { id: 'solicitado', label: 'Solicitados' },
  { id: 'aceptado', label: 'Aceptados' },
  { id: 'en_camino', label: 'En camino' },
  { id: 'en_viaje', label: 'En viaje' },
  { id: 'finalizado', label: 'Finalizados' },
  { id: 'cancelado', label: 'Cancelados' }
];

export default function TripsRealtimePanel({ trips, cities, refreshAll }) {
  const [busyTripId, setBusyTripId] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  const cityMap = useMemo(() => Object.fromEntries(cities.map((city) => [city.id, city])), [cities]);

  const filteredTrips = useMemo(() => {
    const term = search.trim().toLowerCase();
    return trips.filter((trip) => {
      const searchable = [
        trip.passengerName,
        trip.originText,
        trip.destinationText,
        trip.driverName,
        cityMap[trip.city]?.name,
        trip.paymentMethod
      ]
        .join(' ')
        .toLowerCase();

      const matchesSearch = !term || searchable.includes(term);
      const matchesPayment = !paymentFilter || trip.paymentMethod === paymentFilter;
      return matchesSearch && matchesPayment;
    });
  }, [trips, search, paymentFilter, cityMap]);

  const counters = useMemo(() => {
    const base = { total: filteredTrips.length };
    for (const column of STATUS_COLUMNS) base[column.id] = 0;
    filteredTrips.forEach((trip) => {
      base[trip.status] = (base[trip.status] || 0) + 1;
    });
    return base;
  }, [filteredTrips]);

  async function runAction(tripId, action) {
    try {
      setBusyTripId(tripId);
      if (action === 'assign') {
        const driver = await assignNearestDriverToTrip(tripId);
        setMessage(`Conductor asignado: ${driver.name}`);
      } else {
        await setTripStatus(tripId, action);
        setMessage(`Viaje actualizado a ${action}.`);
      }
      await refreshAll();
    } catch (error) {
      setMessage(error.message || 'No se pudo actualizar el viaje.');
    } finally {
      setBusyTripId('');
    }
  }

  function renderActions(trip) {
    const busy = busyTripId === trip.id;
    if (trip.status === 'solicitado') {
      return (
        <div className="action-stack realtime-actions">
          <button disabled={busy} onClick={() => runAction(trip.id, 'assign')}>Asignar cercano</button>
          <button disabled={busy} onClick={() => runAction(trip.id, 'cancelado')}>Cancelar</button>
        </div>
      );
    }
    if (trip.status === 'aceptado') {
      return (
        <div className="action-stack realtime-actions">
          <button disabled={busy} onClick={() => runAction(trip.id, 'en_camino')}>En camino</button>
          <button disabled={busy} onClick={() => runAction(trip.id, 'cancelado')}>Cancelar</button>
        </div>
      );
    }
    if (trip.status === 'en_camino') {
      return (
        <div className="action-stack realtime-actions">
          <button disabled={busy} onClick={() => runAction(trip.id, 'en_viaje')}>Iniciar viaje</button>
          <button disabled={busy} onClick={() => runAction(trip.id, 'cancelado')}>Cancelar</button>
        </div>
      );
    }
    if (trip.status === 'en_viaje') {
      return (
        <div className="action-stack realtime-actions">
          <button className="primary-button" disabled={busy} onClick={() => runAction(trip.id, 'finalizado')}>Finalizar</button>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="stack-lg">
      <section className="info-grid">
        <article className="info-card">
          <h2>Panel visual de viajes en tiempo real</h2>
          <p>
            Aquí ves el flujo completo del viaje por columnas: solicitado, aceptado, en camino, en viaje,
            finalizado o cancelado.
          </p>
          <p>{message || 'Listo para operar.'}</p>
        </article>

        <article className="info-card">
          <h2>Resumen</h2>
          <div className="realtime-stats">
            <div><strong>{counters.total}</strong><span>Total</span></div>
            <div><strong>{counters.solicitado || 0}</strong><span>Solicitados</span></div>
            <div><strong>{counters.aceptado || 0}</strong><span>Aceptados</span></div>
            <div><strong>{counters.en_camino || 0}</strong><span>En camino</span></div>
            <div><strong>{counters.en_viaje || 0}</strong><span>En viaje</span></div>
            <div><strong>{counters.finalizado || 0}</strong><span>Finalizados</span></div>
          </div>
        </article>
      </section>

      <section className="toolbar-card">
        <input
          placeholder="Buscar pasajero, origen, destino, conductor o ciudad"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}>
          <option value="">Todos los pagos</option>
          <option value="Efectivo">Efectivo</option>
          <option value="Transferencia">Transferencia</option>
          <option value="Tarjeta">Tarjeta</option>
          <option value="USDC">USDC</option>
          <option value="USDT">USDT</option>
          <option value="BTC">BTC</option>
        </select>
      </section>

      <section className="realtime-board">
        {STATUS_COLUMNS.map((column) => {
          const rows = filteredTrips.filter((trip) => trip.status === column.id);
          return (
            <article key={column.id} className="realtime-column">
              <div className="realtime-column-header">
                <h3>{column.label}</h3>
                <span>{rows.length}</span>
              </div>

              <div className="realtime-list">
                {rows.length ? rows.map((trip) => {
                  const city = cityMap[trip.city];
                  return (
                    <div key={trip.id} className={`realtime-trip-card realtime-${trip.status}`}>
                      <div className="realtime-trip-title">
                        <strong>{trip.originText}</strong>
                        <span>→</span>
                        <strong>{trip.destinationText}</strong>
                      </div>
                      <div className="realtime-trip-body">
                        <p><strong>Pasajero:</strong> {trip.passengerName}</p>
                        <p><strong>Conductor:</strong> {trip.driverName || 'Sin asignar'}</p>
                        <p><strong>Ciudad:</strong> {city?.name || trip.city}</p>
                        <p><strong>Pago:</strong> {trip.paymentMethod}</p>
                        <p><strong>Precio:</strong> {formatMoney(trip.price, trip.currency || city?.currency || 'ARS')}</p>
                        <p><strong>Estado:</strong> <StatusBadge value={trip.status} /></p>
                      </div>
                      {renderActions(trip)}
                    </div>
                  );
                }) : <div className="empty-column">Sin viajes</div>}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
