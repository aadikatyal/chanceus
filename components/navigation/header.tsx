"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, Settings, User, Coins, Menu, ChevronDown } from "lucide-react"
import { isNavActive, MORE_NAV, PRIMARY_NAV } from "@/lib/navigation/app-nav"
import CallInviteListener from "@/components/call/call-invite-listener"
import ThemeToggle from "@/components/theme-toggle"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { signOut } from "@/lib/actions"
import type { User as UserType } from "@/lib/supabase/client"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

interface HeaderProps {
  user?: UserType | null
}

function primaryNavClass(active: boolean) {
  return cn(
    "whitespace-nowrap text-sm font-medium transition-colors duration-[var(--chance-duration-fast)]",
    active
      ? "text-[var(--chance-brand)]"
      : "text-[var(--chance-fg)] hover:text-[var(--chance-brand)]"
  )
}

export default function Header({ user }: HeaderProps) {
  const pathname = usePathname()
  const [tokenCount, setTokenCount] = useState(user?.tokens || 0)
  
  // Debug logging (only log once)
  useEffect(() => {
    if (user) {
      console.log("🔍 DEBUG: Header received user:", user.username, "Tokens:", user.tokens)
      setTokenCount(user.tokens || 0)
    }
  }, [user?.id]) // Only log when user ID changes
  
  // Subscribe to real-time token updates
  useEffect(() => {
    if (!user?.id) return
    
    const supabase = createClient()
    
    // Subscribe to user token updates
    const channel = supabase
      .channel(`user-tokens-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          const updatedUser = payload.new as any
          if (updatedUser.tokens !== undefined) {
            console.log('💰 Token balance updated:', updatedUser.tokens)
            setTokenCount(updatedUser.tokens)
          }
        }
      )
      .subscribe()
    
    // Also poll for updates every 2 seconds as a backup
    const pollInterval = setInterval(async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('tokens')
        .eq('id', user.id)
        .single()
      
      if (userData) {
        setTokenCount(prev => {
          if (userData.tokens !== prev) {
            console.log('💰 Token balance updated via polling:', userData.tokens)
            return userData.tokens
          }
          return prev
        })
      }
    }, 2000)
    
    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
    }
  }, [user?.id])
  const displayName = user?.display_name || user?.username || "Guest"
  const username = user?.username || "guest"
  const avatarUrl = user?.avatar_url ?? null // only truthy if user actually has an avatar

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--chance-border)] bg-[var(--chance-bg)]/90 backdrop-blur-md supports-[backdrop-filter]:bg-[var(--chance-bg)]/80">
      <div className="mx-auto h-[var(--chance-header-h)] max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="chance-header-bar flex h-full items-center justify-between">
          <Link href={user ? "/dashboard" : "/"} className="flex shrink-0 items-center space-x-3 hover-lift">
            <Image
              src="/chanceus-eagle.png"
              alt="ChanceUS"
              width={60}
              height={60}
              className="h-12 w-12 flex-shrink-0 object-contain"
              priority
            />
          </Link>

          {user && (
            <nav
              className="chance-nav-desktop hidden items-center gap-6 md:flex lg:gap-8"
              aria-label="Main"
            >
              {PRIMARY_NAV.map(({ href, label, matchPrefix }) => (
                <Link
                  key={href}
                  href={href}
                  className={primaryNavClass(isNavActive(pathname, matchPrefix))}
                  aria-current={isNavActive(pathname, matchPrefix) ? "page" : undefined}
                >
                  {label}
                </Link>
              ))}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1 whitespace-nowrap text-sm font-medium transition-colors duration-[var(--chance-duration-fast)]",
                      MORE_NAV.some((item) => isNavActive(pathname, item.matchPrefix))
                        ? "text-[var(--chance-brand)]"
                        : "text-[var(--chance-fg)] hover:text-[var(--chance-brand)]"
                    )}
                  >
                    More
                    <ChevronDown className="size-4 opacity-70" aria-hidden />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 rounded-xl">
                  {MORE_NAV.map(({ href, label, icon: Icon }) => (
                    <DropdownMenuItem key={href} asChild className="rounded-lg m-1">
                      <Link href={href}>
                        <Icon className="mr-2 h-4 w-4" aria-hidden />
                        {label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          )}

          <div className="chance-header-actions flex items-center space-x-3">
            {user && (
              <>
                <ThemeToggle />
                <Link
                  href="/wallet"
                  className="chance-token-pill hidden items-center space-x-2 rounded-[var(--chance-radius-md)] border border-[var(--chance-border)] bg-[var(--chance-muted)] px-3 py-2 transition-colors hover:border-[var(--chance-border-strong)] hover:bg-[var(--chance-surface-inset)] sm:flex"
                  aria-label={`Token balance: ${tokenCount.toLocaleString()}. Go to wallet`}
                >
                  <Coins className="h-4 w-4 text-[var(--chance-brand)]" aria-hidden />
                  <span className="font-mono text-sm font-semibold tabular-nums text-[var(--chance-fg)]">
                    {tokenCount.toLocaleString()}
                  </span>
                  <span className="text-sm text-[var(--chance-muted-fg)]">tokens</span>
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-10 w-10 rounded-full hover:bg-[var(--chance-muted)]"
                      aria-label="Open account menu"
                    >
                      <Avatar className="h-10 w-10 ring-2 ring-[var(--chance-brand)]/40">
                        {/* Only render the image if we truly have a user avatar */}
                        {avatarUrl ? (
                          <AvatarImage
                            src={avatarUrl}
                            alt={displayName}
                            className="transition-opacity duration-200 data-[loaded=false]:opacity-0 data-[loaded=true]:opacity-100"
                          />
                        ) : null}
                        <AvatarFallback className="bg-[var(--chance-brand)] font-bold text-[var(--chance-brand-fg)]">
                          {displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-56 rounded-xl"
                    align="end"
                    forceMount
                  >
                    <DropdownMenuLabel className="font-normal p-4">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{displayName}</p>
                        <p className="text-xs leading-none text-muted-foreground">@{username}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="rounded-lg m-1">
                      <Link href="/profile">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-lg m-1">
                      <Link href="/settings">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive cursor-pointer rounded-lg m-1"
                      onClick={() => signOut()}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Mobile Navigation Menu - to the right of profile picture */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="chance-nav-mobile-only md:hidden"
                    >
                      <Menu className="h-6 w-6" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[300px]">
                    <SheetHeader>
                      <SheetTitle className="text-left">Navigation</SheetTitle>
                    </SheetHeader>
                    <nav className="mt-6 flex flex-col space-y-1">
                      <p className="px-4 pb-1 chance-text-label">Main</p>
                      {PRIMARY_NAV.map(({ href, label, matchPrefix, icon: Icon }) => (
                        <Link
                          key={href}
                          href={href}
                          className={cn(
                            "flex items-center space-x-3 rounded-lg px-4 py-3 transition-colors",
                            isNavActive(pathname, matchPrefix)
                              ? "bg-[var(--chance-muted)] text-[var(--chance-brand)]"
                              : "hover:bg-secondary"
                          )}
                          aria-current={isNavActive(pathname, matchPrefix) ? "page" : undefined}
                        >
                          <Icon className="h-5 w-5 shrink-0" aria-hidden />
                          <span>{label}</span>
                        </Link>
                      ))}
                      <p className="px-4 pb-1 pt-4 chance-text-label">More</p>
                      {MORE_NAV.map(({ href, label, icon: Icon }) => (
                        <Link
                          key={href}
                          href={href}
                          className="flex items-center space-x-3 rounded-lg px-4 py-3 transition-colors hover:bg-secondary"
                        >
                          <Icon className="h-5 w-5 shrink-0" aria-hidden />
                          <span>{label}</span>
                        </Link>
                      ))}
                      <div className="my-2 border-t border-[var(--chance-border)]" />
                      <Link
                        href="/profile"
                        className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-secondary transition-colors"
                      >
                        <User className="h-5 w-5" />
                        <span>Profile</span>
                      </Link>
                      <Link
                        href="/settings"
                        className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-secondary transition-colors"
                      >
                        <Settings className="h-5 w-5" />
                        <span>Settings</span>
                      </Link>
                      <button
                        onClick={() => signOut()}
                        className="flex items-center space-x-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors text-left w-full"
                      >
                        <LogOut className="h-5 w-5" />
                        <span>Sign Out</span>
                      </button>
                    </nav>
                  </SheetContent>
                </Sheet>
              </>
            )}
            <CallInviteListener userId={user?.id} />
            {!user && (
              <div className="flex items-center space-x-3">
                <ThemeToggle />
                <Link href="/auth/login">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link href="/auth/sign-up">
                  <Button>Get Started</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}