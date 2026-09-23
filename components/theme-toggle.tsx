"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"
import { startThemeTransition } from "@/lib/theme/start-theme-transition"

type ThemeToggleProps = {
  className?: string
  /** `fab` — circular control for the global bottom-left placement */
  variant?: "inline" | "fab"
}

export default function ThemeToggle({ className, variant = "inline" }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const fab = variant === "fab"

  if (!mounted) {
    return (
      <div
        className={cn(
          fab
            ? "chance-theme-fab-btn"
            : "size-9 rounded-[var(--chance-radius-md)] border border-[var(--chance-border)] bg-[var(--chance-muted)]",
          className,
        )}
        aria-hidden
      />
    )
  }

  const isDark = resolvedTheme === "dark"

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => {
        const next = isDark ? "light" : "dark"
        startThemeTransition(() => setTheme(next))
      }}
      className={cn(
        fab
          ? "chance-theme-fab-btn chance-focus-ring"
          : "inline-flex size-9 items-center justify-center rounded-[var(--chance-radius-md)] border border-[var(--chance-border)] bg-[var(--chance-surface)] text-[var(--chance-fg)] transition-colors hover:bg-[var(--chance-muted)]",
        className,
      )}
    >
      {isDark ? <Sun className="size-[1.125rem] stroke-[1.75]" aria-hidden /> : <Moon className="size-[1.125rem] stroke-[1.75]" aria-hidden />}
    </button>
  )
}
