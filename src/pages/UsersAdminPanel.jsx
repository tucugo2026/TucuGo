import { useEffect, useState } from 'react';
import TableCard from '../components/TableCard.jsx';
import { approveDriver, listUsers, updateUserRole } from '../services/authService.js';

export default function UsersAdminPanel() {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');

  async function loadUsers() {
    const rows = await listUsers();
    setUsers(rows.sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''))));
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleApprove(uid) {
    try {
      await approveDriver(uid);
      setMessage('Conductor aprobado correctamente.');
      await loadUsers();
    } catch (error) {
      setMessage(`No se pudo aprobar: ${error.message}`);
    }
  }

  async function handleChangeRole(uid, role) {
    try {
      await updateUserRole(uid, role);
      setMessage(`Rol actualizado a ${role}.`);
      await loadUsers();
    } catch (error) {
      setMessage(`No se pudo cambiar el rol: ${error.message}`);
    }
  }

  const rows = users.map((user) => ({
    id: user.uid || user.id,
    nombre: user.nombre || 'Sin nombre',
    email: user.email,
    rol: user.rol,
    ciudad: user.ciudad || '—',
    activo: user.activo ? 'Sí' : 'No',
    estado: user.estadoSolicitud || (user.aprobado ? 'activo' : 'pendiente')
  }));

  return (
    <div className="stack-lg">
      <div className="info-card">
        <h2>Usuarios y roles</h2>
        <p>{message || 'Desde aquí puedes aprobar conductores y cambiar roles.'}</p>
      </div>

      <TableCard
        title="Usuarios registrados"
        columns={[
          { key: 'nombre', label: 'Nombre' },
          { key: 'email', label: 'Email' },
          { key: 'rol', label: 'Rol' },
          { key: 'ciudad', label: 'Ciudad' },
          { key: 'activo', label: 'Activo' },
          { key: 'estado', label: 'Estado solicitud' }
        ]}
        rows={rows}
        actions={(row) => (
          <div className="action-stack">
            <button onClick={() => handleApprove(row.id)}>Aprobar conductor</button>
            <button onClick={() => handleChangeRole(row.id, 'admin')}>Hacer admin</button>
            <button onClick={() => handleChangeRole(row.id, 'conductor')}>Hacer conductor</button>
            <button onClick={() => handleChangeRole(row.id, 'pasajero')}>Hacer pasajero</button>
          </div>
        )}
      />
    </div>
  );
}
