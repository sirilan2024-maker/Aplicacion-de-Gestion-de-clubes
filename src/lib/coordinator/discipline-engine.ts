import { PlayerDisciplineRecord, DisciplineStatus } from '@/types/coordinator';

export interface RawPlayerMatchCard {
  partidoId: string;
  matchDate?: string;
  jornada?: number;
  yellowCards: number;
  redCards: number;
  isLatestMatch?: boolean;
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
}

/**
 * Motor de Disciplina Oficial FFCV:
 * 1. Ciclo de acumulación: 5 tarjetas amarillas aisladas = 1 partido de sanción.
 * 2. Apercibido: Jugador con 4 amarillas (o múltiplos: 9, 14...).
 * 3. Doble amarilla en un mismo partido: Expulsión / 1 partido de sanción en el siguiente partido.
 *    REGLA FFCV ESTRICTA: Esas 2 amarillas NO computan para la acumulación del ciclo de 5 amarillas.
 * 4. Tarjeta roja directa: 1 partido de sanción en el siguiente partido.
 */
export function calculatePlayerFfcvDiscipline(params: CalculateDisciplineParams): PlayerDisciplineRecord {
  const { playerId, playerName, playerDorsal, teamId, teamName, teamCategory, teamColor, matchCards } = params;

  // Ordenar por fecha cronológica ascendente
  const sortedCards = [...matchCards].sort((a, b) => {
    const da = a.matchDate ? new Date(a.matchDate).getTime() : 0;
    const db = b.matchDate ? new Date(b.matchDate).getTime() : 0;
    return da - db;
  });

  let isolatedYellows = 0;
  let doubleYellowsCount = 0;
  let directRedsCount = 0;
  let lastMatchSuspended = false;
  let lastSuspensionReason = '';

  const totalMatches = sortedCards.length;

  sortedCards.forEach((mc, index) => {
    const isLastMatch = index === totalMatches - 1;
    const yellows = mc.yellowCards || 0;
    const reds = mc.redCards || 0;

    if (yellows >= 2) {
      // Doble amarilla en el mismo partido: Expulsión
      doubleYellowsCount++;
      // No suman al ciclo acumulativo de 5
      if (isLastMatch) {
        lastMatchSuspended = true;
        lastSuspensionReason = 'Expulsión por doble amarilla en la última jornada';
      }
    } else if (yellows === 1) {
      if (reds > 0) {
        // Tuvo 1 amarilla y además roja directa
        isolatedYellows++;
        directRedsCount++;
        if (isLastMatch) {
          lastMatchSuspended = true;
          lastSuspensionReason = 'Tarjeta roja directa en la última jornada';
        }
      } else {
        isolatedYellows++;
      }
    } else if (reds > 0) {
      directRedsCount++;
      if (isLastMatch) {
        lastMatchSuspended = true;
        lastSuspensionReason = 'Tarjeta roja directa en la última jornada';
      }
    }
  });

  // Cálculo del ciclo de 5 amarillas
  const currentCycle = isolatedYellows % 5;
  const completedCycles = Math.floor(isolatedYellows / 5);

  let status: DisciplineStatus = 'OK';
  let statusReason = 'Sin incidencias disciplinarias';
  let isSuspendedNextMatch = false;

  if (lastMatchSuspended) {
    status = 'Sancionado';
    statusReason = lastSuspensionReason;
    isSuspendedNextMatch = true;
  } else if (completedCycles > 0 && currentCycle === 0 && isolatedYellows > 0) {
    // Cumplió ciclo exactamente en la última tarjeta amarilla registrada
    status = 'Sancionado';
    statusReason = `Cumplimiento de ciclo (${isolatedYellows} tarjetas amarillas acumuladas)`;
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
