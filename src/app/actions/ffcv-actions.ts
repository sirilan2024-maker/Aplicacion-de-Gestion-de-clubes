'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { syncTeamFFCV, syncGroupFFCV } from '@/lib/ffcv/sync';
import { fetchMatchDetails } from '@/lib/ffcv/client';
import { FFCVSyncResult, FFCVRawMatchDetails } from '@/lib/ffcv/types';
import { syncFFCVActaToConvocatorias } from '@/lib/ffcv/acta-sync';

/**
 * Server Action to manually sync FFCV data for a team in the club
 */
export async function syncTeamFFCVAction(
  teamId: string,
  options?: { syncAllMatchdays?: boolean; specificMatchday?: number }
): Promise<{ success: boolean; data?: FFCVSyncResult; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { success: false, error: 'No autorizado. Debes iniciar sesión.' };
    }

    // Check user profile and club authorization
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, club_id, rol, role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return { success: false, error: 'Perfil de usuario no encontrado.' };
    }

    // Verify team belongs to the user's club (unless superadmin)
    const { data: team } = await supabase
      .from('teams')
      .select('id, club_id, name')
      .eq('id', teamId)
      .single();

    if (!team) {
      return { success: false, error: 'Equipo no encontrado.' };
    }

    const isAdmin = profile.rol === 'admin' || profile.rol === 'superadmin' || profile.role === 'admin' || profile.role === 'superadmin';
    if (team.club_id !== profile.club_id && !isAdmin) {
      return { success: false, error: 'No tienes permisos para sincronizar este equipo.' };
    }

    // Perform sync
    const result = await syncTeamFFCV(teamId, options);
    return { success: true, data: result };
  } catch (err: any) {
    console.error('[syncTeamFFCVAction] Error:', err);
    return { success: false, error: err.message || 'Error durante la sincronización FFCV' };
  }
}

/**
 * Server Action to manually sync all configured FFCV teams in the club
 */
export async function syncAllFFCVAction(
  options?: { syncAllMatchdays?: boolean; specificMatchday?: number }
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { success: false, error: 'No autorizado. Debes iniciar sesión.' };
    }

    const { syncAllConfiguredFFCVTeams } = await import('@/lib/ffcv/sync');
    const result = await syncAllConfiguredFFCVTeams(options);
    revalidatePath('/dashboard/matches');
    revalidatePath('/admin/partidos');
    return { success: true, data: result };
  } catch (err: any) {
    console.error('[syncAllFFCVAction] Error:', err);
    return { success: false, error: err.message || 'Error durante la sincronización global FFCV' };
  }
}

/**
 * Server Action to fetch official match report details from FFCV
 * Automatically synchronizes the official score and status to both
 * ffcv_matches and the internal partidos table when the match is played/closed.
 */
export async function getFFCVMatchReportAction(
  matchId: string
): Promise<{ success: boolean; data?: FFCVRawMatchDetails; error?: string; synced?: boolean }> {
  try {
    if (!matchId) {
      return { success: false, error: 'Identificador de partido no especificado.' };
    }

    const details = await fetchMatchDetails({ matchId });

    let synced = false;
    if (details) {
      const isClosed = String(details.acta_cerrada) === '1';
      const hasScores = details.goles_local !== undefined && details.goles_local !== null && details.goles_local !== '' &&
                        details.goles_visitante !== undefined && details.goles_visitante !== null && details.goles_visitante !== '';

      if (isClosed || hasScores) {
        try {
          const adminSupabase = createAdminClient();
          const homeScore = Number(details.goles_local) || 0;
          const awayScore = Number(details.goles_visitante) || 0;

          // 1. Update ffcv_matches table
          await adminSupabase
            .from('ffcv_matches')
            .update({
              home_score: homeScore,
              away_score: awayScore,
              status: 'played',
              is_closed: isClosed,
              codacta: matchId
            })
            .eq('ffcv_match_id', matchId);

          // 2. Find internal club matches linked to this official match in active season 26/27
          const { data: matchedPartidos } = await adminSupabase
            .from('partidos')
            .select('id, lugar, rival_nombre, acta_oficial_url, season_id')
            .neq('season_id', '584f508a-fc1a-4339-b5b2-4296ffde2f4c')
            .or(`acta_oficial_url.ilike.%CodPartido=${matchId}%,acta_oficial_url.ilike.%${matchId}%`);

          if (matchedPartidos && matchedPartidos.length > 0) {
            for (const pm of matchedPartidos) {
              const isLocal = pm.lugar === 'Local' || !/\b(fuera|visitante)\b/i.test(pm.lugar || '');
              const ownScore = isLocal ? homeScore : awayScore;
              const rivalScore = isLocal ? awayScore : homeScore;

              await adminSupabase
                .from('partidos')
                .update({
                  estado: 'Finalizado',
                  resultado_propio: ownScore,
                  resultado_rival: rivalScore
                })
                .eq('id', pm.id);
            }
          }

          // 3. Automatically synchronize official lineup, minutes played, cards and goals into convocatorias
          const actaSyncRes = await syncFFCVActaToConvocatorias(matchId, details, adminSupabase);
          if (actaSyncRes.success && actaSyncRes.syncedCount > 0) {
            synced = true;
          }

          revalidatePath('/dashboard/matches');
          revalidatePath('/dashboard', 'layout');
          if (matchedPartidos && matchedPartidos.length > 0) {
            synced = true;
          }
        } catch (syncErr) {
          console.error('[getFFCVMatchReportAction] Background sync error:', syncErr);
        }
      }
    }

    return { success: true, data: details, synced };
  } catch (err: any) {
    console.error('[getFFCVMatchReportAction] Error:', err);
    return { success: false, error: err.message || 'Error al obtener el acta oficial de la FFCV' };
  }
}

/**
 * Explicit Server Action to force synchronization of a match from its official FFCV report
 */
export async function syncSingleMatchFFCVAction(
  matchId: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const res = await getFFCVMatchReportAction(matchId);
    if (!res.success || !res.data) {
      return { success: false, error: res.error || 'No se pudo obtener el acta oficial' };
    }
    return { success: true, message: 'Partido y resultado federativo sincronizados correctamente.' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error sincronizando partido' };
  }
}
