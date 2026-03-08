export default function Header({ activeTab, setActiveTab, stats }) {
  const tabs = [
    ['admin', 'Admin'],
    ['pasajero', 'Pasajero'],
    ['conductor', 'Conductor'],
    ['modelo', 'Modelo'],
    ['pagos', 'Cripto']
  ];

  return (
    <header className="hero">
      <div>
        <p className="eyebrow">Base global lista para crecer</p>
        <h1>TucuGo Global</h1>
        <p className="hero-text">
          Multi país, multi ciudad, multi moneda, con soporte inicial para pagos cripto y
          lógica lista para Firebase o modo demo local.
        </p>
      </div>

      <div className="hero-stats">
        <div className="mini-card"><strong>{stats.trips}</strong><span>Viajes</span></div>
        <div className="mini-card"><strong>{stats.drivers}</strong><span>Conductores</span></div>
        <div className="mini-card"><strong>{stats.cities}</strong><span>Ciudades</span></div>
      </div>

      <nav className="tabs">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            className={activeTab === key ? 'tab active' : 'tab'}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>
    </header>
  );
}
