-- Phase B. Run only after scripts/27-ledger.sql and scripts/28-ledger-cutover.sql.
-- Locks users so a live writer cannot change users.tokens mid-copy.
-- Safe to rerun.

DO $$
DECLARE
  u record;
  op_id uuid;
  platform uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  FOR u IN
    SELECT id, tokens FROM public.users WHERE tokens > 0 ORDER BY id FOR UPDATE
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.wallet_entries e
      WHERE e.idempotency_key = 'backfill:' || u.id::text || ':bonus'
    ) THEN
      CONTINUE;
    END IF;

    op_id := gen_random_uuid();

    INSERT INTO public.wallet_entries (user_id, account, amount, type, reference_type, reference_id, idempotency_key, operation_id)
    VALUES
      (u.id, 'bonus', u.tokens, 'grant', 'backfill', u.id, 'backfill:' || u.id::text || ':bonus', op_id),
      (platform, 'available', -u.tokens, 'grant', 'backfill', u.id, 'backfill:' || u.id::text || ':platform', op_id);

    INSERT INTO public.wallet_operations (id, idempotency_key, body_hash, status, response)
    VALUES (op_id, 'backfill:' || u.id::text, 'backfill', 'applied', jsonb_build_object('replayed', false));
  END LOOP;
END $$;
