import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Authenticated app page shell — matches today's route layout conventions
 * (Header + constrained main) so routes can adopt without visual surprises.
 *
 * Phase 0: not wired into routes yet; import when migrating a page.
 */
export type AppPageShellWidth = "content" | "app" | "wide" | "full"

const mainWidthClass: Record<AppPageShellWidth, string> = {
  /** Settings, chat, profile-style pages (`max-w-4xl`) */
  content: "max-w-4xl",
  /** Default hub pages (`max-w-7xl`) */
  app: "max-w-7xl",
  /** Game lobby / match (`max-w-6xl`) */
  wide: "max-w-6xl",
  full: "max-w-none",
}

export type AppPageShellProps = {
  /** Typically `<Header user={user} />` from the route's server component */
  header?: React.ReactNode
  children: React.ReactNode
  width?: AppPageShellWidth
  className?: string
  mainClassName?: string
  /** Set when the route uses a full-bleed background layer under the header */
  withRelativeStack?: boolean
}

export function AppPageShell({
  header,
  children,
  width = "app",
  className,
  mainClassName,
  withRelativeStack = true,
}: AppPageShellProps) {
  return (
    <div
      className={cn(
        "min-h-screen bg-[var(--chance-bg)] text-[var(--chance-fg)]",
        withRelativeStack && "relative",
        className
      )}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[var(--chance-radius-md)] focus:bg-[var(--chance-surface)] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-[var(--chance-fg)] focus:shadow-[var(--chance-shadow-focus)]"
      >
        Skip to main content
      </a>
      {header}
      <main
        id="main-content"
        tabIndex={-1}
        className={cn(
          "mx-auto w-full px-4 py-8 sm:px-6 lg:px-8",
          mainWidthClass[width],
          withRelativeStack && "relative z-10",
          mainClassName
        )}
      >
        {children}
      </main>
    </div>
  )
}
