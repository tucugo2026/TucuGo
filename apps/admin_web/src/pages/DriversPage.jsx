const fakeDrivers = [
  {
    id: '1',
    nombre: 'Juan Pérez',
    patente: 'AB123CD',
    estadoValidacion: 'pendiente',
  },
  {
    id: '2',
    nombre: 'Mario Gómez',
    patente: 'AE456FG',
    estadoValidacion: 'aprobado',
  },
];

export default function DriversPage() {
  return (
    <section>
      <h2>Conductores</h2>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Patente</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {fakeDrivers.map((driver) => (
              <tr key={driver.id}>
                <td>{driver.nombre}</td>
                <td>{driver.patente}</td>
                <td>{driver.estadoValidacion}</td>
                <td>
                  <button>Ver</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
