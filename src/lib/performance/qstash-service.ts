/**
 * Sporting Saladar — Módulo de Rendimiento: Servicio de Automatización Upstash QStash
 * 
 * Reglas arquitectónicas obligatorias:
 * 1. Hooper: start_time - 180 minutos (3 horas antes).
 * 2. RPE: start_time + 90 minutos (exactamente 90 min tras inicio, sin requerir end_time).
 * 3. Programación individual: exactamente 2 mensajes independientes por sesión (Hooper y RPE).
 * 4. Payload mínimo estricto: únicamente { eventId, type } (sin nombres ni datos personales).
 * 5. Huso peninsular español: Europe/Madrid y conversión rigurosa a UTC (segundos epoch para QStash).
 * 6. Solución al límite de 7 días del Plan Gratuito:
 *    - Si el aviso cae dentro de 7 días, se programa directamente para su fecha/hora UTC exacta.
 *    - Si el aviso supera los 7 días (p. ej. planificado a 14 o 30 días vista), se programa un
 *      mensaje de relevo ("relay") a 6 días vista. Al despertar, el endpoint reevalúa la sesión:
 *      si ya está en ventana <= 7 días programa el aviso definitivo; si no, programa otro relevo.
 *      Así NUNCA se pierde ningún aviso futuro sin requerir planes de pago.
 * 7. Cancelación y reprogramación automática:
 *    - Al modificar día u hora: cancela los mensajes anteriores en QStash y agenda los nuevos.
 *    - Al cancelar o borrar una sesión: cancela todos los mensajes asociados en QStash.
 * 8. Persistencia sin tablas nuevas:
 *    - Los IDs de mensajes de QStash se gestionan en la tabla existente `club_metrics`.
 * 9. Verificación de firma criptográfica:
 *    - Implementación nativa con Web/Node Crypto para verificar la cabecera `upstash-signature`
 *      usando QSTASH_CURRENT_SIGNING_KEY y QSTASH_NEXT_SIGNING_KEY.
 * 10. Modo Mock / Simulación Local:
 *    - Si QSTASH_MOCK === 'true' o no hay credenciales, simula la programación/cancelación
 *      sin realizar peticiones externas, permitiendo pruebas Dry-Run 100% seguras.
 */

import crypto from 'node:crypto';
import { parseSpainDateTime } from './reminders-service';

export const QSTASH_CONFIG_METRIC_NAME = 'QStash_Event_Reminders';
export const QSTASH_DEV_SIGNING_KEY = 'sigkey_local_dev_secret_key';

export interface QStashPayload {
  eventId: string;
  type: 'WELLNESS_REMINDER' | 'SESSION_FEEDBACK_REMINDER';
  relay?: boolean;
}

export interface CalculatedScheduleItem {
  type: 'WELLNESS_REMINDER' | 'SESSION_FEEDBACK_REMINDER';
  targetDateUtc: Date;
  targetEpochSeconds: number;
  scheduledEpochSeconds: number;
  isRelay: boolean;
  delaySeconds: number;
}

export interface QStashSessionSchedule {
  wellness: CalculatedScheduleItem;
  feedback: CalculatedScheduleItem;
}

export interface StoredQStashEventEntry {
  wellnessMessageId?: string;
  feedbackMessageId?: string;
  wellnessScheduledEpoch?: number;
  feedbackScheduledEpoch?: number;
  sessionDate: string;
  sessionStartTime: string;
  updatedAt: string;
}

/**
 * Convierte una fecha y hora local peninsular (Europe/Madrid) a fecha UTC y calcula
 * los tiempos de ejecución para Hooper (-180m) y RPE (+90m), resolviendo además
 * el límite de 7 días (604.800 s) de la versión gratuita de QStash mediante relevos (relay).
 */
