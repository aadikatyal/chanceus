"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { spendable, walletHold, walletRelease } from "@/lib/wallet/server"
import { deductMatchTokens } from "@/lib/deduct-match-tokens"

// Create a new match
export async function createMatch(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const gameId = formData.get("gameId")
  const betAmount = formData.get("betAmount")

  if (!gameId || !betAmount) {
    return { error: "Game and bet amount are required" }
  }

  const betAmountNum = Number.parseInt(betAmount.toString())
  if (betAmountNum < 1) {
    return { error: "Bet amount must be at least 1 token" }
  }

  const cookieStore = await cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "User not authenticated" }
    }

    // Check if user has enough tokens
    const balance = await spendable(user.id).catch(() => null)
    if (balance === null) return { error: "Wallet is unavailable" }
    if (balance < betAmountNum) {
      return { error: "Insufficient token balance" }
    }

    // Verify game exists and get min/max bet limits
    const { data: gameData, error: gameError } = await supabase.from("games").select("*").eq("id", gameId.toString()).single()

    if (gameError) {
      console.error("Error fetching game data:", gameError)
      return { error: "Failed to fetch game data" }
    }

    if (!gameData) {
      return { error: "Game not found" }
    }

    if (betAmountNum < gameData.min_bet || betAmountNum > gameData.max_bet) {
      return { error: `Bet amount must be between ${gameData.min_bet} and ${gameData.max_bet} tokens` }
    }

    // Create the match
    const { data: matchData, error: matchError } = await supabase
      .from("matches")
      .insert({
        game_id: gameId.toString(),
        player1_id: user.id,
        bet_amount: betAmountNum,
        status: "waiting",
      })
      .select()
      .single()

    if (matchError) {
      console.error("Match creation error:", matchError)
      return { error: "Failed to create match" }
    }

    try {
      await walletHold(user.id, betAmountNum, matchData.id, `hold:${matchData.id}:${user.id}`)
    } catch (holdError) {
      console.error("Error holding tokens:", holdError)
      return { error: "Failed to escrow entry fee" }
    }

    revalidatePath("/matches")
    revalidatePath("/dashboard")

    return { success: true, matchId: matchData.id }
  } catch (error) {
    console.error("Unexpected error in createMatch:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

// Join an existing match
export async function joinMatch(matchId: string) {
  const cookieStore = await cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error("User not authenticated")
    }

    // Get match details
    const { data: matchData } = await supabase
      .from("matches")
      .select("*, games(*)")
      .eq("id", matchId)
      .eq("status", "waiting")
      .single()

    if (!matchData) {
      throw new Error("Match not found or no longer available")
    }

    if (matchData.player1_id === user.id) {
      throw new Error("Cannot join your own match")
    }

    // Check if user has enough tokens
    const joinBalance = await spendable(user.id).catch(() => null)
    if (joinBalance === null || joinBalance < matchData.bet_amount) {
      throw new Error("Insufficient token balance")
    }

    // Update match with player 2 and set status to in_progress
    const { error: updateError } = await supabase
      .from("matches")
      .update({
        player2_id: user.id,
        status: "in_progress",
        started_at: new Date().toISOString(),
      })
      .eq("id", matchId)

    if (updateError) {
      console.error("Update match error:", updateError)
      throw new Error("Failed to join match")
    }

    // Mark any waiting matchmaking queues for player2 as matched
    await supabase
      .from("matchmaking_queue")
      .update({ status: "matched" })
      .eq("user_id", user.id)
      .eq("status", "waiting")
    
    // Also mark player1's queues as matched if they have any
    if (matchData.player1_id) {
      await supabase
        .from("matchmaking_queue")
        .update({ status: "matched" })
        .eq("user_id", matchData.player1_id)
        .eq("status", "waiting")
    }

    // Create bet transaction for player 2
    await walletHold(user.id, matchData.bet_amount, matchId, `hold:${matchId}:${user.id}`)

    revalidatePath("/games")
    revalidatePath("/matches")
    
    console.log("✅ Match joined successfully:", { matchId, player2Id: user.id })
    
    // Return success instead of redirect for server action compatibility
    return { success: true, matchId }
  } catch (error) {
    console.error("Join match error:", error)
    throw error
  }
}

