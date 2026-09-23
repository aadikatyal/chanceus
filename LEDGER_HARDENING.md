# Ledger hardening

Review of `services/ledger`, `lib/wallet/server.ts`, and `scripts/27` through `scripts/29`. No Match Service changes.

## Fixed in the migration scripts

- **Deadlock.** `ledger_apply` locked users in JSON order. Two posts that touched the same pair in opposite orders could deadlock. The function now locks user ids in sorted order.
- **Duplicate key race.** Two identical posts could both pass the existence check. The inserts now sit in one subtransaction. A unique violation re-reads the stored operation and returns it when the body hash matches. It does not leave a second set of lines.
- **Hot balance scan.** Added `wallet_entries_user_account` on `(user_id, account)` so the per-account sum does not depend on the created-at index.
- **Execute grant.** `ledger_apply` is revoked from `PUBLIC`, `anon`, and `authenticated`, and granted to `service_role` only.
- **Backfill lock.** `scripts/28b-ledger-backfill.sql` takes `FOR UPDATE` on the user rows it copies.
- **Freeze split.** The freeze trigger is no longer in the same script as table creation. Installing it early would break the app that still updates `users.tokens`.

## Remaining risks

| Issue | Why it still matters | What to do before production |
| --- | --- | --- |
| No foreign key from `wallet_entries.user_id` to `users` | A bad UUID can be posted. The platform id is intentionally not a user row, so a blanket FK does not fit. | Add a check that non-platform ids exist in `users` inside `ledger_apply`, or a FK plus a real platform user row. |
| Balance check is not `SELECT … FOR UPDATE` on the entry rows | The advisory lock covers this for `ledger_apply`. A mirror trigger or a manual insert bypasses it. | Do not insert into `wallet_entries` except through `ledger_apply` and the backfill script. |
| Backfill and mirror can both write the opening delta | If the mirror fires on an update that happens after the lock is released but the backfill key check races a brand-new user | Backfill is the opening entry. The mirror returns early until that key exists, then only posts deltas. Do not run them as two sessions on the same new user without the key check. |
| `reference_id` is a UUID | Stripe ids cannot be the reference. The app stores the Stripe id in the idempotency key and uses the user id as the reference. | Keep that convention. Do not loosen the column to text without a reason. |
| No actor column | An admin adjustment cannot be tied to a staff user inside the line. | Add `actor_id` before the admin tool exists. Not required for Stripe grants. |
| App reads all lines to sum a balance | Fine for the current user count. It becomes a full history scan per header poll. | The header polls every 5 seconds. Cache the sum in `ledger_apply`'s return value and stop polling every user's full history before traffic grows. The poll is the bottleneck, not the post. |
| Long transaction | Backfill locks every positive user in one transaction. | Acceptable at current size. If it runs for minutes, commit in batches of user-id ranges and keep the idempotency keys. |
| In-memory tests are not the database | `pnpm test` never runs `ledger_apply`. | Run the reconciliation file on a database copy after the scripts. That is the production test. |
| Service role in the Next.js server | A bug in any server route that imports `createAdminClient` can post arbitrary lines. | Keep `ledger_apply` as the only insert path. Do not add a generic SQL exec RPC. |

## Not a lock problem

Wallet policy in TypeScript computes the bonus-versus-available split, then `ledger_apply` rechecks non-negative balances under the advisory lock. A stale split fails the post instead of driving an account negative. The caller must retry. That is the safe failure.
