/**
 * Motor Oficial de Reglas Disciplinarias y Ciclos de Tarjetas (FFCV / RFEF)
 *
 * Reglas normativas implementadas:
 * 1. 1 amarilla (sin segunda amarilla): se acumula (+1) al ciclo de 5 amarillas por jugador.
 * 2. 2 amarillas en el mismo partido (doble amarilla): conlleva 1 partido de suspensión
 *    para el jugador y NO suman para el ciclo de 5 amarillas (+0 al ciclo).
 * 3. 1 amarilla y 1 roja directa en el mismo partido: la amarilla SÍ suma (+1) para el
 *    ciclo de 5 amarillas y la roja conlleva partido de suspensión (y si esa amarilla
 *    es la 5ª del ciclo, también completa el ciclo de 5 amarillas).
 * 4. 5 amarillas acumuladas (1 ciclo): conlleva 1 partido de suspensión y reinicia el ciclo a 0/5.
 * 5. 1 roja directa: conlleva partido de suspensión.
 */

export interface MatchCardInput {
  matchId?: string;
  partido_id?: string;
  date?: string;
  fecha_hora?: string;
  yellow?: number;
  yellows?: number;
  yellow_cards?: number;
  tarjetas_amarillas?: number;
  red?: number;
  reds?: number;
  red_cards?: number;
  tarjetas_rojas?: number;
  match?: {
    id?: string;
    fecha_hora?: string;
    [key: string]: any;
  };
}

export interface MatchCardClassification {
  yellows: number;
  reds: number;
  /** Amarillas de este partido que computan para el ciclo de 5 amarillas (0 o 1) */
  cycleYellowsAdded: number;
  /** Si el jugador vio 2 amarillas en el mismo partido (doble amarilla) */
  isDoubleYellow: boolean;
  /** Si el jugador vio 1 amarilla (que suma al ciclo) y además 1 roja directa en el mismo partido */
  isYellowPlusDirectRed: boolean;
  /** Si el jugador vio roja directa sin amarilla */
  isDirectRedOnly: boolean;
  /** Si completó ciclo de 5 amarillas en este partido */
  completedCycleInThisMatch: boolean;
  /** Partidos de suspensión generados en este encuentro */
  suspensionMatchesGenerated: number;
  /** Etiqueta descriptiva de la incidencia disciplinaria en este partido */
  badgeLabel: string | null;
}

export interface PlayerDisciplineSummary {
  /** Total de tarjetas amarillas mostradas en actas */
  totalYellow: number;
  /** Total de tarjetas rojas (directas o por doble amarilla) en actas */
  totalRed: number;
  /** Total de amarillas que han computado en ciclos de 5 (excluyendo dobles amarillas) */
  totalCycleYellows: number;
  /** Tarjetas amarillas en el ciclo actual (0 a 4) */
  cycleCards: number;
  /** Ciclos de 5 amarillas completados en la temporada */
  cyclesCompleted: number;
  /** Sanciones por expulsión (doble amarilla o roja directa) */
  redSanctions: number;
  /** Desglose: sanciones por doble amarilla */
  doubleYellowSanctions: number;
  /** Desglose: sanciones por roja directa */
  directRedSanctions: number;
  /** Total de sanciones acumuladas en la temporada (ciclos + expulsiones) */
  totalSanctions: number;
  /** Si el jugador tiene sanción activa pendiente de cumplir para el próximo partido */
  pendingSanction: boolean;
  /** Motivo de la sanción pendiente para el próximo partido */
  pendingReason: string;
  /** Número de partidos de suspensión pendientes derivados del último encuentro */
  pendingSuspensionMatches: number;
  /** Si el jugador está apercibido de sanción (4 amarillas en el ciclo actual) */
  isApercibido: boolean;
}

/**
 * Determina si un registro de tarjeta crudo de la API FFCV (Novanet) es tarjeta roja
 * (ya sea roja directa código "101" / "200" / "2" o expulsión por segunda amarilla).
 */
