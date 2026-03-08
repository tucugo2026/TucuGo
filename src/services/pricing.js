export function calculatePrice({ baseFare, priceKm, priceMinute, distanceKm, durationMin, minimumFare }) {
  const raw = Number(baseFare) + Number(distanceKm) * Number(priceKm) + Number(durationMin) * Number(priceMinute);
  const finalValue = Math.max(raw, minimumFare ?? baseFare);
  return Number(finalValue.toFixed(2));
}

export function formatMoney(value, currency) {
  const locales = {
    ARS: 'es-AR',
    USD: 'en-US',
    EUR: 'es-ES'
  };

  return new Intl.NumberFormat(locales[currency] ?? 'es-AR', {
    style: 'currency',
    currency
  }).format(Number(value || 0));
}
