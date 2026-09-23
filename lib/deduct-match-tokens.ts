"use server"

import { walletHold, walletRelease } from "@/lib/wallet/server"

export async function deductMatchTokens(matchId: string, player1Id: string, player2Id: string, betAmount: number) {
  if (betAmount <= 0) {
    return { success: true, message: "No bet amount, skipping token deduction" }
  }

  try {
    await walletHold(player1Id, betAmount, matchId, `hold:${matchId}:${player1Id}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : "hold failed"
    if (message === "insufficient_tokens") return { success: false, error: "Player 1 has insufficient tokens" }
    return { success: false, error: "Failed to escrow player 1" }
  }

  try {
    await walletHold(player2Id, betAmount, matchId, `hold:${matchId}:${player2Id}`)
  } catch (error) {
    await walletRelease(player1Id, matchId, `release:${matchId}:${player1Id}`).catch(() => undefined)
    const message = error instanceof Error ? error.message : "hold failed"
    if (message === "insufficient_tokens") return { success: false, error: "Player 2 has insufficient tokens" }
    return { success: false, error: "Failed to escrow player 2" }
  }

  return { success: true }
}
