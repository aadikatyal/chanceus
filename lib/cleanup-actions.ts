"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { walletRelease } from "@/lib/wallet/server"

// Clean up expired matches and matchmaking queues
export async function cleanupExpiredMatches() {
  const cookieStore = await cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    const now = new Date().toISOString()
    
    // Clean up expired matchmaking queue entries
    const { data: expiredQueues, error: queueError } = await supabase
      .from("matchmaking_queue")
      .select("*")
      .eq("status", "waiting")
      .lt("expires_at", now)

    if (queueError) {
      console.error("Error fetching expired queues:", queueError)
      return { error: "Failed to fetch expired queues" }
    }

    if (expiredQueues && expiredQueues.length > 0) {
      console.log(`🧹 Cleaning up ${expiredQueues.length} expired matchmaking queue entries`)
      
      // First, mark as expired
      const { error: updateQueueError } = await supabase
        .from("matchmaking_queue")
        .update({ status: "expired" })
        .eq("status", "waiting")
        .lt("expires_at", now)

      if (updateQueueError) {
        console.error("Error updating expired queues:", updateQueueError)
        return { error: "Failed to update expired queues" }
      }

      // Then delete the expired entries
      const { error: deleteError } = await supabase
        .from("matchmaking_queue")
        .delete()
        .eq("status", "expired")

      if (deleteError) {
        console.error("Error deleting expired queues:", deleteError)
        return { error: "Failed to delete expired queues" }
      }

      console.log(`✅ Deleted ${expiredQueues.length} expired queue entries`)
    }

    // Also clean up old expired entries (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: oldQueues, error: oldQueueError } = await supabase
      .from("matchmaking_queue")
      .select("id")
      .lt("created_at", oneHourAgo)

    if (oldQueueError) {
      console.error("Error fetching old queues:", oldQueueError)
    } else if (oldQueues && oldQueues.length > 0) {
      console.log(`🧹 Cleaning up ${oldQueues.length} old queue entries`)
      
      const { error: deleteOldError } = await supabase
        .from("matchmaking_queue")
        .delete()
        .lt("created_at", oneHourAgo)

      if (deleteOldError) {
        console.error("Error deleting old queues:", deleteOldError)
      } else {
        console.log(`✅ Deleted ${oldQueues.length} old queue entries`)
      }
    }

    // Clean up very old waiting matches (older than 2 minutes)
    const twoMinutesAgoForMatches = new Date(Date.now() - 2 * 60 * 1000).toISOString()
    
    const { data: oldMatches, error: oldMatchesError } = await supabase
      .from("matches")
      .select("*")
      .in("status", ["waiting", "in_progress"])
      .lt("created_at", twoMinutesAgoForMatches)

    if (oldMatchesError) {
      console.error("Error fetching old matches:", oldMatchesError)
      return { error: "Failed to fetch old matches" }
    }

    if (oldMatches && oldMatches.length > 0) {
      console.log(`🧹 Cleaning up ${oldMatches.length} old waiting matches`)
      
      // Cancel old matches and refund tokens
      for (const match of oldMatches) {
        // Refund the bet to player 1
        await walletRelease(match.player1_id, match.id, `release:${match.id}:${match.player1_id}`).catch((error) => {
          console.error("Refund failed:", error)
        })

        // Update match status to cancelled and set completion time
        await supabase
          .from("matches")
          .update({ 
            status: "cancelled",
            completed_at: new Date().toISOString()
          })
          .eq("id", match.id)
      }
    }

    // Revalidate paths to refresh the UI
    revalidatePath("/games")
    revalidatePath("/matches")
    
    return { 
      success: true, 
      cleanedQueues: expiredQueues?.length || 0,
      cleanedMatches: oldMatches?.length || 0
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
        totalIssues: (waitingMatches?.length || 0) + (expiredQueues?.length || 0)
      }
    }

  } catch (error) {
    console.error("Error getting match stats:", error)
    return { error: "Failed to get match statistics" }
  }
}
