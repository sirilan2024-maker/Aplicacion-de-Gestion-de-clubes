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
 * Registra o reutiliza el Service Worker del proyecto sin bloqueos
 */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;

  try {
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    }

    if (reg.active) {
      return reg;
    }

    // Esperar a ready con timeout defensivo de 4 segundos
    const readyPromise = navigator.serviceWorker.ready;
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000));
    const readyReg = await Promise.race([readyPromise, timeoutPromise]);

    return (readyReg as ServiceWorkerRegistration) || reg;
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

const DEFAULT_VAPID_PUBLIC_KEY = 'BE0ACBxtzHhw-ELSeWXKduhChMlCMzfKDA5eQzgNmzYtmD0xDmTeIcvydHa94EKX2WDFmf1ZSvEtUvgsVEKtTtg';

/**
 * Solicita permiso y registra la suscripción en el servidor (/api/push/subscribe)
 * Notification.requestPermission() se invoca de forma inmediata para
 * garantizar el gesto directo del usuario.
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

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;
  let controller: AbortController | null = null;

  try {
    // 1. SOLICITAR PERMISO INMEDIATAMENTE ANTE EL CLICK DEL USUARIO
    let permission: NotificationPermission = Notification.permission;
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      return {
        success: false,
        error: permission === 'denied' 
          ? 'Has bloqueado las notificaciones en los ajustes de tu navegador.' 
          : 'Permiso de notificaciones no concedido.',
      };
    }

    // 2. Obtener registro del Service Worker
    const registration = await getServiceWorkerRegistration();
    if (!registration) {
      return {
        success: false,
        error: 'No se pudo inicializar el Service Worker en segundo plano.',
      };
    }

    // 3. Preparar clave pública en ArrayBuffer exacto
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
    const applicationServerKey = convertedVapidKey.buffer.slice(
      convertedVapidKey.byteOffset,
      convertedVapidKey.byteOffset + convertedVapidKey.byteLength
    );

    // 4. Obtener o crear la suscripción en el navegador
    let subscription: PushSubscription | null = null;
    try {
      subscription = await registration.pushManager.getSubscription();
    } catch (e) {
      console.warn('[PushClient] Error leyendo suscripción previa:', e);
    }

    if (!subscription) {
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as ArrayBuffer,
        });
      } catch (subErr: any) {
        console.error('[PushClient] Error en pushManager.subscribe:', subErr);
        return {
          success: false,
          error: `Error en servicio push del navegador: ${subErr.message || subErr.name}`,
        };
      }
    }

    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
      return {
        success: false,
        error: 'Estructura de suscripción incompleta recibida del navegador.',
      };
    }

    // 5. Enviar la suscripción al backend con timeout de seguridad (15s)
    controller = new AbortController();
    const timeoutId = setTimeout(() => controller?.abort(), 15000);

    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        keys: {
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth,
        },
      }),
    });
    clearTimeout(timeoutId);

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
    if (controller?.signal?.aborted) {
      return {
        success: false,
        error: 'Tiempo de espera agotado al conectar con el servidor (15s).',
      };
    }
    return {
      success: false,
      error: error.message || error.name || 'Error inesperado durante la activación.',
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
