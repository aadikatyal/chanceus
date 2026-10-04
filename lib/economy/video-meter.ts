import { createAdminClient } from "@/lib/supabase/admin"
import { VIDEO_METER_DEBIT_GEMS, VIDEO_METER_INTERVAL_SECONDS } from "@/lib/economy/spec"
import { readGemBalance } from "@/lib/economy/wallet"

const INTERVAL_MS = VIDEO_METER_INTERVAL_SECONDS * 1000

async function debitIfDue(userId: string, roomId: string) {
  const admin = createAdminClient()
  const { data: meter } = await admin
    .from("video_room_meters")
    .select("id, last_debit_at, status")
    .eq("user_id", userId)
    .eq("room_id", roomId)
    .eq("status", "active")
    .maybeSingle()

  if (!meter) return { skipped: true as const }

  const elapsed = Date.now() - new Date(meter.last_debit_at).getTime()
  if (elapsed < INTERVAL_MS) {
    return { skipped: true as const, nextInMs: INTERVAL_MS - elapsed }
  }

  const balance = await readGemBalance(admin, userId)
  if (balance < VIDEO_METER_DEBIT_GEMS) {
    await admin
      .from("video_room_meters")
      .update({ status: "insufficient_funds", stopped_at: new Date().toISOString() })
      .eq("id", meter.id)
      .eq("status", "active")
    return { stopped: "insufficient_funds" as const }
  }

  const cutoff = new Date(Date.now() - INTERVAL_MS).toISOString()
  const { data: claimed } = await admin
    .from("video_room_meters")
    .update({ last_debit_at: new Date().toISOString() })
    .eq("id", meter.id)
    .eq("status", "active")
    .lte("last_debit_at", cutoff)
    .select("id")

  if (!claimed?.length) return { skipped: true as const }

  const { error } = await admin.from("transactions").insert({
    user_id: userId,
    amount: -VIDEO_METER_DEBIT_GEMS,
    type: "video_meter",
    description: `Live room ${roomId} — ${VIDEO_METER_DEBIT_GEMS} gems / ${VIDEO_METER_INTERVAL_SECONDS / 60} min`,
  })

  if (error) {
    await admin.from("video_room_meters").update({ last_debit_at: meter.last_debit_at }).eq("id", meter.id)
    return { error: error.message }
  }

  return { debited: VIDEO_METER_DEBIT_GEMS }
}

export async function startVideoRoomMeter(roomId: string, userId: string) {
  const admin = createAdminClient()
  await readGemBalance(admin, userId)
  const { data: existing } = await admin
    .from("video_room_meters")
    .select("status")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle()
  if (existing?.status === "active") return { success: true as const }

  const now = new Date().toISOString()
  const { error } = await admin.from("video_room_meters").upsert(
    {
      room_id: roomId,
      user_id: userId,
      status: "active",
      last_debit_at: now,
      started_at: now,
      stopped_at: null,
    },
    { onConflict: "room_id,user_id" },
  )
  if (error) return { error: error.message }
  return { success: true as const }
}

export async function stopVideoRoomMeter(roomId: string, userId: string) {
  const admin = createAdminClient()
  await admin
    .from("video_room_meters")
    .update({ status: "stopped", stopped_at: new Date().toISOString() })
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .eq("status", "active")
  return { success: true as const }
}

export async function pulseVideoRoomMeter(roomId: string, userId: string) {
  return debitIfDue(userId, roomId)
}

export async function tickVideoRoomMeters() {
  const admin = createAdminClient()
  const { data: meters, error } = await admin
    .from("video_room_meters")
    .select("user_id, room_id")
    .eq("status", "active")

  if (error) return { error: error.message, debited: 0, stopped: 0, scanned: 0 }

  let debited = 0
  let stopped = 0
  for (const meter of meters ?? []) {
    const result = await debitIfDue(meter.user_id, meter.room_id)
    if ("debited" in result && result.debited) debited += 1
    if ("stopped" in result) stopped += 1
  }

  return { scanned: meters?.length ?? 0, debited, stopped }
}
