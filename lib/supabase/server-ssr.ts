import { createServerClient, type SupabaseClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies()

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Called from a Server Component that cannot set cookies — middleware refreshes session.
        }
      },
    },
  })
}
