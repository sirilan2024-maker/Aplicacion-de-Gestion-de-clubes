import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
// @ts-ignore
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const MESES = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
};

async function debugPendingActas() {
  console.log("Listing all files in bucket 'actas-partidos'...");
  const { data: rootFiles } = await supabase.storage.from('actas-partidos').list('', { limit: 100 });
  console.log("Root files:", rootFiles?.map(f => f.name));

  const { data: pendingFiles } = await supabase.storage.from('actas-partidos').list('pendientes', { limit: 100 });
  console.log("Pending files:", pendingFiles?.map(f => f.name));

  const { data: partidos } = await supabase.from('partidos').select('id, rival_nombre, lugar, fecha_hora, equipo_id, equipo:teams(name)');
  
  if (pendingFiles && pendingFiles.length > 0) {
    for (const pf of pendingFiles) {
      console.log(`\n=================== ANALIZANDO ACTA PENDIENTE: ${pf.name} ===================`);
      const path = `pendientes/${pf.name}`;
      const { data: fileData } = await supabase.storage.from('actas-partidos').download(path);
      if (!fileData) continue;

      const buffer = Buffer.from(await fileData.arrayBuffer());
      const pdfRes = await pdfParse(buffer);
      const text = pdfRes.text;

      console.log("--- Extracto del PDF ---");
      console.log(text.substring(0, 800));

      // Extraer Fecha ("del partido celebrado el [FECHA]")
      let fecha = null;
      const fechaMatch = text.match(/celebrado\s+el\s*([0-9]{1,2}\s+de\s+[a-zA-ZáéíóúÁÉÍÓÚ]+\s+de\s+[0-9]{4}|[0-9]{1,2}[./-][0-9]{1,2}[./-][0-9]{2,4})/i);
      if (fechaMatch) {
        const rawDateStr = fechaMatch[1];
        const textMatch = rawDateStr.match(/(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})/i);
        if (textMatch) {
          const day = parseInt(textMatch[1], 10);
          const month = MESES[textMatch[2].toLowerCase()];
          const year = parseInt(textMatch[3], 10);
          if (day >= 1 && day <= 31 && month !== undefined && year >= 2020) {
            fecha = new Date(year, month, day);
          }
        }
      }

      // Extraer Clubes
      let localTeam = null;
      let awayTeam = null;
      const clubesMatch = text.match(/Clubes:\s*([^\n,]+)(?:,\s*de[^\n]+)?\s*\n\s*([^\n,]+)(?:,\s*de[^\n]+)?/i);
      if (clubesMatch) {
        localTeam = clubesMatch[1].trim();
        awayTeam = clubesMatch[2].trim();
      }

      console.log("\n-> Datos extraídos:");
      console.log("   Fecha extraída:", fecha ? fecha.toISOString().split('T')[0] : "NINGUNA");
      console.log("   Equipo Local:", localTeam);
      console.log("   Equipo Visitante:", awayTeam);

      // Comparar con partidos de la BD
      console.log("\n-> Partidos de la BD que podrían coincidir:");
      partidos.forEach(p => {
        const pDateStr = p.fecha_hora ? p.fecha_hora.split('T')[0] : '';
        const matchDateStr = fecha ? fecha.toISOString().split('T')[0] : '';
        
        const normRival = (p.rival_nombre || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, " ").trim();
        const normPdfText = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, " ").trim();
        const keywords = normRival.split(' ').filter(w => w.length > 3);
        const hasRivalMatch = keywords.some(kw => normPdfText.includes(kw));

        if (pDateStr === matchDateStr || hasRivalMatch) {
          console.log(`   [ID: ${p.id}] Fecha BD: ${pDateStr} vs Fecha Acta: ${matchDateStr} | Rival: ${p.rival_nombre} (Coincidencia texto rival: ${hasRivalMatch})`);
        }
      });
    }
  }
}

debugPendingActas();
