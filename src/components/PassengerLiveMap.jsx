import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';

function AutoCenter({ passenger, driver }) {
  const map = useMap();

  useEffect(() => {
    if (driver?.ubicacion?.lat != null && driver?.ubicacion?.lng != null) {
      map.setView([driver.ubicacion.lat, driver.ubicacion.lng], 14, { animate: true });
      return;
    }

    if (passenger?.lat != null && passenger?.lng != null) {
      map.setView([passenger.lat, passenger.lng], 14, { animate: true });
    }
  }, [map, passenger, driver]);

  return null;
}

export default function PassengerLiveMap({ passenger, driver, destination }) {
  const center = passenger || { lat: -26.8241, lng: -65.2226 };

  const driverPosition =
    driver?.ubicacion?.lat != null && driver?.ubicacion?.lng != null
      ? [driver.ubicacion.lat, driver.ubicacion.lng]
      : null;

  const passengerPosition = passenger ? [passenger.lat, passenger.lng] : null;
  const destinationPosition = destination ? [destination.lat, destination.lng] : null;

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={14}
      scrollWheelZoom={true}
      style={{ height: '420px', width: '100%', borderRadius: '16px' }}
    >
      <TileLayer
        attribution="OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <AutoCenter passenger={passenger} driver={driver} />

      {passengerPosition && (
        <Marker position={passengerPosition}>
          <Popup>Tu ubicación</Popup>
        </Marker>
      )}

      {driverPosition && (
        <Marker position={driverPosition}>
          <Popup>Tu conductor</Popup>
        </Marker>
      )}

      {destinationPosition && (
        <Marker position={destinationPosition}>
          <Popup>Destino</Popup>
        </Marker>
      )}

      {driverPosition && passengerPosition && (
        <Polyline
          positions={[driverPosition, passengerPosition]}
          pathOptions={{ color: 'blue' }}
        />
      )}

      {passengerPosition && destinationPosition && (
        <Polyline
          positions={[passengerPosition, destinationPosition]}
          pathOptions={{ color: 'green' }}
        />
      )}
    </MapContainer>
  );
}