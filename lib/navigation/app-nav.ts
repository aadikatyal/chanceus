import type { LucideIcon } from "lucide-react"
import {
  Building2,
  Gamepad2,
  History,
  Home,
  MessageSquare,
  Trophy,
  UserPlus,
  Video,
  Wallet,
} from "lucide-react"

export type AppNavItem = {
  href: string
  label: string
  matchPrefix: string
  icon: LucideIcon
}

export const PRIMARY_NAV: AppNavItem[] = [
  { href: "/dashboard", label: "Home", matchPrefix: "/dashboard", icon: Home },
  { href: "/games", label: "Play", matchPrefix: "/games", icon: Gamepad2 },
  { href: "/matches", label: "Activity", matchPrefix: "/matches", icon: History },
  { href: "/wallet", label: "Wallet", matchPrefix: "/wallet", icon: Wallet },
]

export const MORE_NAV: AppNavItem[] = [
  { href: "/tournaments", label: "Compete", matchPrefix: "/tournaments", icon: Trophy },
  { href: "/chat", label: "Social", matchPrefix: "/chat", icon: MessageSquare },
  { href: "/friends/add", label: "Add friends", matchPrefix: "/friends", icon: UserPlus },
  { href: "/bars", label: "Venues", matchPrefix: "/bars", icon: Building2 },
  { href: "/call", label: "Live call", matchPrefix: "/call", icon: Video },
]

export function isNavActive(pathname: string, matchPrefix: string) {
  if (matchPrefix === "/dashboard") return pathname === "/dashboard"
  return pathname === matchPrefix || pathname.startsWith(`${matchPrefix}/`)
}
