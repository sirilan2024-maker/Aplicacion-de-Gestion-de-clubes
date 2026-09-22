import { createAdminClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
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
  const { searchParams, origin: requestOrigin } = new URL(request.url)

  const code        = searchParams.get('code')
  const token_hash  = searchParams.get('token_hash')
  const type        = searchParams.get('type') as EmailOtpType | null
  const rawNext     = searchParams.get('next')
  const errorParam  = searchParams.get('error')
  const errorDesc   = searchParams.get('error_description')

  // Obtener origen confiable detrás de proxies (Vercel, CDN, etc.)
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
  const origin = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : (process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || requestOrigin)

  const isRecovery = type === 'recovery' || (rawNext ? rawNext.includes('actualizar-password') : false)
  const next = isRecovery ? '/actualizar-password' : (rawNext ?? '/dashboard')

  // Si Supabase nos devuelve un error directamente en la URL
  if (errorParam) {
    console.error('[AuthCallback] Error from Supabase:', errorParam, errorDesc)
    const message = errorDesc ?? 'Error al verificar el correo electrónico.'
    const errorRedirect = isRecovery
      ? `${origin}/actualizar-password?error=${encodeURIComponent(message)}`
      : `${origin}/login?error=${encodeURIComponent(message)}`
    return NextResponse.redirect(errorRedirect)
  }

  // Preparamos la URL final de redirección
  const redirectUrl = isRecovery
    ? `${origin}/actualizar-password`
    : `${origin}${next}?message=${encodeURIComponent('¡Cuenta verificada! Bienvenido/a al equipo.')}`

  // IMPORTANTE: En Next.js Route Handlers, NextResponse.redirect debe llevar las cookies explícitamente
  const response = NextResponse.redirect(redirectUrl)
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
              response.cookies.set(name, value, options)
            })
          } catch {
            // Ignorar en componentes que no permiten set
          }
        },
      },
    }
  )

  let authError = null
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    authError = error
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    authError = error
  } else {
    if (isRecovery) {
      // Supabase pudo haber devuelto el token en el fragmento hash (#access_token=...),
      // el cual no llega al servidor HTTP. Redirigimos a /actualizar-password para que
      // el cliente procese el hash fragment.
      return NextResponse.redirect(`${origin}/actualizar-password`)
    }
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('Enlace de verificación inválido.')}`
    )
  }

  if (authError) {
    console.error('[AuthCallback] Auth error:', authError.message)
    const errorMsg = 'El enlace de recuperación ha expirado o ya fue usado.'
    const failUrl = isRecovery
      ? `${origin}/actualizar-password?error=${encodeURIComponent(errorMsg)}`
      : `${origin}/login?error=${encodeURIComponent(errorMsg)}`
    return NextResponse.redirect(failUrl)
  }

  // Sesión creada / verificada correctamente
  try {
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
  } catch (userErr) {
    console.warn('[AuthCallback] Error actualizando perfil post-auth:', userErr)
  }

  return response
}
