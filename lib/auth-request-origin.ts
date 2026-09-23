import { headers } from "next/headers"
import { config } from "@/lib/config"

/** Canonical site origin for OAuth redirects (avoids stale NEXT_PUBLIC_SITE_URL on Vercel). */
export async function getRequestOrigin(): Promise<string> {
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host")
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https")
    return `${proto}://${host}`
  }
  return config.siteUrl.replace(/\/$/, "")
}

export function buildAuthCallbackUrl(origin: string, postLoginPath?: string | null) {
  const base = `${origin.replace(/\/$/, "")}/auth/callback`
  if (!postLoginPath) return base
  const safe = postLoginPath.startsWith("/") && !postLoginPath.startsWith("//") && !postLoginPath.startsWith("/auth")
  if (!safe) return base
  return `${base}?redirect=${encodeURIComponent(postLoginPath)}`
}
