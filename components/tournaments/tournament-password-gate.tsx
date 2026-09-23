"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Lock } from "lucide-react"

const COOKIE_NAME = "tournaments_unlocked"
const PASSWORD =
  typeof process.env.NEXT_PUBLIC_TOURNAMENT_GATE_PASSWORD === "string" &&
  process.env.NEXT_PUBLIC_TOURNAMENT_GATE_PASSWORD.length > 0
    ? process.env.NEXT_PUBLIC_TOURNAMENT_GATE_PASSWORD
    : "Ca$ino"
const COOKIE_MAX_AGE_DAYS = 1

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"))
  return match ? decodeURIComponent(match[2]) : null
}

function setUnlockedCookie() {
  document.cookie = `${COOKIE_NAME}=1; path=/; max-age=${COOKIE_MAX_AGE_DAYS * 86400}; SameSite=Lax`
}

export default function TournamentPasswordGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState<boolean | null>(null)
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    setUnlocked(getCookie(COOKIE_NAME) === "1")
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (password === PASSWORD) {
      setUnlockedCookie()
      setUnlocked(true)
      setPassword("")
    } else {
      setError("Wrong password")
    }
  }

  if (unlocked === null) {
    return (
      <div className="chance-page-centered-panel">
        <p className="chance-text-caption">Loading…</p>
      </div>
    )
  }

  if (!unlocked) {
    return (
      <div className="chance-page-centered-panel">
        <section className="chance-page-centered-panel__card chance-premium-card p-6 sm:p-8">
          <h2 className="chance-section-title flex items-center gap-2">
            <Lock className="size-4 stroke-[1.75] text-[var(--chance-brand)]" aria-hidden />
            Tournaments
          </h2>
          <p className="chance-text-caption mb-6">Enter password to access</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="tournament-password" className="chance-text-label">
                Password
              </label>
              <Input
                id="tournament-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="chance-input"
                autoFocus
              />
            </div>
            {error ? <p className="text-sm text-[var(--chance-no)]">{error}</p> : null}
            <Button type="submit" className="chance-hero-cta-primary chance-focus-ring w-full">
              Unlock
            </Button>
          </form>
        </section>
      </div>
    )
  }

  return <>{children}</>
}
