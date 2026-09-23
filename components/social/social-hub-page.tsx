"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Eye,
  Flame,
  Gamepad2,
  Mail,
  Megaphone,
  MessageCircle,
  Mic,
  Radio,
  Search,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react"
import type { User } from "@/lib/supabase/client"
import { supabase } from "@/lib/supabase/client"
import CompetitivePageFeed from "@/components/app/competitive-page-feed"
import ChatWindow from "@/components/chat/chat-window"
import ChancePlayerAvatar from "@/components/dashboard/chance-player-avatar"
import { EmptyState, SkeletonRows } from "@/components/dashboard/chance-craft"
import { ChanceBadge } from "@/components/design-system/badge"
import SocialHubHero from "@/components/social/social-hub-hero"
import { SocialStatusPill } from "@/components/social/social-status-pill"
import type {
  DmPreview,
  LfmLane,
  PulseItem,
  PulseKind,
  RecentOpponent,
  SocialFriend,
  SocialLiveMatch,
  SuggestedUser,
  TournamentPulse,
  FriendPresenceStatus,
} from "@/components/social/social-hub-types"
import { getGameDisplayName } from "@/lib/games/game-visuals"

type SocialHubPageProps = {
  user: User
}

type MobilePane = "friends" | "floor" | "chat" | "more"

const ANNOUNCEMENTS = [
  { id: "a1", title: "Community hub is live", body: "Friends, pulse, and chat — stay in one tab all session." },
  { id: "a2", title: "Brackets on Compete", body: "Registration windows and prize pools stay on Tournaments." },
]

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(diff) || diff < 0) return "now"
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "now"
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

