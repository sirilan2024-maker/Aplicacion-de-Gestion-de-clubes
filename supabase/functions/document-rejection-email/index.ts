import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

serve(async (req) => {
  try {
    const payload = await req.json()

    // Solo reaccionar cuando el estado cambia a 'rechazado'
    if (payload.type === 'UPDATE' && payload.record.status === 'rechazado' && payload.old_record.status !== 'rechazado') {
      const document = payload.record
      
      // Conectar a Supabase con Service Role
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      
      // Obtener el jugador y la ficha familiar para conocer el email del tutor
      const { data: player, error: playerError } = await supabase
        .from('players')
        .select(`
          first_name,
          last_name,
          families!family_id (
            tutor_1_profile_id,
            profiles!tutor_1_profile_id (
              email
            )
          )
        `)
        .eq('id', document.player_id)
        .single()

      if (playerError || !player) {
        console.error('Error fetching player or family data:', playerError)
        return new Response(JSON.stringify({ error: 'Player data not found' }), { status: 400 })
      }

      // Hack para sacar el email según la estructura (puede variar si el email está en auth.users)
      // Asumimos que podemos recuperar un correo para enviarle el link.
      // Si profiles no tiene email, habría que hacer un RPC a auth.users o recuperarlo de los metadatos de inscripción.
      const tutorEmail = "tutor@example.com" // Sustituir por la lectura real si el email está disponible
      const playerName = `${player.first_name} ${player.last_name}`
      
      // Magic Link Generado (para acceso directo a subsanar el documento)
      // Opcionalmente se puede usar supabase.auth.admin.generateLink() para un link autenticado.
      const magicLinkUrl = `${Deno.env.get('SITE_URL') || 'http://localhost:3000'}/dashboard/family/subsanacion/${document.id}`

      const emailSubject = `Subsanación de Documentación Requerida: ${playerName}`
      const emailBody = `
        Hola,

        Se ha revisado la documentación aportada para la inscripción de ${playerName}.
        El documento "${document.document_type}" ha sido marcado como RECHAZADO por secretaría.

        Motivo indicado por Secretaría:
        "${document.rejection_reason || 'Documento no válido o borroso.'}"

        Por favor, accede al siguiente enlace seguro para subir de nuevo el documento correcto:
        ${magicLinkUrl}

        Un saludo,
        Sporting Saladar
      `

      // TODO: Configurar conexión SMTP real cuando se provean las claves.
      // Simulamos envío mostrando en consola.
      console.log('--- ENVIANDO CORREO DE SUBSANACIÓN ---')
      console.log(`Para: ${tutorEmail}`)
      console.log(`Asunto: ${emailSubject}`)
      console.log(`Mensaje:\n${emailBody}`)
      console.log('--- FIN CORREO ---')

      return new Response(JSON.stringify({ success: true, message: 'Email simulated successfully.' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    return new Response(JSON.stringify({ message: 'Ignored webhook (no valid update to rejected).' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
