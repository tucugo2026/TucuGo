import StatusBadge from './StatusBadge.jsx';

export default function TableCard({ title, columns, rows, emptyMessage = 'Sin datos', actions }) {
  return (
    <section className="table-card">
      <div className="table-card-header">
        <h2>{title}</h2>
      </div>

      {!rows.length ? (
        <p className="empty-state">{emptyMessage}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
                {actions ? <th>Acciones</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id ?? JSON.stringify(row)}>
                  {columns.map((column) => (
                    <td key={column.key}>
                      {column.type === 'status' ? (
                        <StatusBadge value={row[column.key]} />
                      ) : (
                        row[column.key] ?? '—'
                      )}
                    </td>
                  ))}
                  {actions ? <td className="action-cell">{actions(row)}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
