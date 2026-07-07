"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import crypto from "crypto"
import { headers } from "next/headers"

export async function createFamilyAndPlayerAction(playerData: any, familyAuthData: any) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "No autenticado" }

    const { data: profile } = await supabase.from('profiles').select('club_id').eq('id', user.id).single()
    if (!profile?.club_id) return { success: false, error: "No tienes club asignado" }

    const clubId = profile.club_id
    let familyProfileId = null

    // 1. Crear el usuario de la familia si se proporcionan datos de auth
    if (familyAuthData?.email && familyAuthData?.password) {
      const adminClient = createAdminClient()
      
      const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
        email: familyAuthData.email,
        password: familyAuthData.password,
        email_confirm: true // Saltamos la validación
      })

      if (authError) {
        return { success: false, error: "Error creando cuenta: " + authError.message }
      }

      if (authUser?.user) {
        familyProfileId = authUser.user.id
        // Upsert del perfil familiar
        await adminClient.from('profiles').upsert({
          id: familyProfileId,
          club_id: clubId,
          email: familyAuthData.email,
          role: 'family'
        })
      }
    }

    // 2. Crear el jugador
    const linkCode = crypto.randomBytes(5).toString('hex')
    const { data: insertedPlayer, error: playerError } = await supabase
      .from('players')
      .insert({
        ...playerData,
        club_id: clubId,
        tutor_id: familyProfileId,
        gdpr_consent: false,
        link_code: linkCode
      })
      .select()
      .single()

    if (playerError) {
      return { success: false, error: "Error creando jugador: " + playerError.message }
    }

    // 3. Vincular tutor ↔ jugador en player_tutors (necesario para la redirección de login)
    if (familyProfileId && insertedPlayer) {
      const adminClient = createAdminClient()
      await adminClient.from('player_tutors').upsert({
        player_id: insertedPlayer.id,
        tutor_id: familyProfileId
      }, { onConflict: 'player_id,tutor_id' })
    }

    // 4. Asignar temporada e historial si hay equipo
    if (playerData.team_id && insertedPlayer) {
      const { data: activeSeason } = await supabase.from('seasons').select('id').eq('club_id', clubId).eq('is_active', true).single()
      if (activeSeason) {
        await supabase.from('player_season_history').insert({
          player_id: insertedPlayer.id,
          club_id: clubId,
          season_id: activeSeason.id,
          team_id: playerData.team_id,
          status: 'active'
        })
      }
    }

    revalidatePath('/dashboard/club/miembros')
    
    return { 
      success: true, 
      playerId: insertedPlayer.id, 
      linkCode,
      familyCreated: !!familyProfileId
    }

  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
