import Link from "next/link"
import type { ReactNode } from "react"
import { Gamepad2, RotateCcw } from "lucide-react"

type GameplayResultActionsProps = {
  rematchSlot?: ReactNode
  embedInCall?: boolean
}

/** Post-match CTAs — match-first, bible button classes. */
export default function GameplayResultActions({ rematchSlot, embedInCall }: GameplayResultActionsProps) {
  if (embedInCall) {
    return (
      <div className="chance-gp-result-actions-row mt-4">
        {rematchSlot ?? (
          <span className="chance-text-caption text-sm">Switch game tabs above to play another round.</span>
        )}
      </div>
    )
  }

  return (
    <div className="chance-gp-result-actions-row mt-4">
      <Link href="/games" className="chance-hero-cta-primary chance-focus-ring inline-flex items-center gap-2">
        <Gamepad2 className="size-4 stroke-[1.75]" aria-hidden />
        Queue again
      </Link>
      {rematchSlot ?? (
        <Link href="/matches" className="chance-hero-cta-ghost chance-focus-ring inline-flex items-center gap-2">
          <RotateCcw className="size-4 stroke-[1.75]" aria-hidden />
          Activity
        </Link>
      )}
    </div>
  )
}
