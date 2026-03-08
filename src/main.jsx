import React from 'react';
import ReactDOM from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './styles/global.css';
import './pwa.js';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

if ('serviceWorker' in navigator && window.location.hostname === 'localhost') {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => reg.update());
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
