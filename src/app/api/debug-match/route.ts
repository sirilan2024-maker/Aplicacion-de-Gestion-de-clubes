import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { searchParams } = new URL(req.url);
  const matchId = searchParams.get('matchId');
  const { data, error } = await supabase.from('convocatorias').select('*').eq('partido_id', matchId);
  return Response.json({ data, error });
}
