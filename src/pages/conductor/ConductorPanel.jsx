import { useEffect, useMemo, useRef, useState } from 'react';
import {
  doc,
  onSnapshot,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../services/firebase.js';
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

  async function actualizarEstado(nuevoEstado) {
    try {
      await updateDoc(doc(db, 'conductores', conductorId), {
        estado: nuevoEstado,
        actualizadoEn: serverTimestamp()
      });

      await refreshAll?.();
    } catch (error) {
      console.error('Error actualizando estado:', error);
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
        actualizadoEn: serverTimestamp()
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
  const estado = conductor?.estado || 'pendiente';
  const vehiculo = conductor?.vehiculo || conductor?.vehiculoNombre || '-';
  const patente = conductor?.patente || '-';

  const viajeActual = useMemo(() => {
    if (!Array.isArray(trips)) return null;

    return trips.find((trip) => {
      const mismoConductor =
        trip?.conductorId === conductorId ||
        trip?.driverId === conductorId ||
        trip?.conductorUid === conductorId;

      const activo = ['aceptado', 'en_camino', 'en_viaje'].includes(trip?.estado);

      return mismoConductor && activo;
    }) || null;
  }, [trips, conductorId]);

  async function cambiarEstadoViaje(nuevoEstado) {
    if (!viajeActual?.id) return;

    try {
      await updateDoc(doc(db, 'viajes', viajeActual.id), {
        estado: nuevoEstado,
        actualizadoEn: serverTimestamp()
      });

      if (nuevoEstado === 'finalizado' || nuevoEstado === 'cancelado') {
        await updateDoc(doc(db, 'conductores', conductorId), {
          estado: 'disponible',
          actualizadoEn: serverTimestamp()
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
      viajeActual?.origenLat ??
      viajeActual?.pickupLat ??
      viajeActual?.lat;

    const lng =
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
            onClick={() => actualizarEstado('disponible')}
          >
            Estoy disponible
          </button>

          <button
            className="btn naranja"
            onClick={() => actualizarEstado('ocupado')}
          >
            Estoy ocupado
          </button>
        </div>
      </section>

      <section className="conductor-card">
        <h3>Mi viaje actual</h3>

        {viajeActual ? (
          <>
            <p><strong>Origen:</strong> {viajeActual.origen || viajeActual.pickup || '-'}</p>
            <p><strong>Destino:</strong> {viajeActual.destino || viajeActual.dropoff || '-'}</p>
            <p><strong>Pasajero:</strong> {viajeActual.pasajeroNombre || viajeActual.passengerName || '-'}</p>
            <p><strong>Estado:</strong> {viajeActual.estado || '-'}</p>
            <p><strong>Pago:</strong> {viajeActual.metodoPago || viajeActual.paymentMethod || '-'}</p>
            <p><strong>Precio:</strong> ${viajeActual.precio || 0}</p>

            <div className="botones-grid">
              <button
                className="btn azul"
                onClick={abrirMaps}
              >
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