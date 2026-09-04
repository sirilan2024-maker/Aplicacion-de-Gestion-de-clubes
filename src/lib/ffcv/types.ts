// TypeScript interfaces for FFCV API Integration

// Raw response interfaces from https://ffcv.es/competiciones/api/

export interface FFCVRawMatchItem {
  fecha: string;
  hora: string;
  local: string;
  visitante: string;
  cod_equipo_local: string;
  cod_equipo_visitante: string;
  resultado: string;
  resultado_provisional?: string;
  campo: string;
  escudo_local?: string;
  escudo_visitante?: string;
  retirado_local?: string;
  retirado_visitante?: string;
  codacta: string;
  estado: string;
  motivo_estado?: string;
}

export interface FFCVRawMatchdayResponse {
  grupo?: string;
  jornada: string;
  partidos: FFCVRawMatchItem[];
}

export interface FFCVRawStandingItem {
  color?: string;
  posicion: string;
  url_img?: string;
  codequipo: string;
  nombre: string;
  jugados: string;
  ganados: string;
  empatados: string;
  perdidos: string;
  penaltis?: string;
  goles_a_favor: string;
  goles_en_contra: string;
  jugados_casa?: string;
  ganados_casa?: string;
  empatados_casa?: string;
  ganados_penalti_casa?: string;
  perdidos_casa?: string;
  jugados_fuera?: string;
  ganados_fuera?: string;
  empatados_fuera?: string;
  ganados_penalti_fuera?: string;
  perdidos_fuera?: string;
  puntos: string;
  puntos_sancion?: string;
  puntos_local?: string;
  puntos_visitante?: string;
  mostrar_coeficiente?: string;
  coeficiente?: string;
  racha_partidos?: any[];
}

export interface FFCVRawStandingsResponse {
  estado: string;
  sesion_ok: string;
  competicion?: string;
  codigo_competicion?: string;
  grupo?: string;
  codigo_grupo?: string;
  tipo_competicion?: string;
  jornada: string;
  fecha_jornada?: string;
  clasificacion: FFCVRawStandingItem[];
  promociones?: any;
}

export interface FFCVRawJornadaItem {
  codjornada: string;
  nombre: string;
  nombre_antiguo?: string;
  fecha_jornada: string;
}

export interface FFCVRawJornadasResponse {
  estado: string;
  sesion_ok: string;
  jornadas: FFCVRawJornadaItem[];
}

export interface FFCVRawTeamDetails {
  estado: string;
  sesion_ok: string;
  codigo_equipo: string;
  codigo_club?: string;
  nombre_equipo: string;
  escudo_club?: string;
  nombre_club?: string;
  categoria?: string;
  codigo_categoria?: string;
  campo?: string;
  codigo_campo?: string;
  [key: string]: any;
}

export interface FFCVRawMatchDetails {
  estado: string;
  sesion_ok: string;
  codacta: string;
  nombre_competicion?: string;
  nombre_grupo?: string;
  jornada?: string;
  fecha?: string;
  hora?: string;
  campo?: string;
  codigo_campo?: string;
  acta_cerrada: string;
  partido_en_juego?: string;
  codigo_equipo_local: string;
  equipo_local: string;
  escudo_local?: string;
  goles_local?: string;
  codigo_equipo_visitante: string;
  equipo_visitante: string;
  escudo_visitante?: string;
  goles_visitante?: string;
  goles_equipo_local?: any[];
  goles_equipo_visitante?: any[];
  tarjetas_equipo_local?: any[];
  tarjetas_equipo_visitante?: any[];
  jugadores_equipo_local?: any[];
  jugadores_equipo_visitante?: any[];
  arbitros_partido?: any[];
  [key: string]: any;
}

// Normalized database models

export interface FFCVGroupRecord {
  id?: string;
  ffcv_season_id: string;
  ffcv_competition_id: string;
  ffcv_group_id: string;
  season_name?: string | null;
  competition_name?: string | null;
  group_name?: string | null;
  total_matchdays?: number;
  total_teams?: number;
  last_synced_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FFCVStandingRecord {
  id?: string;
  ffcv_group_id: string;
  ffcv_season_id: string;
  ffcv_competition_id: string;
  matchday: number;
  position: number;
  team_ffcv_id: string;
  team_name: string;
  shield_url?: string | null;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  penalty_points: number;
  home_played: number;
  home_won: number;
  home_drawn: number;
  home_lost: number;
  away_played: number;
  away_won: number;
  away_drawn: number;
  away_lost: number;
  home_points: number;
  away_points: number;
  zone_color?: string | null;
  raw_data?: Record<string, any>;
  updated_at?: string;
}

export interface FFCVMatchRecord {
  id?: string;
  ffcv_match_id: string;
  ffcv_group_id: string;
  ffcv_season_id: string;
  ffcv_competition_id: string;
  matchday: number;
  match_date?: string | null; // YYYY-MM-DD
  match_time?: string | null; // HH:MM:SS
  datetime?: string | null;
  home_team_ffcv_id: string;
  away_team_ffcv_id: string;
  home_team_name: string;
  away_team_name: string;
  home_shield_url?: string | null;
  away_shield_url?: string | null;
  home_score?: number | null;
  away_score?: number | null;
  status: 'scheduled' | 'played' | 'postponed' | 'suspended' | 'cancelled';
  status_reason?: string | null;
  pitch_name?: string | null;
  pitch_id?: string | null;
  codacta?: string | null;
  is_closed: boolean;
  raw_data?: Record<string, any>;
  updated_at?: string;
}

export interface FFCVSyncOptions {
  seasonId: string;
  competitionId: string;
  groupId: string;
  teamFfcvId?: string;
  competitionName?: string;
  groupName?: string;
  syncAllMatchdays?: boolean;
  specificMatchday?: number;
}

export interface FFCVSyncResult {
  success: boolean;
  group: {
    seasonId: string;
    competitionId: string;
    groupId: string;
    totalMatchdays: number;
    totalTeams: number;
  };
  standingsInsertedOrUpdated: number;
  matchesInsertedOrUpdated: number;
  matchdaysSynced: number[];
  errors?: string[];
}

export interface FFCVBatchSyncResult {
  success: boolean;
  timestamp: string;
  totalTeamsConfigured: number;
  uniqueGroupsCount: number;
  groupsProcessed: number;
  groupsSuccess: number;
  groupsFailed: number;
  totalStandingsUpdated: number;
  totalMatchesUpdated: number;
  groupResults: Array<{
    groupKey: string;
    seasonId: string;
    competitionId: string;
    groupId: string;
    teamIds: string[];
    result?: FFCVSyncResult;
    error?: string;
  }>;
}
