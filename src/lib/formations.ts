// ─── Formation Dictionary ─────────────────────────────────────────────────────
// Each slot: { id, label, posX (% from left), posY (% from top) }
// The field renders top-to-bottom: GK at bottom (~88), FWD at top (~12)
// posX 50 = center

export interface FormationSlot {
  id: string        // unique within formation, used as slot key
  label: string     // short position label shown on pitch
  posX: number      // 0-100 % from left
  posY: number      // 0-100 % from top (GK ~88, FWD ~12)
}

export type FormationKey =
  | "4-4-2"
  | "4-3-3"
  | "3-5-2"
  | "4-2-3-1"
  | "5-3-2"
  | "4-1-4-1"
  | "3-4-3"
  | "5-4-1"
  | "4-3-2-1"
  | "3-4-2-1"

export const FORMATIONS: Record<FormationKey, FormationSlot[]> = {
  // ──────────────────────────────────────────────────────────────────────
  "4-4-2": [
    { id: "GK",  label: "POR", posX: 50, posY: 88 },
    { id: "RB",  label: "LD",  posX: 80, posY: 70 },
    { id: "CB1", label: "DC",  posX: 62, posY: 72 },
    { id: "CB2", label: "DC",  posX: 38, posY: 72 },
    { id: "LB",  label: "LI",  posX: 20, posY: 70 },
    { id: "RM",  label: "MD",  posX: 80, posY: 50 },
    { id: "CM1", label: "MC",  posX: 62, posY: 50 },
    { id: "CM2", label: "MC",  posX: 38, posY: 50 },
    { id: "LM",  label: "MI",  posX: 20, posY: 50 },
    { id: "ST1", label: "DC",  posX: 63, posY: 22 },
    { id: "ST2", label: "DC",  posX: 37, posY: 22 },
  ],

  // ──────────────────────────────────────────────────────────────────────
  "4-3-3": [
    { id: "GK",  label: "POR", posX: 50, posY: 88 },
    { id: "RB",  label: "LD",  posX: 80, posY: 70 },
    { id: "CB1", label: "DC",  posX: 62, posY: 72 },
    { id: "CB2", label: "DC",  posX: 38, posY: 72 },
    { id: "LB",  label: "LI",  posX: 20, posY: 70 },
    { id: "CDM", label: "MCD", posX: 50, posY: 53 },
    { id: "CM1", label: "MC",  posX: 70, posY: 44 },
    { id: "CM2", label: "MC",  posX: 30, posY: 44 },
    { id: "RW",  label: "ED",  posX: 75, posY: 20 },
    { id: "ST",  label: "DC",  posX: 50, posY: 14 },
    { id: "LW",  label: "EI",  posX: 25, posY: 20 },
  ],

  // ──────────────────────────────────────────────────────────────────────
  "3-5-2": [
    { id: "GK",  label: "POR", posX: 50, posY: 88 },
    { id: "CB1", label: "DC",  posX: 70, posY: 72 },
    { id: "CB2", label: "DC",  posX: 50, posY: 74 },
    { id: "CB3", label: "DC",  posX: 30, posY: 72 },
    { id: "RM",  label: "MLD", posX: 85, posY: 52 },
    { id: "CM1", label: "MC",  posX: 67, posY: 46 },
    { id: "CDM", label: "MCD", posX: 50, posY: 50 },
    { id: "CM2", label: "MC",  posX: 33, posY: 46 },
    { id: "LM",  label: "MLI", posX: 15, posY: 52 },
    { id: "ST1", label: "DC",  posX: 63, posY: 20 },
    { id: "ST2", label: "DC",  posX: 37, posY: 20 },
  ],

  // ──────────────────────────────────────────────────────────────────────
  "4-2-3-1": [
    { id: "GK",  label: "POR", posX: 50, posY: 88 },
    { id: "RB",  label: "LD",  posX: 80, posY: 70 },
    { id: "CB1", label: "DC",  posX: 62, posY: 72 },
    { id: "CB2", label: "DC",  posX: 38, posY: 72 },
    { id: "LB",  label: "LI",  posX: 20, posY: 70 },
    { id: "DM1", label: "MCD", posX: 62, posY: 56 },
    { id: "DM2", label: "MCD", posX: 38, posY: 56 },
    { id: "RAM", label: "MP",  posX: 75, posY: 36 },
    { id: "CAM", label: "MC",  posX: 50, posY: 34 },
    { id: "LAM", label: "MP",  posX: 25, posY: 36 },
    { id: "ST",  label: "DC",  posX: 50, posY: 16 },
  ],

  // ──────────────────────────────────────────────────────────────────────
  "5-3-2": [
    { id: "GK",  label: "POR", posX: 50, posY: 88 },
    { id: "RWB", label: "CAD", posX: 85, posY: 68 },
    { id: "CB1", label: "DC",  posX: 68, posY: 72 },
    { id: "CB2", label: "DC",  posX: 50, posY: 74 },
    { id: "CB3", label: "DC",  posX: 32, posY: 72 },
    { id: "LWB", label: "CAI", posX: 15, posY: 68 },
    { id: "CM1", label: "MC",  posX: 70, posY: 48 },
    { id: "CDM", label: "MCD", posX: 50, posY: 50 },
    { id: "CM2", label: "MC",  posX: 30, posY: 48 },
    { id: "ST1", label: "DC",  posX: 65, posY: 20 },
    { id: "ST2", label: "DC",  posX: 35, posY: 20 },
  ],

  // ──────────────────────────────────────────────────────────────────────
  "4-1-4-1": [
    { id: "GK",  label: "POR", posX: 50, posY: 88 },
    { id: "RB",  label: "LD",  posX: 80, posY: 70 },
    { id: "CB1", label: "DC",  posX: 62, posY: 72 },
    { id: "CB2", label: "DC",  posX: 38, posY: 72 },
    { id: "LB",  label: "LI",  posX: 20, posY: 70 },
    { id: "DM",  label: "MCD", posX: 50, posY: 57 },   // single pivot
    { id: "RM",  label: "MD",  posX: 82, posY: 44 },
    { id: "CM1", label: "MC",  posX: 62, posY: 44 },
    { id: "CM2", label: "MC",  posX: 38, posY: 44 },
    { id: "LM",  label: "MI",  posX: 18, posY: 44 },
    { id: "ST",  label: "DC",  posX: 50, posY: 16 },
  ],

  // ──────────────────────────────────────────────────────────────────────
  "3-4-3": [
    { id: "GK",  label: "POR", posX: 50, posY: 88 },
    { id: "CB1", label: "DC",  posX: 68, posY: 72 },
    { id: "CB2", label: "DC",  posX: 50, posY: 74 },
    { id: "CB3", label: "DC",  posX: 32, posY: 72 },
    { id: "RM",  label: "MLD", posX: 82, posY: 52 },
    { id: "CM1", label: "MC",  posX: 62, posY: 50 },
    { id: "CM2", label: "MC",  posX: 38, posY: 50 },
    { id: "LM",  label: "MLI", posX: 18, posY: 52 },
    { id: "RW",  label: "ED",  posX: 75, posY: 18 },
    { id: "ST",  label: "DC",  posX: 50, posY: 13 },
    { id: "LW",  label: "EI",  posX: 25, posY: 18 },
  ],

  // ──────────────────────────────────────────────────────────────────────
  "5-4-1": [
    { id: "GK",  label: "POR", posX: 50, posY: 88 },
    { id: "RWB", label: "CAD", posX: 85, posY: 68 },
    { id: "CB1", label: "DC",  posX: 68, posY: 72 },
    { id: "CB2", label: "DC",  posX: 50, posY: 74 },
    { id: "CB3", label: "DC",  posX: 32, posY: 72 },
    { id: "LWB", label: "CAI", posX: 15, posY: 68 },
    { id: "RM",  label: "MD",  posX: 80, posY: 48 },
    { id: "CM1", label: "MC",  posX: 60, posY: 48 },
    { id: "CM2", label: "MC",  posX: 40, posY: 48 },
    { id: "LM",  label: "MI",  posX: 20, posY: 48 },
    { id: "ST",  label: "DC",  posX: 50, posY: 16 },
  ],

  // ──────────────────────────────────────────────────────────────────────
  "4-3-2-1": [
    { id: "GK",  label: "POR", posX: 50, posY: 88 },
    { id: "RB",  label: "LD",  posX: 80, posY: 70 },
    { id: "CB1", label: "DC",  posX: 62, posY: 72 },
    { id: "CB2", label: "DC",  posX: 38, posY: 72 },
    { id: "LB",  label: "LI",  posX: 20, posY: 70 },
    { id: "CM1", label: "MC",  posX: 68, posY: 54 },
    { id: "CDM", label: "MCD", posX: 50, posY: 56 },
    { id: "CM2", label: "MC",  posX: 32, posY: 54 },
    { id: "RAM", label: "SS",  posX: 65, posY: 36 },   // mezzala/trequartista
    { id: "LAM", label: "SS",  posX: 35, posY: 36 },
    { id: "ST",  label: "DC",  posX: 50, posY: 16 },
  ],

  // ──────────────────────────────────────────────────────────────────────
  "3-4-2-1": [
    { id: "GK",  label: "POR", posX: 50, posY: 88 },
    { id: "CB1", label: "DC",  posX: 68, posY: 72 },
    { id: "CB2", label: "DC",  posX: 50, posY: 74 },
    { id: "CB3", label: "DC",  posX: 32, posY: 72 },
    { id: "RM",  label: "MLD", posX: 82, posY: 54 },
    { id: "CM1", label: "MC",  posX: 62, posY: 52 },
    { id: "CM2", label: "MC",  posX: 38, posY: 52 },
    { id: "LM",  label: "MLI", posX: 18, posY: 54 },
    { id: "SS1", label: "SS",  posX: 65, posY: 33 },
    { id: "SS2", label: "SS",  posX: 35, posY: 33 },
    { id: "ST",  label: "DC",  posX: 50, posY: 15 },
  ],
}

export const FORMATION_KEYS = Object.keys(FORMATIONS) as FormationKey[]
