import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  ChanceCard,
  ChanceCardContent,
  ChanceCardHeader,
  ChanceCardTitle,
} from "./card"
import { ChanceText } from "./typography"

export type ChanceStatCardProps = {
  title: string
  value: React.ReactNode
  description?: string
  icon?: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
  /** Optional accent border (e.g. brand, yes) — use sparingly */
  accent?: "brand" | "yes" | "no" | "none"
}

const accentBorder: Record<NonNullable<ChanceStatCardProps["accent"]>, string> = {
  none: "",
  brand: "border-[var(--chance-brand)]/25",
  yes: "border-[var(--chance-yes)]/25",
  no: "border-[var(--chance-no)]/25",
}

/**
 * KPI metric tile for dashboard-style grids. API mirrors legacy `StatsCard`
 * for easier route migration in later phases.
 */
export function ChanceStatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
  accent = "none",
}: ChanceStatCardProps) {
  return (
    <ChanceCard
      variant="default"
      padding="sm"
      className={cn(accentBorder[accent], className)}
    >
      <ChanceCardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <ChanceCardTitle className="chance-text-label normal-case tracking-normal text-[var(--chance-muted-fg)]">
          {title}
        </ChanceCardTitle>
        {Icon ? (
          <Icon className="size-4 shrink-0 text-[var(--chance-muted-fg)]" aria-hidden />
        ) : null}
      </ChanceCardHeader>
      <ChanceCardContent>
        <div className="chance-text-mono text-2xl font-semibold text-[var(--chance-fg)]">
          {value}
        </div>
        {description ? (
          <p className="chance-text-caption mt-1">{description}</p>
        ) : null}
        {trend ? (
          <p
            className={cn(
              "chance-text-caption mt-1 font-medium",
              trend.isPositive ? "text-[var(--chance-yes)]" : "text-[var(--chance-no)]"
            )}
          >
            {trend.isPositive ? "+" : ""}
            {trend.value}% from last week
          </p>
        ) : null}
      </ChanceCardContent>
    </ChanceCard>
  )
}
