export type RewardedAdResult = "viewed" | "dismissed" | "unavailable"
export type RewardedAdAvailability = "loading" | "ready" | "none"

type AdBreakPlacement = {
  breakStatus?: string
}

type Placement = {
  showAd: (() => void) | null
  resolve: ((result: RewardedAdResult) => void) | null
  started: boolean
}

declare global {
  interface Window {
    adsbygoogle?: object[]
    adBreak?: (options: Record<string, unknown>) => void
    adConfig?: (options: Record<string, unknown>) => void
    __chanceRewardedAdsReady?: boolean
    __chanceAdBreakStub?: (options: Record<string, unknown>) => void
  }
}

const listeners = new Set<(availability: RewardedAdAvailability) => void>()
let placement: Placement | null = null
let requesting = false
let waitingForLibrary = false
let retries = 0
let availability: RewardedAdAvailability = "loading"

function adLibraryReady() {
  return typeof window.adBreak === "function" && window.adBreak !== window.__chanceAdBreakStub
}

function notify(next: RewardedAdAvailability) {
  availability = next
  listeners.forEach((listener) => listener(next))
}

function breakStatus(placementInfo: AdBreakPlacement | string | undefined) {
  return typeof placementInfo === "string" ? placementInfo : placementInfo?.breakStatus
}

function finish(result: RewardedAdResult) {
  const resolve = placement?.resolve ?? null
  placement = null
  requesting = false
  resolve?.(result)
  window.setTimeout(requestPlacement, 0)
}

function retryPlacement() {
  placement = null
  requesting = false
  if (retries >= 6) {
    notify("none")
    return
  }
  retries += 1
  notify("loading")
  window.setTimeout(requestPlacement, 1500)
}

function requestPlacement() {
  if (requesting || placement?.showAd || placement?.resolve) return
  if (!adLibraryReady()) return

  requesting = true
  notify("loading")
  const attempt: Placement = { showAd: null, resolve: null, started: false }
  placement = attempt

  window.setTimeout(() => {
    if (placement === attempt && !attempt.showAd && !attempt.started) retryPlacement()
  }, 8000)

  window.adBreak?.({
    type: "reward",
    name: "ten-gems",
    beforeReward: (showAd: () => void) => {
      if (placement !== attempt || attempt.started) return
      attempt.showAd = () => showAd()
      requesting = false
      retries = 0
      notify("ready")
    },
    adViewed: () => finish("viewed"),
    adDismissed: () => finish("dismissed"),
    adBreakDone: (info: AdBreakPlacement | string) => {
      const status = breakStatus(info)
      if (attempt.started) {
        if (status === "dismissed") finish("dismissed")
        else if (status === "viewed") finish("viewed")
        else finish("unavailable")
        return
      }
      if (attempt.showAd) return
      if (placement !== attempt) return
      if (status === "other" || status === "noAdPreloaded" || status === "notReady" || status === "timeout") {
        retryPlacement()
        return
      }
      placement = null
      requesting = false
      notify("none")
    },
  })
}

export function subscribeRewardedAd(listener: (availability: RewardedAdAvailability) => void) {
  listeners.add(listener)
  listener(availability)
  return () => listeners.delete(listener)
}

/** Ask Google for a rewarded video. The click handler plays it later. */
export function prepareRewardedAd() {
  if (typeof window === "undefined") return
  if (adLibraryReady()) {
    requestPlacement()
    return
  }
  if (waitingForLibrary) return

  waitingForLibrary = true
  const started = Date.now()
  const wait = window.setInterval(() => {
    if (adLibraryReady()) {
      window.clearInterval(wait)
      waitingForLibrary = false
      requestPlacement()
    } else if (Date.now() - started > 8000) {
      window.clearInterval(wait)
      waitingForLibrary = false
      notify("none")
    }
  }, 200)
}

/**
 * Plays the video Google already offered.
 * showAd() has to run in the click, or the browser drops the video and nothing appears.
 */
export function showRewardedAd(): Promise<RewardedAdResult> {
  return new Promise((resolve) => {
    const showAd = placement?.showAd
    if (!showAd || !placement) {
      resolve("unavailable")
      requestPlacement()
      return
    }

    placement.resolve = resolve
    placement.started = true
    placement.showAd = null
    notify("loading")
    showAd()
  })
}
