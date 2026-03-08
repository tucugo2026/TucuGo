import { useEffect, useMemo, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  CircleMarker,
  Polyline,
  useMap
} from 'react-leaflet';
import { collection, onSnapshot } from 'firebase/firestore';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon2x from 'leaflet/dist/images/marker-icon-2x.png';
import icon from 'leaflet/dist/images/marker-icon.png';
import shadow from 'leaflet/dist/images/marker-shadow.png';
import { db } from '../services/firebase.js';
import './AdminMapPage.css';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: icon2x,
  iconUrl: icon,
  shadowUrl: shadow
});

const CENTRO_TUCUMAN = [-26.8241, -65.2226];

function esNumero(valor) {
  return typeof valor === 'number' && !Number.isNaN(valor);
}

function obtenerCoordConductor(conductor) {
  const lat = conductor?.ubicacion?.lat;
  const lng = conductor?.ubicacion?.lng;

  if (esNumero(lat) && esNumero(lng)) {
    return [lat, lng];
  }

  return null;
}

function obtenerCoordViaje(viaje) {
  const lat = viaje?.originLat ?? viaje?.origenLat ?? viaje?.pickupLat ?? viaje?.lat;
  const lng = viaje?.originLng ?? viaje?.origenLng ?? viaje?.pickupLng ?? viaje?.lng;

  if (esNumero(lat) && esNumero(lng)) {
    return [lat, lng];
  }

  return null;
}

function colorViaje(estado) {
  switch (estado) {
    case 'solicitado':
      return '#f59e0b';
    case 'aceptado':
      return '#2563eb';
    case 'en_camino':
      return '#7c3aed';
    case 'en_viaje':
      return '#059669';
    case 'finalizado':
      return '#10b981';
    case 'cancelado':
      return '#ef4444';
    default:
      return '#6b7280';
  }
}

function AutoCenter({ conductores }) {
  const map = useMap();

  useEffect(() => {
    if (!conductores.length) return;

    const puntos = conductores
      .map((c) => obtenerCoordConductor(c))
      .filter(Boolean);

    if (!puntos.length) return;

    if (puntos.length === 1) {
      map.setView(puntos[0], 14, { animate: true });
      return;
    }

    const bounds = L.latLngBounds(puntos);
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [conductores, map]);

  return null;
}

export default function AdminMapPage() {
  const [conductores, setConductores] = useState([]);
  const [viajes, setViajes] = useState([]);

  useEffect(() => {
    const unsubConductores = onSnapshot(collection(db, 'conductores'), (snap) => {
      const rows = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setConductores(rows);
    });

    const unsubViajes = onSnapshot(collection(db, 'viajes'), (snap) => {
      const rows = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setViajes(rows);
    });

    return () => {
      unsubConductores();
      unsubViajes();
    };
  }, []);

  const conductoresConGps = useMemo(() => {
    return conductores.filter((c) => obtenerCoordConductor(c));
  }, [conductores]);

  const viajesConGps = useMemo(() => {
    return viajes.filter((v) => obtenerCoordViaje(v));
  }, [viajes]);

  const viajesActivos = useMemo(() => {
    return viajes.filter((v) =>
      ['aceptado', 'en_camino', 'en_viaje'].includes(v?.estado || v?.status)
    );
  }, [viajes]);

  return (
    <div className="map-admin-page">
      <div className="map-admin-header">
        <h2>Mapa en vivo</h2>
        <p>Conductores y viajes en tiempo real</p>
      </div>

      <div className="map-admin-stats">
        <div className="map-stat-card">
          <span>Conductores</span>
          <strong>{conductores.length}</strong>
        </div>

        <div className="map-stat-card">
          <span>Conductores con GPS</span>
          <strong>{conductoresConGps.length}</strong>
        </div>

        <div className="map-stat-card">
          <span>Viajes</span>
          <strong>{viajes.length}</strong>
        </div>

        <div className="map-stat-card">
          <span>Viajes activos</span>
          <strong>{viajesActivos.length}</strong>
        </div>
      </div>

      <div className="map-legend">
        <div><span className="legend-dot conductor"></span> Conductor</div>
        <div><span className="legend-dot solicitado"></span> Viaje solicitado</div>
        <div><span className="legend-dot aceptado"></span> Viaje aceptado</div>
        <div><span className="legend-dot encamino"></span> En camino</div>
        <div><span className="legend-dot enviaje"></span> En viaje</div>
        <div><span className="legend-dot finalizado"></span> Finalizado</div>
        <div><span className="legend-dot cancelado"></span> Cancelado</div>
      </div>

      <div className="map-wrapper">
        <MapContainer
          center={CENTRO_TUCUMAN}
          zoom={12}
          scrollWheelZoom={true}
          className="admin-live-map"
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <AutoCenter conductores={conductoresConGps} />

          {conductoresConGps.map((conductor) => {
            const pos = obtenerCoordConductor(conductor);
            if (!pos) return null;

            return (
              <Marker key={`conductor-${conductor.id}`} position={pos}>
                <Popup>
                  <div>
                    <strong>Conductor</strong>
                    <br />
                    Nombre: {conductor?.nombre || 'Sin nombre'}
                    <br />
                    Estado: {conductor?.estado || conductor?.status || 'Sin estado'}
                    <br />
                    Vehículo: {conductor?.vehiculo || conductor?.vehiculoNombre || conductor?.vehicleType || '-'}
                    <br />
                    Patente: {conductor?.patente || '-'}
                    <br />
                    Lat: {pos[0].toFixed(6)}
                    <br />
                    Lng: {pos[1].toFixed(6)}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {viajesConGps.map((viaje) => {
            const pos = obtenerCoordViaje(viaje);
            if (!pos) return null;

            return (
              <CircleMarker
                key={`viaje-${viaje.id}`}
                center={pos}
                radius={10}
                pathOptions={{
                  color: colorViaje(viaje?.estado || viaje?.status),
                  fillColor: colorViaje(viaje?.estado || viaje?.status),
                  fillOpacity: 0.75
                }}
              >
                <Popup>
                  <div>
                    <strong>Viaje</strong>
                    <br />
                    Estado: {viaje?.estado || viaje?.status || '-'}
                    <br />
                    Pasajero: {viaje?.passengerName || viaje?.pasajeroNombre || '-'}
                    <br />
                    Origen: {viaje?.originText || viaje?.origen || viaje?.pickup || '-'}
                    <br />
                    Destino: {viaje?.destinationText || viaje?.destino || viaje?.dropoff || '-'}
                    <br />
                    Precio: ${viaje?.price || viaje?.precio || 0}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {viajesActivos.map((viaje) => {
            const driverId = viaje?.conductorId || viaje?.driverId;
            const conductor = conductores.find((c) => c.id === driverId);
            const posConductor = conductor ? obtenerCoordConductor(conductor) : null;
            const posViaje = obtenerCoordViaje(viaje);

            if (!posConductor || !posViaje) return null;

            return (
              <Polyline
                key={`linea-${viaje.id}`}
                positions={[posConductor, posViaje]}
                pathOptions={{
                  color: '#111827',
                  weight: 3,
                  opacity: 0.7,
                  dashArray: '8, 8'
                }}
              />
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}