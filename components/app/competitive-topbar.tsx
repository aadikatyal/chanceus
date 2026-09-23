"use client"

import Image from "next/image"
import Link from "next/link"
import { Bell, Coins, Menu, Search } from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import CompetitiveMobileNav from "@/components/app/competitive-mobile-nav"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOut } from "@/lib/actions"
import { createClient } from "@/lib/supabase/client"
import type { User as UserType } from "@/lib/supabase/client"
import { isNavActive, MORE_NAV, PRIMARY_NAV } from "@/lib/navigation/app-nav"
import { LogOut, Settings, User, X } from "lucide-react"

type CompetitiveTopbarProps = {
  user: UserType
}

export default function CompetitiveTopbar({ user }: CompetitiveTopbarProps) {
  const pathname = usePathname()
  const [tokenCount, setTokenCount] = useState(user.tokens ?? 0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const displayName = user.display_name || user.username
  const username = user.username
  const avatarUrl = user.avatar_url ?? null

  useEffect(() => {
    setTokenCount(user.tokens ?? 0)
  }, [user.tokens])

  useEffect(() => {
    if (!user.id) return
    const supabase = createClient()
    const channel = supabase
      .channel(`shell-tokens-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "users", filter: `id=eq.${user.id}` },
        (payload) => {
          const next = payload.new as { tokens?: number }
          if (next.tokens !== undefined) setTokenCount(next.tokens)
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user.id])

  const pageTitle =
    PRIMARY_NAV.find((n) => isNavActive(pathname, n.matchPrefix))?.label ??
    MORE_NAV.find((n) => isNavActive(pathname, n.matchPrefix))?.label ??
    "ChanceUS"

  return (
    <>
      <header className="chance-topbar-rich sticky top-0 z-40 flex h-[var(--chance-header-h)] min-h-[var(--chance-header-h)] items-center gap-2 border-b border-[var(--chance-border)] px-3 backdrop-blur-xl sm:gap-3 sm:px-4 md:px-5 lg:px-6 pt-[env(safe-area-inset-top,0px)]">
        <Button
          variant="ghost"
          size="icon"
          className="chance-toolbar-btn chance-focus-ring md:hidden"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <Menu className="size-5 stroke-[1.75]" />
        </Button>

        <Link
          href="/dashboard"
          className="chance-focus-ring chance-pressable flex shrink-0 items-center gap-2 rounded-[var(--chance-radius-md)] md:hidden"
        >
          <Image src="/chanceus-eagle.png" alt="" width={32} height={32} className="size-8 object-contain" priority />
          <span className="sr-only">ChanceUS</span>
        </Link>

        <h1 className="min-w-0 flex-1 truncate text-sm font-semibold md:hidden">{pageTitle}</h1>

        <div className="mx-auto hidden min-w-0 max-w-md flex-1 lg:block">
          <label className="relative block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--chance-muted-fg)]"
              aria-hidden
            />
            <input
              type="search"
              placeholder="Search players, games…"
              className="chance-search-rich chance-focus-ring h-10 w-full pl-9 pr-16 text-sm tracking-[-0.01em] text-[var(--chance-fg)] placeholder:text-[var(--chance-muted-fg)] focus:border-[var(--chance-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--chance-brand)]/20"
              readOnly
              aria-label="Search (coming soon)"
            />
            <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-[var(--chance-border)] bg-[var(--chance-muted)] px-1.5 py-0.5 text-[10px] text-[var(--chance-muted-fg)] sm:inline">
              ⌘K
            </kbd>
          </label>
        </div>

        <div className="hidden items-center gap-2 md:flex lg:hidden">
          {searchOpen ? (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <label className="relative block min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--chance-muted-fg)]" aria-hidden />
                <input
                  type="search"
                  placeholder="Search…"
                  className="chance-search-rich chance-focus-ring h-10 w-full min-w-0 pl-9 text-sm"
                  readOnly
                  aria-label="Search (coming soon)"
                />
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="chance-toolbar-btn chance-focus-ring shrink-0"
                aria-label="Close search"
                onClick={() => setSearchOpen(false)}
              >
                <X className="size-5" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="chance-toolbar-btn chance-focus-ring"
              aria-label="Open search"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="size-5 stroke-[1.75]" />
            </Button>
          )}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 md:gap-3">
          <Link
            href="/wallet"
            className="chance-token-pill chance-token-pill-rich chance-focus-ring chance-pressable inline-flex min-h-11 items-center gap-1.5 rounded-[var(--chance-radius-md)] px-2 py-1.5 text-sm hover:border-[var(--chance-brand)] sm:gap-2 sm:px-3 sm:py-2"
          >
            <Coins className="size-4 stroke-[1.75] text-[var(--chance-brand)]" aria-hidden />
            <span className="chance-text-mono text-[0.8125rem] font-semibold tabular-nums tracking-tight">
              {tokenCount.toLocaleString()}
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="chance-toolbar-btn chance-focus-ring hidden md:inline-flex"
            aria-label="Notifications"
          >
            <Bell className="size-[1.125rem] stroke-[1.75]" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="chance-focus-ring relative size-11 min-h-11 min-w-11 rounded-full p-0 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                aria-label="Account menu"
              >
                <Avatar className="size-9 ring-2 ring-[var(--chance-brand)]/30">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                  <AvatarFallback className="bg-[var(--chance-brand)] text-[var(--chance-brand-fg)]">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="chance-shell-dropdown w-56 rounded-xl">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">@{username}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <User className="mr-2 size-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="mr-2 size-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => signOut()}>
                <LogOut className="mr-2 size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CompetitiveMobileNav open={menuOpen} onOpenChange={setMenuOpen} />
    </>
  )
}