function elapsedLabel(startedAt: string | null) {
  if (!startedAt) return "Live"
  const sec = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

function deriveFriendStatus(
  friendId: string,
  isOnline: boolean,
  lastSeen: string | null,
  queueUserIds: Set<string>,
  matchByUser: Map<string, { matchId: string; gameName: string }>,
  tournamentUserIds: Set<string>
): FriendPresenceStatus {
  if (matchByUser.has(friendId)) return "in_match"
  if (tournamentUserIds.has(friendId)) return "in_tournament"
  if (queueUserIds.has(friendId)) return "searching"
  if (!isOnline) return "offline"
  if (lastSeen) {
    const mins = (Date.now() - new Date(lastSeen).getTime()) / 60000
    if (mins > 12) return "away"
  }
  return "idle"
}

const PULSE_ICON: Record<PulseKind, typeof Trophy> = {
  tournament_open: Trophy,
  tournament_live: Radio,
  friend_win: Flame,
  friend_queue: Search,
  streak: Flame,
  announcement: Megaphone,
  match_live: Radio,
  leaderboard: Trophy,
}

export default function SocialHubPage({ user }: SocialHubPageProps) {
  const [loading, setLoading] = useState(true)
  const [pane, setPane] = useState<MobilePane>("floor")
  const [friends, setFriends] = useState<SocialFriend[]>([])
  const [pulse, setPulse] = useState<PulseItem[]>([])
  const [lanes, setLanes] = useState<LfmLane[]>([])
  const [dms, setDms] = useState<DmPreview[]>([])
  const [recent, setRecent] = useState<RecentOpponent[]>([])
  const [suggested, setSuggested] = useState<SuggestedUser[]>([])
  const [tournaments, setTournaments] = useState<TournamentPulse[]>([])
  const [liveMatches, setLiveMatches] = useState<SocialLiveMatch[]>([])
  const [liveCount, setLiveCount] = useState(0)
  const [queueCount, setQueueCount] = useState(0)

  const loadHub = useCallback(async () => {
    const nowIso = new Date().toISOString()

    const [
      friendsRes,
      queueRes,
      liveRes,
      completedRes,
      dmRes,
      recentRes,
      tourneyRes,
      suggestRes,
    ] = await Promise.all([
      supabase
        .from("friends")
        .select(
          `
          user_id,
          friend_id,
          user:users!friends_user_id_fkey(id, display_name, username, is_online, last_seen, win_rate, total_games_won),
          friend:users!friends_friend_id_fkey(id, display_name, username, is_online, last_seen, win_rate, total_games_won)
        `
        )
        .eq("status", "accepted")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`),
      supabase
        .from("matchmaking_queue")
        .select(
          `
          user_id,
          bet_amount,
          game_id,
          created_at,
          games (name),
          users!matchmaking_queue_user_id_fkey (id, username, display_name)
        `
        )
        .eq("status", "waiting")
        .gt("expires_at", nowIso)
        .order("created_at", { ascending: false })
        .limit(24),
      supabase
        .from("matches")
        .select(
          `
          id,
          bet_amount,
          status,
          started_at,
          completed_at,
          winner_id,
          games (name),
          player1_id,
          player2_id,
          player1:users!matches_player1_id_fkey (id, display_name, username),
          player2:users!matches_player2_id_fkey (id, display_name, username)
        `
        )
        .in("status", ["in_progress", "completed"])
        .order("started_at", { ascending: false })
        .limit(24),
      supabase
        .from("matches")
        .select("id, completed_at, bet_amount, winner_id, player1_id, player2_id, games(name)")
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(16),
      supabase
        .from("messages")
        .select("id, content, created_at, sender_id, recipient_id, is_read")
        .eq("message_type", "dm")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(48),
      supabase
        .from("matches")
        .select(
          `
          completed_at,
          winner_id,
          games (name),
          player1_id,
          player2_id,
          player1:users!matches_player1_id_fkey (id, username, display_name),
          player2:users!matches_player2_id_fkey (id, username, display_name)
        `
        )
        .eq("status", "completed")
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
        .order("completed_at", { ascending: false })
        .limit(8),
      supabase
        .from("tournaments")
        .select("id, name, status, games(name), created_at")
        .in("status", ["registration", "in_progress", "brackets_generated", "completed"])
        .order("created_at", { ascending: false })
        .limit(6),
      supabase.from("users").select("id, username, display_name, win_rate, is_online").neq("id", user.id).limit(8),
    ])

    const queueUserIds = new Set<string>()
    const laneMap = new Map<string, { stakes: number[]; created: string[]; gameId?: string }>()
    for (const row of queueRes.data ?? []) {
      const uid = row.user_id as string
      queueUserIds.add(uid)
      const g = (row.games as { name?: string } | null)?.name ?? "Game"
      const lane = laneMap.get(g) ?? { stakes: [], created: [] }
      lane.stakes.push((row.bet_amount as number) ?? 0)
      lane.created.push((row.created_at as string) ?? nowIso)
      lane.gameId = (row.game_id as string) || lane.gameId
      laneMap.set(g, lane)
    }

    const lanesBuilt: LfmLane[] = [...laneMap.entries()].map(([gameName, lane]) => {
      const searching = lane.stakes.length
      const avgStake = Math.round(lane.stakes.reduce((a, b) => a + b, 0) / Math.max(1, searching))
      return {
        gameName,
        gameId: lane.gameId,
        searching,
        avgStake,
        estimatedWaitSec: Math.min(90, 18 + searching * 8),
      }
    })
    setLanes(lanesBuilt)
    setQueueCount([...queueUserIds].filter((id) => id !== user.id).length)

    const matchByUser = new Map<string, { matchId: string; gameName: string }>()
    const liveRows = (liveRes.data ?? []).filter((m) => m.status === "in_progress")
    const liveBuilt: SocialLiveMatch[] = liveRows.map((m) => {
      const g = (m.games as { name?: string } | null)?.name ?? "Game"
      const p1 = m.player1 as { display_name?: string; username?: string } | null
      const p2 = m.player2 as { display_name?: string; username?: string } | null
      return {
        id: m.id as string,
        gameName: g,
        player1: p1?.display_name || p1?.username || "Player 1",
        player2: p2?.display_name || p2?.username || "Player 2",
        bet: (m.bet_amount as number) ?? 0,
        startedAt: (m.started_at as string) ?? null,
      }
    })
    setLiveMatches(liveBuilt)
    setLiveCount(liveBuilt.length)
    for (const m of liveRows) {
      const g = (m.games as { name?: string } | null)?.name ?? "Game"
      const p1 = m.player1_id as string
      const p2 = m.player2_id as string | null
      if (p1) matchByUser.set(p1, { matchId: m.id as string, gameName: g })
      if (p2) matchByUser.set(p2, { matchId: m.id as string, gameName: g })
    }

    const tournamentUserIds = new Set<string>()

    const friendMeta = new Map<
      string,
      { displayName: string; username: string; isOnline: boolean; lastSeen: string | null; winRate: number }
    >()

    const friendRows: SocialFriend[] = (friendsRes.data ?? [])
      .map((row: Record<string, unknown>) => {
        const userId = row.user_id as string
        const u = row.user as {
          id: string
          display_name?: string
          username: string
          is_online?: boolean
          last_seen?: string
          win_rate?: number
        } | null
        const f = row.friend as {
          id: string
          display_name?: string
          username: string
          is_online?: boolean
          last_seen?: string
          win_rate?: number
        } | null
        const other = userId === user.id ? f : u
        if (!other) return null
        const isOnline = Boolean(other.is_online)
        const status = deriveFriendStatus(
          other.id,
          isOnline,
          other.last_seen ?? null,
          queueUserIds,
          matchByUser,
          tournamentUserIds
        )
        const inMatch = matchByUser.get(other.id)
        friendMeta.set(other.id, {
          displayName: other.display_name || other.username,
          username: other.username,
          isOnline,
          lastSeen: other.last_seen ?? null,
          winRate: Number(other.win_rate) || 0,
        })
        return {
          id: other.id,
          displayName: other.display_name || other.username,
          username: other.username,
          isOnline,
          status,
          statusDetail: inMatch
            ? getGameDisplayName(inMatch.gameName)
            : status === "searching"
              ? "Looking for a match"
              : undefined,
          matchId: inMatch?.matchId,
          favoriteGame: inMatch ? getGameDisplayName(inMatch.gameName) : undefined,
          winRate: Number(other.win_rate) || 0,
          winStreak: 0,
        }
      })
      .filter(Boolean) as SocialFriend[]

    const winsByFriend = new Map<string, number>()
    for (const m of completedRes.data ?? []) {
      const winner = m.winner_id as string | null
      if (winner && friendMeta.has(winner)) {
        winsByFriend.set(winner, (winsByFriend.get(winner) ?? 0) + 1)
      }
    }
    for (const f of friendRows) {
      f.winStreak = winsByFriend.get(f.id) ?? 0
    }

    friendRows.sort((a, b) => {
      const rank = (s: FriendPresenceStatus) =>
        s === "in_match" ? 0 : s === "searching" ? 1 : s === "idle" ? 2 : s === "away" ? 3 : 4
      return rank(a.status) - rank(b.status) || a.displayName.localeCompare(b.displayName)
    })
    setFriends(friendRows)

    const pulseItems: PulseItem[] = []
    const seen = new Set<string>()
    const pushUnique = (item: PulseItem) => {
      const key = `${item.kind}:${item.title}`
      if (seen.has(key)) return
      seen.add(key)
      pulseItems.push(item)
    }

    for (const t of tourneyRes.data ?? []) {
      const status = t.status as string
      if (status === "in_progress" || status === "brackets_generated") {
        pushUnique({
          id: `tl-${t.id}`,
          kind: "tournament_live",
          title: `${t.name} is underway`,
          subtitle: `${(t.games as { name?: string } | null)?.name ?? "Bracket"} · live`,
          href: `/tournaments/${t.id}`,
          at: (t.created_at as string) || nowIso,
        })
      } else if (status === "registration") {
        pushUnique({
          id: `to-${t.id}`,
          kind: "tournament_open",
          title: `${t.name} is open`,
          subtitle: "Registration — claim a slot",
          href: `/tournaments/${t.id}`,
          at: (t.created_at as string) || nowIso,
        })
      }
    }

    if (liveBuilt[0]) {
      pushUnique({
        id: `live-${liveBuilt[0].id}`,
        kind: "match_live",
        title: `${liveBuilt[0].player1} vs ${liveBuilt[0].player2}`,
        subtitle: `${getGameDisplayName(liveBuilt[0].gameName)} · ${liveBuilt[0].bet} entry`,
        href: `/games/match/${liveBuilt[0].id}`,
        at: liveBuilt[0].startedAt || nowIso,
      })
    }

    for (const m of completedRes.data ?? []) {
      const winnerId = m.winner_id as string | null
      if (!winnerId || !friendMeta.has(winnerId)) continue
      const meta = friendMeta.get(winnerId)!
      const pot = ((m.bet_amount as number) ?? 0) * 2
      pushUnique({
        id: `fw-${m.id}`,
        kind: "friend_win",
        title: `${meta.displayName} banked ${pot.toLocaleString()} tokens`,
        subtitle: getGameDisplayName((m.games as { name?: string } | null)?.name ?? "Match"),
        href: `/games/match/${m.id}`,
        at: (m.completed_at as string) || nowIso,
      })
      break
    }

    for (const f of friendRows) {
      if (f.status !== "searching") continue
      pushUnique({
        id: `fq-${f.id}`,
        kind: "friend_queue",
        title: `${f.displayName} entered queue`,
        subtitle: f.statusDetail ?? "Searching",
        href: "/games",
        at: nowIso,
      })
      break
    }

    const streakFriend = friendRows.find((f) => (f.winStreak ?? 0) >= 3)
    if (streakFriend) {
      pushUnique({
        id: `st-${streakFriend.id}`,
        kind: "streak",
        title: `${streakFriend.displayName} is on a ${streakFriend.winStreak}-win run`,
        subtitle: "Challenge them while they’re hot",
        href: `/chat/dm/${streakFriend.id}`,
        at: nowIso,
      })
    }

    const board = (suggestRes.data ?? [])
      .slice()
      .sort((a, b) => Number(b.win_rate) - Number(a.win_rate))[0]
    if (board && Number(board.win_rate) > 0) {
      pushUnique({
        id: `lb-${board.id}`,
        kind: "leaderboard",
        title: `${board.display_name || board.username} leads at ${board.win_rate}%`,
        subtitle: "Highest win rate in this sample",
        href: "/matches",
        at: nowIso,
      })
    }

    pushUnique({
      id: "ann-hub",
      kind: "announcement",
      title: ANNOUNCEMENTS[0].title,
      subtitle: ANNOUNCEMENTS[0].body,
      href: "/games",
      at: nowIso,
    })

    pulseItems.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    setPulse(pulseItems.slice(0, 8))

    const dmMap = new Map<string, DmPreview>()
    const unreadBy = new Map<string, number>()
    for (const msg of dmRes.data ?? []) {
      const otherId = msg.sender_id === user.id ? (msg.recipient_id as string) : (msg.sender_id as string)
      if (!otherId) continue
      if (msg.recipient_id === user.id && msg.is_read === false) {
        unreadBy.set(otherId, (unreadBy.get(otherId) ?? 0) + 1)
      }
      if (dmMap.has(otherId)) continue
      dmMap.set(otherId, {
        userId: otherId,
        displayName: "Direct message",
        username: "",
        preview: String(msg.content).slice(0, 60),
        at: msg.created_at as string,
        unread: 0,
        isOnline: false,
      })
    }
    const dmIds = [...dmMap.keys()]
    if (dmIds.length > 0) {
      const { data: dmUsers } = await supabase
        .from("users")
        .select("id, username, display_name, is_online")
        .in("id", dmIds)
      for (const u of dmUsers ?? []) {
        const prev = dmMap.get(u.id)
        if (prev) {
          dmMap.set(u.id, {
            ...prev,
            displayName: u.display_name || u.username,
            username: u.username,
            unread: unreadBy.get(u.id) ?? 0,
            isOnline: Boolean(u.is_online),
          })
        }
      }
    }
    setDms([...dmMap.values()].slice(0, 6))

    const recentRows: RecentOpponent[] = (recentRes.data ?? [])
      .map((m) => {
        const p1 = m.player1 as { id: string; username: string; display_name?: string } | null
        const p2 = m.player2 as { id: string; username: string; display_name?: string } | null
        const opp = p1?.id === user.id ? p2 : p1
        if (!opp) return null
        return {
          userId: opp.id,
          displayName: opp.display_name || opp.username,
          username: opp.username,
          gameName: (m.games as { name?: string } | null)?.name ?? "Game",
          won: m.winner_id === user.id,
          at: (m.completed_at as string) || nowIso,
        }
      })
      .filter(Boolean) as RecentOpponent[]
    setRecent(recentRows)

    setTournaments(
      (tourneyRes.data ?? [])
        .filter((t) => t.status !== "completed")
        .slice(0, 4)
        .map((t) => ({
          id: t.id as string,
          name: t.name as string,
          status: t.status as string,
          gameName: (t.games as { name?: string } | null)?.name ?? "Game",
        }))
    )

    const friendIdSet = new Set(friendRows.map((f) => f.id))
    friendIdSet.add(user.id)
    setSuggested(
      (suggestRes.data ?? [])
        .filter((u) => !friendIdSet.has(u.id))
        .slice(0, 4)
        .map((u) => ({
          id: u.id,
          displayName: u.display_name || u.username,
          username: u.username,
          winRate: Number(u.win_rate) || 0,
        }))
    )

    setLoading(false)
  }, [user.id])

  useEffect(() => {
    loadHub()
    const channel = supabase
      .channel("social-hub")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => loadHub())
      .on("postgres_changes", { event: "*", schema: "public", table: "matchmaking_queue" }, () => loadHub())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => loadHub())
      .subscribe()
    const interval = setInterval(loadHub, 45000)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [loadHub])

  const friendsOnline = useMemo(() => friends.filter((f) => f.status !== "offline").length, [friends])

  return (
    <div className="chance-social-hub-root w-full max-w-full">
    <CompetitivePageFeed className="chance-home-feed chance-home-feed--hero-first chance-social-hub-feed">
      <SocialHubHero friendsOnline={friendsOnline} liveMatches={liveCount} inQueue={queueCount} />

      <nav className="chance-social-mobile-tabs" aria-label="Social sections">
        {(
          [
            ["friends", "Friends"],
            ["floor", "Activity"],
            ["chat", "Chat"],
            ["more", "More"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`chance-social-mobile-tab ${pane === id ? "is-active" : ""}`}
            onClick={() => setPane(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className={`chance-social-hub-grid chance-social-hub-grid--${pane}`}>
        <aside className="chance-social-hub-col chance-social-pane--friends" aria-label="Friends and community">
          <FriendsPanel friends={friends} loading={loading} />
          <div className="chance-social-hub-left-scroll">
            <SuggestedPanel suggested={suggested} loading={loading} />
            <TournamentPanel items={tournaments} compact />
            <AnnouncementsPanel compact />
          </div>
        </aside>

        <div className="chance-social-hub-col chance-social-hub-col-main chance-social-pane--floor">
          <PulsePanel items={pulse} loading={loading} />
          <RecentPanel recent={recent} loading={loading} compact />
          <section className="chance-premium-card chance-social-chat-panel chance-social-pane--chat">
            <div className="chance-rail-card-head shrink-0 border-b border-[var(--chance-border)] px-4 py-3 sm:px-5">
              <h2 className="chance-section-title text-base">Global chat</h2>
              <ChanceBadge variant="live" showLiveDot className="text-[0.6875rem]">
                Live
              </ChanceBadge>
            </div>
            <div className="chance-social-chat-body min-h-0 flex-1">
              <ChatWindow messageType="global" currentUser={user} maxHeight="100%" appearance="chance" />
            </div>
          </section>
        </div>

        <aside className="chance-social-hub-col chance-social-pane--more" aria-label="Live board and invites">
          <LivePanel matches={liveMatches} loading={loading} />
          <DmPanel dms={dms} loading={loading} compact />
          <ConnectPanel compact />
          <LfmPanel lanes={lanes} loading={loading} />
        </aside>
      </div>
    </CompetitivePageFeed>
    </div>
  )
}

function FriendsPanel({ friends, loading }: { friends: SocialFriend[]; loading: boolean }) {
  return (
    <section className="chance-premium-card chance-social-friends-panel flex flex-col p-4 sm:p-[1.125rem]">
      <div className="chance-rail-card-head">
        <h2 className="chance-section-title text-base">Friends</h2>
        <Link href="/friends/add" className="chance-link-arrow chance-focus-ring rounded-sm">
          Add →
        </Link>
      </div>
      {loading ? (
        <SkeletonRows rows={4} className="h-14" />
      ) : friends.length === 0 ? (
        <EmptyState className="py-6">
          <p className="chance-text-caption">Your circle is empty. Add one player and this rail comes alive.</p>
          <Link href="/friends/add" className="chance-hero-cta-primary chance-focus-ring mt-3 inline-flex px-3 py-2 text-xs">
            Find players
          </Link>
        </EmptyState>
      ) : (
        <ul className="chance-social-friends-list mt-1 space-y-1 overflow-y-auto">
          {friends.map((f) => (
            <li key={f.id} className="chance-social-friend-row">
              <div className="flex items-start gap-2.5">
                <div className="relative shrink-0">
                  <ChancePlayerAvatar name={f.displayName} className="size-9 text-xs" />
                  <span className={`chance-social-dot chance-social-dot--${f.status}`} aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[0.8125rem] font-medium">{f.displayName}</p>
                    <SocialStatusPill status={f.status} />
                  </div>
                  <p className="chance-text-caption truncate">
                    {[f.favoriteGame, f.winRate ? `${f.winRate}% WR` : null, f.winStreak && f.winStreak >= 2 ? `${f.winStreak} streak` : null]
                      .filter(Boolean)
                      .join(" · ") || `@${f.username}`}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {f.matchId ? (
                      <Link href={`/games/match/${f.matchId}`} className="chance-social-mini-action">
                        Spectate
                      </Link>
                    ) : null}
                    <Link href={`/chat/dm/${f.id}`} className="chance-social-mini-action">
                      Message
                    </Link>
                    <Link href="/games" className="chance-social-mini-action">
                      Invite
                    </Link>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function PulsePanel({ items, loading }: { items: PulseItem[]; loading: boolean }) {
  return (
    <section className="chance-premium-card chance-social-pulse-panel p-4 sm:p-[1.125rem]">
      <div className="chance-rail-card-head shrink-0">
        <h2 className="chance-section-title text-base">Community pulse</h2>
        <span className="chance-text-caption">Competitive feed</span>
      </div>
      {loading ? (
        <SkeletonRows rows={5} className="h-12 flex-1" />
      ) : items.length === 0 ? (
        <EmptyState className="flex flex-1 flex-col justify-center py-5">
          <p className="chance-text-caption">The floor is quiet. Queue first and the feed starts writing itself.</p>
          <Link href="/games" className="chance-hero-cta-primary chance-focus-ring mt-3 inline-flex px-3 py-2 text-xs">
            Open Play
          </Link>
        </EmptyState>
      ) : (
        <ul className="chance-social-pulse-list mt-1 min-h-0 flex-1 space-y-2">
          {items.map((item) => {
            const Icon = PULSE_ICON[item.kind]
            const body = (
              <div className={`chance-social-pulse chance-social-pulse--${item.kind}`}>
                <span className="chance-social-pulse-icon" aria-hidden>
                  <Icon className="size-3.5 stroke-[1.75]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.8125rem] font-medium">{item.title}</p>
                  <p className="chance-text-caption truncate">{item.subtitle}</p>
                </div>
                <time className="chance-text-mono shrink-0 text-[0.6875rem] text-[var(--chance-muted-fg)]">
                  {relativeTime(item.at)}
                </time>
              </div>
            )
            return (
              <li key={item.id}>
                {item.href ? (
                  <Link href={item.href} className="block">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function LivePanel({ matches, loading }: { matches: SocialLiveMatch[]; loading: boolean }) {
  return (
    <section className="chance-premium-card p-4 sm:p-[1.125rem]">
      <div className="chance-rail-card-head">
        <h2 className="chance-section-title text-base">Live matches</h2>
        {matches.length > 0 ? (
          <ChanceBadge variant="live" showLiveDot className="text-[0.6875rem]">
            {matches.length}
          </ChanceBadge>
        ) : (
          <span className="chance-text-caption">Idle</span>
        )}
      </div>
      {loading ? (
        <SkeletonRows rows={2} className="h-14" />
      ) : matches.length === 0 ? (
        <EmptyState className="py-5">
          <p className="chance-text-caption">No tables running. Start one and this card becomes a watch board.</p>
          <Link href="/games" className="chance-hero-cta-ghost chance-focus-ring mt-3 inline-flex px-3 py-2 text-xs">
            Find a table
          </Link>
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {matches.map((row) => (
            <li key={row.id} className="chance-social-live-row">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.8125rem] font-medium">{getGameDisplayName(row.gameName)}</p>
                <p className="chance-text-caption truncate">
                  {row.player1} vs {row.player2}
                </p>
                <p className="chance-text-caption mt-0.5">
                  {row.bet} entry · {elapsedLabel(row.startedAt)}
                </p>
              </div>
              <Link
                href={`/games/match/${row.id}`}
                className="chance-secondary-btn chance-focus-ring inline-flex shrink-0 items-center gap-1 px-2.5 py-1.5 text-xs"
              >
                <Eye className="size-3.5 stroke-[1.75]" aria-hidden />
                Watch
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function LfmPanel({
  lanes,
  loading,
  className,
}: {
  lanes: LfmLane[]
  loading: boolean
  className?: string
}) {
  return (
    <section
      className={`chance-premium-card chance-social-lfm-panel p-4 sm:p-[1.125rem] ${className ?? ""}`}
    >
      <div className="chance-rail-card-head shrink-0">
        <h2 className="chance-section-title text-base">Looking for match</h2>
        <Users className="size-4 text-[var(--chance-muted-fg)]" aria-hidden />
      </div>
      {loading ? (
        <SkeletonRows rows={2} className="h-16" />
      ) : lanes.length === 0 ? (
        <EmptyState className="py-4">
          <p className="chance-text-caption">Queues are empty. Open Play and you become the first ping.</p>
          <Link href="/games" className="chance-hero-cta-primary chance-focus-ring mt-3 inline-flex px-3 py-2 text-xs">
            Join a queue
          </Link>
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {lanes.map((lane) => (
            <li key={lane.gameName} className="chance-social-lfm-row">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{getGameDisplayName(lane.gameName)}</p>
                <p className="chance-text-caption">
                  {lane.searching} searching · ~{lane.estimatedWaitSec}s · avg {lane.avgStake}
                </p>
              </div>
              <Link
                href={lane.gameId ? `/games/${lane.gameId}` : "/games"}
                className="chance-hero-cta-ghost chance-focus-ring px-2.5 py-1.5 text-xs"
              >
                Join
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function DmPanel({ dms, loading, compact }: { dms: DmPreview[]; loading: boolean; compact?: boolean }) {
  return (
    <section className={`chance-premium-card ${compact ? "p-3 sm:p-3.5" : "p-4 sm:p-[1.125rem]"}`}>
      <div className="chance-rail-card-head">
        <h2 className="chance-section-title text-base">Direct messages</h2>
        <Mail className="size-4 text-[var(--chance-muted-fg)]" aria-hidden />
      </div>
      {loading ? (
        <SkeletonRows rows={2} className="h-10" />
      ) : dms.length === 0 ? (
        <EmptyState className="py-4">
          <p className="chance-text-caption">No threads yet. Message someone from Friends.</p>
        </EmptyState>
      ) : (
        <ul className="space-y-1">
          {dms.map((d) => (
            <li key={d.userId}>
              <Link href={`/chat/dm/${d.userId}`} className="chance-social-dm-row">
                <div className="relative shrink-0">
                  <ChancePlayerAvatar name={d.displayName} className="size-8 text-[10px]" />
                  <span className={`chance-social-dot ${d.isOnline ? "chance-social-dot--idle" : "chance-social-dot--offline"}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-medium">{d.displayName}</p>
                    <time className="chance-text-caption shrink-0">{relativeTime(d.at)}</time>
                  </div>
                  <p className="chance-text-caption truncate">{d.preview}</p>
                </div>
                {d.unread > 0 ? <span className="chance-social-unread">{d.unread}</span> : <MessageCircle className="size-3.5 shrink-0 text-[var(--chance-muted-fg)]" aria-hidden />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ConnectPanel({ compact }: { compact?: boolean }) {
  return (
    <section className={`chance-premium-card ${compact ? "p-3 sm:p-3.5" : "p-4 sm:p-[1.125rem]"}`}>
      <div className="chance-rail-card-head">
        <h2 className="chance-section-title text-base">Connect</h2>
        <Mic className="size-4 text-[var(--chance-muted-fg)]" aria-hidden />
      </div>
      {!compact ? <p className="chance-text-caption mb-3">Party invites · voice rooms</p> : null}
      <EmptyState className={compact ? "py-2" : "py-3"}>
        <p className="chance-text-caption">No party invites right now.</p>
      </EmptyState>
      <ul className={`space-y-2 ${compact ? "mt-1" : "mt-2"}`}>
        <li className="chance-social-voice-row">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium">Ranked lounge</p>
            <p className="chance-text-caption">0 in room</p>
          </div>
          <Link href="/call" className="chance-hero-cta-ghost chance-focus-ring px-2.5 py-1.5 text-xs">
            Join
          </Link>
        </li>
        <li className="chance-social-voice-row">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium">Casual table</p>
            <p className="chance-text-caption">0 in room</p>
          </div>
          <Link href="/call" className="chance-hero-cta-ghost chance-focus-ring px-2.5 py-1.5 text-xs">
            Join
          </Link>
        </li>
      </ul>
      {!compact ? (
        <Link href="/call" className="chance-link-arrow mt-3 inline-block text-xs">
          Open live call →
        </Link>
      ) : (
        <Link href="/call" className="chance-link-arrow mt-2 inline-block text-[0.6875rem]">
          Live call →
        </Link>
      )}
    </section>
  )
}

function TournamentPanel({ items, compact }: { items: TournamentPulse[]; compact?: boolean }) {
  return (
    <section className={`chance-premium-card ${compact ? "p-3 sm:p-3.5" : "p-4 sm:p-[1.125rem]"}`}>
      <div className="chance-rail-card-head">
        <h2 className="chance-section-title text-base">Tournaments</h2>
        <Link href="/tournaments" className="chance-link-arrow text-xs">
          All →
        </Link>
      </div>
      {items.length === 0 ? (
        <EmptyState className="py-4">
          <p className="chance-text-caption">No open brackets. Create one when you want a field.</p>
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {items.map((t) => (
            <li key={t.id}>
              <Link href={`/tournaments/${t.id}`} className="chance-social-lfm-row block">
                <p className="truncate text-xs font-medium">{t.name}</p>
                <p className="chance-text-caption capitalize">
                  {t.gameName} · {t.status.replace("_", " ")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function AnnouncementsPanel({ compact }: { compact?: boolean }) {
  return (
    <section className={`chance-premium-card ${compact ? "p-3 sm:p-3.5" : "p-4 sm:p-[1.125rem]"}`}>
      <div className="chance-rail-card-head">
        <h2 className="chance-section-title text-base">Announcements</h2>
        <Megaphone className="size-4 text-[var(--chance-muted-fg)]" aria-hidden />
      </div>
      <ul className="space-y-2">
        {ANNOUNCEMENTS.map((a) => (
          <li key={a.id} className="chance-social-announce">
            <p className="text-xs font-medium">{a.title}</p>
            <p className="chance-text-caption mt-0.5">{a.body}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

function SuggestedPanel({
  suggested,
  loading,
  compact,
}: {
  suggested: SuggestedUser[]
  loading: boolean
  compact?: boolean
}) {
  return (
    <section
      className={`chance-premium-card chance-social-suggested-panel ${compact ? "p-3 sm:p-3.5" : "p-4 sm:p-[1.125rem]"}`}
    >
      <div className="chance-rail-card-head shrink-0">
        <h2 className="chance-section-title text-base">Suggested friends</h2>
        <UserPlus className="size-4 text-[var(--chance-muted-fg)]" aria-hidden />
      </div>
      {loading ? (
        <SkeletonRows rows={2} className="h-10" />
      ) : suggested.length === 0 ? (
        <EmptyState className="py-4">
          <p className="chance-text-caption">No suggestions yet. Search by handle instead.</p>
          <Link href="/friends/add" className="chance-link-arrow mt-2 inline-block text-xs">
            Search →
          </Link>
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {suggested.map((s) => (
            <li key={s.id} className="flex items-center gap-2">
              <ChancePlayerAvatar name={s.displayName} className="size-8 text-[10px]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{s.displayName}</p>
                <p className="chance-text-caption">{s.winRate}% win rate</p>
              </div>
              <Link href="/friends/add" className="chance-social-mini-action">
                Add
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function RecentPanel({
  recent,
  loading,
  compact,
}: {
  recent: RecentOpponent[]
  loading: boolean
  compact?: boolean
}) {
  return (
    <section
      className={`chance-premium-card chance-social-recent-panel ${compact ? "p-3 sm:p-3.5" : "p-4 sm:p-[1.125rem]"}`}
    >
      <div className="chance-rail-card-head shrink-0">
        <h2 className="chance-section-title text-base">Recently played with</h2>
        <Eye className="size-4 text-[var(--chance-muted-fg)]" aria-hidden />
      </div>
      {loading ? (
        <SkeletonRows rows={2} className="h-10" />
      ) : recent.length === 0 ? (
        <EmptyState className="py-4">
          <p className="chance-text-caption">Finish a ranked match and rematch lives here.</p>
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {recent.map((r) => (
            <li key={`${r.userId}-${r.at}`} className="flex items-center gap-2">
              <ChancePlayerAvatar name={r.displayName} className="size-8 text-[10px]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{r.displayName}</p>
                <p className="chance-text-caption">
                  {getGameDisplayName(r.gameName)} · {r.won ? "W" : "L"} · {relativeTime(r.at)}
                </p>
              </div>
              <Link href={`/chat/dm/${r.userId}`} className="chance-social-mini-action">
                DM
              </Link>
              <Link href="/games" className="chance-social-mini-action">
                Rematch
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
