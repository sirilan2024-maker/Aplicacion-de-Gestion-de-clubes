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
  else if (role === 'coach') destination = '/dashboard/mis-equipos';
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
  | { success: true;  requireEmailVerification: true }
  | { success: false; error: string }

export async function registerWithInviteCode(
  formData: FormData
): Promise<RegisterWithInviteResult> {
  const inviteCode = (formData.get('invite_code') as string)?.trim().toUpperCase()
  const email      = (formData.get('email')        as string)?.trim()
  const password   =  formData.get('password')     as string
  const firstName  = (formData.get('first_name')   as string)?.trim()
  const lastName   = (formData.get('last_name')    as string)?.trim()
  const role       =  formData.get('role')         as string

  // ── Validaciones básicas ─────────────────────────────────────────────────
  if (!inviteCode || !email || !password || !firstName || !lastName || !role) {
    return { success: false, error: 'Todos los campos son obligatorios.' }
  }

  if (!['jugador', 'tutor'].includes(role)) {
    return { success: false, error: 'Rol no permitido para registro público.' }
  }

  if (password.length < 8) {
    return { success: false, error: 'La contraseña debe tener al menos 8 caracteres.' }
  }

  // ── Usar cliente sin sesión para la búsqueda pública del equipo ──────────
  const supabase = await createClient()

  // ── 1. Buscar el equipo por invite_code ──────────────────────────────────
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('id, name, club_id')
    .eq('invite_code', inviteCode)
    .single()

  if (teamError || !team) {
    return { success: false, error: 'Código de invitación inválido o no encontrado.' }
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

  // ── 3. Crear un jugador placeholder vinculado al equipo ──
  let linkedPlayerId: string | null = null
  const { data: playerData, error: playerError } = await supabase
    .from('players')
    .insert({
      first_name:   firstName,
      last_name:    lastName,
      team_id:      team.id,
      club_id:      team.club_id,
      birth_date:   new Date().toISOString().split('T')[0], // default valid date
      user_auth_id: role === 'jugador' ? userId : null,
      tutor_id:     role === 'tutor' ? userId : null,
    })
    .select('id')
    .single()

  if (playerError) {
    console.error('[InviteRegister] player insert error:', playerError.message)
  } else if (playerData) {
    linkedPlayerId = playerData.id
  }

  // ── 4. Insertar/Actualizar perfil ──
  // Solo intentamos upsert; si ya existe, actualiza los roles y campos vinculados.
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id:               userId,
      email,
      first_name:       firstName,
      last_name:        lastName,
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
export async function registerInvitedStaffAction(
  token: string,
  formData: FormData
): Promise<RegisterWithInviteResult> {
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

  // 2. Sign up user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      data: { first_name: firstName, last_name: lastName, role: invite.role },
    },
  })

  if (authError || !authData.user) {
    return { success: false, error: authError?.message || 'Error al crear la cuenta.' }
  }

  const userId = authData.user.id

  // 3. Mark token as used
  await adminClient
    .from('staff_invitations')
    .update({ used: true, used_at: new Date().toISOString() })
    .eq('id', invite.id)

  // 4. Upsert Profile with correct club_id and role
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

  return { success: true, requireEmailVerification: true }
}
