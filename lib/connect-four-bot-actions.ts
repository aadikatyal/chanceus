"use server"

import { createAdminClient } from "@/lib/supabase/admin"

const BOT_USERNAME_PREFIX = "tournament_bot_"

function isBotUsername(username: string | null | undefined): boolean {
  return !!username && username.startsWith(BOT_USERNAME_PREFIX)
}

/**
 * Start a bot-vs-bot Connect 4 match (mark both ready, set in_progress).
 * Callable by anyone viewing the match - used when spectator loads a bot-vs-bot game.
 */
export async function startBotVsBotMatch(matchId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()

    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select(`
        id,
        status,
        game_id,
        player1_id,
        player2_id,
        game_data,
        games (name)
      `)
      .eq("id", matchId)
      .single()

    if (matchError || !match) {
      return { success: false, error: "Match not found" }
    }

    if (match.status !== "waiting") {
      return { success: true } // Already started
    }

    if (!match.player1_id || !match.player2_id) {
      return { success: false, error: "Match needs both players" }
    }

    const gameName = (match.games as any)?.name?.toLowerCase?.() || ""
    const isConnectFour =
      gameName.includes("4 in a row") ||
      gameName.includes("four in a row") ||
      gameName.includes("connect 4")

    if (!isConnectFour) {
      return { success: false, error: "Not a Connect 4 match" }
    }

    const { data: users } = await supabase
      .from("users")
      .select("id, username")
      .in("id", [match.player1_id, match.player2_id])

    const p1 = users?.find((u) => u.id === match.player1_id)
    const p2 = users?.find((u) => u.id === match.player2_id)

    if (!isBotUsername(p1?.username) || !isBotUsername(p2?.username)) {
      return { success: false, error: "Both players must be bots" }
    }

    const gameData = (match.game_data as Record<string, unknown>) || {}
    const updatedGameData = {
      ...gameData,
      player1_ready: true,
      player2_ready: true,
    }

    const { error: updateError } = await supabase
      .from("matches")
      .update({
        status: "in_progress",
        started_at: new Date().toISOString(),
        game_data: updatedGameData,
      })
      .eq("id", matchId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return { success: true }
  } catch (err) {
    console.error("startBotVsBotMatch error:", err)
    return { success: false, error: String(err) }
  }
}

/**
 * Make a Connect 4 move on behalf of a bot. Persists to matches.game_data and match_history.
 */
export async function makeConnectFourBotMove(
  matchId: string,
  column: number,
  actingPlayerId: string
): Promise<{ success: boolean; winner?: "player1" | "player2" | "draw"; error?: string }> {
  try {
    const supabase = createAdminClient()

    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select(`
        id,
        status,
        player1_id,
        player2_id,
        game_data,
        games (name)
      `)
      .eq("id", matchId)
      .single()

    if (matchError || !match) {
      return { success: false, error: "Match not found" }
    }

    if (match.status === "completed") {
      return { success: true } // Already done
    }

    const { data: users } = await supabase
      .from("users")
      .select("id, username")
      .in("id", [match.player1_id, match.player2_id])

    const p1 = users?.find((u) => u.id === match.player1_id)
    const p2 = users?.find((u) => u.id === match.player2_id)

    if (!isBotUsername(p1?.username) || !isBotUsername(p2?.username)) {
      return { success: false, error: "Both players must be bots" }
    }

    const actingPlayer = actingPlayerId === match.player1_id ? "player1" : "player2"
    if (actingPlayerId !== match.player1_id && actingPlayerId !== match.player2_id) {
      return { success: false, error: "Invalid acting player" }
    }

    const gameData = (match.game_data as Record<string, unknown>) || {}
    const board = (gameData.board as (string | null)[]) || Array(42).fill(null)
    const currentPlayerFromDb = (gameData.currentPlayer as string) || "player1"

    if (currentPlayerFromDb !== actingPlayer) {
      return { success: false, error: "Not this player's turn" }
    }

    if (column < 0 || column > 6) {
      return { success: false, error: "Invalid column" }
    }

    // Check column has space (top row)
    if (board[column] !== null) {
      return { success: false, error: "Column is full" }
    }

    // Find lowest empty row in column
    let row = -1
    for (let r = 5; r >= 0; r--) {
      const idx = r * 7 + column
      if (board[idx] === null) {
        row = r
        break
      }
    }

    if (row < 0) {
      return { success: false, error: "Column is full" }
    }

    const newBoard = [...board]
    newBoard[row * 7 + column] = actingPlayer

    const hasWinner = checkWinnerFlat(newBoard, row, column, actingPlayer)
    const isBoardFull = newBoard.every((c) => c !== null)

    let determinedWinner: "player1" | "player2" | null = null
    if (hasWinner) {
      determinedWinner = actingPlayer
    } else if (isBoardFull) {
      const p1Count = newBoard.filter((c) => c === "player1").length
      const p2Count = newBoard.filter((c) => c === "player2").length
      determinedWinner = p1Count >= p2Count ? "player1" : "player2"
    }

    const nextPlayer = actingPlayer === "player1" ? "player2" : "player1"

    if (determinedWinner) {
      const winnerId = determinedWinner === "player1" ? match.player1_id : match.player2_id
      const gameDataForComplete = {
        board: newBoard,
        currentPlayer: actingPlayer,
        winner: determinedWinner,
      }

      const { error: updateErr } = await supabase
        .from("matches")
        .update({
          status: "completed",
          winner_id: winnerId,
          completed_at: new Date().toISOString(),
          game_data: gameDataForComplete,
        })
        .eq("id", matchId)

      if (updateErr) {
        return { success: false, error: updateErr.message }
      }

      const { data: tm } = await supabase
        .from("tournament_matches")
        .select("tournament_id")
        .eq("match_id", matchId)
        .single()

      if (tm) {
        await supabase
          .from("tournament_matches")
          .update({ status: "completed" })
          .eq("match_id", matchId)
      }
    }

    // Save move to match_history (as the acting bot)
    await supabase.from("match_history").insert({
      match_id: matchId,
      user_id: actingPlayerId,
      action_type: "move_made",
      action_data: {
        board: newBoard,
        column,
        player: actingPlayer,
        move: column,
        timestamp: new Date().toISOString(),
      },
    })

    if (!determinedWinner) {
      await supabase
        .from("matches")
        .update({
          game_data: {
            ...gameData,
            board: newBoard,
            currentPlayer: nextPlayer,
            winner: null,
          },
        })
        .eq("id", matchId)
    }

    return {
      success: true,
      winner: determinedWinner || undefined,
    }
  } catch (err) {
    console.error("makeConnectFourBotMove error:", err)
    return { success: false, error: String(err) }
  }
}

