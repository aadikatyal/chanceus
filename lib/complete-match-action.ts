"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { createReplay } from "./replay-actions"
import { walletSettle } from "@/lib/wallet/server"

export async function completeMatch(matchId: string, winnerId: string | null, gameData: any) {
  const cookieStore = await cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    console.log('🔄 Server action: Completing match:', { matchId, winnerId })

    const { data, error } = await supabase
      .from('matches')
      .update({ 
        status: 'completed',
        winner_id: winnerId,
        completed_at: new Date().toISOString(),
        game_data: gameData
      })
      .eq('id', matchId)
      .select()

    if (error) {
      console.error('❌ Server action: Failed to complete match:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Server action: Match completed successfully:', data)

    // Transfer tokens to winner if there is one
    if (winnerId && data && data.length > 0) {
      const match = data[0]
      const betAmount = match.bet_amount || 0
      
      if (betAmount > 0) {
        const loserId = match.player1_id === winnerId ? match.player2_id : match.player1_id
        if (!loserId) return { success: false, error: "Cannot settle a match without both players" }
        try {
          await walletSettle(winnerId, loserId, betAmount, matchId)
        } catch (payoutError) {
          console.error("Failed to settle match:", payoutError)
          return { success: false, error: "Failed to settle escrow" }
        }
      }
    }

    // Create replay automatically
    try {
      // Get match history for replay
      const { data: matchHistory } = await supabase
        .from('match_history')
        .select('*')
        .eq('match_id', matchId)
        .order('timestamp', { ascending: true })

      const replayData = {
        match_id: matchId,
        game_data: gameData,
        history: matchHistory || [],
        completed_at: new Date().toISOString(),
        winner_id: winnerId,
      }

      await createReplay(matchId, replayData)
      console.log('✅ Replay created automatically')
    } catch (replayError) {
      console.error('⚠️ Failed to create replay (non-critical):', replayError)
      // Don't fail the match completion if replay creation fails
    }

    // Check if this match is part of a tournament
    const { data: tournamentMatch } = await supabase
      .from('tournament_matches')
      .select('tournament_id, round_number')
      .eq('match_id', matchId)
      .single()

    if (tournamentMatch) {
      // Update tournament match status
      await supabase
        .from('tournament_matches')
        .update({ status: 'completed' })
        .eq('match_id', matchId)

      console.log('✅ Tournament match updated:', tournamentMatch)

      // Revalidate tournament page
      revalidatePath(`/tournaments/${tournamentMatch.tournament_id}`)

      // Return tournament info so client can redirect
      return { 
        success: true, 
        data,
        tournament_id: tournamentMatch.tournament_id 
      }
    }

    // Revalidate the games page to update the UI
    revalidatePath('/games')
    revalidatePath('/matches')

    return { success: true, data }
  } catch (error) {
    console.error('❌ Server action: Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
