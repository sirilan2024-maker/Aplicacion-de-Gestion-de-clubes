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
import { assignTacticalCoordinatesForStarters, StarterPositionInput } from '../ffcv/tactical-lineup';
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

/**
 * Allows external callers (such as the GitHub Actions cron POST payload)
 * to pre-populate the Apúntamelo memory cache so serverless runs don't get blocked by Cloudflare WAF.
 */
export function injectApuntameloCache(
  entries: Record<string, any>,
  ttlMs: number = 30 * 60 * 1000
): void {
  if (!entries || typeof entries !== 'object') return;
  const now = Date.now();
  for (const [url, data] of Object.entries(entries)) {
    if (url && data !== undefined && data !== null) {
      apuntameloCache.set(url, {
        data,
        expiresAt: now + ttlMs,
        staleUntil: now + Math.max(ttlMs * 2, STALE_FALLBACK_TTL_MS)
      });
      apuntameloErrorCooldown.delete(url);
    }
  }
}

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
  redirectCount = 0,
  useMobileUa = false
): Promise<T> {
  const proxyBase = process.env.APUNTAMELO_PROXY_URL?.trim();
  if (proxyBase) {
    return performProxyApuntameloRequest<T>(url, proxyBase, timeoutMs).catch((proxyErr) => {
      console.warn(`[Apuntamelo Proxy] Fallo en proxy (${proxyErr.message}). Reintentando conexión directa...`);
      return performDirectApuntameloRequest<T>(url, timeoutMs, redirectCount, useMobileUa);
    });
  }
  return performDirectApuntameloRequest<T>(url, timeoutMs, redirectCount, useMobileUa);
}

function performProxyApuntameloRequest<T = any>(
  targetUrl: string,
  proxyBase: string,
  timeoutMs: number
): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      const pUrl = new URL(proxyBase);
      pUrl.searchParams.set('url', targetUrl);
      const proxySecret = process.env.APUNTAMELO_PROXY_SECRET?.trim();
      const headers: Record<string, string> = {
        Accept: 'application/json, text/plain, */*'
      };
      if (proxySecret) {
        headers['Authorization'] = `Bearer ${proxySecret}`;
      }

      const req = https.get(
        pUrl.toString(),
        {
          agent: httpsAgent,
          timeout: timeoutMs,
          headers
        },
        (res) => {
          const statusCode = res.statusCode || 0;
          let data = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            if (data.length < 2 * 1024 * 1024) data += chunk;
          });
          res.on('end', () => {
            if (statusCode < 200 || statusCode >= 300) {
              return reject(new Error(`Proxy HTTP ${statusCode}: ${data.slice(0, 200)}`));
            }
            const trimmed = data.trim();
            if (!trimmed || trimmed.startsWith('<')) {
              return reject(new Error('Proxy devolvió HTML o respuesta vacía'));
            }
            try {
              resolve(JSON.parse(trimmed) as T);
            } catch (e: any) {
              reject(new Error(`Error parseando JSON devuelto por proxy: ${e.message}`));
            }
          });
        }
      );

      req.setTimeout(timeoutMs, () => {
        req.destroy(new Error(`Timeout (${timeoutMs}ms) en proxy hacia ${targetUrl}`));
      });
      req.on('error', (err) => reject(err));
    } catch (err: any) {
      reject(err);
    }
  });
}

