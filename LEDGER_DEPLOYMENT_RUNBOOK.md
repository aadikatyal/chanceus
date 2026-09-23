# Ledger deployment runbook

Match Service, Queue, and Rating stay undeployed. This runbook only makes the wallet the production balance.

## Pre-deployment checklist

- Take a Supabase backup and confirm a restore point.
- Rehearse on a copy. This repo has no staging project.
- Confirm Vercel has `SUPABASE_SERVICE_ROLE_KEY`, Stripe keys, and the public Supabase URL.
- Confirm the database password is available to the person running SQL. It is not in `.env.local`.
- Run `pnpm test` on the commit being shipped.
- Do not deploy the ledger-only app before Phase B has finished.
- Schedule the freeze (Phase E) only after the old deployment is gone.

## Migration order

1. Backup.
2. `scripts/27-ledger.sql`
3. `scripts/28-ledger-cutover.sql`
4. `scripts/28b-ledger-backfill.sql`
5. Install the mirror trigger from `LEDGER_MIGRATION_PLAN.md` Phase C.
6. Run `LEDGER_RECONCILIATION.sql`. Stop if any check returns rows.
7. Deploy the app with the service role key set.
8. Smoke tests below.
9. Drop the mirror trigger.
10. `scripts/29-freeze-user-tokens.sql`
11. Run the reconciliation file again. The column-match check will fail after the freeze if any new grant happened. That is expected. The zero-sum, negative, duplicate-key, and orphan checks must still be empty.

## Verification queries

Use `LEDGER_RECONCILIATION.sql`. Run it as a role that can read `wallet_entries`. The browser anon key must not be able to run `ledger_apply`.

Spot check:

```sql
SELECT proname, prosecdef FROM pg_proc WHERE proname = 'ledger_apply';
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'ledger_apply';
```

`ledger_apply` should be security definer and granted to `service_role` only.

## Smoke tests

Against the deployed site, with a test user:

1. `GET /api/v1/wallet` returns `spendable` equal to that user's ledger sum, not a hand-edited `users.tokens`.
2. A Stripe test purchase of 100 tokens increases `spendable` by 100. Repeating the fulfillment request does not add another 100.
3. `UPDATE users SET tokens = tokens + 1` fails after Phase E and succeeds before Phase E.
4. Inserting into `transactions` as the logged-in user fails after Phase E.
5. Header balance matches `GET /api/v1/wallet` within one poll (5 seconds).

## Rollback

| If you are here | Do this |
| --- | --- |
| After Phase A or B, new app not deployed | Drop the mirror if installed. Leave or drop empty ledger tables. Old app is unchanged. |
| After Phase D | Redeploy the previous Vercel build. Keep the mirror so the column and the ledger do not diverge while the old app runs. |
| After Phase E | Drop `users_tokens_frozen`, restore the transactions insert policy, redeploy the old app, and turn the mirror back on. Expect manual repair if the new app already posted grants the old column does not have. |

Do not delete ledger rows to roll back a purchase. Post a reversing `ledger_apply` with a new idempotency key.

## Failure scenarios

| Failure | What you see | Action |
| --- | --- | --- |
| Service role missing in Vercel | Wallet API 503, purchases 500 | Set the key and redeploy. No data repair if no grant was committed. |
| Phase D deployed before backfill | Spendable is 0, holds fail | Run Phase B. Do not hand-edit `users.tokens`. |
| Backfill ran twice | No extra rows | Idempotency keys make the second run a no-op. |
| Mirror and freeze both installed | Token updates error, or mirror never fires | Drop the mirror first. Freeze must be the only trigger on the column. |
| `ledger_apply` granted to `anon` | Anyone can mint | Revoke from `PUBLIC`, `anon`, and `authenticated` as in `scripts/28-ledger-cutover.sql`. |
| Reconciliation shows a negative player account | A post skipped the check | Stop grants. Inspect that user's entries. Do not delete them. |

## Monitoring

No metrics pipeline is deployed. Until one exists, run `LEDGER_RECONCILIATION.sql` after every money deploy and on a daily schedule. Alert if any query that should return zero rows returns a row. Watch Vercel logs for `ledger_apply`, `insufficient_tokens`, and `idempotency_conflict`.

The in-app signal that the ledger is down is `GET /api/v1/wallet` returning 503. The header then stays at 0. That is fail-closed, not a zero balance.

## Success criteria

- Phase E trigger is installed.
- `GET /api/v1/wallet` is the balance the header shows.
- A repeated Stripe fulfillment does not change the sum.
- Reconciliation checks for negatives, duplicate keys, unbalanced operations, and orphan entries return no rows.
- `pnpm test` passed on the deployed commit.
- Rollback steps above were read before the freeze, not after.

## Current status

None of the SQL has been applied to the Supabase project. `users.tokens` is not frozen. The ledger is not the production source of truth yet. Match Service must not start.
