"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { onLandingHashClick } from "@/components/landing/landing-scroll"

const NAV = [
  { href: "#games", label: "Games" },
  { href: "#community", label: "Community" },
  { href: "#tournaments", label: "Tournaments" },
]

type LandingMobileHeaderProps = {
  arenaActive?: boolean
}

export default function LandingMobileHeader({ arenaActive = false }: LandingMobileHeaderProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <>
      <header className="chance-landing-mobile-header">
        <div className="chance-landing-mobile-header-inner">
          <Link href="/" className="chance-landing-mobile-logo chance-focus-ring" onClick={close}>
            <Image src="/chanceus-eagle.png" alt="ChanceUS" width={40} height={40} className="size-10 object-contain" priority />
            <span>ChanceUS</span>
            {arenaActive ? <span className="chance-landing-mobile-live-dot" aria-label="Arena live" /> : null}
          </Link>
          <button
            type="button"
            className="chance-landing-mobile-menu-btn chance-focus-ring"
            aria-expanded={open}
            aria-controls="landing-mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          </button>
        </div>
      </header>

      <div
        id="landing-mobile-nav"
        className={cn("chance-landing-mobile-nav", open && "is-open")}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
      >
        <nav className="chance-landing-mobile-nav-inner" aria-label="Mobile">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="chance-landing-mobile-nav-link"
              onClick={(e) => {
                onLandingHashClick(e, item.href)
                close()
              }}
            >
              {item.label}
            </a>
          ))}
          <Link href="/auth/login" className="chance-landing-mobile-nav-link" onClick={close}>
            Sign in
          </Link>
          <Link href="/auth/sign-up" className="chance-hero-cta-primary chance-focus-ring chance-landing-mobile-nav-cta" onClick={close}>
            Get started
          </Link>
        </nav>
      </div>
    </>
  )
}
