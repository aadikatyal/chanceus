import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://chanceus.com"

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/auth/",
        "/dashboard",
        "/wallet",
        "/settings",
        "/profile",
        "/games",
        "/matches",
        "/tournaments",
        "/bars",
        "/bar",
        "/leaderboards",
        "/rankings",
        "/watch",
        "/replays",
        "/analytics",
        "/friends",
        "/chat",
        "/dms",
        "/call",
        "/session",
        "/debug",
        "/debug-matches",
        "/debug-games",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  }
}
