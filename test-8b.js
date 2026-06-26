const fs = require('fs');
const Groq = require('groq-sdk');
const envLines = fs.readFileSync('.env.local', 'utf-8').split('\n');
let key = '';
for (const line of envLines) {
  if (line.startsWith('GROQ_API_KEY=')) key = line.split('=')[1].trim().replace(/['"]/g, '');
}
const groq = new Groq({ apiKey: key });

const schemaString = `Esquema de la base de datos:
- Tabla 'partidos': id (uuid), club_id (uuid), equipo_id (uuid), rival_nombre (text), fecha_hora (timestamp with time zone), lugar (text), resultado_propio (integer), resultado_rival (integer), estado (text)
- Tabla 'match_events': id (uuid), partido_id (uuid), player_id (uuid), tipo_evento (text), minuto (integer)
- Tabla 'teams': id (uuid), club_id (uuid), name (text)`;

async function check() {
  const sqlSystemPrompt = `Eres un ingeniero de datos experto.
${schemaString}
DEBES devolver ÚNICAMENTE un objeto JSON válido con la estructura: {"sql": "SELECT..."}`;
  
  const sqlCompletion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: sqlSystemPrompt },
      { role: 'user', content: 'en que minuto le meten mas goles al cadete a' }
    ],
    model: 'llama-3.1-8b-instant',
    temperature: 0.1,
    response_format: { type: 'json_object' }
  });
  console.log(sqlCompletion.choices[0]?.message?.content);
}
check();
