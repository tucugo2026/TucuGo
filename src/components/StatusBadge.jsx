const LABELS = {
  solicitado: 'Solicitado',
  aceptado: 'Aceptado',
  en_camino: 'En camino',
  en_viaje: 'En viaje',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
  disponible: 'Disponible',
  ocupado: 'Ocupado',
  offline: 'Offline',
  suspendido: 'Suspendido'
};

export default function StatusBadge({ value }) {
  return <span className={`status-badge status-${value}`}>{LABELS[value] ?? value}</span>;
}
