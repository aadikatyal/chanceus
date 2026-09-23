"use client"

import Link from "next/link"
import { Gamepad2, Phone } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { EmptyState, SkeletonRows } from "@/components/dashboard/chance-craft"
import ChancePlayerAvatar from "@/components/dashboard/chance-player-avatar"

type FriendRow = {
  id: string
  display_name: string
  username: string
  is_online: boolean
}

export default function FriendsRail() {
  const [friends, setFriends] = useState<FriendRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser()
        if (!currentUser) {
          setFriends([])
          return
        }

        const { data, error } = await supabase
          .from("friends")
          .select(
            `
            user_id,
            friend_id,
            user:users!friends_user_id_fkey(id, display_name, username, is_online),
            friend:users!friends_friend_id_fkey(id, display_name, username, is_online)
          `
          )
          .eq("status", "accepted")
          .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`)

        if (error) {
          setFriends([])
          return
        }

        const mapped = (data ?? []).map((row: Record<string, unknown>) => {
          const userId = row.user_id as string
          const user = row.user as FriendRow | null
          const friend = row.friend as FriendRow | null
          const other = userId === currentUser.id ? friend : user
          return {
            id: other?.id ?? "",
            display_name: other?.display_name || other?.username || "Player",
            username: other?.username ?? "",
            is_online: Boolean(other?.is_online),
          }
        })
        mapped.sort((a, b) => Number(b.is_online) - Number(a.is_online))
        setFriends(mapped.slice(0, 6))
      } finally {
        setLoading(false)
      }
    }

    fetchFriends()
    const interval = setInterval(fetchFriends, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="chance-premium-card p-4 sm:p-[1.125rem]">
      <div className="chance-rail-card-head">
        <h2 className="chance-section-title text-base">Friends</h2>
        <Link href="/friends/add" className="chance-link-arrow chance-focus-ring rounded-sm">
          Add →
        </Link>
      </div>
      {loading ? (
        <SkeletonRows rows={3} className="h-12" />
      ) : friends.length === 0 ? (
        <EmptyState className="py-6">
          <p className="chance-text-caption">
            No friends yet.{" "}
            <Link href="/friends/add" className="font-medium text-[var(--chance-brand)] hover:underline">
              Invite someone
            </Link>
          </p>
        </EmptyState>
      ) : (
        <ul className="space-y-0.5">
          {friends.map((friend) => (
            <li key={friend.id}>
              <div className="chance-rail-row flex items-center gap-2.5 rounded-[var(--chance-radius-md)] px-2 py-2">
                <div className="relative shrink-0">
                  <ChancePlayerAvatar
                    name={friend.display_name}
                    className="size-9 text-xs ring-2 ring-[var(--chance-surface)]"
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-[var(--chance-surface)] ${friend.is_online ? "bg-[var(--chance-yes)] shadow-[0_0_6px_var(--chance-yes)]" : "bg-[var(--chance-border-strong)]"}`}
                    title={friend.is_online ? "Online" : "Offline"}
                    aria-hidden
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.8125rem] font-medium tracking-[-0.01em]">{friend.display_name}</p>
                  <p className="chance-text-caption truncate">@{friend.username}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Link
                    href="/games"
                    className="chance-icon-action chance-focus-ring size-8"
                    aria-label={`Challenge ${friend.display_name}`}
                  >
                    <Gamepad2 className="size-3.5 stroke-[1.75]" />
                  </Link>
                  <Link
                    href="/call"
                    className="chance-icon-action chance-focus-ring size-8"
                    aria-label={`Call ${friend.display_name}`}
                  >
                    <Phone className="size-3.5 stroke-[1.75]" />
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
