import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {}) : null

const STRIPE_DESC_PREFIX = "Token purchase (Stripe session: "

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
    const tokenAmount = parseInt(session.metadata?.tokenAmount ?? "0", 10)
    if (![100, 500, 1000].includes(tokenAmount)) {
      return NextResponse.json(
        { error: "Invalid token amount in session" },
        { status: 400 }
      )
    }

    // Idempotency: already fulfilled if we have a transaction for this session
    const { data: existing } = await supabase
      .from("transactions")
      .select("id")
      .eq("user_id", user.id)
      .like("description", `${STRIPE_DESC_PREFIX}${session_id}%`)
      .limit(1)
      .maybeSingle()
    if (existing) {
      return NextResponse.json({ success: true, alreadyFulfilled: true })
    }

    const { data: userRow } = await supabase
      .from("users")
      .select("tokens")
      .eq("id", user.id)
      .single()
    const currentTokens = userRow?.tokens ?? 0

    const { error: updateError } = await supabase
      .from("users")
      .update({ tokens: currentTokens + tokenAmount })
      .eq("id", user.id)
    if (updateError) {
      console.error("fulfill-checkout update tokens:", updateError)
      return NextResponse.json(
        { error: "Failed to update balance" },
        { status: 500 }
      )
    }

    const { error: txError } = await supabase.from("transactions").insert({
      user_id: user.id,
      amount: tokenAmount,
      type: "bonus",
      description: `${STRIPE_DESC_PREFIX}${session_id}) - ${tokenAmount} tokens`,
    })
    if (txError) {
      console.error("fulfill-checkout insert transaction:", txError)
      return NextResponse.json(
        { error: "Failed to record transaction" },
        { status: 500 }
      )
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
