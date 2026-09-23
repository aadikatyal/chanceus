import { Lock, Medal } from "lucide-react"

export type AchievementItem = {
  id: string
  title: string
  description: string
  unlocked: boolean
  tier?: "bronze" | "silver" | "gold"
}

type CompetitionAchievementWallProps = {
  items: AchievementItem[]
  title?: string
}

export default function CompetitionAchievementWall({
  items,
  title = "Reputation",
}: CompetitionAchievementWallProps) {
  return (
    <section className="chance-competition-achievements chance-premium-card p-4 sm:p-[1.125rem]">
      <div className="chance-rail-card-head mb-3">
        <h2 className="chance-section-title text-base">{title}</h2>
        <span className="chance-text-caption">Earned · locked</span>
      </div>
      <ul className="space-y-2">
        {items.map((a) => (
          <li
            key={a.id}
            className={`chance-competition-achievement ${a.unlocked ? "is-unlocked" : "is-locked"} ${
              a.tier ? `chance-competition-achievement--${a.tier}` : ""
            }`}
          >
            <span className="chance-competition-achievement-icon" aria-hidden>
              {a.unlocked ? <Medal className="size-4 stroke-[1.75]" /> : <Lock className="size-4 stroke-[1.75]" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{a.title}</p>
              <p className="chance-text-caption">{a.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
