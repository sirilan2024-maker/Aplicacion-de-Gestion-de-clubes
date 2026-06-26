const fs = require('fs');
const Groq = require('groq-sdk');

const envLines = fs.readFileSync('.env.local', 'utf-8').split('\n');
let key = '';
for (const line of envLines) {
  if (line.startsWith('GROQ_API_KEY=')) key = line.split('=')[1].trim().replace(/['"]/g, '');
}

const groq = new Groq({ apiKey: key });

const schemaString = `Esquema de la base de datos:
- Tabla 'attendance': id (uuid), session_id (uuid), player_id (uuid), status (text), created_at (timestamp with time zone)
- Tabla 'convocatorias': id (uuid), partido_id (uuid), player_id (uuid), titular (boolean), minutos_jugados (integer), asistencias (integer), goles (integer)
- Tabla 'match_events': id (uuid), partido_id (uuid), player_id (uuid), tipo_evento (text), minuto (integer), notas (text), created_at (timestamp with time zone), season_id (uuid)
- Tabla 'matches': id (uuid), club_id (uuid), team_id (uuid), opponent (text), date (timestamp with time zone), location (text), result (text), created_at (timestamp with time zone), status (text)
- Tabla 'partidos': id (uuid), club_id (uuid), equipo_id (uuid), rival_nombre (text), fecha_hora (timestamp with time zone), lugar (text), resultado_propio (integer), resultado_rival (integer), estado (text), created_at (timestamp with time zone), coach_report (text), coach_rating (integer), coach_summary (text), positive_aspects (text), improvement_aspects (text), attitude_notes (text), live_timer_started_at (timestamp with time zone), live_timer_elapsed_seconds (integer), first_half_duration_seconds (integer), second_half_duration_seconds (integer), season_id (uuid)
- Tabla 'players': id (uuid), club_id (uuid), team_id (uuid), first_name (text), last_name (text), dob (date), email (text), phone (text), emergency_contact (text), status (text), created_at (timestamp with time zone), position (text), avatar_url (text), dni (text)
- Tabla 'teams': id (uuid), club_id (uuid), name (text), category (text), season (text), coach_id (uuid), created_at (timestamp with time zone), color (text), members (integer), coaches (integer), invite_code (text), season_id (uuid)
`;

async function check() {
  const prompt = "a que jugadores marcaron mas goles fuera de casa";

  const sqlSystemPrompt = `Eres un ingeniero de datos experto. Tu tarea es convertir preguntas de lenguaje natural en consultas SQL de PostgreSQL.
Se te proporciona el siguiente esquema de base de datos de una aplicación de gestión de clubes deportivos:

${schemaString}

INSTRUCCIONES:
1. Analiza la pregunta del usuario y genera una consulta SQL (PostgreSQL) válida para obtener exactamente los datos necesarios para responderla.
2. Si la pregunta requiere analizar muchas filas, usa funciones de agregación (COUNT, SUM, AVG) en lugar de devolver miles de filas.
3. LIMITA tu consulta a un máximo de 100 filas si no hay agregación (LIMIT 100).
4. IMPORTANTE: Usa SIEMPRE el operador ILIKE en lugar de = para comparar nombres de equipos o jugadores (ej. t.name ILIKE '%cadete a%') para evitar problemas de mayúsculas/minúsculas.
5. IMPORTANTE: Para el campo 'lugar' en partidos, los valores son 'Local' y 'Visitante'. Si preguntan por 'fuera de casa', usa 'Visitante'.
6. IMPORTANTE: Los goles de nuestro equipo están en match_events con tipo_evento='Gol' y player_id NOT NULL. Los goles que NOS MARCA EL RIVAL (en contra) están en match_events con tipo_evento='Gol' y player_id IS NULL.
7. Si la pregunta pide datos que CLARAMENTE no existen en el esquema (ej. posesión de balón), devuelve un JSON con el campo "error" explicando cortésmente por qué no se puede responder.
8. DEBES devolver ÚNICAMENTE un objeto JSON válido con UNA de estas dos estructuras:
Si puedes generar SQL:
{
  "sql": "SELECT ... FROM ...;"
}
Si los datos no existen en el esquema:
{
  "error": "Explicación de por qué no tenemos esos datos en el sistema."
}
No incluyas markdown, ni backticks, solo el JSON puro.`;

  const sqlCompletion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: sqlSystemPrompt },
      { role: 'user', content: prompt }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.1,
    response_format: { type: 'json_object' }
  });

  console.log(sqlCompletion.choices[0]?.message?.content);
}

check();
