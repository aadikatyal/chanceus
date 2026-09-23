"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Video, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CALL_GAMES, generateRoomCode, isCallGameId, normalizeRoomCode, type CallGameId } from "@/lib/call-constants"
import CallFriendInvite from "@/components/call/call-friend-invite"
import { cn } from "@/lib/utils"

export default function CallLobby({
  userId,
  displayName,
}: {
  userId: string
  displayName: string
}) {
  const router = useRouter()
  const [game, setGame] = useState<CallGameId>("connect-four")
  const [joinCode, setJoinCode] = useState("")
  const [createdCode, setCreatedCode] = useState<string | null>(null)

  const createRoom = () => {
    const code = generateRoomCode()
    setCreatedCode(code)
    router.push(`/call/${code}?game=${game}&host=1`)
  }

  const joinRoom = () => {
    const code = normalizeRoomCode(joinCode)
    if (code.length < 6) return
    router.push(`/call/${code}?game=${game}`)
  }

  return (
    <div className="chance-call-root grid gap-6 lg:grid-cols-2">
      <section className="chance-premium-card space-y-5 p-6">
        <div>
          <h2 className="chance-section-title flex items-center gap-2 text-lg">
            <Video className="size-5 stroke-[1.75] text-[var(--chance-brand)]" aria-hidden />
            Start a live call
          </h2>
          <p className="chance-text-caption mt-1">Video, audio, and a head-to-head match in one room.</p>
        </div>

        <div className="grid gap-3">
          {CALL_GAMES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setGame(item.id)}
              className={cn(
                "chance-venues-session-pick w-full text-left transition-colors",
                game === item.id && "is-selected"
              )}
            >
              <p className="text-sm font-semibold">{item.name}</p>
              <p className="chance-text-caption mt-0.5">{item.description}</p>
            </button>
          ))}
        </div>

        <button type="button" className="chance-hero-cta-primary chance-focus-ring w-full px-4 py-2.5 text-sm" onClick={createRoom}>
          Create call room
        </button>
      </section>

      <div className="space-y-6">
        <section className="chance-premium-card space-y-4 p-6">
          <h2 className="chance-section-title text-lg">Join with a code</h2>
          <div className="flex w-full gap-2">
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(normalizeRoomCode(e.target.value))}
              placeholder="ABC123"
              className="chance-input min-w-0 flex-1 font-mono uppercase tracking-widest"
              maxLength={6}
            />
            <Button
              type="button"
              onClick={joinRoom}
              disabled={joinCode.length < 6}
              className="chance-hero-cta-primary chance-focus-ring shrink-0 px-4"
            >
              Join
            </Button>
          </div>
        </section>

        <section className="chance-premium-card space-y-4 p-6">
          <h2 className="chance-section-title flex items-center gap-2 text-lg">
            <Users className="size-5 stroke-[1.75] text-[var(--chance-brand)]" aria-hidden />
            Invite a friend
          </h2>
          <p className="chance-text-caption text-sm">
            Create a room first, or copy a code and send it. You can also invite from inside the call.
          </p>
          {createdCode && isCallGameId(game) ? (
            <div className="space-y-3">
              <p className="font-mono text-sm font-semibold tracking-widest">{createdCode}</p>
              <CallFriendInvite roomCode={createdCode} game={game} currentUserId={userId} fromName={displayName} />
            </div>
          ) : (
            <p className="chance-text-caption text-sm">Start a room to invite from this lobby, or use the friends menu.</p>
          )}
        </section>
      </div>
    </div>
  )
}