// Cancel a match (only if you're the creator and no one has joined)
export async function cancelMatch(matchId: string) {
  console.log("🚫 cancelMatch called with matchId:", matchId)
  const cookieStore = await cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    console.log("🚫 User authenticated:", !!user, "User ID:", user?.id)

    if (!user) {
      throw new Error("User not authenticated")
    }

    // Get match details - user can be either player1 or player2
    console.log("🚫 Looking for match with ID:", matchId, "and user:", user.id)
    const { data: matchData, error: matchError } = await supabase
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
      .in("status", ["waiting", "in_progress", "completed", "cancelled"])
      .single()

    console.log("🚫 Match query result:", { matchData, matchError })

    if (!matchData) {
      console.log("🚫 Match not found or cannot be cancelled")
      throw new Error("Match not found or cannot be cancelled")
    }

    // If match is already cancelled, just return success
    if (matchData.status === "cancelled") {
      console.log("🚫 Match is already cancelled")
      return { success: true, message: "Match is already cancelled" }
    }

    // Update match status to cancelled
    console.log("🚫 Updating match status to cancelled...")
    const { error: updateError } = await supabase.from("matches").update({ status: "cancelled" }).eq("id", matchId)

    console.log("🚫 Update result:", { updateError })

    if (updateError) {
      console.error("🚫 Failed to update match status:", updateError)
      throw new Error("Failed to cancel match")
    }

    // Refund the bet to player 1
    console.log("🚫 Processing refund for amount:", matchData.bet_amount)
    await walletRelease(matchData.player1_id, matchId, `release:${matchId}:${matchData.player1_id}`)
    if (matchData.player2_id) {
      await walletRelease(matchData.player2_id, matchId, `release:${matchId}:${matchData.player2_id}`)
    }

    console.log("🚫 Revalidating paths...")
    revalidatePath("/games")
    revalidatePath("/matches")
    
    console.log("🚫 Cancel match successful!")
    // Return success instead of redirect for server action compatibility
    return { success: true }
  } catch (error) {
    console.error("Cancel match error:", error)
    throw error
  }
}

