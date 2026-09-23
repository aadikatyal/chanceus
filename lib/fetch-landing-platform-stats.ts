import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const TOKEN_PACK_USD: Record<number, number> = {
  100: 9.99,
  500: 49.99,
  1000: 99.99,
}

/** Implied USD per token when deriving from match/win volume (display only). */
const TOKEN_TO_USD = 0.01

export type LandingPlatformAggregates = {
  gamesPlayed: number
  tokensInCirculation: number
  /** Whole USD (may include cents in value, rounded for display). */
  moneyMadeUsd: number
  openLobbies: number
  inQueue: number
  registeredPlayers: number
  openTournaments: number
}

function usdFromPurchaseTransactions(rows: { amount: number; description: string | null }[]) {
  let total = 0
  for (const row of rows) {
    if (!row.description?.includes("Token purchase")) continue
    const pack = Number(row.amount) || 0
    if (TOKEN_PACK_USD[pack]) total += TOKEN_PACK_USD[pack]
  }
  return total
}

/** Public landing aggregates — admin for user/match totals; anon for queue/lobbies. */
export async function fetchLandingPlatformAggregates(completedMatchesFallback: number): Promise<LandingPlatformAggregates> {
  const supabase = await createClient()

  const [{ count: inQueue }, { count: openLobbies }] = await Promise.all([
    supabase.from("matchmaking_queue").select("*", { count: "exact", head: true }).eq("status", "waiting"),
    supabase
      .from("matches")
      .select("*", { count: "exact", head: true })
      .eq("status", "waiting")
      .is("player2_id", null),
  ])

  let gamesPlayed = completedMatchesFallback
  let tokensInCirculation = 0
  let moneyMadeUsd = 0
  let registeredPlayers = 0
  let openTournaments = 0

  try {
    const admin = createAdminClient()
    const [
      { count: completedCount },
      { count: allMatchesCount },
      { count: userCount },
      { data: playerRows },
      { data: purchaseRows },
      { data: winRows },
      { data: completedPots },
      { data: allMatchPots },
      { data: tournaments },
    ] = await Promise.all([
      admin.from("matches").select("*", { count: "exact", head: true }).eq("status", "completed"),
      admin.from("matches").select("*", { count: "exact", head: true }),
      admin.from("users").select("*", { count: "exact", head: true }),
      admin.from("users").select("tokens, total_games_played").limit(5000),
      admin.from("transactions").select("amount, description").like("description", "Token purchase%").limit(2000),
      admin.from("transactions").select("amount").eq("type", "win").gt("amount", 0).limit(5000),
      admin.from("matches").select("bet_amount").eq("status", "completed").limit(3000),
      admin.from("matches").select("bet_amount").in("status", ["completed", "in_progress"]).limit(5000),
      admin.from("tournaments").select("status"),
    ])

    let playerGamesSum = 0
    for (const row of playerRows ?? []) {
      tokensInCirculation += Number(row.tokens) || 0
      playerGamesSum += Number(row.total_games_played) || 0
    }

    const completed = completedCount ?? completedMatchesFallback
    const matchSessions = (allMatchesCount ?? 0) * 2
    // Prefer lifetime player totals, then all match sessions (2 players per match).
    gamesPlayed = Math.max(playerGamesSum, matchSessions, completed * 2, completedMatchesFallback)

    registeredPlayers = userCount ?? 0
    openTournaments = (tournaments ?? []).filter((t) => t.status !== "completed").length

    let winTokens = 0
    for (const row of winRows ?? []) {
      winTokens += Number(row.amount) || 0
    }

    let completedPot = 0
    for (const row of completedPots ?? []) {
      completedPot += (Number(row.bet_amount) || 0) * 2
    }

    let activePot = 0
    for (const row of allMatchPots ?? []) {
      activePot += (Number(row.bet_amount) || 0) * 2
    }

    const purchaseUsd = usdFromPurchaseTransactions(purchaseRows ?? [])
    const economyUsd = tokensInCirculation * TOKEN_TO_USD

    moneyMadeUsd = Math.max(
      purchaseUsd,
      winTokens * TOKEN_TO_USD,
      completedPot * TOKEN_TO_USD,
      activePot * TOKEN_TO_USD,
      economyUsd,
    )
  } catch {
    // No service role — keep anon fallbacks for games played count only.
  }

  return {
    gamesPlayed: Math.max(0, gamesPlayed),
    tokensInCirculation: Math.max(0, tokensInCirculation),
    moneyMadeUsd: Math.max(0, Math.round(moneyMadeUsd)),
    openLobbies: openLobbies ?? 0,
    inQueue: inQueue ?? 0,
    registeredPlayers,
    openTournaments,
  }
}
