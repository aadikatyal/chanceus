"use client"

import Link from "next/link"
import { Gamepad2 } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import ChancePlayerAvatar from "@/components/dashboard/chance-player-avatar"
import { EmptyState, SkeletonRows } from "@/components/dashboard/chance-craft"
import { getGameDisplayName } from "@/lib/games/game-visuals"
import type { FriendPlaying } from "@/components/play/play-types"

export default function VenuesRailFriendsPlaying() {
  const [friends, setFriends] = useState<FriendPlaying[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser()
        if (!currentUser) {
          setFriends([])
          return
        }

        const { data: friendships } = await supabase
          .from("friends")
          .select("user_id, friend_id")
          .eq("status", "accepted")
          .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`)

        const friendIds = (friendships ?? [])
          .map((f) => (f.user_id === currentUser.id ? f.friend_id : f.user_id))
          .filter(Boolean) as string[]

        if (friendIds.length === 0) {
          setFriends([])
          return
        }

        const { data: friendMatches } = await supabase
          .from("matches")
          .select(
            `
            id,
            player1_id,
            player2_id,
            games (name),
            player1:users!matches_player1_id_fkey (id, username, display_name),
            player2:users!matches_player2_id_fkey (id, username, display_name)
          `
          )
          .eq("status", "in_progress")
          .or(`player1_id.in.(${friendIds.join(",")}),player2_id.in.(${friendIds.join(",")})`)
          .limit(8)

        const playing: FriendPlaying[] = (friendMatches ?? []).flatMap((m) => {
          const rows: FriendPlaying[] = []
          const gameName = (m.games as { name?: string } | null)?.name ?? "Game"
          const p1 = m.player1 as { id: string; username: string; display_name?: string } | null
          const p2 = m.player2 as { id: string; username: string; display_name?: string } | null
          if (p1 && friendIds.includes(p1.id)) {
            rows.push({
              userId: p1.id,
              displayName: p1.display_name || p1.username,
              username: p1.username,
              gameName,
              matchId: m.id,
            })
          }
          if (p2 && friendIds.includes(p2.id)) {
            rows.push({
              userId: p2.id,
              displayName: p2.display_name || p2.username,
              username: p2.username,
              gameName,
              matchId: m.id,
            })
          }
          return rows
        })

        setFriends(playing)
      } catch {
        setFriends([])
      } finally {
        setLoading(false)
      }
    }

    load()
    const channel = supabase
      .channel("venues-rail-friends-playing")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => load())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <section className="chance-premium-card p-4 sm:p-[1.125rem]">
      <div className="chance-rail-card-head">
        <h2 className="chance-section-title text-sm">Friends playing</h2>
        <Gamepad2 className="size-4 text-[var(--chance-muted-fg)]" aria-hidden />
      </div>

      {loading ? (
        <SkeletonRows rows={3} className="h-10" />
      ) : friends.length === 0 ? (
        <EmptyState className="py-5">
          <p className="chance-text-caption">No friends in a match right now.</p>
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {friends.map((f) => (
            <li key={`${f.matchId}-${f.userId}`}>
              <Link
                href={`/games/match/${f.matchId}`}
                className="chance-play-queue-row chance-focus-ring group"
              >
                <ChancePlayerAvatar name={f.displayName} className="size-9 text-xs" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{f.displayName}</p>
                  <p className="chance-text-caption truncate">{getGameDisplayName(f.gameName)}</p>
                </div>
                <span className="chance-text-caption shrink-0 font-semibold text-[var(--chance-brand)] group-hover:underline">
                  Watch
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
