"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { createServerActionClient } from "@supabase/auth-helpers-nextjs"

export interface Tournament {
  id: string
  game_id: string
  name: string
  description: string | null
  max_participants: number
  entry_fee: number
  prize_pool: number
  status: string
  current_round: number
  total_rounds: number
  winner_id: string | null
  creator_id: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  games?: {
    id: string
    name: string
  }
}

export interface TournamentParticipant {
  id: string
  tournament_id: string
  user_id: string
  bracket_position: number | null
  round_eliminated: number | null
  final_rank: number | null
  status: string
  registered_at: string
  users?: {
    id: string
    username: string
    display_name: string
    avatar_url: string | null
  }
}

export interface TournamentMatch {
  id: string
  tournament_id: string
  match_id: string
  round_number: number
  bracket_position: number
  player1_bracket_position: number | null
  player2_bracket_position: number | null
  winner_bracket_position: number | null
  is_bye: boolean
  status: string
  created_at: string
  matches?: {
    id: string
    player1_id: string
    player2_id: string | null
    winner_id: string | null
    status: string
  }
}

// Utility functions (not server actions)
// Powers of 2 supported for tournaments (no byes)
function findNextPowerOfTwo(n: number): number {
  if (n <= 4) return 4
  if (n <= 8) return 8
  if (n <= 16) return 16
  if (n <= 32) return 32
  if (n <= 64) return 64
  if (n <= 128) return 128
  if (n <= 256) return 256
  return 512
}

function isPowerOfTwo(n: number): boolean {
  return n >= 4 && (n & (n - 1)) === 0
}

function calculateTotalRounds(participantCount: number): number {
  if (participantCount < 4) return 0
  const powerOfTwo = findNextPowerOfTwo(participantCount)
  return Math.log2(powerOfTwo)
}

function generateBracketPositions(participantCount: number, round: number): number[] {
  if (round === 1) {
    // First round: sequential positions 1, 2, 3, ..., participantCount
    return Array.from({ length: participantCount }, (_, i) => i + 1)
  }
  
  // For subsequent rounds, positions are based on winners from previous round
  const previousRoundWinners = Math.ceil(participantCount / Math.pow(2, round - 1))
  return Array.from({ length: previousRoundWinners }, (_, i) => i + 1)
}

// Fisher-Yates shuffle algorithm for random pairing
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Create a new tournament
export async function createTournament(
  gameId: string,
  name: string,
  description: string | null,
  entryFee: number,
  maxParticipants: number = 100
) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("You must be logged in to create a tournament")
  }

  // Verify game exists
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .eq("is_active", true)
    .single()

  if (gameError || !game) {
    throw new Error("Game not found or inactive")
  }

  // Calculate total rounds
  const totalRounds = calculateTotalRounds(maxParticipants)

  if (maxParticipants < 4 || maxParticipants > 512 || !isPowerOfTwo(maxParticipants)) {
    throw new Error("Max participants must be a power of 2: 4, 8, 16, 32, 64, 128, 256, or 512")
  }

  // Create tournament
  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .insert({
      game_id: gameId,
      name,
      description,
      max_participants: maxParticipants,
      entry_fee: entryFee,
      prize_pool: 0,
      status: "registration",
      current_round: 0,
      total_rounds: totalRounds,
      creator_id: user.id,
    })
    .select()
    .single()

  if (tournamentError) {
    console.error("Tournament creation error:", tournamentError)
    throw new Error(`Failed to create tournament: ${tournamentError.message}`)
  }

  revalidatePath("/tournaments")
  return tournament
}

// Delete a tournament (creator only). Cascades to tournament_participants and tournament_matches.
export async function deleteTournament(tournamentId: string) {
  const cookieStore = await cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "You must be logged in to delete a tournament" }
    }

    const { data: tournament, error: fetchError } = await supabase
      .from("tournaments")
      .select("id, creator_id")
      .eq("id", tournamentId)
      .single()

    if (fetchError || !tournament) {
      return { error: "Tournament not found" }
    }

    if (tournament.creator_id !== user.id) {
      return { error: "Only the tournament creator can delete it" }
    }

    const { error: deleteError } = await supabase
      .from("tournaments")
      .delete()
      .eq("id", tournamentId)

    if (deleteError) {
      console.error("Tournament delete error:", deleteError)
      return { error: deleteError.message || "Failed to delete tournament" }
    }

    revalidatePath("/tournaments")
    revalidatePath(`/tournaments/${tournamentId}`)
    return { success: true }
  } catch (err: any) {
    console.error("Delete tournament error:", err)
    return { error: err?.message || "Failed to delete tournament" }
  }
}

