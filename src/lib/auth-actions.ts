'use server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

// ─── Existing: Login ──────────────────────────────────────────────────────────
export async function login(formData: FormData) {
  const email    = formData.get('email')    as string;
  const password = formData.get('password') as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  // Get the user session to identify the user ID
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    revalidatePath('/', 'layout');
    return redirect('/dashboard');
  }

  // Fetch the user's profile to obtain the role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = (profile?.role as string) ?? 'coach';
  let destination = '/dashboard';
  if (role === 'admin') destination = '/dashboard/equipos';
  else if (role === 'coach' || role === 'entrenador') destination = '/dashboard/mis-equipos';
  else if (role === 'tutor' || role === 'familia' || role === 'family') {
    // Check if they have linked children to redirect them straight into the context
    const { data: tutors } = await supabase
      .from('player_tutors')
      .select('player_id')
      .eq('tutor_id', user.id)
      .limit(1)
      .maybeSingle();

    if (tutors && tutors.player_id) {
      destination = `/dashboard/family/e/${tutors.player_id}/perfil`;
    } else {
      destination = '/dashboard/family';
    }
  }
  else destination = '/dashboard/mi-perfil';

  revalidatePath('/', 'layout');
  return redirect(destination);
};

// ─── Existing: Simple register (kept for legacy /register page) ───────────────
export async function register(formData: FormData) {
  const email     = formData.get('email')     as string
  const password  = formData.get('password')  as string
  const firstName = formData.get('firstName') as string
  const lastName  = formData.get('lastName')  as string
  const role      = formData.get('role')      as string || 'coach'

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      data: { first_name: firstName, last_name: lastName, role },
    },
  })

  if (error) {
    console.error('[AuthAction] Register error:', error.message)
    return redirect(`/register?error=${encodeURIComponent(error.message)}`)
  }

  return redirect('/login?message=Registro exitoso. Verifica tu correo electrónico para confirmar.')
}

// ─── NEW: Register via invite code ───────────────────────────────────────────
export type RegisterWithInviteResult =
  | { success: true;  requireEmailVerification: boolean }
  | { success: false; error: string }

