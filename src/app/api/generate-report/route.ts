import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Comprobar rol de admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'metodologo') {
      return NextResponse.json({ error: 'Acceso denegado. Rol insuficiente.' }, { status: 403 })
    }

    const body = await req.json()
    const { prompt, entityType, entityId } = body // e.g. entityType: 'player', 'team', 'match'

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt requerido' }, { status: 400 })
    }

    // 1. Recopilar datos relevantes basados en la entidad solicitada
    let contextData = {}

    if (entityType === 'player' && entityId) {
      const { data: player } = await supabase.from('players').select('*').eq('id', entityId).single()
      const { data: attendance } = await supabase.from('attendance').select('*').eq('player_id', entityId)
      contextData = { player, attendance }
    } else if (entityType === 'team' && entityId) {
      const { data: team } = await supabase.from('teams').select('*').eq('id', entityId).single()
      const { data: players } = await supabase.from('players').select('*').eq('team_id', entityId)
      contextData = { team, players }
    }

    // 2. Preparar el prompt para el LLM (e.g., OpenAI o Anthropic)
    // Aquí conectarías con la SDK de tu proveedor de IA. Por ejemplo:
    /*
    const completion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: 'Eres un analista deportivo experto del Sporting Saladar.' },
        { role: 'user', content: `Genera un informe basado en este prompt: "${prompt}". Datos de contexto: ${JSON.stringify(contextData)}` }
      ],
      model: 'gpt-4o',
    });
    const reportText = completion.choices[0].message.content;
    */

    // Simulación temporal para la estructura
    const reportText = `[SIMULACIÓN DE INFORME IA]\n\nContexto analizado: ${Object.keys(contextData).join(', ')}\n\nRespondiendo a: "${prompt}"\n\nEl análisis indica un rendimiento positivo, destacando...`

    return NextResponse.json({ report: reportText, contextUsed: Object.keys(contextData) })
  } catch (error: any) {
    console.error('Error generando informe:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
