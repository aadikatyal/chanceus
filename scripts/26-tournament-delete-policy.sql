-- Allow tournament creators to delete their own tournament.
-- tournament_participants and tournament_matches CASCADE on tournament delete.

CREATE POLICY "Creators can delete their own tournaments"
  ON public.tournaments
  FOR DELETE
  USING (creator_id = auth.uid());
