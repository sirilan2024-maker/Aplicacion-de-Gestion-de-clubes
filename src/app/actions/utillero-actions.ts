'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { getAuthenticatedContext, ADMIN_ROLES } from '@/lib/auth-helpers';
import { resolveRivalKitForMatch } from '@/lib/ffcv/kit-service';

const ACTIVE_SEASON_ID = '663ed6ef-1dab-4350-9489-ed50f9e9ac15';
const CLOSED_SEASON_ID = '584f508a-fc1a-4339-b5b2-4296ffde2f4c';

export interface MatchKitItem {
  id: string;
  fechaHora: string;
  lugar: string;
  esLocal: boolean;
  rivalNombre: string;
  teamId: string;
  teamName: string;
  teamCategory?: string;
  teamColor?: string;
  equipacionAsignada: 'primera' | 'segunda';
  equipacionPreparada: boolean;
  conflictoEquipacion: boolean;
  rivalCamisetaColor?: string | null;
  equipacionNotas?: string | null;
}

export interface WeekendKitScheduleSummary {
  totalMatches: number;
  primeraCount: number;
  segundaCount: number;
  conflictCount: number;
  preparedCount: number;
  pendingCount: number;
}

/**
 * Recopila los partidos del próximo fin de semana con su equipación recomendada y estado de preparación
 */
