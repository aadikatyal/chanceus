import type { SupabaseClient } from "@supabase/supabase-js"
import { randomUUID } from "crypto"

type Admin = SupabaseClient

const PLATFORM_USER_ID = "00000000-0000-0000-0000-000000000001"

export async function spendableGems(admin: Admin, userId: string): Promise<number | null> {
  const { data, error } = await admin.rpc("wallet_balances", { p_user: userId })
  if (error || !Array.isArray(data)) return null
  return data
    .filter((row: { account?: string }) => row.account === "bonus" || row.account === "available")
    .reduce((sum: number, row: { balance?: number }) => sum + Number(row.balance ?? 0), 0)
}

/**
 * Posts a balanced pair. users.tokens is frozen, so gem credits go to the ledger.
 */
export async function creditSpendableGems(
  admin: Admin,
  input: { userId: string; amount: number; idempotencyKey: string; referenceType: string },
) {
  if (input.amount === 0) return { success: true as const }
  const referenceId = randomUUID()
  const { data, error } = await admin.rpc("ledger_apply", {
    p_key: input.idempotencyKey,
    p_hash: input.idempotencyKey,
    p_reference_type: input.referenceType,
    p_reference_id: referenceId,
    p_lines: [
      { userId: input.userId, account: "bonus", amount: input.amount, type: "reward" },
      { userId: PLATFORM_USER_ID, account: "available", amount: -input.amount, type: "reward" },
    ],
  })

  if (error) return { error: error.message }
  return { success: true as const, operation: data }
}
