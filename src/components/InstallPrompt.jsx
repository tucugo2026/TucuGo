import { useEffect, useState } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    function onBeforeInstallPrompt(event) {
      event.preventDefault();
      setDeferredPrompt(event);
    }

    function onInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  if (installed) {
    return (
      <div className="install-banner success">
        ✅ TucuGo ya está instalada en este dispositivo.
      </div>
    );
  }

  if (!deferredPrompt) {
    return (
      <div className="install-banner">
        📲 TucuGo ya puede funcionar como app instalable. En algunos navegadores el botón aparecerá después de usar la app unos segundos.
      </div>
    );
  }

  return (
    <div className="install-banner">
      <div>
        <strong>Instalar TucuGo</strong>
        <p>Ábrela como una app real en tu celular o PC.</p>
      </div>
      <button className="primary-button" onClick={handleInstall}>
        Instalar app
      </button>
    </div>
  );
}
