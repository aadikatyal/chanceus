import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { MemoryLedger } from "./memory-store.ts"
import { postOperation } from "./engine.ts"
import type { LedgerOperationInput } from "./types.ts"
import { LedgerError } from "./types.ts"
import { adjustment, grant, hold, release, settle } from "../wallet/policy.ts"

class TransactionalLedger extends MemoryLedger {
  private tail: Promise<void> = Promise.resolve()

  async post(input: LedgerOperationInput) {
    const run = this.tail.then(() => postOperation(this, input))
    this.tail = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }
}

function reconcile(store: MemoryLedger) {
  const byOperation = new Map<string, number>()
  for (const entry of store.entries) {
    byOperation.set(entry.operationId, (byOperation.get(entry.operationId) ?? 0) + entry.amount)
  }
  for (const [operationId, sum] of byOperation) {
    if (sum !== 0) throw new Error(`operation ${operationId} sums to ${sum}`)
  }
}

describe("ledger cutover", () => {
  it("deposits, holds, refunds, settles, and adjusts once", () => {
    const store = new MemoryLedger()
    grant(store, {
      userId: "u1",
      amount: 100,
      account: "available",
      type: "purchase",
      referenceType: "purchase",
      referenceId: "u1",
      idempotencyKey: "deposit:u1",
    })
    grant(store, {
      userId: "u2",
      amount: 100,
      account: "available",
      type: "purchase",
      referenceType: "purchase",
      referenceId: "u2",
      idempotencyKey: "deposit:u2",
    })
    hold(store, { userId: "u1", amount: 40, referenceType: "match", referenceId: "m1", idempotencyKey: "hold:m1:u1" })
    hold(store, { userId: "u2", amount: 40, referenceType: "match", referenceId: "m1", idempotencyKey: "hold:m1:u2" })
    release(store, { userId: "u1", referenceType: "match", referenceId: "m1", idempotencyKey: "release:m1:u1" })
    hold(store, { userId: "u1", amount: 40, referenceType: "match", referenceId: "m2", idempotencyKey: "hold:m2:u1" })
    hold(store, { userId: "u2", amount: 40, referenceType: "match", referenceId: "m2", idempotencyKey: "hold:m2:u2" })
    settle(store, { winnerId: "u1", loserId: "u2", stake: 40, rake: 0, referenceId: "m2", idempotencyKey: "settle:m2" })
    adjustment(store, { userId: "u1", account: "bonus", amount: 5, referenceId: "u1", idempotencyKey: "adjust:1" })
    const replay = adjustment(store, { userId: "u1", account: "bonus", amount: 5, referenceId: "u1", idempotencyKey: "adjust:1" })
    assert.equal(replay.replayed, true)
    assert.throws(
      () => adjustment(store, { userId: "u1", account: "bonus", amount: 9, referenceId: "u1", idempotencyKey: "adjust:1" }),
      (error: unknown) => error instanceof LedgerError && error.code === "idempotency_conflict",
    )
    reconcile(store)
  })

  it("allows only one of two concurrent holds", async () => {
    const store = new TransactionalLedger()
    grant(store, {
      userId: "u1",
      amount: 100,
      account: "available",
      type: "purchase",
      referenceType: "purchase",
      referenceId: "u1",
      idempotencyKey: "deposit:race",
    })
    const results = await Promise.allSettled([
      store.post({
        idempotencyKey: "a",
        bodyHash: "a",
        referenceType: "match",
        referenceId: "m",
        lines: [
          { userId: "u1", account: "available", amount: -80, type: "stake_hold" },
          { userId: "u1", account: "escrow", amount: 80, type: "stake_hold" },
        ],
      }),
      store.post({
        idempotencyKey: "b",
        bodyHash: "b",
        referenceType: "match",
        referenceId: "m",
        lines: [
          { userId: "u1", account: "available", amount: -80, type: "stake_hold" },
          { userId: "u1", account: "escrow", amount: 80, type: "stake_hold" },
        ],
      }),
    ])
    const fulfilled = results.filter((result) => result.status === "fulfilled")
    const rejected = results.filter((result) => result.status === "rejected")
    assert.equal(fulfilled.length, 1)
    assert.equal(rejected.length, 1)
    reconcile(store)
  })

  it("backfills an opening balance once and reconciles", () => {
    const store = new MemoryLedger()
    const opening = 1000
    grant(store, {
      userId: "u1",
      amount: opening,
      account: "bonus",
      type: "grant",
      referenceType: "backfill",
      referenceId: "u1",
      idempotencyKey: "backfill:u1",
    })
    const again = grant(store, {
      userId: "u1",
      amount: opening,
      account: "bonus",
      type: "grant",
      referenceType: "backfill",
      referenceId: "u1",
      idempotencyKey: "backfill:u1",
    })
    assert.equal(again.replayed, true)
    const bonus = store.entries.filter((entry) => entry.userId === "u1" && entry.account === "bonus").reduce((sum, entry) => sum + entry.amount, 0)
    assert.equal(bonus, opening)
    reconcile(store)
  })
})
