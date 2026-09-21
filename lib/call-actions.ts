"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { sendMessage } from "@/lib/chat-actions"
import { CALL_GAMES, isCallGameId, type CallGameId } from "@/lib/call-constants"

export async function inviteFriendToLiveCall(friendId: string, roomCode: string, game: CallGameId) {
  const cookieStore = await cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore as any })
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "You need to be signed in to invite a friend." }
  }

  if (user.id === friendId) {
    return { error: "You cannot invite yourself." }
  }

  if (!isCallGameId(game) || !/^[A-Z0-9]{6}$/.test(roomCode)) {
    return { error: "Invalid live call invite." }
  }

  const { data: asInviter } = await supabase
    .from("friends")
    .select("id")
    .eq("status", "accepted")
    .eq("user_id", user.id)
    .eq("friend_id", friendId)
    .maybeSingle()

  const { data: asInvitee } = await supabase
    .from("friends")
    .select("id")
    .eq("status", "accepted")
    .eq("user_id", friendId)
    .eq("friend_id", user.id)
    .maybeSingle()

  if (!asInviter && !asInvitee) {
    return { error: "You can only invite accepted friends." }
  }

  const gameName = CALL_GAMES.find((item) => item.id === game)?.name || "a game"
  const result = await sendMessage(
    `Join my Live Call! Let's play ${gameName}. Room code: ${roomCode} — /call/${roomCode}?game=${game}`,
    "dm",
    { recipientId: friendId },
  )

  if (result.error) {
    return { error: result.error }
  }

  return { success: true as const }
}

async function getClient() {
  const cookieStore = await cookies()
  return createServerActionClient({ cookies: () => cookieStore as any })
}

export async function createLiveCallMatch(gameKey: CallGameId, roomCode: string) {
  const supabase = await getClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }
  if (!isCallGameId(gameKey)) return { error: "Unknown game" }

  const gameId = CALL_GAMES.find((g) => g.id === gameKey)?.gameId
  if (!gameId) return { error: "Game not found" }

  const nameAliases: Record<CallGameId, string[]> = {
    "connect-four": ["Four in a Row", "4 In a Row", "4 in a Row", "Connect 4", "Connect Four"],
    "math-blitz": ["Math Blitz"],
    trivia: ["Trivia Challenge", "Trivia"],
  }

  const { data: namedGames } = await supabase.from("games").select("id, name")

  const aliases = nameAliases[gameKey].map((name) => name.toLowerCase())
  const resolvedGame =
    namedGames?.find((row) => aliases.includes(String(row.name).toLowerCase())) ||
    namedGames?.find((row) => row.id === gameId)

  if (!resolvedGame) {
    console.error("createLiveCallMatch missing game", { gameKey, namedGames })
    return { error: "That game is not available in the lobby yet." }
  }

  const { data: match, error } = await supabase
    .from("matches")
    .insert({
      game_id: resolvedGame.id,
      player1_id: user.id,
      bet_amount: 0,
      status: "waiting",
      game_data: { live_call: true, room_code: roomCode, game_key: gameKey },
    })
    .select(
      `
      *,
      games (name, description, min_bet, max_bet),
      player1:users!matches_player1_id_fkey (id, username, display_name, avatar_url),
      player2:users!matches_player2_id_fkey (id, username, display_name, avatar_url)
    `,
    )
    .single()

  if (error || !match) {
    console.error("createLiveCallMatch", error)
    return { error: error?.message || "Could not start the live call match." }
  }

  return { match }
}

export async function joinLiveCallMatch(matchId: string) {
  const supabase = await getClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: existing } = await supabase.from("matches").select("*").eq("id", matchId).single()
  if (!existing) return { error: "Match not found" }
  if (existing.player1_id === user.id) {
    const { data: match } = await supabase
      .from("matches")
      .select(
        `
        *,
        games (name, description, min_bet, max_bet),
        player1:users!matches_player1_id_fkey (id, username, display_name, avatar_url),
        player2:users!matches_player2_id_fkey (id, username, display_name, avatar_url)
      `,
      )
      .eq("id", matchId)
      .single()
    return { match }
  }

  if (existing.player2_id && existing.player2_id !== user.id) {
    return { error: "This call match already has two players." }
  }

  if (!existing.player2_id) {
    const { error: updateError } = await supabase
      .from("matches")
      .update({
        player2_id: user.id,
        status: "in_progress",
        started_at: new Date().toISOString(),
      })
      .eq("id", matchId)

    if (updateError) {
      console.error("joinLiveCallMatch", updateError)
      return { error: "Could not join the live call match." }
    }
  }

  const { data: match } = await supabase
    .from("matches")
    .select(
      `
      *,
      games (name, description, min_bet, max_bet),
      player1:users!matches_player1_id_fkey (id, username, display_name, avatar_url),
      player2:users!matches_player2_id_fkey (id, username, display_name, avatar_url)
    `,
    )
    .eq("id", matchId)
    .single()

  return { match }
}
