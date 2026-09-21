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
    return peer ? `Connected with ${peer.name}` : "Live Call"
  }, [callStatus, error, localVideoRef, peer])

  const copyLink = async () => {
    const url = `${window.location.origin}/call/${roomCode}?game=${game}`
    await navigator.clipboard.writeText(url)
    toast({ title: "Link copied", description: "Send it to a friend to join this call." })
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <section className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-orange-400">Room {roomCode}</p>
          <h1 className="text-xl font-bold text-white">{statusLabel}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="border-gray-700 text-white" onClick={copyLink}>
            <Copy className="h-4 w-4 mr-2" />
            Copy link
          </Button>
          <Button className="bg-orange-500 text-black hover:bg-orange-600" onClick={() => setShowInvite((v) => !v)}>
            Invite friend
          </Button>
          <Link href="/call">
            <Button variant="destructive">
              <PhoneOff className="h-4 w-4 mr-2" />
              Leave
            </Button>
          </Link>
        </div>

        {showInvite ? (
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <CallFriendInvite roomCode={roomCode} game={game} currentUserId={userId} fromName={displayName} />
          </div>
        ) : null}

        <div className="relative rounded-2xl overflow-hidden bg-black border border-gray-800">
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full aspect-[3/4] object-cover bg-gray-950" />
          {!peer ? (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm px-4 text-center">
              Opponent camera appears here
            </div>
          ) : null}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute bottom-3 right-3 w-24 rounded-xl border border-white/20 object-cover bg-black"
          />
        </div>

        <div className="flex justify-center gap-3">
          <Button onClick={toggleMute} className={muted ? "bg-red-600" : "bg-gray-800 text-white"}>
            {muted ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
            {muted ? "Unmute" : "Mute"}
          </Button>
          <Button onClick={toggleCamera} className={cameraOff ? "bg-red-600" : "bg-gray-800 text-white"}>
            {cameraOff ? <VideoOff className="h-4 w-4 mr-2" /> : <Video className="h-4 w-4 mr-2" />}
            {cameraOff ? "Camera on" : "Camera off"}
          </Button>
        </div>
      </section>

      <aside className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 sm:p-6 space-y-4 min-w-0">
        <div className="flex gap-2">
          {CALL_GAMES.map((item) => (
            <button
              key={item.id}
              onClick={() => setGame(item.id)}
              className={`flex-1 text-xs sm:text-sm rounded-lg px-2 py-2 border ${
                game === item.id ? "border-orange-500 text-white bg-orange-500/10" : "border-gray-700 text-gray-400"
              }`}
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
