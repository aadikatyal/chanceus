# Ledger migration plan

Zero downtime means the currently deployed app can keep crediting `users.tokens` until the new app is serving traffic. This branch does not write `users.tokens`. Do not deploy this branch until Phase D.

There is one database. Rehearse the scripts against a restored backup or a branch database before touching that project. A second Supabase project is the rehearsal environment this repo does not have yet.

## Phase A — Deploy ledger tables

Run, in order, on the rehearsal database and then on production:

1. `scripts/27-ledger.sql`
2. `scripts/28-ledger-cutover.sql`

This creates `wallet_entries`, `wallet_operations`, `ledger_apply`, and the account index. It does not read or freeze `users.tokens`. The old app keeps working.

Rollback: `DROP FUNCTION public.ledger_apply; DROP TABLE public.wallet_operations; DROP TABLE public.wallet_entries;` only if no production app is writing them yet.

## Phase B — Backfill

Run `scripts/28b-ledger-backfill.sql` inside one transaction. It locks `users` rows that have a positive balance and copies `users.tokens` into bonus entries, with a matching platform debit.

Rerun is safe. A user who already has `backfill:{id}:bonus` is skipped.

Do this while writes are quiet if you can. The row lock makes a concurrent token update wait, then that update is not in the snapshot already copied. Phase C catches that delta.

Rollback: delete rows whose `reference_type = 'backfill'` and the matching `wallet_operations` rows. Only before any later grant exists.

## Phase C — Dual-write while the old app is still live

Required until Phase D. The old app updates `users.tokens` and does not call `ledger_apply`.

Install a temporary trigger that posts the delta after a successful token change. Skip the user who is currently being backfilled by checking the backfill key exists. Example shape the operator runs by hand, then drops in Phase E:

```sql
CREATE OR REPLACE FUNCTION public.mirror_token_delta()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  delta bigint := NEW.tokens - OLD.tokens;
  op_id uuid := gen_random_uuid();
BEGIN
  IF delta = 0 THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.wallet_entries
    WHERE idempotency_key = 'backfill:' || NEW.id::text || ':bonus'
  ) THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.wallet_entries (user_id, account, amount, type, reference_type, reference_id, idempotency_key, operation_id)
  VALUES
    (NEW.id, 'bonus', delta, 'adjustment', 'mirror', NEW.id, 'mirror:' || NEW.id::text || ':' || txid_current(), op_id),
    ('00000000-0000-0000-0000-000000000001', 'available', -delta, 'adjustment', 'mirror', NEW.id, 'mirror-platform:' || NEW.id::text || ':' || txid_current(), op_id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS users_tokens_mirror ON public.users;
CREATE TRIGGER users_tokens_mirror
  AFTER UPDATE OF tokens ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.mirror_token_delta();
```

This trigger fights Phase E. Drop it before creating the freeze trigger.

Rollback: `DROP TRIGGER users_tokens_mirror ON public.users;`

## Phase D — Read cutover

Deploy the app that reads `GET /api/v1/wallet` and writes only through `ledger_apply`. Set `SUPABASE_SERVICE_ROLE_KEY` in Vercel before the deploy.

During the deploy window both apps may run. Old instances still update `users.tokens`, and the mirror keeps the ledger aligned. New instances ignore the column.

Rollback: redeploy the previous Vercel build. Leave the ledger tables and the mirror in place. Do not drop the ledger.

## Phase E — Freeze `users.tokens`

After reconciliation in `LEDGER_RECONCILIATION.sql` shows every backfilled user matching, and no old instance is still running:

1. Drop `users_tokens_mirror`.
2. Run `scripts/29-freeze-user-tokens.sql`.

Token column updates start failing. Other profile updates still work. Client inserts into `transactions` lose their insert policy.

Rollback: `DROP TRIGGER users_tokens_frozen ON public.users;` and recreate the transactions insert policy from `scripts/01-create-tables.sql` if the old app must be restored. Restoring the old app without the mirror will drift again.

## Phase F — Remove legacy paths

Already done in this branch for application code: no `.update({ tokens })` and no `transactions` insert. After Phase E has been live for one release with clean reconciliation, delete the unused `transactions` insert policies and stop selecting `users.tokens` for display. Do not drop the column until a backup cycle has passed. The column is a frozen snapshot, not a balance.

## What is not dual-written

New ledger grants do not write `users.tokens`. After Phase D, the column is stale on purpose. Reconciliation compares the ledger to the column only for the window before Phase D, plus mirror deltas. After Phase E, compare the ledger to itself.
