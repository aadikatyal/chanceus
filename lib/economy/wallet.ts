import type { SupabaseClient } from "@supabase/supabase-js"
import { AD_REWARD_GEMS, DAILY_AD_CAP, needsUtcDailyReset, utcDayStart } from "@/lib/economy/spec"
import { creditSpendableGems } from "@/lib/economy/ledger"

type Admin = SupabaseClient

export async function readGemBalance(admin: Admin, userId: string): Promise<number> {
  const { data: user, error } = await admin.from("users").select("tokens").eq("id", userId).single()
  if (error || !user) return 0
  const gems = user.tokens ?? 0
  await admin.from("user_wallets").upsert(
    { user_id: userId, gems },
    { onConflict: "user_id", ignoreDuplicates: false },
  )
  return gems
}

export async function getRewardedAdSnapshot(admin: Admin, userId: string) {
  await readGemBalance(admin, userId)
  const { data: wallet } = await admin
    .from("user_wallets")
    .select("ad_watches_today, last_ad_reset_at, gems")
    .eq("user_id", userId)
    .single()

  const reset = needsUtcDailyReset(wallet?.last_ad_reset_at)
  const watches = reset ? 0 : (wallet?.ad_watches_today ?? 0)
  return {
    watches,
    remaining: Math.max(0, DAILY_AD_CAP - watches),
    cap: DAILY_AD_CAP,
    reward: AD_REWARD_GEMS,
    gems: wallet?.gems ?? 0,
  }
}

/**
 * Credit one rewarded ad. Hard ceiling is 10 completions per UTC day.
 * Balance moves only through the transactions trigger.
 */
export async function claimRewardedAdForUser(admin: Admin, userId: string) {
  const { data: wallet, error } = await admin
    .from("user_wallets")
    .select("ad_watches_today, last_ad_reset_at")
    .eq("user_id", userId)
    .single()

  if (error || !wallet) {
    await readGemBalance(admin, userId)
  }

  const { data: fresh } = await admin
    .from("user_wallets")
    .select("ad_watches_today, last_ad_reset_at")
    .eq("user_id", userId)
    .single()

  if (!fresh) return { error: "Wallet not found" }

  const reset = needsUtcDailyReset(fresh.last_ad_reset_at)
  const watches = reset ? 0 : fresh.ad_watches_today
  if (watches >= DAILY_AD_CAP) {
    return { error: "Daily ad cap reached. It resets at 00:00 UTC." }
  }

  const now = new Date().toISOString()
  let update = admin
    .from("user_wallets")
    .update({
      ad_watches_today: watches + 1,
      last_ad_reset_at: reset ? now : fresh.last_ad_reset_at,
    })
    .eq("user_id", userId)

  update = reset
    ? update.eq("last_ad_reset_at", fresh.last_ad_reset_at)
    : update.eq("ad_watches_today", fresh.ad_watches_today)

  const { data: claimed, error: updateError } = await update.select("ad_watches_today")
  if (updateError || !claimed?.length) {
    return { error: "Could not reserve this ad reward. Try again." }
  }

  const day = utcDayStart().toISOString().slice(0, 10)
  const credited = await creditSpendableGems(admin, {
    userId,
    amount: AD_REWARD_GEMS,
    idempotencyKey: `ad:${userId}:${day}:${watches + 1}`,
    referenceType: "ad_reward",
  })

  if ("error" in credited && credited.error) {
    await admin
      .from("user_wallets")
      .update({
        ad_watches_today: watches,
        last_ad_reset_at: fresh.last_ad_reset_at,
      })
      .eq("user_id", userId)
    console.error("ad reward ledger", credited.error)
    return { error: "Could not credit the ad reward." }
  }

  return {
    success: true as const,
    gemsAwarded: AD_REWARD_GEMS,
    adWatchesToday: watches + 1,
    remaining: DAILY_AD_CAP - (watches + 1),
  }
}

export async function resetExpiredAdCounters(admin: Admin) {
  const now = new Date()
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
  const { data, error } = await admin
    .from("user_wallets")
    .update({ ad_watches_today: 0, last_ad_reset_at: now.toISOString() })
    .lt("last_ad_reset_at", dayStart)
    .select("user_id")

  if (error) return { error: error.message, reset: 0 }
  return { reset: data?.length ?? 0 }
}
