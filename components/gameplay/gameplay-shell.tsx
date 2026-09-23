"use client"

import type { ReactNode } from "react"
import ChancePlayerAvatar from "@/components/dashboard/chance-player-avatar"
import { getGameDisplayName } from "@/lib/games/game-visuals"
import {
  displayName,
  phaseLabel,
  type GameplayPhase,
  type ScoreLine,
} from "@/components/gameplay/gameplay-utils"
import { Clock, Trophy, Wifi, WifiOff } from "lucide-react"
import GameplayResultActions from "@/components/gameplay/gameplay-result-actions"

export type GameplayShellProps = {
  gameName: string
  betAmount: number
  pot: number
  phase: GameplayPhase
  countdown: number | null
  timeLeft: number
  score: ScoreLine | null
  player1: { display_name?: string | null; username?: string } | null
  player2: { display_name?: string | null; username?: string } | null
  isPlayer1: boolean
  networkNote?: string | null
  resultFooter?: ReactNode
  rematchSlot?: ReactNode
  /** Embedded in live call — tighter chrome, call-first CTAs */
  embedInCall?: boolean
  children: ReactNode
}

function TurnPill({ phase }: { phase: GameplayPhase }) {
  const mod =
    phase === "your-turn"
      ? "chance-gp-phase--you"
      : phase === "opponent-turn"
        ? "chance-gp-phase--opp"
        : phase === "victory"
          ? "chance-gp-phase--win"
          : phase === "defeat"
            ? "chance-gp-phase--loss"
            : phase === "draw"
              ? "chance-gp-phase--draw"
              : phase === "network-error" || phase === "network-degraded"
                ? "chance-gp-phase--warn"
                : "chance-gp-phase--neutral"

  return (
    <span className={`chance-gp-phase ${mod}`} role="status" aria-live="polite">
      <span className="chance-gp-phase-dot" aria-hidden />
      {phaseLabel(phase)}
    </span>
  )
}

export default function GameplayShell({
  gameName,
  betAmount,
  pot,
  phase,
  countdown,
  timeLeft,
  score,
  player1,
  player2,
  isPlayer1,
  networkNote,
  resultFooter,
  rematchSlot,
  embedInCall,
  children,
}: GameplayShellProps) {
  const title = getGameDisplayName(gameName)
  const showCountdown = phase === "countdown" && countdown !== null
  const syncBanner = networkNote?.toLowerCase().includes("sync")

  return (
    <div
      className={`chance-gameplay-shell${embedInCall ? " chance-gameplay-shell--call" : ""}`}
      aria-label={`${title} live match`}
    >
      <header className="chance-gp-hud" role="banner">
        <div className="chance-gp-hud-block chance-gp-hud-block--game">
          {!embedInCall ? <p className="chance-gp-hud-kicker">Live match</p> : null}
          <p className="chance-gp-hud-title">{title}</p>
        </div>

        <div className="chance-gp-hud-block chance-gp-hud-block--matchup">
          <div className={`chance-gp-chip ${isPlayer1 ? "chance-gp-chip--you" : ""}`}>
            <ChancePlayerAvatar name={displayName(player1)} className="size-8 text-xs" />
            <span className="chance-gp-chip-name">{isPlayer1 ? "You" : displayName(player1)}</span>
            {score ? (
              <span className="chance-gp-chip-score chance-text-mono tabular-nums">
                {isPlayer1 ? score.you : score.opponent}
              </span>
            ) : null}
          </div>
          <span className="chance-gp-vs" aria-hidden>
            vs
          </span>
          <div className={`chance-gp-chip ${!isPlayer1 && player2 ? "chance-gp-chip--you" : ""}`}>
            <ChancePlayerAvatar name={displayName(player2)} className="size-8 text-xs" />
            <span className="chance-gp-chip-name">
              {!isPlayer1 && player2 ? "You" : player2 ? displayName(player2) : "…"}
            </span>
            {score ? (
              <span className="chance-gp-chip-score chance-text-mono tabular-nums">
                {isPlayer1 ? score.opponent : score.you}
              </span>
            ) : null}
          </div>
        </div>

        <div className="chance-gp-hud-block chance-gp-hud-block--status">
          <TurnPill phase={phase} />
          {timeLeft > 0 ? (
            <span className="chance-gp-timer chance-text-mono tabular-nums" aria-label="Time remaining">
              <Clock className="size-3.5 shrink-0 stroke-[1.75]" aria-hidden />
              {Math.max(0, Math.ceil(timeLeft))}s
            </span>
          ) : null}
          {pot > 0 || betAmount > 0 ? (
            <span className="chance-gp-stake chance-gp-stake--inline">
              <Trophy className="size-3.5 stroke-[1.75] text-[var(--chance-brand)]" aria-hidden />
              <span className="chance-text-mono font-semibold tabular-nums">{pot.toLocaleString()}</span>
              <span className="text-[var(--chance-muted-fg)]">pot</span>
              <span className="text-[var(--chance-muted-fg)]">·</span>
              <span className="chance-text-caption">Entry {betAmount}</span>
            </span>
          ) : null}
        </div>
      </header>

      {(phase === "network-degraded" || networkNote) && phase !== "network-error" ? (
        <div
          className={`chance-gp-banner ${syncBanner ? "chance-gp-banner--sync" : "chance-gp-banner--warn"}`}
          role="status"
        >
          <Wifi className="size-4 shrink-0 stroke-[1.75]" aria-hidden />
          <span>{networkNote ?? "Connection syncing — moves may take a moment to update."}</span>
        </div>
      ) : null}

      {phase === "network-error" ? (
        <div className="chance-gp-banner chance-gp-banner--error" role="alert">
          <WifiOff className="size-4 shrink-0 stroke-[1.75]" aria-hidden />
          <span>Connection interrupted. Retry or wait for reconnect.</span>
        </div>
      ) : null}

      <div className="chance-gp-stage" aria-live="polite">
        {showCountdown ? (
          <div className="chance-gp-countdown-overlay" role="presentation">
            <p className="chance-gp-countdown-num" aria-label={`Starting in ${countdown}`}>
              {countdown}
            </p>
            <p className="chance-text-caption">Match starting</p>
          </div>
        ) : null}

        {(phase === "victory" || phase === "defeat" || phase === "draw") && (
          <div
            className={`chance-gp-result chance-gp-result--${phase === "victory" ? "win" : phase === "defeat" ? "loss" : "draw"}`}
            role="status"
          >
            <p className="chance-gp-result-title">
              {phase === "victory" ? "You won" : phase === "defeat" ? "You lost" : "Draw"}
            </p>
            <p className="chance-text-caption mt-1">
              {phase === "victory"
                ? pot > 0
                  ? `+${pot.toLocaleString()} tokens to the winner`
                  : embedInCall
                    ? "Nice work — queue another round in this call."
                    : "Match won — stakes settled."
                : phase === "defeat"
                  ? embedInCall
                    ? "Rematch from this room when you're ready."
                    : "Better luck next queue."
                  : "Stakes returned per house rules."}
            </p>
            <div className="chance-gp-result-actions">
              <GameplayResultActions rematchSlot={rematchSlot} embedInCall={embedInCall} />
              {resultFooter ? <div className="chance-gp-result-extra">{resultFooter}</div> : null}
            </div>
          </div>
        )}

        <div className="chance-gameplay-board focus-within:outline-none">{children}</div>
      </div>
    </div>
  )
}
