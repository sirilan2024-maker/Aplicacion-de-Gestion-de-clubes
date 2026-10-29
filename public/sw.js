/**
 * Sporting Saladar - Service Worker Oficial para PWA y Web Push
 */

const CACHE_NAME = 'sporting-saladar-v4';

// ==============================================================================
// 1. INSTALACIÓN INMEDIATA (0 ms, sin bloqueos de red ni precache fallido)
// ==============================================================================
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// ==============================================================================
// 2. ACTIVACIÓN INMEDIATA (Reclama clientes y purga cachés antiguas)
// ==============================================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        );
      }),
    ])
  );
});

// Escuchar orden explícita de activación
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ==============================================================================
// 3. ESTRATEGIA DE RED CON CACHÉ DE RESPALDO (Network-First para datos frescos)
// ==============================================================================
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignorar peticiones que no sean GET o que sean a las APIs internas
  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  // Para llamadas de navegación y páginas: Network-first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(request);
        return cached || (await caches.match('/'));
      })
    );
    return;
  }

  // Para imágenes e iconos estáticos: Cache-first
  if (
    request.destination === 'image' ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.webp')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return (
          cached ||
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return networkResponse;
          })
        );
      })
    );
    return;
  }
});

// ==============================================================================
// 4. RECEPTOR DE NOTIFICACIONES PUSH EN SEGUNDO PLANO
// ==============================================================================
self.addEventListener('push', (event) => {
  let payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { body: event.data.text() };
    }
  }

  const title = payload.title || 'Sporting Saladar';
  const options = {
    body: payload.body || 'Tienes un nuevo aviso de Sporting Saladar',
    icon: payload.icon || '/icons/icon-192x192.svg',
    badge: payload.badge || '/icons/icon-192x192.svg',
    tag: payload.tag || 'sporting-saladar-notification',
    vibrate: [100, 50, 100],
    data: {
      link: payload.data?.link || '/dashboard',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ==============================================================================
// 5. CLIC EN NOTIFICACIÓN: APERTURA Y NAVEGACIÓN DIRECTA
// ==============================================================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const rawLink = event.notification.data?.link || '/dashboard';

  let targetUrl = '/dashboard';
  try {
    const parsed = new URL(rawLink, self.location.origin);
    if (
      parsed.origin === self.location.origin ||
      parsed.origin === 'https://app.clubsportingsaladar.com'
    ) {
      targetUrl = parsed.href;
    }
  } catch {
    targetUrl = '/dashboard';
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        for (const client of clientList) {
          if ('focus' in client && 'navigate' in client) {
            client.focus();
            return client.navigate(targetUrl);
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
