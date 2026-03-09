export async function getBrowserPosition(fallback = { lat: -26.8241, lng: -65.2226 }) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(fallback);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      () => {
        resolve(fallback);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 10000
      }
    );
  });
}

export function haversineKm(pointA, pointB) {
  if (!pointA || !pointB) return Infinity;

  const lat1 = Number(pointA.lat);
  const lng1 = Number(pointA.lng);
  const lat2 = Number(pointB.lat);
  const lng2 = Number(pointB.lng);

  if (
    Number.isNaN(lat1) ||
    Number.isNaN(lng1) ||
    Number.isNaN(lat2) ||
    Number.isNaN(lng2)
  ) {
    return Infinity;
  }

  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

export function estimateDurationMinutes(distanceKm = 0) {
  const avgSpeedKmH = 28;
  const hours = Number(distanceKm || 0) / avgSpeedKmH;
  return Math.max(1, Math.round(hours * 60));
}

export function isDriverApproved(driver) {
  const approvedRaw = driver?.aprobado;
  return approvedRaw === true || approvedRaw === 'true' || approvedRaw === undefined;
}

export function isDriverAvailable(driver) {
  const status = (driver?.estado || driver?.status || '').toString().toLowerCase();
  return status === 'disponible';
}

export function getDriverVehicleType(driver) {
  return (
    driver?.vehicleType ||
    driver?.vehiculoTipo ||
    driver?.tipoVehiculo ||
    ''
  )
    .toString()
    .toLowerCase();
}

export function getDriverCoords(driver) {
  const lat = driver?.ubicacion?.lat;
  const lng = driver?.ubicacion?.lng;

  if (lat == null || lng == null) return null;

  return {
    lat: Number(lat),
    lng: Number(lng)
  };
}

export function getTripOriginCoords(trip) {
  const lat = trip?.originLat ?? trip?.origenLat ?? null;
  const lng = trip?.originLng ?? trip?.origenLng ?? null;

  if (lat == null || lng == null) return null;

  return {
    lat: Number(lat),
    lng: Number(lng)
  };
}

export function getTripDestinationCoords(trip) {
  const lat = trip?.destinationLat ?? trip?.destinoLat ?? null;
  const lng = trip?.destinationLng ?? trip?.destinoLng ?? null;

  if (lat == null || lng == null) return null;

  return {
    lat: Number(lat),
    lng: Number(lng)
  };
}

export function filterCompatibleDrivers({
  drivers = [],
  city = '',
  serviceType = '',
  requireApproval = true
}) {
  const normalizedService = String(serviceType || '').toLowerCase();

  return drivers.filter((driver) => {
    const driverCity = (driver?.city || driver?.ciudad || '').toString();

    if (city && driverCity && driverCity !== city) return false;
    if (!isDriverAvailable(driver)) return false;
    if (requireApproval && !isDriverApproved(driver)) return false;
    if (!getDriverCoords(driver)) return false;

    const driverVehicleType = getDriverVehicleType(driver);

    if (normalizedService && driverVehicleType && driverVehicleType !== normalizedService) {
      return false;
    }

    return true;
  });
}

export function sortDriversByDistance({
  drivers = [],
  origin = null
}) {
  if (!origin) return [];

  return drivers
    .map((driver) => {
      const coords = getDriverCoords(driver);
      const distanceKm = coords ? haversineKm(origin, coords) : Infinity;

      return {
        ...driver,
        distanceKm
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export function findNearestAvailableDriver({
  drivers = [],
  city = '',
  origin = null,
  serviceType = ''
}) {
  if (!origin) return null;

  const compatibles = filterCompatibleDrivers({
    drivers,
    city,
    serviceType,
    requireApproval: true
  });

  const sorted = sortDriversByDistance({
    drivers: compatibles,
    origin
  });

  return sorted[0] || null;
}

export function findNearestDrivers({
  drivers = [],
  city = '',
  origin = null,
  serviceType = '',
  limit = 5
}) {
  if (!origin) return [];

  const compatibles = filterCompatibleDrivers({
    drivers,
    city,
    serviceType,
    requireApproval: true
  });

  return sortDriversByDistance({
    drivers: compatibles,
    origin
  }).slice(0, limit);
}

export function getDriversInsideRadius({
  drivers = [],
  origin = null,
  radiusKm = 4,
  city = '',
  serviceType = ''
}) {
  if (!origin) return [];

  return findNearestDrivers({
    drivers,
    city,
    origin,
    serviceType,
    limit: drivers.length || 999
  }).filter((driver) => driver.distanceKm <= radiusKm);
}