export async function getPlayerByLinkCodeAction(linkCode: string) {
  try {
    const adminClient = await createAdminClient()
    const { data: player, error } = await adminClient
      .from("players")
      .select("first_name, last_name, gdpr_consent")
      .eq("link_code", linkCode)
      .single()

    if (error || !player) {
      return { success: false, error: "Jugador no encontrado" }
    }

    return { success: true, data: player }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function acceptGdprAction({ linkCode, playerId }: { linkCode?: string, playerId?: string }) {
  try {
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'IP desconocida'
    const userAgent = headersList.get('user-agent') || 'Dispositivo desconocido'
    const consentData = {
      gdpr_consent: true,
      gdpr_consent_date: new Date().toISOString(),
      gdpr_consent_ip: ip,
      gdpr_consent_user_agent: userAgent,
      gdpr_consent_version: 'v1.0'
    }

    if (linkCode) {
      // Use admin client for anonymous public link
      const adminClient = await createAdminClient()
      const { error } = await adminClient
        .from('players')
        .update(consentData)
        .eq('link_code', linkCode)
        
      if (error) return { success: false, error: error.message }
    } else if (playerId) {
      // Must verify user is authenticated and is the tutor
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { success: false, error: "No autenticado" }
      
      const { error } = await supabase
        .from('players')
        .update(consentData)
        .eq('id', playerId)
        .eq('tutor_id', user.id)
        
      if (error) return { success: false, error: error.message }
    } else {
      return { success: false, error: "Parámetros inválidos" }
    }

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function exportRgpdAction(clubId: string) {
  try {
    const adminClient = await createAdminClient()
    const { data: players, error } = await adminClient
      .from('players')
      .select('first_name, last_name, gdpr_consent, gdpr_consent_date, gdpr_consent_ip, gdpr_consent_user_agent, gdpr_consent_version')
      .eq('club_id', clubId)
      .order('first_name')
      
    if (error) throw error
    
    // Generate CSV
    const headers = ['Nombre', 'Apellidos', 'Consentimiento', 'Fecha y Hora', 'IP', 'Dispositivo', 'Version']
    const rows = players.map(p => [
      p.first_name,
      p.last_name,
      p.gdpr_consent ? 'SI' : 'NO',
      p.gdpr_consent_date ? new Date(p.gdpr_consent_date).toLocaleString('es-ES') : '',
      p.gdpr_consent_ip || '',
      `"${(p.gdpr_consent_user_agent || '').replace(/"/g, '""')}"`,
      p.gdpr_consent_version || ''
    ])
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    
    return { success: true, csv: csvContent }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function updatePlayerPositionAction(playerId: string, newPosition: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: { message: "No autenticado" } }

    const { error } = await supabase
      .from('players')
      .update({ posicion: newPosition })
      .eq('id', playerId)

    if (error) {
      console.error("Error updating player position:", error)
      return { success: false, error }
    }

    revalidatePath('/dashboard/club/miembros')
    revalidatePath('/dashboard/equipos/[teamId]/plantilla', 'page')
    
    return { success: true }
  } catch (err: any) {
    return { success: false, error: { message: err.message } }
  }
}

export async function archivePlayerAction(playerId: string, isArchived: boolean = true) {
  try {
    const supabase = await createClient()

    // Comprobamos la autenticación
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: { message: "No autenticado" } }
    }

    const { data: profile } = await supabase.from('profiles').select('club_id').eq('id', user.id).single()
    const { data: activeSeason } = await supabase.from('seasons').select('id').eq('club_id', profile?.club_id).eq('is_active', true).single()

    const { error } = await supabase
      .from('players')
      .update({ status: isArchived ? 'inactive' : 'active' })
      .eq('id', playerId)

    if (activeSeason?.id) {
      await supabase
        .from('player_season_history')
        .update({ status: isArchived ? 'inactive' : 'active' })
        .eq('player_id', playerId)
        .eq('season_id', activeSeason.id)
    }

    if (error) {
      console.error("Error archiving player:", error)
      return { success: false, error }
    }

    revalidatePath('/dashboard/club/miembros')
    revalidatePath('/dashboard/equipos/[teamId]/plantilla', 'page')
    
    return { success: true }
  } catch (err: any) {
    return { success: false, error: { message: err.message } }
  }
}

export async function reactivatePlayerAction(playerId: string, teamId: string | null) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: { message: "No autenticado" } }
    }

    const { data: profile } = await supabase.from('profiles').select('club_id').eq('id', user.id).single()
    const { data: activeSeason } = await supabase.from('seasons').select('id').eq('club_id', profile?.club_id).eq('is_active', true).single()

    // Reactivar al jugador
    const { error: updateError } = await supabase
      .from('players')
      .update({ status: 'active', team_id: teamId })
      .eq('id', playerId)

    if (updateError) {
      return { success: false, error: updateError }
    }

    // Si se le ha asignado un equipo y hay temporada activa, lo registramos en el historial
    if (teamId && activeSeason?.id) {
      // Evitar duplicados (por si ya estuviera)
      const { data: existing } = await supabase
        .from('player_season_history')
        .select('id')
        .eq('player_id', playerId)
        .eq('season_id', activeSeason.id)
        .eq('team_id', teamId)
        .maybeSingle()
        
      if (!existing) {
        await supabase.from('player_season_history').insert({
          player_id: playerId,
          team_id: teamId,
          season_id: activeSeason.id,
          club_id: profile?.club_id,
          status: 'active'
        })
      }
    }

    revalidatePath('/dashboard/club/miembros')
    revalidatePath('/dashboard/club/miembros/archivo')
    
    return { success: true }
  } catch (err: any) {
    return { success: false, error: { message: err.message } }
  }
}

export async function deletePlayerAction(playerId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: { message: "No autenticado" } }
    }

    // Get current first name
    const { data: player } = await supabase
      .from('players')
      .select('first_name')
      .eq('id', playerId)
      .single()

    // 1. Manually cascade delete from related tables to avoid FK constraint errors
    await supabase.from('player_season_history').delete().eq('player_id', playerId)
    await supabase.from('player_tutors').delete().eq('player_id', playerId)
    // En caso de que exista ficha médica, dependencias etc.
    await supabase.from('player_medical_records').delete().eq('player_id', playerId)

    // 2. Hard delete from players table
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId)

    if (error) {
      console.error("Error deleting player:", error)
      return { success: false, error }
    }

    revalidatePath('/dashboard/club/miembros')
    
    return { success: true }
  } catch (err: any) {
    return { success: false, error: { message: err.message } }
  }
}

export async function getPlayerTutorsAction(playerId: string) {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('player_tutors')
      .select('profiles(id, first_name, last_name, email, role)')
      .eq('player_id', playerId)

    if (error) {
      return { success: false, error: error.message }
    }
    
    return { success: true, tutors: data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getClubStaffAction(clubId: string) {
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('profiles')
      .select(`
        id, 
        first_name, 
        last_name, 
        email, 
        role,
        phone,
        dni,
        birth_date,
        license_number,
        avatar_url,
        team_coaches(teams(id, name, color))
      `)
      .eq('club_id', clubId)
      .not('role', 'in', '("tutor","familia","family","jugador")')
    
    if (error) throw error

    const mappedData = data.map(profile => {
      const tcArray = profile.team_coaches || [];
      const teamsArray = tcArray.map((tc: any) => tc.teams).filter(Boolean);
      return {
        ...profile,
        teams: teamsArray,
        team_coaches: undefined
      }
    })

    return { success: true, data: mappedData }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
