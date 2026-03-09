export default function DashboardPage() {
  return (
    <section>
      <h2>Dashboard</h2>
      <div className="grid">
        <article className="card">
          <h3>Conductores pendientes</h3>
          <p>0</p>
        </article>
        <article className="card">
          <h3>Viajes activos</h3>
          <p>0</p>
        </article>
        <article className="card">
          <h3>Usuarios registrados</h3>
          <p>0</p>
        </article>
      </div>
    </section>
  );
}
