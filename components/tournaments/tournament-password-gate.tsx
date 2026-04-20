"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Lock } from "lucide-react"

const COOKIE_NAME = "tournaments_unlocked"
// Optional: set NEXT_PUBLIC_TOURNAMENT_GATE_PASSWORD in .env.local (defaults to Ca$ino if unset)
const PASSWORD = typeof process.env.NEXT_PUBLIC_TOURNAMENT_GATE_PASSWORD === "string" && process.env.NEXT_PUBLIC_TOURNAMENT_GATE_PASSWORD.length > 0
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
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!unlocked) {
    return (
      <Card className="bg-gray-900/80 border-gray-800 max-w-md mx-auto mt-12">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Tournaments
          </CardTitle>
          <p className="text-gray-400 text-sm">Enter password to access</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tournament-password" className="text-white">
                Password
              </Label>
              <Input
                id="tournament-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="bg-gray-800 border-gray-700 text-white"
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600">
              Unlock
            </Button>
          </form>
        </CardContent>
      </Card>
    )
  }

  return <>{children}</>
}
