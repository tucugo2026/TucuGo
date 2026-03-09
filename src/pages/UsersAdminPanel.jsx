import { useEffect, useState } from 'react';
import {
  approveDriver,
  blockDriver,
  listUsers,
  rejectDriver,
  unblockDriver,
  updateUserRole
} from '../services/authService.js';

export default function UsersAdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadUsers() {
    try {
      setLoading(true);
      const rows = await listUsers();
      setUsers(rows || []);
    } catch (error) {
      console.error(error);
      alert('No se pudieron cargar los usuarios.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleApprove(uid) {
    await approveDriver(uid);
    await loadUsers();
  }

  async function handleReject(uid) {
    await rejectDriver(uid);
    await loadUsers();
  }

  async function handleBlock(uid) {
    const motivo = window.prompt('Motivo del bloqueo:', 'Incumplimiento de normas');
    if (!motivo) return;

    await blockDriver(uid, motivo);
    await loadUsers();
  }

  async function handleUnblock(uid) {
    await unblockDriver(uid);
    await loadUsers();
  }

  async function handleRoleChange(uid, role) {
    await updateUserRole(uid, role);
    await loadUsers();
  }

  if (loading) {
    return <div className="info-card">Cargando usuarios...</div>;
  }

  return (
    <div className="stack-lg">
      <section className="info-grid">
        <article className="info-card">
          <h2>Total usuarios</h2>
          <strong className="big-number">{users.length}</strong>
        </article>

        <article className="info-card">
          <h2>Conductores</h2>
          <strong className="big-number">
            {users.filter((u) => u.rol === 'conductor').length}
          </strong>
        </article>

        <article className="info-card">
          <h2>Pendientes</h2>
          <strong className="big-number">
            {users.filter((u) => u.rol === 'conductor' && u.aprobado === false).length}
          </strong>
        </article>

        <article className="info-card">
          <h2>Bloqueados</h2>
          <strong className="big-number">
            {users.filter((u) => u.bloqueado === true).length}
          </strong>
        </article>
      </section>

      <section className="stack-md">
        <h2>Gestión de usuarios y conductores</h2>

        {users.map((user) => (
          <div key={user.uid || user.id} className="info-card">
            <p><b>Nombre:</b> {user.nombre || '-'}</p>
            <p><b>Email:</b> {user.email || '-'}</p>
            <p><b>Rol:</b> {user.rol || '-'}</p>
            <p><b>Teléfono:</b> {user.telefono || '-'}</p>
            <p><b>Estado:</b> {user.estado || user.status || '-'}</p>
            <p><b>Aprobado:</b> {String(user.aprobado)}</p>
            <p><b>Bloqueado:</b> {String(user.bloqueado === true)}</p>
            {user.motivoBloqueo ? <p><b>Motivo bloqueo:</b> {user.motivoBloqueo}</p> : null}
            {user.vehicleType || user.vehiculoTipo ? (
              <p><b>Vehículo:</b> {user.vehicleType || user.vehiculoTipo}</p>
            ) : null}

            <div className="button-row" style={{ flexWrap: 'wrap', marginTop: '12px' }}>
              <button onClick={() => handleRoleChange(user.uid || user.id, 'pasajero')}>
                Pasajero
              </button>

              <button onClick={() => handleRoleChange(user.uid || user.id, 'conductor')}>
                Conductor
              </button>

              <button onClick={() => handleRoleChange(user.uid || user.id, 'admin')}>
                Admin
              </button>

              {user.rol === 'conductor' ? (
                <>
                  <button className="primary-button" onClick={() => handleApprove(user.uid || user.id)}>
                    Aprobar
                  </button>

                  <button onClick={() => handleReject(user.uid || user.id)}>
                    Rechazar
                  </button>

                  {user.bloqueado ? (
                    <button onClick={() => handleUnblock(user.uid || user.id)}>
                      Desbloquear
                    </button>
                  ) : (
                    <button onClick={() => handleBlock(user.uid || user.id)}>
                      Bloquear
                    </button>
                  )}
                </>
              ) : null}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}