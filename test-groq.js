const fs = require('fs');
const Groq = require('groq-sdk');

const envLines = fs.readFileSync('.env.local', 'utf-8').split('\n');
let key = '';
for (const line of envLines) {
  if (line.startsWith('GROQ_API_KEY=')) key = line.split('=')[1].trim().replace(/['"]/g, '');
}

const groq = new Groq({ apiKey: key });

async function check() {
  const queryResult = [
    { minuto: 70, goles: 4 }, { minuto: 40, goles: 4 },
    { minuto: 65, goles: 4 }, { minuto: 82, goles: 3 },
    { minuto: 13, goles: 3 }, { minuto: 35, goles: 3 },
    { minuto: 38, goles: 3 }, { minuto: 63, goles: 3 },
    { minuto: 55, goles: 3 }, { minuto: 46, goles: 2 }
  ];

  const prompt = "en que minuto le meten mas goles al cadete a";

  const finalSystemPrompt = `Eres el analista de datos deportivos experto del club de fútbol Sporting Saladar.
Para responder a la pregunta del usuario, hemos consultado la base de datos y obtenido el siguiente resultado en formato JSON:

${JSON.stringify(queryResult, null, 2)}

INSTRUCCIONES ESTRICTAS:
1. Responde a la pregunta original del usuario: "${prompt}" usando EXACTAMENTE los datos proporcionados arriba.
2. DEBES DEVOLVER TU RESPUESTA ÚNICA Y EXCLUSIVAMENTE EN FORMATO JSON VÁLIDO. No añadas markdown ni texto fuera del JSON.
3. El JSON debe seguir una de estas dos estructuras. Usa SIEMPRE la estructura "chart" si los datos de la base de datos devuelven una lista de múltiples elementos con valores numéricos (ej. ranking de jugadores, estadísticas de equipos). Usa "text" SOLO si la respuesta es una explicación simple, una fecha, o un dato único.

Si es una respuesta directa (texto):
{
  "type": "text",
  "text": "Tu análisis deportivo aquí. Sé conciso."
}

Si devuelves un ranking, comparativa o lista numérica (chart):
{
  "type": "chart",
  "text": "Análisis y explicación de los datos mostrados en el gráfico...",
  "label1": "Leyenda Métrica 1 (Ej. Tarjetas Amarillas)",
  "label2": "Leyenda Métrica 2 (Ej. Tarjetas Rojas - OMITIR SI NO HAY SEGUNDA MÉTRICA)",
  "data": [
    {
      "name": "Jugador/Equipo 1",
      "value1": 15,
      "value2": 2
    },
    {
      "name": "Jugador/Equipo 2",
      "value1": 8,
      "value2": 0
    }
  ]
}
Nota para gráficos: Omitir "label2" y "value2" del JSON si solo tienes una métrica numérica para graficar. 
EXTRA: Puedes añadir libremente otros campos dentro de los objetos de "data" (ej. "partido": "vs Elche", "fecha": "2025-10-12"). Estos campos extra se mostrarán automáticamente en el "Tooltip" al pasar el ratón por encima de la barra, dándole más contexto al usuario.`;

  const finalCompletion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: finalSystemPrompt },
      { role: 'user', content: prompt }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.1,
    response_format: { type: 'json_object' }
  });

  console.log(finalCompletion.choices[0]?.message?.content);
}

check();
