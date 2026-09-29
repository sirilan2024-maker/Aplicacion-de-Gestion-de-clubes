import { createAdminClient } from '../supabase/admin';
import { fetchMatchDetails } from './client';
import { FFCVRawMatchDetails } from './types';

const ACTIVE_SEASON_ID = '663ed6ef-1dab-4350-9489-ed50f9e9ac15';
const CLOSED_SEASON_ID = '584f508a-fc1a-4339-b5b2-4296ffde2f4c';

/**
 * Normalizes words from a person's name for robust matching
 */
function normalizeNameWords(str: string): string[] {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 2);
}

/**
 * Matches an FFCV player to our internal database player
 */
function matchPlayer(
  ffcvName: string,
  dorsal: string | number | undefined,
  allPlayers: any[],
  teamPlayers: any[]
): any {
  const ffcvWords = normalizeNameWords(ffcvName);
  if (ffcvWords.length === 0) return null;

  let bestPlayer = null;
  let bestScore = 0;

  // 1. Try matching against team players first (ACTIVE SEASON ONLY)
  for (const p of teamPlayers) {
    const dbWords = normalizeNameWords(`${p.first_name} ${p.last_name}`);
    const common = ffcvWords.filter(w => dbWords.includes(w)).length;
    let score = common * 3;
    if (dorsal && p.dorsal && String(p.dorsal) === String(dorsal)) score += 3;
    if (score > bestScore && common >= 1) {
      bestScore = score;
      bestPlayer = p;
    }
  }

  if (bestPlayer && bestScore >= 4) return bestPlayer;

  // 2. Try matching against all club players strictly in the active season (for lower/upper team call-ups)
  // Require at least 2 common words or 1 common word + matching dorsal to prevent false positives
  let bestClubPlayer = null;
  let bestClubScore = 0;
  for (const p of allPlayers) {
    const dbWords = normalizeNameWords(`${p.first_name} ${p.last_name}`);
    const common = ffcvWords.filter(w => dbWords.includes(w)).length;
    let score = common * 3;
    if (dorsal && p.dorsal && String(p.dorsal) === String(dorsal)) score += 3;
    if (score > bestClubScore && (common >= 2 || (common >= 1 && dorsal && String(p.dorsal) === String(dorsal)))) {
      bestClubScore = score;
      bestClubPlayer = p;
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
      .select('id')
      .neq('season_id', CLOSED_SEASON_ID)
      .eq('season_id', ACTIVE_SEASON_ID);
    const activeTeamIds = (activeTeams || []).map((t: any) => t.id);

    const { data: allPlayers } = await supabase
      .from('players')
      .select('id, first_name, last_name, dorsal, team_id, status')
      .in('team_id', activeTeamIds)
      .neq('status', 'inactive');

    const teamPlayers = (allPlayers || []).filter((p: any) => p.team_id === partido.equipo_id);

    // 3. Build convocatorias payload
    const rowsToUpsert: any[] = [];
    const matchedCardIndices = new Set<number>();

    for (const fp of ourPlayers) {
      const matched = matchPlayer(fp.nombre_jugador, fp.dorsal, allPlayers || [], teamPlayers);
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
          } else if (c.codigo_tipo_amonestacion === '200' || c.codigo_tipo_amonestacion === '2') {
            reds += 1;
          } else {
            yellows += 1;
          }
        }
      });

      // Goals parsing
      let goals = 0;
      ourGoals.forEach((g: any) => {
        const matchByCode = g.codjugador && String(g.codjugador) === String(fp.codjugador);
        const matchByName = !g.codjugador && normalizeNameWords(g.nombre_jugador).filter(w => normalizeNameWords(fp.nombre_jugador).includes(w)).length >= 2;
        if (matchByCode || matchByName) {
          goals += 1;
        }
      });

      // Minutes played calculation
      let minutes = 0;
      if (isTitular) {
        const subOut = ourSubs.find((s: any) => String(s.codjugador_sale) === String(fp.codjugador));
        if (subOut && subOut.minuto) {
          minutes = Number(subOut.minuto);
        } else {
          minutes = 90;
        }
      } else {
        const subIn = ourSubs.find((s: any) => String(s.codjugador_entra) === String(fp.codjugador));
        if (subIn && subIn.minuto) {
          const subOut = ourSubs.find((s: any) => String(s.codjugador_sale) === String(fp.codjugador));
          if (subOut && subOut.minuto) {
            minutes = Math.max(0, Number(subOut.minuto) - Number(subIn.minuto));
          } else {
            minutes = Math.max(0, 90 - Number(subIn.minuto));
          }
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
            } else if (sc.codigo_tipo_amonestacion === '200' || sc.codigo_tipo_amonestacion === '2') {
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
