"use client"

import Link from "next/link"
import { Home, ArrowLeft } from "lucide-react"

export default function NotFound() {
  return (
    <div className="chance-competitive-theme flex min-h-screen items-center justify-center bg-[var(--chance-bg)] p-4 text-[var(--chance-fg)]">
      <section className="chance-premium-card w-full max-w-md p-6 text-center">
        <p className="chance-text-mono text-5xl font-bold tabular-nums text-[var(--chance-brand)]">404</p>
        <h1 className="mt-2 text-lg font-semibold">Page not found</h1>
        <p className="chance-text-caption mt-2">We couldn&apos;t find that route.</p>
        <div className="mt-6 flex flex-col gap-2">
          <Link href="/dashboard" className="chance-hero-cta-primary chance-focus-ring inline-flex w-full items-center justify-center gap-2 py-2.5 text-sm">
            <Home className="size-4 stroke-[1.75]" aria-hidden />
            Go to home
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="chance-hero-cta-ghost chance-focus-ring inline-flex w-full items-center justify-center gap-2 py-2.5 text-sm"
          >
            <ArrowLeft className="size-4 stroke-[1.75]" aria-hidden />
            Go back
          </button>
        </div>
      </section>
    </div>
  )
}
