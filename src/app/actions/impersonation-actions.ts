'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { ADMIN_ROLES } from '@/lib/auth-helpers';

export async function startImpersonationAction(targetUserId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const adminClient = createAdminClient();
  const { data: realProfile } = await adminClient
    .from('profiles')
    .select('id, role, club_id')
    .eq('id', user.id)
    .maybeSingle();

  const userRole = realProfile?.role || 'admin';
  const isAllowedAdmin = ADMIN_ROLES.includes(userRole) || ['admin', 'superadmin'].includes(userRole);
  if (!isAllowedAdmin) {
    return { success: false, error: 'Solo los administradores pueden usar la función de vista previa de usuario.' };
  }

  let targetQuery = adminClient
    .from('profiles')
    .select('id, role, first_name, last_name, club_id')
    .eq('id', targetUserId);

  if (realProfile?.club_id) {
    targetQuery = targetQuery.or(`club_id.eq.${realProfile.club_id},club_id.is.null`);
  }

  const { data: targetProfile } = await targetQuery.maybeSingle();

  if (!targetProfile) {
    return { success: false, error: 'Usuario no encontrado en tu club.' };
  }

  // Set impersonation cookie
  const cookieStore = await cookies();
  cookieStore.set('impersonated_user_id', targetUserId, {
    path: '/',
    httpOnly: true,
    maxAge: 60 * 60 * 24, // 24 hours
    sameSite: 'lax',
  });

  // Determine initial target destination based on role
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
    // Check if there is a linked player for direct family portal view
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
}

export async function stopImpersonationAction() {
  const cookieStore = await cookies();
  cookieStore.delete('impersonated_user_id');

  revalidatePath('/', 'layout');
  return { success: true, redirectUrl: '/admin/inicio' };
}

export async function getImpersonationStatusAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { isImpersonating: false };

  const adminClient = createAdminClient();
  const { data: realProfile } = await adminClient
    .from('profiles')
    .select('id, role, club_id')
    .eq('id', user.id)
    .maybeSingle();

  const userRole = realProfile?.role || 'admin';
  const isAllowedAdmin1 = ADMIN_ROLES.includes(userRole) || ['admin', 'superadmin'].includes(userRole);
  if (!isAllowedAdmin1) {
    return { isImpersonating: false };
  }

  const cookieStore = await cookies();
  const impId = cookieStore.get('impersonated_user_id')?.value;

  if (!impId || impId === user.id) {
    return { isImpersonating: false };
  }

  const { data: impProfile } = await adminClient
    .from('profiles')
    .select('id, role, first_name, last_name')
    .eq('id', impId)
    .maybeSingle();

  if (!impProfile) return { isImpersonating: false };

  return {
    isImpersonating: true,
    impersonatedId: impProfile.id,
    impersonatedName: `${impProfile.first_name || ''} ${impProfile.last_name || ''}`.trim() || 'Usuario del Club',
    impersonatedRole: impProfile.role || 'familia',
  };
}

export async function getClubUsersForImpersonationAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, data: [] };

  const adminClient = createAdminClient();
  const { data: realProfile } = await adminClient
    .from('profiles')
    .select('id, role, club_id')
    .eq('id', user.id)
    .maybeSingle();

  const userRole = realProfile?.role || 'admin';
  const isAllowedAdmin = ADMIN_ROLES.includes(userRole) || ['admin', 'superadmin'].includes(userRole);
  if (!isAllowedAdmin) {
    return { success: false, data: [] };
  }

  let clubId = realProfile?.club_id;
  if (!clubId) {
    const { data: defaultClub } = await adminClient.from('clubs').select('id').limit(1).maybeSingle();
    clubId = defaultClub?.id;
  }

  let query = adminClient
    .from('profiles')
    .select('id, first_name, last_name, role, avatar_url, updated_at')
    .order('first_name', { ascending: true });

  if (clubId) {
    query = query.or(`club_id.eq.${clubId},club_id.is.null`);
  }

  const { data: profiles, error } = await query;

  if (error || !profiles) return { success: false, data: [] };

  // Format profiles with readable role labels
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

  const formatted = profiles.map(p => ({
    id: p.id,
    name: `${p.first_name || 'Usuario'} ${p.last_name || ''}`.trim(),
    roleKey: p.role || 'family',
    roleLabel: roleLabels[p.role] || p.role || 'Usuario',
    avatarUrl: p.avatar_url,
  }));

  return { success: true, data: formatted };
}
