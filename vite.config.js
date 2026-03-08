
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg','logo-header.png','logo-main.png'],
      manifest: {
        name: 'TucuGo',
        short_name: 'TucuGo',
        description: 'Tu viaje, tu destino',
        theme_color: '#ff8a00',
        background_color: '#0e2f6d',
        display: 'standalone',
        start_url: './',
        icons: [
          { src: 'icon-tucan-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-tucan-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-tucan-512.png', sizes: '512x512', type: 'image/png', purpose:'maskable' }
        ]
      },
      workbox:{
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
      }
    })
  ],
  base:'./'
});
