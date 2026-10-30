import https from 'https';
import {
  FFCVRawMatchdayResponse,
  FFCVRawStandingsResponse,
  FFCVRawJornadasResponse,
  FFCVRawTeamDetails,
  FFCVRawMatchDetails
} from './types';

export class FFCVApiError extends Error {
  public statusCode?: number;
  public endpoint: string;
  public rawResponse?: string;

  constructor(message: string, endpoint: string, statusCode?: number, rawResponse?: string) {
    super(`[FFCV API Error] ${endpoint}: ${message}`);
    this.name = 'FFCVApiError';
    this.endpoint = endpoint;
    this.statusCode = statusCode;
    this.rawResponse = rawResponse;
  }
}

// Dedicated HTTPS agent for FFCV with custom options for intermediate cert handling
const ffcvAgent = new https.Agent({
  rejectUnauthorized: false, // Scoped ONLY to ffcv.es requests within this client
  keepAlive: true,
  timeout: 15000
});

const FFCV_BASE_URL = 'https://ffcv.es/competiciones/api';

// Cache for X-FFCV-Page-Token and session cookies required by FFCV
let cachedToken: string | null = null;
let cachedCookie: string = '';
let tokenExpiresAt: number = 0;
let tokenPromise: Promise<{ token: string | null; cookie: string }> | null = null;

export async function getFfcvPageToken(forceRefresh = false): Promise<{ token: string | null; cookie: string }> {
  const now = Date.now();
  if (!forceRefresh && cachedToken && now < tokenExpiresAt) {
    return { token: cachedToken, cookie: cachedCookie };
  }

  if (tokenPromise && !forceRefresh) {
    return tokenPromise;
  }

  tokenPromise = new Promise<{ token: string | null; cookie: string }>((resolve) => {
    https.get('https://ffcv.es/competiciones/', {
      agent: ffcvAgent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 10000
    }, (res) => {
      let html = '';
      res.on('data', chunk => html += chunk);
      res.on('end', () => {
        const m = html.match(/<meta\s+name=["']ffcv-pt["']\s+content=["']([^"']+)["']/i);
        const token = m ? m[1] : null;
        const cookie = res.headers['set-cookie']?.join('; ') || '';
        if (token) {
          cachedToken = token;
          cachedCookie = cookie;
          tokenExpiresAt = Date.now() + 15 * 60 * 1000; // Cache 15 minutes
        }
        tokenPromise = null;
        resolve({ token: cachedToken, cookie: cachedCookie });
      });
    }).on('error', (err) => {
      console.warn('[FFCV Client] Warning: failed to fetch page token from FFCV:', err.message);
      tokenPromise = null;
      resolve({ token: cachedToken, cookie: cachedCookie });
    });
  });

  return tokenPromise;
}

interface RequestOptions {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  cacheTtlMs?: number;
  bypassCache?: boolean;
}

interface FfcvCacheEntry {
  data: any;
  expiresAt: number;
  staleUntil: number;
}

const ffcvResponseCache = new Map<string, FfcvCacheEntry>();
const ffcvInFlight = new Map<string, Promise<any>>();
const ffcvErrorCooldown = new Map<string, number>();

async function singleFfcvGet<T>(endpoint: string, params: Record<string, string | number | undefined> = {}, options: RequestOptions = {}): Promise<T> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      query.append(key, String(value));
    }
  }

  const queryString = query.toString();
  const url = endpoint.startsWith('http') 
    ? (queryString ? `${endpoint}?${queryString}` : endpoint)
    : `${FFCV_BASE_URL}/${endpoint}${queryString ? `?${queryString}` : ''}`;
  const timeoutMs = options.timeoutMs || 7000;

  const { token, cookie } = await getFfcvPageToken();

  const reqHeaders: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': 'https://ffcv.es/competiciones/'
  };

  if (token) {
    reqHeaders['X-FFCV-Page-Token'] = token;
  }
  if (cookie) {
    reqHeaders['Cookie'] = cookie;
  }

  return new Promise<T>((resolve, reject) => {
    const req = https.get(url, {
      agent: ffcvAgent,
      headers: reqHeaders,
      timeout: timeoutMs
    }, (res) => {
      let rawData = '';
      res.setEncoding('utf8');

      res.on('data', (chunk) => {
        rawData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 403 && (rawData.includes('INVALID_PAGE_TOKEN') || rawData.includes('Token de página'))) {
          cachedToken = null; // Invalidate token so retry fetches fresh one
          return reject(new FFCVApiError(`Token rejected by FFCV: INVALID_PAGE_TOKEN`, url, 403, rawData));
        }

        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          return reject(new FFCVApiError(`HTTP Status ${res.statusCode}`, url, res.statusCode, rawData.slice(0, 300)));
        }

        const trimmed = (rawData || '').trim();
        if (!trimmed) {
          return reject(new FFCVApiError('Empty response from FFCV server', url, res.statusCode));
        }

        const contentType = String(res.headers['content-type'] || '').toLowerCase();
        if (
          contentType.includes('text/html') ||
          trimmed.startsWith('<!DOCTYPE') ||
          trimmed.startsWith('<html') ||
          trimmed.startsWith('<')
        ) {
          return reject(
            new FFCVApiError(
              `Expected JSON response from FFCV, received HTML (${contentType || 'no content-type'})`,
              url,
              res.statusCode,
              trimmed.slice(0, 200)
            )
          );
        }

        try {
          const parsed = JSON.parse(trimmed);
          if (parsed && typeof parsed === 'object' && 'error' in parsed && parsed.error) {
            return reject(new FFCVApiError(`FFCV error: ${parsed.error}`, url, res.statusCode, trimmed.slice(0, 300)));
          }
          resolve(parsed as T);
        } catch (err: any) {
          reject(new FFCVApiError(`Failed to parse JSON response: ${err.message}`, url, res.statusCode, trimmed.slice(0, 300)));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new FFCVApiError(`Request timed out after ${timeoutMs}ms`, url));
    });

    req.on('error', (err) => {
      reject(new FFCVApiError(`Network error: ${err.message}`, url));
    });
  });
}

