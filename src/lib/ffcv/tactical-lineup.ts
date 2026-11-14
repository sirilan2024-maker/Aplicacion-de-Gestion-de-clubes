export interface FormationSlot {
  id: string;
  label: string;
  x: number;
  y: number;
}

export const OFFICIAL_FORMATIONS: Record<string, FormationSlot[]> = {
  '4-3-3': [
    { id: 'slot-0', label: 'POR', x: 50, y: 88 },
    { id: 'slot-1', label: 'LD', x: 15, y: 70 },
    { id: 'slot-2', label: 'DFC', x: 38, y: 75 },
    { id: 'slot-3', label: 'DFC', x: 62, y: 75 },
    { id: 'slot-4', label: 'LI', x: 85, y: 70 },
    { id: 'slot-5', label: 'MCD', x: 50, y: 55 },
    { id: 'slot-6', label: 'MC', x: 30, y: 45 },
    { id: 'slot-7', label: 'MC', x: 70, y: 45 },
    { id: 'slot-8', label: 'ED', x: 20, y: 25 },
    { id: 'slot-9', label: 'DC', x: 50, y: 20 },
    { id: 'slot-10', label: 'EI', x: 80, y: 25 }
  ],
  '4-4-2': [
    { id: 'slot-0', label: 'POR', x: 50, y: 88 },
    { id: 'slot-1', label: 'LD', x: 15, y: 70 },
    { id: 'slot-2', label: 'DFC', x: 38, y: 75 },
    { id: 'slot-3', label: 'DFC', x: 62, y: 75 },
    { id: 'slot-4', label: 'LI', x: 85, y: 70 },
    { id: 'slot-5', label: 'MD', x: 20, y: 45 },
    { id: 'slot-6', label: 'MC', x: 40, y: 48 },
    { id: 'slot-7', label: 'MC', x: 60, y: 48 },
    { id: 'slot-8', label: 'MI', x: 80, y: 45 },
    { id: 'slot-9', label: 'DC', x: 35, y: 22 },
    { id: 'slot-10', label: 'DC', x: 65, y: 22 }
  ],
  '3-5-2': [
    { id: 'slot-0', label: 'POR', x: 50, y: 88 },
    { id: 'slot-1', label: 'DFC', x: 25, y: 75 },
    { id: 'slot-2', label: 'DFC', x: 50, y: 78 },
    { id: 'slot-3', label: 'DFC', x: 75, y: 75 },
    { id: 'slot-4', label: 'CAD', x: 15, y: 50 },
    { id: 'slot-5', label: 'MCD', x: 50, y: 58 },
    { id: 'slot-6', label: 'MC', x: 35, y: 45 },
    { id: 'slot-7', label: 'MC', x: 65, y: 45 },
    { id: 'slot-8', label: 'CAI', x: 85, y: 50 },
    { id: 'slot-9', label: 'DC', x: 35, y: 22 },
    { id: 'slot-10', label: 'DC', x: 65, y: 22 }
  ],
  '4-2-3-1': [
    { id: 'slot-0', label: 'POR', x: 50, y: 88 },
    { id: 'slot-1', label: 'LD', x: 15, y: 70 },
    { id: 'slot-2', label: 'DFC', x: 38, y: 75 },
    { id: 'slot-3', label: 'DFC', x: 62, y: 75 },
    { id: 'slot-4', label: 'LI', x: 85, y: 70 },
    { id: 'slot-5', label: 'MCD', x: 38, y: 58 },
    { id: 'slot-6', label: 'MCD', x: 62, y: 58 },
    { id: 'slot-7', label: 'MD', x: 20, y: 40 },
    { id: 'slot-8', label: 'MCO', x: 50, y: 38 },
    { id: 'slot-9', label: 'MI', x: 80, y: 40 },
    { id: 'slot-10', label: 'DC', x: 50, y: 20 }
  ],
  '3-4-3': [
    { id: 'slot-0', label: 'POR', x: 50, y: 88 },
    { id: 'slot-1', label: 'DFC', x: 25, y: 75 },
    { id: 'slot-2', label: 'DFC', x: 50, y: 78 },
    { id: 'slot-3', label: 'DFC', x: 75, y: 75 },
    { id: 'slot-4', label: 'MD', x: 15, y: 48 },
    { id: 'slot-5', label: 'MC', x: 38, y: 50 },
    { id: 'slot-6', label: 'MC', x: 62, y: 50 },
    { id: 'slot-7', label: 'MI', x: 85, y: 48 },
    { id: 'slot-8', label: 'ED', x: 25, y: 25 },
    { id: 'slot-9', label: 'DC', x: 50, y: 20 },
    { id: 'slot-10', label: 'EI', x: 75, y: 25 }
  ],
  '4-1-4-1': [
    { id: 'slot-0', label: 'POR', x: 50, y: 88 },
    { id: 'slot-1', label: 'LD', x: 15, y: 70 },
    { id: 'slot-2', label: 'DFC', x: 38, y: 73 },
    { id: 'slot-3', label: 'DFC', x: 62, y: 73 },
    { id: 'slot-4', label: 'LI', x: 85, y: 70 },
    { id: 'slot-5', label: 'MCD', x: 50, y: 58 },
    { id: 'slot-6', label: 'MD', x: 20, y: 42 },
    { id: 'slot-7', label: 'MC', x: 40, y: 45 },
    { id: 'slot-8', label: 'MC', x: 60, y: 45 },
    { id: 'slot-9', label: 'MI', x: 80, y: 42 },
    { id: 'slot-10', label: 'DC', x: 50, y: 20 }
  ],
  '5-3-2': [
    { id: 'slot-0', label: 'POR', x: 50, y: 88 },
    { id: 'slot-1', label: 'CAD', x: 10, y: 65 },
    { id: 'slot-2', label: 'DFC', x: 30, y: 73 },
    { id: 'slot-3', label: 'DFC', x: 50, y: 75 },
    { id: 'slot-4', label: 'DFC', x: 70, y: 73 },
    { id: 'slot-5', label: 'CAI', x: 90, y: 65 },
    { id: 'slot-6', label: 'MC', x: 35, y: 48 },
    { id: 'slot-7', label: 'MCD', x: 50, y: 52 },
    { id: 'slot-8', label: 'MC', x: 65, y: 48 },
    { id: 'slot-9', label: 'DC', x: 35, y: 22 },
    { id: 'slot-10', label: 'DC', x: 65, y: 22 }
  ]
};

