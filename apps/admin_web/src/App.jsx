import { Link, Route, Routes } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import DriversPage from './pages/DriversPage';
import LoginPage from './pages/LoginPage';

export default function App() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>TucuGo Admin</h1>
        <nav>
          <Link to="/">Dashboard</Link>
          <Link to="/conductores">Conductores</Link>
          <Link to="/login">Login</Link>
        </nav>
      </aside>

      <main className="content">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/conductores" element={<DriversPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </main>
    </div>
  );
}
