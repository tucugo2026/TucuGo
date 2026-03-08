import { registerSW } from 'virtual:pwa-register';

export const updateSW = registerSW({
  onNeedRefresh() {
    console.log('Hay una nueva versión de TucuGo disponible.');
  },
  onOfflineReady() {
    console.log('TucuGo lista para funcionar offline.');
  }
});
