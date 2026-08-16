'use server'

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail, getTeamMessageEmailHtml } from "@/lib/email-service"

/**
 * Gets all chat channels for a user based on their club and role.
 * Also auto-creates the global channel and team channels if they don't exist.
 */
export async function getChannelsAction(clubId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "No autorizado" }

    const adminClient = await createAdminClient()

    // 1. Ensure Global Club Channel exists
    const { data: globalChannel } = await adminClient
      .from('chat_channels')
      .select('id, name')
      .eq('club_id', clubId)
      .eq('type', 'global')
      .single()

    if (!globalChannel) {
      await adminClient.from('chat_channels').insert({
        club_id: clubId,
        name: 'Anuncios del Club',
        type: 'global'
      })
    }

    // 2. Ensure Team Channels exist for all active teams in this club
    // We only create channels for teams in active seasons
    const { data: activeSeasons } = await adminClient.from('seasons').select('id').eq('club_id', clubId).eq('is_active', true)
    
    if (activeSeasons && activeSeasons.length > 0) {
      const activeSeasonIds = activeSeasons.map(s => s.id)
      const { data: teams } = await adminClient.from('teams').select('id, name').in('season_id', activeSeasonIds)
      
      if (teams && teams.length > 0) {
        // Find existing team channels
        const teamIds = teams.map(t => t.id)
        const { data: existingTeamChannels } = await adminClient
          .from('chat_channels')
          .select('team_id')
          .eq('club_id', clubId)
          .eq('type', 'team')
          .in('team_id', teamIds)
          
        const existingTeamIds = new Set(existingTeamChannels?.map(c => c.team_id) || [])
        
        // Create missing ones
        const channelsToCreate = teams.filter(t => !existingTeamIds.has(t.id)).map(t => ({
          club_id: clubId,
          team_id: t.id,
          name: t.name,
          type: 'team'
        }))
        
        if (channelsToCreate.length > 0) {
          await adminClient.from('chat_channels').insert(channelsToCreate)
        }
      }
    }

    // 3. Fetch channels the user is allowed to see.
    const { data: allChannels } = await adminClient
      .from('chat_channels')
      .select('*')
      .eq('club_id', clubId)
      .order('type', { ascending: true }) // 'global' comes before 'team'
      .order('name', { ascending: true })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const role = profile?.role

    let allowedChannels = allChannels || []

    if (role === 'family' || role === 'familia' || role === 'tutor' || role === 'jugador') {
      const familyTeamIds = new Set<string>()

      // 1. Check legacy players.tutor_id
      const { data: directPlayers } = await supabase.from('players').select('team_id').eq('tutor_id', user.id)
      directPlayers?.forEach(p => p.team_id && familyTeamIds.add(p.team_id))

      // 2. Check player_tutors relation (new system)
      const { data: linkedPlayers } = await supabase.from('player_tutors').select('players(team_id)').eq('tutor_id', user.id)
      linkedPlayers?.forEach((lp: any) => {
        if (lp.players?.team_id) familyTeamIds.add(lp.players.team_id)
      })

      // 3. also include if they are a player themselves
      const { data: myPlayer } = await supabase.from('players').select('team_id').eq('user_auth_id', user.id)
      myPlayer?.forEach(p => p.team_id && familyTeamIds.add(p.team_id))

      allowedChannels = allowedChannels.filter(c => c.type === 'global' || (c.team_id && familyTeamIds.has(c.team_id)))
    } else if (role === 'coach' || role === 'entrenador' || role === 'delegado') {
      const { data: directTeams } = await adminClient.from('teams').select('id').eq('coach_id', user.id)
      const directTeamIds = directTeams?.map(t => t.id) || []
      
      const { data: coachTeams } = await adminClient.from('team_coaches').select('team_id').eq('profile_id', user.id)
      const coachTeamIdsFromTable = coachTeams?.map(ct => ct.team_id) || []
      
      const coachTeamIds = new Set([...directTeamIds, ...coachTeamIdsFromTable])
      allowedChannels = allowedChannels.filter(c => c.type === 'global' || (c.team_id && coachTeamIds.has(c.team_id)))
    }

    // 4. Fetch read receipts to calculate unread counts (Basic implementation: we just get the user's last_read_at for each channel)
    // The UI will figure out unread count by comparing last_read_at with latest message created_at, or we do it here.
    // For simplicity, we just return the channels and we'll do real-time logic on the client.

    return { success: true, data: allowedChannels }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Gets messages for a specific channel
 */
