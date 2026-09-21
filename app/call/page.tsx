import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Header from "@/components/navigation/header"
import CallLobby from "@/components/call/call-lobby"

export default async function CallLobbyPage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <h1 className="text-2xl font-bold text-white">Connect Supabase to get started</h1>
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

  return (
    <div className="min-h-screen bg-gray-950 relative">
      <Header user={user} />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/20 via-purple-950/10 to-transparent pointer-events-none" />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Live Call</h1>
          <p className="text-gray-400">
            Face your opponent on camera and play Four in a Row, Math Blitz, or Trivia in the same room.
          </p>
        </div>
        <CallLobby userId={user.id} displayName={user.display_name || user.username} />
      </main>
    </div>
  )
}
