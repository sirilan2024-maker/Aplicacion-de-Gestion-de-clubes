'use server'

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NOTIFICATION_TYPE_REGISTRY } from '@/lib/notifications/registry';

export interface UserPreferenceItem {
  notificationType: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  canView: boolean;
  canModify: boolean;
  clubInApp: boolean;
  clubEmail: boolean;
  clubPush: boolean;
  effectiveInApp: boolean;
  effectiveEmail: boolean;
  effectivePush: boolean;
}

export async function getUserPreferencesAction(): Promise<{
  success: boolean;
  data?: Record<string, UserPreferenceItem>;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('club_id')
      .eq('id', user.id)
      .single();

    const clubId = profile?.club_id || null;
    const adminClient = await createAdminClient();

    // 1. Obtener políticas del club
    let clubPoliciesMap: Record<string, any> = {};
    if (clubId) {
      try {
        const { data: cpRows } = await adminClient
          .from('club_notification_policies')
          .select('*')
          .eq('club_id', clubId);

        cpRows?.forEach((r: any) => {
          if (r.notification_type) {
            clubPoliciesMap[r.notification_type] = {
              inApp: r.in_app_enabled ?? true,
              email: r.email_enabled ?? true,
              push: r.push_enabled ?? true,
            };
          }
        });
      } catch (cpErr) {
        console.warn('[getUserPreferencesAction] Error cargando club_notification_policies:', cpErr);
      }
    }

    // 2. Obtener preferencias individuales del usuario
    const { data: userRows, error } = await adminClient
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', user.id);

    if (error && !error.message?.includes('schema cache') && !error.message?.includes('does not exist')) {
      throw error;
    }

    const userMap = new Map<string, any>();
    userRows?.forEach((r: any) => {
      if (r.notification_type) {
        userMap.set(r.notification_type, r);
      }
    });

    const result: Record<string, UserPreferenceItem> = {};

    // 3. Procesar tipos canónicos
    NOTIFICATION_TYPE_REGISTRY.forEach(item => {
      const userRow = userMap.get(item.type);
      const canView = userRow?.can_view !== undefined ? Boolean(userRow.can_view) : true;
      const canModify = userRow?.can_modify !== undefined ? Boolean(userRow.can_modify) : false;

      // Si el Admin ha configurado can_view = false, se omite completamente para este usuario
      if (!canView) return;

      const clubPol = clubPoliciesMap[item.type] || {
        inApp: item.defaultInApp,
        email: item.defaultEmail,
        push: item.defaultPush,
      };

      const inApp = userRow?.in_app_enabled !== undefined ? Boolean(userRow.in_app_enabled) : clubPol.inApp;
      const email = userRow?.email_enabled !== undefined ? Boolean(userRow.email_enabled) : clubPol.email;
      const push = userRow?.push_enabled !== undefined ? Boolean(userRow.push_enabled) : clubPol.push;

      const isCritical = Boolean(item.isCritical);
      const effectiveInApp = isCritical ? true : (clubPol.inApp && inApp);
      const effectiveEmail = isCritical ? true : (clubPol.email && email);
      const effectivePush = clubPol.push && push;

      result[item.type] = {
        notificationType: item.type,
        inAppEnabled: inApp,
        emailEnabled: email,
        pushEnabled: push,
        canView,
        canModify,
        clubInApp: clubPol.inApp,
        clubEmail: clubPol.email,
        clubPush: clubPol.push,
        effectiveInApp,
        effectiveEmail,
        effectivePush,
      };
    });

    return { success: true, data: result };
  } catch (err: any) {
    console.error('[getUserPreferencesAction Error]:', err);
    return { success: false, error: err.message };
  }
}

export async function updateUserPreferenceAction(params: {
  notificationType: string;
  inAppEnabled?: boolean;
  emailEnabled?: boolean;
  pushEnabled?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('club_id')
      .eq('id', user.id)
      .single();
    const clubId = profile?.club_id || null;

    const adminClient = await createAdminClient();

    // 1. Verificar si la notificación es crítica (inmune a modificaciones por el usuario)
    const regItem = NOTIFICATION_TYPE_REGISTRY.find(r => r.type === params.notificationType);
    if (regItem?.isCritical) {
      return { success: false, error: 'Esta notificación es crítica del sistema y no puede ser modificada' };
    }

    // 2. Verificar permisos de modificación (can_modify)
    const { data: existing } = await adminClient
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .eq('notification_type', params.notificationType)
      .maybeSingle();

    const canModify = existing?.can_modify !== undefined ? Boolean(existing.can_modify) : false;
    if (!canModify) {
      return { success: false, error: 'Acceso denegado: No tienes permiso del administrador para modificar esta preferencia' };
    }

    // 3. Validar precedencia: El usuario no puede activar un canal que el Club tenga en OFF
    if (clubId) {
      const { data: clubPolicy } = await adminClient
        .from('club_notification_policies')
        .select('*')
        .eq('club_id', clubId)
        .eq('notification_type', params.notificationType)
        .maybeSingle();

      const clubInApp = clubPolicy?.in_app_enabled ?? regItem?.defaultInApp ?? true;
      const clubEmail = clubPolicy?.email_enabled ?? regItem?.defaultEmail ?? true;
      const clubPush = clubPolicy?.push_enabled ?? regItem?.defaultPush ?? true;

      if (params.inAppEnabled === true && !clubInApp) {
        return { success: false, error: 'El canal App está desactivado por la política global del club' };
      }
      if (params.emailEnabled === true && !clubEmail) {
        return { success: false, error: 'El canal Email está desactivado por la política global del club' };
      }
      if (params.pushEnabled === true && !clubPush) {
        return { success: false, error: 'El canal Push está desactivado por la política global del club' };
      }
    }

    const payload: any = {
      user_id: user.id,
      club_id: clubId,
      notification_type: params.notificationType,
      in_app_enabled: params.inAppEnabled !== undefined ? params.inAppEnabled : (existing?.in_app_enabled ?? true),
      email_enabled: params.emailEnabled !== undefined ? params.emailEnabled : (existing?.email_enabled ?? true),
      push_enabled: params.pushEnabled !== undefined ? params.pushEnabled : (existing?.push_enabled ?? true),
      can_view: existing?.can_view !== undefined ? existing.can_view : true,
      can_modify: existing?.can_modify !== undefined ? existing.can_modify : false,
      is_custom_override: existing?.is_custom_override !== undefined ? existing.is_custom_override : false,
      updated_by: existing?.updated_by !== undefined ? existing.updated_by : null,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await adminClient
      .from('user_notification_preferences')
      .upsert(payload, { onConflict: 'user_id,club_id,notification_type' });

    if (upsertErr) {
      if (upsertErr.message?.includes('column "can_view"') || upsertErr.message?.includes('column "can_modify"')) {
        const { error: fallbackErr } = await adminClient
          .from('user_notification_preferences')
          .upsert({
            user_id: user.id,
            club_id: clubId,
            notification_type: params.notificationType,
            in_app_enabled: payload.in_app_enabled,
            email_enabled: payload.email_enabled,
            push_enabled: payload.push_enabled,
            updated_at: payload.updated_at,
          }, { onConflict: 'user_id,club_id,notification_type' });
        if (fallbackErr) throw fallbackErr;
      } else {
        throw upsertErr;
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('[updateUserPreferenceAction Error]:', err);
    return { success: false, error: err.message };
  }
}

