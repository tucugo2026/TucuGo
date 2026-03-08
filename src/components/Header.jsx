export default function Header({ title, subtitle }) {
  return (
    <header className="hero-card tucugo-hero">
      <div className="hero-brand">
        <img src="./logo-header.png" alt="TucuGo" className="hero-logo-full" />
        <div>
          <p className="eyebrow">TucuGo Global</p>
          <h1>{title}</h1>
          <p className="hero-subtitle">{subtitle}</p>
        </div>
      </div>
      <div className="hero-chip">
        <span>📲 Instalable</span>
        <span>📍 Mapa</span>
        <span>🪙 Cripto</span>
      </div>
    </header>
  );
}