export interface StarterPositionInput {
  playerId: string;
  dorsal?: number | string | null;
  isGoalkeeper?: boolean;
  ffcvPosAbbr?: string | null;
  ffcvPosName?: string | null;
  bravePosCode?: number | null; // 1=POR, 2=DEF, 3=MED, 4=DEL
  dbPosition?: string | null;
  existingTacticalX?: number | null;
  existingTacticalY?: number | null;
  wasAlreadyTitular?: boolean;
}

type TacticalLine = 'GK' | 'DEF' | 'MID' | 'FWD';

interface ClassifiedStarter {
  input: StarterPositionInput;
  line: TacticalLine;
  preferredLabels: string[];
}

/**
 * Normalizes an FFCV formation string (e.g. "1-4-3-3", "1-5-3-2") or infers one from starters.
 */
export function resolveOfficialFormation(
  rawEsquema?: string | null,
  starters?: StarterPositionInput[]
): string {
  if (rawEsquema && typeof rawEsquema === 'string') {
    const cleaned = rawEsquema.trim().replace(/^1-/, '');
    if (OFFICIAL_FORMATIONS[cleaned]) {
      return cleaned;
    }
    if (cleaned === '5-4-1') return '5-3-2';
    if (cleaned === '4-5-1') return '4-1-4-1';
  }

  if (starters && starters.length >= 8) {
    const classified = starters.map(classifyStarterRole);
    const defs = classified.filter((c) => c.line === 'DEF').length;
    const mids = classified.filter((c) => c.line === 'MID').length;
    const fwds = classified.filter((c) => c.line === 'FWD').length;

    if (defs >= 5) return '5-3-2';
    if (defs === 3 && mids >= 5) return '3-5-2';
    if (defs === 3 && fwds >= 3) return '3-4-3';
    if (defs === 4 && mids === 4 && fwds === 2) return '4-4-2';
  }

  return '4-3-3';
}

