/**
 * Utilidades de cliente para suscripción y gestión de Web Push (Sporting Saladar)
 */

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Comprueba si el navegador actual soporta Web Push y Service Workers
 */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Obtiene el estado actual del permiso de notificaciones
 */
export function getPushPermissionState(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Registra o reutiliza el Service Worker del proyecto
 */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;

  try {
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing) {
      await navigator.serviceWorker.ready;
      return existing;
    }

    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return reg;
  } catch (error) {
    console.warn('[PushClient] Error obteniendo Service Worker Registration:', error);
    return null;
  }
}

/**
 * Obtiene la suscripción Push actual si existe
 */
export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  try {
    const registration = await getServiceWorkerRegistration();
    if (!registration) return null;
    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.warn('[PushClient] Error consultando PushSubscription existente:', error);
    return null;
  }
}

/**
 * Solicita permiso y registra la suscripción en el servidor (/api/push/subscribe)
 */
export async function subscribeToPush(): Promise<{
  success: boolean;
  subscription?: PushSubscription;
  error?: string;
}> {
  if (!isPushSupported()) {
    return {
      success: false,
      error: 'Web Push no está soportado en este navegador o dispositivo.',
    };
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    return {
      success: false,
      error: 'NEXT_PUBLIC_VAPID_PUBLIC_KEY no está configurada.',
    };
  }

  try {
    const registration = await getServiceWorkerRegistration();
    if (!registration) {
      return {
        success: false,
        error: 'No se pudo inicializar el Service Worker.',
      };
    }

    // 1. Solicitar permiso explícito al usuario
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        error: 'Permiso de notificaciones no concedido.',
      };
    }

    // 2. Obtener o crear la suscripción en el navegador
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey.buffer as ArrayBuffer,
      });
    }

    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
      return {
        success: false,
        error: 'Estructura de PushSubscription incompleta proporcionada por el navegador.',
      };
    }

    // 3. Enviar la suscripción al backend
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        keys: {
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth,
        },
      }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      return {
        success: false,
        error: result.error || 'Error registrando la suscripción en el servidor.',
      };
    }

    return {
      success: true,
      subscription,
    };
  } catch (error: any) {
    console.error('[PushClient.subscribeToPush Error]:', error);
    return {
      success: false,
      error: error.message || 'Error inesperado durante la suscripción Push.',
    };
  }
}

/**
 * Elimina la suscripción del servidor y del navegador (/api/push/unsubscribe)
 */
export async function unsubscribeFromPush(): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!isPushSupported()) {
    return { success: true };
  }

  try {
    const subscription = await getCurrentPushSubscription();
    if (!subscription) {
      return { success: true };
    }

    const endpoint = subscription.endpoint;

    // 1. Notificar al backend para eliminar el registro de base de datos
    try {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ endpoint }),
      });
    } catch (apiErr) {
      console.warn('[PushClient] Error notificando unsubscribe al backend:', apiErr);
    }

    // 2. Desuscribir en el navegador
    await subscription.unsubscribe();

    return { success: true };
  } catch (error: any) {
    console.error('[PushClient.unsubscribeFromPush Error]:', error);
    return {
      success: false,
      error: error.message || 'Error desuscribiendo del servicio Push.',
    };
  }
}
