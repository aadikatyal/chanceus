import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {}) : null

const PI_DESC_PREFIX = "Token purchase (Stripe PaymentIntent: "

export async function POST(req: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured. Add STRIPE_SECRET_KEY to .env.local" },
        { status: 503 }
      )
    }
    const { payment_intent_id } = (await req.json()) as { payment_intent_id?: string }
    if (!payment_intent_id || typeof payment_intent_id !== "string") {
      return NextResponse.json(
        { error: "Missing payment_intent_id" },
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

    const pi = await stripe.paymentIntents.retrieve(payment_intent_id)
    if (pi.status !== "succeeded") {
      return NextResponse.json(
        { error: "Payment not completed" },
        { status: 400 }
      )
    }
    const tokenAmount = parseInt(pi.metadata?.tokenAmount ?? "0", 10)
    if (![100, 500, 1000].includes(tokenAmount)) {
      return NextResponse.json(
        { error: "Invalid token amount" },
        { status: 400 }
      )
    }

    const { data: existing } = await supabase
      .from("transactions")
      .select("id")
      .eq("user_id", user.id)
      .like("description", `${PI_DESC_PREFIX}${payment_intent_id}%`)
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
      console.error("fulfill-payment-intent update tokens:", updateError)
      return NextResponse.json(
        { error: "Failed to update balance" },
        { status: 500 }
      )
    }

    const { error: txError } = await supabase.from("transactions").insert({
      user_id: user.id,
      amount: tokenAmount,
      type: "bonus",
      description: `${PI_DESC_PREFIX}${payment_intent_id}) - ${tokenAmount} tokens`,
    })
    if (txError) {
      console.error("fulfill-payment-intent insert transaction:", txError)
      return NextResponse.json(
        { error: "Failed to record transaction" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("fulfill-payment-intent error:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Fulfillment failed" },
      { status: 500 }
    )
  }
}
