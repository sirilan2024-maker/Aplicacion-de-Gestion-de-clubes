import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const nowISO = new Date().toISOString()

    // 1. Encontrar eventos de equipo programados para recordar AHORA o en el PASADO y que NO se hayan enviado
    const { data: events } = await supabase
      .from('team_events')
      .select('id, title, date, start_time, team_id')
      .lte('rsvp_reminder_time', nowISO)
      .eq('rsvp_reminder_sent', false)

    // 2. Encontrar partidos programados para recordar AHORA o en el PASADO y que NO se hayan enviado
    const { data: partidos } = await supabase
      .from('partidos')
      .select('id, rival_nombre, fecha_hora, equipo_id')
      .lte('rsvp_reminder_time', nowISO)
      .eq('rsvp_reminder_sent', false)

    let notificationsCreated = 0

    if (events && events.length > 0) {
      for (const ev of events) {
        const { data: players } = await supabase
          .from('players')
          .select('first_name, tutor_id')
          .eq('team_id', ev.team_id)
          .not('tutor_id', 'is', null)

        if (players && players.length > 0) {
          const toInsert = players.map(p => ({
            profile_id: p.tutor_id,
            title: `Recordatorio: ${ev.title || 'Evento'}`,
            content: `Tienes un evento programado (${ev.title || 'Evento'}) el ${new Date(ev.date).toLocaleDateString('es-ES')} a las ${ev.start_time?.slice(0, 5)}. ¿Vas a asistir? Por favor, confirma asistencia.`,
            read: false
          }))
          
          await supabase.from('notifications').insert(toInsert)
          notificationsCreated += toInsert.length
        }
        
        // Marcar como enviado
        await supabase
          .from('team_events')
          .update({ rsvp_reminder_sent: true })
          .eq('id', ev.id)
      }
    }

    if (partidos && partidos.length > 0) {
      for (const p of partidos) {
        const { data: convocatorias } = await supabase
          .from('convocatorias')
          .select('player_id, players(first_name, tutor_id)')
          .eq('partido_id', p.id)
          .eq('status', 'convocado')

        if (convocatorias && convocatorias.length > 0) {
          const toInsert = convocatorias
            .filter(c => (c.players as any)?.tutor_id)
            .map(c => ({
              profile_id: (c.players as any).tutor_id,
              title: `Convocatoria: Partido vs ${p.rival_nombre || 'Rival'}`,
              content: `Recordatorio de partido contra ${p.rival_nombre || 'Rival'} el ${new Date(p.fecha_hora).toLocaleDateString('es-ES')}. ¿Vas a asistir? Por favor, confirma asistencia.`,
              read: false,
              match_id: p.id
            }))

          if (toInsert.length > 0) {
            await supabase.from('notifications').insert(toInsert)
            notificationsCreated += toInsert.length
          }
        }
        
        // Marcar como enviado
        await supabase
          .from('partidos')
          .update({ rsvp_reminder_sent: true })
          .eq('id', p.id)
      }
    }

    return NextResponse.json({ success: true, message: `${notificationsCreated} enviadas` })
  } catch (error: any) {
    console.error('[API] Error send-reminders:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
