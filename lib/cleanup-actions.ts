"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

/** Expire/cancel the signed-in user's stale queue rows and old waiting matches (RLS-safe). */
export async function cleanupExpiredMatches() {
  const cookieStore = await cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Unauthorized" }
  }

  try {
    const now = new Date().toISOString()
    let cleanedQueues = 0

    // Expire this user's waiting queue rows past expires_at
    const { data: expiredQueues, error: queueError } = await supabase
      .from("matchmaking_queue")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "waiting")
      .lt("expires_at", now)

    if (queueError) {
      console.error("Error fetching expired queues:", queueError)
      return { error: "Failed to fetch expired queues" }
    }

    if (expiredQueues && expiredQueues.length > 0) {
      const { error: updateQueueError } = await supabase
        .from("matchmaking_queue")
        .update({ status: "expired" })
        .eq("user_id", user.id)
        .eq("status", "waiting")
        .lt("expires_at", now)

      if (updateQueueError) {
        console.error("Error updating expired queues:", updateQueueError)
        return { error: "Failed to update expired queues" }
      }

      cleanedQueues += expiredQueues.length
    }

    // Expire this user's stale waiting rows (older than 1 hour) — no DELETE (no RLS delete policy)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: oldQueues, error: oldQueueError } = await supabase
      .from("matchmaking_queue")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "waiting")
      .lt("created_at", oneHourAgo)

    if (oldQueueError) {
      console.error("Error fetching old queues:", oldQueueError)
    } else if (oldQueues && oldQueues.length > 0) {
      const { error: updateOldError } = await supabase
        .from("matchmaking_queue")
        .update({ status: "expired" })
        .eq("user_id", user.id)
        .eq("status", "waiting")
        .lt("created_at", oneHourAgo)

      if (updateOldError) {
        console.error("Error expiring old queues:", updateOldError)
      } else {
        cleanedQueues += oldQueues.length
      }
    }

    if (cleanedQueues > 0) {
      console.log(`🧹 Expired ${cleanedQueues} queue entries for user ${user.id}`)
    }

    // Cancel this user's very old waiting matches (player1 only — they hold the stake)
    const twoMinutesAgoForMatches = new Date(Date.now() - 2 * 60 * 1000).toISOString()

    const { data: oldMatches, error: oldMatchesError } = await supabase
      .from("matches")
      .select("*")
      .eq("player1_id", user.id)
      .in("status", ["waiting", "in_progress"])
      .lt("created_at", twoMinutesAgoForMatches)

    if (oldMatchesError) {
      console.error("Error fetching old matches:", oldMatchesError)
      return { error: "Failed to fetch old matches" }
    }

    if (oldMatches && oldMatches.length > 0) {
      console.log(`🧹 Cleaning up ${oldMatches.length} old matches for user ${user.id}`)

      for (const match of oldMatches) {
        const { data: userData } = await supabase
          .from("users")
          .select("tokens")
          .eq("id", match.player1_id)
          .single()

        if (userData) {
          await supabase
            .from("users")
            .update({ tokens: userData.tokens + match.bet_amount })
            .eq("id", match.player1_id)

          await supabase.from("transactions").insert({
            user_id: match.player1_id,
            match_id: match.id,
            amount: match.bet_amount,
            type: "bonus",
            description: `Match expired - refund of ${match.bet_amount} tokens`,
          })
        }

        await supabase
          .from("matches")
          .update({
            status: "cancelled",
            completed_at: new Date().toISOString(),
          })
          .eq("id", match.id)
          .eq("player1_id", user.id)
      }
    }

    revalidatePath("/games")
    revalidatePath("/matches")

    return {
      success: true,
      cleanedQueues,
      cleanedMatches: oldMatches?.length || 0,
    }
  } catch (error) {
    console.error("Unexpected error in cleanupExpiredMatches:", error)
    return { error: "An unexpected error occurred during cleanup." }
  }
}

// Get current match statistics
export async function getMatchStats() {
  const cookieStore = await cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    const { data: waitingMatches } = await supabase
      .from("matches")
      .select("id, created_at, status")
      .eq("status", "waiting")
      .is("player2_id", null)

    const { data: activeQueues } = await supabase
      .from("matchmaking_queue")
      .select("id, created_at, status, expires_at")
      .eq("status", "waiting")
      .gt("expires_at", new Date().toISOString())

    const { data: expiredQueues } = await supabase
      .from("matchmaking_queue")
      .select("id, created_at, status, expires_at")
      .eq("status", "waiting")
      .lt("expires_at", new Date().toISOString())

    return {
      success: true,
      stats: {
        waitingMatches: waitingMatches?.length || 0,
        activeQueues: activeQueues?.length || 0,
        expiredQueues: expiredQueues?.length || 0,
        totalIssues: (waitingMatches?.length || 0) + (expiredQueues?.length || 0),
      },
    }
  } catch (error) {
    console.error("Error getting match stats:", error)
    return { error: "Failed to get match statistics" }
  }
}
