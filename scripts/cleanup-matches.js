// Simple script to clean up matches
throw new Error("Legacy token cleanup is disabled. Refunds go through the wallet ledger.")
// Run with: node scripts/cleanup-matches.js

const { createClient } = require('@supabase/supabase-js')

// You'll need to set these environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function cleanupMatches() {
  try {
    console.log('🧹 Starting match cleanup...')

    // Get all waiting matches
    const { data: waitingMatches, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'waiting')
      .is('player2_id', null)

    if (matchesError) {
      throw matchesError
    }

    console.log(`📊 Found ${waitingMatches?.length || 0} waiting matches`)

    // Get all waiting matchmaking queues
    const { data: waitingQueues, error: queuesError } = await supabase
      .from('matchmaking_queue')
      .select('*')
      .eq('status', 'waiting')

    if (queuesError) {
      throw queuesError
    }

    console.log(`📊 Found ${waitingQueues?.length || 0} waiting queues`)

    // Clean up expired queues
    const now = new Date().toISOString()
    const expiredQueues = waitingQueues?.filter(queue => new Date(queue.expires_at) < new Date()) || []
    
    if (expiredQueues.length > 0) {
      console.log(`🧹 Cleaning up ${expiredQueues.length} expired queues...`)
      
      const { error: updateError } = await supabase
        .from('matchmaking_queue')
        .update({ status: 'expired' })
        .in('id', expiredQueues.map(q => q.id))

      if (updateError) {
        console.error('❌ Error updating expired queues:', updateError)
      } else {
        console.log('✅ Expired queues cleaned up')
      }
    }

    // Clean up old waiting matches (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const oldMatches = waitingMatches?.filter(match => new Date(match.created_at) < new Date(oneHourAgo)) || []
    
    if (oldMatches.length > 0) {
      console.log(`🧹 Cleaning up ${oldMatches.length} old waiting matches...`)
      
      // Refund tokens and cancel matches
      for (const match of oldMatches) {
        // Refund tokens
        const { data: userData } = await supabase
          .from('users')
          .select('tokens')
          .eq('id', match.player1_id)
          .single()

        if (userData) {
          await supabase
            .from('users')
            .update({ tokens: userData.tokens + match.bet_amount })
            .eq('id', match.player1_id)

          // Create refund transaction
          await supabase.from('transactions').insert({
            user_id: match.player1_id,
            match_id: match.id,
            amount: match.bet_amount,
            type: 'bonus',
            description: `Match expired - refund of ${match.bet_amount} tokens`
          })
        }

        // Cancel the match
        await supabase
          .from('matches')
          .update({ status: 'cancelled' })
          .eq('id', match.id)
      }
      
      console.log('✅ Old matches cleaned up and tokens refunded')
    }

    console.log('🎉 Cleanup completed!')
    
    // Show final stats
    const { data: finalMatches } = await supabase
      .from('matches')
      .select('status')
      .eq('status', 'waiting')
      .is('player2_id', null)

    const { data: finalQueues } = await supabase
      .from('matchmaking_queue')
      .select('status')
      .eq('status', 'waiting')

    console.log(`📊 Final stats: ${finalMatches?.length || 0} waiting matches, ${finalQueues?.length || 0} active queues`)

  } catch (error) {
    console.error('❌ Cleanup failed:', error)
    process.exit(1)
  }
}

cleanupMatches()
