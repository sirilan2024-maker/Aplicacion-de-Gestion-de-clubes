import { normalizeImageUrl } from './parser';

/**
 * Normaliza el nombre del equipo para comparaciones flexibles
 */
export function normalizeTeamName(name?: string | null): string {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Convierte una URL de escudo FFCV a su versión con proxy CORS para uso seguro en canvas / toPng
 */
export function toProxyImageUrl(url?: string | null): string | null {
  if (!url) return null;
  const normalized = normalizeImageUrl(url);
  if (!normalized) return null;
  if (normalized.includes('appwebffcv.novanet.es') || normalized.includes('ffcv.es')) {
    return `/api/ffcv-image-proxy?url=${encodeURIComponent(normalized)}`;
  }
  return normalized;
}

/**
 * Busca el escudo oficial del rival en las colecciones disponibles de la FFCV (partidos y clasificaciones)
 */
export function findRivalShield(
  rivalName?: string | null,
  ffcvMatches: any[] = [],
  ffcvStandings: any[] = []
): string | null {
  if (!rivalName) return null;
  const targetNorm = normalizeTeamName(rivalName);
  if (!targetNorm) return null;

  // 1. Buscar coincidencia en clasificaciones (ffcv_standings)
  if (Array.isArray(ffcvStandings) && ffcvStandings.length > 0) {
    for (const s of ffcvStandings) {
      const shield = s.shield_url || s.raw_data?.url_img;
      if (!shield) continue;
      const sNorm = normalizeTeamName(s.team_name || s.raw_data?.nombre);
      if (sNorm && (sNorm === targetNorm || sNorm.includes(targetNorm) || targetNorm.includes(sNorm))) {
        return normalizeImageUrl(shield);
      }
    }
  }

  // 2. Buscar coincidencia en partidos federativos (ffcv_matches)
  if (Array.isArray(ffcvMatches) && ffcvMatches.length > 0) {
    for (const fm of ffcvMatches) {
      if (fm.home_shield_url) {
        const homeNorm = normalizeTeamName(fm.home_team_name);
        if (homeNorm && (homeNorm === targetNorm || homeNorm.includes(targetNorm) || targetNorm.includes(homeNorm))) {
          return normalizeImageUrl(fm.home_shield_url);
        }
      }
      if (fm.away_shield_url) {
        const awayNorm = normalizeTeamName(fm.away_team_name);
        if (awayNorm && (awayNorm === targetNorm || awayNorm.includes(targetNorm) || targetNorm.includes(awayNorm))) {
          return normalizeImageUrl(fm.away_shield_url);
        }
      }
    }
  }

  // 3. Intento por coincidencia de palabras clave (>3 letras)
  const targetWords = targetNorm.split(' ').filter(w => w.length > 3 && !['c.f.', 'c.d.', 'u.d.', 'at.', 'f.b.'].includes(w));
  if (targetWords.length > 0) {
    // En clasificaciones
    if (Array.isArray(ffcvStandings)) {
      for (const s of ffcvStandings) {
        const shield = s.shield_url || s.raw_data?.url_img;
        if (!shield) continue;
        const sNorm = normalizeTeamName(s.team_name || s.raw_data?.nombre);
        if (targetWords.every(w => sNorm.includes(w))) {
          return normalizeImageUrl(shield);
        }
      }
    }

    // En partidos
    if (Array.isArray(ffcvMatches)) {
      for (const fm of ffcvMatches) {
        if (fm.home_shield_url) {
          const homeNorm = normalizeTeamName(fm.home_team_name);
          if (targetWords.every(w => homeNorm.includes(w))) {
            return normalizeImageUrl(fm.home_shield_url);
          }
        }
        if (fm.away_shield_url) {
          const awayNorm = normalizeTeamName(fm.away_team_name);
          if (targetWords.every(w => awayNorm.includes(w))) {
            return normalizeImageUrl(fm.away_shield_url);
          }
        }
      }
    }
  }

  return null;
}
