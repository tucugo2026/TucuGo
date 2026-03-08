export default function UserMenu({ profile, onLogout }) {
  if (!profile) return null;

  return (
    <div className="user-menu">
      <div>
        <strong>{profile.nombre || profile.email}</strong>
        <div className="user-meta">{profile.rol} · {profile.ciudad || 'sin ciudad'}</div>
      </div>
      <button onClick={onLogout}>Cerrar sesión</button>
    </div>
  );
}
