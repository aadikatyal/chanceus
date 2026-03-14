"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { registerForTournament, startTournament, advanceTournamentRound, syncTournamentPrizePool, deleteTournament } from "@/lib/tournament-actions"
import { toast } from "@/hooks/use-toast"
import { Trophy, Users, Play, ArrowRight, CheckCircle2, XCircle, Trash2 } from "lucide-react"
import Link from "next/link"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import type { Tournament, TournamentParticipant, TournamentMatch } from "@/lib/tournament-actions"
import TournamentBracket from "./tournament-bracket"
import TournamentAutoAdvance from "./tournament-auto-advance"
import ChatWindow from "@/components/chat/chat-window"

interface TournamentDetailClientProps {
  tournament: Tournament
  participants: TournamentParticipant[]
  matches: TournamentMatch[]
  currentUser: {
    id: string
    username: string
    display_name: string | null
    tokens: number
  }
  isRegistered: boolean
}

export default function TournamentDetailClient({
  tournament,
  participants: initialParticipants,
  matches: initialMatches,
  currentUser,
  isRegistered,
}: TournamentDetailClientProps) {
  const router = useRouter()
  const [isRegistering, setIsRegistering] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [participants, setParticipants] = useState(initialParticipants)
  const [matches, setMatches] = useState(initialMatches)
  const supabase = createClient()

  // Auto-sync prize pool if it's 0 and there are participants
  useEffect(() => {
    if (tournament.prize_pool === 0 && participants.length > 0 && tournament.status === "registration") {
      const syncPrizePool = async () => {
        try {
          const result = await syncTournamentPrizePool(tournament.id)
          if (result.success) {
            console.log("✅ Auto-synced prize pool:", result.prizePool)
            router.refresh()
          }
        } catch (error) {
          console.error("Error auto-syncing prize pool:", error)
        }
      }
      syncPrizePool()
    }
  }, [tournament.prize_pool, participants.length, tournament.status, tournament.id, router])

  const handleSyncPrizePool = async () => {
    setIsSyncing(true)
    try {
      const result = await syncTournamentPrizePool(tournament.id)
      if (result.error) {
        toast({
          title: "Failed to sync prize pool",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Prize pool synced!",
          description: `Prize pool updated to ${result.prizePool?.toLocaleString()} tokens`,
        })
        router.refresh()
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sync prize pool",
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
    }
  }

  // Refresh tournament and matches data periodically and on real-time updates
  useEffect(() => {
    // Refresh tournament status and matches if tournament is active or has matches
    if (tournament.status === "cancelled" || tournament.status === "completed") return

    const refreshData = async () => {
      // Refresh tournament status
      const { data: freshTournament } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", tournament.id)
        .single()

      if (freshTournament && freshTournament.status !== tournament.status) {
        console.log("🔄 Tournament status changed:", tournament.status, "->", freshTournament.status)
        router.refresh()
      }

      // Refresh matches
      const { data: freshMatches } = await supabase
        .from("tournament_matches")
        .select("*, matches(id, player1_id, player2_id, winner_id, status)")
        .eq("tournament_id", tournament.id)
        .order("round_number", { ascending: true })
        .order("bracket_position", { ascending: true })

      if (freshMatches) {
        setMatches(freshMatches as any)
      }
    }

    // Refresh every 3 seconds
    const interval = setInterval(refreshData, 3000)

    // Also listen for real-time updates
    const channel = supabase
      .channel(`tournament-${tournament.id}-updates`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tournaments",
          filter: `id=eq.${tournament.id}`,
        },
        () => {
          console.log("🔄 Tournament updated, refreshing...")
          refreshData()
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: `id=in.(${matches.map((m) => m.match_id).join(",")})`,
        },
        () => {
          console.log("🔄 Tournament match updated, refreshing...")
          refreshData()
        }
      )
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [tournament.id, tournament.status, matches, supabase, router])

  const handleRegister = async () => {
    if (currentUser.tokens < tournament.entry_fee) {
      toast({
        title: "Insufficient tokens",
        description: `You need ${tournament.entry_fee} tokens to register.`,
        variant: "destructive",
      })
      return
    }

    setIsRegistering(true)
    try {
      const result = await registerForTournament(tournament.id)
      if (result.error) {
        toast({
          title: "Registration failed",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Registered!",
          description: "You've successfully registered for the tournament.",
        })
        router.refresh()
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to register",
        variant: "destructive",
      })
    } finally {
      setIsRegistering(false)
    }
  }

  const handleStartTournament = async () => {
    // Prevent multiple clicks
    if (isStarting) return
    
    setIsStarting(true)
    try {
      const result = await startTournament(tournament.id)
      if (result.error) {
        toast({
          title: "Failed to start tournament",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Tournament started!",
          description: result.message || "Brackets have been generated and matches are ready.",
        })
        // Wait a moment for database to update, then refresh
        setTimeout(() => {
          // Force a hard refresh to ensure matches load
          window.location.reload()
        }, 1500)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start tournament",
        variant: "destructive",
      })
    } finally {
      setIsStarting(false)
    }
  }

  const handleDeleteTournament = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteTournament(tournament.id)
      if (result.error) {
        toast({
          title: "Could not delete tournament",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({ title: "Tournament deleted" })
        router.push("/tournaments")
        router.refresh()
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to delete tournament",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Creator can start without registering; others must be registered
  const isCreator = tournament.creator_id === currentUser.id
  const canStartTournament =
    tournament.status === "registration" &&
    (isRegistered || isCreator) &&
    participants.length >= 4

  // Get match IDs for current round for auto-advance
  const currentRoundMatches = matches.filter((m) => m.round_number === tournament.current_round)
  const currentRoundMatchIds = currentRoundMatches
    .map((m) => m.match_id)
    .filter((id): id is string => !!id)

  return (
    <div className="space-y-6">
      {/* Creator: delete option */}
      {isCreator && (
        <Card className="bg-gray-900/80 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-white">Creator options</p>
                {participants.length < 4 && tournament.status === "registration" && (
                  <p className="text-xs text-gray-400">
                    Seed bots:{" "}
                    <code className="bg-gray-800 px-1.5 py-0.5 rounded text-orange-400">
                      node scripts/seed-tournament-players.mjs {tournament.id} {tournament.max_participants}
                    </code>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {canStartTournament && (
                  <Button
                    onClick={handleStartTournament}
                    disabled={isStarting}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold"
                  >
                    {isStarting ? "Starting..." : `Start Tournament (${participants.length} players)`}
                  </Button>
                )}
                <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete tournament
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-gray-900 border-gray-700">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">Delete tournament?</AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-400">
                      This will permanently delete &quot;{tournament.name}&quot; and all its participants and bracket data. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-gray-600 text-gray-300">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => {
                        e.preventDefault()
                        handleDeleteTournament()
                      }}
                      disabled={isDeleting}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          </CardContent>
        </Card>
      )}

      {/* Auto-advance component (hidden) */}
      {tournament.status === "in_progress" && tournament.current_round > 0 && (
        <TournamentAutoAdvance
          tournamentId={tournament.id}
          currentRound={tournament.current_round}
          status={tournament.status}
          matchIds={currentRoundMatchIds}
        />
      )}

      {/* Registration/Start Section */}
      {(tournament.status === "registration" || (tournament.status === "in_progress" && participants.length < tournament.max_participants)) && (
        <Card className="bg-gray-900/80 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="h-5 w-5 text-orange-500" />
              Registration
            </CardTitle>
            <CardDescription>
              {participants.length} of {tournament.max_participants} players registered
              {participants.length >= 4 && participants.length < tournament.max_participants && (
                <span className="text-orange-400 ml-2">(Can start now with {participants.length} players)</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isRegistered ? (
              <div className="space-y-4">
                <p className="text-gray-300">
                  {tournament.status === "in_progress" ? (
                    <>
                      Late registration is open! Join this tournament. Entry fee:{" "}
                      <span className="font-semibold text-white">{tournament.entry_fee} tokens</span>
                      <span className="text-yellow-400 text-sm block mt-1">
                        Note: Late registrants may be added to future rounds or as replacements.
                      </span>
                    </>
                  ) : (
                    <>
                      Register now to compete in this tournament. Entry fee:{" "}
                      <span className="font-semibold text-white">{tournament.entry_fee} tokens</span>
                    </>
                  )}
                </p>
                <Button
                  onClick={handleRegister}
                  disabled={isRegistering || currentUser.tokens < tournament.entry_fee}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-black font-semibold"
                >
                  {isRegistering ? "Registering..." : `Register for ${tournament.entry_fee} tokens`}
                </Button>
                {currentUser.tokens < tournament.entry_fee && (
                  <p className="text-sm text-red-400 text-center">
                    You need {tournament.entry_fee - currentUser.tokens} more tokens to register
                  </p>
                )}
                {isCreator && canStartTournament && (
                  <div className="space-y-2 pt-4 border-t border-gray-700">
                    <p className="text-sm text-gray-400">As creator, you can start without playing:</p>
                    <Button
                      onClick={handleStartTournament}
                      disabled={isStarting}
                      variant="outline"
                      className="w-full border-green-500/50 text-green-400 hover:bg-green-500/10"
                    >
                      {isStarting ? "Starting..." : `Start Tournament (spectate only)`}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">You are registered!</span>
                </div>
                {participants.length < tournament.max_participants ? (
                  <p className="text-gray-300">
                    {tournament.max_participants - participants.length} more players can still register, or start now with {participants.length} players
                  </p>
                ) : (
                  <p className="text-gray-300">
                    Tournament is full! Ready to start.
                  </p>
                )}
                {canStartTournament && (
                  <div className="space-y-2">
                    <Button
                      onClick={handleStartTournament}
                      disabled={isStarting}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold"
                    >
                      {isStarting ? "Starting..." : `Start Tournament with ${participants.length} Players`}
                    </Button>
                    {participants.length < tournament.max_participants && (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-400 text-center">
                          Prize pool: {tournament.prize_pool.toLocaleString()} tokens (will not increase after start)
                        </p>
                        {tournament.prize_pool === 0 && participants.length > 0 && (
                          <Button
                            onClick={handleSyncPrizePool}
                            disabled={isSyncing}
                            variant="outline"
                            size="sm"
                            className="w-full text-xs"
                          >
                            {isSyncing ? "Syncing..." : "Fix Prize Pool"}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs for different views */}
      <Tabs defaultValue="bracket" className="w-full">
        <TabsList className="bg-gray-900/80 border-gray-800">
          <TabsTrigger value="bracket" className="text-white data-[state=active]:bg-orange-500">
            Bracket
          </TabsTrigger>
          <TabsTrigger value="participants" className="text-white data-[state=active]:bg-orange-500">
            Participants ({participants.length})
          </TabsTrigger>
          <TabsTrigger value="matches" className="text-white data-[state=active]:bg-orange-500">
            Matches
          </TabsTrigger>
          {isRegistered && (
            <TabsTrigger value="chat" className="text-white data-[state=active]:bg-orange-500">
              Chat
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="bracket" className="mt-6">
          <TournamentBracket
            tournament={tournament}
            participants={participants}
            matches={matches}
            currentUserId={currentUser.id}
          />
        </TabsContent>

        <TabsContent value="participants" className="mt-6">
          <Card className="bg-gray-900/80 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5" />
                Participants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {participants.map((participant, index) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-semibold text-sm">
                        {participant.bracket_position || index + 1}
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {participant.users?.display_name || participant.users?.username || "Unknown"}
                        </p>
                        {participant.status === "eliminated" && participant.round_eliminated && (
                          <p className="text-xs text-gray-400">
                            Eliminated in Round {participant.round_eliminated}
                          </p>
                        )}
                        {participant.final_rank && (
                          <p className="text-xs text-yellow-400">
                            Rank #{participant.final_rank}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        participant.status === "active"
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : participant.status === "eliminated"
                            ? "bg-red-500/20 text-red-400 border-red-500/30"
                            : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                      }
                    >
                      {participant.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matches" className="mt-6">
          <Card className="bg-gray-900/80 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Play className="h-5 w-5" />
                Matches
              </CardTitle>
            </CardHeader>
            <CardContent>
              {matches.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No matches yet</p>
              ) : (
                <div className="space-y-4">
                  {Array.from(new Set(matches.map((m) => m.round_number)))
                    .sort((a, b) => a - b)
                    .map((round) => {
                      const roundMatches = matches.filter((m) => m.round_number === round)
                      return (
                        <div key={round} className="space-y-2">
                          <h3 className="text-lg font-semibold text-white mb-3">
                            Round {round}
                          </h3>
                          <div className="grid md:grid-cols-2 gap-4">
                            {roundMatches.map((tm) => (
                              <div
                                key={tm.id}
                                className="p-4 bg-gray-800/50 rounded-lg border border-gray-700"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm text-gray-400">
                                    Match #{tm.bracket_position}
                                  </span>
                                  {tm.is_bye && (
                                    <Badge variant="outline" className="text-xs">
                                      Bye
                                    </Badge>
                                  )}
                                </div>
                                {tm.matches ? (
                                  <div className="space-y-2">
                                    {/* Player 1 */}
                                    <div
                                      className={`flex items-center justify-between p-2 rounded ${
                                        tm.matches.winner_id === tm.matches.player1_id
                                          ? "bg-green-500/20 border border-green-500/30"
                                          : tm.matches.status === "completed" && tm.matches.winner_id !== tm.matches.player1_id
                                          ? "bg-red-500/10 border border-red-500/20"
                                          : ""
                                      }`}
                                    >
                                      <span className="text-white text-sm font-medium">
                                        {(() => {
                                          const p1 = participants.find(
                                            (p) => p.user_id === tm.matches?.player1_id
                                          )
                                          return p1?.users?.display_name || p1?.users?.username || `Player ${tm.player1_bracket_position}`
                                        })()}
                                      </span>
                                      {tm.matches.winner_id &&
                                        tm.matches.player1_id === tm.matches.winner_id && (
                                          <div className="flex items-center gap-1">
                                            <Trophy className="h-4 w-4 text-yellow-400" />
                                            <CheckCircle2 className="h-4 w-4 text-green-400" />
                                          </div>
                                        )}
                                      {tm.matches.status === "completed" &&
                                        tm.matches.winner_id !== tm.matches.player1_id && (
                                          <XCircle className="h-4 w-4 text-red-400" />
                                        )}
                                    </div>

                                    {/* VS */}
                                    <div className="text-center text-xs text-gray-400 py-1">vs</div>

                                    {/* Player 2 */}
                                    {tm.player2_bracket_position ? (
                                      <div
                                        className={`flex items-center justify-between p-2 rounded ${
                                          tm.matches.winner_id === tm.matches.player2_id
                                            ? "bg-green-500/20 border border-green-500/30"
                                            : tm.matches.status === "completed" && tm.matches.winner_id !== tm.matches.player2_id
                                            ? "bg-red-500/10 border border-red-500/20"
                                            : ""
                                        }`}
                                      >
                                        <span className="text-white text-sm font-medium">
                                          {(() => {
                                            const p2 = participants.find(
                                              (p) => p.user_id === tm.matches?.player2_id
                                            )
                                            return p2?.users?.display_name || p2?.users?.username || `Player ${tm.player2_bracket_position}`
                                          })()}
                                        </span>
                                        {tm.matches.winner_id &&
                                          tm.matches.player2_id === tm.matches.winner_id && (
                                            <div className="flex items-center gap-1">
                                              <Trophy className="h-4 w-4 text-yellow-400" />
                                              <CheckCircle2 className="h-4 w-4 text-green-400" />
                                            </div>
                                          )}
                                        {tm.matches.status === "completed" &&
                                          tm.matches.winner_id !== tm.matches.player2_id && (
                                            <XCircle className="h-4 w-4 text-red-400" />
                                          )}
                                      </div>
                                    ) : (
                                      <div className="text-center text-gray-400 text-sm py-2">
                                        Bye
                                      </div>
                                    )}

                                    {/* Winner Badge */}
                                    {tm.matches.status === "completed" && tm.matches.winner_id && (
                                      <div className="pt-2 border-t border-gray-700">
                                        <div className="flex items-center justify-center gap-2 text-green-400 text-xs font-semibold bg-green-500/10 rounded p-2">
                                          <Trophy className="h-3 w-3" />
                                          Winner:{" "}
                                          {(() => {
                                            const winner = participants.find(
                                              (p) => p.user_id === tm.matches?.winner_id
                                            )
                                            return winner?.users?.display_name || winner?.users?.username || "Unknown"
                                          })()}
                                        </div>
                                      </div>
                                    )}

                                    <div className="pt-2 border-t border-gray-700">
                                      <Button
                                        asChild
                                        variant="outline"
                                        size="sm"
                                        className="w-full border-gray-600 text-gray-300 hover:text-white"
                                      >
                                        <Link href={`/games/match/${tm.match_id}`}>
                                          {tm.matches.status === "completed"
                                            ? "View Result"
                                            : (tm.matches.player1_id === currentUser.id || tm.matches.player2_id === currentUser.id)
                                              ? "Play Match"
                                              : "Watch"}
                                          <ArrowRight className="ml-2 h-3 w-3" />
                                        </Link>
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-gray-400 text-sm">Match pending</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isRegistered && (
          <TabsContent value="chat" className="mt-6">
            <ChatWindow
              messageType="tournament"
              currentUser={currentUser as any}
              tournamentId={tournament.id}
              title="Tournament Chat"
              maxHeight="600px"
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

