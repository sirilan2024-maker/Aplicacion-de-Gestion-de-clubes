'use server'

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

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
      const { data: players } = await supabase.from('players').select('team_id').eq('tutor_id', user.id)
      const familyTeamIds = new Set(players?.map(p => p.team_id) || [])
      
      // also include if they are a player themselves
      const { data: myPlayer } = await supabase.from('players').select('team_id').eq('user_id', user.id)
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

    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