export function calculateQStashSchedule(
  dateStr: string,
  startTimeStr: string,
  nowMs: number = Date.now()
): { success: boolean; schedule?: QStashSessionSchedule; reason?: string } {
  if (!dateStr || !startTimeStr) {
    return { success: false, reason: 'Falta fecha (date) u hora de inicio (start_time).' };
  }

  const sessionStart = parseSpainDateTime(dateStr, startTimeStr);
  if (!sessionStart || isNaN(sessionStart.getTime())) {
    return { success: false, reason: 'Formato de fecha u hora no válido para Europe/Madrid.' };
  }

  const MAX_QSTASH_FREE_DELAY_SECONDS = 7 * 24 * 3600; // 604.800 s (7 días)
  const RELAY_INTERVAL_SECONDS = 6 * 24 * 3600; // 518.400 s (6 días para margen seguro)

  // 1. Hooper: 180 min antes del inicio
  const wellnessTargetMs = sessionStart.getTime() - 180 * 60 * 1000;
  const wellnessDiffSeconds = Math.floor((wellnessTargetMs - nowMs) / 1000);

  // 2. RPE: 90 min después del inicio (sin requerir end_time)
  const feedbackTargetMs = sessionStart.getTime() + 90 * 60 * 1000;
  const feedbackDiffSeconds = Math.floor((feedbackTargetMs - nowMs) / 1000);

  function resolveItemSchedule(
    type: 'WELLNESS_REMINDER' | 'SESSION_FEEDBACK_REMINDER',
    targetMs: number,
    diffSeconds: number
  ): CalculatedScheduleItem {
    const targetDateUtc = new Date(targetMs);
    const targetEpochSeconds = Math.floor(targetMs / 1000);

    if (diffSeconds > MAX_QSTASH_FREE_DELAY_SECONDS) {
      // Supera los 7 días -> programar relevo seguro a 6 días
      const relayEpoch = Math.floor(nowMs / 1000) + RELAY_INTERVAL_SECONDS;
      return {
        type,
        targetDateUtc,
        targetEpochSeconds,
        scheduledEpochSeconds: relayEpoch,
        isRelay: true,
        delaySeconds: RELAY_INTERVAL_SECONDS,
      };
    } else {
      // Cae dentro de los 7 días -> programar directamente en fecha/hora exacta
      const scheduledEpoch = Math.max(Math.floor(nowMs / 1000), targetEpochSeconds);
      return {
        type,
        targetDateUtc,
        targetEpochSeconds,
        scheduledEpochSeconds: scheduledEpoch,
        isRelay: false,
        delaySeconds: Math.max(0, diffSeconds),
      };
    }
  }

  const wellness = resolveItemSchedule('WELLNESS_REMINDER', wellnessTargetMs, wellnessDiffSeconds);
  const feedback = resolveItemSchedule('SESSION_FEEDBACK_REMINDER', feedbackTargetMs, feedbackDiffSeconds);

  return {
    success: true,
    schedule: { wellness, feedback },
  };
}

/**
 * Verifica la firma criptográfica (JWT HS256) emitida por Upstash QStash en la cabecera `upstash-signature`.
 */
export function verifyQStashSignature(params: {
  signature: string;
  body: string;
  url?: string;
  currentSigningKey?: string;
  nextSigningKey?: string;
  clockToleranceSeconds?: number;
}): { isValid: boolean; reason?: string } {
  const {
    signature,
    body,
    currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY,
    clockToleranceSeconds = 300, // 5 min de tolerancia
  } = params;

  if (!signature || signature.trim() === '') {
    return { isValid: false, reason: 'Cabecera de firma upstash-signature ausente.' };
  }

  const isDevMode = process.env.QSTASH_DEV === 'true' || process.env.QSTASH_DEV === '1';
  let keys = [currentSigningKey, nextSigningKey].filter(Boolean) as string[];
  if (keys.length === 0) {
    if (isDevMode) {
      keys = [QSTASH_DEV_SIGNING_KEY];
    } else if (process.env.QSTASH_MOCK === 'true') {
      return { isValid: true, reason: 'Validación omitida en modo QSTASH_MOCK' };
    } else {
      return { isValid: false, reason: 'No hay claves QSTASH_CURRENT_SIGNING_KEY ni QSTASH_NEXT_SIGNING_KEY configuradas.' };
    }
  }

  const parts = signature.trim().split('.');
  if (parts.length !== 3) {
    return { isValid: false, reason: 'Estructura JWT de firma QStash no válida.' };
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // 1. Verificar firma criptográfica HMAC-SHA256
  let keyMatched = false;
  for (const key of keys) {
    try {
      const hmac = crypto.createHmac('sha256', key);
      hmac.update(`${headerB64}.${payloadB64}`);
      const computedSignatureB64 = hmac.digest('base64url');

      const sigBuf = Buffer.from(signatureB64, 'base64url');
      const compBuf = Buffer.from(computedSignatureB64, 'base64url');

      if (sigBuf.length === compBuf.length && crypto.timingSafeEqual(sigBuf, compBuf)) {
        keyMatched = true;
        break;
      }
    } catch {
      continue;
    }
  }

  if (!keyMatched) {
    return { isValid: false, reason: 'Firma HMAC-SHA256 no coincide con ninguna clave configurada.' };
  }

  // 2. Parsear y verificar claims del payload
  try {
    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson);

    if (payload.iss !== 'Upstash') {
      return { isValid: false, reason: `Emisor (iss) no válido: esperado 'Upstash', recibido '${payload.iss}'` };
    }

    const nowSec = Math.floor(Date.now() / 1000);

    if (payload.exp && nowSec > payload.exp + clockToleranceSeconds) {
      return { isValid: false, reason: 'Firma QStash expirada (exp claim superado).' };
    }

    if (payload.nbf && nowSec < payload.nbf - clockToleranceSeconds) {
      return { isValid: false, reason: 'Firma QStash aún no activa (nbf claim futuro).' };
    }

    // 3. Verificar hash del cuerpo (body claim)
    if (payload.body) {
      const sha256Base64url = crypto.createHash('sha256').update(body, 'utf8').digest('base64url');
      const sha256Hex = crypto.createHash('sha256').update(body, 'utf8').digest('hex');

      if (payload.body !== sha256Base64url && payload.body !== sha256Hex) {
        return { isValid: false, reason: 'El hash del cuerpo (body hash) no coincide con el payload firmado.' };
      }
    }

    return { isValid: true };
  } catch (err: any) {
    return { isValid: false, reason: `Error al decodificar payload JWT: ${err?.message || err}` };
  }
}

