export function haversineKm(origin, destination) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRad(destination.lat - origin.lat);
  const dLng = toRad(destination.lng - origin.lng);
  const lat1 = toRad(origin.lat);
  const lat2 = toRad(destination.lat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export function findNearestAvailableDriver({ drivers, city, origin }) {
  const availableDrivers = drivers.filter(
    (driver) => driver.city === city && driver.status === 'disponible'
  );

  if (!availableDrivers.length) return null;

  return availableDrivers
    .map((driver) => ({
      ...driver,
      distanceKm: haversineKm(origin, { lat: Number(driver.lat), lng: Number(driver.lng) })
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)[0];
}

export async function getBrowserPosition(fallback) {
  if (!('geolocation' in navigator)) return fallback;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }),
      () => resolve(fallback),
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
    );
  });
}

export function estimateDurationMinutes(distanceKm) {
  const avgCitySpeedKmH = 28;
  return Math.max(5, Math.round((Number(distanceKm) / avgCitySpeedKmH) * 60));
}
