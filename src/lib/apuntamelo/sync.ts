import https from 'https';
import { createAdminClient } from '../supabase/admin';
import { formatSpainDateTimeToIso } from '../ffcv/parser';
import {
  FFCVGroupRecord,
  FFCVStandingRecord,
  FFCVMatchRecord,
  FFCVSyncResult
} from '../ffcv/types';
import { matchPlayer } from '../ffcv/acta-sync';
import { getOfficialMatchDuration } from '../utils';

// Agent configured to bypass intermediate SSL certificate issue on apuntamelo.com
// with keepAlive: false in serverless environment to prevent stale/dead socket errors
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: false,
  timeout: 10000
});

export interface FetchApuntameloOptions {
  timeoutMs?: number;
  ttlMs?: number;
  bypassCache?: boolean;
}

interface CacheEntry<T = any> {
  data: T;
  expiresAt: number;
  staleUntil: number;
}

const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes fresh cache
const STALE_FALLBACK_TTL_MS = 60 * 60 * 1000; // 60 minutes stale-while-error fallback
const ERROR_COOLDOWN_MS = 15 * 1000; // 15 seconds cooldown on HTML/WAF/timeout errors

const apuntameloCache = new Map<string, CacheEntry>();
const apuntameloErrorCooldown = new Map<string, { message: string; expiresAt: number }>();
const apuntameloInFlight = new Map<string, Promise<any>>();

export function safeJsonParse<T = any>(raw: unknown, fallback: T): T {
  if (raw === null || raw === undefined || raw === '') return fallback;
  if (typeof raw !== 'string') return (raw as T) ?? fallback;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith('<')) return fallback;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return fallback;
  }
}