// Create a rematch and deduct tokens atomically
export async function createRematchWithDeduction(
  originalMatchId: string,
  gameId: string,
  player1Id: string,
  player2Id: string,
  betAmount: number
) {
  const cookieStore = await cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    console.log('🔄 Creating rematch with token deduction:', {
      originalMatchId,
      gameId,
      player1Id,
      player2Id,
      betAmount
    })

    const { data: originalMatch, error: originalMatchError } = await supabase
      .from("matches")
      .select("game_id, game_data, bet_amount, games (name)")
      .eq("id", originalMatchId)
      .single()

    if (originalMatchError) {
      console.error("❌ Error fetching original match for rematch:", originalMatchError)
    }

    const resolvedGameId = originalMatch?.game_id || gameId
    const originalCategory = originalMatch?.game_data?.category
    console.log("📋 Original match category for rematch:", originalCategory, "Full game_data:", originalMatch?.game_data)

    const { data: gameRow } = await supabase.from("games").select("id, name").eq("id", resolvedGameId).maybeSingle()

    if (!gameRow) {
      return { success: false, error: "Original game no longer exists. Cannot create rematch." }
    }

    const gameName = (gameRow.name || ((originalMatch as any)?.games?.name) || "").toLowerCase()

    const player1Balance = await spendable(player1Id).catch(() => null)
    const player2Balance = await spendable(player2Id).catch(() => null)
    if (player1Balance === null || player2Balance === null) {
      return { success: false, error: 'Failed to fetch player token balances' }
    }
    if (player1Balance < betAmount) return { success: false, error: 'Player 1 has insufficient tokens' }
    if (player2Balance < betAmount) return { success: false, error: 'Player 2 has insufficient tokens' }

    const isConnectFour = /4 in a row|four in a row|connect/.test(gameName)
    const isTrivia = gameName.includes("trivia")
    
    const gameData = isConnectFour ? {
      board: Array(42).fill(null),
      currentPlayer: 'player1',
      winner: null
    } : isTrivia ? {
      // Trivia will initialize its own gameState when the component loads
      // Copy category from original match so rematch uses same category
      // Always include category field (even if null/undefined) so component knows it's a rematch
      category: originalCategory || null
    } : {} // For other games, let the component initialize game_data
    
    if (isTrivia) {
      console.log('📋 Rematch game_data for trivia:', gameData, 'Category:', originalCategory)
    }
    
    const { data: newMatch, error: matchError } = await supabase
      .from('matches')
      .insert({
        game_id: gameRow.id,
        player1_id: player1Id,
        player2_id: player2Id,
        bet_amount: betAmount,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        game_data: gameData
      })
      .select()
      .single()

    if (matchError || !newMatch) {
      console.error('❌ Error creating rematch match:', matchError)
      return { success: false, error: `Failed to create rematch: ${matchError?.message || 'Unknown error'}` }
    }

    console.log('✅ Rematch match created:', newMatch.id)

    const held = await deductMatchTokens(newMatch.id, player1Id, player2Id, betAmount)
    if (!held.success) {
      await supabase.from('matches').delete().eq('id', newMatch.id)
      return { success: false, error: held.error }
    }

    revalidatePath('/games')
    revalidatePath('/matches')

    return { success: true, matchId: newMatch.id }
  } catch (error: any) {
    console.error('❌ Unexpected error creating rematch with deduction:', error)
    return { success: false, error: error?.message || 'An unexpected error occurred' }
  }
}

