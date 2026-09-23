import PlayMyQueues from "@/components/play/play-my-queues"
import PlayMatchmakingPanel from "@/components/play/play-matchmaking-panel"
import PlayFriendsPlaying from "@/components/play/play-friends-playing"
import PlayTournaments from "@/components/play/play-tournaments"
import type { FriendPlaying, PlayMyQueue } from "@/components/play/play-types"
import type { Tournament } from "@/lib/tournament-actions"

type PlayRailProps = {
  userId: string
  myQueues: PlayMyQueue[]
  matchmakingQueues: Parameters<typeof PlayMatchmakingPanel>[0]["initialQueues"]
  friendsPlaying: FriendPlaying[]
  tournaments: Tournament[]
}

export default function PlayRail({
  userId,
  myQueues,
  matchmakingQueues,
  friendsPlaying,
  tournaments,
}: PlayRailProps) {
  return (
    <div className="flex flex-col gap-6">
      <PlayMyQueues queues={myQueues} />
      <PlayMatchmakingPanel initialQueues={matchmakingQueues} currentUserId={userId} />
      <PlayFriendsPlaying friends={friendsPlaying} />
      <PlayTournaments tournaments={tournaments} />
    </div>
  )
}