// Register for a tournament
export async function registerForTournament(tournamentId: string) {
  const cookieStore = await cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "You must be logged in to register" }
    }

    // Get tournament - allow registration as long as tournament is not completed/cancelled and not full
    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", tournamentId)
      .in("status", ["registration", "in_progress"])
      .single()

    if (tournamentError || !tournament) {
      return { error: "Tournament not found or registration closed" }
    }

    // Don't allow registration if tournament is completed or cancelled
    if (tournament.status === "completed" || tournament.status === "cancelled") {
      return { error: "Tournament registration is closed" }
    }

    // Check if already registered
    const { data: existingRegistration } = await supabase
      .from("tournament_participants")
      .select("*")
      .eq("tournament_id", tournamentId)
      .eq("user_id", user.id)
      .single()

    if (existingRegistration) {
      return { error: "You are already registered for this tournament" }
    }

    // Check participant count
    const { count: participantCount } = await supabase
      .from("tournament_participants")
      .select("*", { count: "exact", head: true })
      .eq("tournament_id", tournamentId)
      .eq("status", "registered")

    if (participantCount && participantCount >= tournament.max_participants) {
      return { error: "Tournament is full" }
    }

    // Check user has enough tokens
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("tokens")
      .eq("id", user.id)
      .single()

    if (userError || !userData || userData.tokens < tournament.entry_fee) {
      return { error: "Insufficient token balance" }
    }

    // Deduct entry fee
    const { error: updateError } = await supabase
      .from("users")
      .update({ tokens: userData.tokens - tournament.entry_fee })
      .eq("id", user.id)

    if (updateError) {
      return { error: "Failed to deduct entry fee" }
    }

    // Create transaction record
    await supabase.from("transactions").insert({
      user_id: user.id,
      type: "bet",
      amount: -tournament.entry_fee,
      description: `Tournament entry fee: ${tournament.name}`,
    })

    // Update prize pool
    const newPrizePool = (tournament.prize_pool || 0) + tournament.entry_fee
    const { error: prizePoolError } = await supabase
      .from("tournaments")
      .update({ prize_pool: newPrizePool })
      .eq("id", tournamentId)

    if (prizePoolError) {
      console.error("❌ Failed to update prize pool during registration:", prizePoolError)
      console.error("   This is likely due to missing UPDATE RLS policy on tournaments table")
      // Don't fail registration if prize pool update fails, but log it
      // The sync function will fix it later
    } else {
      console.log(`✅ Updated prize pool to ${newPrizePool} during registration`)
    }

    // Register participant
    const { data: participant, error: participantError } = await supabase
      .from("tournament_participants")
      .insert({
        tournament_id: tournamentId,
        user_id: user.id,
        status: "registered",
      })
      .select()
      .single()

    if (participantError) {
      console.error("Participant registration error:", participantError)
      return { error: "Failed to register for tournament" }
    }

    revalidatePath("/tournaments")
    revalidatePath(`/tournaments/${tournamentId}`)
    return { success: true, participant }
  } catch (error) {
    console.error("Register tournament error:", error)
    return { error: "An unexpected error occurred" }
  }
}

