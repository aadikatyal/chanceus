export type RewardedAdResult = "viewed" | "dismissed" | "unavailable"

type AdBreakPlacement = {
  breakStatus?: string
}

declare global {
  interface Window {
    adsbygoogle?: object[]
    adBreak?: (options: Record<string, unknown>) => void
    adConfig?: (options: Record<string, unknown>) => void
    __chanceRewardedAdsReady?: boolean
  }
}

/**
 * Plays a Google rewarded break. The gem grant runs only after adViewed.
 * Local dev uses Google's test creative (data-adbreak-test on the AdSense script).
 */
export function showRewardedAd(): Promise<RewardedAdResult> {
  return new Promise((resolve) => {
    if (typeof window.adBreak !== "function") {
      resolve("unavailable")
      return
    }

    let settled = false
    const finish = (result: RewardedAdResult) => {
      if (settled) return
      settled = true
      resolve(result)
    }

    window.adBreak({
      type: "reward",
      name: "ten-gems",
      beforeReward: (showAd: () => void) => {
        showAd()
      },
      adViewed: () => finish("viewed"),
      adDismissed: () => finish("dismissed"),
      adBreakDone: (placement: AdBreakPlacement) => {
        if (placement?.breakStatus === "viewed") finish("viewed")
        else if (placement?.breakStatus === "dismissed") finish("dismissed")
        else finish("unavailable")
      },
    })
  })
}
