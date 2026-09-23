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

async function forceCleanupAllMatches() {
  console.log('🧹 FORCE CLEANUP: Cleaning up ALL matches regardless of status...')
  
  try {
    // Get ALL matches (waiting, in_progress, etc.)
    const { data: allMatches, error: allMatchesError } = await supabase
      .from('matches')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (allMatchesError) {
      console.error('❌ Error fetching all matches:', allMatchesError)
      return
    }
    
    console.log(`📊 Found ${allMatches?.length || 0} total matches in database`)
    
    // Show all matches with their status and age
    allMatches?.forEach(match => {
      const createdDate = new Date(match.created_at)
      const daysAgo = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
      const hoursAgo = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60))
      console.log(`- ${match.id}: ${match.status} (${daysAgo}d ${hoursAgo % 24}h ago) - Players: ${match.player1_id}, ${match.player2_id}`)
    })
    
    // Clean up matches older than 1 hour (regardless of status)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    
    const oldMatches = allMatches?.filter(match => 
      new Date(match.created_at) < new Date(oneHourAgo) &&
      ['waiting', 'in_progress'].includes(match.status)
    ) || []
    
    console.log(`🔍 Found ${oldMatches.length} old matches to clean up (older than 1 hour)`)
    
    if (oldMatches.length > 0) {
      for (const match of oldMatches) {
        console.log(`🧹 FORCE CLEANING match ${match.id} (${match.status})...`)
        
        // Refund tokens to both players if they exist
        const players = [match.player1_id, match.player2_id].filter(Boolean)
        
        for (const playerId of players) {
          const { data: userData } = await supabase
            .from('users')
            .select('tokens')
            .eq('id', playerId)
            .single()
          
          if (userData) {
            await supabase
              .from('users')
              .update({ tokens: userData.tokens + match.bet_amount })
              .eq('id', playerId)
            
            // Create refund transaction
            await supabase.from('transactions').insert({
              user_id: playerId,
              match_id: match.id,
              amount: match.bet_amount,
              type: 'bonus',
              description: `Force cleanup - refund of ${match.bet_amount} tokens`
            })
            
            console.log(`💰 Refunded ${match.bet_amount} tokens to player ${playerId}`)
          }
        }
        
        // Force complete/cancel the match
        await supabase
          .from('matches')
          .update({ 
            status: 'cancelled',
            completed_at: new Date().toISOString()
          })
          .eq('id', match.id)
        
        console.log(`✅ FORCE CLEANED match ${match.id}`)
      }
    }
    
    // Also clean up ALL expired matchmaking queues
    const { data: allQueues, error: queueError } = await supabase
      .from('matchmaking_queue')
      .select('*')
      .eq('status', 'waiting')
    
    if (queueError) {
      console.error('❌ Error fetching queues:', queueError)
    } else if (allQueues && allQueues.length > 0) {
      console.log(`🧹 Cleaning up ${allQueues.length} ALL matchmaking queues...`)
      
      for (const queue of allQueues) {
        await supabase
          .from('matchmaking_queue')
          .update({ status: 'expired' })
          .eq('id', queue.id)
      }
      
      console.log(`✅ Cleaned up ${allQueues.length} matchmaking queues`)
    }
    
    console.log('🎉 FORCE CLEANUP completed!')
    
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
    console.error('❌ Force cleanup failed:', error)
  }
}

forceCleanupAllMatches()
