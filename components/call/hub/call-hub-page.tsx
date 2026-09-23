"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Copy, Plus } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import {
  CALL_GAMES,
  generateRoomCode,
  isCallGameId,
  type CallGameId,
} from "@/lib/call-constants"
import CallFriendInvite from "@/components/call/call-friend-invite"
import CallHubHero from "@/components/call/hub/call-hub-hero"
import CallRoomCard from "@/components/call/hub/call-room-card"
import { CALL_FEATURED_ROOMS, CALL_VOICE_CHANNELS } from "@/components/call/hub/call-hub-channels"
import ChancePlayerAvatar from "@/components/dashboard/chance-player-avatar"
import { SkeletonRows } from "@/components/dashboard/chance-craft"
import { getGameDisplayName } from "@/lib/games/game-visuals"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

type FriendPresence = {
  id: string
  name: string
  status: "voice" | "watching" | "queue" | "idle" | "offline"
  detail: string
}

type LiveMatchRow = {
  id: string
  gameName: string
  p1: string
  p2: string
  bet: number
}

type LfmRow = {
  gameName: string
  gameId?: string
  stake: number
  searching: number
  voiceRequired: boolean
}

type ActivityRow = {
  id: string
  text: string
  at: string
}

export default function CallHubPage({ userId, displayName }: { userId: string; displayName: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [partyGame, setPartyGame] = useState<CallGameId>("connect-four")
  const [partyCode, setPartyCode] = useState<string | null>(null)
  const [playersOnline, setPlayersOnline] = useState(0)
  const [activeCalls, setActiveCalls] = useState(0)
  const [friendsPresence, setFriendsPresence] = useState<FriendPresence[]>([])
  const [liveMatches, setLiveMatches] = useState<LiveMatchRow[]>([])
  const [lfm, setLfm] = useState<LfmRow[]>([])
  const [activity, setActivity] = useState<ActivityRow[]>([])
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set())

  const loadHub = useCallback(async () => {
    setLoading(true)
    const { count: onlineCount } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("is_online", true)

    setPlayersOnline(onlineCount ?? 0)

    const { count: liveMatchCount } = await supabase
      .from("matches")
      .select("*", { count: "exact", head: true })
      .eq("status", "in_progress")

    setActiveCalls(Math.max(1, Math.ceil((liveMatchCount ?? 0) / 2)))

    const { data: friendships } = await supabase
      .from("friends")
      .select(
        `
        user_id, friend_id,
        user:users!friends_user_id_fkey(id, display_name, username, is_online),
        friend:users!friends_friend_id_fkey(id, display_name, username, is_online)
      `
      )
      .eq("status", "accepted")
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)

    const fids = new Set<string>()
    const friends: { id: string; name: string; isOnline: boolean }[] = []
    for (const row of friendships ?? []) {
      const other = row.user_id === userId ? row.friend : row.user
      if (!other) continue
      const id = other.id as string
      fids.add(id)
      friends.push({
        id,
        name: (other.display_name || other.username) as string,
        isOnline: Boolean(other.is_online),
      })
    }
    setFriendIds(fids)

    const queueUserIds = new Set<string>()
    const { data: queueRows } = await supabase
      .from("matchmaking_queue")
      .select("user_id, bet_amount, game_id, games(name)")
      .eq("status", "waiting")

    const laneMap = new Map<string, { stakes: number[]; count: number; gameId?: string }>()
    for (const q of queueRows ?? []) {
      queueUserIds.add(q.user_id as string)
      const g = (q.games as { name?: string } | null)?.name ?? "Game"
      const lane = laneMap.get(g) ?? { stakes: [], count: 0, gameId: q.game_id as string }
      lane.stakes.push(Number(q.bet_amount) || 0)
      lane.count += 1
      laneMap.set(g, lane)
    }

    setLfm(
      [...laneMap.entries()].slice(0, 6).map(([gameName, lane]) => ({
        gameName,
        gameId: lane.gameId,
        stake: Math.round(lane.stakes.reduce((a, b) => a + b, 0) / Math.max(1, lane.stakes.length)),
        searching: lane.count,
        voiceRequired: lane.count > 2,
      }))
    )

    const { data: matches } = await supabase
      .from("matches")
      .select(
        `
        id, bet_amount,
        games(name),
        player1:users!matches_player1_id_fkey(display_name, username),
        player2:users!matches_player2_id_fkey(display_name, username)
      `
      )
      .eq("status", "in_progress")
      .limit(6)

    setLiveMatches(
      (matches ?? []).map((m) => ({
        id: m.id as string,
        gameName: (m.games as { name?: string } | null)?.name ?? "Game",
        p1: (m.player1 as { display_name?: string; username?: string })?.display_name || (m.player1 as { username: string }).username,
        p2: (m.player2 as { display_name?: string; username?: string })?.display_name || (m.player2 as { username: string })?.username || "Waiting",
        bet: Number(m.bet_amount) || 0,
      }))
    )

    const presence: FriendPresence[] = friends.slice(0, 8).map((f) => {
      if (queueUserIds.has(f.id)) {
        return { id: f.id, name: f.name, status: "queue", detail: "Queueing for a match" }
      }
      if (f.isOnline) {
        return { id: f.id, name: f.name, status: "voice", detail: "In Ranked Lounge" }
      }
      return { id: f.id, name: f.name, status: "offline", detail: "Offline" }
    })
    setFriendsPresence(presence)

    const { data: recentWins } = await supabase
      .from("matches")
      .select("id, completed_at, bet_amount, winner_id")
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(5)

    const winnerIds = [...new Set((recentWins ?? []).map((m) => m.winner_id).filter(Boolean))] as string[]
    const nameById = new Map<string, string>()
    if (winnerIds.length > 0) {
      const { data: winUsers } = await supabase.from("users").select("id, display_name, username").in("id", winnerIds)
      for (const u of winUsers ?? []) {
        nameById.set(u.id as string, (u.display_name || u.username) as string)
      }
    }

    const act: ActivityRow[] = (recentWins ?? []).map((m) => {
      const name = nameById.get(m.winner_id as string) || "Someone"
      const pot = (Number(m.bet_amount) || 0) * 2
      return {
        id: m.id as string,
        text: `${name} won ${pot.toLocaleString()} tokens`,
        at: (m.completed_at as string) || "",
      }
    })
    if (act.length < 3) {
      act.push({ id: "seed1", text: "Community lounges are open — pick a room", at: new Date().toISOString() })
    }
    setActivity(act.slice(0, 6))
    setLoading(false)
  }, [userId])

  useEffect(() => {
    loadHub()
  }, [loadHub])

  const liveRoomsCount = CALL_FEATURED_ROOMS.length + (liveMatches.length > 0 ? 1 : 0)
  const friendsAround = useMemo(() => friendsPresence.filter((f) => f.status !== "offline").length, [friendsPresence])

  const createRoom = () => {
    const code = generateRoomCode()
    setPartyCode(code)
    router.push(`/call/${code}?game=${partyGame}&host=1`)
  }

  const joinCode = (code: string) => {
    router.push(`/call/${code}?game=${partyGame}`)
  }

  const copyPartyLink = async () => {
    if (!partyCode) return
    const url = `${window.location.origin}/call/${partyCode}?game=${partyGame}`
    await navigator.clipboard.writeText(url)
    toast({ title: "Invite link copied" })
  }

  const roomPlayers = (code: string) => {
    const seed = code.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
    return (seed % 5) + (activeCalls > 0 ? 1 : 0)
  }

  return (
    <div className="chance-call-hub-stack">
      <CallHubHero
        liveRooms={liveRoomsCount}
        playersOnline={playersOnline}
        activeCalls={activeCalls}
        friendsInVoice={friendsAround}
        onCreateRoom={createRoom}
        onJoinCode={joinCode}
      />

      <div className="chance-call-hub-grid">
        <div className="chance-call-hub-col">
          <section className="chance-call-hub-section" aria-labelledby="friends-hangout">
            <header className="chance-call-hub-section-head">
              <h2 id="friends-hangout" className="chance-section-title text-base">
                Friends hanging out
              </h2>
            </header>
            {loading ? (
              <SkeletonRows rows={4} className="h-12" />
            ) : friendsPresence.length === 0 ? (
              <div className="chance-premium-card chance-call-hub-inset py-6 text-center">
                <p className="chance-text-caption">Add friends to see who&apos;s around.</p>
                <Link href="/friends/add" className="chance-link-arrow mt-2 inline-block text-sm">
                  Find players →
                </Link>
              </div>
            ) : (
              <ul className="chance-call-presence-list">
                {friendsPresence.map((f) => (
                  <li key={f.id} className="chance-call-presence-row">
                    <ChancePlayerAvatar name={f.name} className="size-10 text-xs" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{f.name}</p>
                      <p className="chance-text-caption truncate">
                        {f.status === "voice" ? "🎤" : f.status === "watching" ? "👀" : f.status === "queue" ? "🎮" : "💤"} {f.detail}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Link href={`/call/RANKED?game=connect-four`} className="chance-social-mini-action">
                        Join
                      </Link>
                      <Link href={`/chat/dm/${f.id}`} className="chance-social-mini-action">
                        Message
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="chance-call-hub-section" aria-labelledby="party-heading">
            <header className="chance-call-hub-section-head">
              <h2 id="party-heading" className="chance-section-title text-base">
                Party
              </h2>
            </header>
            <div className="chance-premium-card chance-call-hub-inset space-y-3">
              <p className="chance-text-caption">Create a private room, invite friends, queue together.</p>
              <div className="flex flex-wrap gap-2">
                {CALL_GAMES.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className={cn("chance-venues-session-pick px-3 py-2 text-xs", partyGame === g.id && "is-selected")}
                    onClick={() => setPartyGame(g.id)}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
              <button type="button" className="chance-hero-cta-primary chance-focus-ring w-full py-2.5 text-sm" onClick={createRoom}>
                <Plus className="mr-1.5 inline size-4" aria-hidden />
                Create party
              </button>
              {partyCode && isCallGameId(partyGame) ? (
                <>
                  <p className="font-mono text-sm tracking-widest">{partyCode}</p>
                  <button type="button" className="chance-hero-cta-ghost chance-focus-ring w-full py-2 text-xs" onClick={copyPartyLink}>
                    <Copy className="mr-1 inline size-3.5" aria-hidden />
                    Copy invite link
                  </button>
                  <CallFriendInvite roomCode={partyCode} game={partyGame} currentUserId={userId} fromName={displayName} />
                </>
              ) : null}
            </div>
          </section>
        </div>

        <div className="chance-call-hub-col chance-call-hub-col-main">
          <section id="call-live-rooms" className="chance-call-hub-section scroll-mt-6" aria-labelledby="live-rooms-heading">
            <header className="chance-call-hub-section-head">
              <h2 id="live-rooms-heading" className="chance-section-title text-base">
                Live rooms
              </h2>
              <p className="chance-text-caption">Jump into community voice + match rooms</p>
            </header>
            <div className="chance-call-room-grid">
              {CALL_FEATURED_ROOMS.map((room, i) => (
                <CallRoomCard
                  key={room.id}
                  roomCode={room.roomCode}
                  name={room.name}
                  game={room.game}
                  tag={room.tag}
                  playersInside={roomPlayers(room.roomCode)}
                  spectators={Math.max(0, roomPlayers(room.roomCode) - 1)}
                  friendsInside={[...friendIds].filter((_, idx) => idx % 3 === i % 3).length > 0 && i === 0 ? 1 : 0}
                  voiceActive={roomPlayers(room.roomCode) > 1}
                  queueOpen={room.game === "math-blitz"}
                  isPublic={room.isPublic}
                  featured={i === 0}
                />
              ))}
            </div>
          </section>

          <section className="chance-call-hub-section" aria-labelledby="live-matches-heading">
            <header className="chance-call-hub-section-head">
              <h2 id="live-matches-heading" className="chance-section-title text-base">
                Live matches
              </h2>
            </header>
            {liveMatches.length === 0 ? (
              <div className="chance-premium-card chance-call-hub-inset py-6 text-center">
                <p className="chance-text-caption">No tables live — start a party or join a lounge.</p>
              </div>
            ) : (
              <ul className="chance-call-watch-list">
                {liveMatches.map((m) => (
                  <li key={m.id} className="chance-call-watch-card">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{getGameDisplayName(m.gameName)}</p>
                      <p className="chance-text-caption truncate">
                        {m.p1} vs {m.p2} · {m.bet} entry
                      </p>
                    </div>
                    <Link href={`/games/match/${m.id}`} className="chance-hero-cta-primary chance-focus-ring px-3 py-2 text-xs">
                      Watch
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="chance-call-hub-col">
          <section className="chance-call-hub-section" aria-labelledby="lfm-heading">
            <header className="chance-call-hub-section-head">
              <h2 id="lfm-heading" className="chance-section-title text-base">
                Looking for team
              </h2>
            </header>
            {lfm.length === 0 ? (
              <div className="chance-premium-card chance-call-hub-inset py-6 text-center">
                <p className="chance-text-caption">Queues are quiet — open Play to start a party.</p>
                <Link href="/games" className="chance-hero-cta-primary chance-focus-ring mt-3 inline-flex px-3 py-2 text-xs">
                  Open Play
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {lfm.map((row) => (
                  <li key={row.gameName} className="chance-call-lfm-card">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-[var(--chance-brand)]">Need {Math.min(3, row.searching)}</p>
                      <p className="text-sm font-semibold">{getGameDisplayName(row.gameName)}</p>
                      <p className="chance-text-caption">
                        {row.stake} token stake {row.voiceRequired ? "· Voice req." : ""}
                      </p>
                    </div>
                    <Link href={row.gameId ? `/games/${row.gameId}` : "/games"} className="chance-hero-cta-primary chance-focus-ring px-3 py-2 text-xs">
                      Join
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="chance-call-hub-section" aria-labelledby="voice-ch-heading">
            <header className="chance-call-hub-section-head">
              <h2 id="voice-ch-heading" className="chance-section-title text-base">
                Voice channels
              </h2>
            </header>
            <ul className="chance-call-voice-list">
              {CALL_VOICE_CHANNELS.map((ch) => (
                <li key={ch.id}>
                  <Link href={`/call/${ch.roomCode}?game=${ch.game}`} className="chance-call-voice-row">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{ch.name}</p>
                      <p className="chance-text-caption">{roomPlayers(ch.roomCode)} in channel</p>
                    </div>
                    <span className="chance-hero-cta-ghost chance-focus-ring px-2.5 py-1.5 text-xs">Join</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="chance-call-hub-section" aria-labelledby="activity-heading">
            <header className="chance-call-hub-section-head">
              <h2 id="activity-heading" className="chance-section-title text-base">
                Recent activity
              </h2>
            </header>
            <ol className="chance-call-activity-timeline">
              {activity.map((a) => (
                <li key={a.id} className="chance-call-activity-item">
                  <span className="chance-call-activity-dot" aria-hidden />
                  <p className="text-xs">{a.text}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      <div className="chance-call-hub-mobile-bar lg:hidden">
        <button type="button" className="chance-hero-cta-primary chance-focus-ring flex-1 py-3 text-sm" onClick={createRoom}>
          Create room
        </button>
        <Link href="#call-live-rooms" className="chance-hero-cta-ghost chance-focus-ring flex-1 py-3 text-center text-sm">
          Browse rooms
        </Link>
      </div>
    </div>
  )
}
