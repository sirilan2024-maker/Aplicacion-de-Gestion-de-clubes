import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await params
    const { playerId, status } = await request.json()

    if (!matchId || !playerId || typeof status !== 'boolean') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('convocatorias')
      .update({ 
        asistencia_confirmada_familia: status,
        estado_asistencia: status ? 'Confirmado' : 'Ausente'
      })
      .eq('partido_id', matchId)
      .eq('player_id', playerId)

    if (error) {
      console.error('[API] Error updating match attendance:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // --- Notificar a los entrenadores del equipo ---
    try {
      // 1. Obtener detalles del partido y del jugador
      const { data: matchData } = await supabase
        .from('partidos')
        .select('equipo_id, rival_nombre')
        .eq('id', matchId)
        .single()
        
      const { data: playerData } = await supabase
        .from('players')
        .select('first_name, last_name')
        .eq('id', playerId)
        .single()

      if (matchData && matchData.equipo_id && playerData) {
        // 2. Obtener los entrenadores de este equipo
        const { data: coaches } = await supabase
          .from('team_coaches')
          .select('profile_id')
          .eq('team_id', matchData.equipo_id)

        if (coaches && coaches.length > 0) {
          const playerName = `${playerData.first_name} ${playerData.last_name || ''}`.trim()
          const matchName = matchData.rival_nombre ? `vs ${matchData.rival_nombre}` : 'el próximo partido'
          const actionText = status ? 'ha confirmado su asistencia al' : 'ha indicado que NO asistirá al'
          
          // 3. Crear las notificaciones
          const notificationsToInsert = coaches.map(c => ({
            profile_id: c.profile_id,
            title: `Respuesta de Convocatoria`,
            content: `${playerName} ${actionText} partido ${matchName}.`,
            is_read: false,
            type: 'partido',
          }))

          await supabase.from('notifications').insert(notificationsToInsert)
        }
      }
    } catch (notifErr) {
      console.error('[API] Error sending notification to coaches:', notifErr)
      // No bloqueamos la respuesta si falla la notificación
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[API] Error in POST /api/matches/[id]/attendance:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