export function isFfcvRawCardRed(card: any): boolean {
  if (!card) return false;
  const code = String(card.codigo_tipo_amonestacion ?? '').trim();
  const secondYellow = String(card.segunda_amarilla ?? '').trim() === '1';
  const tipo = String(card.tipo_tarjeta ?? card.tarjeta ?? '').toLowerCase().trim();
  return (
    code === '101' ||
    code === '102' ||
    code === '200' ||
    code === '201' ||
    code === '2' ||
    secondYellow ||
    tipo === 'roja' ||
    tipo.includes('roja')
  );
}

/**
 * Clasifica las tarjetas de un único partido según la normativa FFCV.
 */
export function classifyMatchCards(
  yellowsRaw: number,
  redsRaw: number,
  completedCycleInThisMatch = false
): MatchCardClassification {
  const yellows = Math.max(0, Number(yellowsRaw) || 0);
  const reds = Math.max(0, Number(redsRaw) || 0);

  // Regla 2: 2 amarillas en el mismo partido = 1 partido de suspensión y NO suman al ciclo de 5
  if (yellows >= 2) {
    return {
      yellows,
      reds: Math.max(1, reds),
      cycleYellowsAdded: 0,
      isDoubleYellow: true,
      isYellowPlusDirectRed: false,
      isDirectRedOnly: false,
      completedCycleInThisMatch: false,
      suspensionMatchesGenerated: 1,
      badgeLabel: 'Doble Amarilla (No suma al ciclo) • 1 partido de suspensión',
    };
  }

  // Regla 3: 1 amarilla y 1 roja directa en el mismo partido:
  // La amarilla SÍ suma al ciclo de 5 y la roja conlleva partido de suspensión
  if (yellows === 1 && reds >= 1) {
    const susp = reds + (completedCycleInThisMatch ? 1 : 0);
    return {
      yellows: 1,
      reds,
      cycleYellowsAdded: 1,
      isDoubleYellow: false,
      isYellowPlusDirectRed: true,
      isDirectRedOnly: false,
      completedCycleInThisMatch,
      suspensionMatchesGenerated: susp,
      badgeLabel: completedCycleInThisMatch
        ? '1 Amarilla (5ª del ciclo) + Roja Directa • 2 partidos de suspensión'
        : '1 Amarilla (suma al ciclo) + Roja Directa • 1 partido de suspensión',
    };
  }

  // Regla 5: 1 roja directa (sin amarilla)
  if (yellows === 0 && reds >= 1) {
    return {
      yellows: 0,
      reds,
      cycleYellowsAdded: 0,
      isDoubleYellow: false,
      isYellowPlusDirectRed: false,
      isDirectRedOnly: true,
      completedCycleInThisMatch: false,
      suspensionMatchesGenerated: reds,
      badgeLabel: 'Roja Directa • 1 partido de suspensión',
    };
  }

  // Regla 1 y Regla 4: 1 amarilla (suma al ciclo de 5 amarillas)
  if (yellows === 1 && reds === 0) {
    return {
      yellows: 1,
      reds: 0,
      cycleYellowsAdded: 1,
      isDoubleYellow: false,
      isYellowPlusDirectRed: false,
      isDirectRedOnly: false,
      completedCycleInThisMatch,
      suspensionMatchesGenerated: completedCycleInThisMatch ? 1 : 0,
      badgeLabel: completedCycleInThisMatch
        ? '5ª Amarilla (Ciclo completado) • 1 partido de suspensión'
        : null,
    };
  }

  return {
    yellows: 0,
    reds: 0,
    cycleYellowsAdded: 0,
    isDoubleYellow: false,
    isYellowPlusDirectRed: false,
    isDirectRedOnly: false,
    completedCycleInThisMatch: false,
    suspensionMatchesGenerated: 0,
    badgeLabel: null,
  };
}

/**
 * Calcula el estado disciplinario completo de un jugador a partir de sus partidos con tarjetas.
 * Ordena cronológicamente los eventos y aplica estrictamente las 5 reglas FFCV.
 */
