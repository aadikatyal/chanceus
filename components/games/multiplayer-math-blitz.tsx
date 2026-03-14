"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Trophy, Timer, Target, Zap, Users, CheckCircle, XCircle, UserPlus, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { sendFriendRequest, getFriends, getSentRequests, getPendingRequests, acceptFriendRequest } from "@/lib/friends-actions"
import { 
  MultiplayerGameState, 
  MathProblem, 
  PlayerAnswer,
  MultiplayerResult,
  initializeMultiplayerGame,
  submitPlayerAnswer,
  markPlayerFinished,
  calculateMultiplayerResult
} from "@/lib/game-logic"

interface MultiplayerMathBlitzProps {
  matchId: string
  currentUserId: string
  player1Id: string
  player2Id: string
  onGameComplete?: (result: MultiplayerResult) => void
  isTournamentMatch?: boolean
}

export default function MultiplayerMathBlitz({ 
  matchId, 
  currentUserId, 
  player1Id, 
  player2Id,
  onGameComplete,
  isTournamentMatch: isTournamentMatchProp 
}: MultiplayerMathBlitzProps) {
  const [gameState, setGameState] = useState<MultiplayerGameState | null>(null)
  const [currentProblem, setCurrentProblem] = useState<MathProblem | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [gameResult, setGameResult] = useState<MultiplayerResult | null>(null)
  // Remove turn-based logic - both players should be able to answer independently
  // const [isMyTurn, setIsMyTurn] = useState(false)
  const [opponentProgress, setOpponentProgress] = useState(0)
  const [showInstructions, setShowInstructions] = useState(false) // Auto-start since countdown already happened
  const [hasAnsweredCurrentProblem, setHasAnsweredCurrentProblem] = useState(false)
  const [localAnswerSubmitted, setLocalAnswerSubmitted] = useState(false)
  const [hasSubmittedFinalResult, setHasSubmittedFinalResult] = useState(false)
  
  // Ready state management
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const [bothPlayersReady, setBothPlayersReady] = useState(false)
  const [matchReady, setMatchReady] = useState(false)

  // Local state to track current problem index for this player
  const [myCurrentProblemIndex, setMyCurrentProblemIndex] = useState(0)

  // Rematch state - init from prop so tournament matches never show rematch on first paint
  const [isTournamentMatch, setIsTournamentMatch] = useState(!!isTournamentMatchProp)
  const [rematchStatus, setRematchStatus] = useState<'none' | 'requested' | 'received' | 'accepted' | 'rejected'>('none')
  const [rematchRequestedBy, setRematchRequestedBy] = useState<string | null>(null)
  const [isLoadingRematch, setIsLoadingRematch] = useState(false)
  const [betAmount, setBetAmount] = useState(0)
  const [gameId, setGameId] = useState<string | null>(null)
  const router = useRouter()
  
  // Friend request state
  const [friendStatus, setFriendStatus] = useState<'none' | 'friends' | 'request_sent' | 'request_received' | 'checking'>('checking')
  const [isLoadingFriend, setIsLoadingFriend] = useState(false)
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null)
  const [opponentId, setOpponentId] = useState<string | null>(null)
  const [opponentName, setOpponentName] = useState<string | null>(null)
  
  // Force start timeout - if game doesn't start within 10 seconds, force it
  useEffect(() => {
    const forceStartTimeout = setTimeout(() => {
      if (!matchReady && gameState && player1Id && player2Id) {
        console.log('⏰ Force starting game after timeout - both players present')
        setMatchReady(true)
        setBothPlayersReady(true)
      }
    }, 10000) // 10 seconds
    
    return () => clearTimeout(forceStartTimeout)
  }, [matchReady, gameState, player1Id, player2Id])

  const isPlayer1 = currentUserId === player1Id
  const playerId = isPlayer1 ? 'player1' : 'player2'
  
  // Save game state to database
  const saveGameStateToDatabase = useCallback(async (state: MultiplayerGameState, finalResult?: MultiplayerResult) => {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      // Get current game data to merge with existing data
      const { data: matchData } = await supabase
        .from('matches')
        .select('game_data')
        .eq('id', matchId)
        .single()
      
      const currentGameData = matchData?.game_data || {}
      
      const updateData: any = {
        gameState: state
      }
      
      // If we have a final result, save it too
      if (finalResult) {
        updateData.finalResult = finalResult
        console.log('💾 Saving final result to database:', finalResult)
      }
      
      await supabase
        .from('matches')
        .update({
          game_data: {
            ...currentGameData,
            ...updateData
          }
        })
        .eq('id', matchId)
      
      console.log('💾 Game state saved to database:', {
        p1Finished: state.player1Finished,
        p2Finished: state.player2Finished,
        p1Answers: state.player1Answers.length,
        p2Answers: state.player2Answers.length,
        currentIndex: state.currentProblemIndex,
        hasFinalResult: !!finalResult
      })
    } catch (error) {
      console.error('Error saving game state to database:', error)
    }
  }, [matchId])

  // Handle player ready state
  const handlePlayerReady = useCallback(async () => {
    setIsPlayerReady(true)
    
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      // Get current ready state from database
      const { data: matchData } = await supabase
        .from('matches')
        .select('game_data')
        .eq('id', matchId)
        .single()
      
      const currentGameData = matchData?.game_data || {}
      const currentReadyState = currentGameData.readyState || {
        player1Ready: false,
        player2Ready: false
      }
      
      // Update ready state for current player
      const newReadyState = {
        ...currentReadyState,
        [isPlayer1 ? 'player1Ready' : 'player2Ready']: true,
        timestamp: Date.now()
      }
      
      // Save to database
      await supabase
        .from('matches')
        .update({
          game_data: {
            ...currentGameData,
            readyState: newReadyState
          }
        })
        .eq('id', matchId)
      
      console.log('✅ Ready state saved to database:', newReadyState)
      
      // Check if both players are ready
      if (newReadyState.player1Ready && newReadyState.player2Ready) {
        setBothPlayersReady(true)
        // Start the game
        if (gameState) {
          setCurrentProblem(gameState.problems[0])
          setTimeRemaining(gameState.problems[0].timeLimit)
          // Remove turn-based logic - both players can answer independently
          console.log('🚀 Both players ready! Starting game...')
        }
      }
    } catch (error) {
      console.error('Error saving ready state:', error)
    }
  }, [isPlayer1, matchId, gameState])
  
  // Check ready state from database
  useEffect(() => {
    const checkReadyState = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        
        const { data: matchData } = await supabase
          .from('matches')
          .select('game_data')
          .eq('id', matchId)
          .single()
        
        if (matchData?.game_data?.readyState) {
          const readyState = matchData.game_data.readyState
          const playerReady = isPlayer1 ? readyState.player1Ready : readyState.player2Ready
          const bothReady = readyState.player1Ready && readyState.player2Ready
          
          setIsPlayerReady(playerReady || false)
          setBothPlayersReady(bothReady || false)
          
          if (bothReady && gameState && !currentProblem) {
            setCurrentProblem(gameState.problems[0])
            setTimeRemaining(gameState.problems[0].timeLimit)
            // Remove turn-based logic - both players can answer independently
            console.log('🚀 Both players ready! Starting game...')
          }
        }
      } catch (error) {
        console.error('Error checking ready state:', error)
      }
    }
    
    checkReadyState()
    
    // Poll for ready state changes every 2 seconds
    const interval = setInterval(checkReadyState, 2000)
    return () => clearInterval(interval)
  }, [matchId, isPlayer1, gameState, currentProblem])
  
  // Check if both players have answered the current question using shared state
  // Shared state tracking removed - everything now database-driven
  const bothPlayersAnswered = gameState && currentProblem && 
    gameState.player1Answers.length >= gameState.currentProblemIndex + 1 &&
    gameState.player2Answers.length >= gameState.currentProblemIndex + 1
  
  // No alternative check needed - using database-driven state


  // gameResult now synced via database polling - no localStorage needed

  // Check and set finished flags based on current state - run more frequently
  useEffect(() => {
    if (!gameState) return
    
    // Check if both players have completed all problems based on their answers
    const p1Completed = gameState.player1Answers.length >= gameState.problems.length
    const p2Completed = gameState.player2Answers.length >= gameState.problems.length
    
    console.log('🔍 Checking finished state:', {
      p1Answers: gameState.player1Answers.length,
      p2Answers: gameState.player2Answers.length,
      problemsLength: gameState.problems.length,
      p1Completed,
      p2Completed,
      p1Finished: gameState.player1Finished,
      p2Finished: gameState.player2Finished
    })
    
    // Update finished flags if players have completed all problems
    let needsUpdate = false
    const updatedState = { ...gameState }
    
    // Only set finished to true if player has actually completed all problems
    if (p1Completed && !gameState.player1Finished) {
      updatedState.player1Finished = true
      needsUpdate = true
      console.log('🏁 Setting player1Finished = true (completed all problems)')
    }
    
    if (p2Completed && !gameState.player2Finished) {
      updatedState.player2Finished = true
      needsUpdate = true
      console.log('🏁 Setting player2Finished = true (completed all problems)')
    }
    
    // Also check for incorrectly finished players (marked as finished but haven't completed)
    if (gameState.player1Finished && !p1Completed) {
      updatedState.player1Finished = false
      needsUpdate = true
      console.log('🔧 Correcting player1Finished = false (hasn\'t completed all problems)')
    }
    
    if (gameState.player2Finished && !p2Completed) {
      updatedState.player2Finished = false
      needsUpdate = true
      console.log('🔧 Correcting player2Finished = false (hasn\'t completed all problems)')
    }
    
    // Check if both players are now finished and we don't have a result yet
    if (updatedState.player1Finished && updatedState.player2Finished && p1Completed && p2Completed && !gameResult) {
      console.log('🏁 Both players finished in finished state check! Calculating result...')
      
      // Calculate result directly since we know both players are finished
      const result = calculateMultiplayerResult(updatedState)
      console.log('🎯 Calculated new result (finished check):', result)
      setGameResult(result)
      saveGameStateToDatabase(updatedState, result)
    }
    
    if (needsUpdate) {
      console.log('✅ Updating finished flags:', {
        p1Finished: updatedState.player1Finished,
        p2Finished: updatedState.player2Finished,
        bothFinished: updatedState.player1Finished && updatedState.player2Finished
      })
      
      setGameState(updatedState)
      saveGameStateToDatabase(updatedState)
    }
  }, [gameState, matchId, saveGameStateToDatabase])

  // Force finished state check every 2 seconds to ensure synchronization
  useEffect(() => {
    if (!gameState) return
    
    const interval = setInterval(async () => {
      console.log('⏰ Force checking finished state every 2s...')
      
      // First, try to get the latest state from database
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        
        const { data: matchData } = await supabase
          .from('matches')
          .select('game_data')
          .eq('id', matchId)
          .single()
        
        if (matchData?.game_data?.gameState) {
          const dbState = matchData.game_data.gameState
          console.log('⏰ Database state:', {
            p1Finished: dbState.player1Finished,
            p2Finished: dbState.player2Finished,
            p1Answers: dbState.player1Answers?.length || 0,
            p2Answers: dbState.player2Answers?.length || 0,
            problemsLength: dbState.problems?.length || 0
          })
          
          // Check if database has more up-to-date finished flags
          const p1Completed = (dbState.player1Answers?.length || 0) >= (dbState.problems?.length || 0)
          const p2Completed = (dbState.player2Answers?.length || 0) >= (dbState.problems?.length || 0)
          
          let needsUpdate = false
          const updatedState = { ...gameState }
          
          // Update from database state if it's more current
          if (dbState.player1Finished !== gameState.player1Finished) {
            updatedState.player1Finished = dbState.player1Finished
            needsUpdate = true
            console.log('⏰ Syncing player1Finished from database:', dbState.player1Finished)
          }
          
          if (dbState.player2Finished !== gameState.player2Finished) {
            updatedState.player2Finished = dbState.player2Finished
            needsUpdate = true
            console.log('⏰ Syncing player2Finished from database:', dbState.player2Finished)
          }
          
          // Also check if we need to set finished flags based on answer count
          if (p1Completed && !updatedState.player1Finished) {
            updatedState.player1Finished = true
            needsUpdate = true
            console.log('⏰ Force setting player1Finished = true based on answers')
          }
          
          if (p2Completed && !updatedState.player2Finished) {
            updatedState.player2Finished = true
            needsUpdate = true
            console.log('⏰ Force setting player2Finished = true based on answers')
          }
          
          // Check for incorrectly finished players and correct them
          if (updatedState.player1Finished && !p1Completed) {
            updatedState.player1Finished = false
            needsUpdate = true
            console.log('⏰ Correcting player1Finished = false (hasn\'t completed all problems)')
          }
          
          if (updatedState.player2Finished && !p2Completed) {
            updatedState.player2Finished = false
            needsUpdate = true
            console.log('⏰ Correcting player2Finished = false (hasn\'t completed all problems)')
          }
          
          if (needsUpdate) {
            console.log('⏰ Force updating finished flags:', {
              p1Finished: updatedState.player1Finished,
              p2Finished: updatedState.player2Finished,
              bothFinished: updatedState.player1Finished && updatedState.player2Finished
            })
            
            setGameState(updatedState)
            saveGameStateToDatabase(updatedState)
          }
        }
      } catch (error) {
        console.error('⏰ Error in force checking:', error)
      }
    }, 2000)
    
    return () => clearInterval(interval)
  }, [gameState, matchId, saveGameStateToDatabase])

  // Load match data and check for tournament/rematch
  useEffect(() => {
    const loadMatchData = async () => {
      try {
        const supabase = createClient()
        
        // Load match data
        const { data: matchData, error } = await supabase
          .from('matches')
          .select('bet_amount, game_id, game_data, status')
          .eq('id', matchId)
          .single()
        
        if (error) {
          console.error('Error loading match data:', error)
          return
        }
        
        if (matchData) {
          setBetAmount(matchData.bet_amount || 0)
          setGameId(matchData.game_id)
          
          // Check if this is a tournament match
          const { data: tournamentMatch } = await supabase
            .from('tournament_matches')
            .select('tournament_id')
            .eq('match_id', matchId)
            .single()
          
          if (tournamentMatch) {
            setIsTournamentMatch(true)
            console.log('🏆 This is a tournament match, rematch disabled')
          }
          
          // Check for rematch requests if game is completed
          if (matchData.status === 'completed' && !tournamentMatch) {
            const gameData = matchData.game_data || {}
            if (gameData.rematch_requested_by) {
              const requestedBy = gameData.rematch_requested_by
              if (requestedBy !== currentUserId) {
                setRematchStatus('received')
                setRematchRequestedBy(requestedBy)
              } else {
                setRematchStatus('requested')
                setRematchRequestedBy(currentUserId)
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading match data:', error)
      }
    }
    
    loadMatchData()
    
    // Poll for rematch updates every 2 seconds
    const interval = setInterval(loadMatchData, 2000)
    return () => clearInterval(interval)
  }, [matchId, currentUserId])

  // Final result synchronization now handled by database polling - no localStorage needed
  
  // Debug logging
  if (gameState && currentProblem) {
    console.log('🔍 Answer status check:', {
      gameState: {
        currentProblemIndex: gameState.currentProblemIndex,
        player1Answers: gameState.player1Answers.length,
        player2Answers: gameState.player2Answers.length,
        player1Score: gameState.player1Score,
        player2Score: gameState.player2Score,
      },
      bothPlayersAnswered,
      localAnswerSubmitted,
      playerId,
      shouldShowWaiting: localAnswerSubmitted && !bothPlayersAnswered,
      shouldShowBothAnswered: bothPlayersAnswered
    })
  }

  // Initialize game
  useEffect(() => {
    const initializeGame = async () => {
      console.log('🚀 Initializing game, current gameState:', !!gameState)
      
      // Skip localStorage - everything will be loaded from database
      
      // Only create a new game state if we don't have one
      if (!gameState) {
        console.log('🆕 Creating initial game state...')
        const initialState = initializeMultiplayerGame(matchId)
        setGameState(initialState)
        setCurrentProblem(null)
        setTimeRemaining(0)
        // Remove turn-based logic - both players can answer independently
        setBothPlayersReady(false)
        setIsPlayerReady(false)
        // Save initial state to database instead of localStorage
        console.log('✅ Basic game state created')
      }
      
      // Try to load from database in background
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        
        const { data: matchData, error } = await supabase
          .from('matches')
          .select('game_data')
          .eq('id', matchId)
          .single()
        
        if (matchData?.game_data && matchData.game_data.gameState) {
          console.log('🔄 Found existing game state in database, loading...')
          const savedState = matchData.game_data.gameState
          
          // If both players are finished, this is a completed game
          if (savedState.player1Finished && savedState.player2Finished) {
            console.log('🏁 Loading completed game state from database')
            setGameState(savedState)
            setMatchReady(true)
            setBothPlayersReady(true)
            
            // Try to load the final result from database
            const finalResult = matchData.game_data.finalResult
            if (finalResult) {
              console.log('🔄 Loading final result from database:', finalResult)
              setGameResult(finalResult)
            }
            
            return // Skip further processing for completed games
          }
          
          setGameState(savedState)
          
          // Check if both players are ready from database
          const readyState = matchData.game_data.readyState
          const bothReady = readyState?.player1Ready && readyState?.player2Ready
          
          if (bothReady) {
            setBothPlayersReady(true)
            setMatchReady(true)
            console.log('🚀 Both players ready, starting game!')
            
            // For independent play, find the next unanswered problem for this player
            const playerAnswers = isPlayer1 ? savedState.player1Answers : savedState.player2Answers
            const answeredProblemIds = playerAnswers.map(a => a.problemId)
            
            // Find the first problem this player hasn't answered
            let nextProblemIndex = 0
            for (let i = 0; i < savedState.problems.length; i++) {
              if (!answeredProblemIds.includes(savedState.problems[i].id)) {
                nextProblemIndex = i
                break
              }
            }
            
            // If all problems are answered, show the last problem
            if (nextProblemIndex === 0 && answeredProblemIds.length === savedState.problems.length) {
              nextProblemIndex = savedState.problems.length - 1
            }
            
            if (nextProblemIndex < savedState.problems.length) {
              const problemToShow = savedState.problems[nextProblemIndex]
              if (problemToShow) {
                setCurrentProblem(problemToShow)
                setTimeRemaining(problemToShow.timeLimit)
                console.log('🔄 Restored current problem from database:', {
                  problemId: problemToShow.id,
                  question: problemToShow.question,
                  problemIndex: nextProblemIndex,
                  playerAnswers: playerAnswers.length,
                  totalProblems: savedState.problems.length
                })
              }
            }
          } else {
            // Set ready state from database
            if (readyState) {
              const playerReady = isPlayer1 ? readyState.player1Ready : readyState.player2Ready
              setIsPlayerReady(playerReady || false)
            }
          }
          
            // Save to database for persistence
            saveGameStateToDatabase(savedState)
        } else {
          // Save initial state to database
          const initialState = initializeMultiplayerGame(matchId)
          await supabase
            .from('matches')
            .update({
              game_data: {
                gameState: initialState
              }
            })
            .eq('id', matchId)
          console.log('💾 Saved initial game state to database')
        }
      } catch (error) {
        console.error('Error with database operations:', error)
        // Continue with the basic game state we already created
      }
    }
    
    initializeGame()
  }, [matchId, isPlayer1])

  // Storage events removed - using database polling instead

  // Poll for database updates to sync between players
  useEffect(() => {
    let isUpdating = false
    
    const pollForDatabaseUpdates = async () => {
      if (!gameState || isUpdating) return
      
      isUpdating = true
      
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        
        const { data: matchData, error } = await supabase
          .from('matches')
          .select('game_data')
          .eq('id', matchId)
          .single()
        
        if (matchData?.game_data?.gameState) {
          const dbState = matchData.game_data.gameState
          
          // Check if database state is different from component's gameState
          // Check for any changes in finished state, scores, or problem index
          const hasSignificantChanges = 
            !gameState ||
            dbState.player1Finished !== gameState.player1Finished ||
            dbState.player2Finished !== gameState.player2Finished ||
            dbState.currentProblemIndex !== gameState.currentProblemIndex ||
            dbState.player1Score !== gameState.player1Score ||
            dbState.player2Score !== gameState.player2Score ||
            (dbState.player1Answers?.length || 0) !== (gameState.player1Answers?.length || 0) ||
            (dbState.player2Answers?.length || 0) !== (gameState.player2Answers?.length || 0)
          
          if (hasSignificantChanges) {
            console.log('🔄 Significant changes detected, updating...')
            console.log('🔄 Database state:', {
              p1Finished: dbState.player1Finished,
              p2Finished: dbState.player2Finished,
              currentIndex: dbState.currentProblemIndex,
              problemsLength: dbState.problems.length
            })
            console.log('🔄 Component state before update:', {
              p1Finished: gameState?.player1Finished,
              p2Finished: gameState?.player2Finished,
              currentIndex: gameState?.currentProblemIndex,
              problemsLength: gameState?.problems?.length
            })
            
            // Check if we need to force set finished flags based on answer count
            const p1Completed = (dbState.player1Answers?.length || 0) >= (dbState.problems?.length || 0)
            const p2Completed = (dbState.player2Answers?.length || 0) >= (dbState.problems?.length || 0)
            
            let finalDbState = { ...dbState }
            
            // Force set finished flags if players have completed all problems
            if (p1Completed && !dbState.player1Finished) {
              finalDbState.player1Finished = true
              console.log('🔄 Force setting player1Finished = true in database sync')
            }
            
            if (p2Completed && !dbState.player2Finished) {
              finalDbState.player2Finished = true
              console.log('🔄 Force setting player2Finished = true in database sync')
            }
            
            // Correct incorrectly finished players
            if (dbState.player1Finished && !p1Completed) {
              finalDbState.player1Finished = false
              console.log('🔄 Correcting player1Finished = false in database sync (hasn\'t completed all problems)')
            }
            
            if (dbState.player2Finished && !p2Completed) {
              finalDbState.player2Finished = false
              console.log('🔄 Correcting player2Finished = false in database sync (hasn\'t completed all problems)')
            }
            
            // Update local state with database state
            console.log('🔄 Updating local state from database:', {
              p1Finished: finalDbState.player1Finished,
              p2Finished: finalDbState.player2Finished,
              currentIndex: finalDbState.currentProblemIndex,
              p1Answers: finalDbState.player1Answers?.length || 0,
              p2Answers: finalDbState.player2Answers?.length || 0,
              problemsLength: finalDbState.problems?.length || 0
            })
            setGameState(finalDbState)
            
            // Save the updated state back to database if we made changes
            if (finalDbState.player1Finished !== dbState.player1Finished || 
                finalDbState.player2Finished !== dbState.player2Finished) {
              console.log('🔄 Saving updated finished flags to database')
              saveGameStateToDatabase(finalDbState)
            }
            
            // Update current problem if needed - only if both players haven't finished
            if (dbState.currentProblemIndex < dbState.problems.length && 
                !(dbState.player1Finished && dbState.player2Finished)) {
              setCurrentProblem(dbState.problems[dbState.currentProblemIndex])
              setTimeRemaining(dbState.problems[dbState.currentProblemIndex].timeLimit)
            } else if (dbState.player1Finished && dbState.player2Finished) {
              // Both players finished, clear current problem
              setCurrentProblem(null)
              console.log('🏁 Both players finished, clearing current problem')
            } else {
              // One player finished but not both, keep current problem if it exists
              console.log('⏳ One player finished, keeping current problem for other player')
            }
          }
        }
        
        // Also check for ready state updates
        if (matchData?.game_data?.readyState) {
          const readyState = matchData.game_data.readyState
          const bothReady = readyState.player1Ready && readyState.player2Ready
          
          if (bothReady && !bothPlayersReady) {
            setBothPlayersReady(true)
            if (gameState && !currentProblem) {
              setCurrentProblem(gameState.problems[0])
              setTimeRemaining(gameState.problems[0].timeLimit)
              // Remove turn-based logic - both players can answer independently
              console.log('🚀 Both players ready! Starting game...')
            }
          }
        }
      } catch (error) {
        console.error('Error polling for database updates:', error)
      } finally {
        isUpdating = false
      }
    }
    
    // Poll every 3 seconds to reduce flickering
    const interval = setInterval(pollForDatabaseUpdates, 3000)
    return () => clearInterval(interval)
  }, [matchId, gameState, bothPlayersReady, currentProblem])

  // Timer countdown
  useEffect(() => {
    if (!gameState || !currentProblem || gameState.player1Finished && gameState.player2Finished) return

    // Start timer when game state is available and we have a current problem
    console.log('⏰ Starting timer for problem:', currentProblem.id, 'Time limit:', currentProblem.timeLimit)
    setTimeRemaining(currentProblem.timeLimit)

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        console.log('⏰ Timer tick:', prev, 'localAnswerSubmitted:', localAnswerSubmitted)
        if (prev <= 1) {
          // Time's up - submit no answer
          console.log('⏰ Time up! Submitting no answer')
          handleAnswer(-1) // -1 indicates no answer/timeout
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [currentProblem]) // Only depend on currentProblem

  // Update opponent progress from game state - only when specific values change to prevent infinite loops
  useEffect(() => {
    if (!gameState) return
    
    const opponentAnswers = isPlayer1 ? gameState.player2Answers : gameState.player1Answers
    const opponentScore = isPlayer1 ? gameState.player2Score : gameState.player1Score
    
    // Only update if the value actually changed to prevent infinite loops
    setOpponentProgress(prev => {
      const newProgress = opponentAnswers.length
      if (prev !== newProgress) {
    console.log('🔄 Opponent progress updated from game state:', {
      isPlayer1,
      opponentAnswers: opponentAnswers.length,
      opponentScore,
      player1Score: gameState.player1Score,
      player2Score: gameState.player2Score,
      p1AnswersLength: gameState.player1Answers?.length || 0,
      p2AnswersLength: gameState.player2Answers?.length || 0
    })
        return newProgress
      }
      return prev
    })
  }, [gameState?.player1Answers?.length, gameState?.player2Answers?.length, gameState?.player1Score, gameState?.player2Score, isPlayer1])

  // Initialize current problem when game starts
  useEffect(() => {
    if (!gameState || !gameState.problems || !bothPlayersReady) return
    if (currentProblem) return // Already initialized
    
    // Start with the first problem
    console.log('🚀 Initializing first problem:', gameState.problems[0]?.question)
    setCurrentProblem(gameState.problems[0])
    setTimeRemaining(gameState.problems[0]?.timeLimit || 15)
    setMyCurrentProblemIndex(0)
  }, [gameState?.problems, bothPlayersReady, currentProblem])
  
  // Simple: update problem when index changes
  useEffect(() => {
    console.log('🔍 useEffect triggered:', { 
      hasProblems: !!gameState?.problems, 
      myCurrentProblemIndex, 
      problemsLength: gameState?.problems?.length,
      currentProblemQuestion: currentProblem?.question
    })
    
    if (!gameState?.problems || myCurrentProblemIndex < 0) {
      console.log('❌ Bailing out:', { hasProblems: !!gameState?.problems, index: myCurrentProblemIndex })
      return
    }
    
    // Check if player is finished - don't update problem if finished
    const currentPlayerAnswers = isPlayer1 ? gameState.player1Answers : gameState.player2Answers
    const isFinished = currentPlayerAnswers.length >= gameState.problems.length || 
                       (isPlayer1 ? gameState.player1Finished : gameState.player2Finished)
    
    if (isFinished) {
      console.log('✅ Player finished, not updating problem')
      setCurrentProblem(null) // Clear problem to show finished screen
      return
    }
    
    const problem = gameState.problems[myCurrentProblemIndex]
    console.log('📋 Found problem:', { index: myCurrentProblemIndex, question: problem?.question, isDifferent: problem !== currentProblem })
    
    if (problem) {
      // Check if it's actually a different problem (by ID or question)
      const isDifferent = !currentProblem || problem.id !== currentProblem.id || problem.question !== currentProblem.question
      
      if (isDifferent) {
        console.log('✅ Updating problem:', problem.question)
        setCurrentProblem(problem)
        setTimeRemaining(problem.timeLimit)
        setLocalAnswerSubmitted(false) // Reset here
        console.log('✅ Cleared localAnswerSubmitted')
      }
      } else {
      console.log('⚠️ Problem not found at index:', myCurrentProblemIndex)
    }
  }, [myCurrentProblemIndex, gameState?.problems, gameState?.player1Answers, gameState?.player2Answers, gameState?.player1Finished, gameState?.player2Finished, isPlayer1, currentProblem])
  
  // Always clear localAnswerSubmitted when problem changes
  useEffect(() => {
    if (currentProblem) {
      console.log('🔄 Problem ID changed to:', currentProblem.id)
      setLocalAnswerSubmitted(false)
      console.log('✅ Set localAnswerSubmitted to false')
    }
  }, [currentProblem?.id])

  // Database-only polling to sync state between players
  useEffect(() => {
    const pollDatabaseForUpdates = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        
        const { data: matchData, error } = await supabase
          .from('matches')
          .select('game_data')
          .eq('id', matchId)
          .single()
        
        if (error) {
          console.error('❌ Error polling database:', error)
          return
        }
        
        if (matchData?.game_data?.gameState) {
          const dbState = matchData.game_data.gameState
          
          // Check if game is completed
          if (dbState.player1Finished && dbState.player2Finished) {
            console.log('🏁 Game completed, loading final result from database')
            const finalResult = matchData.game_data.finalResult
            if (finalResult && !gameResult) {
              setGameResult(finalResult)
              console.log('🔄 Final result loaded from database:', finalResult)
              return
            }
          }
          
          // Sync the state from database
        setGameState(currentState => {
          if (!currentState) return currentState
          
            if (dbState.currentProblemIndex !== currentState.currentProblemIndex ||
                dbState.player1Answers.length !== currentState.player1Answers.length ||
                dbState.player2Answers.length !== currentState.player2Answers.length ||
                dbState.player1Score !== currentState.player1Score ||
                dbState.player2Score !== currentState.player2Score ||
                dbState.player1Finished !== currentState.player1Finished ||
                dbState.player2Finished !== currentState.player2Finished) {
              
              console.log('🔄 Syncing state from database:', {
                dbIndex: dbState.currentProblemIndex,
              localIndex: currentState.currentProblemIndex,
                dbP1: dbState.player1Answers.length,
              localP1: currentState.player1Answers.length,
                dbP2: dbState.player2Answers.length,
              localP2: currentState.player2Answers.length,
                dbP1Score: dbState.player1Score,
              localP1Score: currentState.player1Score,
                dbP2Score: dbState.player2Score,
              localP2Score: currentState.player2Score,
                gameFinished: dbState.player1Finished && dbState.player2Finished
              })
              
              // Check if both players are now finished after syncing
              const bothFinished = dbState.player1Finished && dbState.player2Finished
              const p1ActuallyFinished = dbState.player1Answers.length >= dbState.problems.length
              const p2ActuallyFinished = dbState.player2Answers.length >= dbState.problems.length
              
              if (bothFinished && p1ActuallyFinished && p2ActuallyFinished && !gameResult) {
                console.log('🏁 Database polling detected both players finished! Calculating result...')
                
                const finalResult = matchData.game_data.finalResult
                if (finalResult) {
                  console.log('🔄 Using existing result from database (polling):', finalResult)
                  setGameResult(finalResult)
                } else {
                  const result = calculateMultiplayerResult(dbState)
                  console.log('🎯 Calculated new result (database polling):', result)
                  setGameResult(result)
                  saveGameStateToDatabase(dbState, result)
                }
              }
              
              // Return the database state
              return dbState
          }
          
          return currentState
        })
        }
      } catch (error) {
        console.error('❌ Error in database polling:', error)
      }
    }

    const interval = setInterval(pollDatabaseForUpdates, 1000) // Poll database every 1 second
    return () => clearInterval(interval)
  }, [matchId, gameResult])

  // Check if match is ready to start by looking at match status
  useEffect(() => {
    const checkMatchStatus = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        
        const { data: matchData } = await supabase
          .from('matches')
          .select('status, game_data')
          .eq('id', matchId)
          .single()
        
        if (matchData) {
          console.log('🔍 Match status:', matchData.status)
          // If match status is 'in_progress' or 'waiting' with both players, consider it ready
          if (matchData.status === 'in_progress') {
            setMatchReady(true)
            setBothPlayersReady(true)
            console.log('✅ Match is in progress, starting game...')
          } else if (matchData.status === 'waiting' && player1Id && player2Id) {
            // If match is waiting but both players are present, start the game
            setMatchReady(true)
            setBothPlayersReady(true)
            console.log('✅ Match is waiting but both players present, starting game...')
          }
        }
      } catch (error) {
        console.error('Error checking match status:', error)
      }
    }
    
    checkMatchStatus()
    // Check every 2 seconds
    const interval = setInterval(checkMatchStatus, 2000)
    return () => clearInterval(interval)
  }, [matchId])

  const handleAnswer = useCallback((answer: number) => {
    console.log('🎯 HandleAnswer called:', { 
      answer, 
      hasGameState: !!gameState, 
      hasCurrentProblem: !!currentProblem,
      // isMyTurn, // Removed turn-based logic
      localAnswerSubmitted,
      currentProblemIndex: gameState?.currentProblemIndex
    })
    
    if (!gameState || !currentProblem) {
      console.log('⚠️ Cannot answer - missing state:', { 
        hasGameState: !!gameState, 
        hasCurrentProblem: !!currentProblem
      })
      return
    }
    
    // Additional safety check - ensure the current problem index is valid
    if (gameState.currentProblemIndex >= gameState.problems.length) {
      console.log('⚠️ Cannot answer - current problem index is out of bounds:', {
        currentIndex: gameState.currentProblemIndex,
        problemsLength: gameState.problems.length
      })
      console.log('🔧 Attempting to fix out of bounds index...')
      
      // Fix the out of bounds index by setting it to the last valid index
      const fixedIndex = Math.min(gameState.currentProblemIndex, gameState.problems.length - 1)
      console.log('🔧 Fixed index:', fixedIndex)
      
      // Update the game state with the corrected index
      const correctedGameState = {
        ...gameState,
        currentProblemIndex: fixedIndex
      }
      
      setGameState(correctedGameState)
      saveGameStateToDatabase(correctedGameState)
      
      // Update the current problem to match the corrected index
      if (correctedGameState.problems[fixedIndex]) {
        setCurrentProblem(correctedGameState.problems[fixedIndex])
        setTimeRemaining(correctedGameState.problems[fixedIndex].timeLimit)
        console.log('🔧 Updated current problem to index:', fixedIndex)
      }
      
      return
    }

    // Check if player is already finished - don't allow more answers
    const currentPlayerAnswers = isPlayer1 ? gameState.player1Answers : gameState.player2Answers
    const isAlreadyFinished = currentPlayerAnswers.length >= gameState.problems.length || 
                              (isPlayer1 ? gameState.player1Finished : gameState.player2Finished)
    
    if (isAlreadyFinished) {
      console.log('⚠️ Player already finished, ignoring answer')
      return
    }
    
    if (localAnswerSubmitted) {
      console.log('⚠️ Already submitting answer, ignoring')
      return
    }

    console.log('🎯 ANSWERING NOW:', { answer, problemIndex: myCurrentProblemIndex, playerId })
    
    // Check if myCurrentProblemIndex is out of sync
    if (currentPlayerAnswers.length > 0 && myCurrentProblemIndex === 0) {
      console.log('🔧 SYNC ISSUE: myCurrentProblemIndex is 0 but have', currentPlayerAnswers.length, 'answers. Fixing...')
      setMyCurrentProblemIndex(currentPlayerAnswers.length)
      // Don't return - let the answer be processed
    }
    console.log('🎯 Player details:', { isPlayer1, playerId, currentUserId, player1Id })
    console.log('🎯 Current game state before answer:', {
      currentProblemIndex: gameState.currentProblemIndex,
      totalProblems: gameState.problems.length,
      player1Answers: gameState.player1Answers.length,
      player2Answers: gameState.player2Answers.length,
      player1Finished: gameState.player1Finished,
      player2Finished: gameState.player2Finished
    })
    
    // Mark as answered locally to prevent multiple clicks
    setLocalAnswerSubmitted(true)
    console.log('🔒 Set localAnswerSubmitted = true for', playerId)
    
    const timeSpent = currentProblem.timeLimit - timeRemaining
    
    // Simple: just add the answer to this player's array
    // currentPlayerAnswers already declared above
    const isCorrect = answer === currentProblem.answer
    
    // Check if already answered this problem
    if (currentPlayerAnswers.some(a => a.problemId === currentProblem.id)) {
      console.log('⚠️ Already answered this problem, but allowing to proceed')
      // Don't return - let it process anyway to move forward
    }
    
    const playerAnswer = {
      problemId: currentProblem.id,
      answer,
      isCorrect,
      timeSpent,
      timestamp: Date.now()
    }
    
    // Update game state with new answer
    const newGameState = {
      ...gameState,
      [isPlayer1 ? 'player1Answers' : 'player2Answers']: [...currentPlayerAnswers, playerAnswer],
      [isPlayer1 ? 'player1Score' : 'player2Score']: gameState[isPlayer1 ? 'player1Score' : 'player2Score'] + (isCorrect ? 10 : 0)
    }
    
    console.log('🔄 New game state after submitPlayerAnswer:', { 
      currentProblemIndex: newGameState.currentProblemIndex, 
      player1Answers: newGameState.player1Answers.length,
      player2Answers: newGameState.player2Answers.length,
      winner: newGameState.winner,
      problemsLength: newGameState.problems.length,
      isFinished: newGameState.currentProblemIndex >= newGameState.problems.length
    })
    
    // Check if this player should finish
    const shouldFinish = newGameState.currentProblemIndex >= newGameState.problems.length
    console.log('🔍 Should this player finish?', {
      shouldFinish,
      currentIndex: newGameState.currentProblemIndex,
      totalProblems: newGameState.problems.length,
      playerId,
      player1Answers: newGameState.player1Answers.length,
      player2Answers: newGameState.player2Answers.length
    })
    
    if (shouldFinish) {
      console.log('🏁 Player should finish! Current state:', {
        player1Finished: newGameState.player1Finished,
        player2Finished: newGameState.player2Finished,
        bothFinished: newGameState.player1Finished && newGameState.player2Finished
      })
    }
    
    // Update and save
    setGameState(newGameState)
    saveGameStateToDatabase(newGameState)
    
    // Check if finished
    const myAnswers = isPlayer1 ? newGameState.player1Answers : newGameState.player2Answers
    const isFinished = myAnswers.length >= gameState.problems.length
    
    // Check if finished FIRST - before trying to move to next problem
    if (isFinished) {
      // Player is finished - set finished state and clear current problem
      const finishedState = {
        ...newGameState,
        [isPlayer1 ? 'player1Finished' : 'player2Finished']: true
      }
      setGameState(finishedState)
      saveGameStateToDatabase(finishedState)
      setCurrentProblem(null) // Clear current problem to show finished screen
      setLocalAnswerSubmitted(false) // Reset to allow UI updates
      
      // Check if both done
      const p1Done = finishedState.player1Answers.length >= gameState.problems.length
      const p2Done = finishedState.player2Answers.length >= gameState.problems.length
      
      if (p1Done && p2Done && !gameResult) {
        const result = calculateMultiplayerResult(finishedState)
        setGameResult(result)
        saveGameStateToDatabase(finishedState, result)
        onGameComplete?.(result.winner)
      }
      return // Exit early - don't try to move to next problem
    }
    
    // Move to next problem (only if not finished)
    const nextIndex = myAnswers.length
    console.log(`⏭️ Moving to problem ${nextIndex + 1}, current: ${myCurrentProblemIndex}`)
    
    // Update immediately
    setMyCurrentProblemIndex(nextIndex)
    
    // Force update the problem after a short delay in case the useEffect doesn't trigger
    setTimeout(() => {
      console.log('⏰ Timeout: Forcing problem update', { nextIndex, problemsLength: newGameState.problems.length })
      if (newGameState.problems[nextIndex]) {
        console.log('✅ Updating to problem:', newGameState.problems[nextIndex].question)
        setCurrentProblem(newGameState.problems[nextIndex])
        setTimeRemaining(newGameState.problems[nextIndex].timeLimit)
        setLocalAnswerSubmitted(false)
      } else {
        console.log('❌ Problem not found at index:', nextIndex)
        setLocalAnswerSubmitted(false) // Reset even if problem not found
      }
    }, 200)
  }, [gameState, currentProblem, isPlayer1, onGameComplete, gameResult, myCurrentProblemIndex, localAnswerSubmitted, playerId, timeRemaining, saveGameStateToDatabase])

  const handleStartGame = () => {
    setShowInstructions(false)
  }

  // Determine opponent info
  useEffect(() => {
    if (player1Id && player2Id && currentUserId) {
      const opponent = currentUserId === player1Id ? player2Id : player1Id
      setOpponentId(opponent)
      
      // Fetch opponent name
      const fetchOpponentName = async () => {
        try {
          const supabase = createClient()
          const { data } = await supabase
            .from('users')
            .select('username, full_name')
            .eq('id', opponent)
            .single()
          
          if (data) {
            setOpponentName(data.full_name || data.username || 'Opponent')
          }
        } catch (error) {
          console.error('Error fetching opponent name:', error)
        }
      }
      
      fetchOpponentName()
    }
  }, [player1Id, player2Id, currentUserId])
  
  // Check friend status
  useEffect(() => {
    const checkFriendStatus = async () => {
      if (!currentUserId || !opponentId) return
      
      setFriendStatus('checking')
      try {
        const [friendsResult, sentRequestsResult, pendingRequestsResult] = await Promise.all([
          getFriends(),
          getSentRequests(),
          getPendingRequests()
        ])
        
        const friends = friendsResult.data || []
        const sentRequests = sentRequestsResult.data || []
        const pendingRequests = pendingRequestsResult.data || []
        
        // Check if already friends
        if (friends.some((f: any) => 
          (f.user_id === currentUserId && f.friend_id === opponentId) ||
          (f.user_id === opponentId && f.friend_id === currentUserId)
        )) {
          setFriendStatus('friends')
          return
        }
        
        // Check if request was sent
        if (sentRequests.some((r: any) => r.friend_id === opponentId)) {
          setFriendStatus('request_sent')
          return
        }
        
        // Check if request was received
        const receivedRequest = pendingRequests.find((r: any) => r.user_id === opponentId)
        if (receivedRequest) {
          setFriendStatus('request_received')
          setPendingRequestId(receivedRequest.id)
          return
        }
        
        setFriendStatus('none')
      } catch (error) {
        console.error('Error checking friend status:', error)
        setFriendStatus('none')
      }
    }
    
    if (currentUserId && opponentId) {
      checkFriendStatus()
    }
  }, [currentUserId, opponentId])
  
  // Handle add friend
  const handleAddFriend = async () => {
    if (!currentUserId || !opponentId || isLoadingFriend) return
    
    setIsLoadingFriend(true)
    try {
      if (friendStatus === 'request_received' && pendingRequestId) {
        // Accept pending request
        await acceptFriendRequest(pendingRequestId)
        setFriendStatus('friends')
        setPendingRequestId(null)
      } else if (friendStatus === 'none') {
        // Send new request
        await sendFriendRequest(currentUserId, opponentId)
        setFriendStatus('request_sent')
      }
    } catch (error) {
      console.error('Error handling friend request:', error)
      alert('Failed to process friend request. Please try again.')
    } finally {
      setIsLoadingFriend(false)
    }
  }
  
  // Rematch functions - defined early so they're available in all render paths
  const requestRematch = async () => {
    if (!currentUserId || !player1Id || !player2Id || !gameId) return
    
    setIsLoadingRematch(true)
    try {
      const supabase = createClient()
      
      // Check if there's already a rematch request
      const { data: matchData } = await supabase
        .from('matches')
        .select('game_data')
        .eq('id', matchId)
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
            rematch_requested_by: currentUserId,
            rematch_requested_at: new Date().toISOString()
          }
        })
        .eq('id', matchId)
      
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
          match_id: matchId,
          user_id: currentUserId,
          action_type: 'rematch_requested',
          action_data: {
            requested_by: currentUserId,
            requested_at: new Date().toISOString(),
            original_match_id: matchId
          }
        })
      
      setRematchStatus('requested')
      setRematchRequestedBy(currentUserId)
    } catch (error) {
      console.error('Error requesting rematch:', error)
    } finally {
      setIsLoadingRematch(false)
    }
  }

  const acceptRematch = async () => {
    if (!currentUserId || !player1Id || !player2Id || !gameId) {
      alert('Missing player information. Cannot create rematch.')
      return
    }
    
    setIsLoadingRematch(true)
    try {
      const supabase = createClient()
      
      // Create new match with same players and bet amount
      const { data: newMatch, error: matchError } = await supabase
        .from('matches')
        .insert({
          game_id: gameId,
          player1_id: player1Id,
          player2_id: player2Id,
          bet_amount: betAmount,
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
          match_id: matchId,
          user_id: currentUserId,
          action_type: 'rematch_accepted',
          action_data: {
            accepted_by: currentUserId,
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
    if (!currentUserId) return
    
    setIsLoadingRematch(true)
    try {
      const supabase = createClient()
      
      await supabase
        .from('match_history')
        .insert({
          match_id: matchId,
          user_id: currentUserId,
          action_type: 'rematch_rejected',
          action_data: {
            rejected_by: currentUserId,
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

  if (showInstructions) {
    return (
      <Card className="w-full max-w-4xl mx-auto bg-gray-900/50 border-gray-800">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-orange-500 rounded-full">
              <Users className="h-8 w-8 text-black" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-white">Multiplayer Math Blitz</CardTitle>
          <p className="text-gray-400 text-lg">Compete head-to-head with multiplication problems!</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">How to Play</h3>
              <div className="space-y-3 text-gray-300">
                <div className="flex items-center space-x-3">
                  <Target className="h-5 w-5 text-orange-500" />
                  <span>10 synchronized multiplication problems</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Timer className="h-5 w-5 text-orange-500" />
                  <span>Timed questions with urgency</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Trophy className="h-5 w-5 text-orange-500" />
                  <span>Winner determined by overall score (points + accuracy + speed)</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Zap className="h-5 w-5 text-orange-500" />
                  <span>Real-time opponent progress tracking</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">Scoring</h3>
              <div className="space-y-3 text-gray-300">
                <div className="flex justify-between">
                  <span>Easy (1-12×):</span>
                  <span className="text-green-400">10 pts + bonuses</span>
                </div>
                <div className="flex justify-between">
                  <span>Medium (1-15×):</span>
                  <span className="text-yellow-400">15 pts + bonuses</span>
                </div>
                <div className="flex justify-between">
                  <span>Hard (1-20×):</span>
                  <span className="text-red-400">20 pts + bonuses</span>
                </div>
                <div className="flex justify-between">
                  <span>Speed Bonus:</span>
                  <span className="text-blue-400">Up to 10 pts</span>
                </div>
                <div className="flex justify-between">
                  <span>Streak Bonus:</span>
                  <span className="text-purple-400">Every 3 correct</span>
                </div>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={handleStartGame}
            className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold py-6 text-lg"
          >
            Start Multiplayer Game!
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (gameResult) {
    const myResult = isPlayer1 ? gameResult.player1Result : gameResult.player2Result
    const opponentResult = isPlayer1 ? gameResult.player2Result : gameResult.player1Result
    const isWinner = gameResult.winner === playerId
    const isDraw = gameResult.winner === 'draw'

    return (
      <Card className="w-full max-w-4xl mx-auto bg-gray-900/50 border-gray-800">
        <CardHeader className="text-center pb-3 sm:pb-6">
          <div className="flex items-center justify-center gap-3 mb-2 sm:mb-4">
            <div className={`p-2 sm:p-3 rounded-full ${isWinner ? 'bg-yellow-500' : isDraw ? 'bg-gray-500' : 'bg-red-500'}`}>
              {isWinner ? <Trophy className="h-5 w-5 sm:h-8 sm:w-8 text-black" /> : 
               isDraw ? <CheckCircle className="h-5 w-5 sm:h-8 sm:w-8 text-black" /> : 
               <XCircle className="h-5 w-5 sm:h-8 sm:w-8 text-black" />}
            </div>
            <CardTitle className="text-xl sm:text-3xl font-bold text-white">
            {isWinner ? 'You Won!' : isDraw ? "It's a Draw!" : 'You Lost!'}
          </CardTitle>
          </div>
          <p className="text-sm sm:text-base text-gray-400">
            {isWinner ? 'Congratulations on your victory!' : 
             isDraw ? 'Both players performed equally well!' : 
             'Better luck next time!'}
          </p>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-6">
          {/* Rematch Request Section - Only show for non-tournament matches */}
          {!isTournamentMatch && (
            <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4">
              <h3 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-4">Rematch Request</h3>
              
              {rematchStatus === 'none' && (
                <div className="text-center">
                  <p className="text-sm sm:text-base text-gray-300 mb-2 sm:mb-4">Want to play again?</p>
                  <button
                    onClick={requestRematch}
                    disabled={isLoadingRematch}
                    className="px-4 sm:px-6 py-1.5 sm:py-2 text-sm sm:text-base bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    {isLoadingRematch ? 'Requesting...' : 'Request Rematch'}
                  </button>
                  <p className="text-gray-500 text-xs mt-1 sm:mt-2">Only one player can request a rematch</p>
                </div>
              )}
              
              {rematchStatus === 'requested' && (
                <div className="text-center">
                  <p className="text-blue-400 mb-4">✅ Rematch request sent!</p>
                  <p className="text-gray-400 text-sm">Waiting for opponent to respond...</p>
                </div>
              )}
              
              {rematchStatus === 'accepted' && (
                <div className="text-center">
                  <p className="text-green-400 mb-4">🎉 Rematch accepted! Creating new game...</p>
                  <p className="text-gray-400 text-sm">Redirecting to new match...</p>
                </div>
              )}
              
              {rematchStatus === 'received' && (
                <div className="text-center">
                  <p className="text-yellow-400 mb-4">🎮 Opponent wants a rematch!</p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={acceptRematch}
                      disabled={isLoadingRematch}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                    >
                      {isLoadingRematch ? 'Accepting...' : 'Accept'}
                    </button>
                    <button
                      onClick={rejectRematch}
                      disabled={isLoadingRematch}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                    >
                      {isLoadingRematch ? 'Rejecting...' : 'Decline'}
                    </button>
                  </div>
                </div>
              )}
              
              {rematchStatus === 'rejected' && (
                <div className="text-center">
                  <p className="text-red-400 mb-4">❌ Rematch declined by opponent</p>
                  <button
                    onClick={() => {
                      setRematchStatus('none')
                      setRematchRequestedBy(null)
                    }}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Request Again
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Results Comparison */}
          <div className="grid md:grid-cols-2 gap-3 sm:gap-6">
            <div className={`p-3 sm:p-6 rounded-lg ${isPlayer1 && isWinner ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-gray-800/30'}`}>
              <h3 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-4">Your Results</h3>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base text-gray-400">Composite Score:</span>
                  <span className="text-white font-bold text-lg sm:text-xl">{myResult.compositeScore || myResult.score}</span>
                </div>
                {myResult.scoreBreakdown && (
                  <div className="space-y-1 text-xs bg-gray-800/30 p-2 rounded">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Base: {myResult.scoreBreakdown.baseScore}</span>
                      <span className="text-green-400">+Acc: {myResult.scoreBreakdown.accuracyBonus}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-400">+Speed: {myResult.scoreBreakdown.speedBonus}</span>
                      <span className="text-purple-400">+Cons: {myResult.scoreBreakdown.consistencyBonus}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-yellow-400">+Complete: {myResult.scoreBreakdown.completionBonus}</span>
                      <span className="text-white font-semibold">= {myResult.compositeScore}</span>
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base text-gray-400">Problems Solved:</span>
                  <span className="text-green-400 font-semibold text-sm sm:text-base">{myResult.problemsSolved}/10</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base text-gray-400">Accuracy:</span>
                  <span className="text-blue-400 font-semibold text-sm sm:text-base">{myResult.accuracy}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base text-gray-400">Total Time:</span>
                  <span className="text-purple-400 font-semibold text-sm sm:text-base">{myResult.totalTime}s</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base text-gray-400">Best Streak:</span>
                  <span className="text-orange-400 font-semibold text-sm sm:text-base">{myResult.streak}</span>
                </div>
              </div>
            </div>

            <div className={`p-3 sm:p-6 rounded-lg ${!isPlayer1 && isWinner ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-gray-800/30'}`}>
              <h3 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-4">Opponent Results</h3>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base text-gray-400">Composite Score:</span>
                  <span className="text-white font-bold text-lg sm:text-xl">{opponentResult.compositeScore || opponentResult.score}</span>
                </div>
                {opponentResult.scoreBreakdown && (
                  <div className="space-y-1 text-xs bg-gray-800/30 p-2 rounded">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Base: {opponentResult.scoreBreakdown.baseScore}</span>
                      <span className="text-green-400">+Acc: {opponentResult.scoreBreakdown.accuracyBonus}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-400">+Speed: {opponentResult.scoreBreakdown.speedBonus}</span>
                      <span className="text-purple-400">+Cons: {opponentResult.scoreBreakdown.consistencyBonus}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-yellow-400">+Complete: {opponentResult.scoreBreakdown.completionBonus}</span>
                      <span className="text-white font-semibold">= {opponentResult.compositeScore}</span>
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base text-gray-400">Problems Solved:</span>
                  <span className="text-green-400 font-semibold text-sm sm:text-base">{opponentResult.problemsSolved}/10</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base text-gray-400">Accuracy:</span>
                  <span className="text-blue-400 font-semibold text-sm sm:text-base">{opponentResult.accuracy}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base text-gray-400">Total Time:</span>
                  <span className="text-purple-400 font-semibold text-sm sm:text-base">{opponentResult.totalTime}s</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base text-gray-400">Best Streak:</span>
                  <span className="text-orange-400 font-semibold text-sm sm:text-base">{opponentResult.streak}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Win Reason */}
          <Alert className="bg-gray-800/50 border-gray-700">
            <Trophy className="h-4 w-4" />
            <AlertDescription className="text-gray-300">
              Winner determined by: <span className="text-white font-semibold capitalize">
                {gameResult.winReason === 'composite' ? 'Overall Performance' : gameResult.winReason}
              </span>
            </AlertDescription>
          </Alert>
          
        </CardContent>
      </Card>
    )
  }

  if (!gameState) {
    console.log('🔄 No game state, showing loading...')
    return (
      <Card className="w-full max-w-4xl mx-auto bg-gray-900/50 border-gray-800">
        <CardContent className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading game...</p>
        </CardContent>
      </Card>
    )
  }

  // Don't render questions if both players are finished
  if (gameState.player1Finished && gameState.player2Finished) {
    console.log('🏁 Game finished, not rendering questions')
    console.log('🏁 GameResult status:', {
      hasGameResult: !!gameResult,
      gameResult: gameResult,
      gameState: {
        player1Finished: gameState.player1Finished,
        player2Finished: gameState.player2Finished,
        player1Answers: gameState.player1Answers.length,
        player2Answers: gameState.player2Answers.length
      }
    })
    
    // If no game result, try to calculate it
    if (!gameResult) {
      console.log('🔄 No game result found, calculating...')
      const result = calculateMultiplayerResult(gameState)
      console.log('🎯 Calculated result:', result)
      setGameResult(result)
    }

  // Show results instead of questions
    if (gameResult) {
      console.log('🎯 Rendering results:', gameResult)
      const result = gameResult as MultiplayerResult
      const myResult = isPlayer1 ? result.player1Result : result.player2Result
      const opponentResult = isPlayer1 ? result.player2Result : result.player1Result
      const isWinner = result.winner === playerId
      const isDraw = result.winner === 'draw'

      return (
        <Card className="w-full max-w-4xl mx-auto bg-gray-900/50 border-gray-800">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className={`p-3 rounded-full ${isWinner ? 'bg-yellow-500' : isDraw ? 'bg-gray-500' : 'bg-red-500'}`}>
                {isWinner ? <Trophy className="h-8 w-8 text-black" /> : 
                 isDraw ? <CheckCircle className="h-8 w-8 text-black" /> : 
                 <XCircle className="h-8 w-8 text-black" />}
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-white">
              {isWinner ? 'You Won!' : isDraw ? "It's a Draw!" : 'You Lost!'}
            </CardTitle>
            <p className="text-gray-400">
              {isWinner ? 'Congratulations on your victory!' : 
               isDraw ? 'Both players performed equally well!' : 
               'Better luck next time!'}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Results Comparison */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className={`p-6 rounded-lg ${isPlayer1 && isWinner ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-gray-800/30'}`}>
                <h3 className="text-lg font-semibold text-white mb-4">Your Results</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Composite Score:</span>
                    <span className="text-white font-bold text-xl">{myResult.compositeScore || myResult.score}</span>
                  </div>
                  {myResult.scoreBreakdown && (
                    <div className="space-y-1 text-xs bg-gray-800/30 p-2 rounded">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Base: {myResult.scoreBreakdown.baseScore}</span>
                        <span className="text-green-400">+Acc: {myResult.scoreBreakdown.accuracyBonus}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-400">+Speed: {myResult.scoreBreakdown.speedBonus}</span>
                        <span className="text-purple-400">+Cons: {myResult.scoreBreakdown.consistencyBonus}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-yellow-400">+Comp: {myResult.scoreBreakdown.completionBonus}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className={`p-6 rounded-lg ${!isPlayer1 && isWinner ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-gray-800/30'}`}>
                <h3 className="text-lg font-semibold text-white mb-4">Opponent Results</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Composite Score:</span>
                    <span className="text-white font-bold text-xl">{opponentResult.compositeScore || opponentResult.score}</span>
                  </div>
                  {opponentResult.scoreBreakdown && (
                    <div className="space-y-1 text-xs bg-gray-800/30 p-2 rounded">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Base: {opponentResult.scoreBreakdown.baseScore}</span>
                        <span className="text-green-400">+Acc: {opponentResult.scoreBreakdown.accuracyBonus}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-400">+Speed: {opponentResult.scoreBreakdown.speedBonus}</span>
                        <span className="text-purple-400">+Cons: {opponentResult.scoreBreakdown.consistencyBonus}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-yellow-400">+Comp: {opponentResult.scoreBreakdown.completionBonus}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    } else {
      return (
        <Card className="w-full max-w-4xl mx-auto bg-gray-900/50 border-gray-800">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-white">Calculating Results...</CardTitle>
            <p className="text-gray-400">Please wait while we calculate the final scores.</p>
          </CardHeader>
        </Card>
      )
    }
  }
  
  // Also don't render if we're past the last question AND both players are finished
  if (gameState.currentProblemIndex >= gameState.problems.length && 
      gameState.player1Finished && gameState.player2Finished) {
    console.log('⚠️ Past last question and both players finished, not rendering questions:', {
      currentIndex: gameState.currentProblemIndex,
      problemsLength: gameState.problems.length,
      p1Finished: gameState.player1Finished,
      p2Finished: gameState.player2Finished
    })
    
    // If both players are finished, show results
    if (gameState.player1Finished && gameState.player2Finished) {
      console.log('🏁 Both players finished, showing results from past last question check')
      
      // If no game result, try to calculate it
      if (!gameResult) {
        console.log('🔄 No game result found, calculating from past last question check...')
        const result = calculateMultiplayerResult(gameState)
        console.log('🎯 Calculated result from past last question check:', result)
        setGameResult(result)
      }
      
      // Show results instead of null
      if (gameResult) {
        console.log('🎯 Rendering results from past last question check:', gameResult)
        const result = gameResult as MultiplayerResult
        const myResult = isPlayer1 ? result.player1Result : result.player2Result
        const opponentResult = isPlayer1 ? result.player2Result : result.player1Result
        const isWinner = result.winner === playerId
        const isDraw = result.winner === 'draw'

        return (
          <Card className="w-full max-w-4xl mx-auto bg-gray-900/50 border-gray-800">
            <CardHeader className="text-center">
              <div className="text-6xl mb-4">🏆</div>
              <h2 className="text-3xl font-bold text-white mb-2">
                {isDraw ? "It's a Draw!" : isWinner ? "You Won!" : "You Lost!"}
              </h2>
              <p className="text-gray-400">
                {isDraw ? "Both players performed equally well!" : 
                 isWinner ? "Congratulations on your victory!" : 
                 "Better luck next time!"}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className={`p-4 rounded-lg ${isPlayer1 ? 'bg-orange-500/20 border border-orange-500/30' : 'bg-gray-800/30'}`}>
                  <h3 className="text-lg font-semibold text-white mb-2">Your Score</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Score:</span>
                      <span className="text-white font-semibold">{myResult.score}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Problems Solved:</span>
                      <span className="text-white">{myResult.problemsSolved}/10</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Accuracy:</span>
                      <span className="text-white">{(myResult.accuracy * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Time:</span>
                      <span className="text-white">{myResult.totalTime.toFixed(1)}s</span>
                    </div>
                  </div>
                </div>
                <div className={`p-4 rounded-lg ${isPlayer1 ? 'bg-gray-800/30' : 'bg-orange-500/20 border border-orange-500/30'}`}>
                  <h3 className="text-lg font-semibold text-white mb-2">Opponent Score</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Score:</span>
                      <span className="text-white font-semibold">{opponentResult.score}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Problems Solved:</span>
                      <span className="text-white">{opponentResult.problemsSolved}/10</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Accuracy:</span>
                      <span className="text-white">{(opponentResult.accuracy * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Time:</span>
                      <span className="text-white">{opponentResult.totalTime.toFixed(1)}s</span>
                    </div>
                  </div>
                </div>
              </div>
              <Alert className="bg-gray-800/50 border-gray-700">
                <Trophy className="h-4 w-4" />
                <AlertDescription className="text-gray-300">
                  Winner determined by: <span className="text-white font-semibold capitalize">
                    {result.winReason === 'composite' ? 'Overall Performance' : result.winReason}
                  </span>
                </AlertDescription>
              </Alert>
              
              {/* Rematch Request Section - Only show for non-tournament matches */}
              {!isTournamentMatch && (
                <div className="mt-6 bg-gray-800/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Rematch Request</h3>
                  
                  {rematchStatus === 'none' && (
                    <div className="text-center">
                      <p className="text-gray-300 mb-4">Want to play again?</p>
                      <button
                        onClick={requestRematch}
                        disabled={isLoadingRematch}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                      >
                        {isLoadingRematch ? 'Requesting...' : 'Request Rematch'}
                      </button>
                      <p className="text-gray-500 text-xs mt-2">Only one player can request a rematch</p>
                    </div>
                  )}
                  
                  {rematchStatus === 'requested' && (
                    <div className="text-center">
                      <p className="text-blue-400 mb-4">✅ Rematch request sent!</p>
                      <p className="text-gray-400 text-sm">Waiting for opponent to respond...</p>
                    </div>
                  )}
                  
                  {rematchStatus === 'accepted' && (
                    <div className="text-center">
                      <p className="text-green-400 mb-4">🎉 Rematch accepted! Creating new game...</p>
                      <p className="text-gray-400 text-sm">Redirecting to new match...</p>
                    </div>
                  )}
                  
                  {rematchStatus === 'received' && (
                    <div className="text-center">
                      <p className="text-yellow-400 mb-4">🎮 Opponent wants a rematch!</p>
                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={acceptRematch}
                          disabled={isLoadingRematch}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                        >
                          {isLoadingRematch ? 'Accepting...' : 'Accept'}
                        </button>
                        <button
                          onClick={rejectRematch}
                          disabled={isLoadingRematch}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                        >
                          {isLoadingRematch ? 'Rejecting...' : 'Decline'}
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {rematchStatus === 'rejected' && (
                    <div className="text-center">
                      <p className="text-red-400 mb-4">❌ Rematch declined by opponent</p>
                      <button
                        onClick={() => {
                          setRematchStatus('none')
                          setRematchRequestedBy(null)
                        }}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                      >
                        Request Again
                      </button>
                    </div>
                  )}
                </div>
              )}
            
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center p-4 bg-gray-800 rounded-lg">
                <h3 className="text-xl font-bold text-white mb-2">Player 1</h3>
                <p className="text-3xl font-bold text-orange-500">{gameResult.player1Result.score}</p>
                <p className="text-sm text-gray-400">points</p>
                <div className="text-xs text-gray-500 mt-2">
                  <p>{gameResult.player1Result.problemsSolved}/10 problems</p>
                  <p>{Math.round(gameResult.player1Result.accuracy * 100)}% accuracy</p>
                </div>
              </div>
              <div className="text-center p-4 bg-gray-800 rounded-lg">
                <h3 className="text-xl font-bold text-white mb-2">Player 2</h3>
                <p className="text-3xl font-bold text-orange-500">{gameResult.player2Result.score}</p>
                <p className="text-sm text-gray-400">points</p>
                <div className="text-xs text-gray-500 mt-2">
                  <p>{gameResult.player2Result.problemsSolved}/10 problems</p>
                  <p>{Math.round(gameResult.player2Result.accuracy * 100)}% accuracy</p>
                </div>
              </div>
            </div>
            </CardContent>
          </Card>
        )
      } else {
        console.log('⚠️ No game result available in past last question check')
        return (
          <Card className="w-full max-w-4xl mx-auto bg-gray-900/50 border-gray-800">
            <CardContent className="text-center py-12">
              <div className="text-6xl mb-4">🏆</div>
              <h2 className="text-2xl font-bold text-white mb-4">Game Complete!</h2>
              <p className="text-gray-400">Calculating results...</p>
              <div className="text-xs text-gray-500 mt-4">
                Debug: P1 finished: {gameState.player1Finished ? 'Yes' : 'No'}, 
                P2 finished: {gameState.player2Finished ? 'Yes' : 'No'}, 
                P1 answers: {gameState.player1Answers.length}, 
                P2 answers: {gameState.player2Answers.length}
              </div>
            </CardContent>
          </Card>
        )
      }
    }
    
    // If one player is finished but the other isn't, show waiting screen
    if ((gameState.player1Finished && !gameState.player2Finished) || 
        (!gameState.player1Finished && gameState.player2Finished)) {
      console.log('⏳ One player finished, waiting for the other from past last question check...')
      console.log('⏳ Finished state details:', {
        p1Finished: gameState.player1Finished,
        p2Finished: gameState.player2Finished,
        isPlayer1: isPlayer1,
        currentUserId: currentUserId,
        player1Id: player1Id,
        player2Id: player2Id,
        currentIndex: gameState.currentProblemIndex,
        totalProblems: gameState.problems.length
      })
      return (
        <Card className="w-full max-w-4xl mx-auto bg-gray-900/50 border-gray-800">
          <CardContent className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Waiting for your opponent to finish...</p>
            <p className="text-sm text-gray-500 mt-2">
              {isPlayer1 ? 'Player 2' : 'Player 1'} is still working on their questions
            </p>
          </CardContent>
        </Card>
      )
    }
    
    return null
  }

  // Show ready state if both players aren't ready yet
  console.log('🔍 Ready state check:', { 
    bothPlayersReady, 
    gameState: !!gameState, 
    currentProblem: !!currentProblem,
    gameStateFinished: gameState?.player1Finished && gameState?.player2Finished
  })
  
  
  // Don't show game component ready state - let the match lobby handle it
  // Just show loading until both players are ready
  if (!gameState || !matchReady) {
    console.log('🎯 Waiting for game to start, showing loading...', { 
      hasGameState: !!gameState, 
      matchReady,
      bothPlayersReady 
    })
    return (
      <Card className="w-full max-w-4xl mx-auto bg-gray-900/50 border-gray-800">
        <CardContent className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Waiting for game to start...</p>
        </CardContent>
      </Card>
    )
  }

  // Check if both players are finished - show results
  if (gameState.player1Finished && gameState.player2Finished) {
    console.log('🏁 Both players finished, showing results')
    console.log('🏁 GameResult status:', {
      hasGameResult: !!gameResult,
      gameResult: gameResult,
      gameState: {
        player1Finished: gameState.player1Finished,
        player2Finished: gameState.player2Finished,
        player1Answers: gameState.player1Answers.length,
        player2Answers: gameState.player2Answers.length
      }
    })
    console.log('🎯 RENDERING: Both players finished - showing results')
    
    // If no game result, try to calculate it
    if (!gameResult) {
      console.log('🔄 No game result found, calculating...')
      try {
      const result = calculateMultiplayerResult(gameState)
      console.log('🎯 Calculated result:', result)
      setGameResult(result)
      } catch (error) {
        console.error('❌ Failed to calculate result in results display:', error)
        // Create a fallback result
        const fallbackResult = {
          player1Result: {
            score: gameState.player1Score || 0,
            problemsSolved: gameState.player1Answers.length,
            accuracy: gameState.player1Answers.length > 0 ? 
              gameState.player1Answers.filter(a => a.isCorrect).length / gameState.player1Answers.length : 0,
            totalTime: gameState.player1Answers.reduce((sum, a) => sum + a.timeSpent, 0),
            streak: 0
          },
          player2Result: {
            score: gameState.player2Score || 0,
            problemsSolved: gameState.player2Answers.length,
            accuracy: gameState.player2Answers.length > 0 ? 
              gameState.player2Answers.filter(a => a.isCorrect).length / gameState.player2Answers.length : 0,
            totalTime: gameState.player2Answers.reduce((sum, a) => sum + a.timeSpent, 0),
            streak: 0
          },
          winner: 'player1' as const, // Default to player1 if calculation fails (no ties allowed)
          winReason: 'score' as const
        }
        console.log('🔄 Using fallback result in results display:', fallbackResult)
        setGameResult(fallbackResult)
      }
    }
    
    // Show results screen
    if (gameResult) {
      return (
        <Card className="w-full max-w-4xl mx-auto bg-gray-900/50 border-gray-800">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-white">Game Complete!</CardTitle>
            <p className="text-gray-400">Final Results</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">
                {gameResult.winner === 'player1' ? 'Player 1 Wins!' : 
                 gameResult.winner === 'player2' ? 'Player 2 Wins!' : 'Tie Game!'}
              </h2>
            </div>
            
            {/* Rematch Request Section - Only show for non-tournament matches */}
            {!isTournamentMatch && (
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Rematch Request</h3>
                
                {rematchStatus === 'none' && (
                  <div className="text-center">
                    <p className="text-gray-300 mb-4">Want to play again?</p>
                    <button
                      onClick={requestRematch}
                      disabled={isLoadingRematch}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                    >
                      {isLoadingRematch ? 'Requesting...' : 'Request Rematch'}
                    </button>
                    <p className="text-gray-500 text-xs mt-2">Only one player can request a rematch</p>
                  </div>
                )}
                
                {rematchStatus === 'requested' && (
                  <div className="text-center">
                    <p className="text-blue-400 mb-4">✅ Rematch request sent!</p>
                    <p className="text-gray-400 text-sm">Waiting for opponent to respond...</p>
                  </div>
                )}
                
                {rematchStatus === 'accepted' && (
                  <div className="text-center">
                    <p className="text-green-400 mb-4">🎉 Rematch accepted! Creating new game...</p>
                    <p className="text-gray-400 text-sm">Redirecting to new match...</p>
                  </div>
                )}
                
                {rematchStatus === 'received' && (
                  <div className="text-center">
                    <p className="text-yellow-400 mb-4">🎮 Opponent wants a rematch!</p>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={acceptRematch}
                        disabled={isLoadingRematch}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                      >
                        {isLoadingRematch ? 'Accepting...' : 'Accept'}
                      </button>
                      <button
                        onClick={rejectRematch}
                        disabled={isLoadingRematch}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                      >
                        {isLoadingRematch ? 'Rejecting...' : 'Decline'}
                      </button>
                    </div>
                  </div>
                )}
                
                {rematchStatus === 'rejected' && (
                  <div className="text-center">
                    <p className="text-red-400 mb-4">❌ Rematch declined by opponent</p>
                    <button
                      onClick={() => {
                        setRematchStatus('none')
                        setRematchRequestedBy(null)
                      }}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                      Request Again
                    </button>
                  </div>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center p-4 bg-gray-800 rounded-lg">
                <h3 className="text-xl font-bold text-white mb-2">Player 1</h3>
                <p className="text-3xl font-bold text-orange-500">{gameResult.player1Result.score}</p>
                <p className="text-sm text-gray-400">points</p>
                <div className="text-xs text-gray-500 mt-2">
                  <p>{gameResult.player1Result.problemsSolved}/10 problems</p>
                  <p>{Math.round(gameResult.player1Result.accuracy * 100)}% accuracy</p>
                </div>
              </div>
              <div className="text-center p-4 bg-gray-800 rounded-lg">
                <h3 className="text-xl font-bold text-white mb-2">Player 2</h3>
                <p className="text-3xl font-bold text-orange-500">{gameResult.player2Result.score}</p>
                <p className="text-sm text-gray-400">points</p>
                <div className="text-xs text-gray-500 mt-2">
                  <p>{gameResult.player2Result.problemsSolved}/10 problems</p>
                  <p>{Math.round(gameResult.player2Result.accuracy * 100)}% accuracy</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    } else {
      return (
        <Card className="w-full max-w-4xl mx-auto bg-gray-900/50 border-gray-800">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-white">Calculating Results...</CardTitle>
            <p className="text-gray-400">Please wait while we calculate the final scores.</p>
          </CardHeader>
        </Card>
      )
    }
  }
  
  // Check if one player finished but the other hasn't - show waiting screen
  // Only show waiting screen if the current player has finished but opponent hasn't
  const currentPlayerFinished = isPlayer1 ? gameState.player1Finished : gameState.player2Finished
  const opponentFinished = isPlayer1 ? gameState.player2Finished : gameState.player1Finished
  
  if (currentPlayerFinished && !opponentFinished) {
    console.log('🎉 Current player has finished, showing celebration screen')
    console.log('🎯 RENDERING: Current player finished - showing celebration screen')
    console.log('🎉 Celebration screen - Finished state details:', {
      p1Finished: gameState.player1Finished,
      p2Finished: gameState.player2Finished,
      isPlayer1: isPlayer1,
      currentPlayerFinished,
      opponentFinished,
      p1Answers: gameState.player1Answers.length,
      p2Answers: gameState.player2Answers.length
    })
    
    return (
      <Card className="w-full max-w-4xl mx-auto bg-gray-900/50 border-gray-800">
        <CardContent className="text-center py-12">
          <div className="text-6xl mb-4">🎉</div>
          <p className="text-2xl font-bold text-green-400 mb-2">You've Finished!</p>
          <p className="text-gray-400 mb-4">Great job! You've completed all 10 problems.</p>
          <p className="text-sm text-gray-500">
            Waiting for {isPlayer1 ? 'Player 2' : 'Player 1'} to finish their questions...
          </p>
          <div className="text-xs text-gray-600 mt-4">
            Debug: P1 finished: {gameState.player1Finished ? 'Yes' : 'No'} ({gameState.player1Answers.length}/10), 
            P2 finished: {gameState.player2Finished ? 'Yes' : 'No'} ({gameState.player2Answers.length}/10)
          </div>
        </CardContent>
      </Card>
    )
  }
  
  // Show main game if both players are ready and not both finished
  if (bothPlayersReady && !(gameState.player1Finished && gameState.player2Finished)) {
    console.log('🎮 Rendering main game:', {
      bothPlayersReady,
      hasCurrentProblem: !!currentProblem,
      // isMyTurn, // Removed turn-based logic
      localAnswerSubmitted,
      currentProblemIndex: gameState.currentProblemIndex,
      p1Finished: gameState.player1Finished,
      p2Finished: gameState.player2Finished,
      bothFinished: gameState.player1Finished && gameState.player2Finished
    })
    console.log('🎯 RENDERING: Main game - both players active')
    
    console.log('🎯 Showing main game screen')
    return (
      <Card className="w-full max-w-4xl mx-auto bg-gray-900/50 border-gray-800">
        <CardHeader className="text-center">
          {/* Game Progress */}
          <div className="flex justify-between items-center mb-4">
            <div className="text-left">
              <p className="text-gray-400">Problem {gameState.currentProblemIndex + 1}/10</p>
              <p className="text-2xl font-bold text-white">
                {isPlayer1 ? gameState.player1Score : gameState.player2Score} pts
              </p>
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white">Multiplayer Math Blitz</h1>
              <p className="text-gray-400">Multiplication Challenge</p>
            </div>
            <div className="text-right">
            <p className="text-gray-400">Opponent Progress</p>
            <p className="text-2xl font-bold text-orange-500">{opponentProgress}/10</p>
            <p className="text-sm text-gray-400 mt-1">
              Score: {isPlayer1 ? gameState.player2Score : gameState.player1Score} pts
            </p>
          </div>
        </div>
        
        {/* Timer */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400">Time Remaining</span>
            <span className={`text-lg font-bold ${timeRemaining <= 5 ? 'text-red-500' : timeRemaining <= 10 ? 'text-yellow-500' : 'text-green-500'}`}>
              {timeRemaining}s
            </span>
          </div>
          <Progress 
            value={(timeRemaining / currentProblem.timeLimit) * 100} 
            className="h-3"
          />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-8">
        {/* Math Problem */}
        <div className="text-center">
          <h2 className="text-5xl font-bold text-white mb-8">{currentProblem.question}</h2>
          
          {/* Answer Options */}
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            {currentProblem.options.map((option, index) => (
              <Button
                key={index}
                onClick={() => {
                  console.log('🔘 Button clicked:', { 
                    option, 
                    // isMyTurn, // Removed turn-based logic 
                    localAnswerSubmitted,
                    hasGameState: !!gameState,
                    hasCurrentProblem: !!currentProblem,
                    playerId,
                    currentProblemIndex: gameState?.currentProblemIndex
                  })
                  handleAnswer(option)
                }}
                className="h-16 text-xl font-bold bg-gray-800 hover:bg-gray-700 border-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={localAnswerSubmitted || !currentProblem || (isPlayer1 ? gameState.player1Finished : gameState.player2Finished)}
              >
                {option}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Game Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-gray-900 rounded-lg">
            <p className="text-gray-400 text-sm">Difficulty</p>
            <p className="text-white font-semibold capitalize">{currentProblem.difficulty}</p>
          </div>
          <div className="p-3 bg-gray-900 rounded-lg">
            <p className="text-gray-400 text-sm">Base Points</p>
            <p className="text-white font-semibold">{currentProblem.points}</p>
          </div>
          <div className="p-3 bg-gray-900 rounded-lg">
            <p className="text-gray-400 text-sm">Time Limit</p>
            <p className="text-white font-semibold">{currentProblem.timeLimit}s</p>
          </div>
        </div>

        {/* Score Display */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="p-3 bg-gray-900 rounded-lg">
            <p className="text-gray-400 text-sm">Your Score</p>
            <p className="text-white font-bold text-xl">{isPlayer1 ? gameState.player1Score : gameState.player2Score}</p>
          </div>
          <div className="p-3 bg-gray-900 rounded-lg">
            <p className="text-gray-400 text-sm">Opponent Score</p>
            <p className="text-white font-bold text-xl">
              {isPlayer1 ? gameState.player2Score : gameState.player1Score}
            </p>
          </div>
        </div>

        {/* Opponent Status */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 text-gray-400">
            <Users className="h-4 w-4" />
            <span>Opponent Progress: {opponentProgress}/10 problems</span>
          </div>
        </div>
        
      </CardContent>
    </Card>
  )
  }
  
  // Fallback: if none of the above conditions are met, show loading
  console.log('🎯 RENDERING: Fallback - preparing game')
  console.log('🎯 Fallback state:', {
    bothPlayersReady,
    hasGameState: !!gameState,
    hasCurrentProblem: !!currentProblem,
    p1Finished: gameState?.player1Finished,
    p2Finished: gameState?.player2Finished,
    currentProblemIndex: gameState?.currentProblemIndex,
    totalProblems: gameState?.problems?.length,
    matchReady
  })
  return (
    <Card className="w-full max-w-4xl mx-auto bg-black border-gray-800">
      <CardContent className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Preparing game...</p>
      </CardContent>
    </Card>
  )
}
