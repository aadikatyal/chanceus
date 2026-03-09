"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"

const MOVE_DELAY_MS = 800

/**
 * Hook that auto-plays Connect 4 when both players are bots.
 * Call when viewing a bot-vs-bot Connect 4 match - starts the match if waiting, then makes moves.
 * Uses dynamic import to avoid bundling server-only code (admin client) in the client.
 */
export function useConnectFourBotAutoPlay(
  matchId: string | undefined,
  player1Id: string | undefined,
  player2Id: string | undefined,
  isBotVsBot: boolean,
  gameName: string
) {
  const runningRef = useRef(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isConnectFour =
    gameName?.toLowerCase().includes("4 in a row") ||
    gameName?.toLowerCase().includes("four in a row") ||
    gameName?.toLowerCase().includes("connect 4")

  const shouldRun = !!(
    matchId &&
    player1Id &&
    player2Id &&
    isBotVsBot &&
    isConnectFour
  )

  useEffect(() => {
    if (!shouldRun) return

    const runBotLoop = async () => {
      if (runningRef.current) return

      const supabase = createClient()

      const { data: match } = await supabase
        .from("matches")
        .select("id, status, game_data")
        .eq("id", matchId)
        .single()

      if (!match) return

      if (match.status === "waiting") {
        const { startBotVsBotMatch } = await import("@/lib/connect-four-bot-actions")
        const result = await startBotVsBotMatch(matchId)
        if (result.success) {
          return
        }
        return
      }

      if (match.status === "completed") {
        return
      }

      const gameData = (match.game_data as Record<string, unknown>) || {}
      const board = (gameData.board as (string | null)[]) || Array(42).fill(null)
      const currentPlayer = (gameData.currentPlayer as string) || "player1"

      const actingPlayerId = currentPlayer === "player1" ? player1Id : player2Id
      if (!actingPlayerId) return

      const availableColumns: number[] = []
      for (let col = 0; col < 7; col++) {
        if (board[col] === null) {
          availableColumns.push(col)
        }
      }

      if (availableColumns.length === 0) return

      const column = availableColumns[Math.floor(Math.random() * availableColumns.length)]

      runningRef.current = true
      try {
        const { makeConnectFourBotMove } = await import("@/lib/connect-four-bot-actions")
        const result = await makeConnectFourBotMove(matchId, column, actingPlayerId)
        if (!result.success) {
          console.warn("Bot move failed:", result.error)
        }
      } finally {
        runningRef.current = false
      }
    }

    const tick = () => {
      runBotLoop()
    }

    tick()
    intervalRef.current = setInterval(tick, MOVE_DELAY_MS)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [matchId, player1Id, player2Id, shouldRun])
}
