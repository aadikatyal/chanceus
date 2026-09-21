"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Video, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CALL_GAMES, generateRoomCode, isCallGameId, normalizeRoomCode, type CallGameId } from "@/lib/call-constants"
import CallFriendInvite from "@/components/call/call-friend-invite"

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
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6 space-y-5">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Video className="h-5 w-5 text-orange-400" />
            Start a Live Call
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Video, audio, and a head-to-head match in one room.
          </p>
        </div>

        <div className="grid gap-3">
          {CALL_GAMES.map((item) => (
            <button
              key={item.id}
              onClick={() => setGame(item.id)}
              className={`text-left rounded-lg border p-4 transition ${
                game === item.id
                  ? "border-orange-500 bg-orange-500/10"
                  : "border-gray-800 bg-gray-950/50 hover:border-gray-700"
              }`}
            >
              <p className="text-white font-medium">{item.name}</p>
              <p className="text-sm text-gray-400">{item.description}</p>
            </button>
          ))}
        </div>

        <Button className="w-full bg-orange-500 hover:bg-orange-600 text-black" onClick={createRoom}>
          Create call room
        </Button>
      </div>

      <div className="space-y-6">
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white">Join with a code</h2>
          <div className="flex gap-2">
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(normalizeRoomCode(e.target.value))}
              placeholder="ABC123"
              className="bg-gray-950 border-gray-700 text-white uppercase tracking-widest"
              maxLength={6}
            />
            <Button onClick={joinRoom} disabled={joinCode.length < 6} className="bg-white text-black">
              Join
            </Button>
          </div>
        </div>

        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-400" />
            Invite a friend
          </h2>
          <p className="text-sm text-gray-400">
            Create a room first, or copy a code and send it. You can also invite from inside the call.
          </p>
          {createdCode && isCallGameId(game) ? (
            <div className="space-y-3">
              <p className="text-white font-mono tracking-widest">{createdCode}</p>
              <CallFriendInvite roomCode={createdCode} game={game} currentUserId={userId} fromName={displayName} />
            </div>
          ) : (
            <p className="text-sm text-gray-500">Start a room to invite from this lobby, or use the friends menu.</p>
          )}
        </div>
      </div>
    </div>
  )
}
