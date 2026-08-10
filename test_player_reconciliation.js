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

async function testPlayerReconciliation() {
  const { data: dbPlayers } = await supabase
    .from('players')
    .select('id, first_name, last_name, dorsal, team_id');

  console.log(`Cargados ${dbPlayers?.length || 0} jugadores de la BD.`);

  const { data: partido } = await supabase
    .from('partidos')
    .select('id, rival_nombre, lugar, fecha_hora, equipo_id, acta_oficial_url')
    .not('acta_oficial_url', 'is', null)
    .limit(1)
    .single();

  const { data: fileData } = await supabase.storage.from('actas-partidos').download(partido.acta_oficial_url);
  const buffer = Buffer.from(await fileData.arrayBuffer());
  const pdfRes = await pdfParse(buffer);
  const text = pdfRes.text;

  console.log(`Analizando acta vs ${partido.rival_nombre}...`);

  // Extraer bloque de titularidad de nuestro equipo
  // En FFCV Actas:
  // "Equipo[NUESTRO CLUB]" ... luego jugadores en líneas
  const isLocal = partido.lugar === 'Local';

  // Buscar goleadores en el texto del PDF
  const resIdx = text.indexOf("GOLES MARCADOS");
  if (resIdx !== -1) {
    const endIdx = text.indexOf("TARJETAS", resIdx);
    const goalsChunk = text.substring(resIdx, endIdx !== -1 ? endIdx : resIdx + 1500);

    // Extraer líneas de goles: ej. (12') TORQUI HAMDOUNI, ABDERRAHIM TALAL Gol
    const goalLines = goalsChunk.match(/\(\d+['\+\d]*\)\s*([^\n]+?)(Gol|Gol en propia|Penalty)/gi);
    console.log("\nLineas de Goles extraídas:");
    goalLines?.forEach(gl => {
      const match = gl.match(/\((\d+['\+\d]*)\)\s*([^\n]+?)(Gol|Gol en propia|Penalty)/i);
      if (match) {
        const minutoStr = match[1].replace(/['+]/g, '');
        const minuto = parseInt(minutoStr, 10);
        const nameRaw = match[2].trim();
        const normPdfName = normalizeName(nameRaw);

        // Buscar en dbPlayers
        const matchedPlayer = dbPlayers?.find(p => {
          const fullName = normalizeName(`${p.last_name} ${p.first_name}`);
          const revName = normalizeName(`${p.first_name} ${p.last_name}`);
          return fullName.includes(normPdfName) || normPdfName.includes(fullName) ||
                 revName.includes(normPdfName) || normPdfName.includes(revName);
        });

        console.log(`- Minuto: ${minuto}' | Nombre PDF: "${nameRaw}" -> Encontrado BD: ${matchedPlayer ? `${matchedPlayer.first_name} ${matchedPlayer.last_name} (ID: ${matchedPlayer.id})` : 'NO ENCONTRADO (Rival o nombre diferente)'}`);
      }
    });
  }
}

testPlayerReconciliation();
