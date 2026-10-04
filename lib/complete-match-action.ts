"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { createReplay } from "./replay-actions"
import { releaseHeadsUpEscrow } from "@/lib/economy/escrow"

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

    let escrowResult: Awaited<ReturnType<typeof releaseHeadsUpEscrow>> = { skipped: true }
    try {
      escrowResult = await releaseHeadsUpEscrow(matchId, winnerId)
    } catch (escrowError) {
      console.error("❌ Escrow release failed:", escrowError)
    }
    if ("error" in escrowResult && escrowResult.error) {
      console.error("❌ Escrow release failed:", escrowResult.error)
    }
    const useLegacyPayout = "skipped" in escrowResult && escrowResult.skipped === true

    // Legacy payout for matches that never entered winner-take-all escrow.
    if (useLegacyPayout && winnerId && data && data.length > 0) {
      const match = data[0]
      const betAmount = match.bet_amount || 0
      
      if (betAmount > 0) {
        try {
          // Check if tokens were already paid out (prevent duplicate payments)
          const { data: existingTransaction } = await supabase
            .from('transactions')
            .select('id')
            .eq('match_id', matchId)
            .eq('user_id', winnerId)
            .eq('type', 'win')
            .single()
          
          if (existingTransaction) {
            console.log('⚠️ Tokens already paid out for this match, skipping duplicate payment')
            return { success: true, data, alreadyPaid: true }
          }
          
          // Winner gets both players' bets (their refund + opponent's bet as profit)
          const winnings = betAmount * 2 // Both players' bets
          console.log('💰 Processing winner payout:', { winnerId, betAmount, winnings, netProfit: betAmount })
          
          // IMPORTANT: Only create transaction record - the database trigger will automatically update the user's token balance
          // This prevents double-payout (direct update + trigger update)
          const { error: transactionError } = await supabase.from('transactions').insert({
            user_id: winnerId,
            match_id: matchId,
            amount: winnings,
            type: 'win',
            description: `Won match - ${winnings} tokens`
          })
          
          if (transactionError) {
            console.error('❌ Failed to create winner transaction:', transactionError)
          } else {
            console.log('✅ Winner transaction created successfully - trigger will update balance:', { 
              winnerId, 
              winnings
            })
          }
        } catch (payoutError) {
          console.error('❌ Failed to process winner payout:', payoutError)
          // Don't fail the entire completion process
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
