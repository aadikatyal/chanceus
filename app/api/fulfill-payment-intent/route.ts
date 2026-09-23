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
    if (pi.metadata?.userId !== user.id) {
      return NextResponse.json({ error: "This payment belongs to another account" }, { status: 403 })
    }
    const tokenAmount = parseInt(pi.metadata?.tokenAmount ?? "0", 10)
    if (![100, 500, 1000].includes(tokenAmount)) {
      return NextResponse.json(
        { error: "Invalid token amount" },
        { status: 400 }
      )
    }

    try {
      await walletGrant({
        userId: user.id,
        amount: tokenAmount,
        account: "available",
        type: "purchase",
        referenceType: "purchase",
        referenceId: user.id,
        idempotencyKey: `purchase:${payment_intent_id}`,
      })
    } catch (grantError) {
      console.error("fulfill-payment-intent grant:", grantError)
      return NextResponse.json({ error: "Failed to update balance" }, { status: 500 })
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
