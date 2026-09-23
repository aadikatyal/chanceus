"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

type Thread = { id: string; name: string }

export default function SidebarDms({ userId }: { userId: string }) {
  const [threads, setThreads] = useState<Thread[]>([])

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data } = await supabase
        .from("messages")
        .select("sender_id, recipient_id, created_at")
        .eq("message_type", "dm")
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(24)

      const ids: string[] = []
      for (const row of data ?? []) {
        const other = row.sender_id === userId ? row.recipient_id : row.sender_id
        if (other && !ids.includes(other)) ids.push(other)
        if (ids.length >= 5) break
      }
      if (ids.length === 0) {
        setThreads([])
        return
      }
      const { data: people } = await supabase.from("users").select("id, username, display_name").in("id", ids)
      const byId = new Map((people ?? []).map((person) => [person.id, person.display_name || person.username || "Player"]))
      setThreads(ids.map((id) => ({ id, name: byId.get(id) || "Player" })))
    }
    void load()
  }, [userId])

  return (
    <div className="chance-nav-label-only mt-4">
      <p className="chance-sidebar-section-label">DMs</p>
      {threads.length === 0 ? (
        <p className="chance-text-caption px-3 py-1">No messages yet.</p>
      ) : (
        <ul className="mt-1 flex flex-col gap-0.5">
          {threads.map((thread) => (
            <li key={thread.id}>
              <Link
                href={`/chat/dm/${thread.id}`}
                className="chance-focus-ring block truncate rounded-[var(--chance-radius-md)] px-3 py-1.5 text-[0.8125rem] text-[var(--chance-muted-fg)] hover:bg-[var(--chance-muted)]/60 hover:text-[var(--chance-fg)]"
              >
                {thread.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