function performDirectApuntameloRequest<T = any>(
  url: string,
  timeoutMs: number,
  redirectCount = 0,
  useMobileUa = false
): Promise<T> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = useMobileUa
      ? {
          'User-Agent': 'Apuntamelo/2.4.1 (es.apuntamelo.app; build:42; iOS 17.4.0) Alamofire/5.8.1',
          Accept: 'application/json, text/plain, */*',
          'Accept-Language': 'es-ES,es;q=0.9'
        }
      : {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'application/json, text/javascript, */*; q=0.01',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          'X-Requested-With': 'XMLHttpRequest',
          'Sec-Fetch-Site': 'same-origin',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Dest': 'empty',
          'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          Referer: 'https://apuntamelo.com/'
        };

    const req = https.get(
      url,
      {
        agent: httpsAgent,
        timeout: timeoutMs,
        headers
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
            return performDirectApuntameloRequest<T>(redirectUrl, timeoutMs, redirectCount + 1, useMobileUa).then(
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
          // If Cloudflare challenges the desktop UA with 403, retry once with mobile app headers
          if (statusCode === 403 && !useMobileUa) {
            return performDirectApuntameloRequest<T>(url, timeoutMs, redirectCount, true).then(
              resolve,
              reject
            );
          }

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
        .select('id, rival_nombre, fecha_hora, hora_citacion, acta_oficial_url, lugar, highlight_jornada, estado, coach_summary, coach_report')
        .eq('equipo_id', teamId)
        .eq('season_id', activeAppSeasonId),
      supabase
        .from('players')
        .select('id, first_name, last_name, dorsal, team_id, posicion')
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
    const [{ data: allExistingConvs }, { data: allExistingMatchEvents }] = existingPartidoIds.length > 0
      ? await Promise.all([
          supabase
            .from('convocatorias')
            .select('partido_id, player_id, titular, tactical_x, tactical_y, minutos_jugados, minutes_played')
            .in('partido_id', existingPartidoIds),
          supabase
            .from('match_events')
            .select('id, partido_id, tipo_evento, notas')
            .in('partido_id', existingPartidoIds)
        ])
      : [{ data: [] as any[] }, { data: [] as any[] }];

    const convsByPartidoMap = new Map<string, any[]>();
    for (const conv of allExistingConvs || []) {
      const list = convsByPartidoMap.get(conv.partido_id) || [];
      list.push(conv);
      convsByPartidoMap.set(conv.partido_id, list);
    }

    const eventsByPartidoMap = new Map<string, any[]>();
    for (const ev of allExistingMatchEvents || []) {
      const list = eventsByPartidoMap.get(ev.partido_id) || [];
      list.push(ev);
      eventsByPartidoMap.set(ev.partido_id, list);
    }

    const nowMs = Date.now();
    const categoryDuration = getOfficialMatchDuration(config.category || team.name, 'Liga Brave');

    for (const sm of saladarMatches) {
      const isHome = Number(sm.FK_EquipoLiga_A) === config.teamApuntameloId;
      const rivalName = isHome ? sm.Nombre_B : sm.Nombre_A;
      const matchUrl = `https://apuntamelo.com/partido/${sm.Id}`;
      const horaFormateada = sm.Hora && typeof sm.Hora === 'string' && sm.Hora.trim() !== '' && sm.Hora !== '00:00:00'
        ? sm.Hora.slice(0, 5)
        : null;
      const isoDateTime = formatSpainDateTimeToIso(sm.Fecha, horaFormateada) || `${sm.Fecha}T10:00:00+02:00`;
      const hasScore = sm.Goles_A !== null && sm.Goles_B !== null && sm.Goles_A !== undefined && sm.Goles_B !== undefined;
      const hasStartedOrPlayed = hasScore || sm.Tipo === 'jugado' || Boolean(sm.Inicio);
      
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
      const matchExact = findMatchingInternalPartido(existingPartidos || [], sm, rivalName);

      const initialEstado = hasScore
        ? (Number(sm.Validado) === 0 && sm.Inicio ? 'En Curso' : 'Finalizado')
        : (isPostponed || (matchExact && (matchExact.estado === 'Aplazado' || matchExact.estado === 'Suspendido' || matchExact.coach_summary?.includes('APLAZADO')))
          ? 'Aplazado'
          : 'Programado');

      let resolvedMatchId = matchExact ? matchExact.id : null;
      const isoMs = new Date(isoDateTime).getTime();
      const defaultCitacionIso = !isNaN(isoMs)
        ? new Date(isoMs - 60 * 60 * 1000).toISOString()
        : null;

      if (matchExact) {
        const prevMs = matchExact.fecha_hora ? new Date(matchExact.fecha_hora).getTime() : NaN;
        const scheduleChanged = isNaN(prevMs) || (!isNaN(isoMs) && Math.abs(prevMs - isoMs) > 60000);
        const baseUpdate: Record<string, any> = {
          rival_nombre: rivalName,
          fecha_hora: isoDateTime,
          lugar,
          resultado_propio: scorePropio,
          resultado_rival: scoreRival,
          estado: initialEstado,
          acta_oficial_url: matchUrl
        };
        if ((scheduleChanged || !matchExact.hora_citacion) && defaultCitacionIso) {
          baseUpdate.hora_citacion = defaultCitacionIso;
        }

        // Actualizar datos base del partido
        await supabase
          .from('partidos')
          .update(baseUpdate)
          .eq('id', matchExact.id);

        // Si el partido fue aplazado y tenía datos residuales de una disputa previa errónea, limpiar convocatorias
        if (!hasStartedOrPlayed && isPostponed && matchExact.estado === 'Finalizado') {
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
            hora_citacion: defaultCitacionIso,
            lugar,
            resultado_propio: scorePropio,
            resultado_rival: scoreRival,
            estado: initialEstado,
            acta_oficial_url: matchUrl,
            highlight_jornada: false
          })
          .select('id')
          .single();

        if (insertedMatch) {
          resolvedMatchId = insertedMatch.id;
        }
      }

      // Si el partido está en juego o disputado, sincronizar goles, tarjetas, cronómetro, alineación y narración en vivo
      if (hasStartedOrPlayed && resolvedMatchId) {
        const existingConvs = convsByPartidoMap.get(resolvedMatchId) || [];
        const existingEvs = eventsByPartidoMap.get(resolvedMatchId) || [];
        const hasSyncedConvs = existingConvs.some((c: any) => (c.minutos_jugados ?? c.minutes_played ?? 0) > 0);
        const hasTacticalCoords = existingConvs.some((c: any) => c.titular && c.tactical_x != null);
        const hasBraveEvents = existingEvs.some((e: any) => e.notas && (e.notas.includes('[BRAVE') || e.notas.startsWith('[LOCAL]') || e.notas.startsWith('[VISITANTE]')));
        const matchDateMs = sm.Fecha ? new Date(sm.Fecha).getTime() : nowMs;
        const isOlderThan7Days = !isNaN(matchDateMs) && (nowMs - matchDateMs) > 7 * 24 * 60 * 60 * 1000;
        const alreadyFullySynced =
          matchExact?.estado === 'Finalizado' &&
          Number(sm.Validado) === 1 &&
          hasSyncedConvs &&
          hasTacticalCoords &&
          hasBraveEvents &&
          isOlderThan7Days;

        if (!alreadyFullySynced) {
          try {
            const isRecentOrLive = !isOlderThan7Days || Number(sm.Validado) === 0;
            const matchInfoArr = await fetchApuntameloJson<any[]>(
              `https://apuntamelo.com/obtenerInfoPartido?id=${sm.Id}`,
              { ttlMs: isRecentOrLive ? 12 * 1000 : 10 * 60 * 1000 }
            );

            if (Array.isArray(matchInfoArr) && matchInfoArr.length > 0) {
              const mInfo = matchInfoArr[0];
              await syncApuntameloMatchDetailToDb({
                supabase,
                config,
                partidoId: resolvedMatchId,
                existingPartido: matchExact,
                existingCoachReport: matchExact?.coach_report,
                existingConvs,
                sm,
                mInfo,
                teamPlayers: teamPlayers || [],
                categoryDuration
              });
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
  // Solo actualizar ffcv_last_synced_at si no hubo errores (evita falsos "sincronizados" si Cloudflare bloqueó la petición)
  const teamUpdatePayload: Record<string, any> = {
    ffcv_season_id: seasonId,
    ffcv_competition_id: competitionIdStr,
    ffcv_group_id: groupIdStr,
    ffcv_team_id: String(config.teamApuntameloId),
    ffcv_url: config.urlEquipo,
    category: config.category
  };
  if (errors.length === 0) {
    teamUpdatePayload.ffcv_last_synced_at = new Date().toISOString();
  }

  await supabase
    .from('teams')
    .update(teamUpdatePayload)
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

function normalizeBraveRival(name?: string | null): string {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(c\.?d\.?|c\.?f\.?|u\.?d\.?|f\.?c\.?|a\.?d\.?|club|deportivo|futbol|e\.?d\.?m\.?|e\.?m\.?f\.?)\b/gi, '')
    .replace(/['"“”‘’]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function findMatchingInternalPartido(existingPartidos: any[], sm: any, rivalName: string): any | undefined {
  // 1. Coincidencia exacta por ID de Apúntamelo en acta_oficial_url
  const byId = (existingPartidos || []).find(
    (ep: any) => ep.acta_oficial_url && ep.acta_oficial_url.includes(String(sm.Id))
  );
  if (byId) return byId;

  // 2. Coincidencia por proximidad de fecha (<= 7 días, Regla 3.2) y nombre de rival normalizado
  const smDateStr = sm.Fecha ? String(sm.Fecha).split(' ')[0] : '';
  const smDateMs = smDateStr ? new Date(smDateStr).getTime() : NaN;
  const r2Norm = normalizeBraveRival(rivalName);

  return (existingPartidos || []).find((ep: any) => {
    if (!ep.rival_nombre || !ep.fecha_hora || isNaN(smDateMs)) return false;
    const epDateMs = new Date(ep.fecha_hora).getTime();
    const diffDays = Math.abs((epDateMs - smDateMs) / (1000 * 60 * 60 * 24));
    if (diffDays > 7) return false;

    const r1Raw = (ep.rival_nombre || '').toLowerCase().trim();
    const r2Raw = (rivalName || '').toLowerCase().trim();
    if (r1Raw.includes(r2Raw) || r2Raw.includes(r1Raw)) return true;

    const r1Norm = normalizeBraveRival(ep.rival_nombre);
    if (r1Norm && r2Norm && (r1Norm === r2Norm || r1Norm.includes(r2Norm) || r2Norm.includes(r1Norm))) {
      return true;
    }
    return false;
  });
}

export function parseApuntameloInicioToIso(rawInicio?: string | null): string | null {
  if (!rawInicio || typeof rawInicio !== 'string') return null;
  const trimmed = rawInicio.trim();
  if (!trimmed || trimmed.startsWith('0000')) return null;
  const [datePart, timePart] = trimmed.split(/\s+/);
  if (!datePart) return null;
  return formatSpainDateTimeToIso(datePart, timePart || '10:00:00');
}

export function extractNarracionesClaves(n: any): string[] {
  if (!n) return [];
  if (Array.isArray(n.Narraciones_Claves)) return n.Narraciones_Claves;
  if (typeof n.Narraciones_Claves === 'string') {
    return safeJsonParse<string[]>(n.Narraciones_Claves, []);
  }
  return [];
}

export function computeApuntameloLiveState(
  sm: any,
  mInfo: any,
  categoryDurationMinutes: number,
  explicitNoticias?: any[],
  existingPartido?: any
): {
  estado: 'Programado' | 'En Curso' | 'Descanso' | 'Finalizado';
  live_timer_started_at: string | null;
  live_timer_elapsed_seconds: number;
  first_half_duration_seconds: number | null;
  second_half_duration_seconds: number | null;
  halfMinutes: number;
} {
  const halfMinutes = Number(mInfo?.Minutos_parte) || Math.round((categoryDurationMinutes || 70) / 2) || 35;
  const halfSeconds = halfMinutes * 60;
  const noticias = explicitNoticias && explicitNoticias.length > 0
    ? explicitNoticias
    : safeJsonParse<any[]>(mInfo?.Json_noticias, []);

  const isValidated = Number(mInfo?.Validado ?? sm?.Validado) === 1;
  const hasFinalWhistleNoticia = noticias.some((n: any) => {
    const claves = extractNarracionesClaves(n);
    const desc = String(n.Descripcion || '').toLowerCase();
    return (
      claves.some((k) => k.includes('fin_partido')) ||
      desc.includes('finaaaaal') ||
      desc.includes('final del partido')
    );
  });

  const hasFinTime = Boolean(mInfo?.Fin || sm?.Fin);

  const rawInicio = mInfo?.Inicio || sm?.Inicio || null;
  const inicioIso = parseApuntameloInicioToIso(rawInicio);
  const inicioMs = inicioIso ? new Date(inicioIso).getTime() : NaN;
  const parte = Number(mInfo?.Parte ?? sm?.Parte) || 0;

  const isTimedOutSecondHalf =
    parte >= 2 && !isNaN(inicioMs) && Date.now() - inicioMs > (halfMinutes + 25) * 60 * 1000;

  const smDateStr = sm?.Fecha ? String(sm.Fecha).split(' ')[0] : '';
  const matchDateMs = smDateStr ? new Date(smDateStr).getTime() : NaN;
  const hasScore =
    (sm?.Goles_A !== null && sm?.Goles_A !== undefined) ||
    (mInfo?.Goles_A !== null && mInfo?.Goles_A !== undefined);
  const isOldMatchWithScore =
    !isNaN(matchDateMs) && Date.now() - matchDateMs > 18 * 60 * 60 * 1000 && hasScore;

  if (isValidated || hasFinalWhistleNoticia || hasFinTime || isTimedOutSecondHalf || isOldMatchWithScore) {
    return {
      estado: 'Finalizado',
      live_timer_started_at: null,
      live_timer_elapsed_seconds: halfSeconds * 2,
      first_half_duration_seconds: halfSeconds,
      second_half_duration_seconds: halfSeconds,
      halfMinutes
    };
  }

  const isDescansoFlag = Number(mInfo?.Descanso) === 1;
  const hasDescansoNoticia = noticias.some((n: any) =>
    extractNarracionesClaves(n).includes('fin_parte_primera') ||
    String(n.Descripcion || '').toLowerCase().includes('descansooo')
  );
  const hasParte2StartNoticia = noticias.some((n: any) =>
    extractNarracionesClaves(n).includes('inicio_parte2')
  );

  if (!hasParte2StartNoticia && (isDescansoFlag || (hasDescansoNoticia && parte <= 1))) {
    return {
      estado: 'Descanso',
      live_timer_started_at: null,
      live_timer_elapsed_seconds: halfSeconds,
      first_half_duration_seconds: halfSeconds,
      second_half_duration_seconds: null,
      halfMinutes
    };
  }

  const hasStartedInApuntamelo =
    sm?.Tipo === 'jugado' ||
    Boolean(rawInicio) ||
    noticias.some((n: any) =>
      extractNarracionesClaves(n).includes('inicio_partido')
    );

  const isCoachStarted =
    existingPartido &&
    (existingPartido.estado === 'En Curso' || existingPartido.estado === 'En curso') &&
    existingPartido.live_timer_started_at != null;

  if (hasStartedInApuntamelo || isCoachStarted) {
    const isSecondHalf = parte >= 2 || hasParte2StartNoticia;
    const timerStart = inicioIso || existingPartido?.live_timer_started_at || new Date().toISOString();
    return {
      estado: 'En Curso',
      live_timer_started_at: timerStart,
      live_timer_elapsed_seconds: isSecondHalf ? halfSeconds : (existingPartido?.live_timer_elapsed_seconds || 0),
      first_half_duration_seconds: isSecondHalf ? halfSeconds : null,
      second_half_duration_seconds: null,
      halfMinutes
    };
  }

  return {
    estado: 'Programado',
    live_timer_started_at: null,
    live_timer_elapsed_seconds: 0,
    first_half_duration_seconds: null,
    second_half_duration_seconds: null,
    halfMinutes
  };
}

export async function syncApuntameloMatchDetailToDb(params: {
  supabase: any;
  config: ApuntameloConfig;
  partidoId: string;
  existingPartido?: any;
  existingCoachReport?: any;
  existingConvs?: any[];
  sm: any;
  mInfo: any;
  teamPlayers: any[];
  categoryDuration: number;
}): Promise<void> {
  const {
    supabase,
    config,
    partidoId,
    existingPartido,
    existingCoachReport,
    existingConvs = [],
    sm,
    mInfo,
    teamPlayers,
    categoryDuration
  } = params;

  const fkA = Number(mInfo?.FK_EquipoLiga_A ?? sm?.FK_EquipoLiga_A);
  const fkB = Number(mInfo?.FK_EquipoLiga_B ?? sm?.FK_EquipoLiga_B);
  const isHome = fkA === config.teamApuntameloId;
  const matchApuntameloId = String(mInfo?.Id || sm?.Id);
  const matchUrl = `https://apuntamelo.com/partido/${matchApuntameloId}`;

  let gList = safeJsonParse<any[]>(mInfo?.Json_goles, []);
  let puntuaciones = safeJsonParse<any[]>(mInfo?.Json_puntuaciones, []);
  let noticias = safeJsonParse<any[]>(mInfo?.Json_noticias, []);

  // Si estamos en un partido y los campos JSON de cabecera vienen vacíos (caso estándar durante partidos en directo en Apúntamelo),
  // consultar los 4 endpoints oficiales en tiempo real que utiliza el frontend de apuntamelo.com
  if (matchApuntameloId) {
    const fetchPromises: Promise<any>[] = [];

    if (noticias.length === 0) {
      fetchPromises.push(
        fetchApuntameloJson<any[]>(
          `https://apuntamelo.com/obtenerNoticiasPartido?id=${matchApuntameloId}`,
          { ttlMs: 6 * 1000, timeoutMs: 5000 }
        )
          .then((res) => {
            if (Array.isArray(res) && res.length > 0) noticias = res;
          })
          .catch(() => null)
      );
    }

    if (puntuaciones.length === 0) {
      fetchPromises.push(
        fetchApuntameloJson<any[]>(
          `https://apuntamelo.com/obtenerPuntuacionesPartido?id=${matchApuntameloId}`,
          { ttlMs: 12 * 1000, timeoutMs: 5000 }
        )
          .then((res) => {
            if (Array.isArray(res) && res.length > 0) puntuaciones = res;
          })
          .catch(() => null)
      );
    }

    if (gList.length === 0) {
      fetchPromises.push(
        Promise.all([
          fetchApuntameloJson<any[]>(
            `https://apuntamelo.com/obtenerGolesPartidoA?id=${matchApuntameloId}`,
            { ttlMs: 6 * 1000, timeoutMs: 5000 }
          ).catch(() => null),
          fetchApuntameloJson<any[]>(
            `https://apuntamelo.com/obtenerGolesPartidoB?id=${matchApuntameloId}`,
            { ttlMs: 6 * 1000, timeoutMs: 5000 }
          ).catch(() => null),
        ])
          .then(([gA, gB]) => {
            const combined = [
              ...(Array.isArray(gA) ? gA : []),
              ...(Array.isArray(gB) ? gB : []),
            ];
            if (combined.length > 0) gList = combined;
          })
          .catch(() => null)
      );
    }

    if (fetchPromises.length > 0) {
      await Promise.all(fetchPromises);
    }
  }

  // 1. Calcular marcador real (conciliando Json_goles y goles de cabecera)
  let cA = 0;
  let cB = 0;
  gList.forEach((g: any) => {
    if (Number(g.FK_EquipoLiga) === fkA) cA++;
    if (Number(g.FK_EquipoLiga) === fkB) cB++;
  });

  const headerA = mInfo?.Goles_A ?? sm?.Goles_A;
  const headerB = mInfo?.Goles_B ?? sm?.Goles_B;
  const liveState = computeApuntameloLiveState(sm, mInfo, categoryDuration, noticias, existingPartido);
  const hasStartedOrScore =
    liveState.estado !== 'Programado' ||
    (headerA !== null && headerA !== undefined) ||
    cA + cB > 0;

  const finalA = hasStartedOrScore ? Math.max(Number(headerA) || 0, cA) : null;
  const finalB = hasStartedOrScore ? Math.max(Number(headerB) || 0, cB) : null;
  const finalPropio = isHome ? finalA : finalB;
  const finalRival = isHome ? finalB : finalA;

  // 2. Mapear jugadores de ambos equipos desde Json_puntuaciones (excluyendo Posicion 5 = Entrenador)
  const jugadorFullNameMap = new Map<string, string>();
  for (const p of puntuaciones) {
    if (p.FK_JugadorLiga && p.Nombre) {
      jugadorFullNameMap.set(String(p.FK_JugadorLiga), String(p.Nombre).trim());
    }
  }
  for (const n of noticias) {
    if (n.FK_JugadorLiga && n.Nombre_Jugador && !jugadorFullNameMap.has(String(n.FK_JugadorLiga))) {
      jugadorFullNameMap.set(String(n.FK_JugadorLiga), String(n.Nombre_Jugador).trim());
    }
  }

  const ourBravePlayers: any[] = [];
  const rivalBravePlayers: any[] = [];
  let ourCoachName: string | null = null;
  let rivalCoachName: string | null = null;

  for (const p of puntuaciones) {
    const isOur =
      Number(p.FK_EquipoLiga) === config.teamApuntameloId ||
      Number(p.EquipoLiga) === config.teamApuntameloId;

    if (Number(p.Posicion) === 5) {
      if (isOur) ourCoachName = p.Nombre || null;
      else rivalCoachName = p.Nombre || null;
      continue;
    }

    const matchedInternal =
      isOur && teamPlayers.length > 0
        ? matchPlayer(p.Nombre || '', p.Dorsal, teamPlayers, teamPlayers)
        : null;

    const pFkEquipo = Number(p.FK_EquipoLiga || p.EquipoLiga);
    const goalsFromGList = gList.filter(
      (g: any) =>
        Number(g.FK_EquipoLiga) === pFkEquipo &&
        ((p.FK_JugadorLiga && String(g.FK_JugadorLiga) === String(p.FK_JugadorLiga)) ||
          (!g.FK_JugadorLiga && Number(p.Dorsal) > 0 && Number(g.Dorsal) === Number(p.Dorsal)))
    ).length;

    const item = {
      fkJugadorLiga: p.FK_JugadorLiga,
      playerId: matchedInternal?.id || null,
      nombre: p.Nombre || 'Jugador',
      dorsal: Number(p.Dorsal) || 0,
      posicion: Number(p.Posicion) || 0,
      titular: !Boolean(p.Suplente),
      sustituido: Boolean(p.Sustituido),
      goles: Math.max(Number(p.Goles) || 0, goalsFromGList),
      asistencias: Number(p.Asistencias) || 0,
      amarillas: Number(p.Amarillas) || 0,
      rojas: Number(p.Rojas) || 0,
      azules: Number(p.Azules) || 0,
      verdes: Number(p.Verdes) || 0,
      puntuacion: Number(p.Puntuacion) || 0,
      mvp: Boolean(p.Mvp || p.Mvp_auto)
    };

    if (isOur) ourBravePlayers.push(item);
    else rivalBravePlayers.push(item);
  }

  // En Liga Brave F11, en ocasiones todos los convocados vienen con Suplente=false (ej. 2 porteros + 10 jugadores = 12 titulares).
  // Garantizar máximo 1 portero titular y máximo 11 titulares en el once inicial (tanto para nuestro equipo como para el rival).
  const normalizeElevenStarters = (playersArr: any[], existingConvRows: any[] = []) => {
    const existingManualStarters = new Set(
      existingConvRows
        .filter((c: any) => c.titular && c.tactical_x != null && c.tactical_y != null)
        .map((c: any) => c.player_id)
    );

    const candidateStarters = playersArr.filter((p) => p.titular);
    if (candidateStarters.length <= 11 && candidateStarters.filter((p) => p.posicion === 1).length <= 1) {
      return;
    }

    // Ordenar candidatos dando prioridad a jugadores emparejados en BD, luego titulares manuales previos, luego dorsal 1 para portero
    const gks = candidateStarters
      .filter((p) => p.posicion === 1)
      .sort((a, b) => {
        const aHasId = a.playerId ? 1 : 0;
        const bHasId = b.playerId ? 1 : 0;
        if (aHasId !== bHasId) return bHasId - aHasId;
        const aMan = a.playerId && existingManualStarters.has(a.playerId) ? 1 : 0;
        const bMan = b.playerId && existingManualStarters.has(b.playerId) ? 1 : 0;
        if (aMan !== bMan) return bMan - aMan;
        if (a.dorsal === 1 && b.dorsal !== 1) return -1;
        if (b.dorsal === 1 && a.dorsal !== 1) return 1;
        return (b.puntuacion || 0) - (a.puntuacion || 0);
      });

    const outfielders = candidateStarters
      .filter((p) => p.posicion !== 1)
      .sort((a, b) => {
        const aHasId = a.playerId ? 1 : 0;
        const bHasId = b.playerId ? 1 : 0;
        if (aHasId !== bHasId) return bHasId - aHasId;
        const aMan = a.playerId && existingManualStarters.has(a.playerId) ? 1 : 0;
        const bMan = b.playerId && existingManualStarters.has(b.playerId) ? 1 : 0;
        if (aMan !== bMan) return bMan - aMan;
        if (a.sustituido !== b.sustituido) return a.sustituido ? 1 : -1;
        return 0;
      });

    const chosenStarters = new Set<any>();
    if (gks.length > 0) chosenStarters.add(gks[0]);
    for (const out of outfielders) {
      if (chosenStarters.size >= 11) break;
      chosenStarters.add(out);
    }

    for (const p of playersArr) {
      if (p.titular && !chosenStarters.has(p)) {
        p.titular = false;
        p.playedAsSub = true;
      }
    }
  };

  normalizeElevenStarters(ourBravePlayers, existingConvs);
  normalizeElevenStarters(rivalBravePlayers, []);

  // Calcular formación táctica y coordenadas en la pizarra para nuestros titulares
  const existingConvByPlayerId = new Map<string, any>(
    existingConvs.map((c: any) => [c.player_id, c])
  );
  const teamPlayerById = new Map<string, any>(
    teamPlayers.map((tp: any) => [tp.id, tp])
  );

  const starterInputs: StarterPositionInput[] = ourBravePlayers
    .filter((bp) => bp.titular && bp.playerId)
    .map((bp) => {
      const existingC = existingConvByPlayerId.get(bp.playerId);
      const dbPl = teamPlayerById.get(bp.playerId);
      return {
        playerId: bp.playerId,
        dorsal: bp.dorsal || dbPl?.dorsal,
        isGoalkeeper: bp.posicion === 1,
        bravePosCode: bp.posicion || null,
        dbPosition: dbPl?.posicion || null,
        existingTacticalX: existingC?.tactical_x ?? null,
        existingTacticalY: existingC?.tactical_y ?? null,
        wasAlreadyTitular: Boolean(existingC?.titular)
      };
    });

  const { formation: ourFormation, coordinatesByPlayerId } = assignTacticalCoordinatesForStarters(
    starterInputs
  );

  // Merge liga_brave_live dentro de coach_report sin perder el análisis táctico del entrenador
  let parsedCoachReport: Record<string, any> = {};
  if (typeof existingCoachReport === 'string') {
    try {
      parsedCoachReport = JSON.parse(existingCoachReport);
    } catch {
      parsedCoachReport = {};
    }
  } else if (existingCoachReport && typeof existingCoachReport === 'object') {
    parsedCoachReport = { ...existingCoachReport };
  }

  if (liveState.estado === 'Finalizado') {
    parsedCoachReport.duracion_primera_parte_segundos = liveState.halfMinutes * 60;
    parsedCoachReport.duracion_segunda_parte_segundos = liveState.halfMinutes * 60;
  }

  parsedCoachReport.official_tactic = ourFormation;
  parsedCoachReport.liga_brave_live = {
    apuntameloId: Number(matchApuntameloId) || matchApuntameloId,
    url: matchUrl,
    minutosParte: liveState.halfMinutes,
    parte: Number(mInfo?.Parte ?? sm?.Parte) || 1,
    descanso: Number(mInfo?.Descanso) === 1,
    validado: Number(mInfo?.Validado ?? sm?.Validado) === 1,
    inicio: mInfo?.Inicio || sm?.Inicio || null,
    campo: mInfo?.Nombre_campo || sm?.Nombre_campo || null,
    ourFormation,
    ourCoach: ourCoachName,
    rivalCoach: rivalCoachName,
    ourPlayers: ourBravePlayers,
    rivalPlayers: rivalBravePlayers,
    updatedAt: new Date().toISOString()
  };

  // 3. Actualizar tabla `partidos` y `ffcv_matches`
  const partidoUpdatePayload: Record<string, any> = {
    resultado_propio: finalPropio,
    resultado_rival: finalRival,
    estado: liveState.estado,
    live_timer_started_at: liveState.live_timer_started_at,
    live_timer_elapsed_seconds: liveState.live_timer_elapsed_seconds,
    first_half_duration_seconds: liveState.first_half_duration_seconds,
    second_half_duration_seconds: liveState.second_half_duration_seconds,
    acta_oficial_url: matchUrl,
    coach_report: JSON.stringify(parsedCoachReport)
  };

  await supabase.from('partidos').update(partidoUpdatePayload).eq('id', partidoId);

  if (finalA !== null && finalB !== null) {
    await supabase
      .from('ffcv_matches')
      .update({
        home_score: finalA,
        away_score: finalB,
        status: liveState.estado === 'Finalizado' ? 'played' : 'scheduled',
        is_closed: liveState.estado === 'Finalizado'
      })
      .eq('ffcv_match_id', matchApuntameloId);
  }

  // 4. Sincronizar `convocatorias` (excluyendo Posicion 5 = Entrenador y deduplicando por player_id)
  if (teamPlayers.length > 0 && ourBravePlayers.length > 0) {
    const existingConvMap = new Map(
      existingConvs.map((c: any) => [c.player_id, c.minutos_jugados ?? c.minutes_played])
    );

    const dedupedConvsMap = new Map<string, any>();

    for (const bp of ourBravePlayers) {
      if (!bp.playerId) continue;

      let playerYellows = bp.amarillas;
      let playerReds = bp.rojas;

      // Verificar también en la crónica en vivo (Json_noticias)
      const cardNoticias = noticias.filter((n: any) => {
        const desc = String(n.Descripcion || '').toLowerCase();
        const matchesFk =
          Number(n.FK_EquipoLiga) === config.teamApuntameloId &&
          String(n.FK_JugadorLiga) === String(bp.fkJugadorLiga);
        const matchesName = bp.nombre && desc.includes(bp.nombre.toLowerCase());
        return matchesFk || matchesName;
      });

      for (const cn of cardNoticias) {
        const claves = extractNarracionesClaves(cn);
        const descUpper = String(cn.Descripcion || '').toUpperCase();
        const isY =
          cn.Icono === 5 ||
          claves.includes('tarjetas.noticia.amarilla') ||
          descUpper.includes('TARJETA AMARILL');
        const isR =
          cn.Icono === 6 ||
          claves.includes('tarjetas.noticia.roja') ||
          descUpper.includes('TARJETA ROJA') ||
          descUpper.includes('EXPULSI') ||
          descUpper.includes('VE LA ROJA');
        if (isY) playerYellows = Math.max(playerYellows, 1);
        if (isR) playerReds = Math.max(playerReds, 1);
      }

      const prevMins = existingConvMap.get(bp.playerId);
      const hasManualMins =
        typeof prevMins === 'number' && prevMins > 0 && prevMins <= categoryDuration;

      const calculatedMins = !hasStartedOrScore
        ? 0
        : hasManualMins
          ? prevMins
          : !bp.titular
            ? Math.round(categoryDuration / 2)
            : bp.sustituido
              ? Math.round(categoryDuration * 0.65)
              : categoryDuration;

      const tacticalCoords = bp.titular ? coordinatesByPlayerId.get(bp.playerId) : null;

      const row = {
        partido_id: partidoId,
        player_id: bp.playerId,
        status: 'convocado',
        titular: bp.titular,
        tactical_x: tacticalCoords ? tacticalCoords.x : null,
        tactical_y: tacticalCoords ? tacticalCoords.y : null,
        yellow_cards: playerYellows,
        tarjetas_amarillas: playerYellows,
        red_cards: playerReds,
        tarjetas_rojas: playerReds,
        goals: bp.goles,
        goles: bp.goles,
        assists: bp.asistencias,
        asistencias: bp.asistencias,
        minutes_played: calculatedMins,
        minutos_jugados: calculatedMins
      };

      if (dedupedConvsMap.has(bp.playerId)) {
        const prev = dedupedConvsMap.get(bp.playerId);
        prev.titular = prev.titular || row.titular;
        if (row.tactical_x != null) prev.tactical_x = row.tactical_x;
        if (row.tactical_y != null) prev.tactical_y = row.tactical_y;
        prev.yellow_cards = Math.max(prev.yellow_cards, row.yellow_cards);
        prev.tarjetas_amarillas = Math.max(prev.tarjetas_amarillas, row.tarjetas_amarillas);
        prev.red_cards = Math.max(prev.red_cards, row.red_cards);
        prev.tarjetas_rojas = Math.max(prev.tarjetas_rojas, row.tarjetas_rojas);
        prev.goals = Math.max(prev.goals, row.goals);
        prev.goles = Math.max(prev.goles, row.goles);
        prev.assists = Math.max(prev.assists, row.assists);
        prev.asistencias = Math.max(prev.asistencias, row.asistencias);
        prev.minutes_played = Math.max(prev.minutes_played, row.minutes_played);
        prev.minutos_jugados = Math.max(prev.minutos_jugados, row.minutos_jugados);
      } else {
        dedupedConvsMap.set(bp.playerId, row);
      }
    }

    const convocatoriasPayload = Array.from(dedupedConvsMap.values());
    if (convocatoriasPayload.length > 0) {
      const { error: convUpsertErr } = await supabase
        .from('convocatorias')
        .upsert(convocatoriasPayload, { onConflict: 'partido_id,player_id' });
      if (convUpsertErr) {
        console.warn('[syncApuntameloMatchDetailToDb] Error upserting convocatorias:', convUpsertErr.message);
      }
    }
  }

  // 5. Sincronizar `match_events` en tiempo real (Goles, Tarjetas, Fases y Narración Liga Brave)
  try {
    const { data: existingEvents } = await supabase
      .from('match_events')
      .select('id, player_id, tipo_evento, minuto, notas')
      .eq('partido_id', partidoId)
      .order('minuto', { ascending: true });

    const currentEvents: any[] = existingEvents || [];

    // 5a. Construir goles oficiales desde Json_goles
    const officialGoals: Array<{
      partido_id: string;
      player_id: string | null;
      tipo_evento: string;
      minuto: number;
      notas: string;
    }> = [];

    for (const g of gList) {
      const min = Number(g.Minuto) || 0;
      const gEquipo = Number(g.FK_EquipoLiga);
      const isGoalLocal = gEquipo === fkA;
      const isOurGoal = gEquipo === config.teamApuntameloId;
      const fullScorer =
        jugadorFullNameMap.get(String(g.FK_JugadorLiga)) || g.Nombre_Jugador || 'Gol';

      // Buscar asistente en Json_noticias para ese gol
      const goalNoticia = noticias.find(
        (n: any) =>
          Number(n.Minuto) === min &&
          String(n.FK_JugadorLiga) === String(g.FK_JugadorLiga) &&
          n.Nombre_Asistente
      );
      const assistantName = goalNoticia?.Nombre_Asistente
        ? String(goalNoticia.Nombre_Asistente).trim()
        : null;

      const matchedScorer =
        isOurGoal && teamPlayers.length > 0
          ? matchPlayer(fullScorer, g.Dorsal, teamPlayers, teamPlayers)
          : null;

      const prefix = isGoalLocal ? '[LOCAL]' : '[VISITANTE]';
      const assistSuffix = assistantName ? ` (Asist: ${assistantName})` : '';
      officialGoals.push({
        partido_id: partidoId,
        player_id: matchedScorer?.id || null,
        tipo_evento: 'Gol',
        minuto: min,
        notas: `${prefix} ${fullScorer}${assistSuffix}`
      });
    }

    // 5a.1 Si aún no hay detalles en Json_goles pero el marcador registra goles (p.ej. 1-0 durante el directo)
    if (officialGoals.length === 0 && ((finalA || 0) > 0 || (finalB || 0) > 0)) {
      const localTeamName = isHome ? 'Sporting Saladar' : (mInfo?.Nombre_A || sm?.Nombre_A || 'Local');
      const awayTeamName = isHome ? (mInfo?.Nombre_B || sm?.Nombre_B || 'Visitante') : 'Sporting Saladar';
      for (let i = 0; i < (finalA || 0); i++) {
        officialGoals.push({
          partido_id: partidoId,
          player_id: null,
          tipo_evento: 'Gol',
          minuto: 1,
          notas: `[LOCAL] Gol de ${localTeamName}`
        });
      }
      for (let i = 0; i < (finalB || 0); i++) {
        officialGoals.push({
          partido_id: partidoId,
          player_id: null,
          tipo_evento: 'Gol',
          minuto: 1,
          notas: `[VISITANTE] Gol de ${awayTeamName}`
        });
      }
    }

    // Conciliar goles en match_events:
    // Si los goles existentes no coinciden en cantidad o no tienen etiquetas [LOCAL]/[VISITANTE], sincronizarlos
    const existingGoalEvents = currentEvents.filter(
      (e: any) => e.tipo_evento === 'Gol' || e.tipo_evento === 'Gol en propia puerta'
    );
    const allExistingGoalsHaveTags =
      existingGoalEvents.length === officialGoals.length &&
      existingGoalEvents.every(
        (e: any, idx: number) =>
          e.notas === officialGoals[idx]?.notas &&
          Number(e.minuto) === Number(officialGoals[idx]?.minuto) &&
          e.player_id === officialGoals[idx]?.player_id
      );

    if (officialGoals.length > 0 && !allExistingGoalsHaveTags) {
      // Si solo se ha añadido un nuevo gol en vivo y los anteriores ya coinciden, insertar únicamente los nuevos
      const prefixMatches =
        existingGoalEvents.length < officialGoals.length &&
        existingGoalEvents.every(
          (e: any, idx: number) =>
            e.notas === officialGoals[idx]?.notas &&
            Number(e.minuto) === Number(officialGoals[idx]?.minuto)
        );

      if (prefixMatches) {
        const newGoalsToInsert = officialGoals.slice(existingGoalEvents.length);
        if (newGoalsToInsert.length > 0) {
          await supabase.from('match_events').insert(newGoalsToInsert);
        }
      } else {
        // Reemplazar filas de gol previas (incluyendo goles manuales sin enriquecer) por los goles oficiales enriquecidos
        if (existingGoalEvents.length > 0) {
          await supabase
            .from('match_events')
            .delete()
            .in(
              'id',
              existingGoalEvents.map((e: any) => e.id)
            );
        }
        await supabase.from('match_events').insert(officialGoals);
      }
    }

    // 5b. Construir tarjetas desde Json_noticias (con minuto exacto) y Json_puntuaciones
    const officialCards: Array<{
      partido_id: string;
      player_id: string | null;
      tipo_evento: string;
      minuto: number;
      notas: string;
    }> = [];

    for (const n of noticias) {
      const claves = extractNarracionesClaves(n);
      const descUpper = String(n.Descripcion || '').toUpperCase();
      const isYellow =
        n.Icono === 5 ||
        claves.includes('tarjetas.noticia.amarilla') ||
        descUpper.includes('TARJETA AMARILL');
      const isRed =
        n.Icono === 6 ||
        claves.includes('tarjetas.noticia.roja') ||
        descUpper.includes('TARJETA ROJA') ||
        descUpper.includes('EXPULSI') ||
        descUpper.includes('VE LA ROJA');
      if (!isYellow && !isRed) continue;

      const cEquipo = Number(n.FK_EquipoLiga);
      const isCardLocal = cEquipo === fkA;
      const isOurCard = cEquipo === config.teamApuntameloId;
      let pName =
        n.Nombre_Jugador ||
        jugadorFullNameMap.get(String(n.FK_JugadorLiga)) ||
        '';
      if (!pName) {
        const descMatch = String(n.Descripcion || '').match(/(?:para|de)\s+([^.]+?)(?:\.|\s+Ve\s+la|$)/i);
        if (descMatch && descMatch[1]) {
          pName = descMatch[1].trim();
        } else {
          pName = 'Tarjeta';
        }
      }
      const matchedPlayer =
        isOurCard && teamPlayers.length > 0
          ? matchPlayer(pName, undefined, teamPlayers, teamPlayers)
          : null;
      const prefix = isCardLocal ? '[LOCAL]' : '[VISITANTE]';

      officialCards.push({
        partido_id: partidoId,
        player_id: matchedPlayer?.id || null,
        tipo_evento: isRed ? 'Tarjeta Roja' : 'Tarjeta Amarilla',
        minuto: Number(n.Minuto) || liveState.halfMinutes,
        notas: `${prefix} ${pName}`
      });
    }

    const existingCardEvents = currentEvents.filter(
      (e: any) => e.tipo_evento === 'Tarjeta Amarilla' || e.tipo_evento === 'Tarjeta Roja'
    );
    for (const oc of officialCards) {
      const alreadyExists = existingCardEvents.some(
        (ec: any) =>
          ec.tipo_evento === oc.tipo_evento &&
          Math.abs(Number(ec.minuto) - oc.minuto) <= 1 &&
          (ec.player_id === oc.player_id || ec.notas === oc.notas)
      );
      if (!alreadyExists) {
        await supabase.from('match_events').insert(oc);
      }
    }

    // 5c. Fases del partido (Descanso y Fin de Partido) y Narración en vivo de Liga Brave (Json_noticias)
    const existingBraveTags = new Set<string>();
    for (const ev of currentEvents) {
      const matchTag = String(ev.notas || '').match(/\[BRAVE:([^\]]+)\]/);
      if (matchTag && matchTag[1]) {
        existingBraveTags.add(matchTag[1]);
      }
    }

    // Ordenar noticias cronológicamente (de más antigua a más reciente)
    const sortedNoticias = [...noticias]
      .filter((n: any) => Number(n.Tipo) === 0 && n.Descripcion && String(n.Descripcion).trim() !== '')
      .sort((a: any, b: any) => (Number(a.Id) || 0) - (Number(b.Id) || 0));

    const narrativeToInsert: any[] = [];

    for (const n of sortedNoticias) {
      const nId = String(n.Id);
      const claves = extractNarracionesClaves(n);
      const desc = String(n.Descripcion).trim();
      const rawMin = Number(n.Minuto) || 0;
      const nParte = Number(n.Parte) || 1;

      // Omitir tarjetas (ya procesadas en 5b)
      if (
        n.Icono === 5 ||
        n.Icono === 6 ||
        claves.some((k) => k.includes('tarjetas.noticia')) ||
        desc.toUpperCase().includes('TARJETA AMARILL') ||
        desc.toUpperCase().includes('TARJETA ROJA') ||
        desc.toUpperCase().includes('EXPULSI') ||
        desc.toUpperCase().includes('VE LA ROJA')
      ) {
        continue;
      }

      // Caso Descanso (`fin_parte_primera`)
      if (claves.includes('fin_parte_primera')) {
        const existingDescanso = currentEvents.find((e: any) => e.tipo_evento === 'Descanso');
        const htNotas = `[BRAVE:${nId}] ⏸️ ${desc}`;
        if (existingDescanso) {
          if (!String(existingDescanso.notas || '').includes('[BRAVE:')) {
            await supabase
              .from('match_events')
              .update({ minuto: liveState.halfMinutes, notas: htNotas })
              .eq('id', existingDescanso.id);
          }
        } else if (!existingBraveTags.has(nId)) {
          narrativeToInsert.push({
            partido_id: partidoId,
            player_id: null,
            tipo_evento: 'Descanso',
            minuto: liveState.halfMinutes,
            notas: htNotas
          });
          existingBraveTags.add(nId);
        }
        continue;
      }

      // Caso Final del Partido (`fin_partido_*`)
      if (claves.some((k) => k.includes('fin_partido'))) {
        const existingFin = currentEvents.find(
          (e: any) => e.tipo_evento === 'Fin de Partido' || e.tipo_evento === 'Fin del Partido'
        );
        const ftNotas = `[BRAVE:${nId}] 🏁 ${desc}`;
        const ftMin = Math.max(rawMin, liveState.halfMinutes * 2);
        if (existingFin) {
          if (!String(existingFin.notas || '').includes('[BRAVE:')) {
            await supabase
              .from('match_events')
              .update({ minuto: ftMin, notas: ftNotas })
              .eq('id', existingFin.id);
          }
        } else if (!existingBraveTags.has(nId)) {
          narrativeToInsert.push({
            partido_id: partidoId,
            player_id: null,
            tipo_evento: 'Fin de Partido',
            minuto: ftMin,
            notas: ftNotas
          });
          existingBraveTags.add(nId);
        }
        continue;
      }

      // Seleccionar narraciones relevantes para el directo minuto a minuto
      const isGoalNarration = claves.includes('gol_resultado');
      const isGoalStat = claves.includes('gol_estadisticas_base');
      const isAssistStat = claves.includes('asistencia_estadisticas_base');
      const isDuplaStat = claves.includes('goles.duplas.base');
      const isKickoff1 = claves.includes('inicio_partido');
      const isKickoff2 = claves.includes('inicio_parte2');
      const isPreMatchContext = claves.includes('posiciones_equipos') || claves.includes('previa_partido');
      const isLineup = claves.includes('alineacion_equipo');

      if (existingBraveTags.has(nId)) continue;

      let emoji = '🎙️';
      if (isKickoff1 || isKickoff2) emoji = '⚡';
      else if (isGoalNarration) emoji = '🔥';
      else if (isGoalStat || isAssistStat || isDuplaStat) emoji = '📊';
      else if (isPreMatchContext) emoji = '📋';
      else if (isLineup) emoji = '👥';

      // Asegurar que los eventos de la 2ª parte tengan minuto > halfMinutes para ubicarse en la columna Segunda Parte
      const effectiveMin =
        nParte >= 2 && rawMin <= liveState.halfMinutes ? liveState.halfMinutes + 1 : rawMin;

      narrativeToInsert.push({
        partido_id: partidoId,
        player_id: null,
        tipo_evento: 'Comentario del Entrenador',
        minuto: effectiveMin,
        notas: `[BRAVE:${nId}] ${emoji} ${desc}`
      });
      existingBraveTags.add(nId);
    }

    if (narrativeToInsert.length > 0) {
      await supabase.from('match_events').insert(narrativeToInsert);
    }
  } catch (evErr: any) {
    console.warn('[syncApuntameloMatchDetailToDb] Error sincronizando match_events:', evErr.message);
  }
}

let lastLivePollTimestampMs = 0;
const lastMatchPollTimestampMap = new Map<string, number>();
const LIVE_POLL_COOLDOWN_MS = 8 * 1000; // 8 seconds throttle

/**
 * Comprueba de forma ultraligera si hay partidos de Liga Brave (Infantil B / Cadete B)
 * en ventana de día de partido o actualmente En Curso/Descanso, y replica al instante
 * el estado en vivo, cronómetro, marcador, goles, tarjetas y narración desde Apúntamelo.
 */
export async function syncApuntameloLiveMatchesIfNeeded(
  customSupabaseClient?: any,
  specificMatchId?: string
): Promise<void> {
  const now = Date.now();

  if (specificMatchId) {
    const lastSpecific = lastMatchPollTimestampMap.get(specificMatchId) || 0;
    if (now - lastSpecific < LIVE_POLL_COOLDOWN_MS) return;
    lastMatchPollTimestampMap.set(specificMatchId, now);
  } else {
    if (now - lastLivePollTimestampMs < LIVE_POLL_COOLDOWN_MS) return;
    lastLivePollTimestampMs = now;
  }

  try {
    const supabase = customSupabaseClient || createAdminClient();
    const activeSeasonId = '663ed6ef-1dab-4350-9489-ed50f9e9ac15';
    const braveTeamIds = Object.keys(APUNTAMELO_TEAMS_CONFIG);

    const { data: braveMatches } = await supabase
      .from('partidos')
      .select(
        'id, equipo_id, rival_nombre, fecha_hora, estado, resultado_propio, resultado_rival, acta_oficial_url, coach_report'
      )
      .eq('season_id', activeSeasonId)
      .neq('season_id', '584f508a-fc1a-4339-b5b2-4296ffde2f4c')
      .in('equipo_id', braveTeamIds);

    if (!braveMatches || braveMatches.length === 0) return;

    const playedOrLiveBraveDates = braveMatches
      .filter((m: any) => m.estado === 'Finalizado' || m.estado === 'En Curso' || m.estado === 'En curso' || m.estado === 'Descanso')
      .map((m: any) => (m.fecha_hora ? new Date(m.fecha_hora).getTime() : NaN))
      .filter((ms: number) => !isNaN(ms));
    const latestActiveBraveMs = playedOrLiveBraveDates.length > 0 ? Math.max(...playedOrLiveBraveDates) : NaN;

    const candidates = braveMatches.filter((m: any) => {
      if (specificMatchId && m.id === specificMatchId) return true;
      const isLiveState =
        m.estado === 'En Curso' || m.estado === 'En curso' || m.estado === 'Descanso';
      if (isLiveState) return true;

      if (!m.fecha_hora) return false;
      const matchMs = new Date(m.fecha_hora).getTime();
      const diffHours = (now - matchMs) / (1000 * 60 * 60);
      // Ventana activa: desde 2h antes del inicio programado hasta 14h después
      if (diffHours >= -2 && diffHours <= 14) return true;

      // Fallback para el fin de semana / jornada activa en curso
      if (!isNaN(latestActiveBraveMs)) {
        const diffHoursCluster = Math.abs(matchMs - latestActiveBraveMs) / (1000 * 60 * 60);
        if (diffHoursCluster <= 36) return true;
      }
      return false;
    });

    if (candidates.length === 0) return;

    // Agrupar candidatos por equipo_id
    const candidatesByTeam = new Map<string, any[]>();
    for (const c of candidates) {
      const list = candidatesByTeam.get(c.equipo_id) || [];
      list.push(c);
      candidatesByTeam.set(c.equipo_id, list);
    }

    for (const [teamId, teamCandidates] of Array.from(candidatesByTeam.entries())) {
      const config = APUNTAMELO_TEAMS_CONFIG[teamId];
      if (!config) continue;

      const { data: teamPlayers } = await supabase
        .from('players')
        .select('id, first_name, last_name, dorsal, team_id, posicion')
        .eq('team_id', teamId);

      const categoryDuration = getOfficialMatchDuration(config.category, 'Liga Brave');
      let saladarGroupMatches: any[] | null = null;

      for (const cand of teamCandidates) {
        const { data: existingConvs } = await supabase
          .from('convocatorias')
          .select('partido_id, player_id, titular, tactical_x, tactical_y, minutos_jugados, minutes_played')
          .eq('partido_id', cand.id);

        const directMatchId = cand.acta_oficial_url
          ? String(cand.acta_oficial_url).match(/partido\/(\d+)/)?.[1]
          : null;

        let sm: any = null;
        let mInfo: any = null;

        // 1. Ruta ultrarrápida: si ya tenemos el ID de Apúntamelo en acta_oficial_url
        if (directMatchId) {
          const directInfoArr = await fetchApuntameloJson<any[]>(
            `https://apuntamelo.com/obtenerInfoPartido?id=${directMatchId}`,
            { ttlMs: 8 * 1000, timeoutMs: 8000 }
          ).catch(() => null);

          if (Array.isArray(directInfoArr) && directInfoArr.length > 0) {
            mInfo = directInfoArr[0];
            sm = mInfo;
          }
        }

        // 2. Fallback: buscar en el calendario completo de la jornada
        if (!mInfo) {
          if (!saladarGroupMatches) {
            const rawGroupMatches = await fetchApuntameloJson<any[]>(
              `https://apuntamelo.com/obtenerPartidosPorJornada?organizacion=${config.orgId}&grupo=${config.grupoId}`,
              { ttlMs: 15 * 1000, timeoutMs: 12000 }
            ).catch(() => null);

            saladarGroupMatches = Array.isArray(rawGroupMatches)
              ? rawGroupMatches.filter(
                  (m: any) =>
                    Number(m.FK_EquipoLiga_A) === config.teamApuntameloId ||
                    Number(m.FK_EquipoLiga_B) === config.teamApuntameloId
                )
              : [];
          }

          sm = saladarGroupMatches.find((gm: any) => {
            const isHome = Number(gm.FK_EquipoLiga_A) === config.teamApuntameloId;
            const gmRival = isHome ? gm.Nombre_B : gm.Nombre_A;
            return findMatchingInternalPartido([cand], gm, gmRival)?.id === cand.id;
          });

          if (sm) {
            const matchInfoArr = await fetchApuntameloJson<any[]>(
              `https://apuntamelo.com/obtenerInfoPartido?id=${sm.Id}`,
              { ttlMs: 10 * 1000, timeoutMs: 8000 }
            ).catch(() => null);

            if (Array.isArray(matchInfoArr) && matchInfoArr.length > 0) {
              mInfo = matchInfoArr[0];
            }
          }
        }

        if (!sm || !mInfo) continue;

        const hasStarted =
          sm.Tipo === 'jugado' ||
          Boolean(sm.Inicio) ||
          Boolean(mInfo?.Inicio) ||
          (sm.Goles_A !== null && sm.Goles_A !== undefined) ||
          (mInfo?.Goles_A !== null && mInfo?.Goles_A !== undefined) ||
          cand.estado === 'En Curso' ||
          cand.estado === 'En curso' ||
          cand.estado === 'Descanso' ||
          cand.live_timer_started_at != null;
        const hasPreMatchLineup = safeJsonParse<any[]>(mInfo?.Json_puntuaciones, []).length > 0;

        if (!hasStarted && !hasPreMatchLineup) continue;

        await syncApuntameloMatchDetailToDb({
          supabase,
          config,
          partidoId: cand.id,
          existingPartido: cand,
          existingCoachReport: cand.coach_report,
          existingConvs: existingConvs || [],
          sm,
          mInfo,
          teamPlayers: teamPlayers || [],
          categoryDuration
        });
      }
    }
  } catch (err: any) {
    console.warn('[syncApuntameloLiveMatchesIfNeeded] Warning:', err.message);
  }
}

