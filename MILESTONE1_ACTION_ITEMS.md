# Milestone 1 action items

One Supabase project. No second database. The ledger tables are not in that project yet (`wallet_entries` is missing). SQL has to be pasted in the Supabase Dashboard → SQL Editor. The app cannot create tables with the service-role key.

Do not run the freeze script until the verification queries pass. `users.tokens` stays in place until then.

## SQL, in order

Run each file's full contents as its own query. Wait for success before the next one.

1. `scripts/27-ledger.sql` — tables, append-only trigger, balance read.
2. `scripts/28-ledger-cutover.sql` — `ledger_apply`, locked in user-id order, executable only by `service_role`.
3. `scripts/28b-ledger-backfill.sql` — copies `users.tokens` into bonus ledger lines. Safe to run again.

Then run the checks in the verification section. Only if they pass:

4. `scripts/29-freeze-user-tokens.sql` — rejects any further change to `users.tokens` and drops client inserts into `transactions`.

Do not run a mirror trigger. This app already writes only the ledger. The column is a snapshot until step 4.

## Manual Supabase steps

- Open the project that `.env.local` already uses. SQL Editor → New query → paste → Run, in the order above.
- Confirm Vercel has `SUPABASE_SERVICE_ROLE_KEY` if this build is deployed. Without it, `GET /api/v1/wallet` returns 503. Local `.env.local` already has the key.
- After step 2, the API can post. After step 3, existing balances show up. After step 4, the old column can no longer move.

## Code already completed

- Balance display for the header, wallet, profile, dashboard, tournament entry, and match join comes from the ledger sum.
- Holds, refunds, settlements, tournament entry, and purchases call the wallet server, which calls `ledger_apply`.
- Browser updates of `users.tokens` and inserts into `transactions` are gone from the app.
- Cleanup scripts that used to add tokens back throw immediately.
- `buy_tokens` returns 410 before the old increment RPC.
- Player transfers are disabled.
- Checkout and PaymentIntent fulfillment grant tokens only when Stripe `metadata.userId` equals the signed-in user. Otherwise they return 403 and do not post.

## Remaining code changes

None for Milestone 1. The database steps above are the rest.

## Verification checklist

After backfill, run in the SQL Editor:

```sql
-- Must be 0. Every credit has a matching debit.
SELECT COALESCE(SUM(amount), 0) AS supply FROM public.wallet_entries;

-- Must return no rows.
SELECT user_id, account, SUM(amount) AS balance
FROM public.wallet_entries
WHERE user_id <> '00000000-0000-0000-0000-000000000001'
GROUP BY user_id, account
HAVING SUM(amount) < 0;

-- Must return no rows. Opening bonus should equal the column for users who have not bought tokens since the backfill.
SELECT u.id, u.tokens, COALESCE(SUM(e.amount) FILTER (WHERE e.account = 'bonus'), 0) AS bonus
FROM public.users u
LEFT JOIN public.wallet_entries e ON e.user_id = u.id AND e.reference_type = 'backfill'
GROUP BY u.id, u.tokens
HAVING u.tokens IS DISTINCT FROM COALESCE(SUM(e.amount) FILTER (WHERE e.account = 'bonus'), 0);

-- Must return no rows.
SELECT operation_id, SUM(amount)
FROM public.wallet_entries
GROUP BY operation_id
HAVING SUM(amount) <> 0;
```

Then, signed in as a test user:

- `GET /api/v1/wallet` `spendable` equals that user's bonus plus available.
- The header shows the same number within 5 seconds.
- Fulfilling someone else's Checkout session id returns 403.
- Fulfilling your own paid session twice does not increase the balance the second time.

After `scripts/29-freeze-user-tokens.sql`:

```sql
-- Must fail with: users.tokens is not authoritative
UPDATE public.users SET tokens = tokens WHERE false;
```

A real check is updating one test user's tokens by 1 and confirming the statement errors, then not retrying a successful update. If you use a transaction, roll it back. The freeze raises before the write.

## When Milestone 1 is complete

All four are true:

- Steps 1–3 have been run on this Supabase project.
- The verification queries return no mismatch rows, and total supply is 0.
- Step 4 has been run, so `users.tokens` no longer changes.
- A repeated purchase fulfillment does not double-credit, and another user's session cannot credit you.

Until those are true, Milestone 1 is not complete and Match Service does not start.
