"use client"

import { useEffect, useRef, useState } from "react"
import EnhancedMatchInterface from "@/components/games/enhanced-match-interface"
import { createLiveCallMatch, joinLiveCallMatch } from "@/lib/call-actions"
import { useCallGameChannel } from "@/hooks/use-call-game-channel"
import { createClient } from "@/lib/supabase/client"
import type { CallGameId } from "@/lib/call-constants"
import type { User } from "@/lib/supabase/client"

type SharedMatch = {
  matchId: string | null
  game: CallGameId
}

const MATCH_SELECT = `
  *,
  games (name, description, min_bet, max_bet),
  player1:users!matches_player1_id_fkey (id, username, display_name, avatar_url),
  player2:users!matches_player2_id_fkey (id, username, display_name, avatar_url)
`

export default function CallMatchPanel({
  roomCode,
  game,
  isHost,
  currentUser,
}: {
  roomCode: string
  game: CallGameId
  isHost: boolean
  currentUser: User
}) {
  const { state, publish } = useCallGameChannel<SharedMatch>({
    roomCode,
    userId: currentUser.id,
    event: "match",
    initialState: { matchId: null, game },
  })
  const [match, setMatch] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const createdGameRef = useRef<CallGameId | null>(null)
  const joinedMatchRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isHost) return
    if (createdGameRef.current === game) return

    createdGameRef.current = game
    void (async () => {
      const result = await createLiveCallMatch(game, roomCode)
      if (result.error || !result.match) {
        createdGameRef.current = null
        setError(result.error || "Could not start this game.")
        return
      }
      setError(null)
      setMatch(result.match)
      await publish({ matchId: result.match.id, game })
    })()
  }, [game, isHost, publish, roomCode])

  useEffect(() => {
    if (!isHost || !match?.id) return
    const timer = setInterval(() => {
      void publish({ matchId: match.id, game })
    }, 2000)
    return () => clearInterval(timer)
  }, [game, isHost, match?.id, publish])

  useEffect(() => {
    if (isHost) return
    const matchId = state.matchId
    if (!matchId || state.game !== game) return
    if (joinedMatchRef.current === matchId) return

    joinedMatchRef.current = matchId
    void (async () => {
      const result = await joinLiveCallMatch(matchId)
      if (result.error || !result.match) {
        joinedMatchRef.current = null
        setError(result.error || "Could not join this game.")
        return
      }
      setError(null)
      setMatch(result.match)
      await publish({ matchId: result.match.id, game })
    })()
  }, [game, isHost, publish, state.game, state.matchId])

  useEffect(() => {
    const matchId = match?.id || state.matchId
    if (!matchId) return
    const supabase = createClient()

    const refresh = async () => {
      const { data } = await supabase.from("matches").select(MATCH_SELECT).eq("id", matchId).single()
      if (!data) return
      setMatch((prev: any) => {
        if (
          prev?.id === data.id &&
          prev?.player2_id === data.player2_id &&
          prev?.status === data.status &&
          prev?.game_data === data.game_data
        ) {
          return prev
        }
        return data
      })
    }

    void refresh()
    const timer = setInterval(refresh, 1000)
    return () => clearInterval(timer)
  }, [match?.id, state.matchId])

  if (error) {
    return <p className="text-red-400 text-sm">{error}</p>
  }

  if (!match) {
    return (
      <p className="text-gray-400 text-sm py-8 text-center">
        {isHost ? "Starting the match…" : "Waiting for the host to start the game…"}
      </p>
    )
  }

  return (
    <EnhancedMatchInterface
      key={`${match.id}-${match.player2_id || "open"}-${match.status}`}
      match={match}
      currentUser={currentUser}
    />
  )
}
