import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const { data: registrations } = await supabase.from('registrations').select('*').order('created_at', { ascending: false }).limit(5);
  const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(5);
  const { data: clubs } = await supabase.from('clubs').select('*').limit(5);
  
  return NextResponse.json({ registrations, profiles, clubs });
}
