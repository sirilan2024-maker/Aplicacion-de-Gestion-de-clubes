import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail, getGeneralAlertEmailHtml } from '@/lib/email-service';
import { sendWebPushNotification, isVapidConfigured } from './web-push-service';
import { resolveEffectiveChannels, ResolvedChannelsResult } from './policy-resolver';
import {
  DispatchNotificationParams,
  DispatchBatchParams,
  DispatchResult,
  BatchDispatchResult,
  NotificationChannel,
  NotificationDeliveryStatus,
} from './types';

// Tipos de notificación estrictamente transaccionales que no deben ser desactivadas por preferencias generales
const CRITICAL_TRANSACTIONAL_TYPES: string[] = [
  'REGISTRATION_CONFIRMED',
  'FEE_ALERT',
];

export class NotificationService {
  /**
   * Despacha una notificación individual a través de los canales especificados
   * garantizando idempotencia independiente por canal y respetando:
   * 1. Políticas globales del Club (club_notification_policies).
   * 2. Excepciones / preferencias del usuario (user_notification_preferences).
   */
  static async dispatch(
    params: DispatchNotificationParams & {
      cachedClubPolicy?: any;
    }
  ): Promise<DispatchResult> {
    const {
      userId,
      userEmail,
      clubId,
      type,
      title,
      content,
      link,
      channels,
      idempotencyKey,
      metadata = {},
      emailSubject,
      emailHtml,
      cachedClubPolicy,
    } = params;

    const results: DispatchResult['channels'] = [];
    const isCritical = CRITICAL_TRANSACTIONAL_TYPES.includes(type);

    try {
      const adminClient = await createAdminClient();

      // 1. Resolver clubId efectivo
      let targetClubId = clubId;
      if (!targetClubId && userId) {
        try {
          const { data: prof } = await adminClient
            .from('profiles')
            .select('club_id')
            .eq('id', userId)
            .maybeSingle();
          targetClubId = prof?.club_id || null;
        } catch (profErr) {
          console.warn(`[NotificationService] Error buscando club_id para ${userId}:`, profErr);
        }
      }

      // 2. Consultar política global del Club para este tipo de notificación
      let clubPolicy = cachedClubPolicy;
      if (clubPolicy === undefined && targetClubId) {
        try {
          const { data: cp } = await adminClient
            .from('club_notification_policies')
            .select('in_app_enabled, email_enabled, push_enabled')
            .eq('club_id', targetClubId)
            .eq('notification_type', type)
            .maybeSingle();
          clubPolicy = cp || null;
        } catch (cpErr) {
          console.warn(`[NotificationService] Error consultando club_notification_policies para club ${targetClubId}:`, cpErr);
          clubPolicy = null;
        }
      }

      // 3. Consultar preferencias individuales / excepciones del usuario
      let userPreference = null;
      if (userId) {
        try {
          const { data: up } = await adminClient
            .from('user_notification_preferences')
            .select('in_app_enabled, email_enabled, push_enabled')
            .eq('user_id', userId)
            .eq('notification_type', type)
            .maybeSingle();
          userPreference = up || null;
        } catch (upErr) {
          console.warn(`[NotificationService] Error consultando user_notification_preferences para ${userId}:`, upErr);
          userPreference = null;
        }
      }

      // 4. Calcular canales efectivos (Club Policy ∩ User Preference)
      const resolution = resolveEffectiveChannels({
        type,
        isCritical,
        clubPolicy,
        userPreference,
      });

      // 5. Procesar Canal IN_APP
      if (channels.includes('IN_APP')) {
        const inAppKey = `${idempotencyKey}:IN_APP`;
        const inAppResult = await this.handleInAppChannel({
          adminClient,
          userId,
          clubId: targetClubId,
          type,
          title,
          content,
          link,
          inAppKey,
          inAppEnabled: resolution.inApp,
          skipReason: resolution.skipReasons.inApp,
        });
        results.push(inAppResult);
      }

      // 6. Procesar Canal EMAIL
      if (channels.includes('EMAIL')) {
        const emailKey = `${idempotencyKey}:EMAIL`;
        const emailResult = await this.handleEmailChannel({
          adminClient,
          userId,
          userEmail,
          type,
          title,
          content,
          link,
          emailKey,
          emailEnabled: resolution.email,
          skipReason: resolution.skipReasons.email,
          emailSubject,
          emailHtml,
        });
        results.push(emailResult);
      }

      // 7. Procesar Canal PUSH (Web Push multi-dispositivo)
      if (channels.includes('PUSH')) {
        const pushKey = `${idempotencyKey}:PUSH`;
        const pushResult = await this.handlePushChannel({
          adminClient,
          userId,
          type,
          title,
          content,
          link,
          pushKey,
          pushEnabled: resolution.push,
          skipReason: resolution.skipReasons.push,
        });
        results.push(pushResult);
      }
    } catch (err: any) {
      console.error(`[NotificationService.dispatch Exception]:`, err);
    }

    return {
      userId,
      idempotencyKey,
      channels: results,
    };
  }

