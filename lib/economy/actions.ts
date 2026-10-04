"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { claimRewardedAdForUser, getRewardedAdSnapshot, resetExpiredAdCounters } from "@/lib/economy/wallet"
import { pulseVideoRoomMeter, startVideoRoomMeter, stopVideoRoomMeter, tickVideoRoomMeters } from "@/lib/economy/video-meter"

async function requireUserId() {
  const cookieStore = await cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function getRewardedAdStatus() {
  const userId = await requireUserId()
  if (!userId) return null
  try {
    return await getRewardedAdSnapshot(createAdminClient(), userId)
  } catch {
    return null
  }
}

export async function claimRewardedAd() {
  const userId = await requireUserId()
  if (!userId) return { error: "You need to be signed in." }
  try {
    const result = await claimRewardedAdForUser(createAdminClient(), userId)
    if ("success" in result && result.success) revalidatePath("/wallet")
    return result
  } catch (error) {
    console.error("claimRewardedAd", error)
    return { error: "Rewarded ads are not available until the economy migration is applied." }
  }
}

export async function beginVideoRoomMeter(roomId: string) {
  const userId = await requireUserId()
  if (!userId) return { error: "You need to be signed in." }
  if (!roomId) return { error: "Missing room." }
  try {
    return await startVideoRoomMeter(roomId, userId)
  } catch (error) {
    console.error("beginVideoRoomMeter", error)
    return { error: "Live room meter is unavailable." }
  }
}

export async function endVideoRoomMeter(roomId: string) {
  const userId = await requireUserId()
  if (!userId) return { error: "You need to be signed in." }
  try {
    return await stopVideoRoomMeter(roomId, userId)
  } catch {
    return { success: true as const }
  }
}

export async function pulseOwnVideoRoomMeter(roomId: string) {
  const userId = await requireUserId()
  if (!userId) return { error: "You need to be signed in." }
  try {
    return await pulseVideoRoomMeter(roomId, userId)
  } catch (error) {
    console.error("pulseOwnVideoRoomMeter", error)
    return { error: "Could not meter this room." }
  }
}

export async function runVideoMeterCron() {
  return tickVideoRoomMeters()
}

export async function runAdResetCron() {
  return resetExpiredAdCounters(createAdminClient())
}