async function ffcvGet<T>(endpoint: string, params: Record<string, string | number | undefined> = {}, options: RequestOptions = {}): Promise<T> {
  const maxRetries = options.retries ?? 1;
  let delay = options.retryDelayMs ?? 350;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await singleFfcvGet<T>(endpoint, params, options);
    } catch (err: any) {
      const isTokenError = err instanceof FFCVApiError && (err.statusCode === 403 || err.message.includes('INVALID_PAGE_TOKEN'));
      const isRetryable = isTokenError || (err instanceof FFCVApiError && (
        err.statusCode === 429 ||
        err.statusCode === 503 ||
        err.statusCode === 500 ||
        err.statusCode === 502 ||
        err.statusCode === 504 ||
        err.message.includes('Network error') ||
        err.message.includes('timed out')
      ));

      if (attempt < maxRetries && isRetryable) {
        if (isTokenError) {
          await getFfcvPageToken(true); // Force refresh fresh token
        }
        await new Promise(res => setTimeout(res, delay));
        delay = Math.min(delay * 2, 2000);
        continue;
      }
      throw err;
    }
  }
  throw new Error('Unreachable');
}

/**
 * Fetch arbitrary raw JSON from FFCV with full token injection, retry support, in-memory cache and in-flight deduplication
 */
