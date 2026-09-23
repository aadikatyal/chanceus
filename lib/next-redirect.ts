/** Re-throw Next.js `redirect()` from server action catch blocks. */
export function isNextRedirect(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false
  const digest = "digest" in error ? String((error as { digest: string }).digest) : ""
  return digest.startsWith("NEXT_REDIRECT")
}
