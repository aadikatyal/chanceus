import type { MetadataRoute } from "next"
import { GAME_GUIDES } from "@/lib/public-content"

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://chanceus.com"
  const now = new Date()
  const paths = ["", "/guides", "/standings", "/privacy", "/terms", ...GAME_GUIDES.map((guide) => `/guides/${guide.slug}`)]

  return paths.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "/standings" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }))
}
