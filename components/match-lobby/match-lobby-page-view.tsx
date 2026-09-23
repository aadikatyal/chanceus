"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Clock, Copy, Eye, MessageSquare, Share2, Shield, Swords, Trophy, Users } from "lucide-react"
import EnhancedMatchInterface from "@/components/games/enhanced-match-interface"
import ChatWindow from "@/components/chat/chat-window"
import SpectatorMode from "@/components/games/spectator-mode"
import ChancePlayerAvatar from "@/components/dashboard/chance-player-avatar"
import { getGameDisplayName, getGameThumbnail } from "@/lib/games/game-visuals"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import {
  gameRulesBlurb,
  lobbyDisplayName,
  matchModeLabel,
  winRate,
  type LobbyUser,
} from "@/components/match-lobby/match-lobby-utils"

type MatchLobbyPageViewProps = {
  match: any
  user: LobbyUser
  markingReady: boolean
  acceptingMatch: boolean
  onMarkReady: () => void
  onAcceptFriend: () => void
  onDeclineFriend: () => void
  onJoinMatch: () => void
  onMatchComplete: (winnerId: string | null) => void
}

function LobbyShare({
  matchId,
  gameName,
  fromName,
  userId,
}: {
  matchId: string
  gameName: string
  fromName: string
  userId: string
}) {
  const { toast } = useToast()
  const [url, setUrl] = useState("")
  const [open, setOpen] = useState(false)
  const [friends, setFriends] = useState<{ id: string; name: string }[]>([])
  const [sendingId, setSendingId] = useState<string | null>(null)
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function"

  useEffect(() => {
    setUrl(window.location.href)
  }, [])

  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    void supabase
      .from("friends")
      .select(`
        user_id,
        friend_id,
        user:users!friends_user_id_fkey(id, display_name, username),
        friend:users!friends_friend_id_fkey(id, display_name, username)
      `)
      .eq("status", "accepted")
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .then(({ data }) => {
        const mapped =
          (data ?? []).map((row: any) => {
            const other = row.user_id === userId ? row.friend : row.user
            return { id: other?.id as string, name: (other?.display_name || other?.username || "Friend") as string }
          }).filter((friend: { id: string }) => friend.id) || []
        setFriends(mapped)
      })
  }, [open, userId])

  const copyLink = async () => {
    if (!url) return
    await navigator.clipboard.writeText(url)
    toast({ title: "Link copied" })
  }

  const shareSheet = async () => {
    if (!url) return
    if (!canShare) {
      await copyLink()
      return
    }
    await navigator.share({
      title: `${gameName} invite`,
      text: `${gameName} invite from @${fromName.replace(/^@/, "")}`,
      url,
    })
  }

  const sendToFriend = async (friendId: string) => {
    setSendingId(friendId)
    const supabase = createClient()
    const channel = supabase.channel(`call-invite:${friendId}`)
    await channel.subscribe()
    await channel.send({
      type: "broadcast",
      event: "match-invite",
      payload: { matchId, gameName, fromName },
    })
    await supabase.removeChannel(channel)
    setSendingId(null)
    toast({ title: "Invite sent" })
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" className="chance-secondary-btn chance-focus-ring px-4 py-2 text-sm" onClick={() => setOpen(true)}>
          <Users className="mr-1.5 inline size-4" aria-hidden />
          Share to friends
        </button>
        <button type="button" className="chance-secondary-btn chance-focus-ring px-4 py-2 text-sm" onClick={() => void copyLink()}>
          <Copy className="mr-1.5 inline size-4" aria-hidden />
          Copy link
        </button>
        <button type="button" className="chance-hero-cta-primary chance-focus-ring px-4 py-2 text-sm" onClick={() => void shareSheet()}>
          <Share2 className="mr-1.5 inline size-4" aria-hidden />
          Share
        </button>
      </div>
      {open ? (
        <div className="chance-dm-compose" role="dialog" aria-label="Share to friends" onClick={() => setOpen(false)}>
          <div className="chance-dm-compose-card" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--chance-border)] px-4 py-3">
              <h2 className="text-base font-semibold">Share to friends</h2>
              <button type="button" className="chance-text-caption text-sm" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <ul className="max-h-80 overflow-y-auto px-2 py-2">
              {friends.length === 0 ? (
                <li className="chance-text-caption px-3 py-6 text-center text-sm">No friends to invite yet.</li>
              ) : (
                friends.map((friend) => (
                  <li key={friend.id}>
                    <button
                      type="button"
                      className="chance-dm-thread-row w-full text-left"
                      disabled={sendingId === friend.id}
                      onClick={() => void sendToFriend(friend.id)}
                    >
                      <span className="truncate text-sm font-semibold">{sendingId === friend.id ? "Sending…" : friend.name}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ReadyRing({ ready }: { ready: boolean }) {
  return (
    <span
      className={`inline-flex size-3 rounded-full ${ready ? "bg-[var(--chance-yes)] shadow-[0_0_10px_var(--chance-yes)]" : "bg-[var(--chance-border-strong)]"}`}
      aria-hidden
    />
  )
}

function PlayerColumn({
  label,
  player,
  isYou,
  ready,
  side,
}: {
  label: string
  player: LobbyUser | null | undefined
  isYou: boolean
  ready?: boolean
  side: "left" | "right"
}) {
  const name = isYou ? "You" : lobbyDisplayName(player ?? undefined)
  const rate = winRate(player ?? undefined)
  const played = player?.total_games_played ?? 0

  return (
    <div
      className={`chance-match-player-col flex flex-col ${side === "left" ? "chance-match-player-col--left" : "chance-match-player-col--right"}`}
    >
      <div className="flex items-center gap-2">
        <ReadyRing ready={!!ready} />
        <span className="chance-text-caption uppercase tracking-[0.08em]">{label}</span>
      </div>
      <ChancePlayerAvatar
        name={player ? lobbyDisplayName(player) : "?"}
        className={`chance-match-player-avatar mx-auto mt-4 ${isYou ? "ring-2 ring-[var(--chance-brand)]" : ""}`}
      />
      <p className="mt-3 text-center text-base font-semibold tracking-tight">{name}</p>
      <dl className="mt-3 w-full space-y-1.5 text-[0.75rem]">
        <div className="flex justify-between gap-2">
          <dt className="text-[var(--chance-muted-fg)]">Win rate</dt>
          <dd className="chance-text-mono font-semibold tabular-nums">{rate !== null ? `${rate}%` : "—"}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-[var(--chance-muted-fg)]">Matches</dt>
          <dd className="chance-text-mono font-semibold tabular-nums">{played}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-[var(--chance-muted-fg)]">Tokens</dt>
          <dd className="chance-text-mono font-semibold tabular-nums">{(player?.tokens ?? 0).toLocaleString()}</dd>
        </div>
      </dl>
    </div>
  )
}

export default function MatchLobbyPageView({
  match,
  user,
  markingReady,
  acceptingMatch,
  onMarkReady,
  onAcceptFriend,
  onDeclineFriend,
  onJoinMatch,
  onMatchComplete,
}: MatchLobbyPageViewProps) {
  const isPlayer1 = match.player1_id === user.id
  const isPlayer2 = match.player2_id === user.id
  const isInMatch = isPlayer1 || isPlayer2
  const isSpectator = !isInMatch && !!match.player2_id
  const tournamentId = (match as { tournament_id?: string }).tournament_id

  const gameName = match.games?.name ?? "Game"
  const displayGame = getGameDisplayName(gameName)
  const thumb = getGameThumbnail(gameName)
  const pot = match.bet_amount * (match.player2_id ? 2 : 1)
  const mode = matchModeLabel(match.bet_amount, !!tournamentId)

  const p1Ready = !!match.game_data?.player1_ready
  const p2Ready = !!match.game_data?.player2_ready
  const friendPending =
    match.status === "waiting" &&
    match.game_data?.friend_match_request &&
    !match.game_data?.friend_match_accepted

  const showReady =
    match.status === "waiting" &&
    isInMatch &&
    match.player2_id &&
    (!match.game_data?.friend_match_request || match.game_data?.friend_match_accepted)

  const youReady = (isPlayer1 && p1Ready) || (isPlayer2 && p2Ready)
  const bothReady = p1Ready && p2Ready
  const opponentReady = isPlayer1 ? p2Ready : isPlayer2 ? p1Ready : false

  const statusLabel =
    match.status === "waiting"
      ? bothReady
        ? "Starting"
        : match.player2_id
          ? "Ready check"
          : "Waiting for opponent"
      : match.status === "in_progress"
        ? "Live"
        : match.status === "completed"
          ? "Final"
          : match.status

  const showLobbyChrome = match.status === "waiting"
  const isActiveMatch = match.status === "in_progress" || match.status === "completed"

  return (
    <div
      className={`chance-match-lobby chance-home-feed mx-auto w-full max-w-none pb-8 ${isActiveMatch ? "chance-match-lobby--active" : ""}`}
    >
      {!isActiveMatch ? (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {tournamentId ? (
          <Link href={`/tournaments/${tournamentId}`} className="chance-link-arrow chance-focus-ring inline-flex items-center gap-1 text-sm">
            <ArrowLeft className="size-4 stroke-[1.75]" aria-hidden />
            Tournament
          </Link>
        ) : (
          <Link href="/games" className="chance-link-arrow chance-focus-ring inline-flex items-center gap-1 text-sm">
            <ArrowLeft className="size-4 stroke-[1.75]" aria-hidden />
            Play
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {isSpectator ? (
            <span className="chance-play-live-badge">
              <Eye className="size-3 stroke-[1.75]" aria-hidden />
              Spectating
            </span>
          ) : null}
          <span className={`chance-match-status-badge chance-match-status-badge--${match.status}`}>{statusLabel}</span>
          <span className="chance-play-stat-pill">
            <Shield className="size-3.5 stroke-[1.75] text-[var(--chance-brand)]" aria-hidden />
            {mode}
          </span>
        </div>
      </div>
      ) : null}

      {showLobbyChrome ? (
      <section className="chance-match-arena chance-premium-card overflow-hidden">
        <div className="chance-match-arena-art">
          <Image src={thumb} alt="" fill className="object-cover" sizes="100vw" priority />
          <div className="chance-match-arena-scrim" aria-hidden />
        </div>
        <div className="chance-match-arena-body">
          <p className="chance-hero-kicker">
            <Swords className="size-3 stroke-[1.75]" aria-hidden />
            Match lobby
          </p>
          <h1 className="chance-match-arena-title">{displayGame}</h1>
          <p className="chance-text-caption mt-1 max-w-md">{match.games?.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="chance-play-stat-pill">
              <Trophy className="size-3.5 stroke-[1.75] text-[var(--chance-brand)]" aria-hidden />
              <span className="chance-text-mono font-semibold tabular-nums">{pot.toLocaleString()}</span> tk pot
            </span>
            <span className="chance-play-stat-pill">
              Entry <span className="chance-text-mono font-semibold tabular-nums">{match.bet_amount}</span> tk
            </span>
            <span className="chance-play-stat-pill">
              <Clock className="size-3.5 stroke-[1.75]" aria-hidden />
              {match.status === "waiting" && !match.player2_id
                ? "Until opponent joins"
                : bothReady
                  ? "Launch imminent"
                  : "Ready up"}
            </span>
          </div>
        </div>
      </section>
      ) : null}

      {showLobbyChrome ? (
        <>
          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
            <PlayerColumn
              label="Player 1"
              player={match.player1}
              isYou={isPlayer1}
              ready={p1Ready}
              side="left"
            />
            <div className="chance-match-vs flex flex-col items-center justify-center py-2 lg:py-0">
              <span className="chance-match-vs-text">VS</span>
              {match.player2_id ? (
                <p className="chance-text-caption mt-2 text-center">Both players locked in</p>
              ) : (
                <p className="chance-text-caption mt-2 text-center">Awaiting challenger</p>
              )}
            </div>
            <PlayerColumn
              label="Player 2"
              player={match.player2_id ? match.player2 : null}
              isYou={isPlayer2}
              ready={p2Ready}
              side="right"
            />
          </div>

          <div className="chance-premium-card mt-4 grid gap-4 p-4 sm:grid-cols-3 sm:p-5">
            <div>
              <h2 className="chance-section-title text-sm">Mode</h2>
              <p className="mt-1 text-sm font-medium">{mode} · {displayGame}</p>
            </div>
            <div>
              <h2 className="chance-section-title text-sm">Rules</h2>
              <p className="chance-text-caption mt-1">{gameRulesBlurb(gameName)}</p>
            </div>
            <div>
              <h2 className="chance-section-title text-sm">Reward</h2>
              <p className="mt-1 text-sm">
                Winner earns{" "}
                <span className="chance-text-mono font-semibold text-[var(--chance-brand)]">{pot.toLocaleString()}</span>{" "}
                tokens
              </p>
            </div>
          </div>

          {friendPending && isPlayer2 ? (
            <div className="chance-match-callout chance-premium-card mt-4 p-5 text-center">
              <p className="text-lg font-semibold tracking-tight">
                {lobbyDisplayName(match.player1)} challenged you
              </p>
              <p className="chance-text-caption mt-1">
                {displayGame} · {match.bet_amount} tokens
              </p>
              <div className="chance-hero-cta-row mt-5 justify-center">
                <button
                  type="button"
                  className="chance-hero-cta-primary chance-focus-ring"
                  disabled={acceptingMatch}
                  onClick={onAcceptFriend}
                >
                  {acceptingMatch ? "Accepting…" : "Accept match"}
                </button>
                <button type="button" className="chance-secondary-btn chance-focus-ring px-5 py-2.5" onClick={onDeclineFriend}>
                  Decline
                </button>
              </div>
            </div>
          ) : null}

          {friendPending && isPlayer1 ? (
            <div className="chance-match-callout chance-premium-card mt-4 p-5 text-center">
              <div className="chance-match-wait-pulse mx-auto mb-3 size-10 rounded-full border-2 border-[var(--chance-brand)] border-t-transparent" />
              <p className="font-semibold">Waiting for {lobbyDisplayName(match.player2)} to accept</p>
              <p className="chance-text-caption mt-1">They&apos;ll join the lobby once they confirm.</p>
            </div>
          ) : null}

          {showReady ? (
            <div className="chance-match-ready-panel chance-premium-card mt-4 p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="chance-section-title">Ready check</h2>
                  <p className="chance-text-caption mt-1">
                    {bothReady
                      ? "Both players locked — match launches in moments."
                      : youReady
                        ? "You’re ready. Waiting for opponent…"
                        : opponentReady
                          ? "Opponent is ready. Confirm to start."
                          : "Confirm when you’re set — both must ready up."}
                  </p>
                  <div className="mt-3 flex gap-4 text-sm">
                    <span className="inline-flex items-center gap-2">
                      <ReadyRing ready={p1Ready} /> P1 {p1Ready ? "Ready" : "Not ready"}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <ReadyRing ready={p2Ready} /> P2 {p2Ready ? "Ready" : "Not ready"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className={`chance-match-ready-btn chance-focus-ring ${youReady ? "chance-match-ready-btn--locked" : ""}`}
                  disabled={markingReady || youReady}
                  onClick={onMarkReady}
                >
                  {markingReady ? "Confirming…" : youReady ? "Ready" : "I'm ready"}
                </button>
              </div>
              {bothReady ? (
                <div className="chance-match-start-banner mt-4" role="status">
                  <span className="chance-match-start-count" aria-hidden>
                    3
                  </span>
                  <p className="text-sm font-medium">Match starting — stay on this screen</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {match.status === "waiting" && !isInMatch && !match.player2_id ? (
            <div className="chance-match-callout chance-premium-card mt-4 p-5 text-center">
              <Users className="mx-auto size-8 stroke-[1.75] text-[var(--chance-brand)]" aria-hidden />
              <p className="mt-3 text-lg font-semibold">Join this lobby?</p>
              <p className="chance-text-caption mt-1">
                Stake {match.bet_amount} tokens vs {lobbyDisplayName(match.player1)}
              </p>
              <button type="button" className="chance-hero-cta-primary chance-focus-ring mt-5" onClick={onJoinMatch}>
                Join match
              </button>
            </div>
          ) : null}

          {match.status === "waiting" && isInMatch && !match.player2_id ? (
            <div className="chance-match-callout chance-premium-card mt-4 p-5 text-center">
              <div className="chance-match-wait-pulse mx-auto mb-3 size-10 rounded-full border-2 border-[var(--chance-brand)] border-t-transparent" />
              <p className="font-semibold">Waiting for an opponent</p>
              <p className="chance-text-caption mt-1">Share this link — they’ll land in this lobby.</p>
              <p className="chance-text-mono chance-text-caption mt-3 break-all rounded-md border border-[var(--chance-border)] bg-[var(--chance-surface-inset)] px-3 py-2">
                {typeof window !== "undefined" ? window.location.href : `/games/match/${match.id}`}
              </p>
              <LobbyShare
                matchId={match.id}
                gameName={displayGame}
                fromName={user.username || lobbyDisplayName(user)}
                userId={user.id}
              />
            </div>
          ) : null}
        </>
      ) : null}

      {match.status !== "waiting" ? (
        <div className={`${isActiveMatch ? "mt-0" : "mt-6"} grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]`}>
          <div className={isActiveMatch ? "chance-gameplay-frame min-h-0" : "chance-match-lobby-game chance-premium-card min-h-[12rem] p-2 sm:p-4"}>
            <EnhancedMatchInterface match={match} currentUser={user as any} onMatchComplete={onMatchComplete} />
          </div>

          {(isInMatch && match.player2_id) || isSpectator ? (
          <aside className="flex flex-col gap-4">
            {isSpectator ? (
              <SpectatorMode
                matchId={match.id}
                currentUser={user as any}
                isPlayer={false}
                tournamentId={tournamentId}
              />
            ) : null}
            <div className="chance-premium-card flex flex-col p-4 sm:p-[1.125rem]">
              <h2 className="chance-section-title inline-flex items-center gap-2">
                <MessageSquare className="size-4 stroke-[1.75] text-[var(--chance-brand)]" aria-hidden />
                {isActiveMatch ? "Match chat" : "Lobby chat"}
              </h2>
              <div className={`mt-3 ${isActiveMatch ? "min-h-[200px]" : "min-h-[280px]"}`}>
                <ChatWindow
                  messageType="match"
                  currentUser={user as any}
                  matchId={match.id}
                  title=""
                  maxHeight={isActiveMatch ? "280px" : "360px"}
                />
              </div>
            </div>
          </aside>
          ) : null}
        </div>
      ) : (
        (isInMatch && match.player2_id) || isSpectator ? (
          <aside className="mt-6 flex max-w-md flex-col gap-4">
            {isSpectator ? (
              <SpectatorMode
                matchId={match.id}
                currentUser={user as any}
                isPlayer={false}
                tournamentId={tournamentId}
              />
            ) : null}
            <div className="chance-premium-card flex flex-col p-4 sm:p-[1.125rem]">
              <h2 className="chance-section-title inline-flex items-center gap-2">
                <MessageSquare className="size-4 stroke-[1.75] text-[var(--chance-brand)]" aria-hidden />
                Lobby chat
              </h2>
              <div className="mt-3 min-h-[240px]">
                <ChatWindow
                  messageType="match"
                  currentUser={user as any}
                  matchId={match.id}
                  title=""
                  maxHeight="320px"
                />
              </div>
            </div>
          </aside>
        ) : null
      )}
    </div>
  )
}
