import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNovMatches() {
  const { data: matches } = await supabase
    .from('partidos')
    .select('id, rival_nombre, lugar, fecha_hora, estado, equipo:teams(name)')
    .order('fecha_hora', { ascending: true });

  console.log(`Total partidos en DB: ${matches?.length || 0}`);
  
  const novMatches = matches?.filter(m => m.fecha_hora?.includes('2025-11'));
  console.log("\nPartidos en Noviembre 2025:");
  novMatches?.forEach(m => {
    console.log(`- ID: ${m.id} | FechaHora: ${m.fecha_hora} | ${m.lugar} vs ${m.rival_nombre}`);
  });
}

checkNovMatches();
