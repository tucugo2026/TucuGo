import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return localStorage.getItem('tucugo_sound_enabled') !== '0';
    } catch {
      return true;
    }
  });
  const seenTripIdsRef = useRef(new Set());
  const didInitRef = useRef(false);

  function playNewTripSound() {
    try {
      const AudioContextRef = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextRef) return false;

      const audio = new AudioContextRef();
      const now = audio.currentTime;
      const master = audio.createGain();
      master.connect(audio.destination);
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

      [880, 1174, 1568].forEach((freq, index) => {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.12);
        gain.gain.setValueAtTime(0.0001, now + index * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.35, now + index * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.12 + 0.18);
        osc.connect(gain);
        gain.connect(master);
        osc.start(now + index * 0.12);
        osc.stop(now + index * 0.12 + 0.2);
      });

      window.setTimeout(() => {
        audio.close().catch(() => null);
      }, 1200);
      return true;
    } catch (error) {
      console.warn('No se pudo reproducir el sonido.', error);
      return false;
    }
  }

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

  useEffect(() => {
    try {
      localStorage.setItem('tucugo_sound_enabled', soundEnabled ? '1' : '0');
    } catch {
      // ignore
    }
  }, [soundEnabled]);

  useEffect(() => {
    const currentIds = new Set(trips.map((trip) => trip.id));

    if (!didInitRef.current) {
      seenTripIdsRef.current = currentIds;
      didInitRef.current = true;
      return;
    }

    const newRequestedTrips = trips.filter((trip) => !seenTripIdsRef.current.has(trip.id) && trip.status === 'solicitado');

    if (newRequestedTrips.length && soundEnabled) {
      const ok = playNewTripSound();
      const amount = newRequestedTrips.length;
      setMessage(ok
        ? `${amount} nuevo${amount > 1 ? 's' : ''} viaje${amount > 1 ? 's' : ''} solicitado${amount > 1 ? 's' : ''}.`
        : 'Entró un viaje nuevo, pero el navegador bloqueó el sonido hasta que toques la pantalla.');
    }

    seenTripIdsRef.current = currentIds;
  }, [trips, soundEnabled]);


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
        <div className="sound-tools">
          <button
            type="button"
            className={`sound-toggle ${soundEnabled ? 'active' : ''}`}
            onClick={() => setSoundEnabled((value) => !value)}
          >
            {soundEnabled ? '🔔 Sonido activado' : '🔕 Sonido apagado'}
          </button>
          <button
            type="button"
            className="sound-test"
            onClick={() => {
              const ok = playNewTripSound();
              setMessage(ok ? 'Sonido de prueba reproducido.' : 'El navegador bloqueó el audio. Tocá primero un botón y prueba otra vez.');
            }}
          >
            Probar sonido
          </button>
        </div>
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