// Generate brackets and start tournament
export async function startTournament(tournamentId: string) {
  const cookieStore = await cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "You must be logged in" }
    }

    // Get tournament
    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", tournamentId)
      .single()

    if (tournamentError || !tournament) {
      return { error: "Tournament not found" }
    }

    // Check if matches already exist for this tournament FIRST (prevent duplicate creation)
    // This check happens before status check because status might not be updated yet
    const { data: existingMatches, error: existingMatchesError } = await supabase
      .from("tournament_matches")
      .select("id, round_number")
      .eq("tournament_id", tournamentId)
      .limit(1)

    if (existingMatchesError) {
      console.error("Error checking existing matches:", existingMatchesError)
    }

    if (existingMatches && existingMatches.length > 0) {
      console.log("⚠️ Tournament matches already exist, updating status only")
      // Matches already exist, just update the tournament status if needed
      if (tournament.status === "registration") {
        await supabase
          .from("tournaments")
          .update({
            status: "in_progress",
            current_round: existingMatches[0].round_number || 1,
            started_at: tournament.started_at || new Date().toISOString(),
          })
          .eq("id", tournamentId)
      }

      revalidatePath("/tournaments")
      revalidatePath(`/tournaments/${tournamentId}`)
      return { success: true, message: "Tournament already has matches" }
    }

    // Only proceed if no matches exist
    if (tournament.status !== "registration") {
      return { error: "Tournament has already started" }
    }

    // Get all participants for this tournament (don't filter by status since we're in registration)
    // In registration phase, all participants should be valid
    const { data: participants, error: participantsError } = await supabase
      .from("tournament_participants")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("registered_at", { ascending: true })

    console.log("🔍 Start tournament - Participants query:", {
      participantsError,
      participants,
      participantCount: participants?.length,
      tournamentId,
    })

    if (participantsError) {
      console.error("❌ Error fetching participants:", participantsError)
      return { error: `Failed to fetch participants: ${participantsError.message}` }
    }

    if (!participants || participants.length < 4) {
      console.error("❌ Insufficient participants:", {
        participants,
        count: participants?.length || 0,
        tournamentId,
      })
      return { error: `Need at least 4 participants to start tournament. Found: ${participants?.length || 0} participants.` }
    }

    // Dedupe by user_id so the same user never appears twice (avoids "player vs themselves")
    const seenUserIds = new Set<string>()
    const uniqueParticipants = (participants as any[]).filter((p: any) => {
      if (seenUserIds.has(p.user_id)) return false
      seenUserIds.add(p.user_id)
      return true
    })
    if (uniqueParticipants.length !== participants.length) {
      console.warn(`⚠️ Removed ${participants.length - uniqueParticipants.length} duplicate participant(s) by user_id`)
    }

    const participantCount = uniqueParticipants.length
    const N = participantCount

    if (N < 4) {
      return { error: `Need at least 4 unique participants to start. Found: ${N}.` }
    }

    const P = findNextPowerOfTwo(N)
    // No byes: require exact power of 2
    if (N !== P) {
      return {
        error: `Tournament must have exactly a power of 2 players (4, 8, 16, 32, 64, 128, 256, 512). You have ${N} participants.`,
      }
    }
    const byes = 0 // Bye logic commented out — power of 2 only

    console.log(`📊 Tournament setup: ${N} participants (power of 2, no byes)`)

    // Shuffle participants randomly for fair pairing
    const shuffledParticipants = shuffleArray(uniqueParticipants)
    console.log(`🎲 Shuffled ${participantCount} participants randomly for pairing`)

    // Assign bracket positions (1 to N) to shuffled participants
    for (let i = 0; i < participantCount; i++) {
      const { error: updateError } = await supabase
        .from("tournament_participants")
        .update({ bracket_position: i + 1, status: "active" })
        .eq("id", shuffledParticipants[i].id)

      if (updateError) {
        console.error(`Error updating participant ${i + 1}:`, updateError)
      }
    }

    // Refresh participants to get updated bracket positions (dedupe again in case of stale data)
    const { data: updatedParticipants } = await supabase
      .from("tournament_participants")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("bracket_position", { ascending: true })

    const rawList = (updatedParticipants || shuffledParticipants) as any[]
    const seenIds = new Set<string>()
    const finalParticipants = rawList.filter((p: any) => {
      if (!p?.user_id || seenIds.has(p.user_id)) return false
      seenIds.add(p.user_id)
      return true
    })

    if (finalParticipants.length < N - byes) {
      console.error(`❌ After dedupe we have ${finalParticipants.length} participants but need ${N - byes} for round 1`)
      return { error: "Duplicate participants detected. Please remove duplicates and try again." }
    }

    // Round 1: all N players play (no byes)
    const playersInRound1 = N
    const matchesPerRound = N / 2

    console.log(`🎮 Round 1: ${playersInRound1} players, ${matchesPerRound} matches`)

    // Create matches for round 1 (only for players who play, not byes)
    const createdMatches = []
    for (let i = 0; i < matchesPerRound; i++) {
      const player1 = finalParticipants[i * 2]
      const player2 = finalParticipants[i * 2 + 1]

      if (!player1 || !player2) {
        console.error(`Missing players for match ${i + 1}:`, { player1, player2 })
        continue
      }

      if (player1.user_id === player2.user_id) {
        console.error(`Skipping match ${i + 1}: same user (${player1.user_id}) would play themselves`)
        continue
      }

      // Create match
      const { data: match, error: matchError } = await supabase
        .from("matches")
        .insert({
          game_id: tournament.game_id,
          player1_id: player1.user_id,
          player2_id: player2.user_id,
          bet_amount: 0, // Tournament matches don't have individual bets
          status: "waiting",
        })
        .select()
        .single()

      if (matchError) {
        console.error(`❌ Match creation error for match ${i + 1}:`, matchError)
        return { error: `Failed to create match: ${matchError.message}` }
      }

      if (!match) {
        console.error(`❌ Match creation returned no data for match ${i + 1}`)
        return { error: `Failed to create match ${i + 1}` }
      }

      console.log(`✅ Created match ${i + 1}:`, match.id)

      // Create tournament match record
      const { error: tournamentMatchError } = await supabase.from("tournament_matches").insert({
        tournament_id: tournamentId,
        match_id: match.id,
        round_number: 1,
        bracket_position: i + 1,
        player1_bracket_position: player1.bracket_position || i * 2 + 1,
        player2_bracket_position: player2.bracket_position || i * 2 + 2,
        status: "pending",
      })

      if (tournamentMatchError) {
        console.error(`❌ Tournament match record creation error:`, tournamentMatchError)
        return { error: `Failed to create tournament match record: ${tournamentMatchError.message}` }
      }

      createdMatches.push(match.id)
    }

    console.log(`✅ Created ${createdMatches.length} matches for round 1`)

    // Bye logic disabled — power of 2 only, no byes
    // if (byes > 0) {
    //   console.log(`🎯 Creating ${byes} bye(s) for automatic advancement`)
    //   for (let i = 0; i < byes; i++) {
    //     const byePlayer = finalParticipants[playersInRound1 + i]
    //     ...
    //   }
    // }

    // Update tournament status
    await supabase
      .from("tournaments")
      .update({
        status: "in_progress",
        current_round: 1,
        started_at: new Date().toISOString(),
      })
      .eq("id", tournamentId)

    // Run bot-vs-bot Connect 4 matches to completion in the background
    // (so spectators see live games when they open, not waiting for someone to load the page)
    const { runBotVsBotConnectFourToCompletion } = await import("@/lib/connect-four-bot-actions")
    for (const matchId of createdMatches) {
      runBotVsBotConnectFourToCompletion(matchId).catch((err) =>
        console.error("Bot match auto-run error:", err)
      )
    }

    revalidatePath("/tournaments")
    revalidatePath(`/tournaments/${tournamentId}`)
    return { success: true }
  } catch (error) {
    console.error("Start tournament error:", error)
    return { error: "An unexpected error occurred" }
  }
}

