import { useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import StatusBadge from './StatusBadge.jsx';

const passengerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const driverIcon = new L.DivIcon({
  html: '<div class="driver-pin">🚗</div>',
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const destinationIcon = new L.DivIcon({
  html: '<div class="destination-pin">🏁</div>',
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

export default function MapView({ center, passenger, destination, drivers }) {
  const mapCenter = useMemo(() => {
    if (passenger) return [passenger.lat, passenger.lng];
    return [center.lat, center.lng];
  }, [center, passenger]);

  return (
    <div className="map-shell">
      <MapContainer center={mapCenter} zoom={13} scrollWheelZoom className="map-view">
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {passenger ? (
          <Marker position={[passenger.lat, passenger.lng]} icon={passengerIcon}>
            <Popup>Pasajero / origen</Popup>
          </Marker>
        ) : null}

        {destination ? (
          <Marker position={[destination.lat, destination.lng]} icon={destinationIcon}>
            <Popup>Destino</Popup>
          </Marker>
        ) : null}

        {drivers.map((driver) => (
          <Marker key={driver.id} position={[Number(driver.lat), Number(driver.lng)]} icon={driverIcon}>
            <Popup>
              <strong>{driver.name}</strong>
              <div>{driver.vehicle}</div>
              <div><StatusBadge value={driver.status} /></div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