export async function registerWithInviteCode(
  formData: FormData
): Promise<RegisterWithInviteResult> {
  const inviteCode = (formData.get('invite_code') as string)?.trim().toUpperCase()
  const email      = (formData.get('email')        as string)?.trim()
  const password   =  formData.get('password')     as string
  const firstName  = (formData.get('first_name')   as string)?.trim()
  const lastName   = (formData.get('last_name')    as string)?.trim()
  const phone      = (formData.get('phone')        as string)?.trim() || null
  const role       =  formData.get('role')         as string

  // ── Validaciones básicas ─────────────────────────────────────────────────
  if (!inviteCode || !email || !password || !firstName || !lastName || !role) {
    return { success: false, error: 'Todos los campos son obligatorios.' }
  }

  if (!['jugador', 'tutor', 'entrenador'].includes(role)) {
    return { success: false, error: 'Rol no permitido para registro público.' }
  }

  if (password.length < 8) {
    return { success: false, error: 'La contraseña debe tener al menos 8 caracteres.' }
  }

  // ── Usar cliente sin sesión para la búsqueda pública del equipo ──────────
  const supabase = await createClient()
  const adminSupabase = await createAdminClient()

  // ── 1. Buscar el equipo por invite_code ──────────────────────────────────
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('id, name, club_id')
    .eq('invite_code', inviteCode)
    .single()

  if (teamError || !team) {
    return { success: false, error: 'Código de invitación inválido o no encontrado.' }
  }

  const registrationType = (formData.get('registration_type') as string) || 'new' // 'pin' or 'new'
  const pinCode          = (formData.get('pin_code') as string)?.trim()
  const childFirstName   = (formData.get('child_first_name') as string)?.trim()
  const childLastName    = (formData.get('child_last_name') as string)?.trim()
  const childBirthDate   = (formData.get('child_birth_date') as string)

  // Validate specific tutor fields
  if (role === 'tutor') {
    if (registrationType === 'pin' && !pinCode) {
      return { success: false, error: 'Debes introducir un código PIN.' }
    }
    if (registrationType === 'new' && (!childFirstName || !childLastName || !childBirthDate)) {
      return { success: false, error: 'Debes introducir todos los datos del niño.' }
    }
  }

  // ── 2. Crear usuario en Supabase Auth ────────────────────────────────────
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      data: {
        first_name: firstName,
        last_name:  lastName,
        role:       role,
        club_id:    team.club_id,
        team_id:    team.id,
      },
    },
  })

  if (signUpError) {
    console.error('[InviteRegister] signUp error:', signUpError.message)
    return { success: false, error: signUpError.message }
  }

  const userId = authData.user?.id
  if (!userId) {
    return { success: false, error: 'No se pudo crear el usuario. Inténtalo de nuevo.' }
  }

  // ── 3. Lógica de Jugador/Tutor ──
  // Get active season
  const { data: activeSeason } = await adminSupabase
    .from('seasons')
    .select('id')
    .eq('club_id', team.club_id)
    .eq('is_active', true)
    .single()

  let linkedPlayerId: string | null = null

  if (role === 'tutor') {
    if (registrationType === 'pin') {
      // Find player by link_code
      const { data: playerByPin, error: pinSearchError } = await supabase
        .from('players')
        .select('id, club_id')
        .eq('link_code', pinCode)
        .eq('team_id', team.id)
        .single()
        
      if (pinSearchError || !playerByPin) {
        console.error('[InviteRegister] PIN invalid:', pinSearchError?.message)
        // Cleanup created auth user (not strictly necessary but good practice)
        return { success: false, error: 'El PIN introducido no es válido o no pertenece a este equipo.' }
      }
      
      linkedPlayerId = playerByPin.id
      
      // Link via player_tutors
      await adminSupabase.from('player_tutors').insert({
        player_id: linkedPlayerId,
        tutor_id: userId
      })

    } else {
      // Create new player record from scratch
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .insert({
          first_name:   childFirstName,
          last_name:    childLastName,
          team_id:      team.id,
          club_id:      team.club_id,
          birth_date:   childBirthDate,
          tutor_id:     userId, // Mantenemos tutor_id temporalmente por retrocompatibilidad
          parent1_name: firstName,
          parent1_last_name: lastName,
          parent1_phone: phone,
          parent1_email: email,
          parent_contact: `${firstName} ${lastName} - ${phone || 'Sin teléfono'}`,
          gdpr_consent: true,
        })
        .select('id')
        .single()
        
      if (playerError) {
        console.error('[InviteRegister] player insert error:', playerError.message)
      } else if (playerData) {
        linkedPlayerId = playerData.id
        // Link via player_tutors
        await adminSupabase.from('player_tutors').insert({
          player_id: linkedPlayerId,
          tutor_id: userId
        })
        // Añadir a player_season_history para que aparezca en la plantilla
        await adminSupabase.from('player_season_history').insert({
          player_id: linkedPlayerId,
          team_id: team.id,
          club_id: team.club_id,
          season_id: activeSeason?.id || null,
          status: 'active'
        })
      }
    }
  } else if (role === 'jugador') {
    // Si es un jugador adulto registrándose a sí mismo
    const { data: playerData, error: playerError } = await supabase
      .from('players')
      .insert({
        first_name:   firstName,
        last_name:    lastName,
        team_id:      team.id,
        club_id:      team.club_id,
        gdpr_consent: true,
        birth_date:   new Date().toISOString().split('T')[0],
        user_auth_id: userId,
      })
      .select('id')
      .single()

    if (playerError) {
      console.error('[InviteRegister] player insert error:', playerError.message)
    } else if (playerData) {
      linkedPlayerId = playerData.id
      // Añadir a player_season_history para que aparezca en la plantilla
      await adminSupabase.from('player_season_history').insert({
        player_id: linkedPlayerId,
        team_id: team.id,
        club_id: team.club_id,
        season_id: activeSeason?.id || null,
        status: 'active'
      })
    }
  } else if (role === 'entrenador') {
    // El rol entrenador no crea una ficha de jugador. 
    // Lo asignamos a la tabla team_coaches
    await adminSupabase.from('team_coaches').insert({
      team_id: team.id,
      profile_id: userId,
      club_id: team.club_id
    })
  }

  // ── 4. Insertar/Actualizar perfil ──
  // Solo intentamos upsert; si ya existe, actualiza los roles y campos vinculados.
  const { error: profileError } = await adminSupabase
    .from('profiles')
    .upsert({
      id:               userId,
      email,
      first_name:       firstName,
      last_name:        lastName,
      phone:            phone,
      role:             role,
      club_id:          team.club_id,
      team_id:          team.id,
      linked_player_id: linkedPlayerId,
    }, { onConflict: 'id' })

  if (profileError) {
    console.error('[InviteRegister] profile upsert error:', profileError.message)
  }

  // ── 5. Éxito — pedir verificación de email ────────────────────────────────
  return { success: true, requireEmailVerification: true }
}

// ─── Existing: Sign Out ───────────────────────────────────────────────────────
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  return redirect('/login')
}

// ─── NEW: Register Staff via Invitation Link ─────────────────────────────────
export interface RegisterInvitedStaffResult {
  success: boolean
  requireEmailVerification?: boolean
  error?: string
  existingUser?: boolean
}

