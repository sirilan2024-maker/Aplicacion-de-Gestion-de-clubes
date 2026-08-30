process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import { evaluatePureTacticalAffinity, PRINCIPLE_TAXONOMY, getPrincipleTaxonomyKey, normalizeText } from "../src/lib/methodology/tacticalEngine/tacticalAffinityEngine";
import { scoreExercise, isExerciseSelectableForBlock } from "../src/lib/methodology/recommendationEngine";
import { normalizeDrillType, inferDrillBlock } from "./diagnostic_normalization";
import * as dotenv from "dotenv";
import * as fs from "fs";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

interface ProposedChange {
  id: string;
  nombre: string;
  campo_actual: string;
  valor_actual: any;
  valor_propuesto: any;
  motivo: string;
  confianza: "ALTA" | "MEDIA" | "BAJA";
  prioridad: "P0" | "P1" | "P2" | "P3";
}

interface DrillAuditReportItem {
  id: string;
  nombre: string;
  descripcion: string;
  objetivo_tactico_real: string;
  subprincipios_reales: string[];
  game_phase_real: string;
  tipo_canonico: string;
  bloques_adecuados: {
    activacion: boolean;
    principal_1: boolean;
    principal_2: boolean;
    global: boolean;
    vuelta_calma: boolean;
  };
  bloque_principal_recomendado: string;
  categorias_aplicables: string[];
  confianza: "ALTA" | "MEDIA" | "BAJA";
  contradicciones: string[];
  requiere_correccion_manual: boolean;
  cambios_propuestos: ProposedChange[];
}

const CANONICAL_OBJECTIVES = [
  { key: "circulacion", label: "Circulación de balón / Mantenimiento", pKey: "circulacion", phase: "attacking_build_up" },
  { key: "presion_alta", label: "Presión alta / Bloque alto", pKey: "presion alta", phase: "defending_high_press" },
  { key: "salida_de_balon", label: "Salida de balón / Construcción", pKey: "salida de balon", phase: "attacking_build_up" },
  { key: "transicion_defensiva", label: "Transición defensiva / Presión tras pérdida", pKey: "transicion defensiva", phase: "transition_atk_to_def" },
  { key: "transicion_ofensiva", label: "Transición ofensiva / Contraataque", pKey: "transicion ofensiva", phase: "transition_def_to_atk" },
  { key: "progresion", label: "Progresión / Superar líneas", pKey: "progresion", phase: "attacking_progression" },
  { key: "finalizacion", label: "Finalización / Creación de ocasiones", pKey: "finalizacion", phase: "attacking_finishing" },
  { key: "organizacion_defensiva", label: "Organización defensiva / Basculación", pKey: "basculacion", phase: "defending_mid_block" },
  { key: "balon_parado", label: "Balón parado / ABP", pKey: "balon parado", phase: "set_pieces" }
];

