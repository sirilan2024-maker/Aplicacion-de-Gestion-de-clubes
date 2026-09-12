'use server'

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ClubNotificationPolicy, NotificationType } from '@/lib/notifications/types';
import { NOTIFICATION_TYPE_REGISTRY } from '@/lib/notifications/registry';
import type { NotificationPolicyMetadata } from '@/lib/notifications/registry';

export type { NotificationPolicyMetadata };


/**
 * Obtiene las políticas de notificación configuradas para el club del administrador actual.
 */
export async function getClubNotificationPoliciesAction(): Promise<{
  success: boolean;
  data?: Record<string, ClubNotificationPolicy>;
  clubId?: string;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, club_id')
      .eq('id', user.id)
      .single();

    if (!profile) return { success: false, error: 'Perfil no encontrado' };

    const isAuthorized = ['admin', 'superadmin'].includes(profile.role);
    if (!isAuthorized) {
      return { success: false, error: 'Acceso denegado: Se requieren permisos administrativos de Administrador' };
    }

    const clubId = profile.club_id;
    if (!clubId) {
      return { success: false, error: 'El usuario no está asignado a un club' };
    }

    const adminClient = await createAdminClient();
    const { data: rows, error } = await adminClient
      .from('club_notification_policies')
      .select('*')
      .eq('club_id', clubId);

    const isMissingTable = error && (
      error.code === 'PGRST205' ||
      error.code === '42P01' ||
      error.message?.includes('schema cache') ||
      error.message?.includes('does not exist')
    );

    if (error && !isMissingTable) throw error;
    if (isMissingTable) {
      console.warn('[getClubNotificationPoliciesAction] Tabla club_notification_policies no encontrada en Supabase. Usando defaults canónicos.');
    }

    const policiesMap: Record<string, ClubNotificationPolicy> = {};

    // 1. Inicializar con valores predeterminados del registro
    NOTIFICATION_TYPE_REGISTRY.forEach(item => {
      policiesMap[item.type] = {
        clubId: clubId,
        notificationType: item.type,
        inAppEnabled: item.defaultInApp,
        emailEnabled: item.defaultEmail,
        pushEnabled: item.defaultPush,
      };
    });

    // 2. Sobrescribir con lo almacenado en base de datos
    rows?.forEach((row: any) => {
      if (row.notification_type) {
        policiesMap[row.notification_type] = {
          id: row.id,
          clubId: row.club_id,
          notificationType: row.notification_type,
          inAppEnabled: row.in_app_enabled ?? true,
          emailEnabled: row.email_enabled ?? true,
          pushEnabled: row.push_enabled ?? true,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      }
    });

    return { success: true, data: policiesMap, clubId };
  } catch (err: any) {
    console.error('[getClubNotificationPoliciesAction Error]:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Actualiza la política de notificación de un tipo específico para el club.
 */
export async function updateClubNotificationPolicyAction(params: {
  notificationType: string;
  inAppEnabled?: boolean;
  emailEnabled?: boolean;
  pushEnabled?: boolean;
}): Promise<{ success: boolean; data?: ClubNotificationPolicy; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, club_id')
      .eq('id', user.id)
      .single();

    if (!profile) return { success: false, error: 'Perfil no encontrado' };

    const isAdmin = ['admin', 'superadmin'].includes(profile.role);
    if (!isAdmin) {
      return { success: false, error: 'Acceso denegado: Solo administradores pueden modificar políticas' };
    }

    const clubId = profile.club_id;
    if (!clubId) return { success: false, error: 'El usuario no está asignado a un club' };

    const adminClient = await createAdminClient();

    // Obtener configuración existente o valores por defecto
    const { data: existing } = await adminClient
      .from('club_notification_policies')
      .select('*')
      .eq('club_id', clubId)
      .eq('notification_type', params.notificationType)
      .maybeSingle();

    const regItem = NOTIFICATION_TYPE_REGISTRY.find(r => r.type === params.notificationType);

    const nextInApp = params.inAppEnabled !== undefined 
      ? params.inAppEnabled 
      : (existing?.in_app_enabled ?? regItem?.defaultInApp ?? true);

    const nextEmail = params.emailEnabled !== undefined 
      ? params.emailEnabled 
      : (existing?.email_enabled ?? regItem?.defaultEmail ?? true);

    const nextPush = params.pushEnabled !== undefined 
      ? params.pushEnabled 
      : (existing?.push_enabled ?? regItem?.defaultPush ?? true);

    const payload = {
      club_id: clubId,
      notification_type: params.notificationType,
      in_app_enabled: nextInApp,
      email_enabled: nextEmail,
      push_enabled: nextPush,
      updated_at: new Date().toISOString(),
    };

    let resultData: any;

    if (existing) {
      const { data, error } = await adminClient
        .from('club_notification_policies')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      resultData = data;
    } else {
      const { data, error } = await adminClient
        .from('club_notification_policies')
        .insert({
          ...payload,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      resultData = data;
    }

    return {
      success: true,
      data: {
        id: resultData.id,
        clubId: resultData.club_id,
        notificationType: resultData.notification_type,
        inAppEnabled: resultData.in_app_enabled,
        emailEnabled: resultData.email_enabled,
        pushEnabled: resultData.push_enabled,
        createdAt: resultData.created_at,
        updatedAt: resultData.updated_at,
      },
    };
  } catch (err: any) {
    console.error('[updateClubNotificationPolicyAction Error]:', err);
    const isMissingTable = err.code === 'PGRST205' || err.code === '42P01' || err.message?.includes('schema cache') || err.message?.includes('does not exist');
    const msg = isMissingTable
      ? "La tabla 'club_notification_policies' aún no ha sido creada en Supabase. Ejecuta la migración 00036_club_notification_policies.sql."
      : err.message;
    return { success: false, error: msg };
  }
}

/**
 * Guarda en lote todas las políticas modificadas por el administrador.
 */
export async function saveAllClubNotificationPoliciesAction(
  policies: Array<{
    notificationType: string;
    inAppEnabled: boolean;
    emailEnabled: boolean;
    pushEnabled: boolean;
  }>
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, club_id')
      .eq('id', user.id)
      .single();

    if (!profile) return { success: false, error: 'Perfil no encontrado' };

    const isAdmin = ['admin', 'superadmin'].includes(profile.role);
    if (!isAdmin) {
      return { success: false, error: 'Acceso denegado: Solo administradores pueden guardar políticas' };
    }

    const clubId = profile.club_id;
    if (!clubId) return { success: false, error: 'El usuario no tiene un club asignado' };

    const adminClient = await createAdminClient();
    const now = new Date().toISOString();

    const upsertRows = policies.map(p => ({
      club_id: clubId,
      notification_type: p.notificationType,
      in_app_enabled: p.inAppEnabled,
      email_enabled: p.emailEnabled,
      push_enabled: p.pushEnabled,
      updated_at: now,
    }));

    const { error } = await adminClient
      .from('club_notification_policies')
      .upsert(upsertRows, {
        onConflict: 'club_id,notification_type',
      });

    if (error) {
      if (
        error.code === 'PGRST205' ||
        error.code === '42P01' ||
        error.message?.includes('schema cache') ||
        error.message?.includes('does not exist')
      ) {
        return {
          success: false,
          error: "La tabla 'club_notification_policies' aún no ha sido creada en la base de datos de Supabase. Por favor ejecuta el script de migración 00036_club_notification_policies.sql en el SQL Editor de Supabase.",
        };
      }
      throw error;
    }

    return { success: true, count: policies.length };
  } catch (err: any) {
    console.error('[saveAllClubNotificationPoliciesAction Error]:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Obtiene la lista de usuarios del club para el control administrativo de notificaciones.
 */
export async function getClubUsersForNotificationControlAction(searchQuery?: string): Promise<{
  success: boolean;
  users?: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    avatarUrl?: string | null;
  }>;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, club_id')
      .eq('id', user.id)
      .single();

    if (!profile) return { success: false, error: 'Perfil no encontrado' };

    const isAdmin = ['admin', 'superadmin'].includes(profile.role);
    if (!isAdmin) {
      return { success: false, error: 'Acceso denegado: Solo administradores pueden gestionar usuarios' };
    }

    const clubId = profile.club_id;
    if (!clubId && profile.role !== 'superadmin') {
      return { success: false, error: 'El usuario no tiene un club asignado' };
    }

    const adminClient = await createAdminClient();
    let query = adminClient
      .from('profiles')
      .select('id, email, first_name, last_name, role, avatar_url, club_id')
      .order('first_name', { ascending: true });

    if (profile.role !== 'superadmin' && clubId) {
      query = query.or(`club_id.eq.${clubId},club_id.is.null`);
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim();
      query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`);
    }

    const { data: rows, error } = await query.limit(1000);
    if (error) throw error;

    const users = (rows || []).map((r: any) => ({
      id: r.id,
      email: r.email || '',
      firstName: r.first_name || '',
      lastName: r.last_name || '',
      role: r.role || 'usuario',
      avatarUrl: r.avatar_url,
    }));

    return { success: true, users };
  } catch (err: any) {
    console.error('[getClubUsersForNotificationControlAction Error]:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Obtiene las preferencias y permisos de un usuario específico comparados con las políticas globales del club.
 */
export async function getAdminUserPreferencesAction(targetUserId: string): Promise<{
  success: boolean;
  data?: {
    targetUser: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      clubId: string;
    };
    clubPolicies: Record<string, ClubNotificationPolicy>;
    userPreferences: Record<string, {
      notificationType: string;
      inAppEnabled: boolean;
      emailEnabled: boolean;
      pushEnabled: boolean;
      canView: boolean;
      canModify: boolean;
      isCustomOverride: boolean;
      effectiveInApp: boolean;
      effectiveEmail: boolean;
      effectivePush: boolean;
      updatedAt?: string;
    }>;
  };
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role, club_id')
      .eq('id', user.id)
      .single();

    if (!callerProfile) return { success: false, error: 'Perfil no encontrado' };

    const isAdmin = ['admin', 'superadmin'].includes(callerProfile.role);
    if (!isAdmin) {
      return { success: false, error: 'Acceso denegado: Solo administradores pueden consultar preferencias de usuarios' };
    }

    const adminClient = await createAdminClient();

    // 1. Obtener perfil del usuario objetivo y validar pertenencia al club (Multi-tenancy)
    const { data: targetProfile, error: targetErr } = await adminClient
      .from('profiles')
      .select('id, email, first_name, last_name, role, club_id')
      .eq('id', targetUserId)
      .single();

    if (targetErr || !targetProfile) {
      return { success: false, error: 'Usuario objetivo no encontrado' };
    }

    if (callerProfile.role !== 'superadmin' && targetProfile.club_id !== callerProfile.club_id) {
      return { success: false, error: 'Violación de seguridad: El usuario pertenece a otro club' };
    }

    const effectiveClubId = targetProfile.club_id || callerProfile.club_id;

    // 2. Obtener políticas del club
    const clubPoliciesRes = await getClubNotificationPoliciesAction();
    const clubPolicies = clubPoliciesRes.success && clubPoliciesRes.data ? clubPoliciesRes.data : {};

    // 3. Obtener preferencias individuales del usuario
    const { data: prefRows } = await adminClient
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', targetUserId);

    const userPrefsMap = new Map<string, any>();
    prefRows?.forEach((r: any) => {
      if (r.notification_type) {
        userPrefsMap.set(r.notification_type, r);
      }
    });

    const userPreferences: Record<string, any> = {};

    // 4. Construir mapa completo con resolución de políticas y permisos
    NOTIFICATION_TYPE_REGISTRY.forEach(item => {
      const clubPol = clubPolicies[item.type] || {
        inAppEnabled: item.defaultInApp,
        emailEnabled: item.defaultEmail,
        pushEnabled: item.defaultPush,
      };

      const userRow = userPrefsMap.get(item.type);
      const hasOverride = Boolean(userRow?.is_custom_override || (userRow && (userRow.in_app_enabled !== undefined || userRow.can_view !== undefined)));

      const inApp = userRow?.in_app_enabled !== undefined ? Boolean(userRow.in_app_enabled) : clubPol.inAppEnabled;
      const email = userRow?.email_enabled !== undefined ? Boolean(userRow.email_enabled) : clubPol.emailEnabled;
      const push = userRow?.push_enabled !== undefined ? Boolean(userRow.push_enabled) : clubPol.pushEnabled;

      // can_view: por defecto true si no está explícitamente desactivado
      const canView = userRow?.can_view !== undefined ? Boolean(userRow.can_view) : true;
      // can_modify: por defecto false (mínimo privilegio)
      const canModify = userRow?.can_modify !== undefined ? Boolean(userRow.can_modify) : false;

      // Cálculo de canales efectivos respetando la precedencia inquebrantable de Club OFF
      const isCritical = Boolean(item.isCritical);
      const effectiveInApp = isCritical ? true : (clubPol.inAppEnabled && inApp);
      const effectiveEmail = isCritical ? true : (clubPol.emailEnabled && email);
      const effectivePush = clubPol.pushEnabled && push;

      userPreferences[item.type] = {
        notificationType: item.type,
        inAppEnabled: inApp,
        emailEnabled: email,
        pushEnabled: push,
        canView,
        canModify,
        isCustomOverride: hasOverride,
        effectiveInApp,
        effectiveEmail,
        effectivePush,
        updatedAt: userRow?.updated_at,
      };
    });

    return {
      success: true,
      data: {
        targetUser: {
          id: targetProfile.id,
          email: targetProfile.email || '',
          firstName: targetProfile.first_name || '',
          lastName: targetProfile.last_name || '',
          role: targetProfile.role || 'usuario',
          clubId: effectiveClubId,
        },
        clubPolicies,
        userPreferences,
      },
    };
  } catch (err: any) {
    console.error('[getAdminUserPreferencesAction Error]:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Guarda los canales y permisos de un usuario específico configurados por el administrador.
 */
export async function adminSaveUserPreferencesAction(params: {
  targetUserId: string;
  preferences: Array<{
    notificationType: string;
    inAppEnabled: boolean;
    emailEnabled: boolean;
    pushEnabled: boolean;
    canView: boolean;
    canModify: boolean;
    isCustomOverride?: boolean;
  }>;
}): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role, club_id')
      .eq('id', user.id)
      .single();

    if (!callerProfile) return { success: false, error: 'Perfil no encontrado' };

    const isAdmin = ['admin', 'superadmin'].includes(callerProfile.role);
    if (!isAdmin) {
      return { success: false, error: 'Acceso denegado: Solo administradores pueden guardar preferencias de usuarios' };
    }

    const adminClient = await createAdminClient();

    // 1. Validar pertenencia multi-tenant
    const { data: targetProfile, error: targetErr } = await adminClient
      .from('profiles')
      .select('id, club_id')
      .eq('id', params.targetUserId)
      .single();

    if (targetErr || !targetProfile) {
      return { success: false, error: 'Usuario objetivo no encontrado' };
    }

    if (callerProfile.role !== 'superadmin' && targetProfile.club_id !== callerProfile.club_id) {
      return { success: false, error: 'Violación de seguridad: El usuario pertenece a otro club' };
    }

    const clubId = targetProfile.club_id || callerProfile.club_id;
    const now = new Date().toISOString();

    // 2. Normalizar permisos (si canModify es true y canView es false -> normalizar canView = true)
    const upsertRows = params.preferences.map(p => {
      const canView = p.canModify ? true : Boolean(p.canView);
      return {
        user_id: params.targetUserId,
        club_id: clubId,
        notification_type: p.notificationType,
        in_app_enabled: Boolean(p.inAppEnabled),
        email_enabled: Boolean(p.emailEnabled),
        push_enabled: Boolean(p.pushEnabled),
        can_view: canView,
        can_modify: Boolean(p.canModify),
        is_custom_override: p.isCustomOverride !== undefined ? p.isCustomOverride : true,
        updated_by: user.id,
        updated_at: now,
      };
    });

    const { error: upsertErr } = await adminClient
      .from('user_notification_preferences')
      .upsert(upsertRows, {
        onConflict: 'user_id,club_id,notification_type',
      });

    if (upsertErr) {
      console.error('[adminSaveUserPreferencesAction upsertErr]:', upsertErr);
      // Fallback si la migración de columnas can_view/can_modify aún no se ha corrido
      if (upsertErr.message?.includes('column "can_view"') || upsertErr.message?.includes('column "can_modify"')) {
        const fallbackRows = params.preferences.map(p => ({
          user_id: params.targetUserId,
          club_id: clubId,
          notification_type: p.notificationType,
          in_app_enabled: Boolean(p.inAppEnabled),
          email_enabled: Boolean(p.emailEnabled),
          push_enabled: Boolean(p.pushEnabled),
          updated_at: now,
        }));
        const { error: fallbackErr } = await adminClient
          .from('user_notification_preferences')
          .upsert(fallbackRows, {
            onConflict: 'user_id,club_id,notification_type',
          });
        if (fallbackErr) throw fallbackErr;
      } else {
        throw upsertErr;
      }
    }

    return { success: true, count: params.preferences.length };
  } catch (err: any) {
    console.error('[adminSaveUserPreferencesAction Error]:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Restablece las preferencias de un usuario para que herede las políticas del club (elimina overrides).
 */
export async function adminResetUserPreferencesAction(params: {
  targetUserId: string;
  notificationType?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role, club_id')
      .eq('id', user.id)
      .single();

    if (!callerProfile) return { success: false, error: 'Perfil no encontrado' };

    const isAdmin = ['admin', 'superadmin'].includes(callerProfile.role);
    if (!isAdmin) {
      return { success: false, error: 'Acceso denegado: Solo administradores pueden restablecer preferencias' };
    }

    const adminClient = await createAdminClient();

    // Validar pertenencia multi-tenant
    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('id, club_id')
      .eq('id', params.targetUserId)
      .single();

    if (!targetProfile) return { success: false, error: 'Usuario objetivo no encontrado' };

    if (callerProfile.role !== 'superadmin' && targetProfile.club_id !== callerProfile.club_id) {
      return { success: false, error: 'Violación de seguridad: El usuario pertenece a otro club' };
    }

    let query = adminClient
      .from('user_notification_preferences')
      .delete()
      .eq('user_id', params.targetUserId);

    if (params.notificationType) {
      query = query.eq('notification_type', params.notificationType);
    }

    const { error: delErr } = await query;
    if (delErr) throw delErr;

    return { success: true };
  } catch (err: any) {
    console.error('[adminResetUserPreferencesAction Error]:', err);
    return { success: false, error: err.message };
  }
}

