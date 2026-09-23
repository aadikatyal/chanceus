"use client"

import type { ReactNode } from "react"
import type { User } from "@/lib/supabase/client"
import CompetitiveShell from "@/components/app/competitive-shell"
import CompetitivePageFeed from "@/components/app/competitive-page-feed"
import { cn } from "@/lib/utils"

type VenuesPageChromeProps = {
  user: User | null
  children: ReactNode
  className?: string
  /** Host control surfaces — extra token overrides */
  host?: boolean
  /** Right utility rail (discovery hub — matches Home / Play) */
  rail?: ReactNode
}

export default function VenuesPageChrome({ user, children, className, host, rail }: VenuesPageChromeProps) {
  const body = (
    <div className={cn("chance-venues-feed-stack", host && "chance-venues-host-root", className)}>{children}</div>
  )

  if (!user) {
    return (
      <div
        className="chance-competitive-theme flex min-h-screen items-center justify-center bg-[var(--chance-bg)] text-[var(--chance-fg)]"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="size-8 animate-spin rounded-full border-2 border-[var(--chance-border)] border-t-[var(--chance-brand)]" role="status">
          <span className="sr-only">Loading</span>
        </div>
      </div>
    )
  }

  return (
    <CompetitiveShell user={user} rail={rail}>
      <CompetitivePageFeed
        className={cn("chance-home-feed chance-home-feed--hero-first chance-venues-feed", host && "chance-venues-feed--host")}
      >
        {body}
      </CompetitivePageFeed>
    </CompetitiveShell>
  )
}
