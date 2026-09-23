import type { ReactNode } from "react"

type VenuesHeroProps = {
  kicker?: string
  title: string
  subtitle: string
  stats?: { label: string; value: string | number }[]
  actions?: ReactNode
  live?: boolean
}

export default function VenuesHero({
  kicker = "Venues",
  title,
  subtitle,
  stats,
  actions,
  live,
}: VenuesHeroProps) {
  return (
    <section className={`chance-venues-hero chance-premium-card overflow-hidden ${live ? "chance-venues-hero--live" : ""}`}>
      <div className="chance-venues-hero-inner">
        <div className="min-w-0 flex-1">
          <p className="chance-hero-kicker">{kicker}</p>
          <h1 className="chance-display-title mt-1">{title}</h1>
          <p className="mt-2 max-w-xl text-[0.9375rem] leading-relaxed tracking-[-0.01em] text-[var(--chance-muted-fg)]">
            {subtitle}
          </p>
          {stats && stats.length > 0 ? (
            <dl className="mt-4 flex flex-wrap gap-2">
              {stats.map((s) => (
                <div key={s.label} className="chance-play-stat-pill">
                  <span className="chance-text-mono font-semibold tabular-nums">{s.value}</span>
                  <span className="text-[var(--chance-muted-fg)]">{s.label}</span>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
        {actions ? <div className="chance-venues-hero-actions">{actions}</div> : null}
      </div>
    </section>
  )
}
