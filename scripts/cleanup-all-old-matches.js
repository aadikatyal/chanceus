throw new Error("Legacy token cleanup is disabled. Refunds go through the wallet ledger.")
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function cleanupAllOldMatches() {
  console.log('🧹 Starting comprehensive cleanup of ALL old matches...')
  
  try {
    // First, let's see what we have
    const { data: allMatches, error: allMatchesError } = await supabase
      .from('matches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (allMatchesError) {
      console.error('❌ Error fetching all matches:', allMatchesError)
      return
    }
    
    console.log('📊 Current matches in database:')
    allMatches?.forEach(match => {
      const createdDate = new Date(match.created_at)
      const daysAgo = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
      console.log(`- ${match.id}: ${match.status} (${daysAgo} days ago) - Players: ${match.player1_id}, ${match.player2_id}`)
    })
    
    // Clean up matches older than 1 day (24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data: oldMatches, error: oldMatchesError } = await supabase
      .from('matches')
      .select('*')
      .lt('created_at', oneDayAgo)
      .in('status', ['waiting', 'in_progress'])
    
    if (oldMatchesError) {
      console.error('❌ Error fetching old matches:', oldMatchesError)
      return
    }
    
    console.log(`🔍 Found ${oldMatches?.length || 0} old matches to clean up (older than 1 day)`)
    
    if (oldMatches && oldMatches.length > 0) {
      for (const match of oldMatches) {
        console.log(`🧹 Cleaning up match ${match.id} (${match.status})...`)
        
        // For matches with both players, refund both players
        if (match.player1_id && match.player2_id) {
          // Refund player 1
          const { data: user1Data } = await supabase
            .from('users')
            .select('tokens')
            .eq('id', match.player1_id)
            .single()
          
          if (user1Data) {
            await supabase
              .from('users')
              .update({ tokens: user1Data.tokens + match.bet_amount })
              .eq('id', match.player1_id)
            
            // Create refund transaction for player 1
            await supabase.from('transactions').insert({
              user_id: match.player1_id,
              match_id: match.id,
              amount: match.bet_amount,
              type: 'bonus',
              description: `Old match cleanup - refund of ${match.bet_amount} tokens`
            })
          }
          
          // Refund player 2
          const { data: user2Data } = await supabase
            .from('users')
            .select('tokens')
            .eq('id', match.player2_id)
            .single()
          
          if (user2Data) {
            await supabase
              .from('users')
              .update({ tokens: user2Data.tokens + match.bet_amount })
              .eq('id', match.player2_id)
            
            // Create refund transaction for player 2
            await supabase.from('transactions').insert({
              user_id: match.player2_id,
              match_id: match.id,
              amount: match.bet_amount,
              type: 'bonus',
              description: `Old match cleanup - refund of ${match.bet_amount} tokens`
            })
          }
        } else if (match.player1_id) {
          // Only player 1, refund just them
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
              description: `Old match cleanup - refund of ${match.bet_amount} tokens`
            })
          }
        }
        
        // Cancel/complete the match
        await supabase
          .from('matches')
          .update({ 
            status: 'cancelled',
            completed_at: new Date().toISOString()
          })
          .eq('id', match.id)
        
        console.log(`✅ Cleaned up match ${match.id}`)
      }
    }
    
    // Also clean up any expired matchmaking queues
    const { data: expiredQueues, error: queueError } = await supabase
      .from('matchmaking_queue')
      .select('*')
      .eq('status', 'waiting')
      .lt('expires_at', new Date().toISOString())
    
    if (queueError) {
      console.error('❌ Error fetching expired queues:', queueError)
    } else if (expiredQueues && expiredQueues.length > 0) {
      console.log(`🧹 Cleaning up ${expiredQueues.length} expired queues...`)
      
      for (const queue of expiredQueues) {
        await supabase
          .from('matchmaking_queue')
          .update({ status: 'expired' })
          .eq('id', queue.id)
      }
      
      console.log(`✅ Cleaned up ${expiredQueues.length} expired queues`)
    }
    
    console.log('🎉 Comprehensive cleanup completed!')
    
    // Show final stats
    const { data: finalMatches } = await supabase
      .from('matches')
      .select('status')
      .in('status', ['waiting', 'in_progress'])
    
    const { data: finalQueues } = await supabase
      .from('matchmaking_queue')
      .select('status')
      .eq('status', 'waiting')
    
    console.log(`📊 Final stats: ${finalMatches?.length || 0} active matches, ${finalQueues?.length || 0} active queues`)
    
  } catch (error) {
    console.error('❌ Comprehensive cleanup failed:', error)
  }
}

cleanupAllOldMatches()
