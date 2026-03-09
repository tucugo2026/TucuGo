import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase.js';

function formatDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
}

function isToday(dateValue) {
  if (!dateValue) return false;
  const d = new Date(dateValue);
  const now = new Date();

  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function AdminPanel() {
  const [trips, setTrips] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const unsubTrips = onSnapshot(collection(db, 'viajes'), (snap) => {
      const rows = snap.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data()
      }));
      setTrips(rows);
    });

    const unsubDrivers = onSnapshot(collection(db, 'conductores'), (snap) => {
      const rows = snap.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data()
      }));
      setDrivers(rows);
    });

    const unsubUsers = onSnapshot(collection(db, 'usuarios'), (snap) => {
      const rows = snap.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data()
      }));
      setUsers(rows);
    });

    return () => {
      unsubTrips();
      unsubDrivers();
      unsubUsers();
    };
  }, []);

  const stats = useMemo(() => {
    const viajesHoy = trips.filter((trip) => isToday(trip.createdAt));
    const viajesFinalizados = trips.filter((trip) => trip.estado === 'finalizado');
    const viajesCancelados = trips.filter((trip) => trip.estado === 'cancelado');
    const viajesActivos = trips.filter((trip) =>
      ['solicitado', 'aceptado', 'en_camino', 'llegue', 'en_viaje', 'reservado'].includes(trip.estado)
    );

    const conductoresDisponibles = drivers.filter(
      (driver) => (driver.estado || driver.status) === 'disponible'
    );
    const conductoresOcupados = drivers.filter(
      (driver) => (driver.estado || driver.status) === 'ocupado'
    );
    const conductoresAprobados = drivers.filter(
      (driver) => driver.aprobado === true || driver.aprobado === 'true'
    );

    const gananciaHoy = viajesHoy
      .filter((trip) => trip.estado === 'finalizado')
      .reduce((acc, trip) => acc + Number(trip.comisionApp || 0), 0);

    const recaudacionHoy = viajesHoy
      .filter((trip) => trip.estado === 'finalizado')
      .reduce((acc, trip) => acc + Number(trip.price || 0), 0);

    const comisionTotal = trips
      .filter((trip) => trip.estado === 'finalizado')
      .reduce((acc, trip) => acc + Number(trip.comisionApp || 0), 0);

    const totalPagadoConductores = trips
      .filter((trip) => trip.estado === 'finalizado')
      .reduce((acc, trip) => acc + Number(trip.gananciaConductor || 0), 0);

    const totalRecargoDomingo = trips.reduce(
      (acc, trip) => acc + Number(trip.recargoDomingo || 0),
      0
    );

    const totalRecargoLluvia = trips.reduce(
      (acc, trip) => acc + Number(trip.recargoLluvia || 0),
      0
    );

    const totalRecargoDemanda = trips.reduce(
      (acc, trip) => acc + Number(trip.recargoDemanda || 0),
      0
    );

    return {
      viajesHoy: viajesHoy.length,
      viajesTotales: trips.length,
      viajesActivos: viajesActivos.length,
      viajesFinalizados: viajesFinalizados.length,
      viajesCancelados: viajesCancelados.length,
      conductoresTotales: drivers.length,
      conductoresDisponibles: conductoresDisponibles.length,
      conductoresOcupados: conductoresOcupados.length,
      conductoresAprobados: conductoresAprobados.length,
      usuariosTotales: users.length,
      gananciaHoy,
      recaudacionHoy,
      comisionTotal,
      totalPagadoConductores,
      totalRecargoDomingo,
      totalRecargoLluvia,
      totalRecargoDemanda
    };
  }, [trips, drivers, users]);

  const bestDrivers = useMemo(() => {
    const map = new Map();

    trips.forEach((trip) => {
      const driverId = trip.conductorId || trip.driverId;
      const driverName = trip.conductorNombre || trip.driverName || 'Sin nombre';

      if (!driverId) return;
      if (trip.estado !== 'finalizado') return;

      if (!map.has(driverId)) {
        map.set(driverId, {
          id: driverId,
          nombre: driverName,
          viajes: 0,
          total: 0,
          comision: 0
        });
      }

      const item = map.get(driverId);
      item.viajes += 1;
      item.total += Number(trip.gananciaConductor || 0);
      item.comision += Number(trip.comisionApp || 0);
    });

    return Array.from(map.values())
      .sort((a, b) => b.viajes - a.viajes || b.total - a.total)
      .slice(0, 5);
  }, [trips]);

  const recentTrips = useMemo(() => {
    return [...trips]
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      .slice(0, 10);
  }, [trips]);

  return (
    <div className="stack-lg">
      <section className="info-grid">
        <article className="info-card highlight">
          <h2>Ganancia de hoy</h2>
          <strong className="big-number">${stats.gananciaHoy}</strong>
          <p>Comisiones de viajes finalizados hoy</p>
        </article>

        <article className="info-card">
          <h2>Recaudación de hoy</h2>
          <strong className="big-number">${stats.recaudacionHoy}</strong>
          <p>Total cobrado en viajes finalizados hoy</p>
        </article>

        <article className="info-card">
          <h2>Comisión total</h2>
          <strong className="big-number">${stats.comisionTotal}</strong>
          <p>Total histórico ganado por TucuGo</p>
        </article>

        <article className="info-card">
          <h2>Pagado a conductores</h2>
          <strong className="big-number">${stats.totalPagadoConductores}</strong>
          <p>Total histórico para conductores</p>
        </article>
      </section>

      <section className="info-grid">
        <article className="info-card">
          <h2>Recargos</h2>
          <p><b>Domingo:</b> ${stats.totalRecargoDomingo}</p>
          <p><b>Lluvia:</b> ${stats.totalRecargoLluvia}</p>
          <p><b>Demanda:</b> ${stats.totalRecargoDemanda}</p>
        </article>

        <article className="info-card">
          <h2>Viajes</h2>
          <p><b>Hoy:</b> {stats.viajesHoy}</p>
          <p><b>Totales:</b> {stats.viajesTotales}</p>
          <p><b>Activos:</b> {stats.viajesActivos}</p>
          <p><b>Finalizados:</b> {stats.viajesFinalizados}</p>
          <p><b>Cancelados:</b> {stats.viajesCancelados}</p>
        </article>

        <article className="info-card">
          <h2>Conductores</h2>
          <p><b>Totales:</b> {stats.conductoresTotales}</p>
          <p><b>Aprobados:</b> {stats.conductoresAprobados}</p>
          <p><b>Disponibles:</b> {stats.conductoresDisponibles}</p>
          <p><b>Ocupados:</b> {stats.conductoresOcupados}</p>
        </article>

        <article className="info-card">
          <h2>Usuarios</h2>
          <p><b>Totales:</b> {stats.usuariosTotales}</p>
          <p><b>Pasajeros + Admins:</b> {stats.usuariosTotales}</p>
        </article>
      </section>

      <section className="stack-md">
        <h2>Mejores conductores</h2>

        {bestDrivers.length === 0 ? (
          <p>No hay viajes finalizados todavía.</p>
        ) : (
          bestDrivers.map((driver, index) => (
            <div key={driver.id} className="info-card">
              <p><b>#{index + 1}</b> {driver.nombre}</p>
              <p><b>Viajes finalizados:</b> {driver.viajes}</p>
              <p><b>Ganancia conductor:</b> ${driver.total}</p>
              <p><b>Comisión generada:</b> ${driver.comision}</p>
            </div>
          ))
        )}
      </section>

      <section className="stack-md">
        <h2>Últimos viajes</h2>

        {recentTrips.length === 0 ? (
          <p>No hay viajes todavía.</p>
        ) : (
          recentTrips.map((trip) => (
            <div key={trip.id} className="info-card">
              <p><b>Pasajero:</b> {trip.passengerName || '-'}</p>
              <p><b>Conductor:</b> {trip.conductorNombre || '-'}</p>
              <p><b>Origen:</b> {trip.originText || '-'}</p>
              <p><b>Destino:</b> {trip.destinationText || '-'}</p>
              <p><b>Servicio:</b> {trip.serviceType || '-'}</p>
              <p><b>Estado:</b> {trip.estado || '-'}</p>
              <p><b>Precio base:</b> ${trip.precioBase || 0}</p>
              <p><b>Precio final:</b> ${trip.price || 0}</p>
              <p><b>Recargo domingo:</b> ${trip.recargoDomingo || 0}</p>
              <p><b>Recargo lluvia:</b> ${trip.recargoLluvia || 0}</p>
              <p><b>Recargo demanda:</b> ${trip.recargoDemanda || 0}</p>
              <p><b>Comisión app:</b> ${trip.comisionApp || 0}</p>
              <p><b>Ganancia conductor:</b> ${trip.gananciaConductor || 0}</p>
              <p><b>Fecha:</b> {formatDate(trip.createdAt)}</p>
            </div>
          ))
        )}
      </section>
    </div>
  );
}