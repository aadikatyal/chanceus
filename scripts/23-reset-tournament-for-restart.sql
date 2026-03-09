-- Reset tournament to registration so you can Start again (with all matches created this time).
-- Run in Supabase SQL Editor. Replace the tournament ID if needed.

-- 1. Delete tournament matches (and the linked matches will cascade or we delete them)
DELETE FROM tournament_matches WHERE tournament_id = '6c729ef0-59b8-455e-a30b-5e9c3115090c';

-- 2. Delete orphaned matches (matches that were created for this tournament but no longer linked)
-- Tournament matches use bet_amount = 0; we need to find matches that have no tournament_match and are likely from this tournament
-- Safer: delete matches that have no tournament_match link and bet_amount = 0
DELETE FROM matches
WHERE bet_amount = 0
AND id IN (
  SELECT m.id FROM matches m
  LEFT JOIN tournament_matches tm ON tm.match_id = m.id
  WHERE tm.id IS NULL
);

-- 3. Reset tournament status
UPDATE tournaments
SET status = 'registration', current_round = 0, started_at = NULL
WHERE id = '6c729ef0-59b8-455e-a30b-5e9c3115090c';

-- 4. Reset participants to "registered" (they were set to "active" when tournament started)
UPDATE tournament_participants
SET status = 'registered', bracket_position = NULL, round_eliminated = NULL, final_rank = NULL
WHERE tournament_id = '6c729ef0-59b8-455e-a30b-5e9c3115090c';
