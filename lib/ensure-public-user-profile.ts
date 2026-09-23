import { createAdminClient } from "@/lib/supabase/admin"
import type { SupabaseClient, User } from "@supabase/supabase-js"

function slugUsername(raw: string, userId: string) {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "")
  if (cleaned.length >= 3) return cleaned.slice(0, 50)
  return `player_${userId.replace(/-/g, "").slice(0, 12)}`
}

function profilePayload(user: User) {
  const email = user.email ?? `${user.id}@users.chanceus.local`
  const meta = user.user_metadata ?? {}
  const fromMeta =
    (typeof meta.username === "string" && meta.username) ||
    (typeof meta.preferred_username === "string" && meta.preferred_username) ||
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    email.split("@")[0] ||
    "player"

  const displayName =
    (typeof meta.display_name === "string" && meta.display_name) ||
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    fromMeta

  const username = slugUsername(fromMeta, user.id)
  return { email, displayName: displayName.slice(0, 100), username }
}

async function insertProfile(client: SupabaseClient, user: User): Promise<boolean> {
  const { email, displayName, username } = profilePayload(user)

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? username : `${username.slice(0, 42)}_${attempt}`
    const { error } = await client.from("users").insert({
      id: user.id,
      email,
      username: candidate,
      display_name: displayName,
    })
    if (!error) return true
    if (error.code === "23505") continue
    console.error("ensurePublicUserProfile insert error:", error)
    return false
  }
  return false
}

/** Ensures public.users row exists (OAuth when DB trigger missing or failed). */
export async function ensurePublicUserProfile(user: User, scopedClient?: SupabaseClient): Promise<boolean> {
  const readers: SupabaseClient[] = []
  if (scopedClient) readers.push(scopedClient)

  try {
    readers.unshift(createAdminClient())
  } catch {
    // No service role — rely on scoped client + RLS self-insert policy.
  }

  for (const client of readers) {
    try {
      const { data: existing } = await client.from("users").select("id").eq("id", user.id).maybeSingle()
      if (existing) return true
      if (await insertProfile(client, user)) return true
    } catch (error) {
      console.warn("ensurePublicUserProfile attempt failed:", error)
    }
  }

  return false
}
