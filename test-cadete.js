const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envLines = fs.readFileSync('.env.local', 'utf-8').split('\n');
let url = '', key = '';
for (const line of envLines) {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim().replace(/['"]/g, '');
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim().replace(/['"]/g, '');
}

const supabase = createClient(url, key);

async function check() {
  const query = `
    SELECT m.minuto, COUNT(*) as goles
    FROM match_events m
    JOIN partidos p ON m.partido_id = p.id
    JOIN teams t ON p.equipo_id = t.id
    WHERE t.name = 'Cadete A'
    AND m.tipo_evento = 'Gol' AND m.player_id IS NULL
    GROUP BY m.minuto
    ORDER BY goles DESC
  `;
  const { data } = await supabase.rpc('execute_sql_query', { query_text: query });
  console.log(data);
}

check();
