import Link from "next/link"
import { ArrowRight } from "lucide-react"

type HomeActiveMatchBannerProps = {
  matchId: string
  status: "waiting" | "in_progress"
  gameName: string
}

/** FACEIT-style resume strip — highest priority action on Home */
export default function HomeActiveMatchBanner({
  matchId,
  status,
  gameName,
}: HomeActiveMatchBannerProps) {
  const isLive = status === "in_progress"

  return (
    <Link
      href={`/games/match/${matchId}`}
      className="chance-active-match-banner chance-focus-ring group flex items-center justify-between gap-3 rounded-[var(--chance-radius-shell)] border border-[color-mix(in_srgb,var(--chance-brand)_45%,var(--chance-border))] bg-[color-mix(in_srgb,var(--chance-brand)_12%,var(--chance-surface))] px-4 py-3.5 shadow-[0_0_32px_color-mix(in_srgb,var(--chance-brand)_18%,transparent)] hover:border-[var(--chance-brand)] hover:shadow-[0_0_40px_color-mix(in_srgb,var(--chance-brand)_28%,transparent)] sm:px-5"
    >
      <div className="min-w-0">
        <p className="chance-text-label text-[var(--chance-brand)]">
          {isLive ? "Match live" : "In queue"}
        </p>
        <p className="truncate text-sm font-medium text-[var(--chance-fg)]">
          {gameName}
          {isLive ? " — return to the board" : " — waiting for opponent"}
        </p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-[var(--chance-brand)]">
        Resume
        <ArrowRight className="size-4 stroke-[1.75] transition-transform duration-[var(--chance-duration-ui)] group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  )
}
