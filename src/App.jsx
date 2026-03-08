import { useEffect, useMemo, useState } from 'react';
import Header from './components/Header.jsx';
import DashboardCards from './components/DashboardCards.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import PassengerPanel from './pages/PassengerPanel.jsx';
import DriverPanel from './pages/DriverPanel.jsx';
import DataModelPanel from './pages/DataModelPanel.jsx';
import InstallPrompt from './components/InstallPrompt.jsx';
import AuthPage from './pages/AuthPage.jsx';
import UserMenu from './components/UserMenu.jsx';
import UsersAdminPanel from './pages/UsersAdminPanel.jsx';
import TripsRealtimePanel from './pages/TripsRealtimePanel.jsx';
import { APP_NAME, APP_SUBTITLE, USE_FIRESTORE } from './config/appConfig.js';
import { initAnalytics } from './services/firebase.js';
import { getCities, getDrivers, seedBaseData, subscribeTrips } from './services/tripService.js';
import { getUserProfile, logoutUser, subscribeAuth } from './services/authService.js';

const tabsByRole = {
  admin: [
    { id: 'admin', label: 'Admin' },
    { id: 'passenger', label: 'Pasajero' },
    { id: 'driver', label: 'Conductor' },
    { id: 'model', label: 'Modelo Firestore' },
    { id: 'users', label: 'Usuarios' },
    { id: 'realtime', label: 'Tiempo real' }
  ],
  conductor: [
    { id: 'driver', label: 'Conductor' }
  ],
  pasajero: [
    { id: 'passenger', label: 'Pasajero' }
  ]
};

export default function App() {
  const [activeTab, setActiveTab] = useState('admin');
  const [cities, setCities] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [bootMessage, setBootMessage] = useState('Iniciando TucuGo...');
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState(null);

  async function refreshAll() {
    const [cityRows, driverRows] = await Promise.all([getCities(), getDrivers()]);
    setCities(Array.isArray(cityRows) ? cityRows : []);
    setDrivers(Array.isArray(driverRows) ? driverRows : []);
  }

  async function resolveUser(user) {
    setAuthUser(user);
    if (!user) {
      setProfile(null);
      return;
    }
    const data = await getUserProfile(user.uid);
    setProfile(data);
    setActiveTab(data?.rol === 'admin' ? 'admin' : data?.rol === 'conductor' ? 'driver' : 'passenger');
  }

  useEffect(() => {
    let unsubscribeTrips = () => {};
    let unsubscribeAuth = () => {};

    async function boot() {
      try {
        setLoading(true);
        setBootMessage('Preparando TucuGo...');
        await initAnalytics().catch(() => null);

        // Base data only once per boot
        try {
          await seedBaseData();
        } catch (error) {
          console.warn('seedBaseData:', error);
        }

        await refreshAll();
        unsubscribeTrips = subscribeTrips((rows) => {
          setTrips(Array.isArray(rows) ? rows : []);
        });

        unsubscribeAuth = subscribeAuth(async (user) => {
          try {
            await resolveUser(user);
          } finally {
            setFirebaseReady(true);
          }
        });

        setBootMessage(USE_FIRESTORE ? 'Conectado a Firebase.' : 'Modo demo local activo.');
      } catch (error) {
        console.error('Boot error:', error);
        setBootMessage(`Hubo un problema al iniciar: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }

    boot();
    const timer = setTimeout(() => setShowSplash(false), 2200);
    return () => {
      clearTimeout(timer);
      unsubscribeTrips();
      unsubscribeAuth();
    };
  }, []);

  const tabs = tabsByRole[profile?.rol || 'pasajero'];

  const stats = useMemo(
    () => ({
      countries: 3,
      cities: cities.length,
      drivers: drivers.length,
      trips: trips.length
    }),
    [cities, drivers, trips]
  );

  async function handleLogout() {
    await logoutUser();
  }

  const content = useMemo(() => {
    if (!firebaseReady) {
      return <div className="panel-card">Cargando autenticación...</div>;
    }

    if (!authUser) {
      return <AuthPage cities={cities} onAuthResolved={resolveUser} />;
    }

    if (profile?.rol === 'conductor' && profile?.aprobado === false) {
      return <div className="info-card"><h2>Cuenta de conductor pendiente</h2><p>Tu cuenta está creada, pero todavía necesita aprobación de un admin para entrar al panel de conductor.</p></div>;
    }

    switch (activeTab) {
      case 'passenger':
        return <PassengerPanel cities={cities} drivers={drivers} refreshAll={refreshAll} />;
      case 'driver':
        return <DriverPanel cities={cities} drivers={drivers} trips={trips} refreshAll={refreshAll} />;
      case 'model':
        return profile?.rol === 'admin' ? <DataModelPanel /> : <PassengerPanel cities={cities} drivers={drivers} refreshAll={refreshAll} />;
      case 'users':
        return profile?.rol === 'admin' ? <UsersAdminPanel /> : <PassengerPanel cities={cities} drivers={drivers} refreshAll={refreshAll} />;
      case 'realtime':
        return profile?.rol === 'admin' ? <TripsRealtimePanel trips={trips} cities={cities} refreshAll={refreshAll} /> : <PassengerPanel cities={cities} drivers={drivers} refreshAll={refreshAll} />;
      case 'admin':
      default:
        return profile?.rol === 'admin'
          ? <AdminPanel cities={cities} drivers={drivers} trips={trips} refreshAll={refreshAll} />
          : <PassengerPanel cities={cities} drivers={drivers} refreshAll={refreshAll} />;
    }
  }, [firebaseReady, authUser, activeTab, profile, cities, drivers, trips]);

  return (
    <>
      {showSplash ? (
        <div className="splash-screen">
          <div className="splash-card">
            <img src="./logo-splash-full.png" alt="TucuGo" className="splash-image splash-image-brand" />
            <div className="splash-loader">
              <span></span><span></span><span></span>
            </div>
            <p className="splash-text">Tu viaje, tu destino</p>
          </div>
        </div>
      ) : null}

      <div className="app-shell">
        <Header title={APP_NAME} subtitle={APP_SUBTITLE} />
        <DashboardCards stats={stats} />
        <InstallPrompt />

        <div className="boot-banner">
          {loading ? '⏳ ' : '✅ '}
          {bootMessage}
        </div>

        {authUser && profile ? <UserMenu profile={profile} onLogout={handleLogout} /> : null}

        {authUser && profile ? (
          <div className="tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab ${tab.id === activeTab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : null}

        <main className="panel-card">{content}</main>
      </div>
    </>
  );
}
