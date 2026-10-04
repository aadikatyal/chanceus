"use client"

import { useEffect } from "react"

const ADSENSE_CLIENT = "ca-pub-7434250143961922"

/** Loads AdSense after hydration. Google rewrites the tag, which breaks server HTML if it is rendered in the layout. */
export default function RewardedAdBootstrap() {
  useEffect(() => {
    if (window.__chanceRewardedAdsReady) return
    window.__chanceRewardedAdsReady = true

    window.adsbygoogle = window.adsbygoogle || []
    window.adBreak = window.adConfig = (options: Record<string, unknown>) => {
      window.adsbygoogle?.push(options)
    }
    window.adConfig({ preloadAdBreaks: "on", sound: "on" })

    if (document.querySelector("script[data-chance-adsense]")) return

    const script = document.createElement("script")
    script.async = true
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`
    script.crossOrigin = "anonymous"
    script.dataset.chanceAdsense = "true"
    if (process.env.NODE_ENV !== "production") script.dataset.adbreakTest = "on"
    document.head.appendChild(script)
  }, [])

  return null
}
