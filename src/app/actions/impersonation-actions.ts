'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedContext, ADMIN_ROLES } from '@/lib/auth-helpers';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function startImpersonationAction(targetUserId: string) {
  try {
    const { context: ctx, error: authErr } = await getAuthenticatedContext();
    if (!ctx) return { success: false, error: authErr || 'No autenticado' };

    const adminClient = createAdminClient();
    const realRole = ctx.realAdminRole || ctx.profile.role || 'admin';
    if (!ADMIN_ROLES.includes(realRole)) {
      return { success: false, error: 'Solo los administradores pueden usar la función de simulación.' };
    }

    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('id, role, first_name, last_name, club_id')
      .eq('id', targetUserId)
      .maybeSingle();

    if (!targetProfile) {
      return { success: false, error: 'Usuario objetivo no encontrado.' };
    }

    const cookieStore = await cookies();
    cookieStore.set('impersonated_user_id', targetUserId, {
      path: '/',
      httpOnly: true,
      maxAge: 60 * 60 * 24, // 24 hours
      sameSite: 'lax',
    });

    let redirectUrl = '/dashboard';
    const role = targetProfile.role || 'family';

    if (role === 'admin' || role === 'superadmin') {
      redirectUrl = '/admin/inicio';
    } else if (role === 'coordinador') {
      redirectUrl = '/dashboard/equipos';
    } else if (role === 'coach' || role === 'entrenador' || role === 'delegado') {
      redirectUrl = '/dashboard/mis-equipos';
    } else if (role === 'utillero') {
      redirectUrl = '/dashboard/utilleria';
    } else if (role === 'secretario') {
      redirectUrl = '/admin/secretaria';
    } else if (role === 'tesorero') {
      redirectUrl = '/admin/tesoreria';
    } else if (role === 'tutor' || role === 'familia' || role === 'family' || role === 'jugador') {
      const { data: playerRec } = await adminClient
        .from('players')
        .select('id')
        .eq('user_auth_id', targetUserId)
        .neq('status', 'inactive')
        .maybeSingle();

      if (playerRec) {
        redirectUrl = `/dashboard/family/e/${playerRec.id}/perfil`;
      } else {
        const { data: tutorLink } = await adminClient
          .from('player_tutors')
          .select('player_id')
          .eq('tutor_id', targetUserId)
          .limit(1)
          .maybeSingle();

        if (tutorLink) {
          redirectUrl = `/dashboard/family/e/${tutorLink.player_id}/perfil`;
        } else {
          redirectUrl = '/dashboard/family';
        }
      }
    }

    revalidatePath('/', 'layout');
    return { success: true, redirectUrl };
  } catch (err: any) {
    console.error('[startImpersonationAction Exception]:', err);
    return { success: false, error: 'Error al iniciar simulación de usuario' };
  }
}

export async function stopImpersonationAction() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('impersonated_user_id');

    revalidatePath('/', 'layout');
    return { success: true, redirectUrl: '/admin/inicio' };
  } catch (err: any) {
    return { success: false, redirectUrl: '/admin/inicio' };
  }
}

export async function getImpersonationStatusAction() {
  try {
    const { context: ctx } = await getAuthenticatedContext();
    if (!ctx) return { isImpersonating: false };

    if (!ctx.isImpersonating) {
      return { isImpersonating: false };
    }

    return {
      isImpersonating: true,
      impersonatedId: ctx.profile.id,
      impersonatedName: ctx.impersonatedName || `${ctx.profile.first_name || ''} ${ctx.profile.last_name || ''}`.trim() || 'Usuario del Club',
      impersonatedRole: ctx.impersonatedRole || ctx.profile.role || 'familia',
    };
  } catch (err: any) {
    return { isImpersonating: false };
  }
}

// ✅ NUEVA VERSIÓN: no usa getAuthenticatedContext() para evitar .single() que falla
export async function getClubUsersForImpersonationAction() {
  try {
    // 1. Obtener el usuario autenticado directamente
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[getClubUsers] No autenticado:', authError);
      return { success: false, data: [] };
    }

    const adminClient = createAdminClient();

    // 2. Verificar que el usuario es admin con maybeSingle (nunca falla)
    const { data: adminProfile } = await adminClient
      .from('profiles')
      .select('id, role, club_id')
      .eq('id', user.id)
      .maybeSingle();

    const realRole = adminProfile?.role || '';
    if (!ADMIN_ROLES.includes(realRole)) {
      console.log('[getClubUsers] Usuario sin rol admin:', realRole);
      return { success: false, data: [] };
    }

    // 3. Obtener TODOS los perfiles (adminClient bypassa RLS)
    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('id, first_name, last_name, role, avatar_url')
      .order('first_name', { ascending: true });

    if (profilesError) {
      console.error('[getClubUsers] Error al obtener perfiles:', profilesError);
      return { success: false, data: [] };
    }

    const roleLabels: Record<string, string> = {
      admin: 'Administrador',
      superadmin: 'Superadministrador',
      coordinador: 'Coordinador',
      coach: 'Entrenador',
      entrenador: 'Entrenador',
      delegado: 'Delegado',
      utillero: 'Utillero',
      secretario: 'Secretario',
      tesorero: 'Tesorero',
      directivo: 'Directivo',
      familia: 'Familia / Tutor',
      family: 'Familia / Tutor',
      tutor: 'Familia / Tutor',
      jugador: 'Jugador',
    };

    const formatted = (profiles || []).map(p => ({
      id: p.id,
      name: `${p.first_name || 'Usuario'} ${p.last_name || ''}`.trim(),
      roleKey: p.role || 'family',
      roleLabel: roleLabels[p.role] || p.role || 'Usuario',
      avatarUrl: p.avatar_url,
    }));

    console.log('[getClubUsers] Perfiles encontrados:', formatted.length);
    return { success: true, data: formatted };
  } catch (err: any) {
    console.error('[getClubUsers] Excepción:', err?.message || err);
    return { success: false, data: [] };
  }
}
