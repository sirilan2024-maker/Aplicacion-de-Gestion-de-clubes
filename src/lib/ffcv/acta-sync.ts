import { createAdminClient } from '../supabase/admin';
import { fetchMatchDetails } from './client';
import { FFCVRawMatchDetails } from './types';

const ACTIVE_SEASON_ID = '663ed6ef-1dab-4350-9489-ed50f9e9ac15';
const CLOSED_SEASON_ID = '584f508a-fc1a-4339-b5b2-4296ffde2f4c';

/**
 * Normalizes words from a person's name for robust matching.
 * - Joins particles to the next word ("EL ORF" -> "elorf") so it matches "ELORF"
 * - Collapses repeated letters ("YOUSSEF" -> "yousef")
 */
const NAME_PARTICLES = new Set(['el', 'al', 'de', 'la', 'del', 'ben', 'ait', 'van', 'da', 'do']);
function normalizeNameWords(str: string): string[] {
  const raw = (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const joined: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    if (NAME_PARTICLES.has(raw[i]) && i + 1 < raw.length) {
      joined.push(raw[i] + raw[i + 1]);
      i++;
    } else {
      joined.push(raw[i]);
    }
  }

  return joined
    .map(w => w.replace(/(.)\1+/g, '$1'))
    .filter(w => w.length > 2);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

const NICKNAMES_MAP: Record<string, string[]> = {
  francisco: ['fran', 'paco', 'curro'],
  fran: ['francisco', 'paco'],
  paco: ['francisco'],
  jose: ['pepe', 'pep'],
  pepe: ['jose'],
  antonio: ['toni', 'tono'],
  toni: ['antonio'],
  manuel: ['manu', 'manolo'],
  manu: ['manuel'],
  alejandro: ['alex', 'ale'],
  alex: ['alejandro'],
  javier: ['javi'],
  javi: ['javier'],
  ignacio: ['nacho'],
  nacho: ['ignacio'],
  roberto: ['rober'],
  rober: ['roberto'],
  mohamed: ['mohammed', 'mohamd', 'moha', 'med'],
  mohammed: ['mohamed', 'mohamd', 'moha', 'med'],
  mohamd: ['mohamed', 'mohammed', 'moha', 'med'],
  atouzani: ['touzani'],
  touzani: ['atouzani'],
  khayefallah: ['khaef', 'allah', 'daghmani', 'khaefallah'],
  khaefallah: ['khayefallah', 'khaef', 'allah', 'daghmani'],
  daghmani: ['khayefallah', 'khaefallah'],
  serna: ['ballesta']
};

/** Two name words are equivalent if identical, aliases/nicknames, or (len>=4) 1 edit apart / substring */
function wordsEquivalent(a: string, b: string): boolean {
  if (a === b) return true;
  if (NICKNAMES_MAP[a]?.includes(b) || NICKNAMES_MAP[b]?.includes(a)) return true;
  if (a.length >= 4 && b.length >= 4) {
    if (a.includes(b) || b.includes(a)) return true;
    if (levenshtein(a, b) <= 1) return true;
  }
  return false;
}

function countCommonWords(a: string[], b: string[]): number {
  const used = new Set<number>();
  let common = 0;
  for (const w of a) {
    const idx = b.findIndex((x, i) => !used.has(i) && wordsEquivalent(w, x));
    if (idx >= 0) {
      used.add(idx);
      common++;
    }
  }
  return common;
}

/**
 * Matches an FFCV player to our internal database player
 */
function matchPlayer(
  ffcvName: string,
  dorsal: string | number | undefined,
  allPlayers: any[],
  teamPlayers: any[],
  isSeniorMatch: boolean = false
): any {
  const ffcvWords = normalizeNameWords(ffcvName);
  if (ffcvWords.length === 0) return null;

  // Extract first name and surnames from FFCV format: "APELLIDOS, NOMBRE"
  let ffcvFirstName = '';
  if (ffcvName.includes(',')) {
    const parts = ffcvName.split(',');
    ffcvFirstName = normalizeNameWords(parts[1] || '')[0] || '';
  }

  let bestPlayer = null;
  let bestScore = 0;

  // 1. Try matching against team players first (ACTIVE SEASON ONLY)
  for (const p of teamPlayers) {
    const dbWords = normalizeNameWords(`${p.first_name} ${p.last_name}`);
    const common = countCommonWords(ffcvWords, dbWords);
    let score = common * 3;
    if (dorsal && p.dorsal && String(p.dorsal) === String(dorsal)) score += 3;

    // Check first name compatibility if available
    const dbFirstName = normalizeNameWords(p.first_name || '')[0] || '';
    const firstNameMatches = ffcvFirstName && dbFirstName ? wordsEquivalent(ffcvFirstName, dbFirstName) : false;

    if (common >= 2 || (common >= 1 && (firstNameMatches || (dorsal && p.dorsal && String(p.dorsal) === String(dorsal))))) {
      if (score > bestScore) {
        bestScore = score;
        bestPlayer = p;
      }
    }
  }

  if (bestPlayer && bestScore >= 5) return bestPlayer;

  // 2. Try matching against all club players strictly in the active season (for lower/upper team call-ups)
  // STRICT RULES FOR CROSS-TEAM MATCHING:
  // - Require AT LEAST 2 common words (both first name and surname, or two surnames)
  // - NEVER match on dorsal alone or dorsal + 1 surname across different teams
  // - First name MUST NOT conflict
  // - An adult Senior player can NEVER be called down to a youth team (Juvenil, Cadete, etc.)
  let bestClubPlayer = null;
  let bestClubScore = 0;

  for (const p of allPlayers) {
    // If this is a youth match, an adult/senior player cannot be called up down
    if (!isSeniorMatch && (p.is_senior || p.teams?.name?.toUpperCase().includes('SENIOR') || p.teams?.category?.toUpperCase().includes('SENIOR'))) {
      continue;
    }

    const dbWords = normalizeNameWords(`${p.first_name} ${p.last_name}`);
    const common = countCommonWords(ffcvWords, dbWords);

    // Check first name compatibility
    const dbFirstName = normalizeNameWords(p.first_name || '')[0] || '';
    if (ffcvFirstName && dbFirstName && !wordsEquivalent(ffcvFirstName, dbFirstName)) {
      // First names conflict (e.g. Yerai vs Cristian) -> NEVER match
      continue;
    }

    if (common >= 2) {
      let score = common * 3;
      if (dorsal && p.dorsal && String(p.dorsal) === String(dorsal)) score += 2;
      if (score > bestClubScore) {
        bestClubScore = score;
        bestClubPlayer = p;
      }
    }
  }

  if (bestClubPlayer && bestClubScore >= 6) return bestClubPlayer;

  return null;
}

/**
 * Synchronizes an official FFCV electronic match report (acta) into the internal
 * 'convocatorias' table (lineup, minutes played, substitutions, yellow/red cards, goals)
 * and updates the internal 'partidos' record.
 */
export async function syncFFCVActaToConvocatorias(
  codacta: string,
  rawDetails?: FFCVRawMatchDetails,
  customSupabaseClient?: any
): Promise<{ success: boolean; syncedCount: number; error?: string }> {
  try {
    const supabase = customSupabaseClient || createAdminClient();

    let details = rawDetails;
    if (!details) {
      const fetched = await fetchMatchDetails({ matchId: codacta });
      if (fetched) details = fetched;
    }

    if (!details) {
      return { success: false, syncedCount: 0, error: `No match details found for codacta ${codacta}` };
    }

    // Determine if Saladar is home or away
    const localName = (details.equipo_local || '').toLowerCase();
    const awayName = (details.equipo_visitante || '').toLowerCase();
    const isHome = localName.includes('saladar') || localName.includes('sporting');
    const isAway = awayName.includes('saladar') || awayName.includes('sporting');

    // Strict guard: NEVER sync an acta if our club is neither home nor away
    if (!isHome && !isAway) {
      return { success: false, syncedCount: 0, error: `Acta #${codacta} does not involve Sporting Saladar (${details.equipo_local} vs ${details.equipo_visitante})` };
    }

    const isSaladarHome = isHome;
    const ourPlayers = isSaladarHome ? details.jugadores_equipo_local : details.jugadores_equipo_visitante;
    const ourCards = isSaladarHome ? (details.tarjetas_equipo_local || []) : (details.tarjetas_equipo_visitante || []);
    const ourSubs = isSaladarHome ? (details.sustituciones_equipo_local || []) : (details.sustituciones_equipo_visitante || []);
    const ourGoals = isSaladarHome ? (details.goles_equipo_local || []) : (details.goles_equipo_visitante || []);

    if (!ourPlayers || ourPlayers.length === 0) {
      return { success: true, syncedCount: 0, error: 'No players in acta lineup yet' };
    }

    // 1. Locate the internal match in 'partidos' (ACTIVE SEASON ONLY)
    let { data: matches } = await supabase
      .from('partidos')
      .select('id, equipo_id, rival_nombre, season_id, acta_oficial_url, fecha_hora, lugar')
      .neq('season_id', CLOSED_SEASON_ID)
      .eq('season_id', ACTIVE_SEASON_ID)
      .or(`acta_oficial_url.ilike.%CodPartido=${codacta}%,acta_oficial_url.ilike.%${codacta}%`);

    let partido = matches?.[0];

    // Fallback: match by team, rival, and date proximity if url not yet set
    if (!partido) {
      const { data: fm } = await supabase
        .from('ffcv_matches')
        .select('*')
        .neq('ffcv_season_id', '21')
        .eq('ffcv_match_id', codacta)
        .maybeSingle();

      const fmHome = (fm?.home_team_name || '').toLowerCase();
      const fmAway = (fm?.away_team_name || '').toLowerCase();
      const fmInvolvesSaladar = fmHome.includes('saladar') || fmAway.includes('saladar');

      if (fm && fmInvolvesSaladar && fm.match_date) {
        const { data: team } = await supabase
          .from('teams')
          .select('id, name')
          .neq('season_id', CLOSED_SEASON_ID)
          .eq('season_id', ACTIVE_SEASON_ID)
          .eq('ffcv_group_id', fm.ffcv_group_id)
          .maybeSingle();

        if (team) {
          const fmDate = new Date(fm.match_date).toISOString().split('T')[0];
          const fmRival = fmHome.includes('saladar') ? fmAway : fmHome;
          const { data: candidatePartidos } = await supabase
            .from('partidos')
            .select('id, equipo_id, rival_nombre, season_id, acta_oficial_url, fecha_hora, lugar')
            .neq('season_id', CLOSED_SEASON_ID)
            .eq('season_id', ACTIVE_SEASON_ID)
            .eq('equipo_id', team.id);

          partido = (candidatePartidos || []).find((p: any) => {
            const pDate = p.fecha_hora.split('T')[0];
            const diffDays = Math.abs((new Date(pDate).getTime() - new Date(fmDate).getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays > 7) return false;
            const pRival = (p.rival_nombre || '').toLowerCase();
            const words = pRival.split(' ').filter((w: string) => w.length > 3 && !w.includes('c.f.') && !w.includes('c.d.'));
            return words.some((w: string) => fmRival.includes(w));
          });
        }
      }
    }

    if (!partido) {
      return { success: false, syncedCount: 0, error: `No internal partido found for codacta ${codacta}` };
    }

    // 2. Load club players for matching (ACTIVE SEASON ONLY, NEVER 25/26, NEVER INACTIVE)
    const { data: activeTeams } = await supabase
      .from('teams')
      .select('id, name')
      .neq('season_id', CLOSED_SEASON_ID)
      .eq('season_id', ACTIVE_SEASON_ID);
    const activeTeamIds = (activeTeams || []).map((t: any) => t.id);

    const { data: allPlayers } = await supabase
      .from('players')
      .select('id, first_name, last_name, dorsal, team_id, status, is_senior, teams:teams(id, name, category)')
      .in('team_id', activeTeamIds)
      .neq('status', 'inactive');

    const matchTeam = (activeTeams || []).find((t: any) => t.id === partido.equipo_id);
    const isSeniorMatch = Boolean((matchTeam?.name || '').toUpperCase().includes('SENIOR'));
    const teamPlayers = (allPlayers || []).filter((p: any) => p.team_id === partido.equipo_id);

    // 3. Build convocatorias payload
    const rowsToUpsert: any[] = [];
    const matchedCardIndices = new Set<number>();

    for (const fp of ourPlayers) {
      const matched = matchPlayer(fp.nombre_jugador, fp.dorsal, allPlayers || [], teamPlayers, isSeniorMatch);
      if (!matched) {
        continue;
      }

      const isTitular = String(fp.titular) === '1' || fp.titular === 1 || fp.titular === true;

      // Cards parsing
      let yellows = 0;
      let reds = 0;
      ourCards.forEach((c: any, cIdx: number) => {
        const matchByCode = c.codjugador && String(c.codjugador) === String(fp.codjugador);
        const matchByName = !c.codjugador && normalizeNameWords(c.nombre_jugador).filter(w => normalizeNameWords(fp.nombre_jugador).includes(w)).length >= 2;
        if (matchByCode || matchByName) {
          matchedCardIndices.add(cIdx);
          if (c.segunda_amarilla === '1' || c.segunda_amarilla === 1) {
            yellows += 1;
            reds += 1;
          } else if (c.codigo_tipo_amonestacion === '101' || c.codigo_tipo_amonestacion === '200' || c.codigo_tipo_amonestacion === '2') {
            reds += 1;
          } else {
            yellows += 1;
          }
        }
      });

      // Goals parsing (EXCLUYENDO autogoles en propia puerta: tipo_gol 102 en FFCV / RFEF)
      let goals = 0;
      ourGoals.forEach((g: any) => {
        if (String(g.tipo_gol) === '102' || g.tipo_gol === 102) {
          return;
        }
        const matchByCode = g.codjugador && String(g.codjugador) === String(fp.codjugador);
        const matchByName = !g.codjugador && countCommonWords(normalizeNameWords(g.nombre_jugador), normalizeNameWords(fp.nombre_jugador)) >= 2;
        if (matchByCode || matchByName) {
          goals += 1;
        }
      });

      // Red card minute if sent off (para detener el cómputo de minutos jugados)
      let sendOffMinute: number | null = null;
      ourCards.forEach((c: any) => {
        const matchByCode = c.codjugador && String(c.codjugador) === String(fp.codjugador);
        const matchByName = !c.codjugador && countCommonWords(normalizeNameWords(c.nombre_jugador), normalizeNameWords(fp.nombre_jugador)) >= 2;
        if (matchByCode || matchByName) {
          const isRed = (c.segunda_amarilla === '1' || c.segunda_amarilla === 1) ||
                        (c.codigo_tipo_amonestacion === '101' || c.codigo_tipo_amonestacion === '200' || c.codigo_tipo_amonestacion === '2');
          if (isRed && c.minuto) {
            sendOffMinute = Number(c.minuto);
          }
        }
      });

      // Minutes played calculation
      let minutes = 0;
      if (isTitular) {
        const subOut = ourSubs.find((s: any) => String(s.codjugador_sale) === String(fp.codjugador));
        const outMin = subOut && subOut.minuto ? Number(subOut.minuto) : 90;
        minutes = sendOffMinute !== null ? Math.min(outMin, sendOffMinute) : outMin;
      } else {
        const subIn = ourSubs.find((s: any) => String(s.codjugador_entra) === String(fp.codjugador));
        if (subIn && subIn.minuto) {
          const inMin = Number(subIn.minuto);
          const subOut = ourSubs.find((s: any) => String(s.codjugador_sale) === String(fp.codjugador));
          const outMin = subOut && subOut.minuto ? Number(subOut.minuto) : 90;
          const endMin = sendOffMinute !== null ? Math.min(outMin, sendOffMinute) : outMin;
          minutes = Math.max(0, endMin - inMin);
        } else {
          minutes = 0;
        }
      }

      rowsToUpsert.push({
        partido_id: partido.id,
        player_id: matched.id,
        status: 'convocado',
        titular: isTitular,
        yellow_cards: yellows,
        tarjetas_amarillas: yellows,
        red_cards: reds,
        tarjetas_rojas: reds,
        minutes_played: minutes,
        minutos_jugados: minutes,
        goals: goals,
        goles: goals
      });
    }

    // 3.2 Process any cards shown to coaching / technical staff (entrenadores, delegados, etc.)
    const processedStaffIds = new Set<string>();
    ourCards.forEach((c: any, cIdx: number) => {
      if (matchedCardIndices.has(cIdx)) return;
      if (!c.nombre_jugador) return;

      const matchedStaff = matchPlayer(c.nombre_jugador, undefined, allPlayers || [], teamPlayers);
      if (matchedStaff && !processedStaffIds.has(matchedStaff.id)) {
        processedStaffIds.add(matchedStaff.id);

        let staffYellows = 0;
        let staffReds = 0;

        ourCards.forEach((sc: any, scIdx: number) => {
          if (matchedCardIndices.has(scIdx)) return;
          const matchCode = sc.codjugador && c.codjugador && String(sc.codjugador) === String(c.codjugador);
          const matchName = normalizeNameWords(sc.nombre_jugador).filter((w: string) => normalizeNameWords(`${matchedStaff.first_name} ${matchedStaff.last_name}`).includes(w)).length >= 2;

          if (matchCode || matchName) {
            matchedCardIndices.add(scIdx);
            if (sc.segunda_amarilla === '1' || sc.segunda_amarilla === 1) {
              staffYellows += 1;
              staffReds += 1;
            } else if (sc.codigo_tipo_amonestacion === '101' || sc.codigo_tipo_amonestacion === '200' || sc.codigo_tipo_amonestacion === '2') {
              staffReds += 1;
            } else {
              staffYellows += 1;
            }
          }
        });

        rowsToUpsert.push({
          partido_id: partido.id,
          player_id: matchedStaff.id,
          status: 'convocado',
          titular: false,
          yellow_cards: staffYellows,
          tarjetas_amarillas: staffYellows,
          red_cards: staffReds,
          tarjetas_rojas: staffReds,
          minutes_played: 0,
          minutos_jugados: 0,
          goals: 0,
          goles: 0
        });
      }
    });

    if (rowsToUpsert.length === 0) {
      return { success: true, syncedCount: 0 };
    }

    // Deduplicate by player_id
    const dedupedMap = new Map<string, any>();
    for (const r of rowsToUpsert) {
      if (dedupedMap.has(r.player_id)) {
        const existing = dedupedMap.get(r.player_id);
        existing.yellow_cards = Math.max(existing.yellow_cards, r.yellow_cards);
        existing.tarjetas_amarillas = Math.max(existing.tarjetas_amarillas, r.tarjetas_amarillas);
        existing.red_cards = Math.max(existing.red_cards, r.red_cards);
        existing.tarjetas_rojas = Math.max(existing.tarjetas_rojas, r.tarjetas_rojas);
        existing.minutes_played = Math.max(existing.minutes_played, r.minutes_played);
        existing.minutos_jugados = Math.max(existing.minutos_jugados, r.minutos_jugados);
        existing.goals = Math.max(existing.goals, r.goals);
        existing.goles = Math.max(existing.goles, r.goles);
      } else {
        dedupedMap.set(r.player_id, r);
      }
    }

    const payload = Array.from(dedupedMap.values());
    const { error: upsertErr } = await supabase
      .from('convocatorias')
      .upsert(payload, { onConflict: 'partido_id,player_id' });

    if (upsertErr) {
      console.error('[syncFFCVActaToConvocatorias] Error upserting convocatorias:', upsertErr);
      return { success: false, syncedCount: 0, error: upsertErr.message };
    }

    // Limpiar / resetear jugadores de borradores locales que no estuvieron en el acta oficial
    const syncedPlayerIds = new Set(payload.map(p => p.player_id));
    const { data: existingConvs } = await supabase
      .from('convocatorias')
      .select('id, player_id')
      .eq('partido_id', partido.id);

    const nonActaConvs = (existingConvs || []).filter((c: any) => !syncedPlayerIds.has(c.player_id));
    if (nonActaConvs.length > 0) {
      const nonActaIds = nonActaConvs.map((c: any) => c.id);
      await supabase
        .from('convocatorias')
        .update({
          status: 'no_convocado',
          titular: false,
          minutes_played: 0,
          minutos_jugados: 0,
          goals: 0,
          goles: 0,
          yellow_cards: 0,
          tarjetas_amarillas: 0,
          red_cards: 0,
          tarjetas_rojas: 0
        })
        .in('id', nonActaIds);
    }

    // Also ensure partido status and score are up to date
    const isClosed = String(details.acta_cerrada) === '1';
    const hasScores = details.goles_local !== undefined && details.goles_local !== null && details.goles_local !== '' &&
                      details.goles_visitante !== undefined && details.goles_visitante !== null && details.goles_visitante !== '';

    if (isClosed || hasScores) {
      const homeScore = Number(details.goles_local) || 0;
      const awayScore = Number(details.goles_visitante) || 0;
      const ownScore = isSaladarHome ? homeScore : awayScore;
      const rivalScore = isSaladarHome ? awayScore : homeScore;

      await supabase
        .from('partidos')
        .update({
          estado: 'Finalizado',
          resultado_propio: ownScore,
          resultado_rival: rivalScore,
          acta_oficial_url: `https://ffcv.es/dep/actas?CodPartido=${codacta}`
        })
        .eq('id', partido.id);
    }

    return { success: true, syncedCount: payload.length };
  } catch (err: any) {
    console.error('[syncFFCVActaToConvocatorias] Unexpected error:', err);
    return { success: false, syncedCount: 0, error: err.message };
  }
}
