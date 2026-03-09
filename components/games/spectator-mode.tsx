"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Eye, EyeOff, Users } from "lucide-react"
import { joinAsSpectator, leaveSpectatorMode, getSpectators } from "@/lib/spectator-actions"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@/lib/supabase/client"
import { toast } from "sonner"

interface SpectatorModeProps {
  matchId: string
  currentUser: User
  isPlayer: boolean
  tournamentId?: string | null
}

export default function SpectatorMode({ matchId, currentUser, isPlayer, tournamentId }: SpectatorModeProps) {
  const router = useRouter()
  const [isSpectating, setIsSpectating] = useState(false)
  const [spectatorCount, setSpectatorCount] = useState(0)
  const [spectators, setSpectators] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  // Auto-join as spectator when non-player loads the page (you're spectating by default)
  useEffect(() => {
    if (isPlayer) return

    const autoJoinSpectator = async () => {
      const { data: existing } = await supabase
        .from("spectators")
        .select("id")
        .eq("match_id", matchId)
        .eq("user_id", currentUser.id)
        .single()

      if (existing) {
        setIsSpectating(true)
        return
      }

      const result = await joinAsSpectator(matchId)
      if (result.error) {
        console.warn("Auto-join spectator failed:", result.error)
      } else {
        setIsSpectating(true)
      }
    }

    autoJoinSpectator()
  }, [matchId, currentUser.id, isPlayer])

  // Subscribe to spectator changes
  useEffect(() => {
    if (isPlayer) return

    const channel = supabase
      .channel(`spectators:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "spectators",
          filter: `match_id=eq.${matchId}`,
        },
        async () => {
          // Refresh spectator list
          const result = await getSpectators(matchId)
          if (result.data) {
            setSpectators(result.data)
            setSpectatorCount(result.data.length)
          }
        }
      )
      .subscribe()

    // Load initial spectator count
    const loadSpectators = async () => {
      const result = await getSpectators(matchId)
      if (result.data) {
        setSpectators(result.data)
        setSpectatorCount(result.data.length)
      }
    }

    loadSpectators()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [matchId, isPlayer, supabase])

  const handleLeaveSpectator = async () => {
    setLoading(true)
    const result = await leaveSpectatorMode(matchId)
    if (result.error) {
      toast.error(result.error)
    } else {
      setIsSpectating(false)
      toast.success("You left spectator mode")
      // Navigate back to tournament (or tournaments list)
      router.push(tournamentId ? `/tournaments/${tournamentId}` : "/tournaments")
    }
    setLoading(false)
  }

  if (isPlayer) {
    // Show spectator count for players
    return (
      <Card className="bg-gray-900/80 border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Spectators
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
              {spectatorCount} {spectatorCount === 1 ? "spectator" : "spectators"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gray-900/80 border-gray-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Spectating
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-green-400">
          {isSpectating ? "You're watching this match live" : "You're viewing this match"}
        </p>
        {isSpectating && (
          <Button
            onClick={handleLeaveSpectator}
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            <EyeOff className="h-4 w-4 mr-2" />
            Stop Spectating
          </Button>
        )}
        {spectatorCount > 0 && (
          <div className="pt-2 border-t border-gray-800">
            <p className="text-xs text-gray-500 mb-1">
              {spectatorCount} {spectatorCount === 1 ? "spectator" : "spectators"} watching
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

