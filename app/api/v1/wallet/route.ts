import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { readBalances } from "@/lib/wallet/server"

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: { code: "unauthenticated" } }, { status: 401 })

  try {
    const balances = await readBalances(user.id)
    return NextResponse.json({
      data: {
        ...balances,
        spendable: balances.available + balances.bonus,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: { code: "ledger_unavailable", message: error instanceof Error ? error.message : "ledger unavailable" } },
      { status: 503 },
    )
  }
}
