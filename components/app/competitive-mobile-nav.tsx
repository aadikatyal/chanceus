"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { isNavActive, MORE_NAV, PRIMARY_NAV } from "@/lib/navigation/app-nav"
import { cn } from "@/lib/utils"

type CompetitiveMobileNavProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Slide-over nav for viewports &lt;768px — backdrop + ESC via Radix Sheet. */
export default function CompetitiveMobileNav({ open, onOpenChange }: CompetitiveMobileNavProps) {
  const pathname = usePathname()

  useEffect(() => {
    onOpenChange(false)
  }, [pathname])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="chance-mobile-nav-sheet w-[min(100vw-2rem,var(--chance-sidebar-w))] max-w-[18rem] p-0"
        aria-describedby={undefined}
      >
        <SheetHeader className="border-b border-[var(--chance-border)] p-4 text-left">
          <SheetTitle className="text-base font-semibold">Menu</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 overflow-y-auto p-3 pb-[calc(1rem+env(safe-area-inset-bottom))]" aria-label="Main">
          {[...PRIMARY_NAV, ...MORE_NAV].map(({ href, label, matchPrefix, icon: Icon }) => {
            const active = isNavActive(pathname, matchPrefix)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "chance-nav-link chance-focus-ring flex min-h-11 items-center gap-3 rounded-[var(--chance-radius-md)] px-3 py-2.5 text-sm",
                  active ? "chance-nav-active-pill font-medium" : "text-[var(--chance-muted-fg)]"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-5 shrink-0 stroke-[1.75]" aria-hidden />
                {label}
              </Link>
            )
          })}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
