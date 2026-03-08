export default function DashboardCards({ stats }) {
  const cards = [
    { label: 'Países', value: stats.countries },
    { label: 'Ciudades', value: stats.cities },
    { label: 'Conductores', value: stats.drivers },
    { label: 'Viajes', value: stats.trips }
  ];

  return (
    <section className="card-grid">
      {cards.map((card) => (
        <article key={card.label} className="info-card">
          <h2>{card.label}</h2>
          <strong className="big-number">{card.value}</strong>
        </article>
      ))}
    </section>
  );
}
