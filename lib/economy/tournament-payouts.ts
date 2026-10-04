import { createAdminClient } from "@/lib/supabase/admin"
import { isBracketCode, payoutForRank, TOURNAMENT_BRACKETS, type BracketCode } from "@/lib/economy/spec"

export async function payBracketPlacements(
  tournamentId: string,
  bracketCode: BracketCode,
  placements: Array<{ userId: string; rank: number }>,
) {
  const bracket = TOURNAMENT_BRACKETS[bracketCode]
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from("transactions")
    .select("user_id")
    .eq("tournament_id", tournamentId)
    .eq("type", "tournament_payout")

  const alreadyPaid = new Set((existing ?? []).map((row) => row.user_id))

  for (const place of placements) {
    const amount = payoutForRank(bracket, place.rank)
    await admin
      .from("tournament_participants")
      .update({ final_rank: place.rank, status: "eliminated" })
      .eq("tournament_id", tournamentId)
      .eq("user_id", place.userId)

    if (amount <= 0 || alreadyPaid.has(place.userId)) continue

    const { error } = await admin.from("transactions").insert({
      user_id: place.userId,
      tournament_id: tournamentId,
      amount,
      type: "tournament_payout",
      description: `${bracket.name} place ${place.rank} — ${amount} gems`,
    })
    if (error) return { error: error.message }
  }

  const champion = placements.find((place) => place.rank === 1)
  await admin
    .from("tournaments")
    .update({
      status: "completed",
      winner_id: champion?.userId ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", tournamentId)

  return { success: true as const }
}

export function orderedPlacements(userIds: Array<string | null | undefined>) {
  const placements: Array<{ userId: string; rank: number }> = []
  const seen = new Set<string>()
  for (const userId of userIds) {
    if (!userId || seen.has(userId)) continue
    seen.add(userId)
    placements.push({ userId, rank: placements.length + 1 })
  }
  return placements
}

export function bracketFromTournament(tournament: { bracket_code?: string | null }) {
  return isBracketCode(tournament.bracket_code) ? tournament.bracket_code : null
}
