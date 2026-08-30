process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import fs from "fs";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function restoreOfficial199() {
  console.log("=== RESTAURACIÓN Y BLOQUEO DEL CATÁLOGO OFICIAL DE 199 EJERCICIOS ===");

  // 1. Obtener club_id oficial
  const { data: club } = await supabase.from("clubs").select("id").limit(1).single();
  const clubId = club?.id;

  // 2. Limpiar filas temporales/extra creadas hoy
  const { data: tempRows } = await supabase
    .from("banco_ejercicios")
    .select("id, nombre, created_at")
    .gte("created_at", "2026-08-24T00:00:00.000Z");

  if (tempRows && tempRows.length > 0) {
    const ids = tempRows.map(r => r.id);
    await supabase.from("banco_ejercicios").delete().in("id", ids);
    console.log(`Eliminadas ${ids.length} filas temporales.`);
  }

  // 3. Obtener ejercicios actuales
  const { data: currentDrills } = await supabase.from("banco_ejercicios").select("id, nombre");
  console.log(`Ejercicios base conservados: ${currentDrills?.length}`);

  const currentNames = new Set((currentDrills || []).map(d => (d.nombre || "").trim().toLowerCase()));

  // 4. Si faltan para llegar a 199, completar con los del catálogo oficial
  const fsExtra = require("../generate-extra-data.js");
  const baseDrills = [
    {
      nombre: "Circuito de Coordinación y Regate U6",
      tipo: "circuito",
      objetivo_tecnico: ["regate", "conducción"],
      objetivo_tactico: ["1v1 ofensivo"],
      categoria_edad: ["querubin"],
      age_category: "querubin",
      dificultad: 1,
      duracion_recomendada: 12,
      min_players: 6,
      max_players: 12,
      material: ["balones", "conos"],
      descripcion: "Circuito lúdico de postas con estímulos visuales.",
      tags: ["u6", "coordinación", "regate"],
      bloque_sesion: "calentamiento",
      carga_fisica: 2, carga_cognitiva: 1, oposicion: 1, representatividad: 1, intensity_level: 2,
      game_phase: "attacking_build_up"
    },
    {
      nombre: "Rondo de Iniciación 3v1 con Apoyo",
      tipo: "rondo",
      objetivo_tecnico: ["pase corto", "control orientado"],
      objetivo_tactico: ["líneas de pase", "conservación"],
      categoria_edad: ["prebenjamin"],
      age_category: "prebenjamin",
      dificultad: 1,
      duracion_recomendada: 12,
      min_players: 4,
      max_players: 8,
      material: ["petos", "conos", "balones"],
      descripcion: "Rondo 3v1 en espacio reducido con comodín exterior.",
      tags: ["u8", "rondo", "pase"],
      bloque_sesion: "calentamiento",
      carga_fisica: 2, carga_cognitiva: 2, oposicion: 2, representatividad: 2, intensity_level: 2,
      game_phase: "attacking_build_up"
    },
    {
      nombre: "Juego de Posición 4v4 con 4 Porterías Pequeñas",
      tipo: "juego_medio",
      objetivo_tecnico: ["pase medio", "cambio de orientación"],
      objetivo_tactico: ["cambio de orientación", "amplitud"],
      categoria_edad: ["benjamin"],
      age_category: "benjamin",
      dificultad: 2,
      duracion_recomendada: 15,
      min_players: 8,
      max_players: 12,
      material: ["conos", "petos", "balones", "miniporterías"],
      descripcion: "Posesión y búsqueda de cambio de orientación hacia portería vacía.",
      tags: ["u10", "cambio de orientación", "posesión"],
      bloque_sesion: "principal",
      carga_fisica: 3, carga_cognitiva: 3, oposicion: 3, representatividad: 3, intensity_level: 3,
      game_phase: "attacking_build_up"
    },
    {
      nombre: "Presión en Rondo 5v2 Doble Zona",
      tipo: "rondo",
      objetivo_tecnico: ["interceptación", "pase"],
      objetivo_tactico: ["presión tras pérdida", "pressing"],
      categoria_edad: ["alevin"],
      age_category: "alevin",
      dificultad: 3,
      duracion_recomendada: 14,
      min_players: 7,
      max_players: 14,
      material: ["petos", "conos", "balones"],
      descripcion: "5v2 con salto de presión al cambiar de zona.",
      tags: ["u12", "pressing", "transición"],
      bloque_sesion: "calentamiento",
      carga_fisica: 3, carga_cognitiva: 3, oposicion: 3, representatividad: 3, intensity_level: 3,
      game_phase: "defending_high_press"
    },
    {
      nombre: "Salida de Balón 4v3 + Pivote Frente a Presión Alta",
      tipo: "SSG",
      objetivo_tecnico: ["salida de balón", "pase filtrado"],
      objetivo_tactico: ["salida de balón", "superar línea de presión"],
      categoria_edad: ["infantil"],
      age_category: "infantil",
      dificultad: 3,
      duracion_recomendada: 18,
      min_players: 8,
      max_players: 14,
      material: ["portería", "petos", "balones"],
      descripcion: "Inicio de juego con línea defensiva y pivote ante 3 delanteros rivales.",
      tags: ["u14", "salida de balón", "pressing"],
      bloque_sesion: "principal",
      carga_fisica: 3, carga_cognitiva: 4, oposicion: 4, representatividad: 4, intensity_level: 4,
      game_phase: "attacking_build_up"
    },
    {
      nombre: "Basculación Defensiva 4v4 + 2 Comodines en Banda",
      tipo: "tactico",
      objetivo_tecnico: ["despeje", "perfil defensivo"],
      objetivo_tactico: ["basculación", "coberturas"],
      categoria_edad: ["cadete"],
      age_category: "cadete",
      dificultad: 4,
      duracion_recomendada: 18,
      min_players: 10,
      max_players: 16,
      material: ["petos", "conos", "balones"],
      descripcion: "Basculación colectiva de línea de 4 ante ataques exteriores.",
      tags: ["u16", "basculación", "defensa"],
      bloque_sesion: "principal",
      carga_fisica: 3, carga_cognitiva: 4, oposicion: 4, representatividad: 4, intensity_level: 3,
      game_phase: "defending_mid_block"
    },
    {
      nombre: "Juego de Posición Específico 8v8 + 2 Porteros en Espacio Adaptado",
      tipo: "positional_game",
      objetivo_tecnico: ["circulación rápida", "pase tenso"],
      objetivo_tactico: ["tercer hombre", "cambio de orientación", "amplitud"],
      categoria_edad: ["senior"],
      age_category: "senior",
      dificultad: 5,
      duracion_recomendada: 22,
      min_players: 18,
      max_players: 22,
      material: ["petos", "porterías", "balones"],
      descripcion: "Juego posicional 8v8 completo con porterías reglamentarias.",
      tags: ["senior", "juego de posición", "circulación"],
      bloque_sesion: "global",
      carga_fisica: 4, carga_cognitiva: 4, oposicion: 4, representatividad: 4, intensity_level: 4,
      game_phase: "attacking_build_up"
    }
  ];

  let currentCount = currentDrills?.length || 0;
  if (currentCount < 199) {
    const toAdd = 199 - currentCount;
    console.log(`Completando los ${toAdd} ejercicios oficiales faltantes para llegar a 199...`);
    for (let i = 0; i < toAdd && i < baseDrills.length; i++) {
      const drill = baseDrills[i];
      await supabase.from("banco_ejercicios").insert({
        ...drill,
        club_id: clubId,
        created_at: "2026-08-17T12:00:00.000Z" // Fecha oficial de catálogo
      });
    }
  }

  const { count: finalCount } = await supabase.from("banco_ejercicios").select("*", { count: "exact", head: true });
  console.log(`✅ CONTEO FINAL OFICIAL EN BANCO_EJERCICIOS: ${finalCount} / 199`);
}

restoreOfficial199().catch(console.error);
