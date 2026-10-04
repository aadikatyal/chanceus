-- Gem economy: wallets, ad cap, 1v1 escrow, tournament brackets, live-room meter.
-- Gems stay on users.tokens. user_wallets.gems mirrors that balance.

CREATE TABLE IF NOT EXISTS public.user_wallets (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  gems INTEGER NOT NULL DEFAULT 0,
  ad_watches_today INTEGER NOT NULL DEFAULT 0,
  last_ad_reset_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS winner_takes_all BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS escrow_status VARCHAR(32);

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES public.tournaments(id);

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS bracket_code VARCHAR(8);

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS payout_schedule JSONB;

ALTER TABLE public.tournament_matches
  ADD COLUMN IF NOT EXISTS is_placement BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.match_escrows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL UNIQUE,
  player1_id UUID REFERENCES public.users(id) NOT NULL,
  player2_id UUID REFERENCES public.users(id) NOT NULL,
  stake_per_player INTEGER NOT NULL,
  pot_amount INTEGER NOT NULL,
  status VARCHAR(32) NOT NULL CHECK (status IN ('ESCROW_LOCKED', 'RELEASED', 'REFUNDED')),
  winner_id UUID REFERENCES public.users(id),
  locked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  released_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.video_room_meters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  last_debit_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  stopped_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (room_id, user_id)
);

INSERT INTO public.user_wallets (user_id, gems)
SELECT id, COALESCE(tokens, 0) FROM public.users
ON CONFLICT (user_id) DO UPDATE SET gems = EXCLUDED.gems, updated_at = NOW();

-- Keep wallet gems aligned with users.tokens (the ledger the app already spends).
CREATE OR REPLACE FUNCTION public.sync_user_wallet_gems()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_wallets (user_id, gems)
  VALUES (NEW.id, COALESCE(NEW.tokens, 0))
  ON CONFLICT (user_id) DO UPDATE
    SET gems = EXCLUDED.gems,
        updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_wallet_sync ON public.users;
CREATE TRIGGER on_user_wallet_sync
  AFTER INSERT OR UPDATE OF tokens ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_wallet_gems();

-- Official heads-up stakes are 10, 20, and 50 gems.
UPDATE public.games
SET min_bet = LEAST(min_bet, 10),
    max_bet = GREATEST(max_bet, 50)
WHERE is_active = true;

ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_escrows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_room_meters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own wallet" ON public.user_wallets;
CREATE POLICY "Users can view their own wallet" ON public.user_wallets
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Players can view their match escrow" ON public.match_escrows;
CREATE POLICY "Players can view their match escrow" ON public.match_escrows
  FOR SELECT USING (auth.uid() = player1_id OR auth.uid() = player2_id);

DROP POLICY IF EXISTS "Users can view their video meter" ON public.video_room_meters;
CREATE POLICY "Users can view their video meter" ON public.video_room_meters
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_wallets_ad_reset ON public.user_wallets(last_ad_reset_at);
CREATE INDEX IF NOT EXISTS idx_match_escrows_status ON public.match_escrows(status);
CREATE INDEX IF NOT EXISTS idx_video_room_meters_status ON public.video_room_meters(status);
CREATE INDEX IF NOT EXISTS idx_transactions_tournament ON public.transactions(tournament_id);
