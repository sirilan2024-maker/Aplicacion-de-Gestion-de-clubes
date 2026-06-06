'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createPlayer(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('No estás autenticado')
  }

  // Check user profile role and club
  const { data: profile } = await supabase.from('profiles').select('role, club_id').eq('id', user.id).single()
  
  let clubId = profile?.club_id

  if (!clubId) {
    // Si el usuario es antiguo y no tiene club, intentamos coger el primer club de la BD
    const { data: fallbackClub } = await supabase.from('clubs').select('id').limit(1).single()
    if (fallbackClub) {
      clubId = fallbackClub.id
      // Actualizamos el perfil para el futuro
      await supabase.from('profiles').update({ club_id: clubId }).eq('id', user.id)
      console.log('[DEBUG] Auto-asignado club_id al usuario:', clubId)
    } else {
      return { error: 'No tienes un club asignado y no existe ningún club en la base de datos. Por favor, crea uno primero.' }
    }
  }

  // 1. Datos del Jugador
  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const birthDate = formData.get('birthDate') as string
  const teamId = formData.get('teamId') as string
  const dni = formData.get('dni') as string || null
  const numLicenciaFed = formData.get('num_licencia_fed') as string || null
  const posicionPrincipal = formData.get('posicion_principal') as string || null

  const { data: player, error: playerError } = await supabase.from('players').insert({
    first_name: firstName,
    last_name: lastName,
    birth_date: birthDate,
    team_id: teamId === 'none' ? null : teamId,
    dni,
    num_licencia_fed: numLicenciaFed,
    posicion_principal: posicionPrincipal,
    club_id: clubId
  }).select().single()

  if (playerError || !player) {
    console.error('[PlayersAction] Error creating player:', playerError?.message)
    return { error: playerError?.message || 'Error al crear el jugador' }
  }

  // 2. Relación Familias
  const tutor1_nombre = formData.get('tutor1_nombre') as string
  if (tutor1_nombre) {
    const { error: familiaError } = await supabase.from('relacion_familias').insert({
      player_id: player.id,
      tutor1_nombre,
      tutor1_telefono: formData.get('tutor1_telefono') as string,
      tutor1_email: formData.get('tutor1_email') as string || null,
      tutor2_nombre: formData.get('tutor2_nombre') as string || null,
      tutor2_telefono: formData.get('tutor2_telefono') as string || null,
      descuento_hermanos: formData.get('descuentoHermanos') === 'true'
    })
    if (familiaError) console.error('[PlayersAction] Error familia:', familiaError.message)
  }

  // 3. Ficha Médica
  const { error: medicaError } = await supabase.from('fichas_medicas').insert({
    player_id: player.id,
    grupo_sanguineo: formData.get('grupo_sanguineo') as string || null,
    alergias: formData.get('alergias') as string || null,
    enfermedades: formData.get('enfermedades') as string || null,
    medicacion: formData.get('medicacion') as string || null,
  })
  if (medicaError) console.error('[PlayersAction] Error ficha medica:', medicaError.message)

  // 4. Autorizaciones
  const authImagen = formData.get('authImagen') === 'true'
  const authMedica = formData.get('authMedica') === 'true'
  const authDesplazamiento = formData.get('authDesplazamiento') === 'true'

  const { error: authError } = await supabase.from('autorizaciones').insert([
    { player_id: player.id, tipo_autorizacion: 'Imagen', firmado: authImagen },
    { player_id: player.id, tipo_autorizacion: 'Medica', firmado: authMedica },
    { player_id: player.id, tipo_autorizacion: 'Desplazamiento', firmado: authDesplazamiento }
  ])
  if (authError) console.error('[PlayersAction] Error autorizaciones:', authError.message)

  revalidatePath('/dashboard/players')
  return { success: true }
}

export async function deletePlayer(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('players')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[PlayersAction] Error deleting player:', error.message)
    return { error: error.message }
  }

  revalidatePath('/dashboard/players')
  return { success: true }
}
