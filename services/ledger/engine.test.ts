import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { MemoryLedger } from "./memory-store.ts"
import { deriveBalances, postOperation } from "./engine.ts"
import { LedgerError } from "./types.ts"
import { grant, hold, release, settle, PLATFORM_USER } from "../wallet/policy.ts"

describe("ledger", () => {
  it("derives balances only from entries", () => {
    const store = new MemoryLedger()
    grant(store, {
      userId: "u1",
      amount: 200,
      account: "bonus",
      type: "grant",
      referenceType: "starter",
      referenceId: "u1",
      idempotencyKey: "starter:u1",
    })
    const balances = deriveBalances(store.entries, "u1")
    assert.deepEqual(balances, { available: 0, bonus: 200, escrow: 0, pending_withdrawal: 0 })
    assert.equal("balance" in store, false)
  })

  it("replays an identical operation and rejects a different body", () => {
    const store = new MemoryLedger()
    const first = grant(store, {
      userId: "u1",
      amount: 50,
      account: "available",
      type: "purchase",
      referenceType: "purchase",
      referenceId: "p1",
      idempotencyKey: "purchase:p1",
    })
    const second = grant(store, {
      userId: "u1",
      amount: 50,
      account: "available",
      type: "purchase",
      referenceType: "purchase",
      referenceId: "p1",
      idempotencyKey: "purchase:p1",
    })
    assert.equal(second.replayed, true)
    assert.equal(store.entries.length, first.replayed ? 0 : 2)
    assert.equal(deriveBalances(store.entries, "u1").available, 50)
    assert.throws(
      () =>
        grant(store, {
          userId: "u1",
          amount: 80,
          account: "available",
          type: "purchase",
          referenceType: "purchase",
          referenceId: "p1",
          idempotencyKey: "purchase:p1",
        }),
      (error: unknown) => error instanceof LedgerError && error.code === "idempotency_conflict",
    )
  })

  it("holds bonus before available and refunds that escrow", () => {
    const store = new MemoryLedger()
    grant(store, {
      userId: "u1",
      amount: 30,
      account: "bonus",
      type: "grant",
      referenceType: "starter",
      referenceId: "u1",
      idempotencyKey: "g1",
    })
    grant(store, {
      userId: "u1",
      amount: 70,
      account: "available",
      type: "purchase",
      referenceType: "purchase",
      referenceId: "p1",
      idempotencyKey: "g2",
    })
    hold(store, {
      userId: "u1",
      amount: 40,
      referenceType: "match",
      referenceId: "m1",
      idempotencyKey: "hold:m1",
    })
    const held = deriveBalances(store.entries, "u1")
    assert.equal(held.bonus, 0)
    assert.equal(held.available, 60)
    assert.equal(held.escrow, 40)
    release(store, {
      userId: "u1",
      referenceType: "match",
      referenceId: "m1",
      idempotencyKey: "release:m1",
    })
    const released = deriveBalances(store.entries, "u1")
    assert.equal(released.escrow, 0)
    assert.equal(released.bonus, 30)
    assert.equal(released.available, 70)
  })

  it("pays a winner from escrow and keeps the rake", () => {
    const store = new MemoryLedger()
    for (const userId of ["u1", "u2"]) {
      grant(store, {
        userId,
        amount: 25,
        account: "available",
        type: "purchase",
        referenceType: "purchase",
        referenceId: userId,
        idempotencyKey: `buy:${userId}`,
      })
      hold(store, {
        userId,
        amount: 25,
        referenceType: "match",
        referenceId: "m1",
        idempotencyKey: `hold:m1:${userId}`,
      })
    }
    settle(store, {
      winnerId: "u1",
      loserId: "u2",
      stake: 25,
      rake: 0,
      referenceId: "m1",
      idempotencyKey: "settle:m1",
    })
    assert.equal(deriveBalances(store.entries, "u1").available, 50)
    assert.equal(deriveBalances(store.entries, "u1").escrow, 0)
    assert.equal(deriveBalances(store.entries, "u2").available, 0)
    assert.equal(deriveBalances(store.entries, "u2").escrow, 0)
  })

  it("rejects an unbalanced post and a negative account", () => {
    const store = new MemoryLedger()
    assert.throws(
      () =>
        postOperation(store, {
          idempotencyKey: "bad",
          bodyHash: "h",
          referenceType: "x",
          referenceId: "x",
          lines: [{ userId: "u1", account: "available", amount: 5, type: "grant" }],
        }),
      (error: unknown) => error instanceof LedgerError && error.code === "unbalanced",
    )
    assert.throws(
      () =>
        hold(store, {
          userId: "u1",
          amount: 1,
          referenceType: "match",
          referenceId: "m2",
          idempotencyKey: "hold:m2",
        }),
      (error: unknown) => error instanceof LedgerError && error.code === "insufficient_tokens",
    )
    assert.equal(store.entries.length, 0)
    assert.equal(deriveBalances(store.entries, PLATFORM_USER).available, 0)
  })
})