  /**
   * Manejador del canal In-App con persistencia en public.notifications y public.notification_deliveries
   */
  private static async handleInAppChannel(args: {
    adminClient: any;
    userId: string;
    clubId?: string | null;
    type: string;
    title: string;
    content: string;
    link?: string | null;
    inAppKey: string;
    inAppEnabled: boolean;
    skipReason?: string;
  }): Promise<{ channel: NotificationChannel; status: NotificationDeliveryStatus; error?: string }> {
    const { adminClient, userId, clubId, type, title, content, link, inAppKey, inAppEnabled, skipReason } = args;

    try {
      // Verificar idempotencia previa
      const { data: existingDelivery } = await adminClient
        .from('notification_deliveries')
        .select('id, status')
        .eq('idempotency_key', inAppKey)
        .maybeSingle();

      if (existingDelivery && existingDelivery.status === 'SENT') {
        return { channel: 'IN_APP', status: 'SENT' };
      }

      if (!inAppEnabled) {
        const reason = skipReason || 'Desactivado por política o preferencias';
        await adminClient.from('notification_deliveries').upsert({
          user_id: userId,
          idempotency_key: inAppKey,
          channel: 'IN_APP',
          status: 'SKIPPED',
          last_error: reason,
        }, { onConflict: 'idempotency_key' });

        return { channel: 'IN_APP', status: 'SKIPPED' };
      }

      // Resolver clubId si no fue provisto explícitamente
      let targetClubId = clubId;
      if (!targetClubId && userId) {
        const { data: prof } = await adminClient
          .from('profiles')
          .select('club_id')
          .eq('id', userId)
          .maybeSingle();
        targetClubId = prof?.club_id;
      }
      if (!targetClubId) {
        const { data: defaultClub } = await adminClient
          .from('clubs')
          .select('id')
          .limit(1)
          .maybeSingle();
        targetClubId = defaultClub?.id;
      }

      // Insertar notificación in-app utilizando únicamente las columnas estándar verificadas
      const notifPayload: any = {
        user_id: userId,
        profile_id: userId,
        club_id: targetClubId || null,
        type: type.toLowerCase(),
        title,
        content,
        is_read: false,
      };

      let { data: createdNotif, error: notifErr } = await adminClient
        .from('notifications')
        .insert(notifPayload)
        .select('id')
        .single();

      // Fallback controlado ante error de columnas
      if (notifErr && (notifErr.code === 'PGRST204' || notifErr.message?.includes('column'))) {
        const minimalPayload: any = {
          user_id: userId,
          type: type.toLowerCase(),
          title,
          content,
          is_read: false,
        };
        const retryRes = await adminClient.from('notifications').insert(minimalPayload).select('id').single();
        createdNotif = retryRes.data;
        notifErr = retryRes.error;
      }

      if (notifErr) {
        console.error('[NotificationService IN_APP Insert Error]:', notifErr);
        try {
          await adminClient.from('notification_deliveries').upsert({
            user_id: userId,
            idempotency_key: inAppKey,
            channel: 'IN_APP',
            status: 'FAILED',
            last_error: notifErr.message,
          }, { onConflict: 'idempotency_key' });
        } catch {
          // ignore delivery logging error if table pending migration
        }

        return { channel: 'IN_APP', status: 'FAILED', error: notifErr.message };
      }

      // Registrar entrega exitosa
      try {
        await adminClient.from('notification_deliveries').upsert({
          notification_id: createdNotif?.id,
          user_id: userId,
          idempotency_key: inAppKey,
          channel: 'IN_APP',
          status: 'SENT',
          sent_at: new Date().toISOString(),
        }, { onConflict: 'idempotency_key' });
      } catch {
        // ignore delivery logging error if table pending migration
      }

      return { channel: 'IN_APP', status: 'SENT' };
    } catch (err: any) {
      console.error('[NotificationService handleInAppChannel Error]:', err);
      return { channel: 'IN_APP', status: 'FAILED', error: err.message };
    }
  }

