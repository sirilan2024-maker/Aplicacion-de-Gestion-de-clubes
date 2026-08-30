import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthenticatedContext, canUserAccessPlayer } from '@/lib/auth-helpers'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { context, error: authError } = await getAuthenticatedContext()
    if (!context || authError) {
      return NextResponse.json({ error: authError || 'No autenticado' }, { status: 401 })
    }

    const { eventId } = await params
    const { playerId, status } = await request.json()

    if (!eventId || !playerId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const access = await canUserAccessPlayer(adminClient, context, playerId)
    if (!access.allowed || !access.player || access.player.club_id !== context.profile.club_id) {
      return NextResponse.json({ error: access.reason || 'No tienes permisos sobre este jugador' }, { status: 403 })
    }

    // Ensure team_event exists (in case it's a match/partido)
    const { data: ev } = await adminClient.from('team_events').select('id').eq('id', eventId).maybeSingle()
    if (!ev) {
      const { data: pEv } = await adminClient.from('partidos').select('*').eq('id', eventId).maybeSingle()
      if (pEv) {
        await adminClient.from('team_events').insert({
          id: pEv.id,
          team_id: pEv.equipo_id,
          event_type: 'Partido',
          title: `Jornada vs ${pEv.rival_nombre || 'Rival'}`,
          date: pEv.fecha_hora ? pEv.fecha_hora.split('T')[0] : new Date().toISOString().split('T')[0],
          start_time: pEv.fecha_hora ? pEv.fecha_hora.split('T')[1].substring(0, 5) : '00:00'
        })
      }
    }

    const { error } = await adminClient
      .from('attendance')
      .upsert({ 
        player_id: playerId, 
        event_id: eventId,
        status: status,
        session_id: eventId 
      }, { onConflict: 'session_id,player_id' })

    if (error) {
      console.error('[API] Error updating event attendance:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[API] Error in POST /api/events/[id]/attendance:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

