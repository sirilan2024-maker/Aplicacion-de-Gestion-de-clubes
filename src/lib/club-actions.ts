'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// ─── Types ────────────────────────────────────────────────────────────────────
export type RegisterClubResult =
  | { success: true;  requireEmailVerification: true; clubId: string }
  | { success: false; error: string }

export type CreateTeamResult =
  | { success: true }
  | { success: false; error: string }

// ─── Helper ───────────────────────────────────────────────────────────────────────
/**
 * Simple slug generator for club names.
 * Converts to lowercase, trims, replaces spaces with hyphens, removes non‑alphanumeric chars.
 */
function generateSlug(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// ─── registerNewClub ─────────────────────────────────────────────────────────
/**
 * Crea un club nuevo con su administrador.
 *
 * Usa el cliente ADMIN (service role) para insertar el club y el perfil
 * porque el usuario aún NO está autenticado en este punto del flujo.
 * Usa el cliente NORMAL para signUp (que no requiere auth).
 */
export async function registerNewClub(
  formData: FormData
): Promise<RegisterClubResult> {
  const nombreClub = (formData.get('nombre_club') as string)?.trim()
  const deporte    = (formData.get('deporte')     as string)?.trim() || 'Fútbol'
  const pais       = (formData.get('pais')        as string)?.trim() || 'España'
  const emailAdmin = (formData.get('email')       as string)?.trim()
  const password   =  formData.get('password')    as string
  const firstName  = (formData.get('first_name')  as string)?.trim()
  const lastName   = (formData.get('last_name')   as string)?.trim()

  // Generate slug for the club name (required non‑null column)
  const slug = generateSlug(nombreClub);

  // ── Validaciones ──────────────────────────────────────────────────────────
  if (!nombreClub || !emailAdmin || !password || !firstName || !lastName) {
    return { success: false, error: 'Todos los campos son obligatorios.' }
  }
  if (password.length < 8) {
    return { success: false, error: 'La contraseña debe tener al menos 8 caracteres.' }
  }

  // ── Clientes ──────────────────────────────────────────────────────────────
  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch (e: any) {
    console.error('[RegisterClub] Admin client error:', e.message)
    return {
      success: false,
      error: 'Error de configuración del servidor. Contacta al administrador.',
    }
  }

  const supabase = await createClient()

  // ── 1. Crear el club con service role (bypasa RLS) ────────────────────────
  const { data: club, error: clubError } = await admin
    .from('clubs')
    .insert({
      name:         nombreClub,
      slug:         slug,
      deporte,
      pais,
      email_contacto: emailAdmin,
    })
    .select('id')
    .single()

  if (clubError || !club) {
    console.error('[RegisterClub] Error creating club:', clubError?.message, clubError?.code)
    return { success: false, error: `No se pudo crear el club: ${clubError?.message ?? 'Error desconocido'}` }
  }

  // ── 2. Registrar el usuario en Supabase Auth ──────────────────────────────
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: emailAdmin,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/callback`,
      data: {
        first_name: firstName,
        last_name: lastName,
      },
    },
  })

  if (signUpError) {
    console.error('[RegisterClub] signUp error:', signUpError.message)
    // Limpiar el club creado para evitar registros huérfanos
    await admin.from('clubs').delete().eq('id', club.id)
    return { success: false, error: signUpError.message }
  }

  const userId = authData.user?.id

  // ── 3. Actualizar el perfil del usuario con role y club_id ──
  if (userId) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role: 'admin', club_id: club.id })
      .eq('id', userId)

    if (profileError) {
      console.error('[RegisterClub] Profile update warning:', profileError.message)
      // No bloqueante: el trigger puede crear el perfil al verificar el email
    }
  }

  return { success: true, requireEmailVerification: true, clubId: club.id }
}

// ─── createNewTeam ───────────────────────────────────────────────────────────
/**
 * Crea un equipo dentro del club del admin autenticado.
 * El invite_code lo genera el trigger de la migración 00011.
 */
export async function createNewTeam(
  formData: FormData
): Promise<CreateTeamResult> {
  const name     = (formData.get('name')     as string)?.trim()
  const category =  formData.get('category') as string
  const color    = (formData.get('color')    as string) || '#1E40AF'

  if (!name || !category) {
    return { success: false, error: 'Nombre y categoría son obligatorios.' }
  }

// Revised createNewTeam – fetch user/profile first, then use admin client for insertion
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'No estás autenticado.' };
  }

  // Obtener perfil del usuario (club_id y rol)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('club_id, role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.club_id) {
    return { success: false, error: 'No tienes un club asignado. Registra tu club primero.' };
  }

  if (!['admin', 'metodologo'].includes(profile.role)) {
    return { success: false, error: 'Solo los administradores pueden crear equipos.' };
  }

  // Insertar el equipo usando cliente admin (bypass RLS)
  const admin = createAdminClient();
  const { error } = await admin.from('teams').insert({
    name,
    category,
    color,
    club_id: profile.club_id,
    coach_id: user.id,
    // invite_code generado automáticamente por trigger (migración 00011)
  });

  if (error) {
    console.error('[CreateTeam] Error:', error.message);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/teams');
  return { success: true };

  revalidatePath('/dashboard/teams')
  return { success: true }
}

/**
 * Crea varios equipos en lote dentro del club del admin autenticado.
 * Valida que los nombres sean únicos en el batch y que el usuario tenga permisos.
 */
export async function createMultipleTeams(
  teams: Array<{ name: string; category: string; color?: string }>
): Promise<CreateTeamResult> {
  if (!teams.length) return { success: false, error: 'No se proporcionaron equipos.' };

  // Validar nombres únicos en el batch
  const names = teams.map((t) => t.name.trim().toLowerCase()).filter(Boolean);
  const duplicate = names.find((n, i) => names.indexOf(n) !== i);
  if (duplicate) return { success: false, error: 'Nombres de equipos duplicados en el batch.' };

  // Obtener usuario y perfil
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No estás autenticado.' };

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('club_id, role')
    .eq('id', user.id)
    .single();
  if (profileError || !profile?.club_id) return { success: false, error: 'No tienes un club asignado.' };
  if (!['admin', 'metodologo'].includes(profile.role)) return { success: false, error: 'Solo administradores pueden crear equipos.' };

  // Preparar datos para inserción
  const insertData = teams.map((t) => ({
    name: t.name.trim(),
    category: t.category.trim(),
    color: t.color?.trim() || '#1E40AF',
    club_id: profile.club_id,
    coach_id: user.id,
  }));

  const admin = createAdminClient();
  const { error } = await admin.from('teams').insert(insertData);
  if (error) {
    console.error('[CreateMultipleTeams] Error:', error.message);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/teams');
  return { success: true };
}

