-- Transactional ledger apply, opening balances, and a freeze on users.tokens.
-- Execute with a database role that owns the tables. Do not grant ledger_apply to anon or authenticated.

CREATE OR REPLACE FUNCTION public.ledger_apply(
  p_key text,
  p_hash text,
  p_reference_type text,
  p_reference_id uuid,
  p_lines jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing public.wallet_operations%ROWTYPE;
  line jsonb;
  uid uuid;
  acct text;
  amt bigint;
  bal bigint;
  op_id uuid := gen_random_uuid();
  platform uuid := '00000000-0000-0000-0000-000000000001';
  locked uuid;
BEGIN
  IF p_lines IS NULL OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'empty';
  END IF;

  SELECT * INTO existing FROM public.wallet_operations WHERE idempotency_key = p_key;
  IF FOUND THEN
    IF existing.body_hash <> p_hash THEN
      RAISE EXCEPTION 'idempotency_conflict';
    END IF;
    RETURN existing.response || jsonb_build_object('replayed', true);
  END IF;

  IF (SELECT COALESCE(SUM((value->>'amount')::bigint), 0) FROM jsonb_array_elements(p_lines)) <> 0 THEN
    RAISE EXCEPTION 'unbalanced';
  END IF;

  FOR locked IN
    SELECT DISTINCT (value->>'userId')::uuid AS id
    FROM jsonb_array_elements(p_lines)
    ORDER BY 1
  LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended(locked::text, 0));
  END LOOP;

  FOR line IN SELECT value FROM jsonb_array_elements(p_lines)
  LOOP
    uid := (line->>'userId')::uuid;
    acct := line->>'account';
    amt := (line->>'amount')::bigint;
    IF amt = 0 THEN
      RAISE EXCEPTION 'invalid_line';
    END IF;
    IF uid <> platform THEN
      SELECT COALESCE(SUM(amount), 0) INTO bal
      FROM public.wallet_entries
      WHERE user_id = uid AND account = acct;
      IF bal + amt < 0 THEN
        RAISE EXCEPTION 'insufficient_tokens';
      END IF;
    END IF;
  END LOOP;

  BEGIN
    INSERT INTO public.wallet_entries (user_id, account, amount, type, reference_type, reference_id, idempotency_key, operation_id)
    SELECT
      (value->>'userId')::uuid,
      value->>'account',
      (value->>'amount')::bigint,
      value->>'type',
      p_reference_type,
      p_reference_id,
      p_key || ':' || ordinality::text,
      op_id
    FROM jsonb_array_elements(p_lines) WITH ORDINALITY;

    INSERT INTO public.wallet_operations (id, idempotency_key, body_hash, status, response)
    VALUES (op_id, p_key, p_hash, 'applied', jsonb_build_object('operationId', op_id, 'replayed', false));
  EXCEPTION WHEN unique_violation THEN
    SELECT * INTO existing FROM public.wallet_operations WHERE idempotency_key = p_key;
    IF NOT FOUND OR existing.body_hash <> p_hash THEN
      RAISE EXCEPTION 'idempotency_conflict';
    END IF;
    RETURN existing.response || jsonb_build_object('replayed', true);
  END;

  RETURN jsonb_build_object('operationId', op_id, 'replayed', false);
END $$;

REVOKE ALL ON FUNCTION public.ledger_apply(text, text, text, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ledger_apply(text, text, text, uuid, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.ledger_apply(text, text, text, uuid, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.ledger_apply(text, text, text, uuid, jsonb) TO service_role;

CREATE INDEX IF NOT EXISTS wallet_entries_user_account ON public.wallet_entries (user_id, account);
