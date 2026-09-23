import type React from "react"

/** Shared visual helpers for dashboard polish — no layout changes */

export function avatarGradient(name: string, lightMode = true) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const hues = [145, 200, 260, 320, 40]
  const h = hues[Math.abs(hash) % hues.length]
  if (lightMode) {
    return `linear-gradient(145deg, hsl(${h} 38% 90%), hsl(${h} 32% 78%))`
  }
  return `linear-gradient(145deg, hsl(${h} 42% 34%), hsl(${h} 32% 16%))`
}

export function resultLabel(result: "won" | "lost" | "draw") {
  if (result === "won") return "Won"
  if (result === "lost") return "Lost"
  return "Draw"
}

export function SkeletonRows({ rows = 3, className = "h-11" }: { rows?: number; className?: string }) {
  return (
    <ul className="chance-skeleton-list" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className={`chance-skeleton ${className}`} />
      ))}
    </ul>
  )
}

export function EmptyState({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={`chance-empty-state ${className}`.trim()}>{children}</div>
}
