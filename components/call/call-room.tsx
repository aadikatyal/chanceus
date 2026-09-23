"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Mic, MicOff, Video, VideoOff, Copy, PhoneOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWebRtcCall } from "@/hooks/use-webrtc-call"
import { CALL_GAMES, isCallGameId, type CallGameId } from "@/lib/call-constants"
import { useSharedGameSelection } from "@/hooks/use-call-game-channel"
import CallFriendInvite from "@/components/call/call-friend-invite"
import CallMatchPanel from "@/components/call/call-match-panel"
import { useToast } from "@/hooks/use-toast"
import type { User } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

export default function CallRoom({
  roomCode,
  currentUser,
  initialGame,
  isHost: claimedHost,
}: {
  roomCode: string
  currentUser: User
  initialGame: CallGameId
  isHost: boolean
}) {
  const displayName = currentUser.display_name || currentUser.username
  const userId = currentUser.id
  const { toast } = useToast()
  const [showInvite, setShowInvite] = useState(false)
  const {
    localVideoRef,
    remoteVideoRef,
    callStatus,
    error,
    muted,
    cameraOff,
    peer,
    toggleMute,
    toggleCamera,
  } = useWebRtcCall({ roomCode, userId, displayName })
  const { state: selectedGame, publish: setGame } = useSharedGameSelection(roomCode, initialGame)
  const game = isCallGameId(selectedGame) ? selectedGame : initialGame
  const isHost = claimedHost

  const statusLabel = useMemo(() => {
    if (callStatus === "error" && error && !localVideoRef.current?.srcObject) return error
    if (callStatus === "requesting") return "Requesting camera and microphone…"
    if (callStatus === "waiting") return "Waiting for your opponent to join…"
    if (callStatus === "connecting") return `Connecting to ${peer?.name || "opponent"}…`
    if (callStatus === "live") return `Live with ${peer?.name || "opponent"}`
    return peer ? `Connected with ${peer.name}` : "Live call"
  }, [callStatus, error, localVideoRef, peer])

  const copyLink = async () => {
    const url = `${window.location.origin}/call/${roomCode}?game=${game}`
    await navigator.clipboard.writeText(url)
    toast({ title: "Link copied", description: "Send it to a friend to join this call." })
  }

  return (
    <div className="chance-call-room-elite chance-call-root grid gap-6 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      <section className="space-y-4">
        <header className="chance-call-room-header chance-premium-card p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="chance-text-caption text-xs uppercase tracking-widest text-[var(--chance-brand)]">Live room</p>
              <h1 className="chance-display-title mt-0.5 text-lg sm:text-xl">{roomCode}</h1>
              <p className="mt-1 text-sm text-[var(--chance-muted-fg)]">{statusLabel}</p>
            </div>
            <span
              className={cn(
                "chance-call-live-indicator",
                callStatus === "live" && "is-live",
                callStatus === "connecting" && "is-connecting"
              )}
              aria-live="polite"
            >
              {callStatus === "live" ? "On air" : callStatus === "waiting" ? "Waiting" : "…"}
            </span>
          </div>
        </header>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="chance-focus-ring border-[var(--chance-border)] bg-[var(--chance-surface)]"
            onClick={copyLink}
          >
            <Copy className="mr-2 size-4" aria-hidden />
            Copy link
          </Button>
          <Button className="chance-hero-cta-primary chance-focus-ring px-4" onClick={() => setShowInvite((v) => !v)}>
            Invite friend
          </Button>
          <Link href="/call">
            <Button variant="destructive">
              <PhoneOff className="mr-2 size-4" aria-hidden />
              Leave
            </Button>
          </Link>
        </div>

        {showInvite ? (
          <div className="chance-premium-card p-4">
            <CallFriendInvite roomCode={roomCode} game={game} currentUserId={userId} fromName={displayName} />
          </div>
        ) : null}

        <div className="chance-call-video-stage relative overflow-hidden rounded-2xl border border-[var(--chance-border)] bg-black">
          <video ref={remoteVideoRef} autoPlay playsInline className="aspect-[3/4] w-full bg-[var(--chance-surface-inset)] object-cover" />
          {!peer ? (
            <div className="chance-text-caption absolute inset-0 flex items-center justify-center px-4 text-center text-sm">
              Opponent camera appears here
            </div>
          ) : null}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute bottom-3 right-3 w-24 rounded-xl border border-white/20 bg-black object-cover"
          />
        </div>

        <div className="flex justify-center gap-3">
          <Button onClick={toggleMute} className={muted ? "bg-red-600 hover:bg-red-700" : "bg-[var(--chance-surface-inset)] text-[var(--chance-fg)]"}>
            {muted ? <MicOff className="mr-2 size-4" aria-hidden /> : <Mic className="mr-2 size-4" aria-hidden />}
            {muted ? "Unmute" : "Mute"}
          </Button>
          <Button onClick={toggleCamera} className={cameraOff ? "bg-red-600 hover:bg-red-700" : "bg-[var(--chance-surface-inset)] text-[var(--chance-fg)]"}>
            {cameraOff ? <VideoOff className="mr-2 size-4" aria-hidden /> : <Video className="mr-2 size-4" aria-hidden />}
            {cameraOff ? "Camera on" : "Camera off"}
          </Button>
        </div>
      </section>

      <aside className="chance-premium-card min-w-0 space-y-4 p-4 sm:p-6">
        <div className="flex gap-2">
          {CALL_GAMES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setGame(item.id)}
              className={cn(
                "chance-venues-session-pick flex-1 px-2 py-2 text-xs sm:text-sm",
                game === item.id && "is-selected"
              )}
            >
              {item.name}
            </button>
          ))}
        </div>
        <CallMatchPanel roomCode={roomCode} game={game} isHost={isHost} currentUser={currentUser} />
      </aside>
    </div>
  )
}
