import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Service Worker con actualización automática (recarga al detectar nueva versión)
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifestFilename: 'manifest.webmanifest',
      manifest: {
        id: '/',
        name: 'Streaming Platform',
        short_name: 'Streaming',
        description: 'Plataforma de contenido multimedia y transmisiones en vivo',
        lang: 'es',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#090d18',
        background_color: '#090d18',
        categories: ['entertainment', 'video', 'music'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        shortcuts: [
          { name: 'Biblioteca', short_name: 'Biblioteca', url: '/?seccion=biblioteca' },
          { name: 'En vivo', short_name: 'En vivo', url: '/?seccion=en-vivo' }
        ]
      },
      workbox: {
        // Estrategia de caché: precache del app shell (assets estáticos versionados)
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // No intentar cachear archivos demasiado grandes
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // Fallback sin conexión para navegación dentro de la app
        navigateFallback: '/index.html',
        // Nunca responder con el shell a llamadas de API ni archivos de usuario
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            // Autenticación, usuarios y estadísticas (información privada): siempre red, sin caché
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/api/auth') ||
              url.pathname.startsWith('/api/users') ||
              url.pathname.startsWith('/api/stats'),
            handler: 'NetworkOnly',
            options: {
              cacheName: 'no-store-private',
              cacheableResponse: { statuses: [] }
            }
          },
          {
            // Transmisiones en vivo y archivos subidos (tiempo real): nunca en caché
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/api/streams') ||
              url.pathname.startsWith('/api/live') ||
              url.pathname.startsWith('/uploads/'),
            handler: 'NetworkOnly',
            options: {
              cacheName: 'no-store-streams',
              cacheableResponse: { statuses: [] }
            }
          },
          {
            // Contenido público (publicaciones, categorías, salud): red primero con respaldo
            // NUNCA se cachea una petición que lleve cabecera Authorization (token/privado)
            urlPattern: ({ url, request }) =>
              !request.headers.has('authorization') &&
              (url.pathname.startsWith('/api/health') ||
                url.pathname.startsWith('/api/posts') ||
                url.pathname.startsWith('/api/categories')),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-public-content',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 60, maxAgeSeconds: 3600 },
              cacheableResponse: { statuses: [200] }
            }
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  server: { host: '0.0.0.0', port: 5173 }
});
