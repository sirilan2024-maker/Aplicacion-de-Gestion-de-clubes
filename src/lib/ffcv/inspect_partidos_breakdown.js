process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../../../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

function getEnv(key) {
  const line = envContent.split(/\r?\n/).find(l => l.startsWith(key + '='));
  if (!line) return null;
  return line.substring(key.length + 1).trim().replace(/^["']|["']$/g, '');
}

const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const key = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const supabase = createClient(url, key);

async function inspectPartidosRows() {
  const { data: teams } = await supabase.from('teams').select('id, name');
  const teamMap = {};
  teams?.forEach(t => teamMap[t.id] = t.name);

  const { data: partidos } = await supabase.from('partidos').select('*').order('created_at', { ascending: true });
  
  const byTeam = {};
  const bySeason = {};
  const byStatus = {};
  
  partidos?.forEach(p => {
    const tName = teamMap[p.equipo_id] || 'Otro/Nulo';
    byTeam[tName] = (byTeam[tName] || 0) + 1;
    bySeason[p.season_id] = (bySeason[p.season_id] || 0) + 1;
    byStatus[p.estado] = (byStatus[p.estado] || 0) + 1;
  });

  console.log('Partidos by Team:', byTeam);
  console.log('Partidos by Season:', bySeason);
  console.log('Partidos by Status:', byStatus);

  // Check sample rows from each team
  const sample = (partidos || []).slice(0, 15).map(p => ({
    id: p.id,
    team: teamMap[p.equipo_id],
    jornada: p.jornada,
    rival: p.rival_nombre,
    lugar: p.lugar,
    fecha: p.fecha_hora,
    propio: p.resultado_propio,
    rival_score: p.resultado_rival,
    created_at: p.created_at
  }));
  console.log('Sample rows:', sample);
}

inspectPartidosRows();
