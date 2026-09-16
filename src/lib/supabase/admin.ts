import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase con Service Role (bypasa RLS).
 * SOLO usar en Server Actions o API Routes — nunca en el cliente.
 * Requiere SUPABASE_SERVICE_ROLE_KEY en .env.local
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const srvKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !srvKey) {
    console.error('[AdminClient] SUPABASE_URL o KEY no configurados.')
  }

  return createSupabaseClient(url || '', srvKey || '', {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
