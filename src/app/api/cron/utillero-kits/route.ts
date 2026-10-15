import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveRivalKitForMatch } from '@/lib/ffcv/kit-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CLOSED_SEASON_ID = '584f508a-fc1a-4339-b5b2-4296ffde2f4c';

function verifyCronAuth(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader === `Bearer ${cronSecret}`) return true;
    const querySecret = req.nextUrl.searchParams.get('secret');
    if (querySecret === cronSecret) return true;
    return false;
  }
  return true;
}

export async function GET(req: NextRequest) {
  try {
    if (!verifyCronAuth(req)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or missing CRON_SECRET' },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();

    // 1. Obtener partidos de la próxima jornada (ventana de ~4 días para cubrir el fin de semana)
    const nowIso = new Date().toISOString();
    const futureLimit = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

    const { data: upcomingMatches, error: matchesErr } = await supabase
      .from('partidos')
      .select(`
        id, fecha_hora, lugar, rival_nombre,
        equipacion_asignada, equipacion_preparada, rival_camiseta_color, conflicto_equipacion,
        equipo_id, club_id,
        teams:equipo_id (id, name, category)
      `)
      .neq('season_id', CLOSED_SEASON_ID)
      .gte('fecha_hora', nowIso)
      .lte('fecha_hora', futureLimit)
      .order('fecha_hora', { ascending: true });

    if (matchesErr || !upcomingMatches) {
      return NextResponse.json(
        { success: false, error: matchesErr?.message || 'Error consultando partidos' },
        { status: 500 }
      );
    }

    // 2. Resolver equipaciones para cada partido que aún no tenga conflicto analizado
    const results: any[] = [];
    const conflicts: any[] = [];

    for (const match of upcomingMatches) {
      const isLocal = match.lugar === 'Local' || (match.lugar !== 'Visitante' && !/\b(fuera|visitante)\b/i.test(match.lugar || ''));
      let assignedKit = match.equipacion_asignada || (isLocal ? 'primera' : 'primera');
      let hasConflict = Boolean(match.conflicto_equipacion);
      let rivalColor = match.rival_camiseta_color;

      // Si es visitante y aún no se analizó el color del rival, resolverlo
      if (!isLocal && !match.rival_camiseta_color) {
        try {
          const resolved = await resolveRivalKitForMatch(match.id);
          assignedKit = resolved.equipacion;
          hasConflict = resolved.conflicto;
          rivalColor = resolved.rivalCamisetaColor;
        } catch (e: any) {
          console.error(`Error resolving kit for match ${match.id}:`, e.message);
        }
      }

      const teamName = (match.teams as any)?.name || 'Equipo';

      if (hasConflict || assignedKit === 'segunda') {
        conflicts.push({
          matchId: match.id,
          teamName,
          rivalName: match.rival_nombre,
          rivalColor,
        });
      }

      results.push({
        matchId: match.id,
        teamName,
        rivalName: match.rival_nombre,
        isLocal,
        assignedKit,
        hasConflict,
        rivalColor,
      });
    }

    // 3. Crear notificación in-app para utilleros y coordinadores de cada club presente
    const clubIds = Array.from(new Set(upcomingMatches.map(m => m.club_id).filter(Boolean)));
    let notificationsSent = 0;

    for (const clubId of clubIds) {
      const { data: staff } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('club_id', clubId)
        .in('role', ['utillero', 'coordinador', 'admin']);

      if (staff && staff.length > 0) {
        const conflictCount = conflicts.length;
        const conflictDetails = conflictCount > 0
          ? ` ⚠️ ATENCIÓN: ${conflictCount} equipo(s) deben vestir la 2ª EQUIPACIÓN ROJA por coincidencia de color: ${conflicts.map(c => `${c.teamName} (vs ${c.rivalName})`).join(', ')}.`
          : ' Todos los equipos pueden vestir con la 1ª Equipación Azul.';

        const title = '👕 Preparación de Equipaciones para el Fin de Semana';
        const body = `Hay ${upcomingMatches.length} partidos programados.${conflictDetails} Hoja de ruta disponible en Utillería.`;

        const notifs = staff.map(u => ({
          user_id: u.id,
          club_id: clubId,
          title,
          message: body,
          type: 'utilleria_alert',
          read: false,
        }));

        await supabase.from('notifications').insert(notifs);
        notificationsSent += notifs.length;
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      matchesAnalyzed: upcomingMatches.length,
      conflictsDetected: conflicts.length,
      notificationsSent,
      results,
    });
  } catch (err: any) {
    console.error('[Utillero Kits Cron] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
