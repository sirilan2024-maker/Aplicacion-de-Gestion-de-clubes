'use server';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Genera un embedding vectorial usando la API de Gemini text-embedding-004
 * Devuelve un vector de 768 dimensiones
 */
export async function generateDrillEmbedding(text: string): Promise<number[] | null> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[Embeddings] GEMINI_API_KEY no configurada');
      return null;
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text }] },
        }),
      }
    );

    if (!response.ok) {
      console.error('[Embeddings] Error API Gemini:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.embedding?.values ?? null;
  } catch (err) {
    console.error('[Embeddings] Excepción:', err);
    return null;
  }
}

export interface DrillSearchParams {
  query: string;
  ageCategory?: string;
  microcycleDay?: string;
  minPlayers?: number;
  matchThreshold?: number;
  matchCount?: number;
}

/**
 * Búsqueda semántica híbrida de tareas en la base de datos
 */
export async function searchDrillsSemantic(params: DrillSearchParams) {
  try {
    const { query, ageCategory, microcycleDay, minPlayers, matchThreshold = 0.45, matchCount = 8 } = params;

    const embedding = await generateDrillEmbedding(query);
    if (!embedding) {
      // Fallback a búsqueda textual si no hay embeddings
      return searchDrillsTextual(params);
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc('match_drills', {
      query_embedding: embedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
      filter_category: ageCategory ?? null,
      filter_day: microcycleDay ?? null,
      filter_min_players: minPlayers ?? null,
    });

    if (error) {
      console.error('[DrillSearch] Error RPC match_drills:', error);
      return searchDrillsTextual(params);
    }

    return { success: true, data: data ?? [] };
  } catch (err: any) {
    console.error('[DrillSearch] Excepción:', err);
    return { success: false, data: [], error: err.message };
  }
}

/**
 * Búsqueda textual de fallback cuando no hay embeddings disponibles
 */
async function searchDrillsTextual(params: DrillSearchParams) {
  try {
    const supabase = createAdminClient();
    let q = supabase
      .from('banco_ejercicios')
      .select('id, nombre, tipo, descripcion, age_category, microcycle_day, game_phase, drill_structure, min_players, max_players, intensity_level, duracion_recomendada, tactical_board_data, tags, categoria_edad, objetivo_tecnico, objetivo_tactico')
      .limit(params.matchCount ?? 8);

    if (params.ageCategory) {
      q = q.or(`age_category.eq.${params.ageCategory},categoria_edad.cs.{${params.ageCategory}}`);
    }
    if (params.microcycleDay) {
      q = q.eq('microcycle_day', params.microcycleDay);
    }
    if (params.query) {
      q = q.or(`nombre.ilike.%${params.query}%,descripcion.ilike.%${params.query}%`);
    }

    const { data, error } = await q;
    if (error) throw error;

    return { success: true, data: data ?? [] };
  } catch (err: any) {
    return { success: false, data: [], error: err.message };
  }
}

/**
 * Siembra tareas arquetípicas por categoría en el banco de ejercicios
 */
export async function seedDefaultDrills(clubId: string) {
  const supabase = createAdminClient();

  const defaultDrills = [
    // ── QUERUBÍN ──────────────────────────────────────────────
    {
      club_id: clubId, nombre: 'Circuito de Psicomotricidad "El Zoo"', tipo: 'ludico',
      descripcion: 'Los niños imitan a diferentes animales al desplazarse: saltan como canguros, gatean como leones y corren como caballos por un circuito delimitado con conos de colores. Actividad 100% lúdica y libre.',
      age_category: 'querubin', microcycle_day: 'MD_minus_3', game_phase: 'motor_coordination',
      drill_structure: 'ludic_motor_circuit', min_players: 6, max_players: 20, intensity_level: 1,
      duracion_recomendada: 12, categoria_edad: ['prebenjamin'],
      objetivo_tecnico: ['coordinación motriz', 'psicomotricidad'],
      objetivo_tactico: [], material: ['conos de colores'], tags: ['querubin', 'psicomotricidad'],
      tactical_board_data: {
        pitchType: 'third',
        cones: [
          { id: 'c1', x: 20, y: 20, color: 'yellow' }, { id: 'c2', x: 40, y: 15, color: 'red' },
          { id: 'c3', x: 60, y: 25, color: 'orange' }, { id: 'c4', x: 30, y: 45, color: 'blue' },
          { id: 'c5', x: 50, y: 50, color: 'yellow' }, { id: 'c6', x: 70, y: 40, color: 'red' },
        ],
        players: [
          { id: 'p1', x: 20, y: 35, team: 'blue', label: '1' },
          { id: 'p2', x: 35, y: 30, team: 'blue', label: '2' },
          { id: 'p3', x: 50, y: 35, team: 'blue', label: '3' },
        ],
        arrows: [
          { id: 'a1', fromX: 20, fromY: 35, toX: 40, toY: 15, type: 'movement' },
          { id: 'a2', fromX: 40, fromY: 15, toX: 60, toY: 25, type: 'movement' },
        ],
        description: 'Circuito cerrado con estaciones. Cada estación tiene un animal diferente que imitar.',
      },
    },
    {
      club_id: clubId, nombre: 'El Rey de la Selva (Persecución)', tipo: 'ludico',
      descripcion: 'Un jugador es "el León" y persigue al resto. Si te tocan quedas congelado hasta que un compañero libre te toque la mano. Trabaja la carrera, cambios de dirección y trabajo en equipo de forma natural.',
      age_category: 'querubin', microcycle_day: 'MD_minus_4', game_phase: 'motor_coordination',
      drill_structure: 'ludic_motor_circuit', min_players: 8, max_players: 20, intensity_level: 2,
      duracion_recomendada: 10, categoria_edad: ['prebenjamin'],
      objetivo_tecnico: ['agilidad', 'cambios de dirección'], objetivo_tactico: [],
      material: ['espacio delimitado'], tags: ['querubin', 'persecucion'],
      tactical_board_data: {
        pitchType: 'third',
        players: [
          { id: 'p1', x: 50, y: 35, team: 'red', label: 'L' },
          { id: 'p2', x: 25, y: 20, team: 'blue', label: '1' },
          { id: 'p3', x: 70, y: 25, team: 'blue', label: '2' },
          { id: 'p4', x: 40, y: 55, team: 'blue', label: '3' },
          { id: 'p5', x: 65, y: 50, team: 'blue', label: '4' },
        ],
        cones: [
          { id: 'c1', x: 10, y: 10, color: 'yellow' }, { id: 'c2', x: 90, y: 10, color: 'yellow' },
          { id: 'c3', x: 10, y: 60, color: 'yellow' }, { id: 'c4', x: 90, y: 60, color: 'yellow' },
        ],
        description: 'El jugador rojo (León) persigue a los azules dentro del área delimitada por los conos.',
      },
    },
    // ── BENJAMÍN ──────────────────────────────────────────────
    {
      club_id: clubId, nombre: 'Rondo 3v1 en Cuadrado', tipo: 'posesion',
      descripcion: 'Tres jugadores mantienen la posesión en un cuadrado de 8x8m contra 1 presionador. Máximo 2 toques. Objetivo: triangular rápidamente y mantener la pelota.',
      age_category: 'benjamin', microcycle_day: 'MD_minus_3', game_phase: 'attacking_build_up',
      drill_structure: 'rondo', min_players: 4, max_players: 8, intensity_level: 2,
      duracion_recomendada: 12, categoria_edad: ['benjamin'],
      objetivo_tecnico: ['pase', 'control', 'técnica individual'],
      objetivo_tactico: ['conservación del balón', 'triángulos'],
      material: ['balones', 'conos'], tags: ['rondo', 'benjamin', 'posesion'],
      tactical_board_data: {
        pitchType: 'third',
        players: [
          { id: 'p1', x: 30, y: 25, team: 'blue', label: '1' },
          { id: 'p2', x: 50, y: 20, team: 'blue', label: '2' },
          { id: 'p3', x: 40, y: 45, team: 'blue', label: '3' },
          { id: 'p4', x: 40, y: 33, team: 'red', label: 'P' },
        ],
        balls: [{ id: 'b1', x: 30, y: 25 }],
        cones: [
          { id: 'c1', x: 25, y: 18, color: 'yellow' }, { id: 'c2', x: 55, y: 18, color: 'yellow' },
          { id: 'c3', x: 25, y: 50, color: 'yellow' }, { id: 'c4', x: 55, y: 50, color: 'yellow' },
        ],
        arrows: [
          { id: 'a1', fromX: 30, fromY: 25, toX: 50, toY: 20, type: 'pass' },
          { id: 'a2', fromX: 50, fromY: 20, toX: 40, toY: 45, type: 'pass' },
        ],
        description: '3 jugadores azules mantienen el balón dentro del cuadrado contra 1 rojo que presiona.',
      },
    },
    {
      club_id: clubId, nombre: 'Duelos 1v1 hacia Portería', tipo: 'tecnico',
      descripcion: 'Por parejas. Un atacante con balón parte desde 12m y tiene que superar al defensor para disparar. El defensor no puede hacer entrada, solo presionar e interceptar. Rotación automática de roles.',
      age_category: 'benjamin', microcycle_day: 'MD_minus_4', game_phase: 'attacking_progression',
      drill_structure: 'individual_technical', min_players: 6, max_players: 16, intensity_level: 3,
      duracion_recomendada: 14, categoria_edad: ['benjamin', 'alevin'],
      objetivo_tecnico: ['regate', 'control orientado', 'disparo'],
      objetivo_tactico: ['1v1 ofensivo'],
      material: ['balones', 'portería'], tags: ['1v1', 'regate', 'benjamin'],
      tactical_board_data: {
        pitchType: 'half',
        players: [
          { id: 'p1', x: 50, y: 15, team: 'blue', label: 'A' },
          { id: 'p2', x: 50, y: 30, team: 'red', label: 'D' },
        ],
        balls: [{ id: 'b1', x: 50, y: 15 }],
        arrows: [{ id: 'a1', fromX: 50, fromY: 15, toX: 50, toY: 55, type: 'dribble' }],
        description: 'Atacante azul conduce hacia la portería superando al defensor rojo.',
      },
    },
    // ── ALEVÍN ──────────────────────────────────────────────
    {
      club_id: clubId, nombre: 'Juego de Posición 4v2 con Comodines', tipo: 'tactico',
      descripcion: 'Espacio 15x12m. 4 azules más 1-2 comodines (en bandas) contra 2 rojos. Máximo 2 toques. Los comodines juegan siempre con el equipo poseedor. Trabajar la circulación rápida y la ocupación de espacios.',
      age_category: 'alevin', microcycle_day: 'MD_minus_3', game_phase: 'attacking_build_up',
      drill_structure: 'positional_game', min_players: 8, max_players: 12, intensity_level: 3,
      duracion_recomendada: 15, categoria_edad: ['alevin'],
      objetivo_tecnico: ['pase-control 2 toques'],
      objetivo_tactico: ['ocupación del espacio', 'superioridad numérica', 'triangulaciones'],
      material: ['balones', 'conos', 'petos'], tags: ['posicional', 'alevin', 'superioridad'],
      tactical_board_data: {
        pitchType: 'third',
        players: [
          { id: 'p1', x: 25, y: 20, team: 'blue', label: '1' }, { id: 'p2', x: 55, y: 18, team: 'blue', label: '2' },
          { id: 'p3', x: 25, y: 50, team: 'blue', label: '3' }, { id: 'p4', x: 55, y: 52, team: 'blue', label: '4' },
          { id: 'p5', x: 10, y: 35, team: 'yellow', label: 'C1' }, { id: 'p6', x: 70, y: 35, team: 'yellow', label: 'C2' },
          { id: 'p7', x: 38, y: 28, team: 'red', label: 'D1' }, { id: 'p8', x: 42, y: 42, team: 'red', label: 'D2' },
        ],
        balls: [{ id: 'b1', x: 25, y: 20 }],
        cones: [
          { id: 'c1', x: 15, y: 14 }, { id: 'c2', x: 68, y: 14 },
          { id: 'c3', x: 15, y: 57 }, { id: 'c4', x: 68, y: 57 },
        ],
        zones: [{ id: 'z1', x: 5, y: 12, width: 7, height: 46, color: '#facc15', opacity: 0.1, label: 'Banda' },
                { id: 'z2', x: 67, y: 12, width: 7, height: 46, color: '#facc15', opacity: 0.1, label: 'Banda' }],
        arrows: [
          { id: 'a1', fromX: 25, fromY: 20, toX: 10, toY: 35, type: 'pass' },
          { id: 'a2', fromX: 10, fromY: 35, toX: 25, toY: 50, type: 'pass' },
        ],
        description: '4v2 con 2 comodines en bandas. Los comodines siempre juegan con quien tiene el balón.',
      },
    },
    // ── INFANTIL ──────────────────────────────────────────────
    {
      club_id: clubId, nombre: 'Salida de Balón ante Presión Alta 3-2-1', tipo: 'tactico',
      descripcion: 'El bloque defensor aplica presión alta. El equipo poseedor debe salir con 3 hombres en línea, apoyar al portero y progresar superando la primera línea de presión. Se trabaja la comunicación y la posición del mediocentro.',
      age_category: 'infantil', microcycle_day: 'MD_minus_4', game_phase: 'attacking_build_up',
      drill_structure: 'positional_game', min_players: 10, max_players: 16, intensity_level: 4,
      duracion_recomendada: 18, categoria_edad: ['infantil', 'cadete'],
      objetivo_tecnico: ['pase en presión', 'control orientado'],
      objetivo_tactico: ['salida de balón', 'línea de 3', 'romper presión'],
      material: ['balones', 'petos', 'conos'], tags: ['salida', 'presion', 'infantil', 'periodizacion'],
      tactical_board_data: {
        pitchType: 'half',
        players: [
          { id: 'p1', x: 50, y: 5, team: 'white', label: 'PO' },
          { id: 'p2', x: 25, y: 15, team: 'blue', label: 'CB' }, { id: 'p3', x: 50, y: 12, team: 'blue', label: 'CB' },
          { id: 'p4', x: 75, y: 15, team: 'blue', label: 'CB' }, { id: 'p5', x: 50, y: 28, team: 'blue', label: 'MC' },
          { id: 'p6', x: 35, y: 30, team: 'red', label: 'P1' }, { id: 'p7', x: 50, y: 22, team: 'red', label: 'P2' },
          { id: 'p8', x: 65, y: 30, team: 'red', label: 'P3' },
        ],
        balls: [{ id: 'b1', x: 50, y: 5 }],
        arrows: [
          { id: 'a1', fromX: 50, fromY: 5, toX: 25, toY: 15, type: 'pass' },
          { id: 'a2', fromX: 25, fromY: 15, toX: 50, toY: 28, type: 'pass' },
          { id: 'a3', fromX: 50, fromY: 28, toX: 75, toY: 15, type: 'pass' },
        ],
        description: 'Portero + 3 defensas + MC salen desde atrás ante la presión de 3 atacantes rojos.',
      },
    },
    // ── CADETE ──────────────────────────────────────────────
    {
      club_id: clubId, nombre: 'Juego de Posición 4v4+3 con Porter\u00edas', tipo: 'tactico',
      descripcion: 'Campo 35x25m dividido en 3 carriles. 4v4 en zona central + 3 comodines interiores. Gol válido solo si el equipo ha completado mínimo 5 pases. Trabaja la paciencia, el juego interior y las transiciones.',
      age_category: 'cadete', microcycle_day: 'MD_minus_3', game_phase: 'attacking_progression',
      drill_structure: 'positional_game', min_players: 11, max_players: 16, intensity_level: 4,
      duracion_recomendada: 20, categoria_edad: ['cadete', 'juvenil'],
      objetivo_tecnico: ['pase en espacios reducidos', '2 toques'],
      objetivo_tactico: ['juego interior', 'paciencia en la circulación', 'transiciones cortas'],
      material: ['balones', 'petos', 'conos', 'mini-porterías'], tags: ['posicional', 'cadete', 'periodizacion'],
      tactical_board_data: {
        pitchType: 'half',
        players: [
          { id: 'p1', x: 25, y: 20, team: 'blue', label: '1' }, { id: 'p2', x: 45, y: 18, team: 'blue', label: '2' },
          { id: 'p3', x: 30, y: 45, team: 'blue', label: '3' }, { id: 'p4', x: 48, y: 48, team: 'blue', label: '4' },
          { id: 'p5', x: 60, y: 20, team: 'red', label: '1' }, { id: 'p6', x: 78, y: 18, team: 'red', label: '2' },
          { id: 'p7', x: 62, y: 45, team: 'red', label: '3' }, { id: 'p8', x: 80, y: 48, team: 'red', label: '4' },
          { id: 'p9', x: 50, y: 30, team: 'yellow', label: 'C1' }, { id: 'p10', x: 40, y: 33, team: 'yellow', label: 'C2' },
          { id: 'p11', x: 60, y: 33, team: 'yellow', label: 'C3' },
        ],
        balls: [{ id: 'b1', x: 50, y: 30 }],
        miniGoals: [
          { id: 'g1', x: 10, y: 33, rotation: 90 }, { id: 'g2', x: 92, y: 33, rotation: 90 },
        ],
        zones: [{ id: 'z1', x: 17, y: 12, width: 32, height: 45, color: '#3b82f6', opacity: 0.08 },
                { id: 'z2', x: 55, y: 12, width: 32, height: 45, color: '#ef4444', opacity: 0.08 }],
        description: '4v4 con 3 comodines amarillos. Gol válido con mínimo 5 pases previos.',
      },
    },
    // ── JUVENIL / SENIOR ──────────────────────────────────────
    {
      club_id: clubId, nombre: 'MD-2: Trabajo de Velocidad y Circuitos de Alta Intensidad', tipo: 'fisico',
      descripcion: 'Día de velocidad del microciclo (MD-2). Circuito de 4 estaciones: sprints 10m con cambio, duelos 1v1 de velocidad, conducción a máxima velocidad y remates. Series cortas (6-8 repeticiones). Recuperación completa entre series.',
      age_category: 'senior', microcycle_day: 'MD_minus_2', game_phase: 'attacking_finishing',
      drill_structure: 'ludic_motor_circuit', min_players: 8, max_players: 20, intensity_level: 4,
      duracion_recomendada: 22, categoria_edad: ['juvenil', 'senior'],
      objetivo_tecnico: ['velocidad de ejecución', 'disparo en carrera'],
      objetivo_tactico: ['transición rápida', 'contraataque'],
      material: ['balones', 'conos', 'picas', 'portería'], tags: ['velocidad', 'MD-2', 'senior'],
      tactical_board_data: {
        pitchType: 'half',
        pikes: [
          { id: 'pk1', x: 30, y: 20 }, { id: 'pk2', x: 40, y: 20 }, { id: 'pk3', x: 50, y: 20 },
          { id: 'pk4', x: 60, y: 20 }, { id: 'pk5', x: 70, y: 20 },
        ],
        players: [
          { id: 'p1', x: 30, y: 35, team: 'blue', label: 'J1' },
          { id: 'p2', x: 50, y: 35, team: 'blue', label: 'J2' },
          { id: 'p3', x: 70, y: 35, team: 'blue', label: 'J3' },
        ],
        balls: [{ id: 'b1', x: 30, y: 35 }, { id: 'b2', x: 50, y: 35 }],
        arrows: [
          { id: 'a1', fromX: 30, fromY: 35, toX: 30, toY: 20, type: 'movement' },
          { id: 'a2', fromX: 30, fromY: 20, toX: 50, toY: 60, type: 'dribble' },
        ],
        description: 'Circuito de velocidad. Salida explosiva, slalom entre picas, conducción y remate.',
      },
    },
  ];

  let inserted = 0;
  for (const drill of defaultDrills) {
    const { data: existing } = await supabase
      .from('banco_ejercicios')
      .select('id')
      .eq('nombre', drill.nombre)
      .eq('club_id', clubId)
      .single();

    if (!existing) {
      const { error } = await supabase.from('banco_ejercicios').insert({
        ...drill,
        variantes: [],
        dificultad: drill.intensity_level || 3,
        tags: drill.tags || [],
      });
      if (!error) inserted++;
    }
  }

  return { inserted, total: defaultDrills.length };
}
