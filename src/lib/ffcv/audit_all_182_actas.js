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

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const customFetch = (fetchUrl, options = {}) => {
  return new Promise((resolve, reject) => {
    const u = new URL(fetchUrl);
    const headers = {};
    if (options.headers) {
      if (typeof options.headers.forEach === 'function') {
        options.headers.forEach((v, k) => { headers[k] = v; });
      } else if (typeof options.headers.entries === 'function') {
        for (const [k, v] of options.headers.entries()) {
          headers[k] = v;
        }
      } else if (Array.isArray(options.headers)) {
        options.headers.forEach(([k, v]) => { headers[k] = v; });
      } else {
        Object.assign(headers, options.headers);
      }
    }
    if (!headers['apikey']) headers['apikey'] = key;
    if (!headers['Authorization'] && !headers['authorization']) headers['Authorization'] = `Bearer ${key}`;

    const req = https.request({
      protocol: u.protocol,
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: headers,
      agent: httpsAgent,
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusMessage,
          json: async () => JSON.parse(body),
          text: async () => body,
          headers: {
            get: (h) => res.headers[h.toLowerCase()]
          }
        });
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
};

const supabase = createClient(url, key, {
  auth: { persistSession: false },
  global: { fetch: customFetch }
});

const ffcvAgent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });

