import type { LucideIcon } from "lucide-react"

export type ProgressMetric = {
  id: string
  label: string
  value: string | number
  hint?: string
  icon: LucideIcon
  accent?: "brand" | "yes" | "none"
}

type CompetitionProgressMeterProps = {
  metrics: ProgressMetric[]
  title?: string
  caption?: string
}

export default function CompetitionProgressMeter({
  metrics,
  title = "Your trajectory",
  caption = "Skill compounds — every match moves the needle.",
}: CompetitionProgressMeterProps) {
  return (
    <section className="chance-competition-progress chance-premium-card p-4 sm:p-[1.125rem]">
      <div className="chance-rail-card-head mb-3">
        <h2 className="chance-section-title text-base">{title}</h2>
        <span className="chance-text-caption">{caption}</span>
      </div>
      <ul className="chance-competition-progress-grid">
        {metrics.map((m) => {
          const Icon = m.icon
          return (
            <li key={m.id} className={`chance-competition-progress-cell chance-competition-progress-cell--${m.accent ?? "none"}`}>
              <span className="chance-competition-progress-icon" aria-hidden>
                <Icon className="size-4 stroke-[1.75]" />
              </span>
              <div className="min-w-0">
                <p className="chance-text-mono text-xl font-semibold tabular-nums text-[var(--chance-fg)]">{m.value}</p>
                <p className="text-[0.8125rem] font-medium">{m.label}</p>
                {m.hint ? <p className="chance-text-caption mt-0.5">{m.hint}</p> : null}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
