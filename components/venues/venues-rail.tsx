import Link from "next/link"
import { QrCode } from "lucide-react"
import LiveMatchesRail from "@/components/dashboard/live-matches-rail"
import VenuesRailLive from "@/components/venues/venues-rail-live"
import VenuesRailNearby from "@/components/venues/venues-rail-nearby"
import VenuesRailFriendsPlaying from "@/components/venues/venues-rail-friends-playing"

type VenuesRailProps = {
  userId: string
}

export default function VenuesRail({ userId: _userId }: VenuesRailProps) {
  return (
    <div className="chance-rail-stack">
      <section className="chance-premium-card p-4 sm:p-[1.125rem]">
        <h2 className="chance-section-title text-sm">Quick check-in</h2>
        <p className="chance-text-caption mt-1">Scan at the door or enter tonight&apos;s code.</p>
        <Link href="/bar/join" className="chance-hero-cta-primary chance-focus-ring mt-3 inline-flex w-full items-center justify-center gap-2 py-2.5 text-xs">
          <QrCode className="size-3.5 stroke-[1.75]" aria-hidden />
          Check in
        </Link>
      </section>
      <VenuesRailLive />
      <VenuesRailNearby />
      <VenuesRailFriendsPlaying />
      <LiveMatchesRail />
    </div>
  )
}
