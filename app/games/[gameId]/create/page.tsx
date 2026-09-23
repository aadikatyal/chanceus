import { isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ChanceText } from "@/components/design-system/typography"

interface CreateMatchPageProps {
  params: Promise<{ gameId: string }>
  searchParams: Promise<{ tier?: string }>
}

/** Canonical match entry is the Queue route; preserve legacy /create URLs via redirect. */
export default async function CreateMatchPage({ params, searchParams }: CreateMatchPageProps) {
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--chance-bg)] px-4">
        <div className="max-w-md text-center">
          <ChanceText as="h1" variant="h2" className="mb-3">
            Connect Supabase to get started
          </ChanceText>
          <ChanceText variant="muted">Configure your database connection to continue</ChanceText>
        </div>
      </div>
    )
  }

  const { gameId } = await params
  const sp = await searchParams
  const tier = sp.tier?.trim()
  const query = tier ? `?tier=${encodeURIComponent(tier)}` : ""
  redirect(`/games/${gameId}${query}`)
}