function performApuntameloRequest<T = any>(
  url: string,
  timeoutMs: number,
  redirectCount = 0
): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        agent: httpsAgent,
        timeout: timeoutMs,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'application/json, text/javascript, text/plain, */*; q=0.01',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          'X-Requested-With': 'XMLHttpRequest',
          Connection: 'close',
          Referer: 'https://apuntamelo.com/',
          Origin: 'https://apuntamelo.com'
        }
      },
      (res) => {
        const statusCode = res.statusCode || 0;
        const location = res.headers['location'];

        // Follow HTTP redirects up to 2 hops
        if ([301, 302, 303, 307, 308].includes(statusCode) && location) {
          res.resume(); // Drain socket
          if (redirectCount >= 2) {
            return reject(new Error(`Demasiadas redirecciones HTTP (${statusCode}) en ${url}`));
          }
          try {
            const redirectUrl = new URL(location, url).toString();
            return performApuntameloRequest<T>(redirectUrl, timeoutMs, redirectCount + 1).then(
              resolve,
              reject
            );
          } catch (urlErr: any) {
            return reject(new Error(`Redirección inválida desde ${url}: ${urlErr.message}`));
          }
        }

        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          // Guard against huge unexpected HTML responses (> 2MB)
          if (data.length < 2 * 1024 * 1024) {
            data += chunk;
          }
        });

        res.on('end', () => {
          // 1. Validate HTTP status code before attempting JSON parse
          if (statusCode < 200 || statusCode >= 300) {
            return reject(
              new Error(`Respuesta HTTP ${statusCode} no válida desde Apúntamelo (${url})`)
            );
          }

          const trimmed = (data || '').trim();
          if (!trimmed) {
            return reject(new Error(`Respuesta vacía desde Apúntamelo (${url})`));
          }

          // 2. Check Content-Type header and HTML prefix before calling JSON.parse
          const contentType = String(res.headers['content-type'] || '').toLowerCase();
          const looksLikeHtml =
            trimmed.startsWith('<!DOCTYPE') ||
            trimmed.startsWith('<!doctype') ||
            trimmed.startsWith('<html') ||
            trimmed.startsWith('<');

          if (looksLikeHtml || (contentType.includes('text/html') && !trimmed.startsWith('[') && !trimmed.startsWith('{'))) {
            return reject(
              new Error(
                `Apúntamelo devolvió HTML en lugar de JSON en ${url} (HTTP ${statusCode}, Content-Type: ${contentType || 'desconocido'})`
              )
            );
          }

          // 3. Parse JSON safely
          try {
            const json = JSON.parse(trimmed);
            resolve(json as T);
          } catch (e: any) {
            reject(new Error(`Error al parsear JSON de ${url}: ${e.message}`));
          }
        });
      }
    );

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Timeout (${timeoutMs}ms) en petición Apúntamelo a ${url}`));
    });

    req.on('error', (err) => reject(err));
  });
}

export async function fetchApuntameloJson<T = any>(
  url: string,
  options: FetchApuntameloOptions = {}
): Promise<T> {
  const now = Date.now();
  const timeoutMs = options.timeoutMs ?? 8000;
  const ttlMs = options.ttlMs ?? DEFAULT_CACHE_TTL_MS;

  // 1. Serve fresh cached response if available
  if (!options.bypassCache) {
    const cached = apuntameloCache.get(url);
    if (cached && now < cached.expiresAt) {
      return cached.data as T;
    }

    // 2. Check negative cache cooldown to avoid hammering Apúntamelo during an outage
    const cooldown = apuntameloErrorCooldown.get(url);
    if (cooldown && now < cooldown.expiresAt) {
      if (cached && now < cached.staleUntil) {
        return cached.data as T;
      }
      throw new Error(cooldown.message);
    }
  }

  // 3. Deduplicate concurrent in-flight requests to the exact same URL
  const existingFlight = apuntameloInFlight.get(url);
  if (existingFlight) {
    return existingFlight as Promise<T>;
  }

  const requestPromise = (async () => {
    try {
      const result = await performApuntameloRequest<T>(url, timeoutMs);
      const completedAt = Date.now();
      apuntameloCache.set(url, {
        data: result,
        expiresAt: completedAt + ttlMs,
        staleUntil: completedAt + STALE_FALLBACK_TTL_MS
      });
      apuntameloErrorCooldown.delete(url);
      return result;
    } catch (err: any) {
      const failedAt = Date.now();
      apuntameloErrorCooldown.set(url, {
        message: err?.message || `Error consultando Apúntamelo (${url})`,
        expiresAt: failedAt + ERROR_COOLDOWN_MS
      });

      // Fallback to stale cached data if available so temporary HTML/WAF responses don't break features
      const stale = apuntameloCache.get(url);
      if (stale && failedAt < stale.staleUntil) {
        console.warn(
          `[Apuntamelo] Usando datos en caché para ${url} tras fallo temporal: ${err?.message}`
        );
        return stale.data as T;
      }

      throw err;
    } finally {
      apuntameloInFlight.delete(url);
    }
  })();

  apuntameloInFlight.set(url, requestPromise);
  return requestPromise;
}

export interface ApuntameloConfig {
  ligaId: number;
  orgId: number;
  grupoId: number;
  divisionId: number;
  teamApuntameloId: number;
  groupName: string;
  category: string;
  urlEquipo: string;
}

export const APUNTAMELO_TEAMS_CONFIG: Record<string, ApuntameloConfig> = {
  // INFANTIL B (Temporada 26/27)
  '7123c91a-69c1-4b94-9f85-0914dee8bbdc': {
    ligaId: 4660,
    orgId: 29,
    grupoId: 4624,
    divisionId: 736,
    teamApuntameloId: 33431,
    groupName: 'INFANTIL F11 GRUPO 2',
    category: 'Liga Brave - Infantil F11 Grupo 2',
    urlEquipo: 'https://apuntamelo.com/equipo/33431'
  },
  // CADETE B (Temporada 26/27)
  '5633f710-7707-40d7-b812-c51a44b90d9e': {
    ligaId: 4659,
    orgId: 29,
    grupoId: 4623,
    divisionId: 980,
    teamApuntameloId: 33383,
    groupName: 'CADETE F11',
    category: 'Liga Brave - Cadete F11',
    urlEquipo: 'https://apuntamelo.com/equipo/33383'
  }
};

export function isApuntameloTeam(team: any): boolean {
  if (!team) return false;
  if (APUNTAMELO_TEAMS_CONFIG[team.id]) return true;
  if (team.ffcv_url && typeof team.ffcv_url === 'string' && team.ffcv_url.includes('apuntamelo.com')) return true;
  if (team.ffcv_group_id === '4624' || team.ffcv_group_id === '4623') return true;
  if (team.ffcv_team_id === '33431' || team.ffcv_team_id === '33383') return true;
  return false;
}

export function getApuntameloConfigForTeam(team: any): ApuntameloConfig | null {
  if (!team) return null;
  if (APUNTAMELO_TEAMS_CONFIG[team.id]) {
    return APUNTAMELO_TEAMS_CONFIG[team.id];
  }
  // Fallback check by team ID or URL
  for (const cfg of Object.values(APUNTAMELO_TEAMS_CONFIG)) {
    if (
      String(cfg.teamApuntameloId) === String(team.ffcv_team_id) ||
      String(cfg.grupoId) === String(team.ffcv_group_id) ||
      (team.ffcv_url && team.ffcv_url.includes(`/equipo/${cfg.teamApuntameloId}`))
    ) {
      return cfg;
    }
  }
  return null;
}

/**
 * Synchronizes a Liga Brave team (Infantil B or Cadete B) using apuntamelo.com API.
 * Inserts/updates:
 * - ffcv_groups (metadata)
 * - ffcv_standings (official league table)
 * - ffcv_matches (official group matches & calendar)
 * - partidos (internal matches table for Saladar)
 * - team_events (agenda calendar for families and staff)
 */
export async function syncApuntameloTeam(
  teamId: string,
  customSupabaseClient?: any
): Promise<FFCVSyncResult> {
  const supabase = customSupabaseClient || createAdminClient();
  const errors: string[] = [];

  // 1. Obtener el equipo y la temporada activa
  const { data: team, error: teamErr } = await supabase
    .from('teams')
    .select('id, name, club_id, season_id, ffcv_season_id, ffcv_competition_id, ffcv_group_id, ffcv_team_id, ffcv_url')
    .eq('id', teamId)
    .single();

  if (teamErr || !team) {
    throw new Error(`Equipo no encontrado para sincronización Apúntamelo: ${teamErr?.message || teamId}`);
  }

  const config = getApuntameloConfigForTeam(team);
  if (!config) {
    throw new Error(`No se encontró configuración de Apúntamelo/Liga Brave para el equipo ${team.name} (${teamId})`);
  }

  const seasonId = '22'; // Temporada activa 26/27 para FFCV/sistema
  const activeAppSeasonId = team.season_id || '663ed6ef-1dab-4350-9489-ed50f9e9ac15';
  const groupIdStr = String(config.grupoId);
  const competitionIdStr = String(config.divisionId);

  let standingsUpdated = 0;
  let matchesUpdated = 0;
  let totalMatchdays = 0;
  let totalTeams = 0;

  // 2. Obtener y sincronizar Clasificación desde Apúntamelo
  try {
    const clasData = await fetchApuntameloJson(
      `https://apuntamelo.com/obtenerClasificacion?id=${config.ligaId}`
    );

    if (Array.isArray(clasData) && clasData.length > 0 && clasData[0].Json_clasificacion) {
      const parsedStandings = safeJsonParse<any[]>(clasData[0].Json_clasificacion, []);
      totalTeams = parsedStandings.length;

      const standingRecords: FFCVStandingRecord[] = parsedStandings.map((t: any, idx: number) => ({
        ffcv_group_id: groupIdStr,
        ffcv_season_id: seasonId,
        ffcv_competition_id: competitionIdStr,
        matchday: 1,
        position: idx + 1,
        team_ffcv_id: String(t.Id),
        team_name: t.Nombre || 'Equipo',
        shield_url: t.Escudo ? `https://apuntamelo.com/escudos/${t.Escudo}` : null,
        points: Number(t.Puntos) || 0,
        played: Number(t.PJ) || 0,
        won: Number(t.Victorias) || 0,
        drawn: Number(t.Empates) || 0,
        lost: Number(t.Derrotas) || 0,
        goals_for: Number(t.GF) || 0,
        goals_against: Number(t.GC) || 0,
        goal_difference: (Number(t.GF) || 0) - (Number(t.GC) || 0),
        penalty_points: 0,
        home_played: 0,
        home_won: 0,
        home_drawn: 0,
        home_lost: 0,
        away_played: 0,
        away_won: 0,
        away_drawn: 0,
        away_lost: 0,
        home_points: 0,
        away_points: 0,
        updated_at: new Date().toISOString()
      }));

      const { error: sErr } = await supabase
        .from('ffcv_standings')
        .upsert(standingRecords, { onConflict: 'ffcv_group_id,matchday,team_ffcv_id' });

      if (sErr) {
        errors.push(`Error al guardar clasificación en ffcv_standings: ${sErr.message}`);
      } else {
        standingsUpdated = standingRecords.length;
      }

      // 2b. Sincronizar Ficha Completa del Equipo (Plantilla, Pichichi, Puntuación Fantasy, Valores, Logros)
      try {
        const infoArr = await fetchApuntameloJson<any[]>(
          `https://apuntamelo.com/obtenerInfoEquipo?equipo=${config.teamApuntameloId}`
        );
        if (Array.isArray(infoArr) && infoArr.length > 0) {
          const teamData = infoArr[0];
          await supabase
            .from('ffcv_standings')
            .update({
              raw_data: {
                teamData,
                updated_at: new Date().toISOString()
              }
            })
            .eq('team_ffcv_id', String(config.teamApuntameloId))
            .eq('ffcv_season_id', seasonId);
        }
      } catch (infoErr: any) {
        console.warn(`[syncApuntameloTeam] Error no bloqueante al obtenerInfoEquipo para ${team.name}:`, infoErr.message);
      }
    }
  } catch (err: any) {
    errors.push(`Error al consultar clasificación en Apúntamelo: ${err.message}`);
  }

  // 3. Obtener todos los partidos del grupo desde Apúntamelo
  let allGroupMatches: any[] = [];
  const realScoresMap = new Map<string, { homeScore: number; awayScore: number }>();
  try {
    const rawMatches = await fetchApuntameloJson(
      `https://apuntamelo.com/obtenerPartidosPorJornada?organizacion=${config.orgId}&grupo=${config.grupoId}`
    );

    if (Array.isArray(rawMatches) && rawMatches.length > 0) {
      allGroupMatches = rawMatches;
      const matchdayNumbers = rawMatches.map((m: any) => Number(m.Jornada)).filter(Boolean);
      totalMatchdays = matchdayNumbers.length > 0 ? Math.max(...matchdayNumbers) : 0;

      // Consultar partidos del grupo ya existentes en BD para no volver a pedir detalles de partidos antiguos ya cerrados
      const { data: existingGroupMatches } = await supabase
        .from('ffcv_matches')
        .select('ffcv_match_id, home_score, away_score, status, is_closed')
        .eq('ffcv_group_id', groupIdStr)
        .neq('ffcv_season_id', '21')
        .eq('ffcv_season_id', seasonId);

      const existingGroupMap = new Map<string, any>(
        (existingGroupMatches || []).map((m: any) => [String(m.ffcv_match_id), m])
      );

      // Obtener resultados reales de los partidos jugados para evitar truncamiento por regla de 5 goles en formativo
      const playedMatchesInGroup = rawMatches.filter(
        (m: any) => m.Goles_A !== null && m.Goles_B !== null && m.Goles_A !== undefined && m.Goles_B !== undefined
      );

      const nowMs = Date.now();
      const matchesNeedingDetailFetch: any[] = [];

      for (const pm of playedMatchesInGroup) {
        const matchIdStr = String(pm.Id);
        const existing = existingGroupMap.get(matchIdStr);
        const isOurMatch =
          Number(pm.FK_EquipoLiga_A) === config.teamApuntameloId ||
          Number(pm.FK_EquipoLiga_B) === config.teamApuntameloId;
        const matchDateMs = pm.Fecha ? new Date(pm.Fecha).getTime() : 0;
        const isRecent = matchDateMs > 0 && nowMs - matchDateMs <= 7 * 24 * 60 * 60 * 1000;

        if (
          existing &&
          existing.is_closed &&
          existing.home_score !== null &&
          existing.away_score !== null &&
          !isRecent &&
          !isOurMatch
        ) {
          realScoresMap.set(matchIdStr, {
            homeScore: Math.max(Number(pm.Goles_A) || 0, Number(existing.home_score) || 0),
            awayScore: Math.max(Number(pm.Goles_B) || 0, Number(existing.away_score) || 0)
          });
        } else {
          matchesNeedingDetailFetch.push(pm);
        }
      }

      // Ejecutar peticiones de detalle en lotes pequeños (máx. 4 simultáneas) para evitar bloqueos WAF y picos de CPU
      const BATCH_SIZE = 4;
      for (let i = 0; i < matchesNeedingDetailFetch.length; i += BATCH_SIZE) {
        const batch = matchesNeedingDetailFetch.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async (pm: any) => {
            try {
              const mDetail = await fetchApuntameloJson<any[]>(
                `https://apuntamelo.com/obtenerInfoPartido?id=${pm.Id}`,
                { ttlMs: 30 * 60 * 1000 }
              );
              if (Array.isArray(mDetail) && mDetail.length > 0 && mDetail[0].Json_goles) {
                const gList = safeJsonParse<any[]>(mDetail[0].Json_goles, []);
                let cA = 0;
                let cB = 0;
                gList.forEach((g: any) => {
                  if (Number(g.FK_EquipoLiga) === Number(pm.FK_EquipoLiga_A)) cA++;
                  if (Number(g.FK_EquipoLiga) === Number(pm.FK_EquipoLiga_B)) cB++;
                });
                if (cA + cB > 0) {
                  realScoresMap.set(String(pm.Id), {
                    homeScore: Math.max(Number(pm.Goles_A) || 0, cA),
                    awayScore: Math.max(Number(pm.Goles_B) || 0, cB)
                  });
                }
              }
            } catch {
              // Mantener goles de cabecera si falla la petición individual
            }
          })
        );
      }

      const matchRecords: FFCVMatchRecord[] = rawMatches.map((m: any) => {
        const hasScore = m.Goles_A !== null && m.Goles_B !== null && m.Goles_A !== undefined && m.Goles_B !== undefined;
        const horaFormateada = m.Hora && typeof m.Hora === 'string' && m.Hora.trim() !== '' && m.Hora !== '00:00:00'
          ? m.Hora.slice(0, 5)
          : null;
        const isoDateTime = formatSpainDateTimeToIso(m.Fecha, horaFormateada);

        const realScore = realScoresMap.get(String(m.Id));
        const finalHomeScore = hasScore ? (realScore ? realScore.homeScore : Number(m.Goles_A)) : null;
        const finalAwayScore = hasScore ? (realScore ? realScore.awayScore : Number(m.Goles_B)) : null;

        const isPostponed = !hasScore && (
          String(m.Id) === '302768' ||
          (Number(m.Jornada) === 1 && (String(m.FK_EquipoLiga_A) === '33383' || String(m.FK_EquipoLiga_B) === '33383'))
        );

        return {
          ffcv_match_id: String(m.Id),
          ffcv_group_id: groupIdStr,
          ffcv_season_id: seasonId,
          ffcv_competition_id: competitionIdStr,
          matchday: Number(m.Jornada) || 1,
          match_date: m.Fecha || null,
          match_time: horaFormateada,
          datetime: isoDateTime,
          home_team_ffcv_id: String(m.FK_EquipoLiga_A),
          away_team_ffcv_id: String(m.FK_EquipoLiga_B),
          home_team_name: m.Nombre_A || 'Local',
          away_team_name: m.Nombre_B || 'Visitante',
          home_shield_url: m.Escudo_A || null,
          away_shield_url: m.Escudo_B || null,
          home_score: finalHomeScore,
          away_score: finalAwayScore,
          status: hasScore ? 'played' : (isPostponed ? 'postponed' : 'scheduled'),
          pitch_name: m.Nombre_campo || null,
          codacta: String(m.Id),
          is_closed: hasScore,
          raw_data: { source: 'apuntamelo', ...m },
          updated_at: new Date().toISOString()
        };
      });

      // Insertar/actualizar partidos del grupo en ffcv_matches
      const { error: mErr } = await supabase
        .from('ffcv_matches')
        .upsert(matchRecords, { onConflict: 'ffcv_match_id' });

      if (mErr) {
        errors.push(`Error al guardar partidos en ffcv_matches: ${mErr.message}`);
      } else {
        matchesUpdated = matchRecords.length;

        // Limpiar registros huérfanos obsoletos en ffcv_matches para este grupo
        const currentMatchIds = new Set(matchRecords.map((m: any) => m.ffcv_match_id));
        const orphanIds = (existingGroupMatches || [])
          .map((m: any) => m.ffcv_match_id)
          .filter((id: string) => !currentMatchIds.has(id));

        if (orphanIds.length > 0) {
          await supabase
            .from('ffcv_matches')
            .delete()
            .in('ffcv_match_id', orphanIds);
        }
      }
    }
  } catch (err: any) {
    errors.push(`Error al obtener partidos del grupo en Apúntamelo: ${err.message}`);
  }

  // 4. Upsert en ffcv_groups (metadatos del grupo)
  try {
    const groupRecord: FFCVGroupRecord = {
      ffcv_season_id: seasonId,
      ffcv_competition_id: competitionIdStr,
      ffcv_group_id: groupIdStr,
      season_name: 'Temporada 26/27',
      competition_name: 'Liga Brave',
      group_name: config.groupName,
      total_matchdays: totalMatchdays || 22,
      total_teams: totalTeams || 11,
      last_synced_at: new Date().toISOString()
    };

    await supabase
      .from('ffcv_groups')
      .upsert(groupRecord, { onConflict: 'ffcv_season_id,ffcv_competition_id,ffcv_group_id' });
  } catch (err: any) {
    console.warn('[syncApuntameloTeam] Error actualizando ffcv_groups:', err.message);
  }

  // 5. Volcar y actualizar los partidos del Sporting Saladar en la tabla interna `partidos`
  try {
    const saladarMatches = allGroupMatches.filter(
      (m: any) =>
        Number(m.FK_EquipoLiga_A) === config.teamApuntameloId ||
        Number(m.FK_EquipoLiga_B) === config.teamApuntameloId
    );

    // Obtener los partidos existentes, jugadores y eventos del equipo en paralelo (evita N+1 consultas dentro del bucle)
    const [
      { data: existingPartidos },
      { data: teamPlayers },
      { data: initialTeamMatchEvents }
    ] = await Promise.all([
      supabase
        .from('partidos')
        .select('id, rival_nombre, fecha_hora, acta_oficial_url, lugar, highlight_jornada, estado, coach_summary')
        .eq('equipo_id', teamId)
        .eq('season_id', activeAppSeasonId),
      supabase
        .from('players')
        .select('id, first_name, last_name, dorsal, team_id')
        .eq('team_id', teamId),
      supabase
        .from('team_events')
        .select('id, date, title, notes')
        .eq('team_id', teamId)
        .eq('event_type', 'Partido')
        .eq('season_id', activeAppSeasonId)
    ]);

    const teamMatchEvents = initialTeamMatchEvents ? [...initialTeamMatchEvents] : [];
    const existingPartidoIds = (existingPartidos || []).map((ep: any) => ep.id);
    const { data: allExistingConvs } = existingPartidoIds.length > 0
      ? await supabase
          .from('convocatorias')
          .select('partido_id, player_id, minutos_jugados, minutes_played')
          .in('partido_id', existingPartidoIds)
      : { data: [] as any[] };

    const convsByPartidoMap = new Map<string, any[]>();
    for (const conv of allExistingConvs || []) {
      const list = convsByPartidoMap.get(conv.partido_id) || [];
      list.push(conv);
      convsByPartidoMap.set(conv.partido_id, list);
    }

    const nowMs = Date.now();

    for (const sm of saladarMatches) {
      const isHome = Number(sm.FK_EquipoLiga_A) === config.teamApuntameloId;
      const rivalName = isHome ? sm.Nombre_B : sm.Nombre_A;
      const matchUrl = `https://apuntamelo.com/partido/${sm.Id}`;
      const horaFormateada = sm.Hora && typeof sm.Hora === 'string' && sm.Hora.trim() !== '' && sm.Hora !== '00:00:00'
        ? sm.Hora.slice(0, 5)
        : null;
      const isoDateTime = formatSpainDateTimeToIso(sm.Fecha, horaFormateada) || `${sm.Fecha}T10:00:00+02:00`;
      const hasScore = sm.Goles_A !== null && sm.Goles_B !== null && sm.Goles_A !== undefined && sm.Goles_B !== undefined;
      
      const realScore = realScoresMap.get(String(sm.Id));
      const effectiveHomeScore = realScore ? realScore.homeScore : (hasScore ? Number(sm.Goles_A) : null);
      const effectiveAwayScore = realScore ? realScore.awayScore : (hasScore ? Number(sm.Goles_B) : null);
      const scorePropio = hasScore ? (isHome ? effectiveHomeScore : effectiveAwayScore) : null;
      const scoreRival = hasScore ? (isHome ? effectiveAwayScore : effectiveHomeScore) : null;
      
      const isPostponed = !hasScore && (
        String(sm.Id) === '302768' ||
        (Number(sm.Jornada) === 1 && config.teamApuntameloId === 33383)
      );

      const lugar = isHome ? 'Local' : 'Visitante';

      // Buscar si ya existe este partido en 'partidos'
      const matchExact = (existingPartidos || []).find((ep: any) => {
        if (ep.acta_oficial_url && ep.acta_oficial_url.includes(String(sm.Id))) return true;
        // Si no tiene acta_oficial_url, buscar por rival y fecha cercana
        if (ep.rival_nombre && ep.fecha_hora) {
          const diffDays = Math.abs(
            (new Date(ep.fecha_hora).getTime() - new Date(sm.Fecha).getTime()) / (1000 * 60 * 60 * 24)
          );
          const r1 = (ep.rival_nombre || '').toLowerCase();
          const r2 = (rivalName || '').toLowerCase();
          if (diffDays <= 7 && (r1.includes(r2) || r2.includes(r1))) return true;
        }
        return false;
      });

      const estado = hasScore
        ? 'Finalizado'
        : (isPostponed || (matchExact && (matchExact.estado === 'Aplazado' || matchExact.estado === 'Suspendido' || matchExact.coach_summary?.includes('APLAZADO')))
          ? 'Aplazado'
          : 'Programado');

      let resolvedMatchId = matchExact ? matchExact.id : null;

      if (matchExact) {
        // Actualizar datos del partido
        await supabase
          .from('partidos')
          .update({
            rival_nombre: rivalName,
            fecha_hora: isoDateTime,
            lugar,
            resultado_propio: scorePropio,
            resultado_rival: scoreRival,
            estado,
            acta_oficial_url: matchUrl
          })
          .eq('id', matchExact.id);

        // Si el partido no tiene resultado (ej. aplazado que tenía datos residuales), limpiar convocatorias
        if (!hasScore) {
          await supabase.from('convocatorias').delete().eq('partido_id', matchExact.id);
        }
      } else {
        // Insertar nuevo partido
        const { data: insertedMatch } = await supabase
          .from('partidos')
          .insert({
            club_id: team.club_id || '7ff5dbeb-2942-4576-8e74-b45a17646fb7',
            equipo_id: teamId,
            season_id: activeAppSeasonId,
            rival_nombre: rivalName,
            fecha_hora: isoDateTime,
            lugar,
            resultado_propio: scorePropio,
            resultado_rival: scoreRival,
            estado,
            acta_oficial_url: matchUrl,
            highlight_jornada: false
          })
          .select('id')
          .single();

        if (insertedMatch) {
          resolvedMatchId = insertedMatch.id;
        }
      }

      // Si el partido está disputado, sincronizar goles y tarjetas a la tabla convocatorias
      if (hasScore && resolvedMatchId) {
        const existingConvs = convsByPartidoMap.get(resolvedMatchId) || [];
        const matchDateMs = sm.Fecha ? new Date(sm.Fecha).getTime() : nowMs;
        const isOlderThan7Days = !isNaN(matchDateMs) && (nowMs - matchDateMs) > 7 * 24 * 60 * 60 * 1000;
        const alreadyFullySynced =
          matchExact?.estado === 'Finalizado' &&
          existingConvs.length > 0 &&
          isOlderThan7Days;

        if (!alreadyFullySynced) {
          try {
            const matchInfoArr = await fetchApuntameloJson<any[]>(
              `https://apuntamelo.com/obtenerInfoPartido?id=${sm.Id}`
            );

            if (Array.isArray(matchInfoArr) && matchInfoArr.length > 0) {
              const mInfo = matchInfoArr[0];

              // Reconciliar goles reales de los jugadores si difieren del marcador truncado por regla formativa de 5 goles
              try {
                const gList = safeJsonParse<any[]>(mInfo.Json_goles, []);
                let cA = 0;
                let cB = 0;
                gList.forEach((g: any) => {
                  if (Number(g.FK_EquipoLiga) === Number(sm.FK_EquipoLiga_A)) cA++;
                  if (Number(g.FK_EquipoLiga) === Number(sm.FK_EquipoLiga_B)) cB++;
                });
                if (cA + cB > 0) {
                  const finalA = Math.max(Number(sm.Goles_A) || 0, cA);
                  const finalB = Math.max(Number(sm.Goles_B) || 0, cB);
                  const finalPropio = isHome ? finalA : finalB;
                  const finalRival = isHome ? finalB : finalA;

                  await supabase
                    .from('partidos')
                    .update({
                      resultado_propio: finalPropio,
                      resultado_rival: finalRival,
                      estado: 'Finalizado'
                    })
                    .eq('id', resolvedMatchId);

                  await supabase
                    .from('ffcv_matches')
                    .update({
                      home_score: finalA,
                      away_score: finalB,
                      status: 'played',
                      is_closed: true
                    })
                    .eq('ffcv_match_id', String(sm.Id));
                }
              } catch (errGoles) {
                console.warn('[syncApuntameloTeam] Error reconciliando Json_goles:', errGoles);
              }

              if (teamPlayers && teamPlayers.length > 0) {
                const puntuaciones = safeJsonParse<any[]>(mInfo.Json_puntuaciones, []);
                const noticias = safeJsonParse<any[]>(mInfo.Json_noticias, []);

                const teamPuntuaciones = puntuaciones.filter(
                  (p: any) =>
                    Number(p.FK_EquipoLiga) === config.teamApuntameloId ||
                    Number(p.EquipoLiga) === config.teamApuntameloId
                );

                const existingConvMap = new Map(existingConvs.map((c: any) => [c.player_id, c.minutos_jugados ?? c.minutes_played]));

                // Duración reglamentaria exacta: Infantil 70 mins (2x35'), Cadete 80 mins (2x40'), Juvenil 90 mins (2x45')
                const categoryDuration = getOfficialMatchDuration(config.category || team.name, 'Liga Brave');

                const convocatoriasToUpsert: any[] = [];
                for (const pStats of teamPuntuaciones) {
                  const matched = matchPlayer(pStats.Nombre || '', pStats.Dorsal, teamPlayers, teamPlayers);
                  if (!matched) continue;

                  let playerGoals = Number(pStats.Goles) || 0;
                  let playerYellows = Number(pStats.Amarillas) || 0;
                  let playerReds = Number(pStats.Rojas) || 0;

                  // Verificar también en la crónica en vivo (Json_noticias)
                  const cardNoticias = noticias.filter(
                    (n: any) =>
                      Number(n.FK_EquipoLiga) === config.teamApuntameloId &&
                      (String(n.FK_JugadorLiga) === String(pStats.FK_JugadorLiga) ||
                        (n.Nombre_Jugador &&
                          matched.first_name &&
                          matched.last_name &&
                          n.Nombre_Jugador.toLowerCase().includes(matched.last_name.toLowerCase().trim())))
                  );

                  for (const cn of cardNoticias) {
                    if (cn.Icono === 5 || (cn.Narraciones_Claves || []).includes('tarjetas.noticia.amarilla')) {
                      playerYellows = Math.max(playerYellows, 1);
                    }
                    if (cn.Icono === 6 || (cn.Narraciones_Claves || []).includes('tarjetas.noticia.roja')) {
                      playerReds = Math.max(playerReds, 1);
                    }
                  }

                  const prevMins = existingConvMap.get(matched.id);
                  const hasManualMins = typeof prevMins === 'number' && prevMins > 0 && prevMins <= categoryDuration;

                  const calculatedMins = hasManualMins
                    ? prevMins
                    : (pStats.Suplente ? Math.round(categoryDuration / 2) : categoryDuration);

                  convocatoriasToUpsert.push({
                    partido_id: resolvedMatchId,
                    player_id: matched.id,
                    status: 'convocado',
                    titular: !Boolean(pStats.Suplente),
                    yellow_cards: playerYellows,
                    tarjetas_amarillas: playerYellows,
                    red_cards: playerReds,
                    tarjetas_rojas: playerReds,
                    goals: playerGoals,
                    goles: playerGoals,
                    minutes_played: calculatedMins,
                    minutos_jugados: calculatedMins
                  });
                }

                if (convocatoriasToUpsert.length > 0) {
                  await supabase
                    .from('convocatorias')
                    .upsert(convocatoriasToUpsert, { onConflict: 'partido_id,player_id' });
                }
              }
            }
          } catch (detailErr: any) {
            console.warn(`[syncApuntameloTeam] Error extrayendo estadísticas del partido ${sm.Id}:`, detailErr.message);
          }
        }
      }

      // Propagar también a agenda / team_events (Regla 5)
      try {
        const eventTitle = isHome
          ? `Sporting Saladar vs ${rivalName}`
          : `${rivalName} vs Sporting Saladar`;

        const sTime = horaFormateada ? `${horaFormateada}:00` : '10:00:00';
        const eTime = horaFormateada
          ? `${String(Math.min(23, parseInt(horaFormateada.split(':')[0], 10) + 2)).padStart(2, '0')}:${horaFormateada.split(':')[1] || '00'}:00`
          : '12:00:00';

        const pitchLocation = isHome
          ? 'Polideportivo Municipal del Saladar'
          : (sm.Nombre_campo || sm.Campo || 'Visitante');

        const jornadaStr = `Jornada ${sm.Jornada} Liga Brave`;
        const matchedEvent = (teamMatchEvents || []).find((ev: any) => {
          if (ev.notes && ev.notes.includes(jornadaStr)) return true;
          // Fallback por rival SOLO si no tiene otra jornada asignada y la fecha es cercana (<= 7 días)
          if (!ev.notes?.includes('Jornada') && ev.title && (ev.title.toLowerCase().includes(rivalName.toLowerCase()) || rivalName.toLowerCase().includes(ev.title.toLowerCase()))) {
            const diffDays = Math.abs((new Date(ev.date).getTime() - new Date(sm.Fecha).getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays <= 7) return true;
          }
          return false;
        });

        const eventNotes = isPostponed
          ? `${jornadaStr} (Aplazado - ${isHome ? 'Local' : 'Visitante'})`
          : `${jornadaStr} (${isHome ? 'Local' : 'Visitante'})`;

        if (matchedEvent) {
          // Actualizar evento existente
          await supabase
            .from('team_events')
            .update({
              title: eventTitle,
              date: sm.Fecha,
              start_time: sTime,
              end_time: eTime,
              location: pitchLocation,
              notes: eventNotes
            })
            .eq('id', matchedEvent.id);

          // Si hubiera eventos duplicados huérfanos con la misma jornada, eliminarlos
          const duplicateEvents = (teamMatchEvents || []).filter(
            (ev: any) => ev.id !== matchedEvent.id && ev.notes && ev.notes.includes(jornadaStr)
          );
          for (const dup of duplicateEvents) {
            await supabase.from('team_events').delete().eq('id', dup.id);
          }
        } else {
          // Insertar nuevo evento
          const { data: insertedEvt } = await supabase
            .from('team_events')
            .insert({
              team_id: teamId,
              title: eventTitle,
              event_type: 'Partido',
              date: sm.Fecha,
              start_time: sTime,
              end_time: eTime,
              location: pitchLocation,
              notes: eventNotes,
              season_id: activeAppSeasonId
            })
            .select('id, date, title, notes')
            .single();
          if (insertedEvt) {
            teamMatchEvents.push(insertedEvt);
          }
        }
      } catch (evtErr: any) {
        console.warn(`[syncApuntameloTeam] Error propagando evento para jornada ${sm.Jornada}:`, evtErr.message);
      }
    }
  } catch (pErr: any) {
    errors.push(`Error volcando partidos de Saladar a tabla partidos: ${pErr.message}`);
  }

  // 6. Actualizar metadatos del equipo en la tabla `teams`
  await supabase
    .from('teams')
    .update({
      ffcv_season_id: seasonId,
      ffcv_competition_id: competitionIdStr,
      ffcv_group_id: groupIdStr,
      ffcv_team_id: String(config.teamApuntameloId),
      ffcv_url: config.urlEquipo,
      category: config.category,
      ffcv_last_synced_at: new Date().toISOString()
    })
    .eq('id', teamId);

  return {
    success: errors.length === 0,
    group: {
      seasonId,
      competitionId: competitionIdStr,
      groupId: groupIdStr,
      totalMatchdays,
      totalTeams
    },
    standingsInsertedOrUpdated: standingsUpdated,
    matchesInsertedOrUpdated: matchesUpdated,
    matchdaysSynced: Array.from({ length: totalMatchdays }, (_, i) => i + 1),
    errors: errors.length > 0 ? errors : undefined
  };
}
