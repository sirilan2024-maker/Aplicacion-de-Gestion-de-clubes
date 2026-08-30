process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

interface Exercise {
  id: string;
  nombre: string;
  tipo?: string;
  descripcion?: string;
  game_phase?: string;
  age_category?: string;
  categoria_edad?: string[];
  objetivo_tactico?: string[];
  objetivo_tecnico?: string[];
  tags?: string[];
  correcciones?: string;
  criterios_exito?: string[];
}

interface Principle {
  id: string;
  name: string;
  game_phase: string;
  description?: string;
  methodology_subprinciples?: Array<{
    id: string;
    name: string;
    description?: string;
    methodology_behaviours?: Array<{
      id: string;
      description: string;
    }>;
  }>;
}

// Fase normalizada
function normalizePhase(phase: string): string {
  const norm = (phase || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

  if (norm.includes("ataque") && !norm.includes("transicion")) return "ataque";
  if (norm.includes("defensa") && !norm.includes("transicion")) return "defensa";
  if (norm.includes("transicionataquedefensa") || norm.includes("atktodef") || norm.includes("transiciondefensiva")) return "transicion_ad";
  if (norm.includes("transiciondefensaataque") || norm.includes("deftoatk") || norm.includes("transicionofensiva")) return "transicion_da";
  if (norm.includes("balonparado") || norm.includes("abp") || norm.includes("setpieces")) return "abp";
  return norm;
}

// Equivalencias de game_phase en banco_ejercicios
const PHASE_DRILL_MAP: Record<string, string[]> = {
  "ataque": [
    "attacking_build_up", "attacking_progression", "attacking_finishing", "possession",
    "juego_medio", "rondo", "Posicional", "posicional", "posesion"
  ],
  "defensa": [
    "defending", "defending_mid_block", "defending_high_press", "defensive_game"
  ],
  "transicion_ad": [
    "transition_atk_to_def", "defending_high_press"
  ],
  "transicion_da": [
    "transition_def_to_atk", "attacking_finishing", "attacking_progression"
  ],
  "abp": [
    "set_pieces", "abp", "Balón Parado"
  ]
};

// Algoritmo de compatibilidad determinista
function getCompatibleExercises(
  exercises: Exercise[],
  principle: Principle,
  stageSlug: string,
  stageCode: string
): Array<{ exercise: Exercise; score: number; matchReasons: string[] }> {
  const pPhaseNorm = normalizePhase(principle.game_phase);
  const allowedDrillPhases = PHASE_DRILL_MAP[pPhaseNorm] || [];

  // Palabras clave del principio y sus subprincipios
  const principleKeywords: string[] = [
    ...principle.name.toLowerCase().split(/\s+/),
    ...(principle.description ? principle.description.toLowerCase().split(/\s+/) : []),
    ...(principle.methodology_subprinciples?.flatMap(s => [
      ...s.name.toLowerCase().split(/\s+/),
      ...(s.description ? s.description.toLowerCase().split(/\s+/) : []),
      ...(s.methodology_behaviours?.flatMap(b => b.description.toLowerCase().split(/\s+/)) || [])
    ]) || [])
  ]
    .map(w => w.replace(/[^a-záéíóúüñ]/gi, "").trim())
    .filter(w => w.length > 4 && !["sobre", "hacia", "desde", "entre", "donde", "cuando", "mientras", "contra", "mediante"].includes(w));

  const results: Array<{ exercise: Exercise; score: number; matchReasons: string[] }> = [];

  for (const ex of exercises) {
    let score = 0;
    const matchReasons: string[] = [];

    // 1. Fase de Juego (+3)
    const exPhase = (ex.game_phase || "").toLowerCase();
    const isPhaseMatch = allowedDrillPhases.some(p => exPhase === p.toLowerCase() || exPhase.includes(p.toLowerCase()));
    
    // También buscar en tipo / tags si game_phase es null o general
    const exTagsAndType = [...(ex.tags || []), ex.tipo || "", ex.nombre || "", ...(ex.objetivo_tactico || [])].join(" ").toLowerCase();
    const isPhaseTagMatch = 
      (pPhaseNorm === "defensa" && (exTagsAndType.includes("defens") || exTagsAndType.includes("presion") || exTagsAndType.includes("recupera") || exTagsAndType.includes("duelo") || exTagsAndType.includes("basculaci"))) ||
      (pPhaseNorm === "ataque" && (exTagsAndType.includes("ataque") || exTagsAndType.includes("posesion") || exTagsAndType.includes("progresion") || exTagsAndType.includes("finalizac") || exTagsAndType.includes("salida de balon") || exTagsAndType.includes("rondo"))) ||
      (pPhaseNorm === "transicion_ad" && (exTagsAndType.includes("transicion") || exTagsAndType.includes("perdida") || exTagsAndType.includes("presion"))) ||
      (pPhaseNorm === "transicion_da" && (exTagsAndType.includes("transicion") || exTagsAndType.includes("contraataque") || exTagsAndType.includes("despliegue"))) ||
      (pPhaseNorm === "abp" && (exTagsAndType.includes("abp") || exTagsAndType.includes("corner") || exTagsAndType.includes("falta") || exTagsAndType.includes("balon parado")));

    if (isPhaseMatch) {
      score += 3;
      matchReasons.push(`Fase de juego directa: ${ex.game_phase}`);
    } else if (isPhaseTagMatch) {
      score += 2;
      matchReasons.push(`Fase compatible por tags/objetivo`);
    }

    // Si no coincide la fase en absoluto (ni por game_phase ni por tags/objetivos), no es compatible con el principio
    if (score === 0) continue;

    // 2. Etapa / Categoría de edad (+2 si coincide directamente, +1 si es general/multicategoría)
    const isExactAge = ex.age_category === stageSlug || ex.categoria_edad?.includes(stageSlug);
    const isGeneralAge = !ex.age_category || ex.age_category === "general" || (ex.categoria_edad && ex.categoria_edad.length > 2);

    if (isExactAge) {
      score += 2;
      matchReasons.push(`Categoría de edad exacta: ${stageCode}`);
    } else if (isGeneralAge) {
      score += 1;
      matchReasons.push(`Compatible transversal`);
    } else {
      // Si la tarea es de categoría superior/inferior pero la fase coincide, le damos compatibilidad formativa adaptada
      score += 0.5;
      matchReasons.push(`Adaptable a ${stageCode}`);
    }

    // 3. Coincidencia por Objetivos Tácticos / Principio (+2)
    const exTacticalText = [
      ...(ex.objetivo_tactico || []),
      ex.nombre || "",
      ex.descripcion || "",
      ...(ex.tags || [])
    ].join(" ").toLowerCase();

    let matchedKeywordCount = 0;
    for (const kw of principleKeywords) {
      if (exTacticalText.includes(kw)) {
        matchedKeywordCount++;
      }
    }

    if (matchedKeywordCount >= 2) {
      score += 2;
      matchReasons.push(`Concepto táctico afín (+${matchedKeywordCount} términos)`);
    } else if (matchedKeywordCount === 1) {
      score += 1;
      matchReasons.push(`Concepto táctico afín`);
    }

    // Umbral mínimo de compatibilidad: score >= 3
    if (score >= 3) {
      results.push({ exercise: ex, score, matchReasons });
    }
  }

  // Ordenar por puntuación descendente
  return results.sort((a, b) => b.score - a.score);
}

async function testAlgorithm() {
  const { data: exercises } = await supabase.from("banco_ejercicios").select("*");
  const { data: principles } = await supabase.from("methodology_principles").select(`
    id, name, game_phase, description,
    methodology_subprinciples (
      id, name, description,
      methodology_behaviours (
        id, description
      )
    )
  `);

  // Agrupar principios únicos por nombre (ya que hay 19 únicos replicados en los clubs)
  const uniquePrinciplesMap = new Map<string, Principle>();
  principles?.forEach(p => {
    if (!uniquePrinciplesMap.has(p.name)) {
      uniquePrinciplesMap.set(p.name, p);
    }
  });

  const uniquePrinciples = Array.from(uniquePrinciplesMap.values());
  console.log(`Total principios únicos analizados: ${uniquePrinciples.length}`);

  // Test the exact case reported: U6 -> Defensa Organizada -> "Basculación y Compactación de Bloque"
  const basculacion = uniquePrinciples.find(p => p.name.toLowerCase().includes("basculación") || p.name.toLowerCase().includes("basculacion"));
  if (basculacion) {
    const u6Drills = getCompatibleExercises(exercises || [], basculacion, "querubin", "U6");
    console.log(`\n>>> TEST REQUERIDO: U6 + Defensa Organizada + '${basculacion.name}':`);
    console.log(`Encontradas: ${u6Drills.length} tareas compatibles.`);
    u6Drills.slice(0, 5).forEach((r, idx) => {
      console.log(`  ${idx + 1}. [Score: ${r.score}] ${r.exercise.nombre} (Tipo: ${r.exercise.tipo}, Age: ${r.exercise.age_category}, Phase: ${r.exercise.game_phase})`);
      console.log(`     Motivos: ${r.matchReasons.join(", ")}`);
    });
  }

  // Test across all 19 principles for U6, U11-U12, and Senior
  const testStages = [
    { code: "U6", slug: "querubin" },
    { code: "U11-U12", slug: "alevin" },
    { code: "Senior", slug: "senior" }
  ];

  for (const st of testStages) {
    console.log(`\n================================================================`);
    console.log(`RESULTADOS PARA ETAPA ${st.code}:`);
    console.log(`================================================================`);
    for (const pr of uniquePrinciples) {
      const matched = getCompatibleExercises(exercises || [], pr, st.slug, st.code);
      console.log(`- [${pr.game_phase}] ${pr.name} => ${matched.length} tareas compatibles`);
    }
  }
}

testAlgorithm().catch(console.error);
