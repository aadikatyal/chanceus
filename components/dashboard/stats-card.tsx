import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { ChanceStatCard } from "@/components/design-system/stat-card"

interface StatsCardProps {
  title: string
  value: string | number | ReactNode
  description?: string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

/** @deprecated Prefer `ChanceStatCard` — thin wrapper for legacy imports during migration. */
export default function StatsCard(props: StatsCardProps) {
  const accent =
    props.className?.includes("green") || props.className?.includes("yes")
      ? "yes"
      : props.className?.includes("red") || props.className?.includes("no")
        ? "no"
        : props.className?.includes("brand") || props.className?.includes("cyan")
          ? "brand"
          : "none"

  return (
    <ChanceStatCard
      title={props.title}
      value={props.value}
      description={props.description}
      icon={props.icon}
      trend={props.trend}
      accent={accent}
      className={props.className}
    />
  )
}
