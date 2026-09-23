"use client"

import { useEffect, useState } from "react"

export function useCountUp(target: number, durationMs = 1400, enabled = true) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!enabled || target <= 0) {
      setValue(target)
      return
    }
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(target * eased))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, durationMs, enabled])

  return value
}