export async function getMessagesAction(channelId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "No autorizado" }

    const adminClient = await createAdminClient()
    
    // Fetch messages without joining profiles
    const { data: messages, error } = await adminClient
      .from('chat_messages')
      .select('id, content, created_at, sender_id, channel_id')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
      
    if (error) throw error

    // Fetch profiles manually to avoid foreign key issues
    const senderIds = Array.from(new Set(messages.map(m => m.sender_id).filter(Boolean)))
    let profilesMap: Record<string, any> = {}
    if (senderIds.length > 0) {
      const { data: profiles } = await adminClient.from('profiles').select('id, first_name, last_name, role').in('id', senderIds)
      profiles?.forEach(p => profilesMap[p.id] = p)
    }

    const messagesWithProfiles = messages.map(m => ({
      ...m,
      profiles: profilesMap[m.sender_id] || { first_name: 'Usuario', last_name: 'Desconocido', role: '' }
    }))
    
    // Update read receipt for this user
    await adminClient.from('chat_read_receipts').upsert({
      channel_id: channelId,
      user_id: user.id,
      last_read_at: new Date().toISOString()
    }, { onConflict: 'channel_id,user_id' })

    return { success: true, data: messagesWithProfiles }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Sends a message to a channel
 */
export async function sendMessageAction(channelId: string, content: string) {
  try {
    if (!content || content.trim() === '') return { success: false, error: "El mensaje está vacío" }
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "No autorizado" }

    const adminClient = await createAdminClient()
    const { data: channel } = await adminClient.from('chat_channels').select('type').eq('id', channelId).single()
    
    if (channel?.type === 'global') {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role === 'family' || profile?.role === 'jugador') {
        return { success: false, error: "Solo los administradores pueden publicar anuncios." }
      }
    }

    const { data, error } = await adminClient.from('chat_messages').insert({
      channel_id: channelId,
      sender_id: user.id,
      content: content.trim()
    }).select().single()
    
    if (error) throw error
    
    // Update read receipt immediately
    await adminClient.from('chat_read_receipts').upsert({
      channel_id: channelId,
      user_id: user.id,
      last_read_at: new Date().toISOString()
    }, { onConflict: 'channel_id,user_id' })

    // ──────────────────────────────────────────────────────────────────────────
    // Envío automático de notificación por Email a las Familias / Jugadores
    // ──────────────────────────────────────────────────────────────────────────
    try {
      const { data: senderProfile } = await adminClient.from('profiles').select('first_name, last_name, role').eq('id', user.id).single()
      const senderName = senderProfile ? `${senderProfile.first_name || ''} ${senderProfile.last_name || ''}`.trim() : 'Cuerpo Técnico'
      const senderRole = senderProfile?.role || 'Entrenador'

      let recipientEmails: string[] = []
      let channelTitle = channel?.name || 'Canal de Comunicación'

      if (channel?.team_id) {
        // Obtener equipo y jugadores
        const { data: teamObj } = await adminClient.from('teams').select('name').eq('id', channel.team_id).single()
        if (teamObj?.name) channelTitle = teamObj.name

        // Emails de tutores directos en tabla players
        const { data: teamPlayers } = await adminClient
          .from('players')
          .select('email, tutor_email, tutor:profiles!players_tutor_id_fkey(email)')
          .eq('team_id', channel.team_id)

        teamPlayers?.forEach(p => {
          if (p.email) recipientEmails.push(p.email)
          if (p.tutor_email) recipientEmails.push(p.tutor_email)
          if (p.tutor && (p.tutor as any).email) recipientEmails.push((p.tutor as any).email)
        })

        // Emails de tutores vinculados en player_tutors
        const { data: linkedTutors } = await adminClient
          .from('player_tutors')
          .select('tutor:profiles(email), players!inner(team_id)')
          .eq('players.team_id', channel.team_id)

        linkedTutors?.forEach((lt: any) => {
          if (lt.tutor?.email) recipientEmails.push(lt.tutor.email)
        })
      }

      // Eliminar duplicados y excluir al propio remitente
      const uniqueEmails = Array.from(new Set(recipientEmails.map(e => e?.toLowerCase().trim()).filter(Boolean)))
        .filter(e => e !== user.email?.toLowerCase().trim())

      if (uniqueEmails.length > 0) {
        const emailHtml = getTeamMessageEmailHtml({
          senderName: senderName || 'Cuerpo Técnico',
          senderRole: senderRole,
          teamName: channelTitle,
          messageContent: content.trim(),
        })

        await sendEmail({
          to: uniqueEmails,
          subject: `📢 [${channelTitle}] Nuevo mensaje de ${senderName}`,
          html: emailHtml,
        })
      }
    } catch (emailErr) {
      console.error('Error enviando notificación por email del mensaje:', emailErr)
    }

    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function sendDisciplineAlertAction(playerId: string, teamId: string, playerName: string, teamName: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "No autorizado" }

    const { data: profile } = await supabase.from('profiles').select('club_id, role, roles').eq('id', user.id).single()
    if (!profile) return { success: false, error: "Perfil no encontrado" }
    
    // Check if user is admin, superadmin, or coordinador
    const hasAccess = ['admin', 'superadmin', 'coordinador'].includes(profile.role) || (profile.roles && profile.roles.some((r: string) => ['admin', 'superadmin', 'coordinador'].includes(r)))
    if (!hasAccess) {
      return { success: false, error: "No tienes permisos para enviar avisos disciplinarios" }
    }

    const adminClient = await createAdminClient()

    // 1. Get or create discipline channel for this team
    const channelName = `Avisos Disciplinarios - ${teamName}`
    let { data: channel } = await adminClient
      .from('chat_channels')
      .select('*')
      .eq('team_id', teamId)
      .eq('name', channelName)
      .single()

    if (!channel) {
      const { data: newChannel, error: createError } = await adminClient
        .from('chat_channels')
        .insert({
          club_id: profile.club_id,
          team_id: teamId,
          name: channelName,
          type: 'team'
        })
        .select()
        .single()
      
      if (createError) throw createError
      channel = newChannel
    }

    // 2. Send the message to the discipline channel (for coaches/admins)
    const messageContent = `⚠️ AVISO: El jugador **${playerName}** acumula 4 tarjetas amarillas y está apercibido. La próxima amarilla conllevará un partido de sanción.`
    const { data: message, error: messageError } = await adminClient.from('chat_messages').insert({
      channel_id: channel.id,
      sender_id: user.id,
      content: messageContent
    }).select().single()

    if (messageError) throw messageError

    // 2b. Also send to the regular TEAM channel so family members can see it in their chat
    const { data: teamChannel } = await adminClient
      .from('chat_channels')
      .select('id')
      .eq('team_id', teamId)
      .eq('type', 'team')
      .neq('name', channelName)
      .limit(1)
      .maybeSingle()

    if (teamChannel) {
      await adminClient.from('chat_messages').insert({
        channel_id: teamChannel.id,
        sender_id: user.id,
        content: `⚠️ Aviso disciplinario: El jugador ${playerName} está apercibido por acumulación de tarjetas amarillas.`
      })
    }

    // 3. Find coaches and coordinators for this team
    const { data: teamCoaches } = await adminClient.from('team_coaches').select('profile_id').eq('team_id', teamId)
    const coachIds = (teamCoaches || []).map(tc => tc.profile_id)
    
    const { data: adminsCoords } = await adminClient
      .from('profiles')
      .select('id')
      .eq('club_id', profile.club_id)
      .or('role.eq.admin,role.eq.superadmin,role.eq.coordinador,roles.cs.{"admin"},roles.cs.{"coordinador"}')
      
    const adminCoordIds = (adminsCoords || []).map(p => p.id)
    
    // 4. Find the player's family/tutors to also notify them
    const { data: playerData } = await adminClient
      .from('players')
      .select('tutor_id, player_tutors(tutor_id), parent1_email, parent2_email, email')
      .eq('id', playerId)
      .single()

    const familyUserIds = new Set<string>()
    if (playerData?.tutor_id) familyUserIds.add(playerData.tutor_id)
    if (Array.isArray(playerData?.player_tutors)) {
      (playerData.player_tutors as any[]).forEach(pt => {
        if (pt?.tutor_id) familyUserIds.add(pt.tutor_id)
      })
    }

    // Match family by email in profiles table
    const emails = [playerData?.parent1_email, playerData?.parent2_email, playerData?.email].filter(Boolean)
    if (emails.length > 0) {
      const { data: matchedProfiles } = await adminClient
        .from('profiles')
        .select('id')
        .in('email', emails)
      ;(matchedProfiles || []).forEach((p: any) => familyUserIds.add(p.id))
    }

    // Also check player_tutors table directly
    const { data: ptRows } = await adminClient
      .from('player_tutors')
      .select('tutor_id')
      .eq('player_id', playerId)
    ;(ptRows || []).forEach((pt: any) => { if (pt.tutor_id) familyUserIds.add(pt.tutor_id) })

    // Combine: coaches+admins (exclude sender) + family
    const staffTargets = Array.from(new Set([...coachIds, ...adminCoordIds])).filter(id => id !== user.id)
    const familyTargets = Array.from(familyUserIds)

    // 5a. Notify staff (coaches/admins)
    if (staffTargets.length > 0) {
      const staffNotifications = staffTargets.map(targetId => ({
        club_id: profile.club_id,
        user_id: targetId,
        type: 'disciplina',
        title: 'Jugador Apercibido',
        content: `El jugador ${playerName} (${teamName}) está apercibido.`,
        is_read: false
      }))
      const { error: notifError } = await adminClient.from('notifications').insert(staffNotifications)
      if (notifError) console.error("Error inserting staff notifications:", notifError)
    }

    // 5b. Notify family directly with a family-appropriate message
    if (familyTargets.length > 0) {
      const familyNotifications = familyTargets.map(targetId => ({
        club_id: profile.club_id,
        user_id: targetId,
        profile_id: targetId,
        type: 'disciplina',
        title: '⚠️ Aviso Disciplinario',
        content: `Tu jugador ${playerName} ha acumulado tarjetas amarillas y está apercibido. La próxima tarjeta amarilla podría conllevar una sanción de partido.`,
        is_read: false
      }))
      const { error: familyNotifError } = await adminClient.from('notifications').insert(familyNotifications)
      if (familyNotifError) console.error("Error inserting family notifications:", familyNotifError)
    }

    return { success: true, channelId: channel.id }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
