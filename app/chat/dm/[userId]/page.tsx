import Link from "next/link"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import CompetitiveShell from "@/components/app/competitive-shell"
import ChatWindow from "@/components/chat/chat-window"
import { ChanceText } from "@/components/design-system/typography"
import { ArrowLeft } from "lucide-react"

interface DMPageProps {
  params: Promise<{ userId: string }>
}

export default async function DMPage({ params }: DMPageProps) {
  const resolvedParams = await params

  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--chance-bg)] px-4">
        <ChanceText as="h1" variant="h2">
          Connect Supabase to get started
        </ChanceText>
      </div>
    )
  }

  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect("/auth/login")
  }

  const { data: user } = await supabase.from("users").select("*").eq("id", authUser.id).single()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: recipient } = await supabase
    .from("users")
    .select("id, username, display_name, avatar_url")
    .eq("id", resolvedParams.userId)
    .single()

  if (!recipient) {
    notFound()
  }

  const displayName = recipient.display_name || recipient.username
  const handle = recipient.username ? `@${recipient.username}` : displayName

  return (
    <CompetitiveShell user={user}>
      <div className="chance-home-feed flex min-h-0 flex-1 flex-col">
        <section className="chance-premium-card chance-social-chat-panel flex min-h-[32rem] flex-1 flex-col">
          <div className="chance-rail-card-head shrink-0 border-b border-[var(--chance-border)] px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <Link href="/chat" className="chance-link-subtle mb-1 inline-flex items-center gap-1 text-xs">
                <ArrowLeft className="size-3.5" aria-hidden />
                Social
              </Link>
              <h1 className="chance-section-title truncate text-base">{displayName}</h1>
              <p className="chance-text-caption truncate">{handle}</p>
            </div>
          </div>
          <div className="chance-social-chat-body min-h-0 flex-1">
            <ChatWindow
              messageType="dm"
              currentUser={user}
              recipientId={resolvedParams.userId}
              maxHeight="100%"
              appearance="chance"
            />
          </div>
        </section>
      </div>
    </CompetitiveShell>
  )
}
