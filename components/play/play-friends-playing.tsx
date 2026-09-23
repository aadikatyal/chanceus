import Link from "next/link"
import { Gamepad2 } from "lucide-react"
import ChancePlayerAvatar from "@/components/dashboard/chance-player-avatar"
import { EmptyState } from "@/components/dashboard/chance-craft"
import { getGameDisplayName } from "@/lib/games/game-visuals"
import type { FriendPlaying } from "@/components/play/play-types"

type PlayFriendsPlayingProps = {
  friends: FriendPlaying[]
}

export default function PlayFriendsPlaying({ friends }: PlayFriendsPlayingProps) {
  return (
    <div className="chance-premium-card p-4 sm:p-[1.125rem]">
      <div className="chance-rail-card-head">
        <h2 className="chance-section-title">Friends in game</h2>
        <Link href="/friends/add" className="chance-link-arrow chance-focus-ring rounded-sm">
          Add →
        </Link>
      </div>

      {friends.length === 0 ? (
        <EmptyState className="py-6">
          <p className="chance-text-caption">No friends in a match right now.</p>
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {friends.map((f) => (
            <li key={f.matchId}>
              <Link
                href={`/games/match/${f.matchId}`}
                className="chance-play-queue-row chance-focus-ring group"
              >
                <ChancePlayerAvatar name={f.displayName} className="size-9 text-xs" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{f.displayName}</p>
                  <p className="chance-text-caption truncate">{getGameDisplayName(f.gameName)}</p>
                </div>
                <Gamepad2 className="size-4 shrink-0 stroke-[1.75] text-[var(--chance-brand)] opacity-70 group-hover:opacity-100" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
