import { useEffect, useMemo, useState } from 'react';
import Header from './components/Header';
import AdminPanel from './pages/AdminPanel';
import PassengerPanel from './pages/PassengerPanel';
import DriverPanel from './pages/DriverPanel';
import DataModelPanel from './pages/DataModelPanel';
import CryptoPanel from './pages/CryptoPanel';
import {
  acceptTrip,
  autoAssignTrip,
  bootstrapDemoData,
  createTrip,
  deleteTrip,
  finishTrip,
  getAppData,
  resetLocalDemo,
  startTrip,
  updateDriverStatus
} from './services/dataService';
import { hasFirebaseConfig } from './services/firebase';

export default function App() {
  const [activeTab, setActiveTab] = useState('admin');
  const [data, setData] = useState({
    countries: [], cities: [], vehicleTypes: [], drivers: [], users: [], trips: []
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function refresh() {
    const next = await getAppData();
    setData(next);
  }

  useEffect(() => {
    refresh();
  }, []);

  function showMessage(text) {
    setMessage(text);
    window.clearTimeout(window.__tucugoMessageTimeout);
    window.__tucugoMessageTimeout = window.setTimeout(() => setMessage(''), 2500);
  }

  async function withAction(action, success) {
    setLoading(true);
    try {
      await action();
      await refresh();
      if (success) showMessage(success);
    } catch (error) {
      showMessage(error.message || 'Ocurrió un error');
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => ({
    trips: data.trips.length,
    drivers: data.drivers.length,
    cities: data.cities.length
  }), [data]);

  return (
    <div className="app-shell">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} stats={stats} />
      {message ? <div className="toast">{message}</div> : null}

      {activeTab === 'admin' ? (
        <AdminPanel
          data={data}
          loading={loading}
          hasFirebaseConfig={hasFirebaseConfig}
          onBootstrap={() => withAction(bootstrapDemoData, 'Base sembrada')}
          onReset={() => withAction(resetLocalDemo, 'Demo reiniciada')}
          onAutoAssign={(tripId) => withAction(() => autoAssignTrip(tripId), 'Conductor asignado')}
          onDeleteTrip={(tripId) => withAction(() => deleteTrip(tripId), 'Viaje eliminado')}
        />
      ) : null}

      {activeTab === 'pasajero' ? (
        <PassengerPanel
          data={data}
          loading={loading}
          onCreateTrip={(payload) => withAction(() => createTrip(payload), 'Viaje creado')}
        />
      ) : null}

      {activeTab === 'conductor' ? (
        <DriverPanel
          data={data}
          onDriverStatus={(driverId, estado) => withAction(() => updateDriverStatus(driverId, estado), 'Estado actualizado')}
          onAccept={(tripId, driverId) => withAction(() => acceptTrip(tripId, driverId), 'Viaje aceptado')}
          onStart={(tripId) => withAction(() => startTrip(tripId), 'Viaje iniciado')}
          onFinish={(tripId) => withAction(() => finishTrip(tripId), 'Viaje finalizado')}
        />
      ) : null}

      {activeTab === 'modelo' ? <DataModelPanel /> : null}
      {activeTab === 'pagos' ? <CryptoPanel /> : null}
    </div>
  );
}
