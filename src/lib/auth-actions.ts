'use server'
import { createClient } from '@/lib/supabase/server'
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

  if (!['entrenador', 'jugador', 'familia'].includes(role)) {
    return { success: false, error: 'Rol no permitido.' }
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
        role:       role === 'entrenador' || role === 'jugador' ? 'coach' : role,
        rol:        role,
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

  // ── 3. Si es familia o jugador, crear un jugador placeholder vinculado al equipo ──
  let linkedPlayerId: string | null = null
  if (role === 'familia' || role === 'jugador') {
    const { data: playerData, error: playerError } = await supabase
      .from('players')
      .insert({
        first_name:   firstName,
        last_name:    lastName,
        team_id:      team.id,
        club_id:      team.club_id,
        birth_date:   new Date().toISOString().split('T')[0], // default valid date
      })
      .select('id')
      .single()

    if (playerError) {
      console.error('[InviteRegister] player insert error:', playerError.message)
    } else if (playerData) {
      linkedPlayerId = playerData.id
    }
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
      role:             role === 'entrenador' || role === 'jugador' ? 'coach' : role,
      rol:              role,
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
