import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
// @ts-ignore
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeName(str) {
  if (!str) return '';
  return str.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function testMatchPlayers() {
  const { data: dbPlayers } = await supabase
    .from('players')
    .select('id, first_name, last_name, dorsal, team_id');

  console.log(`Cargados ${dbPlayers?.length || 0} jugadores de la BD.`);

  const { data: partidos } = await supabase
    .from('partidos')
    .select('id, rival_nombre, lugar, fecha_hora, equipo_id, acta_oficial_url')
    .not('acta_oficial_url', 'is', null);

  console.log(`Analizando ${partidos?.length || 0} partidos con acta oficial vinculada...\n`);

  for (const partido of partidos || []) {
    const { data: fileData } = await supabase.storage.from('actas-partidos').download(partido.acta_oficial_url);
    if (!fileData) continue;

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const pdfRes = await pdfParse(buffer);
    const text = pdfRes.text;

    console.log(`=================== PARTIDO [${partido.fecha_hora?.split('T')[0]}] ${partido.lugar} vs ${partido.rival_nombre} ===================`);

    const isLocal = partido.lugar === 'Local';

    // 1. Extraer Bloque de Goles
    const resIdx = text.indexOf("GOLES MARCADOS");
    if (resIdx !== -1) {
      const endIdx = text.indexOf("TARJETAS", resIdx);
      const goalsChunk = text.substring(resIdx, endIdx !== -1 ? endIdx : resIdx + 1500);
      console.log("--- Bloque Goles ---");
      console.log(goalsChunk.trim());
    }

    // 2. Extraer Bloque de Tarjetas
    const tarjIdx = text.indexOf("TARJETAS");
    if (tarjIdx !== -1) {
      const endIdx = text.indexOf("FIRMA DE LOS DELEGADOS", tarjIdx);
      const tarjChunk = text.substring(tarjIdx, endIdx !== -1 ? endIdx : tarjIdx + 1500);
      console.log("--- Bloque Tarjetas ---");
      console.log(tarjChunk.trim());
    }
  }
}

testMatchPlayers();
