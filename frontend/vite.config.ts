import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

function backendOrigin(): string {
  const configured = process.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '');
  if (!configured) return 'http://localhost:3000';
  return configured.endsWith('/api') ? configured.slice(0, -4) : configured;
}

// WHY: /api/* MUST NOT be cached by the service worker — menu analysis results are
// per-user and per-image. only static assets get cached.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        id: '/',
        name: 'As Your Dish',
        short_name: 'As Your Dish',
        description: 'Decode foreign menus from a photo.',
        theme_color: '#0f172a',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'zh-CN',
        orientation: 'portrait',
        categories: ['food', 'travel', 'utilities'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: backendOrigin(),
        changeOrigin: true,
      },
      '/dish-images': {
        target: backendOrigin(),
        changeOrigin: true,
      },
    },
  },
});
