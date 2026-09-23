export const ACCOUNTS = ["available", "bonus", "escrow", "pending_withdrawal"] as const
export type Account = (typeof ACCOUNTS)[number]

export const ENTRY_TYPES = [
  "grant",
  "stake_hold",
  "stake_release",
  "payout",
  "rake",
  "reward",
  "purchase",
  "adjustment",
  "refund",
  "reversal",
] as const
export type EntryType = (typeof ENTRY_TYPES)[number]

export interface LedgerLine {
  userId: string
  account: Account
  amount: number
  type: EntryType
}

export interface LedgerOperationInput {
  idempotencyKey: string
  bodyHash: string
  referenceType: string
  referenceId: string
  lines: LedgerLine[]
}

export interface LedgerEntry extends LedgerLine {
  id: string
  operationId: string
  referenceType: string
  referenceId: string
  idempotencyKey: string
  createdAt: string
}

export type Balances = Record<Account, number>

export interface AppliedOperation {
  operationId: string
  idempotencyKey: string
  bodyHash: string
  status: "applied" | "rejected"
  balancesByUser: Record<string, Balances>
  replayed: boolean
}

export class LedgerError extends Error {
  code: "idempotency_conflict" | "unbalanced" | "insufficient_tokens" | "empty" | "invalid_line"

  constructor(
    code: "idempotency_conflict" | "unbalanced" | "insufficient_tokens" | "empty" | "invalid_line",
    message: string,
  ) {
    super(message)
    this.code = code
  }
}

export function emptyBalances(): Balances {
  return { available: 0, bonus: 0, escrow: 0, pending_withdrawal: 0 }
}
