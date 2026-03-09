export default function Header({ title, subtitle }) {
  return (
    <header className="hero-card tucugo-hero" style={{ marginBottom: '18px' }}>
      <div
        className="hero-brand"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}
      >
        <img
          src="./logo-header.png"
          alt="TucuGo"
          className="hero-logo-full"
          style={{
            width: '160px',
            maxWidth: '100%',
            display: 'block'
          }}
        />

        <div>
          <p
            className="eyebrow"
            style={{
              margin: 0,
              fontSize: '13px',
              opacity: 0.7
            }}
          >
            Movilidad global
          </p>

          <h1
            style={{
              margin: '6px 0 8px',
              fontSize: '42px',
              lineHeight: 1.05
            }}
          >
            {title}
          </h1>

          <p
            className="hero-subtitle"
            style={{
              margin: 0,
              fontSize: '16px',
              opacity: 0.85
            }}
          >
            {subtitle}
          </p>
        </div>
      </div>

      <div
        className="hero-chip"
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          marginTop: '12px'
        }}
      >
        <span>📲 Instalable</span>
        <span>📍 Tiempo real</span>
        <span>🪙 Cripto</span>
        <span>🌎 Global</span>
      </div>
    </header>
  );
}