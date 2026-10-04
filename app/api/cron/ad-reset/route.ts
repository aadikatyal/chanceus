import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { resetExpiredAdCounters } from "@/lib/economy/wallet"

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return process.env.NODE_ENV !== "production"
  return req.headers.get("authorization") === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const result = await resetExpiredAdCounters(createAdminClient())
    return NextResponse.json(result)
  } catch (error) {
    console.error("ad-reset cron", error)
    return NextResponse.json({ error: "Ad reset failed" }, { status: 500 })
  }
}
