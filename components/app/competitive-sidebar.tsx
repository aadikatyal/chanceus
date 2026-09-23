"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { isNavActive, MORE_NAV, PRIMARY_NAV } from "@/lib/navigation/app-nav"

export default function CompetitiveSidebar() {
  const pathname = usePathname()

  return (
    <aside className="chance-shell-sidebar hidden h-full min-h-0 flex-col px-3 py-4 md:flex">
      <Link
        href="/dashboard"
        className="chance-focus-ring chance-pressable mb-6 flex items-center gap-2.5 rounded-[var(--chance-radius-md)] px-2 py-1.5"
      >
        <Image
          src="/chanceus-eagle.png"
          alt="ChanceUS"
          width={40}
          height={40}
          className="size-9 object-contain"
          priority
        />
        <span className="chance-nav-label text-sm font-semibold tracking-tight">ChanceUS</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1" aria-label="Main">
        {PRIMARY_NAV.map(({ href, label, matchPrefix, icon: Icon }) => {
          const active = isNavActive(pathname, matchPrefix)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "chance-nav-link chance-focus-ring flex items-center gap-3 rounded-[var(--chance-radius-md)] px-3 py-2.5 text-[0.8125rem] font-medium tracking-[-0.01em]",
                active
                  ? "chance-nav-active-pill text-[var(--chance-fg)]"
                  : "text-[var(--chance-muted-fg)] hover:bg-[var(--chance-muted)]/60 hover:text-[var(--chance-fg)]"
              )}
              aria-current={active ? "page" : undefined}
              aria-label={label}
              title={label}
            >
              <Icon
                className={cn(
                  "chance-nav-icon size-[1.125rem] shrink-0 stroke-[1.75]",
                  active ? "text-[var(--chance-brand)]" : "opacity-75"
                )}
                aria-hidden
              />
              <span className="chance-nav-label">{label}</span>
            </Link>
          )
        })}

        <hr className="chance-sidebar-divider chance-nav-label-only" />
        <p className="chance-sidebar-section-label chance-nav-label-only">More</p>

        {MORE_NAV.map(({ href, label, matchPrefix, icon: Icon }) => {
          const active = isNavActive(pathname, matchPrefix)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "chance-nav-link chance-focus-ring flex items-center gap-3 rounded-[var(--chance-radius-md)] px-3 py-2 text-[0.8125rem]",
                active
                  ? "chance-nav-active-pill font-medium text-[var(--chance-fg)]"
                  : "text-[var(--chance-muted-fg)] hover:bg-[var(--chance-muted)]/60 hover:text-[var(--chance-fg)]"
              )}
              aria-label={label}
              title={label}
            >
              <Icon className="chance-nav-icon size-4 shrink-0 stroke-[1.75] opacity-75" aria-hidden />
              <span className="chance-nav-label">{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="chance-invite-card chance-nav-label-only relative mt-4 p-4">
        <p className="text-sm font-semibold">Invite friends</p>
        <p className="chance-text-caption mt-1 leading-relaxed">
          Share your link — earn tokens when they finish their first ranked match.
        </p>
        <Link
          href="/friends/add"
          className="chance-secondary-btn chance-focus-ring mt-3 w-full px-3 py-2.5 hover:text-[var(--chance-brand)]"
        >
          Copy invite link
        </Link>
      </div>
    </aside>
  )
}
