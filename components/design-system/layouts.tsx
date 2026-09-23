import * as React from "react"
import { cn } from "@/lib/utils"
import { ChanceText } from "./typography"

/** Stripe-style marketing width */
export function ChanceMarketingShell({
  className,
  children,
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("min-h-screen bg-[var(--chance-bg)] text-[var(--chance-fg)]", className)}>
      {children}
    </div>
  )
}

/** Linear-style app chrome with max width */
export function ChanceAppShell({
  className,
  children,
  width = "app",
}: React.ComponentProps<"div"> & { width?: "content" | "app" | "wide" | "full" }) {
  const maxW = {
    content: "max-w-[var(--chance-max-content)]",
    app: "max-w-[var(--chance-max-app)]",
    wide: "max-w-[var(--chance-max-wide)]",
    full: "max-w-none",
  }[width]

  return (
    <div className={cn("min-h-screen bg-[var(--chance-bg)]", className)}>
      <div className={cn("mx-auto w-full px-6 md:px-8", maxW)}>{children}</div>
    </div>
  )
}

export type ChancePageHeaderProps = {
  title: React.ReactNode
  description?: React.ReactNode
  label?: string
  actions?: React.ReactNode
  className?: string
  /** Stable id for skip links / in-page anchors */
  id?: string
  titleClassName?: string
}

export function ChancePageHeader({
  title,
  description,
  label,
  actions,
  className,
  id = "page-header",
  titleClassName,
}: ChancePageHeaderProps) {
  return (
    <header
      id={id}
      className={cn(
        "flex flex-col gap-4 border-b border-[var(--chance-border)] py-8 md:flex-row md:items-end md:justify-between",
        className
      )}
    >
      <div className="flex max-w-2xl flex-col gap-2">
        {label ? <ChanceText variant="label">{label}</ChanceText> : null}
        <ChanceText as="h1" variant="h1" className={titleClassName}>
          {title}
        </ChanceText>
        {description ? (
          typeof description === "string" ? (
            <ChanceText variant="muted">{description}</ChanceText>
          ) : (
            description
          )
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}

export function ChanceSection({
  className,
  title,
  description,
  children,
  id,
}: React.ComponentProps<"section"> & {
  title?: string
  description?: string
}) {
  return (
    <section id={id} className={cn("py-[var(--chance-section-y,2rem)]", className)}>
      {(title || description) && (
        <div className="mb-6 flex max-w-2xl flex-col gap-1.5">
          {title ? (
            <ChanceText as="h2" variant="h3">
              {title}
            </ChanceText>
          ) : null}
          {description ? <ChanceText variant="muted">{description}</ChanceText> : null}
        </div>
      )}
      {children}
    </section>
  )
}

export function ChanceSplitLayout({
  className,
  sidebar,
  children,
  sidebarPosition = "left",
}: {
  className?: string
  sidebar: React.ReactNode
  children: React.ReactNode
  sidebarPosition?: "left" | "right"
}) {
  return (
    <div
      className={cn(
        "grid gap-8 lg:grid-cols-[var(--chance-sidebar-w)_1fr] lg:gap-10",
        sidebarPosition === "right" && "lg:grid-cols-[1fr_var(--chance-sidebar-w)]",
        className
      )}
    >
      <aside
        className={cn(
          "min-w-0",
          sidebarPosition === "right" && "lg:col-start-2 lg:row-start-1"
        )}
      >
        {sidebar}
      </aside>
      <main className={cn("min-w-0", sidebarPosition === "right" && "lg:col-start-1 lg:row-start-1")}>
        {children}
      </main>
    </div>
  )
}

/** Kalshi-style dense dashboard grid */
export function ChanceDashboardGrid({
  className,
  children,
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className
      )}
    >
      {children}
    </div>
  )
}

export function ChanceToolbar({
  className,
  children,
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 flex h-[var(--chance-header-h)] items-center gap-3 border-b border-[var(--chance-border)] bg-[var(--chance-bg)]/90 backdrop-blur-md",
        className
      )}
    >
      {children}
    </div>
  )
}

export function ChanceStack({
  className,
  gap = "md",
  children,
}: React.ComponentProps<"div"> & { gap?: "sm" | "md" | "lg" }) {
  const gapClass = { sm: "gap-3", md: "gap-4", lg: "gap-6" }[gap]
  return (
    <div className={cn("flex flex-col", gapClass, className)}>
      {children}
    </div>
  )
}

export function ChanceInline({
  className,
  gap = "sm",
  children,
}: React.ComponentProps<"div"> & { gap?: "sm" | "md" }) {
  const gapClass = { sm: "gap-2", md: "gap-3" }[gap]
  return (
    <div className={cn("flex flex-wrap items-center", gapClass, className)}>
      {children}
    </div>
  )
}
