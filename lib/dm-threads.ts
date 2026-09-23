import { createClient } from "@/lib/supabase/server"

export type DmThread = {
  userId: string
  name: string
  handle: string
  preview: string
  at: string
}

export async function loadDmThreads(userId: string): Promise<DmThread[]> {
  const supabase = await createClient()
  const { data: messages } = await supabase
    .from("messages")
    .select("content, created_at, sender_id, recipient_id")
    .eq("message_type", "dm")
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(80)

  const threads = new Map<string, { preview: string; at: string }>()
  for (const msg of messages ?? []) {
    const otherId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id
    if (!otherId || threads.has(otherId)) continue
    threads.set(otherId, { preview: String(msg.content).slice(0, 90), at: msg.created_at })
  }

  const ids = [...threads.keys()]
  if (ids.length === 0) return []

  const { data: people } = await supabase.from("users").select("id, username, display_name").in("id", ids)
  const byId = new Map((people ?? []).map((person) => [person.id, person]))

  return ids.map((id) => {
    const person = byId.get(id)
    const name = person?.display_name || person?.username || "Player"
    const thread = threads.get(id)!
    return {
      userId: id,
      name,
      handle: person?.username ? `@${person.username}` : "",
      preview: thread.preview,
      at: thread.at,
    }
  })
}
