"use client"

import { useEffect, useState } from "react"
import { Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { inviteFriendToLiveCall } from "@/lib/call-actions"
import type { CallGameId } from "@/lib/call-constants"
import { useToast } from "@/hooks/use-toast"

type Friend = {
  id: string
  name: string
}

export default function CallFriendInvite({
  roomCode,
  game,
  currentUserId,
  fromName,
}: {
  roomCode: string
  game: CallGameId
  currentUserId: string
  fromName: string
}) {
  const [friends, setFriends] = useState<Friend[]>([])
  const [sendingId, setSendingId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("friends")
        .select(`
          user_id,
          friend_id,
          user:users!friends_user_id_fkey(id, display_name, username),
          friend:users!friends_friend_id_fkey(id, display_name, username)
        `)
        .eq("status", "accepted")
        .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`)

      const mapped =
        data?.map((row: any) => {
          const other = row.user_id === currentUserId ? row.friend : row.user
          return {
            id: other?.id as string,
            name: (other?.display_name || other?.username || "Friend") as string,
          }
        }).filter((friend: Friend) => friend.id) || []
      setFriends(mapped)
    }
    void load()
  }, [currentUserId])

  const invite = async (friend: Friend) => {
    setSendingId(friend.id)
    const supabase = createClient()
    const result = await inviteFriendToLiveCall(friend.id, roomCode, game)
    if (result.error) {
      toast({ title: "Invite failed", description: result.error, variant: "destructive" })
      setSendingId(null)
      return
    }

    const inviteChannel = supabase.channel(`call-invite:${friend.id}`)
    await inviteChannel.subscribe()
    await inviteChannel.send({
      type: "broadcast",
      event: "invite",
      payload: { roomCode, game, fromId: currentUserId, fromName },
    })
    await supabase.removeChannel(inviteChannel)

    toast({ title: "Invite sent", description: `${friend.name} got a Live Call invite.` })
    setSendingId(null)
  }

  if (friends.length === 0) {
    return <p className="chance-text-caption text-sm">Add friends to invite them into this call.</p>
  }

  return (
    <div className="max-h-56 space-y-2 overflow-y-auto">
      {friends.map((friend) => (
        <div key={friend.id} className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{friend.name}</span>
          <Button
            size="sm"
            className="chance-hero-cta-primary chance-focus-ring shrink-0 px-3 text-xs"
            disabled={sendingId === friend.id}
            onClick={() => invite(friend)}
          >
            <Video className="mr-1 size-3" aria-hidden />
            Invite
          </Button>
        </div>
      ))}
    </div>
  )
}
