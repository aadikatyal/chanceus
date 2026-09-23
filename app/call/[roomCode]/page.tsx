import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import CompetitiveShell from "@/components/app/competitive-shell"
import CompetitivePageFeed from "@/components/app/competitive-page-feed"
import CallRoom from "@/components/call/call-room"
import { isCallGameId, normalizeRoomCode } from "@/lib/call-constants"
import { ChanceText } from "@/components/design-system/typography"

export default async function CallRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ roomCode: string }>
  searchParams: Promise<{ game?: string; host?: string }>
}) {
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--chance-bg)] px-4">
        <ChanceText as="h1" variant="h2">
          Connect Supabase to get started
        </ChanceText>
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
    <CompetitiveShell user={user}>
      <CompetitivePageFeed className="chance-home-feed chance-call-room-feed">
        <CallRoom roomCode={roomCode} currentUser={user} initialGame={game} isHost={isHost} />
      </CompetitivePageFeed>
    </CompetitiveShell>
  )
}
