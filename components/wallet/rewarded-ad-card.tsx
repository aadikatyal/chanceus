"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { claimRewardedAd } from "@/lib/economy/actions"
import { prepareRewardedAd, showRewardedAd, subscribeRewardedAd, type RewardedAdAvailability } from "@/lib/ads/rewarded-ad"
import { AD_REWARD_GEMS, DAILY_AD_CAP } from "@/lib/economy/spec"
import { useToast } from "@/hooks/use-toast"

export default function RewardedAdCard({
  watches,
  remaining,
}: {
  watches: number
  remaining: number
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [availability, setAvailability] = useState<RewardedAdAvailability>("loading")
  const [phase, setPhase] = useState<"idle" | "playing" | "crediting">("idle")
  const [left, setLeft] = useState(remaining)

  useEffect(() => {
    prepareRewardedAd()
    return subscribeRewardedAd(setAvailability)
  }, [])

  const claim = async () => {
    if (availability !== "ready") {
      prepareRewardedAd()
      return
    }

    setPhase("playing")
    const ad = await showRewardedAd()
    if (ad !== "viewed") {
      setPhase("idle")
      toast({
        title: ad === "dismissed" ? "Ad closed" : "No ad available",
        description:
          ad === "dismissed"
            ? "Watch the video to the end to get the gems."
            : "Google did not return a rewarded video. Gems were not added.",
        variant: "destructive",
      })
      return
    }

    setPhase("crediting")
    const result = await claimRewardedAd()
    setPhase("idle")
    if ("error" in result && result.error) {
      toast({ title: "Ad reward unavailable", description: result.error, variant: "destructive" })
      return
    }
    if ("remaining" in result && typeof result.remaining === "number") setLeft(result.remaining)
    toast({ title: `+${AD_REWARD_GEMS} gems`, description: "Rewarded ad credited." })
    router.refresh()
  }

  const buttonLabel =
    left <= 0
      ? "Daily cap reached"
      : phase === "playing"
        ? "Playing ad..."
        : phase === "crediting"
          ? "Adding gems..."
          : availability === "ready"
            ? `Watch ad for ${AD_REWARD_GEMS} gems`
            : availability === "none"
              ? "No ad available"
              : "Finding an ad..."

  return (
    <section className="chance-premium-card p-4 sm:p-[1.125rem]">
      <h2 className="chance-section-title">Rewarded ads</h2>
      <p className="chance-text-caption mt-1">
        One completed ad pays {AD_REWARD_GEMS} gems. Cap is {DAILY_AD_CAP} ads per UTC day ({AD_REWARD_GEMS * DAILY_AD_CAP} gems).
      </p>
      <p className="mt-3 text-sm font-medium">
        {watches} watched today · {left} left
      </p>
      <button
        type="button"
        className="chance-hero-cta-primary chance-focus-ring mt-4 inline-flex px-4 py-2.5 text-sm disabled:opacity-50"
        disabled={left <= 0 || phase !== "idle" || availability === "loading"}
        onClick={claim}
      >
        {buttonLabel}
      </button>
    </section>
  )
}
