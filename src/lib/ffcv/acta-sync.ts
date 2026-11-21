import { createAdminClient } from '../supabase/admin';
import { fetchMatchDetails } from './client';
import { FFCVRawMatchDetails } from './types';
import { getOfficialMatchDuration } from '../utils';
import { isFfcvRawCardRed } from './discipline-rules';
import {
  assignTacticalCoordinatesForStarters,
  resolveOfficialFormation,
  StarterPositionInput
} from './tactical-lineup';

const ACTIVE_SEASON_ID = '663ed6ef-1dab-4350-9489-ed50f9e9ac15';
const CLOSED_SEASON_ID = '584f508a-fc1a-4339-b5b2-4296ffde2f4c';

/**
 * Normalizes words from a person's name for robust matching.
 * - Joins particles to the next word ("EL ORF" -> "elorf") so it matches "ELORF"
 * - Collapses repeated letters ("YOUSSEF" -> "yousef")
 */
const NAME_PARTICLES = new Set(['el', 'al', 'de', 'la', 'del', 'ben', 'ait', 'van', 'da', 'do']);
export function normalizeNameWords(str: string): string[] {
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
export function wordsEquivalent(a: string, b: string): boolean {
  if (a === b) return true;
  if (NICKNAMES_MAP[a]?.includes(b) || NICKNAMES_MAP[b]?.includes(a)) return true;
  if (a.length >= 4 && b.length >= 4) {
    if (a.includes(b) || b.includes(a)) return true;
    if (levenshtein(a, b) <= 1) return true;
  }
  return false;
}

export function countCommonWords(a: string[], b: string[]): number {
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
 * Matches an FFCV or external league player to our internal database player
 */
export function matchPlayer(
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
    // IMPORTANTE: Priorizar 'saladar' sobre 'sporting' para no confundir con rivales llamados "Sporting Dolores", "Sporting Guardamar", etc.
    const localName = (details.equipo_local || '').toLowerCase();
    const awayName = (details.equipo_visitante || '').toLowerCase();
    const localHasSaladar = localName.includes('saladar');
    const awayHasSaladar = awayName.includes('saladar');
    const isHome = localHasSaladar || (!awayHasSaladar && localName.includes('sporting'));
    const isAway = awayHasSaladar || (!localHasSaladar && awayName.includes('sporting'));

    // Strict guard: NEVER sync an acta if our club is neither home nor away
    if (!isHome && !isAway) {
      return { success: false, syncedCount: 0, error: `Acta #${codacta} does not involve Sporting Saladar (${details.equipo_local} vs ${details.equipo_visitante})` };
    }

    const isSaladarHome = localHasSaladar ? true : awayHasSaladar ? false : isHome;
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
      .select('id, equipo_id, rival_nombre, season_id, acta_oficial_url, fecha_hora, lugar, estado, coach_report, live_timer_started_at, live_timer_elapsed_seconds, equipo:teams(id, name, category)')
      .neq('season_id', CLOSED_SEASON_ID)
      .eq('season_id', ACTIVE_SEASON_ID)
      .ilike('acta_oficial_url', `%${codacta}%`);

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
          .select('id, name, category')
          .neq('season_id', CLOSED_SEASON_ID)
          .eq('season_id', ACTIVE_SEASON_ID)
          .eq('ffcv_group_id', fm.ffcv_group_id)
          .maybeSingle();

        if (team) {
          const fmDate = new Date(fm.match_date).toISOString().split('T')[0];
          const fmRival = fmHome.includes('saladar') ? fmAway : fmHome;
          const { data: candidatePartidos } = await supabase
            .from('partidos')
            .select('id, equipo_id, rival_nombre, season_id, acta_oficial_url, fecha_hora, lugar, estado, coach_report, live_timer_started_at, live_timer_elapsed_seconds, equipo:teams(id, name, category)')
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
      .select('id, name, category')
      .neq('season_id', CLOSED_SEASON_ID)
      .eq('season_id', ACTIVE_SEASON_ID);
    const activeTeamIds = (activeTeams || []).map((t: any) => t.id);

    const { data: allPlayersData } = await supabase
      .from('players')
      .select('id, first_name, last_name, dorsal, team_id, status, is_senior, posicion, teams:teams(id, name, category)')
      .in('team_id', activeTeamIds)
      .neq('status', 'inactive');

    const allPlayers = (allPlayersData || []).filter((p: any) => {
      const s = (p.status || '').toLowerCase();
      return !s.includes('inactiv') && !s.includes('baja');
    });

    const matchTeam = (activeTeams || []).find((t: any) => t.id === partido.equipo_id);
    const teamCategory = `${(partido.equipo as any)?.category || ''} ${(partido.equipo as any)?.name || ''} ${matchTeam?.category || ''} ${matchTeam?.name || ''}`.trim();
    const isSeniorMatch = Boolean((teamCategory || '').toUpperCase().includes('SENIOR'));
    const teamPlayers = allPlayers.filter((p: any) => p.team_id === partido.equipo_id);
    const maxMatchMinutes = getOfficialMatchDuration(teamCategory, details.nombre_competicion);

    // Load existing convocatorias for manual minute preservation, tactical coordinates and card overrides
    const { data: existingConvocatorias } = await supabase
      .from('convocatorias')
      .select('player_id, titular, tactical_x, tactical_y, minutos_jugados, minutes_played, tarjetas_amarillas, yellow_cards, tarjetas_rojas, red_cards')
      .eq('partido_id', partido.id);

    const isClosed = String(details.acta_cerrada) === '1';
    const isInPlay = String(details.partido_en_juego) === '1' && !isClosed;
    const hasScores =
      details.goles_local !== undefined &&
      details.goles_local !== null &&
      String(details.goles_local).trim() !== '' &&
      details.goles_visitante !== undefined &&
      details.goles_visitante !== null &&
      String(details.goles_visitante).trim() !== '';
    const hasMatchStarted = isClosed || isInPlay || hasScores || ourGoals.length > 0 || ourSubs.length > 0 || ourCards.length > 0;

    // 2.5 Compute tactical coordinates for starters based on official formation & position
    const ourRawFormation = isSaladarHome ? (details as any).esquema_local : (details as any).esquema_visitante;
    const rivalRawFormation = isSaladarHome ? (details as any).esquema_visitante : (details as any).esquema_local;

    const matchedOurPlayersList: Array<{ fp: any; matched: any; isTitular: boolean }> = [];
    const starterPositionInputs: StarterPositionInput[] = [];

    for (const fp of ourPlayers) {
      const matched = matchPlayer(fp.nombre_jugador, fp.dorsal, allPlayers || [], teamPlayers, isSeniorMatch);
      if (!matched) continue;
      const isTitular = String(fp.titular) === '1' || fp.titular === 1 || fp.titular === true;
      matchedOurPlayersList.push({ fp, matched, isTitular });

      if (isTitular) {
        const existingConv = (existingConvocatorias || []).find((c: any) => c.player_id === matched.id);
        starterPositionInputs.push({
          playerId: matched.id,
          dorsal: fp.dorsal ?? matched.dorsal,
          isGoalkeeper: String(fp.portero) === '1' || fp.portero === 1 || fp.portero === true,
          ffcvPosAbbr: (fp as any).posicion_jugador_abreviatura || null,
          ffcvPosName: (fp as any).posicion || null,
          dbPosition: matched.posicion || null,
          existingTacticalX: existingConv?.tactical_x ?? null,
          existingTacticalY: existingConv?.tactical_y ?? null,
          wasAlreadyTitular: Boolean(existingConv?.titular)
        });
      }
    }

    const { formation: ourFormation, coordinatesByPlayerId } = assignTacticalCoordinatesForStarters(
      starterPositionInputs,
      ourRawFormation
    );
    const rivalFormation = resolveOfficialFormation(rivalRawFormation);

    // 3. Build convocatorias payload
    const rowsToUpsert: any[] = [];
    const matchedCardIndices = new Set<number>();

    for (const { fp, matched, isTitular } of matchedOurPlayersList) {

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
          } else if (isFfcvRawCardRed(c)) {
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
          const isRed = isFfcvRawCardRed(c);
          if (isRed && c.minuto) {
            sendOffMinute = Number(c.minuto);
          }
        }
      });

      // Minutes played calculation (ajustado a la duración reglamentaria de la categoría)
      // Si el partido aún no ha comenzado (pre-partido con alineaciones publicadas), minutos = 0.
      const existingConv = (existingConvocatorias || []).find((c: any) => c.player_id === matched.id);
      const hasManualMinutes = existingConv && typeof existingConv.minutos_jugados === 'number' && existingConv.minutos_jugados > 0 && existingConv.minutos_jugados <= maxMatchMinutes;

      let minutes = 0;
      if (!hasMatchStarted) {
        minutes = 0;
      } else if (ourSubs.length === 0 && hasManualMinutes) {
        // Preservar minutos manuales registrados por el cuerpo técnico si el acta no incluye cambios
        minutes = existingConv.minutos_jugados;
      } else if (isTitular) {
        const subOut = ourSubs.find((s: any) => String(s.codjugador_sale) === String(fp.codjugador));
        const outMin = subOut && subOut.minuto ? Number(subOut.minuto) : maxMatchMinutes;
        minutes = sendOffMinute !== null ? Math.min(outMin, sendOffMinute) : outMin;
      } else {
        const subIn = ourSubs.find((s: any) => String(s.codjugador_entra) === String(fp.codjugador));
        if (subIn && subIn.minuto) {
          const inMin = Number(subIn.minuto);
          const subOut = ourSubs.find((s: any) => String(s.codjugador_sale) === String(fp.codjugador));
          const outMin = subOut && subOut.minuto ? Number(subOut.minuto) : maxMatchMinutes;
          const endMin = sendOffMinute !== null ? Math.min(outMin, sendOffMinute) : outMin;
          minutes = Math.max(0, endMin - inMin);
        } else {
          minutes = 0;
        }
      }

      minutes = Math.max(0, Math.min(minutes, maxMatchMinutes));

      const tacticalCoords = isTitular ? coordinatesByPlayerId.get(matched.id) : null;

      if (isClosed) {
        rowsToUpsert.push({
          partido_id: partido.id,
          player_id: matched.id,
          status: 'convocado',
          titular: isTitular,
          tactical_x: tacticalCoords ? tacticalCoords.x : null,
          tactical_y: tacticalCoords ? tacticalCoords.y : null,
          yellow_cards: yellows,
          tarjetas_amarillas: yellows,
          red_cards: reds,
          tarjetas_rojas: reds,
          minutes_played: minutes,
          minutos_jugados: minutes,
          goals: goals,
          goles: goals
        });
      } else {
        // Mientras el acta FFCV no esté cerrada, sincronizar únicamente la alineación y coordenadas tácticas
        // para respetar los goles, tarjetas y minutos que el entrenador registre en directo.
        rowsToUpsert.push({
          partido_id: partido.id,
          player_id: matched.id,
          status: 'convocado',
          titular: isTitular,
          tactical_x: tacticalCoords ? tacticalCoords.x : null,
          tactical_y: tacticalCoords ? tacticalCoords.y : null
        });
      }
    }

    // 3.2 Process any cards shown to coaching / technical staff only when the official acta is closed
    const processedStaffIds = new Set<string>();
    if (isClosed) ourCards.forEach((c: any, cIdx: number) => {
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
            } else if (isFfcvRawCardRed(sc)) {
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
        if (r.yellow_cards !== undefined) {
          existing.yellow_cards = Math.max(existing.yellow_cards || 0, r.yellow_cards);
          existing.tarjetas_amarillas = Math.max(existing.tarjetas_amarillas || 0, r.tarjetas_amarillas);
        }
        if (r.red_cards !== undefined) {
          existing.red_cards = Math.max(existing.red_cards || 0, r.red_cards);
          existing.tarjetas_rojas = Math.max(existing.tarjetas_rojas || 0, r.tarjetas_rojas);
        }
        if (r.minutes_played !== undefined) {
          existing.minutes_played = Math.max(existing.minutes_played || 0, r.minutes_played);
          existing.minutos_jugados = Math.max(existing.minutos_jugados || 0, r.minutos_jugados);
        }
        if (r.goals !== undefined) {
          existing.goals = Math.max(existing.goals || 0, r.goals);
          existing.goles = Math.max(existing.goles || 0, r.goles);
        }
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
      // Purge rows belonging to archived 25/26 or non-active players completely
      const activePlayerIdSet = new Set(allPlayers.map((p: any) => p.id));
      const contaminatedIds = nonActaConvs.filter((c: any) => !activePlayerIdSet.has(c.player_id)).map((c: any) => c.id);
      if (contaminatedIds.length > 0) {
        await supabase.from('convocatorias').delete().in('id', contaminatedIds);
      }

      const validNonActaIds = nonActaConvs.filter((c: any) => activePlayerIdSet.has(c.player_id)).map((c: any) => c.id);
      if (validNonActaIds.length > 0) {
        await supabase
          .from('convocatorias')
          .update({
            status: 'no_convocado',
            titular: false,
            tactical_x: null,
            tactical_y: null,
            minutes_played: 0,
            minutos_jugados: 0,
            goals: 0,
            goles: 0,
            yellow_cards: 0,
            tarjetas_amarillas: 0,
            red_cards: 0,
            tarjetas_rojas: 0
          })
          .in('id', validNonActaIds);
      }
    }

    // 4. Synchronize match_events only when the FFCV official acta is closed (coach controls live events manually)
    if (isClosed) try {
      const newEvents: any[] = [];

      // Helper to find player ID for Saladar players
      const findSaladarPlayerId = (playerName: string) => {
        const matched = matchPlayer(playerName, undefined, allPlayers || [], teamPlayers, isSeniorMatch);
        return matched?.id || null;
      };

      // Goals: Local
      (details.goles_equipo_local || []).forEach((g: any) => {
        const pId = isSaladarHome ? findSaladarPlayerId(g.nombre_jugador) : null;
        const tipo = String(g.tipo_gol) === '102' ? 'Gol en propia puerta' : (String(g.tipo_gol) === '101' ? 'Penalti' : 'Gol');
        newEvents.push({
          partido_id: partido.id,
          player_id: pId,
          tipo_evento: tipo,
          minuto: Number(g.minuto) || 0,
          notas: `[LOCAL] ${g.nombre_jugador || 'Gol'}`
        });
      });

      // Goals: Visitante
      (details.goles_equipo_visitante || []).forEach((g: any) => {
        const pId = !isSaladarHome ? findSaladarPlayerId(g.nombre_jugador) : null;
        const tipo = String(g.tipo_gol) === '102' ? 'Gol en propia puerta' : (String(g.tipo_gol) === '101' ? 'Penalti' : 'Gol');
        newEvents.push({
          partido_id: partido.id,
          player_id: pId,
          tipo_evento: tipo,
          minuto: Number(g.minuto) || 0,
          notas: `[VISITANTE] ${g.nombre_jugador || 'Gol'}`
        });
      });

      // Cards: Local
      (details.tarjetas_equipo_local || []).forEach((c: any) => {
        const pId = isSaladarHome ? findSaladarPlayerId(c.nombre_jugador) : null;
        const isRed = isFfcvRawCardRed(c);
        newEvents.push({
          partido_id: partido.id,
          player_id: pId,
          tipo_evento: isRed ? 'Tarjeta Roja' : 'Tarjeta Amarilla',
          minuto: Number(c.minuto) || 0,
          notas: `[LOCAL] ${c.nombre_jugador || 'Tarjeta'}`
        });
      });

      // Cards: Visitante
      (details.tarjetas_equipo_visitante || []).forEach((c: any) => {
        const pId = !isSaladarHome ? findSaladarPlayerId(c.nombre_jugador) : null;
        const isRed = isFfcvRawCardRed(c);
        newEvents.push({
          partido_id: partido.id,
          player_id: pId,
          tipo_evento: isRed ? 'Tarjeta Roja' : 'Tarjeta Amarilla',
          minuto: Number(c.minuto) || 0,
          notas: `[VISITANTE] ${c.nombre_jugador || 'Tarjeta'}`
        });
      });

      if (newEvents.length > 0) {
        // When the official FFCV acta is closed, replace manual live goal/card events with the official closed-acta goals/cards
        // so goals and cards are never duplicated, while preserving Descanso, Fin de Partido, Cambio, Comentarios, Ocasiones, etc.
        await supabase
          .from('match_events')
          .delete()
          .eq('partido_id', partido.id)
          .or('notas.ilike.[LOCAL]%,notas.ilike.[VISITANTE]%,tipo_evento.in.("Gol","Penalti","Penalty","Gol en propia puerta","Gol en Propia","Tarjeta Amarilla","Amarilla","Tarjeta Roja","Roja")');

        await supabase.from('match_events').insert(newEvents);
      }
    } catch (eventsErr) {
      console.warn('[syncFFCVActaToConvocatorias] Warning: error syncing match_events:', eventsErr);
    }

    // 5. Build FFCV Live & Official Lineup metadata inside coach_report (for /live and Match Details)
    const rivalRawPlayers = isSaladarHome ? (details.jugadores_equipo_visitante || []) : (details.jugadores_equipo_local || []);
    const rivalCards = isSaladarHome ? (details.tarjetas_equipo_visitante || []) : (details.tarjetas_equipo_local || []);
    const rivalGoals = isSaladarHome ? (details.goles_equipo_visitante || []) : (details.goles_equipo_local || []);
    const rivalSubs = isSaladarHome ? (details.sustituciones_equipo_visitante || []) : (details.sustituciones_equipo_local || []);

    const mapFfcvSidePlayers = (rawList: any[], sideGoals: any[], sideCards: any[], sideSubs: any[], isOurSide: boolean) => {
      return (rawList || []).map((p: any) => {
        const isStarter = String(p.titular) === '1' || p.titular === 1 || p.titular === true;
        const isCap = String(p.capitan) === '1' || p.capitan === 1 || p.capitan === true;
        const isGk = String(p.portero) === '1' || p.portero === 1 || p.portero === true;

        let pGoals = 0;
        sideGoals.forEach((g: any) => {
          if (String(g.tipo_gol) === '102' || g.tipo_gol === 102) return;
          const matchByCode = g.codjugador && p.codjugador && String(g.codjugador) === String(p.codjugador);
          const matchByName = !g.codjugador && countCommonWords(normalizeNameWords(g.nombre_jugador), normalizeNameWords(p.nombre_jugador)) >= 2;
          if (matchByCode || matchByName) pGoals++;
        });

        let pYellows = 0;
        let pReds = 0;
        sideCards.forEach((c: any) => {
          const matchByCode = c.codjugador && p.codjugador && String(c.codjugador) === String(p.codjugador);
          const matchByName = !c.codjugador && countCommonWords(normalizeNameWords(c.nombre_jugador), normalizeNameWords(p.nombre_jugador)) >= 2;
          if (matchByCode || matchByName) {
            if (c.segunda_amarilla === '1' || c.segunda_amarilla === 1) {
              pYellows++;
              pReds++;
            } else if (isFfcvRawCardRed(c)) {
              pReds++;
            } else {
              pYellows++;
            }
          }
        });

        const subOut = sideSubs.find((s: any) => p.codjugador && String(s.codjugador_sale) === String(p.codjugador));
        const subIn = sideSubs.find((s: any) => p.codjugador && String(s.codjugador_entra) === String(p.codjugador));
        const matchedInternal = isOurSide
          ? matchedOurPlayersList.find((m) => String(m.fp.codjugador) === String(p.codjugador) || m.fp.nombre_jugador === p.nombre_jugador)?.matched
          : null;

        return {
          codjugador: p.codjugador || null,
          playerId: matchedInternal?.id || null,
          nombre: p.nombre_jugador || 'Jugador',
          dorsal: p.dorsal ? Number(p.dorsal) || p.dorsal : '-',
          titular: isStarter,
          capitan: isCap,
          portero: isGk,
          positionLabel:
            (p as any).posicion_jugador_abreviatura ||
            (isGk ? 'POR' : (p as any).posicion || (matchedInternal?.posicion || '')),
          goles: pGoals,
          amarillas: pYellows,
          rojas: pReds,
          sustituidoMinuto: subOut?.minuto ? Number(subOut.minuto) : null,
          entroMinuto: subIn?.minuto ? Number(subIn.minuto) : null
        };
      });
    };

    const ourCoachRaw = isSaladarHome
      ? ((details as any).entrenador_local || (details as any).tecnicos_equipo_local?.[0]?.nombre_tecnico)
      : ((details as any).entrenador_visitante || (details as any).tecnicos_equipo_visitante?.[0]?.nombre_tecnico);
    const rivalCoachRaw = isSaladarHome
      ? ((details as any).entrenador_visitante || (details as any).tecnicos_equipo_visitante?.[0]?.nombre_tecnico)
      : ((details as any).entrenador_local || (details as any).tecnicos_equipo_local?.[0]?.nombre_tecnico);

    let parsedCoachReport: Record<string, any> = {};
    if (typeof partido.coach_report === 'string') {
      try {
        parsedCoachReport = JSON.parse(partido.coach_report);
      } catch {
        parsedCoachReport = {};
      }
    } else if (partido.coach_report && typeof partido.coach_report === 'object') {
      parsedCoachReport = { ...partido.coach_report };
    }

    parsedCoachReport.official_tactic = ourFormation;
    parsedCoachReport.ffcv_live = {
      codPartido: String(codacta),
      url: `https://ffcv.es/dep/actas?CodPartido=${codacta}`,
      partidoEnJuego: false,
      actaCerrada: isClosed,
      campo: details.campo || (details as any).instalacion || null,
      arbitros: Array.isArray(details.arbitros_partido)
        ? details.arbitros_partido.map((a: any) => a.nombre_arbitro || a.nombre).filter(Boolean)
        : [],
      ourFormation,
      rivalFormation,
      ourCoach: typeof ourCoachRaw === 'string' ? ourCoachRaw : null,
      rivalCoach: typeof rivalCoachRaw === 'string' ? rivalCoachRaw : null,
      ourPlayers: mapFfcvSidePlayers(ourPlayers, ourGoals, ourCards, ourSubs, true),
      rivalPlayers: mapFfcvSidePlayers(rivalRawPlayers, rivalGoals, rivalCards, rivalSubs, false),
      updatedAt: new Date().toISOString()
    };

    // 6. Update partido: while FFCV acta is NOT closed, only persist lineups/coach_report
    // so the coach controls live score, timer, and status manually.
    // Once acta_cerrada === '1', finalize and sync official FFCV score.
    const partidoUpdate: Record<string, any> = {
      acta_oficial_url: `https://ffcv.es/dep/actas?CodPartido=${codacta}`,
      coach_report: JSON.stringify(parsedCoachReport)
    };

    if (isClosed) {
      const homeScore = Number(details.goles_local) || 0;
      const awayScore = Number(details.goles_visitante) || 0;
      partidoUpdate.estado = 'Finalizado';
      partidoUpdate.resultado_propio = isSaladarHome ? homeScore : awayScore;
      partidoUpdate.resultado_rival = isSaladarHome ? awayScore : homeScore;
      partidoUpdate.live_timer_started_at = null;
      partidoUpdate.live_timer_elapsed_seconds = 0;
    }

    await supabase
      .from('partidos')
      .update(partidoUpdate)
      .eq('id', partido.id);

    return { success: true, syncedCount: payload.length };
  } catch (err: any) {
    console.error('[syncFFCVActaToConvocatorias] Unexpected error:', err);
    return { success: false, syncedCount: 0, error: err.message };
  }
}