/**
 * Run a bot-vs-bot Connect 4 match to completion (server-side).
 * Used when tournament starts - matches run without anyone opening the page.
 */
export async function runBotVsBotConnectFourToCompletion(
  matchId: string
): Promise<{ success: boolean; error?: string }> {
  const startResult = await startBotVsBotMatch(matchId)
  if (!startResult.success) {
    return startResult
  }

  const supabase = createAdminClient()
  const maxMoves = 42

  for (let moveCount = 0; moveCount < maxMoves; moveCount++) {
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select(`
        id,
        status,
        player1_id,
        player2_id,
        game_data,
        games (name)
      `)
      .eq("id", matchId)
      .single()

    if (matchError || !match) break
    if (match.status === "completed") return { success: true }

    const gameData = (match.game_data as Record<string, unknown>) || {}
    const board = (gameData.board as (string | null)[]) || Array(42).fill(null)
    const currentPlayer = (gameData.currentPlayer as string) || "player1"
    const actingPlayerId = currentPlayer === "player1" ? match.player1_id : match.player2_id

    const availableColumns: number[] = []
    for (let col = 0; col < 7; col++) {
      if (board[col] === null) availableColumns.push(col)
    }
    if (availableColumns.length === 0) break

    const column = availableColumns[Math.floor(Math.random() * availableColumns.length)]
    const moveResult = await makeConnectFourBotMove(matchId, column, actingPlayerId)
    if (!moveResult.success) break
    if (moveResult.winner) return { success: true }
    // Brief delay so spectators can see moves if they open the page mid-game
    await new Promise((r) => setTimeout(r, 600))
  }

  return { success: true }
}

function checkWinnerFlat(
  board: (string | null)[],
  row: number,
  col: number,
  player: string
): boolean {
  // Horizontal
  let count = 1
  for (let i = col - 1; i >= 0 && board[row * 7 + i] === player; i--) count++
  for (let i = col + 1; i < 7 && board[row * 7 + i] === player; i++) count++
  if (count >= 4) return true

  // Vertical
  count = 1
  for (let i = row - 1; i >= 0 && board[i * 7 + col] === player; i--) count++
  for (let i = row + 1; i < 6 && board[i * 7 + col] === player; i++) count++
  if (count >= 4) return true

  // Diagonal top-left to bottom-right
  count = 1
  for (let i = 1; row - i >= 0 && col - i >= 0 && board[(row - i) * 7 + (col - i)] === player; i++) count++
  for (let i = 1; row + i < 6 && col + i < 7 && board[(row + i) * 7 + (col + i)] === player; i++) count++
  if (count >= 4) return true

  // Diagonal top-right to bottom-left
  count = 1
  for (let i = 1; row - i >= 0 && col + i < 7 && board[(row - i) * 7 + (col + i)] === player; i++) count++
  for (let i = 1; row + i < 6 && col - i >= 0 && board[(row + i) * 7 + (col - i)] === player; i++) count++
  if (count >= 4) return true

  return false
}
