import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export async function GET(request: Request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const activeSeason = { id: '1f95102d-1d00-43fa-9e4c-408681a03e7f' };
  const teamId = 'a8c6dcfa-a795-4c89-b92c-08c4592d1f43';

  const { data, error } = await supabase
        .from('player_season_history')
        .select('player_id, players(id, first_name, last_name, dorsal)')
        .eq('team_id', teamId)
        .neq('status', 'inactive')
        .or(`season_id.eq.${activeSeason?.id},season_id.is.null`);
        
  return NextResponse.json({ error, count: data?.length, data });
}
