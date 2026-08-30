process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

const CATEGORIES = [
  { id: "U6", code: "U6", slug: "querubin", name: "Querubín" },
  { id: "U7-U8", code: "U7-U8", slug: "prebenjamin", name: "Prebenjamín" },
  { id: "U9-U10", code: "U9-U10", slug: "benjamin", name: "Benjamín" },
  { id: "U11-U12", code: "U11-U12", slug: "alevin", name: "Alevín" },
  { id: "U13-U14", code: "U13-U14", slug: "infantil", name: "Infantil" },
  { id: "U15-U16", code: "U15-U16", slug: "cadete", name: "Cadete" },
  { id: "U17-U19", code: "U17-U19", slug: "juvenil", name: "Juvenil" },
  { id: "Senior", code: "Senior", slug: "senior", name: "Amateur / Senior" },
];

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

const PHASE_DRILL_MAP: Record<string, string[]> = {
  "ataque": [
    "attacking_build_up", "attacking_progression", "attacking_finishing", "possession",
    "juego_medio", "rondo", "Posicional", "posicional", "posesion", "Ataque", "ataque"
  ],
  "defensa": [
    "defending", "defending_mid_block", "defending_high_press", "defensive_game", "Defensa", "defensa"
  ],
  "transicion_ad": [
    "transition_atk_to_def", "defending_high_press", "Transición Ataque-Defensa"
  ],
  "transicion_da": [
    "transition_def_to_atk", "attacking_finishing", "attacking_progression", "Transición Defensa-Ataque"
  ],
  "abp": [
    "set_pieces", "abp", "Balón Parado", "balon_parado"
  ]
};

function scoreExerciseCompatibility(
  ex: any,
  principle: any,
  stageSlug: string,
  stageCode: string
): { score: number; stageBadge: string; affinityBadge: string } | null {
  const pPhaseNorm = normalizePhase(principle.game_phase);
  const allowedDrillPhases = PHASE_DRILL_MAP[pPhaseNorm] || [];

  // 1. Coincidencia de Fase
  const exPhase = (ex.game_phase || "").toLowerCase();
  const isPhaseDirect = allowedDrillPhases.some(p => exPhase === p.toLowerCase() || exPhase.includes(p.toLowerCase()));

  const exAllText = [
    ...(ex.tags || []),
    ex.tipo || "",
    ex.nombre || "",
    ex.descripcion || "",
    ...(ex.objetivo_tactico || []),
    ...(ex.objetivo_tecnico || [])
  ].join(" ").toLowerCase();

  const isPhaseTextMatch =
    (pPhaseNorm === "defensa" && (exAllText.includes("defens") || exAllText.includes("presion") || exAllText.includes("recupera") || exAllText.includes("duelo") || exAllText.includes("basculaci") || exAllText.includes("bloque"))) ||
    (pPhaseNorm === "ataque" && (exAllText.includes("ataque") || exAllText.includes("posesion") || exAllText.includes("progresion") || exAllText.includes("finalizac") || exAllText.includes("salida de balon") || exAllText.includes("rondo") || exAllText.includes("pase"))) ||
    (pPhaseNorm === "transicion_ad" && (exAllText.includes("transicion") || exAllText.includes("perdida") || exAllText.includes("tras perdida") || exAllText.includes("presion"))) ||
    (pPhaseNorm === "transicion_da" && (exAllText.includes("transicion") || exAllText.includes("contraataque") || exAllText.includes("despliegue") || exAllText.includes("recuperacion"))) ||
    (pPhaseNorm === "abp" && (exAllText.includes("abp") || exAllText.includes("corner") || exAllText.includes("falta") || exAllText.includes("balon parado") || exAllText.includes("saque")));

  if (!isPhaseDirect && !isPhaseTextMatch) {
    return null; // No pertenece a la fase del juego
  }

  let score = isPhaseDirect ? 3 : 2;

  // 2. Coincidencia de Etapa
  const isExactAge = ex.age_category === stageSlug || ex.categoria_edad?.includes(stageSlug);
  const isGeneralAge = !ex.age_category || ex.age_category === "general" || (ex.categoria_edad && ex.categoria_edad.length > 2);

  let stageBadge = `Adaptable a ${stageCode}`;
  if (isExactAge) {
    score += 3;
    stageBadge = `Específica (${stageCode})`;
  } else if (isGeneralAge) {
    score += 2;
    stageBadge = "Compatible transversal";
  } else {
    score += 1;
  }

  // 3. Coincidencia Temática con el Principio
  const principleKeywords: string[] = [
    ...principle.name.toLowerCase().split(/\s+/),
    ...(principle.description ? principle.description.toLowerCase().split(/\s+/) : []),
    ...(principle.methodology_subprinciples?.flatMap((s: any) => [
      ...s.name.toLowerCase().split(/\s+/),
      ...(s.description ? s.description.toLowerCase().split(/\s+/) : [])
    ]) || [])
  ]
    .map(w => w.replace(/[^a-záéíóúüñ]/gi, "").trim())
    .filter(w => w.length > 4 && !["sobre", "hacia", "desde", "entre", "donde", "cuando", "mientras", "contra", "mediante"].includes(w));

  let matchedKeywords = 0;
  for (const kw of principleKeywords) {
    if (exAllText.includes(kw)) {
      matchedKeywords++;
    }
  }

  let affinityBadge = "Afinidad de Fase";
  if (matchedKeywords >= 3) {
    score += 3;
    affinityBadge = "Alta Afinidad Táctica";
  } else if (matchedKeywords >= 1) {
    score += 1.5;
    affinityBadge = "Afinidad Táctica";
  }

  return { score, stageBadge, affinityBadge };
}

