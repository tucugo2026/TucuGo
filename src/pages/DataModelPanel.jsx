import { Card } from '../components/Card';

const modelText = `
Colecciones recomendadas en Firestore

countries/{countryId}
- nombre
- moneda
- idioma
- codigoTelefono
- activo

cities/{cityId}
- pais
- nombre
- zonaHoraria
- tarifaBase
- precioKm
- precioMinuto
- centro
- activa

drivers/{driverId}
- nombre
- telefono
- pais
- ciudad
- estado
- activo
- ganancias
- vehiculo
- ubicacion

users/{userId}
- nombre
- email
- rol
- pais
- ciudad
- activo

trips/{tripId}
- pasajeroId
- pasajeroNombre
- conductorId
- conductorNombre
- pais
- ciudad
- servicio
- moneda
- estado
- pagoMetodo
- pagoEstado
- cryptoMoneda
- origen
- destino
- distanciaKm
- duracionMin
- precio
- creadoEn
`;

export default function DataModelPanel() {
  return (
    <div className="grid one-col">
      <Card title="Modelo global" subtitle="Base preparada para Argentina o cualquier país">
        <pre className="code-block">{modelText.trim()}</pre>
      </Card>
    </div>
  );
}
