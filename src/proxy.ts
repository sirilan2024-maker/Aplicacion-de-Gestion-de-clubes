import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname
  const isAuthRoute = pathname.startsWith('/auth')
  const isDashboardRoute = pathname.startsWith('/dashboard')
  const isAdminRoute = pathname.startsWith('/admin')
  const hasSupabaseCookie = request.cookies.getAll().some((c) => c.name.startsWith('sb-'))

  // Skip Supabase Auth roundtrip on public routes when the visitor has no session cookie
  if (!hasSupabaseCookie && !isDashboardRoute && !isAdminRoute && !isAuthRoute) {
    return supabaseResponse
  }

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with cross-site tracking and missing cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 1. Redirect unauthenticated users trying to access protected routes
  if (!user && (isDashboardRoute || isAdminRoute)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 2. Redirect authenticated users away from auth pages
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // 3. RBAC: Protect /admin routes specifically
  if (user && isAdminRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, roles')
      .eq('id', user.id)
      .single()

    const role = profile?.role || ''
    const roles: string[] = profile?.roles || []
    const allRoles = [role, ...roles]

    const allowedAdminRoles = [
      'admin',
      'administrador',
      'admin_club',
      'superadmin',
      'coordinador',
      'coordinador_general',
      'secretario',
      'secretaria',
      'tesorero',
      'tesoreria',
      'directivo',
      'director',
      'directiva',
      'metodologo',
      'metodologia',
      'staff',
      'utillero'
    ]

    const hasAdminAccess = allRoles.some(r => allowedAdminRoles.includes(r))

    if (!hasAdminAccess) {
      // If a non-staff user tries to access /admin, redirect to /dashboard
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    const currentPath = request.nextUrl.pathname;
    const activeIsAdmin = role && ['admin', 'superadmin', 'administrador', 'admin_club'].includes(role);
    const isSuperOrAdmin = role ? activeIsAdmin : allRoles.some(r => ['admin', 'superadmin', 'administrador', 'admin_club'].includes(r));

    // Aislamiento estricto de roles dentro de /admin:
    if (!isSuperOrAdmin) {
      const isCoord = role === 'coordinador' || role === 'coordinador_general' || (!role && (allRoles.includes('coordinador') || allRoles.includes('coordinador_general')));
      if (isCoord) {
        if (
          currentPath === '/admin' ||
          currentPath === '/admin/' ||
          currentPath === '/admin/inicio' ||
          currentPath.startsWith('/admin/tesoreria') ||
          currentPath.startsWith('/admin/configuracion') ||
          currentPath.startsWith('/admin/temporadas') ||
          currentPath.startsWith('/admin/ffcv-api')
        ) {
          const url = request.nextUrl.clone()
          url.pathname = '/admin/coordinador'
          return NextResponse.redirect(url)
        }
      }

      const isMetodologo = role === 'metodologo' || role === 'metodologia' || (!role && (allRoles.includes('metodologo') || allRoles.includes('metodologia')));
      if (isMetodologo && (currentPath === '/admin' || currentPath === '/admin/' || currentPath === '/admin/inicio' || currentPath.startsWith('/admin/tesoreria') || currentPath.startsWith('/admin/configuracion'))) {
        const url = request.nextUrl.clone()
        url.pathname = '/admin/metodologia'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image, favicon.ico, static assets
     * - PWA files (sw.js, manifest.json, robots.txt, sitemap.xml, icons/)
     * - Public/secret-authenticated endpoints (ffcv-image-proxy, cron jobs, webhooks)
     */
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|robots\\.txt|sitemap\\.xml|icons/|api/ffcv-image-proxy|api/ffcv/cron|api/cron/|api/events/send-reminders|api/webhooks/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
