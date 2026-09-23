"use client"

import { useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Video } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { createFriendMatch } from "@/lib/game-actions"
import { inviteFriendToLiveCall } from "@/lib/call-actions"
import { generateRoomCode, type CallGameId } from "@/lib/call-constants"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export type PlayFriendTarget = {
  id: string
  display_name: string
}

const TOKEN_GAMES = [
  { id: "d0c5fda9-ec91-46b4-be62-cba48b398168", label: "Math Blitz", bet: 100 },
  { id: "69bf26d2-110b-40d9-b20a-d5cfab14d133", label: "Four in a Row", bet: 100 },
  { id: "e03ee060-b913-4795-9149-54660e2e2eac", label: "Trivia Challenge", bet: 100 },
] as const

const LIVE_CALL_GAMES: { id: CallGameId; label: string }[] = [
  { id: "connect-four", label: "Four in a Row on video" },
  { id: "math-blitz", label: "Math Blitz on video" },
  { id: "trivia", label: "Trivia on video" },
]

type PlayFriendMenuProps = {
  friend: PlayFriendTarget
  children: ReactNode
}

export default function PlayFriendMenu({ friend, children }: PlayFriendMenuProps) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleTokenMatch = async (gameId: string, betAmount: number) => {
    setBusy(true)
    try {
      const result = await createFriendMatch(gameId, friend.id, betAmount)
      if (result.error) {
        toast({ title: "Could not start match", description: result.error, variant: "destructive" })
        return
      }
      if (!result.matchId) return

      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()
      const { data: profile } = currentUser
        ? await supabase.from("users").select("display_name, username").eq("id", currentUser.id).single()
        : { data: null }
      const fromName = profile?.username || profile?.display_name || "A friend"
      const { data: gameRow } = await supabase.from("games").select("name").eq("id", gameId).maybeSingle()
      const gameName = gameRow?.name || "a game"

      const inviteChannel = supabase.channel(`call-invite:${friend.id}`)
      await inviteChannel.subscribe()
      await inviteChannel.send({
        type: "broadcast",
        event: "match-invite",
        payload: { matchId: result.matchId, gameName, fromName },
      })
      await supabase.removeChannel(inviteChannel)

      toast({
        title: "Match request sent",
        description: result.message || "Waiting for your friend to join the lobby.",
      })
      setOpen(false)
      router.push(`/games/match/${result.matchId}`)
    } catch {
      toast({ title: "Error", description: "Failed to create match with friend.", variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  const handleLiveCall = async (game: CallGameId) => {
    setBusy(true)
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()
      if (!currentUser) {
        toast({ title: "Sign in required", variant: "destructive" })
        return
      }
      const { data: profile } = await supabase
        .from("users")
        .select("display_name, username")
        .eq("id", currentUser.id)
        .single()
      const fromName = profile?.username || profile?.display_name || "A friend"
      const roomCode = generateRoomCode()

      const result = await inviteFriendToLiveCall(friend.id, roomCode, game)
      if (result.error) {
        toast({ title: "Could not invite friend", description: result.error, variant: "destructive" })
        return
      }

      const inviteChannel = supabase.channel(`call-invite:${friend.id}`)
      await inviteChannel.subscribe()
      await inviteChannel.send({
        type: "broadcast",
        event: "invite",
        payload: { roomCode, game, fromId: currentUser.id, fromName },
      })
      await supabase.removeChannel(inviteChannel)

      toast({ title: "Live Call invite sent", description: `${friend.display_name} can join your video match.` })
      setOpen(false)
      router.push(`/call/${roomCode}?game=${game}&host=1`)
    } catch {
      toast({ title: "Invite failed", description: "Could not start a Live Call with this friend.", variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="border-[var(--chance-border)] bg-[var(--chance-surface)] text-[var(--chance-fg)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[var(--chance-fg)]">Play with {friend.display_name}</DialogTitle>
          <DialogDescription className="text-[var(--chance-muted-fg)]">
            Start a token match or invite them to Live Call.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 space-y-3">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--chance-brand)]">Token match</p>
          <div className="space-y-2">
            {TOKEN_GAMES.map((game) => (
              <button
                key={game.id}
                type="button"
                disabled={busy}
                onClick={() => handleTokenMatch(game.id, game.bet)}
                className="chance-hero-cta-primary chance-focus-ring flex w-full items-center justify-center gap-2 px-3 py-2.5 text-sm disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                {game.label} ({game.bet} tokens)
              </button>
            ))}
          </div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--chance-muted-fg)]">Live Call</p>
          <div className="space-y-2">
            {LIVE_CALL_GAMES.map((game) => (
              <button
                key={game.id}
                type="button"
                disabled={busy}
                onClick={() => handleLiveCall(game.id)}
                className="chance-hero-cta-ghost chance-focus-ring flex w-full items-center justify-center gap-2 px-3 py-2.5 text-sm disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Video className="size-4" aria-hidden />}
                {game.label}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
