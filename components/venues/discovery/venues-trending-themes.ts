export type VenuesTrendingTheme = {
  id: string
  title: string
  subtitle: string
  tag: string
  accent: string
}

/** Curated themes — marketing rails until venue tagging exists in data */
export const VENUES_TRENDING_THEMES: VenuesTrendingTheme[] = [
  { id: "sports", title: "Sports Trivia", subtitle: "Sunday night energy", tag: "Hot", accent: "var(--chance-brand)" },
  { id: "music", title: "Music Night", subtitle: "Lyrics & decades", tag: "Tonight", accent: "#8b5cf6" },
  { id: "movies", title: "Movie Trivia", subtitle: "Blockbusters & deep cuts", tag: "Popular", accent: "#06b6d4" },
  { id: "swift", title: "Taylor Swift", subtitle: "Swifties assemble", tag: "Fan favorite", accent: "#ec4899" },
  { id: "cfb", title: "College Football", subtitle: "Rivalry week", tag: "Seasonal", accent: "#f59e0b" },
  { id: "marvel", title: "Marvel", subtitle: "MCU deep lore", tag: "Themed", accent: "#ef4444" },
  { id: "90s", title: "90s Throwback", subtitle: "Nostalgia lane", tag: "Classic", accent: "#a855f7" },
  { id: "champ", title: "Weekly Championship", subtitle: "Local crown on the line", tag: "Prize pool", accent: "var(--chance-brand)" },
]