  /**
   * Manejador del canal Email con integración a email-service.ts e idempotencia
   */
  private static async handleEmailChannel(args: {
    adminClient: any;
    userId: string;
    userEmail?: string | null;
    type: string;
    title: string;
    content: string;
    link?: string | null;
    emailKey: string;
    emailEnabled: boolean;
    skipReason?: string;
    emailSubject?: string;
    emailHtml?: string;
  }): Promise<{ channel: NotificationChannel; status: NotificationDeliveryStatus; error?: string; messageId?: string }> {
    const { adminClient, userId, type, title, content, link, emailKey, emailEnabled, skipReason, emailSubject, emailHtml } = args;
    let targetEmail = args.userEmail;

    try {
      // Verificar idempotencia previa
      const { data: existingDelivery } = await adminClient
        .from('notification_deliveries')
        .select('id, status, attempts')
        .eq('idempotency_key', emailKey)
        .maybeSingle();

      if (existingDelivery && existingDelivery.status === 'SENT') {
        return { channel: 'EMAIL', status: 'SENT' };
      }

      if (!emailEnabled) {
        const reason = skipReason || 'Desactivado por política o preferencias';
        await adminClient.from('notification_deliveries').upsert({
          user_id: userId,
          idempotency_key: emailKey,
          channel: 'EMAIL',
          status: 'SKIPPED',
          last_error: reason,
        }, { onConflict: 'idempotency_key' });

        return { channel: 'EMAIL', status: 'SKIPPED' };
      }

      // Si no se proporcionó el email, buscarlo en profiles
      if (!targetEmail && userId) {
        const { data: profile } = await adminClient
          .from('profiles')
          .select('email')
          .eq('id', userId)
          .maybeSingle();
        targetEmail = profile?.email;
      }

      if (!targetEmail) {
        await adminClient.from('notification_deliveries').upsert({
          user_id: userId,
          idempotency_key: emailKey,
          channel: 'EMAIL',
          status: 'SKIPPED',
          last_error: 'No se encontró dirección de correo para este usuario',
        }, { onConflict: 'idempotency_key' });

        return { channel: 'EMAIL', status: 'SKIPPED', error: 'No email found for user' };
      }

      const finalSubject = emailSubject || `📢 Sporting Saladar: ${title}`;
      const finalHtml = emailHtml || getGeneralAlertEmailHtml({
        title,
        content,
        viewUrl: link || undefined,
      });

      // Intentar envío
      const emailRes = await sendEmail({
        to: targetEmail,
        subject: finalSubject,
        html: finalHtml,
      });

      if (emailRes.success) {
        await adminClient.from('notification_deliveries').upsert({
          user_id: userId,
          idempotency_key: emailKey,
          channel: 'EMAIL',
          status: 'SENT',
          provider: emailRes.provider || 'smtp',
          provider_message_id: emailRes.messageId || (emailRes.data as any)?.id || null,
          sent_at: new Date().toISOString(),
          attempts: (existingDelivery?.attempts || 0) + 1,
        }, { onConflict: 'idempotency_key' });

        return {
          channel: 'EMAIL',
          status: 'SENT',
          messageId: emailRes.messageId || (emailRes.data as any)?.id,
        };
      } else {
        const errMsg = emailRes.error || 'Error desconocido al enviar email';
        console.warn(`[NotificationService EMAIL Warning]: ${errMsg}`);

        await adminClient.from('notification_deliveries').upsert({
          user_id: userId,
          idempotency_key: emailKey,
          channel: 'EMAIL',
          status: 'FAILED',
          last_error: errMsg,
          attempts: (existingDelivery?.attempts || 0) + 1,
        }, { onConflict: 'idempotency_key' });

        return { channel: 'EMAIL', status: 'FAILED', error: errMsg };
      }
    } catch (err: any) {
      console.error('[NotificationService handleEmailChannel Exception]:', err);
      return { channel: 'EMAIL', status: 'FAILED', error: err.message };
    }
  }

