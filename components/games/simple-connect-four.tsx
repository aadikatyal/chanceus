"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { sendFriendRequest, getFriends, getSentRequests, getPendingRequests, acceptFriendRequest } from "@/lib/friends-actions"
import { completeMatch } from "@/lib/complete-match-action"
import { createRematchWithDeduction } from "@/lib/game-actions"
import { UserPlus, CheckCircle, Clock } from "lucide-react"

interface SimpleConnectFourProps {
  matchId: string
  betAmount: number
  status: string
  currentUserId?: string
  player1Id?: string
  player2Id?: string
  initialGameData?: { board?: (string | null)[]; winner?: string; currentPlayer?: "player1" | "player2" } | null
  isTournamentMatch?: boolean
}

export default function SimpleConnectFour({ matchId, betAmount, status, currentUserId, player1Id, player2Id, initialGameData, isTournamentMatch: isTournamentMatchProp }: SimpleConnectFourProps) {
  const [isTournamentMatch, setIsTournamentMatch] = useState(!!isTournamentMatchProp)
  const router = useRouter()
  const initialBoard = initialGameData?.board && Array.isArray(initialGameData.board) && initialGameData.board.length === 42
    ? initialGameData.board
    : Array(42).fill(null)
  const [board, setBoard] = useState(initialBoard)
  const [currentStatus, setCurrentStatus] = useState<string>(status)
  const [isLoading, setIsLoading] = useState(false)
  const initialCurrentPlayer =
    initialGameData?.currentPlayer === "player1" || initialGameData?.currentPlayer === "player2"
      ? initialGameData.currentPlayer
      : "player1"
  const [currentPlayer, setCurrentPlayer] = useState<"player1" | "player2">(initialCurrentPlayer)
  const [winner, setWinner] = useState<'player1' | 'player2' | 'draw' | null>(
    initialGameData?.winner && ["player1", "player2", "draw"].includes(initialGameData.winner)
      ? (initialGameData.winner as "player1" | "player2" | "draw")
      : null
  )
  const isProcessingMoveRef = useRef(false)
  const boardRef = useRef<(string | null)[]>(initialBoard)
  const matchCompletedAtRef = useRef<number | null>(null) // Track when match was completed to prevent immediate rematch checks
  const [playerNames, setPlayerNames] = useState<{player1: string, player2: string}>({player1: 'Player 1', player2: 'Player 2'})
  
  // Move history for viewing previous moves
  const [moveHistory, setMoveHistory] = useState<Array<{board: (string | null)[], move: number, player: string, moveNumber: number}>>([])
  const [viewingHistory, setViewingHistory] = useState(false)
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1)
  const [historyReconstructed, setHistoryReconstructed] = useState(false)

  // Rematch request state
  const [rematchRequested, setRematchRequested] = useState(false)
  const [rematchRequestedBy, setRematchRequestedBy] = useState<string | null>(null)
  const [rematchStatus, setRematchStatus] = useState<'none' | 'requested' | 'received' | 'accepted' | 'rejected'>('none')
  const [isLoadingRematch, setIsLoadingRematch] = useState(false)
  
  // Friend request state
  const [friendStatus, setFriendStatus] = useState<'none' | 'friends' | 'request_sent' | 'request_received' | 'checking'>('checking')
  const [isLoadingFriend, setIsLoadingFriend] = useState(false)
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null)

  // Function to load move history from database
  const loadMoveHistoryFromDB = async () => {
    try {
      const supabase = createClient()
      const { data: historyData, error } = await supabase
        .from('match_history')
        .select('*')
        .eq('match_id', matchId)
        .eq('action_type', 'move_made')
        .order('timestamp', { ascending: true })

      if (error) {
        console.error('Error loading move history:', error)
        return
      }

      console.log('📝 Move history query result:', { 
        matchId, 
        historyDataLength: historyData?.length || 0,
        historyData: historyData 
      })

      if (historyData && historyData.length > 0) {
        console.log('📝 Loading move history from database:', historyData.length, 'moves')
        
        // Convert match history to move history format
        const moveHistoryFromDB = historyData.map((entry, index) => {
          const moveData = entry.action_data
          const playerId = entry.user_id
          const player = playerId === player1Id ? 'player1' : 'player2'
          
          console.log('📝 Processing move:', { index, playerId, player, moveData })
          
          return {
            board: moveData.board || [],
            move: moveData.column || moveData.move || 0,
            player: player,
            moveNumber: index + 1
          }
        })
        
        console.log('📝 Setting move history:', moveHistoryFromDB)
        setMoveHistory(moveHistoryFromDB)
        setHistoryReconstructed(true)
        
        // If board is empty, immediately set it from the last move in history
        const currentBoard = boardRef.current || board
        const boardIsEmpty = currentBoard.every(cell => cell === null)
        if (boardIsEmpty && moveHistoryFromDB.length > 0) {
          const finalBoard = moveHistoryFromDB[moveHistoryFromDB.length - 1].board
          if (finalBoard && Array.isArray(finalBoard) && finalBoard.length === 42) {
            console.log('✅ Immediately setting board from move history:', finalBoard)
            setBoard(finalBoard)
            boardRef.current = finalBoard
          }
        }
      } else {
        // No move history found, start with empty
        console.log('⚠️ No move history found in database')
        setMoveHistory([])
        setHistoryReconstructed(true)
      }
    } catch (error) {
      console.error('Error loading move history:', error)
    }
  }
  
  // Move timer state
  const [moveTimeLeft, setMoveTimeLeft] = useState(10)
  const [isMoveTimerActive, setIsMoveTimerActive] = useState(false)
  
  // Determine if it's the current user's turn
  const isMyTurn = currentPlayer === 'player1' ? currentUserId === player1Id : currentUserId === player2Id
  const myPlayer = currentUserId === player1Id ? 'player1' : currentUserId === player2Id ? 'player2' : null
  
  // Get opponent ID
  const opponentId = currentUserId === player1Id ? player2Id : currentUserId === player2Id ? player1Id : null
  const opponentName = currentUserId === player1Id ? playerNames.player2 : currentUserId === player2Id ? playerNames.player1 : null
  
  // Debug logging
  useEffect(() => {
    console.log('🔍 Friend feature debug:', {
      currentUserId,
      player1Id,
      player2Id,
      opponentId,
      opponentName,
      friendStatus
    })
  }, [currentUserId, player1Id, player2Id, opponentId, opponentName, friendStatus])

  // Move timer effect
  useEffect(() => {
    if (isMoveTimerActive && moveTimeLeft > 0) {
      const timer = setTimeout(() => {
        setMoveTimeLeft(prev => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (isMoveTimerActive && moveTimeLeft === 0) {
      // Timer expired - make a random move for the current player
      handleTimerExpiry()
    }
  }, [isMoveTimerActive, moveTimeLeft])

  // Start timer when it's a player's turn
  useEffect(() => {
    if (currentStatus === 'in_progress' && !winner) {
      // Only reset timer when it's a new turn (currentPlayer changes), not when viewing history
      setMoveTimeLeft(10)
      setIsMoveTimerActive(true)
    } else {
      setIsMoveTimerActive(false)
    }
  }, [currentPlayer, currentStatus, winner]) // Removed viewingHistory from dependencies

  // Reset processing flag when turn changes (safety measure)
  useEffect(() => {
    if (!isMyTurn) {
      isProcessingMoveRef.current = false
    }
  }, [isMyTurn])

  // Check friend status with opponent
  useEffect(() => {
    const checkFriendStatus = async () => {
      if (!currentUserId || !opponentId) {
        console.log('🔍 Friend check: Missing currentUserId or opponentId', { currentUserId, opponentId })
        setFriendStatus('none')
        return
      }

      console.log('🔍 Checking friend status with opponent:', { currentUserId, opponentId })

      try {
        // Check if already friends
        const { data: friends, error: friendsError } = await getFriends()
        if (!friendsError && friends) {
          const isFriend = friends.some(f => 
            (f.user_id === currentUserId && f.friend_id === opponentId) ||
            (f.user_id === opponentId && f.friend_id === currentUserId)
          )
          if (isFriend) {
            console.log('✅ Already friends')
            setFriendStatus('friends')
            return
          }
        }

        // Check if request was sent
        const { data: sentRequests, error: sentError } = await getSentRequests()
        if (!sentError && sentRequests) {
          const requestSent = sentRequests.some(r => r.friend_id === opponentId)
          if (requestSent) {
            console.log('📤 Friend request already sent')
            setFriendStatus('request_sent')
            return
          }
        }

        // Check if request was received
        const { data: pendingRequests, error: pendingError } = await getPendingRequests()
        if (!pendingError && pendingRequests) {
          const requestReceived = pendingRequests.find(r => r.user_id === opponentId)
          if (requestReceived) {
            console.log('📥 Friend request received')
            setFriendStatus('request_received')
            setPendingRequestId(requestReceived.id)
            return
          }
        }

        console.log('🔍 No friend relationship found')
        setFriendStatus('none')
      } catch (error) {
        console.error('Error checking friend status:', error)
        setFriendStatus('none')
      }
    }

    checkFriendStatus()
  }, [currentUserId, opponentId, player1Id, player2Id])

  // Handle sending friend request
  const handleAddFriend = async () => {
    if (!opponentId || !currentUserId) return

    setIsLoadingFriend(true)
    try {
      // If there's a pending request from opponent, accept it instead
      if (friendStatus === 'request_received' && pendingRequestId) {
        const result = await acceptFriendRequest(pendingRequestId)
        if (result.success) {
          setFriendStatus('friends')
          setPendingRequestId(null)
        } else {
          alert(result.error || 'Failed to accept friend request')
        }
      } else {
        // Send new friend request
        const result = await sendFriendRequest(opponentId)
        if (result.success) {
          setFriendStatus('request_sent')
        } else {
          alert(result.error || 'Failed to send friend request')
        }
      }
    } catch (error) {
      console.error('Error with friend request:', error)
      alert('Failed to process friend request')
    } finally {
      setIsLoadingFriend(false)
    }
  }

  // Keep boardRef in sync with board state
  useEffect(() => {
    boardRef.current = board
  }, [board])

  // Load move history when board changes (for opponent moves)
  useEffect(() => {
    if (board && historyReconstructed) {
      // Reload move history from database when board changes
      loadMoveHistoryFromDB()
    }
  }, [board, historyReconstructed])

  // Load move history when viewing a completed or in_progress match (on initial load)
  useEffect(() => {
    const boardIsEmpty = board.every(cell => cell === null)
    if ((currentStatus === 'completed' || currentStatus === 'in_progress') && !historyReconstructed && boardIsEmpty) {
      console.log('🔄 Match is', currentStatus, ', loading move history to restore board...')
      loadMoveHistoryFromDB()
    }
  }, [currentStatus, historyReconstructed, board])

  // When move history loads, set board to final state (for both in_progress and completed matches)
  useEffect(() => {
    if (moveHistory.length > 0 && board.every(cell => cell === null)) {
      const finalBoard = moveHistory[moveHistory.length - 1].board
      if (finalBoard && Array.isArray(finalBoard) && finalBoard.length === 42) {
        console.log('🔄 Setting board from move history (status:', currentStatus, '):', finalBoard)
        setBoard(finalBoard)
        boardRef.current = finalBoard
      }
    }
  }, [moveHistory, currentStatus, board])
  

  // Load game state from database and check for updates
  useEffect(() => {
    const loadGameState = async () => {
      try {
        const supabase = createClient()
        
        // Load player names
        if (player1Id && player2Id) {
          const { data: players, error: playersError } = await supabase
            .from('users')
            .select('id, display_name, username')
            .in('id', [player1Id, player2Id])
          
          if (!playersError && players) {
            const player1Data = players.find(p => p.id === player1Id)
            const player2Data = players.find(p => p.id === player2Id)
            setPlayerNames({
              player1: player1Data?.display_name || player1Data?.username || 'Player 1',
              player2: player2Data?.display_name || player2Data?.username || 'Player 2'
            })
          }
        }

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

        // Check for rematch requests (only if not a tournament match)
        // Don't check immediately after match completion - wait at least 5 seconds
        const timeSinceCompletion = matchCompletedAtRef.current 
          ? Date.now() - matchCompletedAtRef.current 
          : Infinity
        
        if (currentStatus === 'completed' && currentUserId && !tournamentMatch && timeSinceCompletion > 5000) {
          console.log('🔍 Checking for rematch requests...', { currentStatus, currentUserId, matchId, timeSinceCompletion })
          // First, check if there are any new matches created recently that might be rematches
          const { data: recentMatches } = await supabase
            .from('matches')
            .select('id, created_at, player1_id, player2_id, status')
            .or(`player1_id.eq.${currentUserId},player2_id.eq.${currentUserId}`)
            .in('status', ['waiting', 'in_progress'])
            .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
            .order('created_at', { ascending: false })
            .limit(5)
          
          if (recentMatches && recentMatches.length > 0) {
            console.log('🔍 Found recent matches that might be rematches:', recentMatches)
            // If we find a very recent match, redirect to it (but only if it's been at least 10 seconds since completion)
            const mostRecentMatch = recentMatches[0]
            const matchAge = Date.now() - new Date(mostRecentMatch.created_at).getTime()
            if (matchAge < 30000 && timeSinceCompletion > 10000) { // Less than 30 seconds old, and at least 10 seconds since completion
              console.log('🔄 Found very recent match, redirecting to:', mostRecentMatch.id)
              window.location.href = `/games/match/${mostRecentMatch.id}`
              return
            }
          }
          // Skip match_history query - it often fails due to RLS and we have game_data as primary source
          // This prevents console spam from empty error objects
          let rematchHistory = null
          let rematchError = null
          
          // Only try match_history if really needed (currently we use game_data as primary source)
          // Commented out to prevent RLS errors from spamming console
          /*
          try {
            const result = await supabase
            .from('match_history')
            .select('*')
            .eq('match_id', matchId)
            .in('action_type', ['rematch_requested', 'rematch_accepted', 'rematch_rejected'])
            .order('created_at', { ascending: false })
          
            rematchHistory = result.data
            rematchError = result.error
          } catch (err) {
            rematchError = err as any
          }
          */
          
          // Also check matches table for rematch requests stored in game_data
          const { data: matchData, error: matchDataError } = await supabase
            .from('matches')
            .select('game_data')
            .eq('id', matchId)
            .single()
          
          // Only log match data errors if they're real issues
          if (matchDataError && matchDataError.message) {
            console.warn('⚠️ Failed to load match data for rematch check:', matchDataError.message)
          }
          
          let rematchRequestedBy = null
          let rematchRequestedAt = null
          
          // Check matches table FIRST (more reliable than match_history)
          if (!matchDataError && matchData && matchData.game_data) {
            const gameData = matchData.game_data
            console.log('🔍 Checking game_data for rematch request:', gameData)
            if (gameData.rematch_requested_by) {
              rematchRequestedBy = gameData.rematch_requested_by
              rematchRequestedAt = gameData.rematch_requested_at
              console.log('🔍 Found rematch request in matches table:', { rematchRequestedBy, rematchRequestedAt })
            } else {
              console.log('🔍 No rematch_requested_by found in game_data')
            }
          } else {
            console.log('🔍 No match data or game_data found:', { matchDataError, matchData })
          }
          
          // Also check match_history as backup
          if (!rematchRequestedBy && !rematchError && rematchHistory && rematchHistory.length > 0) {
            console.log('🔍 Found rematch history as backup:', rematchHistory)
            const latestRematchAction = rematchHistory[0]
            console.log('🔍 Latest rematch action:', latestRematchAction)
            
            if (latestRematchAction.action_type === 'rematch_requested') {
              const requestedBy = latestRematchAction.user_id
              console.log('🔍 Rematch request analysis from history:', {
                requestedBy,
                currentUserId,
                isDifferentUser: requestedBy !== currentUserId
              })
              
              if (requestedBy !== currentUserId) {
                // Someone else requested a rematch
                console.log('🔍 Setting status to received (opponent requested)')
                setRematchStatus('received')
                setRematchRequestedBy(requestedBy)
              } else {
                // Current user requested a rematch
                console.log('🔍 Setting status to requested (current user requested)')
                setRematchStatus('requested')
                setRematchRequestedBy(currentUserId)
              }
            } else if (latestRematchAction.action_type === 'rematch_accepted') {
              setRematchStatus('accepted')
              // Check if there's a new match ID in the action data
              const actionData = latestRematchAction.action_data
              if (actionData && actionData.new_match_id) {
                console.log('🔄 Found new match ID in rematch acceptance:', actionData.new_match_id)
                // Redirect to the new match
                setTimeout(() => {
                  window.location.href = `/games/match/${actionData.new_match_id}`
                }, 2000)
              }
            } else if (latestRematchAction.action_type === 'rematch_rejected') {
              setRematchStatus('rejected')
            }
          } else if (!rematchRequestedBy) {
            console.log('🔍 No rematch history found either')
          }
          
          // Process rematch request if found (either from match_history or matches table)
          if (rematchRequestedBy) {
            console.log('🔍 Processing rematch request:', { rematchRequestedBy, currentUserId })
            
            if (rematchRequestedBy !== currentUserId) {
              // Someone else requested a rematch
              console.log('🔍 Setting status to received (opponent requested)')
              setRematchStatus('received')
              setRematchRequestedBy(rematchRequestedBy)
            } else {
              // Current user requested a rematch
              console.log('🔍 Setting status to requested (current user requested)')
              setRematchStatus('requested')
              setRematchRequestedBy(currentUserId)
            }
          } else {
            console.log('🔍 No rematch request found anywhere')
          }
        }
        
        const { data, error } = await supabase
          .from('matches')
          .select('status, game_data, winner_id, player1_id, player2_id')
          .eq('id', matchId)
          .single()

        if (error) {
          console.error('Error loading game state:', error)
          return
        }

        if (data) {
          // If match is completed locally, don't allow polling to reset state
          // Only update if status changes from in_progress to completed
          if (currentStatus === 'completed' && data.status === 'completed') {
            // Match is already completed - only update winner if we don't have one yet
            if (!winner && data.winner_id) {
              if (data.winner_id === data.player1_id) {
                setWinner('player1')
              } else if (data.winner_id === data.player2_id) {
                setWinner('player2')
              }
            }
            // Don't update anything else for completed matches
            return
          }
          
          // Update status if changed (only if not already completed)
          if (data.status !== currentStatus) {
            console.log('Status changed from', currentStatus, 'to', data.status)
            setCurrentStatus(data.status)
            // Track when match was completed to prevent immediate rematch checks
            if (data.status === 'completed' && currentStatus !== 'completed') {
              matchCompletedAtRef.current = Date.now()
            }
          }

          // Update game state if available
          if (data.game_data) {
            const gameData = data.game_data
            
            // Update board if different, or if board is empty and we have game_data
            if (gameData.board && Array.isArray(gameData.board) && gameData.board.length === 42) {
              const boardIsEmpty = board.every(cell => cell === null)
              const boardsAreDifferent = JSON.stringify(gameData.board) !== JSON.stringify(board)
              
              // Always load board if current board is empty OR if boards are different
              if (boardIsEmpty || boardsAreDifferent) {
                console.log('🔄 Updating board from database:', gameData.board, { boardIsEmpty, boardsAreDifferent })
                setBoard(gameData.board)
                boardRef.current = gameData.board
                
                // Load move history from database instead of reconstructing
                if (!historyReconstructed) {
                  console.log('🔄 Loading move history from database')
                  loadMoveHistoryFromDB()
                }
              }
            } else {
              // If no board in game_data, try loading from history (for both in_progress and completed)
              const boardIsEmpty = board.every(cell => cell === null)
              if (boardIsEmpty && (data.status === 'completed' || data.status === 'in_progress')) {
                console.log('⚠️ No board in game_data for', data.status, 'match, will load from history')
                if (!historyReconstructed) {
                  loadMoveHistoryFromDB()
                }
              }
            }
            
            // Only update current player if match is still in progress
            if (data.status === 'in_progress' && gameData.currentPlayer !== undefined && gameData.currentPlayer !== currentPlayer) {
              setCurrentPlayer(gameData.currentPlayer)
            }
            
            // Update winner if different and match is completed
            if (data.status === 'completed' && gameData.winner !== undefined && gameData.winner !== winner) {
              setWinner(gameData.winner)
            }
          }

          // Check winner from match winner_id if game_data doesn't have winner
          if (data.status === 'completed' && !winner) {
            console.log('🔍 Checking winner from match data:', {
              winner_id: data.winner_id,
              player1_id: data.player1_id,
              player2_id: data.player2_id,
              currentWinner: winner
            })
            
            if (data.winner_id === data.player1_id) {
              console.log('🏆 Setting winner to player1')
              setWinner('player1')
            } else if (data.winner_id === data.player2_id) {
              console.log('🏆 Setting winner to player2')
              setWinner('player2')
            } else if (!data.winner_id) {
              // If no winner_id but match is completed, determine winner from board
              // This handles cases where old matches had draws
              if (data.game_data?.board) {
                const board = data.game_data.board
                // Convert to format for checkWinner
                const formattedBoard: ("player1" | "player2" | "empty")[][] = []
                for (let row = 0; row < 6; row++) {
                  formattedBoard[row] = []
                  for (let col = 0; col < 7; col++) {
                    const cell = board[row * 7 + col]
                    formattedBoard[row][col] = cell === 'player1' ? 'player1' : cell === 'player2' ? 'player2' : 'empty'
                  }
                }
                const determinedWinner = checkWinner(formattedBoard)
                if (determinedWinner && determinedWinner !== 'draw') {
                  console.log(`🏆 Setting winner to ${determinedWinner} (from board analysis)`)
                  setWinner(determinedWinner)
                } else {
                  // Fallback: Player 1 wins by default
                  console.log('🏆 Setting winner to player1 (default - no winner_id found)')
                  setWinner('player1')
                }
              } else {
                // Fallback: Player 1 wins by default
                console.log('🏆 Setting winner to player1 (default - no winner_id found)')
                setWinner('player1')
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading game state:', error)
      }
    }

    // Load initial state
    loadGameState()

    // Check for updates every 2 seconds
    const interval = setInterval(loadGameState, 2000)
    return () => clearInterval(interval)
  }, [matchId, currentStatus, board, currentPlayer, winner])

  // Handle timer expiry - make a random move
  const handleTimerExpiry = async () => {
    if (winner || currentStatus !== 'in_progress') return
    
    console.log('⏰ Timer expired! Making random move for', currentPlayer)
    
    // Find available columns (columns that aren't full)
    const availableColumns = []
    for (let col = 0; col < 7; col++) {
      // Check if column has space (top row of column is empty)
      if (board[col] === null) {
        availableColumns.push(col)
      }
    }
    
    if (availableColumns.length > 0) {
      // Make a random move
      const randomColumn = availableColumns[Math.floor(Math.random() * availableColumns.length)]
      console.log('🎲 Making random move in column', randomColumn + 1)
      await dropPiece(randomColumn)
    } else {
      // No available moves - game is a draw
      console.log('No available moves - game is a draw')
    }
    
    setIsMoveTimerActive(false)
  }


  // Game logic functions
  const dropPiece = async (column: number) => {
    // Prevent multiple simultaneous moves - use ref for synchronous check
    if (isProcessingMoveRef.current) {
      console.log('❌ Move already in progress, ignoring click')
      return
    }
    
    if (winner || currentStatus !== 'in_progress' || !isMyTurn) return
    
    // Set processing flag immediately (synchronously) to prevent multiple clicks
    isProcessingMoveRef.current = true
    
    // Use ref to get the latest board state synchronously (prevents stale closure issues)
    const currentBoard = boardRef.current
    
    // Additional safety check: verify column is not already full
    if (currentBoard[column] !== null) {
      console.log('❌ Column is already full (safety check):', column)
      isProcessingMoveRef.current = false
      return
    }
    
    // Reset timer when a move is made
    setIsMoveTimerActive(false)
    
    // Find the lowest available row in the column
    for (let row = 5; row >= 0; row--) {
      const index = row * 7 + column
      if (currentBoard[index] === null) {
        // Place the piece locally first for immediate feedback
        const newBoard = [...currentBoard]
        newBoard[index] = currentPlayer
        setBoard(newBoard)
        boardRef.current = newBoard // Update ref immediately
        
        // Check for winner BEFORE saving to database to avoid race conditions
        const hasWinner = checkWinner(newBoard, row, column, currentPlayer)
        const isBoardFull = newBoard.every(cell => cell !== null)
        
        let determinedWinner: 'player1' | 'player2' | null = null
        if (hasWinner) {
          determinedWinner = currentPlayer
        } else if (isBoardFull) {
          // Count pieces for each player
          let player1Count = 0
          let player2Count = 0
          for (let i = 0; i < newBoard.length; i++) {
            if (newBoard[i] === 'player1') player1Count++
            else if (newBoard[i] === 'player2') player2Count++
          }
          // Player with more pieces wins (in Connect Four, players alternate, so counts should be close)
          // If still tied, player1 wins by default (ensures no ties)
          determinedWinner = player1Count >= player2Count ? 'player1' : 'player2'
        }
        
        // Add move to history with proper move number
        const newMoveNumber = moveHistory.length + 1
        const newMove = {
          board: [...newBoard],
          move: column,
          player: currentPlayer,
          moveNumber: newMoveNumber
        }
        
        // Only add if this exact move isn't already in history
        setMoveHistory(prev => {
          const isDuplicate = prev.some(move => 
            move.move === column && 
            move.player === currentPlayer && 
            move.moveNumber === newMoveNumber
          )
          
          if (isDuplicate) {
            console.log('🚫 Duplicate move detected, not adding to history')
            return prev
          }
          
          console.log('📝 Adding move to history:', newMove)
          return [...prev, newMove]
        })
        
        // Save to database - include winner if game is over
        const nextPlayer = currentPlayer === 'player1' ? 'player2' : 'player1'
        try {
          const supabase = createClient()
          
          if (determinedWinner) {
            // Game is over - save winner and mark match as completed in one update
            setWinner(determinedWinner)
            setCurrentStatus('completed')
            matchCompletedAtRef.current = Date.now() // Track when match was completed
            
            // Validate player IDs before saving
            const winnerId = determinedWinner === 'player1' ? player1Id : player2Id
            if (!winnerId) {
              console.error('❌ Cannot save winner: player ID is missing', {
                determinedWinner,
                player1Id,
                player2Id
              })
              // Don't revert - the game is still won locally
              isProcessingMoveRef.current = false
              return
            }
            
            // Use server action to complete match (handles RLS and replay creation)
            const gameData = {
              board: newBoard,
              currentPlayer: currentPlayer,
              winner: determinedWinner
            }
            
            try {
              const result = await completeMatch(matchId, winnerId, gameData)
              
              if (!result || !result.success) {
                console.error('❌ Failed to save winner via server action:', {
                  result,
                  matchId,
                  winnerId,
                  determinedWinner
                })
                // Don't revert board - the game is won, just log the error
                // The polling will eventually sync the state
                isProcessingMoveRef.current = false
                return
              }
              
              console.log('✅ Match completed and saved to database via server action:', result)
            } catch (err) {
              // Catch any unexpected errors (network, serialization, etc.)
              console.error('❌ Unexpected error saving winner:', {
                error: err,
                errorType: typeof err,
                errorString: String(err),
                matchId,
                winnerId,
                determinedWinner
              })
              // Don't revert - game is won
              isProcessingMoveRef.current = false
              return
            }
            
            // Save move to history
            const { error: historyError } = await supabase
              .from('match_history')
              .insert({
                match_id: matchId,
                user_id: currentUserId,
                action_type: 'move_made',
                action_data: {
                  board: newBoard,
                  column: column,
                  player: currentPlayer,
                  move: column,
                  timestamp: new Date().toISOString()
                }
              })
            
            if (historyError) {
              console.error('Failed to save move to history:', historyError)
            } else {
              console.log('✅ Move saved to match history')
              loadMoveHistoryFromDB()
            }
            
            // Reset processing flag
            isProcessingMoveRef.current = false
            return
          } else {
            // Game continues - save move and switch player
          const { error } = await supabase
            .from('matches')
            .update({
              game_data: {
                board: newBoard,
                currentPlayer: nextPlayer, // Switch for next turn
                winner: null
              }
            })
            .eq('id', matchId)
          
          if (error) {
            console.error('Failed to save move to database:', error)
            // Revert local change if database save failed
            setBoard(currentBoard)
            boardRef.current = currentBoard
            isProcessingMoveRef.current = false
            return
          }
          
          console.log('✅ Move saved to database for opponent sync')
          
          // Also save to match history for move tracking
          const { error: historyError } = await supabase
            .from('match_history')
            .insert({
              match_id: matchId,
              user_id: currentUserId,
              action_type: 'move_made',
              action_data: {
                board: newBoard,
                column: column,
                player: currentPlayer,
                move: column,
                timestamp: new Date().toISOString()
              }
            })
          
          if (historyError) {
            console.error('Failed to save move to history:', historyError)
          } else {
            console.log('✅ Move saved to match history')
            // Reload move history to include the new move
            loadMoveHistoryFromDB()
            }
            
            // Switch players
            setCurrentPlayer(nextPlayer)
          }
        } catch (error) {
          console.error('Error saving move:', error)
          // Revert local change if database save failed
          setBoard(currentBoard)
          boardRef.current = currentBoard
          isProcessingMoveRef.current = false
          return
        }
        
        // Reset processing flag after move is complete
        // Use a small timeout to ensure state updates have propagated
        setTimeout(() => {
          isProcessingMoveRef.current = false
        }, 50)
        return
      }
    }
    
    // Column is full - reset processing flag
    isProcessingMoveRef.current = false
  }

  const checkWinner = (board: (string | null)[], row: number, col: number, player: string) => {
    // Check horizontal
    let count = 1
    for (let i = col - 1; i >= 0 && board[row * 7 + i] === player; i--) count++
    for (let i = col + 1; i < 7 && board[row * 7 + i] === player; i++) count++
    if (count >= 4) return true

    // Check vertical
    count = 1
    for (let i = row - 1; i >= 0 && board[i * 7 + col] === player; i--) count++
    for (let i = row + 1; i < 6 && board[i * 7 + col] === player; i++) count++
    if (count >= 4) return true

    // Check diagonal (top-left to bottom-right)
    count = 1
    for (let i = 1; row - i >= 0 && col - i >= 0 && board[(row - i) * 7 + (col - i)] === player; i++) count++
    for (let i = 1; row + i < 6 && col + i < 7 && board[(row + i) * 7 + (col + i)] === player; i++) count++
    if (count >= 4) return true

    // Check diagonal (top-right to bottom-left)
    count = 1
    for (let i = 1; row - i >= 0 && col + i < 7 && board[(row - i) * 7 + (col + i)] === player; i++) count++
    for (let i = 1; row + i < 6 && col - i >= 0 && board[(row + i) * 7 + (col - i)] === player; i++) count++
    if (count >= 4) return true

    return false
  }

  const resetGame = () => {
    setBoard(Array(42).fill(null))
    setCurrentPlayer('player1')
    setWinner(null)
  }

  // Rematch request functions
  const requestRematch = async () => {
    if (!currentUserId || !player1Id || !player2Id) return
    
    console.log('🎯 requestRematch called by:', currentUserId)
    console.log('🎯 Players:', { player1Id, player2Id })
    
    setIsLoadingRematch(true)
    try {
      const supabase = createClient()
      
      // Check if there's already a rematch request for this match
      const { data: existingRequest } = await supabase
        .from('match_history')
        .select('*')
        .eq('match_id', matchId)
        .eq('action_type', 'rematch_requested')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (existingRequest) {
        console.log('⚠️ Rematch request already exists:', existingRequest)
        alert('A rematch request has already been sent for this match.')
        setIsLoadingRematch(false)
        return
      }
      
      // Store rematch request directly in matches table (more reliable than match_history)
      console.log('🎯 Storing rematch request in matches table:', {
        match_id: matchId,
        user_id: currentUserId
      })
      
      // Get current game data first
      const { data: currentMatchData } = await supabase
        .from('matches')
        .select('game_data')
        .eq('id', matchId)
        .single()
      
      const currentGameData = currentMatchData?.game_data || {}
      
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
        console.error('❌ Error storing rematch request:', matchError)
        alert('Failed to request rematch. Please try again.')
        setIsLoadingRematch(false)
        return
      }
      
      console.log('✅ Rematch request stored in matches table successfully')
      
      // Also try to store in match_history as backup (but don't fail if it doesn't work)
      try {
        const { error: historyError } = await supabase
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
        
        if (historyError) {
          console.log('⚠️ Could not store in match_history (non-critical):', historyError)
        } else {
          console.log('✅ Also stored in match_history as backup')
        }
      } catch (historyError) {
        console.log('⚠️ Could not store in match_history (non-critical):', historyError)
      }
      
      setRematchRequested(true)
      setRematchRequestedBy(currentUserId)
      setRematchStatus('requested')
      console.log('✅ Rematch request sent')
    } catch (error) {
      console.error('Error requesting rematch:', error)
    } finally {
      setIsLoadingRematch(false)
    }
  }

  const acceptRematch = async () => {
    console.log('🎯 acceptRematch called!')
    console.log('🎯 Current state:', { currentUserId, player1Id, player2Id, betAmount })
    
    if (!currentUserId || !player1Id || !player2Id) {
      console.error('❌ Missing required IDs for rematch:', {
        currentUserId,
        player1Id,
        player2Id
      })
      alert('Missing player information. Cannot create rematch.')
      return
    }
    
    setIsLoadingRematch(true)
    try {
      const supabase = createClient()
      
      console.log('🔄 Creating rematch with data:', {
        currentUserId,
        player1Id,
        player2Id,
        betAmount,
        gameId: '69bf26d2-110b-40d9-b20a-d5cfab14d133'
      })
      
      // Validate that all IDs are valid UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(player1Id) || !uuidRegex.test(player2Id) || !uuidRegex.test(currentUserId)) {
        console.error('❌ Invalid UUID format:', {
          player1Id: player1Id,
          player2Id: player2Id,
          currentUserId: currentUserId
        })
        alert('Invalid player IDs. Cannot create rematch.')
        return
      }
      
      // Check if both players have enough tokens before creating rematch
      if (betAmount > 0) {
        const { data: player1Data, error: player1Error } = await supabase
          .from('users')
          .select('tokens')
          .eq('id', player1Id)
        .single()
      
        const { data: player2Data, error: player2Error } = await supabase
          .from('users')
          .select('tokens')
          .eq('id', player2Id)
          .single()
        
        if (player1Error || player2Error) {
          console.error('❌ Error checking player tokens:', { player1Error, player2Error })
          alert('Failed to verify token balances. Cannot create rematch.')
          setIsLoadingRematch(false)
          return
        }
        
        if (!player1Data || player1Data.tokens < betAmount) {
          alert(`${playerNames.player1} doesn't have enough tokens for this rematch.`)
          setIsLoadingRematch(false)
          return
        }
        
        if (!player2Data || player2Data.tokens < betAmount) {
          alert(`${playerNames.player2} doesn't have enough tokens for this rematch.`)
          setIsLoadingRematch(false)
          return
        }
      }
      
      // Use server action to create rematch and deduct tokens atomically
      const gameId = '69bf26d2-110b-40d9-b20a-d5cfab14d133' // Actual Four in a Row game ID
      
      console.log('🔄 Creating rematch with token deduction via server action:', {
        originalMatchId: matchId,
        gameId,
        player1Id,
        player2Id,
        betAmount
      })
      
      const rematchResult = await createRematchWithDeduction(
        matchId,
        gameId,
        player1Id,
        player2Id,
        betAmount
      )
      
      if (!rematchResult || !rematchResult.success) {
        console.error('❌ Failed to create rematch with deduction:', rematchResult?.error)
        alert(`Failed to create rematch: ${rematchResult?.error || 'Unknown error'}`)
        setIsLoadingRematch(false)
        return
      }
      
      if (!rematchResult.matchId) {
        console.error('❌ Rematch created but no match ID returned')
        alert('Failed to create rematch: No match ID returned')
        setIsLoadingRematch(false)
        return
      }
      
      console.log('✅ Rematch created and tokens deducted successfully:', {
        matchId: rematchResult.matchId,
        player1Balance: rematchResult.player1Balance,
        player2Balance: rematchResult.player2Balance,
        alreadyDeducted: rematchResult.alreadyDeducted
      })
      
      const newMatchId = rematchResult.matchId
      
      // Save rematch acceptance to match_history (non-blocking)
      supabase
        .from('match_history')
        .insert({
          match_id: matchId,
          user_id: currentUserId,
          action_type: 'rematch_accepted',
          action_data: {
            accepted_by: currentUserId,
            new_match_id: newMatchId,
            accepted_at: new Date().toISOString()
          }
        })
        .then(({ error: historyError }) => {
          if (historyError) {
            console.error('Error saving rematch acceptance (non-critical):', historyError)
          }
        })
      
      setRematchStatus('accepted')
      setIsLoadingRematch(false)
      
      // Use replace instead of push to avoid back button issues
      console.log('🔄 Redirecting to new match:', `/games/match/${newMatchId}`)
      router.replace(`/games/match/${newMatchId}`)
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
      
      // Save rematch rejection to match_history
      const { error } = await supabase
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
      
      if (error) {
        console.error('Error rejecting rematch:', error)
        return
      }
      
      setRematchStatus('rejected')
      console.log('✅ Rematch rejected')
    } catch (error) {
      console.error('Error rejecting rematch:', error)
    } finally {
      setIsLoadingRematch(false)
    }
  }

  return (
    <div className="bg-gray-950 relative">
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="bg-gray-900/80 rounded-lg p-4">          
          {/* Four in a Row Game */}
          <div className="bg-gray-800/80 rounded-lg p-4">
            <div className="text-center">
              {currentStatus === 'cancelled' ? (
                <div className="text-red-400 mb-6">
                  <p className="text-xl font-bold">Match Cancelled</p>
                  <p>This match has been cancelled and is no longer playable.</p>
                </div>
              ) : currentStatus === 'completed' ? (
                <div className="text-blue-400 mb-3 sm:mb-6">
                  {winner ? (
                    <div>
                      <p className="text-lg sm:text-xl font-bold">
                        {winner === 'draw' ? (
                          <span className="text-gray-400">It's a Draw!</span>
                        ) : winner === 'player1' ? (
                          <span className="text-red-400">{playerNames.player1} Wins! 🎉</span>
                        ) : winner === 'player2' ? (
                          <span className="text-yellow-400">{playerNames.player2} Wins! 🎉</span>
                        ) : (
                          <span className="text-green-400">{playerNames.player1} Wins! 🎉</span>
                        )}
                      </p>
                      <p className="text-sm sm:text-base">This match has finished.</p>
                      
                      {/* Show winnings if current user is the winner */}
                      {winner !== 'draw' && betAmount > 0 && (
                        <div className="mt-2 sm:mt-4 p-2 sm:p-4 bg-green-900/30 border border-green-500/50 rounded-lg">
                          {((winner === 'player1' && currentUserId === player1Id) || 
                            (winner === 'player2' && currentUserId === player2Id)) ? (
                            <div className="text-center">
                              <p className="text-green-400 font-semibold text-base sm:text-lg">
                                🎊 You Won {betAmount * 2} Tokens! 🎊
                              </p>
                              <p className="text-gray-300 text-xs sm:text-sm mt-1">
                                Net Profit: +{betAmount} tokens (after your initial {betAmount} token bet)
                              </p>
                            </div>
                          ) : (
                            <div className="text-center">
                              <p className="text-gray-400 text-xs sm:text-sm">
                                Winner received {betAmount * 2} tokens
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      
                      {/* Rematch Request Section - Only show for non-tournament matches */}
                      {!isTournamentMatch && (
                      <div className="mt-3 sm:mt-6 bg-gray-800/50 rounded-lg p-3 sm:p-4">
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
                            <p className="text-blue-400 mb-2 sm:mb-4 text-sm sm:text-base">✅ Rematch request sent to {currentUserId === player1Id ? playerNames.player2 : playerNames.player1}!</p>
                            <p className="text-gray-400 text-xs sm:text-sm">Waiting for opponent to respond...</p>
                          </div>
                        )}
                        
                        {rematchStatus === 'accepted' && (
                          <div className="text-center">
                            <p className="text-green-400 mb-2 sm:mb-4 text-sm sm:text-base">🎉 Rematch accepted! Creating new game...</p>
                            <p className="text-gray-400 text-xs sm:text-sm">Redirecting to new match...</p>
                          </div>
                        )}
                        
                        {rematchStatus === 'received' && (
                          <div className="text-center">
                            <p className="text-yellow-400 mb-2 sm:mb-4 text-sm sm:text-base">🎮 {currentUserId === player1Id ? playerNames.player2 : playerNames.player1} wants a rematch!</p>
                            <div className="flex gap-2 sm:gap-3 justify-center">
                              <button
                                onClick={acceptRematch}
                                disabled={isLoadingRematch}
                                className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                              >
                                {isLoadingRematch ? 'Accepting...' : 'Accept'}
                              </button>
                              <button
                                onClick={rejectRematch}
                                disabled={isLoadingRematch}
                                className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                              >
                                {isLoadingRematch ? 'Rejecting...' : 'Decline'}
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {rematchStatus === 'rejected' && (
                          <div className="text-center">
                            <p className="text-red-400 mb-2 sm:mb-4 text-sm sm:text-base">❌ Rematch declined by opponent</p>
                            <button
                              onClick={() => {
                                setRematchStatus('none')
                                setRematchRequested(false)
                                setRematchRequestedBy(null)
                              }}
                              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                            >
                              Request Again
                            </button>
                          </div>
                        )}
                      </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-xl font-bold">Match Completed</p>
                      <p>This match has finished.</p>
                    </div>
                  )}
                </div>
              ) : currentStatus === 'in_progress' ? (
                <>
                  <p className="text-gray-300 mb-6">Click on column arrows to place chips</p>
                  
                  <div className="mt-6 text-gray-300 text-center">
                    {winner ? (
                      <div className="text-2xl font-bold">
                        {winner === 'draw' ? (
                          <span className="text-gray-400">It's a Draw!</span>
                        ) : winner === 'player1' ? (
                          <span className="text-red-400">{playerNames.player1} Wins! 🎉</span>
                        ) : winner === 'player2' ? (
                          <span className="text-yellow-400">{playerNames.player2} Wins! 🎉</span>
                        ) : (
                          <span className="text-green-400">{playerNames.player1} Wins! 🎉</span>
                        )}
                      </div>
                    ) : (currentStatus as string) === 'completed' ? (
                      <div className="text-2xl font-bold">
                        {winner ? (
                          winner === 'draw' ? (
                            <span className="text-gray-400">It's a Draw!</span>
                          ) : winner === 'player1' ? (
                            <span className="text-red-400">{playerNames.player1} Wins! 🎉</span>
                          ) : winner === 'player2' ? (
                            <span className="text-yellow-400">{playerNames.player2} Wins! 🎉</span>
                          ) : (
                            <span className="text-green-400">{playerNames.player1} Wins! 🎉</span>
                          )
                        ) : (
                          <span className="text-green-400">Match Completed!</span>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p>Get four in a row to win!</p>
                        <p className="text-lg font-semibold mt-2">
                          {isMyTurn ? (
                            <span className="text-green-400">Your turn! Place your piece</span>
                          ) : (
                            <span className="text-yellow-400">Waiting for opponent...</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          Current Player: <span className={currentPlayer === 'player1' ? 'text-red-400' : 'text-yellow-400'}>
                            {currentPlayer === 'player1' ? `${playerNames.player1} (Red)` : `${playerNames.player2} (Yellow)`}
                          </span>
                        </p>
                        {myPlayer && (
                          <p className="text-sm text-blue-400 mt-1">
                            You are: <span className={myPlayer === 'player1' ? 'text-red-400' : 'text-yellow-400'}>
                              {myPlayer === 'player1' ? `${playerNames.player1} (Red)` : `${playerNames.player2} (Yellow)`}
                            </span>
                          </p>
                        )}
                        
                        
                        {/* Move Timer - Compact version */}
                        {isMoveTimerActive && currentStatus === 'in_progress' && !winner && (
                          <div className="mt-2 flex items-center justify-center gap-2">
                            <span className="text-sm text-gray-300">
                              {isMyTurn ? 'Your turn' : 'Opponent\'s turn'}:
                            </span>
                            <div className={`text-lg font-bold px-2 py-1 rounded ${moveTimeLeft <= 3 ? 'text-red-500 bg-red-500/20 animate-pulse' : moveTimeLeft <= 5 ? 'text-yellow-500 bg-yellow-500/20' : 'text-green-500 bg-green-500/20'}`}>
                              {moveTimeLeft}s
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-yellow-400 mb-6">
                  <p className="text-xl font-bold">Waiting to Start</p>
                  <p>Game will begin when both players are ready</p>
                </div>
              )}
              
              {/* Game board */}
              {viewingHistory && currentHistoryIndex >= 0 && currentHistoryIndex < moveHistory.length && (
                <div className="text-center mb-4">
                  <div className="inline-flex items-center px-3 py-1 bg-blue-600/20 border border-blue-500/30 rounded-full">
                    <span className="text-blue-400 text-sm font-medium">
                      📖 Viewing Move {currentHistoryIndex + 1} of {moveHistory.length}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Column arrows - placed right above the board */}
              {currentStatus === 'in_progress' && (
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2 md:gap-1 max-w-md mx-auto mb-2 mt-2">
                  {Array.from({ length: 7 }, (_, col) => {
                    // Check if column is full
                    const isColumnFull = board[col] !== null
                    const canPlay = !isColumnFull && !winner && isMyTurn && currentStatus === 'in_progress' && !viewingHistory
                    
                    return (
                      <button
                        key={col}
                        onClick={() => dropPiece(col)}
                        disabled={!canPlay}
                        className={`h-7 sm:h-8 md:h-12 text-white text-xs sm:text-sm md:text-xl rounded font-bold transition-colors flex items-center justify-center ${
                          canPlay
                            ? 'bg-blue-600 hover:bg-blue-500 cursor-pointer'
                            : 'bg-gray-500 cursor-not-allowed opacity-50'
                        }`}
                      >
                        ↓
                      </button>
                    )
                  })}
                </div>
              )}
              
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2 md:gap-1 max-w-md mx-auto">
                {Array.from({ length: 7 }, (_, col) => {
                  const canPlay = isMyTurn && !winner && currentStatus === 'in_progress' && !viewingHistory
                  
                  return (
                    <button
                      key={col}
                      onClick={() => dropPiece(col)}
                      disabled={!canPlay}
                      className={`flex flex-col gap-1.5 sm:gap-2 md:gap-1 p-0.5 sm:p-1 rounded transition-colors ${
                        canPlay
                          ? 'hover:bg-blue-500/10 cursor-pointer'
                          : 'cursor-not-allowed'
                      }`}
                    >
                      {Array.from({ length: 6 }, (_, row) => {
                        const i = row * 7 + col  // Fixed: should be row * 7 + col, not col + (row * 7)
                        // Use historical board if viewing history, otherwise use current board
                        // If viewing history but no index set, show the last move (final state)
                        const displayBoard = viewingHistory && moveHistory.length > 0
                          ? (currentHistoryIndex >= 0 && currentHistoryIndex < moveHistory.length
                              ? moveHistory[currentHistoryIndex].board
                              : moveHistory[moveHistory.length - 1].board) // Show last move if index not set
                          : board
                        const piece = displayBoard[i]
                        let pieceColor = 'bg-gray-700 border-gray-600'
                        
                        if (piece === 'player1') {
                          pieceColor = 'bg-red-500 border-red-400'
                        } else if (piece === 'player2') {
                          pieceColor = 'bg-yellow-400 border-yellow-300'
                        }
                        
                        return (
                          <div
                            key={i}
                            className={`w-7 h-7 sm:w-9 sm:h-9 md:w-12 md:h-12 rounded-full border-2 transition-all duration-300 ${pieceColor} ${
                              currentStatus === 'cancelled' 
                                ? 'opacity-50' 
                                : viewingHistory 
                                  ? 'opacity-80' // Slightly dimmed when viewing history
                                  : 'hover:scale-110'
                            }`}
                          />
                        )
                      })}
                    </button>
                  )
                })}
              </div>
              
              {/* Move History Viewer */}
              <div className="mt-3 bg-gray-800/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    Move History {moveHistory.length > 0 && <span className="text-blue-400 text-sm">({moveHistory.length} moves)</span>}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        const newViewingHistory = !viewingHistory
                        setViewingHistory(newViewingHistory)
                        // When opening history, show the last move (final board state)
                        if (newViewingHistory && moveHistory.length > 0) {
                          setCurrentHistoryIndex(moveHistory.length - 1)
                        } else if (!newViewingHistory) {
                          // When closing history, reset to show current board
                          setCurrentHistoryIndex(-1)
                        }
                      }}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                    >
                      {viewingHistory ? 'Hide History' : 'View History'}
                    </button>
                    {viewingHistory && moveHistory.length > 0 && (
                      <button
                        onClick={() => {
                          setViewingHistory(false)
                          setCurrentHistoryIndex(-1)
                        }}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                      >
                        Back to Current
                      </button>
                    )}
                  </div>
                </div>
                  
                  {viewingHistory && (
                    <div className="space-y-4">
                      {moveHistory.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-gray-400 text-lg">No moves yet</p>
                          <p className="text-gray-500 text-sm mt-2">Make your first move to start tracking the game history!</p>
                        </div>
                      ) : (
                        <>
                          {/* History Navigation */}
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => setCurrentHistoryIndex(Math.max(0, currentHistoryIndex - 1))}
                              disabled={currentHistoryIndex <= 0}
                              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
                            >
                              ← Previous
                            </button>
                            
                            <span className="text-gray-300 text-sm">
                              Move {currentHistoryIndex + 1} of {moveHistory.length}
                            </span>
                            
                            <button
                              onClick={() => setCurrentHistoryIndex(Math.min(moveHistory.length - 1, currentHistoryIndex + 1))}
                              disabled={currentHistoryIndex >= moveHistory.length - 1}
                              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
                            >
                              Next →
                            </button>
                          </div>
                      
                      {/* Current Move Info */}
                      {currentHistoryIndex >= 0 && currentHistoryIndex < moveHistory.length && (
                        <div className="text-center">
                          <p className="text-gray-300 text-sm">
                            Move {moveHistory[currentHistoryIndex].moveNumber}: {moveHistory[currentHistoryIndex].player === 'player1' ? playerNames.player1 : playerNames.player2} placed in column {moveHistory[currentHistoryIndex].move + 1}
                          </p>
                        </div>
                      )}
                      
                      {/* Board shows historical state automatically */}
                      
                      {/* Move List */}
                      <div className="max-h-32 overflow-y-auto">
                        <div className="text-sm text-gray-400 mb-2">All Moves:</div>
                        <div className="space-y-1">
                          {moveHistory.map((move, index) => (
                            <div
                              key={index}
                              className={`p-2 rounded cursor-pointer transition-colors ${
                                index === currentHistoryIndex 
                                  ? 'bg-blue-600/20 border border-blue-500' 
                                  : 'bg-gray-700/50 hover:bg-gray-600/50'
                              }`}
                              onClick={() => setCurrentHistoryIndex(index)}
                            >
                              <span className="text-white text-sm">
                                Move {move.moveNumber}: {move.player === 'player1' ? playerNames.player1 : playerNames.player2} → Column {move.move + 1}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}