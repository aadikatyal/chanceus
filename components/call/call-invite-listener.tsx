"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, Video } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import type { CallGameId } from "@/lib/call-constants"
import { CALL_GAMES } from "@/lib/call-constants"
import {
  dismissInviteNotificationPrompt,
  inviteNotificationPermission,
  inviteNotificationsDismissed,
  requestInviteNotifications,
  showInviteNotification,
} from "@/lib/browser-notifications"

type Invite = {
  roomCode: string
  game: CallGameId
  fromName: string
  kind: "call" | "match"
  matchId?: string
  gameName?: string
}

export default function CallInviteListener({ userId }: { userId?: string | null }) {
  const [invite, setInvite] = useState<Invite | null>(null)
  const [askPermission, setAskPermission] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!userId) return
    if (inviteNotificationPermission() === "default" && !inviteNotificationsDismissed()) {
      setAskPermission(true)
    }
    const supabase = createClient()
    const channel = supabase.channel(`call-invite:${userId}`)
    channel.on("broadcast", { event: "invite" }, ({ payload }) => {
      if (!payload?.roomCode) return
      const gameName = CALL_GAMES.find((game) => game.id === payload.game)?.name || "a game"
      const fromName = payload.fromName || "A friend"
      setInvite({
        roomCode: payload.roomCode,
        game: payload.game,
        fromName,
        kind: "call",
        gameName,
      })
      showInviteNotification(
        `${fromName} invited you`,
        `Live call · ${gameName}`,
        `/call/${payload.roomCode}?game=${payload.game}`,
      )
    })
    channel.on("broadcast", { event: "match-invite" }, ({ payload }) => {
      if (!payload?.matchId) return
      const fromName = payload.fromName || "A friend"
      const gameName = payload.gameName || "a game"
      setInvite({
        roomCode: "",
        game: payload.game,
        fromName,
        kind: "match",
        matchId: payload.matchId,
        gameName,
      })
      showInviteNotification(
        `${gameName} invite from @${String(fromName).replace(/^@/, "")}`,
        "Open ChanceUS to accept the match.",
        `/games/match/${payload.matchId}`,
      )
    })
    void channel.subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId])

  const enableNotifications = async () => {
    const result = await requestInviteNotifications()
    if (result !== "default") setAskPermission(false)
  }

  if (!invite && askPermission) {
    return (
      <div className="chance-premium-card fixed bottom-4 left-1/2 z-[60] w-[min(92vw,420px)] -translate-x-1/2 p-4 shadow-[var(--chance-shadow-elevated)]">
        <div className="flex items-start gap-3">
          <Bell className="mt-0.5 size-5 stroke-[1.75] text-[var(--chance-brand)]" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Turn on invite alerts</p>
            <p className="chance-text-caption mt-0.5 text-sm">Get a browser notification when a friend invites you to a match or live call.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button className="chance-hero-cta-primary chance-focus-ring px-4 py-2 text-sm" onClick={() => void enableNotifications()}>
                Allow notifications
              </Button>
              <Button
                variant="ghost"
                className="chance-text-caption hover:bg-[var(--chance-surface-inset)]"
                onClick={() => {
                  dismissInviteNotificationPrompt()
                  setAskPermission(false)
                }}
              >
                Not now
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!invite) return null

  const gameName = invite.gameName || CALL_GAMES.find((game) => game.id === invite.game)?.name || "a game"
  const joinHref = invite.kind === "match" && invite.matchId
    ? `/games/match/${invite.matchId}`
    : `/call/${invite.roomCode}?game=${invite.game}`

  return (
    <div className="chance-call-invite-toast chance-premium-card fixed bottom-4 left-1/2 z-[60] w-[min(92vw,420px)] -translate-x-1/2 p-4 shadow-[var(--chance-shadow-elevated)]">
      <div className="flex items-start gap-3">
        <Video className="mt-0.5 size-5 stroke-[1.75] text-[var(--chance-brand)]" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {invite.kind === "match"
              ? `${gameName} invite from ${invite.fromName}`
              : `${invite.fromName} invited you to a live call`}
          </p>
          <p className="chance-text-caption mt-0.5 text-sm">
            {invite.kind === "match" ? "Accept the match to start playing." : `Play ${gameName} together on video.`}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              className="chance-hero-cta-primary chance-focus-ring px-4 py-2 text-sm"
              onClick={() => router.push(joinHref)}
            >
              {invite.kind === "match" ? "Open match" : "Join call"}
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
