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

interface RequestOptions {
  timeoutMs?: number;
}

async function ffcvGet<T>(endpoint: string, params: Record<string, string | number | undefined> = {}, options: RequestOptions = {}): Promise<T> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      query.append(key, String(value));
    }
  }

  const queryString = query.toString();
  const url = `${FFCV_BASE_URL}/${endpoint}${queryString ? `?${queryString}` : ''}`;
  const timeoutMs = options.timeoutMs || 15000;

  return new Promise<T>((resolve, reject) => {
    const req = https.get(url, {
      agent: ffcvAgent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest'
      },
      timeout: timeoutMs
    }, (res) => {
      let rawData = '';
      res.setEncoding('utf8');

      res.on('data', (chunk) => {
        rawData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          return reject(new FFCVApiError(`HTTP Status ${res.statusCode}`, url, res.statusCode, rawData));
        }

        if (!rawData || rawData.trim() === '') {
          return reject(new FFCVApiError('Empty response from FFCV server', url, res.statusCode));
        }

        try {
          const parsed = JSON.parse(rawData);
          if (parsed && typeof parsed === 'object' && 'error' in parsed && parsed.error) {
            return reject(new FFCVApiError(`FFCV error: ${parsed.error}`, url, res.statusCode, rawData));
          }
          resolve(parsed as T);
        } catch (err: any) {
          reject(new FFCVApiError(`Failed to parse JSON response: ${err.message}`, url, res.statusCode, rawData.slice(0, 300)));
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
