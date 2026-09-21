"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { CallGameId } from "@/lib/call-constants"

export function useCallGameChannel<T>({
  roomCode,
  userId,
  event,
  initialState,
}: {
  roomCode: string
  userId: string
  event: string
  initialState: T
}) {
  const [state, setState] = useState<T>(initialState)
  const channelRef = useRef<any>(null)

  useEffect(() => {
    const supabase = createClient()
    const channel: any = supabase.channel(`live-call-game:${roomCode}:${event}`, {
      config: { broadcast: { self: false } },
    })
    channelRef.current = channel

    channel.on("broadcast", { event }, ({ payload }: { payload: T }) => {
      setState(payload)
    })

    void channel.subscribe()

    return () => {
      void supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [event, roomCode])

  const publish = useCallback(
    async (next: T) => {
      setState(next)
      await channelRef.current?.send({
        type: "broadcast",
        event,
        payload: next,
      })
    },
    [event],
  )

  return { state, setState, publish, userId }
}

export function useSharedGameSelection(roomCode: string, initialGame: CallGameId) {
  return useCallGameChannel<CallGameId>({
    roomCode,
    userId: "shared",
    event: "game-select",
    initialState: initialGame,
  })
}