// Sync prize pool based on registered participants (internal helper)
async function syncPrizePool(tournamentId: string, supabase: any) {
  try {
    // Get count of all participants (not just registered status)
    const { count: participantCount, error: countError } = await supabase
      .from("tournament_participants")
      .select("*", { count: "exact", head: true })
      .eq("tournament_id", tournamentId)

    if (countError) {
      console.error("Error counting participants:", countError)
      return
    }

    // Get tournament entry fee
    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .select("entry_fee, prize_pool")
      .eq("id", tournamentId)
      .single()

    if (tournamentError || !tournament) {
      console.error("Error fetching tournament for sync:", tournamentError)
      return
    }

    // Calculate correct prize pool
    const correctPrizePool = (participantCount || 0) * tournament.entry_fee

    console.log(`🔍 Prize pool sync check: ${participantCount} participants × ${tournament.entry_fee} = ${correctPrizePool} (current: ${tournament.prize_pool})`)

    // Only update if different (to avoid unnecessary writes)
    if (tournament.prize_pool !== correctPrizePool) {
      const { error: updateError } = await supabase
        .from("tournaments")
        .update({ prize_pool: correctPrizePool })
        .eq("id", tournamentId)

      if (updateError) {
        console.error("Error updating prize pool:", updateError)
      } else {
        console.log(`✅ Synced prize pool for tournament ${tournamentId}: ${correctPrizePool}`)
      }
    }
  } catch (error) {
    console.error("Error in syncPrizePool:", error)
  }
}

