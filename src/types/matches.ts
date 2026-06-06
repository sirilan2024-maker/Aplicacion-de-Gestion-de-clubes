export interface Partido {
  id: string;
  club_id: string;
  equipo_id: string;
  rival_nombre: string;
  fecha_hora: string;
  lugar: 'Local' | 'Visitante';
  resultado_propio: number | null;
  resultado_rival: number | null;
  estado: 'Programado' | 'Finalizado';
  created_at: string;
  
  // Relacion (para UI)
  equipo?: {
    id: string;
    name: string;
    color?: string;
  };
}

export interface Convocatoria {
  id: string;
  partido_id: string;
  player_id: string;
  titular: boolean;
  minutos_jugados: number;
  goles: number;
  asistencias: number;
  tarjetas_amarillas: number;
  tarjetas_rojas: number;
  asistencia_confirmada_familia: boolean;
  estado_asistencia: 'Pendiente' | 'Confirmado' | 'Ausente';
  posicion_tactica?: string | null;
  slot_index?: number | null;
  created_at: string;

  // Relacion (para UI)
  player?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export type TipoEvento =
  | 'Gol'
  | 'Asistencia'
  | 'Tarjeta Amarilla'
  | 'Tarjeta Roja'
  | 'Cambio Entra'
  | 'Cambio Sale'
  | 'Penalty'
  | 'Gol en Propia'

export interface MatchEvent {
  id: string;
  partido_id: string;
  player_id: string | null;
  tipo_evento: TipoEvento;
  minuto: number;
  notas?: string | null;
  created_at: string;

  // Relacion (para UI)
  player?: {
    id: string;
    first_name: string;
    last_name: string;
    dorsal?: number;
  };
}
