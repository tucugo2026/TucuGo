const schema = `{
  paises: {
    AR: { moneda: "ARS", idioma: "es", codigoTelefono: "+54" }
  },
  ciudades: {
    tucuman: {
      pais: "AR",
      zonaHoraria: "America/Argentina/Tucuman",
      tarifaBase: 1500,
      precioKm: 220,
      precioMinuto: 80
    }
  },
  conductores: {
    "drv-001": {
      nombre: "Conductor prueba",
      ciudad: "tucuman",
      estado: "disponible",
      lat: -26.8205,
      lng: -65.2210,
      aceptaCripto: true,
      viajeActivoId: ""
    }
  },
  viajes: {
    "trip-001": {
      pasajeroNombre: "Marcelo",
      origenTexto: "Mi ubicación actual",
      origenLat: -26.8241,
      origenLng: -65.2226,
      destinoTexto: "Ingenio Leales",
      destinoLat: -27.091,
      destinoLng: -65.176,
      precio: 1500,
      metodoPago: "USDC",
      estado: "solicitado",
      driverId: ""
    }
  }
}`;

export default function DataModelPanel() {
  return (
    <section className="stack-lg">
      <article className="info-card">
        <h2>Modelo sugerido de Firestore</h2>
        <p>
          Esta estructura te permite crecer desde Tucumán hasta cualquier país y además soportar pagos tradicionales y cripto.
        </p>
      </article>

      <pre className="code-block">{schema}</pre>
    </section>
  );
}
