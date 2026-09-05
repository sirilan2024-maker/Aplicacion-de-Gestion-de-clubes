process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
const https = require('https');
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
const ffcvAgent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });

async function fetchMatchDetails(matchId) {
  return new Promise((resolve) => {
    const reqUrl = `https://ffcv.es/competiciones/api/partidos/ficha_partido_ajax.php?cod_partido=${matchId}`;
    https.get(reqUrl, { agent: ffcvAgent, headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => {
      resolve(null);
    });
  });
}

function normalizeName(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

async function run() {
  console.log('=== AUDITORÍA PROFUNDA DE GOLES Y ACTAS ===\n');
  const { data: teams } = await supabase.from('teams').select('*').not('ffcv_group_id', 'is', null).order('name');
  
  const ourFfcvMatches = [];
  for (const team of teams) {
    const { data: gMatches } = await supabase
      .from('ffcv_matches')
      .select('*')
      .eq('ffcv_group_id', team.ffcv_group_id)
      .not('home_score', 'is', null)
      .order('matchday');

    const teamPlayed = (gMatches || []).filter(m => {
      const isId = String(m.home_team_ffcv_id) === String(team.ffcv_team_id) || String(m.away_team_ffcv_id) === String(team.ffcv_team_id);
      const isName = normalizeName(m.home_team_name).includes('saladar') || normalizeName(m.away_team_name).includes('saladar');
      return isId || isName;
    });

    const seen = new Set();
    teamPlayed.forEach(m => {
      const k = m.codacta || m.id;
      if (!seen.has(k)) {
        seen.add(k);
        ourFfcvMatches.push({
          ...m,
          ourTeamId: team.id,
          ourTeamName: team.name,
          ourFfcvTeamId: team.ffcv_team_id,
          category: team.category
        });
      }
    });
  }

  console.log(`Total partidos oficiales analizados: ${ourFfcvMatches.length}`);

  const goalDiscrepancies = [];
  const ownGoalEvents = [];
  const allMatchGoals = [];

  for (const m of ourFfcvMatches) {
    const isHome = String(m.home_team_ffcv_id) === String(m.ourFfcvTeamId) || normalizeName(m.home_team_name).includes('saladar');
    const myOfficialGoals = isHome ? m.home_score : m.away_score;
    const rivalOfficialGoals = isHome ? m.away_score : m.home_score;
    
    if (!m.codacta) continue;
    const acta = await fetchMatchDetails(m.codacta);
    if (!acta) {
      console.log(`Error al descargar acta ${m.codacta}`);
      continue;
    }

    const ourGoals = (isHome ? acta.goles_equipo_local : acta.goles_equipo_visitante) || [];
    const rivalGoals = (isHome ? acta.goles_equipo_visitante : acta.goles_equipo_local) || [];
    const ourRoster = (isHome ? acta.jugadores_equipo_local : acta.jugadores_equipo_visitante) || [];

    // Check every goal event in our team and rival team
    ourGoals.forEach(g => {
      allMatchGoals.push({
        team: m.ourTeamName,
        matchday: m.matchday,
        codacta: m.codacta,
        isOurTeam: true,
        goal: g
      });
      const gType = (g.tipo_gol || g.tipo || '').toLowerCase();
      const desc = (g.descripcion || '').toLowerCase();
      if (gType.includes('propia') || gType.includes('propio') || gType.includes('p.p.') || desc.includes('propia')) {
        ownGoalEvents.push({ team: m.ourTeamName, matchday: m.matchday, codacta: m.codacta, g });
      }
    });

    rivalGoals.forEach(g => {
      const gType = (g.tipo_gol || g.tipo || '').toLowerCase();
      const desc = (g.descripcion || '').toLowerCase();
      if (gType.includes('propia') || gType.includes('propio') || gType.includes('p.p.') || desc.includes('propia')) {
        ownGoalEvents.push({ team: m.ourTeamName, matchday: m.matchday, codacta: m.codacta, rivalOwnGoal: true, g });
      }
    });

    if (myOfficialGoals !== ourGoals.length) {
      goalDiscrepancies.push({
        team: m.ourTeamName,
        matchday: m.matchday,
        date: m.match_date,
        homeTeam: m.home_team_name,
        awayTeam: m.away_team_name,
        codacta: m.codacta,
        myOfficialGoals,
        rivalOfficialGoals,
        ourGoalsCountInActa: ourGoals.length,
        rivalGoalsCountInActa: rivalGoals.length,
        diff: myOfficialGoals - ourGoals.length,
        ourGoalsEvents: ourGoals,
        rivalGoalsEvents: rivalGoals
      });
    }

    await new Promise(r => setTimeout(r, 20));
  }

  console.log('\n--- PROPIAS PUERTAS DETECTADAS EN EVENTOS ---');
  console.log(JSON.stringify(ownGoalEvents, null, 2));

  console.log(`\n--- PARTIDOS CON DISCREPANCIA ENTRE MARCADOR OFICIAL Y EVENTOS EN ACTA (${goalDiscrepancies.length} partidos) ---`);
  goalDiscrepancies.forEach((d, idx) => {
    console.log(`\n[${idx + 1}] Equipo: ${d.team} | J${d.matchday} | ${d.date} | Codacta: ${d.codacta}`);
    console.log(`    Partido: ${d.homeTeam} vs ${d.awayTeam}`);
    console.log(`    Marcador Oficial Saladar: ${d.myOfficialGoals} | Eventos de Gol Saladar en Acta: ${d.ourGoalsCountInActa} | Diferencia: ${d.diff}`);
    console.log(`    Goles Saladar en Acta:`, JSON.stringify(d.ourGoalsEvents));
    console.log(`    Goles Rival en Acta:`, JSON.stringify(d.rivalGoalsEvents));
  });

  fs.writeFileSync(path.join(__dirname, 'goal_audit_deep_results.json'), JSON.stringify({
    goalDiscrepancies,
    ownGoalEvents,
    allMatchGoalsSample: allMatchGoals.slice(0, 10)
  }, null, 2));

  console.log('\nResultados exportados a goal_audit_deep_results.json');
}

run();
