export function toRadians(value) {
  return (value * Math.PI) / 180;
}

export function distanceKm(a, b) {
  const R = 6371;
  const dLat = toRadians((b.lat || 0) - (a.lat || 0));
  const dLng = toRadians((b.lng || 0) - (a.lng || 0));
  const lat1 = toRadians(a.lat || 0);
  const lat2 = toRadians(b.lat || 0);

  const hav =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(hav));
}

export function nearestDriver(drivers = [], point) {
  const availables = drivers.filter((driver) => driver.estado === 'disponible' && driver.activo);
  if (!availables.length) return null;

  return availables
    .map((driver) => ({
      ...driver,
      distanciaAlPasajero: distanceKm(driver.ubicacion, point)
    }))
    .sort((a, b) => a.distanciaAlPasajero - b.distanciaAlPasajero)[0];
}
