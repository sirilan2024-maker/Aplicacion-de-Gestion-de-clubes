'use server';

import { createClient } from '@/lib/supabase/server';
import { syncTeamFFCV, syncGroupFFCV } from '@/lib/ffcv/sync';
import { fetchMatchDetails } from '@/lib/ffcv/client';
import { FFCVSyncResult, FFCVRawMatchDetails } from '@/lib/ffcv/types';

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
 * Server Action to fetch official match report details from FFCV
 */
export async function getFFCVMatchReportAction(
  matchId: string
): Promise<{ success: boolean; data?: FFCVRawMatchDetails; error?: string }> {
  try {
    if (!matchId) {
      return { success: false, error: 'Identificador de partido no especificado.' };
    }

    const details = await fetchMatchDetails({ matchId });
    return { success: true, data: details };
  } catch (err: any) {
    console.error('[getFFCVMatchReportAction] Error:', err);
    return { success: false, error: err.message || 'Error al obtener el acta oficial de la FFCV' };
  }
}
