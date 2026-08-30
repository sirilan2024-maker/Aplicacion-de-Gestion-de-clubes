process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const CLUB_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

async function adjustCooldowns() {
  await supabase
    .from("banco_ejercicios")
    .update({ oposicion: 1 })
    .in("id", ["59a94792-43ea-43a3-aea2-43ea141b4a1b", "9a32c3b0-158c-428f-b49b-24d9dca16a7d"]);

  const additionalCooldown = {
    club_id: CLUB_ID,
    nombre: "Estiramientos Guiados en Círculo y Descompresión Lumbar con Respiración Diafragmática",
    tipo: "Analítico",
    descripcion: "Estiramientos estáticos guiados por el preparador/entrenador incidiendo en isquiotibiales, cuádriceps y zona lumbar, con pautas de respiración diafragmática.",
    correcciones: "Postura correcta, relajación, no forzar articulaciones.",
    objetivo_tactico: ["flexibilidad", "descompresión neuromuscular"],
    objetivo_tecnico: ["estiramiento estático", "control postural"],
    categoria_edad: ["benjamin", "alevin", "infantil", "cadete", "juvenil", "senior"],
    age_category: "senior",
    dificultad: 1,
    duracion_recomendada: 10,
    min_players: 8,
    max_players: 26,
    material: ["esterillas opcionales"],
    variantes: ["Estiramientos en parejas"],
    tags: ["vuelta_calma", "estiramientos", "regenerativo"],
    bloque_sesion: "vuelta_calma",
    carga_fisica: 1,
    carga_cognitiva: 1,
    oposicion: 1,
    representatividad: 1,
    intensity_level: 1,
    game_phase: "attacking_build_up",
    drill_structure: "analytical",
    espacio: "Medio campo",
    criterios_exito: ["Relajación muscular y vuelta a la calma"],
    principle_id: null
  };

  await supabase.from("banco_ejercicios").insert(additionalCooldown);
  console.log("Ajuste de vuelta a la calma completado.");
}

adjustCooldowns();
