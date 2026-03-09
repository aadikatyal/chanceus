"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { advanceTournamentRound } from "@/lib/tournament-actions"
import { useRouter } from "next/navigation"

interface TournamentAutoAdvanceProps {
  tournamentId: string
  currentRound: number
  status: string
  matchIds: string[] // Pass match IDs from parent
}

export default function TournamentAutoAdvance({
  tournamentId,
  currentRound,
  status,
  matchIds,
}: TournamentAutoAdvanceProps) {
  const router = useRouter()
  const [isAdvancing, setIsAdvancing] = useState(false)
  const advancingRef = useRef(false)

  useEffect(() => {
    if (status !== "in_progress" || currentRound === 0 || matchIds.length === 0) {
      return
    }

    const supabase = createClient()

    const checkAndAdvance = async () => {
      if (advancingRef.current) return
      try {
        const { data: tournamentMatches } = await supabase
          .from("tournament_matches")
          .select("*, matches(status)")
          .eq("tournament_id", tournamentId)
          .eq("round_number", currentRound)

        if (tournamentMatches) {
          const allCompleted = tournamentMatches.every(
            (tm: any) =>
              tm.status === "completed" ||
              tm.is_bye ||
              tm.matches?.status === "completed"
          )

          if (allCompleted) {
            advancingRef.current = true
            setIsAdvancing(true)
            const result = await advanceTournamentRound(tournamentId)
            if (result.success) router.refresh()
          }
        }
      } catch (error) {
        console.error("Error checking tournament advancement:", error)
      } finally {
        advancingRef.current = false
        setIsAdvancing(false)
      }
    }

    checkAndAdvance()

    // Subscribe to match updates
    const channel = supabase
      .channel(`tournament-${tournamentId}-round-${currentRound}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: `id=in.(${matchIds.join(",")})`,
        },
        async (payload) => {
          console.log("🎮 Tournament match updated:", payload)

          // Check if match is completed
          if (payload.new.status === "completed" && !advancingRef.current) {
            // Small delay to ensure all updates are processed
            setTimeout(async () => {
              if (advancingRef.current) return

              try {
                // Check if all matches in current round are completed
                const { data: tournamentMatches } = await supabase
                  .from("tournament_matches")
                  .select("*, matches(status)")
                  .eq("tournament_id", tournamentId)
                  .eq("round_number", currentRound)

                if (tournamentMatches) {
                  const allCompleted = tournamentMatches.every(
                    (tm: any) =>
                      tm.status === "completed" ||
                      tm.is_bye ||
                      tm.matches?.status === "completed"
                  )

                  if (allCompleted) {
                    advancingRef.current = true
                    setIsAdvancing(true)
                    console.log("✅ All matches in round completed, advancing tournament...")
                    const result = await advanceTournamentRound(tournamentId)

                    if (result.success) {
                      console.log("✅ Tournament advanced:", result)
                      router.refresh()
                    } else if (result.error) {
                      console.error("❌ Failed to advance tournament:", result.error)
                    }
                  }
                }
              } catch (error) {
                console.error("Error checking tournament advancement:", error)
              } finally {
                advancingRef.current = false
                setIsAdvancing(false)
              }
            }, 2000) // 2 second delay
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tournamentId, currentRound, status, matchIds, router])

  return null // This component doesn't render anything
}

