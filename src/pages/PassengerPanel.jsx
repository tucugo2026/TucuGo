import { useEffect, useMemo, useState } from 'react';
import { Card, Badge } from '../components/Card';
import { calculatePrice, formatMoney } from '../services/pricing';
import { appSettings } from '../config/appConfig';

const paymentMethods = ['efectivo', 'transferencia', 'tarjeta', 'cripto'];

export default function PassengerPanel({ data, onCreateTrip, loading }) {
  const passenger = data.users.find((user) => user.rol === 'pasajero') || data.users[0];
  const [countryId, setCountryId] = useState(passenger?.pais || appSettings.defaultCountry);
  const [cityId, setCityId] = useState(passenger?.ciudad || appSettings.defaultCity);
  const [paymentMethod, setPaymentMethod] = useState('transferencia');
  const [cryptoMoneda, setCryptoMoneda] = useState(appSettings.cryptoCurrencies[0]);
  const [form, setForm] = useState({
    origenTexto: 'Santa Rosa',
    origenLat: -26.8204,
    origenLng: -65.1996,
    destinoTexto: 'Ingenio Leales',
    destinoLat: -27.121,
    destinoLng: -65.141,
    servicio: 'auto'
  });

  const cities = useMemo(
    () => data.cities.filter((city) => city.pais === countryId),
    [countryId, data.cities]
  );

  useEffect(() => {
    if (!cities.find((city) => city.id === cityId) && cities[0]) {
      setCityId(cities[0].id);
    }
  }, [cities, cityId]);

  const selectedCity = data.cities.find((city) => city.id === cityId) || cities[0];
  const selectedCountry = data.countries.find((country) => country.id === countryId);
  const estimate = selectedCity
    ? calculatePrice(
        selectedCity,
        { lat: Number(form.origenLat), lng: Number(form.origenLng) },
        { lat: Number(form.destinoLat), lng: Number(form.destinoLng) }
      )
    : { distanciaKm: 0, duracionMin: 0, precio: 0 };

  async function handleSubmit(event) {
    event.preventDefault();
    await onCreateTrip({
      passengerId: passenger.id,
      cityId,
      servicio: form.servicio,
      pagoMetodo: paymentMethod,
      cryptoMoneda: paymentMethod === 'cripto' ? cryptoMoneda : '',
      origen: {
        texto: form.origenTexto,
        lat: Number(form.origenLat),
        lng: Number(form.origenLng)
      },
      destino: {
        texto: form.destinoTexto,
        lat: Number(form.destinoLat),
        lng: Number(form.destinoLng)
      }
    });
  }

  return (
    <div className="grid two-col">
      <Card title="Pedir viaje" subtitle="Listo para cualquier ciudad configurada">
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            <span>País</span>
            <select value={countryId} onChange={(e) => setCountryId(e.target.value)}>
              {data.countries.map((country) => <option key={country.id} value={country.id}>{country.nombre}</option>)}
            </select>
          </label>
          <label>
            <span>Ciudad</span>
            <select value={cityId} onChange={(e) => setCityId(e.target.value)}>
              {cities.map((city) => <option key={city.id} value={city.id}>{city.nombre}</option>)}
            </select>
          </label>
          <label className="full">
            <span>Origen</span>
            <input value={form.origenTexto} onChange={(e) => setForm({ ...form, origenTexto: e.target.value })} />
          </label>
          <label>
            <span>Lat origen</span>
            <input type="number" step="0.0001" value={form.origenLat} onChange={(e) => setForm({ ...form, origenLat: e.target.value })} />
          </label>
          <label>
            <span>Lng origen</span>
            <input type="number" step="0.0001" value={form.origenLng} onChange={(e) => setForm({ ...form, origenLng: e.target.value })} />
          </label>
          <label className="full">
            <span>Destino</span>
            <input value={form.destinoTexto} onChange={(e) => setForm({ ...form, destinoTexto: e.target.value })} />
          </label>
          <label>
            <span>Lat destino</span>
            <input type="number" step="0.0001" value={form.destinoLat} onChange={(e) => setForm({ ...form, destinoLat: e.target.value })} />
          </label>
          <label>
            <span>Lng destino</span>
            <input type="number" step="0.0001" value={form.destinoLng} onChange={(e) => setForm({ ...form, destinoLng: e.target.value })} />
          </label>
          <label>
            <span>Servicio</span>
            <select value={form.servicio} onChange={(e) => setForm({ ...form, servicio: e.target.value })}>
              {data.vehicleTypes.map((item) => <option key={item.id} value={item.id}>{item.icono} {item.nombre}</option>)}
            </select>
          </label>
          <label>
            <span>Método de pago</span>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              {paymentMethods.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          {paymentMethod === 'cripto' ? (
            <label className="full">
              <span>Cripto</span>
              <select value={cryptoMoneda} onChange={(e) => setCryptoMoneda(e.target.value)}>
                {appSettings.cryptoCurrencies.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          ) : null}
          <div className="full actions">
            <button className="primary" disabled={loading} type="submit">Crear viaje</button>
          </div>
        </form>
      </Card>

      <Card title="Estimación" subtitle="Tarifa calculada según distancia y tiempo">
        <div className="stats-grid">
          <div className="stat-box"><span>Distancia</span><strong>{estimate.distanciaKm} km</strong></div>
          <div className="stat-box"><span>Duración</span><strong>{estimate.duracionMin} min</strong></div>
          <div className="stat-box"><span>Precio</span><strong>{formatMoney(estimate.precio, selectedCountry?.moneda)}</strong></div>
          <div className="stat-box"><span>Cripto</span><strong>{paymentMethod === 'cripto' ? cryptoMoneda : 'No'}</strong></div>
        </div>
        <div className="hint-box">
          <Badge tone="info">Idea fuerte</Badge>
          <p>
            Para lanzar cripto de forma seria, comienza con stablecoins como USDC o USDT. BTC
            puede quedar como opción adicional por volatilidad.
          </p>
        </div>
      </Card>
    </div>
  );
}
