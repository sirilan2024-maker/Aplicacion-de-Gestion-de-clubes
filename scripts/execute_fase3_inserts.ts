process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import { normalizeText } from "../src/lib/methodology/tacticalEngine/tacticalAffinityEngine";
import * as dotenv from "dotenv";
import * as fs from "fs";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const CLUB_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

async function executePhase3Inserts() {
  console.log("================================================================================");
  console.log("EJECUTANDO FASE 3: ALTAS DE NUEVOS EJERCICIOS PARA CIERRE DE HUECOS REALES");
  console.log("================================================================================\n");

  const { data: principles } = await supabase.from("methodology_principles").select("id, name, game_phase");
  const principleMap: Record<string, string> = {};
  (principles || []).forEach(p => {
    const norm = normalizeText(p.name);
    if (norm.includes("circulac") || norm.includes("posesion")) principleMap["circulacion"] = p.id;
    if (norm.includes("finalizac")) principleMap["finalizacion"] = p.id;
    if (norm.includes("progresion")) principleMap["progresion"] = p.id;
  });

  const newDrills = [
    // --- 1. B4 GLOBAL FINALIZACIÓN (3 ejercicios) ---
    {
      club_id: CLUB_ID,
      nombre: "Partido Condicionado de Oleadas Ofensivas con Finalización en Zona de Remate (7v7+Porteros)",
      tipo: "juego_global",
      descripcion: "Partido condicionado 7v7+GKs en 60x45m. Las posesiones deben finalizarse con remate a portería antes de 8 segundos tras cruzar campo rival. Se premia la ocupación de primer y segundo palo.",
      correcciones: "Atacar el balón de primeras, desmarques en diagonal, perfil ofensivo rápido.",
      objetivo_tactico: ["finalización", "remate", "ataque a portería", "centro y remate"],
      objetivo_tecnico: ["golpeo de primeras", "remate de cabeza", "centro lateral"],
      categoria_edad: ["infantil", "cadete", "juvenil", "senior"],
      age_category: "cadete",
      dificultad: 3,
      duracion_recomendada: 20,
      min_players: 14,
      max_players: 18,
      material: ["balones", "petos", "porterías reglamentarias", "conos"],
      variantes: ["Máximo 2 toques en zona de finalización", "Gol tras centro lateral vale doble"],
      tags: ["finalizacion", "global", "remate", "metodologia"],
      bloque_sesion: "global",
      carga_fisica: 3,
      carga_cognitiva: 3,
      oposicion: 3,
      representatividad: 4,
      intensity_level: 3,
      game_phase: "attacking_finishing",
      drill_structure: "conditioned_game",
      espacio: "60x45m",
      criterios_exito: ["Remate en menos de 8 segundos", "Ocupación de 2 zonas de remate"],
      principle_id: principleMap["finalizacion"] || null
    },
    {
      club_id: CLUB_ID,
      nombre: "SSG 6v6+2 Comodines con Transición Rápida y Ocupación del Área de Remate",
      tipo: "SSG",
      descripcion: "Juego reducido 6v6 con 2 comodines ofensivos en 45x35m. Porterías reglamentarias con porteros. Búsqueda continua de tiro tras superar la línea media.",
      correcciones: "Disparar ante cualquier espacio libre, rechaces, vigilancias ofensivas.",
      objetivo_tactico: ["finalización", "tiro", "definición", "ocupación del área"],
      objetivo_tecnico: ["remate", "pase tenso", "control orientado"],
      categoria_edad: ["infantil", "cadete", "juvenil", "senior"],
      age_category: "juvenil",
      dificultad: 3,
      duracion_recomendada: 20,
      min_players: 12,
      max_players: 16,
      material: ["balones", "petos", "porterías reglamentarias"],
      variantes: ["Límite de tiempo por ataque", "Comodines solo juegan a un toque"],
      tags: ["finalizacion", "ssg", "tiro", "global"],
      bloque_sesion: "global",
      carga_fisica: 3,
      carga_cognitiva: 3,
      oposicion: 3,
      representatividad: 4,
      intensity_level: 3,
      game_phase: "attacking_finishing",
      drill_structure: "SSG",
      espacio: "45x35m",
      criterios_exito: ["Tiro a portería por posesión", "Rechace activo"],
      principle_id: principleMap["finalizacion"] || null
    },
    {
      club_id: CLUB_ID,
      nombre: "Partido de Sector 8v8 con Porterías Reglamentarias: Llegada por Banda y Remate en Último Tercio",
      tipo: "conditioned_game",
      descripcion: "Partido de 3/4 de campo 8v8. El equipo con balón debe progresar por banda para abastecer el área de remate ocupada por 3 atacantes.",
      correcciones: "Velocidad de circulación previa al centro, timing de entrada de los rematadores.",
      objetivo_tactico: ["finalización", "centro y remate", "creación de ocasiones", "remate"],
      objetivo_tecnico: ["remate al primer toque", "desmarque de ruptura"],
      categoria_edad: ["infantil", "cadete", "juvenil", "senior"],
      age_category: "senior",
      dificultad: 3,
      duracion_recomendada: 25,
      min_players: 16,
      max_players: 18,
      material: ["balones", "petos", "porterías reglamentarias", "picas"],
      variantes: ["Remate con pierna no hábil", "Defensa en repliegue intensivo"],
      tags: ["finalizacion", "global", "remate", "centros"],
      bloque_sesion: "global",
      carga_fisica: 4,
      carga_cognitiva: 3,
      oposicion: 4,
      representatividad: 4,
      intensity_level: 4,
      game_phase: "attacking_finishing",
      drill_structure: "conditioned_game",
      espacio: "3/4 campo reglamentario",
      criterios_exito: ["Mínimo 6 remates por serie", "Llegada escalonada al área"],
      principle_id: principleMap["finalizacion"] || null
    },

    // --- 2. B4 GLOBAL PROGRESIÓN / 1v1 (3 ejercicios) ---
    {
      club_id: CLUB_ID,
      nombre: "Partido Condicionado 7v7 con Zonas de Desborde 1v1 y Superación de Líneas",
      tipo: "juego_global",
      descripcion: "Partido 7v7 en 55x40m con carriles laterales reservados para situaciones de 1v1 ofensivo sin ayudas defensivas. Al superar la marca, se puede conectar con el centro.",
      correcciones: "Encarar en velocidad, finta previa, cambio de ritmo tras desborde.",
      objetivo_tactico: ["progresión", "duelos 1v1", "1 contra 1", "superar líneas", "desborde"],
      objetivo_tecnico: ["conducción fijadora", "regate", "pase filtrado"],
      categoria_edad: ["infantil", "cadete", "juvenil", "senior"],
      age_category: "cadete",
      dificultad: 3,
      duracion_recomendada: 20,
      min_players: 14,
      max_players: 16,
      material: ["balones", "petos", "conos delimitadores", "porterías"],
      variantes: ["El defensor lateral no puede salir de su zona", "Obligatorio encarar en banda"],
      tags: ["progresion", "1v1", "global", "desborde"],
      bloque_sesion: "global",
      carga_fisica: 3,
      carga_cognitiva: 3,
      oposicion: 3,
      representatividad: 4,
      intensity_level: 3,
      game_phase: "attacking_progression",
      drill_structure: "conditioned_game",
      espacio: "55x40m",
      criterios_exito: ["Superación del 1v1 en banda", "Progresión limpia"],
      principle_id: principleMap["progresion"] || null
    },
    {
      club_id: CLUB_ID,
      nombre: "SSG 6v6+1 Comodín: Conducción Fijadora y Duelos Interiores para Progresión",
      tipo: "SSG",
      descripcion: "Juego reducido 6v6+1 en 45x35m. Se divide el espacio en 3 sectores longitudinales. Para avanzar de sector es obligatorio superar mediante conducción fijadora o duelo 1v1.",
      correcciones: "Fijar al oponente para liberar compañeros, proteger el balón en el duelo.",
      objetivo_tactico: ["progresión", "superar líneas", "1v1", "hombre libre"],
      objetivo_tecnico: ["fijación de marcas", "perfil corporal", "cambio de ritmo"],
      categoria_edad: ["infantil", "cadete", "juvenil", "senior"],
      age_category: "juvenil",
      dificultad: 3,
      duracion_recomendada: 20,
      min_players: 12,
      max_players: 15,
      material: ["balones", "petos", "porterías"],
      variantes: ["Duelo 1v1 obligatorio en zona central", "Máximo 3 segundos para superar marca"],
      tags: ["progresion", "1v1", "ssg", "global"],
      bloque_sesion: "global",
      carga_fisica: 3,
      carga_cognitiva: 4,
      oposicion: 3,
      representatividad: 4,
      intensity_level: 3,
      game_phase: "attacking_progression",
      drill_structure: "SSG",
      espacio: "45x35m",
      criterios_exito: ["Superar 3 líneas por ataque", "No perder en conducción"],
      principle_id: principleMap["progresion"] || null
    },
    {
      club_id: CLUB_ID,
      nombre: "Partido de Espacios Reducidos 8v8 con Premisa de Desborde Individual Previo a Disparo",
      tipo: "conditioned_game",
      descripcion: "Partido 8v8 en 50x40m. Para que un gol sea válido, debe existir un regate, finta o superación de línea individual en los 10 metros previos al remate.",
      correcciones: "Atreverse en el 1c1, agresividad ofensiva con balón, verticalidad.",
      objetivo_tactico: ["progresión", "desborde", "1 contra 1", "1v1"],
      objetivo_tecnico: ["conducción en velocidad", "fintas", "regate"],
      categoria_edad: ["alevin", "infantil", "cadete", "juvenil", "senior"],
      age_category: "infantil",
      dificultad: 3,
      duracion_recomendada: 20,
      min_players: 14,
      max_players: 16,
      material: ["balones", "petos", "porterías reglamentarias"],
      variantes: ["Comodín por fuera para 2v1", "Puntos extras por caño o regate limpio"],
      tags: ["progresion", "1v1", "global", "desborde"],
      bloque_sesion: "global",
      carga_fisica: 3,
      carga_cognitiva: 3,
      oposicion: 3,
      representatividad: 4,
      intensity_level: 3,
      game_phase: "attacking_progression",
      drill_structure: "conditioned_game",
      espacio: "50x40m",
      criterios_exito: ["Generación de 4 situaciones de 1v1 por bloque", "Verticalidad"],
      principle_id: principleMap["progresion"] || null
    },

    // --- 3. B5 VUELTA A LA CALMA REGENERATIVA (4 ejercicios) ---
    {
      club_id: CLUB_ID,
      nombre: "Juego de Puntería y Precisión Técnica Suave en Círculo Central",
      tipo: "Analítico",
      descripcion: "Jugadores en círculo central realizan pases rasos suaves intentando golpear balones situados en el centro o mini-conos. Dinámica relajada de vuelta a la calma.",
      correcciones: "Contacto suave, relajación muscular, respiración pausada.",
      objetivo_tactico: ["precisión técnica", "descompresión"],
      objetivo_tecnico: ["pase raso suave", "control amortiguado"],
      categoria_edad: ["benjamin", "alevin", "infantil", "cadete", "juvenil", "senior"],
      age_category: "cadete",
      dificultad: 1,
      duracion_recomendada: 8,
      min_players: 8,
      max_players: 22,
      material: ["balones", "conos"],
      variantes: ["Juego de puntería en parejas", "Tiro de precisión a portería pequeña vacía"],
      tags: ["vuelta_calma", "regenerativo", "suave"],
      bloque_sesion: "vuelta_calma",
      carga_fisica: 1,
      carga_cognitiva: 1,
      oposicion: 1,
      representatividad: 1,
      intensity_level: 1,
      game_phase: "attacking_build_up",
      drill_structure: "analytical",
      espacio: "Círculo central",
      criterios_exito: ["Baja frecuencia cardíaca", "Interacción distendida"],
      principle_id: null
    },
    {
      club_id: CLUB_ID,
      nombre: "Rueda de Pases Regenerativa y Movilidad Articular en Parejas",
      tipo: "Analítico",
      descripcion: "Pases suaves a 10 metros en parejas intercalados con ejercicios de movilidad articular y estiramientos dinámicos asistidos.",
      correcciones: "Pase sin tensión, estiramiento controlado sin rebote.",
      objetivo_tactico: ["regeneración", "recuperación activa"],
      objetivo_tecnico: ["golpeo suave con interior", "estiramientos dinámicos"],
      categoria_edad: ["infantil", "cadete", "juvenil", "senior"],
      age_category: "senior",
      dificultad: 1,
      duracion_recomendada: 8,
      min_players: 10,
      max_players: 24,
      material: ["balones", "esterillas opcionales"],
      variantes: ["Pase con empeine interior a baja velocidad"],
      tags: ["vuelta_calma", "regenerativo", "estiramientos"],
      bloque_sesion: "vuelta_calma",
      carga_fisica: 1,
      carga_cognitiva: 1,
      oposicion: 1,
      representatividad: 1,
      intensity_level: 1,
      game_phase: "attacking_build_up",
      drill_structure: "analytical",
      espacio: "Medio campo libre",
      criterios_exito: ["Recuperación activa completa"],
      principle_id: null
    },
    {
      club_id: CLUB_ID,
      nombre: "Fútbol Tenis Recreativo por Parejas de Baja Intensidad",
      tipo: "Juego Lúdico",
      descripcion: "Partidos suaves de fútbol tenis 2v2 en campos de 6x4m delimitados por picas en el suelo. Ritmo relajado sin saltos de alta intensidad.",
      correcciones: "Toque fino, juego asociativo lúdico.",
      objetivo_tactico: ["coordinación lúdica", "vuelta a la calma"],
      objetivo_tecnico: ["toque sutil", "juego aéreo controlado"],
      categoria_edad: ["alevin", "infantil", "cadete", "juvenil", "senior"],
      age_category: "juvenil",
      dificultad: 1,
      duracion_recomendada: 10,
      min_players: 8,
      max_players: 20,
      material: ["balones", "picas o cintas"],
      variantes: ["Máximo 3 toques por equipo", "Obligatorio usar ambas piernas"],
      tags: ["vuelta_calma", "ludico", "futbol_tenis"],
      bloque_sesion: "vuelta_calma",
      carga_fisica: 2,
      carga_cognitiva: 1,
      oposicion: 1,
      representatividad: 1,
      intensity_level: 1,
      game_phase: "attacking_build_up",
      drill_structure: "ludic",
      espacio: "Campos de 6x4m",
      criterios_exito: ["Diversión y relajación muscular"],
      principle_id: null
    },
    {
      club_id: CLUB_ID,
      nombre: "Circuito Regenerativo con Pases a Portería Pequeña sin Oposición y Feedback Colectivo",
      tipo: "Analítico",
      descripcion: "Pase suave en progresión caminando/trotando suavemente hacia mini-porterías vacías, seguido de puesta en común y charla reflexiva.",
      correcciones: "Caminar, respirar profundo, atención a las conclusiones de la sesión.",
      objetivo_tactico: ["descarga cognitiva", "feedback del entrenador"],
      objetivo_tecnico: ["pase de seguridad", "conducción libre sin acoso"],
      categoria_edad: ["benjamin", "alevin", "infantil", "cadete", "juvenil", "senior"],
      age_category: "infantil",
      dificultad: 1,
      duracion_recomendada: 8,
      min_players: 8,
      max_players: 24,
      material: ["balones", "mini-porterías", "conos"],
      variantes: ["Pase con pie menos hábil"],
      tags: ["vuelta_calma", "feedback", "regenerativo"],
      bloque_sesion: "vuelta_calma",
      carga_fisica: 1,
      carga_cognitiva: 1,
      oposicion: 1,
      representatividad: 1,
      intensity_level: 1,
      game_phase: "attacking_build_up",
      drill_structure: "analytical",
      espacio: "Zona central",
      criterios_exito: ["Charla de cierre y estiramiento estático"],
      principle_id: null
    },

    // --- 4. FORMATIVOS LÚDICOS U6 / U8 (2 ejercicios) ---
    {
      club_id: CLUB_ID,
      nombre: "El Castillo del Dragón: Conducción y Esquiva Lúdica con Balón (U6 Querubín)",
      tipo: "Juego Lúdico",
      descripcion: "Los jugadores conducen su balón por el castillo mágico esquivando los 'fuegos del dragón' (conos) y atendiendo a las señales del entrenador.",
      correcciones: "Balón cerca del pie, levantar la cabeza, no chocar.",
      objetivo_tactico: ["psicomotricidad", "familiarización con el balón"],
      objetivo_tecnico: ["conducción con empeine", "frenadas"],
      categoria_edad: ["querubin", "prebenjamin"],
      age_category: "querubin",
      dificultad: 1,
      duracion_recomendada: 12,
      min_players: 6,
      max_players: 12,
      material: ["balones de iniciación", "conos de colores"],
      variantes: ["A la señal 'dragón despierto' todos pisan el balón"],
      tags: ["u6", "querubin", "ludico", "psicomotricidad"],
      bloque_sesion: "calentamiento",
      carga_fisica: 2,
      carga_cognitiva: 2,
      oposicion: 1,
      representatividad: 1,
      intensity_level: 2,
      game_phase: "attacking_build_up",
      drill_structure: "ludic",
      espacio: "20x15m",
      criterios_exito: ["Familiarización lúdica y sonrisas"],
      principle_id: null
    },
    {
      club_id: CLUB_ID,
      nombre: "Minipartido 3v3 con Porterías Múltiples de Conos (U8 Prebenjamín)",
      tipo: "SSG",
      descripcion: "Partido en espacio reducido 3v3 con 4 mini-porterías de conos. Se fomenta el pase al compañero desmarcado y la búsqueda de la portería libre.",
      correcciones: "Pasar al compañero libre, correr hacia adelante.",
      objetivo_tactico: ["toma de decisiones básica", "juego colectivo inicial"],
      objetivo_tecnico: ["pase", "tiro a mini-porterías"],
      categoria_edad: ["prebenjamin", "benjamin"],
      age_category: "prebenjamin",
      dificultad: 2,
      duracion_recomendada: 15,
      min_players: 6,
      max_players: 10,
      material: ["balones", "petos", "conos"],
      variantes: ["Gol solo vale si todos cruzan la mitad"],
      tags: ["u8", "prebenjamin", "ssg", "global"],
      bloque_sesion: "global",
      carga_fisica: 2,
      carga_cognitiva: 2,
      oposicion: 2,
      representatividad: 3,
      intensity_level: 2,
      game_phase: "attacking_build_up",
      drill_structure: "SSG",
      espacio: "25x20m",
      criterios_exito: ["Participación de todos los niños"],
      principle_id: null
    }
  ];

  console.log(`Insertando ${newDrills.length} nuevos ejercicios en public.banco_ejercicios...`);

  const { data: inserted, error: insertErr } = await supabase
    .from("banco_ejercicios")
    .insert(newDrills)
    .select("id, nombre, tipo, bloque_sesion, game_phase");

  if (insertErr) {
    console.error("❌ Error al insertar nuevos ejercicios:", insertErr);
    process.exit(1);
  }

  console.log(`✅ ${inserted?.length} ejercicios dados de alta con éxito en la base de datos!`);
  console.table(inserted);

  // Exportar manifiesto de Fase 3
  fs.writeFileSync("scripts/phase3_new_drills_manifest.json", JSON.stringify(inserted, null, 2));
  console.log("✅ Manifiesto de Fase 3 guardado en scripts/phase3_new_drills_manifest.json");
}

executePhase3Inserts();
