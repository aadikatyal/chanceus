"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  acceptFriendRequest,
  getPendingRequests,
  getSentRequests,
  rejectFriendRequest,
  searchUsers,
  sendFriendRequest,
  type FriendRequest,
} from "@/lib/friends-actions"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { SkeletonRows } from "@/components/dashboard/chance-craft"
import ChancePlayerAvatar from "@/components/dashboard/chance-player-avatar"
import PlayerDiscoveryHero from "@/components/social/discovery/player-discovery-hero"
import PlayerProfileCard from "@/components/social/discovery/player-profile-card"
import type { DiscoveryPlayer, RecentOpponentRow, RivalRow } from "@/components/social/discovery/player-discovery-types"
import { getGameDisplayName } from "@/lib/games/game-visuals"
import { CheckCircle, Swords, TrendingUp, XCircle } from "lucide-react"

type RequestTab = "incoming" | "outgoing" | "suggested"

function rankLabel(winRate: number, wins: number) {
  if (winRate >= 58 || wins >= 25) return "Elite"
  if (winRate >= 45 || wins >= 10) return "Contender"
  return "Rising"
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 48) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function PlayerDiscoveryPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [searchResults, setSearchResults] = useState<DiscoveryPlayer[]>([])
  const [recommended, setRecommended] = useState<DiscoveryPlayer[]>([])
  const [recent, setRecent] = useState<RecentOpponentRow[]>([])
  const [rivals, setRivals] = useState<RivalRow[]>([])
  const [trending, setTrending] = useState<DiscoveryPlayer[]>([])
  const [incoming, setIncoming] = useState<FriendRequest[]>([])
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([])
  const [requestTab, setRequestTab] = useState<RequestTab>("incoming")

  const [friendIds, setFriendIds] = useState<Set<string>>(new Set())
  const [pendingIn, setPendingIn] = useState<Map<string, string>>(new Map())
  const [pendingOut, setPendingOut] = useState<Set<string>>(new Set())

  const friendStateFor = useCallback(
    (userId: string): DiscoveryPlayer["friendState"] => {
      if (friendIds.has(userId)) return "friends"
      if (pendingOut.has(userId)) return "pending_out"
      if (pendingIn.has(userId)) return "pending_in"
      return "none"
    },
    [friendIds, pendingIn, pendingOut]
  )

  const reloadRequests = async () => {
    const [pendingRes, sentRes] = await Promise.all([getPendingRequests(), getSentRequests()])
    if (pendingRes.data) setIncoming(pendingRes.data)
    if (sentRes.data) setOutgoing(sentRes.data)
    const inMap = new Map<string, string>()
    for (const r of pendingRes.data ?? []) {
      inMap.set(r.user_id, r.id)
    }
    setPendingIn(inMap)
    setPendingOut(new Set((sentRes.data ?? []).map((r) => r.friend_id)))
    return { inMap, outSet: new Set((sentRes.data ?? []).map((r) => r.friend_id)) }
  }

  const loadDiscovery = useCallback(async () => {
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { inMap, outSet } = await reloadRequests()

    const { data: friendRows } = await supabase
      .from("friends")
      .select("user_id, friend_id, status")
      .eq("status", "accepted")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)

    const accepted = new Set<string>()
    for (const row of friendRows ?? []) {
      accepted.add(row.user_id === user.id ? row.friend_id : row.user_id)
    }
    setFriendIds(accepted)

    const stateFor = (userId: string): DiscoveryPlayer["friendState"] => {
      if (accepted.has(userId)) return "friends"
      if (outSet.has(userId)) return "pending_out"
      if (inMap.has(userId)) return "pending_in"
      return "none"
    }

    const { data: queueRows } = await supabase.from("matchmaking_queue").select("user_id").eq("status", "waiting")
    const queueIds = new Set((queueRows ?? []).map((r) => r.user_id as string))

    const { data: usersPool } = await supabase
      .from("users")
      .select("id, username, display_name, avatar_url, win_rate, is_online, total_games_won, tokens")
      .neq("id", user.id)
      .order("win_rate", { ascending: false })
      .limit(40)

    const buildPlayer = (u: Record<string, unknown>, extras?: Partial<DiscoveryPlayer>): DiscoveryPlayer => {
      const id = u.id as string
      const winRate = Math.round(Number(u.win_rate) || 0)
      const wins = Number(u.total_games_won) || 0
      return {
        id,
        username: u.username as string,
        displayName: (u.display_name as string) || (u.username as string),
        avatarUrl: u.avatar_url as string | null,
        winRate,
        rankLabel: rankLabel(winRate, wins),
        winStreak: Math.min(9, Math.max(0, Math.floor(winRate / 15))),
        isOnline: Boolean(u.is_online),
        inQueue: queueIds.has(id),
        mutualFriends: extras?.mutualFriends ?? 0,
        favoriteGame: extras?.favoriteGame,
        lastPlayedAt: extras?.lastPlayedAt,
        tokens: Number(u.tokens) || 0,
        totalWins: wins,
        friendState: stateFor(id),
        requestId: inMap.get(id),
      }
    }

    const excluded = new Set([user.id, ...accepted, ...outSet, ...inMap.keys()])

    const rec = (usersPool ?? [])
      .filter((u) => !excluded.has(u.id as string))
      .slice(0, 8)
      .map((u) => buildPlayer(u))

    setRecommended(rec.length > 0 ? rec : (usersPool ?? []).slice(0, 6).map((u) => buildPlayer(u)))

    setTrending(
      (usersPool ?? [])
        .slice()
        .sort((a, b) => Number(b.total_games_won) - Number(a.total_games_won) || Number(b.win_rate) - Number(a.win_rate))
        .slice(0, 8)
        .map((u) => buildPlayer(u))
    )

    const { data: matchHistory } = await supabase
      .from("matches")
      .select(
        `
        id, completed_at, winner_id, bet_amount, player1_id, player2_id,
        games(name),
        player1:users!matches_player1_id_fkey(id, username, display_name),
        player2:users!matches_player2_id_fkey(id, username, display_name)
      `
      )
      .eq("status", "completed")
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
      .order("completed_at", { ascending: false })
      .limit(40)

    const recentRows: RecentOpponentRow[] = []
    const rivalAgg = new Map<
      string,
      { displayName: string; username: string; wins: number; losses: number; tokenDelta: number; matches: number; lastAt: string }
    >()

    for (const m of matchHistory ?? []) {
      const p1 = m.player1 as { id: string; username: string; display_name?: string } | null
      const p2 = m.player2 as { id: string; username: string; display_name?: string } | null
      const opp = p1?.id === user.id ? p2 : p1
      if (!opp) continue
      const gameName = (m.games as { name?: string } | null)?.name ?? "Game"
      const won = m.winner_id === user.id
      const bet = Number(m.bet_amount) || 0
      const at = (m.completed_at as string) || new Date().toISOString()

      if (recentRows.length < 8) {
        recentRows.push({
          userId: opp.id,
          displayName: opp.display_name || opp.username,
          username: opp.username,
          gameName,
          won,
          at,
          friendState: stateFor(opp.id),
          requestId: inMap.get(opp.id),
        })
      }

      const prev = rivalAgg.get(opp.id) ?? {
        displayName: opp.display_name || opp.username,
        username: opp.username,
        wins: 0,
        losses: 0,
        tokenDelta: 0,
        matches: 0,
        lastAt: at,
      }
      prev.matches += 1
      if (won) {
        prev.wins += 1
        prev.tokenDelta += bet
      } else {
        prev.losses += 1
        prev.tokenDelta -= bet
      }
      rivalAgg.set(opp.id, prev)
    }

    setRecent(recentRows)

    const rivalRows: RivalRow[] = [...rivalAgg.entries()]
      .filter(([, v]) => v.matches >= 2)
      .map(([userId, v]) => ({
        userId,
        displayName: v.displayName,
        username: v.username,
        matchesPlayed: v.matches,
        wins: v.wins,
        losses: v.losses,
        tokenDelta: v.tokenDelta,
        currentStreak: v.wins > v.losses ? Math.min(5, v.wins - v.losses) : 0,
        friendState: stateFor(userId),
        requestId: inMap.get(userId),
      }))
      .sort((a, b) => b.matchesPlayed - a.matchesPlayed)
      .slice(0, 6)

    setRivals(rivalRows)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadDiscovery()
  }, [loadDiscovery])

  const handleSendRequest = async (userId: string, username: string) => {
    const { success, error } = await sendFriendRequest(userId)
    if (success) {
      toast({ title: "Request sent", description: `Sent to ${username}` })
      await reloadRequests()
      setPendingOut((prev) => new Set(prev).add(userId))
      loadDiscovery()
    } else {
      toast({ title: "Could not send", description: error, variant: "destructive" })
    }
  }

  const handleAccept = async (requestId: string) => {
    const { success, error } = await acceptFriendRequest(requestId)
    if (success) {
      toast({ title: "Friend added" })
      await reloadRequests()
      loadDiscovery()
    } else {
      toast({ title: "Failed", description: error, variant: "destructive" })
    }
  }

  const handleReject = async (requestId: string) => {
    const { success } = await rejectFriendRequest(requestId)
    if (success) {
      toast({ title: "Request declined" })
      await reloadRequests()
      loadDiscovery()
    }
  }

  const handleSearch = async () => {
    if (searchTerm.trim().length < 2) {
      toast({ title: "Keep typing", description: "At least 2 characters", variant: "destructive" })
      return
    }
    setIsSearching(true)
    setHasSearched(true)
    const { data, error } = await searchUsers(searchTerm.trim())
    if (error) {
      toast({ title: "Search failed", variant: "destructive" })
      setSearchResults([])
    } else {
      const ids = (data ?? []).map((u) => u.id as string)
      let enriched = data ?? []
      if (ids.length > 0) {
        const { data: full } = await supabase
          .from("users")
          .select("id, username, display_name, avatar_url, win_rate, total_games_won, is_online")
          .in("id", ids)
        if (full) enriched = full
      }
      setSearchResults(
        enriched.map((u) => {
          const id = u.id as string
          return buildDiscoveryFromSearch(u, friendStateFor(id), pendingIn.get(id))
        })
      )
    }
    setIsSearching(false)
  }

  function buildDiscoveryFromSearch(
    u: Record<string, unknown>,
    state: DiscoveryPlayer["friendState"],
    requestId?: string
  ): DiscoveryPlayer {
    const winRate = Math.round(Number(u.win_rate) || 0)
    const wins = Number(u.total_games_won) || 0
    return {
      id: u.id as string,
      username: u.username as string,
      displayName: (u.display_name as string) || (u.username as string),
      avatarUrl: u.avatar_url as string | null,
      winRate,
      rankLabel: rankLabel(winRate, wins),
      winStreak: 0,
      isOnline: false,
      inQueue: false,
      mutualFriends: 0,
      friendState: state,
      requestId,
    }
  }

  const suggestedForTab = useMemo(() => recommended.slice(0, 6), [recommended])

  return (
    <div className="chance-discovery-feed-stack">
      <PlayerDiscoveryHero
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onSearch={handleSearch}
        isSearching={isSearching}
      />

      <section className="chance-discovery-section" aria-labelledby="rec-heading">
        <header className="chance-discovery-section-head">
          <h2 id="rec-heading" className="chance-section-title text-base">
            Recommended players
          </h2>
          <p className="chance-text-caption">Active competitors you haven&apos;t linked yet</p>
        </header>
        {loading ? (
          <SkeletonRows rows={2} className="h-32" />
        ) : (
          <div className="chance-discovery-player-track">
            {recommended.map((p) => (
              <PlayerProfileCard key={p.id} player={{ ...p, friendState: friendStateFor(p.id), requestId: pendingIn.get(p.id) }} onAddFriend={handleSendRequest} onAccept={handleAccept} />
            ))}
          </div>
        )}
      </section>

      <section className="chance-discovery-section" aria-labelledby="recent-heading">
        <header className="chance-discovery-section-head">
          <h2 id="recent-heading" className="chance-section-title text-base">
            Recently played with
          </h2>
          <p className="chance-text-caption">Your fastest path to a rematch</p>
        </header>
        {loading ? (
          <SkeletonRows rows={3} className="h-16" />
        ) : recent.length === 0 ? (
          <div className="chance-premium-card chance-discovery-inset py-8 text-center">
            <p className="text-sm font-medium">No ranked history yet</p>
            <p className="chance-text-caption mt-1">Finish a match and opponents show up here.</p>
            <Link href="/games" className="chance-hero-cta-primary chance-focus-ring mt-4 inline-flex px-4 py-2.5 text-sm">
              Play now
            </Link>
          </div>
        ) : (
          <ul className="chance-discovery-recent-list">
            {recent.map((r) => (
              <li key={`${r.userId}-${r.at}`} className="chance-discovery-recent-row">
                <ChancePlayerAvatar name={r.displayName} className="size-10 text-xs" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{r.displayName}</p>
                  <p className="chance-text-caption">
                    {getGameDisplayName(r.gameName)} · {r.won ? "W" : "L"} · {relativeTime(r.at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {r.friendState === "none" ? (
                    <button type="button" className="chance-social-mini-action" onClick={() => handleSendRequest(r.userId, r.displayName)}>
                      Add
                    </button>
                  ) : null}
                  <Link href="/games" className="chance-social-mini-action">
                    Rematch
                  </Link>
                  <Link href={`/chat/dm/${r.userId}`} className="chance-social-mini-action">
                    Message
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="chance-discovery-section" aria-labelledby="rivals-heading">
        <header className="chance-discovery-section-head">
          <h2 id="rivals-heading" className="chance-section-title text-base">
            Rivals
          </h2>
          <p className="chance-text-caption">Head-to-head history that deserves a rematch</p>
        </header>
        {loading ? (
          <SkeletonRows rows={2} className="h-20" />
        ) : rivals.length === 0 ? (
          <div className="chance-premium-card chance-discovery-inset py-8 text-center">
            <p className="text-sm font-medium">No rivalries yet</p>
            <p className="chance-text-caption mt-1">Play the same opponent twice and the feud goes here.</p>
          </div>
        ) : (
          <div className="chance-discovery-rival-grid">
            {rivals.map((r) => (
              <article key={r.userId} className="chance-discovery-rival-card chance-premium-card">
                <div className="chance-discovery-inset">
                  <div className="flex items-start gap-3">
                    <ChancePlayerAvatar name={r.displayName} className="size-11 text-xs" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{r.displayName}</p>
                      <p className="chance-text-caption">@{r.username}</p>
                    </div>
                    <Swords className="size-4 shrink-0 text-[var(--chance-brand)]" aria-hidden />
                  </div>
                  <dl className="chance-discovery-rival-stats mt-3">
                    <div>
                      <dt className="chance-text-caption">Record</dt>
                      <dd className="text-sm font-semibold">
                        {r.wins}–{r.losses}
                      </dd>
                    </div>
                    <div>
                      <dt className="chance-text-caption">Matches</dt>
                      <dd className="chance-text-mono text-sm font-semibold">{r.matchesPlayed}</dd>
                    </div>
                    <div>
                      <dt className="chance-text-caption">Tokens</dt>
                      <dd className={`text-sm font-semibold ${r.tokenDelta >= 0 ? "text-[var(--chance-brand)]" : ""}`}>
                        {r.tokenDelta >= 0 ? "+" : ""}
                        {r.tokenDelta}
                      </dd>
                    </div>
                    <div>
                      <dt className="chance-text-caption">Win %</dt>
                      <dd className="text-sm font-semibold">{Math.round((r.wins / r.matchesPlayed) * 100)}%</dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.friendState === "none" ? (
                      <button type="button" className="chance-hero-cta-ghost chance-focus-ring px-3 py-1.5 text-xs" onClick={() => handleSendRequest(r.userId, r.displayName)}>
                        Add friend
                      </button>
                    ) : null}
                    <Link href="/games" className="chance-hero-cta-primary chance-focus-ring px-3 py-1.5 text-xs">
                      Challenge again
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="chance-discovery-section" aria-labelledby="requests-heading">
        <header className="chance-discovery-section-head">
          <h2 id="requests-heading" className="chance-section-title text-base">
            Friend requests
          </h2>
        </header>
        <div className="chance-discovery-request-tabs" role="tablist">
          {(
            [
              ["incoming", `Incoming (${incoming.length})`],
              ["outgoing", `Outgoing (${outgoing.length})`],
              ["suggested", "Suggested"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={requestTab === id}
              className={`chance-discovery-request-tab ${requestTab === id ? "is-active" : ""}`}
              onClick={() => setRequestTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="chance-premium-card chance-discovery-inset mt-3">
          {requestTab === "incoming" ? (
            incoming.length === 0 ? (
              <p className="chance-text-caption py-4 text-center">No incoming requests.</p>
            ) : (
              <ul className="space-y-2">
                {incoming.map((req) => (
                  <li key={req.id} className="chance-discovery-request-row">
                    <ChancePlayerAvatar name={req.user?.display_name || req.user?.username || "?"} className="size-10 text-xs" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{req.user?.display_name || req.user?.username}</p>
                      <p className="chance-text-caption">@{req.user?.username}</p>
                    </div>
                    <button type="button" className="chance-hero-cta-primary chance-focus-ring px-2.5 py-1.5 text-xs" onClick={() => handleAccept(req.id)}>
                      <CheckCircle className="mr-1 inline size-3.5" aria-hidden />
                      Accept
                    </button>
                    <button type="button" className="chance-hero-cta-ghost chance-focus-ring px-2.5 py-1.5 text-xs" onClick={() => handleReject(req.id)}>
                      <XCircle className="mr-1 inline size-3.5" aria-hidden />
                      Decline
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : null}
          {requestTab === "outgoing" ? (
            outgoing.length === 0 ? (
              <p className="chance-text-caption py-4 text-center">No pending outgoing requests.</p>
            ) : (
              <ul className="space-y-2">
                {outgoing.map((req) => (
                  <li key={req.id} className="chance-discovery-request-row">
                    <ChancePlayerAvatar name={req.friend?.display_name || req.friend?.username || "?"} className="size-10 text-xs" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{req.friend?.display_name || req.friend?.username}</p>
                      <p className="chance-text-caption">Pending</p>
                    </div>
                    <span className="chance-discovery-state-pill">Sent</span>
                  </li>
                ))}
              </ul>
            )
          ) : null}
          {requestTab === "suggested" ? (
            <div className="chance-discovery-player-track chance-discovery-player-track--inner">
              {suggestedForTab.map((p) => (
                <PlayerProfileCard key={p.id} player={p} compact onAddFriend={handleSendRequest} onAccept={handleAccept} />
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="chance-discovery-section" aria-labelledby="trend-heading">
        <header className="chance-discovery-section-head">
          <h2 id="trend-heading" className="chance-section-title text-base">
            Trending players
          </h2>
          <TrendingUp className="size-4 text-[var(--chance-brand)]" aria-hidden />
        </header>
        <div className="chance-discovery-player-track">
          {trending.map((p) => (
            <PlayerProfileCard key={`t-${p.id}`} player={p} compact onAddFriend={handleSendRequest} />
          ))}
        </div>
      </section>

      {hasSearched ? (
        <section className="chance-discovery-section" aria-labelledby="search-results-heading">
          <header className="chance-discovery-section-head">
            <h2 id="search-results-heading" className="chance-section-title text-base">
              Search results
            </h2>
            <p className="chance-text-caption">For &ldquo;{searchTerm.trim()}&rdquo;</p>
          </header>
          {searchResults.length === 0 ? (
            <div className="chance-premium-card chance-discovery-inset py-8 text-center">
              <p className="text-sm font-medium">No players found</p>
              <p className="chance-text-caption mt-1">Try another handle or browse recommended players above.</p>
            </div>
          ) : (
            <div className="chance-discovery-player-grid">
              {searchResults.map((p) => (
                <PlayerProfileCard key={p.id} player={p} onAddFriend={handleSendRequest} onAccept={handleAccept} />
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  )
}
