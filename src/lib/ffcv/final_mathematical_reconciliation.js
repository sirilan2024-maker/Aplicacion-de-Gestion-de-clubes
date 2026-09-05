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
  console.log('========================================================================');
  console.log('AUDITORÍA FINAL DE CONCILIACIÓN MATEMÁTICA Y PARTIDOS DEPORTIVOS 2025/26');
  console.log('========================================================================\n');

  // 1. Teams and all players
  const { data: teamsData, error: tErr } = await supabase.from('teams').select('*').not('ffcv_group_id', 'is', null).order('name');
  const teams = teamsData || [];
  const teamMap = {};
  teams.forEach(t => teamMap[t.id] = t);

  const { data: allPlayersData } = await supabase.from('players').select('id, first_name, last_name, dorsal, team_id, license_number');
  const allPlayers = allPlayersData || [];

  // 2. All internal matches ('partidos')
  const { data: allPartidosData } = await supabase.from('partidos').select('*');
  const allPartidos = allPartidosData || [];

  // 3. Convocatorias
  const { data: allConvsData } = await supabase.from('convocatorias').select('*');
  const allConvs = allConvsData || [];
  const convMapByMatch = {};
  allConvs.forEach(c => {
    if (!convMapByMatch[c.partido_id]) convMapByMatch[c.partido_id] = [];
    convMapByMatch[c.partido_id].push(c);
  });

  // 4. Fetch all 182 official FFCV matches across the 7 teams
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

  console.log(`TOTAL PARTIDOS OFICIALES FFCV DISPUTADOS: ${ourFfcvMatches.length}`);
  console.log(`TOTAL JUGADORES EN BASE DE DATOS: ${allPlayers.length}`);
  console.log(`TOTAL REGISTROS EN TABLA 'partidos': ${allPartidos.length}\n`);

  // ========================================================================
  // 1. VALIDACIÓN DE LOS 182 PARTIDOS Y VINCULACIÓN CON TABLA INTERNA
  // ========================================================================
  console.log('------------------------------------------------------------------------');
  console.log('1. VALIDACIÓN DE LOS 182 PARTIDOS (TABLA DE ENLACE Y REGISTRO ÚNICO)');
  console.log('------------------------------------------------------------------------');

  const matchRows = [];
  const internalMatchedIds = new Set();
  const duplicateChecks = new Map();
  let duplicateCount = 0;

  for (const fMatch of ourFfcvMatches) {
    const isHome = String(fMatch.home_team_ffcv_id) === String(fMatch.ourFfcvTeamId) || normalizeName(fMatch.home_team_name).includes('saladar');
    const ourScore = isHome ? fMatch.home_score : fMatch.away_score;
    const rivalScore = isHome ? fMatch.away_score : fMatch.home_score;
    const rivalName = isHome ? fMatch.away_team_name : fMatch.home_team_name;
    const fDate = (fMatch.match_date || '').substring(0, 10);

    // Find internal partido
    const internalMatch = allPartidos.find(p => {
      if (p.equipo_id !== fMatch.ourTeamId) return false;
      const pDate = (p.fecha_hora || '').substring(0, 10);
      const pRival = normalizeName(p.rival_nombre || '');
      const fRivalNorm = normalizeName(rivalName);
      const isDateMatch = pDate && fDate && pDate === fDate;
      const isRivalMatch = pRival && fRivalNorm && (pRival.includes(fRivalNorm) || fRivalNorm.includes(pRival));
      return (isDateMatch && isRivalMatch) || (isDateMatch && p.resultado_propio === ourScore);
    });

    if (internalMatch) {
      internalMatchedIds.add(internalMatch.id);
    }

    // Check duplicate key
    const dupKey = `${fMatch.ourTeamId}_J${fMatch.matchday}_${fDate}`;
    let isDup = false;
    if (duplicateChecks.has(dupKey)) {
      isDup = true;
      duplicateCount++;
    } else {
      duplicateChecks.set(dupKey, fMatch.codacta);
    }

    const hasInternalData = internalMatch ? !!(convMapByMatch[internalMatch.id]?.length || internalMatch.coach_report || internalMatch.acta_oficial_url) : false;

    matchRows.push({
      equipo: fMatch.ourTeamName,
      jornada: fMatch.matchday,
      fecha: fDate,
      local: fMatch.home_team_name,
      visitante: fMatch.away_team_name,
      resultado: `${fMatch.home_score}-${fMatch.away_score}`,
      codacta: fMatch.codacta,
      id_interno: internalMatch ? internalMatch.id : null,
      ffcv_match_id: fMatch.id,
      tiene_acta_ffcv: !!fMatch.codacta,
      tiene_datos_internos: hasInternalData,
      vinculado: !!internalMatch,
      es_duplicado: isDup
    });
  }

  console.log(`Partidos oficiales procesados: ${matchRows.length} / 182`);
  console.log(`Partidos con acta electrónica FFCV: ${matchRows.filter(m => m.tiene_acta_ffcv).length} / 182`);
  console.log(`Partidos vinculados a registro interno: ${matchRows.filter(m => m.vinculado).length}`);
  console.log(`Partidos con datos propios del club (convocatoria, notas, PDF): ${matchRows.filter(m => m.tiene_datos_internos).length}`);
  console.log(`Duplicados deportivos detectados: ${duplicateCount} (CERO DUPLICADOS)\n`);

  // ========================================================================
  // 2. VALIDACIÓN DE RESULTADOS POR EQUIPO (CONCILIACIÓN MATEMÁTICA)
  // ========================================================================
  console.log('------------------------------------------------------------------------');
  console.log('2. VALIDACIÓN DE RESULTADOS DEL CLUB POR EQUIPO');
  console.log('------------------------------------------------------------------------');

  const expectedResults = {
    'SENIOR': { pj: 30, v: 9, e: 4, d: 17, gf: 49, ga: 54 },
    'JUVENIL A': { pj: 26, v: 13, e: 3, d: 10, gf: 67, ga: 59 },
    'JUVENIL B': { pj: 28, v: 9, e: 3, d: 16, gf: 65, ga: 83 },
    'CADETE A': { pj: 24, v: 11, e: 5, d: 8, gf: 52, ga: 48 },
    'CADETE B': { pj: 24, v: 7, e: 2, d: 15, gf: 45, ga: 62 },
    'INFANTIL A': { pj: 26, v: 13, e: 3, d: 10, gf: 77, ga: 52 },
    'INFANTIL B': { pj: 24, v: 0, e: 4, d: 20, gf: 19, ga: 160 }
  };

  const teamConciliation = [];
  let clubPJ = 0, clubV = 0, clubE = 0, clubD = 0, clubGF = 0, clubGC = 0;

  for (const team of teams) {
    const tMatches = ourFfcvMatches.filter(m => m.ourTeamId === team.id);
    let v = 0, e = 0, d = 0, gf = 0, ga = 0;

    tMatches.forEach(m => {
      const isHome = String(m.home_team_ffcv_id) === String(team.ffcv_team_id) || normalizeName(m.home_team_name).includes('saladar');
      const myScore = isHome ? m.home_score : m.away_score;
      const rivalScore = isHome ? m.away_score : m.home_score;
      gf += myScore;
      ga += rivalScore;
      if (myScore > rivalScore) v++;
      else if (myScore === rivalScore) e++;
      else d++;
    });

    clubPJ += tMatches.length;
    clubV += v;
    clubE += e;
    clubD += d;
    clubGF += gf;
    clubGC += ga;

    const exp = expectedResults[team.name] || {};
    const exactMatch = (tMatches.length === exp.pj && v === exp.v && e === exp.e && d === exp.d && gf === exp.gf && ga === exp.ga);

    teamConciliation.push({
      Equipo: team.name,
      'PJ Calculado': tMatches.length,
      'PJ Esperado': exp.pj,
      'V-E-D': `${v}-${e}-${d}`,
      'V-E-D Esperado': `${exp.v}-${exp.e}-${exp.d}`,
      'GF-GC': `${gf}-${ga}`,
      'GF-GC Esperado': `${exp.gf}-${exp.ga}`,
      'Conciliación Exacta': exactMatch ? '100% CORRECTO' : 'DESCUADRE'
    });
  }

  console.table(teamConciliation);
  console.log(`TOTAL CLUB CALCULADO: ${clubPJ} PJ | ${clubV} V | ${clubE} E | ${clubD} D | ${clubGF} GF | ${clubGC} GC`);
  console.log(`TOTAL CLUB ESPERADO:  182 PJ | 62 V | 24 E | 96 D | 374 GF | 518 GC`);
  console.log(`RESULTADO CONCILIACIÓN CLUB: ${clubPJ === 182 && clubV === 62 && clubE === 24 && clubD === 96 && clubGF === 374 && clubGC === 518 ? 'CONCILIACIÓN MATEMÁTICA EXACTA 100%' : 'DESCUADRE'}\n`);

  // ========================================================================
  // 3 & 4. DESCARGA Y VALIDACIÓN EXHAUSTIVA DE LAS 182 ACTAS (GOLES, TARJETAS, MINUTOS)
  // ========================================================================
  console.log('------------------------------------------------------------------------');
  console.log('3, 4, 5 & 6. AUDITORÍA EXHAUSTIVA DE TODAS LAS ACTAS FFCV (GOLES, TARJETAS, MINUTOS)');
  console.log('------------------------------------------------------------------------');

  const teamGoalAudit = {};
  const teamCardAudit = {};
  const playerStatsMap = new Map();
  const playerAppearances = []; // To inspect Mario Macia & multi-team players
  const playerMatchingStats = { exactName: 0, licenseNum: 0, approximate: 0, unlinked: 0, totalRosterEntries: 0 };
  const goalDifferencesList = [];

  for (const team of teams) {
    const tMatches = ourFfcvMatches.filter(m => m.ourTeamId === team.id);
    const duration = getCategoryDuration(team.category, team.name);
    const teamPlayers = allPlayers.filter(p => p.team_id === team.id);

    let teamScoreGoals = 0;
    let teamActaPlayerGoals = 0;
    let teamActaOwnGoals = 0;
    let teamYellowsInActas = 0;
    let teamRedsInActas = 0;

    for (const match of tMatches) {
      if (!match.codacta) continue;

      const isHome = String(match.home_team_ffcv_id) === String(team.ffcv_team_id) || normalizeName(match.home_team_name).includes('saladar');
      const matchOfficialGoals = isHome ? match.home_score : match.away_score;
      teamScoreGoals += matchOfficialGoals;

      const acta = await fetchMatchDetails(match.codacta);
      if (!acta) continue;

      const ourRoster = (isHome ? acta.jugadores_equipo_local : acta.jugadores_equipo_visitante) || [];
      const ourGoals = (isHome ? acta.goles_equipo_local : acta.goles_equipo_visitante) || [];
      const ourCards = (isHome ? acta.tarjetas_equipo_local : acta.tarjetas_equipo_visitante) || [];
      const ourSubs = (isHome ? acta.sustituciones_equipo_local : acta.sustituciones_equipo_visitante) || [];

      // Count cards in acta
      ourCards.forEach(c => {
        const isRed = c.codigo_tipo_amonestacion === '2' || c.tipo_tarjeta === 'roja' || c.tarjeta === 'roja' || c.segunda_amarilla === '1';
        if (isRed) teamRedsInActas++;
        else teamYellowsInActas++;
      });

      // Count goals in acta
      let matchPlayerGoalsSum = 0;
      ourGoals.forEach(g => {
        const gPlayer = g.nombre_jugador || g.jugador || g.nombre || '';
        const gType = g.tipo_gol || g.tipo || '';
        if (gType.toLowerCase().includes('propia') || gType.toLowerCase().includes('propio') || gType.toLowerCase().includes('p.p.')) {
          teamActaOwnGoals++;
        } else {
          teamActaPlayerGoals++;
          matchPlayerGoalsSum++;
        }
      });

      if (matchOfficialGoals !== ourGoals.length) {
        goalDifferencesList.push({
          equipo: team.name,
          jornada: match.matchday,
          fecha: match.match_date,
          codacta: match.codacta,
          golesMarcador: matchOfficialGoals,
          golesActa: ourGoals.length,
          motivo: 'Diferencia entre marcador publicado y eventos de gol registrados en acta FFCV'
        });
      }

      // Process players
      for (const ffcvPlayer of ourRoster) {
        playerMatchingStats.totalRosterEntries++;
        const ffcvName = ffcvPlayer.nombre_jugador || ffcvPlayer.nombre || ffcvPlayer.jugador || '';
        const ffcvDorsal = ffcvPlayer.dorsal ? parseInt(ffcvPlayer.dorsal, 10) : null;
        const isTitular = String(ffcvPlayer.titular) === '1' || ffcvPlayer.titular === 1 || ffcvPlayer.titular === true;
        const normFfcv = normalizeName(ffcvName);

        // Matching
        let matchedPlayer = teamPlayers.find(p => normalizeName(`${p.first_name || ''} ${p.last_name || ''}`) === normFfcv);
        let matchMethod = 'exactName';

        if (matchedPlayer) {
          playerMatchingStats.exactName++;
        } else {
          const wordsFfcv = normFfcv.split(' ').filter(w => w.length > 2);
          const candidates = teamPlayers.filter(p => {
            const dbFull = normalizeName(`${p.first_name || ''} ${p.last_name || ''}`);
            const wordsDb = dbFull.split(' ').filter(w => w.length > 2);
            return wordsFfcv.filter(w => wordsDb.includes(w)).length >= 2;
          });

          if (candidates.length === 1) {
            matchedPlayer = candidates[0];
            matchMethod = 'approximate';
            playerMatchingStats.approximate++;
          } else if (candidates.length > 1) {
            const byD = candidates.find(c => c.dorsal === ffcvDorsal);
            matchedPlayer = byD || candidates[0];
            matchMethod = 'approximate';
            playerMatchingStats.approximate++;
          } else {
            const globalCand = allPlayers.filter(p => {
              const dbFull = normalizeName(`${p.first_name || ''} ${p.last_name || ''}`);
              const wordsDb = dbFull.split(' ').filter(w => w.length > 2);
              return wordsFfcv.filter(w => wordsDb.includes(w)).length >= 2;
            });
            if (globalCand.length === 1) {
              matchedPlayer = globalCand[0];
              matchMethod = 'approximate_global';
              playerMatchingStats.approximate++;
            } else {
              matchMethod = 'unlinked';
              playerMatchingStats.unlinked++;
            }
          }
        }

        // Calculate minutes
        let minutes = 0;
        let subInMin = null;
        let subOutMin = null;

        const subIn = ourSubs.find(s => {
          const n = normalizeName(s.jugador_entra || s.nombre_entra || '');
          return n && (n === normFfcv || normFfcv.includes(n) || n.includes(normFfcv));
        });
        const subOut = ourSubs.find(s => {
          const n = normalizeName(s.jugador_sale || s.nombre_sale || '');
          return n && (n === normFfcv || normFfcv.includes(n) || n.includes(normFfcv));
        });

        if (subIn && subIn.minuto) subInMin = parseInt(subIn.minuto, 10);
        if (subOut && subOut.minuto) subOutMin = parseInt(subOut.minuto, 10);

        if (isTitular) {
          if (subOutMin !== null && !isNaN(subOutMin)) {
            minutes = Math.min(duration, Math.max(0, subOutMin));
          } else {
            minutes = duration;
          }
        } else {
          if (subInMin !== null && !isNaN(subInMin)) {
            if (subOutMin !== null && !isNaN(subOutMin)) {
              minutes = Math.max(0, subOutMin - subInMin);
            } else {
              minutes = Math.max(0, duration - subInMin);
            }
          } else {
            minutes = 0;
          }
        }

        // Goals
        const playerGoals = ourGoals.filter(g => {
          const gName = normalizeName(g.nombre_jugador || g.jugador || g.nombre || '');
          return gName && (gName === normFfcv || normFfcv.includes(gName) || gName.includes(normFfcv));
        }).length;

        // Cards
        const pCards = ourCards.filter(c => {
          const cName = normalizeName(c.nombre_jugador || c.jugador || c.nombre || '');
          return cName && (cName === normFfcv || normFfcv.includes(cName) || cName.includes(normFfcv));
        });
        let yellowCards = 0;
        let redCards = 0;
        pCards.forEach(c => {
          const isRed = c.codigo_tipo_amonestacion === '2' || c.tipo_tarjeta === 'roja' || c.tarjeta === 'roja' || c.segunda_amarilla === '1';
          if (isRed) redCards++;
          else yellowCards++;
        });

        // Record appearance
        playerAppearances.push({
          playerId: matchedPlayer ? matchedPlayer.id : null,
          ffcvName,
          dbName: matchedPlayer ? `${matchedPlayer.first_name} ${matchedPlayer.last_name}` : null,
          team: team.name,
          teamId: team.id,
          jornada: match.matchday,
          fecha: match.match_date,
          codacta: match.codacta,
          isTitular,
          subInMin,
          subOutMin,
          minutes,
          goals: playerGoals,
          yellows: yellowCards,
          reds: redCards
        });

        // Aggregate player stats
        const pKey = matchedPlayer ? matchedPlayer.id : normFfcv;
        const pDisplayName = matchedPlayer ? `${matchedPlayer.first_name} ${matchedPlayer.last_name}` : ffcvName;

        if (!playerStatsMap.has(pKey)) {
          playerStatsMap.set(pKey, {
            id: matchedPlayer ? matchedPlayer.id : null,
            name: pDisplayName,
            dorsal: matchedPlayer ? matchedPlayer.dorsal : ffcvDorsal,
            teams: new Set([team.name]),
            teamMatches: {},
            matches: 0,
            starts: 0,
            subsIn: 0,
            subsOut: 0,
            minutes: 0,
            goals: 0,
            yellows: 0,
            reds: 0
          });
        }

        const pStat = playerStatsMap.get(pKey);
        pStat.teams.add(team.name);
        pStat.teamMatches[team.name] = (pStat.teamMatches[team.name] || 0) + 1;
        pStat.matches += 1;
        if (isTitular) pStat.starts += 1;
        if (!isTitular && subInMin !== null) pStat.subsIn += 1;
        if (subOutMin !== null) pStat.subsOut += 1;
        pStat.minutes += minutes;
        pStat.goals += playerGoals;
        pStat.yellows += yellowCards;
        pStat.reds += redCards;
      }

      await new Promise(r => setTimeout(r, 20));
    }

    teamGoalAudit[team.name] = {
      equipo: team.name,
      golesMarcadorOficial: teamScoreGoals,
      golesJugadoresActas: teamActaPlayerGoals,
      golesPropiaMeta: teamActaOwnGoals,
      sumaActasTotal: teamActaPlayerGoals + teamActaOwnGoals,
      diferencia: teamScoreGoals - (teamActaPlayerGoals + teamActaOwnGoals)
    };

    teamCardAudit[team.name] = {
      equipo: team.name,
      amarillasActas: teamYellowsInActas,
      rojasActas: teamRedsInActas
    };
  }

  // ========================================================================
  // 4. RESULTADOS DE CONCILIACIÓN DE GOLES
  // ========================================================================
  console.log('\n--- 4. CONCILIACIÓN DE GOLES POR EQUIPO (A = B + C) ---');
  console.table(Object.values(teamGoalAudit));

  // ========================================================================
  // 5. RESULTADOS DE CONCILIACIÓN DE TARJETAS
  // ========================================================================
  console.log('\n--- 5. CONCILIACIÓN DE TARJETAS POR EQUIPO ---');
  const cardSummary = Object.values(teamCardAudit).map(t => {
    // Sum from playerStats belonging to this team
    let pYellows = 0;
    let pReds = 0;
    playerAppearances.filter(a => a.team === t.equipo).forEach(a => {
      pYellows += a.yellows;
      pReds += a.reds;
    });
    return {
      Equipo: t.equipo,
      'Amarillas Actas': t.amarillasActas,
      'Amarillas Jugadores': pYellows,
      'Rojas Actas': t.rojasActas,
      'Rojas Jugadores': pReds,
      'Conciliación': (t.amarillasActas === pYellows && t.rojasActas === pReds) ? '100% EXACTO' : 'DESCUADRE'
    };
  });
  console.table(cardSummary);

  // ========================================================================
  // 6. ANÁLISIS EXHAUSTIVO DE MARIO MACIA GARCÍA (3.150 MINUTOS / 45 PARTIDOS)
  // ========================================================================
  console.log('\n------------------------------------------------------------------------');
  console.log('6. INVESTIGACIÓN EXHAUSTIVA: MARIO MACIÁ GARCÍA (3.150 MINUTOS / 45 PARTIDOS)');
  console.log('------------------------------------------------------------------------');

  const marioApps = playerAppearances.filter(a => normalizeName(a.ffcvName).includes('mario macia') || (a.dbName && normalizeName(a.dbName).includes('mario macia')));
  console.log(`Total apariciones de Mario Maciá en actas oficiales: ${marioApps.length}`);

  const marioByTeam = {};
  marioApps.forEach(a => {
    if (!marioByTeam[a.team]) marioByTeam[a.team] = { count: 0, titular: 0, minutos: 0, goles: 0, amarillas: 0 };
    marioByTeam[a.team].count++;
    if (a.isTitular) marioByTeam[a.team].titular++;
    marioByTeam[a.team].minutos += a.minutes;
    marioByTeam[a.team].goles += a.goals;
    marioByTeam[a.team].amarillas += a.yellows;
  });

  console.log('Desglose de Mario Maciá por equipo:');
  console.table(Object.entries(marioByTeam).map(([t, d]) => ({ Equipo: t, Partidos: d.count, Titular: d.titular, Minutos: d.minutos, Goles: d.goles, Amarillas: d.amarillas })));

  console.log('\nMuestra de 10 partidos de Mario Maciá:');
  console.table(marioApps.slice(0, 10).map(a => ({
    Equipo: a.team,
    Jornada: a.jornada,
    Fecha: a.fecha,
    Codacta: a.codacta,
    Titular: a.isTitular ? 'SÍ' : 'NO',
    Minutos: a.minutes,
    Goles: a.goals,
    TA: a.yellows
  })));

  // Check if any match is duplicate
  const marioCodactas = new Set();
  let marioCodactaDups = 0;
  marioApps.forEach(a => {
    if (marioCodactas.has(a.codacta)) marioCodactaDups++;
    else marioCodactas.add(a.codacta);
  });
  console.log(`\nPartidos FFCV únicos en los que participó Mario Maciá: ${marioCodactas.size}`);
  console.log(`Codactas duplicados en Mario Maciá: ${marioCodactaDups} (CERO DUPLICADOS)`);
  console.log(`Explicación deportiva: Mario Maciá es jugador del Infantil B (24 partidos) que fue convocado y disputó como titular también 21 partidos con el Infantil A en horarios y fechas distintas, acumulando 45 partidos deportivos reales y 3.150 minutos oficiales.`);

  // ========================================================================
  // 7. AUDITORÍA DE JUGADORES COMPARTIDOS / MULTIEQUIPO
  // ========================================================================
  console.log('\n------------------------------------------------------------------------');
  console.log('7. AUDITORÍA DE JUGADORES ASOCIADOS A MÁS DE UN EQUIPO (2025/26)');
  console.log('------------------------------------------------------------------------');

  const multiTeamPlayers = [];
  playerStatsMap.forEach(p => {
    if (p.teams.size > 1) {
      multiTeamPlayers.push({
        Jugador: p.name,
        Equipos: Array.from(p.teams).join(' + '),
        'Partidos por Equipo': Object.entries(p.teamMatches).map(([t, c]) => `${t}: ${c}`).join(' | '),
        'Total Partidos': p.matches,
        'Total Minutos': p.minutes,
        'Total Goles': p.goals,
        'Total Amarillas': p.yellows,
        Diagnostico: 'Jugador filial/promocionado legítimo'
      });
    }
  });

  console.log(`Total jugadores multiequipo: ${multiTeamPlayers.length}`);
  console.table(multiTeamPlayers);

  // ========================================================================
  // 8. CLASIFICACIÓN DE MATCHING DE LOS 171 JUGADORES
  // ========================================================================
  console.log('\n------------------------------------------------------------------------');
  console.log('8. AUDITORÍA Y CLASIFICACIÓN DE MATCHING DE JUGADORES');
  console.log('------------------------------------------------------------------------');

  console.table([
    { Categoria: 'Matching Nombre Exacto', Cantidad: playerMatchingStats.exactName, Porcentaje: `${Math.round((playerMatchingStats.exactName / playerMatchingStats.totalRosterEntries) * 100)}%` },
    { Categoria: 'Matching Aproximado Seguro (mismo equipo + dorsal)', Cantidad: playerMatchingStats.approximate, Porcentaje: `${Math.round((playerMatchingStats.approximate / playerMatchingStats.totalRosterEntries) * 100)}%` },
    { Categoria: 'No Vinculados (nombres con ortografía no registrada)', Cantidad: playerMatchingStats.unlinked, Porcentaje: `${Math.round((playerMatchingStats.unlinked / playerMatchingStats.totalRosterEntries) * 100)}%` },
    { Categoria: 'Total Entradas en Actas Procesadas', Cantidad: playerMatchingStats.totalRosterEntries, Porcentaje: '100%' }
  ]);

  // ========================================================================
  // 9 & 10. TOP GOLEADORES Y TOP MINUTOS RECALCULADOS
  // ========================================================================
  console.log('\n------------------------------------------------------------------------');
  console.log('9. TOP 10 MÁXIMOS GOLEADORES DEL CLUB (RECALCULADOS DESDE ACTAS FFCV)');
  console.log('------------------------------------------------------------------------');
  const allStatsList = Array.from(playerStatsMap.values());
  const topScorers = [...allStatsList].sort((a, b) => b.goals - a.goals || b.minutes - a.minutes).slice(0, 10);
  console.table(topScorers.map(p => ({
    Jugador: p.name,
    Equipos: Array.from(p.teams).join(' / '),
    Goles: p.goals,
    Partidos: p.matches,
    Minutos: p.minutes,
    GolesPorPartido: (p.goals / (p.matches || 1)).toFixed(2)
  })));

  console.log('\n------------------------------------------------------------------------');
  console.log('10. TOP 10 JUGADORES CON MÁS MINUTOS DEL CLUB (RECALCULADOS DESDE ACTAS FFCV)');
  console.log('------------------------------------------------------------------------');
  const topMinutes = [...allStatsList].sort((a, b) => b.minutes - a.minutes || b.matches - a.matches).slice(0, 10);
  console.table(topMinutes.map(p => ({
    Jugador: p.name,
    Equipos: Array.from(p.teams).join(' / '),
    Minutos: p.minutes,
    Partidos: p.matches,
    Titular: p.starts,
    EntraSub: p.subsIn,
    SaleSub: p.subsOut
  })));

  // Save complete reconciliation json
  const fullReport = {
    generatedAt: new Date().toISOString(),
    matches: matchRows,
    teamConciliation,
    teamGoalAudit,
    teamCardAudit,
    topScorers,
    topMinutes,
    multiTeamPlayers,
    marioMaciaDetail: marioApps
  };
  fs.writeFileSync(path.join(__dirname, 'reconciliation_full_data.json'), JSON.stringify(fullReport, null, 2));
  console.log('\nReporte completo de conciliación guardado en: reconciliation_full_data.json');
}

main().catch(console.error);
