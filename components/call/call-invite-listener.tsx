"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Video } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import type { CallGameId } from "@/lib/call-constants"
import { CALL_GAMES } from "@/lib/call-constants"

type Invite = {
  roomCode: string
  game: CallGameId
  fromName: string
}

export default function CallInviteListener({ userId }: { userId?: string | null }) {
  const [invite, setInvite] = useState<Invite | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!userId) return
    const supabase = createClient()
    const channel = supabase.channel(`call-invite:${userId}`)
    channel.on("broadcast", { event: "invite" }, ({ payload }) => {
      if (!payload?.roomCode) return
      setInvite({
        roomCode: payload.roomCode,
        game: payload.game,
        fromName: payload.fromName || "A friend",
      })
    })
    void channel.subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId])

  if (!invite) return null

  const gameName = CALL_GAMES.find((game) => game.id === invite.game)?.name || "a game"

  return (
    <div className="chance-call-invite-toast chance-premium-card fixed bottom-4 left-1/2 z-[60] w-[min(92vw,420px)] -translate-x-1/2 p-4 shadow-[var(--chance-shadow-elevated)]">
      <div className="flex items-start gap-3">
        <Video className="mt-0.5 size-5 stroke-[1.75] text-[var(--chance-brand)]" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{invite.fromName} invited you to a live call</p>
          <p className="chance-text-caption mt-0.5 text-sm">Play {gameName} together on video.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              className="chance-hero-cta-primary chance-focus-ring px-4 py-2 text-sm"
              onClick={() => router.push(`/call/${invite.roomCode}?game=${invite.game}`)}
            >
              Join call
            </Button>
            <Button variant="ghost" className="chance-text-caption hover:bg-[var(--chance-surface-inset)]" onClick={() => setInvite(null)}>
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
