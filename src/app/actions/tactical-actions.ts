'use server';

import { createClient } from '@/lib/supabase/server';
import {
  getTeamTacticalAnalytics,
  getPlayerAchievements,
  TacticalAnalyticsResult,
  PlayerAchievementBadge
} from '@/lib/performance/tactical-analytics-service';

/**
 * Server Action to get tactical analytics for a team (cached 30 min)
 */
export async function getTeamTacticalAnalyticsAction(
  teamId: string
): Promise<{ success: boolean; data?: TacticalAnalyticsResult; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { success: false, error: 'No autorizado' };
    }

    if (!teamId) {
      return { success: false, error: 'Identificador de equipo requerido' };
    }

    const data = await getTeamTacticalAnalytics(teamId);
    if (!data) {
      return { success: false, error: 'No se encontraron datos tácticos para este equipo.' };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('[getTeamTacticalAnalyticsAction] Error:', err);
    return { success: false, error: err.message || 'Error al obtener análisis táctico' };
  }
}

/**
 * Server Action to get individual achievements/medals for a player
 */
export async function getPlayerAchievementsAction(
  playerId: string
): Promise<{ success: boolean; data?: PlayerAchievementBadge[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { success: false, error: 'No autorizado' };
    }

    if (!playerId) {
      return { success: false, error: 'Identificador de jugador requerido' };
    }

    const data = await getPlayerAchievements(playerId);
    return { success: true, data };
  } catch (err: any) {
    console.error('[getPlayerAchievementsAction] Error:', err);
    return { success: false, error: err.message || 'Error al obtener logros del jugador' };
  }
}