let lastFfcvLivePollTimestampMs = 0;
const lastFfcvMatchPollMap = new Map<string, number>();
const FFCV_LIVE_POLL_COOLDOWN_MS = 15 * 1000;

/**
 * Sincroniza de forma ligera e inteligente las alineaciones previas (30-45 min antes),
 * el seguimiento en directo y el acta final de los partidos FFCV de la temporada activa 26/27.
 */
export async function syncFFCVLiveMatchesIfNeeded(
  customSupabaseClient?: any,
  specificMatchId?: string
): Promise<void> {
  const now = Date.now();

  if (specificMatchId) {
    const lastSpecific = lastFfcvMatchPollMap.get(specificMatchId) || 0;
    if (now - lastSpecific < FFCV_LIVE_POLL_COOLDOWN_MS) return;
    lastFfcvMatchPollMap.set(specificMatchId, now);
  } else {
    if (now - lastFfcvLivePollTimestampMs < FFCV_LIVE_POLL_COOLDOWN_MS) return;
    lastFfcvLivePollTimestampMs = now;
  }

  try {
    const supabase = customSupabaseClient || createAdminClient();

    let query = supabase
      .from('partidos')
      .select('id, equipo_id, rival_nombre, fecha_hora, estado, acta_oficial_url, coach_report, equipo:teams(id, name, ffcv_group_id)')
      .eq('season_id', ACTIVE_SEASON_ID)
      .neq('season_id', CLOSED_SEASON_ID);

    if (specificMatchId) {
      query = query.eq('id', specificMatchId);
    }

    const { data: matches } = await query;
    if (!matches || matches.length === 0) return;

    const nonBraveMatches = matches.filter(
      (m: any) => !(m.acta_oficial_url && String(m.acta_oficial_url).includes('apuntamelo.com'))
    );

    // Determinar el ancla de la jornada activa (último partido jugado/en curso en la temporada activa)
    const playedOrLiveDates = nonBraveMatches
      .filter((m: any) => m.estado === 'Finalizado' || m.estado === 'En Curso' || m.estado === 'En curso' || m.estado === 'Descanso')
      .map((m: any) => (m.fecha_hora ? new Date(m.fecha_hora).getTime() : NaN))
      .filter((ms: number) => !isNaN(ms));
    const latestActiveMatchdayMs = playedOrLiveDates.length > 0 ? Math.max(...playedOrLiveDates) : NaN;

    const candidates = nonBraveMatches.filter((m: any) => {
      if (specificMatchId && m.id === specificMatchId) {
        return true;
      }
      const isLiveState = m.estado === 'En Curso' || m.estado === 'En curso' || m.estado === 'Descanso';
      if (isLiveState) return true;
      if (!m.fecha_hora) return false;
      const matchMs = new Date(m.fecha_hora).getTime();
      const diffHoursNow = (now - matchMs) / (1000 * 60 * 60);
      if (diffHoursNow >= -2 && diffHoursNow <= 14) return true;

      // Fallback para el fin de semana / jornada activa en curso
      if (!isNaN(latestActiveMatchdayMs)) {
        const diffHoursCluster = Math.abs(matchMs - latestActiveMatchdayMs) / (1000 * 60 * 60);
        if (diffHoursCluster <= 36) return true;
      }
      return false;
    });

    if (candidates.length === 0) return;

    for (const cand of candidates) {
      let parsedReport: any = {};
      if (typeof cand.coach_report === 'string') {
        try {
          parsedReport = JSON.parse(cand.coach_report);
        } catch {
          parsedReport = {};
        }
      } else if (cand.coach_report && typeof cand.coach_report === 'object') {
        parsedReport = cand.coach_report;
      }

      // Si ya está finalizado con acta cerrada y tiene ffcv_live + coordenadas tácticas, omitir
      if (cand.estado === 'Finalizado' && parsedReport?.ffcv_live?.actaCerrada && parsedReport?.official_tactic) {
        const { data: existingConvs } = await supabase
          .from('convocatorias')
          .select('titular, tactical_x')
          .eq('partido_id', cand.id);
        const hasTacticalCoords = (existingConvs || []).some((c: any) => c.titular && c.tactical_x != null);
        if (hasTacticalCoords) continue;
      }

      // Resolver codacta desde acta_oficial_url o desde ffcv_matches (temporada 22)
      let codacta = cand.acta_oficial_url?.match(/CodPartido=(\d+)/i)?.[1] || null;

      if (!codacta && (cand.equipo as any)?.ffcv_group_id && cand.fecha_hora) {
        const { data: ffcvGroupMatches } = await supabase
          .from('ffcv_matches')
          .select('ffcv_match_id, home_team_name, away_team_name, match_date')
          .neq('ffcv_season_id', '21')
          .eq('ffcv_season_id', '22')
          .eq('ffcv_group_id', (cand.equipo as any).ffcv_group_id);

        const cDateMs = new Date(cand.fecha_hora).getTime();
        const cRival = (cand.rival_nombre || '').toLowerCase();
        const rivalWords = cRival.split(/\s+/).filter((w: string) => w.length > 3 && !w.includes('c.f.') && !w.includes('c.d.'));

        const matchedFm = (ffcvGroupMatches || []).find((fm: any) => {
          if (!fm.match_date || !fm.ffcv_match_id) return false;
          const fmHome = (fm.home_team_name || '').toLowerCase();
          const fmAway = (fm.away_team_name || '').toLowerCase();
          if (!fmHome.includes('saladar') && !fmAway.includes('saladar')) return false;
          const diffDays = Math.abs((cDateMs - new Date(fm.match_date).getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays > 7) return false;
          const fmRival = fmHome.includes('saladar') ? fmAway : fmHome;
          return rivalWords.some((w: string) => fmRival.includes(w)) || fmRival.includes(cRival);
        });

        if (matchedFm?.ffcv_match_id) {
          codacta = String(matchedFm.ffcv_match_id);
        }
      }

      if (codacta) {
        await syncFFCVActaToConvocatorias(codacta, undefined, supabase);
      }
    }
  } catch (err: any) {
    console.warn('[syncFFCVLiveMatchesIfNeeded] Warning:', err.message);
  }
}
