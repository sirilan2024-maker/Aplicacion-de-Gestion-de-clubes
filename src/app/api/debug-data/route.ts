import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const { data: players } = await supabase.from('players').select('*').order('created_at', { ascending: false }).limit(5);
  const { data: history } = await supabase.from('player_season_history').select('*').order('created_at', { ascending: false }).limit(5);
  const { data: tutors } = await supabase.from('player_tutors').select('*').order('created_at', { ascending: false }).limit(5);
  
  return NextResponse.json({ players, history, tutors });
}
