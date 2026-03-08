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
import RatingStars from '../../components/RatingStars.jsx';
import { conductorPuedeTrabajar } from '../../services/subscriptionService.js';
import './ConductorPanel.css';

function buildOsrmUrl(start, end) {
  return `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=false`;
}

async function fetchRouteSummary(start, end) {
  if (!start || !end) {
    return {
      distanceKm: null,
      durationMin: null
    };
  }

  const response = await fetch(buildOsrmUrl(start, end));
  if (!response.ok) {
    throw new Error('No se pudo obtener la ruta');
  }

  const data = await response.json();
  const route = data?.routes?.[0];

  return {
    distanceKm:
      typeof route?.distance === 'number'
        ? Number((route.distance / 1000).toFixed(2))
        : null,
    durationMin:
      typeof route?.duration === 'number'
        ? Math.max(1, Math.round(route.duration / 60))
        : null
  };
}

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
  const [historial, setHistorial] = useState([]);
  const [etaToPassenger, setEtaToPassenger] = useState({
    distanceKm: null,
    durationMin: null
  });
  const [etaToDestination, setEtaToDestination] = useState({
    distanceKm: null,
    durationMin: null
  });

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

  useEffect(() => {
    const q = query(collection(db, 'viajes'), where('conductorId', '==', conductorId));

    const unsubscribe = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }));

      const history = rows.filter(
        (v) => v.estado === 'finalizado' || v.estado === 'cancelado'
      );

      setHistorial(history);
    });

    return () => unsubscribe();
  }, [conductorId]);

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
  const puedeTrabajar = conductorPuedeTrabajar(conductor);

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
        const activo = ['aceptado', 'en_camino', 'llegue', 'en_viaje', 'finalizado'].includes(
          trip?.estado || trip?.status
        );
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

  const gananciasHoy = useMemo(() => {
    const hoy = new Date().toDateString();
    let total = 0;

    historial.forEach((v) => {
      if (v.estado !== 'finalizado') return;
      const date = v.createdAt ? new Date(v.createdAt).toDateString() : '';
      if (date === hoy) {
        total += Number(v.price || v.precio || 0);
      }
    });

    return total;
  }, [historial]);

  const promedioConductor = useMemo(() => {
    const ratings = historial
      .filter((v) => v.ratingDriver)
      .map((v) => Number(v.ratingDriver));

    if (!ratings.length) return 0;

    const total = ratings.reduce((a, b) => a + b, 0);
    return (total / ratings.length).toFixed(1);
  }, [historial]);

  const passengerPoint = useMemo(() => {
    if (!viajeActual) return null;

    const lat =
      viajeActual?.originLat ??
      viajeActual?.origenLat ??
      viajeActual?.pickupLat ??
      null;

    const lng =
      viajeActual?.originLng ??
      viajeActual?.origenLng ??
      viajeActual?.pickupLng ??
      null;

    if (lat == null || lng == null) return null;

    return { lat, lng };
  }, [viajeActual]);

  const destinationPoint = useMemo(() => {
    if (!viajeActual) return null;

    const lat =
      viajeActual?.destinationLat ??
      viajeActual?.destinoLat ??
      viajeActual?.dropoffLat ??
      null;

    const lng =
      viajeActual?.destinationLng ??
      viajeActual?.destinoLng ??
      viajeActual?.dropoffLng ??
      null;

    if (lat == null || lng == null) return null;

    return { lat, lng };
  }, [viajeActual]);

  const driverPoint = useMemo(() => {
    if (conductor?.ubicacion?.lat == null || conductor?.ubicacion?.lng == null) return null;
    return {
      lat: conductor.ubicacion.lat,
      lng: conductor.ubicacion.lng
    };
  }, [conductor]);

  useEffect(() => {
    let cancelled = false;

    async function loadEtaPassenger() {
      try {
        if (!driverPoint || !passengerPoint) {
          setEtaToPassenger({ distanceKm: null, durationMin: null });
          return;
        }

        const data = await fetchRouteSummary(driverPoint, passengerPoint);
        if (!cancelled) setEtaToPassenger(data);
      } catch (error) {
        console.error('ETA pasajero:', error);
        if (!cancelled) setEtaToPassenger({ distanceKm: null, durationMin: null });
      }
    }

    loadEtaPassenger();

    return () => {
      cancelled = true;
    };
  }, [driverPoint, passengerPoint]);

  useEffect(() => {
    let cancelled = false;

    async function loadEtaDestination() {
      try {
        if (!driverPoint || !destinationPoint) {
          setEtaToDestination({ distanceKm: null, durationMin: null });
          return;
        }

        const data = await fetchRouteSummary(driverPoint, destinationPoint);
        if (!cancelled) setEtaToDestination(data);
      } catch (error) {
        console.error('ETA destino:', error);
        if (!cancelled) setEtaToDestination({ distanceKm: null, durationMin: null });
      }
    }

    loadEtaDestination();

    return () => {
      cancelled = true;
    };
  }, [driverPoint, destinationPoint]);

  const etaPassengerMessage = useMemo(() => {
    const status = viajeActual?.estado || viajeActual?.status || '';

    if (!viajeActual) return '—';

    if (status === 'aceptado' || status === 'en_camino') {
      return etaToPassenger.durationMin != null
        ? `Llegas al pasajero en ${etaToPassenger.durationMin} min`
        : 'Calculando llegada al pasajero...';
    }

    if (status === 'llegue') {
      return 'Ya estás en el punto de recogida';
    }

    return '—';
  }, [viajeActual, etaToPassenger]);

  const etaDestinationMessage = useMemo(() => {
    const status = viajeActual?.estado || viajeActual?.status || '';

    if (!viajeActual) return '—';

    if (status === 'en_viaje') {
      return etaToDestination.durationMin != null
        ? `Llegas al destino en ${etaToDestination.durationMin} min`
        : 'Calculando llegada al destino...';
    }

    return '—';
  }, [viajeActual, etaToDestination]);

  async function aceptarViaje(trip) {
    try {
      if (!puedeTrabajar) {
        alert('Tu suscripción está vencida');
        return;
      }

      if (viajeActual && viajeActual.estado !== 'finalizado' && viajeActual.estado !== 'cancelado') {
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

  async function ratePassenger(value) {
    if (!viajeActual?.id) return;

    try {
      await updateDoc(doc(db, 'viajes', viajeActual.id), {
        ratingPassenger: value,
        updatedAt: serverTimestamp(),
        actualizadoEn: serverTimestamp()
      });

      alert('Calificación del pasajero guardada ⭐');
    } catch (error) {
      console.error(error);
      alert('No se pudo guardar la calificación.');
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

  function limpiarTelefono(phone) {
    return String(phone || '').replace(/[^\d]/g, '');
  }

  function llamarAlPasajero() {
    const phone =
      viajeActual?.passengerPhone ||
      viajeActual?.telefonoPasajero;

    if (!phone) {
      alert('El pasajero no tiene teléfono.');
      return;
    }

    window.location.href = `tel:${phone}`;
  }

  function whatsappAlPasajero() {
    const phone =
      viajeActual?.passengerPhone ||
      viajeActual?.telefonoPasajero;

    if (!phone) {
      alert('El pasajero no tiene teléfono.');
      return;
    }

    const numero = limpiarTelefono(phone);
    const status = viajeActual?.estado || viajeActual?.status || '';

    let textoBase = `Hola, soy ${nombre}, tu conductor de TucuGo.`;

    if (status === 'aceptado') {
      textoBase = `Hola, soy ${nombre}, tu conductor de TucuGo. Ya acepté tu viaje.`;
    } else if (status === 'en_camino') {
      textoBase = `Hola, soy ${nombre}, tu conductor de TucuGo. Ya voy en camino.`;
    } else if (status === 'llegue') {
      textoBase = `Hola, soy ${nombre}, tu conductor de TucuGo. Ya llegué al punto de recogida.`;
    } else if (status === 'en_viaje') {
      textoBase = `Hola, soy ${nombre}, tu conductor de TucuGo. Ya iniciamos el viaje.`;
    }

    const texto = encodeURIComponent(textoBase);
    window.open(`https://wa.me/${numero}?text=${texto}`, '_blank');
  }

  function formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  }

  return (
    <div className="conductor-page">
      <header className="conductor-header">
        <h1>Panel del conductor</h1>
        <p>Uso desde celular</p>
      </header>

      {!puedeTrabajar && (
        <div
          style={{
            background: '#fee2e2',
            padding: '15px',
            borderRadius: '12px',
            marginBottom: '15px'
          }}
        >
          <h3>Suscripción vencida</h3>
          <p>Tu período gratuito terminó.</p>
          <p>Para seguir trabajando debes pagar el plan mensual.</p>
          <b>Costo: 3 USD</b>
        </div>
      )}

      <section className="conductor-card principal">
        <h2>{nombre}</h2>
        <p><strong>Estado:</strong> {estado}</p>
        <p><strong>Vehículo:</strong> {vehiculo}</p>
        <p><strong>Patente:</strong> {patente}</p>
        <p><strong>Promedio:</strong> ⭐ {promedioConductor || 0}</p>
      </section>

      <section className="conductor-card">
        <h2>Ganancias de hoy</h2>
        <h1>${gananciasHoy}</h1>
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
                    disabled={!!viajeActual && viajeActual.estado !== 'finalizado' && viajeActual.estado !== 'cancelado'}
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

            <p>
              <strong>Distancia real al pasajero:</strong>{' '}
              {etaToPassenger.distanceKm != null ? `${etaToPassenger.distanceKm} km` : '—'}
            </p>
            <p>
              <strong>ETA al pasajero:</strong>{' '}
              {etaToPassenger.durationMin != null ? `${etaToPassenger.durationMin} min` : '—'}
            </p>
            <p><strong>{etaPassengerMessage}</strong></p>

            <p>
              <strong>Distancia real al destino:</strong>{' '}
              {etaToDestination.distanceKm != null ? `${etaToDestination.distanceKm} km` : '—'}
            </p>
            <p>
              <strong>ETA al destino:</strong>{' '}
              {etaToDestination.durationMin != null ? `${etaToDestination.durationMin} min` : '—'}
            </p>
            <p><strong>{etaDestinationMessage}</strong></p>

            <div className="botones-grid">
              <button className="btn verde" onClick={llamarAlPasajero}>
                📞 Llamar pasajero
              </button>

              <button className="btn verde" onClick={whatsappAlPasajero}>
                WhatsApp pasajero
              </button>

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
                onClick={() => cambiarEstadoViaje('llegue')}
              >
                Llegué
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

            {viajeActual?.estado === 'finalizado' && !viajeActual?.ratingPassenger ? (
              <div style={{ marginTop: '20px' }}>
                <h3>Calificar pasajero</h3>
                <RatingStars onRate={ratePassenger} />
              </div>
            ) : null}

            {viajeActual?.estado === 'finalizado' && viajeActual?.ratingPassenger ? (
              <div style={{ marginTop: '20px' }}>
                <h3>Tu calificación al pasajero</h3>
                <RatingStars
                  initialValue={Number(viajeActual.ratingPassenger)}
                  readonly={true}
                />
              </div>
            ) : null}
          </>
        ) : (
          <p>No tienes un viaje activo en este momento.</p>
        )}
      </section>

      <section className="conductor-card">
        <h3>Historial de viajes</h3>

        {historial.length === 0 ? (
          <p>No tienes viajes todavía.</p>
        ) : (
          historial.map((trip) => (
            <div key={trip.id} className="info-card">
              <p><b>Pasajero:</b> {trip.passengerName || '-'}</p>
              <p><b>Origen:</b> {trip.originText || '-'}</p>
              <p><b>Destino:</b> {trip.destinationText || '-'}</p>
              <p><b>Precio:</b> ${trip.price || 0}</p>
              <p><b>Estado:</b> {trip.estado || '-'}</p>
              <p><b>Fecha:</b> {formatDate(trip.createdAt)}</p>
              {trip.ratingDriver ? (
                <p><b>Calificación recibida:</b> {trip.ratingDriver} ⭐</p>
              ) : null}
              {trip.ratingPassenger ? (
                <p><b>Tu calificación al pasajero:</b> {trip.ratingPassenger} ⭐</p>
              ) : null}
            </div>
          ))
        )}
      </section>
    </div>
  );
}