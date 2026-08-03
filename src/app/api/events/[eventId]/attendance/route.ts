import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { playerId, status } = await request.json()

    if (!eventId || !playerId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()

    // Ensure team_event exists (in case it's a match/partido)
    const { data: ev } = await supabase.from('team_events').select('id').eq('id', eventId).maybeSingle()
    if (!ev) {
      const { data: pEv } = await supabase.from('partidos').select('*').eq('id', eventId).maybeSingle()
      if (pEv) {
        await supabase.from('team_events').insert({
          id: pEv.id,
          team_id: pEv.equipo_id,
          event_type: 'Partido',
          title: `Jornada vs ${pEv.rival_nombre || 'Rival'}`,
          date: pEv.fecha_hora ? pEv.fecha_hora.split('T')[0] : new Date().toISOString().split('T')[0],
          start_time: pEv.fecha_hora ? pEv.fecha_hora.split('T')[1].substring(0, 5) : '00:00'
        })
      }
    }

    // Assuming we insert a row with a dummy session_id or just insert by event_id 
    // depending on the schema. We will use upsert.
    // If session_id is NOT NULL constraint, we generate a UUID for it. Let's use crypto.randomUUID() for safety if it complains.
    const { error } = await supabase
      .from('attendance')
      .upsert({ 
        player_id: playerId, 
        event_id: eventId,
        status: status,
        // session_id is normally for training sessions, we might just put the eventId there as a workaround
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