export function evaluatePlayerDiscipline(
  events: MatchCardInput[],
  optionsOrLastMatchId?: string | null | { lastFinishedMatchId?: string | null; teamMatches?: any[] }
): PlayerDisciplineSummary {
  const lastFinishedMatchId =
    typeof optionsOrLastMatchId === 'object' && optionsOrLastMatchId !== null
      ? optionsOrLastMatchId.lastFinishedMatchId
      : optionsOrLastMatchId;
  const getEventDateMs = (e: MatchCardInput): number => {
    const d = e.fecha_hora || e.date || e.match?.fecha_hora;
    if (!d) return 0;
    const ms = new Date(d).getTime();
    return isNaN(ms) ? 0 : ms;
  };

  const getEventMatchId = (e: MatchCardInput): string => {
    return String(e.partido_id || e.matchId || e.match?.id || '');
  };

  const sorted = [...(events || [])].sort((a, b) => getEventDateMs(a) - getEventDateMs(b));

  let totalYellow = 0;
  let totalRed = 0;
  let totalCycleYellows = 0;
  let cycleCards = 0;
  let cyclesCompleted = 0;
  let doubleYellowSanctions = 0;
  let directRedSanctions = 0;
  let pendingSanction = false;
  let pendingReason = '';
  let pendingSuspensionMatches = 0;

  for (const evt of sorted) {
    const y = Math.max(
      0,
      Number(evt.yellow ?? evt.yellows ?? evt.yellow_cards ?? evt.tarjetas_amarillas ?? 0)
    );
    const r = Math.max(
      0,
      Number(evt.red ?? evt.reds ?? evt.red_cards ?? evt.tarjetas_rojas ?? 0)
    );

    if (y === 0 && r === 0) continue;

    totalYellow += y;
    totalRed += r;

    const evtMatchId = getEventMatchId(evt);
    const isLastFinished = Boolean(
      lastFinishedMatchId && evtMatchId && evtMatchId === String(lastFinishedMatchId)
    );

    if (y >= 2) {
      // REGLA 2: 2 amarillas en el mismo partido -> 1 partido de suspensión y NO suman al ciclo de 5
      doubleYellowSanctions += 1;
      if (isLastFinished) {
        pendingSanction = true;
        pendingSuspensionMatches = 1;
        pendingReason = 'Doble amarilla (1 partido)';
      }
    } else if (y === 1 && r >= 1) {
      // REGLA 3: 1 amarilla + 1 roja directa en el mismo partido ->
      // La amarilla SÍ suma al ciclo de 5 y la roja conlleva partido de suspensión
      totalCycleYellows += 1;
      cycleCards += 1;
      let completedCycleNow = false;
      if (cycleCards === 5) {
        cyclesCompleted += 1;
        cycleCards = 0;
        completedCycleNow = true;
      }

      directRedSanctions += r;

      if (isLastFinished) {
        pendingSanction = true;
        if (completedCycleNow) {
          pendingSuspensionMatches = r + 1;
          pendingReason = 'Roja directa + Ciclo de 5 amarillas (2 partidos)';
        } else {
          pendingSuspensionMatches = r;
          pendingReason = 'Roja directa (1 partido) + 1 amarilla al ciclo';
        }
      }
    } else if (y === 0 && r >= 1) {
      // REGLA 5: 1 roja directa (sin amarilla) -> 1 partido de suspensión
      directRedSanctions += r;
      if (isLastFinished) {
        pendingSanction = true;
        pendingSuspensionMatches = r;
        pendingReason = 'Roja directa (1 partido)';
      }
    } else if (y === 1 && r === 0) {
      // REGLA 1 y REGLA 4: 1 amarilla -> suma al ciclo de 5 amarillas; al llegar a 5 -> 1 partido de suspensión
      totalCycleYellows += 1;
      cycleCards += 1;
      if (cycleCards === 5) {
        cyclesCompleted += 1;
        cycleCards = 0;
        if (isLastFinished) {
          pendingSanction = true;
          pendingSuspensionMatches = 1;
          pendingReason = 'Ciclo de 5 amarillas (1 partido)';
        }
      }
    }
  }

  const redSanctions = doubleYellowSanctions + directRedSanctions;
  const totalSanctions = cyclesCompleted + redSanctions;

  return {
    totalYellow,
    totalRed,
    totalCycleYellows,
    cycleCards,
    cyclesCompleted,
    redSanctions,
    doubleYellowSanctions,
    directRedSanctions,
    totalSanctions,
    pendingSanction,
    pendingReason,
    pendingSuspensionMatches,
    isApercibido: cycleCards === 4,
  };
}
