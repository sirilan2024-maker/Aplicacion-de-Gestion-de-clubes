import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Evitar problemas de TLS en el entorno local (Windows) durante el desarrollo
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const originalEmitWarning = process.emitWarning;
// @ts-ignore
process.emitWarning = function(warning: any, ...args: any[]) {
  if (typeof warning === 'string' && warning.includes('NODE_TLS_REJECT_UNAUTHORIZED')) return;
  // @ts-ignore
  return originalEmitWarning.call(process, warning, ...args);
};

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
export async function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll(cookiesToSet) {
          // ignore
        },
      },
    }
  )
}
