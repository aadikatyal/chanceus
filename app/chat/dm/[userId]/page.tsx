import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Header from "@/components/navigation/header"
import ChatWindow from "@/components/chat/chat-window"

interface DMPageProps {
  params: Promise<{ userId: string }>
}

export default async function DMPage({ params }: DMPageProps) {
  const resolvedParams = await params

  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <h1 className="text-2xl font-bold mb-4 text-white">Connect Supabase to get started</h1>
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

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single()

  if (!user) {
    redirect("/auth/login")
  }

  // Get recipient info
  const { data: recipient } = await supabase
    .from("users")
    .select("id, username, display_name, avatar_url")
    .eq("id", resolvedParams.userId)
    .single()

  if (!recipient) {
    notFound()
  }

  const displayName = recipient.display_name || recipient.username

  return (
    <div className="min-h-screen bg-gray-950 relative">
      <Header user={user} />
      
      

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Direct Message</h1>
          <p className="text-gray-400">Chatting with {displayName}</p>
        </div>

        <ChatWindow
          messageType="dm"
          currentUser={user}
          recipientId={resolvedParams.userId}
          title={`Chat with ${displayName}`}
          maxHeight="600px"
        />
      </main>
    </div>
  )
}

