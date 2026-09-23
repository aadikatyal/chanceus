"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { avatarGradient } from "@/components/dashboard/chance-craft"

type ChancePlayerAvatarProps = {
  name: string
  className?: string
}

export default function ChancePlayerAvatar({ name, className = "" }: ChancePlayerAvatarProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const initial = name.charAt(0).toUpperCase()
  const bg = mounted ? avatarGradient(name, resolvedTheme !== "dark") : undefined

  return (
    <span
      className={`chance-player-avatar inline-flex shrink-0 items-center justify-center rounded-full ring-1 ring-[var(--chance-border)] ${className}`.trim()}
      style={bg ? { background: bg } : undefined}
      aria-hidden
    >
      {initial}
    </span>
  )
}
