import { useEffect, useMemo, useState } from 'react';
import MapView from '../components/MapView.jsx';
import { SUPPORTED_PAYMENT_METHODS } from '../config/appConfig.js';
import { getBrowserPosition, estimateDurationMinutes, findNearestAvailableDriver, haversineKm } from '../services/geo.js';
import { calculatePrice, formatMoney } from '../services/pricing.js';
import { createTrip } from '../services/tripService.js';

export default function PassengerPanel({ cities, drivers, refreshAll }) {
  const [selectedCity, setSelectedCity] = useState(cities[0]?.id || 'tucuman');
  const [passengerName, setPassengerName] = useState('Marcelo');
  const [passengerPhone, setPassengerPhone] = useState('+543810000000');
  const [originText, setOriginText] = useState('Mi ubicación actual');
  const [destinationText, setDestinationText] = useState('Ingenio Leales');
  const [paymentMethod, setPaymentMethod] = useState('Transferencia');
  const [notes, setNotes] = useState('Viaje demo');
  const [position, setPosition] = useState(null);
  const [destinationOffsetKm, setDestinationOffsetKm] = useState(6);
  const [message, setMessage] = useState('');

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
    const price = calculatePrice({
      baseFare: city.baseFare,
      priceKm: city.priceKm,
      priceMinute: city.priceMinute,
      distanceKm,
      durationMin,
      minimumFare: city.baseFare
    });

    return {
      distanceKm: Number(distanceKm.toFixed(2)),
      durationMin,
      price,
      formatted: formatMoney(price, city.currency)
    };
  }, [city, position, destinationPoint]);

  const nearestDriver = useMemo(() => {
    if (!position) return null;
    return findNearestAvailableDriver({
      drivers,
      city: selectedCity,
      origin: position
    });
  }, [drivers, selectedCity, position]);

  async function useCurrentLocation() {
    if (!city) return;
    const current = await getBrowserPosition(city.center);
    setPosition(current);
    setMessage('Ubicación actualizada desde el navegador.');
  }

  async function handleRequestTrip(event) {
    event.preventDefault();
    if (!city || !position || !destinationPoint || !estimate) return;

    try {
      await createTrip({
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
        cryptoWallet: paymentMethod === 'USDC' || paymentMethod === 'USDT' || paymentMethod === 'BTC' ? 'wallet-demo-001' : '',
        cryptoTxId: ''
      });

      setMessage('Viaje creado correctamente. Ahora puedes asignarlo desde Admin o aceptarlo desde Conductor.');
      await refreshAll();
    } catch (error) {
      setMessage(`No se pudo crear el viaje: ${error.message}`);
    }
  }

  return (
    <div className="stack-lg">
      <section className="form-map-grid">
        <form className="stack-md form-card" onSubmit={handleRequestTrip}>
          <h2>Pedir viaje</h2>

          <label>
            Ciudad
            <select value={selectedCity} onChange={(event) => setSelectedCity(event.target.value)}>
              {cities.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Pasajero
            <input value={passengerName} onChange={(event) => setPassengerName(event.target.value)} />
          </label>

          <label>
            Teléfono
            <input value={passengerPhone} onChange={(event) => setPassengerPhone(event.target.value)} />
          </label>

          <label>
            Origen
            <input value={originText} onChange={(event) => setOriginText(event.target.value)} />
          </label>

          <label>
            Destino
            <input value={destinationText} onChange={(event) => setDestinationText(event.target.value)} />
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
            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
              {SUPPORTED_PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </label>

          <label>
            Notas
            <textarea rows="3" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>

          <div className="button-row">
            <button type="button" onClick={useCurrentLocation}>Usar mi ubicación</button>
            <button type="submit" className="primary-button">Crear viaje</button>
          </div>

          <p className="helper-text">{message || 'Puedes usar OpenStreetMap sin pagar claves para el mapa base.'}</p>
        </form>

        <div className="stack-md">
          <MapView center={city?.center ?? { lat: -26.8241, lng: -65.2226 }} passenger={position} destination={destinationPoint} drivers={drivers.filter((item) => item.city === selectedCity)} />

          <div className="info-grid">
            <article className="info-card highlight">
              <h2>Precio estimado</h2>
              <strong className="big-number">{estimate ? estimate.formatted : '—'}</strong>
              <p>
                Distancia: {estimate ? `${estimate.distanceKm} km` : '—'} · Tiempo: {estimate ? `${estimate.durationMin} min` : '—'}
              </p>
            </article>

            <article className="info-card">
              <h2>Conductor más cercano</h2>
              {nearestDriver ? (
                <>
                  <strong>{nearestDriver.name}</strong>
                  <p>{nearestDriver.vehicle}</p>
                  <p>Aprox. {nearestDriver.distanceKm.toFixed(2)} km del pasajero.</p>
                </>
              ) : (
                <p>No hay conductores disponibles en esta ciudad.</p>
              )}
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
