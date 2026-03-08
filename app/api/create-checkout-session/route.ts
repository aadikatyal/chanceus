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

    const origin = req.nextUrl.origin
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: user.email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: pack.priceCents,
            product_data: {
              name: pack.label,
              description: `${pack.amount} tokens for ChanceUS`,
            },
          },
        },
      ],
      metadata: {
        tokenAmount: String(pack.amount),
        userId: user.id,
      },
      success_url: `${origin}/wallet?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/wallet`,
    })

    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error("create-checkout-session error:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Checkout failed" },
      { status: 500 }
    )
  }
}
