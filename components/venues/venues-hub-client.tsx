"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { QrCode } from "lucide-react"
import type { Bar, BarTriviaSession } from "@/lib/bar-actions"
import { getActiveBarSessions, getSessionParticipants } from "@/lib/bar-actions"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@/lib/supabase/client"
import VenuesPageChrome from "@/components/venues/venues-page-chrome"
import VenuesCinematicHero from "@/components/venues/discovery/venues-cinematic-hero"
import VenuesLiveTonight from "@/components/venues/discovery/venues-live-tonight"
import VenuesTrendingCarousel from "@/components/venues/discovery/venues-trending-carousel"
import VenuesLiveNow from "@/components/venues/discovery/venues-live-now"
import VenuesHowItWorks from "@/components/venues/discovery/venues-how-it-works"
import VenuesHostExperience from "@/components/venues/discovery/venues-host-experience"
import VenuesCommunity from "@/components/venues/discovery/venues-community"
import VenuesRail from "@/components/venues/venues-rail"
import type {
  VenueChampionRow,
  VenueLiveEvent,
  VenuePoster,
} from "@/components/venues/discovery/venues-discovery-types"

type VenuesHubClientProps = {
  user: User
}

const THEME_POOL = ["Sports", "Music", "Movies", "Pop culture", "General trivia"]

function pickThemes(seed: string) {
  const n = seed.charCodeAt(0) % THEME_POOL.length
  return [THEME_POOL[n], THEME_POOL[(n + 2) % THEME_POOL.length]]
}

function tonightLabel() {
  return new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
}

export default function VenuesHubClient({ user }: VenuesHubClientProps) {
  const [venues, setVenues] = useState<Bar[]>([])
  const [hostVenues, setHostVenues] = useState<Bar[]>([])
  const [liveEvents, setLiveEvents] = useState<VenueLiveEvent[]>([])
  const [posters, setPosters] = useState<VenuePoster[]>([])
  const [champions, setChampions] = useState<VenueChampionRow[]>([])
  const [playersInRoom, setPlayersInRoom] = useState(0)
  const [liveSessionTotal, setLiveSessionTotal] = useState(0)

  useEffect(() => {
    loadDiscovery()
  }, [])

  const loadDiscovery = async () => {
    const supabase = createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    const { data: publicBars } = await supabase
      .from("bars")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(32)

    const bars = publicBars || []
    setVenues(bars)

    if (authUser) {
      const { data: owned } = await supabase
        .from("bars")
        .select(`*, bar_staff!inner(user_id, role)`)
        .eq("bar_staff.user_id", authUser.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
      setHostVenues(owned || [])
    }

    const gameNameById = new Map<string, string>()
    const { data: games } = await supabase.from("bar_trivia_games").select("id, bar_id, name, current_high_score, current_high_scorer_name")
    for (const g of games || []) {
      gameNameById.set(g.id as string, g.name as string)
    }

    const championRows: VenueChampionRow[] = (games || [])
      .filter((g) => g.current_high_scorer_name && (g.current_high_score as number) > 0)
      .sort((a, b) => (b.current_high_score as number) - (a.current_high_score as number))
      .slice(0, 5)
      .map((g) => {
        const bar = bars.find((b) => b.id === g.bar_id)
        return {
          id: g.id as string,
          venueName: bar?.name || "Venue",
          playerName: g.current_high_scorer_name as string,
          score: g.current_high_score as number,
          gameName: g.name as string,
        }
      })
    setChampions(championRows)

    const events: VenueLiveEvent[] = []
    const posterRows: VenuePoster[] = []
    let playerTotal = 0
    let sessionTotal = 0

    await Promise.all(
      bars.map(async (bar) => {
        let sessions: BarTriviaSession[] = []
        try {
          sessions = await getActiveBarSessions(bar.id)
        } catch {
          sessions = []
        }

        const liveCount = sessions.filter((s) => s.status === "waiting" || s.status === "active").length
        sessionTotal += liveCount

        let barPlayers = 0
        const barGame = (games || []).find((g) => g.bar_id === bar.id)
        const featuredGame = barGame?.name as string | undefined

        for (const session of sessions) {
          let playerCount = session.total_players ?? 0
          try {
            const participants = await getSessionParticipants(session.id)
            playerCount = participants.length
          } catch {
            /* keep session total */
          }
          barPlayers += playerCount
          const gameName = gameNameById.get(session.trivia_game_id) || featuredGame || "Live trivia"

          events.push({
            bar,
            session,
            gameName,
            playerCount,
            seatsRemaining: Math.max(0, 48 - playerCount),
            prizeLabel: "Top 3 · venue rewards",
            difficulty: playerCount > 20 ? "Competitive" : "Casual",
            themeTags: pickThemes(bar.id),
          })
        }

        playerTotal += barPlayers

        posterRows.push({
          bar,
          liveSessions: liveCount,
          nextLabel: liveCount > 0 ? "Now · " + tonightLabel() : "This week",
          playerCount: barPlayers,
          prizeLabel: liveCount > 0 ? "Board live" : "Prizes tonight",
          themeTags: pickThemes(bar.name),
          featuredGame: featuredGame || undefined,
        })
      })
    )

    events.sort((a, b) => {
      const rank = (s: BarTriviaSession) => (s.status === "active" ? 0 : 1)
      return rank(a.session) - rank(b.session) || b.playerCount - a.playerCount
    })

    posterRows.sort((a, b) => b.liveSessions - a.liveSessions || b.playerCount - a.playerCount)

    setLiveEvents(events)
    setPosters(posterRows)
    setPlayersInRoom(playerTotal)
    setLiveSessionTotal(sessionTotal)
  }

  const liveEventCount = useMemo(() => liveEvents.length, [liveEvents])

  return (
    <VenuesPageChrome user={user} rail={<VenuesRail userId={user.id} />}>
      <VenuesCinematicHero liveEvents={liveEventCount} venuesListed={venues.length} playersInRoom={playersInRoom} />

      <VenuesLiveTonight posters={posters} liveSessionTotal={liveSessionTotal} />

      <VenuesTrendingCarousel />

      <VenuesLiveNow events={liveEvents} />

      <VenuesHowItWorks />

      <VenuesHostExperience hostVenues={hostVenues} />

      <VenuesCommunity champions={champions} />

      <div className="chance-venues-footer-cta">
        <Link href="/bar/join" className="chance-hero-cta-ghost chance-focus-ring inline-flex items-center gap-2 px-4 py-2 text-sm">
          <QrCode className="size-4 stroke-[1.75]" aria-hidden />
          Already have a code? Check in
        </Link>
      </div>
    </VenuesPageChrome>
  )
}