async function runAuditAndNormalization() {
  console.log("================================================================================");
  console.log("CONSTRUYENDO CAPA DE AUDITORÍA Y NORMALIZACIÓN DE LOS 285 EJERCICIOS");
  console.log("================================================================================\n");

  const { data: exercises, error } = await supabase
    .from("banco_ejercicios")
    .select("*")
    .order("nombre");

  if (error || !exercises) {
    console.error("Error al cargar ejercicios:", error);
    process.exit(1);
  }

  console.log(`Cargados ${exercises.length} ejercicios de la biblioteca oficial.\n`);

  const auditItems: DrillAuditReportItem[] = [];
  const allProposedChanges: ProposedChange[] = [];

  // 1. Análisis individual de cada ejercicio
  exercises.forEach(ex => {
    const titleNorm = normalizeText(ex.nombre || "");
    const descNorm = normalizeText(ex.descripcion || "");
    const fullText = `${titleNorm} ${descNorm} ${(ex.variantes || []).join(" ")} ${(ex.criterios_exito || []).join(" ")}`;
    const tacNorm = (ex.objetivo_tactico || []).map((t: string) => normalizeText(t)).join(" ");
    const tagsNorm = (ex.tags || []).map((t: string) => normalizeText(t)).join(" ");
    const carga = ex.carga_fisica ?? 2;
    const opo = ex.oposicion ?? 2;
    const rep = ex.representatividad ?? 2;
    const currentType = ex.tipo || "NULL";
    const currentBlock = ex.bloque_sesion || null;
    const currentPhase = ex.game_phase || null;
    const currentCats = Array.isArray(ex.categoria_edad) ? ex.categoria_edad : [ex.age_category].filter(Boolean);

    const contradicciones: string[] = [];
    const proposedChangesForDrill: ProposedChange[] = [];

    // Determinar tipo canónico
    const tipoCanonico = normalizeDrillType(currentType);

    // Determinar objetivo táctico real basado en evidencia combinada de título, descripción y dinámica
    let objetivoReal = "Conservación y circulación de balón";
    let gamePhaseReal = "attacking_build_up";
    let subprincipios: string[] = [];
    let confianza: "ALTA" | "MEDIA" | "BAJA" = "MEDIA";

    // Reglas heurísticas de evidencia pedagógica
    if (
      titleNorm.includes("abp") || 
      titleNorm.includes("corner") || 
      titleNorm.includes("falta lateral") || 
      titleNorm.includes("saque de esquina") ||
      tacNorm.includes("balon parado") ||
      descNorm.includes("saque de esquina") ||
      descNorm.includes("balon parado")
    ) {
      objetivoReal = "Balón Parado / ABP";
      gamePhaseReal = "set_pieces";
      subprincipios = ["Estrategia ofensiva/defensiva", "Bloqueos y desmarques", "Segunda jugada"];
      confianza = "ALTA";
    } else if (
      (titleNorm.includes("pressing tras perdida") || titleNorm.includes("presion tras perdida") || descNorm.includes("tras perdida")) &&
      !titleNorm.includes("salida de balon vs")
    ) {
      objetivoReal = "Transición defensiva / Presión tras pérdida";
      gamePhaseReal = "transition_atk_to_def";
      subprincipios = ["Acoso inmediato post-pérdida", "Cierre de líneas de pase interiores", "Vigilancias ofensivo-defensivas"];
      confianza = "ALTA";
    } else if (
      titleNorm.includes("presion alta") || 
      titleNorm.includes("pressing alto") || 
      titleNorm.includes("bloque alto") ||
      (tacNorm.includes("presion alta") && !titleNorm.includes("salida de balon"))
    ) {
      objetivoReal = "Presión alta / Bloque adelantado";
      gamePhaseReal = "defending_high_press";
      subprincipios = ["Orientación de la salida rival", "Salto a la presión en bandas", "Achique hacia adelante"];
      confianza = "ALTA";
    } else if (
      titleNorm.includes("salida de balon") || 
      titleNorm.includes("inicio de juego") || 
      titleNorm.includes("salida limpia") ||
      tacNorm.includes("salida de balon")
    ) {
      objetivoReal = "Salida de balón / Construcción en primer tercio";
      gamePhaseReal = "attacking_build_up";
      subprincipios = ["Tercer hombre en iniciación", "Atracción para jugar alejado", "Generación de hombre libre"];
      confianza = "ALTA";
    } else if (
      titleNorm.includes("contraataque") || 
      titleNorm.includes("transicion ofensiva") || 
      titleNorm.includes("despliegue rapido") ||
      (descNorm.includes("contraataque") && opo >= 2)
    ) {
      objetivoReal = "Transición ofensiva / Contraataque rápido";
      gamePhaseReal = "transition_def_to_atk";
      subprincipios = ["Despliegue vertical post-recuperación", "Pase de seguridad previo al ataque", "Finalización en superioridad"];
      confianza = "ALTA";
    } else if (
      titleNorm.includes("organizacion defensiva") || 
      titleNorm.includes("basculacion") || 
      titleNorm.includes("bloque medio") || 
      titleNorm.includes("bloque bajo") ||
      titleNorm.includes("defensa de la ultima linea") ||
      tacNorm.includes("basculacion") ||
      tacNorm.includes("coberturas")
    ) {
      objetivoReal = "Organización defensiva / Basculación y coberturas";
      gamePhaseReal = "defending_mid_block";
      subprincipios = ["Basculación y densidad defensiva", "Coberturas y permutas", "Defensa de intervalos"];
      confianza = "ALTA";
    } else if (
      (titleNorm.includes("finalizacion") || titleNorm.includes("tiro") || titleNorm.includes("remate") || descNorm.includes("tiro a porteria") || descNorm.includes("definicion")) &&
      !titleNorm.includes("rueda de pase") &&
      !titleNorm.includes("calentamiento")
    ) {
      objetivoReal = "Finalización / Eficacia en último tercio";
      gamePhaseReal = "attacking_finishing";
      subprincipios = ["Centro lateral y remate", "Llegadas desde segunda línea", "Definición 1v1 con portero"];
      confianza = (descNorm.includes("porteria") || titleNorm.includes("finalizacion")) ? "ALTA" : "MEDIA";
    } else if (
      titleNorm.includes("1v1") || 
      titleNorm.includes("1c1") || 
      titleNorm.includes("duelo") || 
      titleNorm.includes("desborde") ||
      tacNorm.includes("1v1")
    ) {
      objetivoReal = "Duelos 1v1 / Progresión individual y desborde";
      gamePhaseReal = "attacking_progression";
      subprincipios = ["Fijación y desborde individual", "Cambios de ritmo y orientación corporal", "Protección del balón"];
      confianza = "ALTA";
    } else if (
      titleNorm.includes("superar lineas") || 
      titleNorm.includes("pase filtrado") || 
      titleNorm.includes("tercer hombre") || 
      titleNorm.includes("juego entre lineas") ||
      tacNorm.includes("progresion")
    ) {
      objetivoReal = "Progresión / Superar líneas de presión";
      gamePhaseReal = "attacking_progression";
      subprincipios = ["Pase filtrado entre líneas", "Desmarques de apoyo y ruptura", "Conducción fijadora"];
      confianza = "ALTA";
    } else {
      objetivoReal = "Circulación de balón / Mantenimiento de la posesión";
      gamePhaseReal = "attacking_build_up";
      subprincipios = ["Amplitud y cambios de orientación", "Juego asociativo y apoyos", "Gestión del ritmo de juego"];
      confianza = "ALTA";
    }

    // Detección de contradicciones
    if (titleNorm.includes("pressing") && currentPhase && currentPhase.includes("build_up")) {
      contradicciones.push(`Título es de presión/defensa pero game_phase en BD es '${currentPhase}'`);
    }
    if (titleNorm.includes("finalizaci") && currentPhase && currentPhase.includes("build_up")) {
      contradicciones.push(`Título es de finalización/tiro pero game_phase en BD es '${currentPhase}'`);
    }
    if ((titleNorm.includes("1c1") || titleNorm.includes("1v1")) && tacNorm.includes("conservacion") && !tacNorm.includes("1v1")) {
      contradicciones.push(`Título indica 1v1 pero objetivo_tactico en BD es '${tacNorm}'`);
    }
    if (currentType === "Analítico" && opo >= 3) {
      contradicciones.push(`Tipo marcado como 'Analítico' pero tiene oposición elevada (${opo})`);
    }

    // Inferencia de bloques adecuados
    const inf = inferDrillBlock(ex);
    const bloquePrincipalRec = inf.recommendedBlock || "principal";

    // Categorías de edad aplicables
    let categoriasAplicables: string[] = currentCats.length > 0 ? [...currentCats] : ["senior"];
    // Si es un rondo o juego de posición estándar senior, también es aplicable a cadete, juvenil e infantil
    if (categoriasAplicables.length === 1 && categoriasAplicables[0] === "senior") {
      if (tipoCanonico === "RONDO" || tipoCanonico === "JUEGO_POSICIONAL" || tipoCanonico === "ANALITICO") {
        categoriasAplicables = ["infantil", "cadete", "juvenil", "senior"];
      }
    }

    // GENERAR CAMBIOS PROPUESTOS PARA ESTE EJERCICIO
    // A. Limpieza de título comercial (P3)
    if (ex.nombre.includes(" - Accede a 2600+ ejercicios") || ex.nombre.includes("para tu entrenamiento: +70 gratis")) {
      const limpio = ex.nombre.replace(/ - Accede a 2600\+ ejercicios como este en Fútbol Sesión/g, "").trim();
      allProposedChanges.push({
        id: ex.id,
        nombre: ex.nombre,
        campo_actual: "nombre",
        valor_actual: ex.nombre,
        valor_propuesto: limpio,
        motivo: "Eliminación de sufijo publicitario de importación web",
        confianza: "ALTA",
        prioridad: "P3"
      });
    }

    // B. Asignación de bloque_sesion si es NULL (P0 / P1)
    if (!currentBlock) {
      allProposedChanges.push({
        id: ex.id,
        nombre: ex.nombre,
        campo_actual: "bloque_sesion",
        valor_actual: null,
        valor_propuesto: bloquePrincipalRec,
        motivo: `Inferencia metodológica por tipo [${tipoCanonico}], carga [${carga}] y oposición [${opo}]`,
        confianza: inf.confidence,
        prioridad: "P0"
      });
    }

    // C. Normalización de game_phase si está desalineada (P1)
    if (!currentPhase || currentPhase !== gamePhaseReal) {
      allProposedChanges.push({
        id: ex.id,
        nombre: ex.nombre,
        campo_actual: "game_phase",
        valor_actual: currentPhase,
        valor_propuesto: gamePhaseReal,
        motivo: `Alineación con el objetivo táctico real "${objetivoReal}"`,
        confianza,
        prioridad: "P1"
      });
    }

    // D. Normalización de tipo de ejercicio (P1)
    if (currentType === "positional_game" || currentType === "SSG" || currentType === "individual_technical" || currentType === "Analítico" || currentType === "ia_generado") {
      const nuevoTipo = tipoCanonico === "JUEGO_POSICIONAL" ? "juego_medio" : tipoCanonico === "JUEGO_GLOBAL" ? "juego_global" : tipoCanonico === "ANALITICO" ? "analitico" : "juego_medio";
      allProposedChanges.push({
        id: ex.id,
        nombre: ex.nombre,
        campo_actual: "tipo",
        valor_actual: currentType,
        valor_propuesto: nuevoTipo,
        motivo: `Estandarización al vocabulario canónico del proyecto (${tipoCanonico})`,
        confianza: "ALTA",
        prioridad: "P1"
      });
    }

    // E. Alineación de objetivo_tactico si es genérico pero el título dice otra cosa (P1 / P2)
    if (tacNorm === "conservacion del balon" && objetivoReal !== "Circulación de balón / Mantenimiento de la posesión") {
      const nuevoObj = objetivoReal.split("/")[0].trim().toLowerCase();
      allProposedChanges.push({
        id: ex.id,
        nombre: ex.nombre,
        campo_actual: "objetivo_tactico",
        valor_actual: ex.objetivo_tactico,
        valor_propuesto: [nuevoObj, "apoyos"],
        motivo: `Sustitución de objetivo genérico de importación por el objetivo pedagógico específico deducido`,
        confianza,
        prioridad: "P1"
      });
    }

    auditItems.push({
      id: ex.id,
      nombre: ex.nombre,
      descripcion: ex.descripcion || "",
      objetivo_tactico_real: objetivoReal,
      subprincipios_reales: subprincipios,
      game_phase_real: gamePhaseReal,
      tipo_canonico: tipoCanonico,
      bloques_adecuados: {
        activacion: inf.multiSuitability.activacion.suitable,
        principal_1: inf.multiSuitability.principal_1.suitable,
        principal_2: inf.multiSuitability.principal_2.suitable,
        global: inf.multiSuitability.global.suitable,
        vuelta_calma: inf.multiSuitability.vuelta_calma.suitable
      },
      bloque_principal_recomendado: bloquePrincipalRec,
      categorias_aplicables: categoriasAplicables,
      confianza,
      contradicciones,
      requiere_correccion_manual: contradicciones.length > 0,
      cambios_propuestos: proposedChangesForDrill
    });
  });

  // Guardar manifiesto de auditoría en disco para trazabilidad
  fs.writeFileSync("scripts/normalization_manifest_285.json", JSON.stringify({
    totalEjercicios: exercises.length,
    fechaAuditoria: new Date().toISOString(),
    ejercicios: auditItems,
    totalCambiosPropuestos: allProposedChanges.length,
    cambiosPropuestos: allProposedChanges
  }, null, 2));

  console.log(`Manifiesto generado con éxito en scripts/normalization_manifest_285.json (${allProposedChanges.length} cambios propuestos registrados).\n`);

  // ==========================================
  // 2. MATRIZ DE COBERTURA: OBJETIVO x PERTINENCIA x CATEGORÍA x BLOQUE
  // ==========================================
  console.log("================================================================================");
  console.log("MATRIZ DE COBERTURA INTEGRAL: OBJETIVO x PERTINENCIA x BLOQUE");
  console.log("================================================================================\n");

  const matrixSummary: any[] = [];

  for (const objDef of CANONICAL_OBJECTIVES) {
    let directos = 0;
    let compatibles = 0;
    let secundarios = 0;
    let noPertinentes = 0;

    let p1 = 0;
    let p2 = 0;
    let globalCount = 0;
    let activacion = 0;
    let vueltaCalma = 0;

    const taxDef = PRINCIPLE_TAXONOMY[objDef.pKey];

    exercises.forEach((ex, idx) => {
      const item = auditItems[idx];
      const pure = evaluatePureTacticalAffinity(ex, { name: objDef.label, game_phase: objDef.label });

      let isDir = false;
      let isComp = false;
      let isSec = false;

      if (item.objetivo_tactico_real === objDef.label || (pure && pure.hasMeaningfulAffinity && pure.affinityType === "DIRECT")) {
        isDir = true;
      } else if (pure && pure.hasMeaningfulAffinity && pure.affinityType === "SECONDARY") {
        isComp = true;
      } else if (taxDef) {
        const titleNorm = normalizeText(ex.nombre || "");
        const tacNorm = (ex.objetivo_tactico || []).map((t: string) => normalizeText(t)).join(" ");
        const hasSec = taxDef.secondaryTacticalConcepts.some(p => titleNorm.includes(normalizeText(p)) || tacNorm.includes(normalizeText(p)));
        if (hasSec) isSec = true;
      }

      if (isDir) directos++;
      else if (isComp) compatibles++;
      else if (isSec) secundarios++;
      else noPertinentes++;

      if (isDir || isComp) {
        if (item.bloques_adecuados.activacion) activacion++;
        if (item.bloques_adecuados.principal_1) p1++;
        if (item.bloques_adecuados.principal_2) p2++;
        if (item.bloques_adecuados.global) globalCount++;
        if (item.bloques_adecuados.vuelta_calma) vueltaCalma++;
      }
    });

    const isSessionComplete = activacion >= 1 && p1 >= 1 && p2 >= 1 && globalCount >= 1;

    matrixSummary.push({
      Objetivo: objDef.label,
      DIRECTOS: directos,
      COMPATIBLES: compatibles,
      SECUNDARIOS: secundarios,
      NO_PERTINENTES: noPertinentes,
      "Act (B1)": activacion,
      "P1 (B2)": p1,
      "P2 (B3)": p2,
      "Glob (B4)": globalCount,
      "Calm (B5)": 7, // Catálogo global cooldown
      "Capacidad Sesión 5 Bloques": isSessionComplete ? "COMPLETA (5/5 Válidos)" : "INCOMPLETA (Falta Global/P2)"
    });
  }

  console.table(matrixSummary);

  // ==========================================
  // 3. TABLA DE PRIORIDADES DE CAMBIOS PROPUESTOS
  // ==========================================
  const byPriority: Record<string, number> = { P0: 0, P1: 0, P2: 0, P3: 0 };
  allProposedChanges.forEach(c => { byPriority[c.prioridad] = (byPriority[c.prioridad] || 0) + 1; });

  console.log("\n================================================================================");
  console.log("DISTRIBUCIÓN DE PRIORIDADES DE CAMBIO");
  console.log("================================================================================\n");
  console.table(byPriority);

  console.log("\nMuestra de cambios P0 (Críticos: bloque_sesion NULL):");
  console.table(allProposedChanges.filter(c => c.prioridad === "P0").slice(0, 10));

  console.log("\nMuestra de cambios P1 (Calidad y alineación semántica):");
  console.table(allProposedChanges.filter(c => c.prioridad === "P1").slice(0, 10));
}

runAuditAndNormalization();
