import Link from "next/link"
import PlayOpenLobbies from "@/components/play/play-open-lobbies"
import type { PlayLobbyMatch } from "@/components/play/play-types"

type GameQueueRailProps = {
  gameId: string
  waitingMatches: PlayLobbyMatch[]
}

export default function GameQueueRail({ gameId, waitingMatches }: GameQueueRailProps) {
  return (
    <div className="flex flex-col gap-6">
      <PlayOpenLobbies matches={waitingMatches} />
      <div className="chance-premium-card p-4 sm:p-[1.125rem]">
        <h2 className="chance-section-title">Need a host?</h2>
        <p className="chance-text-caption mt-1">Set exact rules, invite a friend, or run cash pools.</p>
        <Link
          href={`/games/${gameId}`}
          className="chance-secondary-btn chance-focus-ring mt-3 inline-flex w-full justify-center py-2.5 text-sm"
        >
          Open custom lobby
        </Link>
      </div>
    </div>
  )
}
