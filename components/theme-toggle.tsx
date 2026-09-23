"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { startThemeTransition } from "@/lib/theme/start-theme-transition"

type ThemeToggleProps = {
  className?: string
}

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <div
        className={`size-9 rounded-[var(--chance-radius-md)] border border-[var(--chance-border)] bg-[var(--chance-muted)] ${className ?? ""}`}
        aria-hidden
      />
    )
  }

  const isDark = resolvedTheme === "dark"

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => {
        const next = isDark ? "light" : "dark"
        startThemeTransition(() => setTheme(next))
      }}
      className={
        className ??
        "size-9 border border-[var(--chance-border)] bg-[var(--chance-surface)] text-[var(--chance-fg)] hover:bg-[var(--chance-muted)]"
      }
    >
      {isDark ? <Sun className="size-4 stroke-[1.75]" /> : <Moon className="size-4 stroke-[1.75]" />}
    </Button>
  )
}
