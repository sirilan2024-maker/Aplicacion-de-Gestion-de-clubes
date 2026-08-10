import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    // Use admin client so we can fetch club_id and insert notifications without RLS issues
    const supabase = await createAdminClient()
    const nowISO = new Date().toISOString()

    // 1. Encontrar eventos de equipo programados para recordar AHORA o en el PASADO y que NO se hayan enviado
    const { data: events } = await supabase
      .from('team_events')
      .select('id, title, date, start_time, team_id, teams(club_id)')
      .lte('rsvp_reminder_time', nowISO)
      .eq('rsvp_reminder_sent', false)

    // 2. Encontrar partidos programados para recordar AHORA o en el PASADO y que NO se hayan enviado
    const { data: partidos } = await supabase
      .from('partidos')
      .select('id, rival_nombre, fecha_hora, equipo_id, equipos:equipo_id(club_id)')
      .lte('rsvp_reminder_time', nowISO)
      .eq('rsvp_reminder_sent', false)

    let notificationsCreated = 0

    if (events && events.length > 0) {
      for (const ev of events) {
        const clubId = (ev.teams as any)?.club_id
        
        // Get all players in this team with their tutor IDs
        const { data: players } = await supabase
          .from('players')
          .select('id, first_name, tutor_id')
          .eq('team_id', ev.team_id)
          .not('tutor_id', 'is', null)

        if (players && players.length > 0 && clubId) {
          const toInsert = players.map(p => ({
            user_id: p.tutor_id,
            profile_id: p.tutor_id,
            club_id: clubId,
            type: 'reminder',
            title: `Recordatorio: ${ev.title || 'Evento'}`,
            content: `Tienes un evento programado (${ev.title || 'Evento'}) el ${new Date(ev.date).toLocaleDateString('es-ES')} a las ${ev.start_time?.slice(0, 5)}. ¿Vas a asistir? Por favor, confirma asistencia.`,
            is_read: false,
          }))
          
          const { error: insertErr } = await supabase.from('notifications').insert(toInsert)
          if (insertErr) {
            console.error('[send-reminders] Error inserting event notifications:', insertErr.message)
          } else {
            notificationsCreated += toInsert.length
          }
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
        const clubId = (p as any).equipos?.club_id

        const { data: convocatorias } = await supabase
          .from('convocatorias')
          .select('player_id, players(id, first_name, tutor_id)')
          .eq('partido_id', p.id)
          .eq('status', 'convocado')

        if (convocatorias && convocatorias.length > 0 && clubId) {
          const toInsert = convocatorias
            .filter(c => (c.players as any)?.tutor_id)
            .map(c => ({
              user_id: (c.players as any).tutor_id,
              profile_id: (c.players as any).tutor_id,
              club_id: clubId,
              type: 'partido',
              title: `Convocatoria: Partido vs ${p.rival_nombre || 'Rival'}`,
              content: `Recordatorio de partido contra ${p.rival_nombre || 'Rival'} el ${new Date(p.fecha_hora).toLocaleDateString('es-ES')}. ¿Vas a asistir? Por favor, confirma asistencia.`,
              is_read: false,
            }))

          if (toInsert.length > 0) {
            const { error: insertErr } = await supabase.from('notifications').insert(toInsert)
            if (insertErr) {
              console.error('[send-reminders] Error inserting match notifications:', insertErr.message)
            } else {
              notificationsCreated += toInsert.length
            }
          }
        }
        
        // Marcar como enviado
        await supabase
          .from('partidos')
          .update({ rsvp_reminder_sent: true })
          .eq('id', p.id)
      }
    }

    return NextResponse.json({ success: true, message: `${notificationsCreated} notificaciones enviadas` })
  } catch (error: any) {
    console.error('[API] Error send-reminders:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
