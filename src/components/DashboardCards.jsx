export default function DashboardCards({ stats }) {
  const items = [
    { label: 'Conductores', value: stats.drivers },
    { label: 'Viajes', value: stats.trips },
    { label: 'Activos', value: stats.activeTrips ?? 0 },
    { label: 'Disponibles', value: stats.availableDrivers ?? 0 }
  ];

  return (
    <section
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        marginBottom: '18px'
      }}
    >
      {items.map((item) => (
        <article key={item.label} className="info-card">
          <div style={{ fontSize: '14px', opacity: 0.75 }}>{item.label}</div>
          <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '6px' }}>
            {item.value}
          </div>
        </article>
      ))}
    </section>
  );
}