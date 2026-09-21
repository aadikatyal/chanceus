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
import { LogOut, Settings, User, Wallet, Coins, Gamepad2, Menu, Trophy, MessageSquare, Users, Video } from "lucide-react"
import CallInviteListener from "@/components/call/call-invite-listener"
import ThemeToggle from "@/components/theme-toggle"
import Link from "next/link"
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

export default function Header({ user }: HeaderProps) {
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
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href={user ? "/dashboard" : "/"} className="flex items-center space-x-3 hover-lift">
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
            <nav className="hidden md:flex items-center space-x-8">
              <Link
                href="/dashboard"
                className="text-foreground hover:text-accent transition-colors duration-150 font-medium text-sm whitespace-nowrap"
              >
                Dashboard
              </Link>
              <Link
                href="/games"
                className="text-foreground hover:text-accent transition-colors duration-150 font-medium text-sm whitespace-nowrap"
              >
                Games
              </Link>
              <Link
                href="/call"
                className="text-foreground hover:text-accent transition-colors duration-150 font-medium text-sm inline-flex items-center gap-1 whitespace-nowrap"
              >
                <Video className="h-4 w-4 shrink-0" />
                Live Call
              </Link>
              <Link
                href="/matches"
                className="text-foreground hover:text-accent transition-colors duration-150 font-medium text-sm whitespace-nowrap"
              >
                Matches
              </Link>
              <Link
                href="/wallet"
                className="text-foreground hover:text-accent transition-colors duration-150 font-medium text-sm whitespace-nowrap"
              >
                Wallet
              </Link>
              <Link
                href="/bars"
                className="text-foreground hover:text-accent transition-colors duration-150 font-medium text-sm whitespace-nowrap"
              >
                Bar Trivia
              </Link>
              <Link
                href="/tournaments"
                className="text-foreground hover:text-accent transition-colors duration-150 font-medium text-sm whitespace-nowrap"
              >
                Tournaments
              </Link>
              <Link
                href="/chat"
                className="text-foreground hover:text-accent transition-colors duration-150 font-medium text-sm whitespace-nowrap"
              >
                Chat
              </Link>
            </nav>
          )}

          <div className="flex items-center space-x-3">
            {user && (
              <>
                <ThemeToggle />
                <div className="hidden sm:flex items-center space-x-2 bg-secondary border border-border rounded-lg px-3 py-2">
                  <Coins className="h-4 w-4 text-accent" />
                  <span className="text-foreground font-semibold">{tokenCount.toLocaleString()}</span>
                  <span className="text-muted-foreground text-sm">tokens</span>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-white/10">
                      <Avatar className="h-10 w-10 ring-2 ring-orange-500/50">
                        {/* Only render the image if we truly have a user avatar */}
                        {avatarUrl ? (
                          <AvatarImage
                            src={avatarUrl}
                            alt={displayName}
                            className="transition-opacity duration-200 data-[loaded=false]:opacity-0 data-[loaded=true]:opacity-100"
                          />
                        ) : null}
                        <AvatarFallback className="bg-orange-500 text-black font-bold">
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
                      <Link href="/games">
                        <Gamepad2 className="mr-2 h-4 w-4" />
                        Games
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-lg m-1">
                      <Link href="/wallet">
                        <Wallet className="mr-2 h-4 w-4" />
                        Wallet
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
                      className="md:hidden"
                    >
                      <Menu className="h-6 w-6" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[300px]">
                    <SheetHeader>
                      <SheetTitle className="text-left">Navigation</SheetTitle>
                    </SheetHeader>
                    <nav className="flex flex-col space-y-2 mt-6">
                      <Link
                        href="/dashboard"
                        className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-secondary transition-colors"
                      >
                        <User className="h-5 w-5" />
                        <span>Dashboard</span>
                      </Link>
                      <Link
                        href="/games"
                        className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-secondary transition-colors"
                      >
                        <Gamepad2 className="h-5 w-5" />
                        <span>Games</span>
                      </Link>
                      <Link
                        href="/call"
                        className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-secondary transition-colors"
                      >
                        <Video className="h-5 w-5" />
                        <span>Live Call</span>
                      </Link>
                      <Link
                        href="/matches"
                        className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-secondary transition-colors"
                      >
                        <Trophy className="h-5 w-5" />
                        <span>Matches</span>
                      </Link>
                      <Link
                        href="/wallet"
                        className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-secondary transition-colors"
                      >
                        <Wallet className="h-5 w-5" />
                        <span>Wallet</span>
                      </Link>
                      <Link
                        href="/bars"
                        className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-secondary transition-colors"
                      >
                        <Users className="h-5 w-5" />
                        <span>Bar Trivia</span>
                      </Link>
                      <Link
                        href="/tournaments"
                        className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-secondary transition-colors"
                      >
                        <Trophy className="h-5 w-5" />
                        <span>Tournaments</span>
                      </Link>
                      <Link
                        href="/chat"
                        className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-secondary transition-colors"
                      >
                        <MessageSquare className="h-5 w-5" />
                        <span>Chat</span>
                      </Link>
                      <div className="border-t border-gray-700 my-2"></div>
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