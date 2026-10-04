import { createAdminClient } from "@/lib/supabase/admin"
import { getHeadsUpTier, headsUpPot } from "@/lib/economy/spec"

export async function lockHeadsUpEscrow(input: {
  matchId: string
  player1Id: string
  player2Id: string
  stake: number
}) {
  const tier = getHeadsUpTier(input.stake)
  if (!tier) return { success: false as const, error: "Stake is not a winner-take-all tier" }
  if (input.player1Id === input.player2Id) {
    return { success: false as const, error: "Both seats must be different players" }
  }

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from("match_escrows")
    .select("id, status")
    .eq("match_id", input.matchId)
    .maybeSingle()

  if (existing?.status === "ESCROW_LOCKED" || existing?.status === "RELEASED") {
    return { success: true as const, alreadyLocked: true }
  }

  const [{ data: player1 }, { data: player2 }] = await Promise.all([
    admin.from("users").select("tokens").eq("id", input.player1Id).single(),
    admin.from("users").select("tokens").eq("id", input.player2Id).single(),
  ])

  if (!player1 || player1.tokens < tier.stake) {
    return { success: false as const, error: "Player 1 has insufficient gems" }
  }
  if (!player2 || player2.tokens < tier.stake) {
    return { success: false as const, error: "Player 2 has insufficient gems" }
  }

  const description = `Escrow lock — ${tier.stake} gems`
  const { error: firstError } = await admin.from("transactions").insert({
    user_id: input.player1Id,
    match_id: input.matchId,
    amount: -tier.stake,
    type: "bet",
    description,
  })
  if (firstError) return { success: false as const, error: "Failed to lock player 1 stake" }

  const { error: secondError } = await admin.from("transactions").insert({
    user_id: input.player2Id,
    match_id: input.matchId,
    amount: -tier.stake,
    type: "bet",
    description,
  })
  if (secondError) {
    await admin.from("transactions").insert({
      user_id: input.player1Id,
      match_id: input.matchId,
      amount: tier.stake,
      type: "refund",
      description: `Escrow rollback — ${tier.stake} gems`,
    })
    return { success: false as const, error: "Failed to lock player 2 stake" }
  }

  const { error: escrowError } = await admin.from("match_escrows").insert({
    match_id: input.matchId,
    player1_id: input.player1Id,
    player2_id: input.player2Id,
    stake_per_player: tier.stake,
    pot_amount: tier.pot,
    status: "ESCROW_LOCKED",
  })

  if (escrowError) {
    await admin.from("transactions").insert([
      {
        user_id: input.player1Id,
        match_id: input.matchId,
        amount: tier.stake,
        type: "refund",
        description: `Escrow rollback — ${tier.stake} gems`,
      },
      {
        user_id: input.player2Id,
        match_id: input.matchId,
        amount: tier.stake,
        type: "refund",
        description: `Escrow rollback — ${tier.stake} gems`,
      },
    ])
    return { success: false as const, error: "Failed to record escrow" }
  }

  await admin
    .from("matches")
    .update({ winner_takes_all: true, escrow_status: "ESCROW_LOCKED" })
    .eq("id", input.matchId)

  return { success: true as const, pot: tier.pot }
}

export async function releaseHeadsUpEscrow(matchId: string, winnerId: string | null) {
  const admin = createAdminClient()
  const { data: escrow } = await admin.from("match_escrows").select("*").eq("match_id", matchId).maybeSingle()
  if (!escrow) return { skipped: true as const }
  if (escrow.status !== "ESCROW_LOCKED") return { skipped: true as const, status: escrow.status }

  if (!winnerId) {
    const { error } = await admin.from("transactions").insert([
      {
        user_id: escrow.player1_id,
        match_id: matchId,
        amount: escrow.stake_per_player,
        type: "refund",
        description: `Draw refund — ${escrow.stake_per_player} gems`,
      },
      {
        user_id: escrow.player2_id,
        match_id: matchId,
        amount: escrow.stake_per_player,
        type: "refund",
        description: `Draw refund — ${escrow.stake_per_player} gems`,
      },
    ])
    if (error) return { error: error.message }
    await admin
      .from("match_escrows")
      .update({ status: "REFUNDED", released_at: new Date().toISOString() })
      .eq("id", escrow.id)
    await admin.from("matches").update({ escrow_status: "REFUNDED" }).eq("id", matchId)
    return { refunded: true as const }
  }

  if (winnerId !== escrow.player1_id && winnerId !== escrow.player2_id) {
    return { error: "Winner is not in this match" }
  }

  const pot = escrow.pot_amount || headsUpPot(escrow.stake_per_player)
  const { error } = await admin.from("transactions").insert({
    user_id: winnerId,
    match_id: matchId,
    amount: pot,
    type: "win",
    description: `Winner takes all — ${pot} gems`,
  })
  if (error) return { error: error.message }

  await admin
    .from("match_escrows")
    .update({ status: "RELEASED", winner_id: winnerId, released_at: new Date().toISOString() })
    .eq("id", escrow.id)
  await admin.from("matches").update({ escrow_status: "RELEASED", winner_takes_all: true }).eq("id", matchId)
  return { released: true as const, pot }
}

export async function refundHeadsUpEscrow(matchId: string) {
  const admin = createAdminClient()
  const { data: escrow } = await admin.from("match_escrows").select("*").eq("match_id", matchId).maybeSingle()
  if (!escrow || escrow.status !== "ESCROW_LOCKED") return { skipped: true as const }

  const { error } = await admin.from("transactions").insert([
    {
      user_id: escrow.player1_id,
      match_id: matchId,
      amount: escrow.stake_per_player,
      type: "refund",
      description: `Match cancelled — ${escrow.stake_per_player} gems returned`,
    },
    {
      user_id: escrow.player2_id,
      match_id: matchId,
      amount: escrow.stake_per_player,
      type: "refund",
      description: `Match cancelled — ${escrow.stake_per_player} gems returned`,
    },
  ])
  if (error) return { error: error.message }

  await admin
    .from("match_escrows")
    .update({ status: "REFUNDED", released_at: new Date().toISOString() })
    .eq("id", escrow.id)
  await admin.from("matches").update({ escrow_status: "REFUNDED" }).eq("id", matchId)
  return { refunded: true as const }
}
