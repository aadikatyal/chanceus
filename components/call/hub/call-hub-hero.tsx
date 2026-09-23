"use client"

import { useState } from "react"
import { Mic, Plus, Radio, Users, Video } from "lucide-react"
import { normalizeRoomCode } from "@/lib/call-constants"

type CallHubHeroProps = {
  liveRooms: number
  playersOnline: number
  activeCalls: number
  friendsInVoice: number
  onCreateRoom: () => void
  onJoinCode: (code: string) => void
}

export default function CallHubHero({
  liveRooms,
  playersOnline,
  activeCalls,
  friendsInVoice,
  onCreateRoom,
  onJoinCode,
}: CallHubHeroProps) {
  const [code, setCode] = useState("")

  return (
    <section className="chance-call-hub-hero chance-hero-cinematic" aria-labelledby="call-hub-title">
      <div className="chance-call-hub-hero-glow" aria-hidden />
      <div className="chance-hero-content">
        <div className="chance-hero-main max-w-2xl">
          <p className="chance-hero-kicker">
            <span className="size-1.5 rounded-full bg-[var(--chance-brand)] shadow-[0_0_8px_var(--chance-brand)]" aria-hidden />
            Live call
          </p>
          <h1 id="call-hub-title" className="chance-hero-title">
            Hang out.
            <br />
            Queue up. Run it back.
          </h1>
          <p className="mt-3 max-w-lg text-[0.9375rem] leading-[1.55] text-[var(--chance-muted-fg)]">
            Voice lounges, party up with friends, and watch live matches — before, between, and after ranked games.
          </p>

          <dl className="mt-4 flex flex-wrap gap-2">
            <div className="chance-play-stat-pill">
              <Radio className="size-3.5 text-[var(--chance-brand)]" aria-hidden />
              <span>
                <span className="chance-text-mono font-semibold tabular-nums">{liveRooms}</span> live rooms
              </span>
            </div>
            <div className="chance-play-stat-pill">
              <Users className="size-3.5 text-[var(--chance-brand)]" aria-hidden />
              <span>
                <span className="chance-text-mono font-semibold tabular-nums">{playersOnline}</span> online
              </span>
            </div>
            <div className="chance-play-stat-pill">
              <Video className="size-3.5 text-[var(--chance-brand)]" aria-hidden />
              <span>
                <span className="chance-text-mono font-semibold tabular-nums">{activeCalls}</span> in call
              </span>
            </div>
            <div className="chance-play-stat-pill">
              <Mic className="size-3.5 text-[var(--chance-brand)]" aria-hidden />
              <span>
                <span className="chance-text-mono font-semibold tabular-nums">{friendsInVoice}</span> friends around
              </span>
            </div>
          </dl>

          <div className="chance-hero-cta-row mt-5">
            <button type="button" className="chance-hero-cta-primary chance-focus-ring chance-pressable" onClick={onCreateRoom}>
              Create room
            </button>
            <a href="#call-live-rooms" className="chance-hero-cta-ghost chance-focus-ring">
              Join a room
            </a>
          </div>

          <form
            className="chance-call-hub-join mt-4"
            onSubmit={(e) => {
              e.preventDefault()
              const normalized = normalizeRoomCode(code)
              if (normalized.length >= 6) onJoinCode(normalized)
            }}
          >
            <label htmlFor="call-join-code" className="sr-only">
              Room code
            </label>
            <input
              id="call-join-code"
              value={code}
              onChange={(e) => setCode(normalizeRoomCode(e.target.value))}
              maxLength={6}
              placeholder="Room code"
              className="chance-call-hub-join-input font-mono uppercase tracking-widest"
            />
            <button type="submit" className="chance-hero-cta-primary chance-focus-ring px-4 py-2 text-sm" disabled={code.length < 6}>
              Join
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
