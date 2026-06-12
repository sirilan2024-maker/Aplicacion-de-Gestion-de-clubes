import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { playerId, eventIds } = await request.json();

    if (!eventIds || !Array.isArray(eventIds)) {
      return NextResponse.json({ error: 'Missing eventIds' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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
