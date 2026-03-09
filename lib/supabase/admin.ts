import { createClient } from "@supabase/supabase-js"

/**
 * Admin client with service role - bypasses RLS.
 * Use only for server-side reads where we need to see all data (e.g. tournament bracket).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for admin client")
  }
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } })
}
