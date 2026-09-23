"use client"

import { Calculator, Grid3X3, Brain, Zap, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChanceButton } from "@/components/design-system/button"

export type DashboardGame = {
  id: string
  name: string
  min_bet: number
  max_bet: number
}

function iconForGame(name: string): LucideIcon {
  const n = name.toLowerCase()
  if (n.includes("math")) return Calculator
  if (n.includes("row") || n.includes("four")) return Grid3X3
  if (n.includes("trivia")) return Brain
  return Zap
}

function shortName(name: string): string {
  const n = name.toLowerCase()
  if (n.includes("math")) return "Math"
  if (n.includes("row")) return "4-in-a-row"
  if (n.includes("trivia")) return "Trivia"
  return name.split(" ")[0] ?? name
}

type QuickActionsProps = {
  games: DashboardGame[]
}

/** Linear-style dense action rows — no marketing cards */
export default function QuickActions({ games }: QuickActionsProps) {
  const router = useRouter()

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="chance-text-label" id="dashboard-quick-play">
          Queue up
        </h2>
        <Link
          href="/games"
          className="chance-text-caption font-medium text-[var(--chance-brand)] hover:underline"
        >
          Full lobby
        </Link>
      </div>

      {games.length === 0 ? (
        <p className="chance-text-caption py-4">
          No active games.{" "}
          <Link href="/games" className="text-[var(--chance-brand)] hover:underline">
            Browse games
          </Link>
        </p>
      ) : (
        <>
          <div className="chance-quick-actions-desktop hidden overflow-x-auto md:block">
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--chance-border)] chance-text-label normal-case tracking-normal">
                  <th className="pb-2 pr-4 font-medium text-[var(--chance-muted-fg)]">Game</th>
                  <th className="pb-2 pr-4 font-medium text-[var(--chance-muted-fg)]">Stake range</th>
                  <th className="pb-2 text-right font-medium text-[var(--chance-muted-fg)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {games.map((game) => {
                  const Icon = iconForGame(game.name)
                  return (
                    <tr
                      key={game.id}
                      className="border-b border-[var(--chance-border)] last:border-0 hover:bg-[var(--chance-surface-inset)]/60"
                    >
                      <td className="py-2.5 pr-4">
                        <span className="inline-flex items-center gap-2 font-medium text-[var(--chance-fg)]">
                          <Icon className="size-4 text-[var(--chance-muted-fg)]" aria-hidden />
                          {game.name}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 chance-text-mono text-[var(--chance-muted-fg)]">
                        {game.min_bet}–{game.max_bet}
                      </td>
                      <td className="py-2.5">
                        <div className="flex justify-end gap-2">
                          <ChanceButton
                            variant="brand"
                            size="sm"
                            onClick={() => router.push(`/games/${game.id}`)}
                          >
                            <Zap className="size-3.5" aria-hidden />
                            Match
                          </ChanceButton>
                          <ChanceButton variant="ghost" size="sm" asChild>
                            <Link href={`/games/${game.id}`}>Lobby</Link>
                          </ChanceButton>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <ul className="chance-quick-actions-mobile divide-y divide-[var(--chance-border)] md:hidden">
            {games.map((game) => {
              const Icon = iconForGame(game.name)
              return (
                <li key={game.id} className="flex flex-col gap-2 py-3 first:pt-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-sm font-medium">
                      <Icon className="size-4 text-[var(--chance-muted-fg)]" aria-hidden />
                      {shortName(game.name)}
                    </span>
                    <span className="chance-text-mono chance-text-caption">
                      {game.min_bet}–{game.max_bet}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <ChanceButton
                      variant="brand"
                      size="sm"
                      className="flex-1"
                      onClick={() => router.push(`/games/${game.id}`)}
                    >
                      Quick match
                    </ChanceButton>
                    <ChanceButton variant="outline" size="sm" className="flex-1" asChild>
                      <Link href={`/games/${game.id}`}>Lobby</Link>
                    </ChanceButton>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
