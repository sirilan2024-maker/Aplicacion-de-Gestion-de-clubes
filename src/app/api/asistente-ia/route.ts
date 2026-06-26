import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prompt = body.prompt || body.query;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt or query is required' },
        { status: 400 }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'Falta la variable de entorno GROQ_API_KEY en .env.local' },
        { status: 500 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Faltan variables de entorno de Supabase' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // 1. Obtener el esquema de la base de datos
    const schemaQuery = `
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `;
    const { data: schemaData, error: schemaError } = await supabase.rpc('execute_sql_query', { query_text: schemaQuery });
    
    if (schemaError) {
      console.error("Error obteniendo esquema:", schemaError);
      return NextResponse.json({ error: "Error interno al conectar con la base de datos" }, { status: 500 });
    }

    // Formatear esquema para la IA
    const schemaMap: Record<string, string[]> = {};
    for (const row of schemaData) {
      // IGNORAR TABLAS OBSOLETAS QUE CONFUNDEN A LA IA
      if (['matches', 'match_callups', 'match_comments', 'equipos_old_archive', 'events', 'exercises'].includes(row.table_name)) continue;

      if (!schemaMap[row.table_name]) schemaMap[row.table_name] = [];
      schemaMap[row.table_name].push(`${row.column_name} (${row.data_type})`);
    }
    
    let schemaString = "Esquema de la base de datos:\n";
    for (const [table, cols] of Object.entries(schemaMap)) {
      schemaString += `- Tabla '${table}': ${cols.join(', ')}\n`;
    }

    // ==========================================
    // FASE 1: Generación de SQL
    // ==========================================
    const sqlSystemPrompt = `Eres un ingeniero de datos experto. Tu tarea es convertir preguntas de lenguaje natural en consultas SQL de PostgreSQL.
Se te proporciona el siguiente esquema de base de datos de una aplicación de gestión de clubes deportivos:

${schemaString}

INSTRUCCIONES:
1. Analiza la pregunta del usuario y genera una consulta SQL (PostgreSQL) válida para obtener exactamente los datos necesarios para responderla.
2. Si la pregunta requiere analizar muchas filas, usa funciones de agregación (COUNT, SUM, AVG) en lugar de devolver miles de filas.
3. LIMITA tu consulta a un máximo de 100 filas. NO USES LIMIT 1, devuelve la lista completa agregada para que podamos pintar un gráfico rico en datos (ej. si preguntan "quién marcó más", devuelve la lista de todos ordenada, no solo el primero).
4. IMPORTANTE: Usa SIEMPRE el operador ILIKE en lugar de = para comparar nombres de equipos o jugadores (ej. t.name ILIKE '%infantil a%').
5. IMPORTANTE: NUNCA uses '=' con subconsultas porque devolverán error de múltiples filas. Usa SIEMPRE 'JOIN' directos para relacionar tablas (ej. JOIN partidos p ON c.partido_id = p.id JOIN teams t ON p.equipo_id = t.id). Si es estrictamente necesario usar una subconsulta, usa el operador 'IN'.
6. IMPORTANTE: NO TRADUZCAS los nombres de las tablas. Usa EXACTAMENTE los nombres en inglés que aparecen en el esquema (ej. usa 'teams', NO 'equipos').
7. IMPORTANTE: Para el campo 'lugar' en partidos, los valores son 'Local' y 'Visitante'. Si preguntan por 'fuera de casa', usa 'Visitante'.
8. IMPORTANTE: Los goles de nuestro equipo y las TARJETAS (amarilla/roja) están EXCLUSIVAMENTE en la tabla 'match_events' bajo 'tipo_evento'. NO inventes columnas como 'tarjetas_amarillas' en convocatorias.
9. Si la pregunta pide datos que CLARAMENTE no existen en el esquema (ej. posesión de balón), devuelve un JSON con el campo "error" explicando cortésmente por qué no se puede responder.
10. IMPORTANTE: Revisa minuciosamente los nombres de las columnas. Usa la tabla correcta para cada columna según el esquema.
11. DEBES devolver ÚNICAMENTE un objeto JSON válido con UNA de estas dos estructuras:
Si puedes generar SQL:
{
  "sql": "SELECT ... FROM ...;"
}
Si los datos no existen en el esquema:
{
  "error": "Explicación de por qué no tenemos esos datos en el sistema."
}
No incluyas markdown, ni backticks, solo el JSON puro.`;

    console.log("FASE 1: Solicitando SQL a la IA...");
    const sqlCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: sqlSystemPrompt },
        { role: 'user', content: prompt }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
      max_tokens: 300,
      response_format: { type: 'json_object' }
    });

    const sqlResponseText = sqlCompletion.choices[0]?.message?.content || "{}";
    let generatedSql = "";
    try {
      const parsedSql = JSON.parse(sqlResponseText);
      if (parsedSql.error) {
        return NextResponse.json({ type: "text", text: parsedSql.error });
      }
      generatedSql = parsedSql.sql || "";
    } catch (e) {
      console.error("Error parseando SQL JSON:", sqlResponseText);
    }
    
    // Si no encontramos SQL en JSON, intentamos extraerlo con regex
    if (!generatedSql) {
      const sqlMatch = sqlResponseText.match(/SELECT[\s\S]*?;/i);
      if (sqlMatch) {
        generatedSql = sqlMatch[0];
      }
    }

    if (!generatedSql) {
      console.log("TEXTO SQL FAILED:", sqlResponseText);
      return NextResponse.json({ type: "text", text: "Ocurrió un error al entender la pregunta. Reformula por favor." });
    }
    console.log("SQL GENERADO:", generatedSql);

    // Remover punto y coma final si existe para evitar problemas con la subconsulta en RPC
    generatedSql = generatedSql.trim();
    if (generatedSql.endsWith(';')) {
      generatedSql = generatedSql.slice(0, -1);
    }

    console.log("SQL GENERADO:", generatedSql);

    // ==========================================
    // FASE 2: Ejecutar SQL
    // ==========================================
    const { data: queryResult, error: queryError } = await supabase.rpc('execute_sql_query', { query_text: generatedSql });
    
    if (queryError) {
      console.error("Error ejecutando SQL generado:", queryError);
      return NextResponse.json({ type: "text", text: `Error SQL: ${queryError.message}. SQL generado: ${generatedSql}` });
    }

    console.log("RESULTADO SQL:", queryResult?.length ? `${queryResult.length} filas` : "Vacio");

    // Truncar resultados si son demasiados para no exceder el límite de tokens (TPM de Groq)
    let finalData = queryResult;
    if (finalData && finalData.length > 30) {
      finalData = finalData.slice(0, 30);
      console.log("Truncando queryResult a 30 filas para no exceder tokens.");
    }
    const dataString = JSON.stringify(finalData || [], null, 2);

    // ==========================================
    // FASE 3: Generación de la Respuesta Final
    // ==========================================
    const finalSystemPrompt = `Eres el analista de datos deportivos experto del club de fútbol Sporting Saladar.
Para responder a la pregunta del usuario, hemos consultado la base de datos y obtenido el siguiente resultado en formato JSON:

${dataString}

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

    console.log("FASE 3: Solicitando respuesta final a la IA...");
    const finalCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: finalSystemPrompt },
        { role: 'user', content: prompt }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
      max_tokens: 600,
      response_format: { type: 'json_object' }
    });

    const finalResponseText = finalCompletion.choices[0]?.message?.content || "";
    let parsedData;
    try {
      parsedData = JSON.parse(finalResponseText);
    } catch (parseError) {
      console.error("Error parseando final JSON:", finalResponseText);
      // Fallback: Si no es un JSON válido, devolvemos lo que haya respondido como texto plano
      return NextResponse.json({ type: "text", text: finalResponseText.replace(/```json/g, '').replace(/```/g, '').trim() });
    }

    return NextResponse.json(parsedData);

  } catch (error: any) {
    console.error('Error interno del Asistente IA Groq:', error);
    return NextResponse.json(
      { error: "Hubo un problema con el asistente", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
