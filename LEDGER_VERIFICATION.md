# Ledger verification

`pnpm test` passes: 8 tests, covering deposit, hold, refund, settle, admin adjustment, a reused idempotency key, two concurrent holds, backfill, and a zero-sum reconciliation of every operation.

The hosted database was not migrated. `.env.local` has the Supabase URL and service role key and no Postgres connection string. Those keys cannot create tables or install the freeze trigger. Until `scripts/27-ledger.sql` and `scripts/28-ledger-cutover.sql` are applied, the exit criteria are not met and Match Service should not start.

## Answers

**Can any client modify balances directly?**

Yes, until the migration runs. Application code no longer updates `users.tokens` or inserts `transactions`. The existing row-level policy still lets a logged-in user update their own `users` row, which includes `tokens`. `scripts/28-ledger-cutover.sql` installs a trigger that rejects that change. It is not installed.

**Can any API bypass the ledger?**

The Next.js routes that credit purchases call `walletGrant`. The old `buy_tokens` function returns 410 before `increment_tokens_and_log`. If that database function is still deployed and something calls it directly, it bypasses the ledger. The app no longer does.

**Can two requests create duplicate payouts?**

Not through `walletSettle` or `walletGrant`. Both use an idempotency key stored by `ledger_apply`, and the tests replay a key without a second credit. That function is not in the hosted database yet, so a payout today cannot go through this path at all. The old client win insert is gone.

**Can a failed request partially settle money?**

`ledger_apply` is one database transaction: advisory locks, balance checks, inserts, and the operation row commit together or not at all. The TypeScript tests serialize posts the same way. A hold of two players releases the first if the second fails. That release is a second transaction, which is the correct refund, not a partial settle.

**Can balances ever become inconsistent?**

Inside the ledger, no. Every operation sums to zero, and player accounts cannot go negative. The product can still disagree with itself until the migration runs, because `users.tokens` remains a second number. After the trigger, that column can no longer move, and the ledger sum is the only balance that changes.

## Exit criteria

| Criterion | Status |
| --- | --- |
| `users.tokens` is not authoritative in application code | Met |
| Displayed balances on header, wallet, profile, dashboard, tournament, and match join use the ledger | Met, and they show 0 if `wallet_entries` does not exist yet |
| Writes in the app use wallet functions | Met |
| Old transaction inserts in the app | Removed |
| Migration applied on the hosted database | Not met |
| Reconciliation against live accounts | Not met |
| Tests | Met |

Phase 1 is not complete. Apply the two SQL scripts, then rerun the freeze and zero-sum checks in `LEDGER_CUTOVER_PLAN.md`.
