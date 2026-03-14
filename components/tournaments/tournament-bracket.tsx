"use client"

import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react"
import Link from "next/link"
import type { Tournament, TournamentParticipant, TournamentMatch } from "@/lib/tournament-actions"

interface TournamentBracketProps {
  tournament: Tournament
  participants: TournamentParticipant[]
  matches: TournamentMatch[]
  currentUserId: string
}

// Slot position for match i in round r (1-indexed): centers child between its two parents
function getSlot(totalRounds: number, round: number, matchIndex: number): number {
  const r = round
  const i = matchIndex
  if (r === 1) return i
  const step = Math.pow(2, r - 2)
  return step * (2 * i + 0.5) // midpoint of parent slots
}

export default function TournamentBracket({
  tournament,
  participants,
  matches,
  currentUserId,
}: TournamentBracketProps) {
  // If we have matches, show the bracket even if status is still "registration"
  if (tournament.status === "registration" && matches.length === 0) {
    return (
      <Card className="bg-gray-900/80 border-gray-800">
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <p className="text-gray-400">
              Bracket will be generated when the tournament starts
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (matches.length === 0 && tournament.status === "in_progress") {
    return (
      <Card className="bg-gray-900/80 border-gray-800">
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <p className="text-gray-400">Generating bracket...</p>
            <p className="text-gray-500 text-sm mt-2">
              Matches are being created. Please refresh the page.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // One match per (round, bracket_position) so slot N always shows the match that belongs there
  const rounds = Array.from(new Set(matches.map((m) => m.round_number)))
    .sort((a, b) => a - b)
    .map((round) => {
      const roundMatches = matches
        .filter((m) => m.round_number === round)
        .sort((a, b) => a.bracket_position - b.bracket_position || (a.id || "").localeCompare(b.id || ""))
      const seenPos = new Set<number>()
      const deduped = roundMatches.filter((m) => {
        const pos = m.bracket_position
        if (seenPos.has(pos)) return false
        seenPos.add(pos)
        return true
      })
      return { round, matches: deduped }
    })

  // Winner of a slot: for byes it's the single player; for matches it's winner_id
  const getWinnerUserId = (tm: TournamentMatch): string | null => {
    if (!tm.matches) return null
    if (tm.is_bye) return tm.matches.player1_id ?? null
    return tm.matches.winner_id ?? null
  }

  // For Round 2+, put the correct match in each slot so it matches the drawn lines.
  // Slot i must show the match between winner of prev round slot 2i and winner of prev round slot 2i+1.
  const slotMismatches: Record<string, { expected: [string | null, string | null]; actual: [string | null, string | null] }> = {}
  for (let r = 1; r < rounds.length; r++) {
    const prevRound = rounds[r - 1]
    const currRound = rounds[r]
    const reordered: TournamentMatch[] = []
    for (let i = 0; i < currRound.matches.length; i++) {
      const expected1 = getWinnerUserId(prevRound.matches[2 * i])
      const expected2 = getWinnerUserId(prevRound.matches[2 * i + 1])
      const found = currRound.matches.find(
        (m) =>
          m.matches &&
          ((m.matches.player1_id === expected1 && m.matches.player2_id === expected2) ||
            (m.matches.player1_id === expected2 && m.matches.player2_id === expected1))
      )
      const displayed = found ?? currRound.matches[i]
      if (!found && displayed.matches) {
        slotMismatches[`r${currRound.round}-i${i}`] = {
          expected: [expected1, expected2],
          actual: [displayed.matches.player1_id ?? null, displayed.matches.player2_id ?? null],
        }
      }
      reordered.push(displayed)
    }
    rounds[r] = { ...currRound, matches: reordered }
  }

  if (rounds.length === 0) {
    return (
      <Card className="bg-gray-900/80 border-gray-800">
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <p className="text-gray-400">No matches found. The bracket may still be generating.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalRounds = Math.max(...rounds.map((r) => r.round), 1)
  const round1Count = rounds[0]?.matches.length ?? 0
  const totalSlots = Math.max(round1Count, Math.pow(2, totalRounds - 1))

  const BOT_PREFIX = "tournament_bot_"
  const formatBotName = (username: string | null | undefined, displayName: string | null | undefined, fallback: string): string => {
    if (username?.startsWith(BOT_PREFIX)) {
      const num = username.replace(BOT_PREFIX, "") || fallback
      return `Tournament Bot ${num}`
    }
    return displayName || username || fallback
  }

  const getParticipantName = (bracketPosition: number | null): string => {
    if (!bracketPosition) return "TBD"
    const participant = participants.find((p) => p.bracket_position === bracketPosition)
    if (!participant) return `Tournament Bot ${bracketPosition}`
    return formatBotName(
      participant.users?.username,
      participant.users?.display_name,
      `Tournament Bot ${bracketPosition}`
    )
  }

  const getParticipantNameByUserId = (userId: string | null | undefined): string => {
    if (!userId) return "TBD"
    const participant = participants.find((p) => p.user_id === userId)
    if (!participant) return "Unknown"
    return formatBotName(
      participant.users?.username,
      participant.users?.display_name,
      participant.users?.display_name || participant.users?.username || "Unknown"
    )
  }

  const isUserMatch = (tm: TournamentMatch): boolean => {
    if (!tm.matches) return false
    return tm.matches.player1_id === currentUserId || tm.matches.player2_id === currentUserId
  }

  const slotHeight = 148
  const matchHeight = 140
  const roundWidth = 200
  const connectorWidth = 40
  const roundHeaderHeight = 48
  const containerHeight = totalSlots * slotHeight

  // Build connector paths: from round r matches 2i and 2i+1 to round r+1 match i
  const connectorPaths = useMemo(() => {
    const paths: { d: string; key: string }[] = []
    for (let ri = 0; ri < rounds.length - 1; ri++) {
      const currRound = rounds[ri]
      const nextRound = rounds[ri + 1]
      const currRoundNum = currRound.round
      const nextRoundNum = nextRound.round
      for (let i = 0; i < nextRound.matches.length; i++) {
        const childSlot = getSlot(totalRounds, nextRoundNum, i)
        const childCenterY = roundHeaderHeight + childSlot * slotHeight + matchHeight / 2
        const childLeftX = (roundWidth + connectorWidth) * (ri + 1)
        const parent1Idx = 2 * i
        const parent2Idx = 2 * i + 1
        if (parent1Idx >= currRound.matches.length || parent2Idx >= currRound.matches.length) continue
        const slot1 = getSlot(totalRounds, currRoundNum, parent1Idx)
        const slot2 = getSlot(totalRounds, currRoundNum, parent2Idx)
        const center1Y = roundHeaderHeight + slot1 * slotHeight + matchHeight / 2
        const center2Y = roundHeaderHeight + slot2 * slotHeight + matchHeight / 2
        const parentRightX = (roundWidth + connectorWidth) * ri + roundWidth
        const mergeX = parentRightX + connectorWidth / 2
        // L from parent1: right to mergeX, down to childCenterY
        paths.push({
          key: `conn-${currRoundNum}-${i}-1`,
          d: `M ${parentRightX} ${center1Y} H ${mergeX} V ${childCenterY}`,
        })
        // L from parent2: right to mergeX, up to childCenterY
        paths.push({
          key: `conn-${currRoundNum}-${i}-2`,
          d: `M ${parentRightX} ${center2Y} H ${mergeX} V ${childCenterY}`,
        })
        // Horizontal from merge to child
        paths.push({
          key: `conn-${currRoundNum}-${i}-3`,
          d: `M ${mergeX} ${childCenterY} H ${childLeftX}`,
        })
      }
    }
    return paths
  }, [rounds, totalRounds, slotHeight, matchHeight, roundWidth, connectorWidth, roundHeaderHeight])

  return (
    <Card className="bg-gray-900/80 border-gray-800">
      <CardContent className="pt-6">
        <div className="overflow-x-auto overflow-y-auto pb-8 max-h-[80vh]">
          <div className="relative inline-block min-w-max" style={{ minHeight: containerHeight + roundHeaderHeight }}>
            {/* SVG connector lines - behind content */}
            <svg
              className="absolute left-0 top-0 pointer-events-none z-0"
              width={(roundWidth + connectorWidth) * rounds.length}
              height={containerHeight + roundHeaderHeight}
            >
              {connectorPaths.map(({ key, d }) => (
                <path key={key} d={d} fill="none" stroke="rgba(148,163,184,0.4)" strokeWidth="1.5" />
              ))}
            </svg>

            <div className="relative z-10 flex gap-0">
              {rounds.map((roundData, roundIndex) => (
                <div
                  key={roundData.round}
                  className="flex shrink-0 flex-col"
                  style={{
                    width: roundWidth + (roundIndex < rounds.length - 1 ? connectorWidth : 0),
                    minWidth: roundWidth,
                  }}
                >
                  <div className="text-center mb-2" style={{ height: roundHeaderHeight - 8 }}>
                    <h3 className="text-sm font-semibold text-white">Round {roundData.round}</h3>
                    {roundData.round === tournament.current_round && (
                      <Badge className="mt-1 bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
                        Current
                      </Badge>
                    )}
                  </div>

                  <div
                    className="relative"
                    style={{
                      height: containerHeight,
                      width: roundWidth,
                    }}
                  >
                    {roundData.matches.map((tm, matchIndex) => {
                      const slot = getSlot(totalRounds, roundData.round, matchIndex)
                      const top = slot * slotHeight
                      return (
                        <div
                          key={tm.id}
                          className="absolute left-0 z-10"
                          style={{
                            top,
                            width: roundWidth,
                          }}
                        >
                          <div
                            className={`p-3 rounded-lg border w-full ${
                              isUserMatch(tm)
                                ? "bg-orange-500/10 border-orange-500/30"
                                : "bg-gray-800/50 border-gray-700"
                            } ${
                              slotMismatches[`r${roundData.round}-i${matchIndex}`]
                                ? "border-red-500/50 ring-1 ring-red-500/30"
                                : ""
                            }`}
                            style={{ minHeight: matchHeight }}
                          >
                            {slotMismatches[`r${roundData.round}-i${matchIndex}`] && (
                              <div className="mb-1.5 px-2 py-1 rounded bg-red-500/20 border border-red-500/40 text-[10px] text-red-300">
                                Wrong pairing (lines say{" "}
                                {getParticipantNameByUserId(slotMismatches[`r${roundData.round}-i${matchIndex}`].expected[0])} vs{" "}
                                {getParticipantNameByUserId(slotMismatches[`r${roundData.round}-i${matchIndex}`].expected[1])})
                              </div>
                            )}
                            {tm.is_bye ? (
                              <div className="text-center py-1">
                                <p className="text-gray-400 text-xs mb-0.5">Bye</p>
                                <p className="text-white text-sm font-medium">
                                  {getParticipantName(tm.player1_bracket_position)}
                                </p>
                                <Badge variant="outline" className="mt-1 text-[10px]">
                                  Auto-advance
                                </Badge>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div
                                  className={`flex items-center justify-between px-2 py-1 rounded text-xs ${
                                    tm.matches?.winner_id === tm.matches?.player1_id
                                      ? "bg-green-500/20 border border-green-500/30"
                                      : ""
                                  }`}
                                >
                                  <span className="text-white truncate max-w-[120px]">
                                    {tm.matches?.player1_id
                                      ? getParticipantNameByUserId(tm.matches.player1_id) || getParticipantName(tm.player1_bracket_position)
                                      : getParticipantName(tm.player1_bracket_position)}
                                  </span>
                                  {(tm.status === "completed" || tm.is_bye) &&
                                    (tm.matches?.winner_id === tm.matches?.player1_id ? (
                                      <CheckCircle2 className="h-3 w-3 text-green-400 shrink-0" />
                                    ) : (
                                      <XCircle className="h-3 w-3 text-red-400 shrink-0" />
                                    ))}
                                </div>
                                <div className="text-center text-[10px] text-gray-500">vs</div>
                                <div
                                  className={`flex items-center justify-between px-2 py-1 rounded text-xs ${
                                    tm.matches?.winner_id === tm.matches?.player2_id
                                      ? "bg-green-500/20 border border-green-500/30"
                                      : ""
                                  }`}
                                >
                                  <span className="text-white truncate max-w-[120px]">
                                    {tm.matches?.player2_id
                                      ? getParticipantNameByUserId(tm.matches.player2_id) ||
                                        getParticipantName(tm.player2_bracket_position)
                                      : getParticipantName(tm.player2_bracket_position) || "TBD"}
                                  </span>
                                  {(tm.status === "completed" || tm.is_bye) &&
                                    tm.matches?.player2_id &&
                                    (tm.matches?.winner_id === tm.matches?.player2_id ? (
                                      <CheckCircle2 className="h-3 w-3 text-green-400 shrink-0" />
                                    ) : (
                                      <XCircle className="h-3 w-3 text-red-400 shrink-0" />
                                    ))}
                                </div>
                                {tm.matches && (
                                  <div className="pt-1.5 border-t border-gray-700 mt-1 flex flex-col gap-1">
                                    <Button
                                      asChild
                                      variant="outline"
                                      size="sm"
                                      className="w-full h-7 text-[10px] border-gray-600 text-gray-300 hover:text-white"
                                    >
                                      <Link href={`/games/match/${tm.match_id}`}>
                                        {(tm.status === "completed" || tm.is_bye) || tm.matches.status === "completed"
                                          ? "View Result"
                                          : isUserMatch(tm)
                                            ? "Play Match"
                                            : "Watch"}
                                        <ArrowRight className="ml-1 h-2.5 w-2.5" />
                                      </Link>
                                    </Button>
                                    {((tm.status === "completed" || tm.is_bye) || tm.matches?.status === "completed") && (
                                      <Button
                                        asChild
                                        variant="ghost"
                                        size="sm"
                                        className="w-full h-6 text-[9px] text-gray-500 hover:text-gray-300"
                                      >
                                        <Link href={`/replays/${tm.match_id}`}>
                                          View Replay
                                        </Link>
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {tournament.status === "completed" && tournament.winner_id && (
          <div className="mt-8 text-center p-6 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg">
            <h3 className="text-xl font-bold text-white mb-2">🏆 Tournament Winner 🏆</h3>
            <p className="text-yellow-400 text-lg">
              {getParticipantNameByUserId(tournament.winner_id)}
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Won {tournament.prize_pool.toLocaleString()} tokens!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
