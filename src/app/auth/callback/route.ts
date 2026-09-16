import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

/**
 * Supabase Auth Callback Handler
 *
 * Este Route Handler recibe el ?code= o ?token_hash= que Supabase incluye en el enlace de
 * verificación de email o recuperación de contraseña. Intercambia el token por una sesión válida
 * y redirige al usuario a la página de actualización de contraseña (/actualizar-password) o al dashboard.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const code        = searchParams.get('code')
  const token_hash  = searchParams.get('token_hash')
  const type        = searchParams.get('type') as EmailOtpType | null
  const rawNext     = searchParams.get('next')
  const errorParam  = searchParams.get('error')
  const errorDesc   = searchParams.get('error_description')

  const isRecovery = type === 'recovery' || (rawNext ? rawNext.includes('actualizar-password') : false)
  const next = isRecovery ? '/actualizar-password' : (rawNext ?? '/dashboard')

  // Si Supabase nos devuelve un error directamente en la URL
  if (errorParam) {
    console.error('[AuthCallback] Error from Supabase:', errorParam, errorDesc)
    const message = errorDesc ?? 'Error al verificar el correo electrónico.'
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(message)}`
    )
  }

  const supabase = await createClient()

  let authError = null
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    authError = error
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    authError = error
  } else {
    if (isRecovery) {
      return NextResponse.redirect(`${origin}/actualizar-password`)
    }
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('Enlace de verificación inválido.')}`
    )
  }

  if (authError) {
    console.error('[AuthCallback] Auth error:', authError.message)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('El enlace de verificación ha expirado o ya fue usado.')}`
    )
  }

  // Sesión creada / verificada correctamente
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const adminSupabase = await createAdminClient()
    
    // Asegurar que email_verified esté marcado como true sin sobreescribir roles existentes
    const { data: existingProfile } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const profileUpdate: Record<string, any> = { email_verified: true };
    if (!existingProfile?.role) {
      profileUpdate.role = 'family';
      profileUpdate.rol = 'familia';
    }

    await adminSupabase.from('profiles').update(profileUpdate).eq('id', user.id);
  }

  // Redirigir a next (ej. /actualizar-password o /dashboard)
  const redirectUrl = isRecovery
    ? `${origin}/actualizar-password`
    : `${origin}${next}?message=${encodeURIComponent('¡Cuenta verificada! Bienvenido/a al equipo.')}`;

  return NextResponse.redirect(redirectUrl);
}
