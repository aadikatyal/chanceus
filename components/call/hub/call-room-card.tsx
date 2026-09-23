import Link from "next/link"
import { Eye, Lock, Mic, Users } from "lucide-react"
import { CALL_GAMES, type CallGameId } from "@/lib/call-constants"

type CallRoomCardProps = {
  roomCode: string
  name: string
  game: CallGameId
  tag: string
  playersInside: number
  spectators?: number
  friendsInside?: number
  isPublic?: boolean
  voiceActive?: boolean
  queueOpen?: boolean
  featured?: boolean
}

function gameName(id: CallGameId) {
  return CALL_GAMES.find((g) => g.id === id)?.name ?? "Game"
}

export default function CallRoomCard({
  roomCode,
  name,
  game,
  tag,
  playersInside,
  spectators = 0,
  friendsInside = 0,
  isPublic = true,
  voiceActive = false,
  queueOpen = false,
  featured,
}: CallRoomCardProps) {
  const href = `/call/${roomCode}?game=${game}`

  return (
    <article className={`chance-call-room-card ${featured ? "chance-call-room-card--featured" : ""}`}>
      <div className="chance-call-room-card-art">
        <span className="chance-call-room-card-tag">{tag}</span>
        {voiceActive ? (
          <span className="chance-call-voice-pulse" aria-label="Voice activity">
            <Mic className="size-3.5" aria-hidden />
            Live
          </span>
        ) : null}
      </div>
      <div className="chance-call-room-card-body">
        <h3 className="chance-call-room-card-title">{name}</h3>
        <p className="chance-text-caption">{gameName(game)}</p>
        <dl className="chance-call-room-card-meta">
          <div>
            <Users className="size-3.5" aria-hidden />
            <span>{playersInside} inside</span>
          </div>
          {spectators > 0 ? (
            <div>
              <Eye className="size-3.5" aria-hidden />
              <span>{spectators} watching</span>
            </div>
          ) : null}
          {friendsInside > 0 ? (
            <div>
              <span className="text-[var(--chance-brand)]">{friendsInside} friends</span>
            </div>
          ) : null}
          <div>{isPublic ? "Public" : "Private"} {!isPublic ? <Lock className="inline size-3" aria-hidden /> : null}</div>
          {queueOpen ? <div className="text-[var(--chance-brand)]">Queue open</div> : null}
        </dl>
        <Link href={href} className="chance-hero-cta-primary chance-focus-ring chance-call-room-card-cta">
          Join room
        </Link>
      </div>
    </article>
  )
}
