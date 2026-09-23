"use client"

import ThemeToggle from "@/components/theme-toggle"

/** Fixed bottom-left theme control on every page */
export default function GlobalThemeToggle() {
  return (
    <div className="chance-theme-fab">
      <ThemeToggle variant="fab" />
    </div>
  )
}
