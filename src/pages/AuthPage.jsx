import { useMemo, useState } from 'react';
import { loginUser, registerUser, resetPassword } from '../services/authService.js';

export default function AuthPage({ cities, onAuthResolved }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('pasajero');
  const [city, setCity] = useState(cities[0]?.id || 'tucuman');
  const [vehicleType, setVehicleType] = useState('auto');
  const [licensePlate, setLicensePlate] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const title = useMemo(() => (
    mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'
  ), [mode]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);

    try {
      if (mode === 'login') {
        const user = await loginUser(email, password);
        await onAuthResolved(user);
      } else {
        const user = await registerUser({
          name,
          email,
          password,
          role,
          city,
          phone,
          vehicleType: role === 'conductor' ? vehicleType : '',
          licensePlate: role === 'conductor' ? licensePlate : ''
        });

        await onAuthResolved(user);
      }
    } catch (err) {
      setError(mapAuthError(err?.code || err?.message || ''));
    } finally {
      setBusy(false);
    }
  }

  async function handleResetPassword() {
    if (!email) {
      setError('Escribe tu email para recuperar la contraseña.');
      return;
    }

    try {
      setBusy(true);
      setError('');
      setInfo('');
      await resetPassword(email);
      setInfo('Te enviamos un correo para restablecer la contraseña.');
    } catch (err) {
      setError(mapAuthError(err?.code || err?.message || ''));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <img src="./logo-main.png" alt="TucuGo" className="auth-logo" />
        <h2>{title}</h2>
        <p className="helper-text">Accede a TucuGo con tu rol correspondiente.</p>

        <form onSubmit={handleSubmit} className="stack-md">
          {mode === 'register' ? (
            <label>
              Nombre
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
          ) : null}

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength="6"
            />
          </label>

          {mode === 'register' ? (
            <>
              <label>
                Tipo de cuenta
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="pasajero">Pasajero</option>
                  <option value="conductor">Conductor</option>
                </select>
              </label>

              <label>
                Ciudad
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                >
                  {cities.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Teléfono
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="3811234567"
                  required={mode === 'register'}
                />
              </label>

              {role === 'conductor' ? (
                <>
                  <label>
                    Vehículo
                    <select
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                    >
                      <option value="auto">Auto</option>
                      <option value="moto">Moto</option>
                    </select>
                  </label>

                  <label>
                    Patente
                    <input
                      value={licensePlate}
                      onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                      placeholder="AAA123"
                      required
                    />
                  </label>

                  <div className="auth-note">
                    Las cuentas de conductor quedan <strong>pendientes de aprobación</strong> hasta que un admin las habilite.
                  </div>
                </>
              ) : null}
            </>
          ) : null}

          {error ? <div className="auth-error">{error}</div> : null}
          {info ? <div className="auth-info">{info}</div> : null}

          <button type="submit" className="primary-button" disabled={busy}>
            {busy ? 'Procesando...' : (mode === 'login' ? 'Entrar' : 'Crear cuenta')}
          </button>
        </form>

        {mode === 'login' ? (
          <button
            className="auth-switch"
            onClick={handleResetPassword}
            disabled={busy}
          >
            Recuperar contraseña
          </button>
        ) : null}

        <button
          className="auth-switch"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError('');
            setInfo('');
          }}
        >
          {mode === 'login' ? '¿No tienes cuenta? Crear una' : 'Ya tengo cuenta'}
        </button>

        <div className="auth-note">
          <strong>Importante:</strong> activa Email/Password en Firebase Authentication.
        </div>
      </div>
    </div>
  );
}

function mapAuthError(code) {
  if (String(code).includes('auth/invalid-credential')) return 'Credenciales inválidas.';
  if (String(code).includes('auth/email-already-in-use')) return 'Ese email ya está registrado.';
  if (String(code).includes('auth/weak-password')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (String(code).includes('auth/network-request-failed')) return 'Fallo de red. Revisa tu conexión.';
  if (String(code).includes('auth/operation-not-allowed')) return 'Activa Email/Password en Firebase Authentication.';
  if (String(code).includes('auth/user-not-found')) return 'No existe un usuario con ese email.';
  return 'No se pudo completar la operación.';
}