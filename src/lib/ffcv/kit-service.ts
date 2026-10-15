import { createAdminClient } from '@/lib/supabase/admin';
import { fetchTeamDetails } from './client';

export interface KitDetectionResult {
  equipacion: 'primera' | 'segunda';
  conflicto: boolean;
  motivo: string;
  rivalCamisetaColor?: string;
  rivalColorHex?: string;
}

const BLUE_KEYWORDS_REGEX = /\b(azul|azules|celeste|celestes|navy|marino|turquesa|cian|blue)\b/i;

/**
 * Checks if a color name or hex indicates blue
 */
export function isBlueColor(colorText?: string | null, hexColor?: string | null): boolean {
  if (colorText && BLUE_KEYWORDS_REGEX.test(colorText)) {
    return true;
  }
  if (hexColor) {
    const cleanHex = hexColor.replace('#', '').trim();
    if (cleanHex.length === 6) {
      const r = parseInt(cleanHex.substring(0, 2), 16);
      const g = parseInt(cleanHex.substring(2, 4), 16);
      const b = parseInt(cleanHex.substring(4, 6), 16);
      // If blue channel is dominant and significantly higher than red
      if (b > 130 && b > r * 1.3) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Detects whether Sporting Saladar should wear 1st Kit (Azul) or 2nd Kit (Roja)
 */
export function detectKitForMatch(params: {
  isLocal: boolean;
  rivalCamisetaColor?: string | null;
  rivalColorHex?: string | null;
}): KitDetectionResult {
  // 1. Partidos como Local: SIEMPRE 1ª Equipación (Azul)
  if (params.isLocal) {
    return {
      equipacion: 'primera',
      conflicto: false,
      motivo: 'En casa (Local): Siempre 1ª Equipación Oficial (Azul completa).',
      rivalCamisetaColor: params.rivalCamisetaColor || undefined,
      rivalColorHex: params.rivalColorHex || undefined,
    };
  }

  // 2. Partidos como Visitante:
  const rivalIsBlue = isBlueColor(params.rivalCamisetaColor, params.rivalColorHex);

  if (rivalIsBlue) {
    return {
      equipacion: 'segunda',
      conflicto: true,
      motivo: `Coincidencia cromática: el rival local viste de ${params.rivalCamisetaColor || 'Azul'}. Obligatorio vestir 2ª Equipación (Roja completa).`,
      rivalCamisetaColor: params.rivalCamisetaColor || 'Azul',
      rivalColorHex: params.rivalColorHex || undefined,
    };
  }

  return {
    equipacion: 'primera',
    conflicto: false,
    motivo: `Fuera de casa (Visitante): El rival vista de ${params.rivalCamisetaColor || 'otro color'}. Sin coincidencia. 1ª Equipación (Azul completa).`,
    rivalCamisetaColor: params.rivalCamisetaColor || undefined,
    rivalColorHex: params.rivalColorHex || undefined,
  };
}

/**
 * Resolves rival kit details from FFCV for a match if not already set,
 * and updates the match in the database.
 */
export async function resolveRivalKitForMatch(matchId: string): Promise<KitDetectionResult> {
  const supabase = createAdminClient();

  const { data: match } = await supabase
    .from('partidos')
    .select(`
      id, lugar, rival_nombre, equipacion_asignada, equipacion_preparada,
      rival_camiseta_color, conflicto_equipacion, equipo_id
    `)
    .eq('id', matchId)
    .single();

  if (!match) {
    return {
      equipacion: 'primera',
      conflicto: false,
      motivo: 'Partido no encontrado',
    };
  }

  const isLocal = match.lugar === 'Local' || (match.lugar !== 'Visitante' && !/\b(visitante|fuera)\b/i.test(match.lugar || ''));

  // If already determined and not local, return current
  if (isLocal) {
    return detectKitForMatch({ isLocal: true });
  }

  let rivalColor = match.rival_camiseta_color;
  let rivalHex: string | undefined = undefined;

  // Try fetching rival kit from FFCV if color is not cached
  if (!rivalColor && match.rival_nombre) {
    try {
      const { data: fm } = await supabase
        .from('ffcv_matches')
        .select('home_team_ffcv_id, away_team_ffcv_id, home_team_name, away_team_name')
        .neq('ffcv_season_id', '21')
        .or(`home_team_name.ilike.%${match.rival_nombre.slice(0, 8)}%,away_team_name.ilike.%${match.rival_nombre.slice(0, 8)}%`)
        .limit(1)
        .maybeSingle();

      if (fm) {
        const isRivalHome = (fm.home_team_name || '').toLowerCase().includes(match.rival_nombre.toLowerCase().slice(0, 6));
        const rivalCode = isRivalHome ? fm.home_team_ffcv_id : fm.away_team_ffcv_id;

        if (rivalCode) {
          const details = await fetchTeamDetails({ teamId: rivalCode });
          if (details && details.equipaciones && details.equipaciones[0]) {
            rivalColor = details.equipaciones[0].camiseta || null;
            rivalHex = details.equipacion1_diseno?.[0]?.color_camiseta1 || undefined;
          }
        }
      }
    } catch (e) {
      console.warn('[KitService] Error fetching rival kit details from FFCV:', e);
    }
  }

  const detection = detectKitForMatch({
    isLocal: false,
    rivalCamisetaColor: rivalColor,
    rivalColorHex: rivalHex,
  });

  // Save to database
  await supabase
    .from('partidos')
    .update({
      equipacion_asignada: detection.equipacion,
      conflicto_equipacion: detection.conflicto,
      rival_camiseta_color: detection.rivalCamisetaColor || rivalColor,
    })
    .eq('id', matchId);

  return detection;
}
