import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedContext, canUserAccessPlayer } from '@/lib/auth-helpers';

export async function POST(request: Request) {
  try {
    const { context, error: authError } = await getAuthenticatedContext();
    if (!context || authError) {
      return NextResponse.json({ error: authError || 'No autenticado' }, { status: 401 });
    }

    const { playerId, eventIds } = await request.json();

    if (!eventIds || !Array.isArray(eventIds)) {
      return NextResponse.json({ error: 'Missing eventIds' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    if (playerId) {
      const access = await canUserAccessPlayer(supabaseAdmin, context, playerId);
      if (!access.allowed || !access.player || access.player.club_id !== context.profile.club_id) {
        return NextResponse.json({ error: access.reason || 'No autorizado para ver métricas de este jugador' }, { status: 403 });
      }
    }

    let query = supabaseAdmin.from('player_training_metrics')
      .select('player_id, event_id, metric_id, value_number, club_metrics(name)')
      .in('event_id', eventIds);

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

