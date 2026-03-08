import { useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import PassengerLiveMap from '../components/PassengerLiveMap.jsx';
import { SUPPORTED_PAYMENT_METHODS } from '../config/appConfig.js';
import {
  getBrowserPosition,
  estimateDurationMinutes,
  findNearestAvailableDriver,
  haversineKm
} from '../services/geo.js';
import { calculatePrice, formatMoney } from '../services/pricing.js';
import { createTrip } from '../services/tripService.js';
import { db } from '../services/firebase.js';

export default function PassengerPanel({ cities, drivers, refreshAll }) {
  const [selectedCity, setSelectedCity] = useState(cities[0]?.id || 'tucuman');
  const [passengerName, setPassengerName] = useState('Marcelo');
  const [passengerPhone, setPassengerPhone] = useState('+543810000000');
  const [originText, setOriginText] = useState('Mi ubicación actual');
  const [destinationText, setDestinationText] = useState('Ingenio Leales');
  const [paymentMethod, setPaymentMethod] = useState('Transferencia');
  const [notes, setNotes] = useState('Viaje demo');
  const [serviceType, setServiceType] = useState('auto');
  const [position, setPosition] = useState(null);
  const [destinationOffsetKm, setDestinationOffsetKm] = useState(6);
  const [message, setMessage] = useState('');
  const [myLatestTrip, setMyLatestTrip] = useState(null);
  const [tripNotification, setTripNotification] = useState(null);
  const previousTripStatusRef = useRef(null);

  const city = useMemo(
    () => cities.find((item) => item.id === selectedCity) ?? cities[0],
    [cities, selectedCity]
  );

  useEffect(() => {
    async function loadPosition() {
      if (!city) return;
      const current = await getBrowserPosition(city.center);
      setPosition(current);
    }
    loadPosition();
  }, [city]);

  useEffect(() => {
    if (!passengerPhone) return;

    const q = query(
      collection(db, 'viajes'),
      where('passengerPhone', '==', passengerPhone)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }));

      rows.sort((a, b) => {
        const aDate = a.createdAt || '';
        const bDate = b.createdAt || '';
        return String(bDate).localeCompare(String(aDate));
      });

      setMyLatestTrip(rows[0] || null);
    });

    return () => unsubscribe();
  }, [passengerPhone]);

  function reproducirBeep() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);

      gainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.15, audioCtx.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.35);
    } catch (error) {
      console.warn('No se pudo reproducir el sonido:', error);
    }
  }

  function getNotificationFromStatus(status) {
    switch (status) {
      case 'aceptado':
        return {
          type: 'info',
          title: 'Conductor asignado',
          text: 'Tu conductor ya fue asignado.'
        };
      case 'en_camino':
        return {
          type: 'warning',
          title: 'Conductor en camino',
          text: 'Tu conductor está yendo hacia tu ubicación.'
        };
      case 'llegue':
        return {
          type: 'warning',
          title: 'Tu conductor llegó',
          text: 'El conductor ya está en el punto de recogida.'
        };
      case 'en_viaje':
        return {
          type: 'success',
          title: 'Viaje iniciado',
          text: 'Tu viaje comenzó.'
        };
      case 'finalizado':
        return {
          type: 'success',
          title: 'Viaje finalizado',
          text: 'Tu viaje terminó correctamente.'
        };
      case 'cancelado':
        return {
          type: 'danger',
          title: 'Viaje cancelado',
          text: 'Tu viaje fue cancelado.'
        };
      default:
        return null;
    }
  }

  useEffect(() => {
    const currentStatus = myLatestTrip?.estado || myLatestTrip?.status || null;

    if (!currentStatus) return;

    if (previousTripStatusRef.current === null) {
      previousTripStatusRef.current = currentStatus;
      return;
    }

    if (previousTripStatusRef.current !== currentStatus) {
      const notif = getNotificationFromStatus(currentStatus);

      if (notif) {
        setTripNotification(notif);
        reproducirBeep();

        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(notif.title, { body: notif.text });
        }
      }

      previousTripStatusRef.current = currentStatus;
    }
  }, [myLatestTrip]);

  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => null);
    }
  }, []);

  useEffect(() => {
    if (!tripNotification) return;

    const timer = setTimeout(() => {
      setTripNotification(null);
    }, 5000);

    return () => clearTimeout(timer);
  }, [tripNotification]);

  const destinationPoint = useMemo(() => {
    if (!position) return null;

    return {
      lat: Number(position.lat) + Number(destinationOffsetKm) * 0.01,
      lng: Number(position.lng) + Number(destinationOffsetKm) * 0.006,
      text: destinationText
    };
  }, [position, destinationOffsetKm, destinationText]);

  const estimate = useMemo(() => {
    if (!city || !position || !destinationPoint) return null;

    const distanceKm = haversineKm(position, destinationPoint);
    const durationMin = estimateDurationMinutes(distanceKm);
    const multiplier = serviceType === 'moto' ? 0.85 : 1;

    const price = calculatePrice({
      baseFare: city.baseFare * multiplier,
      priceKm: city.priceKm * multiplier,
      priceMinute: city.priceMinute * multiplier,
      distanceKm,
      durationMin,
      minimumFare: city.baseFare * multiplier
    });

    return {
      distanceKm: Number(distanceKm.toFixed(2)),
      durationMin,
      price,
      formatted: formatMoney(price, city.currency)
    };
  }, [city, position, destinationPoint, serviceType]);

  const compatibleDrivers = useMemo(() => {
    return drivers.filter((item) => {
      const driverCity = item.city || item.ciudad || '';
      if (driverCity !== selectedCity) return false;

      const driverStatus = (item.estado || item.status || '').toString().toLowerCase();
      if (driverStatus && driverStatus !== 'disponible') return false;

      const approvedRaw = item.aprobado;
      const approved =
        approvedRaw === true ||
        approvedRaw === 'true' ||
        approvedRaw === undefined;

      if (!approved) return false;

      const driverVehicleType =
        (item.vehicleType || item.vehiculoTipo || item.tipoVehiculo || '')
          .toString()
          .toLowerCase();

      if (!driverVehicleType) return true;

      return driverVehicleType === serviceType;
    });
  }, [drivers, selectedCity, serviceType]);

  const nearestDriver = useMemo(() => {
    if (!position) return null;

    return findNearestAvailableDriver({
      drivers: compatibleDrivers,
      city: selectedCity,
      origin: position
    });
  }, [compatibleDrivers, selectedCity, position]);

  const assignedDriver = useMemo(() => {
    const driverId =
      myLatestTrip?.conductorId ||
      myLatestTrip?.driverId ||
      nearestDriver?.id ||
      nearestDriver?.uid ||
      nearestDriver?.driverId;

    if (!driverId) return null;

    return (
      drivers.find(
        (d) =>
          d.id === driverId ||
          d.uid === driverId ||
          d.driverId === driverId
      ) || nearestDriver || null
    );
  }, [drivers, nearestDriver, myLatestTrip]);

  const driverDistanceKm = useMemo(() => {
    if (!assignedDriver?.ubicacion || !position) return null;

    const driverPos = {
      lat: assignedDriver.ubicacion.lat,
      lng: assignedDriver.ubicacion.lng
    };

    return haversineKm(driverPos, position);
  }, [assignedDriver, position]);

  const passengerTripStatusText = useMemo(() => {
    const status = myLatestTrip?.estado || myLatestTrip?.status;

    switch (status) {
      case 'solicitado':
        return 'Esperando conductor';
      case 'aceptado':
        return 'Tu conductor fue asignado';
      case 'en_camino':
        return 'Tu conductor está en camino';
      case 'llegue':
        return 'Tu conductor ya llegó al punto de recogida';
      case 'en_viaje':
        return 'Tu viaje está en curso';
      case 'finalizado':
        return 'Tu viaje finalizó';
      case 'cancelado':
        return 'Tu viaje fue cancelado';
      default:
        return 'Aún no tienes un viaje activo';
    }
  }, [myLatestTrip]);

  async function useCurrentLocation() {
    if (!city) return;

    const current = await getBrowserPosition(city.center);
    setPosition(current);
    setMessage('Ubicación actualizada desde el navegador.');
  }

  async function marcarConductorComoOcupado(driver, tripId) {
    const driverId = driver?.id || driver?.uid || driver?.driverId;
    if (!driverId) return;

    await updateDoc(doc(db, 'conductores', driverId), {
      estado: 'ocupado',
      status: 'ocupado',
      viajeActualId: tripId || '',
      updatedAt: serverTimestamp(),
      actualizadoEn: serverTimestamp()
    });
  }

  function extraerTripId(result) {
    if (!result) return '';
    if (typeof result === 'string') return result;
    if (result.id) return result.id;
    if (result.tripId) return result.tripId;
    if (result.ref?.id) return result.ref.id;
    return '';
  }

  async function handleRequestTrip(event) {
    event.preventDefault();

    if (!city || !position || !destinationPoint || !estimate) return;

    try {
      const autoAssignedDriver = nearestDriver || null;

      const tripPayload = {
        passengerName,
        passengerPhone,
        country: city.country,
        city: city.id,
        currency: city.currency,

        originText,
        originLat: position.lat,
        originLng: position.lng,

        destinationText,
        destinationLat: destinationPoint.lat,
        destinationLng: destinationPoint.lng,

        estimatedDistanceKm: estimate.distanceKm,
        estimatedDurationMin: estimate.durationMin,
        price: estimate.price,

        paymentMethod,
        notes,

        serviceType,
        vehicleTypeRequested: serviceType,
        tripType: serviceType,

        estado: autoAssignedDriver ? 'aceptado' : 'solicitado',
        status: autoAssignedDriver ? 'aceptado' : 'solicitado',

        conductorId:
          autoAssignedDriver?.id ||
          autoAssignedDriver?.uid ||
          autoAssignedDriver?.driverId ||
          '',

        driverId:
          autoAssignedDriver?.id ||
          autoAssignedDriver?.uid ||
          autoAssignedDriver?.driverId ||
          '',

        conductorNombre:
          autoAssignedDriver?.name ||
          autoAssignedDriver?.nombre ||
          'Sin asignar',

        driverName:
          autoAssignedDriver?.name ||
          autoAssignedDriver?.nombre ||
          'Sin asignar',

        conductorTelefono:
          autoAssignedDriver?.phone ||
          autoAssignedDriver?.telefono ||
          '',

        vehicleTypeAssigned:
          autoAssignedDriver?.vehicleType ||
          autoAssignedDriver?.vehiculoTipo ||
          autoAssignedDriver?.tipoVehiculo ||
          '',

        assignedAutomatically: !!autoAssignedDriver,

        createdAt: new Date().toISOString(),

        cryptoWallet:
          paymentMethod === 'USDC' ||
          paymentMethod === 'USDT' ||
          paymentMethod === 'BTC'
            ? 'wallet-demo-001'
            : '',
        cryptoTxId: ''
      };

      const tripResult = await createTrip(tripPayload);
      const tripId = extraerTripId(tripResult);

      if (autoAssignedDriver) {
        await marcarConductorComoOcupado(autoAssignedDriver, tripId);
      }

      if (autoAssignedDriver) {
        setMessage(
          `Viaje creado y asignado automáticamente a ${
            autoAssignedDriver.name || autoAssignedDriver.nombre || 'un conductor'
          } (${serviceType === 'auto' ? 'Auto' : 'Moto'}).`
        );
      } else {
        setMessage(
          `Viaje creado en modo ${serviceType === 'auto' ? 'Auto' : 'Moto'}, pero no había conductores disponibles.`
        );
      }

      await refreshAll();
    } catch (error) {
      setMessage(`No se pudo crear el viaje: ${error.message}`);
    }
  }

  function llamarAlConductor() {
    const phone =
      assignedDriver?.phone ||
      assignedDriver?.telefono ||
      myLatestTrip?.conductorTelefono;

    if (!phone) {
      alert('El conductor no tiene teléfono registrado.');
      return;
    }

    window.location.href = `tel:${phone}`;
  }

  return (
    <div className="stack-lg">
      {tripNotification ? (
        <div
          style={{
            background:
              tripNotification.type === 'danger'
                ? '#fee2e2'
                : tripNotification.type === 'success'
                ? '#dcfce7'
                : tripNotification.type === 'warning'
                ? '#fef3c7'
                : '#dbeafe',
            color: '#111827',
            borderRadius: '14px',
            padding: '14px 16px',
            fontWeight: 700,
            boxShadow: '0 6px 18px rgba(0,0,0,0.08)'
          }}
        >
          <div>{tripNotification.title}</div>
          <div style={{ fontWeight: 500, marginTop: '4px' }}>{tripNotification.text}</div>
        </div>
      ) : null}

      <section className="form-map-grid">
        <form className="stack-md form-card" onSubmit={handleRequestTrip}>
          <h2>Pedir viaje</h2>

          <label>
            Ciudad
            <select
              value={selectedCity}
              onChange={(event) => setSelectedCity(event.target.value)}
            >
              {cities.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Pasajero
            <input
              value={passengerName}
              onChange={(event) => setPassengerName(event.target.value)}
            />
          </label>

          <label>
            Teléfono
            <input
              value={passengerPhone}
              onChange={(event) => setPassengerPhone(event.target.value)}
            />
          </label>

          <label>
            Tipo de viaje
            <select
              value={serviceType}
              onChange={(event) => setServiceType(event.target.value)}
            >
              <option value="auto">Auto</option>
              <option value="moto">Moto</option>
            </select>
          </label>

          <label>
            Origen
            <input
              value={originText}
              onChange={(event) => setOriginText(event.target.value)}
            />
          </label>

          <label>
            Destino
            <input
              value={destinationText}
              onChange={(event) => setDestinationText(event.target.value)}
            />
          </label>

          <label>
            Distancia aproximada al destino (demo en km)
            <input
              type="number"
              min="1"
              max="30"
              value={destinationOffsetKm}
              onChange={(event) => setDestinationOffsetKm(event.target.value)}
            />
          </label>

          <label>
            Método de pago
            <select
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
            >
              {SUPPORTED_PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </label>

          <label>
            Notas
            <textarea
              rows="3"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>

          <div className="button-row">
            <button type="button" onClick={useCurrentLocation}>
              Usar mi ubicación
            </button>
            <button type="submit" className="primary-button">
              Crear viaje
            </button>
          </div>

          <p className="helper-text">
            {message || 'Puedes usar OpenStreetMap sin pagar claves para el mapa base.'}
          </p>
        </form>

        <div className="stack-md">
          <PassengerLiveMap
            passenger={position}
            driver={assignedDriver}
            destination={destinationPoint}
          />

          <div className="info-grid">
            <article className="info-card highlight">
              <h2>Precio estimado</h2>
              <strong className="big-number">
                {estimate ? estimate.formatted : '—'}
              </strong>
              <p>
                Tipo: {serviceType === 'auto' ? 'Auto' : 'Moto'} · Distancia:{' '}
                {estimate ? `${estimate.distanceKm} km` : '—'} · Tiempo:{' '}
                {estimate ? `${estimate.durationMin} min` : '—'}
              </p>
            </article>

            <article className="info-card">
              <h2>Estado de tu viaje</h2>
              <strong>{passengerTripStatusText}</strong>
              <p>
                Conductor: {assignedDriver?.name || assignedDriver?.nombre || myLatestTrip?.conductorNombre || 'Sin asignar'}
              </p>
              <p>
                Teléfono: {assignedDriver?.phone || assignedDriver?.telefono || myLatestTrip?.conductorTelefono || '-'}
              </p>
              <p>
                Distancia del conductor:{' '}
                {driverDistanceKm != null ? `${driverDistanceKm.toFixed(2)} km` : '—'}
              </p>

              <div style={{ marginTop: '12px' }}>
                <button className="btn verde" onClick={llamarAlConductor}>
                  📞 Llamar al conductor
                </button>
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}