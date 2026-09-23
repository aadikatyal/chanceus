"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cleanupExpiredMatches, getMatchStats } from '@/lib/cleanup-actions'
import { debugMatches, forceCancelAllUserMatches, forceCancelAllActiveMatches } from '@/lib/debug-actions'
import { Trash2, RefreshCw, AlertTriangle, User, X } from 'lucide-react'

export default function DebugMatchesPage() {
  const [matches, setMatches] = useState<any[]>([])
  const [queues, setQueues] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [userMatches, setUserMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cleaning, setCleaning] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  // Using the exported supabase client

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Get ALL matches regardless of status
      const { data: allMatches, error: allError } = await supabase
        .from("matches")
        .select(`
          id,
          bet_amount,
          status,
          created_at,
          player1_id,
          player2_id,
          games (name),
          users!matches_player1_id_fkey (username, display_name)
        `)
        .order("created_at", { ascending: false })
        .limit(50)

      if (allError) throw allError

      // Get ALL matchmaking queue entries
      const { data: allQueues, error: queueError } = await supabase
        .from("matchmaking_queue")
        .select(`
          id,
          bet_amount,
          match_type,
          status,
          created_at,
          expires_at,
          games (name),
          users!matchmaking_queue_user_id_fkey (username, display_name)
        `)
        .order("created_at", { ascending: false })
        .limit(50)

      if (queueError) throw queueError

      // Get stats
      const statsResult = await getMatchStats()
      if (statsResult.success) {
        setStats(statsResult.stats)
      }

      // Get user-specific debug data
      const debugResult = await debugMatches()
      if (debugResult.success) {
        setUserMatches(debugResult.data.userMatches)
      }

      setMatches(allMatches || [])
      setQueues(allQueues || [])
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleCleanup = async () => {
    try {
      setCleaning(true)
      const result = await cleanupExpiredMatches()
      
      if (result.success) {
        alert(`Cleanup completed! Cleaned ${result.cleanedQueues} queues and ${result.cleanedMatches} matches.`)
        await fetchData() // Refresh data
      } else {
        alert(`Cleanup failed: ${result.error}`)
      }
    } catch (err) {
      console.error('Cleanup error:', err)
      alert('Cleanup failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setCleaning(false)
    }
  }

  const handleForceCancelAll = async () => {
    try {
      setCancelling(true)
      const result = await forceCancelAllUserMatches()
      
      if (result.success) {
        alert(result.message)
        await fetchData() // Refresh data
      } else {
        alert(`Force cancel failed: ${result.error}`)
      }
    } catch (err) {
      console.error('Force cancel error:', err)
      alert('Force cancel failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setCancelling(false)
    }
  }

  const handleForceCancelAllActive = async () => {
    try {
      setCancelling(true)
      const result = await forceCancelAllActiveMatches()
      
      if (result.success) {
        alert(result.message)
        await fetchData() // Refresh data
      } else {
        alert(`Force cancel all active failed: ${result.error}`)
      }
    } catch (err) {
      console.error('Force cancel all active error:', err)
      alert('Force cancel all active failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setCancelling(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-500/20 text-yellow-400'
      case 'in_progress': return 'bg-blue-500/20 text-blue-400'
      case 'completed': return 'bg-green-500/20 text-green-400'
      case 'cancelled': return 'bg-red-500/20 text-red-400'
      case 'expired': return 'bg-gray-500/20 text-gray-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--chance-bg)] text-[var(--chance-fg)] chance-competitive-theme flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-white">Loading match data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--chance-bg)] text-[var(--chance-fg)] chance-competitive-theme p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="chance-hero-title text-2xl sm:text-3xl mb-4">Match Debug Dashboard</h1>
          <p className="text-gray-400">Monitor and clean up matches and matchmaking queues</p>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-white">{stats.waitingMatches}</div>
                <div className="text-gray-400 text-sm">Waiting Matches</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-400">{stats.activeQueues}</div>
                <div className="text-gray-400 text-sm">Active Queues</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-400">{stats.expiredQueues}</div>
                <div className="text-gray-400 text-sm">Expired Queues</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-400">{stats.totalIssues}</div>
                <div className="text-gray-400 text-sm">Total Issues</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 mb-8">
          <Button 
            onClick={handleCleanup}
            disabled={cleaning}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            {cleaning ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Cleaning...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Clean Up Expired
              </>
            )}
          </Button>
          <Button 
            onClick={handleForceCancelAll}
            disabled={cancelling}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {cancelling ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Cancelling...
              </>
            ) : (
              <>
                <X className="mr-2 h-4 w-4" />
                Force Cancel All My Matches
              </>
            )}
          </Button>
          <Button 
            onClick={handleForceCancelAllActive}
            disabled={cancelling}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {cancelling ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Cancelling All Active...
              </>
            ) : (
              <>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Force Cancel ALL Active Matches
              </>
            )}
          </Button>
          <Button 
            onClick={fetchData}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Data
          </Button>
        </div>

        {/* User's Matches */}
        {userMatches.length > 0 && (
          <Card className="bg-gray-900/50 border-gray-800 mb-8">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <User className="mr-2 h-5 w-5 text-green-400" />
                Your Matches ({userMatches.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left p-2 text-gray-400">ID</th>
                      <th className="text-left p-2 text-gray-400">Status</th>
                      <th className="text-left p-2 text-gray-400">Bet</th>
                      <th className="text-left p-2 text-gray-400">Players</th>
                      <th className="text-left p-2 text-gray-400">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userMatches.map((match) => (
                      <tr key={match.id} className="border-b border-gray-800">
                        <td className="p-2 text-gray-300 font-mono text-xs">{match.id.slice(0, 8)}...</td>
                        <td className="p-2">
                          <Badge className={getStatusColor(match.status)}>
                            {match.status}
                          </Badge>
                        </td>
                        <td className="p-2 text-gray-300">{match.bet_amount} tokens</td>
                        <td className="p-2 text-gray-300">
                          {match.player1_id ? 'P1' : 'No P1'} {match.player2_id ? 'P2' : 'No P2'}
                        </td>
                        <td className="p-2 text-gray-400 text-xs">
                          {new Date(match.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Matches Table */}
        <Card className="bg-gray-900/50 border-gray-800 mb-8">
          <CardHeader>
            <CardTitle className="text-white">All Matches ({matches.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-2 text-gray-400">ID</th>
                    <th className="text-left p-2 text-gray-400">Game</th>
                    <th className="text-left p-2 text-gray-400">Status</th>
                    <th className="text-left p-2 text-gray-400">Bet</th>
                    <th className="text-left p-2 text-gray-400">Players</th>
                    <th className="text-left p-2 text-gray-400">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((match) => (
                    <tr key={match.id} className="border-b border-gray-800">
                      <td className="p-2 text-gray-300 font-mono text-xs">{match.id.slice(0, 8)}...</td>
                      <td className="p-2 text-white">{match.games?.name}</td>
                      <td className="p-2">
                        <Badge className={getStatusColor(match.status)}>
                          {match.status}
                        </Badge>
                      </td>
                      <td className="p-2 text-gray-300">{match.bet_amount} tokens</td>
                      <td className="p-2 text-gray-300">
                        {match.player1_id ? 'P1' : 'No P1'} {match.player2_id ? 'P2' : 'No P2'}
                      </td>
                      <td className="p-2 text-gray-400 text-xs">
                        {new Date(match.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Queues Table */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Matchmaking Queues ({queues.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-2 text-gray-400">ID</th>
                    <th className="text-left p-2 text-gray-400">Game</th>
                    <th className="text-left p-2 text-gray-400">Status</th>
                    <th className="text-left p-2 text-gray-400">Type</th>
                    <th className="text-left p-2 text-gray-400">Bet</th>
                    <th className="text-left p-2 text-gray-400">Expires</th>
                    <th className="text-left p-2 text-gray-400">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {queues.map((queue) => (
                    <tr key={queue.id} className="border-b border-gray-800">
                      <td className="p-2 text-gray-300 font-mono text-xs">{queue.id.slice(0, 8)}...</td>
                      <td className="p-2 text-white">{queue.games?.name}</td>
                      <td className="p-2">
                        <Badge className={getStatusColor(queue.status)}>
                          {queue.status}
                        </Badge>
                      </td>
                      <td className="p-2 text-gray-300">{queue.match_type}</td>
                      <td className="p-2 text-gray-300">{queue.bet_amount} tokens</td>
                      <td className="p-2">
                        <div className={`text-xs ${isExpired(queue.expires_at) ? 'text-red-400' : 'text-green-400'}`}>
                          {new Date(queue.expires_at).toLocaleString()}
                          {isExpired(queue.expires_at) && (
                            <AlertTriangle className="inline ml-1 h-3 w-3" />
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-gray-400 text-xs">
                        {new Date(queue.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
            <p className="text-red-400">Error: {error}</p>
          </div>
        )}
      </div>
    </div>
  )
}