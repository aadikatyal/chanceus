"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { onLandingHashClick } from "@/components/landing/landing-scroll"

const NAV = [
  { href: "#games", label: "Games" },
  { href: "#community", label: "Community" },
  { href: "#tournaments", label: "Tournaments" },
]

type LandingHeaderProps = {
  arenaActive?: boolean
}

export default function LandingHeader({ arenaActive = false }: LandingHeaderProps) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={cn(
        "chance-landing-header chance-landing-header--desktop fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300",
        scrolled
          ? "border-[var(--chance-border)] bg-[color-mix(in_srgb,var(--chance-bg)_82%,transparent)] backdrop-blur-xl"
          : "border-transparent bg-transparent"
      )}
    >
      <div className="chance-landing-header-inner mx-auto grid h-[var(--chance-header-h)] max-w-[90rem] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-6 lg:px-8 pt-[env(safe-area-inset-top,0px)]">
        <Link href="/" className="chance-focus-ring chance-pressable flex min-w-0 items-center justify-self-start gap-2 rounded-md py-1">
          <Image src="/chanceus-eagle.png" alt="ChanceUS" width={36} height={36} className="size-9 object-contain" priority />
          <span className="hidden text-sm font-semibold tracking-tight sm:inline">ChanceUS</span>
          {arenaActive ? (
            <span className="chance-landing-header-live hidden sm:inline-flex" aria-label="Arena activity live">
              <span className="chance-landing-header-live-dot" aria-hidden />
              Live
            </span>
          ) : null}
        </Link>

        <nav
          className="flex min-w-0 items-center justify-center gap-4 overflow-x-auto sm:gap-6 md:gap-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Landing"
        >
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="chance-landing-nav-link chance-focus-ring whitespace-nowrap text-sm font-medium"
              onClick={(e) => onLandingHashClick(e, item.href)}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex min-w-0 items-center justify-self-end gap-2 sm:gap-3">
          <Link href="/auth/login" className="chance-landing-nav-link chance-focus-ring hidden px-3 py-2 text-sm font-medium sm:inline-flex">
            Sign in
          </Link>
          <Link href="/auth/sign-up" className="chance-hero-cta-primary chance-focus-ring whitespace-nowrap px-4 py-2.5 text-sm">
            Get started
          </Link>
        </div>
      </div>
    </header>
  )
}
