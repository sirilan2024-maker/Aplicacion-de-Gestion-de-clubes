import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Supabase Auth Callback Handler
 *
 * Este Route Handler recibe el ?code= que Supabase incluye en el enlace de
 * verificación de email. Intercambia el código por una sesión válida y
 * redirige al usuario al dashboard (o al login si hay error).
 *
 * URL de callback que debes configurar en Supabase Dashboard:
 *   Authentication > URL Configuration > Redirect URLs
 *   → http://localhost:3000/auth/callback
 *   → https://tu-dominio.com/auth/callback
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const code        = searchParams.get('code')
  const next        = searchParams.get('next') ?? '/dashboard'
  const errorParam  = searchParams.get('error')
  const errorDesc   = searchParams.get('error_description')

  // Si Supabase nos devuelve un error directamente en la URL
  if (errorParam) {
    console.error('[AuthCallback] Error from Supabase:', errorParam, errorDesc)
    const message = errorDesc ?? 'Error al verificar el correo electrónico.'
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(message)}`
    )
  }

  if (code) {
    const supabase = await createClient()

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[AuthCallback] exchangeCodeForSession error:', error.message)
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent('El enlace de verificación ha expirado o ya fue usado.')}`
      )
    }

    // Sesión creada correctamente → redirigir al dashboard
    return NextResponse.redirect(
      `${origin}${next}?message=${encodeURIComponent('¡Cuenta verificada! Bienvenido/a al equipo.')}`
    )
  }

  // Sin código en la URL — situación inesperada
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent('Enlace de verificación inválido.')}`
  )
}
