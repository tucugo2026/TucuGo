import { useState } from 'react';
import { Card, Badge } from '../components/Card';
import { formatMoney } from '../services/pricing';

export default function DriverPanel({ data, onDriverStatus, onAccept, onStart, onFinish }) {
  const [driverId, setDriverId] = useState(data.drivers[0]?.id || '');
  const driver = data.drivers.find((item) => item.id === driverId) || data.drivers[0];
  const trips = data.trips.filter(
    (trip) => !driver || trip.ciudad === driver.ciudad || trip.conductorId === driver.id
  );

  return (
    <div className="grid two-col">
      <Card title="Panel conductor" subtitle="Aceptar, iniciar y finalizar viajes">
        {driver ? (
          <>
            <label>
              <span>Conductor</span>
              <select value={driver.id} onChange={(e) => setDriverId(e.target.value)}>
                {data.drivers.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
              </select>
            </label>
            <div className="stats-grid top-gap">
              <div className="stat-box"><span>Estado</span><strong>{driver.estado}</strong></div>
              <div className="stat-box"><span>Ciudad</span><strong>{driver.ciudad}</strong></div>
              <div className="stat-box"><span>Ganancias</span><strong>{formatMoney(driver.ganancias || 0, driver.pais === 'AR' ? 'ARS' : 'USD')}</strong></div>
            </div>
            <div className="actions wrap top-gap">
              <button onClick={() => onDriverStatus(driver.id, 'disponible')}>Disponible</button>
              <button onClick={() => onDriverStatus(driver.id, 'offline')}>Offline</button>
            </div>
          </>
        ) : <p>No hay conductores.</p>}
      </Card>

      <Card title="Viajes de la zona" subtitle="Toma viajes asignados o abiertos de tu ciudad">
        <div className="list">
          {trips.map((trip) => {
            const mine = trip.conductorId === driver?.id;
            return (
              <div key={trip.id} className="trip-card">
                <div className="trip-top">
                  <div>
                    <strong>{trip.origen.texto} → {trip.destino.texto}</strong>
                    <p>{trip.pasajeroNombre} · {trip.servicio}</p>
                  </div>
                  <Badge tone={mine ? 'info' : trip.estado === 'solicitado' ? 'warning' : 'default'}>{trip.estado}</Badge>
                </div>
                <div className="trip-meta">
                  <span>{formatMoney(trip.precio, trip.moneda)}</span>
                  <span>{trip.pagoMetodo}{trip.cryptoMoneda ? ` · ${trip.cryptoMoneda}` : ''}</span>
                </div>
                <div className="actions wrap">
                  {!trip.conductorId && trip.estado === 'solicitado' ? (
                    <button className="primary" onClick={() => onAccept(trip.id, driver.id)}>Aceptar</button>
                  ) : null}
                  {mine && trip.estado === 'aceptado' ? (
                    <button className="primary" onClick={() => onStart(trip.id)}>Iniciar</button>
                  ) : null}
                  {mine && trip.estado === 'en_viaje' ? (
                    <button className="primary" onClick={() => onFinish(trip.id)}>Finalizar</button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
