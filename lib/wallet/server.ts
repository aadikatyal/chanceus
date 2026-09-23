import { createHash } from "node:crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { holdLines } from "@/services/wallet/policy.ts"
import { emptyBalances, type Balances, type LedgerLine } from "@/services/ledger/types.ts"

const PLATFORM = "00000000-0000-0000-0000-000000000001"

function hashBody(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex")
}

export async function readBalances(userId: string): Promise<Balances> {
  const admin = createAdminClient()
  const { data, error } = await admin.from("wallet_entries").select("account, amount").eq("user_id", userId)
  if (error) throw new Error(error.message)
  const balances = emptyBalances()
  for (const row of data ?? []) {
    const account = row.account as keyof Balances
    balances[account] += Number(row.amount)
  }
  return balances
}

export async function spendable(userId: string): Promise<number> {
  const balances = await readBalances(userId)
  return balances.available + balances.bonus
}

async function apply(key: string, body: unknown, referenceType: string, referenceId: string, lines: LedgerLine[]) {
  const admin = createAdminClient()
  const { error } = await admin.rpc("ledger_apply", {
    p_key: key,
    p_hash: hashBody(body),
    p_reference_type: referenceType,
    p_reference_id: referenceId,
    p_lines: lines.map((line) => ({
      userId: line.userId,
      account: line.account,
      amount: line.amount,
      type: line.type,
    })),
  })
  if (error) {
    if (/idempotency_conflict/.test(error.message)) {
      const conflict = new Error("idempotency_conflict")
      throw conflict
    }
    if (/insufficient_tokens/.test(error.message)) throw new Error("insufficient_tokens")
    throw new Error(error.message)
  }
}

export async function walletGrant(input: {
  userId: string
  amount: number
  account: "available" | "bonus"
  type: "grant" | "reward" | "purchase" | "adjustment"
  referenceType: string
  referenceId: string
  idempotencyKey: string
}) {
  await apply(input.idempotencyKey, input, input.referenceType, input.referenceId, [
    { userId: PLATFORM, account: "available", amount: -input.amount, type: input.type },
    { userId: input.userId, account: input.account, amount: input.amount, type: input.type },
  ])
}

export async function walletHold(userId: string, amount: number, referenceId: string, idempotencyKey: string) {
  if (amount <= 0) return
  const balances = await readBalances(userId)
  const body = { userId, amount, referenceId, idempotencyKey }
  await apply(idempotencyKey, body, "match", referenceId, holdLines(balances, userId, amount))
}

export async function walletRelease(userId: string, referenceId: string, idempotencyKey: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("wallet_entries")
    .select("account, amount, type")
    .eq("user_id", userId)
    .eq("reference_id", referenceId)
    .eq("type", "stake_hold")
  if (error) throw new Error(error.message)
  const fromBonus = -(data ?? []).filter((row) => row.account === "bonus" && row.amount < 0).reduce((sum, row) => sum + Number(row.amount), 0)
  const fromAvailable = -(data ?? []).filter((row) => row.account === "available" && row.amount < 0).reduce((sum, row) => sum + Number(row.amount), 0)
  const total = fromBonus + fromAvailable
  if (total === 0) return
  const lines: LedgerLine[] = [{ userId, account: "escrow", amount: -total, type: "refund" }]
  if (fromBonus > 0) lines.push({ userId, account: "bonus", amount: fromBonus, type: "refund" })
  if (fromAvailable > 0) lines.push({ userId, account: "available", amount: fromAvailable, type: "refund" })
  await apply(idempotencyKey, { userId, referenceId, idempotencyKey }, "match", referenceId, lines)
}

export async function walletCapture(userId: string, referenceId: string, idempotencyKey: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("wallet_entries")
    .select("account, amount, type")
    .eq("user_id", userId)
    .eq("reference_id", referenceId)
    .eq("type", "stake_hold")
  if (error) throw new Error(error.message)
  const total = -(data ?? []).filter((row) => row.amount < 0).reduce((sum, row) => sum + Number(row.amount), 0)
  if (total === 0) return
  await apply(idempotencyKey, { userId, referenceId, idempotencyKey }, "tournament", referenceId, [
    { userId, account: "escrow", amount: -total, type: "payout" },
    { userId: PLATFORM, account: "available", amount: total, type: "payout" },
  ])
}

export async function walletSettle(winnerId: string, loserId: string, stake: number, referenceId: string) {
  if (stake <= 0) return
  await apply(`settle:${referenceId}`, { winnerId, loserId, stake, referenceId }, "match", referenceId, [
    { userId: winnerId, account: "escrow", amount: -stake, type: "payout" },
    { userId: loserId, account: "escrow", amount: -stake, type: "payout" },
    { userId: winnerId, account: "available", amount: stake * 2, type: "payout" },
  ])
}
