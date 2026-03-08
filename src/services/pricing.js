import { distanceKm } from './geo';

export function estimateDuration(distance) {
  return Math.max(5, Math.round(distance * 2.8));
}

export function calculatePrice(cityConfig, origen, destino) {
  const distance = Number(distanceKm(origen, destino).toFixed(2));
  const duration = estimateDuration(distance);

  const total =
    Number(cityConfig?.tarifaBase || 0) +
    distance * Number(cityConfig?.precioKm || 0) +
    duration * Number(cityConfig?.precioMinuto || 0);

  return {
    distanciaKm: distance,
    duracionMin: duration,
    precio: Number(total.toFixed(2))
  };
}

export function formatMoney(value, currency = 'ARS') {
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'ARS' ? 0 : 2
    }).format(value || 0);
  } catch {
    return `${currency} ${value || 0}`;
  }
}
