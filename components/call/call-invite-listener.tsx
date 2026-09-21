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
    <div className="fixed bottom-4 left-1/2 z-[60] w-[min(92vw,420px)] -translate-x-1/2 rounded-xl border border-orange-500/40 bg-gray-900 p-4 shadow-xl">
      <div className="flex items-start gap-3">
        <Video className="h-5 w-5 text-orange-400 mt-0.5" />
        <div className="flex-1">
          <p className="text-white font-medium">{invite.fromName} invited you to a Live Call</p>
          <p className="text-sm text-gray-400">Play {gameName} together on video.</p>
          <div className="mt-3 flex gap-2">
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-black"
              onClick={() => router.push(`/call/${invite.roomCode}?game=${invite.game}`)}
            >
              Join call
            </Button>
            <Button variant="ghost" className="text-gray-300" onClick={() => setInvite(null)}>
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
