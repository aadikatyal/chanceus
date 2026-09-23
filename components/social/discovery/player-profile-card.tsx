"use client"

import Link from "next/link"
import { Flame, Gamepad2, Search, UserPlus, Users } from "lucide-react"
import ChancePlayerAvatar from "@/components/dashboard/chance-player-avatar"
import type { DiscoveryPlayer } from "@/components/social/discovery/player-discovery-types"
import { getGameDisplayName } from "@/lib/games/game-visuals"

type PlayerProfileCardProps = {
  player: DiscoveryPlayer
  onAddFriend?: (userId: string, username: string) => void
  onAccept?: (requestId: string) => void
  secondaryHref?: string
  secondaryLabel?: string
  compact?: boolean
}

export default function PlayerProfileCard({
  player,
  onAddFriend,
  onAccept,
  secondaryHref,
  secondaryLabel,
  compact,
}: PlayerProfileCardProps) {
  const game = player.favoriteGame ? getGameDisplayName(player.favoriteGame) : "Any game"

  return (
    <article className={`chance-discovery-player-card ${compact ? "chance-discovery-player-card--compact" : ""}`}>
      <div className="chance-discovery-player-card-top">
        <div className="relative shrink-0">
          <ChancePlayerAvatar name={player.displayName} className={compact ? "size-11 text-xs" : "size-14 text-sm"} />
          <span
            className={`chance-discovery-online-dot ${player.isOnline ? "is-online" : ""}`}
            aria-label={player.isOnline ? "Online" : "Offline"}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold sm:text-base">{player.displayName}</h3>
            <span className="chance-discovery-rank-badge">{player.rankLabel}</span>
          </div>
          <p className="chance-text-caption truncate">@{player.username}</p>
        </div>
        {player.inQueue ? (
          <span className="chance-discovery-queue-pill">
            <Search className="size-3" aria-hidden />
            LFM
          </span>
        ) : null}
      </div>

      <dl className="chance-discovery-player-stats">
        <div>
          <dt className="chance-text-caption">Win rate</dt>
          <dd className="chance-text-mono text-sm font-semibold tabular-nums">{player.winRate}%</dd>
        </div>
        <div>
          <dt className="chance-text-caption">Main game</dt>
          <dd className="truncate text-xs font-medium">{game}</dd>
        </div>
        <div>
          <dt className="chance-text-caption">Streak</dt>
          <dd className="inline-flex items-center gap-1 text-xs font-semibold">
            <Flame className="size-3.5 text-[var(--chance-brand)]" aria-hidden />
            {player.winStreak}
          </dd>
        </div>
        {player.mutualFriends > 0 ? (
          <div>
            <dt className="chance-text-caption">Mutual</dt>
            <dd className="inline-flex items-center gap-1 text-xs font-medium">
              <Users className="size-3.5" aria-hidden />
              {player.mutualFriends}
            </dd>
          </div>
        ) : null}
      </dl>

      {player.lastPlayedAt ? (
        <p className="chance-text-caption mt-2">Last crossed paths {player.lastPlayedAt}</p>
      ) : null}

      <div className="chance-discovery-player-actions mt-3">
        {player.friendState === "friends" ? (
          <span className="chance-discovery-state-pill">Friends</span>
        ) : player.friendState === "pending_out" ? (
          <span className="chance-discovery-state-pill">Request sent</span>
        ) : player.friendState === "pending_in" && player.requestId && onAccept ? (
          <button type="button" className="chance-hero-cta-primary chance-focus-ring flex-1 py-2 text-xs" onClick={() => onAccept(player.requestId!)}>
            Accept request
          </button>
        ) : onAddFriend ? (
          <button
            type="button"
            className="chance-hero-cta-primary chance-focus-ring inline-flex flex-1 items-center justify-center gap-1.5 py-2 text-xs"
            onClick={() => onAddFriend(player.id, player.displayName)}
          >
            <UserPlus className="size-3.5" aria-hidden />
            Add friend
          </button>
        ) : null}
        {secondaryHref && secondaryLabel ? (
          <Link href={secondaryHref} className="chance-hero-cta-ghost chance-focus-ring flex-1 py-2 text-center text-xs">
            {secondaryLabel}
          </Link>
        ) : (
          <Link href={`/chat/dm/${player.id}`} className="chance-hero-cta-ghost chance-focus-ring flex-1 py-2 text-center text-xs">
            Message
          </Link>
        )}
        <Link href="/games" className="chance-secondary-btn chance-focus-ring inline-flex items-center justify-center px-2.5 py-2" aria-label="Challenge">
          <Gamepad2 className="size-3.5" aria-hidden />
        </Link>
      </div>
    </article>
  )
}