// Get tournament details
export async function getTournament(tournamentId: string): Promise<Tournament | null> {
  const supabase = await createClient()

  const { data: tournament, error } = await supabase
    .from("tournaments")
    .select("*, games(id, name)")
    .eq("id", tournamentId)
    .single()

  if (error || !tournament) {
    return null
  }

  // Sync prize pool using server action client (has better permissions)
  try {
    const cookieStore = await cookies()
    const actionSupabase = createServerActionClient({ cookies: () => cookieStore })
    await syncPrizePool(tournamentId, actionSupabase)
  } catch (syncError) {
    console.error("Error syncing prize pool in getTournament:", syncError)
    // Continue even if sync fails
  }

  // Fetch again to get updated prize pool
  const { data: updatedTournament, error: fetchError } = await supabase
    .from("tournaments")
    .select("*, games(id, name)")
    .eq("id", tournamentId)
    .single()

  if (fetchError) {
    console.error("Error fetching updated tournament:", fetchError)
  }

  // Note: Can't use revalidatePath here as this function is called during render
  // The sync will update the database, and the updated value will be returned
  return (updatedTournament || tournament) as Tournament
}

// Manual sync prize pool (server action)
export async function syncTournamentPrizePool(tournamentId: string) {
  const cookieStore = await cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    // Get count of all participants
    const { count: participantCount, error: countError } = await supabase
      .from("tournament_participants")
      .select("*", { count: "exact", head: true })
      .eq("tournament_id", tournamentId)

    if (countError) {
      console.error("Error counting participants:", countError)
      return { error: "Failed to count participants" }
    }

    // Get tournament entry fee
    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .select("entry_fee, prize_pool")
      .eq("id", tournamentId)
      .single()

    if (tournamentError || !tournament) {
      console.error("Error fetching tournament:", tournamentError)
      return { error: "Tournament not found" }
    }

    // Calculate correct prize pool
    const correctPrizePool = (participantCount || 0) * tournament.entry_fee

    console.log(`🔧 Manual sync: ${participantCount} participants × ${tournament.entry_fee} = ${correctPrizePool}`)

    // Update prize pool
    const { data: updateData, error: updateError } = await supabase
      .from("tournaments")
      .update({ prize_pool: correctPrizePool })
      .eq("id", tournamentId)
      .select()

    if (updateError) {
      console.error("❌ Error updating prize pool:", updateError)
      console.error("   Error details:", JSON.stringify(updateError, null, 2))
      return { error: `Failed to update: ${updateError.message}. This might be due to missing RLS policy.` }
    }

    if (!updateData || updateData.length === 0) {
      console.error("❌ Update returned no data - RLS policy might be blocking")
      return { error: "Update failed - no data returned. Check RLS policies." }
    }

    console.log(`✅ Successfully updated prize pool to ${correctPrizePool}`)
    console.log("   Updated tournament:", updateData[0])
    
    revalidatePath(`/tournaments/${tournamentId}`)
    revalidatePath("/tournaments")
    return { success: true, prizePool: correctPrizePool }
  } catch (error) {
    console.error("Error syncing prize pool:", error)
    return { error: "An unexpected error occurred" }
  }
}

// Get tournament participants
export async function getTournamentParticipants(
  tournamentId: string
): Promise<TournamentParticipant[]> {
  const supabase = await createClient()

  const { data: participants, error } = await supabase
    .from("tournament_participants")
    .select("*, users(id, username, display_name, avatar_url)")
    .eq("tournament_id", tournamentId)
    .order("bracket_position", { ascending: true, nullsLast: true })

  if (error || !participants) {
    return []
  }

  return participants as TournamentParticipant[]
}

