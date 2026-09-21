import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Header from "@/components/navigation/header"
import CallRoom from "@/components/call/call-room"
import { isCallGameId, normalizeRoomCode } from "@/lib/call-constants"

export default async function CallRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ roomCode: string }>
  searchParams: Promise<{ game?: string; host?: string }>
}) {
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <h1 className="text-2xl font-bold text-white">Connect Supabase to get started</h1>
      </div>
    )
  }

  const { roomCode: rawCode } = await params
  const query = await searchParams
  const roomCode = normalizeRoomCode(rawCode)
  if (roomCode.length !== 6) redirect("/call")

  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser) redirect("/auth/login")

  const { data: user } = await supabase.from("users").select("*").eq("id", authUser.id).single()
  if (!user) redirect("/auth/login")

  const game = isCallGameId(query.game || "") ? query.game! : "connect-four"
  const isHost = query.host === "1"

  return (
    <div className="min-h-screen bg-gray-950 relative">
      <Header user={user} />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/20 via-purple-950/10 to-transparent pointer-events-none" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        <CallRoom
          roomCode={roomCode}
          currentUser={user}
          initialGame={game}
          isHost={isHost}
        />
      </main>
    </div>
  )
}
