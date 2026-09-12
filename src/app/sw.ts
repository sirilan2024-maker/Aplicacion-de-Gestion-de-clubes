/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// ==============================================================================
// WEB PUSH & NOTIFICATION HANDLERS (Fase P2)
// ==============================================================================

self.addEventListener('push', (event: PushEvent) => {
  let payload: {
    title?: string;
    body?: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: {
      link?: string;
      [key: string]: any;
    };
  } = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { body: event.data.text() };
    }
  }

  const title = payload.title || 'Sporting Saladar';
  const options: NotificationOptions = {
    body: payload.body || 'Tienes un nuevo aviso de Sporting Saladar',
    icon: payload.icon || '/icons/icon-192x192.svg',
    badge: payload.badge || '/icons/icon-192x192.svg',
    tag: payload.tag || 'sporting-saladar-notification',
    data: {
      link: payload.data?.link || '/dashboard',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  const rawLink = event.notification.data?.link || '/dashboard';

  // Validación estricta de destino seguro (prevenir open-redirects a dominios externos maliciosos)
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
        // Si ya existe una ventana abierta con la misma URL, enfocarla
        for (const client of clientList) {
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        // Si hay alguna ventana de la app abierta, navegar a la URL
        for (const client of clientList) {
          if ('focus' in client && 'navigate' in client) {
            client.focus();
            return client.navigate(targetUrl);
          }
        }
        // Si no hay ventana abierta, abrir una nueva
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

