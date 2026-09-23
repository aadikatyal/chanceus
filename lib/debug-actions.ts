"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { walletRelease } from "@/lib/wallet/server"

// Debug function to check match statuses
export async function debugMatches() {
  const cookieStore = await cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "User not authenticated" }
    }

    // Get all matches for this user
    const { data: userMatches, error: userMatchesError } = await supabase
      .from("matches")
      .select("*")
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
      .order("created_at", { ascending: false })

    if (userMatchesError) {
      console.error("Error fetching user matches:", userMatchesError)
      return { error: "Failed to fetch user matches" }
    }

    // Get all waiting matches
    const { data: waitingMatches, error: waitingError } = await supabase
      .from("matches")
      .select("*")
      .eq("status", "waiting")
      .is("player2_id", null)
      .order("created_at", { ascending: false })

    if (waitingError) {
      console.error("Error fetching waiting matches:", waitingError)
      return { error: "Failed to fetch waiting matches" }
    }

    // Get all matchmaking queues
    const { data: queues, error: queueError } = await supabase
      .from("matchmaking_queue")
      .select("*")
      .eq("status", "waiting")
      .order("created_at", { ascending: false })

    if (queueError) {
      console.error("Error fetching queues:", queueError)
      return { error: "Failed to fetch queues" }
    }

    return {
      success: true,
      data: {
        userMatches: userMatches || [],
        waitingMatches: waitingMatches || [],
        queues: queues || [],
        userId: user.id
      }
    }

  } catch (error) {
    console.error("Debug matches error:", error)
    return { error: "An unexpected error occurred" }
  }
}

// Force cancel all user's waiting matches
export async function forceCancelAllUserMatches() {
  const cookieStore = await cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "User not authenticated" }
    }

    // Get all waiting matches for this user
    const { data: userWaitingMatches, error: fetchError } = await supabase
      .from("matches")
      .select("*")
      .eq("player1_id", user.id)
      .eq("status", "waiting")
      .is("player2_id", null)

    if (fetchError) {
      console.error("Error fetching user waiting matches:", fetchError)
      return { error: "Failed to fetch user matches" }
    }

    if (!userWaitingMatches || userWaitingMatches.length === 0) {
      return { success: true, message: "No waiting matches found for this user" }
    }

    console.log(`Found ${userWaitingMatches.length} waiting matches for user ${user.id}`)

    // Cancel all waiting matches
    for (const match of userWaitingMatches) {
      console.log(`Cancelling match ${match.id}`)
      
      // Update match status to cancelled
      const { error: updateError } = await supabase
        .from("matches")
        .update({ status: "cancelled" })
        .eq("id", match.id)

      if (updateError) {
        console.error(`Failed to cancel match ${match.id}:`, updateError)
        continue
      }

      // Refund the bet
      await walletRelease(user.id, match.id, `release:${match.id}:${user.id}`)
    }

    return { 
      success: true, 
      message: `Cancelled ${userWaitingMatches.length} matches and refunded tokens` 
    }

  } catch (error) {
    console.error("Force cancel error:", error)
    return { error: "An unexpected error occurred" }
  }
}

// Force cancel ALL active matches (admin function)
export async function forceCancelAllActiveMatches() {
  const cookieStore = await cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "User not authenticated" }
    }

    // Get ALL active matches (waiting or in_progress)
    const { data: activeMatches, error: fetchError } = await supabase
      .from("matches")
      .select("*")
      .in("status", ["waiting", "in_progress"])
      .order("created_at", { ascending: false })

    if (fetchError) {
      console.error("Error fetching active matches:", fetchError)
      return { error: "Failed to fetch active matches" }
    }

    if (!activeMatches || activeMatches.length === 0) {
      return { success: true, message: "No active matches found to cancel." }
    }

    console.log(`Found ${activeMatches.length} active matches to cancel`)

    let totalRefunded = 0
    let cancelledCount = 0

    // Cancel all active matches
    for (const match of activeMatches) {
      console.log(`Cancelling match ${match.id} (status: ${match.status})`)
      
      // Update match status to cancelled
      const { error: updateError } = await supabase
        .from("matches")
        .update({ status: "cancelled" })
        .eq("id", match.id)

      if (updateError) {
        console.error(`Failed to cancel match ${match.id}:`, updateError)
        continue // Try to cancel other matches
      }

      cancelledCount++

      // Refund tokens to player1 if they exist
      if (match.player1_id) {
        try {
          await walletRelease(match.player1_id, match.id, `release:${match.id}:${match.player1_id}`)
          totalRefunded += match.bet_amount
        } catch (refundError) {
          console.error(`Refund error for match ${match.id}:`, refundError)
        }
      }
    }

    // Also cancel all waiting matchmaking queues
    const { data: waitingQueues, error: queueError } = await supabase
      .from("matchmaking_queue")
      .select("id")
      .eq("status", "waiting")

    if (!queueError && waitingQueues && waitingQueues.length > 0) {
      await supabase
        .from("matchmaking_queue")
        .update({ status: "cancelled" })
        .in("id", waitingQueues.map(q => q.id))
      
      console.log(`Also cancelled ${waitingQueues.length} waiting matchmaking queues`)
    }

    revalidatePath("/games")
    revalidatePath("/matches")
    revalidatePath("/dashboard")

    return { 
      success: true, 
      message: `Successfully cancelled ${cancelledCount} active matches and refunded ${totalRefunded} tokens. Also cleared ${waitingQueues?.length || 0} matchmaking queues.` 
    }
  } catch (error) {
    console.error("Force cancel all active matches error:", error)
    return { error: "An unexpected error occurred during force cancellation." }
  }
}
