import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthenticatedContext, canUserAccessMatch, canUserAccessPlayer } from '@/lib/auth-helpers'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const { context, error: authError } = await getAuthenticatedContext()
    if (!context || authError) {
      return NextResponse.json({ error: authError || 'No autenticado' }, { status: 401 })
    }

    const { matchId } = await params
    const { playerId, status } = await request.json()

    if (!matchId || !playerId || typeof status !== 'boolean') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    const matchAccess = await canUserAccessMatch(adminClient, context, matchId)
    if (!matchAccess.allowed) {
      return NextResponse.json({ error: matchAccess.reason || 'No tienes permisos sobre este partido' }, { status: 403 })
    }

    const playerAccess = await canUserAccessPlayer(adminClient, context, playerId)
    if (!playerAccess.allowed || !playerAccess.player || playerAccess.player.club_id !== context.profile.club_id) {
      return NextResponse.json({ error: playerAccess.reason || 'No tienes permisos sobre este jugador' }, { status: 403 })
    }

    const { error } = await adminClient
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
      const { data: matchData } = await adminClient
        .from('partidos')
        .select('equipo_id, rival_nombre')
        .eq('id', matchId)
        .single()
        
      const { data: playerData } = await adminClient
        .from('players')
        .select('first_name, last_name')
        .eq('id', playerId)
        .single()

      if (matchData && matchData.equipo_id && playerData) {
        // 2. Obtener los entrenadores de este equipo
        const { data: coaches } = await adminClient
          .from('team_coaches')
          .select('profile_id')
          .eq('team_id', matchData.equipo_id)

        if (coaches && coaches.length > 0) {
          const playerName = `${playerData.first_name} ${playerData.last_name || ''}`.trim()
          const matchName = matchData.rival_nombre ? `vs ${matchData.rival_nombre}` : 'el próximo partido'
          const actionText = status ? 'ha confirmado su asistencia al' : 'ha indicado que NO asistirá al'
          
          // 3. Crear las notificaciones
          const notificationsToInsert = coaches.map((c: { profile_id: string }) => ({
            profile_id: c.profile_id,
            title: `Respuesta de Convocatoria`,
            content: `${playerName} ${actionText} partido ${matchName}.`,
            is_read: false,
            type: 'partido',
          }))

          await adminClient.from('notifications').insert(notificationsToInsert)
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
