/**
 * standings-helper.ts
 *
 * Utilidades para resolver la posición en la clasificación (ranking liguero)
 * tanto de los equipos del club como de sus rivales, con soporte universal
 * para competiciones FFCV y Liga Brave (temporada activa 26/27, ffcv_season_id: '22').
 */

export interface StandingItem {
  ffcv_group_id: string;
  matchday: number;
  position: number;
  points: number;
  team_name: string;
  team_ffcv_id?: string | null;
}

export interface MatchPositionsResult {
  homePosition: number | null;
  awayPosition: number | null;
  homePositionLabel: string | null;
  awayPositionLabel: string | null;
  clubPosition: number | null;
  rivalPosition: number | null;
}

/**
 * Normaliza nombres de equipos eliminando acentos, siglas habituales (C.D., C.F., etc.),
 * puntuación y espacios redundantes para comparaciones fiables.
 */
export function normalizeTeamName(name: string): string {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(c\.?d\.?|c\.?f\.?|u\.?d\.?|f\.?c\.?|a\.?d\.?|club|deportivo|futbol|balompie|sporting|atletico|e\.?f\.?|e\.?d\.?m\.?|promesas|fb)\b/gi, '')
    .replace(/['"“”‘’]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Encuentra el registro de clasificación para un equipo dentro de su grupo.
 * Aplica estrategia en cascada:
 * 1. Coincidencia exacta por federative team id (team_ffcv_id).
 * 2. Coincidencia exacta insensible a mayúsculas por nombre literal.
 * 3. Coincidencia exacta por nombre normalizado.
 * 4. Coincidencia por subcadena normalizada bidireccional.
 * 5. Mayor solapamiento de palabras significativas (>= 3 letras).
 */
export function findStandingInGroup(
  targetName: string | null | undefined,
  targetFfcvId: string | null | undefined,
  standings: StandingItem[] | null | undefined
): StandingItem | null {
  if (!standings || standings.length === 0) return null;
  if (!targetName && !targetFfcvId) return null;

  // 1. Coincidencia por ID federativo
  if (targetFfcvId) {
    const byId = standings.find(s => String(s.team_ffcv_id) === String(targetFfcvId));
    if (byId) return byId;
  }

  // 2. Coincidencia literal por nombre
  const rawTarget = (targetName || '').toLowerCase().trim();
  if (rawTarget) {
    const byExact = standings.find(s => s.team_name.toLowerCase().trim() === rawTarget);
    if (byExact) return byExact;
  }

  // 3. Coincidencia por nombre normalizado
  const targetNorm = normalizeTeamName(targetName || '');
  if (!targetNorm) return null;

  const byNorm = standings.find(s => normalizeTeamName(s.team_name) === targetNorm);
  if (byNorm) return byNorm;

  // 4. Coincidencia por subcadena
  const bySub = standings.find(s => {
    const sNorm = normalizeTeamName(s.team_name);
    return sNorm && (sNorm.includes(targetNorm) || targetNorm.includes(sNorm));
  });
  if (bySub) return bySub;

  // 5. Solapamiento de palabras
  let best: StandingItem | null = null;
  let maxOverlap = 0;
  const targetWords = targetNorm.split(' ').filter(w => w.length >= 3);
  for (const s of standings) {
    const sWords = normalizeTeamName(s.team_name).split(' ').filter(w => w.length >= 3);
    const overlap = targetWords.filter(w => sWords.includes(w)).length;
    if (overlap > maxOverlap) {
      maxOverlap = overlap;
      best = s;
    }
  }

  return maxOverlap > 0 ? best : null;
}

/**
 * Consulta la última jornada disputada/registrada de clasificación para un conjunto de grupos FFCV / Liga Brave.
 * Aplica aislamiento estricto de temporada (ffcv_season_id: '22', exclusión de '21').
 */
export async function fetchLatestStandingsForGroups(
  client: any,
  groupIds: string[]
): Promise<Map<string, StandingItem[]>> {
  const standingsMap = new Map<string, StandingItem[]>();
  const uniqueGroupIds = Array.from(new Set(groupIds.filter(Boolean)));
  if (uniqueGroupIds.length === 0) return standingsMap;

  // Consultar en paralelo para cada grupo limitando a la última jornada sin truncamiento
  await Promise.all(
    uniqueGroupIds.map(async (gid) => {
      try {
        const { data, error } = await client
          .from('ffcv_standings')
          .select('ffcv_group_id, matchday, position, points, team_name, team_ffcv_id')
          .eq('ffcv_group_id', String(gid))
          .eq('ffcv_season_id', '22')
          .neq('ffcv_season_id', '21')
          .order('matchday', { ascending: false })
          .limit(40);

        if (error || !data || data.length === 0) return;

        // Extraer la jornada más reciente disponible para este grupo
        const maxMatchday = data[0].matchday;
        const currentStandings = data
          .filter((row: any) => row.matchday === maxMatchday)
          .sort((a: any, b: any) => (a.position || 0) - (b.position || 0));

        standingsMap.set(String(gid), currentStandings);
      } catch {
        // En caso de fallo en un grupo concreto, continuar con los demás
      }
    })
  );

  return standingsMap;
}

/**
 * Resuelve las posiciones clasificatorias para un partido dado
 */
export function getMatchPositions({
  groupId,
  isLocal,
  clubTeamName,
  clubFfcvId,
  rivalTeamName,
  standingsMap,
}: {
  groupId?: string | null;
  isLocal: boolean;
  clubTeamName?: string | null;
  clubFfcvId?: string | null;
  rivalTeamName?: string | null;
  standingsMap: Map<string, StandingItem[]> | Record<string, StandingItem[]>;
}): MatchPositionsResult {
  if (!groupId) {
    return {
      homePosition: null,
      awayPosition: null,
      homePositionLabel: null,
      awayPositionLabel: null,
      clubPosition: null,
      rivalPosition: null,
    };
  }

  const groupStandings = standingsMap instanceof Map 
    ? standingsMap.get(String(groupId))
    : standingsMap[String(groupId)];

  if (!groupStandings || groupStandings.length === 0) {
    return {
      homePosition: null,
      awayPosition: null,
      homePositionLabel: null,
      awayPositionLabel: null,
      clubPosition: null,
      rivalPosition: null,
    };
  }

  const clubStanding = findStandingInGroup(clubTeamName, clubFfcvId, groupStandings);
  const rivalStanding = findStandingInGroup(rivalTeamName, null, groupStandings);

  const clubPos = clubStanding?.position ?? null;
  const rivalPos = rivalStanding?.position ?? null;

  const homePos = isLocal ? clubPos : rivalPos;
  const awayPos = isLocal ? rivalPos : clubPos;

  return {
    homePosition: homePos,
    awayPosition: awayPos,
    homePositionLabel: homePos ? `${homePos}º` : null,
    awayPositionLabel: awayPos ? `${awayPos}º` : null,
    clubPosition: clubPos,
    rivalPosition: rivalPos,
  };
}