async function fetchMatchDetails(matchId) {
  return new Promise((resolve, reject) => {
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
    }).on('error', (err) => {
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

function getCategoryDuration(teamCategory, teamName) {
  const norm = (teamName + ' ' + (teamCategory || '')).toLowerCase();
  if (norm.includes('infantil')) return 70;
  if (norm.includes('cadete')) return 80;
  if (norm.includes('alevin') || norm.includes('benjamin') || norm.includes('prebenjamin')) return 60;
  return 90; // Senior, Juvenil
}

async function main() {
  console.log('=== AUDITORIA COMPLETA DE TODAS LAS 182 ACTAS FFCV 2025/26 ===\n');

  console.log('Supabase URL:', url);
  console.log('Supabase key length:', key ? key.length : 0);

  // 1. Get 7 teams and all players
  const { data: teams, error: tErr } = await supabase
    .from('teams')
    .select('*')
    .order('name');

  if (tErr) console.error('Error fetching teams:', tErr);
  console.log(`Teams found: ${teams ? teams.length : 0}`);
  if (teams && teams.length > 0) {
    console.log('Sample team:', { id: teams[0].id, name: teams[0].name, ffcv_team_id: teams[0].ffcv_team_id, ffcv_group_id: teams[0].ffcv_group_id });
  }

  const { data: allPlayersData, error: pErr } = await supabase
    .from('players')
    .select('id, first_name, last_name, dorsal, team_id, license_number');

  if (pErr) console.error('Error fetching players:', pErr);

  const allPlayers = allPlayersData || [];
  const teamFfcvIds = (teams || []).map(t => String(t.ffcv_team_id)).filter(Boolean);
  console.log(`Total jugadores en BD: ${allPlayers.length}`);

  // 2. Fetch all internal matches ('partidos')
  const { data: allPartidosData, error: partErr } = await supabase
    .from('partidos')
    .select('*');

  if (partErr) console.error('Error fetching partidos:', partErr);
  const allPartidos = allPartidosData || [];
  console.log(`Total partidos internos en BD: ${allPartidos.length}`);

  // 3. Fetch all FFCV matches for the 7 teams
  const ourFfcvMatches = [];
  for (const team of teams) {
    if (!team.ffcv_group_id) continue;
    const { data: gMatches, error: gmErr } = await supabase
      .from('ffcv_matches')
      .select('*')
      .eq('ffcv_group_id', team.ffcv_group_id)
      .not('home_score', 'is', null)
      .order('matchday');

    if (gmErr) console.error(`Error fetching group ${team.ffcv_group_id}:`, gmErr);

    const teamPlayed = (gMatches || []).filter(m => {
      const isId = String(m.home_team_ffcv_id) === String(team.ffcv_team_id) || String(m.away_team_ffcv_id) === String(team.ffcv_team_id);
      const isName = normalizeName(m.home_team_name).includes('saladar') || normalizeName(m.away_team_name).includes('saladar');
      return isId || isName;
    });

    // De-duplicate by codacta or id
    const seen = new Set();
    teamPlayed.forEach(m => {
      const k = m.codacta || m.id;
      if (!seen.has(k)) {
        seen.add(k);
        ourFfcvMatches.push({ ...m, ourTeamId: team.id, ourTeamName: team.name });
      }
    });
  }

  console.log(`Total partidos FFCV disputados del club: ${ourFfcvMatches.length}\n`);

  // --- PARTE 1: AUDITORIA DE DUPLICADOS Y ORIGEN DE LOS 305 PARTIDOS ---
  console.log('================================================================');
  console.log('PARTE 1: AUDITORIA DE PARTIDOS, DUPLICADOS Y ORIGEN ESTADISTICO');
  console.log('================================================================');

  // Breakdown of allPartidos by season and state
  const partidosBySeason = {};
  allPartidos.forEach(p => {
    const sId = p.season_id || 'sin_season';
    if (!partidosBySeason[sId]) partidosBySeason[sId] = { total: 0, jugados: 0, wins: 0, draws: 0, losses: 0, withFfcvId: 0 };
    partidosBySeason[sId].total++;
    if (p.resultado_propio !== null && p.resultado_rival !== null) {
      partidosBySeason[sId].jugados++;
      const gf = p.resultado_propio;
      const ga = p.resultado_rival;
      if (gf > ga) partidosBySeason[sId].wins++;
      else if (gf === ga) partidosBySeason[sId].draws++;
      else partidosBySeason[sId].losses++;
    }
    if (p.ffcv_match_id || p.codacta) {
      partidosBySeason[sId].withFfcvId++;
    }
  });

  console.log('\nPartidos internos agrupados por season_id:');
  console.table(partidosBySeason);

  // FFCV matches results breakdown
  let ffcvWins = 0;
  let ffcvDraws = 0;
  let ffcvLosses = 0;
  ourFfcvMatches.forEach(m => {
    const isHome = teamFfcvIds.includes(String(m.home_team_ffcv_id));
    const gf = isHome ? m.home_score : m.away_score;
    const ga = isHome ? m.away_score : m.home_score;
    if (gf > ga) ffcvWins++;
    else if (gf === ga) ffcvDraws++;
    else ffcvLosses++;
  });

  console.log(`\nPartidos FFCV disputados: ${ourFfcvMatches.length}`);
  console.log(`FFCV Victorias: ${ffcvWins}, Empates: ${ffcvDraws}, Derrotas: ${ffcvLosses}`);

  // Link internal partidos with FFCV matches
  let linkedCount = 0;
  let internalOnlyCount = 0;
  const linkedFfcvMatchIds = new Set();

  allPartidos.forEach(p => {
    let matchedFfcv = null;
    if (p.ffcv_match_id) {
      matchedFfcv = ourFfcvMatches.find(m => String(m.id) === String(p.ffcv_match_id) || String(m.codacta) === String(p.ffcv_match_id));
    }
    if (!matchedFfcv && p.codacta) {
      matchedFfcv = ourFfcvMatches.find(m => String(m.codacta) === String(p.codacta));
    }
    if (!matchedFfcv) {
      // match by team, matchday / date
      matchedFfcv = ourFfcvMatches.find(m => {
        const team = teams.find(t => t.id === p.equipo_id);
        if (!team) return false;
        const isTeamMatch = String(m.home_team_ffcv_id) === String(team.ffcv_team_id) || String(m.away_team_ffcv_id) === String(team.ffcv_team_id);
        if (!isTeamMatch) return false;
        if (p.jornada && m.matchday && String(p.jornada) === String(m.matchday)) return true;
        if (p.fecha && m.date && p.fecha === m.date) return true;
        return false;
      });
    }

    if (matchedFfcv) {
      linkedCount++;
      linkedFfcvMatchIds.add(matchedFfcv.id || matchedFfcv.codacta);
    } else {
      internalOnlyCount++;
    }
  });

  const ffcvOnlyCount = ourFfcvMatches.length - linkedFfcvMatchIds.size;
  const totalUniqueMatches = internalOnlyCount + ourFfcvMatches.length;

  console.log('\n--- TABLA DE AUDITORIA DE PARTIDOS ---');
  console.table([
    { 'Categoria': 'Partidos internos (partidos)', 'Cantidad': allPartidos.length },
    { 'Categoria': 'Partidos FFCV disputados (ffcv_matches)', 'Cantidad': ourFfcvMatches.length },
    { 'Categoria': 'Partidos vinculados entre ambas fuentes', 'Cantidad': linkedCount },
    { 'Categoria': 'Partidos internos unicos (sin FFCV)', 'Cantidad': internalOnlyCount },
    { 'Categoria': 'Partidos FFCV unicos (sin interno)', 'Cantidad': ffcvOnlyCount },
    { 'Categoria': 'Total real de partidos deportivos disputados', 'Cantidad': totalUniqueMatches }
  ]);

  // --- PARTE 2: AUDITORIA DE TODAS LAS 182 ACTAS FFCV ---
  console.log('\n================================================================');
  console.log('PARTE 2: PROCESAMIENTO DE LAS 182 ACTAS FFCV (MINUTOS, GOLES, TARJETAS)');
  console.log('================================================================');

  const teamAuditResults = {};
  const globalPlayerStats = new Map(); // Map: playerId -> stats
  const unlinkedPlayers = [];
  const doubtfulPlayers = [];

  for (const team of (teams || [])) {
    if (!team.ffcv_team_id) continue;
    console.log(`Procesando equipo: ${team.name} (${team.category || 'Senior/Juvenil'})...`);
    const teamPlayers = allPlayers.filter(p => p.team_id === team.id);
    const teamMatches = ourFfcvMatches.filter(m => String(m.home_team_ffcv_id) === String(team.ffcv_team_id) || String(m.away_team_ffcv_id) === String(team.ffcv_team_id));
    const duration = getCategoryDuration(team.category, team.name);

    let processedActas = 0;
    let actasWithErrors = 0;
    let totalTeamMinutes = 0;
    let totalTeamGoals = 0;
    let totalTeamYellows = 0;
    let totalTeamReds = 0;
    const teamPlayerMap = new Map();

    for (const match of teamMatches) {
      if (!match.codacta) {
        actasWithErrors++;
        continue;
      }

      const isOurTeamHome = String(match.home_team_ffcv_id) === String(team.ffcv_team_id) || normalizeName(match.home_team_name).includes('saladar');
      const acta = await fetchMatchDetails(match.codacta);

      if (!acta) {
        actasWithErrors++;
        continue;
      }

      processedActas++;

      const ourRoster = (isOurTeamHome ? acta.jugadores_equipo_local : acta.jugadores_equipo_visitante) || [];
      const ourGoals = (isOurTeamHome ? acta.goles_equipo_local : acta.goles_equipo_visitante) || [];
      const ourCards = (isOurTeamHome ? acta.tarjetas_equipo_local : acta.tarjetas_equipo_visitante) || [];
      const ourSubs = (isOurTeamHome ? acta.sustituciones_equipo_local : acta.sustituciones_equipo_visitante) || [];

      for (const ffcvPlayer of ourRoster) {
        const ffcvName = ffcvPlayer.nombre_jugador || ffcvPlayer.nombre || ffcvPlayer.jugador || '';
        const ffcvDorsal = ffcvPlayer.dorsal ? parseInt(ffcvPlayer.dorsal, 10) : null;
        const isTitular = String(ffcvPlayer.titular) === '1' || ffcvPlayer.titular === 1 || ffcvPlayer.titular === true;

        const normFfcv = normalizeName(ffcvName);

        // Find match in teamPlayers
        let matchedPlayer = teamPlayers.find(p => {
          const dbFull = normalizeName(`${p.first_name || ''} ${p.last_name || ''}`);
          return dbFull === normFfcv;
        });

        if (!matchedPlayer) {
          const wordsFfcv = normFfcv.split(' ').filter(w => w.length > 2);
          const candidates = teamPlayers.filter(p => {
            const dbFull = normalizeName(`${p.first_name || ''} ${p.last_name || ''}`);
            const wordsDb = dbFull.split(' ').filter(w => w.length > 2);
            const common = wordsFfcv.filter(w => wordsDb.includes(w));
            return common.length >= 2;
          });

          if (candidates.length === 1) {
            matchedPlayer = candidates[0];
          } else if (candidates.length > 1) {
            const byDorsal = candidates.find(c => c.dorsal === ffcvDorsal);
            if (byDorsal) {
              matchedPlayer = byDorsal;
            } else {
              matchedPlayer = candidates[0];
              doubtfulPlayers.push({ ffcvName, ffcvDorsal, team: team.name, match: match.codacta, candidates: candidates.map(c => `${c.first_name} ${c.last_name}`) });
            }
          } else {
            const globalCandidates = allPlayers.filter(p => {
              const dbFull = normalizeName(`${p.first_name || ''} ${p.last_name || ''}`);
              const wordsDb = dbFull.split(' ').filter(w => w.length > 2);
              const common = wordsFfcv.filter(w => wordsDb.includes(w));
              return common.length >= 2;
            });
            if (globalCandidates.length === 1) {
              matchedPlayer = globalCandidates[0];
            } else {
              unlinkedPlayers.push({ ffcvName, ffcvDorsal, team: team.name, match: match.codacta });
            }
          }
        }

        // Calculate minutes
        let minutes = 0;
        const subIn = ourSubs.find(s => {
          const nameEntra = normalizeName(s.jugador_entra || s.nombre_entra || '');
          return nameEntra && (nameEntra === normFfcv || normFfcv.includes(nameEntra) || nameEntra.includes(normFfcv));
        });
        const subOut = ourSubs.find(s => {
          const nameSale = normalizeName(s.jugador_sale || s.nombre_sale || '');
          return nameSale && (nameSale === normFfcv || normFfcv.includes(nameSale) || nameSale.includes(normFfcv));
        });

        const minIn = subIn ? parseInt(subIn.minuto, 10) : null;
        const minOut = subOut ? parseInt(subOut.minuto, 10) : null;

        if (isTitular) {
          if (minOut !== null && !isNaN(minOut)) {
            minutes = Math.min(duration, Math.max(0, minOut));
          } else {
            minutes = duration;
          }
        } else {
          if (minIn !== null && !isNaN(minIn)) {
            if (minOut !== null && !isNaN(minOut)) {
              minutes = Math.max(0, minOut - minIn);
            } else {
              minutes = Math.max(0, duration - minIn);
            }
          } else {
            minutes = 0;
          }
        }

        // Calculate goals
        const goals = ourGoals.filter(g => {
          const gName = normalizeName(g.nombre_jugador || g.jugador || g.nombre || '');
          return gName && (gName === normFfcv || normFfcv.includes(gName) || gName.includes(normFfcv));
        }).length;

        // Calculate cards
        const playerCards = ourCards.filter(c => {
          const cName = normalizeName(c.nombre_jugador || c.jugador || c.nombre || '');
          return cName && (cName === normFfcv || normFfcv.includes(cName) || cName.includes(normFfcv));
        });

        let yellowCards = 0;
        let redCards = 0;
        playerCards.forEach(c => {
          const isRed = c.codigo_tipo_amonestacion === '2' || c.tipo_tarjeta === 'roja' || c.tarjeta === 'roja' || c.segunda_amarilla === '1';
          if (isRed) redCards++;
          else yellowCards++;
        });

        totalTeamMinutes += minutes;
        totalTeamGoals += goals;
        totalTeamYellows += yellowCards;
        totalTeamReds += redCards;

        const pKey = matchedPlayer ? matchedPlayer.id : normFfcv;
        const pDisplayName = matchedPlayer ? `${matchedPlayer.first_name} ${matchedPlayer.last_name}` : ffcvName;

        if (!teamPlayerMap.has(pKey)) {
          teamPlayerMap.set(pKey, {
            id: matchedPlayer?.id || null,
            name: pDisplayName,
            dorsal: matchedPlayer?.dorsal || ffcvDorsal,
            team: team.name,
            teamId: team.id,
            matches: 0,
            starts: 0,
            minutes: 0,
            goals: 0,
            yellows: 0,
            reds: 0
          });
        }

        const pStat = teamPlayerMap.get(pKey);
        pStat.matches += 1;
        if (isTitular) pStat.starts += 1;
        pStat.minutes += minutes;
        pStat.goals += goals;
        pStat.yellows += yellowCards;
        pStat.reds += redCards;

        if (matchedPlayer) {
          if (!globalPlayerStats.has(matchedPlayer.id)) {
            globalPlayerStats.set(matchedPlayer.id, {
              id: matchedPlayer.id,
              name: pDisplayName,
              dorsal: matchedPlayer.dorsal,
              team: team.name,
              teamId: team.id,
              matches: 0,
              starts: 0,
              minutes: 0,
              goals: 0,
              yellows: 0,
              reds: 0
            });
          }
          const gStat = globalPlayerStats.get(matchedPlayer.id);
          gStat.matches += 1;
          if (isTitular) gStat.starts += 1;
          gStat.minutes += minutes;
          gStat.goals += goals;
          gStat.yellows += yellowCards;
          gStat.reds += redCards;
        }
      }

      await new Promise(r => setTimeout(r, 25));
    }

    teamAuditResults[team.name] = {
      teamName: team.name,
      teamId: team.id,
      totalPlayed: teamMatches.length,
      processedActas,
      actasWithErrors,
      totalTeamMinutes,
      totalTeamGoals,
      totalTeamYellows,
      totalTeamReds,
      players: Array.from(teamPlayerMap.values())
    };
  }

  const auditReport = {
    generatedAt: new Date().toISOString(),
    teams: teamAuditResults,
    globalPlayers: Array.from(globalPlayerStats.values()),
    unlinkedPlayers,
    doubtfulPlayers
  };
  fs.writeFileSync(path.join(__dirname, 'audit_report_full.json'), JSON.stringify(auditReport, null, 2));

  console.log('\n=== RESUMEN DE ESTADISTICAS OFICIALES FFCV POR EQUIPO ===');
  const summaryRows = Object.values(teamAuditResults).map(t => ({
    Equipo: t.teamName,
    'Partidos Jugados': t.totalPlayed,
    'Actas Procesadas': t.processedActas,
    'Errores': t.actasWithErrors,
    'Minutos Totales': t.totalTeamMinutes,
    'Goles Totales': t.totalTeamGoals,
    'Amarillas': t.totalTeamYellows,
    'Rojas': t.totalTeamReds,
    'Jugadores con stats': t.players.length
  }));
  console.table(summaryRows);

  console.log('\n=== JUGADORES TOP DE CADA EQUIPO (REALES DE TODAS LAS 182 ACTAS FFCV) ===');
  const topPlayers = [];
  Object.values(teamAuditResults).forEach(t => {
    const sortedMinutes = [...t.players].sort((a, b) => b.minutes - a.minutes);
    const sortedGoals = [...t.players].sort((a, b) => b.goals - a.goals);
    const sortedYellows = [...t.players].sort((a, b) => b.yellows - a.yellows);

    const maxMin = sortedMinutes[0] || {};
    const maxGoal = sortedGoals[0] || {};

    topPlayers.push({
      Equipo: t.teamName,
      'Top Minutos': `${maxMin.name || '-'} (${maxMin.minutes || 0}')`,
      'Top Goleador': `${maxGoal.name || '-'} (${maxGoal.goals || 0} goles)`,
      'Top Amarillas': `${sortedYellows[0]?.name || '-'} (${sortedYellows[0]?.yellows || 0} TA)`
    });
  });
  console.table(topPlayers);

  console.log('\n=== TOP 10 GOLEADORES DE TODO EL CLUB (2025/26) ===');
  const allClubPlayers = Array.from(globalPlayerStats.values());
  const topClubScorers = [...allClubPlayers].sort((a, b) => b.goals - a.goals).slice(0, 10);
  console.table(topClubScorers.map(p => ({ Jugador: p.name, Equipo: p.team, Goles: p.goals, Partidos: p.matches, Minutos: p.minutes })));

  console.log('\n=== TOP 10 MINUTOS DE TODO EL CLUB (2025/26) ===');
  const topClubMinutes = [...allClubPlayers].sort((a, b) => b.minutes - a.minutes).slice(0, 10);
  console.table(topClubMinutes.map(p => ({ Jugador: p.name, Equipo: p.team, Minutos: p.minutes, Partidos: p.matches, Titular: p.starts })));

  console.log(`\nJugadores sin vincular: ${unlinkedPlayers.length}`);
  console.log(`Jugadores dudosos: ${doubtfulPlayers.length}`);
}

main().catch(console.error);
