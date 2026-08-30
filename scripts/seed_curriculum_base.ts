// ============================================================================
// BLINDAJE DE SEGURIDAD CONTRA EJECUCIÓN ACCIDENTAL EN PRODUCCIÓN (P17-C9)
// ============================================================================
if (process.env.NODE_ENV === 'production' || process.env.ALLOW_SEED_EXECUTION !== 'true') {
  console.error('\n[SEGURIDAD CRÍTICA] Ejecución abortada.');
  console.error('Este script genera datos de prueba/seed y está terminantemente PROHIBIDO en producción.');
  console.error('Para ejecutarlo en un entorno de desarrollo aislado, define explícitamente:');
  console.error('  ALLOW_SEED_EXECUTION=true y asegúrate de no apuntar a producción.\n');
  process.exit(1);
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

interface CurriculumDef {
  category_code: string;
  category_label: string;
  age_min: number;
  age_max: number;
  color: string;
  philosophy_text: string;
  objectives: string[];
  priority_families: string[];
  sort_order: number;
  principles: {
    name: string;
    game_phase: string;
    description: string;
    sort_order: number;
    subprinciples: {
      name: string;
      description: string;
      sort_order: number;
      behaviours: {
        description: string;
        performance_indicators: string[];
        sort_order: number;
      }[];
    }[];
  }[];
}

const CURRICULUM_BASE: CurriculumDef[] = [
  // 1. U6 (Querubín)
  {
    category_code: "U6",
    category_label: "Querubín",
    age_min: 4,
    age_max: 5,
    color: "#ec4899",
    sort_order: 1,
    philosophy_text: "Fase de descubrimiento lúdico, psicomotricidad básica y familiarización con el balón.",
    objectives: [
      "Desarrollo del esquema corporal, coordinación óculo-pédica y equilibrio dinámico",
      "Familiarización afectiva con el balón y el espacio de juego",
      "Comprensión de normas básicas: no usar las manos, límites del campo y respeto al compañero",
      "Diversión, autonomía motriz y socialización positiva"
    ],
    priority_families: ["Psicomotricidad", "Conducción Lúdica", "Juegos de Persecución", "1v1 en Espacios Reducidos"],
    principles: [
      {
        name: "Atracción por el Balón y Progresión",
        game_phase: "Ataque",
        description: "Llevar el balón hacia la portería rival mediante golpeos y conducciones libres.",
        sort_order: 1,
        subprinciples: [
          {
            name: "Conducción y Orientación Espacial",
            description: "Avanzar con el balón controlado reconociendo el sentido de la portería.",
            sort_order: 1,
            behaviours: [
              {
                description: "Mantiene la vista arriba mientras conduce sin chocar con otros jugadores.",
                performance_indicators: ["Control corporal", "Orientación"],
                sort_order: 1
              },
              {
                description: "Utiliza ambos pies de forma espontánea para avanzar hacia la meta.",
                performance_indicators: ["Bilateralidad básica", "Intención de avance"],
                sort_order: 2
              }
            ]
          }
        ]
      },
      {
        name: "Deseo de Recuperar el Balón",
        game_phase: "Defensa",
        description: "Reaccionar activamente ante la pérdida para intentar volver a jugar con el balón.",
        sort_order: 2,
        subprinciples: [
          {
            name: "Persecución Activa y Acoso",
            description: "Correr tras el balón cuando está en posesión del adversario.",
            sort_order: 1,
            behaviours: [
              {
                description: "Va al encuentro del poseedor del balón sin miedo ni pasividad.",
                performance_indicators: ["Iniciativa defensiva", "Valentía motriz"],
                sort_order: 1
              }
            ]
          }
        ]
      }
    ]
  },

  // 2. U7-U8 (Prebenjamín)
  {
    category_code: "U7-U8",
    category_label: "Prebenjamín",
    age_min: 6,
    age_max: 7,
    color: "#a855f7",
    sort_order: 2,
    philosophy_text: "Iniciación técnico-táctica individual, lateralidad y primeras relaciones de pase y apoyo.",
    objectives: [
      "Dominio de superficies de contacto: interior, empeine y planta",
      "Concepto de 'compañero libre' y primeras combinaciones de pase",
      "Ocupación básica de zonas: atacar en amplitud / defender juntos",
      "Hábitos de esfuerzo, deportividad y escucha activa"
    ],
    priority_families: ["Control y Pase", "Regate 1v1", "Rondos 3v1", "Partidos Reducidos 3v3 / 4v4"],
    principles: [
      {
        name: "Progresión con Pase y Conducción",
        game_phase: "Ataque",
        description: "Elegir entre pasar al compañero desmarcado o progresar conduciendo al espacio libre.",
        sort_order: 1,
        subprinciples: [
          {
            name: "Identificación del Compañero Libre",
            description: "Levantar la cabeza antes del golpeo para elegir la mejor opción de pase.",
            sort_order: 1,
            behaviours: [
              {
                description: "Pasa el balón con el interior del pie hacia el pie del compañero.",
                performance_indicators: ["Precisión de pase", "Superficie de contacto correcta"],
                sort_order: 1
              },
              {
                description: "Ofrece línea de pase moviéndose al espacio libre tras soltar el balón.",
                performance_indicators: ["Pase y movimiento", "Apoyo continuo"],
                sort_order: 2
              }
            ]
          }
        ]
      },
      {
        name: "Interposición y Duelo 1v1",
        game_phase: "Defensa",
        description: "Colocarse entre el balón y la propia portería para dificultar el avance rival.",
        sort_order: 2,
        subprinciples: [
          {
            name: "Posición Básica de Entrada",
            description: "Perfil defensivo con centro de gravedad bajo y paciencia en la entrada.",
            sort_order: 1,
            behaviours: [
              {
                description: "Se posiciona entre el atacante y la portería antes de intentar la entrada.",
                performance_indicators: ["Ubicación defensiva", "Paciencia en el duelo"],
                sort_order: 1
              }
            ]
          }
        ]
      }
    ]
  },

  // 3. U9-U10 (Benjamín)
  {
    category_code: "U9-U10",
    category_label: "Benjamín",
    age_min: 8,
    age_max: 9,
    color: "#3b82f6",
    sort_order: 3,
    philosophy_text: "Desarrollo de la toma de decisiones, control orientado y juego colectivo en Fútbol-8.",
    objectives: [
      "Automatización del control orientado hacia el espacio libre",
      "Creación de triángulos de apoyo y circulación del balón",
      "Basculación defensiva colectiva y coberturas simples",
      "Transición rápida ataque-defensa (reacción < 3 segundos)"
    ],
    priority_families: ["Rondos 4v2", "Juegos de Posición 3v3+2", "Salida de Balón F8", "Finalizaciones con Oposición"],
    principles: [
      {
        name: "Salida Limpia y Amplitud",
        game_phase: "Ataque",
        description: "Iniciar el juego desde el portero buscando fijar y atraer para progresar por fuera o por dentro.",
        sort_order: 1,
        subprinciples: [
          {
            name: "Apertura de Centrales y Laterales",
            description: "Ocupar la máxima anchura del campo en fase de inicio para generar pasillos interiores.",
            sort_order: 1,
            behaviours: [
              {
                description: "Recibe el balón perfilado hacia adelante permitiendo la progresión inmediata.",
                performance_indicators: ["Perfil corporal óptimo", "Primer toque orientado"],
                sort_order: 1
              },
              {
                description: "Encuentra al mediocentro libre en el tercer hombre cuando la banda está tapada.",
                performance_indicators: ["Visión periférica", "Juego con tercer hombre"],
                sort_order: 2
              }
            ]
          }
        ]
      },
      {
        name: "Presión Inmediata Tras Pérdida",
        game_phase: "Transición Ataque-Defensa",
        description: "Acosar al recuperador rival durante los primeros 3 segundos para forzar el error o el pase atrás.",
        sort_order: 2,
        subprinciples: [
          {
            name: "Acoso de los Jugadores Cercanos",
            description: "El jugador más próximo al balón salta inmediatamente al acoso mientras los contiguos cierran líneas.",
            sort_order: 1,
            behaviours: [
              {
                description: "Reacciona instantáneamente sin lamentarse tras perder la posesión del balón.",
                performance_indicators: ["Velocidad de reacción", "Actitud competitiva"],
                sort_order: 1
              },
              {
                description: "El compañero más cercano orienta la carrera para tapar el pase vertical.",
                performance_indicators: ["Cierre de línea vertical", "Orientación del acoso"],
                sort_order: 2
              }
            ]
          }
        ]
      }
    ]
  },

  // 4. U11-U12 (Alevín)
  {
    category_code: "U11-U12",
    category_label: "Alevín",
    age_min: 10,
    age_max: 11,
    color: "#10b981",
    sort_order: 4,
    philosophy_text: "Consolidación de roles posicionales, cambio de orientación y preparación para la transición a F11.",
    objectives: [
      "Cambios de orientación rápidos ante basculación rival",
      "Paredes, desdoblamientos y desmarques de ruptura",
      "Línea defensiva coordinada: achique y repliegue sincronizado",
      "Dominio de todas las fases de juego y concentración competitiva"
    ],
    priority_families: ["Juegos de Posición 6v4", "Rondos 5v2", "ABP Ofensivo/Defensivo", "Partidos Condicionados"],
    principles: [
      {
        name: "Circulación Rápida y Cambio de Orientación",
        game_phase: "Ataque",
        description: "Mover el bloque defensivo rival de lado a lado para encontrar espacios débiles en lado opuesto.",
        sort_order: 1,
        subprinciples: [
          {
            name: "Fijar en un Lado para Jugar en el Opuesto",
            description: "Atraer adversarios con pases cortos y cambiar bruscamente con pase tenso al espacio alejado.",
            sort_order: 1,
            behaviours: [
              {
                description: "Ejecuta cambios de orientación con golpeo tenso y preciso al pie del jugador alejado.",
                performance_indicators: ["Calidad de golpeo medio/largo", "Velocidad de circulación"],
                sort_order: 1
              },
              {
                description: "El extremo/lateral del lado débil ataca la espalda del defensor en el momento del envío.",
                performance_indicators: ["Timing del desmarque", "Ocupación de espacios ciegos"],
                sort_order: 2
              }
            ]
          }
        ]
      },
      {
        name: "Basculación y Compactación de Bloque",
        game_phase: "Defensa",
        description: "Desplazamiento solidario de todas las líneas hacia la zona activa del balón para reducir distancias.",
        sort_order: 2,
        subprinciples: [
          {
            name: "Distancia Interlíneas Reducida (<15m)",
            description: "Mantener la estructura compacta impidiendo pases interiores del rival.",
            sort_order: 1,
            behaviours: [
              {
                description: "Los mediocentros y defensas basculan coordinados al unísono manteniendo la distancia.",
                performance_indicators: ["Distancia entre líneas", "Vigilancia de pasillos interiores"],
                sort_order: 1
              }
            ]
          }
        ]
      }
    ]
  },

  // 5. U13-U14 (Infantil)
  {
    category_code: "U13-U14",
    category_label: "Infantil",
    age_min: 12,
    age_max: 13,
    color: "#f59e0b",
    sort_order: 5,
    philosophy_text: "Adaptación completa a Fútbol-11, gestión del espacio amplio, fuerza funcional y táctica colectiva.",
    objectives: [
      "Lectura del fuera de juego y coordinación de la última línea",
      "Uso eficaz de perfiles en espacios amplios y aceleraciones tácticas",
      "Vigilancias ofensivas mientras el equipo tiene el balón",
      "Estructuración táctica en 1-4-3-3 y 1-4-2-3-1"
    ],
    priority_families: ["Juegos de Posición 7v7+3", "Estructura de Presión Alta", "Transiciones 3v2 / 4v3", "ABP Estructurado"],
    principles: [
      {
        name: "Progresión Escalonada y Fijación de Marcas",
        game_phase: "Ataque",
        description: "Conducir para atraer rivales y liberar al hombre libre entre líneas.",
        sort_order: 1,
        subprinciples: [
          {
            name: "Hombre Libre a Espaldas de Línea de Presión",
            description: "Posicionarse en intervalos defensivos rivales para recibir de cara hacia portería.",
            sort_order: 1,
            behaviours: [
              {
                description: "El interior/mediapunta se desmarca a espaldas de los pivotes rivales para recibir perfilado.",
                performance_indicators: ["Desmarque en intervalo", "Control de espaldas"],
                sort_order: 1
              }
            ]
          }
        ]
      },
      {
        name: "Presión Alta en Bloque Adelantado",
        game_phase: "Defensa",
        description: "Provocar el pase del rival hacia zonas predeterminadas para forzar la recuperación en campo rival.",
        sort_order: 2,
        subprinciples: [
          {
            name: "Activación del Salto a la Presión (Triggers)",
            description: "Iniciar el sprint de acoso cuando el rival recibe de espaldas o con mal control.",
            sort_order: 1,
            behaviours: [
              {
                description: "Identifica el trigger de presión y salta con intensidad cerrando la opción de pase de retorno.",
                performance_indicators: ["Lectura de gatillo de presión", "Intensidad de acoso"],
                sort_order: 1
              }
            ]
          }
        ]
      }
    ]
  },

  // 6. U15-U16 (Cadete)
  {
    category_code: "U15-U16",
    category_label: "Cadete",
    age_min: 14,
    age_max: 15,
    color: "#ea580c",
    sort_order: 6,
    philosophy_text: "Optimización de la intensidad competitiva, flexibilidad táctica y rigor posicional.",
    objectives: [
      "Capacidad de alternar bloque alto, medio y bajo según la situación del partido",
      "Transiciones defensa-ataque fulgurantes con criterio (<10 segundos al remate)",
      "Gestión de tiempos del partido: acelerar vs contemporizar",
      "Madurez psicosocial y cohesión grupal de alta exigencia"
    ],
    priority_families: ["Juegos de Posición 8v8+2", "Contraataque y Transición Rápida", "ABP Defensivo Zonal", "Simulación Competitiva"],
    principles: [
      {
        name: "Transición Ofensiva Directa y Despliegue",
        game_phase: "Transición Defensa-Ataque",
        description: "Tras recuperación, jugar primer pase vertical hacia delantero de referencia o espacio libre para finalizar con máxima velocidad.",
        sort_order: 1,
        subprinciples: [
          {
            name: "Primer Pase de Seguridad o Salida Vertical",
            description: "Buscar inmediatamente la profundidad si el rival está desorganizado.",
            sort_order: 1,
            behaviours: [
              {
                description: "Descarga rápido a un toque o mete pase profundo al espacio a la espalda de los centrales rivales.",
                performance_indicators: ["Verticalidad con criterio", "Velocidad de ejecución <2s"],
                sort_order: 1
              },
              {
                description: "Los jugadores de segunda línea se incorporan al sprint ocupando zonas de remate.",
                performance_indicators: ["Llegada desde segunda línea", "Ocupación de áreas de remate"],
                sort_order: 2
              }
            ]
          }
        ]
      },
      {
        name: "Defensa del Área y Segundas Jugadas",
        game_phase: "Defensa",
        description: "Organización zonal estricta dentro del área, perfil corporal de despeje y anticipación en el rechace.",
        sort_order: 2,
        subprinciples: [
          {
            name: "Orientación Corporal en Centros Laterales",
            description: "Ver al mismo tiempo el balón y la marca asignada protegiendo la zona de primer y segundo palo.",
            sort_order: 1,
            behaviours: [
              {
                description: "Mantiene la marca de espaldas a la portería y despeja orientando hacia banda o rechace controlado.",
                performance_indicators: ["Duelo aéreo", "Despeje orientado"],
                sort_order: 1
              }
            ]
          }
        ]
      },
      {
        name: "Salida de Balón",
        game_phase: "Ataque",
        description: "Construcción inicial desde portería superando la primera línea de presión rival.",
        sort_order: 3,
        subprinciples: [
          {
            name: "Salida en Corto y Fijación",
            description: "Atraer la presión para encontrar al hombre libre en progresión.",
            sort_order: 1,
            behaviours: [
              {
                description: "Ofrece línea de pase diagonal y se perfila para recibir orientado.",
                performance_indicators: ["Perfil corporal", "Línea de pase activa"],
                sort_order: 1
              }
            ]
          }
        ]
      },
      {
        name: "Presión Alta",
        game_phase: "Defensa",
        description: "Presión coordinada en campo rival para provocar el error en el inicio del adversario.",
        sort_order: 4,
        subprinciples: [
          {
            name: "Acoso al Primer Receptor",
            description: "Cerrar líneas de pase interiores y orientar la salida hacia la banda.",
            sort_order: 1,
            behaviours: [
              {
                description: "Inicia el acoso en el momento del pase orientando al rival hacia fuera.",
                performance_indicators: ["Momento de salto", "Dirección de presión"],
                sort_order: 1
              }
            ]
          }
        ]
      },
      {
        name: "Transición Defensiva (Tras Pérdida)",
        game_phase: "Transición Ataque-Defensa",
        description: "Reacción instantánea post-pérdida: acoso inmediato o repliegue intensivo.",
        sort_order: 5,
        subprinciples: [
          {
            name: "Presión Post-Pérdida en 3 Segundos",
            description: "Acosar intensamente al poseedor rival antes de que pueda levantar la cabeza.",
            sort_order: 1,
            behaviours: [
              {
                description: "Presiona inmediatamente al poseedor tras perder el balón sin recular.",
                performance_indicators: ["Tiempo de reacción <3s", "Intensidad de acoso"],
                sort_order: 1
              }
            ]
          }
        ]
      }
    ]
  },

  // 7. U17-U19 (Juvenil)
  {
    category_code: "U17-U19",
    category_label: "Juvenil",
    age_min: 16,
    age_max: 18,
    color: "#e11d48",
    sort_order: 7,
    philosophy_text: "Rendimiento formativo pre-profesional, modelo de juego completo, micro-detalles y dominio táctico.",
    objectives: [
      "Dominio completo de los 5 momentos del juego con máxima exigencia física y mental",
      "Variantes complejas de ABP ofensivo y defensivo (bloqueos, pantallas, marcas mixtas)",
      "Lectura analítica del rival durante el transcurso del encuentro",
      "Preparación física orientada a la competición de alto rendimiento"
    ],
    priority_families: ["Modelo de Juego Integral 11v11", "ABP Avanzado", "Gegenpressing & Presión Estructurada", "Automatismos Tácticos"],
    principles: [
      {
        name: "Estructura Ofensiva y Desequilibrio por Pasillos Interiores",
        game_phase: "Ataque",
        description: "Crear superioridades numéricas y posicionales en mediocampo mediante movimientos coordinados de extremos hacia dentro y laterales proyectados.",
        sort_order: 1,
        subprinciples: [
          {
            name: "Rotaciones Posicionales y Desdoblamientos",
            description: "Intercambio fluido de posiciones manteniendo la estructura de seguridad.",
            sort_order: 1,
            behaviours: [
              {
                description: "Genera superioridad 2v1 en banda o pasillo interior mediante desmarque coordinado y pase en el momento justo.",
                performance_indicators: ["Timing asociativo", "Toma de decisiones de élite"],
                sort_order: 1
              }
            ]
          }
        ]
      },
      {
        name: "Organización y Rigor en Balón Parado (ABP)",
        game_phase: "Balón Parado",
        description: "Ejecución perfecta de los roles asignados en saques de esquina, faltas laterales y estrategia a balón parado.",
        sort_order: 2,
        subprinciples: [
          {
            name: "Córner Ofensivo con Bloqueos y Arrastres",
            description: "Crear zonas libres de remate mediante desmarques de distracción coordinados al segundo palo o punto de penalti.",
            sort_order: 1,
            behaviours: [
              {
                description: "Ejecuta el bloqueo legal o arrastre liberando al rematador principal en la zona diana.",
                performance_indicators: ["Cumplimiento del rol táctico", "Impacto en remate"],
                sort_order: 1
              }
            ]
          }
        ]
      }
    ]
  },

  // 8. Senior (Amateur / Senior)
  {
    category_code: "Senior",
    category_label: "Amateur / Senior",
    age_min: 19,
    age_max: 35,
    color: "#334155",
    sort_order: 8,
    philosophy_text: "Rendimiento competitivo, competitividad táctica, cohesión del vestuario y optimización de recursos.",
    objectives: [
      "Maximizar la eficacia en las dos áreas (área propia y área rival)",
      "Gestión de momentos clave: faltas tácticas, balón parado y control del marcador",
      "Solidez defensiva colectiva y rentabilidad en las ocasiones generadas",
      "Liderazgo, madurez en el campo y rigor competitivo"
    ],
    priority_families: ["Táctica de Competición", "ABP de Máxima Eficacia", "Transición Letal", "Partidos Tácticos 11v11"],
    principles: [
      {
        name: "Eficacia en Último Tercio y Finalización",
        game_phase: "Ataque",
        description: "Transformar las ventajas construidas en ocasiones manifiestas de gol con mínimo número de toques.",
        sort_order: 1,
        subprinciples: [
          {
            name: "Ocupación Racional del Área de Remate",
            description: "Primer palo, segundo palo, punto de penalti y frontal cubiertos simultáneamente en centros laterales.",
            sort_order: 1,
            behaviours: [
              {
                description: "Ataca el primer palo anticipando al central rival con remate a un toque.",
                performance_indicators: ["Anticipación en remate", "Eficacia goleadora"],
                sort_order: 1
              },
              {
                description: "El mediocentro se posiciona en la frontal para rechace y evitar contragolpe rival.",
                performance_indicators: ["Vigilancia ofensiva", "Equilibrio defensivo"],
                sort_order: 2
              }
            ]
          }
        ]
      },
      {
        name: "Gestión de Bloque Bajo y Faltas Tácticas",
        game_phase: "Defensa",
        description: "Cerrar todos los pasillos interiores en ventaja en el marcador e interrumpir transiciones peligrosas con faltas reglamentarias en campo rival.",
        sort_order: 2,
        subprinciples: [
          {
            name: "Falta Táctica Preventiva en Transición",
            description: "Cortar el contragolpe rival antes de que supere la línea de medios.",
            sort_order: 1,
            behaviours: [
              {
                description: "Interrumpe la salida rápida del rival con falta táctica inteligente sin riesgo de tarjeta roja.",
                performance_indicators: ["Oficio defensivo", "Inteligencia táctica"],
                sort_order: 1
              }
            ]
          }
        ]
      }
    ]
  }
];

async function seedBaseCurriculum() {
  console.log("================================================================================");
  console.log("CARGA DEL CURRÍCULO BASE V1.0 — FÚTBOL FORMATIVO PROFESIONAL");
  console.log("================================================================================");

  // 1. Obtener todos los clubs existentes
  const { data: clubs, error: clubErr } = await supabase.from("clubs").select("id, name");
  if (clubErr || !clubs || clubs.length === 0) {
    throw new Error(`No se pudo obtener ningún club: ${clubErr?.message}`);
  }

  console.log(`- Encontrados ${clubs.length} clubs para poblar currículo base.`);

  for (const club of clubs) {
    const clubId = club.id;
    console.log(`\n>>> Procesando Club: ${club.name} (${clubId})`);

    let totalCurriculums = 0;
    let totalPrinciples = 0;
    let totalSubprinciples = 0;
    let totalBehaviours = 0;

  for (const cat of CURRICULUM_BASE) {
    // A. Upsert en methodology_curriculum
    const { data: currRecord, error: currErr } = await supabase
      .from("methodology_curriculum")
      .upsert(
        {
          club_id: clubId,
          category_code: cat.category_code,
          category_label: cat.category_label,
          age_min: cat.age_min,
          age_max: cat.age_max,
          philosophy_text: cat.philosophy_text,
          objectives: cat.objectives,
          priority_families: cat.priority_families,
          color: cat.color,
          sort_order: cat.sort_order,
          is_active: true
        },
        { onConflict: "club_id,category_code" }
      )
      .select("id")
      .single();

    if (currErr) {
      console.error(`❌ Error en curriculum ${cat.category_code}:`, currErr.message);
      continue;
    }

    const curriculumId = currRecord.id;
    totalCurriculums++;
    console.log(`✅ [Etapa ${cat.category_code}] ${cat.category_label} (ID: ${curriculumId})`);

    // B. Procesar Principios
    for (const princ of cat.principles) {
      // Buscar si ya existe el principio para este curriculum y nombre
      const { data: existingPrinc } = await supabase
        .from("methodology_principles")
        .select("id")
        .eq("curriculum_id", curriculumId)
        .eq("name", princ.name)
        .maybeSingle();

      let principleId: string;

      if (existingPrinc) {
        principleId = existingPrinc.id;
        await supabase.from("methodology_principles").update({
          game_phase: princ.game_phase,
          description: princ.description,
          sort_order: princ.sort_order
        }).eq("id", principleId);
      } else {
        const { data: newPrinc, error: princErr } = await supabase
          .from("methodology_principles")
          .insert({
            club_id: clubId,
            curriculum_id: curriculumId,
            name: princ.name,
            game_phase: princ.game_phase,
            description: princ.description,
            sort_order: princ.sort_order
          })
          .select("id")
          .single();

        if (princErr) {
          console.error(`  ❌ Error principio ${princ.name}:`, princErr.message);
          continue;
        }
        principleId = newPrinc.id;
      }
      totalPrinciples++;

      // C. Procesar Subprincipios
      for (const sub of princ.subprinciples) {
        const { data: existingSub } = await supabase
          .from("methodology_subprinciples")
          .select("id")
          .eq("principle_id", principleId)
          .eq("name", sub.name)
          .maybeSingle();

        let subprincipleId: string;

        if (existingSub) {
          subprincipleId = existingSub.id;
          await supabase.from("methodology_subprinciples").update({
            description: sub.description,
            sort_order: sub.sort_order
          }).eq("id", subprincipleId);
        } else {
          const { data: newSub, error: subErr } = await supabase
            .from("methodology_subprinciples")
            .insert({
              club_id: clubId,
              principle_id: principleId,
              name: sub.name,
              description: sub.description,
              sort_order: sub.sort_order
            })
            .select("id")
            .single();

          if (subErr) {
            console.error(`    ❌ Error subprincipio ${sub.name}:`, subErr.message);
            continue;
          }
          subprincipleId = newSub.id;
        }
        totalSubprinciples++;

        // D. Procesar Conductas Observables
        for (const beh of sub.behaviours) {
          const { data: existingBeh } = await supabase
            .from("methodology_behaviours")
            .select("id")
            .eq("subprinciple_id", subprincipleId)
            .eq("description", beh.description)
            .maybeSingle();

          if (!existingBeh) {
            const { error: behErr } = await supabase
              .from("methodology_behaviours")
              .insert({
                club_id: clubId,
                subprinciple_id: subprincipleId,
                description: beh.description,
                age_categories: [cat.category_code],
                performance_indicators: beh.performance_indicators,
                sort_order: beh.sort_order,
                is_active: true
              });

            if (behErr) {
              console.error(`      ❌ Error conducta:`, behErr.message);
              continue;
            }
          }
        }
      }
    }
  }
  console.log(`Club ${club.name} completado: ${totalCurriculums} currículos, ${totalPrinciples} principios, ${totalSubprinciples} subprincipios, ${totalBehaviours} conductas.`);
}

  console.log("================================================================================");
  console.log(`🏆 CARGA FINALIZADA CON ÉXITO EN TODOS LOS CLUBS.`);
  console.log("================================================================================");
}

seedBaseCurriculum().catch(console.error);
