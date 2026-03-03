"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, DollarSign, Coins, Zap, Users, Brain, UserPlus } from "lucide-react"
import { useState, useEffect } from "react"
import type { Game } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import MatchmakingInterface from "./matchmaking-interface"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createFriendMatch } from "@/lib/game-actions"
import { useToast } from "@/hooks/use-toast"



interface CreateMatchFormProps {
  game: Game
  user: any // User object with tokens property
}

export default function CreateMatchForm({ game, user }: CreateMatchFormProps) {
  const [selectedTier, setSelectedTier] = useState<'free' | 'tokens' | 'cash5' | 'cash10'>('tokens')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [showMatchmaking, setShowMatchmaking] = useState(false)
  const [isCheckingMatchmaking, setIsCheckingMatchmaking] = useState(true)
  const [isCheckingActiveMatch, setIsCheckingActiveMatch] = useState(true)
  const [userStartedMatchmaking, setUserStartedMatchmaking] = useState(false)
  const [hasActiveMatch, setHasActiveMatch] = useState(false)
  const [componentKey, setComponentKey] = useState(Date.now())
  const [forceRefresh, setForceRefresh] = useState(0)
  const [activeMatchInfo, setActiveMatchInfo] = useState<any>(null)
  const [loadingMatchInfo, setLoadingMatchInfo] = useState(false)
  const [hasExistingQueues, setHasExistingQueues] = useState(false)
  const [showFriendDialog, setShowFriendDialog] = useState(false)
  const [friends, setFriends] = useState<any[]>([])
  const [loadingFriends, setLoadingFriends] = useState(false)
  const [creatingMatch, setCreatingMatch] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()
  const { toast } = useToast()

  // Debug effect to track hasActiveMatch state changes
  useEffect(() => {
    console.log("🔍 hasActiveMatch state changed:", hasActiveMatch)
  }, [hasActiveMatch])

  // Debug effect to track isCheckingActiveMatch state changes
  useEffect(() => {
    console.log("🔍 isCheckingActiveMatch state changed:", isCheckingActiveMatch)
  }, [isCheckingActiveMatch])

  // Reset state on component mount
  useEffect(() => {
    console.log("🔄 Component mounted, resetting all states")
    setHasActiveMatch(false)
    setShowMatchmaking(false)
    setUserStartedMatchmaking(false)
    
    // Clear any persisted state from browser storage
    try {
      localStorage.removeItem('hasActiveMatch')
      localStorage.removeItem('showMatchmaking')
      localStorage.removeItem('userStartedMatchmaking')
      sessionStorage.removeItem('hasActiveMatch')
      sessionStorage.removeItem('showMatchmaking')
      sessionStorage.removeItem('userStartedMatchmaking')
      console.log("🧹 Cleared persisted state from browser storage")
    } catch (error) {
      console.log("No persisted state to clear")
    }
    
    // Force component refresh to clear any cached state
    setComponentKey(Date.now())
    setForceRefresh(prev => prev + 1)
  }, [])

  // Fetch active match info when hasActiveMatch is true
  useEffect(() => {
    const fetchActiveMatchInfo = async () => {
      if (hasActiveMatch) {
        setLoadingMatchInfo(true)
        try {
          const { data: activeMatch } = await supabase
            .from("matches")
            .select(`
              id,
              status,
              bet_amount,
              created_at,
              player1_id,
              player2_id,
              games (name)
            `)
            .eq("game_id", game.id)
            .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
            .in("status", ["waiting", "in_progress"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()

          console.log("🔍 Active match info:", activeMatch)
          setActiveMatchInfo(activeMatch)
          
          if (!activeMatch) {
            console.log("🔄 No actual active match found, resetting hasActiveMatch to false")
            setHasActiveMatch(false)
          }
        } catch (error) {
          console.error("Error fetching active match info:", error)
          setHasActiveMatch(false)
        } finally {
          setLoadingMatchInfo(false)
        }
      }
    }
    
    fetchActiveMatchInfo()
  }, [hasActiveMatch, user.id, game.id, supabase])

  // Check for active matches on page load and set up real-time monitoring
  useEffect(() => {
    const checkActiveMatches = async () => {
      try {
        // Only check for active matches where user is a player
        console.log("🔍 Checking for active matches...", { gameId: game.id, userId: user.id })
        
        const { data: activeMatch, error: matchError } = await supabase
          .from("matches")
          .select("*")
          .eq("game_id", game.id)
          .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
          .in("status", ["waiting", "in_progress"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        console.log("🔍 Active match check result:", { activeMatch, matchError })

        if (activeMatch) {
          console.log("🎮 Found existing active match, setting warning state...", {
            matchId: activeMatch.id,
            status: activeMatch.status,
            player1: activeMatch.player1_id,
            player2: activeMatch.player2_id,
            betAmount: activeMatch.bet_amount
          })
          // Set the state to show the warning instead of auto-redirecting
          setHasActiveMatch(true)
          return
        } else {
          console.log("✅ No active matches found, hasActiveMatch will remain false")
          // Double-check: ensure hasActiveMatch is false
          setHasActiveMatch(false)
        }
      } catch (error) {
        console.log("No active match found")
        setHasActiveMatch(false)
      } finally {
        setIsCheckingActiveMatch(false)
        setIsCheckingMatchmaking(false)
      }
    }

    checkActiveMatches()

    // Set up real-time monitoring for match updates
    const matchSubscription = supabase
      .channel('match-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'matches',
          filter: `game_id.eq.${game.id}`
        },
        (payload) => {
          console.log("🔄 New match created:", payload)
          const match = payload.new as any
          
          // If this new match involves the current user, redirect immediately
          if (match.player1_id === user.id || match.player2_id === user.id) {
            console.log("🎮 New match created for you! Redirecting to:", match.id)
            // Add a small delay to ensure the match is fully created
            setTimeout(() => {
              router.push(`/games/match/${match.id}`)
            }, 1000)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `game_id.eq.${game.id}`
        },
        (payload) => {
          console.log("🔄 Match updated:", payload)
          const match = payload.new as any
          
          // If this match involves the current user and status changed to in_progress
          if ((match.player1_id === user.id || match.player2_id === user.id) && 
              match.status === 'in_progress') {
            console.log("🎮 Match started! Checking if redirect needed...")
            
            // Only redirect if we're not already on the match page
            const currentPath = window.location.pathname
            if (!currentPath.includes(`/match/${match.id}`)) {
              console.log("🎮 Not on match page, redirecting to:", match.id)
              // Add a small delay to ensure the match is fully updated
              setTimeout(() => {
                router.push(`/games/match/${match.id}`)
              }, 1000)
            } else {
              console.log("🎮 Already on match page, no redirect needed")
            }
          }
        }
      )
      .subscribe()

    // Also set up polling as backup (every 2 seconds)
    const pollInterval = setInterval(async () => {
      try {
        const { data: activeMatches } = await supabase
          .from('matches')
          .select('id, status, player1_id, player2_id')
          .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
          .in('status', ['waiting', 'in_progress'])
          .order('created_at', { ascending: false })
          .limit(1)

        if (activeMatches && activeMatches.length > 0) {
          const match = activeMatches[0]
          console.log("🔍 Polling found active match:", match)
          
          // If match is in_progress or very recent (created in last 10 seconds), redirect
          const matchCreatedAt = new Date(match.created_at || new Date())
          const tenSecondsAgo = new Date(Date.now() - 10 * 1000)
          const isRecentMatch = matchCreatedAt > tenSecondsAgo
          
          if (match.status === 'in_progress' || isRecentMatch) {
            console.log("🎮 Polling: Match found! Redirecting to:", match.id)
            router.push(`/games/match/${match.id}`)
          }
        }
      } catch (error) {
        console.error("Error in polling:", error)
      }
    }, 2000) // Poll every 2 seconds

    // Cleanup subscription and polling on unmount
    return () => {
      supabase.removeChannel(matchSubscription)
      clearInterval(pollInterval)
    }
  }, [user.id, game.id, supabase, router])

  // Handle URL parameters for pre-selecting tier
  useEffect(() => {
    const tier = searchParams.get('tier')
    if (tier && ['free', 'tokens', 'cash5', 'cash10'].includes(tier)) {
      setSelectedTier(tier as 'free' | 'tokens' | 'cash5' | 'cash10')
    }
  }, [searchParams])

  // Fetch friends when dialog opens
  useEffect(() => {
    const fetchFriends = async () => {
      if (!showFriendDialog) return
      
      setLoadingFriends(true)
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (!currentUser) {
          setFriends([])
          return
        }

        const { data: friendsData, error } = await supabase
          .from('friends')
          .select(`
            id,
            user_id,
            friend_id,
            status,
            user:users!friends_user_id_fkey(id, display_name, username, is_online, tokens),
            friend:users!friends_friend_id_fkey(id, display_name, username, is_online, tokens)
          `)
          .eq('status', 'accepted')
          .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`)

        if (error) {
          console.error('Error fetching friends:', error)
          setFriends([])
        } else {
          const mappedFriends = (friendsData || []).map((friendship: any) => {
            const otherUser = friendship.user_id === currentUser.id ? friendship.friend : friendship.user
            return {
              id: otherUser.id,
              display_name: otherUser.display_name || otherUser.username,
              username: otherUser.username,
              is_online: otherUser.is_online || false,
              tokens: otherUser.tokens || 0
            }
          })
          setFriends(mappedFriends)
        }
      } catch (error) {
        console.error('Error fetching friends:', error)
        setFriends([])
      } finally {
        setLoadingFriends(false)
      }
    }

    fetchFriends()
  }, [showFriendDialog, supabase])

  const handlePlayFriend = async (friendId: string) => {
    const betAmount = selectedTier === 'free' ? 0 :
      selectedTier === 'tokens' ? 100 :
      selectedTier === 'cash5' ? 500 : 1000

    if (betAmount > 0 && user.tokens < betAmount) {
      toast({
        title: "Insufficient tokens",
        description: `You need ${betAmount} tokens to play this match`,
        variant: "destructive",
      })
      return
    }

    setCreatingMatch(true)
    try {
      const result = await createFriendMatch(
        game.id,
        friendId,
        betAmount,
        isTriviaGame ? selectedCategory : undefined
      )

      if (result.error) {
        toast({
          title: "Failed to create match",
          description: result.error,
          variant: "destructive",
        })
      } else if (result.matchId) {
        toast({
          title: "Match request sent!",
          description: result.message || "Your friend will be notified to accept the match",
        })
        setShowFriendDialog(false)
        router.push(`/games/match/${result.matchId}`)
      }
    } catch (error) {
      console.error('Error creating friend match:', error)
      toast({
        title: "Error",
        description: "Failed to create match with friend",
        variant: "destructive",
      })
    } finally {
      setCreatingMatch(false)
    }
  }

  // Clear any existing matchmaking queues when component mounts
  useEffect(() => {
    const clearExistingQueues = async () => {
      try {
        console.log("🧹 Checking for existing matchmaking queues...")
        
        // Cancel any existing matchmaking queues for this user and game
        const { data: existingQueues, error: fetchError } = await supabase
          .from("matchmaking_queue")
          .select("id, match_type, status")
          .eq("user_id", user.id)
          .eq("game_id", game.id)
          .eq("status", "waiting")

        console.log("🔍 Found existing queues:", existingQueues)

        if (fetchError) {
          console.error("Error fetching queues:", fetchError)
          return
        }

        if (existingQueues && existingQueues.length > 0) {
          console.log(`🔄 Found ${existingQueues.length} existing matchmaking queues, automatically resuming...`)
          // Automatically resume matchmaking for existing queues
          setHasExistingQueues(true)
          setUserStartedMatchmaking(true)
          setShowMatchmaking(true)
          console.log("✅ Found existing queues, automatically resuming matchmaking")
        } else {
          console.log("✅ No existing queues found")
          setHasExistingQueues(false)
        }
      } catch (error) {
        console.error("Error in clearExistingQueues:", error)
      }
    }

    clearExistingQueues()
  }, [user.id, game.id, supabase])

  // Debug: Track when showMatchmaking changes
  useEffect(() => {
    console.log("🔍 showMatchmaking changed:", { showMatchmaking, userStartedMatchmaking })
  }, [showMatchmaking, userStartedMatchmaking])

  // Monetization tiers with fixed amounts
  const monetizationTiers = [
    {
      id: 'free' as const,
      name: 'Free Play',
      icon: <Zap className="h-5 w-5" />,
      description: 'Practice with gems/tokens',
      color: 'bg-green-500/20 text-green-400 border-green-500/30',
      betAmount: 0,
      available: true
    },
    {
      id: 'tokens' as const,
      name: 'Token Match',
      icon: <Coins className="h-5 w-5" />,
      description: 'Bet 100 in-game tokens',
      color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      betAmount: 100,
      available: user.tokens >= 100
    },
    {
      id: 'cash5' as const,
      name: '$5 Cash Pool',
      icon: <DollarSign className="h-5 w-5" />,
      description: 'Real money tournament',
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      betAmount: 500, // 500 tokens = $5
      available: user.tokens >= 500
    },
    {
      id: 'cash10' as const,
      name: '$10 Cash Pool',
      icon: <DollarSign className="h-5 w-5" />,
      description: 'High-stakes competition',
      color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      betAmount: 1000, // 1000 tokens = $10
      available: user.tokens >= 1000
    }
  ]



  const isTriviaGame = game.name?.toLowerCase().includes('trivia') || game.name?.toLowerCase().includes('trivia challenge')
  
  const triviaCategories = [
    { name: 'Animals', value: 'Animals' },
    { name: 'Pop Culture', value: 'Pop Culture' },
    { name: 'Sports', value: 'Sports' }
  ]

  const handleStartMatchmaking = () => {
    // Validate category selection for trivia games
    if (isTriviaGame && !selectedCategory) {
      alert('Please select a trivia category before starting matchmaking')
      return
    }
    
    console.log("🎮 User manually started matchmaking", { category: selectedCategory })
    setUserStartedMatchmaking(true)
    setShowMatchmaking(true)
  }

  const handleResumeMatchmaking = () => {
    console.log("🎮 User resumed existing matchmaking")
    setUserStartedMatchmaking(true)
    setShowMatchmaking(true)
  }

  const handleClearMatchmaking = async () => {
    try {
      // Cancel any existing matchmaking queues for this user and game
      const { data: existingQueues } = await supabase
        .from("matchmaking_queue")
        .select("id")
        .eq("user_id", user.id)
        .eq("game_id", game.id)
        .eq("status", "waiting")

      if (existingQueues && existingQueues.length > 0) {
        await supabase
          .from("matchmaking_queue")
          .update({ status: "cancelled" })
          .in("id", existingQueues.map(q => q.id))
        
        alert(`Cleared ${existingQueues.length} existing matchmaking queue(s)`)
      } else {
        alert("No existing matchmaking queues found")
      }
    } catch (error) {
      console.error("Error clearing matchmaking:", error)
      alert("Error clearing matchmaking queues")
    }
  }

  const handleCancelActiveMatch = async () => {
    try {
      console.log("🔍 Looking for active matches for user:", user.id, "game:", game.id)
      
      // Find active matches for this user and game
      const { data: activeMatches, error: fetchError } = await supabase
        .from("matches")
        .select("*")
        .eq("game_id", game.id)
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
        .in("status", ["waiting", "in_progress"])

      console.log("🔍 Active matches found:", activeMatches, "Error:", fetchError)

      if (activeMatches && activeMatches.length > 0) {
        console.log(`🎯 Found ${activeMatches.length} active matches, cancelling...`)
        
        // Cancel ALL active matches for this user and game
        for (const match of activeMatches) {
          console.log(`Cancelling match ${match.id} (status: ${match.status})`)
          
          await supabase
            .from("matches")
            .update({ status: "cancelled" })
            .eq("id", match.id)

          // Refund tokens if you're player1
          if (match.player1_id === user.id) {
            const { data: userData } = await supabase
              .from("users")
              .select("tokens")
              .eq("id", user.id)
              .single()

            if (userData) {
              await supabase
                .from("users")
                .update({ tokens: userData.tokens + match.bet_amount })
                .eq("id", user.id)

              // Create refund transaction
              await supabase.from("transactions").insert({
                user_id: user.id,
                match_id: match.id,
                amount: match.bet_amount,
                type: "bonus",
                description: `Match cancelled - refund of ${match.bet_amount} tokens`
              })
            }
          }
        }

        alert(`Cancelled ${activeMatches.length} active match(es) and refunded tokens`)
        // Reset the state immediately
        setHasActiveMatch(false)
        setActiveMatchInfo(null)
        // Redirect to games page after successful cancellation
        window.location.href = "/games"
      } else {
        console.log("❌ No active matches found")
        alert("No active matches found")
      }
    } catch (error) {
      console.error("Error cancelling active match:", error)
      alert("Error cancelling active match: " + (error instanceof Error ? error.message : "Unknown error"))
    }
  }

  const handleMatchFound = (matchId: string, matchType: string) => {
    router.push(`/games/match/${matchId}`)
  }

  const handleCancelMatchmaking = () => {
    console.log("🛑 User cancelled matchmaking, going back to selection")
    setShowMatchmaking(false)
    setUserStartedMatchmaking(false)
  }

  const handleDebugActiveMatches = async () => {
    try {
      console.log("🔍 DEBUG: Checking for active matches...")
      console.log("User ID:", user.id)
      console.log("Game ID:", game.id)
      
      // Check all matches for this user
      const { data: allUserMatches, error: allError } = await supabase
        .from("matches")
        .select("*")
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
        .order("created_at", { ascending: false })

      console.log("All user matches:", allUserMatches, "Error:", allError)

      // Check active matches specifically
      const { data: activeMatches, error: activeError } = await supabase
        .from("matches")
        .select("*")
        .eq("game_id", game.id)
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
        .in("status", ["waiting", "in_progress"])

      console.log("Active matches for this game:", activeMatches, "Error:", activeError)

      // Check matchmaking queues
      const { data: queues, error: queueError } = await supabase
        .from("matchmaking_queue")
        .select("*")
        .eq("user_id", user.id)
        .eq("game_id", game.id)
        .eq("status", "waiting")

      console.log("Matchmaking queues:", queues, "Error:", queueError)

      alert(`Debug complete! Check console for details.\nActive matches: ${activeMatches?.length || 0}\nQueues: ${queues?.length || 0}`)
    } catch (error) {
      console.error("Debug error:", error)
      alert("Debug failed: " + (error instanceof Error ? error.message : "Unknown error"))
    }
  }

  const handleForceReset = () => {
    console.log("🔄 Force resetting all states")
    setHasActiveMatch(false)
    setShowMatchmaking(false)
    setUserStartedMatchmaking(false)
    setComponentKey(Date.now())
    
    // Clear browser storage
    try {
      localStorage.clear()
      sessionStorage.clear()
      console.log("🧹 Cleared all browser storage")
    } catch (error) {
      console.log("Error clearing storage:", error)
    }
    
    // Force page refresh
    window.location.reload()
  }

  // Show loading while checking for existing matchmaking or active matches
  if (isCheckingMatchmaking || isCheckingActiveMatch) {
    return (
      <Card className="bg-gray-900/50 border-gray-800">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Checking for active matches...</p>
        </CardContent>
      </Card>
    )
  }


  if (showMatchmaking && userStartedMatchmaking) {
    console.log("🎮 Showing matchmaking interface - user started it manually", { category: selectedCategory })
    return (
      <MatchmakingInterface
        key={`matchmaking-${game.id}-${user.id}`}
        gameId={game.id}
        currentUserId={user.id}
        matchType={selectedTier}
        betAmount={
          selectedTier === 'free' ? 0 :
          selectedTier === 'tokens' ? 100 :
          selectedTier === 'cash5' ? 500 : 1000
        }
        category={isTriviaGame ? selectedCategory : undefined}
        onMatchFound={handleMatchFound}
        onCancel={handleCancelMatchmaking}
        autoStart={true}
      />
    )
  }

  const handleGoToMatch = () => {
    if (activeMatchInfo) {
      router.push(`/games/match/${activeMatchInfo.id}`)
    }
  }

  // Show match status if there's an active match
  if (hasActiveMatch && activeMatchInfo) {
    return (
      <Card className="bg-blue-900/20 border-blue-600">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="text-blue-400 mb-4">
              <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-blue-400 mb-2">Match in Progress</h3>
            <p className="text-blue-300 mb-4">You have an active match that's ready to play!</p>
            
            <div className="bg-blue-900/30 p-4 rounded-lg mb-4 text-left">
              <h4 className="font-semibold text-blue-200 mb-2">Match Details:</h4>
              <div className="space-y-1 text-sm text-blue-300">
                <p><strong>Game:</strong> {activeMatchInfo.games?.name || 'Unknown'}</p>
                <p><strong>Status:</strong> <span className="capitalize">{activeMatchInfo.status}</span></p>
                <p><strong>Bet Amount:</strong> {activeMatchInfo.bet_amount} tokens</p>
                <p><strong>Created:</strong> {new Date(activeMatchInfo.created_at).toLocaleString()}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={handleGoToMatch}
                className="bg-green-600 hover:bg-green-700 text-white w-full"
              >
                🎮 Go to Match
              </Button>
              
              <Button 
                onClick={handleCancelActiveMatch}
                className="bg-red-600 hover:bg-red-700 text-white w-full"
              >
                Cancel Match & Create New
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Removed problematic reset logic that was causing cycling

  return (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-gradient-to-br from-cyan-500 to-yellow-500 rounded-full">
            <Trophy className="h-8 w-8 text-black" />
          </div>
        </div>
        <CardTitle className="text-white text-2xl">Create {game.name} Match</CardTitle>
        <CardDescription className="text-gray-400 text-lg">{game.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

          {/* Monetization Tiers */}
          <div className="space-y-4">
            <label className="text-sm font-medium text-gray-300">Match Type</label>
            <div className="grid grid-cols-1 gap-3">
              {monetizationTiers.map((tier) => (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setSelectedTier(tier.id)}
                  disabled={!tier.available}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                    selectedTier === tier.id
                      ? tier.color + ' border-opacity-100'
                      : 'bg-gray-800/30 border-gray-700 text-gray-400 hover:border-gray-600'
                  } ${!tier.available ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {tier.icon}
                      <span className="font-semibold">{tier.name}</span>
                    </div>
                    {tier.betAmount > 0 && (
                      <div className="text-lg font-bold">
                        {tier.betAmount.toLocaleString()} tokens
                      </div>
                    )}
                  </div>
                  <p className="text-sm opacity-80 mt-1">{tier.description}</p>
                  {!tier.available && (
                    <Badge variant="secondary" className="mt-2 text-xs">
                      Insufficient Balance
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Category Selection for Trivia Games */}
          {isTriviaGame && (
            <div className="space-y-4">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Brain className="h-4 w-4 text-orange-500" />
                Trivia Category <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {triviaCategories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                      selectedCategory === cat.value
                        ? 'bg-orange-500/20 text-orange-400 border-orange-500 border-opacity-100'
                        : 'bg-gray-800/30 border-gray-700 text-gray-400 hover:border-gray-600'
                    } cursor-pointer`}
                  >
                    <span className="font-semibold">{cat.name}</span>
                  </button>
                ))}
              </div>
              {!selectedCategory && (
                <p className="text-sm text-red-400">Please select a category to continue</p>
              )}
            </div>
          )}





          {/* Balance Check */}
          <div className="bg-gray-800/30 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Your Balance:</span>
              <span className="text-white font-semibold">{user.tokens.toLocaleString()} tokens</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-gray-400">After Bet:</span>
              <span className={`font-semibold ${
                user.tokens - (selectedTier === 'free' ? 0 :
                selectedTier === 'tokens' ? 100 :
                selectedTier === 'cash5' ? 500 : 1000) >= 0 ? "text-green-400" : "text-red-400"
              }`}>
                {(user.tokens - (selectedTier === 'free' ? 0 :
                selectedTier === 'tokens' ? 100 :
                selectedTier === 'cash5' ? 500 : 1000)).toLocaleString()} tokens
              </span>
            </div>
            {selectedTier === 'free' && (
              <div className="mt-2 text-sm text-green-400">
                🎉 Free play - no tokens required!
              </div>
            )}
            {(selectedTier === 'cash5' || selectedTier === 'cash10') && (
              <div className="mt-2 text-sm text-blue-400">
                💰 Cash tournament - winner takes all!
              </div>
            )}
          </div>

        <div className="space-y-3">
          <Button 
            onClick={handleStartMatchmaking}
            className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold py-6 text-lg"
          >
            <Users className="mr-2 h-5 w-5" />
            Start Matchmaking
          </Button>

          <Dialog open={showFriendDialog} onOpenChange={setShowFriendDialog}>
            <DialogTrigger asChild>
              <Button 
                variant="outline"
                className="w-full border-orange-500 text-orange-400 hover:bg-orange-500 hover:text-black font-semibold py-6 text-lg"
              >
                <UserPlus className="mr-2 h-5 w-5" />
                Play a Friend
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700 text-white max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white">Select a Friend to Play</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Choose a friend to challenge in {game.name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 mt-4">
                {loadingFriends ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading friends...</p>
                  </div>
                ) : friends.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p>No friends found</p>
                    <p className="text-sm mt-2">Add friends to play matches with them!</p>
                  </div>
                ) : (
                  friends.map((friend) => {
                    const betAmount = selectedTier === 'free' ? 0 :
                      selectedTier === 'tokens' ? 100 :
                      selectedTier === 'cash5' ? 500 : 1000
                    const canPlay = betAmount === 0 || (friend.tokens >= betAmount && user.tokens >= betAmount)
                    
                    return (
                      <div
                        key={friend.id}
                        className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:bg-gray-800/70 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-black font-bold">
                            {friend.display_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-white font-medium">{friend.display_name}</div>
                            <div className="text-sm text-gray-400">
                              @{friend.username} {friend.is_online && <span className="text-green-400">• Online</span>}
                            </div>
                            <div className="text-xs text-gray-500">
                              {friend.tokens.toLocaleString()} tokens
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => handlePlayFriend(friend.id)}
                          disabled={!canPlay || creatingMatch}
                          className="bg-orange-500 hover:bg-orange-600 text-black"
                        >
                          {creatingMatch ? "Creating..." : "Challenge"}
                        </Button>
                      </div>
                    )
                  })
                )}
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Show resume option if there are existing queues */}
          {hasExistingQueues && (
            <Button 
              onClick={handleResumeMatchmaking}
              variant="outline"
              className="w-full border-orange-500 text-orange-400 hover:bg-orange-500 hover:text-black"
            >
              <Users className="mr-2 h-4 w-4" />
              Resume Existing Matchmaking
            </Button>
          )}
          
          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={handleClearMatchmaking}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Clear Matchmaking
            </Button>
            
            <Button 
              onClick={handleCancelActiveMatch}
              variant="outline"
              className="border-red-600 text-red-300 hover:bg-red-800"
            >
              Cancel Active Match
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
