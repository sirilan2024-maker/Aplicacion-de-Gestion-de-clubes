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

    const cookieStore = await cookies();

    // 1. Caso: Seleccionar un jugador directamente (por id o con prefijo player_)
    const isPlayerPrefix = targetUserId.startsWith('player_');
    const playerId = isPlayerPrefix ? targetUserId.replace('player_', '') : targetUserId;

    if (isPlayerPrefix) {
      const { data: playerRec } = await adminClient
        .from('players')
        .select('id, first_name, last_name, club_id')
        .eq('id', playerId)
        .maybeSingle();

      if (playerRec) {
        cookieStore.set('impersonated_user_id', `player_${playerRec.id}`, {
          path: '/',
          httpOnly: true,
          maxAge: 60 * 60 * 24,
          sameSite: 'lax',
        });

        revalidatePath('/', 'layout');
        return { success: true, redirectUrl: `/dashboard/family/e/${playerRec.id}/perfil` };
      }
    }

    // 2. Caso: Perfil de usuario existente en profiles
    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('id, role, first_name, last_name, club_id')
      .eq('id', targetUserId)
      .maybeSingle();

    if (targetProfile) {
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
    }

    // 3. Fallback: verificar si targetUserId corresponde a la tabla players
    const { data: fallbackPlayer } = await adminClient
      .from('players')
      .select('id, first_name, last_name, club_id')
      .eq('id', playerId)
      .maybeSingle();

    if (fallbackPlayer) {
      cookieStore.set('impersonated_user_id', `player_${fallbackPlayer.id}`, {
        path: '/',
        httpOnly: true,
        maxAge: 60 * 60 * 24,
        sameSite: 'lax',
      });

      revalidatePath('/', 'layout');
      return { success: true, redirectUrl: `/dashboard/family/e/${fallbackPlayer.id}/perfil` };
    }

    return { success: false, error: 'Usuario o jugador no encontrado.' };
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

    // 2. Verificar que el usuario es admin con maybeSingle
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

    const clubId = adminProfile?.club_id;

    // 3. Obtener perfiles de usuarios registrados del club
    let profilesQuery = adminClient
      .from('profiles')
      .select('id, first_name, last_name, role, avatar_url, club_id')
      .order('first_name', { ascending: true });

    if (clubId) {
      profilesQuery = profilesQuery.eq('club_id', clubId);
    }

    const { data: profiles, error: profilesError } = await profilesQuery;

    if (profilesError) {
      console.error('[getClubUsers] Error al obtener perfiles:', profilesError);
    }

    // 4. Obtener la temporada activa del club para asociar equipos a los jugadores
    let activeSeasonQuery = adminClient
      .from('seasons')
      .select('id')
      .eq('is_active', true);
    if (clubId) {
      activeSeasonQuery = activeSeasonQuery.eq('club_id', clubId);
    }
    const { data: activeSeason } = await activeSeasonQuery.maybeSingle();

    // 5. Mapear jugadores de la temporada activa
    const seasonPlayerMap = new Map<string, { teamName: string }>();

    if (activeSeason) {
      let pshQuery = adminClient
        .from('player_season_history')
        .select('player_id, team_id, teams(name)')
        .eq('season_id', activeSeason.id);
      if (clubId) {
        pshQuery = pshQuery.eq('club_id', clubId);
      }
      const { data: psh } = await pshQuery;

      (psh || []).forEach((item: any) => {
        if (item.player_id) {
          seasonPlayerMap.set(item.player_id, {
            teamName: item.teams?.name || '',
          });
        }
      });
    }

    // 6. Obtener jugadores activos del club
    let playersQuery = adminClient
      .from('players')
      .select('id, first_name, last_name, avatar_url, team_id, teams(name), user_auth_id, status')
      .neq('status', 'inactive')
      .order('first_name', { ascending: true });
    if (clubId) {
      playersQuery = playersQuery.eq('club_id', clubId);
    }
    const { data: activePlayers, error: playersError } = await playersQuery;

    if (playersError) {
      console.error('[getClubUsers] Error al obtener jugadores:', playersError);
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

    const formattedList: Array<{
      id: string;
      name: string;
      roleKey: string;
      roleLabel: string;
      avatarUrl?: string | null;
    }> = [];

    // Añadir perfiles de cuentas (Administración, Cuerpo Técnico, Familias)
    (profiles || []).forEach(p => {
      const isStaff = ['coach', 'entrenador', 'delegado', 'coordinador', 'utillero'].includes(p.role);
      const isAdmin = ['admin', 'superadmin', 'secretario', 'tesorero', 'directivo'].includes(p.role);
      const roleLabel = roleLabels[p.role] || p.role || 'Usuario';

      formattedList.push({
        id: p.id,
        name: `${p.first_name || 'Usuario'} ${p.last_name || ''}`.trim(),
        roleKey: p.role || 'family',
        roleLabel: roleLabel,
        avatarUrl: p.avatar_url,
      });
    });

    // Añadir EXCLUSIVAMENTE los jugadores de la temporada actual activa
    // Si hay temporada activa, mostramos solo sus jugadores (34-38), no los históricos de años anteriores
    const playersToUse = activeSeason
      ? (activePlayers || []).filter(p => seasonPlayerMap.has(p.id))
      : (activePlayers || []).filter(p => p.team_id);

    playersToUse.forEach(p => {
      const teamName = seasonPlayerMap.get(p.id)?.teamName || (p.teams as any)?.name || '';
      formattedList.push({
        id: `player_${p.id}`,
        name: `${p.first_name || 'Jugador'} ${p.last_name || ''}`.trim(),
        roleKey: 'jugador',
        roleLabel: teamName ? `Jugador (${teamName})` : 'Jugador',
        avatarUrl: p.avatar_url,
      });
    });

    console.log(`[getClubUsers] Total usuarios y jugadores devueltos: ${formattedList.length} (Perfiles: ${(profiles || []).length}, Jugadores: ${playersToUse.length})`);
    return { success: true, data: formattedList };
  } catch (err: any) {
    console.error('[getClubUsers] Excepción:', err?.message || err);
    return { success: false, data: [] };
  }
}
