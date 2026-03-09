"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Header from "@/components/navigation/header"
import EnhancedMatchInterface from "@/components/games/enhanced-match-interface"
import StartGameButton from "@/components/games/start-game-button"
import ChatWindow from "@/components/chat/chat-window"
import SpectatorMode from "@/components/games/spectator-mode"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Trophy, Users, Clock, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"
import { acceptFriendMatchRequest, markPlayerReady } from "@/lib/game-actions"
import { useToast } from "@/hooks/use-toast"

interface MatchPageProps {
  params: {
    matchId: string
  }
}

export default function MatchPage({ params }: MatchPageProps) {
  const [match, setMatch] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [matchId, setMatchId] = useState<string | null>(null)
  const [rematchStatus, setRematchStatus] = useState<'none' | 'requested' | 'received' | 'accepted' | 'rejected'>('none')
  const [isLoadingRematch, setIsLoadingRematch] = useState(false)
  const [isTournamentMatch, setIsTournamentMatch] = useState(false)
  const [acceptingMatch, setAcceptingMatch] = useState(false)
  const [markingReady, setMarkingReady] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  console.log('🎮 MatchPage component loaded!', { params })

  // Await params first
  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params
      setMatchId(resolvedParams.matchId)
    }
    getParams()
  }, [params])

  useEffect(() => {
    if (!matchId) return

    // Load user data once (don't reload on every poll to avoid rate limits)
    const loadUserData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
          router.push("/auth/login")
          return
        }

        const { data: userData } = await supabase.from("users").select("*").eq("id", authUser.id).single()
        if (!userData) {
          router.push("/auth/login")
          return
        }
        setUser(userData)
      } catch (error) {
        console.error("Error loading user:", error)
      }
    }

    // Load match data (can be polled)
    const loadMatchData = async () => {
      try {
        // Get match data
        const { data: matchData, error: matchError } = await supabase
          .from("matches")
          .select(`
            *,
            games (name, description, min_bet, max_bet),
            player1:users!matches_player1_id_fkey (id, username, display_name, avatar_url),
            player2:users!matches_player2_id_fkey (id, username, display_name, avatar_url)
          `)
          .eq("id", matchId)
          .single()

        if (matchError) {
          console.error("Error loading match:", matchError)
          // Check if it's a "not found" error vs other errors
          if (matchError.code === 'PGRST116' || matchError.message?.includes('No rows')) {
            console.error("Match not found:", matchId)
            router.push("/games")
            return
          }
          // For other errors, log but don't redirect - might be a temporary issue
          console.error("Unexpected error loading match, but continuing:", matchError)
        }

        if (!matchData) {
          console.error("Match data is null:", matchId)
          router.push("/games")
          return
        }

        // Check if this match is part of a tournament
        const { data: tournamentMatch } = await supabase
          .from("tournament_matches")
          .select("tournament_id")
          .eq("match_id", matchId)
          .single()

        if (tournamentMatch) {
          // Store tournament ID for redirect after completion
          ;(matchData as any).tournament_id = tournamentMatch.tournament_id
        }

        setMatch(matchData)
      } catch (error) {
        console.error("Error loading match:", error)
      } finally {
        setLoading(false)
      }
    }

    // Load both initially
    loadUserData()
    loadMatchData()

    // Poll for match updates every 15 seconds (realtime subscription handles immediate updates)
    // Only poll match data, not user data, to avoid rate limiting
    const pollInterval = setInterval(loadMatchData, 15000)
    
    // Set up real-time subscription for immediate updates
    const channel = supabase
      .channel(`match-${matchId}`)
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'matches', 
          filter: `id=eq.${matchId}` 
        }, 
        async (payload) => {
          console.log('🔄 Match updated via real-time:', payload.new)
          // Reload full match data with relations
          const { data: updatedMatchData } = await supabase
            .from("matches")
            .select(`
              *,
              games (*),
              player1:users!matches_player1_id_fkey (*),
              player2:users!matches_player2_id_fkey (*)
            `)
            .eq("id", matchId)
            .single()
          
          if (updatedMatchData) {
            setMatch(updatedMatchData)
            
            // If match started and both players are ready, show notification
            if (updatedMatchData.status === 'in_progress' && 
                updatedMatchData.game_data?.player1_ready && 
                updatedMatchData.game_data?.player2_ready) {
              toast({
                title: "Match starting!",
                description: "Both players are ready",
              })
            }
          }

          // If match completed and it's a tournament match, redirect to tournament
          const updatedMatch = payload.new as any
          if (updatedMatch.status === 'completed' && updatedMatch.tournament_id) {
            console.log('🏆 Tournament match completed, redirecting to tournament page...')
            setTimeout(() => {
              router.push(`/tournaments/${updatedMatch.tournament_id}`)
            }, 2000) // 2 second delay to show results
          }
        }
      )
      .subscribe()
    
    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(channel)
    }
  }, [matchId, router, supabase])

  // Load rematch status and tournament check
  useEffect(() => {
    if (!match || !user) return

    const loadRematchData = async () => {
      try {
        // Check if this is a tournament match
        const { data: tournamentMatch } = await supabase
          .from('tournament_matches')
          .select('tournament_id')
          .eq('match_id', match.id)
          .single()
        
        if (tournamentMatch) {
          setIsTournamentMatch(true)
          return
        }

        // Check for rematch acceptance - if opponent accepted, redirect to new match
        const { data: rematchHistory } = await supabase
          .from('match_history')
          .select('action_data')
          .eq('match_id', match.id)
          .eq('action_type', 'rematch_accepted')
          .order('timestamp', { ascending: false })
          .limit(1)
          .single()
        
        if (rematchHistory?.action_data?.new_match_id) {
          const newMatchId = rematchHistory.action_data.new_match_id
          console.log('🎮 Rematch accepted! Redirecting to new match:', newMatchId)
          setRematchStatus('accepted')
          router.replace(`/games/match/${newMatchId}`)
          return
        }

        // Check for rematch requests if match is completed
        if (match.status === 'completed') {
          const gameData = match.game_data || {}
          if (gameData.rematch_requested_by) {
            const requestedBy = gameData.rematch_requested_by
            if (requestedBy !== user.id) {
              setRematchStatus('received')
            } else {
              setRematchStatus('requested')
            }
          }
        }
      } catch (error) {
        console.error('Error loading rematch data:', error)
      }
    }

    loadRematchData()
    const interval = setInterval(loadRematchData, 2000)
    return () => clearInterval(interval)
  }, [match, user, supabase, router])

  // Rematch functions
  const requestRematch = async () => {
    if (!user || !match || !match.player1_id || !match.player2_id || !match.game_id) return
    
    setIsLoadingRematch(true)
    try {
      // Check if there's already a rematch request
      const { data: matchData } = await supabase
        .from('matches')
        .select('game_data')
        .eq('id', match.id)
        .single()
      
      if (matchData?.game_data?.rematch_requested_by) {
        alert('A rematch request has already been sent for this match.')
        setIsLoadingRematch(false)
        return
      }
      
      // Store rematch request in matches table
      const currentGameData = matchData?.game_data || {}
      const { error: matchError } = await supabase
        .from('matches')
        .update({
          game_data: {
            ...currentGameData,
            rematch_requested_by: user.id,
            rematch_requested_at: new Date().toISOString()
          }
        })
        .eq('id', match.id)
      
      if (matchError) {
        console.error('Error storing rematch request:', matchError)
        alert('Failed to request rematch. Please try again.')
        setIsLoadingRematch(false)
        return
      }
      
      // Also store in match_history as backup
      await supabase
        .from('match_history')
        .insert({
          match_id: match.id,
          user_id: user.id,
          action_type: 'rematch_requested',
          action_data: {
            requested_by: user.id,
            requested_at: new Date().toISOString(),
            original_match_id: match.id
          }
        })
      
      setRematchStatus('requested')
    } catch (error) {
      console.error('Error requesting rematch:', error)
    } finally {
      setIsLoadingRematch(false)
    }
  }

  const acceptRematch = async () => {
    if (!user || !match || !match.player1_id || !match.player2_id || !match.game_id) {
      alert('Missing player information. Cannot create rematch.')
      return
    }
    
    setIsLoadingRematch(true)
    try {
      // Create new match with same players and bet amount
      const { data: newMatch, error: matchError } = await supabase
        .from('matches')
        .insert({
          game_id: match.game_id,
          player1_id: match.player1_id,
          player2_id: match.player2_id,
          bet_amount: match.bet_amount,
          status: 'in_progress',
          started_at: new Date().toISOString(),
          game_data: {}
        })
        .select()
        .single()
      
      if (matchError || !newMatch) {
        console.error('Error creating rematch:', matchError)
        alert(`Failed to create rematch: ${matchError?.message || 'Unknown error'}`)
        setIsLoadingRematch(false)
        return
      }
      
      // Save rematch acceptance to match_history
      await supabase
        .from('match_history')
        .insert({
          match_id: match.id,
          user_id: user.id,
          action_type: 'rematch_accepted',
          action_data: {
            accepted_by: user.id,
            new_match_id: newMatch.id,
            accepted_at: new Date().toISOString()
          }
        })
      
      setRematchStatus('accepted')
      router.replace(`/games/match/${newMatch.id}`)
    } catch (error) {
      console.error('Error accepting rematch:', error)
    } finally {
      setIsLoadingRematch(false)
    }
  }

  const rejectRematch = async () => {
    if (!user) return
    
    setIsLoadingRematch(true)
    try {
      await supabase
        .from('match_history')
        .insert({
          match_id: match.id,
          user_id: user.id,
          action_type: 'rematch_rejected',
          action_data: {
            rejected_by: user.id,
            rejected_at: new Date().toISOString()
          }
        })
      
      setRematchStatus('rejected')
    } catch (error) {
      console.error('Error rejecting rematch:', error)
    } finally {
      setIsLoadingRematch(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!match || !user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white text-xl">Match not found</div>
      </div>
    )
  }

  // Check if user is part of this match
  const isPlayer1 = match.player1_id === user.id
  const isPlayer2 = match.player2_id === user.id
  const isInMatch = isPlayer1 || isPlayer2

  // Debug logging
  console.log('🔍 DEBUG Match Page:', {
    matchStatus: match.status,
    isPlayer1,
    isPlayer2,
    isInMatch,
    player1Id: match.player1_id,
    player2Id: match.player2_id,
    userId: user.id,
    shouldShowStartButton: match.status === "waiting" && isPlayer1
  })

  return (
    <div className="min-h-screen bg-gray-950 relative">
      <Header user={user} />
      
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/20 via-purple-950/10 to-transparent pointer-events-none"></div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Navigation */}
        <div className="mb-4">
          {(match as any)?.tournament_id ? (
            <Link 
              href={`/tournaments/${(match as any).tournament_id}`}
              className="inline-flex items-center text-gray-300 hover:text-white bg-transparent border border-gray-700 rounded px-4 py-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Tournament
            </Link>
          ) : (
            <Link href="/games" className="inline-flex items-center text-gray-300 hover:text-white bg-transparent border border-gray-700 rounded px-4 py-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Games
            </Link>
          )}
        </div>

        {/* Friend Match Request - Show accept button for player2 */}
        {match.status === "waiting" && 
         match.game_data?.friend_match_request && 
         !match.game_data?.friend_match_accepted && 
         isPlayer2 && (
          <div className="text-center mt-6 mb-6">
            <Card className="bg-orange-900/20 border-orange-500/30">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="text-xl text-white font-semibold">
                    Match Request from {match.player1?.display_name || match.player1?.username || 'Friend'}
                  </div>
                  <div className="text-gray-400">
                    <p>Game: {match.games?.name || 'Unknown'}</p>
                    <p>Bet Amount: {match.bet_amount} tokens</p>
                  </div>
                  <div className="flex gap-4 justify-center">
                    <Button
                      onClick={async () => {
                        setAcceptingMatch(true)
                        try {
                          const result = await acceptFriendMatchRequest(match.id)
                          if (result.error) {
                            toast({
                              title: "Failed to accept",
                              description: result.error,
                              variant: "destructive",
                            })
                          } else {
                            toast({
                              title: "Match request accepted!",
                              description: "Both players need to click 'I'm Ready' to start",
                            })
                            // Refresh match data
                            const { data: updatedMatch } = await supabase
                              .from("matches")
                              .select(`
                                *,
                                games (*),
                                player1:users!matches_player1_id_fkey (*),
                                player2:users!matches_player2_id_fkey (*)
                              `)
                              .eq("id", match.id)
                              .single()
                            if (updatedMatch) {
                              setMatch(updatedMatch)
                            }
                          }
                        } catch (error) {
                          console.error('Error accepting match:', error)
                          toast({
                            title: "Error",
                            description: "Failed to accept match request",
                            variant: "destructive",
                          })
                        } finally {
                          setAcceptingMatch(false)
                        }
                      }}
                      disabled={acceptingMatch}
                      className="bg-green-500 hover:bg-green-600 text-white"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {acceptingMatch ? "Accepting..." : "Accept Match"}
                    </Button>
                    <Button
                      onClick={async () => {
                        // Cancel the match request
                        await supabase
                          .from("matches")
                          .update({ status: "cancelled" })
                          .eq("id", match.id)
                        toast({
                          title: "Match request declined",
                        })
                        router.push("/dashboard")
                      }}
                      variant="outline"
                      className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Decline
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Waiting for friend to accept - Show for player1 */}
        {match.status === "waiting" && 
         match.game_data?.friend_match_request && 
         !match.game_data?.friend_match_accepted && 
         isPlayer1 && (
          <div className="text-center mt-6 mb-6">
            <Card className="bg-blue-900/20 border-blue-500/30">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="text-xl text-white font-semibold">
                    Waiting for {match.player2?.display_name || match.player2?.username || 'Friend'} to accept...
                  </div>
                  <div className="text-gray-400">
                    Your friend will receive a notification to accept this match request.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Ready Button - Show after match is accepted */}
        {match.status === "waiting" && 
         match.game_data?.friend_match_accepted && 
         isInMatch && (
          <div className="text-center mt-6 mb-6">
            <button 
              onClick={async () => {
                setMarkingReady(true)
                try {
                  const result = await markPlayerReady(match.id)
                  if (result.error) {
                    toast({
                      title: "Error",
                      description: result.error,
                      variant: "destructive",
                    })
                  } else {
                    if (result.bothReady) {
                      toast({
                        title: "Both players ready!",
                        description: "Match is starting...",
                      })
                    } else {
                      toast({
                        title: "You're ready!",
                        description: "Waiting for opponent...",
                      })
                    }
                    // Refresh match data
                    const { data: updatedMatch } = await supabase
                      .from("matches")
                      .select(`
                        *,
                        games (*),
                        player1:users!matches_player1_id_fkey (*),
                        player2:users!matches_player2_id_fkey (*)
                      `)
                      .eq("id", match.id)
                      .single()
                    if (updatedMatch) {
                      setMatch(updatedMatch)
                    }
                  }
                } catch (error) {
                  console.error('Error marking ready:', error)
                  toast({
                    title: "Error",
                    description: "Failed to mark as ready",
                    variant: "destructive",
                  })
                } finally {
                  setMarkingReady(false)
                }
              }}
              disabled={markingReady || (isPlayer1 && match.game_data?.player1_ready) || (isPlayer2 && match.game_data?.player2_ready)}
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {markingReady 
                ? 'Processing...' 
                : (isPlayer1 && match.game_data?.player1_ready) || (isPlayer2 && match.game_data?.player2_ready)
                  ? 'You\'re Ready!'
                  : match.game_data?.player1_ready && match.game_data?.player2_ready
                    ? 'Both Players Ready!'
                    : 'I\'m Ready!'}
            </button>
            
            {/* Show readiness status */}
            <div className="mt-2 text-sm text-gray-400">
              {match.game_data?.player1_ready && match.game_data?.player2_ready ? (
                <span className="text-green-400">Both players ready! Match starting...</span>
              ) : (
                <span>
                  {match.game_data?.player1_ready && isPlayer1 ? 'You\'re ready! ' : ''}
                  {match.game_data?.player2_ready && isPlayer2 ? 'You\'re ready! ' : ''}
                  {match.game_data?.player1_ready && match.game_data?.player2_ready 
                    ? 'Waiting for match to start...' 
                    : 'Waiting for both players to be ready...'}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Start Match Button - Show for regular matches (not friend matches) */}
        {match.status === "waiting" && 
         !match.game_data?.friend_match_request && 
         isInMatch && (
          <div className="text-center mt-6 mb-6">
            <button 
              onClick={async () => {
                setMarkingReady(true)
                try {
                  const result = await markPlayerReady(match.id)
                  if (result.error) {
                    toast({
                      title: "Error",
                      description: result.error,
                      variant: "destructive",
                    })
                  } else {
                    // Refresh match data
                    const { data: updatedMatch } = await supabase
                      .from("matches")
                      .select(`
                        *,
                        games (*),
                        player1:users!matches_player1_id_fkey (*),
                        player2:users!matches_player2_id_fkey (*)
                      `)
                      .eq("id", match.id)
                      .single()
                    if (updatedMatch) {
                      setMatch(updatedMatch)
                    }
                  }
                } catch (error) {
                  console.error('Error marking ready:', error)
                } finally {
                  setMarkingReady(false)
                }
              }}
              disabled={markingReady || (isPlayer1 && match.game_data?.player1_ready) || (isPlayer2 && match.game_data?.player2_ready)}
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {markingReady 
                ? 'Processing...' 
                : (isPlayer1 && match.game_data?.player1_ready) || (isPlayer2 && match.game_data?.player2_ready)
                  ? 'You\'re Ready!'
                  : match.game_data?.player1_ready && match.game_data?.player2_ready
                ? 'Both Players Ready!' 
                : 'I\'m Ready!'}
            </button>
            
            {/* Show readiness status */}
            <div className="mt-2 text-sm text-gray-400">
              {match.game_data?.player1_ready && match.game_data?.player2_ready ? (
                <span className="text-green-400">Both players ready! Match starting...</span>
              ) : (
                <span>
                  {match.game_data?.player1_ready && isPlayer1 ? 'You\'re ready! ' : ''}
                  {match.game_data?.player2_ready && isPlayer2 ? 'You\'re ready! ' : ''}
                  {match.game_data?.player1_ready && match.game_data?.player2_ready 
                    ? 'Waiting for match to start...' 
                    : 'Waiting for both players to be ready...'}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Game Interface and Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
          {/* Game Interface - Takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            <EnhancedMatchInterface
              match={match}
              currentUser={user}
              onMatchComplete={async (winnerId) => {
                console.log('🏁 Match completed, winner:', winnerId)
                
                // If this is a tournament match, redirect to tournament page after a delay
                if ((match as any)?.tournament_id) {
                  console.log('🏆 Tournament match completed, redirecting to tournament...')
                  setTimeout(() => {
                    router.push(`/tournaments/${(match as any).tournament_id}`)
                  }, 3000) // 3 second delay to show results
                }
              }}
            />
          </div>

          {/* Match Chat - for players and spectators (when match is full) */}
          {(isInMatch && match.player2_id) || (!isInMatch && match.player2_id) ? (
            <div className="lg:col-span-1 space-y-4">
              {!isInMatch && match.player2_id && (
                <SpectatorMode
                  matchId={match.id}
                  currentUser={user}
                  isPlayer={false}
                  tournamentId={(match as any)?.tournament_id}
                />
              )}
              <ChatWindow
                messageType="match"
                currentUser={user}
                matchId={match.id}
                title="Match Chat"
                maxHeight="600px"
              />
            </div>
          ) : null}
        </div>

        {/* Match Actions */}
        {match.status === "waiting" && !isInMatch && !match.player2_id && (
          <Card className="bg-gray-900/50 border-yellow-500/20 mt-6">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="text-xl text-white">Join this match?</div>
                <p className="text-gray-400">
                  Bet {match.bet_amount} tokens to challenge {match.player1?.display_name || match.player1?.username}
                </p>
                <button 
                  onClick={async () => {
                    try {
                      // Check if user has enough tokens
                      if (user.tokens < match.bet_amount) {
                        alert(`You need ${match.bet_amount} tokens to join this match. You currently have ${user.tokens} tokens.`)
                        return
                      }

                      // Join the match as player 2
                      const { error } = await supabase
                        .from('matches')
                        .update({
                          player2_id: user.id,
                          game_data: {
                            ...match.game_data,
                            player2_ready: false // Player 2 starts as not ready
                          }
                        })
                        .eq('id', match.id)

                      if (error) {
                        console.error('Error joining match:', error)
                        alert('Failed to join match. Please try again.')
                        return
                      }

                      console.log('Successfully joined match!')
                      // Refresh the page to show updated match state
                      window.location.reload()
                    } catch (error) {
                      console.error('Error joining match:', error)
                      alert('Failed to join match. Please try again.')
                    }
                  }}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded cursor-pointer inline-flex items-center transition-colors"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Join Match
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Match is full - spectator mode for non-players (SpectatorMode + Chat in sidebar above) */}

        {match.status === "waiting" && isInMatch && !match.player2_id && (
          <Card className="bg-gray-900/50 border-yellow-500/20 mt-6">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="text-xl text-white">Waiting for opponent...</div>
                <p className="text-gray-400">
                  Share this match link with a friend to start playing!
                </p>
                <div className="bg-gray-800 p-3 rounded text-sm text-gray-300 font-mono">
                  {typeof window !== 'undefined' ? window.location.href : 'Loading...'}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      </main>
    </div>
  )
}
