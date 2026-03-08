import { useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from '../../services/firebase.js';
import { haversineKm } from '../../services/geo.js';
import './ConductorPanel.css';

export default function ConductorPanel({ profile, trips, refreshAll }) {
  const conductorId =
    profile?.uid ||
    profile?.userId ||
    profile?.id ||
    localStorage.getItem('conductorId') ||
    'CONDUCTOR_PRUEBA';

  const [conductor, setConductor] = useState(null);
  const [gpsActivo, setGpsActivo] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [ubicacionTexto, setUbicacionTexto] = useState('Sin ubicación todavía');
  const [actualizando, setActualizando] = useState(false);
  const [pendingTrips, setPendingTrips] = useState([]);
  const watchIdRef = useRef(null);

  useEffect(() => {
    if (!conductorId) return;

    const unsubscribe = onSnapshot(doc(db, 'conductores', conductorId), (snap) => {
      if (snap.exists()) {
        setConductor({ id: snap.id, ...snap.data() });
      }
    });

    return () => unsubscribe();
  }, [conductorId]);

  useEffect(() => {
    const q = query(collection(db, 'viajes'), where('estado', '==', 'solicitado'));

    const unsubscribe = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }));
      setPendingTrips(rows);
    });

    return () => unsubscribe();
  }, []);

  async function actualizarEstadoConductor(nuevoEstado, extras = {}) {
    try {
      await updateDoc(doc(db, 'conductores', conductorId), {
        estado: nuevoEstado,
        status: nuevoEstado,
        actualizadoEn: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...extras
      });

      await refreshAll?.();
    } catch (error) {
      console.error('Error actualizando estado del conductor:', error);
      alert('No se pudo actualizar el estado del conductor.');
    }
  }

  async function guardarUbicacion(lat, lng, accuracy = null) {
    try {
      await updateDoc(doc(db, 'conductores', conductorId), {
        ubicacion: {
          lat,
          lng,
          accuracy,
          actualizado: new Date().toISOString()
        },
        actualizadoEn: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setUbicacionTexto(`Lat: ${lat.toFixed(6)} | Lng: ${lng.toFixed(6)}`);
      setGpsError('');
    } catch (error) {
      console.error('Error guardando ubicación:', error);
      setGpsError('No se pudo guardar la ubicación en Firebase.');
    }
  }

  function iniciarGPS() {
    if (!navigator.geolocation) {
      setGpsError('Este dispositivo no soporta geolocalización.');
      return;
    }

    setGpsError('');

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy || null;

        setGpsActivo(true);
        await guardarUbicacion(lat, lng, accuracy);
      },
      (error) => {
        console.error('Error GPS:', error);

        let mensaje = 'No se pudo obtener la ubicación.';
        if (error.code === 1) mensaje = 'Permiso de ubicación denegado.';
        if (error.code === 2) mensaje = 'Ubicación no disponible.';
        if (error.code === 3) mensaje = 'Tiempo agotado para obtener ubicación.';

        setGpsActivo(false);
        setGpsError(mensaje);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000
      }
    );
  }

  function detenerGPS() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setGpsActivo(false);
  }

  function obtenerUbicacionUnaVez() {
    if (!navigator.geolocation) {
      setGpsError('Este dispositivo no soporta geolocalización.');
      return;
    }

    setActualizando(true);
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const accuracy = position.coords.accuracy || null;

          setGpsActivo(true);
          await guardarUbicacion(lat, lng, accuracy);
        } finally {
          setActualizando(false);
        }
      },
      (error) => {
        console.error('Error GPS manual:', error);

        let mensaje = 'No se pudo obtener la ubicación.';
        if (error.code === 1) mensaje = 'Permiso de ubicación denegado.';
        if (error.code === 2) mensaje = 'Ubicación no disponible.';
        if (error.code === 3) mensaje = 'Tiempo agotado para obtener ubicación.';

        setGpsActivo(false);
        setGpsError(mensaje);
        setActualizando(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000
      }
    );
  }

  useEffect(() => {
    if (!conductorId) return;

    iniciarGPS();

    return () => {
      detenerGPS();
    };
  }, [conductorId]);

  const nombre = conductor?.nombre || profile?.nombre || 'Conductor';
  const estado = conductor?.estado || conductor?.status || 'pendiente';
  const vehiculo = conductor?.vehiculo || conductor?.vehiculoNombre || conductor?.vehicleType || '-';
  const patente = conductor?.patente || '-';
  const conductorVehicleType = (
    conductor?.vehicleType ||
    conductor?.vehiculoTipo ||
    conductor?.tipoVehiculo ||
    ''
  )
    .toString()
    .toLowerCase();

  const viajeActual = useMemo(() => {
    if (!Array.isArray(trips)) return null;

    return (
      trips.find((trip) => {
        const tripDriverId = trip?.conductorId || trip?.driverId || trip?.conductorUid;
        const mismoConductor = tripDriverId === conductorId;
        const activo = ['aceptado', 'en_camino', 'en_viaje'].includes(trip?.estado || trip?.status);
        return mismoConductor && activo;
      }) || null
    );
  }, [trips, conductorId]);

  const viajesCompatibles = useMemo(() => {
    const conductorPos = conductor?.ubicacion;

    return pendingTrips
      .filter((trip) => {
        const tripType = (
          trip?.serviceType ||
          trip?.vehicleTypeRequested ||
          trip?.tripType ||
          ''
        )
          .toString()
          .toLowerCase();

        if (conductorVehicleType && tripType && conductorVehicleType !== tripType) {
          return false;
        }

        return true;
      })
      .map((trip) => {
        let distanceKm = null;

        const tripLat = trip?.originLat ?? trip?.origenLat ?? null;
        const tripLng = trip?.originLng ?? trip?.origenLng ?? null;

        if (
          conductorPos?.lat != null &&
          conductorPos?.lng != null &&
          tripLat != null &&
          tripLng != null
        ) {
          distanceKm = haversineKm(
            { lat: conductorPos.lat, lng: conductorPos.lng },
            { lat: tripLat, lng: tripLng }
          );
        }

        return {
          ...trip,
          distanceKm
        };
      })
      .sort((a, b) => {
        if (a.distanceKm == null && b.distanceKm == null) return 0;
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });
  }, [pendingTrips, conductor?.ubicacion, conductorVehicleType]);

  async function aceptarViaje(trip) {
    try {
      if (viajeActual) {
        alert('Ya tienes un viaje activo. Finalízalo o cancélalo antes de aceptar otro.');
        return;
      }

      await updateDoc(doc(db, 'viajes', trip.id), {
        estado: 'aceptado',
        status: 'aceptado',
        conductorId: conductorId,
        driverId: conductorId,
        conductorNombre: nombre,
        driverName: nombre,
        conductorTelefono: conductor?.telefono || conductor?.phone || '',
        acceptedAt: serverTimestamp(),
        actualizadoEn: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await actualizarEstadoConductor('ocupado', {
        viajeActualId: trip.id
      });
    } catch (error) {
      console.error('Error aceptando viaje:', error);
      alert('No se pudo aceptar el viaje.');
    }
  }

  async function rechazarViaje(trip) {
    try {
      await updateDoc(doc(db, 'viajes', trip.id), {
        rechazadoPor: conductorId,
        rejectedBy: conductorId,
        updatedAt: serverTimestamp(),
        actualizadoEn: serverTimestamp()
      });

      alert('Viaje rechazado para este conductor. Sigue disponible para otros.');
    } catch (error) {
      console.error('Error rechazando viaje:', error);
      alert('No se pudo rechazar el viaje.');
    }
  }

  async function cambiarEstadoViaje(nuevoEstado) {
    if (!viajeActual?.id) return;

    try {
      await updateDoc(doc(db, 'viajes', viajeActual.id), {
        estado: nuevoEstado,
        status: nuevoEstado,
        actualizadoEn: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      if (nuevoEstado === 'finalizado' || nuevoEstado === 'cancelado') {
        await actualizarEstadoConductor('disponible', {
          viajeActualId: ''
        });
      }

      await refreshAll?.();
    } catch (error) {
      console.error('Error actualizando viaje:', error);
      alert('No se pudo actualizar el viaje.');
    }
  }

  function abrirMaps() {
    const lat =
      viajeActual?.originLat ??
      viajeActual?.origenLat ??
      viajeActual?.pickupLat ??
      viajeActual?.lat;

    const lng =
      viajeActual?.originLng ??
      viajeActual?.origenLng ??
      viajeActual?.pickupLng ??
      viajeActual?.lng;

    if (lat == null || lng == null) {
      alert('Este viaje todavía no tiene coordenadas para abrir en Maps.');
      return;
    }

    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  }

  return (
    <div className="conductor-page">
      <header className="conductor-header">
        <h1>Panel del conductor</h1>
        <p>Uso desde celular</p>
      </header>

      <section className="conductor-card principal">
        <h2>{nombre}</h2>
        <p><strong>Estado:</strong> {estado}</p>
        <p><strong>Vehículo:</strong> {vehiculo}</p>
        <p><strong>Patente:</strong> {patente}</p>
      </section>

      <section className="conductor-card">
        <h3>GPS del conductor</h3>
        <p><strong>Estado GPS:</strong> {gpsActivo ? 'Activo' : 'Inactivo'}</p>
        <p><strong>Última ubicación:</strong> {ubicacionTexto}</p>

        {gpsError ? <p className="error-text">{gpsError}</p> : null}

        <div className="botones-grid">
          <button className="btn azul" onClick={obtenerUbicacionUnaVez}>
            {actualizando ? 'Actualizando...' : 'Actualizar GPS'}
          </button>

          <button className="btn verde" onClick={iniciarGPS}>
            Iniciar GPS
          </button>

          <button className="btn gris" onClick={detenerGPS}>
            Detener GPS
          </button>
        </div>
      </section>

      <section className="conductor-card">
        <h3>Estado de trabajo</h3>
        <div className="botones-grid">
          <button
            className="btn verde"
            onClick={() => actualizarEstadoConductor('disponible', { viajeActualId: '' })}
          >
            Estoy disponible
          </button>

          <button
            className="btn naranja"
            onClick={() => actualizarEstadoConductor('ocupado')}
          >
            Estoy ocupado
          </button>
        </div>
      </section>

      <section className="conductor-card">
        <h3>Viajes disponibles</h3>

        {viajesCompatibles.length ? (
          <div className="stack-md">
            {viajesCompatibles.map((trip) => (
              <div
                key={trip.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '14px',
                  padding: '14px'
                }}
              >
                <p><strong>Origen:</strong> {trip.originText || trip.origen || trip.pickup || '-'}</p>
                <p><strong>Destino:</strong> {trip.destinationText || trip.destino || trip.dropoff || '-'}</p>
                <p><strong>Pasajero:</strong> {trip.passengerName || trip.pasajeroNombre || '-'}</p>
                <p><strong>Tipo:</strong> {(trip.serviceType || trip.vehicleTypeRequested || trip.tripType || '-').toString()}</p>
                <p><strong>Precio:</strong> ${trip.price || trip.precio || 0}</p>
                <p>
                  <strong>Distancia:</strong>{' '}
                  {trip.distanceKm != null ? `${trip.distanceKm.toFixed(2)} km` : '—'}
                </p>

                <div className="botones-grid">
                  <button
                    className="btn verde"
                    onClick={() => aceptarViaje(trip)}
                    disabled={!!viajeActual}
                  >
                    Aceptar viaje
                  </button>

                  <button
                    className="btn gris"
                    onClick={() => rechazarViaje(trip)}
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No hay viajes disponibles para este conductor ahora mismo.</p>
        )}
      </section>

      <section className="conductor-card">
        <h3>Mi viaje actual</h3>

        {viajeActual ? (
          <>
            <p><strong>Origen:</strong> {viajeActual.originText || viajeActual.origen || viajeActual.pickup || '-'}</p>
            <p><strong>Destino:</strong> {viajeActual.destinationText || viajeActual.destino || viajeActual.dropoff || '-'}</p>
            <p><strong>Pasajero:</strong> {viajeActual.passengerName || viajeActual.pasajeroNombre || '-'}</p>
            <p><strong>Estado:</strong> {viajeActual.estado || viajeActual.status || '-'}</p>
            <p><strong>Pago:</strong> {viajeActual.paymentMethod || viajeActual.metodoPago || '-'}</p>
            <p><strong>Precio:</strong> ${viajeActual.price || viajeActual.precio || 0}</p>

            <div className="botones-grid">
              <button className="btn azul" onClick={abrirMaps}>
                Abrir Google Maps
              </button>

              <button
                className="btn naranja"
                onClick={() => cambiarEstadoViaje('en_camino')}
              >
                En camino
              </button>

              <button
                className="btn azul"
                onClick={() => cambiarEstadoViaje('en_viaje')}
              >
                Iniciar viaje
              </button>

              <button
                className="btn verde"
                onClick={() => cambiarEstadoViaje('finalizado')}
              >
                Finalizar viaje
              </button>

              <button
                className="btn gris"
                onClick={() => cambiarEstadoViaje('cancelado')}
              >
                Cancelar viaje
              </button>
            </div>
          </>
        ) : (
          <p>No tienes un viaje activo en este momento.</p>
        )}
      </section>
    </div>
  );
}