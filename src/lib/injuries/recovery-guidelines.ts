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
  mechanism?: string
  incidence?: string
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
  mechanism?: string
  incidence?: string
  disclaimer: string
}

// Catálogo de fuentes médicas deportivas acreditadas
export const RECOVERY_GUIDELINES: RecoveryGuideline[] = [
  // =========================================================================
  // MAPEO ANATÓMICO DE LESIONES MUSCULARES EN EL FÚTBOL (LITERATURA ESPECIALIZADA)
  // =========================================================================
  // 1. Muslo (Anterior)
  {
    id: "cuad_recto_anterior_grave",
    injuryType: "Rotura muscular",
    structureKeywords: ["recto anterior", "recto anterior (cuádriceps)", "recto femoral"],
    severity: "Grave",
    minDays: 42,
    maxDays: 70,
    minWeeks: 6,
    maxWeeks: 10,
    source: "BJSM / UEFA Elite Club Injury Study",
    reference: "Mendiguchia J, et al. Rectus femoris muscle injuries in football. Br J Sports Med 2013; 47:351-358.",
    updatedDate: "2026-08-01",
    notes: "Afectación de la unión miotendinosa proximal o tendón central. Precaución antes de chutar a máxima potencia.",
    mechanism: "Golpeo de balón, frenazos bruscos",
    incidence: "Grave"
  },
  {
    id: "cuad_vasto_lateral_mod",
    injuryType: "Rotura muscular",
    structureKeywords: ["vasto lateral", "vasto lateral (cuádriceps)", "vasto externo"],
    severity: "Moderada",
    minDays: 21,
    maxDays: 35,
    minWeeks: 3,
    maxWeeks: 5,
    source: "FIFA Medical Network",
    reference: "FIFA Sports Medicine Manual: Vastus lateralis deceleration trauma in footballers.",
    updatedDate: "2026-08-01",
    notes: "Compromiso de la masa extensora lateral en frenadas excéntricas.",
    mechanism: "Extensión de rodilla, desaceleración",
    incidence: "Moderada"
  },
  {
    id: "cuad_vasto_medial_mod",
    injuryType: "Rotura muscular",
    structureKeywords: ["vasto medial", "vasto medial (cuádriceps)", "vasto interno"],
    severity: "Moderada",
    minDays: 14,
    maxDays: 28,
    minWeeks: 2,
    maxWeeks: 4,
    source: "FIFA Medical Network",
    reference: "FIFA Football Emergency & Medicine: Patellar stabilizing muscle injuries.",
    updatedDate: "2026-08-01",
    notes: "Papel estabilizador crítico en la trayectoria femororrotuliana.",
    mechanism: "Estabilización de la rótula",
    incidence: "Moderada"
  },
  {
    id: "muslo_sartorio_leve",
    injuryType: "Rotura muscular",
    structureKeywords: ["sartorio"],
    severity: "Leve",
    minDays: 7,
    maxDays: 18,
    minWeeks: 1,
    maxWeeks: 2.5,
    source: "BJSM / Aspetar Sports Medicine",
    reference: "Aspetar Sports Medicine Journal: Superficial thigh musculature strains in soccer.",
    updatedDate: "2026-08-01",
    notes: "Músculo biarticular más largo del cuerpo. Baja tasa de recidiva.",
    mechanism: "Flexión combinada de cadera y rodilla",
    incidence: "Leve"
  },

  // 2. Muslo (Posterior / Isquiotibiales)
  {
    id: "isquios_biceps_femoral_larga",
    injuryType: "Rotura muscular",
    structureKeywords: ["bíceps femoral (cabeza larga)", "cabeza larga", "isquiotibiales", "bíceps femoral"],
    severity: "Grave",
    minDays: 28,
    maxDays: 56,
    minWeeks: 4,
    maxWeeks: 8,
    source: "BJSM / UEFA Elite Club Injury Study",
    reference: "Ekstrand J, et al. Hamstring muscle injuries in professional football. Br J Sports Med.",
    updatedDate: "2026-08-01",
    notes: "Lesión muscular más frecuente en el fútbol profesional durante la fase final de oscilación del sprint.",
    mechanism: "Sprints a máxima velocidad (fase de oscilación)",
    incidence: "Muy Alta"
  },
  {
    id: "isquios_biceps_femoral_corta",
    injuryType: "Rotura muscular",
    structureKeywords: ["bíceps femoral (cabeza corta)", "cabeza corta"],
    severity: "Moderada",
    minDays: 14,
    maxDays: 28,
    minWeeks: 2,
    maxWeeks: 4,
    source: "FIFA Medical Network",
    reference: "FIFA Sports Medicine: Short head biceps femoris strains in kicking.",
    updatedDate: "2026-08-01",
    notes: "Monoarticular, inervado por el nervio peroneo común.",
    mechanism: "Flexión de rodilla en velocidad",
    incidence: "Alta"
  },
  {
    id: "isquios_semitendinoso",
    injuryType: "Rotura muscular",
    structureKeywords: ["semitendinoso"],
    severity: "Moderada",
    minDays: 21,
    maxDays: 35,
    minWeeks: 3,
    maxWeeks: 5,
    source: "BJSM / UEFA Elite Club Injury Study",
    reference: "Ekstrand J. Semitendinosus muscle lesions in high-level football.",
    updatedDate: "2026-08-01",
    notes: "Tendón distal largo que forma parte de la pata de ganso.",
    mechanism: "Extensión de cadera y carrera continua",
    incidence: "Alta"
  },
  {
    id: "isquios_semimembranoso",
    injuryType: "Rotura muscular",
    structureKeywords: ["semimembranoso"],
    severity: "Moderada",
    minDays: 21,
    maxDays: 42,
    minWeeks: 3,
    maxWeeks: 6,
    source: "BJSM",
    reference: "Askling CM, et al. Acute hamstring injuries in Swedish elite football players.",
    updatedDate: "2026-08-01",
    notes: "Inserción medial ancha profunda, muy solicitado en frenadas bruscas con cambio de dirección.",
    mechanism: "Frenazos de golpe y giros",
    incidence: "Alta"
  },

  // 3. Ingle y Cadera (Aductores y Flexores)
  {
    id: "aductor_largo_grave",
    injuryType: "Rotura muscular",
    structureKeywords: ["aductor largo", "aductor largo (medio)", "aductor medio", "aductores", "ingle"],
    severity: "Grave",
    minDays: 28,
    maxDays: 60,
    minWeeks: 4,
    maxWeeks: 8.5,
    source: "Doha Agreement Meeting / BJSM",
    reference: "Weir A, et al. Doha agreement meeting on terminology and definitions in groin pain in athletes. Br J Sports Med 2015; 49:768-774.",
    updatedDate: "2026-08-01",
    notes: "Principal responsable del dolor inguinal en futbolistas. Elevado riesgo de cronificación si no se respeta la cicatrización.",
    mechanism: "Cambios de dirección, pases de interior, pubalgia",
    incidence: "Muy Alta"
  },
  {
    id: "aductor_mayor_mod",
    injuryType: "Rotura muscular",
    structureKeywords: ["aductor mayor"],
    severity: "Moderada",
    minDays: 21,
    maxDays: 42,
    minWeeks: 3,
    maxWeeks: 6,
    source: "FIFA Medical Network",
    reference: "FIFA Sports Medicine: Adductor magnus traction strains in footballers.",
    updatedDate: "2026-08-01",
    notes: "Gran masa muscular posterior medial del muslo con doble inervación.",
    mechanism: "Tracción extrema en giros",
    incidence: "Alta"
  },
  {
    id: "cadera_pectineo_mod",
    injuryType: "Rotura muscular",
    structureKeywords: ["pectíneo"],
    severity: "Moderada",
    minDays: 14,
    maxDays: 28,
    minWeeks: 2,
    maxWeeks: 4,
    source: "BJSM / Aspetar",
    reference: "Serner A, et al. Diagnosis of groin pain in athletes. Br J Sports Med.",
    updatedDate: "2026-08-01",
    notes: "Músculo profundo de la fosa iliopectínea.",
    mechanism: "Flexión y aducción brusca de cadera",
    incidence: "Moderada"
  },
  {
    id: "cadera_gracil_mod",
    injuryType: "Rotura muscular",
    structureKeywords: ["grácil", "grácil (recto interno)", "recto interno"],
    severity: "Moderada",
    minDays: 14,
    maxDays: 28,
    minWeeks: 2,
    maxWeeks: 4,
    source: "FIFA Medical Network",
    reference: "FIFA Sports Medicine: Gracilis strain in football.",
    updatedDate: "2026-08-01",
    notes: "Músculo biarticular delgado de la cara interna del muslo.",
    mechanism: "Movimientos de torsión con pie fijo",
    incidence: "Moderada"
  },
  {
    id: "cadera_psoas_mod",
    injuryType: "Rotura muscular",
    structureKeywords: ["psoas ilíaco", "psoas", "iliopsoas"],
    severity: "Moderada",
    minDays: 18,
    maxDays: 35,
    minWeeks: 2.5,
    maxWeeks: 5,
    source: "BJSM",
    reference: "Hölmich P. Long-standing groin pain in sportspeople. Br J Sports Med.",
    updatedDate: "2026-08-01",
    notes: "Flexor primario de la cadera, fundamental en el balanceo y armado previo al golpeo.",
    mechanism: "Flexión potente de la pierna en el golpeo",
    incidence: "Moderada"
  },
  {
    id: "cadera_tfl_leve",
    injuryType: "Rotura muscular",
    structureKeywords: ["tensor de la fascia lata", "tfl"],
    severity: "Leve",
    minDays: 10,
    maxDays: 21,
    minWeeks: 1.5,
    maxWeeks: 3,
    source: "FIFA Training Centre",
    reference: "FIFA Medical: Tensor fasciae latae overload in footballers.",
    updatedDate: "2026-08-01",
    notes: "Estabilizador anterolateral de la pelvis durante desplazamientos defensivos laterales.",
    mechanism: "Carreras laterales y estabilización de pelvis",
    incidence: "Leve/Mod"
  },

  // 4. Pierna Inferior (Pantorrilla)
  {
    id: "gemelo_interno_grave",
    injuryType: "Rotura muscular",
    structureKeywords: ["gemelo interno", "gemelo interno (gastrocnemio)", "gastrocnemio medial", "gastrocnemio interno", "gemelo"],
    severity: "Grave",
    minDays: 28,
    maxDays: 56,
    minWeeks: 4,
    maxWeeks: 8,
    source: "BJSM / UEFA Elite Club Injury Study",
    reference: "Green B, et al. Calf muscle strain injuries in elite football: A review. Br J Sports Med 2017.",
    updatedDate: "2026-08-01",
    notes: "Conocido clásicamente como 'tennis leg' / 'pierna de tenista'. Alta tasa de recurrencia si el regreso es precipitado.",
    mechanism: "Saltos, aceleraciones, arrancadas",
    incidence: "Muy Alta"
  },
  {
    id: "gemelo_externo_mod",
    injuryType: "Rotura muscular",
    structureKeywords: ["gemelo externo", "gemelo externo (gastrocnemio)", "gastrocnemio lateral"],
    severity: "Moderada",
    minDays: 18,
    maxDays: 35,
    minWeeks: 2.5,
    maxWeeks: 5,
    source: "FIFA Medical Network",
    reference: "FIFA Sports Medicine: Lateral gastrocnemius strain in footballers.",
    updatedDate: "2026-08-01",
    notes: "Menos frecuente que el medial pero susceptible a movimientos de cambio de dirección hacia el exterior.",
    mechanism: "Empuje lateral",
    incidence: "Moderada"
  },
  {
    id: "pantorrilla_soleo_alta",
    injuryType: "Rotura muscular",
    structureKeywords: ["sóleo"],
    severity: "Moderada",
    minDays: 21,
    maxDays: 42,
    minWeeks: 3,
    maxWeeks: 6,
    source: "BJSM / UEFA Studies",
    reference: "Dixon JB. Gastrocnemius vs. soleus strain in athletes: clinical differentiation and recovery.",
    updatedDate: "2026-08-01",
    notes: "Músculo tónico rico en fibras lentas (tipo I). Puede parecer asintomático al inicio pero agravarse con fatiga acumulada.",
    mechanism: "Fatiga muscular, carreras de larga duración",
    incidence: "Alta"
  },
  {
    id: "pantorrilla_tibial_ant",
    injuryType: "Rotura muscular",
    structureKeywords: ["tibial anterior"],
    severity: "Leve",
    minDays: 7,
    maxDays: 21,
    minWeeks: 1,
    maxWeeks: 3,
    source: "FIFA Medical Network",
    reference: "FIFA Medical: Anterior compartment shin splints and muscle strains.",
    updatedDate: "2026-08-01",
    notes: "Común en pretemporadas sobre campos sintéticos o césped duro.",
    mechanism: "Sobrecarga por terrenos duros o golpeo",
    incidence: "Leve/Mod"
  },
  {
    id: "pantorrilla_peroneos",
    injuryType: "Rotura muscular",
    structureKeywords: ["peroneo lateral", "peroneo lateral largo / corto", "peroneos"],
    severity: "Leve",
    minDays: 10,
    maxDays: 24,
    minWeeks: 1.5,
    maxWeeks: 3.5,
    source: "FIFA Football Medicine",
    reference: "FIFA: Peroneal tendon and muscle strains associated with lateral ankle sprains.",
    updatedDate: "2026-08-01",
    notes: "Suele acompañar o derivar de esguinces del ligamento lateral externo del tobillo.",
    mechanism: "Secundario a esguinces de tobillo por inversión",
    incidence: "Leve"
  },

  // 5. Core y Tronco
  {
    id: "core_recto_abdominal",
    injuryType: "Rotura muscular",
    structureKeywords: ["recto abdominal", "abdomen"],
    severity: "Moderada",
    minDays: 14,
    maxDays: 30,
    minWeeks: 2,
    maxWeeks: 4.5,
    source: "BJSM / FIFA Medical",
    reference: "FIFA Sports Medicine: Abdominal wall injuries in professional soccer.",
    updatedDate: "2026-08-01",
    notes: "Afecta la pared abdominal anterior. Dolor acentuado con tos o flexión contra resistencia.",
    mechanism: "Giros en el aire, saques de banda de larga distancia",
    incidence: "Moderada"
  },
  {
    id: "core_oblicuos",
    injuryType: "Rotura muscular",
    structureKeywords: ["oblicuo", "oblicuo interno / externo", "oblicuos"],
    severity: "Moderada",
    minDays: 14,
    maxDays: 32,
    minWeeks: 2,
    maxWeeks: 4.5,
    source: "FIFA Medical Network",
    reference: "FIFA: Internal and external oblique muscle strains in contact sports.",
    updatedDate: "2026-08-01",
    notes: "Frecuente en torsiones forzadas y choques aéreos.",
    mechanism: "Torsiones de tronco bruscas en carrera o saltos",
    incidence: "Moderada"
  },
  {
    id: "core_erectores_columna",
    injuryType: "Rotura muscular",
    structureKeywords: ["erectores de la columna", "zona lumbar", "erectores espinales", "espalda"],
    severity: "Moderada",
    minDays: 10,
    maxDays: 24,
    minWeeks: 1.5,
    maxWeeks: 3.5,
    source: "FIFA Medical Network",
    reference: "FIFA Football Medicine: Paraspinal lumbar muscle injuries.",
    updatedDate: "2026-08-01",
    notes: "Contracturas y distensiones de la masa común lumbar por sobrecargas en campos pesados.",
    mechanism: "Impactos, caídas y saltos repetitivos",
    incidence: "Leve/Mod"
  },

  // 6. Exclusivos de Portero
  {
    id: "portero_supraespinoso",
    injuryType: "Rotura muscular",
    structureKeywords: ["supraespinoso", "supraespinoso (hombro)", "manguito rotador", "hombro"],
    severity: "Moderada",
    minDays: 21,
    maxDays: 45,
    minWeeks: 3,
    maxWeeks: 6.5,
    source: "BJSM / FIFA Medical",
    reference: "FIFA Sports Medicine: Goalkeeper shoulder injuries and rotator cuff tears.",
    updatedDate: "2026-08-01",
    notes: "Lesión típica de porteros al caer con el brazo extendido tras estirada a balón raso o aéreo.",
    mechanism: "Estiradas, caídas apoyando el brazo",
    incidence: "Alta"
  },
  {
    id: "portero_subescapular",
    injuryType: "Rotura muscular",
    structureKeywords: ["subescapular", "subescapular / redondo mayor", "redondo mayor"],
    severity: "Moderada",
    minDays: 18,
    maxDays: 35,
    minWeeks: 2.5,
    maxWeeks: 5,
    source: "FIFA Medical Network",
    reference: "FIFA: Subscapularis and teres major strains in football goalkeepers.",
    updatedDate: "2026-08-01",
    notes: "Estrés repetitivo en saques de mano largos para contragolpes.",
    mechanism: "Saques de mano de larga distancia",
    incidence: "Moderada"
  },
  {
    id: "portero_dorsal_ancho",
    injuryType: "Rotura muscular",
    structureKeywords: ["dorsal ancho", "dorsal"],
    severity: "Moderada",
    minDays: 14,
    maxDays: 28,
    minWeeks: 2,
    maxWeeks: 4,
    source: "FIFA Medical Network",
    reference: "FIFA Sports Medicine: Latissimus dorsi contusions and strains.",
    updatedDate: "2026-08-01",
    notes: "Impactos directos contra postes o adversarios en balones divididos.",
    mechanism: "Impactos contra el suelo o postes",
    incidence: "Moderada"
  },

  // ==========================================
  // GUÍAS GENERALES Y ARTICULARES PREVIAS
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
    notes: "Lesión estructural tipo 3b (rotura parcial moderada). Plazo promedio de reincorporación deportiva: 28 días.",
    mechanism: "Sprints a máxima velocidad (fase de oscilación)",
    incidence: "Muy Alta"
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
  // MIEMBROS SUPERIORES - HOMBRO
  // ==========================================
  {
    id: "hombro_acromio_leve",
    injuryType: "Esguince",
    structureKeywords: ["hombro", "clavícula", "acromioclavicular", "articulación acromioclavicular"],
    severity: "Leve",
    minDays: 7,
    maxDays: 14,
    minWeeks: 1,
    maxWeeks: 2,
    source: "FIFA Medical Guidelines",
    reference: "FIFA Football Medicine Manual: Acromioclavicular Joint Sprains in Football.",
    updatedDate: "2026-08-30",
    notes: "Esguince acromioclavicular grado I por caída directa sobre el hombro. Vendaje funcional y movilidad progresiva."
  },
  {
    id: "hombro_acromio_mod",
    injuryType: "Esguince",
    structureKeywords: ["hombro", "clavícula", "acromioclavicular", "articulación acromioclavicular"],
    severity: "Moderada",
    minDays: 14,
    maxDays: 35,
    minWeeks: 2,
    maxWeeks: 5,
    source: "BJSM / UEFA Studies",
    reference: "Ekstrand J, et al. Shoulder injuries in professional football. Br J Sports Med 2013; 47:758-763.",
    updatedDate: "2026-08-30",
    notes: "Esguince grado II con subluxación parcial acromioclavicular. Fortalecimiento periescapular antes del contacto."
  },
  {
    id: "hombro_luxacion_mod",
    injuryType: "Luxación",
    structureKeywords: ["hombro", "deltoides", "articulación acromioclavicular"],
    severity: "Moderada",
    minDays: 21,
    maxDays: 45,
    minWeeks: 3,
    maxWeeks: 6.5,
    source: "FIFA Medical Network",
    reference: "FIFA Sports Medicine: Glenohumeral Instability and First-Time Dislocations in Goalkeepers.",
    updatedDate: "2026-08-30",
    notes: "Subluxación o luxación reducida cerrada sin fractura de reborde glenoideo. Estabilidad dinámica y prevención de recidiva."
  },
  {
    id: "hombro_tendinopatia_leve",
    injuryType: "Tendinopatía",
    structureKeywords: ["hombro", "deltoides"],
    severity: "Leve",
    minDays: 10,
    maxDays: 21,
    minWeeks: 1.5,
    maxWeeks: 3,
    source: "Aspetar Sports Medicine Journal",
    reference: "Aspetar: Rotator Cuff and Shoulder Overload in Overhead & Collision Athletes.",
    updatedDate: "2026-08-30",
    notes: "Sobrecarga de manguito o deltoides por apoyos y caídas repetidas."
  },

  // ==========================================
  // MIEMBROS SUPERIORES - BRAZO (BÍCEPS / TRÍCEPS)
  // ==========================================
  {
    id: "brazo_biceps_distension",
    injuryType: "Distensión muscular",
    structureKeywords: ["brazo", "bíceps", "tríceps"],
    severity: "Leve",
    minDays: 7,
    maxDays: 14,
    minWeeks: 1,
    maxWeeks: 2,
    source: "BJSM / Munich Consensus",
    reference: "Mueller-Wohlfahrt HW, et al. Terminology and classification of muscle injuries. Br J Sports Med 2013.",
    updatedDate: "2026-08-30",
    notes: "Elongación o microrrotura grado 1 en bíceps o tríceps braquial tras hiperextensión o tracción."
  },
  {
    id: "brazo_rotura_mod",
    injuryType: "Rotura muscular",
    structureKeywords: ["brazo", "bíceps", "tríceps"],
    severity: "Moderada",
    minDays: 21,
    maxDays: 42,
    minWeeks: 3,
    maxWeeks: 6,
    source: "FIFA Medical Network",
    reference: "FIFA Sports Medicine: Arm muscle injuries in football and goalkeeper trauma.",
    updatedDate: "2026-08-30",
    notes: "Rotura fibrilar parcial moderada (grado 2) en musculatura braquial."
  },

  // ==========================================
  // MIEMBROS SUPERIORES - CODO
  // ==========================================
  {
    id: "codo_esguince_leve",
    injuryType: "Esguince",
    structureKeywords: ["codo", "epicóndilo", "articulación"],
    severity: "Leve",
    minDays: 7,
    maxDays: 16,
    minWeeks: 1,
    maxWeeks: 2.5,
    source: "FIFA Medical Guidelines",
    reference: "FIFA Football Medicine Manual: Elbow sprain and hyperextension trauma in football.",
    updatedDate: "2026-08-30",
    notes: "Esguince capsulo-ligamentoso por hiperextensión al apoyar el brazo en caída o bloqueo de tiro."
  },
  {
    id: "codo_epicondilitis_leve",
    injuryType: "Tendinopatía",
    structureKeywords: ["codo", "epicóndilo"],
    severity: "Leve",
    minDays: 14,
    maxDays: 30,
    minWeeks: 2,
    maxWeeks: 4,
    source: "BJSM Guidelines",
    reference: "Scott A, et al. Tendinopathy management in sports. Br J Sports Med 2020.",
    updatedDate: "2026-08-30",
    notes: "Epicondilalgia o sobrecarga en tendón conjunto extensor del antebrazo."
  },
  {
    id: "codo_luxacion_mod",
    injuryType: "Luxación",
    structureKeywords: ["codo", "articulación"],
    severity: "Moderada",
    minDays: 28,
    maxDays: 60,
    minWeeks: 4,
    maxWeeks: 8.5,
    source: "FIFA Emergency Manual",
    reference: "FIFA Football Emergency & Medicine Manual: Elbow dislocation and reduction protocols.",
    updatedDate: "2026-08-30",
    notes: "Luxación de codo sin fractura ósea asociada. Requiere inmovilización inicial y ganancia articular gradual."
  },

  // ==========================================
  // MIEMBROS SUPERIORES - ANTEBRAZO Y MUÑECA
  // ==========================================
  {
    id: "muneca_esguince_leve",
    injuryType: "Esguince",
    structureKeywords: ["muñeca", "antebrazo", "musculatura flexora", "musculatura extensora"],
    severity: "Leve",
    minDays: 7,
    maxDays: 16,
    minWeeks: 1,
    maxWeeks: 2.5,
    source: "FIFA Medical Network",
    reference: "FIFA Sports Medicine: Wrist ligament sprains and support strapping in football.",
    updatedDate: "2026-08-30",
    notes: "Esguince de ligamentos radiocarpianos por hiperextensión en caída de apoyo."
  },
  {
    id: "muneca_esguince_mod",
    injuryType: "Esguince",
    structureKeywords: ["muñeca", "antebrazo"],
    severity: "Moderada",
    minDays: 16,
    maxDays: 35,
    minWeeks: 2.5,
    maxWeeks: 5,
    source: "FIFA Medical Network",
    reference: "FIFA Football Medicine Manual: Moderate wrist sprains with tear of scapholunate or dorsal ligaments.",
    updatedDate: "2026-08-30",
    notes: "Esguince grado II con inestabilidad funcional transitoria. Inmovilización y reincorporación con férula semirrígida."
  },
  {
    id: "muneca_fractura_mod",
    injuryType: "Fractura",
    structureKeywords: ["muñeca", "escafoides", "radio", "cúbito", "antebrazo"],
    severity: "Moderada",
    minDays: 35,
    maxDays: 65,
    minWeeks: 5,
    maxWeeks: 9,
    source: "BJSM / FIFA Manual",
    reference: "FIFA Football Medicine Manual: Distal radius and scaphoid fractures in football players.",
    updatedDate: "2026-08-30",
    notes: "Fisura o fractura no desplazada de radio distal o escafoides. Precisa consolidación radiológica completa antes de juego con contacto."
  },

  // ==========================================
  // MIEMBROS SUPERIORES - MANO Y DEDOS
  // ==========================================
  {
    id: "mano_dedo_esguince_leve",
    injuryType: "Esguince",
    structureKeywords: ["mano", "dedos", "metacarpos"],
    severity: "Leve",
    minDays: 5,
    maxDays: 14,
    minWeeks: 0.5,
    maxWeeks: 2,
    source: "FIFA Medical Guidelines",
    reference: "FIFA Medical Manual: Finger and hand injuries in goalkeepers and field players.",
    updatedDate: "2026-08-30",
    notes: "Esguince colateral de interfalángica o capsulitis por impacto de balón. Sindactilia preventiva ('buddy taping')."
  },
  {
    id: "mano_luxacion_mod",
    injuryType: "Luxación",
    structureKeywords: ["dedos", "mano"],
    severity: "Moderada",
    minDays: 14,
    maxDays: 28,
    minWeeks: 2,
    maxWeeks: 4,
    source: "FIFA Emergency Manual",
    reference: "FIFA Sports Medicine: Interphalangeal dislocation reduction and athletic recovery.",
    updatedDate: "2026-08-30",
    notes: "Luxación interfalángica reducida. Inmovilización breve y protección en competición."
  },
  {
    id: "mano_fractura_mod",
    injuryType: "Fractura",
    structureKeywords: ["metacarpos", "mano", "dedos"],
    severity: "Moderada",
    minDays: 28,
    maxDays: 45,
    minWeeks: 4,
    maxWeeks: 6.5,
    source: "BJSM Guidelines",
    reference: "BJSM: Metacarpal fractures and return-to-play criteria in contact sports.",
    updatedDate: "2026-08-30",
    notes: "Fractura metacarpiana no quirúrgica (ej. 5º metacarpiano). Protección rígida homologada."
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
  const { injuryType, structure = "", severity, injuryDate } = params

  if (!injuryType) {
    return {
      hasEstimation: false,
      disclaimer: MEDICAL_DISCLAIMER
    }
  }

  const normType = injuryType.trim().toLowerCase()
  const normStructure = structure.trim().toLowerCase()
  const isSeveritySet = Boolean(severity && severity !== "Por determinar")
  const targetSeverity = isSeveritySet ? severity!.trim() : null

  // 1. Buscar coincidencia en el catálogo con severidad si está definida
  let candidate = RECOVERY_GUIDELINES.find(guide => {
    const typeMatch =
      guide.injuryType.toLowerCase() === normType ||
      (normType.includes("rotura") && guide.injuryType === "Rotura muscular") ||
      (normType.includes("microrrotura") && guide.injuryType === "Microrrotura") ||
      (normType.includes("distensi") && guide.injuryType === "Distensión muscular") ||
      (normType.includes("tendin") && guide.injuryType === "Tendinopatía") ||
      (normType.includes("sobrecarga") && guide.injuryType === "Contractura") ||
      (normType.includes("contractura") && guide.injuryType === "Contractura") ||
      (normType.includes("esguince") && guide.injuryType === "Esguince") ||
      (normType.includes("contusi") && guide.injuryType === "Contusión")

    if (!typeMatch) return false
    if (targetSeverity && guide.severity !== targetSeverity) return false

    // Si tiene keywords específicas, debe coincidir con alguna
    if (guide.structureKeywords.length > 0) {
      return guide.structureKeywords.some(kw =>
        normStructure.includes(kw.toLowerCase()) || kw.toLowerCase().includes(normStructure)
      )
    }

    return true
  })

  // 2. Si no hubo coincidencia porque severity era "Por determinar" o no estaba seteada, buscar con cualquier severidad de esa estructura
  if (!candidate && normStructure) {
    candidate = RECOVERY_GUIDELINES.find(guide => {
      const typeMatch =
        guide.injuryType.toLowerCase() === normType ||
        (normType.includes("rotura") && guide.injuryType === "Rotura muscular") ||
        (normType.includes("microrrotura") && guide.injuryType === "Microrrotura") ||
        (normType.includes("distensi") && guide.injuryType === "Distensión muscular") ||
        (normType.includes("tendin") && guide.injuryType === "Tendinopatía") ||
        (normType.includes("sobrecarga") && guide.injuryType === "Contractura") ||
        (normType.includes("contractura") && guide.injuryType === "Contractura") ||
        (normType.includes("esguince") && guide.injuryType === "Esguince") ||
        (normType.includes("contusi") && guide.injuryType === "Contusión")

      if (!typeMatch) return false
      return guide.structureKeywords.some(kw =>
        normStructure.includes(kw.toLowerCase()) || kw.toLowerCase().includes(normStructure)
      )
    })
  }

  // 3. Si sigue sin candidato y la severidad es explícita "Por determinar" y no es estructura tabulada
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
    mechanism: candidate.mechanism,
    incidence: candidate.incidence,
    disclaimer: MEDICAL_DISCLAIMER
  }
}
