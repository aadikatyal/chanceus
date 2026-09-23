"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "#games", label: "Games" },
  { href: "#community", label: "Community" },
  { href: "/tournaments", label: "Tournaments" },
]

export default function LandingHeader() {
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
        "chance-landing-header fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300",
        scrolled
          ? "border-[var(--chance-border)] bg-[color-mix(in_srgb,var(--chance-bg)_82%,transparent)] backdrop-blur-xl"
          : "border-transparent bg-transparent"
      )}
    >
      <div className="chance-landing-header-inner mx-auto flex h-[var(--chance-header-h)] max-w-[90rem] items-center gap-4 px-4 sm:px-6 lg:px-8 pt-[env(safe-area-inset-top,0px)]">
        <Link href="/" className="chance-focus-ring chance-pressable flex shrink-0 items-center gap-2 rounded-md py-1">
          <Image src="/chanceus-eagle.png" alt="ChanceUS" width={36} height={36} className="size-9 object-contain" priority />
          <span className="hidden text-sm font-semibold tracking-tight sm:inline">ChanceUS</span>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-8 md:flex" aria-label="Landing">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="chance-landing-nav-link chance-focus-ring text-sm font-medium">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <Link href="/auth/login" className="chance-landing-nav-link chance-focus-ring hidden px-3 py-2 text-sm font-medium sm:inline-flex">
            Sign in
          </Link>
          <Link href="/auth/sign-up" className="chance-hero-cta-primary chance-focus-ring px-4 py-2.5 text-sm">
            Get started
          </Link>
        </div>
      </div>
    </header>
  )
}
