const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Bypass SSL error locally
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => { const [k, ...v] = line.split('='); if(k && v) acc[k.trim()] = v.join('=').trim(); return acc; }, {});
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const PDF_DIR = 'C:\\Users\\siril\\Documents\\SPORTING SALADAR\\GESTION INTEGRAL DEL CLUB\\imagenes\\Nueva carpeta 1\\';

async function processMatches() {
  console.log("Iniciando procesamiento de PDFs...");

  const { data: profile } = await supabase.from('profiles').select('club_id').limit(1).single();
  const validClubId = profile ? profile.club_id : null;

  const { data: equipos, error } = await supabase.from('equipos').select('*');
  if (error || !equipos) {
    console.error("Error obteniendo equipos:", error);
    return;
  }
  console.log(`Se encontraron ${equipos.length} equipos en la base de datos.`);

  const files = fs.readdirSync(PDF_DIR).filter(f => f.toLowerCase().endsWith('.pdf') && !f.toLowerCase().includes('sporting saladar'));

  let totalInserted = 0;

  for (const file of files) {
    console.log(`\nProcesando archivo: ${file}`);
    
    // Buscar a qué equipo pertenece basado en el nombre del archivo
    const equipo = equipos.find(e => file.toLowerCase().includes(e.name.toLowerCase()));
    if (!equipo) {
      console.log(`-> Saltando: No se encontró un equipo correspondiente para ${file}`);
      continue;
    }

    // Sincronizar con la tabla legacy `teams` para satisfacer la foreign key de `partidos`
    const { error: upsertError } = await supabase.from('teams').upsert({ id: equipo.id, name: equipo.name, club_id: validClubId, category: 'General' });
    if (upsertError) console.log(`Error upserting team ${equipo.name}:`, upsertError);

    const dataBuffer = fs.readFileSync(path.join(PDF_DIR, file));
    let text = "";
    try {
      const parsed = await pdf(dataBuffer);
      text = parsed.text;
    } catch (e) {
      console.log(`-> Error parseando PDF ${file}:`, e.message);
      continue;
    }

    const lines = text.split('\n');
    const matchesToInsert = [];

    for (const line of lines) {
      if (!line.toLowerCase().includes('sporting saladar')) continue;
      
      // Regex para extraer: Local | ScoreLocal | ScoreVisit | Visit | Resto (Campo, Fecha)
      // Ejemplo: "Torrevieja C.F "B"2-1C.D. Oriol "B"  Campo..."
      // o "C.D. Horadada Thiar "B"3-4Sporting Saladar "A"  Poli..."
      const matchRegex = /(.*?)(?:(\d+)\s*-\s*(\d+))(.*)/;
      const m = line.match(matchRegex);
      
      if (!m) continue;

      let local = m[1].trim();
      let scoreLocal = parseInt(m[2], 10);
      let scoreVisit = parseInt(m[3], 10);
      let restOfLine = m[4];
      
      // Separar el equipo visitante del resto (Campo y Fecha)
      // Normalmente hay un doble espacio separando el equipo del campo
      let visit = restOfLine.split('  ')[0].trim();
      
      // Buscar la fecha al final de la línea: DD-MM-YYYY - HH:MM
      const dateRegex = /(\d{2}-\d{2}-\d{4})\s*-\s*(\d{2}:\d{2})/;
      const dateMatch = line.match(dateRegex);
      
      let fecha_hora = new Date().toISOString(); // Fallback
      if (dateMatch) {
        const [day, month, year] = dateMatch[1].split('-');
        const [hour, min] = dateMatch[2].split(':');
        // Formato ISO
        fecha_hora = new Date(`${year}-${month}-${day}T${hour}:${min}:00+01:00`).toISOString();
      }

      const isLocal = local.toLowerCase().includes('sporting saladar');
      const rival = isLocal ? visit : local;

      const newMatch = {
        equipo_id: equipo.id,
        club_id: validClubId,
        rival_nombre: rival,
        lugar: isLocal ? 'Local' : 'Visitante',
        fecha_hora: fecha_hora,
        estado: 'Finalizado',
        resultado_propio: isLocal ? scoreLocal : scoreVisit,
        resultado_rival: isLocal ? scoreVisit : scoreLocal
      };

      matchesToInsert.push(newMatch);
    }

    if (matchesToInsert.length > 0) {
      console.log(`-> Encontrados ${matchesToInsert.length} partidos para ${equipo.name}. Insertando...`);
      const { error: insertError } = await supabase.from('partidos').insert(matchesToInsert);
      if (insertError) {
        console.error("-> Error insertando partidos:", insertError.message);
      } else {
        console.log("-> Insertados con éxito.");
        totalInserted += matchesToInsert.length;
      }
    } else {
      console.log("-> No se encontraron partidos finalizados para Sporting Saladar.");
    }
  }

  console.log(`\n¡Proceso completado! Se han insertado ${totalInserted} partidos en total.`);
}

processMatches();
