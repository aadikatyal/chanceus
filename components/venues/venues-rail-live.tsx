"use client"

import Link from "next/link"
import { Radio } from "lucide-react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { getActiveBarSessions } from "@/lib/bar-actions"
import { ChanceBadge } from "@/components/design-system/badge"
import { EmptyState, SkeletonRows } from "@/components/dashboard/chance-craft"

type LiveVenueRow = {
  sessionId: string
  sessionCode: string
  barName: string
  gameName: string
  status: string
  players: number
}

export default function VenuesRailLive() {
  const [rows, setRows] = useState<LiveVenueRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient()
        const { data: bars } = await supabase.from("bars").select("id, name").eq("is_active", true).limit(16)
        const gameIds = new Set<string>()
        const sessionsRaw: { barName: string; session: Awaited<ReturnType<typeof getActiveBarSessions>>[number] }[] = []

        for (const bar of bars ?? []) {
          const sessions = await getActiveBarSessions(bar.id)
          for (const s of sessions) {
            sessionsRaw.push({ barName: bar.name, session: s })
            gameIds.add(s.trivia_game_id)
          }
        }

        const { data: games } = await supabase.from("bar_trivia_games").select("id, name").in("id", [...gameIds])
        const gameName = new Map((games ?? []).map((g) => [g.id as string, g.name as string]))

        const built: LiveVenueRow[] = []
        for (const { barName, session } of sessionsRaw) {
          const { count } = await supabase
            .from("bar_trivia_participants")
            .select("*", { count: "exact", head: true })
            .eq("session_id", session.id)
          built.push({
            sessionId: session.id,
            sessionCode: session.session_code,
            barName,
            gameName: gameName.get(session.trivia_game_id) ?? "Live trivia",
            status: session.status,
            players: count ?? session.total_players ?? 0,
          })
        }

        built.sort((a, b) => (a.status === "active" ? 0 : 1) - (b.status === "active" ? 0 : 1))
        setRows(built.slice(0, 6))
      } catch {
        setRows([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <section className="chance-premium-card p-4 sm:p-[1.125rem]">
      <div className="chance-rail-card-head">
        <h2 className="chance-section-title text-sm">Live at venues</h2>
        <ChanceBadge variant="live" showLiveDot className="text-[0.6875rem]">
          Now
        </ChanceBadge>
      </div>
      {loading ? (
        <SkeletonRows rows={3} className="h-10" />
      ) : rows.length === 0 ? (
        <EmptyState className="py-4">
          <p className="chance-text-caption">No in-room sessions yet. Check in when doors open.</p>
          <Link href="/bar/join" className="chance-link-arrow mt-2 inline-block text-xs">
            Enter code →
          </Link>
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.sessionId}>
              <Link
                href={`/bar/join?session=${encodeURIComponent(row.sessionCode)}`}
                className="flex items-start gap-2 rounded-lg border border-[var(--chance-border)] p-2.5 transition-colors hover:border-[color-mix(in_srgb,var(--chance-brand)_35%,var(--chance-border))]"
              >
                <Radio className="mt-0.5 size-3.5 shrink-0 text-[var(--chance-brand)]" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{row.barName}</p>
                  <p className="chance-text-caption truncate">
                    {row.gameName} · {row.players} in room
                  </p>
                </div>
                <span className="chance-text-caption shrink-0 capitalize">{row.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
