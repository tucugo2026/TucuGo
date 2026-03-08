import { Card, Badge } from '../components/Card';

export default function CryptoPanel() {
  return (
    <div className="grid two-col">
      <Card title="Cripto en TucuGo" subtitle="Diferencial fuerte, pero con orden">
        <div className="list compact">
          <div className="list-row"><strong>Etapa 1</strong><p>Activar solo USDC o USDT.</p></div>
          <div className="list-row"><strong>Etapa 2</strong><p>Pasarela wallet o checkout empresarial.</p></div>
          <div className="list-row"><strong>Etapa 3</strong><p>BTC como opción extra, no principal.</p></div>
        </div>
      </Card>
      <Card title="Mi opinión" subtitle="Sí, vale la pena, pero mejor estable que llamativo">
        <div className="hint-box">
          <Badge tone="success">Recomendado</Badge>
          <p>
            Ser de los primeros en aceptar cripto te da identidad de marca. Para viajes conviene
            empezar con stablecoins porque la tarifa del conductor no debería variar mientras el
            usuario decide pagar.
          </p>
        </div>
        <div className="hint-box top-gap">
          <Badge tone="warning">Cuidado</Badge>
          <p>
            Antes de operar a escala, revisa el encuadre legal, impositivo y contable del país donde
            lo lances. La parte técnica se resuelve; la operativa es lo que más pesa después.
          </p>
        </div>
      </Card>
    </div>
  );
}