function classifyStarterRole(s: StarterPositionInput): ClassifiedStarter {
  const abbr = String(s.ffcvPosAbbr || '').trim().toUpperCase();
  const posName = String(s.ffcvPosName || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const dbPos = String(s.dbPosition || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const dbPosUpper = String(s.dbPosition || '').trim().toUpperCase();
  const dorsalNum = Number(s.dorsal) || 0;

  // 1. Goalkeeper check
  if (
    s.isGoalkeeper ||
    s.bravePosCode === 1 ||
    abbr === 'P' ||
    abbr === 'POR' ||
    abbr === 'PT' ||
    posName.includes('porter') ||
    dbPosUpper === 'POR' ||
    dbPos.includes('porter') ||
    (!s.bravePosCode && !abbr && !posName && (dorsalNum === 1 || dorsalNum === 13 || dorsalNum === 25))
  ) {
    return {
      input: s,
      line: 'GK',
      preferredLabels: ['POR']
    };
  }

  // 2. Specific FFCV / DB abbreviations or position names
  const combinedText = `${posName} ${dbPos}`;
  const code = abbr || dbPosUpper;

  if (code === 'LD' || code === 'CAD' || combinedText.includes('lateral derech') || combinedText.includes('carrilero derech')) {
    return { input: s, line: 'DEF', preferredLabels: ['LD', 'CAD', 'DFC'] };
  }
  if (code === 'LI' || code === 'CAI' || combinedText.includes('lateral izquierd') || combinedText.includes('carrilero izquierd')) {
    return { input: s, line: 'DEF', preferredLabels: ['LI', 'CAI', 'DFC'] };
  }
  if (code === 'DFC' || code === 'CT' || combinedText.includes('central')) {
    return { input: s, line: 'DEF', preferredLabels: ['DFC', 'LD', 'LI', 'CAD', 'CAI'] };
  }
  if (code === 'MCD' || code === 'PIV' || combinedText.includes('pivote') || combinedText.includes('defensivo')) {
    return { input: s, line: 'MID', preferredLabels: ['MCD', 'MC', 'MCO'] };
  }
  if (code === 'MCO' || code === 'MP' || combinedText.includes('mediapunta') || combinedText.includes('media punta')) {
    return { input: s, line: 'MID', preferredLabels: ['MCO', 'MC', 'MD', 'MI', 'ED', 'EI'] };
  }
  if (code === 'MD' || combinedText.includes('interior derech') || combinedText.includes('medio derech') || combinedText.includes('banda derech')) {
    return { input: s, line: 'MID', preferredLabels: ['MD', 'CAD', 'ED', 'MC'] };
  }
  if (code === 'MI' || combinedText.includes('interior izquierd') || combinedText.includes('medio izquierd') || combinedText.includes('banda izquierd')) {
    return { input: s, line: 'MID', preferredLabels: ['MI', 'CAI', 'EI', 'MC'] };
  }
  if (code === 'ED' || combinedText.includes('extremo derech')) {
    return { input: s, line: 'FWD', preferredLabels: ['ED', 'MD', 'DC', 'EI'] };
  }
  if (code === 'EI' || combinedText.includes('extremo izquierd')) {
    return { input: s, line: 'FWD', preferredLabels: ['EI', 'MI', 'DC', 'ED'] };
  }
  if (code === 'DC' || code === 'DEL' || code === 'SD' || combinedText.includes('delanter') || combinedText.includes('punta') || combinedText.includes('atacante')) {
    if (dorsalNum === 7) return { input: s, line: 'FWD', preferredLabels: ['ED', 'DC', 'EI'] };
    if (dorsalNum === 11) return { input: s, line: 'FWD', preferredLabels: ['EI', 'DC', 'ED'] };
    return { input: s, line: 'FWD', preferredLabels: ['DC', 'ED', 'EI', 'MCO'] };
  }

  // 3. Generic line classification (from Liga Brave Posicion 2/3/4 or generic FFCV/DB "Defensa", "Mediocentro")
  if (s.bravePosCode === 2 || combinedText.includes('defens') || combinedText.includes('zaguero')) {
    if (dorsalNum === 2) return { input: s, line: 'DEF', preferredLabels: ['LD', 'CAD', 'DFC'] };
    if (dorsalNum === 3) return { input: s, line: 'DEF', preferredLabels: ['LI', 'CAI', 'DFC'] };
    return { input: s, line: 'DEF', preferredLabels: ['DFC', 'LD', 'LI', 'CAD', 'CAI'] };
  }

  if (s.bravePosCode === 3 || code === 'MC' || code === 'MED' || combinedText.includes('medio') || combinedText.includes('centrocamp')) {
    if (dorsalNum === 6 || dorsalNum === 5) return { input: s, line: 'MID', preferredLabels: ['MCD', 'MC', 'MCO'] };
    if (dorsalNum === 10) return { input: s, line: 'MID', preferredLabels: ['MCO', 'MC', 'MD', 'MI'] };
    if (dorsalNum === 7) return { input: s, line: 'MID', preferredLabels: ['MD', 'MC', 'ED'] };
    if (dorsalNum === 11) return { input: s, line: 'MID', preferredLabels: ['MI', 'MC', 'EI'] };
    return { input: s, line: 'MID', preferredLabels: ['MC', 'MCD', 'MCO', 'MD', 'MI'] };
  }

  if (s.bravePosCode === 4) {
    if (dorsalNum === 7) return { input: s, line: 'FWD', preferredLabels: ['ED', 'DC', 'EI'] };
    if (dorsalNum === 11) return { input: s, line: 'FWD', preferredLabels: ['EI', 'DC', 'ED'] };
    return { input: s, line: 'FWD', preferredLabels: ['DC', 'ED', 'EI'] };
  }

  // 4. Fallback by dorsal when position is unspecified
  if (dorsalNum === 2) return { input: s, line: 'DEF', preferredLabels: ['LD', 'CAD', 'DFC'] };
  if (dorsalNum === 3) return { input: s, line: 'DEF', preferredLabels: ['LI', 'CAI', 'DFC'] };
  if (dorsalNum === 4 || dorsalNum === 5) return { input: s, line: 'DEF', preferredLabels: ['DFC', 'LD', 'LI'] };
  if (dorsalNum === 6) return { input: s, line: 'MID', preferredLabels: ['MCD', 'MC'] };
  if (dorsalNum === 8 || dorsalNum === 10) return { input: s, line: 'MID', preferredLabels: ['MC', 'MCO', 'MCD'] };
  if (dorsalNum === 7) return { input: s, line: 'FWD', preferredLabels: ['ED', 'MD', 'DC'] };
  if (dorsalNum === 9) return { input: s, line: 'FWD', preferredLabels: ['DC', 'ED', 'EI'] };
  if (dorsalNum === 11) return { input: s, line: 'FWD', preferredLabels: ['EI', 'MI', 'DC'] };

  return { input: s, line: 'MID', preferredLabels: ['MC', 'DFC', 'DC', 'LD', 'LI', 'ED', 'EI'] };
}

function slotMatchesLine(slot: FormationSlot, line: TacticalLine): boolean {
  if (line === 'GK') return slot.label === 'POR';
  if (line === 'DEF') return ['LD', 'DFC', 'LI', 'CAD', 'CAI'].includes(slot.label);
  if (line === 'MID') return ['MCD', 'MC', 'MCO', 'MD', 'MI', 'CAD', 'CAI'].includes(slot.label);
  if (line === 'FWD') return ['ED', 'DC', 'EI', 'MCO', 'MD', 'MI'].includes(slot.label);
  return true;
}

/**
 * Computes tactical_x and tactical_y coordinates for all starters on the pitch.
 * - Preserves existing coordinates if a starter was already placed on the pitch by the coach.
 * - Assigns remaining starters to the best matching slots of the official formation.
 */
export function assignTacticalCoordinatesForStarters(
  starters: StarterPositionInput[],
  rawEsquema?: string | null
): {
  formation: string;
  coordinatesByPlayerId: Map<string, { x: number; y: number; slotLabel: string }>;
} {
  const formation = resolveOfficialFormation(rawEsquema, starters);
  const slots = OFFICIAL_FORMATIONS[formation] || OFFICIAL_FORMATIONS['4-3-3'];
  const occupiedSlotIds = new Set<string>();
  const coordinatesByPlayerId = new Map<string, { x: number; y: number; slotLabel: string }>();

  const remainingStarters: ClassifiedStarter[] = [];

  // 1. Respect existing manual coach placement for players who were already starters
  for (const s of starters) {
    const cs = classifyStarterRole(s);
    const hasValidCoords =
      s.wasAlreadyTitular &&
      typeof s.existingTacticalX === 'number' &&
      typeof s.existingTacticalY === 'number' &&
      !Number.isNaN(s.existingTacticalX) &&
      !Number.isNaN(s.existingTacticalY);

    // Ensure a goalkeeper is never stuck in an outfield slot and an outfielder is never stuck in the POR slot (y >= 82)
    const isRoleConsistentWithY =
      hasValidCoords &&
      (cs.line === 'GK' ? (s.existingTacticalY as number) >= 80 : (s.existingTacticalY as number) < 82);

    if (hasValidCoords && isRoleConsistentWithY) {
      let closestSlot: FormationSlot | null = null;
      let minDist = Infinity;
      for (const slot of slots) {
        if (occupiedSlotIds.has(slot.id)) continue;
        if (cs.line !== 'GK' && slot.label === 'POR') continue;
        const dist = Math.hypot((s.existingTacticalX as number) - slot.x, (s.existingTacticalY as number) - slot.y);
        if (dist < minDist) {
          minDist = dist;
          closestSlot = slot;
        }
      }
      if (closestSlot && minDist <= 18) {
        occupiedSlotIds.add(closestSlot.id);
        coordinatesByPlayerId.set(s.playerId, {
          x: s.existingTacticalX as number,
          y: s.existingTacticalY as number,
          slotLabel: closestSlot.label
        });
        continue;
      }
    }
    remainingStarters.push(cs);
  }

  // 2. Pass 1: Goalkeepers to POR
  const unassignedAfterGk: ClassifiedStarter[] = [];
  for (const cs of remainingStarters) {
    if (cs.line === 'GK') {
      const porSlot = slots.find((sl) => !occupiedSlotIds.has(sl.id) && sl.label === 'POR');
      if (porSlot) {
        occupiedSlotIds.add(porSlot.id);
        coordinatesByPlayerId.set(cs.input.playerId, {
          x: porSlot.x,
          y: porSlot.y,
          slotLabel: porSlot.label
        });
        continue;
      }
    }
    unassignedAfterGk.push(cs);
  }

  // 3. Pass 2: Primary preferred label match (e.g. LD -> LD, DFC -> DFC, LI -> LI, MCD -> MCD, ED -> ED, DC -> DC, EI -> EI)
  const unassignedAfterPrimary: ClassifiedStarter[] = [];
  for (const cs of unassignedAfterGk) {
    const primaryLabel = cs.preferredLabels[0];
    const matchedSlot = slots.find((sl) => !occupiedSlotIds.has(sl.id) && sl.label === primaryLabel);
    if (matchedSlot) {
      occupiedSlotIds.add(matchedSlot.id);
      coordinatesByPlayerId.set(cs.input.playerId, {
        x: matchedSlot.x,
        y: matchedSlot.y,
        slotLabel: matchedSlot.label
      });
    } else {
      unassignedAfterPrimary.push(cs);
    }
  }

  // 4. Pass 3: Secondary preferred labels or same tactical line
  const unassignedAfterSecondary: ClassifiedStarter[] = [];
  for (const cs of unassignedAfterPrimary) {
    let matchedSlot: FormationSlot | undefined;
    for (const prefLabel of cs.preferredLabels) {
      matchedSlot = slots.find((sl) => !occupiedSlotIds.has(sl.id) && sl.label === prefLabel);
      if (matchedSlot) break;
    }
    if (!matchedSlot) {
      matchedSlot = slots.find((sl) => !occupiedSlotIds.has(sl.id) && slotMatchesLine(sl, cs.line));
    }
    if (matchedSlot) {
      occupiedSlotIds.add(matchedSlot.id);
      coordinatesByPlayerId.set(cs.input.playerId, {
        x: matchedSlot.x,
        y: matchedSlot.y,
        slotLabel: matchedSlot.label
      });
    } else {
      unassignedAfterSecondary.push(cs);
    }
  }

  // 5. Pass 4: Assign any remaining starters to remaining free slots (prefer non-POR slots for outfielders)
  for (const cs of unassignedAfterSecondary) {
    const freeSlot =
      (cs.line !== 'GK' ? slots.find((sl) => !occupiedSlotIds.has(sl.id) && sl.label !== 'POR') : undefined) ||
      slots.find((sl) => !occupiedSlotIds.has(sl.id)) || {
        id: 'fallback',
        label: 'JUG',
        x: 50,
        y: 50
      };
    occupiedSlotIds.add(freeSlot.id);
    coordinatesByPlayerId.set(cs.input.playerId, {
      x: freeSlot.x,
      y: freeSlot.y,
      slotLabel: freeSlot.label
    });
  }

  return {
    formation,
    coordinatesByPlayerId
  };
}
