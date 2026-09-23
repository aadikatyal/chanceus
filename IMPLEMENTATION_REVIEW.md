# Implementation Review — Milestone 1

## What changed

Wallet and Ledger now exist as server modules. Money moves by appending ledger lines that sum to zero. A balance is the sum of those lines. There is no balance column and no update path for entries.

- `services/ledger` posts operations, derives balances, and rejects unbalanced lines, negative player accounts, and reused idempotency keys with a different body.
- `services/wallet/policy.ts` is the only policy layer: grant (deposit, reward), hold (bonus spent before available), release (refund back to the accounts that funded the hold), settle (winner payout and optional rake), and admin adjustment.
- The platform account may go negative. That is the mint. Player accounts may not.
- `scripts/27-ledger.sql` creates `wallet_entries` and `wallet_operations`, a `wallet_balances` read, and a trigger that blocks update and delete.

Existing pages and routes were not switched onto this ledger. They still read `users.tokens` and the old `transactions` table. Doing that cutover before the migration is applied to the hosted database would break the wallet page.

## Database migrations

`scripts/27-ledger.sql` is written and not applied. Apply it in Supabase before any route starts inserting ledger rows.

## API changes

None. No new HTTP route is mounted. Callers in this process use `grant`, `hold`, `release`, `settle`, and `adjustment`.

## Events added

None. Outbox publishing starts when a database transaction can commit the lines and the event together. The in-memory store has no bus.

## Breaking changes

None for the running app. Clients can still write the old token paths. That remains the integrity hole Milestone 1 was meant to close, and it stays open until the migration is applied and those writes are revoked.

## Performance

Posts are an in-memory fold of a user's entries. That is correct for tests and wrong for production volume. The SQL function that locks the user, checks the sum, and inserts in one transaction is not in the migration yet. The trigger only stops mutation. Concurrent holds are not safe until that function exists.

## Technical debt

- Hosted database still has client-writable `users.tokens` and `transactions`.
- Header and wallet UI do not read `wallet_balances`.
- Settle always credits `available`, including when the stake came from bonus. The economy spec says bonus-funded winnings stay in bonus.
- Ledger rules exist twice if the SQL poster is added later. The TypeScript engine is the spec. The SQL poster must call the same outcomes, not a second formula.
- Idempotency is process-local in `MemoryLedger`. It has to become `wallet_operations` before two servers can post.

## Tests

`pnpm test` runs `services/ledger/engine.test.ts`. Covered: derived balance, idempotent replay, key conflict, bonus-first hold, refund to the original accounts, settle of a 25-token pot, unbalanced rejection, and insufficient funds leaving no rows.

## Next milestone

Milestone 2, Match Service, after this ledger is the database writer and the old token grants are revoked. Match creation should call `hold` and `release` rather than update `users.tokens`.
