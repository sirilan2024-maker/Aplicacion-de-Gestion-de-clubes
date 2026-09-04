import {
  FFCVRawMatchItem,
  FFCVRawStandingItem,
  FFCVStandingRecord,
  FFCVMatchRecord
} from './types';

const FFCV_ORIGIN = 'https://ffcv.es';

/**
 * Normalize relative image URL to absolute URL
 */
export function normalizeImageUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string' || url.trim() === '') return null;
  const clean = url.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }
  return `${FFCV_ORIGIN}${clean.startsWith('/') ? '' : '/'}${clean}`;
}

/**
 * Normalize DD/MM/YYYY or DD-MM-YYYY to YYYY-MM-DD
 */
export function normalizeDate(dateStr?: string | null): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  
  // Format DD/MM/YYYY or DD-MM-YYYY
  const match = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    return `${year}-${month}-${day}`;
  }

  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Normalize HH:MM to HH:MM:SS
 */
export function normalizeTime(timeStr?: string | null): string | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const trimmed = timeStr.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match) {
    const hour = match[1].padStart(2, '0');
    const minute = match[2];
    const second = match[3] || '00';
    return `${hour}:${minute}:${second}`;
  }
  return null;
}

/**
 * Combine date and time into ISO timestamp
 */
export function combineDateTime(dateStr?: string | null, timeStr?: string | null): string | null {
  const normDate = normalizeDate(dateStr);
  if (!normDate) return null;
  const normTime = normalizeTime(timeStr) || '00:00:00';
  return `${normDate}T${normTime}+02:00`; // Europe/Madrid local offset
}

/**
 * Safe integer parser
 */
export function parseNumber(val: any, defaultVal: number = 0): number {
  if (val === undefined || val === null || val === '') return defaultVal;
  const parsed = parseInt(String(val).trim(), 10);
  return isNaN(parsed) ? defaultVal : parsed;
}

/**
 * Parse score and match status
 */
export function parseMatchScoreAndStatus(match: FFCVRawMatchItem): {
  homeScore: number | null;
  awayScore: number | null;
  status: 'scheduled' | 'played' | 'postponed' | 'suspended' | 'cancelled';
  statusReason: string | null;
} {
  const rawRes = (match.resultado || '').trim();
  const rawStatus = (match.estado || '').trim();
  const motivo = (match.motivo_estado || '').trim();

  // If match has a status reason indicating postponement or suspension
  if (motivo.toLowerCase().includes('aplazado') || rawStatus === '2') {
    return {
      homeScore: null,
      awayScore: null,
      status: 'postponed',
      statusReason: motivo || 'Aplazado'
    };
  }

  if (motivo.toLowerCase().includes('suspendido') || rawStatus === '3') {
    return {
      homeScore: null,
      awayScore: null,
      status: 'suspended',
      statusReason: motivo || 'Suspendido'
    };
  }

  // Check if result has standard score format "X - Y" or "X-Y"
  const scoreMatch = rawRes.match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (scoreMatch) {
    return {
      homeScore: parseInt(scoreMatch[1], 10),
      awayScore: parseInt(scoreMatch[2], 10),
      status: 'played',
      statusReason: null
    };
  }

  // When rawRes is "0" or empty and estado == "0", it represents an unplayed/scheduled match
  if (rawStatus === '0' || rawRes === '0' || rawRes === '') {
    return {
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      statusReason: motivo || null
    };
  }

  return {
    homeScore: null,
    awayScore: null,
    status: 'scheduled',
    statusReason: motivo || null
  };
}

/**
 * Normalize standing row from FFCV to database record
 */
export function normalizeStandingItem(
  item: FFCVRawStandingItem,
  context: { seasonId: string; competitionId: string; groupId: string; matchday: number }
): FFCVStandingRecord {
  const points = parseNumber(item.puntos);
  const played = parseNumber(item.jugados);
  const won = parseNumber(item.ganados);
  const drawn = parseNumber(item.empatados);
  const lost = parseNumber(item.perdidos);
  const gf = parseNumber(item.goles_a_favor);
  const ga = parseNumber(item.goles_en_contra);

  return {
    ffcv_group_id: context.groupId,
    ffcv_season_id: context.seasonId,
    ffcv_competition_id: context.competitionId,
    matchday: context.matchday,
    position: parseNumber(item.posicion, 1),
    team_ffcv_id: String(item.codequipo).trim(),
    team_name: String(item.nombre || '').trim(),
    shield_url: normalizeImageUrl(item.url_img),
    points,
    played,
    won,
    drawn,
    lost,
    goals_for: gf,
    goals_against: ga,
    goal_difference: gf - ga,
    penalty_points: parseNumber(item.puntos_sancion),
    home_played: parseNumber(item.jugados_casa),
    home_won: parseNumber(item.ganados_casa),
    home_drawn: parseNumber(item.empatados_casa),
    home_lost: parseNumber(item.perdidos_casa),
    away_played: parseNumber(item.jugados_fuera),
    away_won: parseNumber(item.ganados_fuera),
    away_drawn: parseNumber(item.empatados_fuera),
    away_lost: parseNumber(item.perdidos_fuera),
    home_points: parseNumber(item.puntos_local),
    away_points: parseNumber(item.puntos_visitante),
    zone_color: item.color ? item.color.trim() : null,
    raw_data: item as any
  };
}

/**
 * Normalize match item from FFCV to database record
 */
export function normalizeMatchItem(
  item: FFCVRawMatchItem,
  context: { seasonId: string; competitionId: string; groupId: string; matchday: number }
): FFCVMatchRecord {
  const { homeScore, awayScore, status, statusReason } = parseMatchScoreAndStatus(item);
  const normDate = normalizeDate(item.fecha);
  const normTime = normalizeTime(item.hora);
  const isoDateTime = combineDateTime(item.fecha, item.hora);

  return {
    ffcv_match_id: String(item.codacta).trim(),
    ffcv_group_id: context.groupId,
    ffcv_season_id: context.seasonId,
    ffcv_competition_id: context.competitionId,
    matchday: context.matchday,
    match_date: normDate,
    match_time: normTime,
    datetime: isoDateTime,
    home_team_ffcv_id: String(item.cod_equipo_local).trim(),
    away_team_ffcv_id: String(item.cod_equipo_visitante).trim(),
    home_team_name: String(item.local || '').trim(),
    away_team_name: String(item.visitante || '').trim(),
    home_shield_url: normalizeImageUrl(item.escudo_local),
    away_shield_url: normalizeImageUrl(item.escudo_visitante),
    home_score: homeScore,
    away_score: awayScore,
    status,
    status_reason: statusReason,
    pitch_name: item.campo ? String(item.campo).trim() : null,
    codacta: item.codacta ? String(item.codacta).trim() : null,
    is_closed: status === 'played',
    raw_data: item as any
  };
}