/**
 * Obtiene el registro de mensajes QStash almacenado en `club_metrics`.
 */
async function getStoredQStashRegistry(clubId: string, supabaseClient: any): Promise<Record<string, StoredQStashEventEntry>> {
  try {
    const { data } = await supabaseClient
      .from('club_metrics')
      .select('options')
      .eq('club_id', clubId)
      .eq('name', QSTASH_CONFIG_METRIC_NAME)
      .maybeSingle();

    if (data?.options && typeof data.options === 'object' && (data.options as any).events) {
      return (data.options as any).events;
    }
    return {};
  } catch (err) {
    console.warn('[QStash] Error leyendo registro en club_metrics:', err);
    return {};
  }
}

/**
 * Guarda o actualiza el registro de mensajes QStash en `club_metrics`.
 */
async function saveStoredQStashRegistry(
  clubId: string,
  events: Record<string, StoredQStashEventEntry>,
  supabaseClient: any
): Promise<void> {
  try {
    const { data: existing } = await supabaseClient
      .from('club_metrics')
      .select('id')
      .eq('club_id', clubId)
      .eq('name', QSTASH_CONFIG_METRIC_NAME)
      .maybeSingle();

    const payload = {
      club_id: clubId,
      name: QSTASH_CONFIG_METRIC_NAME,
      category: 'Rendimiento',
      module_type: 'rendimiento',
      unit: 'qstash_registry',
      type: 'text',
      is_active: true,
      description: 'Registro de IDs de mensajes programados en Upstash QStash para cancelación y reprogramación.',
      options: {
        events,
        updatedAt: new Date().toISOString(),
      },
    };

    if (existing?.id) {
      await supabaseClient.from('club_metrics').update(payload).eq('id', existing.id);
    } else {
      await supabaseClient.from('club_metrics').insert(payload);
    }
  } catch (err) {
    console.warn('[QStash] Error guardando registro en club_metrics:', err);
  }
}

/**
 * Realiza la llamada HTTP a Upstash QStash para publicar un mensaje diferido,
 * o simula el envío si estamos en entorno local / modo simulación.
 */
async function publishToQStash(params: {
  destinationUrl: string;
  payload: QStashPayload;
  notBeforeEpochSeconds: number;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const isDevMode = process.env.QSTASH_DEV === 'true' || process.env.QSTASH_DEV === '1';
  const isMock = !isDevMode && (process.env.QSTASH_MOCK === 'true' || !process.env.QSTASH_TOKEN);

  if (isMock) {
    const mockId = `mock_msg_${crypto.randomUUID()}`;
    const delaySec = Math.max(0, params.notBeforeEpochSeconds - Math.floor(Date.now() / 1000));
    console.log(
      `[QStash Mock] Programado aviso ${params.payload.type} para evento ${params.payload.eventId} en +${delaySec}s (Epoch ${params.notBeforeEpochSeconds}, Relay=${Boolean(params.payload.relay)}) -> ${mockId}`
    );
    return { success: true, messageId: mockId };
  }

  const defaultUrl = isDevMode ? 'http://127.0.0.1:8080/v2' : 'https://qstash.upstash.io/v2';
  const qstashUrl = process.env.QSTASH_URL || defaultUrl;
  const token = process.env.QSTASH_TOKEN || (isDevMode ? 'local_dev_token' : '');

  try {
    const res = await fetch(`${qstashUrl}/publish/${params.destinationUrl}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Upstash-Not-Before': String(params.notBeforeEpochSeconds),
      },
      body: JSON.stringify(params.payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Error QStash (${res.status}): ${errText}` };
    }

    const json = await res.json();
    return { success: true, messageId: json.messageId };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Fallo de conexión con QStash' };
  }
}

