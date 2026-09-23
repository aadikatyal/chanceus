import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import CompetitiveShell from "@/components/app/competitive-shell"
import ChatWindow from "@/components/chat/chat-window"
import DmInbox from "@/components/dms/dm-inbox"
import ChancePlayerAvatar from "@/components/dashboard/chance-player-avatar"
import { ChanceText } from "@/components/design-system/typography"
import { loadDmThreads } from "@/lib/dm-threads"
import { ArrowLeft } from "lucide-react"

interface DMPageProps {
  params: Promise<{ userId: string }>
}

export default async function DMPage({ params }: DMPageProps) {
  const resolvedParams = await params

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

  const { data: recipient } = await supabase
    .from("users")
    .select("id, username, display_name, avatar_url")
    .eq("id", resolvedParams.userId)
    .single()

  if (!recipient) notFound()

  const threads = await loadDmThreads(user.id)
  const displayName = recipient.display_name || recipient.username
  const handle = recipient.username ? `@${recipient.username}` : ""

  return (
    <CompetitiveShell user={user}>
      <DmInbox threads={threads} activeId={recipient.id} userId={user.id}>
        <header className="flex items-center gap-3 border-b border-[var(--chance-border)] px-4 py-3">
          <Link href="/dms" className="chance-focus-ring rounded-full p-1 md:hidden" aria-label="Back to messages">
            <ArrowLeft className="size-5" />
          </Link>
          <ChancePlayerAvatar name={displayName} className="size-9 text-xs" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            {handle ? <p className="chance-text-caption truncate text-xs">{handle}</p> : null}
          </div>
        </header>
        <div className="min-h-0 flex-1">
          <ChatWindow
            messageType="dm"
            currentUser={user}
            recipientId={recipient.id}
            maxHeight="100%"
            appearance="chance"
          />
        </div>
      </DmInbox>
    </CompetitiveShell>
  )
}
