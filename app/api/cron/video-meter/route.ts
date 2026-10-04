import { NextRequest, NextResponse } from "next/server"
import { tickVideoRoomMeters } from "@/lib/economy/video-meter"

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
    const result = await tickVideoRoomMeters()
    return NextResponse.json(result)
  } catch (error) {
    console.error("video-meter cron", error)
    return NextResponse.json({ error: "Video meter tick failed" }, { status: 500 })
  }
}
