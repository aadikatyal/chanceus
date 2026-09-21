"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"

type SignalPayload = {
  from: string
  sdp?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
}

type PeerInfo = {
  id: string
  name: string
}

export function useWebRtcCall({
  roomCode,
  userId,
  displayName,
}: {
  roomCode: string
  userId: string
  displayName: string
}) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const makingOfferRef = useRef(false)
  const ignoreOfferRef = useRef(false)
  const politeRef = useRef(false)
  const channelRef = useRef<any>(null)

  const [callStatus, setCallStatus] = useState<"requesting" | "waiting" | "connecting" | "live" | "error">("requesting")
  const [error, setError] = useState<string | null>(null)
  const [muted, setMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(false)
  const [peer, setPeer] = useState<PeerInfo | null>(null)

  const attachLocalVideo = useCallback((stream: MediaStream) => {
    const video = localVideoRef.current
    if (video) {
      video.srcObject = stream
      video.muted = true
      void video.play().catch(() => {})
    }
  }, [])

  const attachRemoteStream = useCallback((stream: MediaStream) => {
    const video = remoteVideoRef.current
    if (video) {
      video.srcObject = stream
      void video.play().catch(() => {})
    }
  }, [])

  const sendSignal = useCallback(
    async (event: "offer" | "answer" | "ice", payload: Omit<SignalPayload, "from">) => {
      const channel = channelRef.current
      if (!channel) return
      await channel.send({
        type: "broadcast",
        event,
        payload: { ...payload, from: userId },
      })
    },
    [userId],
  )

  const ensurePeerConnection = useCallback(() => {
    if (pcRef.current) return pcRef.current

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
      ],
    })

    localStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current as MediaStream)
    })

    pc.ontrack = (event) => {
      const [stream] = event.streams
      if (stream) attachRemoteStream(stream)
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        void sendSignal("ice", { candidate: event.candidate.toJSON() })
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setError(null)
        setCallStatus("live")
      }
    }

    pc.onnegotiationneeded = async () => {
      try {
        makingOfferRef.current = true
        await pc.setLocalDescription(await pc.createOffer())
        if (pc.localDescription) {
          await sendSignal("offer", { sdp: pc.localDescription })
        }
      } catch (err) {
        console.error("negotiationneeded failed", err)
      } finally {
        makingOfferRef.current = false
      }
    }

    pcRef.current = pc
    return pc
  }, [attachRemoteStream, sendSignal])

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    const channel = supabase.channel(`live-call:${roomCode}`, {
      config: { broadcast: { self: false } },
    })
    channelRef.current = channel

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        localStreamRef.current = stream
        attachLocalVideo(stream)
        setCallStatus("waiting")

        channel
          .on("broadcast", { event: "offer" }, async ({ payload }: { payload: SignalPayload }) => {
            if (payload.from === userId || !payload.sdp) return
            const pc = ensurePeerConnection()
            const offerCollision = makingOfferRef.current || pc.signalingState !== "stable"
            ignoreOfferRef.current = !politeRef.current && offerCollision
            if (ignoreOfferRef.current) return
            await pc.setRemoteDescription(payload.sdp)
            await pc.setLocalDescription(await pc.createAnswer())
            if (pc.localDescription) await sendSignal("answer", { sdp: pc.localDescription })
          })
          .on("broadcast", { event: "answer" }, async ({ payload }: { payload: SignalPayload }) => {
            if (payload.from === userId || !payload.sdp) return
            const pc = pcRef.current
            if (!pc) return
            await pc.setRemoteDescription(payload.sdp)
          })
          .on("broadcast", { event: "ice" }, async ({ payload }: { payload: SignalPayload }) => {
            if (payload.from === userId || !payload.candidate) return
            try {
              await pcRef.current?.addIceCandidate(payload.candidate)
            } catch (err) {
              if (!ignoreOfferRef.current) console.error("ICE error", err)
            }
          })
          .on("presence", { event: "sync" }, () => {
            const state = channel.presenceState() as Record<string, Array<{ user_id: string; name: string }>>
            const others = Object.values(state)
              .flat()
              .filter((entry) => entry.user_id !== userId)
            const other = others[0]
            if (other) {
              politeRef.current = userId > other.user_id
              setPeer({ id: other.user_id, name: other.name })
              setCallStatus((prev) => (prev === "live" ? prev : "connecting"))
              ensurePeerConnection()
            } else {
              setPeer(null)
              setCallStatus((prev) => (prev === "error" ? prev : "waiting"))
            }
          })

        await channel.subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel.track({ user_id: userId, name: displayName })
          }
        })
      } catch (err) {
        console.error(err)
        setError("Camera or microphone access was blocked. Allow both to start a live call.")
        setCallStatus("error")
      }
    }

    void start()

    return () => {
      cancelled = true
      localStreamRef.current?.getTracks().forEach((track) => track.stop())
      pcRef.current?.close()
      pcRef.current = null
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [attachLocalVideo, displayName, ensurePeerConnection, roomCode, sendSignal, userId])

  const toggleMute = () => {
    const next = !muted
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !next
    })
    setMuted(next)
  }

  const toggleCamera = () => {
    const next = !cameraOff
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = !next
    })
    setCameraOff(next)
  }

  return {
    localVideoRef,
    remoteVideoRef,
    callStatus,
    error,
    muted,
    cameraOff,
    peer,
    toggleMute,
    toggleCamera,
  }
}
