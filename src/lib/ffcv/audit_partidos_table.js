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

function normalizeName(str) {
  if (!str) return '';
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ' ').trim().replace(/\s+/g, ' ');
}

async function auditPartidosTable() {
  const { data: teams } = await supabase.from('teams').select('id, name, category, club_id, ffcv_group_id, ffcv_team_id');
  const { data: partidos } = await supabase.from('partidos').select('*');

  console.log(`Total rows in 'partidos': ${partidos?.length || 0}`);
  
  const teamMap = {};
  teams?.forEach(t => teamMap[t.id] = t);

  let saladarMatches = 0;
  let opponentVsOpponent = 0;
  let matchesWithScores = 0;

  const opponentSamples = [];

  partidos?.forEach(p => {
    const isSaladarRival = normalizeName(p.rival_nombre || '').includes('saladar');
    const team = teamMap[p.equipo_id];
    const teamName = team ? team.name : 'Unknown';
    
    // In partidos, if lugar === 'Local', our team is teamName and rival is p.rival_nombre
    // If neither is Saladar, or if both teams in rival_nombre / observation are two external teams:
    const rivalNorm = normalizeName(p.rival_nombre || '');
    
    // Check if this was a bulk import where equipo_id was set to our team but rival_nombre was e.g. "Torrevieja vs Benijófar"
    const isOurMatch = (team && normalizeName(team.name).includes('saladar')) || rivalNorm.includes('saladar') || (p.lugar === 'Local' || p.lugar === 'Visitante');
    
    if (p.resultado_propio !== null && p.resultado_rival !== null) {
      matchesWithScores++;
    }

    // Let's inspect rival_nombre and observations
    if (rivalNorm.includes(' vs ') || rivalNorm.includes(' - ')) {
      opponentVsOpponent++;
      if (opponentSamples.length < 5) {
        opponentSamples.push({
          id: p.id,
          equipo: teamName,
          rival_nombre: p.rival_nombre,
          fecha: p.fecha_hora,
          resultado: `${p.resultado_propio}-${p.resultado_rival}`,
          lugar: p.lugar,
          jornada: p.jornada
        });
      }
    } else {
      saladarMatches++;
    }
  });

  console.log({
    totalRows: partidos?.length,
    matchesWithScores,
    saladarMatches,
    opponentVsOpponent,
    sampleOpponentMatches: opponentSamples
  });
}

auditPartidosTable();
