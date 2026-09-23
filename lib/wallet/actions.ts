"use server"

import { walletRelease, walletSettle } from "@/lib/wallet/server"

export async function refundMatchStake(matchId: string, userId: string) {
  await walletRelease(userId, matchId, `release:${matchId}:${userId}`)
}

export async function settleMatchStake(matchId: string, winnerId: string, loserId: string, stake: number) {
  await walletSettle(winnerId, loserId, stake, matchId)
}