export async function registerInvitedStaffAction(
  token: string,
  formData: FormData
): Promise<RegisterInvitedStaffResult> {
  const email      = (formData.get('email')        as string)?.trim()
  const password   =  formData.get('password')     as string
  const firstName  = (formData.get('first_name')   as string)?.trim()
  const lastName   = (formData.get('last_name')    as string)?.trim()

  if (!token || !email || !password || !firstName || !lastName) {
    return { success: false, error: 'Todos los campos son obligatorios.' }
  }

  if (password.length < 8) {
    return { success: false, error: 'La contraseña debe tener al menos 8 caracteres.' }
  }

  const supabase = await createClient()
  const adminClient = await createAdminClient()

  // 1. Verify token
  const { data: invite, error: inviteError } = await adminClient
    .from('staff_invitations')
    .select('*')
    .eq('token', token)
    .single()

  if (inviteError || !invite) {
    return { success: false, error: 'Enlace de invitación inválido o no existe.' }
  }

  if (invite.used) {
    return { success: false, error: 'Este enlace ya ha sido utilizado.' }
  }

  // 1.5 Check if user already exists
  const { data: existingProfile } = await adminClient.from('profiles').select('id, email').eq('email', email).single()
  
  if (existingProfile) {
    return { success: false, existingUser: true, error: 'Detectamos que ya tienes una cuenta con este email.' }
  }

  // 2. Create user with admin client (no email verification needed)
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName, role: invite.role },
  })

  if (authError || !authData.user) {
    if (authError?.message?.includes('already registered')) {
      return { success: false, existingUser: true, error: 'Detectamos que ya tienes una cuenta con este email.' }
    }
    return { success: false, error: authError?.message || 'Error al crear la cuenta.' }
  }

  const userId = authData.user.id

  // 3. Mark token as used
  await adminClient
    .from('staff_invitations')
    .update({ used: true, used_at: new Date().toISOString() })
    .eq('id', invite.id)

  // 4. Upsert Profile with correct club_id and role
  // The trigger may have already created a profile without club_id, so we update it
  const { error: profileError } = await adminClient
    .from('profiles')
    .upsert({
      id:         userId,
      email:      email,
      first_name: firstName,
      last_name:  lastName,
      role:       invite.role,
      club_id:    invite.club_id
    }, { onConflict: 'id' })

  if (profileError) {
    console.error('[StaffInvite] profile upsert error:', profileError.message)
  }

  // 5. If the invitation has a team_id, assign the user as the coach of that team
  if (invite.team_id) {
    const { error: teamAssignError } = await adminClient
      .from('team_coaches')
      .insert({
        team_id: invite.team_id,
        profile_id: userId,
        club_id: invite.club_id
      })
      
    if (teamAssignError) {
      console.error('[StaffInvite] Error assigning staff to team_coaches:', teamAssignError.message)
    }
  }

  return { success: true, requireEmailVerification: false }
}

export async function acceptStaffInviteExistingUserAction(
  token: string,
  formData: FormData
): Promise<{ success: boolean, error?: string }> {
  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string

  if (!token || !email || !password) {
    return { success: false, error: 'Todos los campos son obligatorios.' }
  }

  const supabase = await createClient()
  const adminClient = await createAdminClient()

  // 1. Verify token
  const { data: invite, error: inviteError } = await adminClient
    .from('staff_invitations')
    .select('*')
    .eq('token', token)
    .single()

  if (inviteError || !invite || invite.used) {
    return { success: false, error: 'Enlace de invitación inválido o ya utilizado.' }
  }

  // 2. Authenticate user to verify they own the account
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError || !authData.user) {
    return { success: false, error: 'Contraseña incorrecta.' }
  }

  const userId = authData.user.id

  // 3. Mark token as used
  await adminClient
    .from('staff_invitations')
    .update({ used: true, used_at: new Date().toISOString() })
    .eq('id', invite.id)

  // 4. Upsert Profile with correct club_id and role
  // This will overwrite their club_id and role if they are from another club!
  // If they are from the same club, it's just an update.
  const { error: profileError } = await adminClient
    .from('profiles')
    .update({
      role: invite.role,
      club_id: invite.club_id
    })
    .eq('id', userId)

  if (profileError) {
    console.error('[StaffInviteExisting] profile update error:', profileError.message)
  }

  // 5. If the invitation has a team_id, assign the user as the coach of that team
  if (invite.team_id) {
    // Avoid duplicate assignment
    const { data: existingCoach } = await adminClient
      .from('team_coaches')
      .select('id')
      .eq('profile_id', userId)
      .eq('team_id', invite.team_id)
      .single()

    if (!existingCoach) {
      const { error: teamAssignError } = await adminClient
        .from('team_coaches')
        .insert({
          team_id: invite.team_id,
          profile_id: userId,
          club_id: invite.club_id
        })
        
      if (teamAssignError) {
        console.error('[StaffInviteExisting] Error assigning staff to team_coaches:', teamAssignError.message)
      }
    }
  }

  return { success: true }
}
