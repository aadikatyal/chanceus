-- Append-only ledger. Balances are the sum of wallet_entries. No balance column.

CREATE TABLE IF NOT EXISTS public.wallet_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  account TEXT NOT NULL CHECK (account IN ('available', 'bonus', 'escrow', 'pending_withdrawal')),
  amount BIGINT NOT NULL CHECK (amount <> 0),
  type TEXT NOT NULL CHECK (type IN ('grant', 'stake_hold', 'stake_release', 'payout', 'rake', 'reward', 'purchase', 'adjustment', 'refund', 'reversal')),
  reference_type TEXT NOT NULL,
  reference_id UUID NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  operation_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wallet_operations (
  id UUID PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  body_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('applied', 'rejected')),
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wallet_entries_user_created ON public.wallet_entries (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS wallet_entries_reference ON public.wallet_entries (reference_type, reference_id);

ALTER TABLE public.wallet_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY wallet_entries_select_own ON public.wallet_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.wallet_balances(p_user UUID)
RETURNS TABLE(account TEXT, balance BIGINT)
LANGUAGE sql STABLE AS $$
  SELECT account, COALESCE(SUM(amount), 0)::BIGINT
  FROM public.wallet_entries
  WHERE user_id = p_user
  GROUP BY account
$$;

CREATE OR REPLACE FUNCTION public.prevent_ledger_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'wallet_entries are append-only';
END $$;

DROP TRIGGER IF EXISTS wallet_entries_no_update ON public.wallet_entries;
CREATE TRIGGER wallet_entries_no_update
  BEFORE UPDATE OR DELETE ON public.wallet_entries
  FOR EACH ROW EXECUTE FUNCTION public.prevent_ledger_mutation();