async function verifyFlow() {
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

  const uniquePrinciplesMap = new Map<string, any>();
  principles?.forEach(p => {
    if (!uniquePrinciplesMap.has(p.name)) {
      uniquePrinciplesMap.set(p.name, p);
    }
  });
  const uniquePrinciples = Array.from(uniquePrinciplesMap.values());

  console.log("=== VERIFICACIÓN EXACTA DE LOS 3 CASOS REQUERIDOS ===");

  // CASO 1: U6 -> Defensa Organizada -> Basculación y Compactación de Bloque
  const p1 = uniquePrinciples.find(p => p.name.includes("Basculación"));
  const u6_basculacion = exercises
    ?.map(ex => {
      const match = scoreExerciseCompatibility(ex, p1, "querubin", "U6");
      return match ? { exercise: ex, ...match } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b!.score - a!.score);

  console.log(`\n1. U6 -> Defensa Organizada -> '${p1?.name}'`);
  console.log(`   Tareas compatibles encontradas: ${u6_basculacion?.length}`);
  console.log(`   Top 3 tareas:`);
  u6_basculacion?.slice(0, 3).forEach((t, i) => {
    console.log(`   ${i + 1}. ${t!.exercise.nombre} | ${t!.stageBadge} | ${t!.affinityBadge} (Score: ${t!.score})`);
  });

  // CASO 2: U11-U12 -> Ataque Organizado -> Circulación Rápida y Cambio de Orientación
  const p2 = uniquePrinciples.find(p => p.name.includes("Circulación Rápida"));
  const u12_circulacion = exercises
    ?.map(ex => {
      const match = scoreExerciseCompatibility(ex, p2, "alevin", "U11-U12");
      return match ? { exercise: ex, ...match } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b!.score - a!.score);

  console.log(`\n2. U11-U12 -> Ataque Organizado -> '${p2?.name}'`);
  console.log(`   Tareas compatibles encontradas: ${u12_circulacion?.length}`);
  console.log(`   Top 3 tareas:`);
  u12_circulacion?.slice(0, 3).forEach((t, i) => {
    console.log(`   ${i + 1}. ${t!.exercise.nombre} | ${t!.stageBadge} | ${t!.affinityBadge} (Score: ${t!.score})`);
  });

  // CASO 3: Senior -> Defensa Organizada -> Presión Alta
  const p3 = uniquePrinciples.find(p => p.name === "Presión Alta");
  const senior_presion = exercises
    ?.map(ex => {
      const match = scoreExerciseCompatibility(ex, p3, "senior", "Senior");
      return match ? { exercise: ex, ...match } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b!.score - a!.score);

  console.log(`\n3. Senior -> Defensa Organizada -> '${p3?.name}'`);
  console.log(`   Tareas compatibles encontradas: ${senior_presion?.length}`);
  console.log(`   Top 3 tareas:`);
  senior_presion?.slice(0, 3).forEach((t, i) => {
    console.log(`   ${i + 1}. ${t!.exercise.nombre} | ${t!.stageBadge} | ${t!.affinityBadge} (Score: ${t!.score})`);
  });
}

verifyFlow().catch(console.error);
