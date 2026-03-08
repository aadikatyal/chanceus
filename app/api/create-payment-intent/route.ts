import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {}) : null

const PACKS: { amount: 100 | 500 | 1000; priceCents: number; label: string }[] = [
  { amount: 100, priceCents: 999, label: "100 tokens" },
  { amount: 500, priceCents: 4999, label: "500 tokens" },
  { amount: 1000, priceCents: 9999, label: "1,000 tokens" },
]

export async function POST(req: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured. Add STRIPE_SECRET_KEY to .env.local" },
        { status: 503 }
      )
    }
    const { amount } = (await req.json()) as { amount?: number }
    const pack = PACKS.find((p) => p.amount === amount)
    if (!pack || !Number.isInteger(amount)) {
      return NextResponse.json(
        { error: "Invalid amount. Use 100, 500, or 1000." },
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

    const paymentIntent = await stripe.paymentIntents.create({
      amount: pack.priceCents,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: {
        tokenAmount: String(pack.amount),
        userId: user.id,
      },
      receipt_email: user.email ?? undefined,
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (e) {
    console.error("create-payment-intent error:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Payment failed" },
      { status: 500 }
    )
  }
}