  /**
   * Manejador del canal Web Push con soporte multi-dispositivo, limpieza de endpoints 404/410 e idempotencia
   */
  private static async handlePushChannel(args: {
    adminClient: any;
    userId: string;
    type: string;
    title: string;
    content: string;
    link?: string | null;
    pushKey: string;
    pushEnabled: boolean;
    skipReason?: string;
  }): Promise<{ channel: NotificationChannel; status: NotificationDeliveryStatus; error?: string; messageId?: string }> {
    const { adminClient, userId, type, title, content, link, pushKey, pushEnabled, skipReason } = args;

    try {
      // 1. Verificar idempotencia previa
      const { data: existingDelivery } = await adminClient
        .from('notification_deliveries')
        .select('id, status, attempts')
        .eq('idempotency_key', pushKey)
        .maybeSingle();

      if (existingDelivery && existingDelivery.status === 'SENT') {
        return { channel: 'PUSH', status: 'SENT' };
      }

      // 2. Verificar si está habilitado por política / preferencias
      if (!pushEnabled) {
        const reason = skipReason || 'Desactivado por política o preferencias';
        await adminClient.from('notification_deliveries').upsert({
          user_id: userId,
          idempotency_key: pushKey,
          channel: 'PUSH',
          status: 'SKIPPED',
          last_error: reason,
        }, { onConflict: 'idempotency_key' });

        return { channel: 'PUSH', status: 'SKIPPED' };
      }

      // 3. Verificar si VAPID está configurado en el servidor
      if (!isVapidConfigured()) {
        await adminClient.from('notification_deliveries').upsert({
          user_id: userId,
          idempotency_key: pushKey,
          channel: 'PUSH',
          status: 'SKIPPED',
          last_error: 'VAPID credentials not configured on server',
        }, { onConflict: 'idempotency_key' });

        return {
          channel: 'PUSH',
          status: 'SKIPPED',
          error: 'VAPID credentials not configured on server',
        };
      }

      // 4. Consultar todas las suscripciones activas del usuario (1 usuario -> N dispositivos)
      const { data: subscriptions, error: subError } = await adminClient
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('user_id', userId);

      if (subError) {
        console.error('[NotificationService handlePushChannel subError]:', subError);
      }

      if (!subscriptions || subscriptions.length === 0) {
        await adminClient.from('notification_deliveries').upsert({
          user_id: userId,
          idempotency_key: pushKey,
          channel: 'PUSH',
          status: 'SKIPPED',
          last_error: 'No active push subscriptions for user',
        }, { onConflict: 'idempotency_key' });

        return {
          channel: 'PUSH',
          status: 'SKIPPED',
          error: 'No active push subscriptions for user',
        };
      }

      // 5. Construir payload estructurado seguro
      const pushPayload = {
        title,
        body: content,
        icon: '/icons/icon-192x192.svg',
        badge: '/icons/icon-192x192.svg',
        tag: `saladar-${type.toLowerCase()}`,
        data: {
          link: link || '/dashboard',
          type,
          userId,
        },
      };

      // 6. Despachar a todos los dispositivos en paralelo con captura granular de errores
      let successCount = 0;
      let failCount = 0;
      const invalidEndpointIds: string[] = [];
      let lastErrorMessage = '';

      await Promise.allSettled(
        subscriptions.map(async (sub: any) => {
          try {
            await sendWebPushNotification({
              subscription: {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh,
                  auth: sub.auth,
                },
              },
              payload: pushPayload,
            });
            successCount++;
          } catch (err: any) {
            failCount++;
            lastErrorMessage = err.message || 'Error enviando Web Push';
            const statusCode = err.statusCode || err.status;
            // Endpoints expirados o no encontrados (404 / 410) deben purgarse
            if (statusCode === 404 || statusCode === 410) {
              invalidEndpointIds.push(sub.id);
            }
          }
        })
      );

      // 7. Limpieza de suscripciones obsoletas (404 / 410)
      if (invalidEndpointIds.length > 0) {
        try {
          await adminClient
            .from('push_subscriptions')
            .delete()
            .in('id', invalidEndpointIds)
            .eq('user_id', userId);
        } catch (cleanupErr) {
          console.warn('[NotificationService] Error limpiando suscripciones expiradas:', cleanupErr);
        }
      }

      // 8. Registrar resultado de entrega e idempotencia
      if (successCount > 0) {
        await adminClient.from('notification_deliveries').upsert({
          user_id: userId,
          idempotency_key: pushKey,
          channel: 'PUSH',
          status: 'SENT',
          provider: 'web-push',
          sent_at: new Date().toISOString(),
          attempts: (existingDelivery?.attempts || 0) + 1,
        }, { onConflict: 'idempotency_key' });

        return { channel: 'PUSH', status: 'SENT' };
      } else {
        const finalError = lastErrorMessage || 'Todos los endpoints de Push fallaron';
        await adminClient.from('notification_deliveries').upsert({
          user_id: userId,
          idempotency_key: pushKey,
          channel: 'PUSH',
          status: 'FAILED',
          provider: 'web-push',
          last_error: finalError,
          attempts: (existingDelivery?.attempts || 0) + 1,
        }, { onConflict: 'idempotency_key' });

        return { channel: 'PUSH', status: 'FAILED', error: finalError };
      }
    } catch (err: any) {
      console.error('[NotificationService handlePushChannel Exception]:', err);
      return { channel: 'PUSH', status: 'FAILED', error: err.message };
    }
  }

  /**
   * Despacha un lote de notificaciones optimizando consultas de políticas de club en memoria
   */
  static async dispatchBatch(params: DispatchBatchParams): Promise<BatchDispatchResult> {
    const { notifications } = params;
    const results: DispatchResult[] = [];

    let successful = 0;
    let failed = 0;
    let skipped = 0;

    // Cache local durante la ejecución del batch: `${clubId}:${type}` -> policy
    const clubPolicyCache = new Map<string, any>();
    const adminClient = await createAdminClient();

    for (const notif of notifications) {
      let cachedPolicy: any = undefined;

      if (notif.clubId && notif.type) {
        const cacheKey = `${notif.clubId}:${notif.type}`;
        if (clubPolicyCache.has(cacheKey)) {
          cachedPolicy = clubPolicyCache.get(cacheKey);
        } else {
          try {
            const { data: cp } = await adminClient
              .from('club_notification_policies')
              .select('in_app_enabled, email_enabled, push_enabled')
              .eq('club_id', notif.clubId)
              .eq('notification_type', notif.type)
              .maybeSingle();
            cachedPolicy = cp || null;
            clubPolicyCache.set(cacheKey, cachedPolicy);
          } catch (cpErr) {
            console.warn(`[NotificationService.dispatchBatch] Error en cache de política para ${cacheKey}:`, cpErr);
            cachedPolicy = null;
          }
        }
      }

      const res = await this.dispatch({
        ...notif,
        cachedClubPolicy: cachedPolicy,
      });
      results.push(res);

      for (const ch of res.channels) {
        if (ch.status === 'SENT') successful++;
        else if (ch.status === 'FAILED') failed++;
        else if (ch.status === 'SKIPPED') skipped++;
      }
    }

    return {
      total: notifications.length,
      successful,
      failed,
      skipped,
      results,
    };
  }
}
