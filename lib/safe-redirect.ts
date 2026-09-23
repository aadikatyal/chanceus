/** Only same-site paths. Auth URLs are rejected so login cannot redirect to itself. */
export function safeAppPath(value: string | null | undefined, fallback = "/dashboard") {
  if (!value) return fallback
  if (!value.startsWith("/") || value.startsWith("//")) return fallback
  if (value.startsWith("/auth")) return fallback
  return value
}
