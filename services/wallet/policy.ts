import { createHash } from "node:crypto"
import { postOperation, deriveBalances, type LedgerStore } from "../ledger/engine.ts"
import type { AppliedOperation, Balances, EntryType, LedgerLine } from "../ledger/types.ts"
import { emptyBalances } from "../ledger/types.ts"
import { PLATFORM_USER } from "./platform.ts"

export { PLATFORM_USER }

function hashBody(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex")
}

function apply(
  store: LedgerStore,
  key: string,
  body: unknown,
  referenceType: string,
  referenceId: string,
  lines: LedgerLine[],
): AppliedOperation {
  return postOperation(store, {
    idempotencyKey: key,
    bodyHash: hashBody(body),
    referenceType,
    referenceId,
    lines,
  })
}

export function holdLines(balances: Balances, userId: string, amount: number): LedgerLine[] {
  const fromBonus = Math.min(balances.bonus, amount)
  const fromAvailable = amount - fromBonus
  const lines: LedgerLine[] = []
  if (fromBonus > 0) {
    lines.push({ userId, account: "bonus", amount: -fromBonus, type: "stake_hold" })
    lines.push({ userId, account: "escrow", amount: fromBonus, type: "stake_hold" })
  }
  if (fromAvailable > 0) {
    lines.push({ userId, account: "available", amount: -fromAvailable, type: "stake_hold" })
    lines.push({ userId, account: "escrow", amount: fromAvailable, type: "stake_hold" })
  }
  return lines
}

export function grant(store: LedgerStore, input: {
  userId: string
  amount: number
  account: "available" | "bonus"
  type: Extract<EntryType, "grant" | "reward" | "purchase" | "adjustment">
  referenceType: string
  referenceId: string
  idempotencyKey: string
}): AppliedOperation {
  const body = input
  return apply(store, input.idempotencyKey, body, input.referenceType, input.referenceId, [
    { userId: PLATFORM_USER, account: "available", amount: -input.amount, type: input.type },
    { userId: input.userId, account: input.account, amount: input.amount, type: input.type },
  ])
}

export function hold(store: LedgerStore, input: {
  userId: string
  amount: number
  referenceType: string
  referenceId: string
  idempotencyKey: string
}): AppliedOperation {
  const prior = deriveBalances(store.entriesFor([input.userId]), input.userId)
  return apply(store, input.idempotencyKey, input, input.referenceType, input.referenceId, holdLines(prior, input.userId, input.amount))
}

export function release(store: LedgerStore, input: {
  userId: string
  referenceType: string
  referenceId: string
  idempotencyKey: string
}): AppliedOperation {
  const held = store.entriesFor([input.userId]).filter(
    (entry) => entry.referenceId === input.referenceId && entry.type === "stake_hold" && entry.amount < 0,
  )
  const fromBonus = -held.filter((entry) => entry.account === "bonus").reduce((sum, entry) => sum + entry.amount, 0)
  const fromAvailable = -held.filter((entry) => entry.account === "available").reduce((sum, entry) => sum + entry.amount, 0)
  const lines: LedgerLine[] = []
  const total = fromBonus + fromAvailable
  if (total > 0) {
    lines.push({ userId: input.userId, account: "escrow", amount: -total, type: "refund" })
  }
  if (fromBonus > 0) lines.push({ userId: input.userId, account: "bonus", amount: fromBonus, type: "refund" })
  if (fromAvailable > 0) lines.push({ userId: input.userId, account: "available", amount: fromAvailable, type: "refund" })
  return apply(store, input.idempotencyKey, input, input.referenceType, input.referenceId, lines)
}

export function settle(store: LedgerStore, input: {
  winnerId: string
  loserId: string
  stake: number
  rake: number
  referenceId: string
  idempotencyKey: string
}): AppliedOperation {
  const pot = input.stake * 2
  const payout = pot - input.rake
  const lines: LedgerLine[] = [
    { userId: input.winnerId, account: "escrow", amount: -input.stake, type: "payout" },
    { userId: input.loserId, account: "escrow", amount: -input.stake, type: "payout" },
    { userId: input.winnerId, account: "available", amount: payout, type: "payout" },
  ]
  if (input.rake > 0) {
    lines.push({ userId: PLATFORM_USER, account: "available", amount: input.rake, type: "rake" })
  }
  return apply(store, input.idempotencyKey, input, "match", input.referenceId, lines)
}

export function adjustment(store: LedgerStore, input: {
  userId: string
  account: "available" | "bonus"
  amount: number
  referenceId: string
  idempotencyKey: string
}): AppliedOperation {
  return grant(store, {
    ...input,
    type: "adjustment",
    referenceType: "admin_adjustment",
  })
}

export function balancesOf(store: LedgerStore, userId: string): Balances {
  return deriveBalances(store.entriesFor([userId]), userId) ?? emptyBalances()
}
