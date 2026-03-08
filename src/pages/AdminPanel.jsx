import { Card, Badge } from '../components/Card';
import { formatMoney } from '../services/pricing';

export default function AdminPanel({
  data,
  onBootstrap,
  onReset,
  onAutoAssign,
  onDeleteTrip,
  loading,
  hasFirebaseConfig
}) {
  const openTrips = data.trips.filter((trip) => !['finalizado', 'cancelado'].includes(trip.estado));
  const assigned = data.trips.filter((trip) => trip.conductorId).length;

  return (
    <div className="grid two-col">
      <Card
        title="Panel admin"
        subtitle="Semilla de datos, control de viajes y asignación automática"
        actions={
          <>
            <button className="primary" onClick={onBootstrap} disabled={loading}>Sembrar base</button>
            {!hasFirebaseConfig ? <button onClick={onReset}>Reiniciar demo</button> : null}
          </>
        }
      >
        <div className="stats-grid">
          <div className="stat-box"><span>Viajes abiertos</span><strong>{openTrips.length}</strong></div>
          <div className="stat-box"><span>Asignados</span><strong>{assigned}</strong></div>
          <div className="stat-box"><span>Disponibles</span><strong>{data.drivers.filter((d) => d.estado === 'disponible').length}</strong></div>
          <div className="stat-box"><span>Modo</span><strong>{hasFirebaseConfig ? 'Firebase' : 'Demo local'}</strong></div>
        </div>
      </Card>

      <Card title="Ciudades activas" subtitle="Tarifas configurables por ciudad">
        <div className="list compact">
          {data.cities.map((city) => (
            <div key={city.id} className="list-row">
              <div>
                <strong>{city.nombre}</strong>
                <p>{city.zonaHoraria}</p>
              </div>
              <div className="right">
                <Badge tone="success">{city.pais}</Badge>
                <p>{formatMoney(city.tarifaBase, city.pais === 'AR' ? 'ARS' : city.pais === 'ES' ? 'EUR' : 'USD')}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Viajes" subtitle="Puedes asignar automáticamente el conductor más cercano">
        <div className="list">
          {data.trips.length === 0 ? <p>No hay viajes todavía.</p> : data.trips.map((trip) => (
            <div key={trip.id} className="trip-card">
              <div className="trip-top">
                <div>
                  <strong>{trip.origen.texto} → {trip.destino.texto}</strong>
                  <p>Pasajero: {trip.pasajeroNombre}</p>
                  <p>Conductor: {trip.conductorNombre || 'Sin asignar'}</p>
                </div>
                <Badge tone={trip.estado === 'finalizado' ? 'success' : trip.conductorId ? 'info' : 'warning'}>{trip.estado}</Badge>
              </div>
              <div className="trip-meta">
                <span>{trip.servicio}</span>
                <span>{trip.pagoMetodo}{trip.cryptoMoneda ? ` · ${trip.cryptoMoneda}` : ''}</span>
                <span>{formatMoney(trip.precio, trip.moneda)}</span>
              </div>
              <div className="actions wrap">
                {!trip.conductorId && trip.estado === 'solicitado' ? (
                  <button className="primary" onClick={() => onAutoAssign(trip.id)}>Asignar cercano</button>
                ) : null}
                <button className="danger" onClick={() => onDeleteTrip(trip.id)}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Conductores" subtitle="Estado global de la flota">
        <div className="list compact">
          {data.drivers.map((driver) => (
            <div key={driver.id} className="list-row">
              <div>
                <strong>{driver.nombre}</strong>
                <p>{driver.vehiculo?.marca} {driver.vehiculo?.modelo} · {driver.vehiculo?.patente}</p>
              </div>
              <div className="right">
                <Badge tone={driver.estado === 'disponible' ? 'success' : driver.estado === 'offline' ? 'default' : 'warning'}>{driver.estado}</Badge>
                <p>{driver.ciudad}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