// Get tournament matches for a round
// Uses admin client to bypass RLS so we can show the full bracket (including bot-vs-bot matches)
export async function getTournamentMatches(
  tournamentId: string,
  roundNumber?: number
): Promise<TournamentMatch[]> {
  const { createAdminClient } = await import("@/lib/supabase/admin")
  const supabase = createAdminClient()

  let query = supabase
    .from("tournament_matches")
    .select("*, matches(id, player1_id, player2_id, winner_id, status)")
    .eq("tournament_id", tournamentId)

  if (roundNumber) {
    query = query.eq("round_number", roundNumber)
  }

  const { data: matches, error } = await query
    .order("round_number", { ascending: true })
    .order("bracket_position", { ascending: true })
    .order("id", { ascending: true })

  if (error) {
    console.error("❌ Error fetching tournament matches:", error)
    return []
  }

  if (!matches) {
    console.log("⚠️ No tournament matches found for tournament:", tournamentId)
    return []
  }

  console.log(`✅ Found ${matches.length} tournament matches for tournament ${tournamentId}`)
  return matches as TournamentMatch[]
}

// Advance tournament to next round (called when a round completes)
export async function advanceTournamentRound(tournamentId: string) {
  const cookieStore = await cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    // Get tournament
    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", tournamentId)
      .single()

    if (tournamentError || !tournament) {
      return { error: "Tournament not found" }
    }

    if (tournament.status !== "in_progress") {
      return { error: "Tournament is not in progress" }
    }

    const currentRound = tournament.current_round
    const nextRound = currentRound + 1

    // Guard: if next round already has matches, advancement already ran (e.g. from another tab/client)
    const { data: existingNextRound, error: nextRoundErr } = await supabase
      .from("tournament_matches")
      .select("id")
      .eq("tournament_id", tournamentId)
      .eq("round_number", nextRound)
      .limit(1)

    if (!nextRoundErr && existingNextRound && existingNextRound.length > 0) {
      console.log(`⚠️ Round ${nextRound} already has matches, skipping duplicate advancement`)
      revalidatePath("/tournaments")
      revalidatePath(`/tournaments/${tournamentId}`)
      return { success: true, message: "Already advanced" }
    }

    // Use getTournamentMatches so we have the EXACT same data/order as the bracket display
    const allMatches = await getTournamentMatches(tournamentId)
    const currentRoundMatchesRaw = allMatches.filter((m) => m.round_number === currentRound)
    const currentRoundMatches = currentRoundMatchesRaw
      .sort((a, b) => a.bracket_position - b.bracket_position || (a.id || "").localeCompare(b.id || ""))
      // Dedupe by bracket_position (same as bracket display) — one winner per slot
      .filter((tm, idx, arr) => {
        const firstAtPos = arr.findIndex((x) => x.bracket_position === tm.bracket_position)
        return firstAtPos === idx
      })

    // For byes, resolve winner by participant bracket_position (same as display) — avoids match data mismatches
    const { data: participants } = await supabase
      .from("tournament_participants")
      .select("user_id, bracket_position")
      .eq("tournament_id", tournamentId)
      .not("bracket_position", "is", null)
    const participantByBracketPos = new Map<number, string>()
    for (const p of participants ?? []) {
      participantByBracketPos.set(p.bracket_position, p.user_id)
    }

    // Check if all matches are completed
    const allCompleted = currentRoundMatches.every(
      (tm: any) => tm.status === "completed" || tm.is_bye
    )

    if (!allCompleted) {
      return { error: "Not all matches in current round are completed" }
    }

    // Get winners (one per match) — use joined matches(*) data so we match bracket display exactly
    const winners: Array<{ bracketPosition: number; userId: string }> = []

    for (const tm of currentRoundMatches) {
      if (tm.is_bye) {
        // Use participant lookup (same as display) — player1_bracket_position = participant 99, 100, etc.
        const bp = tm.player1_bracket_position ?? tm.winner_bracket_position ?? 0
        const winnerId = bp ? participantByBracketPos.get(bp) : null
        if (winnerId) {
          winners.push({ bracketPosition: bp, userId: winnerId })
        }
      } else {
        const matchData = tm.matches as { player1_id?: string; player2_id?: string; winner_id?: string } | null
        if (!matchData) continue
        const winnerId = matchData.winner_id
        if (winnerId) {
          winners.push({
            bracketPosition: Math.ceil((tm.bracket_position || 1) / 2),
            userId: winnerId,
          })
          const loserId =
            winnerId === matchData.player1_id ? matchData.player2_id : matchData.player1_id
          if (loserId) {
            await supabase
              .from("tournament_participants")
              .update({
                status: "eliminated",
                round_eliminated: currentRound,
              })
              .eq("tournament_id", tournamentId)
              .eq("user_id", loserId)
          }
        }
      }
    }

    if (winners.length === 0) {
      return { error: "No winners found" }
    }

    // If only one winner, tournament is complete
    if (winners.length === 1) {
      // Award prize to winner
      const winner = winners[0]
      const { data: winnerUser } = await supabase
        .from("users")
        .select("tokens")
        .eq("id", winner.userId)
        .single()

      if (winnerUser) {
        await supabase
          .from("users")
          .update({ tokens: winnerUser.tokens + tournament.prize_pool })
          .eq("id", winner.userId)

        await supabase.from("transactions").insert({
          user_id: winner.userId,
          type: "win",
          amount: tournament.prize_pool,
          description: `Tournament winner: ${tournament.name}`,
        })
      }

      // Update tournament
      await supabase
        .from("tournaments")
        .update({
          status: "completed",
          winner_id: winner.userId,
          completed_at: new Date().toISOString(),
        })
        .eq("id", tournamentId)

      // Update participant ranks
      await supabase
        .from("tournament_participants")
        .update({ final_rank: 1, status: "eliminated" })
        .eq("tournament_id", tournamentId)
        .eq("user_id", winner.userId)

      revalidatePath("/tournaments")
      revalidatePath(`/tournaments/${tournamentId}`)
      return { success: true, completed: true }
    }

    // Create next round matches
    const winnersCount = winners.length
    
    // After Round 1, we should have P/2 players (a power of 2), so no more byes
    // But if somehow we have an odd number, we need to handle it
    // In practice, after Round 1 with proper setup, this should never happen
    const matchesPerRound = Math.floor(winnersCount / 2)
    const byes = winnersCount % 2

    console.log(`🎮 Round ${nextRound}: ${winnersCount} winners, ${matchesPerRound} matches, ${byes} byes`)

    // Pair winners in bracket order (NO shuffle - winner of match 1 vs winner of match 2, etc.)
    console.log(`🎮 Pairing ${winners.length} winners in bracket order for round ${nextRound}`)

    // Validate: no duplicate winners (same player can't advance from two slots)
    const winnerUserIds = new Set<string>()
    for (const w of winners) {
      if (winnerUserIds.has(w.userId)) {
        console.error(`Duplicate winner detected: ${w.userId} appears twice in round ${currentRound} winners. Bracket data may be corrupted.`)
        return { error: "Duplicate winners detected - bracket data may be corrupted. Please contact support." }
      }
      winnerUserIds.add(w.userId)
    }

    // Build pairs — no self-pairs possible since we validated no duplicate winners
    const pairs: Array<[typeof winners[0], typeof winners[0]]> = []
    for (let i = 0; i < matchesPerRound; i++) {
      const p1 = winners[i * 2]
      const p2 = winners[i * 2 + 1]
      if (!p1 || !p2) continue
      if (p1.userId === p2.userId) {
        console.error(`Self-pair at index ${i}: both players are ${p1.userId}`)
        continue
      }
      pairs.push([p1, p2])
    }

    // Create matches for next round
    const nextRoundMatchIds: string[] = []
    for (let i = 0; i < pairs.length; i++) {
      const [player1, player2] = pairs[i]

      if (!player1 || !player2) {
        console.error(`Missing players for match ${i + 1} in round ${nextRound}`)
        continue
      }

      if (player1.userId === player2.userId) {
        console.error(
          `Skipping match ${i + 1} in round ${nextRound}: same player (${player1.userId}) would play themselves (could not fix pairing)`
        )
        continue
      }

      // Get participant records
      const { data: p1 } = await supabase
        .from("tournament_participants")
        .select("*")
        .eq("tournament_id", tournamentId)
        .eq("user_id", player1.userId)
        .single()

      const { data: p2 } = await supabase
        .from("tournament_participants")
        .select("*")
        .eq("tournament_id", tournamentId)
        .eq("user_id", player2.userId)
        .single()

      const bp1 = p1?.bracket_position ?? "?"
      const bp2 = p2?.bracket_position ?? "?"
      console.log(`🎮 Round ${nextRound} pair ${i + 1}: Bot ${bp1} vs Bot ${bp2}`)

      // Create match
      const { data: match, error: matchError } = await supabase
        .from("matches")
        .insert({
          game_id: tournament.game_id,
          player1_id: player1.userId,
          player2_id: player2.userId,
          bet_amount: 0,
          status: "waiting",
        })
        .select()
        .single()

      if (matchError) {
        console.error("Match creation error:", matchError)
        continue
      }

      if (match) nextRoundMatchIds.push(match.id)

      // Calculate winner bracket position for next round (position in next round)
      const winnerBracketPosition = i + 1

      // Create tournament match record
      await supabase.from("tournament_matches").insert({
        tournament_id: tournamentId,
        match_id: match.id,
        round_number: nextRound,
        bracket_position: i + 1,
        player1_bracket_position: p1?.bracket_position || player1.bracketPosition,
        player2_bracket_position: p2?.bracket_position || player2.bracketPosition,
        winner_bracket_position: winnerBracketPosition,
        status: "pending",
      })
    }

    // Handle byes (shouldn't happen after Round 1, but handle it just in case)
    if (byes === 1) {
      console.log(`⚠️ Warning: Odd number of winners in round ${nextRound}, creating bye`)
      const byePlayer = winners[winners.length - 1]
      const { data: byeMatch, error: byeMatchError } = await supabase
        .from("matches")
        .insert({
          game_id: tournament.game_id,
          player1_id: byePlayer.userId,
          bet_amount: 0,
          status: "completed",
          winner_id: byePlayer.userId,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (!byeMatchError && byeMatch) {
        const { data: byeParticipant } = await supabase
          .from("tournament_participants")
          .select("bracket_position")
          .eq("tournament_id", tournamentId)
          .eq("user_id", byePlayer.userId)
          .single()

        await supabase.from("tournament_matches").insert({
          tournament_id: tournamentId,
          match_id: byeMatch.id,
          round_number: nextRound,
          bracket_position: matchesPerRound + 1,
          player1_bracket_position: byeParticipant?.bracket_position || byePlayer.bracketPosition,
          is_bye: true,
          winner_bracket_position: byeParticipant?.bracket_position || byePlayer.bracketPosition,
          status: "completed",
        })
      }
    }

    // Run bot-vs-bot Connect 4 matches to completion in the background
    const { runBotVsBotConnectFourToCompletion } = await import("@/lib/connect-four-bot-actions")
    for (const matchId of nextRoundMatchIds) {
      runBotVsBotConnectFourToCompletion(matchId).catch((err) =>
        console.error("Bot match auto-run error:", err)
      )
    }

    // Update tournament current round
    await supabase
      .from("tournaments")
      .update({ current_round: nextRound })
      .eq("id", tournamentId)

    revalidatePath("/tournaments")
    revalidatePath(`/tournaments/${tournamentId}`)
    return { success: true, completed: false, nextRound }
  } catch (error) {
    console.error("Advance tournament error:", error)
    return { error: "An unexpected error occurred" }
  }
}

// Get all tournaments
export async function getAllTournaments(): Promise<Tournament[]> {
  const supabase = await createClient()

  const { data: tournaments, error } = await supabase
    .from("tournaments")
    .select("*, games(id, name)")
    .order("created_at", { ascending: false })

  if (error || !tournaments) {
    return []
  }

  return tournaments as Tournament[]
}

