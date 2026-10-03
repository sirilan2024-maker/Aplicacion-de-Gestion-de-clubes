import { PlayerDisciplineRecord, DisciplineStatus } from '@/types/coordinator';

export interface RawPlayerMatchCard {
  partidoId: string;
  matchDate?: string;
  jornada?: number;
  yellowCards: number;
  redCards: number;
  isLatestMatch?: boolean;
}

export interface RawTeamMatchInfo {
  id: string;
  fecha_hora?: string;
  estado?: string;
}

export interface CalculateDisciplineParams {
  playerId: string;
  playerName: string;
  playerDorsal?: number | null;
  teamId: string;
  teamName: string;
  teamCategory: string;
  teamColor: string | null;
  matchCards: RawPlayerMatchCard[];
  teamMatches?: RawTeamMatchInfo[];
}

/**
 * Motor de Disciplina Oficial FFCV:
 * 1. Ciclo de acumulación: 5 tarjetas amarillas aisladas = 1 partido de sanción.
 * 2. Apercibido: Jugador con 4 amarillas (o múltiplos: 9, 14...).
 * 3. Doble amarilla en un mismo partido: Expulsión / 1 partido de sanción en el siguiente partido.
 *    REGLA FFCV ESTRICTA: Esas 2 amarillas NO computan para la acumulación del ciclo de 5 amarillas.
 * 4. Tarjeta roja directa: 1 partido de sanción en el siguiente partido.
 * 5. CUMPLIMIENTO DE SANCIÓN: Una vez que el equipo ya ha disputado el partido posterior a la sanción,
 *    la sanción se considera cumplida y desaparece del estado "Sancionado" / "Requiere atención".
 */
export function calculatePlayerFfcvDiscipline(params: CalculateDisciplineParams): PlayerDisciplineRecord {
  const { playerId, playerName, playerDorsal, teamId, teamName, teamCategory, teamColor, matchCards, teamMatches } = params;

  // Ordenar por fecha cronológica ascendente
  const sortedCards = [...matchCards].sort((a, b) => {
    const da = a.matchDate ? new Date(a.matchDate).getTime() : 0;
    const db = b.matchDate ? new Date(b.matchDate).getTime() : 0;
    return da - db;
  });

  const now = new Date();

  // Partidos del equipo ordenados cronológicamente
  const sortedTeamMatches = [...(teamMatches || [])]
    .filter(m => m.fecha_hora)
    .sort((a, b) => new Date(a.fecha_hora!).getTime() - new Date(b.fecha_hora!).getTime());

  // Determinar si un partido ya se ha disputado
  const isMatchPlayed = (m: RawTeamMatchInfo): boolean => {
    if (m.estado === 'Finalizado') return true;
    if (m.fecha_hora && new Date(m.fecha_hora).getTime() <= now.getTime()) {
      return m.estado !== 'Aplazado';
    }
    return false;
  };

  // Comprobar si una sanción ocurrida en cardDateStr ya fue cumplida en un partido posterior del equipo
  const isSanctionServed = (cardDateStr?: string): boolean => {
    if (!cardDateStr || sortedTeamMatches.length === 0) return false;
    const cardTime = new Date(cardDateStr).getTime();
    // Buscar los partidos del equipo programados con posterioridad a la fecha del partido de la tarjeta
    const subsequentMatches = sortedTeamMatches.filter(m => new Date(m.fecha_hora!).getTime() > cardTime);
    // Si el equipo ya ha disputado al menos 1 partido posterior, la sanción de 1 partido ya ha sido cumplida
    const firstSubsequent = subsequentMatches[0];
    if (!firstSubsequent) return false;
    return isMatchPlayed(firstSubsequent);
  };

  let isolatedYellows = 0;
  let doubleYellowsCount = 0;
  let directRedsCount = 0;
  let activeSuspension = false;
  let activeSuspensionReason = '';

  sortedCards.forEach((mc) => {
    const yellows = mc.yellowCards || 0;
    const reds = mc.redCards || 0;

    if (yellows >= 2) {
      // Doble amarilla en el mismo partido: Expulsión
      doubleYellowsCount++;
      // Verificar si la sanción ya fue cumplida en un partido posterior
      const served = isSanctionServed(mc.matchDate);
      if (!served) {
        activeSuspension = true;
        activeSuspensionReason = 'Expulsión por doble amarilla en la última jornada';
      }
    } else if (yellows === 1) {
      if (reds > 0) {
        // Tuvo 1 amarilla y además roja directa
        isolatedYellows++;
        directRedsCount++;
        const served = isSanctionServed(mc.matchDate);
        if (!served) {
          activeSuspension = true;
          activeSuspensionReason = 'Tarjeta roja directa en la última jornada';
        }
      } else {
        isolatedYellows++;
      }
    } else if (reds > 0) {
      directRedsCount++;
      const served = isSanctionServed(mc.matchDate);
      if (!served) {
        activeSuspension = true;
        activeSuspensionReason = 'Tarjeta roja directa en la última jornada';
      }
    }
  });

  // Cálculo del ciclo de 5 amarillas
  const currentCycle = isolatedYellows % 5;
  const completedCycles = Math.floor(isolatedYellows / 5);

  let cycleSuspensionActive = false;
  let cycleSuspensionReason = '';

  if (completedCycles > 0 && currentCycle === 0 && isolatedYellows > 0) {
    // Buscar la fecha de la tarjeta que completó el ciclo
    let count = 0;
    let cycleCardDate: string | undefined;
    for (const mc of sortedCards) {
      if (mc.yellowCards === 1) {
        count++;
        if (count === isolatedYellows) {
          cycleCardDate = mc.matchDate;
          break;
        }
      }
    }
    const cycleServed = isSanctionServed(cycleCardDate);
    if (!cycleServed) {
      cycleSuspensionActive = true;
      cycleSuspensionReason = `Cumplimiento de ciclo (${isolatedYellows} tarjetas amarillas acumuladas)`;
    }
  }

  let status: DisciplineStatus = 'OK';
  let statusReason = 'Sin incidencias disciplinarias';
  let isSuspendedNextMatch = false;

  if (activeSuspension) {
    status = 'Sancionado';
    statusReason = activeSuspensionReason;
    isSuspendedNextMatch = true;
  } else if (cycleSuspensionActive) {
    status = 'Sancionado';
    statusReason = cycleSuspensionReason;
    isSuspendedNextMatch = true;
  } else if (currentCycle === 4) {
    status = 'Apercibido';
    statusReason = `Apercibido de sanción (4 amarillas en ciclo actual, ${isolatedYellows} acumuladas)`;
  }

  return {
    playerId,
    playerName,
    playerDorsal,
    teamId,
    teamName,
    teamCategory,
    teamColor,
    yellowCardsTotal: isolatedYellows + (doubleYellowsCount * 2),
    isolatedYellows,
    doubleYellowsCount,
    directRedsCount,
    currentCycleAccumulated: currentCycle,
    status,
    statusReason,
    isSuspendedNextMatch,
  };
}
