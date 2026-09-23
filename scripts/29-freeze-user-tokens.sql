-- Phase E. Run only after the ledger-reading app is deployed and reconciliation passes.
-- After this, updates to users.tokens fail. Profile updates that do not touch tokens still succeed.

CREATE OR REPLACE FUNCTION public.freeze_user_tokens()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tokens IS DISTINCT FROM OLD.tokens THEN
    RAISE EXCEPTION 'users.tokens is not authoritative';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS users_tokens_mirror ON public.users;
DROP TRIGGER IF EXISTS users_tokens_frozen ON public.users;
CREATE TRIGGER users_tokens_frozen
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.freeze_user_tokens();

DROP POLICY IF EXISTS "Users can create their own transactions" ON public.transactions;
