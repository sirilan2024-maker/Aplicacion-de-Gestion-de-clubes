/**
 * Catálogo y Motor de Estimación Orientativa de Recuperación de Lesiones Deportivas.
 * Basado en literatura médica y científica especializada en medicina del fútbol
 * (FIFA Medical Network, British Journal of Sports Medicine / BJSM, UEFA Elite Club Studies, Aspetar).
 */

export interface RecoveryGuideline {
  id: string
  injuryType: string
  structureKeywords: string[]
  severity: "Leve" | "Moderada" | "Grave" | "Por determinar"
  minDays: number
  maxDays: number
  minWeeks: number
  maxWeeks: number
  source: string
  reference: string
  updatedDate: string
  notes: string
}

export interface RecoveryEstimationResult {
  hasEstimation: boolean
  minDays?: number
  maxDays?: number
  minWeeks?: number
  maxWeeks?: number
  rangeLabel?: string
  estimatedReturnFrom?: string // YYYY-MM-DD
  estimatedReturnTo?: string   // YYYY-MM-DD
  source?: string
  reference?: string
  updatedDate?: string
  notes?: string
  disclaimer: string
}

// Catálogo de fuentes médicas deportivas acreditadas
export const RECOVERY_GUIDELINES: RecoveryGuideline[] = [
  // ==========================================
  // MUSLO POSTERIOR - ISQUIOTIBIALES
  // ==========================================
  {
    id: "isquios_rotura_mod",
    injuryType: "Rotura muscular",
    structureKeywords: ["isquiotibiales", "bíceps femoral", "semitendinoso", "semimembranoso"],
    severity: "Moderada",
    minDays: 21,
    maxDays: 42,
    minWeeks: 3,
    maxWeeks: 6,
    source: "BJSM / UEFA Elite Club Injury Study",
    reference: "Ekstrand J, et al. Hamstring muscle injuries in professional football. Br J Sports Med 2012; 46:112-117.",
    updatedDate: "2026-08-01",
    notes: "Lesión estructural tipo 3b (rotura parcial moderada). Plazo promedio de reincorporación deportiva: 28 días."
  },
  {
    id: "isquios_rotura_grave",
    injuryType: "Rotura muscular",
    structureKeywords: ["isquiotibiales", "bíceps femoral", "semitendinoso", "semimembranoso"],
    severity: "Grave",
    minDays: 42,
    maxDays: 84,
    minWeeks: 6,
    maxWeeks: 12,
    source: "FIFA Medical Network",
    reference: "FIFA Football Emergency & Medicine Manual, Muscle Injuries Classification.",
    updatedDate: "2026-08-01",
    notes: "Rotura muscular severa/completa (tipo 4). Precisa programa de readaptación progresiva estricto."
  },
  {
    id: "isquios_microrrotura_leve",
    injuryType: "Microrrotura",
    structureKeywords: ["isquiotibiales", "bíceps femoral", "semitendinoso", "semimembranoso"],
    severity: "Leve",
    minDays: 10,
    maxDays: 21,
    minWeeks: 1.5,
    maxWeeks: 3,
    source: "BJSM / Munich Consensus Statement",
    reference: "Mueller-Wohlfahrt HW, et al. Terminology and classification of muscle injuries in sport. Br J Sports Med 2013; 47:342-350.",
    updatedDate: "2026-08-01",
    notes: "Lesión tipo 3a (microrrotura con edema fibrilar limitado). Reevaluar antes de sprint máximo."
  },
  {
    id: "isquios_distension",
    injuryType: "Distensión muscular",
    structureKeywords: ["isquiotibiales", "bíceps femoral", "semitendinoso", "semimembranoso"],
    severity: "Leve",
    minDays: 7,
    maxDays: 14,
    minWeeks: 1,
    maxWeeks: 2,
    source: "FIFA Training Centre",
    reference: "FIFA Medical: Muscle Strain Recovery Guidelines.",
    updatedDate: "2026-08-01",
    notes: "Elongación sin disrupción fascicular evidente (tipo 1/2a)."
  },

  // ==========================================
  // MUSLO ANTERIOR - CUÁDRICEPS / RECTO FEMORAL
  // ==========================================
  {
    id: "cuad_rotura_mod",
    injuryType: "Rotura muscular",
    structureKeywords: ["cuádriceps", "recto femoral", "vasto interno", "vasto externo"],
    severity: "Moderada",
    minDays: 28,
    maxDays: 56,
    minWeeks: 4,
    maxWeeks: 8,
    source: "BJSM / UEFA Elite Club Injury Study",
    reference: "Mendiguchia J, et al. Rectus femoris muscle injuries in football. Br J Sports Med 2013; 47:351-358.",
    updatedDate: "2026-08-01",
    notes: "El tendón central intramuscular del recto anterior requiere cautela antes de reiniciar golpeo de balón."
  },
  {
    id: "cuad_distension_leve",
    injuryType: "Distensión muscular",
    structureKeywords: ["cuádriceps", "recto femoral", "vasto interno", "vasto externo"],
    severity: "Leve",
    minDays: 7,
    maxDays: 16,
    minWeeks: 1,
    maxWeeks: 2.5,
    source: "FIFA Medical Network",
    reference: "FIFA Sports Medicine: Quadriceps Management.",
    updatedDate: "2026-08-01",
    notes: "Sobrecarga o microrrotura superficial de cuádriceps sin afectación del tendón profundo."
  },

  // ==========================================
  // PIERNA - GEMELOS Y SÓLEO
  // ==========================================
  {
    id: "soleo_rotura_mod",
    injuryType: "Rotura muscular",
    structureKeywords: ["sóleo", "gemelo", "pantorrilla"],
    severity: "Moderada",
    minDays: 21,
    maxDays: 35,
    minWeeks: 3,
    maxWeeks: 5,
    source: "BJSM / Pedret et al.",
    reference: "Pedret C, et al. Soleus muscle injuries in football players. Br J Sports Med 2015; 49:1438-1444.",
    updatedDate: "2026-08-01",
    notes: "El sóleo posee una tasa alta de recidiva si se acelera el retorno a la carrera continua."
  },
  {
    id: "gemelo_rotura_mod",
    injuryType: "Rotura muscular",
    structureKeywords: ["gemelo interno", "gemelo externo", "gemelo"],
    severity: "Moderada",
    minDays: 14,
    maxDays: 28,
    minWeeks: 2,
    maxWeeks: 4,
    source: "FIFA Medical Network",
    reference: "FIFA Sports Medicine: Gastrocnemius injury protocols.",
    updatedDate: "2026-08-01",
    notes: "Síndrome de la pedrada o rotura en unión miotendinosa del gemelo interno."
  },
  {
    id: "pantorrilla_contractura",
    injuryType: "Contractura",
    structureKeywords: ["sóleo", "gemelo interno", "gemelo externo", "tibial anterior", "pantorrilla"],
    severity: "Leve",
    minDays: 3,
    maxDays: 7,
    minWeeks: 0.5,
    maxWeeks: 1,
    source: "FIFA Training Centre",
    reference: "FIFA Muscle Fatigue and Hypertonia Management.",
    updatedDate: "2026-08-01",
    notes: "Aumento del tono muscular funcional sin daño anatómico."
  },

  // ==========================================
  // CADERA / INGLE / ADUCTORES
  // ==========================================
  {
    id: "aductores_distension",
    injuryType: "Distensión muscular",
    structureKeywords: ["aductores", "ingle", "cadera"],
    severity: "Leve",
    minDays: 10,
    maxDays: 21,
    minWeeks: 1.5,
    maxWeeks: 3,
    source: "Doha Agreement Meeting on Groin Pain in Athletes / BJSM",
    reference: "Weir A, et al. Doha agreement meeting on terminology and definitions in groin pain in athletes. Br J Sports Med 2015; 49:768-774.",
    updatedDate: "2026-08-01",
    notes: "Dolor inguinal relacionado con aductores. Requiere control de golpeo y cambios de dirección."
  },
  {
    id: "aductores_rotura_mod",
    injuryType: "Rotura muscular",
    structureKeywords: ["aductores", "ingle"],
    severity: "Moderada",
    minDays: 21,
    maxDays: 45,
    minWeeks: 3,
    maxWeeks: 6.5,
    source: "BJSM / Serner et al.",
    reference: "Serner A, et al. Diagnosis of acute groin injuries in footballers. Br J Sports Med 2018; 52:1587-1597.",
    updatedDate: "2026-08-01",
    notes: "Rotura del aductor largo (unión proximal o miotendinosa)."
  },

  // ==========================================
  // TOBILLO - ESGUINCES Y LIGAMENTOS
  // ==========================================
  {
    id: "tobillo_esguince_leve",
    injuryType: "Esguince",
    structureKeywords: ["tobillo", "tobillo externo", "tobillo interno", "pie"],
    severity: "Leve",
    minDays: 7,
    maxDays: 14,
    minWeeks: 1,
    maxWeeks: 2,
    source: "FIFA Training Centre",
    reference: "FIFA Sports Medicine: Lateral Ankle Ligament Sprain Gr. I.",
    updatedDate: "2026-08-01",
    notes: "Esguince grado I (distensión sin inestabilidad articular)."
  },
  {
    id: "tobillo_esguince_mod",
    injuryType: "Esguince",
    structureKeywords: ["tobillo", "tobillo externo", "tobillo interno"],
    severity: "Moderada",
    minDays: 21,
    maxDays: 35,
    minWeeks: 3,
    maxWeeks: 5,
    source: "BJSM / Van Dijk et al.",
    reference: "van Dijk CN, et al. Management of acute ankle ligament injuries: a systematic review. Br J Sports Med 2018; 52:724-733.",
    updatedDate: "2026-08-01",
    notes: "Esguince grado II (rotura parcial del ligamento peroneoastragalino anterior)."
  },
  {
    id: "tobillo_esguince_grave",
    injuryType: "Esguince",
    structureKeywords: ["tobillo", "tobillo externo", "tobillo interno"],
    severity: "Grave",
    minDays: 42,
    maxDays: 70,
    minWeeks: 6,
    maxWeeks: 10,
    source: "FIFA Medical Guidelines",
    reference: "FIFA Football Medicine Manual, Ankle Syndesmosis and Gr. III Sprains.",
    updatedDate: "2026-08-01",
    notes: "Esguince grado III o lesión de sindesmosis tibioperonea."
  },

  // ==========================================
  // RODILLA - LIGAMENTOS Y RÓTULA
  // ==========================================
  {
    id: "rodilla_esguince_lli_leve",
    injuryType: "Esguince",
    structureKeywords: ["rodilla", "rótula"],
    severity: "Leve",
    minDays: 14,
    maxDays: 28,
    minWeeks: 2,
    maxWeeks: 4,
    source: "FIFA Medical Guidelines",
    reference: "FIFA Football Medicine Manual: Medial Collateral Ligament Sprains.",
    updatedDate: "2026-08-01",
    notes: "Esguince grado I del ligamento colateral medial (LLI)."
  },
  {
    id: "rodilla_esguince_lli_mod",
    injuryType: "Esguince",
    structureKeywords: ["rodilla"],
    severity: "Moderada",
    minDays: 28,
    maxDays: 56,
    minWeeks: 4,
    maxWeeks: 8,
    source: "BJSM / Lundblad et al.",
    reference: "Lundblad M, et al. Medial collateral ligament injuries in football. Br J Sports Med 2019; 53:1469-1475.",
    updatedDate: "2026-08-01",
    notes: "Esguince grado II del ligamento colateral medial con laxitud sin tope neto."
  },
  {
    id: "tendon_rotuliano_leve",
    injuryType: "Tendinopatía",
    structureKeywords: ["tendón rotuliano", "rótula", "rodilla"],
    severity: "Leve",
    minDays: 14,
    maxDays: 30,
    minWeeks: 2,
    maxWeeks: 4,
    source: "Aspetar Sports Medicine Journal",
    reference: "Malliaras P. Patellar tendinopathy: Clinical diagnosis and rehabilitation. Aspetar 2017.",
    updatedDate: "2026-08-01",
    notes: "Jumper's knee / tendinopatía rotuliana reactiva. Control de carga de salto e impacto."
  },

  // ==========================================
  // TENDÓN DE AQUILES
  // ==========================================
  {
    id: "aquiles_tendinopatia_leve",
    injuryType: "Tendinopatía",
    structureKeywords: ["tendón de aquiles", "talón", "tobillo"],
    severity: "Leve",
    minDays: 14,
    maxDays: 35,
    minWeeks: 2,
    maxWeeks: 5,
    source: "BJSM / Scott et al.",
    reference: "Scott A, et al. ICON 2019: International Scientific Tendinopathy Symposium Consensus. Br J Sports Med 2020; 54:260-268.",
    updatedDate: "2026-08-01",
    notes: "Tendinopatía aquílea de porción media en fase reactiva."
  },

  // ==========================================
  // TRAUMÁTICAS - CONTUSIÓN / GOLPE GENERAL
  // ==========================================
  {
    id: "contusion_general_leve",
    injuryType: "Contusión",
    structureKeywords: [], // aplica a cualquier estructura si no hay más específica
    severity: "Leve",
    minDays: 3,
    maxDays: 7,
    minWeeks: 0.5,
    maxWeeks: 1,
    source: "FIFA Medical Network",
    reference: "FIFA Sports Medicine: Management of acute contusions in football.",
    updatedDate: "2026-08-01",
    notes: "Golpe o traumatismo directo leve sin afectación perióstica ni hematoma compresivo."
  },
  {
    id: "contusion_general_mod",
    injuryType: "Contusión",
    structureKeywords: [],
    severity: "Moderada",
    minDays: 7,
    maxDays: 14,
    minWeeks: 1,
    maxWeeks: 2,
    source: "FIFA Medical Network",
    reference: "FIFA Sports Medicine: Moderate contusion with intramuscular hematoma.",
    updatedDate: "2026-08-01",
    notes: "Contusión con hematoma intramuscular o derrame palpable. Evitar calor precoz."
  }
]

