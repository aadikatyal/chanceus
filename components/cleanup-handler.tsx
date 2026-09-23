"use client"

import { useEffect, useRef } from "react"
import { cleanupExpiredMatches } from "@/lib/cleanup-actions"

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

export default function CleanupHandler() {
  const ranRef = useRef(false)

  useEffect(() => {
    const runCleanup = async () => {
      try {
        await cleanupExpiredMatches()
      } catch (error) {
        console.error("Cleanup failed:", error)
      }
    }

    if (!ranRef.current) {
      ranRef.current = true
      void runCleanup()
    }

    const interval = setInterval(runCleanup, CLEANUP_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  return null
}
