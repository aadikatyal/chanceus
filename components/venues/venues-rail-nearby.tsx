"use client"

import Link from "next/link"
import { MapPin } from "lucide-react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Bar } from "@/lib/bar-actions"
import { getActiveBarSessions } from "@/lib/bar-actions"
import { EmptyState, SkeletonRows } from "@/components/dashboard/chance-craft"

type NearbyRow = Bar & { liveCount: number }

export default function VenuesRailNearby() {
  const [venues, setVenues] = useState<NearbyRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient()
        const { data: bars } = await supabase.from("bars").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(8)
        const list = bars ?? []
        const withLive = await Promise.all(
          list.map(async (bar) => {
            let liveCount = 0
            try {
              const sessions = await getActiveBarSessions(bar.id)
              liveCount = sessions.filter((s) => s.status === "waiting" || s.status === "active").length
            } catch {
              liveCount = 0
            }
            return { ...(bar as Bar), liveCount }
          })
        )
        withLive.sort((a, b) => b.liveCount - a.liveCount)
        setVenues(withLive)
      } catch {
        setVenues([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <section className="chance-premium-card p-4 sm:p-[1.125rem]">
      <div className="chance-rail-card-head">
        <h2 className="chance-section-title text-sm">Nearby venues</h2>
        <MapPin className="size-4 text-[var(--chance-muted-fg)]" aria-hidden />
      </div>
      {loading ? (
        <SkeletonRows rows={4} className="h-9" />
      ) : venues.length === 0 ? (
        <EmptyState className="py-4">
          <p className="chance-text-caption">No listings yet — scan a QR at your local spot.</p>
        </EmptyState>
      ) : (
        <ul className="space-y-1.5">
          {venues.map((v) => {
            const code = v.venue_code || v.qr_code
            const place = [v.city, v.state].filter(Boolean).join(", ") || "Near you"
            return (
              <li key={v.id}>
                <Link
                  href={`/bar/join?code=${encodeURIComponent(code)}`}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-xs transition-colors hover:bg-[var(--chance-surface-inset)]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{v.name}</p>
                    <p className="chance-text-caption truncate">{place}</p>
                  </div>
                  {v.liveCount > 0 ? (
                    <span className="chance-venues-live-pill shrink-0">{v.liveCount} live</span>
                  ) : (
                    <span className="chance-text-caption shrink-0">Open</span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      <Link href="#venues-live-tonight" className="chance-link-arrow mt-3 inline-block text-xs">
        All venues →
      </Link>
    </section>
  )
}