// Create a direct match with a friend
export async function createFriendMatch(
  gameId: string,
  friendId: string,
  betAmount: number,
  category?: string
) {
  const cookieStore = await cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "User not authenticated" }
    }

    if (user.id === friendId) {
      return { error: "Cannot play against yourself" }
    }

    // Verify friend exists and is a friend
    const { data: friendship, error: friendshipError } = await supabase
      .from("friends")
      .select("*")
      .eq("status", "accepted")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .or(`user_id.eq.${friendId},friend_id.eq.${friendId}`)
      .single()

    if (friendshipError || !friendship) {
      return { error: "Friend not found or not a friend" }
    }

    // Check if both users have enough tokens
    const userBalance = await spendable(user.id).catch(() => null)
    const friendBalance = await spendable(friendId).catch(() => null)
    if (userBalance === null) return { error: "Failed to fetch your token balance" }
    if (friendBalance === null) return { error: "Failed to fetch friend's token balance" }
    if (userBalance < betAmount) return { error: "You have insufficient tokens" }
    if (friendBalance < betAmount) return { error: "Friend has insufficient tokens" }

    // Verify game exists
    const { data: gameData, error: gameError } = await supabase
      .from("games")
      .select("*")
      .eq("id", gameId)
      .single()

    if (gameError || !gameData) {
      return { error: "Game not found" }
    }

    if (betAmount < gameData.min_bet || betAmount > gameData.max_bet) {
      return { error: `Bet amount must be between ${gameData.min_bet} and ${gameData.max_bet} tokens` }
    }

    // Create the match request (status: waiting) - friend needs to accept
    const { data: matchData, error: matchError } = await supabase
      .from("matches")
      .insert({
        game_id: gameId,
        player1_id: user.id,
        player2_id: friendId,
        bet_amount: betAmount,
        status: "waiting", // Waiting for friend to accept
        game_data: category ? { category, friend_match_request: true, player1_ready: false, player2_ready: false } : { friend_match_request: true, player1_ready: false, player2_ready: false }
      })
      .select()
      .single()

    if (matchError || !matchData) {
      console.error("Match creation error:", matchError)
      return { error: "Failed to create match request" }
    }

    // Don't deduct tokens yet - wait for both players to be ready

    revalidatePath("/games")
    revalidatePath("/matches")
    revalidatePath("/dashboard")

    return { success: true, matchId: matchData.id, message: "Match request sent to friend" }
  } catch (error) {
    console.error("Create friend match error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

// Accept a friend match request
export async function acceptFriendMatchRequest(matchId: string) {
  const cookieStore = await cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "User not authenticated" }
    }

    // Get match details
    const { data: matchData, error: matchError } = await supabase
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .eq("status", "waiting")
      .single()

    if (matchError || !matchData) {
      return { error: "Match request not found or already accepted" }
    }

    // Verify user is player2 (the friend being challenged)
    if (matchData.player2_id !== user.id) {
      return { error: "You are not the recipient of this match request" }
    }

    // Verify friend match request
    if (!matchData.game_data?.friend_match_request) {
      return { error: "This is not a friend match request" }
    }

    // Check if user has enough tokens
    const userBalance = await spendable(user.id).catch(() => null)
    const opponentBalance = await spendable(matchData.player1_id).catch(() => null)
    if (userBalance === null) return { error: "Failed to fetch your token balance" }
    if (userBalance < matchData.bet_amount) return { error: "You have insufficient tokens" }
    if (opponentBalance === null) return { error: "Failed to verify opponent's token balance" }
    if (opponentBalance < matchData.bet_amount) return { error: "Opponent has insufficient tokens" }

    // Update match to show it's accepted (but still waiting for both to be ready)
    const { error: updateError } = await supabase
      .from("matches")
      .update({
        game_data: {
          ...matchData.game_data,
          friend_match_accepted: true,
          player1_ready: false,
          player2_ready: false
        }
      })
      .eq("id", matchId)

    if (updateError) {
      console.error("Error accepting match request:", updateError)
      return { error: "Failed to accept match request" }
    }

    revalidatePath("/games")
    revalidatePath("/matches")
    revalidatePath("/dashboard")

    return { success: true, matchId }
  } catch (error) {
    console.error("Accept friend match error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

// Mark player as ready (deducts tokens when both are ready)
export async function markPlayerReady(matchId: string) {
  const cookieStore = await cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "User not authenticated" }
    }

    // Get match details
    const { data: matchData, error: matchError } = await supabase
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .in("status", ["waiting", "in_progress"])
      .single()

    if (matchError || !matchData) {
      return { error: "Match not found" }
    }

    // Verify user is a player
    const isPlayer1 = matchData.player1_id === user.id
    const isPlayer2 = matchData.player2_id === user.id

    if (!isPlayer1 && !isPlayer2) {
      return { error: "You are not a player in this match" }
    }

    // Update ready status
    const currentGameData = matchData.game_data || {}
    const updatedGameData = {
      ...currentGameData,
      [isPlayer1 ? 'player1_ready' : 'player2_ready']: true
    }

    // Check if both players are now ready
    const bothReady = updatedGameData.player1_ready && updatedGameData.player2_ready

    if (bothReady && matchData.status === "waiting") {
      // Both ready - deduct tokens and start match
      const held = await deductMatchTokens(matchData.id, matchData.player1_id, matchData.player2_id, matchData.bet_amount)
      if (!held.success) return { error: held.error || "Failed to escrow entry fee" }
      await supabase
        .from("matches")
        .update({
          status: "in_progress",
          started_at: new Date().toISOString(),
          game_data: updatedGameData
        })
        .eq("id", matchId)
    } else {
      // Just update ready status
      await supabase
        .from("matches")
        .update({
          game_data: updatedGameData
        })
        .eq("id", matchId)
    }

    revalidatePath("/games")
    revalidatePath("/matches")
    revalidatePath("/dashboard")

    return { success: true, bothReady }
  } catch (error) {
    console.error("Mark player ready error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}