export async function fetchFfcvRawUrl<T = any>(fullUrl: string, options: RequestOptions = {}): Promise<T | null> {
  const now = Date.now();
  const isHistoricalSeason =
    fullUrl.includes('cod_temporada=') &&
    !fullUrl.includes('cod_temporada=auto') &&
    !fullUrl.includes('cod_temporada=22');
  const defaultTtlMs = isHistoricalSeason ? 2 * 60 * 60 * 1000 : 15 * 60 * 1000;
  const cacheTtlMs = options.cacheTtlMs ?? defaultTtlMs;

  if (!options.bypassCache) {
    const cached = ffcvResponseCache.get(fullUrl);
    if (cached && now < cached.expiresAt) {
      return cached.data as T;
    }

    const cooldownUntil = ffcvErrorCooldown.get(fullUrl);
    if (cooldownUntil && now < cooldownUntil) {
      if (cached && now < cached.staleUntil) {
        return cached.data as T;
      }
      return null;
    }

    const existingPromise = ffcvInFlight.get(fullUrl);
    if (existingPromise) {
      return existingPromise as Promise<T | null>;
    }
  }

  const requestPromise = (async (): Promise<T | null> => {
    try {
      const result = await ffcvGet<T>(fullUrl, {}, options);
      if (result !== null && result !== undefined) {
        ffcvResponseCache.set(fullUrl, {
          data: result,
          expiresAt: Date.now() + cacheTtlMs,
          staleUntil: Date.now() + Math.max(cacheTtlMs * 4, 60 * 60 * 1000)
        });
        ffcvErrorCooldown.delete(fullUrl);
      }
      return result;
    } catch (err: any) {
      console.warn('[FFCV Client] fetchFfcvRawUrl failed for:', fullUrl, err?.message || err);
      ffcvErrorCooldown.set(fullUrl, Date.now() + 60 * 1000);
      const stale = ffcvResponseCache.get(fullUrl);
      if (stale && Date.now() < stale.staleUntil) {
        return stale.data as T;
      }
      return null;
    } finally {
      ffcvInFlight.delete(fullUrl);
    }
  })();

  ffcvInFlight.set(fullUrl, requestPromise);
  return requestPromise;
}

/**
 * 1. Fetch results/matches for a group and matchday
 */
export async function fetchMatchdayResults(params: {
  seasonId: string;
  competitionId: string;
  groupId: string;
  matchday: number;
  groupName?: string;
  competitionName?: string;
}): Promise<FFCVRawMatchdayResponse> {
  return ffcvGet<FFCVRawMatchdayResponse>('partidos/resultados_por_grupo_jornada_data.php', {
    cod_temporada: params.seasonId,
    cod_competicion: params.competitionId,
    cod_grupo: params.groupId,
    cod_jornada: params.matchday,
    grupo_nombre: params.groupName,
    competicion_nombre: params.competitionName
  });
}

/**
 * 2. Fetch group standings for a matchday
 */
export async function fetchGroupStandings(params: {
  groupId: string;
  matchday: number;
}): Promise<FFCVRawStandingsResponse> {
  return ffcvGet<FFCVRawStandingsResponse>('clasificaciones/clasificaciones_ajax.php', {
    cod_grupo: params.groupId,
    cod_jornada: params.matchday
  });
}

/**
 * 3. Fetch all matchdays (calendar structure) for a group
 */
export async function fetchGroupMatchdays(params: {
  groupId: string;
}): Promise<FFCVRawJornadasResponse> {
  return ffcvGet<FFCVRawJornadasResponse>('filtros/jornadas_fetch.php', {
    cod_grupo: params.groupId
  });
}

/**
 * 4. Fetch team details by official team code
 */
export async function fetchTeamDetails(params: {
  teamId: string;
}): Promise<FFCVRawTeamDetails> {
  return ffcvGet<FFCVRawTeamDetails>('equipos/ver_equipo.php', {
    codequipo: params.teamId
  });
}

/**
 * 5. Fetch match details / electronic match report (acta) by match code
 */
export async function fetchMatchDetails(params: {
  matchId: string;
}): Promise<FFCVRawMatchDetails> {
  return ffcvGet<FFCVRawMatchDetails>('partidos/ficha_partido_ajax.php', {
    cod_partido: params.matchId
  });
}
