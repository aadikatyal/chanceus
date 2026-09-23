import {
  type Account,
  type AppliedOperation,
  type Balances,
  type LedgerEntry,
  type LedgerOperationInput,
  LedgerError,
  emptyBalances,
  ACCOUNTS,
} from "./types.ts"
import { PLATFORM_USER } from "../wallet/platform.ts"

export interface LedgerStore {
  findOperation(idempotencyKey: string): AppliedOperation | undefined
  entriesFor(userIds: string[]): LedgerEntry[]
  append(operation: AppliedOperation, entries: LedgerEntry[]): void
}

let seq = 0
function nextId(prefix: string): string {
  seq += 1
  return `${prefix}_${seq}`
}

export function deriveBalances(entries: LedgerEntry[], userId: string): Balances {
  const balances = emptyBalances()
  for (const entry of entries) {
    if (entry.userId !== userId) continue
    balances[entry.account] += entry.amount
  }
  return balances
}

export function postOperation(store: LedgerStore, input: LedgerOperationInput, now = new Date()): AppliedOperation {
  const existing = store.findOperation(input.idempotencyKey)
  if (existing) {
    if (existing.bodyHash !== input.bodyHash) {
      throw new LedgerError("idempotency_conflict", "Idempotency key was reused with a different body")
    }
    return { ...existing, replayed: true }
  }

  if (input.lines.length === 0) {
    throw new LedgerError("empty", "Operation has no lines")
  }

  const sum = input.lines.reduce((total, line) => total + line.amount, 0)
  if (sum !== 0) {
    throw new LedgerError("unbalanced", "Ledger lines must sum to zero")
  }

  for (const line of input.lines) {
    if (!Number.isInteger(line.amount) || line.amount === 0) {
      throw new LedgerError("invalid_line", "Amounts are non-zero integers")
    }
    if (!ACCOUNTS.includes(line.account)) {
      throw new LedgerError("invalid_line", "Unknown account")
    }
  }

  const userIds = [...new Set(input.lines.map((line) => line.userId))]
  const prior = store.entriesFor(userIds)
  const next = new Map<string, Balances>()
  for (const userId of userIds) next.set(userId, deriveBalances(prior, userId))

  for (const line of input.lines) {
    const balances = next.get(line.userId)!
    balances[line.account] += line.amount
    if (line.userId !== PLATFORM_USER && balances[line.account] < 0) {
      throw new LedgerError("insufficient_tokens", `${line.account} cannot go negative`)
    }
  }

  const operationId = nextId("op")
  const createdAt = now.toISOString()
  const entries: LedgerEntry[] = input.lines.map((line) => ({
    ...line,
    id: nextId("ent"),
    operationId,
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    idempotencyKey: `${input.idempotencyKey}:${line.userId}:${line.account}:${line.amount}`,
    createdAt,
  }))

  const balancesByUser: Record<string, Balances> = {}
  for (const [userId, balances] of next) balancesByUser[userId] = { ...balances }

  const applied: AppliedOperation = {
    operationId,
    idempotencyKey: input.idempotencyKey,
    bodyHash: input.bodyHash,
    status: "applied",
    balancesByUser,
    replayed: false,
  }
  store.append(applied, entries)
  return applied
}

export function spendable(balances: Balances): number {
  return balances.available + balances.bonus
}

export function accountOf(balances: Balances, account: Account): number {
  return balances[account]
}
