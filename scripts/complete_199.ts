process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

const legacyTen = [
  {
    nombre: 'Curso de coordinación del regate', tipo: 'circuito', 
    objetivo_tecnico: ['técnica de tiro', 'técnica en el salto', 'control de balón', 'regates', 'fintas'], 
    objetivo_tactico: ['comportamiento 1 contra 1'], 
    duracion_recomendada: 20, 
    material: ['12 conos', '10 postes', '3 vallas', 'balones'], 
    descripcion: 'Circuito coordinativo y técnico de 17 estaciones.', 
    categoria_edad: ['prebenjamin', 'benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'],
    age_category: 'alevin',
    tags: ['coordinación', 'regate', 'circuito'],
    dificultad: 3,
    bloque_sesion: 'calentamiento',
    game_phase: 'general'
  },
  {
    nombre: 'ESTRELLA DEL ENGAÑO', tipo: 'analitico', 
    objetivo_tecnico: ['control de balón', 'regates', 'fintas'], 
    objetivo_tactico: ['toma de decisión individual'], 
    duracion_recomendada: 15, 
    material: ['1 poste', '5 conos de colores', '1 balón'], 
    descripcion: 'El jugador realiza una conducción directa hacia el poste central...', 
    categoria_edad: ['prebenjamin', 'benjamin', 'alevin', 'infantil'],
    age_category: 'benjamin',
    tags: ['fintas', 'conducción', 'reacción'],
    dificultad: 1,
    bloque_sesion: 'calentamiento',
    game_phase: 'general'
  },
  {
    nombre: 'Pase en Triángulo', tipo: 'globalizacion', 
    objetivo_tecnico: ['pases cortos', 'control de balón', 'regates'], 
    objetivo_tactico: ['desmarque', 'triangulación'], 
    duracion_recomendada: 20, 
    material: ['conos', 'maniquíes', 'balones'], 
    descripcion: 'Circulación de balón en estructura triangular. A pasa a B...', 
    categoria_edad: ['benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'],
    age_category: 'alevin',
    tags: ['pases', 'triangulación', 'desmarque'],
    dificultad: 1,
    bloque_sesion: 'principal',
    game_phase: 'attacking_build_up'
  },
  {
    nombre: 'Carrera de presión', tipo: 'SSG', 
    objetivo_tecnico: ['pases cortos', 'paredes', 'combinaciones'], 
    objetivo_tactico: ['Pressing', 'superioridad numérica'], 
    duracion_recomendada: 20, 
    material: ['conos', 'balones'], 
    descripcion: 'Juego de posesión 5v3 o 4v2 en subcampos...', 
    categoria_edad: ['infantil', 'cadete', 'juvenil'],
    age_category: 'infantil',
    tags: ['pressing', 'posesión', 'transición'],
    dificultad: 3,
    bloque_sesion: 'principal',
    game_phase: 'defending'
  },
  {
    nombre: 'Calentamiento Brasileño', tipo: 'calentamiento', 
    objetivo_tecnico: ['coordinación motriz'], 
    objetivo_tactico: ['cohesión grupal'], 
    duracion_recomendada: 15, 
    material: ['4 conos'], 
    descripcion: 'Tareas de coordinación rítmica en trayecto de ida...', 
    categoria_edad: ['benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'],
    age_category: 'benjamin',
    tags: ['calentamiento', 'coordinación'],
    dificultad: 1,
    bloque_sesion: 'calentamiento',
    game_phase: 'general'
  },
  {
    nombre: 'Juego de Pilla-Pilla con Pases', tipo: 'calentamiento', 
    objetivo_tecnico: ['control de balón', 'regates', 'pase'], 
    objetivo_tactico: ['procesamiento rápido', 'anticipación'], 
    duracion_recomendada: 15, 
    material: ['conos', 'balones'], 
    descripcion: 'Cazadores intentan atrapar a jugadores que NO tienen el balón...', 
    categoria_edad: ['benjamin', 'alevin', 'infantil'],
    age_category: 'benjamin',
    tags: ['pilla-pilla', 'reacción', 'lúdico'],
    dificultad: 1,
    bloque_sesion: 'calentamiento',
    game_phase: 'general'
  },
  {
    nombre: 'Carrera en Zigzag', tipo: 'calentamiento', 
    objetivo_tecnico: ['conducción', 'fintas'], 
    objetivo_tactico: ['orientación espacial'], 
    duracion_recomendada: 15, 
    material: ['conos rojos', 'conos amarillos'], 
    descripcion: 'Dos grupos realizan zigzag simultáneo por sus colores...', 
    categoria_edad: ['benjamin', 'alevin', 'infantil', 'cadete'],
    age_category: 'alevin',
    tags: ['coordinación', 'zigzag', 'conducción'],
    dificultad: 1,
    bloque_sesion: 'calentamiento',
    game_phase: 'general'
  },
  {
    nombre: 'Coordinación con tiro al blanco', tipo: 'circuito', 
    objetivo_tecnico: ['tiro a portería', 'velocidad de movimiento'], 
    objetivo_tactico: ['procesamiento rápido', 'atención'], 
    duracion_recomendada: 25, 
    material: ['conos', '6 aros', '4 mini porterías'], 
    descripcion: 'Circuito de alta intensidad con finalización...', 
    categoria_edad: ['infantil', 'cadete', 'juvenil'],
    age_category: 'infantil',
    tags: ['velocidad', 'reacción', 'finalización'],
    dificultad: 2,
    bloque_sesion: 'principal',
    game_phase: 'attacking_finishing'
  },
  {
    nombre: 'Ejercicio de la brújula en el espejo', tipo: 'circuito', 
    objetivo_tecnico: ['desplazamiento', 'conducción'], 
    objetivo_tactico: ['procesamiento rápido', 'memoria visual'], 
    duracion_recomendada: 20, 
    material: ['14 conos de colores'], 
    descripcion: 'Tarea técnico-motriz por parejas...', 
    categoria_edad: ['benjamin', 'alevin', 'infantil', 'cadete'],
    age_category: 'alevin',
    tags: ['espejo', 'coordinación', 'cognitivo'],
    dificultad: 1,
    bloque_sesion: 'calentamiento',
    game_phase: 'general'
  },
  {
    nombre: 'Torneo 1 vs 1', tipo: 'SSG', 
    objetivo_tecnico: ['regate', 'protección de balón', 'remate'], 
    objetivo_tactico: ['uno contra uno', 'competitividad'], 
    duracion_recomendada: 15, 
    material: ['conos', 'balones', 'mini porterías'], 
    descripcion: 'Torneo por niveles (ligas). Enfrentamientos directos...', 
    categoria_edad: ['prebenjamin', 'benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'],
    age_category: 'alevin',
    tags: ['1v1', 'competitividad', 'duelos'],
    dificultad: 1,
    bloque_sesion: 'principal',
    game_phase: 'attacking_build_up'
  }
];

async function completeExact199() {
  const { data: current, count } = await supabase.from("banco_ejercicios").select("id, nombre");
  console.log(`Current count: ${count}`);

  const { data: club } = await supabase.from("clubs").select("id").limit(1).single();
  const clubId = club?.id;

  const currentNames = new Set((current || []).map(r => (r.nombre || "").trim().toLowerCase()));

  const missing = legacyTen.filter(ex => !currentNames.has(ex.nombre.trim().toLowerCase()));
  console.log(`Found ${missing.length} missing legacy drills to insert.`);

  for (const ex of missing) {
    if ((current?.length || 0) + 1 > 199) break;
    await supabase.from("banco_ejercicios").insert({
      ...ex,
      club_id: clubId,
      created_at: "2026-08-16T12:00:00.000Z" // Set official seed timestamp
    });
  }

  const { count: finalCount } = await supabase.from("banco_ejercicios").select("*", { count: "exact", head: true });
  console.log(`Final official banco_ejercicios count: ${finalCount} (target: 199)`);
}

completeExact199().catch(console.error);
