import { useEffect, useMemo, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = { lat: -26.8241, lng: -65.2226 };

function AutoFit({ passenger, driver, destination, routePoints }) {
  const map = useMap();

  useEffect(() => {
    const points = [];

    if (passenger?.lat != null && passenger?.lng != null) {
      points.push([passenger.lat, passenger.lng]);
    }

    if (driver?.ubicacion?.lat != null && driver?.ubicacion?.lng != null) {
      points.push([driver.ubicacion.lat, driver.ubicacion.lng]);
    }

    if (destination?.lat != null && destination?.lng != null) {
      points.push([destination.lat, destination.lng]);
    }

    if (Array.isArray(routePoints) && routePoints.length > 1) {
      points.push(...routePoints);
    }

    if (!points.length) return;

    if (points.length === 1) {
      map.setView(points[0], 14, { animate: true });
      return;
    }

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, passenger, driver, destination, routePoints]);

  return null;
}

function buildOsrmUrl(start, end) {
  return `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
}

async function fetchRouteData(start, end) {
  if (!start || !end) {
    return {
      points: [],
      distanceKm: null,
      durationMin: null
    };
  }

  const response = await fetch(buildOsrmUrl(start, end));
  if (!response.ok) throw new Error('No se pudo obtener la ruta');

  const data = await response.json();
  const route = data?.routes?.[0];

  const coords = route?.geometry?.coordinates || [];
  const points = coords.map(([lng, lat]) => [lat, lng]);

  const distanceKm =
    typeof route?.distance === 'number'
      ? Number((route.distance / 1000).toFixed(2))
      : null;

  const durationMin =
    typeof route?.duration === 'number'
      ? Math.max(1, Math.round(route.duration / 60))
      : null;

  return {
    points,
    distanceKm,
    durationMin
  };
}

export default function PassengerLiveMap({
  passenger,
  driver,
  destination,
  onEtaUpdate
}) {
  const [routeToDestination, setRouteToDestination] = useState([]);
  const [routeDriverToPassenger, setRouteDriverToPassenger] = useState([]);

  const passengerPos = useMemo(() => {
    if (passenger?.lat == null || passenger?.lng == null) return null;
    return { lat: passenger.lat, lng: passenger.lng };
  }, [passenger]);

  const driverPos = useMemo(() => {
    if (driver?.ubicacion?.lat == null || driver?.ubicacion?.lng == null) return null;
    return { lat: driver.ubicacion.lat, lng: driver.ubicacion.lng };
  }, [driver]);

  const destinationPos = useMemo(() => {
    if (destination?.lat == null || destination?.lng == null) return null;
    return { lat: destination.lat, lng: destination.lng };
  }, [destination]);

  useEffect(() => {
    let cancelled = false;

    async function loadPassengerRoute() {
      try {
        if (!passengerPos || !destinationPos) {
          setRouteToDestination([]);
          return;
        }

        const data = await fetchRouteData(passengerPos, destinationPos);
        if (!cancelled) {
          setRouteToDestination(data.points);
        }
      } catch (error) {
        console.error('Ruta pasajero-destino:', error);
        if (!cancelled) setRouteToDestination([]);
      }
    }

    loadPassengerRoute();

    return () => {
      cancelled = true;
    };
  }, [passengerPos, destinationPos]);

  useEffect(() => {
    let cancelled = false;

    async function loadDriverRoute() {
      try {
        if (!driverPos || !passengerPos) {
          setRouteDriverToPassenger([]);
          onEtaUpdate?.({
            distanceKm: null,
            durationMin: null
          });
          return;
        }

        const data = await fetchRouteData(driverPos, passengerPos);

        if (!cancelled) {
          setRouteDriverToPassenger(data.points);
          onEtaUpdate?.({
            distanceKm: data.distanceKm,
            durationMin: data.durationMin
          });
        }
      } catch (error) {
        console.error('Ruta conductor-pasajero:', error);
        if (!cancelled) {
          setRouteDriverToPassenger([]);
          onEtaUpdate?.({
            distanceKm: null,
            durationMin: null
          });
        }
      }
    }

    loadDriverRoute();

    return () => {
      cancelled = true;
    };
  }, [driverPos, passengerPos, onEtaUpdate]);

  const center = passengerPos || driverPos || destinationPos || DEFAULT_CENTER;

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={14}
      scrollWheelZoom={true}
      style={{ height: '420px', width: '100%', borderRadius: '16px' }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <AutoFit
        passenger={passengerPos}
        driver={driver}
        destination={destinationPos}
        routePoints={[...routeToDestination, ...routeDriverToPassenger]}
      />

      {passengerPos ? (
        <Marker position={[passengerPos.lat, passengerPos.lng]}>
          <Popup>Tu ubicación</Popup>
        </Marker>
      ) : null}

      {driverPos ? (
        <Marker position={[driverPos.lat, driverPos.lng]}>
          <Popup>Tu conductor</Popup>
        </Marker>
      ) : null}

      {destinationPos ? (
        <Marker position={[destinationPos.lat, destinationPos.lng]}>
          <Popup>Destino</Popup>
        </Marker>
      ) : null}

      {routeDriverToPassenger.length > 1 ? (
        <Polyline
          positions={routeDriverToPassenger}
          pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.85 }}
        />
      ) : null}

      {routeToDestination.length > 1 ? (
        <Polyline
          positions={routeToDestination}
          pathOptions={{ color: '#16a34a', weight: 5, opacity: 0.8 }}
        />
      ) : null}
    </MapContainer>
  );
}