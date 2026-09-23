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

async function manualCleanup() {
  console.log('🧹 Starting manual cleanup...')
  
  try {
    // First, let's see what we have
    const { data: allMatches, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (matchesError) {
      console.error('❌ Error fetching matches:', matchesError)
      return
    }
    
    console.log('📊 Current matches:')
    allMatches?.forEach(match => {
      console.log(`- ${match.id}: ${match.status} (created: ${match.created_at})`)
    })
    
    // Clean up waiting matches older than 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
    
    const { data: oldMatches, error: oldMatchesError } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'waiting')
      .is('player2_id', null)
      .lt('created_at', twoMinutesAgo)
    
    if (oldMatchesError) {
      console.error('❌ Error fetching old matches:', oldMatchesError)
      return
    }
    
    console.log(`🔍 Found ${oldMatches?.length || 0} old waiting matches to clean up`)
    
    if (oldMatches && oldMatches.length > 0) {
      for (const match of oldMatches) {
        console.log(`🧹 Cleaning up match ${match.id}...`)
        
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
        
        console.log(`✅ Cleaned up match ${match.id}`)
      }
    }
    
    // Also clean up expired matchmaking queues
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
    
    console.log('🎉 Manual cleanup completed!')
    
  } catch (error) {
    console.error('❌ Manual cleanup failed:', error)
  }
}

manualCleanup()
