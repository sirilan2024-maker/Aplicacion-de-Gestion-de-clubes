import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { searchDrillsSemantic } from '@/services/drillSearchService';
import type { FootballCategory, MicrocycleDay } from '@/types/microcycle';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const PEDAGOGY_SYSTEM_PROMPT = `Eres el Director de Metodología de Fútbol y Entrenador UEFA PRO del Club Sporting Saladar.
Tu misión es diseñar sesiones de entrenamiento de MÁXIMO RIGOR TÉCNICO, DIDÁCTICO Y METODOLÓGICO, adaptadas a la categoría evolutiva y al día del microciclo.

## LENGUAJE Y VOCABULARIO TÉCNICO UEFA PRO:
Usa conceptos tácticos: "Hombre libre", "Tercer hombre", "Fijar para liberar", "Amplitud y profundidad", "Intervalos interlineales", "Basculación", "Contrapresión tras pérdida (regla de 3 segundos)", "Acoso y cobertura", "Duelo y perfilación corporal orientada".

## ESTRUCTURA DE 4 FASES METODOLÓGICAS:
1. warmup: Calentamiento / Activación (15 min)
2. main_1: Fase Principal I - Introductoria / Rondo / Rueda de pases (20 min)
3. main_2: Fase Principal II - Juego de Posición / Situación Real / Partido Condicionado (25 min)
4. cooldown: Vuelta a la Calma y Feedback (10 min)

## REGLAS CRÍTICAS DE LA PIZARRA TÁCTICA SVG:
Cada tarea DEBE incluir su objeto 'tactical_board_data' con:
1. 'cones': Mínimo 4 conos delimitadores de espacio (X entre 15-80, Y entre 12-58). Colores: 'orange', 'yellow', 'red', 'blue'.
2. 'players': Posicionar de 4 a 12 jugadores con 'team': 'blue' (atacantes), 'red' (defensores), 'yellow' (comodines) y 'label': 'LAT', 'MC', 'DC', 'PO', '1', '2', 'D1', 'C1'.
3. 'balls': 1 o 2 balones en las coordenadas del poseedor.
4. 'arrows': 'pass' (dorada), 'movement' (verde), 'dribble' (morada).

## FORMATO DE SALIDA (JSON ESTRICTO):
Responde ÚNICAMENTE con este JSON:
{
  "title": "Título técnico y didáctico de la sesión",
  "ageCategory": "querubin|prebenjamin|benjamin|alevin|infantil|cadete|juvenil|senior",
  "microcycleDay": "MD_plus_1|MD_minus_4|MD_minus_3|MD_minus_2|MD_minus_1|MD|REST",
  "totalDuration": 70,
  "intensityLoad": 3,
  "objectives": [
    "Principio táctico principal",
    "Subprincipio e indicador de éxito"
  ],
  "coachNotes": "Consigna clave para el entrenador durante la sesión",
  "drills": [
    {
      "nombre": "Nombre de la tarea",
      "descripcion": "Explicación detallada del funcionamiento, dimensiones y reglas de provocación.",
      "phase": "warmup|main_1|main_2|cooldown",
      "duration_min": 15,
      "sets": 3,
      "players": 12,
      "intensity": 3,
      "material": ["conos naranjas", "petos azules/rojos", "balones"],
      "objetivos": ["Pase orientado", "Tercer hombre"],
      "variantes": ["Variante de 2 toques"],
      "tactical_board_data": {
        "pitchType": "half",
        "description": "Espacio delimitado por 4 conos",
        "cones": [
          {"id":"c1","x":15,"y":12,"color":"orange"},
          {"id":"c2","x":75,"y":12,"color":"orange"},
          {"id":"c3","x":15,"y":58,"color":"orange"},
          {"id":"c4","x":75,"y":58,"color":"orange"}
        ],
        "players": [
          {"id":"p1","x":18,"y":35,"team":"blue","label":"1"},
          {"id":"p2","x":72,"y":35,"team":"blue","label":"2"},
          {"id":"p3","x":45,"y":15,"team":"blue","label":"3"},
          {"id":"p4","x":45,"y":55,"team":"blue","label":"4"},
          {"id":"p5","x":38,"y":32,"team":"red","label":"D1"},
          {"id":"p6","x":52,"y":38,"team":"red","label":"D2"}
        ],
        "balls": [{"id":"b1","x":20,"y":35}],
        "arrows": [
          {"id":"a1","fromX":20,"fromY":35,"toX":45,"toY":15,"type":"pass","curved":false}
        ]
      }
    }
  ]
}`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, ageCategory = 'cadete', microcycleDay = 'MD_minus_3', teamId, numPlayers = 16 } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Mensajes requeridos' }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1]?.content || 'Diseña una sesión metodológica completa';

    // 1. Contexto de la sesión
    const categoryContext = `\n\n## CONTEXTO SOLICITADO:\n- Categoría: ${ageCategory}\n- Día del Microciclo: ${microcycleDay}\n- Convocados: ${numPlayers} jugadores\n- Petición del Entrenador: ${lastMessage}`;
    const fullSystemPrompt = PEDAGOGY_SYSTEM_PROMPT + categoryContext;

    // 2. Llamada a Groq con modelos de alta disponibilidad
    const groqKey = (process.env.GROQ_API_KEY || '').replace(/^["']|["']$/g, '');
    let parsedSession: any = null;

    if (groqKey) {
      const groq = new Groq({ apiKey: groqKey });
      const models = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'mixtral-8x7b-32768'];

      for (const model of models) {
        try {
          const completion = await groq.chat.completions.create({
            model,
            messages: [
              { role: 'system', content: fullSystemPrompt },
              { role: 'user', content: lastMessage },
            ],
            temperature: 0.25,
            max_tokens: 3500,
            response_format: { type: 'json_object' },
          });

          const rawText = completion.choices[0]?.message?.content || '';
          if (rawText) {
            const parsed = JSON.parse(rawText);
            if (parsed.drills && Array.isArray(parsed.drills) && parsed.drills.length > 0) {
              parsedSession = parsed;
              break;
            } else if (parsed.title) {
              parsedSession = parsed;
              break;
            }
          }
        } catch (err: any) {
          console.warn(`[TrainingAssistant API] Modelo ${model} no disponible:`, err.message);
        }
      }
    }

    // 3. Fallback inteligente de sesión si las APIs no estuvieran disponibles
    if (!parsedSession) {
      parsedSession = {
        title: `Sesión Táctica: ${lastMessage.slice(0, 45)}`,
        ageCategory,
        microcycleDay,
        totalDuration: 75,
        intensityLoad: 3,
        objectives: [
          'Ocupación racional de espacios y líneas de pase abiertas',
          'Circulación fluida con apoyos constantes al poseedor'
        ],
        coachNotes: 'Fomentar la comunicación activa y la perfilación orientada antes de recibir el balón.',
        drills: [
          {
            nombre: 'Activación: Rondo 4v2 con Tercer Hombre',
            phase: 'warmup',
            duration_min: 15,
            sets: 3,
            players: 12,
            intensity: 2,
            material: ['conos naranjas', 'petos', 'balones'],
            objetivos: ['Pase y recepción', 'Orientación corporal'],
            descripcion: 'Cuadrado de 15x15m. 4 jugadores exteriores mantienen la posesión a 2 toques ante 2 defensores interiores.',
            tactical_board_data: {
              pitchType: 'half',
              description: 'Rondo 4v2 en espacio reducido',
              cones: [
                { id: 'c1', x: 20, y: 15, color: 'orange' },
                { id: 'c2', x: 60, y: 15, color: 'orange' },
                { id: 'c3', x: 20, y: 55, color: 'orange' },
                { id: 'c4', x: 60, y: 55, color: 'orange' },
              ],
              players: [
                { id: 'p1', x: 20, y: 35, team: 'blue', label: '1' },
                { id: 'p2', x: 60, y: 35, team: 'blue', label: '2' },
                { id: 'p3', x: 40, y: 15, team: 'blue', label: '3' },
                { id: 'p4', x: 40, y: 55, team: 'blue', label: '4' },
                { id: 'p5', x: 35, y: 33, team: 'red', label: 'D1' },
                { id: 'p6', x: 45, y: 37, team: 'red', label: 'D2' },
              ],
              balls: [{ id: 'b1', x: 22, y: 35 }],
              arrows: [{ id: 'a1', fromX: 22, fromY: 35, toX: 40, toY: 15, type: 'pass' }],
            },
          },
          {
            nombre: 'Fase Principal: Juego de Posición 6v6 + 2 Comodines',
            phase: 'main_1',
            duration_min: 25,
            sets: 3,
            players: 14,
            intensity: 4,
            material: ['conos', 'petos azules/rojos/amarillos', 'balones'],
            objetivos: ['Superación de líneas', 'Tercer hombre'],
            descripcion: 'Espacio de 35x30m dividido en 2 zonas. El objetivo es circular y conectar con los comodines interiores para cambiar de orientación.',
            tactical_board_data: {
              pitchType: 'half',
              description: 'Juego de posición 6v6 + 2 comodines',
              cones: [
                { id: 'c1', x: 15, y: 12, color: 'yellow' },
                { id: 'c2', x: 75, y: 12, color: 'yellow' },
                { id: 'c3', x: 15, y: 58, color: 'yellow' },
                { id: 'c4', x: 75, y: 58, color: 'yellow' },
              ],
              players: [
                { id: 'p1', x: 20, y: 25, team: 'blue', label: 'MC' },
                { id: 'p2', x: 20, y: 45, team: 'blue', label: 'LAT' },
                { id: 'p3', x: 70, y: 25, team: 'blue', label: 'EXT' },
                { id: 'p4', x: 70, y: 45, team: 'blue', label: 'DC' },
                { id: 'p5', x: 45, y: 35, team: 'yellow', label: 'C1' },
                { id: 'p6', x: 35, y: 30, team: 'red', label: 'D1' },
                { id: 'p7', x: 55, y: 40, team: 'red', label: 'D2' },
              ],
              balls: [{ id: 'b1', x: 22, y: 25 }],
              arrows: [{ id: 'a1', fromX: 22, fromY: 25, toX: 45, toY: 35, type: 'pass' }],
            },
          },
          {
            nombre: 'Fase Aplicada: Partido Modificado con Zonas',
            phase: 'main_2',
            duration_min: 25,
            sets: 2,
            players: 16,
            intensity: 4,
            material: ['porterías', 'balones', 'petos'],
            objetivos: ['Finalización', 'Repliegue defensivo'],
            descripcion: 'Partido 8v8 a campo reducido. Gol tras superar la zona media con pase filtrado vale doble.',
            tactical_board_data: {
              pitchType: 'half',
              description: 'Partido condicionado con porterías',
              cones: [
                { id: 'c1', x: 10, y: 10, color: 'red' },
                { id: 'c2', x: 80, y: 10, color: 'red' },
                { id: 'c3', x: 10, y: 60, color: 'red' },
                { id: 'c4', x: 80, y: 60, color: 'red' },
              ],
              players: [
                { id: 'p1', x: 15, y: 35, team: 'white', label: 'PO' },
                { id: 'p2', x: 30, y: 20, team: 'blue', label: 'DEF' },
                { id: 'p3', x: 30, y: 50, team: 'blue', label: 'DEF' },
                { id: 'p4', x: 50, y: 35, team: 'blue', label: 'MED' },
                { id: 'p5', x: 65, y: 25, team: 'red', label: 'DEL' },
                { id: 'p6', x: 65, y: 45, team: 'red', label: 'DEL' },
              ],
              balls: [{ id: 'b1', x: 17, y: 35 }],
              arrows: [{ id: 'a1', fromX: 17, fromY: 35, toX: 30, toY: 20, type: 'pass' }],
            },
          },
          {
            nombre: 'Vuelta a la Calma: Estiramientos y Feedback',
            phase: 'cooldown',
            duration_min: 10,
            sets: 1,
            players: 16,
            intensity: 1,
            material: [],
            objetivos: ['Regeneración', 'Análisis grupal'],
            descripcion: 'Trote suave regenerativo, estiramientos activos y charla metodológica sobre los objetivos cumplidos.',
            tactical_board_data: {
              pitchType: 'half',
              description: 'Círculo central para feedback',
              players: [
                { id: 'p1', x: 45, y: 30, team: 'blue', label: '1' },
                { id: 'p2', x: 55, y: 30, team: 'blue', label: '2' },
                { id: 'p3', x: 45, y: 40, team: 'blue', label: '3' },
                { id: 'p4', x: 55, y: 40, team: 'blue', label: '4' },
              ],
              cones: [],
              balls: [],
              arrows: [],
            },
          }
        ]
      };
    }

    return NextResponse.json({ success: true, session: parsedSession });
  } catch (err: any) {
    console.error('[TrainingAssistant API] Excepción:', err);
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 });
  }
}
