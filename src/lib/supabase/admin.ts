import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase con Service Role (bypasa RLS).
 * SOLO usar en Server Actions o API Routes — nunca en el cliente.
 * Requiere SUPABASE_SERVICE_ROLE_KEY en .env.local
 */
export function createAdminClient() {
  const url    = process.env.NEXT_PUBLIC_SUPABASE_URL
  const srvKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !srvKey || srvKey === 'PEGA_AQUI_TU_SERVICE_ROLE_KEY') {
    throw new Error(
      '[AdminClient] SUPABASE_SERVICE_ROLE_KEY no está configurada en .env.local. ' +
      'Cópiala desde Supabase Dashboard → Settings → API → service_role.'
    )
  }

  return createSupabaseClient(url, srvKey, {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
  })
}
