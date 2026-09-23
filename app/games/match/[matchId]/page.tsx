"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import CompetitiveShell from "@/components/app/competitive-shell"
import CompetitivePageFeed from "@/components/app/competitive-page-feed"
import MatchLobbyPageView from "@/components/match-lobby/match-lobby-page-view"
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
            player1:users!matches_player1_id_fkey (id, username, display_name, avatar_url, tokens, total_games_played, total_games_won),
            player2:users!matches_player2_id_fkey (id, username, display_name, avatar_url, tokens, total_games_played, total_games_won)
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

  const reloadMatch = async () => {
    if (!matchId) return
    const { data: updatedMatch } = await supabase
      .from("matches")
      .select(`
        *,
        games (name, description, min_bet, max_bet),
        player1:users!matches_player1_id_fkey (id, username, display_name, avatar_url, tokens, total_games_played, total_games_won),
        player2:users!matches_player2_id_fkey (id, username, display_name, avatar_url, tokens, total_games_played, total_games_won)
      `)
      .eq("id", matchId)
      .single()
    if (updatedMatch) setMatch(updatedMatch)
  }

  const handleMarkReady = async () => {
    if (!match) return
    setMarkingReady(true)
    try {
      const result = await markPlayerReady(match.id)
      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      } else {
        if (result.bothReady) {
          toast({ title: "Both players ready!", description: "Match is starting..." })
        } else {
          toast({ title: "You're ready!", description: "Waiting for opponent..." })
        }
        await reloadMatch()
      }
    } catch (error) {
      console.error("Error marking ready:", error)
      toast({ title: "Error", description: "Failed to mark as ready", variant: "destructive" })
    } finally {
      setMarkingReady(false)
    }
  }

  const handleAcceptFriend = async () => {
    if (!match) return
    setAcceptingMatch(true)
    try {
      const result = await acceptFriendMatchRequest(match.id)
      if (result.error) {
        toast({ title: "Failed to accept", description: result.error, variant: "destructive" })
      } else {
        toast({
          title: "Match request accepted!",
          description: "Both players need to ready up to start",
        })
        await reloadMatch()
      }
    } catch (error) {
      console.error("Error accepting match:", error)
      toast({ title: "Error", description: "Failed to accept match request", variant: "destructive" })
    } finally {
      setAcceptingMatch(false)
    }
  }

  const handleDeclineFriend = async () => {
    if (!match) return
    await supabase.from("matches").update({ status: "cancelled" }).eq("id", match.id)
    toast({ title: "Match request declined" })
    router.push("/dashboard")
  }

  const handleJoinMatch = async () => {
    if (!match || !user) return
    try {
      if (user.tokens < match.bet_amount) {
        alert(
          `You need ${match.bet_amount} tokens to join this match. You currently have ${user.tokens} tokens.`
        )
        return
      }
      const { error } = await supabase
        .from("matches")
        .update({
          player2_id: user.id,
          game_data: {
            ...match.game_data,
            player2_ready: false,
          },
        })
        .eq("id", match.id)
      if (error) {
        console.error("Error joining match:", error)
        alert("Failed to join match. Please try again.")
        return
      }
      window.location.reload()
    } catch (error) {
      console.error("Error joining match:", error)
      alert("Failed to join match. Please try again.")
    }
  }

  if (loading || !user) {
    const loadingBody = (
      <section className="chance-premium-card mx-auto flex max-w-md flex-col items-center gap-3 p-10 text-center">
        <div
          className="size-8 animate-spin rounded-full border-2 border-[var(--chance-border)] border-t-[var(--chance-brand)]"
          role="status"
          aria-label="Loading"
        />
        <p className="chance-text-caption">Loading match…</p>
      </section>
    )

    if (user) {
      return (
        <CompetitiveShell user={user}>
          <CompetitivePageFeed>{loadingBody}</CompetitivePageFeed>
        </CompetitiveShell>
      )
    }

    return (
      <div className="chance-competitive-theme flex min-h-screen items-center justify-center bg-[var(--chance-bg)] px-4">
        {loadingBody}
      </div>
    )
  }

  if (!match) {
    return (
      <div className="chance-competitive-theme chance-shell flex min-h-screen items-center justify-center bg-[var(--chance-bg)] px-4">
        <p className="text-lg font-medium">Match not found</p>
      </div>
    )
  }

  return (
    <CompetitiveShell user={user}>
      <MatchLobbyPageView
        match={match}
        user={user}
        markingReady={markingReady}
        acceptingMatch={acceptingMatch}
        onMarkReady={handleMarkReady}
        onAcceptFriend={handleAcceptFriend}
        onDeclineFriend={handleDeclineFriend}
        onJoinMatch={handleJoinMatch}
        onMatchComplete={async () => {
          if ((match as { tournament_id?: string }).tournament_id) {
            setTimeout(() => {
              router.push(`/tournaments/${(match as { tournament_id?: string }).tournament_id}`)
            }, 3000)
          }
        }}
      />
    </CompetitiveShell>
  )
}