export async function getWeekendKitScheduleAction(): Promise<{
  success: boolean;
  matches?: MatchKitItem[];
  summary?: WeekendKitScheduleSummary;
  error?: string;
}> {
  try {
    const { context, error: authError } = await getAuthenticatedContext();
    if (!context || authError) return { success: false, error: 'No autenticado' };

    const supabase = createAdminClient();

    // Consultar partidos próximos (desde ayer para incluir partidos del día)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: rawMatches, error: matchesErr } = await supabase
      .from('partidos')
      .select(`
        id, fecha_hora, lugar, rival_nombre, estado,
        equipacion_asignada, equipacion_preparada, rival_camiseta_color,
        conflicto_equipacion, equipacion_notas,
        equipo_id,
        teams:equipo_id (id, name, category, color)
      `)
      .eq('club_id', context.profile.club_id)
      .neq('season_id', CLOSED_SEASON_ID)
      .gte('fecha_hora', yesterday)
      .order('fecha_hora', { ascending: true })
      .limit(14);

    if (matchesErr || !rawMatches) {
      return { success: false, error: matchesErr?.message || 'Error consultando partidos' };
    }

    // Filtrar los partidos que pertenecen a la jornada inmediata (ventana de ~40 horas desde el primero)
    const firstTime = rawMatches.length > 0 ? new Date(rawMatches[0].fecha_hora).getTime() : 0;
    const matchdayEndMs = firstTime ? firstTime + (40 * 60 * 60 * 1000) : 0;
    const matchdayMatches = rawMatches.filter(m => new Date(m.fecha_hora).getTime() <= matchdayEndMs);
    const targetMatches = matchdayMatches.length > 0 ? matchdayMatches : rawMatches.slice(0, 7);

    // Resolver indumentaria del rival si falta
    const formattedMatches: MatchKitItem[] = [];

    for (const m of targetMatches) {
      const isLocal = m.lugar === 'Local' || (m.lugar !== 'Visitante' && !/\b(visitante|fuera)\b/i.test(m.lugar || ''));

      // Si no tiene color de rival resuelto y es visitante, resolverlo
      let kitAsignada = (m.equipacion_asignada as 'primera' | 'segunda') || (isLocal ? 'primera' : 'primera');
      let tieneConflicto = Boolean(m.conflicto_equipacion);
      let rivalColor = m.rival_camiseta_color;

      if (!isLocal && !m.rival_camiseta_color) {
        try {
          const resolved = await resolveRivalKitForMatch(m.id);
          kitAsignada = resolved.equipacion;
          tieneConflicto = resolved.conflicto;
          rivalColor = resolved.rivalCamisetaColor || rivalColor;
        } catch {
          // Fallback a primera
        }
      }

      const team = m.teams as any;

      formattedMatches.push({
        id: m.id,
        fechaHora: m.fecha_hora,
        lugar: m.lugar || (isLocal ? 'Local' : 'Visitante'),
        esLocal: isLocal,
        rivalNombre: m.rival_nombre || 'Rival por definir',
        teamId: m.equipo_id,
        teamName: team?.name || 'Equipo del Club',
        teamCategory: team?.category || '',
        teamColor: team?.color || '#4F46E5',
        equipacionAsignada: kitAsignada,
        equipacionPreparada: Boolean(m.equipacion_preparada),
        conflictoEquipacion: tieneConflicto,
        rivalCamisetaColor: rivalColor,
        equipacionNotas: m.equipacion_notas,
      });
    }

    const summary: WeekendKitScheduleSummary = {
      totalMatches: formattedMatches.length,
      primeraCount: formattedMatches.filter(m => m.equipacionAsignada === 'primera').length,
      segundaCount: formattedMatches.filter(m => m.equipacionAsignada === 'segunda').length,
      conflictCount: formattedMatches.filter(m => m.conflictoEquipacion).length,
      preparedCount: formattedMatches.filter(m => m.equipacionPreparada).length,
      pendingCount: formattedMatches.filter(m => !m.equipacionPreparada).length,
    };

    return {
      success: true,
      matches: formattedMatches,
      summary,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error inesperado' };
  }
}

/**
 * Marca o desmarca un partido como 'Ropa lista / Preparada'
 */
export async function toggleMatchKitPreparedAction(matchId: string, isPrepared: boolean) {
  try {
    const { context, error: authError } = await getAuthenticatedContext();
    if (!context || authError) return { success: false, error: 'No autenticado' };

    const hasPermission = ADMIN_ROLES.includes(context.profile.role) || context.profile.role === 'utillero';
    if (!hasPermission) {
      return { success: false, error: 'Permisos insuficientes para gestionar utillería.' };
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from('partidos')
      .update({ equipacion_preparada: isPrepared })
      .eq('id', matchId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/utilleria');
    revalidatePath('/dashboard/matches');
    revalidatePath('/admin/inicio');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Permite cambiar manualmente la equipación asignada (1ª Azul o 2ª Roja) y agregar notas
 */
export async function updateMatchKitSelectionAction(
  matchId: string,
  equipacion: 'primera' | 'segunda',
  notas?: string
) {
  try {
    const { context, error: authError } = await getAuthenticatedContext();
    if (!context || authError) return { success: false, error: 'No autenticado' };

    const hasPermission = ADMIN_ROLES.includes(context.profile.role) || context.profile.role === 'utillero';
    if (!hasPermission) {
      return { success: false, error: 'Permisos insuficientes para gestionar utillería.' };
    }

    const supabase = createAdminClient();

    const updatePayload: any = { equipacion_asignada: equipacion };
    if (notas !== undefined) updatePayload.equipacion_notas = notas;

    const { error } = await supabase
      .from('partidos')
      .update(updatePayload)
      .eq('id', matchId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/utilleria');
    revalidatePath('/dashboard/matches');
    revalidatePath('/admin/inicio');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Genera el aviso / notificación semanal automática para los utilleros del club
 */
export async function sendUtilleroWeeklyAlertAction(): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const { context, error: authError } = await getAuthenticatedContext();
    if (!context || authError) return { success: false, error: 'No autenticado' };

    const supabase = createAdminClient();
    const clubId = context.profile.club_id;

    const res = await getWeekendKitScheduleAction();
    if (!res.success || !res.matches) {
      return { success: false, error: res.error || 'No se pudieron consultar los partidos' };
    }

    const matches = res.matches;
    const conflicts = matches.filter(m => m.conflictoEquipacion || m.equipacionAsignada === 'segunda');

    // Buscar usuarios con rol utillero o coordinador/admin
    const { data: utilleros } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('club_id', clubId)
      .in('role', ['utillero', 'coordinador', 'admin']);

    if (!utilleros || utilleros.length === 0) {
      return { success: true, message: 'No hay perfiles de utillero configurados en el club.' };
    }

    const conflictText = conflicts.length > 0
      ? ` ⚠️ ATENCIÓN: ${conflicts.length} equipo(s) deben vestir la 2ª EQUIPACIÓN ROJA por coincidencia de color: ${conflicts.map(c => `${c.teamName} (vs ${c.rivalNombre})`).join(', ')}.`
      : ' Todos los equipos pueden vestir la 1ª Equipación Azul.';

    const notificationTitle = '👕 Preparación de Equipaciones para el Fin de Semana';
    const notificationBody = `Hay ${matches.length} partidos programados.${conflictText} Consulta la hoja de ruta en Utillería.`;

    const notificationsToInsert = utilleros.map(u => ({
      user_id: u.id,
      club_id: clubId,
      title: notificationTitle,
      message: notificationBody,
      type: 'utilleria_alert',
      read: false,
    }));

    await supabase.from('notifications').insert(notificationsToInsert);

    return {
      success: true,
      message: `Aviso enviado correctamente a ${utilleros.length} responsables de utillería y coordinación.`,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