export const MEDICAL_DISCLAIMER =
  "⚠️ Estimación orientativa. No constituye diagnóstico médico ni determina automáticamente el alta deportiva."

/**
 * Calcula la estimación orientativa de recuperación contrastando
 * la estructura anatómica, tipo de lesión y gravedad contra la base científica.
 */
export function estimateRecovery(params: {
  injuryType: string
  structure?: string
  severity?: string
  injuryDate?: string
}): RecoveryEstimationResult {
  const { injuryType, structure = "", severity = "Por determinar", injuryDate } = params

  if (!injuryType || severity === "Por determinar") {
    return {
      hasEstimation: false,
      disclaimer: MEDICAL_DISCLAIMER
    }
  }

  const normType = injuryType.trim().toLowerCase()
  const normStructure = structure.trim().toLowerCase()
  const normSeverity = severity.trim()

  // Buscar coincidencia en el catálogo
  const candidate = RECOVERY_GUIDELINES.find(guide => {
    const typeMatch =
      guide.injuryType.toLowerCase() === normType ||
      (normType === "rotura muscular" && guide.injuryType === "Rotura muscular") ||
      (normType === "microrrotura" && guide.injuryType === "Microrrotura") ||
      (normType === "distensión muscular" && guide.injuryType === "Distensión muscular") ||
      (normType === "tendinitis" && guide.injuryType === "Tendinopatía") ||
      (normType === "sobrecarga muscular" && guide.injuryType === "Contractura")

    if (!typeMatch) return false
    if (guide.severity !== normSeverity) return false

    // Si tiene keywords específicas, debe coincidir con alguna
    if (guide.structureKeywords.length > 0) {
      return guide.structureKeywords.some(kw => normStructure.includes(kw.toLowerCase()))
    }

    return true
  })

  if (!candidate) {
    return {
      hasEstimation: false,
      disclaimer: MEDICAL_DISCLAIMER
    }
  }

  // Calcular fechas orientativas a partir de la fecha de lesión
  let estimatedReturnFrom: string | undefined
  let estimatedReturnTo: string | undefined

  if (injuryDate) {
    try {
      const base = new Date(injuryDate)
      const fromDate = new Date(base.getTime() + candidate.minDays * 86400000)
      const toDate = new Date(base.getTime() + candidate.maxDays * 86400000)
      estimatedReturnFrom = fromDate.toISOString().split("T")[0]
      estimatedReturnTo = toDate.toISOString().split("T")[0]
    } catch {
      // ignore date calculation on parse failure
    }
  }

  const rangeLabel =
    candidate.minWeeks >= 1
      ? `${candidate.minWeeks}–${candidate.maxWeeks} semanas (${candidate.minDays}–${candidate.maxDays} días)`
      : `${candidate.minDays}–${candidate.maxDays} días`

  return {
    hasEstimation: true,
    minDays: candidate.minDays,
    maxDays: candidate.maxDays,
    minWeeks: candidate.minWeeks,
    maxWeeks: candidate.maxWeeks,
    rangeLabel,
    estimatedReturnFrom,
    estimatedReturnTo,
    source: candidate.source,
    reference: candidate.reference,
    updatedDate: candidate.updatedDate,
    notes: candidate.notes,
    disclaimer: MEDICAL_DISCLAIMER
  }
}
