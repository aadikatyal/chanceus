import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { walletGrant } from "@/lib/wallet/server"

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {}) : null

export async function POST(req: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured. Add STRIPE_SECRET_KEY to .env.local" },
        { status: 503 }
      )
    }
    const { session_id } = (await req.json()) as { session_id?: string }
    if (!session_id || typeof session_id !== "string") {
      return NextResponse.json(
        { error: "Missing session_id" },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: [],
    })
    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment not completed" },
        { status: 400 }
      )
    }
    if (session.metadata?.userId !== user.id) {
      return NextResponse.json({ error: "This payment belongs to another account" }, { status: 403 })
    }
    const tokenAmount = parseInt(session.metadata?.tokenAmount ?? "0", 10)
    if (![100, 500, 1000].includes(tokenAmount)) {
      return NextResponse.json(
        { error: "Invalid token amount in session" },
        { status: 400 }
      )
    }

    // Idempotency: already fulfilled if we have a transaction for this session
    try {
      await walletGrant({
        userId: user.id,
        amount: tokenAmount,
        account: "available",
        type: "purchase",
        referenceType: "purchase",
        referenceId: user.id,
        idempotencyKey: `purchase:${session_id}`,
      })
    } catch (grantError) {
      console.error("fulfill-checkout grant:", grantError)
      return NextResponse.json({ error: "Failed to update balance" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("fulfill-checkout error:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Fulfillment failed" },
      { status: 500 }
    )
  }
}
