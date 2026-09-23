"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { QrCode, Camera, CameraOff, Search } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface QRCodeScannerProps {
  onCodeScanned: (code: string) => void
  onManualCode: (code: string) => void
  onSessionCode?: (code: string) => void
}

export default function QRCodeScanner({ onCodeScanned, onManualCode, onSessionCode }: QRCodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [manualCode, setManualCode] = useState("")
  const [sessionCode, setSessionCode] = useState("")
  const [hasCamera, setHasCamera] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanningRef = useRef(false)

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then(() => setHasCamera(true))
      .catch(() => setHasCamera(false))
  }, [])

  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
        },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        scanningRef.current = true
        setIsScanning(true)
        scanForQRCode()
      }
    } catch (error) {
      console.error("Error accessing camera:", error)
      toast.error("Camera access denied or not available")
    }
  }

  const stopScanning = () => {
    scanningRef.current = false
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsScanning(false)
  }

  const scanForQRCode = () => {
    if (!scanningRef.current || !videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context || video.readyState < video.HAVE_ENOUGH_DATA) {
      requestAnimationFrame(scanForQRCode)
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    context.getImageData(0, 0, canvas.width, canvas.height)
    requestAnimationFrame(scanForQRCode)
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualCode.trim()) {
      onManualCode(manualCode.trim().toUpperCase())
    }
  }

  const handleSessionCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (sessionCode.trim() && onSessionCode) {
      onSessionCode(sessionCode.trim().toUpperCase())
    }
  }

  return (
    <div className="chance-venues-qr space-y-6">
      <div className="flex items-center gap-2">
        <QrCode className="size-5 stroke-[1.75] text-[var(--chance-brand)]" aria-hidden />
        <h2 className="chance-section-title text-base">Scan or enter a code</h2>
      </div>

      {hasCamera ? (
        <div className="space-y-3">
          <div
            className={cn(
              "relative h-48 w-full overflow-hidden rounded-xl border border-[var(--chance-border)] bg-[var(--chance-surface)]",
              isScanning && "ring-2 ring-[color-mix(in_srgb,var(--chance-brand)_40%,transparent)]"
            )}
          >
            <video
              ref={videoRef}
              className={cn("absolute inset-0 h-full w-full object-cover", !isScanning && "opacity-0")}
              autoPlay
              playsInline
              muted
            />
            {!isScanning ? (
              <div className="relative z-[1] flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--chance-brand)_12%,transparent)]">
                  <Camera className="size-7 stroke-[1.5] text-[var(--chance-brand)]" aria-hidden />
                </div>
                <p className="text-sm font-medium text-[var(--chance-fg)]">Camera ready</p>
                <p className="chance-text-caption max-w-xs">Point at the QR at the door, then tap start below.</p>
              </div>
            ) : null}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {isScanning ? (
            <button
              type="button"
              onClick={stopScanning}
              className="chance-focus-ring flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--chance-border)] bg-[var(--chance-surface)] px-4 py-2.5 text-sm font-medium text-[var(--chance-fg)] transition-colors hover:bg-[var(--chance-surface-hover,var(--chance-surface))]"
            >
              <CameraOff className="size-4 shrink-0 stroke-[1.75]" aria-hidden />
              Stop scanning
            </button>
          ) : (
            <button
              type="button"
              onClick={startScanning}
              className="chance-hero-cta-primary chance-focus-ring flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm"
            >
              <Camera className="size-4 shrink-0 stroke-[1.75]" aria-hidden />
              Start scanning
            </button>
          )}
        </div>
      ) : (
        <p className="chance-text-caption rounded-lg border border-[var(--chance-border)] bg-[var(--chance-surface)] px-4 py-3 text-sm">
          No camera detected — enter a venue or session code below.
        </p>
      )}

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-[var(--chance-border)]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wide">
          <span className="chance-text-caption bg-[var(--chance-surface-elevated,var(--chance-bg))] px-2">Or</span>
        </div>
      </div>

      <div className="space-y-4">
        <form onSubmit={handleManualSubmit} className="space-y-2">
          <Label htmlFor="venue-code">Venue code</Label>
          <div className="flex w-full gap-2">
            <Input
              id="venue-code"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="e.g. 0K945T"
              maxLength={20}
              className="chance-input min-w-0 flex-1 font-mono text-center text-lg tracking-wider"
            />
            <Button
              type="submit"
              disabled={!manualCode.trim()}
              className="chance-hero-cta-primary chance-focus-ring shrink-0 px-3"
              aria-label="Find venue"
            >
              <Search className="size-4" aria-hidden />
            </Button>
          </div>
        </form>

        {onSessionCode ? (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[var(--chance-border)]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wide">
                <span className="chance-text-caption bg-[var(--chance-surface-elevated,var(--chance-bg))] px-2">Or</span>
              </div>
            </div>

            <form onSubmit={handleSessionCodeSubmit} className="space-y-2">
              <Label htmlFor="session-code">Session code</Label>
              <div className="flex w-full gap-2">
                <Input
                  id="session-code"
                  value={sessionCode}
                  onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SES1234567890ABC"
                  maxLength={30}
                  className="chance-input min-w-0 flex-1 font-mono text-center text-sm"
                />
                <Button
                  type="submit"
                  disabled={!sessionCode.trim()}
                  className="chance-hero-cta-primary chance-focus-ring shrink-0 px-3"
                  aria-label="Join session"
                >
                  <Search className="size-4" aria-hidden />
                </Button>
              </div>
            </form>
          </>
        ) : null}
      </div>

      <ul className="chance-text-caption list-inside list-disc space-y-1 text-sm">
        <li>Scan the QR at the venue or enter the code from the host.</li>
        <li>Pick tonight&apos;s session and your name on the live board.</li>
      </ul>
    </div>
  )
}
