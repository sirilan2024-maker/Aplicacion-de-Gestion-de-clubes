/**
 * Tipos de datos para el Panel de Coordinador Deportivo
 * Sporting Saladar - Temporada Activa 26/27
 */

export type FfcvCategory = 
  | 'todos'
  | 'senior'
  | 'juvenil'
  | 'cadete'
  | 'infantil'
  | 'alevin'
  | 'benjamin'
  | 'prebenjamin';

export type DisciplineStatus = 'Sancionado' | 'Apercibido' | 'OK';

export interface PlayerDisciplineRecord {
  playerId: string;
  playerName: string;
  playerDorsal?: number | null;
  teamId: string;
  teamName: string;
  teamCategory: string;
  teamColor: string | null;
  yellowCardsTotal: number;       // Tarjetas amarillas acumuladas válidas para ciclo
  isolatedYellows: number;         // Amarillas en partidos sin expulsión (suman a ciclo)
  doubleYellowsCount: number;      // Partidos con doble amarilla (no suman a ciclo, conllevan sanción)
  directRedsCount: number;         // Rojas directas
  currentCycleAccumulated: number; // Modulo 5 de amarillas válidas (0-4)
  status: DisciplineStatus;
  statusReason: string;            // 'Ciclo de 5 amarillas cumplido' | 'Apercibido (4 amarillas)' | 'Roja directa' | 'Doble amarilla última jornada' | 'Sin sanción'
  isSuspendedNextMatch: boolean;
  coachNotified?: boolean;
}

export interface AttendanceCategoryStats {
  category: string;
  label: string;
  totalSessions: number;
  totalExpectedAttendances: number;
  actualAttendances: number;
  attendanceRate: number;         // Porcentaje 0-100
  teamsCount: number;
}

export interface ActiveInjuryItem {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  teamCategory: string;
  injuryType: string;
  severity: 'leve' | 'moderada' | 'grave';
  startDate: string;
  estimatedReturnDate?: string | null;
  observations?: string | null;
}

export interface PitchTimelineSlot {
  id: string;
  pitchName: string;               // Ej: 'Campo 1 (F11)', 'Campo 2 (F8 A)', etc.
  startTime: string;               // '17:00'
  endTime: string;                 // '18:30'
  teamId: string;
  teamName: string;
  teamCategory: string;
  teamColor: string | null;
  coachName: string | null;
  title: string;
  date: string;
  hasConflict?: boolean;
}

export interface SportsWeekendSummary {
  playedMatches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  winRate: number;
  topTeam?: {
    teamName: string;
    position: number;
    points: number;
  };
}

export interface CoordinatorDashboardFullData {
  seasonId: string;
  seasonName: string;
  matchdayNumber?: number;
  kpis: {
    totalTeams: number;
    totalPlayers: number;
    activeSuspendedCount: number;
    apercibidosCount: number;
    weeklyAttendanceRate: number;
    activeInjuriesCount: number;
    weekendWins: number;
    weekendDraws: number;
    weekendLosses: number;
  };
  alerts: Array<{
    id: string;
    type: 'sancion' | 'apercibido' | 'sin_entrenador' | 'lesion' | 'horario_solapado';
    severity: 'error' | 'warning' | 'info';
    title: string;
    message: string;
    teamId?: string;
    playerId?: string;
  }>;
  discipline: {
    suspendedPlayers: PlayerDisciplineRecord[];
    apercibidoPlayers: PlayerDisciplineRecord[];
    allTrackedPlayers: PlayerDisciplineRecord[];
  };
  attendance: {
    globalWeeklyRate: number;
    period: 'semana' | 'mes' | 'temporada';
    categories: AttendanceCategoryStats[];
    activeInjuries: ActiveInjuryItem[];
  };
  sports: {
    weekend: SportsWeekendSummary;
    teamStandings: Array<{
      teamId: string;
      teamName: string;
      category: string;
      competitionName?: string;
      position: number;
      played: number;
      points: number;
      goalsFor: number;
      goalsAgainst: number;
      statusBadge?: string;
    }>;
  };
  schedule: {
    selectedDate: string;
    availablePitches: string[];
    slots: PitchTimelineSlot[];
  };
}
