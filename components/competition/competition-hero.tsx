import type { ReactNode } from "react"
import Link from "next/link"

type CompetitionHeroProps = {
  kicker?: string
  title: string
  subtitle: string
  stats?: { label: string; value: string | number; mono?: boolean }[]
  actions?: ReactNode
}

export default function CompetitionHero({
  kicker = "Competition",
  title,
  subtitle,
  stats,
  actions,
}: CompetitionHeroProps) {
  return (
    <section className="chance-competition-hero chance-premium-card overflow-hidden">
      <div className="chance-competition-hero-inner">
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
                  <span className={s.mono ? "chance-text-mono font-semibold tabular-nums" : "font-semibold"}>
                    {s.value}
                  </span>
                  <span className="text-[var(--chance-muted-fg)]">{s.label}</span>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
        {actions ? <div className="chance-competition-hero-actions">{actions}</div> : null}
      </div>
    </section>
  )
}

type CompetitionHeroLinkProps = {
  href: string
  children: ReactNode
  primary?: boolean
}

export function CompetitionHeroLink({ href, children, primary }: CompetitionHeroLinkProps) {
  return (
    <Link
      href={href}
      className={
        primary
          ? "chance-hero-cta-primary chance-focus-ring inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm"
          : "chance-hero-cta-ghost chance-focus-ring inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm"
      }
    >
      {children}
    </Link>
  )
}
