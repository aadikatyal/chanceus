-- Allow spectators to view match history for tournament matches (bet_amount = 0)
-- so they can see move history when viewing completed bracket matches
CREATE POLICY "Anyone can view match history for tournament matches" ON public.match_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE matches.id = match_history.match_id
      AND matches.bet_amount = 0
    )
  );