/**
 * Cancela un mensaje previamente programado en QStash mediante su `messageId`.
 */
export async function cancelQStashMessage(messageId: string): Promise<{ success: boolean; error?: string }> {
  if (!messageId) return { success: true };

  const isDevMode = process.env.QSTASH_DEV === 'true' || process.env.QSTASH_DEV === '1';
  const isMock = !isDevMode && (process.env.QSTASH_MOCK === 'true' || !process.env.QSTASH_TOKEN);
  if (isMock || messageId.startsWith('mock_msg_')) {
    console.log(`[QStash Mock] Cancelado mensaje ${messageId}`);
    return { success: true };
  }

  const defaultUrl = isDevMode ? 'http://127.0.0.1:8080/v2' : 'https://qstash.upstash.io/v2';
  const qstashUrl = process.env.QSTASH_URL || defaultUrl;
  const token = process.env.QSTASH_TOKEN || (isDevMode ? 'local_dev_token' : '');

  try {
    const res = await fetch(`${qstashUrl}/messages/${messageId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // 200/202 OK, o 404 si el mensaje ya expiró o fue ejecutado
    if (res.ok || res.status === 404) {
      return { success: true };
    }
    const errText = await res.text();
    return { success: false, error: `Error cancelando QStash (${res.status}): ${errText}` };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Fallo de red cancelando QStash' };
  }
}

/**
 * Programa los 2 avisos individuales de rendimiento para una sesión de entrenamiento o partido:
 * 1. Hooper: start_time - 180 min
 * 2. RPE: start_time + 90 min
 * 
 * Cancela automáticamente cualquier aviso anterior si la sesión ya tenía avisos programados.
 */
export async function scheduleSessionQStashReminders(
  session: {
    id: string;
    date: string;
    startTime: string;
    clubId?: string;
    teamId?: string;
    title?: string;
  },
  customClient?: any
): Promise<{
  success: boolean;
  wellnessMessageId?: string;
  feedbackMessageId?: string;
  schedule?: QStashSessionSchedule;
  error?: string;
}> {
  const supabase = customClient || (await (await import('@/lib/supabase/admin')).createAdminClient());

  // 1. Resolver club_id si no viene provisto
  let clubId = session.clubId;
  if (!clubId && session.teamId) {
    const { data: team } = await supabase.from('teams').select('club_id').eq('id', session.teamId).maybeSingle();
    clubId = team?.club_id;
  }
  if (!clubId) {
    const { data: ev } = await supabase
      .from('team_events')
      .select('team_id, teams(club_id)')
      .eq('id', session.id)
      .maybeSingle();
    clubId = (ev?.teams as any)?.club_id;
  }
  if (!clubId) {
    return { success: false, error: 'No se pudo determinar el club de la sesión para programar avisos.' };
  }

  // 2. Calcular los momentos exactos de ejecución y relevos
  const calcResult = calculateQStashSchedule(session.date, session.startTime);
  if (!calcResult.success || !calcResult.schedule) {
    return { success: false, error: calcResult.reason || 'No se pudieron calcular los horarios de QStash.' };
  }

  const { wellness, feedback } = calcResult.schedule;

  // 3. Cancelar avisos previos si existían para esta sesión
  const registry = await getStoredQStashRegistry(clubId, supabase);
  const existing = registry[session.id];
  if (existing) {
    if (existing.wellnessMessageId) await cancelQStashMessage(existing.wellnessMessageId);
    if (existing.feedbackMessageId) await cancelQStashMessage(existing.feedbackMessageId);
  }

  // 4. URL de destino del webhook (únicamente enviará { eventId, type })
  const isDevMode = process.env.QSTASH_DEV === 'true' || process.env.QSTASH_DEV === '1';
  const defaultWebhook = isDevMode
    ? 'http://localhost:3000/api/events/send-reminders'
    : `${process.env.NEXT_PUBLIC_SITE_URL || 'https://app-gestiondeclubes.vercel.app'}/api/events/send-reminders`;
  const webhookBase = process.env.QSTASH_WEBHOOK_URL || defaultWebhook;

  // 5. Programar Hooper (-180 min)
  const wellnessRes = await publishToQStash({
    destinationUrl: webhookBase,
    payload: {
      eventId: session.id,
      type: 'WELLNESS_REMINDER',
      relay: wellness.isRelay,
    },
    notBeforeEpochSeconds: wellness.scheduledEpochSeconds,
  });

  // 6. Programar RPE (+90 min)
  const feedbackRes = await publishToQStash({
    destinationUrl: webhookBase,
    payload: {
      eventId: session.id,
      type: 'SESSION_FEEDBACK_REMINDER',
      relay: feedback.isRelay,
    },
    notBeforeEpochSeconds: feedback.scheduledEpochSeconds,
  });

  // 7. Guardar en registro persistente para permitir cancelaciones y reprogramaciones posteriores
  registry[session.id] = {
    wellnessMessageId: wellnessRes.messageId,
    feedbackMessageId: feedbackRes.messageId,
    wellnessScheduledEpoch: wellness.scheduledEpochSeconds,
    feedbackScheduledEpoch: feedback.scheduledEpochSeconds,
    sessionDate: session.date,
    sessionStartTime: session.startTime,
    updatedAt: new Date().toISOString(),
  };

  await saveStoredQStashRegistry(clubId, registry, supabase);

  return {
    success: true,
    wellnessMessageId: wellnessRes.messageId,
    feedbackMessageId: feedbackRes.messageId,
    schedule: calcResult.schedule,
  };
}

/**
 * Cancela de forma inmediata todos los avisos pendientes en QStash para una sesión
 * (llamado cuando un entrenador o coordinador elimina o cancela un entrenamiento/partido).
 */
export async function cancelSessionQStashReminders(
  eventId: string,
  clubId?: string,
  customClient?: any
): Promise<{ success: boolean; error?: string }> {
  if (!eventId) return { success: true };

  const supabase = customClient || (await (await import('@/lib/supabase/admin')).createAdminClient());

  let targetClubId = clubId;
  if (!targetClubId) {
    const { data: ev } = await supabase
      .from('team_events')
      .select('team_id, teams(club_id)')
      .eq('id', eventId)
      .maybeSingle();
    targetClubId = (ev?.teams as any)?.club_id;
  }

  if (!targetClubId) {
    // Si la sesión ya fue borrada físicamente, intentar buscar en todos los registros
    return { success: true };
  }

  const registry = await getStoredQStashRegistry(targetClubId, supabase);
  const entry = registry[eventId];
  if (entry) {
    if (entry.wellnessMessageId) await cancelQStashMessage(entry.wellnessMessageId);
    if (entry.feedbackMessageId) await cancelQStashMessage(entry.feedbackMessageId);

    delete registry[eventId];
    await saveStoredQStashRegistry(targetClubId, registry, supabase);
  }

  return { success: true };
}

/**
 * Maneja el evento de relevo (relay) de QStash:
 * Cuando un mensaje programado a 6 días despierta, verifica si la sesión sigue activa.
 * Si sigue activa, programa el siguiente salto o el aviso definitivo.
 * Si fue cancelada o borrada, se descarta silenciosamente.
 */
export async function handleQStashRelay(
  eventId: string,
  type: 'WELLNESS_REMINDER' | 'SESSION_FEEDBACK_REMINDER' | null,
  customClient?: any
): Promise<{ success: boolean; action: 'rescheduled' | 'discarded'; details?: any }> {
  const supabase = customClient || (await (await import('@/lib/supabase/admin')).createAdminClient());

  // 1. Consultar si la sesión sigue existiendo y no fue borrada
  const { data: session } = await supabase
    .from('team_events')
    .select('id, date, start_time, team_id, title, teams(club_id)')
    .eq('id', eventId)
    .maybeSingle();

  if (!session || !session.start_time) {
    return {
      success: true,
      action: 'discarded',
      details: 'Sesión no encontrada o cancelada previamente.',
    };
  }

  const clubId = (session.teams as any)?.club_id;

  // 2. Reprogramar la sesión (calculará el siguiente relevo o el disparo final según falten <= 7 días)
  const res = await scheduleSessionQStashReminders(
    {
      id: session.id,
      date: session.date,
      startTime: session.start_time,
      clubId,
      teamId: session.team_id,
      title: session.title,
    },
    supabase
  );

  return {
    success: res.success,
    action: 'rescheduled',
    details: res.schedule,
  };
}
