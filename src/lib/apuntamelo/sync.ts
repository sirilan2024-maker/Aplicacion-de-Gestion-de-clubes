import https from 'https';
import { createAdminClient } from '../supabase/admin';
import { formatSpainDateTimeToIso } from '../ffcv/parser';
import {
  FFCVGroupRecord,
  FFCVStandingRecord,
  FFCVMatchRecord,
  FFCVSyncResult
} from '../ffcv/types';

// Agent configured to bypass intermediate SSL certificate issue on apuntamelo.com
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

export function fetchApuntameloJson<T = any>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    https.get(
      url,
      {
        agent: httpsAgent,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json, text/plain, */*'
        }
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (e: any) {
            reject(new Error(`Error al parsear JSON de ${url}: ${e.message}`));
          }
        });
      }
    ).on('error', (err) => reject(err));
  });
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
      const parsedStandings = JSON.parse(clasData[0].Json_clasificacion);
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
    }
  } catch (err: any) {
    errors.push(`Error al consultar clasificación en Apúntamelo: ${err.message}`);
  }

  // 3. Obtener todos los partidos del grupo desde Apúntamelo
  let allGroupMatches: any[] = [];
  try {
    const rawMatches = await fetchApuntameloJson(
      `https://apuntamelo.com/obtenerPartidosPorJornada?organizacion=${config.orgId}&grupo=${config.grupoId}`
    );

    if (Array.isArray(rawMatches) && rawMatches.length > 0) {
      allGroupMatches = rawMatches;
      const matchdayNumbers = rawMatches.map((m: any) => Number(m.Jornada)).filter(Boolean);
      totalMatchdays = matchdayNumbers.length > 0 ? Math.max(...matchdayNumbers) : 0;

      const matchRecords: FFCVMatchRecord[] = rawMatches.map((m: any) => {
        const hasScore = m.Goles_A !== null && m.Goles_B !== null && m.Goles_A !== undefined && m.Goles_B !== undefined;
        const horaFormateada = m.Hora && typeof m.Hora === 'string' && m.Hora.trim() !== '' && m.Hora !== '00:00:00'
          ? m.Hora.slice(0, 5)
          : null;
        const isoDateTime = formatSpainDateTimeToIso(m.Fecha, horaFormateada);

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
          home_shield_url: null,
          away_shield_url: null,
          home_score: hasScore ? Number(m.Goles_A) : null,
          away_score: hasScore ? Number(m.Goles_B) : null,
          status: hasScore ? 'played' : 'scheduled',
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

    // Obtener los partidos existentes de este equipo en la temporada activa
    const { data: existingPartidos } = await supabase
      .from('partidos')
      .select('id, rival_nombre, fecha_hora, acta_oficial_url, lugar, highlight_jornada')
      .eq('equipo_id', teamId)
      .eq('season_id', activeAppSeasonId);

    for (const sm of saladarMatches) {
      const isHome = Number(sm.FK_EquipoLiga_A) === config.teamApuntameloId;
      const rivalName = isHome ? sm.Nombre_B : sm.Nombre_A;
      const matchUrl = `https://apuntamelo.com/partido/${sm.Id}`;
      const horaFormateada = sm.Hora && typeof sm.Hora === 'string' && sm.Hora.trim() !== '' && sm.Hora !== '00:00:00'
        ? sm.Hora.slice(0, 5)
        : null;
      const isoDateTime = formatSpainDateTimeToIso(sm.Fecha, horaFormateada) || `${sm.Fecha}T10:00:00+02:00`;
      const hasScore = sm.Goles_A !== null && sm.Goles_B !== null && sm.Goles_A !== undefined && sm.Goles_B !== undefined;
      const scorePropio = hasScore ? (isHome ? Number(sm.Goles_A) : Number(sm.Goles_B)) : null;
      const scoreRival = hasScore ? (isHome ? Number(sm.Goles_B) : Number(sm.Goles_A)) : null;
      const estado = hasScore ? 'Finalizado' : 'Programado';
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
      } else {
        // Insertar nuevo partido
        await supabase.from('partidos').insert({
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
        });
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
          : (sm.Campo || 'Visitante');

        // Buscar si ya existe un evento para esta jornada o con este rival en la misma ventana temporal
        const { data: teamMatchEvents } = await supabase
          .from('team_events')
          .select('id, date, title, notes')
          .eq('team_id', teamId)
          .eq('event_type', 'Partido')
          .eq('season_id', activeAppSeasonId);

        const jornadaStr = `Jornada ${sm.Jornada} Liga Brave`;
        const matchedEvent = (teamMatchEvents || []).find((ev: any) => {
          if (ev.notes && ev.notes.includes(jornadaStr)) return true;
          if (ev.date === sm.Fecha && ev.title && (ev.title.includes(rivalName) || rivalName.includes(ev.title))) return true;
          if (ev.date && ev.title && (ev.title.includes(rivalName) || rivalName.includes(ev.title))) {
            const diffDays = Math.abs((new Date(ev.date).getTime() - new Date(sm.Fecha).getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays <= 7) return true;
          }
          return false;
        });

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
              notes: `${jornadaStr} (${isHome ? 'Local' : 'Visitante'})`
            })
            .eq('id', matchedEvent.id);

          // Si hubiera eventos duplicados huérfanos con el mismo rival o jornada, eliminarlos
          const duplicateEvents = (teamMatchEvents || []).filter(
            (ev: any) => ev.id !== matchedEvent.id && (
              (ev.notes && ev.notes.includes(jornadaStr)) ||
              (ev.date === sm.Fecha && ev.title && (ev.title.includes(rivalName) || rivalName.includes(ev.title)))
            )
          );
          for (const dup of duplicateEvents) {
            await supabase.from('team_events').delete().eq('id', dup.id);
          }
        } else {
          // Insertar nuevo evento
          await supabase.from('team_events').insert({
            team_id: teamId,
            title: eventTitle,
            event_type: 'Partido',
            date: sm.Fecha,
            start_time: sTime,
            end_time: eTime,
            location: pitchLocation,
            notes: `${jornadaStr} (${isHome ? 'Local' : 'Visitante'})`,
            season_id: activeAppSeasonId
          });
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
