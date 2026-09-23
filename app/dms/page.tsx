import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import CompetitiveShell from "@/components/app/competitive-shell"
import DmInbox from "@/components/dms/dm-inbox"
import { ChanceText } from "@/components/design-system/typography"
import { loadDmThreads } from "@/lib/dm-threads"

export default async function DmsPage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--chance-bg)] px-4">
        <ChanceText as="h1" variant="h2">Connect Supabase to get started</ChanceText>
      </div>
    )
  }

  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser) redirect("/auth/login")

  const { data: user } = await supabase.from("users").select("*").eq("id", authUser.id).single()
  if (!user) redirect("/auth/login")

  const threads = await loadDmThreads(user.id)

  return (
    <CompetitiveShell user={user}>
      <DmInbox threads={threads} userId={user.id} />
    </CompetitiveShell>
  )
}
