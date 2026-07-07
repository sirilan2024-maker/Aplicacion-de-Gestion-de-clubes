import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  
  // Attempt to insert an empty record to get the exact schema error
  // Or just query 1 record to see the keys
  const { data, error } = await supabase.from('players').insert({
    first_name: "Test",
    last_name: "Test",
    birth_date: "2010-01-01",
    team_id: null,
    posicion: "Delantero",
    dorsal: 10,
    medical_notes: "None",
    parent_contact: "test"
  });
  
  return NextResponse.json({ data, error });
}
