import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedContext, canUserAccessPlayer, canUserManageTeam } from '@/lib/auth-helpers';

export async function POST(request: Request) {
  try {
    const { context, error: authError } = await getAuthenticatedContext();
    if (!context || authError) {
      return NextResponse.json({ error: authError || 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { playerId, teamId, eventIds } = body;

    // 1. Validación estricta del array de eventIds: debe ser un array donde cada elemento sea un string no vacío
    if (!eventIds || !Array.isArray(eventIds)) {
      return NextResponse.json({ error: 'eventIds debe ser un array' }, { status: 400 });
    }

    const hasInvalidElement = eventIds.some(id => typeof id !== 'string' || id.trim() === '');
    if (hasInvalidElement) {
      return NextResponse.json({ error: 'eventIds contiene identificadores inválidos' }, { status: 400 });
    }

    // Deduplicar identificadores
    const uniqueEventIds = Array.from(new Set(eventIds));
    if (uniqueEventIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const supabaseAdmin = createAdminClient();
    let authorizedTeamId: string;

    if (playerId) {
      // 2. Consulta individual de jugador
      if (typeof playerId !== 'string' || playerId.trim() === '') {
        return NextResponse.json({ error: 'playerId inválido' }, { status: 400 });
      }

      const access = await canUserAccessPlayer(supabaseAdmin, context, playerId);
      if (!access.allowed || !access.player || access.player.club_id !== context.profile.club_id) {
        return NextResponse.json({ error: access.reason || 'No autorizado para ver métricas de este jugador' }, { status: 403 });
      }

      // Validar que el jugador tenga un team_id asignado antes de usarlo como ámbito
      if (!access.player.team_id) {
        return NextResponse.json({ error: 'El jugador no tiene equipo asignado para consultar eventos' }, { status: 403 });
      }

      // No permitir que un teamId enviado amplíe o modifique el ámbito del jugador
      if (teamId && teamId !== access.player.team_id) {
        return NextResponse.json({ error: 'El equipo especificado no coincide con el del jugador' }, { status: 403 });
      }

      authorizedTeamId = access.player.team_id;
    } else {
      // 3. Consulta colectiva de equipo
      if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
        return NextResponse.json({ error: 'teamId es requerido para consultas colectivas' }, { status: 400 });
      }

      const teamAccess = await canUserManageTeam(supabaseAdmin, context, teamId);
      if (!teamAccess.allowed) {
        return NextResponse.json({ error: teamAccess.reason || 'No autorizado sobre este equipo' }, { status: 403 });
      }

      authorizedTeamId = teamId;
    }

    // 4. Validación exhaustiva: TODOS los eventos deben existir, pertenecer al club y al equipo autorizado
    const { data: dbEvents, error: eventsError } = await supabaseAdmin
      .from('team_events')
      .select('id, team_id, teams!inner(club_id)')
      .in('id', uniqueEventIds);

    if (eventsError || !dbEvents || dbEvents.length !== uniqueEventIds.length) {
      return NextResponse.json({ error: 'Uno o más eventos no existen o no son válidos' }, { status: 403 });
    }

    const allEventsBelongToAuthorizedScope = dbEvents.every(ev => {
      const eventClubId = (ev.teams as any)?.club_id;
      return eventClubId === context.profile.club_id && ev.team_id === authorizedTeamId;
    });

    if (!allEventsBelongToAuthorizedScope) {
      return NextResponse.json({ error: 'Uno o más eventos no pertenecen al equipo o club autorizado' }, { status: 403 });
    }

    // 5. Consulta de métricas acotada a los eventos verificados (y al playerId si aplica)
    let query = supabaseAdmin.from('player_training_metrics')
      .select('player_id, event_id, metric_id, value_number, club_metrics(name)')
      .in('event_id', uniqueEventIds);

    if (playerId) {
      query = query.eq('player_id', playerId);
    }

    const { data: pt, error } = await query;

    if (error) {
      console.error("Supabase Admin Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: pt || [] });
  } catch (err: any) {
    console.error("API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

