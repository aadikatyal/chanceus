import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type CompetitivePageFeedProps = {
  children: ReactNode
  className?: string
}

/** Main column width — matches Home / Activity / Wallet (full shell main, not a narrow column). */
export default function CompetitivePageFeed({ children, className }: CompetitivePageFeedProps) {
  return (
    <div
      className={cn(
        "chance-home-feed mx-auto w-full max-w-none pb-8 xl:max-w-[calc(100%-1rem)]",
        className
      )}
    >
      {children}
    </div>
  )
}
