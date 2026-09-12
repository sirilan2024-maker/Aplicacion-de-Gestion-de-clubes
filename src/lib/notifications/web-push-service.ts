import webpush from 'web-push';

export interface WebPushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    link?: string;
    [key: string]: any;
  };
}

export interface SendPushParams {
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  payload: string | WebPushPayload;
}

/**
 * Comprueba si las variables de entorno VAPID están configuradas en el servidor
 */
export function isVapidConfigured(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  return Boolean(publicKey && privateKey);
}

/**
 * Inicializa los detalles VAPID en web-push si las claves están presentes
 */
function ensureVapidDetails(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:soporte@sportingsaladar.com';

  if (!publicKey || !privateKey) {
    return false;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    return true;
  } catch (error) {
    console.error('[WebPushService] Error inicializando VAPID details:', error);
    return false;
  }
}

/**
 * Envía una notificación Web Push a un endpoint específico
 */
export async function sendWebPushNotification(params: SendPushParams): Promise<{
  success: boolean;
  statusCode?: number;
  headers?: any;
  body?: string;
  error?: string;
}> {
  const { subscription, payload } = params;

  if (!ensureVapidDetails()) {
    return {
      success: false,
      error: 'VAPID credentials not configured on server',
    };
  }

  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

  try {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    };

    const response = await webpush.sendNotification(pushSubscription, payloadString, {
      TTL: 86400, // 24 hours
      urgency: 'high',
    });

    return {
      success: true,
      statusCode: response.statusCode,
      headers: response.headers,
      body: response.body,
    };
  } catch (error: any) {
    const statusCode = error.statusCode || error.status;
    const errorMessage = error.message || 'Error desconocido al enviar Push';

    // Propagar statusCode para que el invocador pueda detectar 404/410 y purgar suscripciones obsoletas
    const customErr: any = new Error(errorMessage);
    customErr.statusCode = statusCode;
    customErr.endpoint = subscription.endpoint;
    throw customErr;
  }
}
