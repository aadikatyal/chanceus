-- Allow authenticated users to create matches when bet_amount = 0 (tournament matches).
-- Normal matches still require the inserter to be player1 or player2 (existing policy).
CREATE POLICY "Authenticated users can create tournament matches (bet_amount 0)"
  ON public.matches
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND bet_amount = 0);

-- Allow anyone to view tournament matches (bet_amount = 0) so the full bracket shows for everyone.
CREATE POLICY "Anyone can view tournament matches (bet_amount 0)"
  ON public.matches
  FOR SELECT
  USING (bet_amount = 0);
